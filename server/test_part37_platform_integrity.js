'use strict'

/**
 * test_part37_platform_integrity.js
 * Phase 37 — KaushalAI Platform-Wide Integrity & Readiness
 *
 * Tests:
 *  A. Admin route authorization — every formerly-unguarded admin route must
 *     return 401/403 for unauthenticated and 403 for learner; succeed for admin.
 *  B. POST /admin/seed — must require admin auth.
 *  C. Roster write endpoints — must require admin auth.
 *  D. AI Chat conversation persistence and ownership isolation.
 *  E. Published course semantics (isPublished filter).
 *  F. Dev database baseline remains untouched.
 *
 * Uses kaushalai_test — NEVER writes to kaushalai.
 */

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const http     = require('http')
const mongoose = require('mongoose')
const jwt      = require('jsonwebtoken')
const { validateTestDatabaseUri } = require('./src/test/testDbGuard')

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET
const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/kaushalai_test'
const devDbUri  = 'mongodb://127.0.0.1:27017/kaushalai'

validateTestDatabaseUri(testDbUri)

let totalPassed = 0
let totalFailed = 0
const failDetails = []

function assertOk(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    totalPassed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    totalFailed++
    failDetails.push(message)
  }
}

function makeRequest(port, options, body = null) {
  return new Promise((resolve, reject) => {
    const headers = { ...(options.headers || {}) }
    let payload = null
    if (body !== null && body !== undefined) {
      payload = typeof body === 'string' ? body : JSON.stringify(body)
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'
      headers['Content-Length'] = Buffer.byteLength(payload)
    }
    const req = http.request({ port, host: '127.0.0.1', ...options, headers }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} })
        } catch {
          resolve({ status: res.statusCode, body: data })
        }
      })
    })
    req.on('error', reject)
    if (payload !== null) req.write(payload)
    req.end()
  })
}

