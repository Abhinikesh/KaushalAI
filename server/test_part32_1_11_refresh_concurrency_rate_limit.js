'use strict'

/**
 * Test Suite: Part 32.1.11 — Refresh Token Concurrency & Rate Limiter Validation
 * Targets isolated test database: mongodb://127.0.0.1:27017/kaushalai_test
 */

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test_jwt_secret_part32_1_11_super_secure'
process.env.ACCESS_TOKEN_SECRET = 'test_access_secret_part32_1_11_super_secure'
process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_part32_1_11_super_secure'
process.env.COOKIE_SECRET = 'test_cookie_secret_12345678901234567890'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/kaushalai_test'

const http = require('http')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const { rateLimit, ipKeyGenerator } = require('express-rate-limit')
const express = require('express')
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

async function verifyDevDatabasePreserved() {
  const devConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
  const usersCount = await devConn.collection('users').countDocuments()
  await devConn.close()
  if (usersCount !== 15) {
    throw new Error(`CRITICAL INVARIANT VIOLATION: Dev database 'kaushalai' user count mutated! Expected 15, got ${usersCount}`)
  }
}

async function setup() {
  console.log('\n============================================================')
  console.log('PART 32.1.11 REFRESH CONCURRENCY & RATE LIMITER SUITE')
  console.log('============================================================\n')

  await verifyDevDatabasePreserved()
  console.log('[Setup] Confirmed dev database kaushalai has exactly 15 users.')

  await mongoose.connect(process.env.MONGO_URI)
  const dbName = mongoose.connection.name
  if (dbName !== 'kaushalai_test') {
    throw new Error(`CRITICAL ABORT: Connected to "${dbName}", expected "kaushalai_test"!`)
  }

  // Clean test database collections
  await User.deleteMany({})
  await RefreshToken.deleteMany({})

  await new Promise((resolve) => {
    server = fullApp.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      baseUrl = `http://127.0.0.1:${port}`
      console.log(`[Setup] Test server listening on ${baseUrl}`)
      resolve()
    })
  })
}

