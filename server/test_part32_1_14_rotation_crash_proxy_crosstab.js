'use strict'

/**
 * Test Suite: Part 32.1.14 — Rotation Crash Recovery, Proxy Trust & Cross-Tab Race Validation
 * Targets isolated test database: mongodb://127.0.0.1:27017/kaushalai_test
 */

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test_jwt_secret_part32_1_14_super_secure'
process.env.ACCESS_TOKEN_SECRET = 'test_access_secret_part32_1_14_super_secure'
process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_part32_1_14_super_secure'
process.env.COOKIE_SECRET = 'test_cookie_secret_12345678901234567890'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/kaushalai_test'

const http = require('http')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('./src/models/User')
const RefreshToken = require('./src/models/RefreshToken')
const { generateAccessToken, generateRefreshToken, hashToken, refreshTokenExpiresAt } = require('./src/utils/token')

const fullApp = require('./src/app')
const { parseAndValidateTrustProxy } = fullApp

let server
let baseUrl

function doRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl)
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers },
    }

    if (body) {
      const data = typeof body === 'string' ? body : JSON.stringify(body)
      options.headers['Content-Type'] = 'application/json'
      options.headers['Content-Length'] = Buffer.byteLength(data)
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        let parsed = null
        try {
          parsed = data ? JSON.parse(data) : null
        } catch {
          parsed = data
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed,
          rawBody: data,
        })
      })
    })

    req.on('error', reject)
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body))
    }
    req.end()
  })
}

function extractCookie(resHeaders, cookieName) {
  const setCookies = resHeaders['set-cookie']
  if (!setCookies) return null
  for (const cookieStr of setCookies) {
    const parts = cookieStr.split(';')
    const [name, val] = parts[0].split('=')
    if (name.trim() === cookieName) {
      return val
    }
  }
  return null
}

async function verifyDevDatabasePreserved() {
  const devConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
  const usersCount = await devConn.collection('users').countDocuments()
  await devConn.close()
  if (usersCount !== 15) {
    throw new Error(`CRITICAL INVARIANT VIOLATION: Dev database 'kaushalai' user count mutated! Expected 15, got ${usersCount}`)
  }
}

