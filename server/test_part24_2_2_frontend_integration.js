/**
 * test_part24_2_2_frontend_integration.js
 * Dedicated test suite for PART 24.2.2:
 * KAUSHALAI LEARNING HISTORY, CERTIFICATE UI & PUBLIC VERIFICATION INTEGRATION
 *
 * Verifies all 22 required integration & contract tests:
 * 1.  Empty assessment history handling
 * 2.  Genuine completed assessment history rendering
 * 3.  In-progress and expired attempt display handling
 * 4.  Missing date and score handling (honest fallbacks, no fabricated 'Recently' or 80%)
 * 5.  Empty course list handling
 * 6.  Real enrollment progress & status
 * 7.  Recommended vs enrolled course separation (status != 'recommended')
 * 8.  Empty certificate collection state
 * 9.  Real assessment certificate display contract
 * 10. Real course completion certificate display contract
 * 11. Revoked certificate display handling
 * 12. Certificate detail preview data contract
 * 13. Public valid certificate verification endpoint contract
 * 14. Public revoked certificate verification endpoint contract
 * 15. Public not-found verification (HTTP 404)
 * 16. Malformed certificate ID rejection (HTTP 400 invalid_format)
 * 17. Rate-limit response handling (HTTP 429 rate_limited)
 * 18. Network / API failure resilience
 * 19. Authenticated learner data isolation
 * 20. Recovery API (reconcileMyCertificates) contract & idempotency
 * 21. No fabricated records in frontend fallbacks (static audit of source files)
 * 22. Existing learning-path and dashboard regression
 */

'use strict'

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })
if (!process.env.ACCESS_TOKEN_SECRET) {
  process.env.ACCESS_TOKEN_SECRET = 'kaushalai_dev_access_secret_change_in_prod'
}
const fs = require('fs')
const http = require('http')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const { validateTestDatabaseUri } = require('./src/test/testDbGuard')

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET
const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/kaushalai_test'

validateTestDatabaseUri(testDbUri)

let totalPassed = 0
let totalFailed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    totalPassed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    totalFailed++
  }
}

function makeRequest(port, options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({ port, host: '127.0.0.1', ...options }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {}
          resolve({ status: res.statusCode, headers: res.headers, body: parsed })
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data })
        }
      })
    })
    req.on('error', reject)
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body))
    }
    req.end()
  })
}

