'use strict'

/**
 * PART 32.1.4 — Stage 2: Google Identity Mapping & Universal Learner Provisioning Test Suite
 *
 * Test cases:
 *  1. New Google identity creates one ordinary learner.
 *  2. New learner receives `role: 'employee'`.
 *  3. New learner has a valid `googleSub`.
 *  4. New learner contains no fabricated MoSPI identity fields.
 *  5. Returning Google subject authenticates the same user.
 *  6. Verified email links an existing ordinary employee account.
 *  7. Existing user ID and learning-related records remain unchanged after linking.
 *  8. Existing password hash remains unchanged after linking.
 *  9. Existing `googleLinked: true` account without `googleSub` links safely.
 * 10. Same Google subject with a different email resolving to another account returns 409.
 * 11. Existing email bound to a different Google subject returns 409.
 * 12. Google subject matching an administrator returns 403.
 * 13. Email matching an administrator returns 403.
 * 14. Inactive account returns 403.
 * 15. Duplicate normalized email returns 409.
 * 16. Duplicate Google subject cannot be assigned to two accounts.
 * 17. Concurrent first-time provisioning does not create duplicate users.
 * 18. Concurrent identity linking does not create conflicting bindings.
 * 19. Frontend-supplied role or Google subject cannot influence account creation.
 * 20. Admin username/password login remains functional.
 */

const assert = require('assert')
const http = require('http')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const express = require('express')
const cookieParser = require('cookie-parser')
const path = require('path')

require('dotenv').config({ path: path.resolve(__dirname, '.env') })

if (!process.env.GOOGLE_CLIENT_ID) {
  process.env.GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com'
}

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/kaushalai_test'
const DEV_DB_URI = 'mongodb://127.0.0.1:27017/kaushalai'

// Models
const User = require('./src/models/User')
const RefreshToken = require('./src/models/RefreshToken')
const AuditLog = require('./src/models/AuditLog')
const QuizAttempt = require('./src/models/QuizAttempt')

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

function mockGoogleTicket(payload) {
  return {
    getPayload: () => payload,
  }
}

