'use strict'

/**
 * Test Suite: Part 32.1.9 — Critical Authentication Security Remediation
 * Targets isolated test database: mongodb://127.0.0.1:27017/kaushalai_test
 */

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test_jwt_secret_for_remediation_test_suite_12345'
process.env.ACCESS_TOKEN_SECRET = 'test_access_secret_for_remediation_test_suite_12345'
process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_for_remediation_test_suite_12345'
process.env.COOKIE_SECRET = 'test_cookie_secret_12345678901234567890'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/kaushalai_test'

const http = require('http')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const { migrateGoogleSubIndex } = require('./scripts/migrate_google_sub_index')
const User = require('./src/models/User')
const SystemSetting = require('./src/models/SystemSetting')
const { generateAccessToken } = require('./src/utils/token')

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
  console.log('PART 32.1.9 CRITICAL AUTH SECURITY REMEDIATION TEST SUITE')
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
  await SystemSetting.deleteMany({})

  // Seed baseline accounts for tests
  const passwordHash = await bcrypt.hash('SecurePassword@123', 10)

  const admin = await User.create({
    name: 'Audit Administrator',
    email: 'admin.audit@mospi.gov.in',
    passwordHash,
    role: 'admin',
    employeeId: 'ADM-AUDIT-001',
    isActive: true,
  })

  const learner = await User.create({
    name: 'Ordinary Learner',
    email: 'learner.audit@gmail.com',
    googleLinked: true,
    googleSub: 'google-sub-learner-001',
    role: 'employee',
    isActive: true,
  })

  const officer = await User.create({
    name: 'Government Officer',
    email: 'officer.audit@mospi.gov.in',
    passwordHash,
    role: 'employee',
    employeeId: 'MOSPI-AUDIT-002',
    isActive: true,
  })

  // Seed a sample system setting
  await SystemSetting.create({
    key: 'PLATFORM_NAME',
    value: 'KaushalAI Test Environment',
    description: 'System platform name for audit',
  })

  // Generate tokens
  const adminToken = generateAccessToken(admin)
  const learnerToken = generateAccessToken(learner)

  await new Promise((resolve) => {
    server = fullApp.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      baseUrl = `http://127.0.0.1:${port}`
      console.log(`[Setup] Test server listening on ${baseUrl}`)
      resolve()
    })
  })

  return { admin, learner, officer, adminToken, learnerToken }
}

