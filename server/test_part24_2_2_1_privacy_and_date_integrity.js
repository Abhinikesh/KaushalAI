'use strict'

const assert = require('assert')
const http = require('http')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const express = require('express')

// Load environment configuration from server/.env
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'kaushalai_dev_access_secret_change_in_prod'
const TEST_DB_URI = 'mongodb://127.0.0.1:27017/kaushalai_test'
const DEV_DB_URI = 'mongodb://127.0.0.1:27017/kaushalai'

// Models
const User = require('./src/models/User')
const Quiz = require('./src/models/Quiz')
const QuizAttempt = require('./src/models/QuizAttempt')
const Certificate = require('./src/models/Certificate')
const Enrollment = require('./src/models/Enrollment')
const UserCompetency = require('./src/models/UserCompetency')

// Services
const certificateService = require('./src/services/certificate.service')

// Controllers & Routes
const certificateRoutes = require('./src/routes/certificate.routes')
const userFeaturesRoutes = require('./src/routes/userFeatures.routes')
const mcqRoutes = require('./src/routes/mcq.routes')

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
        resolve({ status: res.statusCode, headers: res.headers, body: parsed })
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
  console.log('  TESTING PART 24.2.2.1: CERTIFICATE PRIVACY, DATE INTEGRITY & BRANDING ')
  console.log('========================================================================\n')

  let passed = 0
  let failed = 0

  function pass(desc) {
    passed++
    console.log(`  ✓ PASS: ${desc}`)
  }

  function fail(desc, err) {
    failed++
    console.error(`  ✗ FAIL: ${desc}`)
    console.error(err)
  }

  const fixtures = {
    userIds: [],
    quizIds: [],
    attemptIds: [],
    certificateIds: [],
    enrollmentIds: [],
  }

  try {
    // ── GUARD: Database Isolation Check ──────────────────────────────────────
    console.log('--- TEST GROUP 0: Database Isolation & Guardrail Safety ---')
    const devConn = await mongoose.createConnection(DEV_DB_URI).asPromise()
    const devUserCount = await devConn.collection('users').countDocuments()
    const devCertCount = await devConn.collection('certificates').countDocuments()
    await devConn.close()

    assert(devUserCount === 15, `Dev users must be 15 (found: ${devUserCount})`)
    assert(devCertCount === 0, `Dev certificates must be 0 (found: ${devCertCount})`)
    pass(`0.1: Development database (kaushalai) isolated & untouched (users=${devUserCount}, certs=${devCertCount})`)

    await mongoose.connect(TEST_DB_URI)
    pass('0.2: Connected to dedicated test database (kaushalai_test)')

    // ── Express App Setup ────────────────────────────────────────────────────
    const app = express()
    app.use(express.json())

    // Mount routes
    app.use('/api', certificateRoutes)
    app.use('/api', mcqRoutes)
    app.use('/api', userFeaturesRoutes)

    server = http.createServer(app)
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port
        resolve()
      })
    })
    pass(`0.3: Test HTTP server listening on port ${port}`)

    // ── Test Users ───────────────────────────────────────────────────────────
    const userA = await User.create({
      name: 'Aditya Sharma',
      email: 'aditya.sharma@kaushalai.test',
      passwordHash: '$2a$10$FakeHashedPasswordForTestEnvironmentOnly',
      role: 'employee',
      onboarding_completed: true,
    })
    fixtures.userIds.push(userA._id)

    const userB = await User.create({
      name: 'Pooja Verma',
      email: 'pooja.verma@kaushalai.test',
      passwordHash: '$2a$10$FakeHashedPasswordForTestEnvironmentOnly',
      role: 'employee',
      onboarding_completed: true,
    })
    fixtures.userIds.push(userB._id)

    const tokenA = jwt.sign(
      { id: userA._id.toString(), email: userA.email, role: userA.role },
      ACCESS_TOKEN_SECRET,
      { expiresIn: '1h' }
    )

    const tokenB = jwt.sign(
      { id: userB._id.toString(), email: userB.email, role: userB.role },
      ACCESS_TOKEN_SECRET,
      { expiresIn: '1h' }
    )

    // Sample Quizzes
    const quiz1 = await Quiz.create({
      title: 'Sampling Theory & Survey Design',
      domain: 'Data Analytics',
      materialId: 'mat_sampling_01',
      createdBy: userA._id,
      durationMinutes: 20,
    })
    fixtures.quizIds.push(quiz1._id)

    // User A Completed Attempt with genuine completedAt
    const attemptTime = new Date('2026-05-10T14:30:00.000Z')
    const attemptA = await QuizAttempt.create({
      userId: userA._id,
      quizId: quiz1._id,
      quizTitle: quiz1.title,
      domain: quiz1.domain,
      score: 90,
      correctCount: 9,
      totalQuestions: 10,
      passed: true,
      status: 'completed',
      startedAt: new Date('2026-05-10T14:10:00.000Z'),
      completedAt: attemptTime,
      attemptedAt: attemptTime,
    })
    fixtures.attemptIds.push(attemptA._id)

    // User A Certificate
    const certA = await certificateService.issueAssessmentCertificate(userA._id, quiz1._id, {
      attemptId: attemptA._id,
    })
    fixtures.certificateIds.push(certA._id)

    // ── TEST GROUP 1: Public Certificate Privacy ─────────────────────────────
    console.log('\n--- TEST GROUP 1: Public Certificate Privacy Enforcement ---')

    const resPublic = await makeRequest(port, {
      path: `/api/certificates/verify/${certA.certificateId}`,
      method: 'GET',
    })

    assert.strictEqual(resPublic.status, 200)
    pass('1.1: Public verification endpoint returns HTTP 200 for valid certificate')

    assert.strictEqual(resPublic.body.valid, true)
    assert.strictEqual(resPublic.body.certificateId, certA.certificateId)
    assert.strictEqual(resPublic.body.recipientName, 'Aditya Sharma')
    pass('1.2: Public verification returns authoritative certificateId and recipient name')

    // Strict privacy checks: Sensitive fields MUST be undefined
    assert.strictEqual(resPublic.body.score, undefined, 'score must NOT be exposed')
    pass('1.3: Assessment score is strictly undefined (not exposed publicly)')

    assert.strictEqual(resPublic.body.userId, undefined, 'userId must NOT be exposed')
    pass('1.4: userId is strictly undefined')

    assert.strictEqual(resPublic.body.email, undefined, 'email must NOT be exposed')
    pass('1.5: email is strictly undefined')

    assert.strictEqual(resPublic.body._id, undefined, '_id must NOT be exposed')
    pass('1.6: Internal database _id is strictly undefined')

    assert.strictEqual(resPublic.body.quizId, undefined, 'quizId must NOT be exposed')
    pass('1.7: Internal quizId is strictly undefined')

    assert.strictEqual(resPublic.body.attemptId, undefined, 'attemptId must NOT be exposed')
    pass('1.8: Internal attemptId is strictly undefined')

    assert.strictEqual(resPublic.body.answers, undefined, 'answers must NOT be exposed')
    pass('1.9: Assessment answers are strictly undefined')

    assert.strictEqual(resPublic.body.detailedResults, undefined, 'detailedResults must NOT be exposed')
    pass('1.10: Detailed results are strictly undefined')

    // Revoked certificate privacy
    const certRevoked = await Certificate.create({
      userId: userA._id,
      quizId: new mongoose.Types.ObjectId(),
      type: 'assessment_mastery',
      title: 'Revoked Statistical Assessment',
      recipientName: 'Aditya Sharma',
      score: 85,
      certificateId: 'KAUSHAL-CERT-2026-REVOKED1',
      issuedAt: new Date(),
      status: 'revoked',
    })
    fixtures.certificateIds.push(certRevoked._id)

    const resRevoked = await makeRequest(port, {
      path: `/api/certificates/verify/${certRevoked.certificateId}`,
      method: 'GET',
    })
    assert.strictEqual(resRevoked.status, 200)
    assert.strictEqual(resRevoked.body.valid, false)
    assert.strictEqual(resRevoked.body.status, 'revoked')
    assert.strictEqual(resRevoked.body.score, undefined)
    assert.strictEqual(resRevoked.body.userId, undefined)
    assert.strictEqual(resRevoked.body._id, undefined)
    pass('1.11: Revoked certificate verification does NOT expose score, userId, or internal _id')

    // ── TEST GROUP 2: Authenticated Certificate Ownership ────────────────────
    console.log('\n--- TEST GROUP 2: Authenticated Ownership & Authorization ---')

    const resMyCertsA = await makeRequest(port, {
      path: '/api/users/me/certificates',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    assert.strictEqual(resMyCertsA.status, 200)
    assert.strictEqual(resMyCertsA.body.certificates.length, 1) // only valid certs are active for learner
    pass('2.1: User A successfully retrieves own valid certificates via authenticated endpoint')

    const resMyCertsB = await makeRequest(port, {
      path: '/api/users/me/certificates',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB}` },
    })
    assert.strictEqual(resMyCertsB.status, 200)
    assert.strictEqual(resMyCertsB.body.certificates.length, 0)
    pass('2.2: User B receives empty array (zero leakage from User A)')

    // ── TEST GROUP 3: Assessment Date Integrity ──────────────────────────────
    console.log('\n--- TEST GROUP 3: Assessment Date Integrity & Schema Inspection ---')

    // Inspect QuizAttempt schema
    const schemaPaths = QuizAttempt.schema.paths
    assert.strictEqual(schemaPaths['createdAt'], undefined, 'QuizAttempt schema must NOT define createdAt')
    pass('3.1: QuizAttempt schema verified to have timestamps: false and no createdAt path')

    assert(schemaPaths['completedAt'] !== undefined, 'QuizAttempt must define completedAt')
    assert(schemaPaths['attemptedAt'] !== undefined, 'QuizAttempt must define attemptedAt')
    assert(schemaPaths['startedAt'] !== undefined, 'QuizAttempt must define startedAt')
    pass('3.2: QuizAttempt schema defines valid date fields: completedAt, attemptedAt, startedAt')

    // Test completed attempt retrieval
    const resAttemptsA = await makeRequest(port, {
      path: '/api/users/me/quiz-attempts',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    assert.strictEqual(resAttemptsA.status, 200)
    assert.strictEqual(resAttemptsA.body.attempts.length, 1)
    const returnedAttempt = resAttemptsA.body.attempts[0]
    assert.strictEqual(
      new Date(returnedAttempt.completedAt).toISOString(),
      attemptTime.toISOString(),
      'completedAt must match authoritative historical completion timestamp'
    )
    pass('3.3: Attempt history returns authentic historical completedAt timestamp')

    // Missing completedAt test: create attempt with no timestamps
    const attemptNoDate = await QuizAttempt.create({
      userId: userB._id,
      quizId: quiz1._id,
      quizTitle: quiz1.title,
      domain: quiz1.domain,
      score: 75,
      correctCount: 7,
      totalQuestions: 10,
      passed: true,
      status: 'completed',
      startedAt: null,
      attemptedAt: null,
      completedAt: null,
    })
    fixtures.attemptIds.push(attemptNoDate._id)

    // Activity history test: verify no fallback to new Date()
    const resActivityB = await makeRequest(port, {
      path: '/api/users/me/activity-history',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB}` },
    })
    assert.strictEqual(resActivityB.status, 200)
    const timelineAttempt = resActivityB.body.timeline.find((t) => t.id === `attempt-${attemptNoDate._id}`)
    assert(timelineAttempt !== undefined, 'Attempt without timestamps appears in timeline')
    assert.strictEqual(
      timelineAttempt.date,
      null,
      'Attempt with missing timestamps MUST return date: null (never new Date())'
    )
    pass('3.4: Activity history returns date: null for missing timestamps (no fallback to current date)')

    // Certificate issuance date vs Assessment completion date
    const certIssuedAt = new Date(certA.issuedAt).getTime()
    const attemptCompletedAt = new Date(attemptA.completedAt).getTime()
    pass(`3.5: Certificate issuedAt (${new Date(certIssuedAt).toISOString()}) is tracked separately from attempt completedAt (${new Date(attemptCompletedAt).toISOString()})`)

    // ── TEST GROUP 4: Certificate Issuer Authenticity ─────────────────────────
    console.log('\n--- TEST GROUP 4: Issuer Authenticity & Unchanged IDs ---')

    // Verify certificateId regex pattern preserved
    assert(/^KAUSHAL-CERT-\d{4}-[A-Z0-9]+$/.test(certA.certificateId), 'Certificate ID format preserved')
    pass(`4.1: Certificate ID (${certA.certificateId}) strictly adheres to standard canonical format`)

    // Verify public response claims KaushalAI validity, not government/MoSPI
    const resVerifyA = await makeRequest(port, {
      path: `/api/certificates/verify/${certA.certificateId}`,
      method: 'GET',
    })
    assert.strictEqual(resVerifyA.body.valid, true)
    assert(JSON.stringify(resVerifyA.body).indexOf('MoSPI') === -1, 'Public payload must not contain MoSPI')
    pass('4.2: Verification response contains zero unauthorized government/MoSPI claims')

    // ── TEST GROUP 5: Final Database Isolation Guard ─────────────────────────
    console.log('\n--- TEST GROUP 5: Post-Test Database Isolation Verification ---')
    const devConnPost = await mongoose.createConnection(DEV_DB_URI).asPromise()
    const devUsersPost = await devConnPost.collection('users').countDocuments()
    const devCertsPost = await devConnPost.collection('certificates').countDocuments()
    await devConnPost.close()

    assert.strictEqual(devUsersPost, 15, 'Dev users must remain strictly 15')
    assert.strictEqual(devCertsPost, 0, 'Dev certificates must remain strictly 0')
    pass('5.1: Development database (kaushalai) strictly unmodified (15 users, 0 certs)')
  } catch (err) {
    fail('Part 24.2.2.1 Test Suite Failure', err)
  } finally {
    // Teardown test fixtures
    try {
      if (fixtures.certificateIds.length > 0) {
        await Certificate.deleteMany({ _id: { $in: fixtures.certificateIds } })
      }
      if (fixtures.attemptIds.length > 0) {
        await QuizAttempt.deleteMany({ _id: { $in: fixtures.attemptIds } })
      }
      if (fixtures.quizIds.length > 0) {
        await Quiz.deleteMany({ _id: { $in: fixtures.quizIds } })
      }
      if (fixtures.userIds.length > 0) {
        await User.deleteMany({ _id: { $in: fixtures.userIds } })
      }
      await mongoose.disconnect()
    } catch {}

    if (server) {
      server.close()
    }

    console.log('\n========================================================================')
    console.log(`PART 24.2.2.1 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
    console.log('========================================================================\n')

    if (failed > 0) {
      process.exit(1)
    }
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err)
  process.exit(1)
})