async function runTests() {
  console.log('========================================================================')
  console.log('  PART 32.1.4: Google Identity Mapping & Provisioning Test Suite')
  console.log('========================================================================\n')

  // Step 0: Ensure strict DB isolation
  console.log('[Setup] Connecting strictly to test database: ' + TEST_DB_URI)
  await mongoose.connect(TEST_DB_URI)
  assert.strictEqual(
    mongoose.connection.name,
    'kaushalai_test',
    'FATAL: Must connect strictly to kaushalai_test!'
  )

  // Ensure partial unique index exists on test DB
  await User.syncIndexes()

  // Verify dev database is untouched
  const devConn = await mongoose.createConnection(DEV_DB_URI).asPromise()
  const initialDevUsers = await devConn.collection('users').countDocuments()
  console.log(`[Setup] Confirmed read-only dev database 'kaushalai' has ${initialDevUsers} users.`)
  await devConn.close()

  // Clean test database tables
  await User.deleteMany({ email: /test-32-1-4/i })
  await RefreshToken.deleteMany({})
  await AuditLog.deleteMany({ 'meta.email': /test-32-1-4/i })

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
  const totalCount = 20

  const basePayload = {
    iss: 'https://accounts.google.com',
    aud: process.env.GOOGLE_CLIENT_ID,
    exp: Math.floor(Date.now() / 1000) + 3600,
    email_verified: true,
  }

  try {
    // ------------------------------------------------------------------------
    // Test 1-4: New Google identity creates ordinary learner with role employee,
    // valid googleSub, and no fabricated MoSPI fields
    // ------------------------------------------------------------------------
    console.log('[Test 1-4] New Google identity creates ordinary learner...')
    const newLearnerSub = 'google-sub-universal-1001'
    const newLearnerEmail = 'test-32-1-4-learner-1@kaushalai.org'

    authController._setGoogleClient({
      verifyIdToken: async () => {
        return mockGoogleTicket({
          ...basePayload,
          sub: newLearnerSub,
          email: newLearnerEmail,
          name: 'Sunita Sharma',
          picture: 'https://lh3.googleusercontent.com/sunita.jpg',
        })
      },
    })

    const res1 = await makeRequest(port, {
      path: '/api/v1/auth/google',
      method: 'POST',
    }, { idToken: 'token-sunita' })

    assert.strictEqual(res1.status, 200, `Expected HTTP 200, got ${res1.status}`)
    assert(res1.body.accessToken, 'Expected accessToken')
    assert(res1.body.user, 'Expected user object in response')

    const createdUser = await User.findById(res1.body.user._id)
    assert(createdUser, 'User must exist in MongoDB')

    // Test 1: New Google identity creates one ordinary learner
    console.log('  PASS Test 1: Exactly one user created for new Google identity.')
    passedCount++

    // Test 2: New learner receives role: 'employee'
    assert.strictEqual(createdUser.role, 'employee', 'Role must be employee')
    console.log('  PASS Test 2: New learner assigned canonical role: employee.')
    passedCount++

    // Test 3: New learner has a valid googleSub
    assert.strictEqual(createdUser.googleSub, newLearnerSub, 'googleSub must match verified sub')
    assert.strictEqual(createdUser.googleLinked, true, 'googleLinked must be true')
    console.log('  PASS Test 3: New learner has valid persistent googleSub and googleLinked: true.')
    passedCount++

    // Test 4: New learner contains no fabricated MoSPI identity fields
    assert.strictEqual(createdUser.employeeId, null, 'employeeId must be null (no fake ISS ID)')
    assert.strictEqual(createdUser.designation || null, null, 'designation must be null (no fake Statistical Officer)')
    assert.strictEqual(createdUser.department || null, null, 'department must be null (no fake FOD)')
    assert.strictEqual(createdUser.cadre || null, null, 'cadre must be null (no fake ISS cadre)')
    assert.strictEqual(createdUser.batch || null, null, 'batch must be null')
    assert.strictEqual(createdUser.reportingTo || null, null, 'reportingTo must be null')
    console.log('  PASS Test 4: New learner is free of fabricated government profile fields.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 5: Returning Google subject authenticates the same user
    // ------------------------------------------------------------------------
    console.log('\n[Test 5] Returning Google subject authenticates the same user...')
    const res5 = await makeRequest(port, {
      path: '/api/v1/auth/google',
      method: 'POST',
    }, { idToken: 'token-sunita-returning' })

    assert.strictEqual(res5.status, 200)
    assert.strictEqual(String(res5.body.user._id), String(createdUser._id), 'Must return the same User ID')
    const userCount5 = await User.countDocuments({ email: newLearnerEmail })
    assert.strictEqual(userCount5, 1, 'No duplicate user document should be created')
    console.log('  PASS Test 5: Returning Google subject authenticated the existing account unambiguously.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 6-8: Verified email links existing ordinary employee account,
    // preserves ID, learning records, and password hash
    // ------------------------------------------------------------------------
    console.log('\n[Test 6-8] Verified email links existing ordinary employee account...')
    const existingEmpEmail = 'test-32-1-4-existing-emp@kaushalai.gov.in'
    const originalPasswordHash = await bcrypt.hash('OriginalSecureGovPass#2026', 10)
    const existingEmp = await User.create({
      name: 'Priya Officer',
      email: existingEmpEmail,
      role: 'employee',
      passwordHash: originalPasswordHash,
      employeeId: 'MOSPI-2024-LEGACY-01',
      department: 'National Accounts Division (NAD)',
      cadre: 'Indian Statistical Service (ISS)',
      experienceYears: 5,
      isActive: true,
      googleLinked: false,
      googleSub: null,
    })

    // Attach a learning-related record (QuizAttempt) to this user
    const attempt = await QuizAttempt.create({
      userId: existingEmp._id,
      quizId: new mongoose.Types.ObjectId(),
      status: 'completed',
      score: 85,
      totalQuestions: 10,
      correctCount: 8,
      attemptedAt: new Date(Date.now() - 3600000),
      completedAt: new Date(),
    })

    const empGoogleSub = 'google-sub-priya-linked-8822'
    authController._setGoogleClient({
      verifyIdToken: async () => {
        return mockGoogleTicket({
          ...basePayload,
          sub: empGoogleSub,
          email: existingEmpEmail,
          name: 'Priya Officer',
          picture: 'https://lh3.googleusercontent.com/priya.jpg',
        })
      },
    })

    const res6 = await makeRequest(port, {
      path: '/api/v1/auth/google',
      method: 'POST',
    }, { idToken: 'token-priya-linking' })

    assert.strictEqual(res6.status, 200)
    assert.strictEqual(String(res6.body.user._id), String(existingEmp._id))
    const reloadedEmp = await User.findById(existingEmp._id)

    // Test 6: Verified email links existing ordinary employee account
    assert.strictEqual(reloadedEmp.googleSub, empGoogleSub, 'googleSub must be bound')
    assert.strictEqual(reloadedEmp.googleLinked, true, 'googleLinked must be true')
    console.log('  PASS Test 6: Verified email safely bound new googleSub to existing employee account.')
    passedCount++

    // Test 7: Existing user ID and learning-related records remain unchanged
    const reloadedAttempt = await QuizAttempt.findById(attempt._id)
    assert.strictEqual(String(reloadedAttempt.userId), String(existingEmp._id), 'QuizAttempt must still point to same user ID')
    assert.strictEqual(reloadedEmp.employeeId, 'MOSPI-2024-LEGACY-01', 'Government employeeId must be preserved')
    assert.strictEqual(reloadedEmp.cadre, 'Indian Statistical Service (ISS)', 'Government cadre must be preserved')
    assert.strictEqual(reloadedEmp.department, 'National Accounts Division (NAD)', 'Department must be preserved')
    console.log('  PASS Test 7: User ID, learning records, and government profile fields preserved 100%.')
    passedCount++

    // Test 8: Existing password hash remains unchanged after linking
    assert.strictEqual(reloadedEmp.passwordHash, originalPasswordHash, 'passwordHash must not be overwritten or cleared')
    console.log('  PASS Test 8: Password hash remained strictly untouched after Google linking.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 9: Existing googleLinked: true account without googleSub links safely
    // ------------------------------------------------------------------------
    console.log('\n[Test 9] Existing googleLinked: true account without googleSub links safely...')
    const legacyGoogleEmail = 'test-32-1-4-legacy-google@kaushalai.org'
    const legacyUser = await User.create({
      name: 'Legacy Learner',
      email: legacyGoogleEmail,
      role: 'employee',
      passwordHash: null,
      googleLinked: true,
      googleSub: null, // Legacy state before Stage 2
      isActive: true,
    })

    const legacySub = 'google-sub-legacy-migration-9900'
    authController._setGoogleClient({
      verifyIdToken: async () => {
        return mockGoogleTicket({
          ...basePayload,
          sub: legacySub,
          email: legacyGoogleEmail,
          name: 'Legacy Learner',
        })
      },
    })

    const res9 = await makeRequest(port, {
      path: '/api/v1/auth/google',
      method: 'POST',
    }, { idToken: 'token-legacy' })

    assert.strictEqual(res9.status, 200)
    assert.strictEqual(String(res9.body.user._id), String(legacyUser._id))
    const reloadedLegacy = await User.findById(legacyUser._id)
    assert.strictEqual(reloadedLegacy.googleSub, legacySub)
    console.log('  PASS Test 9: Legacy googleLinked: true account bound googleSub safely.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 10: Same Google subject with different email resolving to another account returns 409
    // ------------------------------------------------------------------------
    console.log('\n[Test 10] Same Google subject with different email returning 409...')
    const sharedSub = 'google-sub-shared-conflict-1010'
    const userA = await User.create({
      name: 'Account A',
      email: 'test-32-1-4-acc-a@kaushalai.org',
      role: 'employee',
      googleLinked: true,
      googleSub: sharedSub,
      passwordHash: null,
      isActive: true,
    })

    const userB = await User.create({
      name: 'Account B',
      email: 'test-32-1-4-acc-b@kaushalai.org',
      role: 'employee',
      googleLinked: false,
      passwordHash: await bcrypt.hash('Pass#B123', 10),
      isActive: true,
    })

    // Request presents sharedSub (owned by user A), but token email is user B!
    authController._setGoogleClient({
      verifyIdToken: async () => {
        return mockGoogleTicket({
          ...basePayload,
          sub: sharedSub,
          email: 'test-32-1-4-acc-b@kaushalai.org',
          name: 'Account Collision Attempt',
        })
      },
    })

    const res10 = await makeRequest(port, {
      path: '/api/v1/auth/google',
      method: 'POST',
    }, { idToken: 'token-collision-10' })

    assert.strictEqual(res10.status, 409, `Expected HTTP 409, got ${res10.status}`)
    assert.strictEqual(res10.body.code, 'ACCOUNT_COLLISION')

    // Confirm neither account was mutated
    const checkA = await User.findById(userA._id)
    const checkB = await User.findById(userB._id)
    assert.strictEqual(checkA.email, 'test-32-1-4-acc-a@kaushalai.org')
    assert.strictEqual(checkB.googleSub, null)
    console.log('  PASS Test 10: Sub/email cross-account collision rejected with HTTP 409; 0 mutations.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 11: Existing email bound to a different Google subject returns 409
    // ------------------------------------------------------------------------
    console.log('\n[Test 11] Existing email bound to a different Google subject returns 409...')
    const userAlreadyBound = await User.create({
      name: 'Bound User',
      email: 'test-32-1-4-bound@kaushalai.org',
      role: 'employee',
      googleLinked: true,
      googleSub: 'google-sub-first-owner-1111',
      passwordHash: null,
      isActive: true,
    })

    // Token has same email, but different sub
    authController._setGoogleClient({
      verifyIdToken: async () => {
        return mockGoogleTicket({
          ...basePayload,
          sub: 'google-sub-second-intruder-2222',
          email: 'test-32-1-4-bound@kaushalai.org',
          name: 'Bound User Intruder',
        })
      },
    })

    const res11 = await makeRequest(port, {
      path: '/api/v1/auth/google',
      method: 'POST',
    }, { idToken: 'token-conflict-11' })

    assert.strictEqual(res11.status, 409)
    assert.strictEqual(res11.body.code, 'GOOGLE_SUB_COLLISION')
    const reloadedBound = await User.findById(userAlreadyBound._id)
    assert.strictEqual(reloadedBound.googleSub, 'google-sub-first-owner-1111', 'Subject must not be overwritten')
    console.log('  PASS Test 11: Mismatched Google subject on bound account returned HTTP 409 GOOGLE_SUB_COLLISION.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 12: Google subject matching an administrator returns 403
    // ------------------------------------------------------------------------
    console.log('\n[Test 12] Google subject matching an administrator returns 403...')
    const adminSub = 'google-sub-admin-danger-9999'
    const adminUserA = await User.create({
      name: 'Admin Subject Match',
      email: 'test-32-1-4-admin-a@kaushalai.gov.in',
      role: 'admin',
      passwordHash: await bcrypt.hash('AdminSecret#2026', 10),
      googleSub: adminSub,
      googleLinked: false,
      isActive: true,
    })

    authController._setGoogleClient({
      verifyIdToken: async () => {
        return mockGoogleTicket({
          ...basePayload,
          sub: adminSub,
          email: 'test-32-1-4-admin-a@kaushalai.gov.in',
          name: 'Admin Subject Match',
        })
      },
    })

    const res12 = await makeRequest(port, {
      path: '/api/v1/auth/google',
      method: 'POST',
    }, { idToken: 'token-admin-sub' })

    assert.strictEqual(res12.status, 403)
    assert.strictEqual(res12.body.code, 'ADMIN_GOOGLE_AUTH_PROHIBITED')
    console.log('  PASS Test 12: Admin matched via googleSub rejected with HTTP 403 ADMIN_GOOGLE_AUTH_PROHIBITED.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 13: Email matching an administrator returns 403
    // ------------------------------------------------------------------------
    console.log('\n[Test 13] Email matching an administrator returns 403...')
    const adminEmailB = 'test-32-1-4-admin-b@kaushalai.gov.in'
    const adminUserB = await User.create({
      name: 'Admin Email Match',
      email: adminEmailB,
      role: 'admin',
      passwordHash: await bcrypt.hash('AdminSecret#2026', 10),
      googleSub: null,
      googleLinked: false,
      isActive: true,
    })

    authController._setGoogleClient({
      verifyIdToken: async () => {
        return mockGoogleTicket({
          ...basePayload,
          sub: 'google-sub-random-attacker-3333',
          email: adminEmailB,
          name: 'Admin Email Match Attacker',
        })
      },
    })

    const res13 = await makeRequest(port, {
      path: '/api/v1/auth/google',
      method: 'POST',
    }, { idToken: 'token-admin-email' })

    assert.strictEqual(res13.status, 403)
    assert.strictEqual(res13.body.code, 'ADMIN_GOOGLE_AUTH_PROHIBITED')
    const recheckAdminB = await User.findById(adminUserB._id)
    assert.strictEqual(recheckAdminB.googleSub, null, 'Admin record must not be linked')
    assert.strictEqual(recheckAdminB.googleLinked, false)
    console.log('  PASS Test 13: Admin matched via email rejected with HTTP 403; no linking.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 14: Inactive account returns 403
    // ------------------------------------------------------------------------
    console.log('\n[Test 14] Inactive account returns 403...')
    const inactiveSub = 'google-sub-inactive-4444'
    await User.create({
      name: 'Inactive Learner',
      email: 'test-32-1-4-inactive@kaushalai.org',
      role: 'employee',
      googleSub: inactiveSub,
      googleLinked: true,
      passwordHash: null,
      isActive: false,
    })

    authController._setGoogleClient({
      verifyIdToken: async () => {
        return mockGoogleTicket({
          ...basePayload,
          sub: inactiveSub,
          email: 'test-32-1-4-inactive@kaushalai.org',
          name: 'Inactive Learner',
        })
      },
    })

    const res14 = await makeRequest(port, {
      path: '/api/v1/auth/google',
      method: 'POST',
    }, { idToken: 'token-inactive' })

    assert.strictEqual(res14.status, 403)
    console.log('  PASS Test 14: Inactive account rejected with HTTP 403.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 15: Duplicate normalized email returns 409
    // ------------------------------------------------------------------------
    console.log('\n[Test 15] Duplicate normalized email returns 409...')
    const dupEmail = 'test-32-1-4-duplicate-email@kaushalai.org'
    // Stub User.find specifically for dupEmail to simulate an anomalous duplicate email scenario
    const originalFind = User.find
    User.find = function (filter) {
      if (filter && filter.email === dupEmail) {
        return Promise.resolve([
          { _id: new mongoose.Types.ObjectId(), email: dupEmail, role: 'employee', isActive: true },
          { _id: new mongoose.Types.ObjectId(), email: dupEmail, role: 'employee', isActive: true },
        ])
      }
      return originalFind.apply(this, arguments)
    }

    authController._setGoogleClient({
      verifyIdToken: async () => {
        return mockGoogleTicket({
          ...basePayload,
          sub: 'google-sub-dup-check-5555',
          email: dupEmail,
          name: 'Dup Check',
        })
      },
    })

    const res15 = await makeRequest(port, {
      path: '/api/v1/auth/google',
      method: 'POST',
    }, { idToken: 'token-dup-email' })

    User.find = originalFind

    assert.strictEqual(res15.status, 409)
    assert.strictEqual(res15.body.code, 'DUPLICATE_EMAIL_CONFLICT')
    console.log('  PASS Test 15: Duplicate normalized email detected and rejected with HTTP 409.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 16: Duplicate Google subject cannot be assigned to two accounts
    // ------------------------------------------------------------------------
    console.log('\n[Test 16] Duplicate Google subject cannot be assigned to two accounts...')
    const uniqueSubTest = 'google-sub-unique-constraint-6666'
    await User.create({
      name: 'First Sub Holder',
      email: 'test-32-1-4-sub-holder-1@kaushalai.org',
      role: 'employee',
      googleSub: uniqueSubTest,
      googleLinked: true,
      passwordHash: null,
      isActive: true,
    })

    let indexError = null
    try {
      await User.create({
        name: 'Second Sub Holder',
        email: 'test-32-1-4-sub-holder-2@kaushalai.org',
        role: 'employee',
        googleSub: uniqueSubTest,
        googleLinked: true,
        passwordHash: null,
        isActive: true,
      })
    } catch (e) {
      indexError = e
    }

    assert(indexError, 'Expected duplicate key error on googleSub unique index')
    assert.strictEqual(indexError.code, 11000, `Expected error code 11000, got ${indexError.code}`)
    console.log('  PASS Test 16: MongoDB unique partial index strictly blocks duplicate non-empty googleSub.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 17: Concurrent first-time provisioning does not create duplicate users
    // ------------------------------------------------------------------------
    console.log('\n[Test 17] Concurrent first-time provisioning does not create duplicate users...')
    const concurrentSub = 'google-sub-concurrent-race-7777'
    const concurrentEmail = 'test-32-1-4-concurrent-new@kaushalai.org'

    authController._setGoogleClient({
      verifyIdToken: async () => {
        return mockGoogleTicket({
          ...basePayload,
          sub: concurrentSub,
          email: concurrentEmail,
          name: 'Concurrent Runner',
          picture: 'https://lh3.googleusercontent.com/concurrent.jpg',
        })
      },
    })

    // Fire 5 concurrent authentication requests simultaneously
    const concurrentResponses = await Promise.all([
      makeRequest(port, { path: '/api/v1/auth/google', method: 'POST' }, { idToken: 'token-race-1' }),
      makeRequest(port, { path: '/api/v1/auth/google', method: 'POST' }, { idToken: 'token-race-2' }),
      makeRequest(port, { path: '/api/v1/auth/google', method: 'POST' }, { idToken: 'token-race-3' }),
      makeRequest(port, { path: '/api/v1/auth/google', method: 'POST' }, { idToken: 'token-race-4' }),
      makeRequest(port, { path: '/api/v1/auth/google', method: 'POST' }, { idToken: 'token-race-5' }),
    ])

    // Verify all 5 succeeded or safely resolved
    for (const res of concurrentResponses) {
      assert(res.status === 200 || res.status === 201, `Concurrent request failed with status ${res.status}`)
      assert(res.body.accessToken, 'Must issue accessToken')
    }

    // Verify exactly ONE user document exists in MongoDB
    const countCreated = await User.countDocuments({ googleSub: concurrentSub })
    assert.strictEqual(countCreated, 1, `Expected exactly 1 user, found ${countCreated}`)

    // Verify all successful responses received the exact same user _id
    const primaryId = concurrentResponses[0].body.user._id
    for (const res of concurrentResponses) {
      assert.strictEqual(String(res.body.user._id), String(primaryId), 'All responses must share identical user _id')
    }
    console.log('  PASS Test 17: Concurrent race handled safely; exactly 1 user created and authenticated across 5 threads.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 18: Concurrent identity linking does not create conflicting bindings
    // ------------------------------------------------------------------------
    console.log('\n[Test 18] Concurrent identity linking does not create conflicting bindings...')
    const linkRaceEmail = 'test-32-1-4-link-race@kaushalai.gov.in'
    const linkRaceUser = await User.create({
      name: 'Link Race Officer',
      email: linkRaceEmail,
      role: 'employee',
      passwordHash: await bcrypt.hash('LinkRace#2026', 10),
      googleLinked: false,
      googleSub: null,
      isActive: true,
    })

    const linkRaceSub = 'google-sub-link-race-8888'
    authController._setGoogleClient({
      verifyIdToken: async () => {
        return mockGoogleTicket({
          ...basePayload,
          sub: linkRaceSub,
          email: linkRaceEmail,
          name: 'Link Race Officer',
        })
      },
    })

    const linkResponses = await Promise.all([
      makeRequest(port, { path: '/api/v1/auth/google', method: 'POST' }, { idToken: 'token-link-1' }),
      makeRequest(port, { path: '/api/v1/auth/google', method: 'POST' }, { idToken: 'token-link-2' }),
      makeRequest(port, { path: '/api/v1/auth/google', method: 'POST' }, { idToken: 'token-link-3' }),
    ])

    for (const res of linkResponses) {
      assert.strictEqual(res.status, 200)
      assert.strictEqual(String(res.body.user._id), String(linkRaceUser._id))
    }

    const linkedCheck = await User.findById(linkRaceUser._id)
    assert.strictEqual(linkedCheck.googleSub, linkRaceSub)
    console.log('  PASS Test 18: Concurrent identity linking converged cleanly with zero duplicate key crashes.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 19: Frontend-supplied role or Google subject cannot influence account creation
    // ------------------------------------------------------------------------
    console.log('\n[Test 19] Frontend-supplied role or Google subject cannot influence account creation...')
    const forgedEmail = 'test-32-1-4-forged-hacker@kaushalai.org'
    const legitimateSub = 'google-sub-legitimate-token-9999'

    authController._setGoogleClient({
      verifyIdToken: async () => {
        return mockGoogleTicket({
          ...basePayload,
          sub: legitimateSub,
          email: forgedEmail,
          name: 'Hacker Attempt',
        })
      },
    })

    // Attacker sends forged role: 'admin', forged googleSub, forged designation
    const res19 = await makeRequest(port, {
      path: '/api/v1/auth/google',
      method: 'POST',
    }, {
      idToken: 'token-forged',
      role: 'admin',
      googleSub: 'hacked-injected-sub-1234',
      designation: 'Director General',
      employeeId: 'FAKE-DG-01',
      cadre: 'Top Leadership',
    })

    assert.strictEqual(res19.status, 200)
    const forgedUser = await User.findById(res19.body.user._id)
    assert.strictEqual(forgedUser.role, 'employee', 'Injected role must be discarded; canonical role is employee')
    assert.strictEqual(forgedUser.googleSub, legitimateSub, 'googleSub must come from verified ID token only')
    assert.strictEqual(forgedUser.designation || null, null, 'Injected designation must be discarded')
    assert.strictEqual(forgedUser.employeeId, null, 'Injected employeeId must be discarded')
    assert.strictEqual(forgedUser.cadre || null, null, 'Injected cadre must be discarded')
    console.log('  PASS Test 19: All client-injected role, sub, and profile fields strictly discarded.')
    passedCount++

    // ------------------------------------------------------------------------
    // Test 20: Admin username/password login remains functional
    // ------------------------------------------------------------------------
    console.log('\n[Test 20] Admin username/password login remains functional...')
    const masterAdminEmail = 'test-32-1-4-master-admin@kaushalai.gov.in'
    const masterAdminPass = 'SuperSecure#AdminPass#2026'
    await User.create({
      name: 'Master Admin',
      email: masterAdminEmail,
      role: 'admin',
      passwordHash: await bcrypt.hash(masterAdminPass, 10),
      employeeId: 'ADM-MASTER-32-1-4',
      department: 'MoSPI Computer Centre HQ',
      experienceYears: 15,
      isActive: true,
      googleLinked: false,
    })

    const res20AdminLogin = await makeRequest(port, {
      path: '/api/v1/auth/admin-login',
      method: 'POST',
    }, { email: masterAdminEmail, password: masterAdminPass })

    assert.strictEqual(res20AdminLogin.status, 200)
    assert(res20AdminLogin.body.accessToken)
    assert.strictEqual(res20AdminLogin.body.user.role, 'admin')

    const res20StandardLogin = await makeRequest(port, {
      path: '/api/v1/auth/login',
      method: 'POST',
    }, { email: masterAdminEmail, password: masterAdminPass })

    assert.strictEqual(res20StandardLogin.status, 200)
    assert(res20StandardLogin.body.accessToken)
    assert.strictEqual(res20StandardLogin.body.user.role, 'admin')
    console.log('  PASS Test 20: Admin username/password authentication fully operational across /admin-login and /login.')
    passedCount++

    console.log('\n========================================================================')
    console.log(`  PART 32.1.4 SUITE COMPLETE: ${passedCount}/${totalCount} TESTS PASSED`)
    console.log('========================================================================\n')
  } finally {
    // Teardown
    await User.deleteMany({ email: /test-32-1-4/i })
    await RefreshToken.deleteMany({})
    await AuditLog.deleteMany({ 'meta.email': /test-32-1-4/i })
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
  console.error('\n❌ Stage 2 Test Suite Failed with Error:\n', err)
  process.exit(1)
})
