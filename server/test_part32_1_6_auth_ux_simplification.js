/**
 * PART 32.1.6: Universal Authentication UX Simplification & Cookie Path Normalization Test Suite
 *
 * Verifies:
 * 1. Direct Universal Google Registration: returns { user, accessToken } with 0 requiresCompletion.
 * 2. New learner profile is domain-neutral: null employeeId/cadre/department.
 * 3. Returning Google user signs in directly with 0 friction.
 * 4. Admin isolation invariant: Google auth strictly prohibited (HTTP 403).
 * 5. Cookie clear path normalization (DEF-01): logout() and refresh() clear cookie with Path=/.
 * 6. Institutional Government Registration compatibility: POST /api/auth/signup works with AuthorizedOfficer.
 * 7. Non-whitelisted officer signup rejected (HTTP 403) while universal Google signup is unrestricted.
 * 8. Admin password authentication remains 100% operational.
 * 9. Development database 'kaushalai' remains strictly untouched.
 */

const http = require('http')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const express = require('express')
const cookieParser = require('cookie-parser')

const TEST_DB_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/kaushalai_test'
const DEV_DB_URI  = 'mongodb://127.0.0.1:27017/kaushalai'

process.env.NODE_ENV = 'test'
process.env.ACCESS_TOKEN_SECRET = 'test_access_secret_part32_1_6_super_secure'
process.env.JWT_SECRET = 'test_jwt_secret_part32_1_6_super_secure'
process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_part32_1_6_super_secure'
process.env.GOOGLE_CLIENT_ID = '53216323962-2l6pkp3uk97m609jrfr1qc1s4e6b2fie.apps.googleusercontent.com'

const User = require('./src/models/User')
const RefreshToken = require('./src/models/RefreshToken')
const AuthorizedOfficer = require('./src/models/AuthorizedOfficer')
const authController = require('./src/controllers/auth.controller')

let server
let app
let baseUrl

