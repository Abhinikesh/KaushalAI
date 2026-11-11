'use strict'

/**
 * PART 32.1.3 — Test Suite: Google ID-Token Authentication & Admin Isolation
 *
 * Test cases:
 *  1. Valid Google ID token accepted.
 *  2. Invalid signature rejected.
 *  3. Wrong audience rejected.
 *  4. Invalid issuer rejected.
 *  5. Expired token rejected.
 *  6. Missing `sub` rejected.
 *  7. Missing/invalid email rejected.
 *  8. `email_verified: false` rejected.
 *  9. Missing `email_verified` rejected.
 * 10. Admin Google login returns HTTP 403 (ADMIN_GOOGLE_AUTH_PROHIBITED).
 * 11. Admin rejection creates no access or refresh token, leaves admin record unmutated, logs audit.
 * 12. Admin password login still succeeds.
 * 13. Existing ordinary employee Google auth succeeds and returns established contract.
 */

const assert = require('assert')
const http = require('http')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const express = require('express')
const cookieParser = require('cookie-parser')
const path = require('path')

require('dotenv').config({ path: path.resolve(__dirname, '.env') })

// Enforce Google Client ID for tests if not set
if (!process.env.GOOGLE_CLIENT_ID) {
  process.env.GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com'
}

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/kaushalai_test'
const DEV_DB_URI = 'mongodb://127.0.0.1:27017/kaushalai'

// Models
const User = require('./src/models/User')
const RefreshToken = require('./src/models/RefreshToken')
const AuditLog = require('./src/models/AuditLog')
const JobRole = require('./src/models/JobRole')

// Auth Controller & Routes
const authController = require('./src/controllers/auth.controller')
const authRoutes = require('./src/routes/auth.routes')
const errorHandler = require('./src/middleware/errorHandler')

let server
let port

function makeRequest(serverPort, options, bodyData = null) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port: serverPort,
      path: options.path,
      method: options.method || 'GET',
      headers: options.headers || {},
    }

    if (bodyData) {
      const dataStr = JSON.stringify(bodyData)
      reqOptions.headers['Content-Type'] = 'application/json'
      reqOptions.headers['Content-Length'] = Buffer.byteLength(dataStr)
    }

    const req = http.request(reqOptions, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        let parsed = null
        try {
          parsed = JSON.parse(data)
        } catch {
          parsed = data
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed,
        })
      })
    })

    req.on('error', reject)

    if (bodyData) {
      req.write(JSON.stringify(bodyData))
    }
    req.end()
  })
}