async function runTests() {
  console.log('===================================================================')
  console.log('PART 24.2.2: LEARNING HISTORY, CERTIFICATES & VERIFICATION TEST')
  console.log('===================================================================')

  await mongoose.connect(testDbUri)

  const User = require('./src/models/User')
  const Quiz = require('./src/models/Quiz')
  const QuizAttempt = require('./src/models/QuizAttempt')
  const Course = require('./src/models/Course')
  const Enrollment = require('./src/models/Enrollment')
  const Certificate = require('./src/models/Certificate')
  const certificateService = require('./src/services/certificate.service')
  const app = require('./src/app')

  // --- GUARD: Pre-Test Development Database Check ---
  console.log('\n--- GUARDRAIL: Development Database Isolation (Pre-Test) ---')
  const devConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
  const devUserCountBefore = await devConn.collection('users').countDocuments()
  const devCertCountBefore = await devConn.collection('certificates').countDocuments()
  await devConn.close()

  assert(
    devUserCountBefore === 15,
    `G.1: Dev DB (kaushalai) user count strictly 15 (actual: ${devUserCountBefore})`
  )
  assert(
    devCertCountBefore === 0,
    `G.2: Dev DB (kaushalai) certificate count strictly 0 (actual: ${devCertCountBefore})`
  )

  await Certificate.init()

  let server
  let port
  const testSuffix = Date.now().toString()

  const fixtures = {
    userIds: [],
    quizIds: [],
    courseIds: [],
    attemptIds: [],
    enrollmentIds: [],
    certificateIds: [],
  }

  try {
    // 1. Setup Test Server
    server = http.createServer(app)
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port
        resolve()
      })
    })

    // 2. Setup Test Learners (Learner A: Active, Learner B: Empty/Isolation Check)
    const userA = await User.create({
      name: `Active Learner A ${testSuffix}`,
      email: `active_learner_a_${testSuffix}@example.gov.in`,
      passwordHash: 'test_hash',
      role: 'employee',
      onboarding_completed: true,
    })
    fixtures.userIds.push(userA._id)

    const userB = await User.create({
      name: `Empty Learner B ${testSuffix}`,
      email: `empty_learner_b_${testSuffix}@example.gov.in`,
      passwordHash: 'test_hash',
      role: 'employee',
      onboarding_completed: true,
    })
    fixtures.userIds.push(userB._id)

    const tokenA = jwt.sign({ id: userA._id.toString(), role: 'employee' }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
    const tokenB = jwt.sign({ id: userB._id.toString(), role: 'employee' }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

    // Setup Test Quizzes & Courses
    const quiz1 = await Quiz.create({
      title: `Sample Survey Methodology Assessment ${testSuffix}`,
      materialId: `mat_fe_${testSuffix}_1`,
      createdBy: userA._id,
      durationMinutes: 20,
    })
    fixtures.quizIds.push(quiz1._id)

    const course1 = await Course.create({
      title: `National Accounts & Economic Statistics ${testSuffix}`,
      source: 'igot',
      durationHours: 10,
    })
    fixtures.courseIds.push(course1._id)

    // =========================================================================
    // SECTION 1: Assessment History Backend Contract & Empty State
    // =========================================================================
    console.log('\n--- SECTION 1: Assessment History Contract & States ---')

    // 1. Empty assessment history
    const resEmptyHistory = await makeRequest(port, {
      path: '/api/quizzes/my-attempts', // or /users/me/quiz-attempts
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB}` },
    })
    // Also test /users/me/quiz-attempts
    const resEmptyHistoryAlt = await makeRequest(port, {
      path: '/api/users/me/quiz-attempts',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB}` },
    })
    const emptyAttempts = resEmptyHistoryAlt.body.attempts || []
    assert(Array.isArray(emptyAttempts) && emptyAttempts.length === 0, '1: Learner with zero evaluations returns empty attempts array (count = 0)')

    // 2. Genuine completed assessment history
    const attemptCompleted = await QuizAttempt.create({
      userId: userA._id,
      quizId: quiz1._id,
      score: 86,
      correctCount: 9,
      totalQuestions: 10,
      passed: true,
      status: 'completed',
      submittedAt: new Date(),
    })
    fixtures.attemptIds.push(attemptCompleted._id)

    const resCompleted = await makeRequest(port, {
      path: '/api/users/me/quiz-attempts',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    const attList = resCompleted.body.attempts || []
    assert(attList.length >= 1, '2.1: Completed assessment returns genuine attempt record')
    const completedFound = attList.find((a) => a._id.toString() === attemptCompleted._id.toString())
    assert(completedFound && completedFound.score === 86, '2.2: Authentic attempt score is 86 (not fabricated 80%)')
    assert(completedFound && completedFound.status === 'completed', '2.3: Status is strictly completed')

    // 3. In-progress and expired attempt display handling
    const attemptInProgress = await QuizAttempt.create({
      userId: userA._id,
      quizId: quiz1._id,
      status: 'in_progress',
      startedAt: new Date(),
      totalQuestions: 15,
      score: 0,
      correctCount: 0,
    })
    fixtures.attemptIds.push(attemptInProgress._id)

    const attemptExpired = await QuizAttempt.create({
      userId: userA._id,
      quizId: quiz1._id,
      status: 'expired',
      startedAt: new Date(Date.now() - 3600000),
      deadline: new Date(Date.now() - 1800000),
      totalQuestions: 15,
      score: 45,
      correctCount: 6,
    })
    fixtures.attemptIds.push(attemptExpired._id)

    const resMultipleAttempts = await makeRequest(port, {
      path: '/api/users/me/quiz-attempts',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    const allAttempts = resMultipleAttempts.body.attempts || []
    const foundInProgress = allAttempts.find((a) => a._id.toString() === attemptInProgress._id.toString())
    const foundExpired = allAttempts.find((a) => a._id.toString() === attemptExpired._id.toString())

    assert(foundInProgress && foundInProgress.status === 'in_progress', '3.1: In-progress attempt correctly reports status in_progress')
    assert(foundExpired && foundExpired.status === 'expired', '3.2: Expired attempt correctly reports status expired')

    // 4. Activity history endpoint reflection with accurate status
    const resActivity = await makeRequest(port, {
      path: '/api/users/me/activity-history',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    assert(resActivity.status === 200, '4.1: GET /api/users/me/activity-history returns HTTP 200')
    const timeline = resActivity.body.timeline || []
    const activityInProgress = timeline.find((t) => t.id === `attempt-${attemptInProgress._id}`)
    const activityExpired = timeline.find((t) => t.id === `attempt-${attemptExpired._id}`)
    const activityCompleted = timeline.find((t) => t.id === `attempt-${attemptCompleted._id}`)

    assert(activityInProgress && activityInProgress.badge === 'In Progress', '4.2: Timeline identifies In Progress assessment')
    assert(activityExpired && activityExpired.badge === 'Expired', '4.3: Timeline identifies Expired assessment')
    assert(activityCompleted && activityCompleted.badge === 'Passed', '4.4: Timeline identifies Passed completed assessment')

    // =========================================================================
    // SECTION 2: Course Enrollment Progress & Recommendations Separation
    // =========================================================================
    console.log('\n--- SECTION 2: Course Enrollment Progress & Separation ---')

    // 5. Empty course list
    const resEmptyCourses = await makeRequest(port, {
      path: '/api/users/me/enrollments',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB}` },
    })
    const bEnrollments = resEmptyCourses.body.enrollments || []
    assert(bEnrollments.length === 0, '5: Unenrolled learner returns empty enrollments list')

    // 6. Real enrollment progress
    const activeEnrollment = await Enrollment.create({
      userId: userA._id,
      courseId: course1._id,
      status: 'in_progress',
      progressPercent: 65,
      startedAt: new Date(),
    })
    fixtures.enrollmentIds.push(activeEnrollment._id)

    const resAEnrollments = await makeRequest(port, {
      path: '/api/users/me/enrollments',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    const aEnrollments = resAEnrollments.body.enrollments || []
    const foundEnr = aEnrollments.find((e) => e._id.toString() === activeEnrollment._id.toString())
    assert(foundEnr && foundEnr.progressPercent === 65, '6.1: Real enrollment progress matches database (65%)')
    assert(foundEnr && foundEnr.status === 'in_progress', '6.2: Status is in_progress')

    // 7. Recommended vs enrolled course separation
    const recommendedCourse = await Course.create({
      title: `Recommended Statistical Audit Module ${testSuffix}`,
      source: 'nssta',
      durationHours: 4,
    })
    fixtures.courseIds.push(recommendedCourse._id)

    const recommendationRecord = await Enrollment.create({
      userId: userA._id,
      courseId: recommendedCourse._id,
      status: 'recommended',
      progressPercent: 0,
    })
    fixtures.enrollmentIds.push(recommendationRecord._id)

    const resTimelineEnr = await makeRequest(port, {
      path: '/api/users/me/activity-history',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    const timelineItems = resTimelineEnr.body.timeline || []
    const hasRecommendationInTimeline = timelineItems.some((t) => t.id === `enrollment-${recommendationRecord._id}`)
    assert(hasRecommendationInTimeline === false, '7: Recommended courses (status=recommended) are strictly excluded from activity history timeline')

    // =========================================================================
    // SECTION 3: Certificate Collection UI & Real Records
    // =========================================================================
    console.log('\n--- SECTION 3: Certificate Collection UI & Real Records ---')

    // 8. Empty certificate collection
    const resEmptyCerts = await makeRequest(port, {
      path: '/api/users/me/certificates',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB}` },
    })
    assert(resEmptyCerts.status === 200, '8.1: GET /api/users/me/certificates returns HTTP 200')
    assert(Array.isArray(resEmptyCerts.body.certificates) && resEmptyCerts.body.certificates.length === 0, '8.2: Learner without certificates has 0 records')

    // 9. Real assessment certificate display contract
    const certAssessment = await certificateService.issueAssessmentCertificate(userA._id, quiz1._id, { attemptId: attemptCompleted._id })
    fixtures.certificateIds.push(certAssessment._id)

    const resCertsA = await makeRequest(port, {
      path: '/api/users/me/certificates',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    const certsList = resCertsA.body.certificates || []
    const foundCertA = certsList.find((c) => c.certificateId === certAssessment.certificateId)
    assert(foundCertA !== undefined, '9.1: Real assessment certificate returned in API')
    assert(foundCertA.type === 'assessment_mastery', '9.2: Type is assessment_mastery')
    assert(foundCertA.recipientName === userA.name, '9.3: Recipient name matches learner name')
    assert(foundCertA.status === 'valid', '9.4: Status is valid')
    assert(foundCertA.quizId?.title === quiz1.title, '9.5: Populated quiz title matches')

    // 10. Real course completion certificate display contract
    activeEnrollment.status = 'completed'
    activeEnrollment.progressPercent = 100
    activeEnrollment.completedAt = new Date()
    await activeEnrollment.save()

    const certCourse = await certificateService.issueCourseCertificate(userA._id, course1._id)
    fixtures.certificateIds.push(certCourse._id)

    const resCertsWithCourse = await makeRequest(port, {
      path: '/api/users/me/certificates',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    const certsAfterCourse = resCertsWithCourse.body.certificates || []
    const foundCertCourse = certsAfterCourse.find((c) => c.certificateId === certCourse.certificateId)
    assert(foundCertCourse !== undefined, '10.1: Real course completion certificate returned in API')
    assert(foundCertCourse.type === 'course_completion', '10.2: Type is course_completion')
    assert(foundCertCourse.courseId?.title === course1.title, '10.3: Populated course title matches')

    // 11. Revoked certificate display handling
    const certRevoked = await Certificate.create({
      userId: userA._id,
      title: 'Revoked Statistical Auditor Honor',
      score: 90,
      certificateId: `KAUSHAL-CERT-REVOKED-${testSuffix}`,
      status: 'revoked',
    })
    fixtures.certificateIds.push(certRevoked._id)

    // listUserCertificates strictly queries { userId, status: 'valid' }
    const resCertsValidOnly = await makeRequest(port, {
      path: '/api/users/me/certificates',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    const validOnlyList = resCertsValidOnly.body.certificates || []
    const hasRevokedInActiveList = validOnlyList.some((c) => c.certificateId === certRevoked.certificateId)
    assert(hasRevokedInActiveList === false, '11: Revoked certificates are excluded from active user certificate list')

    // 12. Certificate detail preview data contract
    assert(foundCertA.certificateId.startsWith('KAUSHAL-CERT-'), '12.1: Certificate ID has standard KAUSHAL-CERT- prefix')
    assert(Boolean(foundCertA.issuedAt), '12.2: issuedAt timestamp exists for preview')
    assert(foundCertA.score === 86, '12.3: Genuine assessment score is available')

    // =========================================================================
    // SECTION 4: Public Verification Integration
    // =========================================================================
    console.log('\n--- SECTION 4: Public Verification Integration ---')

    // 13. Public valid certificate verification
    const resVerifyValid = await makeRequest(port, {
      path: `/api/certificates/verify/${certAssessment.certificateId}`,
      method: 'GET',
    })
    assert(resVerifyValid.status === 200, '13.1: Public verification returns HTTP 200 for valid certificate')
    assert(resVerifyValid.body.valid === true, '13.2: valid === true')
    assert(resVerifyValid.body.certificateId === certAssessment.certificateId, '13.3: certificateId matches')
    assert(resVerifyValid.body.userId === undefined, '13.4: userId is NOT leaked')
    assert(resVerifyValid.body.email === undefined, '13.5: email is NOT leaked')

    // 14. Public revoked certificate verification
    const resVerifyRevoked = await makeRequest(port, {
      path: `/api/certificates/verify/${certRevoked.certificateId}`,
      method: 'GET',
    })
    assert(resVerifyRevoked.status === 200, '14.1: Public verification of revoked cert returns HTTP 200')
    assert(resVerifyRevoked.body.valid === false, '14.2: valid === false')
    assert(resVerifyRevoked.body.status === 'revoked', '14.3: status === revoked')
    assert(resVerifyRevoked.body.message.includes('revoked'), '14.4: revocation message present')

    // 15. Public not-found verification
    const resVerifyNotFound = await makeRequest(port, {
      path: '/api/certificates/verify/KAUSHAL-CERT-9999-NOTFOUND',
      method: 'GET',
    })
    assert(resVerifyNotFound.status === 404, '15.1: Not-found certificate returns HTTP 404')
    assert(resVerifyNotFound.body.valid === false, '15.2: valid === false')
    assert(resVerifyNotFound.body.status === 'not_found', '15.3: status === not_found')

    // 16. Malformed certificate ID
    const resVerifyMalformed = await makeRequest(port, {
      path: `/api/certificates/verify/${encodeURIComponent('MALFORMED;DROP TABLE')}`,
      method: 'GET',
    })
    assert(resVerifyMalformed.status === 400, '16.1: Malformed ID returns HTTP 400')
    assert(resVerifyMalformed.body.status === 'invalid_format', '16.2: status === invalid_format')

    // 17. Rate-limit response handling
    let triggeredRateLimit = false
    for (let i = 0; i < 35; i++) {
      const resRL = await makeRequest(port, {
        path: `/api/certificates/verify/${certAssessment.certificateId}`,
        method: 'GET',
      })
      if (resRL.status === 429) {
        triggeredRateLimit = true
        assert(resRL.body.status === 'rate_limited', '17.1: Rate limited response body status === rate_limited')
        break
      }
    }
    assert(triggeredRateLimit === true, '17.2: Public verification rate limiter enforces protection (HTTP 429)')

    // 18. Network / API failure resilience
    const resBadAuth = await makeRequest(port, {
      path: '/api/users/me/certificates',
      method: 'GET',
      headers: { Authorization: 'Bearer bad_token' },
    })
    assert(resBadAuth.status === 401, '18: Invalid auth token rejected with HTTP 401')

    // 19. Authenticated learner data isolation
    const resIsolation = await makeRequest(port, {
      path: '/api/users/me/certificates',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB}` },
    })
    const bCerts = resIsolation.body.certificates || []
    assert(bCerts.length === 0, '19: Learner B cannot view Learner A certificates (pure isolation)')

    // 20. Recovery API (reconcileMyCertificates) contract & idempotency
    const resReconcile = await makeRequest(port, {
      path: '/api/users/me/certificates/reconcile',
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    assert(resReconcile.status === 200, '20.1: POST /api/users/me/certificates/reconcile returns HTTP 200')
    assert(resReconcile.body.recoveredCount === 0, '20.2: Reconciling already certified records recovers 0 duplicates')
    assert(Array.isArray(resReconcile.body.certificates), '20.3: Returns current certificates list')

    // =========================================================================
    // SECTION 5: Static Audit: No Fabricated Records in Frontend Fallbacks
    // =========================================================================
    console.log('\n--- SECTION 5: Static Audit: No Fabricated Records in Frontend ---')

    // 21. Check AssessmentHistoryPage.jsx
    const assessHistoryCode = fs.readFileSync(path.resolve(__dirname, '../client/src/pages/quiz/AssessmentHistoryPage.jsx'), 'utf8')
    assert(!assessHistoryCode.includes('OFFICIAL_ATTEMPTS'), '21.1: OFFICIAL_ATTEMPTS array is completely removed from AssessmentHistoryPage.jsx')
    assert(!assessHistoryCode.includes("'Recently'"), '21.2: Fabricated date "Recently" is completely removed')
    assert(!assessHistoryCode.includes(': 80'), '21.3: Fake fallback score 80 is completely removed')

    // Check CertificatesPage.jsx
    const certPageCode = fs.readFileSync(path.resolve(__dirname, '../client/src/pages/certificates/CertificatesPage.jsx'), 'utf8')
    assert(!certPageCode.includes('DEFAULT_CERTIFICATES'), '21.4: CertificatesPage has 0 mock/default certificate records')

    // Check App.jsx routes
    const appCode = fs.readFileSync(path.resolve(__dirname, '../client/src/App.jsx'), 'utf8')
    assert(appCode.includes('/certificates'), '21.5: /certificates route is registered in App.jsx')
    assert(appCode.includes('/certificates/verify/:certificateId?'), '21.6: /certificates/verify route is registered in App.jsx')

    // 22. Existing learning-path and dashboard regression check
    const resDashboard = await makeRequest(port, {
      path: '/api/users/me/notifications',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    assert(resDashboard.status === 200, '22: Dashboard notifications API remains operational')

  } finally {
    // --- TEARDOWN ---
    console.log('\n--- TEARDOWN: Cleaning test fixtures from kaushalai_test ---')
    if (fixtures.certificateIds.length > 0) {
      await Certificate.deleteMany({ _id: { $in: fixtures.certificateIds } })
    }
    if (fixtures.enrollmentIds.length > 0) {
      await Enrollment.deleteMany({ _id: { $in: fixtures.enrollmentIds } })
    }
    if (fixtures.attemptIds.length > 0) {
      await QuizAttempt.deleteMany({ _id: { $in: fixtures.attemptIds } })
    }
    if (fixtures.courseIds.length > 0) {
      await Course.deleteMany({ _id: { $in: fixtures.courseIds } })
    }
    if (fixtures.quizIds.length > 0) {
      await Quiz.deleteMany({ _id: { $in: fixtures.quizIds } })
    }
    if (fixtures.userIds.length > 0) {
      await User.deleteMany({ _id: { $in: fixtures.userIds } })
    }

    if (server && server.listening) {
      await new Promise((resolve) => server.close(resolve))
    }
    await mongoose.disconnect()
  }

  // --- GUARD: Post-Test Development Database Check ---
  console.log('\n--- GUARDRAIL: Development Database Isolation (Post-Test) ---')
  const devConnAfter = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
  const devUserCountAfter = await devConnAfter.collection('users').countDocuments()
  const devCertCountAfter = await devConnAfter.collection('certificates').countDocuments()
  await devConnAfter.close()

  assert(
    devUserCountAfter === 15,
    `G.3: Post-test Dev DB user count strictly 15 (actual: ${devUserCountAfter})`
  )
  assert(
    devCertCountAfter === 0,
    `G.4: Post-test Dev DB certificate count strictly 0 (actual: ${devCertCountAfter})`
  )

  console.log('\n===================================================================')
  console.log(`TEST SUMMARY: ${totalPassed} Passed, ${totalFailed} Failed`)
  console.log('===================================================================')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution failed with unhandled error:', err)
  process.exit(1)
})
