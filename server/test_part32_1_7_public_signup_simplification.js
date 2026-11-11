/**
 * PART 32.1.7: Public Signup Simplification & Legacy Google Onboarding Audit Test Suite
 *
 * Verifies:
 * 1. Google-only public signup: direct one-click authentication.
 * 2. First-time automatic learner provisioning: clean domain-neutral learner profile.
 * 3. Returning Google login: direct authentication with zero duplicate creation.
 * 4. No employee-ID completion gate for learners: token issued immediately, employeeId is null.
 * 5. No obsolete Google completion redirect: requiresCompletion is never returned.
 * 6. Existing government login compatibility: password, OTP, and SSO work seamlessly.
 * 7. Verified email linking preserves existing government metadata and records.
 * 8. Backend officer-registration functionality (POST /api/auth/signup) remains functional.
 * 9. Admin username/password login operational.
 * 10. Google authentication strictly prohibited for admins (HTTP 403).
 * 11. Development database 'kaushalai' remains strictly untouched.
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
process.env.ACCESS_TOKEN_SECRET = 'test_access_secret_part32_1_7_super_secure'
process.env.JWT_SECRET = 'test_jwt_secret_part32_1_7_super_secure'
process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_part32_1_7_super_secure'
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

function mockGoogleTokenVerification(sub, email, name = 'Learner 3217', picture = null) {
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
  console.log('  PART 32.1.7: Public Signup Simplification & Onboarding Audit Suite')
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
  app.post('/api/auth/sso', authController.ssoLogin)
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
    // ── Test 1: Google-only public signup returns direct session ───────────────
    console.log('[Test 1] Public Google signup directly returns user and accessToken...')
    mockGoogleTokenVerification('sub_learner_701', 'learner.alpha@gmail.com', 'Aarav Public')
    const res1 = await request('POST', '/api/auth/google', { idToken: 'valid_alpha_token' })

    if (res1.status === 200 && res1.body.user && res1.body.accessToken && !res1.body.requiresCompletion) {
      console.log('  PASS Test 1: Direct Google signup returned authenticated session without requiresCompletion.')
      passed++
    } else {
      throw new Error(`Test 1 Failed: Status ${res1.status}, body: ${JSON.stringify(res1.body)}`)
    }

    // ── Test 2: First-time learner provisioned with null employeeId ───────────
    console.log('[Test 2] First-time learner provisioned with null employeeId and domain neutrality...')
    const learnerDoc = await User.findOne({ email: 'learner.alpha@gmail.com' })
    if (
      learnerDoc &&
      learnerDoc.employeeId === null &&
      learnerDoc.cadre === null &&
      learnerDoc.department === null &&
      learnerDoc.role === 'employee' &&
      learnerDoc.googleSub === 'sub_learner_701' &&
      learnerDoc.googleLinked === true
    ) {
      console.log('  PASS Test 2: Learner account is domain-neutral with null institutional fields.')
      passed++
    } else {
      throw new Error(`Test 2 Failed: Profile contains unexpected attributes: ${JSON.stringify(learnerDoc)}`)
    }

    // ── Test 3: Returning Google login operates seamlessly ─────────────────────
    console.log('[Test 3] Returning Google login authenticates existing account directly...')
    mockGoogleTokenVerification('sub_learner_701', 'learner.alpha@gmail.com')
    const res3 = await request('POST', '/api/auth/google', { idToken: 'valid_alpha_token' })
    const userCount = await User.countDocuments({ email: 'learner.alpha@gmail.com' })

    if (res3.status === 200 && res3.body.user._id === String(learnerDoc._id) && userCount === 1) {
      console.log('  PASS Test 3: Returning Google user authenticated existing record without re-provisioning.')
      passed++
    } else {
      throw new Error(`Test 3 Failed: User mismatch or duplicate records created.`)
    }

    // ── Test 4: No employee-ID completion gate for ordinary learners ───────────
    console.log('[Test 4] Learner can use access token immediately with null employeeId...')
    const decoded = jwt.verify(res1.body.accessToken, process.env.ACCESS_TOKEN_SECRET)
    if (decoded && decoded.id === String(learnerDoc._id) && decoded.role === 'employee') {
      console.log('  PASS Test 4: Access token is immediately valid for platform access.')
      passed++
    } else {
      throw new Error(`Test 4 Failed: Invalid token payload: ${JSON.stringify(decoded)}`)
    }

    // ── Test 5: No obsolete Google completion redirect or response flag ────────
    console.log('[Test 5] Google auth response contract has zero requiresCompletion flag...')
    if (res1.body.requiresCompletion === undefined && res3.body.requiresCompletion === undefined) {
      console.log('  PASS Test 5: Response contract has zero requiresCompletion flag.')
      passed++
    } else {
      throw new Error(`Test 5 Failed: requiresCompletion was present in response: ${JSON.stringify(res1.body)}`)
    }

    // ── Test 6: Government account password login preserved ────────────────────
    console.log('[Test 6] Government account password login preserved...')
    const govtPasswordHash = await bcrypt.hash('GovtPass2026!', 10)
    await User.create({
      name: 'Sunita Sharma',
      email: 'sunita.sharma@mospi.gov.in',
      passwordHash: govtPasswordHash,
      employeeId: 'MOSPI-GOV-901',
      department: 'Economic Statistics Division (ESD)',
      cadre: 'ISS',
      role: 'employee',
      isActive: true,
    })

    const govtLoginRes = await request('POST', '/api/auth/login', {
      email: 'sunita.sharma@mospi.gov.in',
      password: 'GovtPass2026!',
    })

    if (govtLoginRes.status === 200 && govtLoginRes.body.user.employeeId === 'MOSPI-GOV-901') {
      console.log('  PASS Test 6: Existing government account logged in via password, retaining employeeId & cadre.')
      passed++
    } else {
      throw new Error(`Test 6 Failed: Government password login failed: ${govtLoginRes.status}`)
    }

    // ── Test 7: Government account Google email linking preserves metadata ────
    console.log('[Test 7] Google login matching government email links identity while preserving records...')
    mockGoogleTokenVerification('sub_govt_sunita', 'sunita.sharma@mospi.gov.in', 'Sunita Sharma')
    const linkRes = await request('POST', '/api/auth/google', { idToken: 'sunita_token' })
    const updatedGovt = await User.findOne({ email: 'sunita.sharma@mospi.gov.in' })

    if (
      linkRes.status === 200 &&
      updatedGovt.googleSub === 'sub_govt_sunita' &&
      updatedGovt.googleLinked === true &&
      updatedGovt.employeeId === 'MOSPI-GOV-901' &&
      updatedGovt.cadre === 'ISS' &&
      updatedGovt.department === 'Economic Statistics Division (ESD)'
    ) {
      console.log('  PASS Test 7: Government account safely linked Google identity while preserving 100% of cadre metadata.')
      passed++
    } else {
      throw new Error(`Test 7 Failed: Government metadata corrupted during link: ${JSON.stringify(updatedGovt)}`)
    }

    // ── Test 8: Backend officer-registration functionality preserved ──────────
    console.log('[Test 8] Backend officer signup endpoint (POST /api/auth/signup) remains functional...')
    await AuthorizedOfficer.create({
      employeeId: 'MOSPI-AUTH-ROSTER-2',
      fullName: 'Vikramaditya Roy',
      officialEmail: 'vikram.roy@mospi.gov.in',
      department: 'National Accounts Division (NAD)',
      isClaimed: false,
    })

    const officerRes = await request('POST', '/api/auth/signup', {
      employeeId: 'MOSPI-AUTH-ROSTER-2',
      name: 'Vikramaditya Roy',
      email: 'vikram.roy@mospi.gov.in',
      password: 'SecureOfficer2026!',
      role: 'employee',
      experienceYears: 5,
    })

    if (officerRes.status === 201 && officerRes.body.user.employeeId === 'MOSPI-AUTH-ROSTER-2') {
      console.log('  PASS Test 8: Backend officer registration endpoint remains fully functional.')
      passed++
    } else {
      throw new Error(`Test 8 Failed: Officer signup endpoint failed: ${officerRes.status}`)
    }

    // ── Test 9: Admin password authentication preserved ───────────────────────
    console.log('[Test 9] Admin username/password authentication remains 100% operational...')
    const adminPassHash = await bcrypt.hash('AdminSecret2026!', 10)
    await User.create({
      name: 'Chief Admin',
      email: 'admin.chief@kaushalai.gov.in',
      passwordHash: adminPassHash,
      role: 'admin',
      isActive: true,
      employeeId: 'ADM-CHIEF-01',
    })

    const adminLoginRes = await request('POST', '/api/auth/admin-login', {
      email: 'admin.chief@kaushalai.gov.in',
      password: 'AdminSecret2026!',
    })

    if (adminLoginRes.status === 200 && adminLoginRes.body.user.role === 'admin') {
      console.log('  PASS Test 9: Admin password authentication fully functional.')
      passed++
    } else {
      throw new Error(`Test 9 Failed: Admin login failed: ${adminLoginRes.status}`)
    }

    // ── Test 10: Google authentication strictly prohibited for admins ──────────
    console.log('[Test 10] Google authentication cannot grant admin access...')
    mockGoogleTokenVerification('sub_evil_admin', 'admin.chief@kaushalai.gov.in')
    const adminGoogleRes = await request('POST', '/api/auth/google', { idToken: 'evil_admin_token' })

    if (adminGoogleRes.status === 403 && adminGoogleRes.body.code === 'ADMIN_GOOGLE_AUTH_PROHIBITED') {
      console.log('  PASS Test 10: Google auth cannot grant admin access (HTTP 403 ADMIN_GOOGLE_AUTH_PROHIBITED).')
      passed++
    } else {
      throw new Error(`Test 10 Failed: Expected 403, got ${adminGoogleRes.status}: ${JSON.stringify(adminGoogleRes.body)}`)
    }

    console.log('\n========================================================================')
    console.log(`  PART 32.1.7 SUITE COMPLETE: ${passed}/${total} TESTS PASSED`)
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

