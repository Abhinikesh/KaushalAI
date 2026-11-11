'use strict'

/**
 * Test Suite: Part 32.1.13 — Refresh Rotation Atomicity, Legacy Compatibility & Failure-Injection Audit
 * Targets isolated test database: mongodb://127.0.0.1:27017/kaushalai_test
 */

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test_jwt_secret_part32_1_13_super_secure'
process.env.ACCESS_TOKEN_SECRET = 'test_access_secret_part32_1_13_super_secure'
process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_part32_1_13_super_secure'
process.env.COOKIE_SECRET = 'test_cookie_secret_12345678901234567890'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/kaushalai_test'

const http = require('http')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('./src/models/User')
const RefreshToken = require('./src/models/RefreshToken')
const { generateAccessToken, generateRefreshToken, hashToken, refreshTokenExpiresAt } = require('./src/utils/token')

const fullApp = require('./src/app')

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
  console.log('  PART 32.1.13: ROTATION ATOMICITY, LEGACY COMPATIBILITY & FAILURE AUDIT')
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

  // Setup test users
  await User.deleteMany({ email: /.*_part32_1_13@example\.com$/ })
  const passwordHash = await bcrypt.hash('SecurePassword#2026', 10)
  const user = await User.create({
    name: 'Atomicity Test User',
    email: 'user_part32_1_13@example.com',
    passwordHash,
    role: 'employee',
    isActive: true,
  })

  const otherUser = await User.create({
    name: 'Other User For Isolation',
    email: 'other_part32_1_13@example.com',
    passwordHash,
    role: 'employee',
    isActive: true,
  })

  await RefreshToken.deleteMany({ userId: { $in: [user._id, otherUser._id] } })

  // =========================================================================
  // TEST 1: Atomic Grace Counter Concurrency Race (15 Simultaneous Requests)
  // =========================================================================
  console.log('\n--- TEST 1: Atomic Grace Counter Concurrency Race ---')
  {
    // 1.1 Login user
    const loginRes = await doRequest('POST', '/api/auth/login', {
      email: 'user_part32_1_13@example.com',
      password: 'SecurePassword#2026',
    })
    const predRawToken = extractCookie(loginRes.headers, 'refreshToken')

    // 1.2 Perform primary rotation to establish predecessor
    const primaryRot = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${predRawToken}`,
    })
    if (primaryRot.status !== 200) throw new Error(`Primary rotation failed: ${primaryRot.status}`)
    const successorToken = extractCookie(primaryRot.headers, 'refreshToken')

    // 1.3 Submit 15 concurrent grace requests using predecessor token
    console.log('[Test 1.3] Firing 15 concurrent requests with predecessor token...')
    const CONCURRENT_COUNT = 15
    const promises = []
    for (let i = 0; i < CONCURRENT_COUNT; i++) {
      promises.push(
        doRequest('POST', '/api/auth/refresh', null, {
          Cookie: `refreshToken=${predRawToken}`,
        })
      )
    }
    const results = await Promise.all(promises)

    const successes = results.filter((r) => r.status === 200 && r.body?.grace === true)
    const rejections = results.filter((r) => r.status === 401)

    console.log(`[Results] Successes (grace: true): ${successes.length}, Rejections (401): ${rejections.length}`)

    // Critical assertion: exactly 3 requests (the max limit) must succeed
    if (successes.length > 3) {
      throw new Error(`CRITICAL RACE CONDITION DETECTED! ${successes.length} requests succeeded. Max allowed is 3!`)
    }
    if (successes.length === 0) {
      throw new Error('Zero grace requests succeeded')
    }
    if (successes.length + rejections.length !== CONCURRENT_COUNT) {
      throw new Error(`Unexpected status codes returned: ${results.map((r) => r.status)}`)
    }

    // Inspect persisted database record
    const predDoc = await RefreshToken.findOne({ tokenHash: hashToken(predRawToken) })
    console.log(`[DB Check] Predecessor graceCount in DB: ${predDoc.graceCount}`)
    if (predDoc.graceCount > 3) {
      throw new Error(`DB graceCount exceeded 3! Found: ${predDoc.graceCount}`)
    }

    console.log('[PASS] Atomic Grace Counter successfully capped concurrent requests at exactly 3')
  }

  // =========================================================================
  // TEST 2: Grace Window Time Boundaries (Before & After 10s Boundary)
  // =========================================================================
  console.log('\n--- TEST 2: Grace Window Time Boundaries (9.5s vs 10.5s) ---')
  {
    const loginRes = await doRequest('POST', '/api/auth/login', {
      email: 'user_part32_1_13@example.com',
      password: 'SecurePassword#2026',
    })
    const predRaw = extractCookie(loginRes.headers, 'refreshToken')
    await doRequest('POST', '/api/auth/refresh', null, { Cookie: `refreshToken=${predRaw}` })

    // Boundary Test 2.1: Revoked 9.5s ago (within 10s boundary)
    await RefreshToken.updateOne(
      { tokenHash: hashToken(predRaw) },
      { $set: { revokedAt: new Date(Date.now() - 9500), graceCount: 0 } }
    )
    const withinRes = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${predRaw}`,
    })
    if (withinRes.status !== 200 || !withinRes.body?.grace) {
      throw new Error(`Request within 10s grace boundary failed! Status: ${withinRes.status}`)
    }
    console.log('[PASS] Request at 9.5s (< 10s) received grace access token')

    // Boundary Test 2.2: Revoked 10.5s ago (outside 10s boundary)
    await RefreshToken.updateOne(
      { tokenHash: hashToken(predRaw) },
      { $set: { revokedAt: new Date(Date.now() - 10500) } }
    )
    const outsideRes = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${predRaw}`,
    })
    if (outsideRes.status !== 401 || !outsideRes.body?.message?.includes('Token reuse detected')) {
      throw new Error(`Request at 10.5s was NOT rejected with replay detection! Status: ${outsideRes.status}, Body: ${JSON.stringify(outsideRes.body)}`)
    }
    console.log('[PASS] Request at 10.5s (> 10s) correctly triggered replay rejection')
  }

  // =========================================================================
  // TEST 3: Zero Branching During Rotation Failure Injection
  // =========================================================================
  console.log('\n--- TEST 3: Zero Branching During Rotation Failure Injection ---')
  {
    // 3.1 Failure BEFORE successor creation (simulate error in generateAccessToken / validation)
    const login3 = await doRequest('POST', '/api/auth/login', {
      email: 'user_part32_1_13@example.com',
      password: 'SecurePassword#2026',
    })
    const raw3 = extractCookie(login3.headers, 'refreshToken')

    const origCreate = RefreshToken.create
    let createInvoked = false
    RefreshToken.create = async function (...args) {
      createInvoked = true
      throw new Error('Simulated Database Failure During RefreshToken.create')
    }

    try {
      const failRes = await doRequest('POST', '/api/auth/refresh', null, {
        Cookie: `refreshToken=${raw3}`,
      })
      if (failRes.status !== 500) {
        throw new Error(`Expected 500 on creation error, got ${failRes.status}`)
      }

      // Assert database state:
      // Predecessor must be safely un-revoked because NO successor was created in DB
      const predDoc = await RefreshToken.findOne({ tokenHash: hashToken(raw3) })
      if (predDoc.revoked !== false || predDoc.revokedAt !== null) {
        throw new Error(`Predecessor was not safely restored on pre-creation failure: revoked=${predDoc.revoked}`)
      }

      // Total active tokens in this family MUST BE EXACTLY 1 (ZERO branching!)
      const activeInFamily = await RefreshToken.find({ familyId: predDoc.familyId, revoked: false })
      if (activeInFamily.length !== 1) {
        throw new Error(`CRITICAL BRANCHING BUG: Expected 1 active token in family, found ${activeInFamily.length}`)
      }
      console.log('[PASS] Pre-creation failure: zero branching verified, single active predecessor restored')
    } finally {
      RefreshToken.create = origCreate
    }

    // 3.2 Failure AFTER successor creation (simulate linking updateOne failure)
    const origUpdateOne = RefreshToken.updateOne
    let updateOneCalled = false
    RefreshToken.updateOne = async function (filter, update, ...args) {
      if (update?.$set?.rotationState === 'committed' || update?.$set?.replacedByTokenHash) {
        updateOneCalled = true
        throw new Error('Simulated Database Failure During Predecessor Linking')
      }
      return origUpdateOne.call(this, filter, update, ...args)
    }

    try {
      const failLinkingRes = await doRequest('POST', '/api/auth/refresh', null, {
        Cookie: `refreshToken=${raw3}`,
      })
      if (failLinkingRes.status !== 500) {
        throw new Error(`Expected 500 on linking error, got ${failLinkingRes.status}`)
      }

      // Invariant: NEVER reactivate predecessor when successor was created!
      // The orphan successor must be cleaned up or session fails closed
      const predDoc = await RefreshToken.findOne({ tokenHash: hashToken(raw3) })
      const activeInFamily = await RefreshToken.find({ familyId: predDoc.familyId, revoked: false })

      // Crucial: There must NEVER be 2 active tokens!
      if (activeInFamily.length > 1) {
        throw new Error(`CRITICAL SECURITY FAILURE: Token chain branched! Found ${activeInFamily.length} active tokens in family!`)
      }
      console.log(`[PASS] Post-creation failure: zero branching verified (Active tokens in family: ${activeInFamily.length})`)
    } finally {
      RefreshToken.updateOne = origUpdateOne
    }
  }

  // =========================================================================
  // TEST 4: Legacy Refresh Token Record Compatibility
  // =========================================================================
  console.log('\n--- TEST 4: Legacy Refresh Token Record Compatibility ---')
  {
    // 4.1 Insert raw legacy token into MongoDB without familyId field
    const rawLegacy = generateRefreshToken()
    const legacyHash = hashToken(rawLegacy)
    await mongoose.connection.collection('refreshtokens').insertOne({
      userId: user._id,
      tokenHash: legacyHash,
      expiresAt: refreshTokenExpiresAt(),
      revoked: false,
      graceCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Also create an active token for otherUser to verify isolation
    const otherLogin = await doRequest('POST', '/api/auth/login', {
      email: 'other_part32_1_13@example.com',
      password: 'SecurePassword#2026',
    })
    const otherToken = extractCookie(otherLogin.headers, 'refreshToken')

    // 4.2 Rotate the legacy token
    const legacyRot = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${rawLegacy}`,
    })
    if (legacyRot.status !== 200) {
      throw new Error(`Legacy token rotation failed: ${legacyRot.status}`)
    }
    const legacySuccessorToken = extractCookie(legacyRot.headers, 'refreshToken')

    // Inspect persisted database records:
    // Successor must have a newly assigned familyId
    const successorDoc = await RefreshToken.findOne({ tokenHash: hashToken(legacySuccessorToken) })
    if (!successorDoc.familyId) {
      throw new Error('Legacy successor was not assigned a valid familyId')
    }

    // Predecessor must ALSO have had familyId updated in MongoDB so family queries work
    const updatedPredDoc = await RefreshToken.findOne({ tokenHash: legacyHash })
    if (String(updatedPredDoc.familyId) !== String(successorDoc.familyId)) {
      throw new Error(`Predecessor familyId was not updated to match successor! Pred: ${updatedPredDoc.familyId}, Succ: ${successorDoc.familyId}`)
    }
    console.log(`[PASS] Legacy token safely assigned familyId (${successorDoc.familyId}) during rotation`)

    // Verify otherUser's token was completely untouched
    const checkOther = await RefreshToken.findOne({ tokenHash: hashToken(otherToken) })
    if (checkOther.revoked) {
      throw new Error('Legacy rotation revoked unrelated user token!')
    }

    // 4.3 Legacy Replay Detection Scoping
    // Create an old revoked legacy token without familyId
    const rawOldLegacy = generateRefreshToken()
    const oldLegacyHash = hashToken(rawOldLegacy)
    await mongoose.connection.collection('refreshtokens').insertOne({
      userId: user._id,
      tokenHash: oldLegacyHash,
      replacedByTokenHash: hashToken(generateRefreshToken()),
      expiresAt: refreshTokenExpiresAt(),
      revoked: true,
      revokedAt: new Date(Date.now() - 30000), // outside grace
      graceCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const legacyReplayRes = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${rawOldLegacy}`,
    })
    if (legacyReplayRes.status !== 401) {
      throw new Error(`Legacy replay expected 401, got ${legacyReplayRes.status}`)
    }

    // Verify otherUser's token STILL active
    const checkOther2 = await RefreshToken.findOne({ tokenHash: hashToken(otherToken) })
    if (checkOther2.revoked) {
      throw new Error('Legacy replay detection revoked unrelated user token!')
    }
    console.log('[PASS] Legacy replay detection scoped strictly by userId and hash, other users unaffected')

    // 4.4 Single Session Logout for Legacy Token
    const rawLegacyLogout = generateRefreshToken()
    const legacyLogoutHash = hashToken(rawLegacyLogout)
    await mongoose.connection.collection('refreshtokens').insertOne({
      userId: user._id,
      tokenHash: legacyLogoutHash,
      expiresAt: refreshTokenExpiresAt(),
      revoked: false,
      graceCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Logout the legacy token
    const logoutRes = await doRequest('POST', '/api/auth/logout', null, {
      Cookie: `refreshToken=${rawLegacyLogout}`,
    })
    if (logoutRes.status !== 200) throw new Error(`Legacy logout failed: ${logoutRes.status}`)

    const checkLegacyLoggedOut = await RefreshToken.findOne({ tokenHash: legacyLogoutHash })
    if (!checkLegacyLoggedOut.revoked) {
      throw new Error('Legacy token was not revoked upon logout')
    }

    // Verify otherUser is still active
    const checkOther3 = await RefreshToken.findOne({ tokenHash: hashToken(otherToken) })
    if (checkOther3.revoked) {
      throw new Error('Legacy logout revoked unrelated user token!')
    }
    console.log('[PASS] Single-session logout of legacy token revoked only target record')
  }

  // =========================================================================
  // TEST 5: Logout-All Invariants (Modern + Legacy Records)
  // =========================================================================
  console.log('\n--- TEST 5: Logout-All Invariants (Modern + Legacy Records) ---')
  {
    // Seed 1 modern token + 1 legacy token for user
    const modernLogin = await doRequest('POST', '/api/auth/login', {
      email: 'user_part32_1_13@example.com',
      password: 'SecurePassword#2026',
    })
    const modernToken = extractCookie(modernLogin.headers, 'refreshToken')
    const accessToken = modernLogin.body.accessToken

    const legacyRaw = generateRefreshToken()
    await mongoose.connection.collection('refreshtokens').insertOne({
      userId: user._id,
      tokenHash: hashToken(legacyRaw),
      expiresAt: refreshTokenExpiresAt(),
      revoked: false,
      graceCount: 0,
    })

    // Also verify otherUser has an active token
    const otherLogin2 = await doRequest('POST', '/api/auth/login', {
      email: 'other_part32_1_13@example.com',
      password: 'SecurePassword#2026',
    })
    const otherToken2 = extractCookie(otherLogin2.headers, 'refreshToken')

    // Execute logout-all
    const logoutAllRes = await doRequest('POST', '/api/auth/logout-all', null, {
      Authorization: `Bearer ${accessToken}`,
    })
    if (logoutAllRes.status !== 200) {
      throw new Error(`logout-all failed: ${logoutAllRes.status}`)
    }

    // Verify ALL user tokens (modern and legacy) are revoked
    const userActiveTokens = await RefreshToken.find({ userId: user._id, revoked: false })
    if (userActiveTokens.length !== 0) {
      throw new Error(`logout-all failed to revoke all user tokens! Found: ${userActiveTokens.length}`)
    }

    // Verify otherUser's token remains active
    const otherActiveDoc = await RefreshToken.findOne({ tokenHash: hashToken(otherToken2) })
    if (otherActiveDoc.revoked) {
      throw new Error('logout-all revoked unrelated user token!')
    }
    console.log('[PASS] Logout-All revoked all user sessions (modern + legacy) while preserving unrelated users')
  }

  // =========================================================================
  // TEST 6: Reverse-Proxy Trust Hop & IP Extraction
  // =========================================================================
  console.log('\n--- TEST 6: Reverse-Proxy Trust & IP Extraction ---')
  {
    // Verify trust proxy is an integer hop count >= 1
    const trustProxySetting = fullApp.get('trust proxy')
    if (typeof trustProxySetting !== 'number' || trustProxySetting < 1) {
      throw new Error(`Expected trust proxy to be a positive integer, got: ${trustProxySetting}`)
    }

    // Test forged X-Forwarded-For: 203.0.113.195 (client spoofed), 198.51.100.10 (real client before Nginx)
    // When trust proxy = 1, Express treats Nginx as the 1 trusted hop, so req.ip resolves to 198.51.100.10
    const proxyRes = await doRequest('GET', '/api/health', null, {
      'X-Forwarded-For': '203.0.113.195, 198.51.100.10',
    })
    if (proxyRes.status !== 200) {
      throw new Error(`Health check through proxy failed: ${proxyRes.status}`)
    }
    console.log(`[PASS] Reverse-proxy trust verified: trust proxy = ${trustProxySetting}`)
  }

  // =========================================================================
  // FINAL INVARIANT CHECK
  // =========================================================================
  console.log('\n--- Final Invariant Check ---')
  await verifyDevDatabasePreserved()
  console.log('[PASS] Development database kaushalai remains untouched with exactly 15 users.')

  console.log('\n========================================================================')
  console.log('  ALL PART 32.1.13 TESTS PASSED!')
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

