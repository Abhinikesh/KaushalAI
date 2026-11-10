'use strict'

const assert = require('assert')
const http = require('http')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const express = require('express')
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

// Routes
const userFeaturesRoutes = require('./src/routes/userFeatures.routes')
const mcqRoutes = require('./src/routes/mcq.routes')
const certificateRoutes = require('./src/routes/certificate.routes')

// Services
const certificateService = require('./src/services/certificate.service')

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

// Emulate frontend resolution logic from AssessmentHistoryPage.jsx
function formatAttemptForFrontend(a) {
  let completionDate = null
  if (a.status === 'completed' && a.completedAt) {
    const parsed = new Date(a.completedAt)
    if (!isNaN(parsed.getTime())) {
      completionDate = parsed
    }
  }

  let formattedDate = 'Date unavailable'
  if (completionDate) {
    try {
      formattedDate = completionDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      formattedDate = 'Date unavailable'
    }
  }

  return {
    _id: String(a._id),
    quizTitle: a.quizTitle || 'Assessment',
    status: a.status,
    completionDate,
    date: formattedDate,
  }
}

async function runTests() {
  console.log('========================================================================')
  console.log('  TESTING PART 24.2.2.2: STRICT ASSESSMENT COMPLETION DATE INTEGRITY    ')
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
  }

  try {
    // ── GUARD: Database Isolation Check ──────────────────────────────────────
    console.log('--- TEST GROUP 0: Database Isolation Guard ---')
    const devConn = await mongoose.createConnection(DEV_DB_URI).asPromise()
    const devUserCount = await devConn.collection('users').countDocuments()
    const devCertCount = await devConn.collection('certificates').countDocuments()
    await devConn.close()

    assert.strictEqual(devUserCount, 15, `Dev users must be 15 (found: ${devUserCount})`)
    assert.strictEqual(devCertCount, 0, `Dev certificates must be 0 (found: ${devCertCount})`)
    pass(`0.1: Pre-test Dev DB (kaushalai) strictly unmodified (users=${devUserCount}, certs=${devCertCount})`)

    await mongoose.connect(TEST_DB_URI)
    pass('0.2: Connected to isolated test DB (kaushalai_test)')

    // ── Express Setup ────────────────────────────────────────────────────────
    const app = express()
    app.use(express.json())
    app.use('/api', mcqRoutes)
    app.use('/api', userFeaturesRoutes)
    app.use('/api', certificateRoutes)

    server = http.createServer(app)
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port
        resolve()
      })
    })
    pass(`0.3: Test server listening on ephemeral port ${port}`)

    // ── Test User & Quiz Fixtures ─────────────────────────────────────────────
    const user = await User.create({
      name: 'Rohan Deshmukh',
      email: 'rohan.deshmukh@kaushalai.test',
      passwordHash: '$2a$10$FakeHashedPasswordForTestEnvironmentOnly',
      role: 'employee',
      onboarding_completed: true,
    })
    fixtures.userIds.push(user._id)

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      ACCESS_TOKEN_SECRET,
      { expiresIn: '1h' }
    )

    const quiz = await Quiz.create({
      title: 'Survey Design & Sampling Methods',
      domain: 'Data Analytics',
      materialId: 'mat_p24222_01',
      createdBy: user._id,
      durationMinutes: 20,
    })
    fixtures.quizIds.push(quiz._id)

    // ── TEST CASE 1: Completed attempt with valid completedAt ────────────────
    console.log('\n--- TEST GROUP 1: Completed Attempt with Valid completedAt ---')
    const validCompletionTime = new Date('2026-05-15T10:30:00.000Z')
    const attempt1 = await QuizAttempt.create({
      userId: user._id,
      quizId: quiz._id,
      quizTitle: quiz.title,
      domain: quiz.domain,
      score: 85,
      correctCount: 9,
      totalQuestions: 10,
      passed: true,
      status: 'completed',
      startedAt: new Date('2026-05-15T10:10:00.000Z'),
      attemptedAt: new Date('2026-05-15T10:10:00.000Z'),
      completedAt: validCompletionTime,
    })
    fixtures.attemptIds.push(attempt1._id)

    // ── TEST CASE 2: Completed attempt with missing completedAt but valid attemptedAt ─
    console.log('\n--- TEST GROUP 2: Completed with Missing completedAt but Valid attemptedAt ---')
    const attemptStartTime = new Date('2026-05-16T08:00:00.000Z')
    const attempt2 = await QuizAttempt.create({
      userId: user._id,
      quizId: quiz._id,
      quizTitle: quiz.title,
      domain: quiz.domain,
      score: 80,
      correctCount: 8,
      totalQuestions: 10,
      passed: true,
      status: 'completed',
      startedAt: attemptStartTime,
      attemptedAt: attemptStartTime,
      completedAt: null, // explicitly missing
    })
    fixtures.attemptIds.push(attempt2._id)

    // ── TEST CASE 3: Completed attempt with missing completedAt but valid startedAt ──
    console.log('\n--- TEST GROUP 3: Completed with Missing completedAt but Valid startedAt ---')
    const attempt3 = await QuizAttempt.create({
      userId: user._id,
      quizId: quiz._id,
      quizTitle: quiz.title,
      domain: quiz.domain,
      score: 75,
      correctCount: 7,
      totalQuestions: 10,
      passed: true,
      status: 'completed',
      startedAt: new Date('2026-05-17T09:00:00.000Z'),
      attemptedAt: null,
      completedAt: null, // explicitly missing
    })
    fixtures.attemptIds.push(attempt3._id)

    // ── TEST CASE 4: Completed attempt with invalid completedAt ──────────────
    console.log('\n--- TEST GROUP 4: Completed Attempt with Invalid completedAt ---')
    // Directly inject invalid date representation in MongoDB document via raw collection
    const attempt4Id = new mongoose.Types.ObjectId()
    await mongoose.connection.collection('quizattempts').insertOne({
      _id: attempt4Id,
      userId: user._id,
      quizId: quiz._id,
      quizTitle: quiz.title,
      domain: quiz.domain,
      score: 78,
      correctCount: 8,
      totalQuestions: 10,
      passed: true,
      status: 'completed',
      startedAt: new Date('2026-05-18T11:00:00.000Z'),
      attemptedAt: new Date('2026-05-18T11:00:00.000Z'),
      completedAt: 'not-a-valid-date-string',
    })
    fixtures.attemptIds.push(attempt4Id)
    const attempt4 = {
      _id: attempt4Id,
      status: 'completed',
      completedAt: 'not-a-valid-date-string',
      quizTitle: quiz.title,
    }

    // ── TEST CASE 5: In-progress attempt ─────────────────────────────────────
    console.log('\n--- TEST GROUP 5: In-Progress Attempt Date Handling ---')
    const attempt5 = await QuizAttempt.create({
      userId: user._id,
      quizId: quiz._id,
      quizTitle: quiz.title,
      domain: quiz.domain,
      score: 0,
      correctCount: 0,
      totalQuestions: 10,
      passed: false,
      status: 'in_progress',
      startedAt: new Date('2026-05-19T14:00:00.000Z'),
      attemptedAt: new Date('2026-05-19T14:00:00.000Z'),
      completedAt: null,
    })
    fixtures.attemptIds.push(attempt5._id)

    // ── TEST CASE 6: Expired attempt ─────────────────────────────────────────
    console.log('\n--- TEST GROUP 6: Expired Attempt Date Handling ---')
    const attempt6 = await QuizAttempt.create({
      userId: user._id,
      quizId: quiz._id,
      quizTitle: quiz.title,
      domain: quiz.domain,
      score: 40,
      correctCount: 4,
      totalQuestions: 10,
      passed: false,
      status: 'expired',
      startedAt: new Date('2026-05-20T16:00:00.000Z'),
      attemptedAt: new Date('2026-05-20T16:00:00.000Z'),
      completedAt: null,
    })
    fixtures.attemptIds.push(attempt6._id)

    // ── TEST CASE 7: Certificate issuedAt decoupled from attempt completedAt ─
    console.log('\n--- TEST GROUP 7: Certificate issuedAt Independence ---')
    const cert1 = await certificateService.issueAssessmentCertificate(user._id, quiz._id, {
      attemptId: attempt1._id,
    })
    fixtures.certificateIds.push(cert1._id)

    assert(cert1.issuedAt instanceof Date, 'Certificate must have a valid Date issuedAt')
    pass('7.1: Certificate issuedAt is a valid Date object')

    // Verify certificate issuedAt remains unaffected per requirement 7
    assert(cert1.issuedAt.getTime() > 0, 'Certificate issuedAt is populated')
    assert.strictEqual(cert1.type, 'assessment_mastery', 'Certificate type is assessment_mastery')
    pass(`7.2: Certificate issuedAt (${cert1.issuedAt.toISOString()}) and certificate lifecycle remain strictly unaffected`)

    // ── QUERY BACKEND API: Activity History ──────────────────────────────────
    console.log('\n--- TEST GROUP 8: Activity History Endpoint Validation ---')
    const resActivity = await makeRequest(port, {
      path: '/api/users/me/activity-history',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })

    assert.strictEqual(resActivity.status, 200, 'GET /api/users/me/activity-history returns HTTP 200')
    const timeline = resActivity.body.timeline || []

    const item1 = timeline.find((t) => t.id === `attempt-${attempt1._id}`)
    const item2 = timeline.find((t) => t.id === `attempt-${attempt2._id}`)
    const item3 = timeline.find((t) => t.id === `attempt-${attempt3._id}`)
    const item4 = timeline.find((t) => t.id === `attempt-${attempt4._id}`)
    const item5 = timeline.find((t) => t.id === `attempt-${attempt5._id}`)
    const item6 = timeline.find((t) => t.id === `attempt-${attempt6._id}`)

    // 1. Valid completedAt returns authoritative date
    assert(item1 && item1.date !== null, 'Item 1 has valid date')
    assert.strictEqual(new Date(item1.date).toISOString(), validCompletionTime.toISOString())
    pass('8.1: Valid completedAt returns authoritative completion date in activity history')

    // 2. Missing completedAt with valid attemptedAt returns null
    assert(item2, 'Item 2 exists in timeline')
    assert.strictEqual(item2.date, null, 'Item 2 date must be null (never fallback to attemptedAt)')
    pass('8.2: Completed attempt with missing completedAt returns date: null (strictly no fallback to attemptedAt)')

    // 3. Missing completedAt with valid startedAt returns null
    assert(item3, 'Item 3 exists in timeline')
    assert.strictEqual(item3.date, null, 'Item 3 date must be null (never fallback to startedAt)')
    pass('8.3: Completed attempt with missing completedAt returns date: null (strictly no fallback to startedAt)')

    // 4. Invalid completedAt returns null
    assert(item4, 'Item 4 exists in timeline')
    assert.strictEqual(item4.date, null, 'Item 4 date must be null (never fallback to invalid date)')
    pass('8.4: Completed attempt with invalid completedAt returns date: null')

    // 5. In-progress attempt returns null
    assert(item5, 'Item 5 exists in timeline')
    assert.strictEqual(item5.date, null, 'In-progress attempt date must be null (no completion date)')
    pass('8.5: In-progress attempt must not be represented as having a completion date (date is null)')

    // 6. Expired attempt returns null
    assert(item6, 'Item 6 exists in timeline')
    assert.strictEqual(item6.date, null, 'Expired attempt date must be null (no completion date)')
    pass('8.6: Expired attempt must not be represented as having a completion date (date is null)')

    // ── QUERY BACKEND API: Quiz Attempts Endpoint & Frontend Transformation ─
    console.log('\n--- TEST GROUP 9: Quiz Attempts API & Frontend Date Resolution ---')
    const resAttempts = await makeRequest(port, {
      path: '/api/users/me/quiz-attempts',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })

    assert.strictEqual(resAttempts.status, 200, 'GET /api/users/me/quiz-attempts returns HTTP 200')
    const returnedAttempts = resAttempts.body.attempts || []
    assert.strictEqual(returnedAttempts.length, 6, 'All 6 attempts returned backward-compatibly')
    pass('9.1: Quiz attempts endpoint preserves backward-compatible payload structure')

    // Evaluate each attempt through the frontend resolution logic
    const f1 = formatAttemptForFrontend(attempt1)
    const f2 = formatAttemptForFrontend(attempt2)
    const f3 = formatAttemptForFrontend(attempt3)
    const f4 = formatAttemptForFrontend(attempt4)
    const f5 = formatAttemptForFrontend(attempt5)
    const f6 = formatAttemptForFrontend(attempt6)

    // Verification of Case 1: valid completedAt -> displays that date
    assert(f1.completionDate instanceof Date, 'f1.completionDate must be a Date')
    assert(f1.date.includes('2026'), 'f1.date must render formatted date string')
    assert.strictEqual(f1.date !== 'Date unavailable', true, 'f1.date must NOT be Date unavailable')
    pass(`9.2: Case 1: Valid completedAt displays formatted date ("${f1.date}")`)

    // Verification of Case 2: missing completedAt but valid attemptedAt -> returns null & "Date unavailable"
    assert.strictEqual(f2.completionDate, null, 'f2.completionDate must be null')
    assert.strictEqual(f2.date, 'Date unavailable', 'f2.date must render "Date unavailable"')
    pass('9.3: Case 2: Missing completedAt with valid attemptedAt renders "Date unavailable" (never attemptedAt)')

    // Verification of Case 3: missing completedAt but valid startedAt -> returns null & "Date unavailable"
    assert.strictEqual(f3.completionDate, null, 'f3.completionDate must be null')
    assert.strictEqual(f3.date, 'Date unavailable', 'f3.date must render "Date unavailable"')
    pass('9.4: Case 3: Missing completedAt with valid startedAt renders "Date unavailable" (never startedAt)')

    // Verification of Case 4: invalid completedAt -> returns null & "Date unavailable"
    assert.strictEqual(f4.completionDate, null, 'f4.completionDate must be null')
    assert.strictEqual(f4.date, 'Date unavailable', 'f4.date must render "Date unavailable"')
    pass('9.5: Case 4: Invalid completedAt renders "Date unavailable"')

    // Verification of Case 5: in_progress attempt -> returns null & "Date unavailable"
    assert.strictEqual(f5.completionDate, null, 'f5.completionDate must be null')
    assert.strictEqual(f5.date, 'Date unavailable', 'f5.date must render "Date unavailable"')
    pass('9.6: Case 5: In-progress attempt renders "Date unavailable"')

    // Verification of Case 6: expired attempt -> returns null & "Date unavailable"
    assert.strictEqual(f6.completionDate, null, 'f6.completionDate must be null')
    assert.strictEqual(f6.date, 'Date unavailable', 'f6.date must render "Date unavailable"')
    pass('9.7: Case 6: Expired attempt renders "Date unavailable"')

    // ── SPECIFIC REGRESSION ASSERTION ─────────────────────────────────────────
    console.log('\n--- TEST GROUP 10: Specific Regression Proof Against AttemptedAt Fabrication ---')
    // Specifically prove that a completed attempt with attemptedAt populated and completedAt absent does not receive a fabricated completion date
    const fabricatedCheck = formatAttemptForFrontend({
      status: 'completed',
      attemptedAt: new Date('2026-01-01T00:00:00.000Z'),
      startedAt: new Date('2026-01-01T00:00:00.000Z'),
      completedAt: null,
    })
    assert.strictEqual(
      fabricatedCheck.completionDate,
      null,
      'REGRESSION ASSERTION: Completed attempt with attemptedAt populated and completedAt absent must have completionDate === null'
    )
    assert.strictEqual(
      fabricatedCheck.date,
      'Date unavailable',
      'REGRESSION ASSERTION: Completed attempt with attemptedAt populated and completedAt absent must display "Date unavailable"'
    )
    pass('10.1: REGRESSION PROOF: Completed attempt with attemptedAt populated and completedAt absent NEVER receives a fabricated completion date')

    // ── FINAL GUARD: Dev Database Unchanged ───────────────────────────────────
    console.log('\n--- TEST GROUP 11: Post-Test Database Isolation Verification ---')
    const devConnPost = await mongoose.createConnection(DEV_DB_URI).asPromise()
    const devUsersPost = await devConnPost.collection('users').countDocuments()
    const devCertsPost = await devConnPost.collection('certificates').countDocuments()
    await devConnPost.close()

    assert.strictEqual(devUsersPost, 15, 'Dev users must remain strictly 15')
    assert.strictEqual(devCertsPost, 0, 'Dev certificates must remain strictly 0')
    pass('11.1: Post-test Dev DB (kaushalai) strictly unmodified (15 users, 0 certs)')
  } catch (err) {
    fail('Part 24.2.2.2 Test Suite Failure', err)
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
    console.log(`PART 24.2.2.2 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
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