async function runTests() {
  console.log('========================================================================')
  console.log('  PART 32.1.3: Google ID-Token Authentication & Admin Isolation Test Suite')
  console.log('========================================================================\n')

  // Step 0: Ensure strict DB isolation
  console.log('[Setup] Connecting strictly to test database: ' + TEST_DB_URI)
  await mongoose.connect(TEST_DB_URI)
  assert.strictEqual(
    mongoose.connection.name,
    'kaushalai_test',
    'FATAL: Must connect strictly to kaushalai_test!'
  )

  // Verify dev database is untouched
  const devConn = await mongoose.createConnection(DEV_DB_URI).asPromise()
  const initialDevUsers = await devConn.collection('users').countDocuments()
  console.log(`[Setup] Confirmed read-only dev database 'kaushalai' has ${initialDevUsers} users.`)
  await devConn.close()

  // Clean test database tables
  await User.deleteMany({ email: /test-32-1-3/i })
  await RefreshToken.deleteMany({})
  await AuditLog.deleteMany({ 'meta.email': /test-32-1-3/i })

  // Ensure default job role for test employee creation
  let defaultRole = await JobRole.findOne({ title: /Statistical Officer/i })
  if (!defaultRole) {
    defaultRole = await JobRole.create({
      title: 'Senior Statistical Officer',
      description: 'Test Job Role for 32.1.3',
      cadre: 'Indian Statistical Service (ISS)',
      competencies: [],
    })
  }

  // Setup express server
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/v1/auth', authRoutes)
  app.use(errorHandler)

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      port = server.address().port
      console.log(`[Setup] Test Express server listening on 127.0.0.1:${port}\n`)
      resolve()
    })
  })

  let passedCount = 0
  const totalCount = 13

  // Helper to create mock Google client ticket
  function mockGoogleTicket(payload) {
    return {
      getPayload: () => payload,
    }
  }

  const validPayload = {
    iss: 'https://accounts.google.com',
    aud: process.env.GOOGLE_CLIENT_ID,
    exp: Math.floor(Date.now() / 1000) + 3600,
    sub: 'google-sub-valid-1001',
    email: 'test-32-1-3-learner@example.com',
    email_verified: true,
    name: 'Test Learner',
    picture: 'https://lh3.googleusercontent.com/test-photo.jpg',
  }

  try {
    // ------------------------------------------------------------------------
    // Test 1: Valid Google ID token accepted
    // ------------------------------------------------------------------------
    console.log('[Test 1] Valid Google ID token accepted...')
    authController._setGoogleClient({
      verifyIdToken: async ({ idToken, audience }) => {
        if (idToken === 'valid-id-token' && audience === process.env.GOOGLE_CLIENT_ID) {
          return mockGoogleTicket(validPayload)
        }
        throw new Error('Token verification failed')
      },
    })

    const claims = await authController.verifyGoogleToken('valid-id-token')
    assert.strictEqual(claims.sub, 'google-sub-valid-1001')
    assert.strictEqual(claims.email, 'test-32-1-3-learner@example.com')
    assert.strictEqual(claims.email_verified, true)
    assert.strictEqual(claims.name, 'Test Learner')
    assert.strictEqual(claims.picture, 'https://lh3.googleusercontent.com/test-photo.jpg')
    console.log('  PASS: verifyGoogleToken accepted valid ID token and returned normalized claims.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 2: Invalid signature rejected
    // ------------------------------------------------------------------------
    console.log('\n[Test 2] Invalid signature rejected...')
    authController._setGoogleClient({
      verifyIdToken: async () => {
        throw new Error('Invalid token signature from Google cert verification')
      },
    })

    let err2 = null
    try {
      await authController.verifyGoogleToken('tampered-token')
    } catch (e) {
      err2 = e
    }
    assert(err2, 'Expected verifyGoogleToken to throw on invalid signature')
    assert.match(err2.message, /Invalid token signature/)

    const res2 = await makeRequest(port, {
      path: '/api/v1/auth/google',
      method: 'POST',
    }, { idToken: 'tampered-token' })
    assert.strictEqual(res2.status, 401, 'Expected HTTP 401 for tampered signature')
    console.log('  PASS: Invalid signature rejected by verifyGoogleToken and HTTP route returns 401.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 3: Wrong audience rejected
    // ------------------------------------------------------------------------
    console.log('\n[Test 3] Wrong audience rejected...')
    authController._setGoogleClient({
      verifyIdToken: async () => {
        return mockGoogleTicket({ ...validPayload, aud: 'attacker-client-id.apps.googleusercontent.com' })
      },
    })

    let err3 = null
    try {
      await authController.verifyGoogleToken('wrong-aud-token')
    } catch (e) {
      err3 = e
    }
    assert(err3, 'Expected verifyGoogleToken to throw on wrong audience')
    assert.match(err3.message, /audience mismatch/i)

    const res3 = await makeRequest(port, {
      path: '/api/v1/auth/google',
      method: 'POST',
    }, { idToken: 'wrong-aud-token' })
    assert.strictEqual(res3.status, 401, 'Expected HTTP 401 for wrong audience')
    console.log('  PASS: Wrong audience rejected with error and HTTP route returns 401.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 4: Invalid issuer rejected
    // ------------------------------------------------------------------------
    console.log('\n[Test 4] Invalid issuer rejected...')
    authController._setGoogleClient({
      verifyIdToken: async () => {
        return mockGoogleTicket({ ...validPayload, iss: 'https://malicious-issuer.com' })
      },
    })

    let err4 = null
    try {
      await authController.verifyGoogleToken('wrong-iss-token')
    } catch (e) {
      err4 = e
    }
    assert(err4, 'Expected verifyGoogleToken to throw on invalid issuer')
    assert.match(err4.message, /Invalid Google token issuer/i)

    const res4 = await makeRequest(port, {
      path: '/api/v1/auth/google',
      method: 'POST',
    }, { idToken: 'wrong-iss-token' })
    assert.strictEqual(res4.status, 401, 'Expected HTTP 401 for invalid issuer')
    console.log('  PASS: Non-Google issuer rejected with error and HTTP route returns 401.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 5: Expired token rejected
    // ------------------------------------------------------------------------
    console.log('\n[Test 5] Expired token rejected...')
    authController._setGoogleClient({
      verifyIdToken: async () => {
        return mockGoogleTicket({ ...validPayload, exp: Math.floor(Date.now() / 1000) - 300 })
      },
    })

    let err5 = null
    try {
      await authController.verifyGoogleToken('expired-token')
    } catch (e) {
      err5 = e
    }
    assert(err5, 'Expected verifyGoogleToken to throw on expired token')
    assert.match(err5.message, /expired/i)

    const res5 = await makeRequest(port, {
      path: '/api/v1/auth/google',
      method: 'POST',
    }, { idToken: 'expired-token' })
    assert.strictEqual(res5.status, 401, 'Expected HTTP 401 for expired token')
    console.log('  PASS: Expired token rejected with error and HTTP route returns 401.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 6: Missing sub rejected
    // ------------------------------------------------------------------------
    console.log('\n[Test 6] Missing sub rejected...')
    authController._setGoogleClient({
      verifyIdToken: async () => {
        return mockGoogleTicket({ ...validPayload, sub: '   ' })
      },
    })

    let err6 = null
    try {
      await authController.verifyGoogleToken('missing-sub-token')
    } catch (e) {
      err6 = e
    }
    assert(err6, 'Expected verifyGoogleToken to throw on missing sub claim')
    assert.match(err6.message, /subject \(sub\) claim/i)

    const res6 = await makeRequest(port, {
      path: '/api/v1/auth/google',
      method: 'POST',
    }, { idToken: 'missing-sub-token' })
    assert.strictEqual(res6.status, 401, 'Expected HTTP 401 for missing sub')
    console.log('  PASS: Missing sub claim rejected with error and HTTP route returns 401.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 7: Missing/invalid email rejected
    // ------------------------------------------------------------------------
    console.log('\n[Test 7] Missing/invalid email rejected...')
    authController._setGoogleClient({
      verifyIdToken: async () => {
        return mockGoogleTicket({ ...validPayload, email: 'not-an-email' })
      },
    })

    let err7 = null
    try {
      await authController.verifyGoogleToken('invalid-email-token')
    } catch (e) {
      err7 = e
    }
    assert(err7, 'Expected verifyGoogleToken to throw on invalid email')
    assert.match(err7.message, /email claim/i)

    const res7 = await makeRequest(port, {
      path: '/api/v1/auth/google',
      method: 'POST',
    }, { idToken: 'invalid-email-token' })
    assert.strictEqual(res7.status, 401, 'Expected HTTP 401 for invalid email')
    console.log('  PASS: Invalid email rejected with error and HTTP route returns 401.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 8: email_verified: false rejected
    // ------------------------------------------------------------------------
    console.log('\n[Test 8] email_verified: false rejected...')
    authController._setGoogleClient({
      verifyIdToken: async () => {
        return mockGoogleTicket({ ...validPayload, email_verified: false })
      },
    })

    let err8 = null
    try {
      await authController.verifyGoogleToken('unverified-email-token')
    } catch (e) {
      err8 = e
    }
    assert(err8, 'Expected verifyGoogleToken to throw when email_verified is false')
    assert.match(err8.message, /not verified/i)

    const res8 = await makeRequest(port, {
      path: '/api/v1/auth/google',
      method: 'POST',
    }, { idToken: 'unverified-email-token' })
    assert.strictEqual(res8.status, 401, 'Expected HTTP 401 for unverified email')
    console.log('  PASS: email_verified: false strictly rejected with error and HTTP 401.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 9: Missing email_verified rejected
    // ------------------------------------------------------------------------
    console.log('\n[Test 9] Missing email_verified rejected...')
    authController._setGoogleClient({
      verifyIdToken: async () => {
        const p = { ...validPayload }
        delete p.email_verified
        return mockGoogleTicket(p)
      },
    })

    let err9 = null
    try {
      await authController.verifyGoogleToken('missing-email-verified-token')
    } catch (e) {
      err9 = e
    }
    assert(err9, 'Expected verifyGoogleToken to throw when email_verified is undefined')
    assert.match(err9.message, /not verified/i)

    const res9 = await makeRequest(port, {
      path: '/api/v1/auth/google',
      method: 'POST',
    }, { idToken: 'missing-email-verified-token' })
    assert.strictEqual(res9.status, 401, 'Expected HTTP 401 for missing email_verified')
    console.log('  PASS: Missing email_verified strictly rejected with error and HTTP 401.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 10: Admin Google login returns HTTP 403 (ADMIN_GOOGLE_AUTH_PROHIBITED)
    // ------------------------------------------------------------------------
    console.log('\n[Test 10] Admin Google login returns HTTP 403...')
    const adminEmail = 'test-32-1-3-admin@kaushalai.gov.in'
    const adminPassword = 'KaushalAI@Admin#2026'
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10)
    const adminUser = await User.create({
      name: 'System Administrator',
      email: adminEmail,
      role: 'admin',
      passwordHash: adminPasswordHash,
      employeeId: 'TEST-ADM-32-1-3',
      department: 'MoSPI Computer Centre HQ',
      experienceYears: 12,
      isActive: true,
      googleLinked: false,
    })

    authController._setGoogleClient({
      verifyIdToken: async () => {
        return mockGoogleTicket({
          ...validPayload,
          sub: 'google-sub-admin-attempt',
          email: adminEmail,
          name: 'Hacked Admin Name',
          picture: 'https://attacker.com/avatar.jpg',
        })
      },
    })

    const res10 = await makeRequest(port, {
      path: '/api/v1/auth/google',
      method: 'POST',
    }, { idToken: 'admin-google-token' })

    assert.strictEqual(res10.status, 403, `Expected HTTP 403 for admin Google login, got ${res10.status}`)
    assert.strictEqual(res10.body.code, 'ADMIN_GOOGLE_AUTH_PROHIBITED')
    assert.match(res10.body.message, /Administrator accounts cannot authenticate via Google/i)
    console.log('  PASS: Admin Google login rejected with HTTP 403 and ADMIN_GOOGLE_AUTH_PROHIBITED.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 11: Admin rejection creates no access or refresh token, no mutation, audit recorded
    // ------------------------------------------------------------------------
    console.log('\n[Test 11] Admin rejection creates no tokens, leaves record unmutated, logs audit...')
    // No access token in body
    assert.strictEqual(res10.body.accessToken, undefined)
    assert.strictEqual(res10.body.user, undefined)

    // No refreshToken cookie set
    const setCookie = res10.headers['set-cookie']
    if (setCookie) {
      const hasRefresh = setCookie.some((c) => c.startsWith('refreshToken='))
      assert.strictEqual(hasRefresh, false, 'Expected no refreshToken cookie on admin Google rejection')
    }

    // Verify 0 refresh tokens in database for admin
    const tokensCount = await RefreshToken.countDocuments({ userId: adminUser._id })
    assert.strictEqual(tokensCount, 0, 'Expected 0 RefreshToken records created for admin')

    // Verify admin record unmutated
    const fetchedAdmin = await User.findById(adminUser._id)
    assert.strictEqual(fetchedAdmin.googleLinked, false, 'googleLinked should not be mutated on admin')
    assert.strictEqual(fetchedAdmin.name, 'System Administrator', 'Admin name should not be overwritten')
    assert.strictEqual(fetchedAdmin.avatarUrl || null, null, 'Admin avatar should not be overwritten')

    // Verify audit log recorded
    const auditRecord = await AuditLog.findOne({
      action: 'ADMIN_GOOGLE_AUTH_BLOCKED',
      'meta.email': adminEmail,
    })
    assert(auditRecord, 'Expected ADMIN_GOOGLE_AUTH_BLOCKED audit entry')
    assert.strictEqual(auditRecord.meta.role, 'admin')
    console.log('  PASS: Admin rejection verified: 0 tokens, no cookie, 0 mutations, audit log created.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 12: Admin password login still succeeds
    // ------------------------------------------------------------------------
    console.log('\n[Test 12] Admin password login still succeeds...')
    const res12Admin = await makeRequest(port, {
      path: '/api/v1/auth/admin-login',
      method: 'POST',
    }, { email: adminEmail, password: adminPassword })

    assert.strictEqual(res12Admin.status, 200, `Expected HTTP 200 for admin password login, got ${res12Admin.status}`)
    assert(res12Admin.body.accessToken, 'Expected accessToken on successful admin password login')
    assert.strictEqual(res12Admin.body.user.role, 'admin')
    assert.strictEqual(res12Admin.body.user.email, adminEmail)

    // Also verify standard /login endpoint
    const res12Login = await makeRequest(port, {
      path: '/api/v1/auth/login',
      method: 'POST',
    }, { email: adminEmail, password: adminPassword })
    assert.strictEqual(res12Login.status, 200, 'Expected HTTP 200 on /login for admin password')
    assert(res12Login.body.accessToken)
    console.log('  PASS: Admin password login succeeds seamlessly via /admin-login and /login.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 13: Existing ordinary employee Google auth succeeds and returns established contract
    // ------------------------------------------------------------------------
    console.log('\n[Test 13] Existing ordinary employee Google auth succeeds...')
    const empEmail = 'test-32-1-3-emp@kaushalai.gov.in'
    const empPasswordHash = await bcrypt.hash('Employee@KaushalAI#2026', 10)
    const empUser = await User.create({
      name: 'Rajan Sharma',
      email: empEmail,
      role: 'employee',
      passwordHash: empPasswordHash,
      employeeId: 'TEST-EMP-32-1-3',
      department: 'National Accounts Division (NAD)',
      experienceYears: 4,
      isActive: true,
      googleLinked: false,
    })

    authController._setGoogleClient({
      verifyIdToken: async () => {
        return mockGoogleTicket({
          ...validPayload,
          sub: 'google-sub-employee-1002',
          email: empEmail,
          name: 'Rajan Sharma',
          picture: 'https://lh3.googleusercontent.com/employee-photo.jpg',
        })
      },
    })

    const res13 = await makeRequest(port, {
      path: '/api/v1/auth/google',
      method: 'POST',
    }, { idToken: 'valid-employee-google-token' })

    assert.strictEqual(res13.status, 200, `Expected HTTP 200 for employee Google login, got ${res13.status}`)
    assert(res13.body.accessToken, 'Expected accessToken in response body')
    assert.strictEqual(res13.body.user.role, 'employee')
    assert.strictEqual(res13.body.user.email, empEmail)
    assert.strictEqual(res13.body.user.googleLinked, true, 'googleLinked flag should be set')
    assert.strictEqual(res13.body.user.avatarUrl, 'https://lh3.googleusercontent.com/employee-photo.jpg')

    // Verify cookie set
    const empCookie = res13.headers['set-cookie']
    assert(empCookie, 'Expected Set-Cookie header for refreshToken')
    const hasRefreshCookie = empCookie.some((c) => c.startsWith('refreshToken='))
    assert.strictEqual(hasRefreshCookie, true, 'Expected refreshToken in Set-Cookie')

    // Verify refresh token in database
    const empRefreshTokens = await RefreshToken.countDocuments({ userId: empUser._id })
    assert.strictEqual(empRefreshTokens, 1, 'Expected 1 RefreshToken in database')
    console.log('  PASS: Existing ordinary employee authenticated cleanly, received tokens & cookies.')
    passedCount++

    console.log('\n========================================================================')
    console.log(`  PART 32.1.3 SUITE COMPLETE: ${passedCount}/${totalCount} TESTS PASSED`)
    console.log('========================================================================\n')
  } finally {
    // Teardown
    await User.deleteMany({ email: /test-32-1-3/i })
    await RefreshToken.deleteMany({})
    await AuditLog.deleteMany({ 'meta.email': /test-32-1-3/i })
    if (server) server.close()
    await mongoose.disconnect()

    // Final dev db verification
    const devConnFinal = await mongoose.createConnection(DEV_DB_URI).asPromise()
    const finalDevUsers = await devConnFinal.collection('users').countDocuments()
    assert.strictEqual(finalDevUsers, initialDevUsers, 'DEV DB INTEGRITY BREACH DETECTED!')
    console.log(`[Teardown] Verified dev database 'kaushalai' remains strictly untouched (${finalDevUsers} users).`)
    await devConnFinal.close()
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failed with Error:\n', err)
  process.exit(1)
})