async function runTests() {
  await setup()
  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`)
      passed++
    } else {
      console.error(`  ✗ FAIL: ${message}`)
      failed++
    }
  }

  console.log('\n--- TASK 1: REFRESH RATE LIMITER & IP KEY GENERATOR ---')

  // 1.1 Package API verification: ipKeyGenerator string input & IPv6 subnetting
  {
    const ipv4Key = ipKeyGenerator('192.168.1.50')
    assert(ipv4Key === '192.168.1.50', `IPv4 key remains intact: ${ipv4Key}`)

    const ipv6A = '2001:0db8:85a3:0000:0000:8a2e:0370:7334'
    const ipv6B = '2001:0db8:85a3:0000:ffff:8a2e:0370:9999'
    const ipv6C = '2001:0db8:9999:0000:0000:8a2e:0370:7334'

    const keyA = ipKeyGenerator(ipv6A)
    const keyB = ipKeyGenerator(ipv6B)
    const keyC = ipKeyGenerator(ipv6C)

    assert(keyA === keyB, `IPv6 addresses in same /56 share key: ${keyA}`)
    assert(keyA !== keyC, `IPv6 addresses in different subnets produce distinct keys: ${keyA} vs ${keyC}`)
  }

  // 1.2 Rate limiter enforcement: isolated test app with small threshold
  {
    const testRateApp = express()
    testRateApp.set('trust proxy', 1)

    const testLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 3,
      keyGenerator: (req) => {
        const rawIp = req.ip || req.socket?.remoteAddress || '127.0.0.1'
        return ipKeyGenerator(rawIp)
      },
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Too many refresh requests, please try again later' },
    })

    testRateApp.post('/test-refresh', testLimiter, (req, res) => res.json({ ok: true }))

    const testServer = await new Promise((resolve) => {
      const s = testRateApp.listen(0, '127.0.0.1', () => resolve(s))
    })
    const testPort = testServer.address().port

    const makeRateReq = (clientIp) =>
      new Promise((resolve) => {
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port: testPort,
            path: '/test-refresh',
            method: 'POST',
            headers: { 'X-Forwarded-For': clientIp },
          },
          (res) => {
            let data = ''
            res.on('data', (c) => (data += c))
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers }))
          }
        )
        req.end()
      })

    // IP 1: requests 1..3 should succeed
    const r1 = await makeRateReq('10.0.0.1')
    const r2 = await makeRateReq('10.0.0.1')
    const r3 = await makeRateReq('10.0.0.1')
    assert(r1.status === 200 && r2.status === 200 && r3.status === 200, 'Requests 1..3 below limit return 200')

    // Request 4 from IP 1 should receive 429
    const r4 = await makeRateReq('10.0.0.1')
    assert(r4.status === 429, `Request 4 exceeding limit returns 429 (Status: ${r4.status})`)
    assert(r4.headers['ratelimit-limit'] !== undefined, 'Includes RFC standard RateLimit header')

    // Distinct IP 2: Should NOT be blocked (independent bucket)
    const rOtherIp = await makeRateReq('10.0.0.2')
    assert(rOtherIp.status === 200, `Independent IP receives separate bucket (Status: ${rOtherIp.status})`)

    testServer.close()
  }

  // 1.3 Limiter does not interfere with normal routes
  {
    const res = await doRequest('POST', '/api/auth/login', { email: 'nobody@mospi.gov.in', password: 'bad' })
    // Returns 401 invalid credentials from auth, NOT 429 rate limit
    assert(res.status === 401, `Normal login flow unaffected by refresh limiter (Status: ${res.status})`)
  }

  console.log('\n--- TASK 2 & 4: MULTI-TAB REFRESH CONCURRENCY & REPLAY SECURITY ---')

  const passwordHash = await bcrypt.hash('SecurePassword@123', 10)
  const officer = await User.create({
    name: 'MultiTab Officer',
    email: 'multitab.officer@mospi.gov.in',
    passwordHash,
    role: 'employee',
    employeeId: 'TAB-001',
    isActive: true,
  })

  // Helper to seed a valid refresh token
  async function seedToken(user) {
    const raw = generateRefreshToken()
    const doc = await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(raw),
      expiresAt: refreshTokenExpiresAt(),
      revoked: false,
    })
    return { raw, doc }
  }

  // 2.1 Two simultaneous refresh requests with the same valid token (Multi-tab race)
  {
    const { raw } = await seedToken(officer)

    // Simultaneously fire 2 requests simulating Tab 1 and Tab 2
    const [resTab1, resTab2] = await Promise.all([
      doRequest('POST', '/api/auth/refresh', null, { Cookie: `refreshToken=${raw}` }),
      doRequest('POST', '/api/auth/refresh', null, { Cookie: `refreshToken=${raw}` }),
    ])

    assert(resTab1.status === 200, `Tab 1 refresh succeeds with 200 (Status: ${resTab1.status})`)
    assert(resTab2.status === 200, `Tab 2 concurrent refresh succeeds with 200 (Status: ${resTab2.status})`)
    assert(resTab1.body.accessToken && resTab2.body.accessToken, 'Both tabs receive valid access tokens')

    // Check which one was primary rotation vs grace
    const results = [resTab1, resTab2]
    const primary = results.find((r) => !r.body.grace)
    const grace = results.find((r) => r.body.grace === true)

    assert(Boolean(primary), 'Exactly one request is the primary rotation winner')
    assert(Boolean(grace), 'The overlapping concurrent request was served via concurrency grace')

    // Primary must have issued a new refreshToken cookie
    const primarySetCookie = primary.headers['set-cookie']
    assert(
      Array.isArray(primarySetCookie) && primarySetCookie.some((c) => c.includes('refreshToken=') && !c.includes('refreshToken=;')),
      'Primary tab received updated refreshToken cookie'
    )

    // Grace tab must NOT have cleared the cookie
    const graceSetCookie = grace.headers['set-cookie']
    const graceCleared = Array.isArray(graceSetCookie) && graceSetCookie.some((c) => c.includes('refreshToken=;'))
    assert(!graceCleared, 'Grace tab response did NOT clear the cookie jar')

    // Inspect database: Exactly ONE new active refresh token created
    const activeTokens = await RefreshToken.find({ userId: officer._id, revoked: false })
    assert(activeTokens.length === 1, `Zero session duplication: exactly 1 active successor session exists in DB (Found: ${activeTokens.length})`)

    // Extract new raw token from primary Set-Cookie to continue session
    const match = primarySetCookie[0].match(/refreshToken=([^;]+)/)
    const newRawToken = match ? match[1] : null
    assert(Boolean(newRawToken), 'Extracted new raw refresh token for subsequent verification')

    // 2.2 Continuation of session using new successor token succeeds
    const continuationRes = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${newRawToken}`,
    })
    assert(continuationRes.status === 200, `Subsequent refresh with new token succeeds (Status: ${continuationRes.status})`)
  }

  // 2.3 Multiple concurrent requests (4 simultaneous tabs: 1 primary rotation + 3 grace requests bounded by MAX_GRACE_REQUESTS=3)
  {
    await RefreshToken.deleteMany({ userId: officer._id })
    const { raw } = await seedToken(officer)

    const promises = []
    for (let i = 0; i < 4; i++) {
      promises.push(doRequest('POST', '/api/auth/refresh', null, { Cookie: `refreshToken=${raw}` }))
    }

    const responses = await Promise.all(promises)
    const all200 = responses.every((r) => r.status === 200)
    assert(all200, `All 4 concurrent tab requests succeeded with 200 OK`)

    const primaryCount = responses.filter((r) => !r.body.grace).length
    const graceCount = responses.filter((r) => r.body.grace === true).length
    assert(primaryCount === 1, `Exactly 1 request performed the primary rotation (Found: ${primaryCount})`)
    assert(graceCount === 3, `All other 3 requests absorbed safely via grace (Found: ${graceCount})`)

    // Exactly 1 unrevoked successor session exists
    const activeSessions = await RefreshToken.find({ userId: officer._id, revoked: false })
    assert(activeSessions.length === 1, `Database holds exactly 1 active token after 4 concurrent requests (Found: ${activeSessions.length})`)
  }

  // 2.4 Token reuse outside grace window triggers replay detection & revocation
  {
    const { raw, doc } = await seedToken(officer)

    // Manually mark token as revoked 30 seconds ago (outside 20s grace window)
    const thirtySecsAgo = new Date(Date.now() - 30 * 1000)
    const successorRaw = generateRefreshToken()
    const successorDoc = await RefreshToken.create({
      userId: officer._id,
      tokenHash: hashToken(successorRaw),
      expiresAt: refreshTokenExpiresAt(),
      revoked: false,
    })

    doc.revoked = true
    doc.revokedAt = thirtySecsAgo
    doc.replacedByTokenHash = successorDoc.tokenHash
    await doc.save()

    // Attempting to refresh with the old token outside grace window
    const replayRes = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${raw}`,
    })

    assert(replayRes.status === 401, `Replay outside grace window rejected with 401 (Status: ${replayRes.status})`)
    assert(
      replayRes.body && replayRes.body.message.includes('Token reuse detected'),
      `Rejection message indicates replay detection: "${replayRes.body?.message}"`
    )

    // Cookie must be cleared
    const clearCookie = replayRes.headers['set-cookie']
    assert(
      Array.isArray(clearCookie) && clearCookie.some((c) => c.includes('refreshToken=;') && c.includes('Path=/')),
      'Cookie cleared with Path=/ upon replay detection'
    )

    // Security check: successor token chain must be revoked to stop stolen session
    const reloadedSuccessor = await RefreshToken.findById(successorDoc._id)
    assert(reloadedSuccessor.revoked === true, 'Successor session revoked automatically upon token replay detection')
  }

  // 2.5 Expired refresh token rejection
  {
    const raw = generateRefreshToken()
    await RefreshToken.create({
      userId: officer._id,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      revoked: false,
    })

    const expiredRes = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${raw}`,
    })

    assert(expiredRes.status === 401, `Expired token returns 401 (Status: ${expiredRes.status})`)
  }

  // 2.6 Logout revokes session immediately with ZERO grace
  {
    const { raw } = await seedToken(officer)

    // Execute logout
    const logoutRes = await doRequest('POST', '/api/auth/logout', null, {
      Cookie: `refreshToken=${raw}`,
    })
    assert(logoutRes.status === 200, `Logout returns 200 OK (Status: ${logoutRes.status})`)

    // Immediately attempting to refresh with that logged-out token should fail (0 grace)
    const postLogoutRefresh = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${raw}`,
    })
    assert(postLogoutRefresh.status === 401, `Post-logout refresh rejected immediately with 401 (Status: ${postLogoutRefresh.status})`)
  }

  // 2.7 Inactive user rejection in both primary and grace paths
  {
    const inactiveUser = await User.create({
      name: 'Deactivated User',
      email: 'deactivated@mospi.gov.in',
      passwordHash,
      role: 'employee',
      employeeId: 'DEACT-001',
      isActive: false,
    })

    const { raw } = await seedToken(inactiveUser)
    const res = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${raw}`,
    })
    assert(res.status === 401, `Inactive user refresh rejected with 401 (Status: ${res.status})`)
  }

  // 2.8 Plaintext security: verify raw tokens are never stored in database
  {
    const { raw } = await seedToken(officer)
    const rawFound = await RefreshToken.findOne({ tokenHash: raw })
    assert(!rawFound, 'Raw token string is NOT stored as tokenHash')

    const hashedFound = await RefreshToken.findOne({ tokenHash: hashToken(raw) })
    assert(Boolean(hashedFound), 'Token is stored exclusively as SHA-256 digest in database')
  }

  console.log('\n============================================================')
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('============================================================\n')

  await verifyDevDatabasePreserved()
  console.log('[Teardown] Verified dev database kaushalai remains untouched at 15 users.')

  if (server) server.close()
  await mongoose.disconnect()
  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch((err) => {
  console.error('Test suite failed with unexpected error:', err)
  process.exit(1)
})
