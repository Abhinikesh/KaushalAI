'use strict'

/**
 * Test Suite: Part 32.1.12 — Refresh Token Family Isolation & Grace-Window Security
 * Targets isolated test database: mongodb://127.0.0.1:27017/kaushalai_test
 */

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test_jwt_secret_part32_1_12_super_secure'
process.env.ACCESS_TOKEN_SECRET = 'test_access_secret_part32_1_12_super_secure'
process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_part32_1_12_super_secure'
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
  console.log('--- STARTING PART 32.1.12 REFRESH FAMILY SECURITY TESTS ---')

  await verifyDevDatabasePreserved()

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect('mongodb://127.0.0.1:27017/kaushalai_test')
  }

  server = http.createServer(fullApp)
  await new Promise((resolve) => server.listen(0, resolve))
  const port = server.address().port
  baseUrl = `http://127.0.0.1:${port}`
  console.log(`Test server running at ${baseUrl}`)

  // Setup test user
  await User.deleteMany({ email: 'family_sec_user@example.com' })
  const passwordHash = await bcrypt.hash('SecurePassword#2026', 10)
  const user = await User.create({
    name: 'Family Sec Learner',
    email: 'family_sec_user@example.com',
    passwordHash,
    role: 'employee',
    isActive: true,
  })

  // Clean tokens for test user
  await RefreshToken.deleteMany({ userId: user._id })

  let sessionAToken = null
  let sessionBToken = null

  // =========================================================================
  // Test 1: Multi-Device Family Isolation (Session A & Session B)
  // =========================================================================
  console.log('\n--- Test 1: Multi-Device Family Isolation ---')
  {
    // Login 1: Session A (Laptop)
    const loginA = await doRequest('POST', '/api/auth/login', {
      email: 'family_sec_user@example.com',
      password: 'SecurePassword#2026',
    })
    if (loginA.status !== 200) throw new Error(`Session A login failed: ${loginA.status}`)
    sessionAToken = extractCookie(loginA.headers, 'refreshToken')
    if (!sessionAToken) throw new Error('Session A refresh cookie missing')

    // Login 2: Session B (Phone)
    const loginB = await doRequest('POST', '/api/auth/login', {
      email: 'family_sec_user@example.com',
      password: 'SecurePassword#2026',
    })
    if (loginB.status !== 200) throw new Error(`Session B login failed: ${loginB.status}`)
    sessionBToken = extractCookie(loginB.headers, 'refreshToken')
    if (!sessionBToken) throw new Error('Session B refresh cookie missing')

    const dbTokens = await RefreshToken.find({ userId: user._id, revoked: false })
    if (dbTokens.length !== 2) {
      throw new Error(`Expected 2 active tokens, found ${dbTokens.length}`)
    }

    const docA = await RefreshToken.findOne({ tokenHash: hashToken(sessionAToken) })
    const docB = await RefreshToken.findOne({ tokenHash: hashToken(sessionBToken) })

    if (!docA.familyId || !docB.familyId) {
      throw new Error('Both tokens must have familyId defined')
    }
    if (String(docA.familyId) === String(docB.familyId)) {
      throw new Error(`Distinct sessions must have distinct familyId! Got identical: ${docA.familyId}`)
    }
    console.log(`[PASS] Session A familyId: ${docA.familyId}, Session B familyId: ${docB.familyId}`)

    // Rotate Session A twice
    let curAToken = sessionAToken
    for (let i = 1; i <= 2; i++) {
      const rot = await doRequest('POST', '/api/auth/refresh', null, {
        Cookie: `refreshToken=${curAToken}`,
      })
      if (rot.status !== 200) throw new Error(`Rotation ${i} of Session A failed: ${rot.status}`)
      curAToken = extractCookie(rot.headers, 'refreshToken')
      const rotatedDoc = await RefreshToken.findOne({ tokenHash: hashToken(curAToken) })
      if (String(rotatedDoc.familyId) !== String(docA.familyId)) {
        throw new Error(`Rotation ${i} changed familyId! Expected ${docA.familyId}, got ${rotatedDoc.familyId}`)
      }
    }

    // Verify Session B is still active and unrevoked
    const checkB = await RefreshToken.findOne({ tokenHash: hashToken(sessionBToken) })
    if (checkB.revoked) {
      throw new Error('Session B was revoked when Session A rotated!')
    }

    // Refresh Session B to verify it functions normally
    const rotB = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${sessionBToken}`,
    })
    if (rotB.status !== 200) throw new Error(`Session B refresh failed: ${rotB.status}`)
    sessionBToken = extractCookie(rotB.headers, 'refreshToken')
    const rotatedBDoc = await RefreshToken.findOne({ tokenHash: hashToken(sessionBToken) })
    if (String(rotatedBDoc.familyId) !== String(docB.familyId)) {
      throw new Error('Session B rotation changed familyId!')
    }
    console.log('[PASS] Multi-Device Family Isolation verified: Session A rotations did not touch Session B')
  }

  // =========================================================================
  // Test 2: Targeted Replay Revocation (Replay Session A old token)
  // =========================================================================
  console.log('\n--- Test 2: Targeted Replay Revocation ---')
  {
    // sessionAToken is the very first token of Session A, now rotated and predecessor
    // Age its revokedAt past the 10s grace window
    await RefreshToken.updateOne(
      { tokenHash: hashToken(sessionAToken) },
      { $set: { revokedAt: new Date(Date.now() - 30 * 1000) } }
    )

    // Replay sessionAToken
    const replayRes = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${sessionAToken}`,
    })
    if (replayRes.status !== 401) {
      throw new Error(`Replay of Session A token expected 401, got ${replayRes.status}`)
    }
    if (!replayRes.body?.message?.includes('Token reuse detected')) {
      throw new Error(`Unexpected replay message: ${replayRes.body?.message}`)
    }

    // Verify Session A family tokens are now ALL revoked
    const docA = await RefreshToken.findOne({ tokenHash: hashToken(sessionAToken) })
    const activeATokens = await RefreshToken.find({ familyId: docA.familyId, revoked: false })
    if (activeATokens.length !== 0) {
      throw new Error(`Expected 0 active tokens in Session A family, found ${activeATokens.length}`)
    }

    // CRITICAL: Verify Session B is STILL ACTIVE and UNTOUCHED
    const docB = await RefreshToken.findOne({ tokenHash: hashToken(sessionBToken) })
    if (docB.revoked) {
      throw new Error('CRITICAL BUG: Session B was revoked when Session A suffered a replay attack!')
    }

    // Verify Session B can still refresh cleanly
    const rotB = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${sessionBToken}`,
    })
    if (rotB.status !== 200) {
      throw new Error(`Session B failed to refresh after Session A replay revocation: ${rotB.status}`)
    }
    sessionBToken = extractCookie(rotB.headers, 'refreshToken')
    console.log('[PASS] Targeted Replay Revocation verified: Session A family terminated, Session B unaffected')
  }

  // =========================================================================
  // Test 3: Grace Window Request Bounding (Max 3 requests)
  // =========================================================================
  console.log('\n--- Test 3: Grace Window Request Bounding ---')
  {
    // Create new session for testing grace window
    const loginC = await doRequest('POST', '/api/auth/login', {
      email: 'family_sec_user@example.com',
      password: 'SecurePassword#2026',
    })
    const sessionCToken = extractCookie(loginC.headers, 'refreshToken')

    // Perform primary rotation
    const rotC = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${sessionCToken}`,
    })
    if (rotC.status !== 200) throw new Error(`Session C primary rotation failed: ${rotC.status}`)
    const successorCToken = extractCookie(rotC.headers, 'refreshToken')

    // Predecessor is now rotated. Test grace requests 1, 2, 3
    for (let reqNum = 1; reqNum <= 3; reqNum++) {
      const graceReq = await doRequest('POST', '/api/auth/refresh', null, {
        Cookie: `refreshToken=${sessionCToken}`,
      })
      if (graceReq.status !== 200) {
        throw new Error(`Grace request ${reqNum} failed with status: ${graceReq.status}`)
      }
      if (!graceReq.body?.accessToken || !graceReq.body?.grace) {
        throw new Error(`Grace request ${reqNum} did not receive grace access token: ${JSON.stringify(graceReq.body)}`)
      }
      const predDoc = await RefreshToken.findOne({ tokenHash: hashToken(sessionCToken) })
      if (predDoc.graceCount !== reqNum) {
        throw new Error(`Expected graceCount ${reqNum}, got ${predDoc.graceCount}`)
      }
    }
    console.log('[PASS] Grace requests 1, 2, and 3 succeeded with grace: true')

    // 4th request must be REJECTED with 401
    const graceReq4 = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${sessionCToken}`,
    })
    if (graceReq4.status !== 401) {
      throw new Error(`Grace request 4 expected 401, got ${graceReq4.status}`)
    }
    if (!graceReq4.body?.message?.includes('Grace period request limit exceeded')) {
      throw new Error(`Unexpected message on 4th grace request: ${graceReq4.body?.message}`)
    }

    // Verify Session C family was revoked due to excessive grace attempts
    const predDoc = await RefreshToken.findOne({ tokenHash: hashToken(sessionCToken) })
    const activeCTokens = await RefreshToken.find({ familyId: predDoc.familyId, revoked: false })
    if (activeCTokens.length !== 0) {
      throw new Error(`Expected 0 active tokens in Session C family after grace exhaustion, found ${activeCTokens.length}`)
    }
    console.log('[PASS] 4th grace request rejected with 401 and family terminated')
  }

  // =========================================================================
  // Test 4: Rotation Failure Safe-Recovery (Compensating Rollback)
  // =========================================================================
  console.log('\n--- Test 4: Rotation Failure Safe-Recovery ---')
  {
    const loginD = await doRequest('POST', '/api/auth/login', {
      email: 'family_sec_user@example.com',
      password: 'SecurePassword#2026',
    })
    const sessionDToken = extractCookie(loginD.headers, 'refreshToken')

    // Inject temporary failure into RefreshToken.create
    const origCreate = RefreshToken.create
    let createCalled = false
    RefreshToken.create = async function (...args) {
      if (!createCalled) {
        createCalled = true
        throw new Error('Simulated Database Failure during Successor Creation')
      }
      return origCreate.apply(this, args)
    }

    try {
      const failRot = await doRequest('POST', '/api/auth/refresh', null, {
        Cookie: `refreshToken=${sessionDToken}`,
      })
      if (failRot.status !== 500) {
        throw new Error(`Expected 500 on simulated creation failure, got ${failRot.status}`)
      }

      // Verify compensating rollback restored the predecessor token!
      const predDoc = await RefreshToken.findOne({ tokenHash: hashToken(sessionDToken) })
      if (predDoc.revoked !== false || predDoc.revokedAt !== null) {
        throw new Error(`Compensating rollback failed! Token is still revoked: ${predDoc.revoked}`)
      }
      console.log('[PASS] Compensating rollback un-revoked predecessor token on successor creation failure')

      // Now attempt rotation again with restored create function -> should succeed
      const retryRot = await doRequest('POST', '/api/auth/refresh', null, {
        Cookie: `refreshToken=${sessionDToken}`,
      })
      if (retryRot.status !== 200) {
        throw new Error(`Subsequent rotation after rollback failed: ${retryRot.status}`)
      }
      console.log('[PASS] Predecessor successfully recovered and rotated on next attempt')
    } finally {
      RefreshToken.create = origCreate
    }
  }

  // =========================================================================
  // Test 5: Reverse-Proxy Trust & IP Extraction
  // =========================================================================
  console.log('\n--- Test 5: Reverse-Proxy Trust Validation ---')
  {
    // Check app setting 'trust proxy'
    const trustProxySetting = fullApp.get('trust proxy')
    if (trustProxySetting !== 1 && trustProxySetting !== true) {
      throw new Error(`Expected trust proxy to be 1 or true, got ${trustProxySetting}`)
    }

    // Verify proxy hop handling: send X-Forwarded-For with multiple IPs
    const testRes = await doRequest('GET', '/api/health', null, {
      'X-Forwarded-For': '203.0.113.195, 198.51.100.10',
    })
    if (testRes.status !== 200) {
      throw new Error(`Health check through proxy failed: ${testRes.status}`)
    }
    console.log(`[PASS] Reverse-proxy trust verified: app.get('trust proxy') = ${trustProxySetting}`)
  }

  // =========================================================================
  // Test 6: Single Session Logout vs Logout-All
  // =========================================================================
  console.log('\n--- Test 6: Single Session Logout vs Logout-All ---')
  {
    // Login Session E & Session F
    const loginE = await doRequest('POST', '/api/auth/login', {
      email: 'family_sec_user@example.com',
      password: 'SecurePassword#2026',
    })
    const sessionEToken = extractCookie(loginE.headers, 'refreshToken')
    const accessTokenE = loginE.body.accessToken

    const loginF = await doRequest('POST', '/api/auth/login', {
      email: 'family_sec_user@example.com',
      password: 'SecurePassword#2026',
    })
    const sessionFToken = extractCookie(loginF.headers, 'refreshToken')

    const docE = await RefreshToken.findOne({ tokenHash: hashToken(sessionEToken) })
    const docF = await RefreshToken.findOne({ tokenHash: hashToken(sessionFToken) })

    // Logout Session E
    const logoutRes = await doRequest('POST', '/api/auth/logout', null, {
      Cookie: `refreshToken=${sessionEToken}`,
    })
    if (logoutRes.status !== 200) {
      throw new Error(`Logout failed: ${logoutRes.status}`)
    }

    // Verify Session E family is revoked with revokedAt = 0
    const checkE = await RefreshToken.findOne({ tokenHash: hashToken(sessionEToken) })
    if (!checkE.revoked || checkE.revokedAt.getTime() !== 0) {
      throw new Error(`Session E was not revoked with revokedAt: 0 (got ${checkE.revokedAt})`)
    }

    // Verify Session F is STILL VALID and can refresh
    const rotF = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${sessionFToken}`,
    })
    if (rotF.status !== 200) {
      throw new Error(`Session F was revoked when Session E logged out! Status: ${rotF.status}`)
    }
    const sessionFSuccessor = extractCookie(rotF.headers, 'refreshToken')
    console.log('[PASS] Single session logout revokes only Session E family; Session F unaffected')

    // Now test /auth/logout-all with a valid access token
    const logoutAllRes = await doRequest('POST', '/api/auth/logout-all', null, {
      Authorization: `Bearer ${accessTokenE}`,
    })
    if (logoutAllRes.status !== 200) {
      throw new Error(`logout-all failed: ${logoutAllRes.status}`)
    }

    // Verify ALL remaining tokens for user are revoked
    const remainingActive = await RefreshToken.find({ userId: user._id, revoked: false })
    if (remainingActive.length !== 0) {
      throw new Error(`Expected 0 active tokens after logout-all, found ${remainingActive.length}`)
    }

    // Session F refresh must now fail with 401
    const rotFAfterAll = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${sessionFSuccessor}`,
    })
    if (rotFAfterAll.status !== 401) {
      throw new Error(`Session F refresh after logout-all expected 401, got ${rotFAfterAll.status}`)
    }
    console.log('[PASS] Logout-All revoked all sessions across all families for user')
  }

  // =========================================================================
  // Final Invariant Check
  // =========================================================================
  console.log('\n--- Final Invariant Check ---')
  await verifyDevDatabasePreserved()
  console.log('[PASS] Development database kaushalai remains untouched with exactly 15 users.')

  console.log('\n======================================================')
  console.log('ALL PART 32.1.12 REFRESH FAMILY SECURITY TESTS PASSED!')
  console.log('======================================================\n')
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