async function runTests() {
  console.log('===================================================================')
  console.log('PHASE 37: PLATFORM-WIDE INTEGRITY & READINESS')
  console.log('Target DB: ' + testDbUri)
  console.log('===================================================================')

  await mongoose.connect(testDbUri)
  const dbName = mongoose.connection.db.databaseName
  if (dbName !== 'kaushalai_test') {
    console.error(`ABORT: Connected to wrong DB: ${dbName}`)
    process.exit(1)
  }
  console.log(`Connected to: ${dbName} (safe)\n`)

  const User        = require('./src/models/User')
  const Course      = require('./src/models/Course')
  const Conversation = require('./src/models/Conversation')
  const Message     = require('./src/models/Message')

  const app    = require('./src/app')
  const server = await new Promise((resolve) => {
    const s = http.createServer(app)
    s.listen(0, '127.0.0.1', () => resolve(s))
  })
  const port = server.address().port

  // Cleanup previous fixtures
  const runSuffix = `p37_${Date.now()}`
  await User.deleteMany({ email: { $regex: /p37_.*@test\.kaushalai/ } })

  // Create users
  const learnerUser = await User.create({
    name: `Learner P37 ${runSuffix}`,
    email: `learner_${runSuffix}@test.kaushalai`,
    passwordHash: 'hashed_pw',
    role: 'employee',
    onboarding_completed: true,
  })
  const adminUser = await User.create({
    name: `Admin P37 ${runSuffix}`,
    email: `admin_${runSuffix}@test.kaushalai`,
    passwordHash: 'hashed_pw',
    role: 'admin',
    onboarding_completed: true,
  })
  const learnerB = await User.create({
    name: `LearnerB P37 ${runSuffix}`,
    email: `learnerb_${runSuffix}@test.kaushalai`,
    passwordHash: 'hashed_pw',
    role: 'employee',
    onboarding_completed: true,
  })

  const learnerToken = jwt.sign({ id: String(learnerUser._id), role: 'employee' }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
  const adminToken   = jwt.sign({ id: String(adminUser._id),   role: 'admin'    }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
  const learnerBToken= jwt.sign({ id: String(learnerB._id),    role: 'employee' }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

  const noAuth      = {}
  const learnerAuth = { Authorization: `Bearer ${learnerToken}` }
  const adminAuth   = { Authorization: `Bearer ${adminToken}` }
  const learnerBAuth= { Authorization: `Bearer ${learnerBToken}` }

  // ══════════════════════════════════════════════════════════════════════════
  // A. Admin Route Authorization — formerly unguarded routes
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ A. Admin Route Authorization ════════════════════════════════════')

  const guardedGetRoutes = [
    '/api/admin/heatmap',
    '/api/admin/top-gaps',
    '/api/admin/departments-summary',
    '/api/admin/roles-summary',
    '/api/admin/audit-logs',
    '/api/admin/users',
    '/api/admin/roster',
    '/api/admin/system-settings',
    '/api/admin/summary',
    '/api/admin/materials',
  ]

  for (const routePath of guardedGetRoutes) {
    let res = await makeRequest(port, { method: 'GET', path: routePath, headers: noAuth })
    assertOk(
      res.status === 401 || res.status === 403,
      `GET ${routePath} → 401/403 unauthenticated (got ${res.status})`
    )

    res = await makeRequest(port, { method: 'GET', path: routePath, headers: learnerAuth })
    assertOk(
      res.status === 401 || res.status === 403,
      `GET ${routePath} → 401/403 for learner (got ${res.status})`
    )

    res = await makeRequest(port, { method: 'GET', path: routePath, headers: adminAuth })
    assertOk(
      res.status !== 401 && res.status !== 403,
      `GET ${routePath} → accessible for admin (got ${res.status})`
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // B. POST /admin/seed — must require admin auth
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ B. POST /admin/seed Authorization ═══════════════════════════════')

  let res = await makeRequest(port, { method: 'POST', path: '/api/admin/seed', headers: noAuth }, {})
  assertOk(res.status === 401 || res.status === 403, `POST /api/admin/seed → 401/403 unauthenticated (got ${res.status})`)

  res = await makeRequest(port, { method: 'POST', path: '/api/admin/seed', headers: learnerAuth }, {})
  assertOk(res.status === 401 || res.status === 403, `POST /api/admin/seed → 401/403 learner (got ${res.status})`)

  // ══════════════════════════════════════════════════════════════════════════
  // C. Roster write endpoints — must require admin auth
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ C. Roster Write Authorization ═══════════════════════════════════')

  res = await makeRequest(port, { method: 'POST', path: '/api/admin/roster', headers: noAuth },
    { employeeId: 'E001', fullName: 'Test', officialEmail: 'x@y.gov', department: 'Test' })
  assertOk(res.status === 401 || res.status === 403, `POST /api/admin/roster → 401/403 unauthenticated (got ${res.status})`)

  res = await makeRequest(port, { method: 'POST', path: '/api/admin/roster', headers: learnerAuth },
    { employeeId: 'E001', fullName: 'Test', officialEmail: 'x@y.gov', department: 'Test' })
  assertOk(res.status === 401 || res.status === 403, `POST /api/admin/roster → 401/403 learner (got ${res.status})`)

  res = await makeRequest(port, { method: 'DELETE', path: '/api/admin/roster/000000000000000000000001', headers: noAuth })
  assertOk(res.status === 401 || res.status === 403, `DELETE /api/admin/roster/:id → 401/403 unauthenticated (got ${res.status})`)

  res = await makeRequest(port, { method: 'PUT', path: '/api/admin/users/000000000000000000000001', headers: noAuth }, { name: 'Hacker' })
  assertOk(res.status === 401 || res.status === 403, `PUT /api/admin/users/:id → 401/403 unauthenticated (got ${res.status})`)

  res = await makeRequest(port, { method: 'PUT', path: '/api/admin/users/000000000000000000000001', headers: learnerAuth }, { name: 'Hacker' })
  assertOk(res.status === 401 || res.status === 403, `PUT /api/admin/users/:id → 401/403 learner (got ${res.status})`)

  // ══════════════════════════════════════════════════════════════════════════
  // D. AI Chat conversation persistence
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ D. AI Chat Conversation Persistence ═════════════════════════════')

  // Unauthenticated chat must fail
  res = await makeRequest(port, { method: 'POST', path: '/api/ai/chat', headers: noAuth }, { message: 'Hello' })
  assertOk(res.status === 401 || res.status === 403, `POST /api/ai/chat → 401/403 unauthenticated (got ${res.status})`)

  // Empty message rejected
  res = await makeRequest(port, { method: 'POST', path: '/api/ai/chat', headers: learnerAuth }, { message: '   ' })
  assertOk(res.status === 400, `POST /api/ai/chat → 400 for blank message (got ${res.status})`)

  // Oversized message rejected
  res = await makeRequest(port, { method: 'POST', path: '/api/ai/chat', headers: learnerAuth }, { message: 'A'.repeat(8001) })
  assertOk(res.status === 400, `POST /api/ai/chat → 400 for 8001-char message (got ${res.status})`)

  // Valid message creates conversation
  res = await makeRequest(port, { method: 'POST', path: '/api/ai/chat', headers: learnerAuth },
    { message: 'What is the Consumer Price Index?' })
  assertOk(res.status === 200, `POST /api/ai/chat → 200 for valid message (got ${res.status})`)
  assertOk(typeof res.body.reply === 'string' && res.body.reply.length > 0, 'Reply is non-empty string')
  assertOk(typeof res.body.conversationId === 'string', 'conversationId returned')

  const conversationId = res.body.conversationId

  // Continue existing conversation
  if (conversationId) {
    res = await makeRequest(port, { method: 'POST', path: '/api/ai/chat', headers: learnerAuth },
      { message: 'Tell me more about NQAF.', conversationId })
    assertOk(res.status === 200, `POST /api/ai/chat → 200 continuing conversation (got ${res.status})`)
    assertOk(res.body.conversationId === conversationId, 'Same conversationId returned for continuation')
  }

  // List conversations
  res = await makeRequest(port, { method: 'GET', path: '/api/ai/conversations', headers: learnerAuth })
  assertOk(res.status === 200, `GET /api/ai/conversations → 200 (got ${res.status})`)
  assertOk(Array.isArray(res.body.conversations), 'Response contains conversations array')
  if (Array.isArray(res.body.conversations) && conversationId) {
    const found = res.body.conversations.some(c => c._id === conversationId || c._id?.toString() === conversationId)
    assertOk(found, 'Created conversation appears in list')
  }

  // Retrieve specific conversation with messages
  if (conversationId) {
    res = await makeRequest(port, { method: 'GET', path: `/api/ai/conversations/${conversationId}`, headers: learnerAuth })
    assertOk(res.status === 200, `GET /api/ai/conversations/:id → 200 (got ${res.status})`)
    assertOk(res.body.conversation && (res.body.conversation._id === conversationId || res.body.conversation._id?.toString() === conversationId), 'Conversation object returned')

    res = await makeRequest(port, { method: 'GET', path: `/api/ai/conversations/${conversationId}/messages`, headers: learnerAuth })
    assertOk(res.status === 200, `GET /api/ai/conversations/:id/messages → 200 (got ${res.status})`)
    assertOk(Array.isArray(res.body.messages), 'Messages array in conversation messages endpoint')
    if (Array.isArray(res.body.messages)) {
      assertOk(res.body.messages.length >= 2, `At least 2 messages (user+assistant), got ${res.body.messages.length}`)
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // E. AI Chat ownership isolation
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ E. AI Chat Ownership Isolation ══════════════════════════════════')

  if (conversationId) {
    res = await makeRequest(port, { method: 'GET', path: `/api/ai/conversations/${conversationId}`, headers: learnerBAuth })
    assertOk(
      res.status === 404 || res.status === 403,
      `Learner B cannot read Learner A conversation → 404/403 (got ${res.status})`
    )

    res = await makeRequest(port, { method: 'POST', path: '/api/ai/chat', headers: learnerBAuth },
      { message: 'Hello', conversationId })
    assertOk(
      res.status === 404 || res.status === 403,
      `Learner B cannot post to Learner A conversation → 404/403 (got ${res.status})`
    )

    // Invalid conversationId format rejected
    res = await makeRequest(port, { method: 'POST', path: '/api/ai/chat', headers: learnerAuth },
      { message: 'Hi', conversationId: 'not-a-valid-objectid' })
    assertOk(res.status === 400, `Invalid conversationId format → 400 (got ${res.status})`)
  }

  // ══════════════════════════════════════════════════════════════════════════
  // F. Published course semantics
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ F. Published Course Semantics ═══════════════════════════════════')

  const draftCourse = await Course.create({
    title: `P37 Draft Course ${runSuffix}`,
    description: 'Should not appear in listing',
    isPublished: false,
    source: 'mospi',
  })

  const publishedCourse = await Course.create({
    title: `P37 Published Course ${runSuffix}`,
    description: 'Should appear in listing',
    isPublished: true,
    source: 'mospi',
  })

  res = await makeRequest(port, { method: 'GET', path: '/api/courses', headers: learnerAuth })
  assertOk(res.status === 200, `GET /api/courses → 200 (got ${res.status})`)

  const coursesArr = Array.isArray(res.body) ? res.body : (res.body.courses || [])
  const courseIds = coursesArr.map(c => (c._id || c.id || '').toString())

  assertOk(!courseIds.includes(draftCourse._id.toString()),
    `isPublished=false course NOT returned in listing`)
  assertOk(courseIds.includes(publishedCourse._id.toString()),
    `isPublished=true course IS returned in listing`)

  // Enrollment into unpublished course is rejected
  res = await makeRequest(port, { method: 'POST', path: `/api/courses/${draftCourse._id}/enroll`, headers: learnerAuth }, {})
  assertOk(
    res.status === 400 || res.status === 403 || res.status === 404,
    `Enrollment into unpublished course → 400/403/404 (got ${res.status})`
  )

  // ══════════════════════════════════════════════════════════════════════════
  // G. Admin audit-log data integrity
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ G. Audit Log Access Control ═════════════════════════════════════')

  res = await makeRequest(port, { method: 'GET', path: '/api/admin/audit-logs', headers: noAuth })
  assertOk(res.status === 401 || res.status === 403,
    `GET /api/admin/audit-logs → 401/403 unauthenticated (got ${res.status})`)

  res = await makeRequest(port, { method: 'GET', path: '/api/admin/audit-logs', headers: learnerAuth })
  assertOk(res.status === 401 || res.status === 403,
    `GET /api/admin/audit-logs → 401/403 learner (got ${res.status})`)

  res = await makeRequest(port, { method: 'GET', path: '/api/admin/audit-logs', headers: adminAuth })
  assertOk(res.status === 200, `GET /api/admin/audit-logs → 200 for admin (got ${res.status})`)

  // ══════════════════════════════════════════════════════════════════════════
  // H. Dev database baseline — must be completely untouched
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ H. Dev Database Baseline Verification ════════════════════════════')

  const devConn = await mongoose.createConnection(devDbUri).asPromise()
  const baseline = {
    courses: 66, quizzes: 18, quizattempts: 12, enrollments: 10,
    learning_progress: 10, learning_activities: 0, certificates: 0,
    user_competencies: 41, skill_gaps: 264,
  }
  let devOk = true
  for (const [coll, expected] of Object.entries(baseline)) {
    const actual = await devConn.db.collection(coll).countDocuments()
    if (actual !== expected) {
      console.error(`  ✗ FAIL: dev kaushalai.${coll} = ${actual} (expected ${expected})`)
      devOk = false
      totalFailed++
      failDetails.push(`dev kaushalai.${coll} = ${actual}, expected ${expected}`)
    }
  }
  await devConn.close()
  if (devOk) {
    console.log('  ✓ PASS: Dev kaushalai database completely untouched')
    totalPassed++
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  if (conversationId) {
    await Conversation.deleteMany({ _id: conversationId })
    await Message.deleteMany({ conversationId })
  }
  await Course.deleteOne({ _id: draftCourse._id })
  await Course.deleteOne({ _id: publishedCourse._id })
  await User.deleteMany({ email: { $in: [learnerUser.email, adminUser.email, learnerB.email] } })

  server.close()
  await mongoose.disconnect()

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n===================================================================')
  console.log(`Phase 37 Platform Integrity: ${totalPassed} passed, ${totalFailed} failed`)
  if (failDetails.length) {
    console.log('\nFailed tests:')
    failDetails.forEach(f => console.log(`  ✗ ${f}`))
  }
  console.log('===================================================================\n')

  process.exit(totalFailed > 0 ? 1 : 0)
}

runTests().catch(err => {
  console.error('[FATAL]', err)
  process.exit(1)
})
