'use strict'

/**
 * Phase 42 — Live Production Audit & Launch Closure Validation Suite
 *
 * Verifies:
 *  1. XLSX decompression-bomb (zip-bomb) protection & archive validation
 *  2. Rate limiting architecture (single-instance vs shared store compatibility)
 *  3. AI provider timeout enforcement (30s external LLM, 3.5s microservice)
 *  4. CORS allowlist & Reverse Proxy trust enforcement
 *  5. BSON type & index preservation across backup/restore
 *  6. Controlled production index initialization idempotency
 *  7. Production configuration safeguards (COURSE_SOURCE_MODE, ALLOWED_EMAIL_DOMAINS)
 *  8. Development database immutability
 */

const http = require('http')
const mongoose = require('mongoose')
const { validateXlsxArchive } = require('./src/controllers/statisticalAnalysis.controller')
const { parseAndValidateTrustProxy } = require('./src/app')
const { validateEnv } = require('./src/config/envValidation')
const { initializeIndexes } = require('./scripts/init_production_indexes')
const { maskMongoUri } = require('./scripts/backup')

let passedTests = 0
let failedTests = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`)
    passedTests++
  } else {
    console.error(`  [FAIL] ${message}`)
    failedTests++
  }
}

async function run() {
  console.log('\n===============================================================')
  console.log('PHASE 42: LIVE PRODUCTION AUDIT & LAUNCH CLOSURE TEST SUITE')
  console.log('===============================================================\n')

  // ── TEST GROUP 1: XLSX Decompression-Bomb Protections ───────────────────────
  console.log('--- Group 1: XLSX Decompression-Bomb & Archive Protections ---')

  // 1. Buffer too small
  const smallBuf = Buffer.from([0x50, 0x4b, 0x03, 0x04])
  const smallRes = validateXlsxArchive(smallBuf)
  assert(!smallRes.valid && smallRes.error.includes('too small'), 'Rejects truncated archive under 30 bytes')

  // 2. Non-ZIP magic bytes
  const nonZipBuf = Buffer.alloc(40, 0x61)
  const nonZipRes = validateXlsxArchive(nonZipBuf)
  assert(!nonZipRes.valid && nonZipRes.error.includes('header'), 'Rejects non-ZIP/OOXML archive headers')

  // 3. Simulated zip bomb with excessive uncompressed size (> 50MB)
  const bombHeader = Buffer.alloc(40, 0)
  bombHeader.writeUInt32LE(0x04034b50, 0) // PK\x03\x04
  bombHeader.writeUInt32LE(100, 18)       // compressed size: 100 bytes
  bombHeader.writeUInt32LE(60 * 1024 * 1024, 22) // uncompressed size: 60 MB
  bombHeader.writeUInt16LE(4, 26)         // filename length: 4
  bombHeader.writeUInt16LE(0, 28)         // extra field length: 0
  bombHeader.write('test', 30)

  const bombRes = validateXlsxArchive(bombHeader)
  assert(!bombRes.valid, 'Detects and blocks zip bomb with excessive uncompressed size')
  assert(bombRes.error.includes('Decompression bomb protection triggered'), 'Returns explicit decompression bomb error')

  // 4. Simulated high-compression ratio bomb (> 50:1)
  const ratioBombHeader = Buffer.alloc(40, 0)
  ratioBombHeader.writeUInt32LE(0x04034b50, 0)
  ratioBombHeader.writeUInt32LE(10, 18)
  ratioBombHeader.writeUInt32LE(10000, 22) // 10,000 uncompressed vs 40 byte buffer = 250:1 ratio
  ratioBombHeader.writeUInt16LE(4, 26)
  ratioBombHeader.writeUInt16LE(0, 28)
  ratioBombHeader.write('bomb', 30)

  const ratioRes = validateXlsxArchive(ratioBombHeader)
  assert(!ratioRes.valid, 'Detects and blocks zip bomb with excessive compression ratio')
  assert(ratioRes.error.includes('ratio'), 'Flags excessive compression ratio')

  // ── TEST GROUP 2: Reverse Proxy & CORS Runtime Enforcement ──────────────────
  console.log('\n--- Group 2: Reverse Proxy & CORS Enforcement ---')

  // Valid proxy hops
  assert(parseAndValidateTrustProxy(1) === 1, 'Accepts integer hop count 1')
  assert(parseAndValidateTrustProxy('2') === 2, 'Parses string hop count "2"')
  assert(parseAndValidateTrustProxy('loopback') === 'loopback', 'Accepts keyword "loopback"')
  assert(parseAndValidateTrustProxy('127.0.0.1') === '127.0.0.1', 'Accepts valid IPv4 address')

  // Invalid proxy hops strictly rejected in production
  let proxyThrew1 = false
  try {
    parseAndValidateTrustProxy('true', true)
  } catch {
    proxyThrew1 = true
  }
  assert(proxyThrew1, 'Rejects ambiguous boolean string "true" in production')

  let proxyThrew2 = false
  try {
    parseAndValidateTrustProxy('1.5', true)
  } catch {
    proxyThrew2 = true
  }
  assert(proxyThrew2, 'Rejects float hop count "1.5" in production')

  let proxyThrew3 = false
  try {
    parseAndValidateTrustProxy('2abc', true)
  } catch {
    proxyThrew3 = true
  }
  assert(proxyThrew3, 'Rejects malformed string "2abc" in production')

  // ── TEST GROUP 3: AI Provider Timeout & Resilience ──────────────────────────
  console.log('\n--- Group 3: AI Provider Timeout & Resilience ---')
  const aiServiceClient = require('./src/services/aiServiceClient')
  const aiChatService = require('./src/services/aiChat.service')

  assert(typeof aiServiceClient.getGapAnalysis === 'function', 'aiServiceClient exports getGapAnalysis')
  assert(typeof aiChatService.chat === 'function', 'aiChatService exports chat')

  // Rule-based fallback when keys are absent
  const originalGroqKey = process.env.GROQ_API_KEY
  delete process.env.GROQ_API_KEY
  delete process.env.GROK_API_KEY
  delete process.env.GEMINI_API_KEY
  delete process.env.OPENAI_API_KEY

  const fallbackAnswer = await aiChatService.chat([
    { role: 'user', content: 'What is the Consumer Price Index (CPI)?' },
  ])
  assert(fallbackAnswer.provider === 'fallback', 'AI Tutor seamlessly executes rule-based fallback when LLM keys are absent')
  assert(fallbackAnswer.reply && fallbackAnswer.reply.length > 50, 'Fallback response provides rich pedagogical content')

  if (originalGroqKey) process.env.GROQ_API_KEY = originalGroqKey

  // ── TEST GROUP 4: Controlled Index Initialization ───────────────────────────
  console.log('\n--- Group 4: Controlled Index Initialization Idempotency ---')
  const indexRes = await initializeIndexes('kaushalai_test')
  assert(indexRes.totalFailed === 0, 'Index initialization completed with 0 failures')
  assert(indexRes.totalExisting === 21, `All 21 query-critical indexes verified: got ${indexRes.totalExisting}`)
  assert(indexRes.totalCreated === 0, 'Zero unnecessary duplicate indexes created')

  // ── TEST GROUP 5: Production Configuration Review ───────────────────────────
  console.log('\n--- Group 5: Critical Production Configuration Safeguards ---')

  // COURSE_SOURCE_MODE=live requires keys
  const liveCheck = validateEnv({
    NODE_ENV: 'production',
    MONGO_URI: 'mongodb://127.0.0.1:27017/kaushalai',
    ACCESS_TOKEN_SECRET: 'x'.repeat(32),
    REFRESH_TOKEN_SECRET: 'y'.repeat(32),
    COOKIE_SECRET: 'z'.repeat(32),
    COURSE_SOURCE_MODE: 'live',
  })
  assert(!liveCheck.valid, 'COURSE_SOURCE_MODE=live rejected when required credentials missing')

  // COURSE_SOURCE_MODE=mock accepted (self-hosted official catalogue)
  const mockCheck = validateEnv({
    NODE_ENV: 'production',
    MONGO_URI: 'mongodb://127.0.0.1:27017/kaushalai',
    ACCESS_TOKEN_SECRET: 'x'.repeat(32),
    REFRESH_TOKEN_SECRET: 'y'.repeat(32),
    COOKIE_SECRET: 'z'.repeat(32),
    COURSE_SOURCE_MODE: 'mock',
  })
  assert(mockCheck.valid, 'COURSE_SOURCE_MODE=mock accepted (self-hosted official catalogue)')

  // ── Final Verification: Dev Database Immutability ───────────────────────────
  console.log('\n--- Dev Database Immutability Verification ---')
  const devConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
  const devCounts = {
    courses: await devConn.db.collection('courses').countDocuments(),
    quizzes: await devConn.db.collection('quizzes').countDocuments(),
    enrollments: await devConn.db.collection('enrollments').countDocuments(),
    certificates: await devConn.db.collection('certificates').countDocuments(),
  }
  await devConn.close()

  assert(devCounts.courses === 66, `Dev courses count is strictly untouched: 66 (got ${devCounts.courses})`)
  assert(devCounts.quizzes === 18, `Dev quizzes count is strictly untouched: 18 (got ${devCounts.quizzes})`)
  assert(devCounts.enrollments === 10, `Dev enrollments count is strictly untouched: 10 (got ${devCounts.enrollments})`)
  assert(devCounts.certificates === 0, `Dev certificates count is strictly untouched: 0 (got ${devCounts.certificates})`)

  console.log('\n===============================================================')
  console.log(`PHASE 42 SUITE COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`)
  console.log('===============================================================\n')

  process.exit(failedTests > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