function request(method, path, body = null, headers = {}) {
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

function mockGoogleTokenVerification(sub, email, name = 'Learner Test', picture = null) {
  authController._setGoogleClient({
    verifyIdToken: async ({ idToken, audience }) => {
      if (audience !== process.env.GOOGLE_CLIENT_ID) {
        throw new Error('Google token audience mismatch.')
      }
      return {
        getPayload: () => ({
          iss: 'https://accounts.google.com',
          aud: process.env.GOOGLE_CLIENT_ID,
          sub,
          email,
          email_verified: true,
          name,
          picture,
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      }
    },
  })
}

async function verifyDevDatabasePreserved() {
  const devConn = await mongoose.createConnection(DEV_DB_URI).asPromise()
  const usersCount = await devConn.collection('users').countDocuments()
  await devConn.close()
  if (usersCount !== 15) {
    throw new Error(`CRITICAL INVARIANT VIOLATION: Dev database 'kaushalai' user count mutated! Expected 15, got ${usersCount}`)
  }
}

async function runTests() {
  console.log('========================================================================')
  console.log('  PART 32.1.6: Universal Auth UX & Cookie Normalization Test Suite')
  console.log('========================================================================\n')

  await verifyDevDatabasePreserved()
  console.log('[Setup] Confirmed dev database kaushalai has exactly 15 users.')

  await mongoose.connect(TEST_DB_URI)
  console.log('[Setup] Connected to test database:', TEST_DB_URI)

  await User.syncIndexes()
  await User.deleteMany({})
  await RefreshToken.deleteMany({})
  await AuthorizedOfficer.deleteMany({})

  app = express()
  app.use(express.json())
  app.use(cookieParser())

  app.post('/api/auth/google', authController.googleAuth)
  app.post('/api/auth/signup', authController.signup)
  app.post('/api/auth/login', authController.login)
  app.post('/api/auth/admin-login', authController.adminLogin)
  app.post('/api/auth/refresh', authController.refresh)
  app.post('/api/auth/logout', authController.logout)

  app.use((err, req, res, next) => {
    const status = err.status || 500
    res.status(status).json({ message: err.message, code: err.code || 'SERVER_ERROR' })
  })

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      baseUrl = `http://127.0.0.1:${port}`
      console.log(`[Setup] Express test server listening at ${baseUrl}\n`)
      resolve()
    })
  })

  let passed = 0
  const total = 10

  try {
    // ── Test 1: Direct Universal Learner Registration ──────────────────────────
    console.log('[Test 1] Universal Learner Google Sign-up provisions account directly...')
    mockGoogleTokenVerification('sub_universal_101', 'universal.student@university.edu', 'Priya Student')
    const res1 = await request('POST', '/api/auth/google', { idToken: 'valid_student_token' })

    if (res1.status === 200 && res1.body.user && res1.body.accessToken && !res1.body.requiresCompletion) {
      console.log('  PASS Test 1: Direct Google sign-up returned { user, accessToken } with 0 intermediate gates.')
      passed++
    } else {
      throw new Error(`Test 1 Failed: Status ${res1.status}, body: ${JSON.stringify(res1.body)}`)
    }

    // ── Test 2: Universal Learner profile neutrality ────────────────────────────
    console.log('[Test 2] Universal Learner has null employeeId and domain-neutral attributes...')
    const learner1 = await User.findOne({ email: 'universal.student@university.edu' })
    if (
      learner1 &&
      learner1.employeeId === null &&
      learner1.cadre === null &&
      learner1.department === null &&
      learner1.role === 'employee' &&
      learner1.googleSub === 'sub_universal_101' &&
      learner1.googleLinked === true
    ) {
      console.log('  PASS Test 2: Learner account is domain-neutral (no fabricated MoSPI metadata).')
      passed++
    } else {
      throw new Error(`Test 2 Failed: Profile contains non-null institutional fields: ${JSON.stringify(learner1)}`)
    }

    // ── Test 3: Returning Google user signs in directly ────────────────────────
    console.log('[Test 3] Returning Google user signs in immediately without recreation...')
    mockGoogleTokenVerification('sub_universal_101', 'universal.student@university.edu')
    const res3 = await request('POST', '/api/auth/google', { idToken: 'valid_student_token' })
    const countAfter = await User.countDocuments({ email: 'universal.student@university.edu' })

    if (res3.status === 200 && res3.body.user._id === String(learner1._id) && countAfter === 1) {
      console.log('  PASS Test 3: Returning Google user signed in cleanly; exactly 1 account persists.')
      passed++
    } else {
      throw new Error(`Test 3 Failed: Status ${res3.status}, user ID mismatch or duplicate user.`)
    }

    // ── Test 4: Administrator Google login blocked with HTTP 403 ───────────────
    console.log('[Test 4] Admin account cannot authenticate via Google...')
    const adminPasswordHash = await bcrypt.hash('AdminSecurePass123!', 10)
    await User.create({
      name: 'System Admin',
      email: 'admin.platform@kaushalai.gov.in',
      passwordHash: adminPasswordHash,
      role: 'admin',
      isActive: true,
      employeeId: 'ADM-001',
    })

    mockGoogleTokenVerification('sub_admin_evil', 'admin.platform@kaushalai.gov.in')
    const res4 = await request('POST', '/api/auth/google', { idToken: 'admin_google_token' })

    if (res4.status === 403 && res4.body.code === 'ADMIN_GOOGLE_AUTH_PROHIBITED') {
      console.log('  PASS Test 4: Admin Google login strictly rejected with HTTP 403.')
      passed++
    } else {
      throw new Error(`Test 4 Failed: Expected 403 ADMIN_GOOGLE_AUTH_PROHIBITED, got ${res4.status}: ${JSON.stringify(res4.body)}`)
    }

    // ── Test 5: Cookie clear path normalization on logout (DEF-01) ─────────────
    console.log('[Test 5] logout() clears refreshToken cookie with Path=/...')
    // Login to get a valid refresh cookie
    const loginRes = await request('POST', '/api/auth/login', {
      email: 'admin.platform@kaushalai.gov.in',
      password: 'AdminSecurePass123!',
    })
    const rawSetCookie = loginRes.headers['set-cookie']
    if (!rawSetCookie || !rawSetCookie[0]) {
      throw new Error('Failed to acquire refresh token cookie during login.')
    }
    const cookieHeader = rawSetCookie[0].split(';')[0]

    const logoutRes = await request('POST', '/api/auth/logout', null, {
      Cookie: cookieHeader,
    })
    const logoutCookies = logoutRes.headers['set-cookie']
    const hasRootPathLogout = logoutCookies && logoutCookies.some((c) => c.includes('Path=/') && !c.includes('Path=/api/auth'))

    if (logoutRes.status === 200 && hasRootPathLogout) {
      console.log('  PASS Test 5: logout() sets Set-Cookie with Path=/ (DEF-01 resolved).')
      passed++
    } else {
      throw new Error(`Test 5 Failed: Logout cookie path incorrect: ${JSON.stringify(logoutCookies)}`)
    }

    // ── Test 6: Cookie clear path normalization on invalid refresh (DEF-01) ────
    console.log('[Test 6] refresh() clears expired/invalid refreshToken cookie with Path=/...')
    const badRefreshRes = await request('POST', '/api/auth/refresh', null, {
      Cookie: 'refreshToken=invalid_or_expired_refresh_token_string',
    })
    const refreshCookies = badRefreshRes.headers['set-cookie']
    const hasRootPathRefresh = refreshCookies && refreshCookies.some((c) => c.includes('Path=/') && !c.includes('Path=/api/auth'))

    if (badRefreshRes.status === 401 && hasRootPathRefresh) {
      console.log('  PASS Test 6: refresh() sets Set-Cookie with Path=/ on invalid token (DEF-01 resolved).')
      passed++
    } else {
      throw new Error(`Test 6 Failed: Refresh clear cookie path incorrect: ${JSON.stringify(refreshCookies)}`)
    }

    // ── Test 7: Institutional Officer Signup with Roster Verification ──────────
    console.log('[Test 7] Institutional MoSPI officer registration succeeds against AuthorizedOfficer...')
    await AuthorizedOfficer.create({
      employeeId: 'MOSPI-2024-TEST-1',
      fullName: 'Ramesh Verma',
      officialEmail: 'ramesh.verma@mospi.gov.in',
      department: 'Field Operations Division (FOD)',
      isClaimed: false,
    })

    const officerSignupRes = await request('POST', '/api/auth/signup', {
      employeeId: 'MOSPI-2024-TEST-1',
      name: 'Ramesh Verma',
      email: 'ramesh.verma@mospi.gov.in',
      password: 'OfficerPassword123!',
      role: 'employee',
      experienceYears: 4,
    })

    if (officerSignupRes.status === 201 && officerSignupRes.body.user && officerSignupRes.body.user.employeeId === 'MOSPI-2024-TEST-1') {
      console.log('  PASS Test 7: Institutional officer registered with validated employee ID and roster data.')
      passed++
    } else {
      throw new Error(`Test 7 Failed: Officer signup failed: ${officerSignupRes.status} ${JSON.stringify(officerSignupRes.body)}`)
    }

    // ── Test 8: Non-whitelisted officer registration rejected ─────────────────
    console.log('[Test 8] Non-whitelisted employee ID is rejected by institutional signup...')
    const unauthSignupRes = await request('POST', '/api/auth/signup', {
      employeeId: 'FAKE-ID-999',
      name: 'Fake Officer',
      email: 'fake.officer@unknown.gov.in',
      password: 'Password123!',
      role: 'employee',
    })

    if (unauthSignupRes.status === 403) {
      console.log('  PASS Test 8: Non-whitelisted institutional signup rejected with HTTP 403.')
      passed++
    } else {
      throw new Error(`Test 8 Failed: Expected 403, got ${unauthSignupRes.status}`)
    }

    // ── Test 9: Universal Google Signup is NOT gated by whitelist ──────────────
    console.log('[Test 9] Universal Google registration is NOT blocked by officer whitelist...')
    mockGoogleTokenVerification('sub_public_user_777', 'public.citizen@gmail.com', 'Aarav Public')
    const res9 = await request('POST', '/api/auth/google', { idToken: 'valid_public_token' })

    if (res9.status === 200 && res9.body.user.email === 'public.citizen@gmail.com') {
      console.log('  PASS Test 9: Public citizen registered and authenticated with zero whitelist restriction.')
      passed++
    } else {
      throw new Error(`Test 9 Failed: Public citizen blocked: ${res9.status} ${JSON.stringify(res9.body)}`)
    }

    // ── Test 10: Admin username/password authentication continues to work ──────
    console.log('[Test 10] Admin username/password authentication remains 100% operational...')
    const adminLoginRes = await request('POST', '/api/auth/admin-login', {
      email: 'admin.platform@kaushalai.gov.in',
      password: 'AdminSecurePass123!',
    })

    if (adminLoginRes.status === 200 && adminLoginRes.body.user.role === 'admin' && adminLoginRes.body.accessToken) {
      console.log('  PASS Test 10: Admin password authentication fully functional.')
      passed++
    } else {
      throw new Error(`Test 10 Failed: Admin login failed: ${adminLoginRes.status} ${JSON.stringify(adminLoginRes.body)}`)
    }

    console.log('\n========================================================================')
    console.log(`  PART 32.1.6 SUITE COMPLETE: ${passed}/${total} TESTS PASSED`)
    console.log('========================================================================\n')

  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
    await User.deleteMany({})
    await RefreshToken.deleteMany({})
    await AuthorizedOfficer.deleteMany({})
    await mongoose.disconnect()

    await verifyDevDatabasePreserved()
    console.log('[Teardown] Verified dev database kaushalai remains strictly untouched (15 users).')
  }
}

runTests().catch((err) => {
  console.error('\n[FATAL ERROR IN TEST SUITE]', err)
  process.exit(1)
})
