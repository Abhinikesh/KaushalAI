'use strict'

/**
 * Test Suite: Part 32.1.10 — Deployment Migration & Residual Security Review
 * Targets isolated test database: mongodb://127.0.0.1:27017/kaushalai_test
 */

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test_jwt_secret_part32_1_10_super_secure'
process.env.ACCESS_TOKEN_SECRET = 'test_access_secret_part32_1_10_super_secure'
process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_part32_1_10_super_secure'
process.env.COOKIE_SECRET = 'test_cookie_secret_12345678901234567890'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/kaushalai_test'

const http = require('http')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const { migrateGoogleSubIndex, sanitizeMongoUri } = require('./scripts/migrate_google_sub_index')
const User = require('./src/models/User')
const RefreshToken = require('./src/models/RefreshToken')
const AuthorizedOfficer = require('./src/models/AuthorizedOfficer')
const { claimOfficerRecord } = require('./src/services/officerRoster.service')
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
  console.log('PART 32.1.10 DEPLOYMENT MIGRATION & RESIDUAL SECURITY SUITE')
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
  await AuthorizedOfficer.deleteMany({})

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

  console.log('\n--- TASK 1: GOOGLE SUB INDEX MIGRATION HARDENING ---')

  // 1.1 URI Sanitization
  {
    const sanitized = sanitizeMongoUri('mongodb://appUser:SuperSecret123@cluster0.mongodb.net/kaushalai?retryWrites=true')
    assert(!sanitized.includes('SuperSecret123'), 'Sanitizer removes plaintext password from connection string')
    assert(sanitized.includes('appUser:****@'), 'Sanitizer replaces password with ****')
  }

  // 1.2 Target database identity verification
  {
    const db = mongoose.connection.db
    const res = await migrateGoogleSubIndex(db, { dryRun: true })
    assert(res.databaseName === 'kaushalai_test', `Identifies exact database name: ${res.databaseName}`)
    assert(res.status === 'DRY_RUN_SUCCESS' || res.status === 'ALREADY_EXISTS', 'Dry run executed successfully on identifiable DB')
  }

  console.log('\n--- TASK 2: PRODUCTION CORS SECURITY REVIEW ---')

  // 2.1 Production CORS: Arbitrary attacker Vercel domain blocked
  {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const res = await doRequest('GET', '/api/auth/me', null, {
      Origin: 'https://kaushal-ai-attacker-scam.vercel.app',
    })

    assert(res.status === 403, `Production blocks arbitrary attacker Vercel subdomain with 403 (Status: ${res.status})`)
    assert(
      res.body && res.body.message === 'CORS blocked: Origin not allowed.',
      `Rejection message matches expected CORS error: "${res.body?.message}"`
    )

    process.env.NODE_ENV = originalEnv
  }

  // 2.2 Production CORS: Localhost dev origin blocked in production
  {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const res = await doRequest('GET', '/api/auth/me', null, {
      Origin: 'http://localhost:5173',
    })

    assert(res.status === 403, `Production blocks localhost with 403 (Status: ${res.status})`)

    process.env.NODE_ENV = originalEnv
  }

  // 2.3 Production CORS: Official production origin normalized and permitted
  {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    // Testing canonical origin
    const res = await doRequest('GET', '/api/auth/me', null, {
      Origin: 'https://kaushal-ai-azure.vercel.app',
    })

    // Passes CORS and hits auth middleware -> 401 unauthenticated
    assert(res.status === 401, `Production allows normalized canonical origin (Status: ${res.status})`)
    assert(res.headers['access-control-allow-origin'] === 'https://kaushal-ai-azure.vercel.app', 'Echoes allowed origin header')

    process.env.NODE_ENV = originalEnv
  }

  // 2.4 Non-production CORS: Local dev origin permitted in development
  {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const res = await doRequest('GET', '/api/auth/me', null, {
      Origin: 'http://localhost:5173',
    })

    assert(res.status === 401, `Development mode allows localhost:5173 (Status: ${res.status})`)
    assert(res.headers['access-control-allow-origin'] === 'http://localhost:5173', 'Echoes localhost header in dev')

    process.env.NODE_ENV = originalEnv
  }

  console.log('\n--- TASK 3: REFRESH MECHANISM & TOKEN ROTATION ---')

  let testUser
  let testRefreshTokenRaw

  {
    const passwordHash = await bcrypt.hash('Password@123', 10)
    testUser = await User.create({
      name: 'Refresh Test Officer',
      email: 'refresh.test@mospi.gov.in',
      passwordHash,
      role: 'employee',
      employeeId: 'REFRESH-001',
      isActive: true,
    })

    testRefreshTokenRaw = generateRefreshToken()
    await RefreshToken.create({
      userId: testUser._id,
      tokenHash: hashToken(testRefreshTokenRaw),
      expiresAt: refreshTokenExpiresAt(),
      revoked: false,
    })

    // Normal refresh with valid cookie
    const res = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${testRefreshTokenRaw}`,
    })

    assert(res.status === 200, `Valid refresh token yields 200 OK (Status: ${res.status})`)
    assert(res.body && res.body.accessToken, 'Refresh response includes new accessToken')

    const setCookie = res.headers['set-cookie']
    assert(
      Array.isArray(setCookie) && setCookie.some((c) => c.includes('refreshToken=') && c.includes('Path=/')),
      'Rotated refresh token cookie returned with Path=/'
    )

    // Old token should now be marked revoked
    const oldStored = await RefreshToken.findOne({ tokenHash: hashToken(testRefreshTokenRaw) })
    assert(oldStored && oldStored.revoked === true, 'Previous refresh token was marked revoked upon rotation')

    // Mark revokedAt outside grace window to test replay rejection
    oldStored.revokedAt = new Date(Date.now() - 30 * 1000)
    await oldStored.save()

    // Using the now-revoked token outside grace window should fail with 401 and clear cookie
    const replayRes = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${testRefreshTokenRaw}`,
    })
    assert(replayRes.status === 401, `Replay of rotated token rejected with 401 (Status: ${replayRes.status})`)
    const replaySetCookie = replayRes.headers['set-cookie']
    assert(
      Array.isArray(replaySetCookie) && replaySetCookie.some((c) => c.includes('refreshToken=;') && c.includes('Path=/')),
      'Cookie cleared with Path=/ on invalid/revoked refresh token'
    )
  }

  console.log('\n--- TASK 4: REFRESH ENDPOINT RATE LIMITING ---')

  {
    // The refreshLimiter is mounted on /api/auth/refresh
    // In production, max is 120 per 15 min. Let's test that rate limiting middleware responds with proper standard headers
    const res = await doRequest('POST', '/api/auth/refresh', null, {})
    assert(res.headers['ratelimit-limit'] !== undefined || res.headers['x-ratelimit-limit'] !== undefined, 'Rate limit headers present on /api/auth/refresh')
  }

  console.log('\n--- TASK 5: ATOMIC OFFICER ROSTER CLAIM & CONCURRENCY ---')

  {
    // Seed an authorized officer
    const officer = await AuthorizedOfficer.create({
      employeeId: 'MOSPI-CONCUR-001',
      fullName: 'Ramesh Kumar',
      officialEmail: 'ramesh.kumar@mospi.gov.in',
      department: 'Economic Statistics Division',
      isClaimed: false,
    })

    // 5.1 First claim succeeds
    const claim1Result = await claimOfficerRecord('MOSPI-CONCUR-001', new mongoose.Types.ObjectId())
    assert(claim1Result === true, 'First atomic claim returns true')

    const updatedOfficer = await AuthorizedOfficer.findOne({ employeeId: 'MOSPI-CONCUR-001' })
    assert(updatedOfficer.isClaimed === true, 'Officer record state updated to isClaimed: true')

    // 5.2 Second claim fails with 409
    let secondClaimFailed = false
    try {
      await claimOfficerRecord('MOSPI-CONCUR-001', new mongoose.Types.ObjectId())
    } catch (err) {
      if (err.status === 409 && err.message.includes('already been claimed')) {
        secondClaimFailed = true
      }
    }
    assert(secondClaimFailed, 'Second atomic claim fails with HTTP 409 conflict')

    // 5.3 Test concurrent registration race condition with rollback
    // Create another officer for registration race
    await AuthorizedOfficer.create({
      employeeId: 'MOSPI-RACE-002',
      fullName: 'Sunita Sharma',
      officialEmail: 'sunita.sharma@mospi.gov.in',
      department: 'SDRD',
      isClaimed: false,
    })

    // Simultaneously attempt two signups for the same employeeId with different emails
    const [signupA, signupB] = await Promise.all([
      doRequest('POST', '/api/auth/signup', {
        name: 'Sunita Sharma',
        email: 'sunita.a@mospi.gov.in',
        password: 'Password@123',
        employeeId: 'MOSPI-RACE-002',
      }),
      doRequest('POST', '/api/auth/signup', {
        name: 'Sunita Sharma',
        email: 'sunita.b@mospi.gov.in',
        password: 'Password@123',
        employeeId: 'MOSPI-RACE-002',
      }),
    ])

    const statuses = [signupA.status, signupB.status].sort()
    assert(statuses[0] === 201 && statuses[1] === 409, `Exactly one registration succeeded (201) and one was rejected (409): [${statuses.join(', ')}]`)

    // Verify database has exactly 1 user with MOSPI-RACE-002 (no orphaned/partially registered user)
    const registeredUsers = await User.find({ employeeId: 'MOSPI-RACE-002' })
    assert(registeredUsers.length === 1, `Zero partial registration: Exactly 1 user exists in DB for this employeeId (Found: ${registeredUsers.length})`)
  }

  console.log('\n--- TASK 6: LEGACY GOOGLE COMPLETION ENDPOINT RETIREMENT ---')

  // 6.1 Production mode: POST /api/auth/google/complete returns 404
  {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const res = await doRequest('POST', '/api/auth/google/complete', {
      idToken: 'mock.token',
      employeeId: 'MOSPI-FAKE-999',
    })

    assert(res.status === 404, `POST /api/auth/google/complete returns 404 in production (Status: ${res.status})`)

    process.env.NODE_ENV = originalEnv
  }

  // 6.2 Controller guard defense-in-depth: returns 404 directly in production
  {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const authController = require('./src/controllers/auth.controller')

    let controllerErr = null
    await new Promise((resolve) => {
      authController.googleComplete({ body: {} }, {}, (err) => {
        controllerErr = err
        resolve()
      })
    })

    assert(controllerErr && controllerErr.status === 404, `Controller guard returns 404 when NODE_ENV=production (Status: ${controllerErr?.status})`)

    process.env.NODE_ENV = originalEnv
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