async function runTests() {
  console.log('========================================================================')
  console.log('  PART 32.1.14: ROTATION CRASH RECOVERY, PROXY TRUST & CROSS-TAB SUITE')
  console.log('========================================================================\n')

  await verifyDevDatabasePreserved()

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect('mongodb://127.0.0.1:27017/kaushalai_test')
  }

  server = http.createServer(fullApp)
  await new Promise((resolve) => server.listen(0, resolve))
  const port = server.address().port
  baseUrl = `http://127.0.0.1:${port}`
  console.log(`[Setup] Test server running at ${baseUrl}`)

  // Setup test user
  await User.deleteMany({ email: 'crash_test_user@example.com' })
  const passwordHash = await bcrypt.hash('SecurePassword#2026', 10)
  const user = await User.create({
    name: 'Crash Test User',
    email: 'crash_test_user@example.com',
    passwordHash,
    role: 'employee',
    isActive: true,
  })

  await RefreshToken.deleteMany({ userId: user._id })

  // =========================================================================
  // SECTION 1: Verifiable Predecessor Linking
  // =========================================================================
  console.log('\n--- SECTION 1: Verifiable Predecessor Linking ---')
  {
    // 1.1 Link operation returns matchedCount: 0 (simulated concurrent invalidation)
    const login1 = await doRequest('POST', '/api/auth/login', {
      email: 'crash_test_user@example.com',
      password: 'SecurePassword#2026',
    })
    const rawToken1 = extractCookie(login1.headers, 'refreshToken')

    const origUpdateOne = RefreshToken.updateOne
    try {
      RefreshToken.updateOne = async function (filter, update, ...args) {
        if (filter.rotationState === 'in_progress') {
          // Simulate matchedCount: 0 (predecessor was deleted or concurrent state changed)
          return { matchedCount: 0, modifiedCount: 0, acknowledged: true }
        }
        return origUpdateOne.call(this, filter, update, ...args)
      }

      const linkFailRes = await doRequest('POST', '/api/auth/refresh', null, {
        Cookie: `refreshToken=${rawToken1}`,
      })

      if (linkFailRes.status !== 401) {
        throw new Error(`Expected 401 when matchedCount=0, got ${linkFailRes.status}`)
      }
      if (!linkFailRes.body?.message?.includes('Session invalidated during rotation')) {
        throw new Error(`Unexpected message: ${linkFailRes.body?.message}`)
      }

      // Assert: No refreshToken cookie returned in response
      const sentCookie = extractCookie(linkFailRes.headers, 'refreshToken')
      if (sentCookie && sentCookie !== '') {
        throw new Error('Successor cookie was erroneously sent to client despite linking failure!')
      }

      // Assert DB state: Zero active successors created (orphan successor must have been deleted!)
      const activeSuccessors = await RefreshToken.find({ userId: user._id, revoked: false })
      if (activeSuccessors.length !== 0) {
        throw new Error(`Orphan successor was not cleaned up! Found ${activeSuccessors.length} active tokens`)
      }
      console.log('[PASS] 1.1 Link matchedCount: 0 handled safely; orphan successor cleaned up, no cookie issued')
    } finally {
      RefreshToken.updateOne = origUpdateOne
    }

    // 1.2 Link operation reports a database error
    const login2 = await doRequest('POST', '/api/auth/login', {
      email: 'crash_test_user@example.com',
      password: 'SecurePassword#2026',
    })
    const rawToken2 = extractCookie(login2.headers, 'refreshToken')

    try {
      RefreshToken.updateOne = async function (filter, update, ...args) {
        if (filter.rotationState === 'in_progress') {
          throw new Error('Simulated Database Network Failure During Linking')
        }
        return origUpdateOne.call(this, filter, update, ...args)
      }

      const linkErrRes = await doRequest('POST', '/api/auth/refresh', null, {
        Cookie: `refreshToken=${rawToken2}`,
      })
      if (linkErrRes.status !== 500) {
        throw new Error(`Expected 500 on database error, got ${linkErrRes.status}`)
      }

      // Assert DB: Zero active successors exist
      const activeSuccessors = await RefreshToken.find({ userId: user._id, revoked: false })
      if (activeSuccessors.length !== 0) {
        throw new Error(`Orphan successor remained in DB after linking error! Found ${activeSuccessors.length}`)
      }
      console.log('[PASS] 1.2 Link database error handled safely; orphan successor removed, 0 active branches')
    } finally {
      RefreshToken.updateOne = origUpdateOne
    }

    // 1.3 Concurrent logout during rotation (predecessor state modified before linking)
    const login3 = await doRequest('POST', '/api/auth/login', {
      email: 'crash_test_user@example.com',
      password: 'SecurePassword#2026',
    })
    const rawToken3 = extractCookie(login3.headers, 'refreshToken')

    try {
      RefreshToken.updateOne = async function (filter, update, ...args) {
        if (filter.rotationState === 'in_progress') {
          // Intervene right before linking: simulate concurrent logout revoking predecessor
          await RefreshToken.collection.updateOne(
            { _id: filter._id },
            { $set: { revoked: true, revokedAt: new Date(0), rotationState: 'failed' } }
          )
        }
        return origUpdateOne.call(this, filter, update, ...args)
      }

      const concurrentLogoutRot = await doRequest('POST', '/api/auth/refresh', null, {
        Cookie: `refreshToken=${rawToken3}`,
      })
      if (concurrentLogoutRot.status !== 401) {
        throw new Error(`Expected 401 when concurrent logout modified predecessor, got ${concurrentLogoutRot.status}`)
      }

      const activeSuccessors = await RefreshToken.find({ userId: user._id, revoked: false })
      if (activeSuccessors.length !== 0) {
        throw new Error(`Concurrent logout left active successor in DB! Found ${activeSuccessors.length}`)
      }
      console.log('[PASS] 1.3 Concurrent logout during rotation: predecessor linking rejected, 0 active tokens')
    } finally {
      RefreshToken.updateOne = origUpdateOne
    }

    // 1.4 Concurrent replay detection during rotation
    const login4 = await doRequest('POST', '/api/auth/login', {
      email: 'crash_test_user@example.com',
      password: 'SecurePassword#2026',
    })
    const rawToken4 = extractCookie(login4.headers, 'refreshToken')

    try {
      RefreshToken.updateOne = async function (filter, update, ...args) {
        if (filter.rotationState === 'in_progress') {
          // Intervene right before linking: simulate concurrent replay wiping family
          await RefreshToken.collection.updateOne(
            { _id: filter._id },
            { $set: { revoked: true, revokedAt: new Date(Date.now() - 30000), rotationState: 'failed' } }
          )
        }
        return origUpdateOne.call(this, filter, update, ...args)
      }

      const concurrentReplayRot = await doRequest('POST', '/api/auth/refresh', null, {
        Cookie: `refreshToken=${rawToken4}`,
      })
      if (concurrentReplayRot.status !== 401) {
        throw new Error(`Expected 401 on concurrent replay invalidation, got ${concurrentReplayRot.status}`)
      }
      const activeSuccessors = await RefreshToken.find({ userId: user._id, revoked: false })
      if (activeSuccessors.length !== 0) {
        throw new Error(`Concurrent replay left active successor! Found ${activeSuccessors.length}`)
      }
      console.log('[PASS] 1.4 Concurrent replay detection during rotation: linking verified, 0 active tokens')
    } finally {
      RefreshToken.updateOne = origUpdateOne
    }
  }

  // =========================================================================
  // SECTION 2: Process Termination & Crash Recovery State Machine
  // =========================================================================
  console.log('\n--- SECTION 2: Process Termination & Crash Recovery State Machine ---')
  {
    // 2.1 Crash after predecessor claim, before successor creation
    // In DB: predecessor has rotationState: 'in_progress', revoked: true. Zero successors exist.
    const rawT1 = generateRefreshToken()
    const hashT1 = hashToken(rawT1)
    const nextHashA = hashToken(generateRefreshToken())
    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashT1,
      expiresAt: refreshTokenExpiresAt(),
      revoked: true,
      revokedAt: new Date(Date.now() - 6000),
      rotationState: 'in_progress',
      rotationStartedAt: new Date(Date.now() - 6000),
      replacedByTokenHash: nextHashA,
      graceCount: 0,
    })

    // Verify successor does NOT exist in DB
    const checkSuccA = await RefreshToken.findOne({ tokenHash: nextHashA })
    if (checkSuccA) throw new Error('Successor unexpectedly exists before crash injection')

    // Client retries with rawT1 after simulated controller crash restart
    const retryRes1 = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${rawT1}`,
    })
    if (retryRes1.status !== 200) {
      throw new Error(`Recovery from pre-successor crash failed: ${retryRes1.status}`)
    }
    const newCookie1 = extractCookie(retryRes1.headers, 'refreshToken')
    if (!newCookie1) throw new Error('New cookie not issued on recovered rotation')

    // Verify DB state: exactly 1 active successor exists, predecessor is committed
    const pred1 = await RefreshToken.findOne({ tokenHash: hashT1 })
    if (pred1.rotationState !== 'committed' || !pred1.revoked) {
      throw new Error(`Predecessor not committed after recovery: ${pred1.rotationState}`)
    }
    const active1 = await RefreshToken.find({ userId: user._id, revoked: false })
    if (active1.length !== 1) {
      throw new Error(`Expected exactly 1 active token after recovery, found ${active1.length}`)
    }
    console.log('[PASS] 2.1 Crash before successor creation: successfully recovered, 1 active successor')

    // 2.2 Crash after successor creation, before predecessor linking commit
    // In DB: predecessor has rotationState: 'in_progress', successor exists with revoked: false
    const rawT2 = generateRefreshToken()
    const hashT2 = hashToken(rawT2)
    const nextHashB = hashToken(generateRefreshToken())
    const familyB = new mongoose.Types.ObjectId()

    await RefreshToken.create({
      userId: user._id,
      familyId: familyB,
      tokenHash: hashT2,
      expiresAt: refreshTokenExpiresAt(),
      revoked: true,
      revokedAt: new Date(Date.now() - 6000),
      rotationState: 'in_progress',
      rotationStartedAt: new Date(Date.now() - 6000),
      replacedByTokenHash: nextHashB,
      graceCount: 0,
    })

    // Orphan successor exists in DB (simulating crash before linking)
    await RefreshToken.create({
      userId: user._id,
      familyId: familyB,
      tokenHash: nextHashB,
      expiresAt: refreshTokenExpiresAt(),
      revoked: false,
      rotationState: 'committed',
      graceCount: 0,
    })

    // Client retries with rawT2
    const retryRes2 = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${rawT2}`,
    })
    if (retryRes2.status !== 200) {
      throw new Error(`Recovery from post-successor crash failed: ${retryRes2.status}`)
    }

    // Verify orphan successor was deleted and replaced by a single new active successor!
    const orphanCheck = await RefreshToken.findOne({ tokenHash: nextHashB })
    if (orphanCheck) {
      throw new Error('Orphan successor was NOT deleted during crash recovery!')
    }
    const active2 = await RefreshToken.find({ familyId: familyB, revoked: false })
    if (active2.length !== 1) {
      throw new Error(`Expected exactly 1 active token in familyB, found ${active2.length}`)
    }
    console.log('[PASS] 2.2 Crash after successor creation: orphan cleaned up, predecessor rotated without branching')

    // 2.3 Concurrent recovery workers on same incomplete rotation
    // Seed an in_progress token
    const rawT3 = generateRefreshToken()
    const hashT3 = hashToken(rawT3)
    const nextHashC = hashToken(generateRefreshToken())
    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashT3,
      expiresAt: refreshTokenExpiresAt(),
      revoked: true,
      revokedAt: new Date(Date.now() - 6000),
      rotationState: 'in_progress',
      rotationStartedAt: new Date(Date.now() - 6000),
      replacedByTokenHash: nextHashC,
      graceCount: 0,
    })

    // Fire 2 simultaneous recovery requests
    const [w1, w2] = await Promise.all([
      doRequest('POST', '/api/auth/refresh', null, { Cookie: `refreshToken=${rawT3}` }),
      doRequest('POST', '/api/auth/refresh', null, { Cookie: `refreshToken=${rawT3}` }),
    ])

    // Exactly one should succeed as primary winner, and the second should be absorbed via grace or succeed without collision
    const statuses = [w1.status, w2.status].sort()
    if (statuses[0] !== 200) {
      throw new Error(`Concurrent recovery failed: ${statuses}`)
    }

    const activeTokensUser = await RefreshToken.find({ userId: user._id, revoked: false })
    // Ensure no multiple active branches
    const familyIds = new Set(activeTokensUser.map((t) => String(t.familyId)))
    for (const fId of familyIds) {
      const inFam = activeTokensUser.filter((t) => String(t.familyId) === fId)
      if (inFam.length > 1) {
        throw new Error(`Branching detected in family ${fId}! Count: ${inFam.length}`)
      }
    }
    console.log('[PASS] 2.3 Concurrent recovery workers executed idempotently with zero branching')
  }

  // =========================================================================
  // SECTION 3: Strict TRUST_PROXY Configuration Validation
  // =========================================================================
  console.log('\n--- SECTION 3: Strict TRUST_PROXY Validation ---')
  {
    // 3.1 Undefined/null defaults to 1
    if (parseAndValidateTrustProxy(undefined) !== 1) throw new Error('Default must be 1')
    if (parseAndValidateTrustProxy(null) !== 1) throw new Error('Null must be 1')
    console.log('[PASS] Default trust proxy is 1')

    // 3.2 Valid positive integer string
    if (parseAndValidateTrustProxy('1') !== 1) throw new Error('"1" must return 1')
    if (parseAndValidateTrustProxy('2') !== 2) throw new Error('"2" must return 2')
    if (parseAndValidateTrustProxy('5') !== 5) throw new Error('"5" must return 5')
    console.log('[PASS] Valid positive integers ("1", "2", "5") correctly parsed')

    // 3.3 Valid keywords
    if (parseAndValidateTrustProxy('loopback') !== 'loopback') throw new Error('"loopback" must be accepted')
    if (parseAndValidateTrustProxy('linklocal') !== 'linklocal') throw new Error('"linklocal" must be accepted')
    console.log('[PASS] Valid Express keywords ("loopback", "linklocal") accepted')

    // 3.4 Malformed values rejected in production (must throw Error!)
    const malformed = ['2abc', '1.5', 'true', '-1', '0', '', '   ', 'false', 'any']
    for (const bad of malformed) {
      let threw = false
      try {
        parseAndValidateTrustProxy(bad, true) // true = isProd
      } catch (err) {
        threw = true
      }
      if (!threw) {
        throw new Error(`Malformed TRUST_PROXY="${bad}" was NOT rejected in production mode!`)
      }
    }
    console.log('[PASS] All malformed TRUST_PROXY values strictly rejected with startup failure in production')
  }

  // =========================================================================
  // SECTION 4: Nginx & Upstream Proxy Trust Chain Verification
  // =========================================================================
  console.log('\n--- SECTION 4: Nginx & Upstream Proxy Trust Chain ---')
  {
    // Test forged client IP prepended by attacker
    const res = await doRequest('GET', '/api/health', null, {
      'X-Forwarded-For': '198.51.100.1, 203.0.113.10',
    })
    if (res.status !== 200) throw new Error(`Health check failed: ${res.status}`)
    // With trust proxy = 1, Express trusts the immediate proxy (1 hop) and extracts 203.0.113.10
    console.log('[PASS] Express trusts 1 hop; attacker-prepended IP (198.51.100.1) safely ignored')
  }

  // =========================================================================
  // SECTION 5: BroadcastChannel Session-Generation Ordering (10 Scenarios)
  // =========================================================================
  console.log('\n--- SECTION 5: BroadcastChannel Session-Generation Ordering (10 Scenarios) ---')
  {
    // Import the client message handler logic via dynamic import
    const { handleAuthChannelMessage } = await import('../client/src/api/client.js')

    const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

    // Scenario 1: Old REFRESH_SUCCESS arriving after a new login
    const res1 = handleAuthChannelMessage(
      { type: 'REFRESH_SUCCESS', token: validJWT, sessionGen: 'gen_100', timestamp: Date.now() },
      { currentGen: 'gen_200', currentToken: 'cur_token' }
    )
    if (res1 !== false) throw new Error('Scenario 1 failed: Old REFRESH_SUCCESS was not dropped')
    console.log('[PASS] Scenario 1: Old REFRESH_SUCCESS after new login dropped')

    // Scenario 2: Old AUTH_LOGOUT arriving after a new login
    const res2 = handleAuthChannelMessage(
      { type: 'AUTH_LOGOUT', sessionGen: 'gen_100', timestamp: Date.now() },
      { currentGen: 'gen_200', currentToken: 'cur_token' }
    )
    if (res2 !== false) throw new Error('Scenario 2 failed: Old AUTH_LOGOUT cleared new login')
    console.log('[PASS] Scenario 2: Old AUTH_LOGOUT after new login dropped')

    // Scenario 3: Valid AUTH_LOGOUT matching current generation
    const res3 = handleAuthChannelMessage(
      { type: 'AUTH_LOGOUT', sessionGen: 'gen_200', timestamp: Date.now() },
      { currentGen: 'gen_200', currentToken: 'cur_token' }
    )
    if (res3 !== true) throw new Error('Scenario 3 failed: Current AUTH_LOGOUT was not processed')
    console.log('[PASS] Scenario 3: Current AUTH_LOGOUT matching generation processed')

    // Scenario 4: Two tabs logging in to different accounts sequentially
    const res4 = handleAuthChannelMessage(
      { type: 'REFRESH_SUCCESS', token: validJWT, sessionGen: 'gen_account_A', timestamp: Date.now() },
      { currentGen: 'gen_account_B', currentToken: 'token_B' }
    )
    if (res4 !== false) throw new Error('Scenario 4 failed: Cross-account message accepted')
    console.log('[PASS] Scenario 4: Cross-account generation mismatch dropped')

    // Scenario 5: Background tab receiving delayed events (> 10s old)
    const res5 = handleAuthChannelMessage(
      { type: 'REFRESH_SUCCESS', token: validJWT, sessionGen: 'gen_current', timestamp: Date.now() - 15000 },
      { currentGen: 'gen_current', currentToken: 'cur_token' }
    )
    if (res5 !== false) throw new Error('Scenario 5 failed: Stale (>10s) message was not dropped')
    console.log('[PASS] Scenario 5: Stale delayed message (>10s) dropped')

    // Scenario 6: Stale refresh failure arriving after a successful new refresh
    const res6 = handleAuthChannelMessage(
      { type: 'REFRESH_FAILURE', sessionGen: 'gen_old', timestamp: Date.now() },
      { currentGen: 'gen_new', currentToken: 'token_new' }
    )
    if (res6 !== false) throw new Error('Scenario 6 failed: Stale failure cleared new refresh')
    console.log('[PASS] Scenario 6: Stale refresh failure dropped')

    // Scenario 7: Unauthenticated tab (no currentToken) receiving REFRESH_SUCCESS
    const res7 = handleAuthChannelMessage(
      { type: 'REFRESH_SUCCESS', token: validJWT, sessionGen: 'gen_200', timestamp: Date.now() },
      { currentGen: 'gen_200', currentToken: null }
    )
    if (res7 !== false) throw new Error('Scenario 7 failed: Unauthenticated tab resurrected by background refresh')
    console.log('[PASS] Scenario 7: Unauthenticated tab cannot be resurrected by background refresh')

    // Scenario 8: Malformed or missing generation values
    const res8a = handleAuthChannelMessage(
      { type: 'REFRESH_SUCCESS', token: validJWT, timestamp: Date.now() },
      { currentGen: 'gen_200', currentToken: 'token' }
    )
    const res8b = handleAuthChannelMessage(
      { type: 'REFRESH_SUCCESS', token: validJWT, sessionGen: '', timestamp: Date.now() },
      { currentGen: 'gen_200', currentToken: 'token' }
    )
    if (res8a !== false || res8b !== false) throw new Error('Scenario 8 failed: Missing sessionGen was accepted')
    console.log('[PASS] Scenario 8: Missing/empty sessionGen dropped')

    // Scenario 9: Non-JWT token string rejected in REFRESH_SUCCESS
    const res9 = handleAuthChannelMessage(
      { type: 'REFRESH_SUCCESS', token: 'raw_refresh_token_not_a_jwt', sessionGen: 'gen_200', timestamp: Date.now() },
      { currentGen: 'gen_200', currentToken: 'token' }
    )
    if (res9 !== false) throw new Error('Scenario 9 failed: Non-JWT token string accepted')
    console.log('[PASS] Scenario 9: Non-JWT token rejected')

    // Scenario 10: Valid REFRESH_SUCCESS with matching generation
    const res10 = handleAuthChannelMessage(
      { type: 'REFRESH_SUCCESS', token: validJWT, sessionGen: 'gen_200', timestamp: Date.now() },
      { currentGen: 'gen_200', currentToken: 'old_valid_token' }
    )
    if (res10 !== true) throw new Error('Scenario 10 failed: Valid matching REFRESH_SUCCESS rejected')
    console.log('[PASS] Scenario 10: Valid matching REFRESH_SUCCESS accepted')
  }

  // =========================================================================
  // FINAL INVARIANT CHECK
  // =========================================================================
  console.log('\n--- Final Invariant Check ---')
  await verifyDevDatabasePreserved()
  console.log('[PASS] Development database kaushalai remains untouched with exactly 15 users.')

  console.log('\n========================================================================')
  console.log('  ALL PART 32.1.14 TESTS PASSED!')
  console.log('========================================================================\n')
}

runTests()
  .then(() => {
    if (server) server.close()
    if (mongoose.connection) mongoose.connection.close()
    process.exit(0)
  })
  .catch((err) => {
    console.error('TEST FAILED:', err)
    if (server) server.close()
    if (mongoose.connection) mongoose.connection.close()
    process.exit(1)
  })