async function runTests() {
  const { admin, learner, officer, adminToken, learnerToken } = await setup()
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

  console.log('\n--- TASK 1: BYPASS LOGIN PROTECTION ---')

  // 1.1 Non-production bypass allows employee login
  {
    process.env.NODE_ENV = 'development'
    const res = await doRequest('POST', '/api/auth/bypass', { email: officer.email })
    assert(res.status === 200, `Dev bypass allows legitimate employee (Status: ${res.status})`)
    assert(res.body && res.body.accessToken && res.body.bypass === true, 'Dev bypass returns token pair and bypass flag')
  }

  // 1.2 Non-production bypass rejects role='admin'
  {
    process.env.NODE_ENV = 'development'
    const res = await doRequest('POST', '/api/auth/bypass', { role: 'admin' })
    assert(res.status === 403, `Dev bypass rejects role="admin" with 403 (Status: ${res.status})`)
    assert(
      res.body && res.body.message === 'Bypass login cannot issue administrator tokens.',
      `Rejection message matches expected security warning: "${res.body?.message}"`
    )
  }

  // 1.3 Non-production bypass rejects admin email
  {
    process.env.NODE_ENV = 'development'
    const res = await doRequest('POST', '/api/auth/bypass', { email: admin.email })
    assert(res.status === 403, `Dev bypass rejects admin email with 403 (Status: ${res.status})`)
  }

  // 1.4 Production bypass controller defense-in-depth guard
  {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const authController = require('./src/controllers/auth.controller')

    let controllerErr = null
    await new Promise((resolve) => {
      authController.bypassLogin({ body: { email: officer.email } }, {}, (err) => {
        controllerErr = err
        resolve()
      })
    })

    assert(
      controllerErr && controllerErr.status === 404,
      `Controller guard returns 404 when NODE_ENV is production (Status: ${controllerErr?.status})`
    )
    process.env.NODE_ENV = originalEnv
  }

  console.log('\n--- TASK 2: MOCK SSO PROTECTION ---')

  // 2.1 Non-production SSO rejects empty body
  {
    process.env.NODE_ENV = 'development'
    const res = await doRequest('POST', '/api/auth/sso', {})
    assert(res.status === 400, `Dev mock SSO rejects empty request with 400 (Status: ${res.status})`)
  }

  // 2.2 Non-production SSO rejects admin target
  {
    process.env.NODE_ENV = 'development'
    const res = await doRequest('POST', '/api/auth/sso', { email: admin.email })
    assert(res.status === 403, `Dev mock SSO blocks admin account with 403 (Status: ${res.status})`)
    assert(
      res.body && res.body.message === 'Administrator accounts cannot authenticate via mock SSO.',
      `Mock SSO admin rejection message matches: "${res.body?.message}"`
    )
  }

  // 2.3 Non-production SSO allows legitimate officer target
  {
    process.env.NODE_ENV = 'development'
    const res = await doRequest('POST', '/api/auth/sso', { email: officer.email })
    assert(res.status === 200, `Dev mock SSO allows officer login (Status: ${res.status})`)
    assert(res.body && res.body.accessToken && res.body.provider === 'sso', 'Returns accessToken and provider=sso')
  }

  // 2.4 Production mock SSO controller defense-in-depth guard
  {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const authController = require('./src/controllers/auth.controller')

    let controllerErr = null
    await new Promise((resolve) => {
      authController.ssoLogin({ body: { email: officer.email } }, {}, (err) => {
        controllerErr = err
        resolve()
      })
    })

    assert(
      controllerErr && controllerErr.status === 404,
      `Mock SSO controller guard returns 404 when NODE_ENV is production (Status: ${controllerErr?.status})`
    )
    process.env.NODE_ENV = originalEnv
  }

  console.log('\n--- TASK 3: ADMIN SYSTEM SETTINGS AUTHORIZATION ---')

  // 3.1 Unauthenticated access to /admin/system-settings returns 401
  {
    const res = await doRequest('GET', '/api/admin/system-settings')
    assert(res.status === 401, `Unauthenticated GET /api/admin/system-settings returns 401 (Status: ${res.status})`)
  }

  // 3.2 Learner access to /admin/system-settings returns 403
  {
    const res = await doRequest('GET', '/api/admin/system-settings', null, {
      Authorization: `Bearer ${learnerToken}`,
    })
    assert(res.status === 403, `Learner GET /api/admin/system-settings returns 403 (Status: ${res.status})`)
  }

  // 3.3 Learner access to PUT /admin/system-settings returns 403
  {
    const res = await doRequest(
      'PUT',
      '/api/admin/system-settings',
      { settings: { PLATFORM_NAME: 'Hacked Name' } },
      { Authorization: `Bearer ${learnerToken}` }
    )
    assert(res.status === 403, `Learner PUT /api/admin/system-settings returns 403 (Status: ${res.status})`)
  }

  // 3.4 Learner access to POST /admin/clear-cache returns 403
  {
    const res = await doRequest('POST', '/api/admin/clear-cache', null, {
      Authorization: `Bearer ${learnerToken}`,
    })
    assert(res.status === 403, `Learner POST /api/admin/clear-cache returns 403 (Status: ${res.status})`)
  }

  // 3.5 Admin access to /admin/system-settings returns 200
  {
    const res = await doRequest('GET', '/api/admin/system-settings', null, {
      Authorization: `Bearer ${adminToken}`,
    })
    assert(res.status === 200, `Admin GET /api/admin/system-settings returns 200 (Status: ${res.status})`)
    assert(res.body && res.body.settings && typeof res.body.settings === 'object', 'Admin receives system settings object')
  }

  console.log('\n--- TASK 4: CORS FAIL-CLOSED CONFIGURATION ---')

  // 4.1 Server/curl requests with no Origin header are allowed
  {
    const res = await doRequest('GET', '/api/auth/me')
    // Should pass CORS and reach auth middleware (401 because no token)
    assert(res.status === 401, `No-origin request passes CORS filter (Status: ${res.status})`)
  }

  // 4.2 Production CORS: Untrusted origin is blocked
  {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const res = await doRequest('GET', '/api/auth/me', null, {
      Origin: 'https://malicious-phishing-site.com',
    })

    assert(res.status === 403, `Production blocks untrusted origin with 403 (Status: ${res.status})`)
    assert(
      res.body && res.body.message === 'CORS blocked: Origin not allowed.',
      `CORS error message matches: "${res.body?.message}"`
    )

    process.env.NODE_ENV = originalEnv
  }

  // 4.3 Production CORS: Allowed production origin passes
  {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const res = await doRequest('GET', '/api/auth/me', null, {
      Origin: 'https://kaushal-ai-azure.vercel.app',
    })

    // Allowed origin passes CORS to auth middleware (401 unauthenticated)
    assert(res.status === 401, `Production allows whitelisted origin (Status: ${res.status})`)
    assert(res.headers['access-control-allow-origin'] === 'https://kaushal-ai-azure.vercel.app', 'CORS header echoed for allowed origin')

    process.env.NODE_ENV = originalEnv
  }

  // 4.4 Non-production CORS: Local development origin passes
  {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const res = await doRequest('GET', '/api/auth/me', null, {
      Origin: 'http://localhost:5173',
    })

    assert(res.status === 401, `Dev environment allows localhost:5173 (Status: ${res.status})`)
    assert(res.headers['access-control-allow-origin'] === 'http://localhost:5173', 'CORS header echoed for local dev')

    process.env.NODE_ENV = originalEnv
  }

  console.log('\n--- TASK 5: GOOGLE SUB UNIQUE PARTIAL INDEX MIGRATION ---')

  const db = mongoose.connection.db

  // Drop any existing googleSub index on test db to test migration from scratch
  try {
    await db.collection('users').dropIndex('googleSub_1')
  } catch {
    // Ignore if didn't exist
  }

  // 5.1 Test dry run mode
  {
    const dryRunResult = await migrateGoogleSubIndex(db, { dryRun: true })
    assert(dryRunResult.status === 'DRY_RUN_SUCCESS', `Dry run succeeds (Status: ${dryRunResult.status})`)
    assert(dryRunResult.wouldCreate === true, 'Dry run indicates index would be created')

    const indexes = await db.collection('users').indexes()
    const hasIndex = indexes.some((idx) => idx.name === 'googleSub_1')
    assert(!hasIndex, 'Dry run did not physically create the index')
  }

  // 5.2 Real migration execution
  {
    const result = await migrateGoogleSubIndex(db, { dryRun: false })
    assert(result.status === 'CREATED', `Index creation succeeds (Status: ${result.status})`)
    assert(result.indexName === 'googleSub_1', `Created index named "googleSub_1"`)

    const indexes = await db.collection('users').indexes()
    const found = indexes.find((idx) => idx.name === 'googleSub_1')
    assert(Boolean(found && found.unique), 'Physical index in MongoDB has unique=true')
    assert(
      found.partialFilterExpression &&
      found.partialFilterExpression.googleSub &&
      found.partialFilterExpression.googleSub.$type === 'string',
      'Index in MongoDB has partialFilterExpression for string'
    )
  }

  // 5.3 Migration idempotency
  {
    const repeatResult = await migrateGoogleSubIndex(db, { dryRun: false })
    assert(repeatResult.status === 'ALREADY_EXISTS', `Second run is idempotent: status=${repeatResult.status}`)
  }

  // 5.4 MongoDB enforcement of uniqueness on duplicate non-empty googleSub
  {
    let duplicateBlocked = false
    try {
      await User.create({
        name: 'Colliding User',
        email: 'collision@gmail.com',
        googleLinked: true,
        googleSub: 'google-sub-learner-001', // Duplicate of learner created in setup
        role: 'employee',
      })
    } catch (err) {
      if (err.code === 11000) {
        duplicateBlocked = true
      }
    }
    assert(duplicateBlocked, 'MongoDB native engine rejects duplicate googleSub with duplicate key error (code 11000)')
  }

  // 5.5 MongoDB allows multiple null googleSub documents
  {
    let multipleNullsAllowed = false
    try {
      const u1 = await User.create({
        name: 'Null Sub 1',
        email: 'null1@mospi.gov.in',
        passwordHash: 'hash1',
        googleSub: null,
        role: 'employee',
      })
      const u2 = await User.create({
        name: 'Null Sub 2',
        email: 'null2@mospi.gov.in',
        passwordHash: 'hash2',
        googleSub: null,
        role: 'employee',
      })
      multipleNullsAllowed = Boolean(u1 && u2)
    } catch (err) {
      console.error('Null sub error:', err)
    }
    assert(multipleNullsAllowed, 'Multiple documents with googleSub: null coexist without conflict (partial filter works)')
  }

  // 5.6 Pre-flight duplicate check detects collisions and aborts safely
  {
    // Temporarily drop index to introduce duplicate and verify preflight abort
    await db.collection('users').dropIndex('googleSub_1')
    // Manually insert duplicate using direct driver bypassing Mongoose validation
    await db.collection('users').insertOne({
      name: 'Direct Duplicate 1',
      email: 'dup1@example.com',
      googleSub: 'COLLISION_SUB_999',
    })
    await db.collection('users').insertOne({
      name: 'Direct Duplicate 2',
      email: 'dup2@example.com',
      googleSub: 'COLLISION_SUB_999',
    })

    const abortResult = await migrateGoogleSubIndex(db, { dryRun: false })
    assert(
      abortResult.status === 'ABORTED_DUPLICATES_FOUND',
      `Pre-flight detects duplicates and safely aborts (Status: ${abortResult.status})`
    )
    assert(
      abortResult.duplicates && abortResult.duplicates.length === 1 && abortResult.duplicates[0]._id === 'COLLISION_SUB_999',
      'Detected specific colliding sub identifier'
    )

    // Clean up test duplicates
    await db.collection('users').deleteMany({ googleSub: 'COLLISION_SUB_999' })
    // Re-create the index cleanly
    await migrateGoogleSubIndex(db, { dryRun: false })
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
