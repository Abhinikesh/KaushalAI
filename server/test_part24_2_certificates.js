/**
 * test_part24_2_certificates.js
 * Dedicated test suite for PART 24.2.1 & PART 24.2.1.1:
 * KAUSHALAI CERTIFICATE SECURITY, ISSUANCE VALIDATION & RECOVERY HARDENING
 *
 * Verifies 18 Security, Validation & Recovery Invariants:
 * 1. In-progress assessment rejection
 * 2. Expired assessment rejection
 * 3. Assessment ownership mismatch
 * 4. Arbitrary caller-supplied score rejection
 * 5. Missing authoritative attempt rejection
 * 6. Course ownership mismatch
 * 7. Completed status with progress below 100%
 * 8. 100% progress without completed status
 * 9. Concurrent course certificate issuance
 * 10. Malformed public certificate IDs rejection (HTTP 400 invalid_format)
 * 11. Public verification rate limiting (HTTP 429 rate_limited)
 * 12. Recipient email privacy (sanitizes email addresses to 'Learner')
 * 13. Assessment issuance failure and recovery (reconcileUserCertificates)
 * 14. Course issuance failure and recovery (reconcileUserCertificates)
 * 15. Repeated higher-scoring assessment attempt policy
 * 16. Quiz competency updates remain intact
 * 17. Course certificate issuance does not mutate UserCompetency
 * 18. Existing certificate uniqueness and legacy index behavior
 */

'use strict'

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })
if (!process.env.ACCESS_TOKEN_SECRET) {
  process.env.ACCESS_TOKEN_SECRET = 'kaushalai_dev_access_secret_change_in_prod'
}
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
  console.log('PART 24.2.1.1: CERTIFICATE SECURITY, VALIDATION & RECOVERY TEST')
  console.log('===================================================================')

  await mongoose.connect(testDbUri)

  const User = require('./src/models/User')
  const Quiz = require('./src/models/Quiz')
  const QuizAttempt = require('./src/models/QuizAttempt')
  const Course = require('./src/models/Course')
  const Enrollment = require('./src/models/Enrollment')
  const Certificate = require('./src/models/Certificate')
  const Competency = require('./src/models/Competency')
  const UserCompetency = require('./src/models/UserCompetency')

  const certificateService = require('./src/services/certificate.service')
  const courseService = require('./src/services/course.service')
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
    competencyIds: [],
    userCompetencyIds: [],
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

    // 2. Setup Test Users
    const userA = await User.create({
      name: `Cert Learner A ${testSuffix}`,
      email: `cert_learner_a_${testSuffix}@example.com`,
      passwordHash: 'dummy_hash_for_testing',
      role: 'employee',
    })
    fixtures.userIds.push(userA._id)

    const userB = await User.create({
      name: `Cert Learner B ${testSuffix}`,
      email: `cert_learner_b_${testSuffix}@example.com`,
      passwordHash: 'dummy_hash_for_testing',
      role: 'employee',
    })
    fixtures.userIds.push(userB._id)

    // User C has an email as name to test privacy redaction
    const userC = await User.create({
      name: `privacy.officer.${testSuffix}@example.gov.in`,
      email: `privacy.officer.${testSuffix}@example.gov.in`,
      passwordHash: 'dummy_hash_for_testing',
      role: 'employee',
    })
    fixtures.userIds.push(userC._id)

    const tokenA = jwt.sign({ id: userA._id.toString(), role: 'employee' }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
    const tokenB = jwt.sign({ id: userB._id.toString(), role: 'employee' }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

    // 3. Setup Test Quizzes & Courses
    const comp1 = await Competency.create({
      name: `Survey Methodology ${testSuffix}`,
      category: 'statistical',
      description: 'Official statistical survey sampling techniques',
    })
    fixtures.competencyIds.push(comp1._id)

    const quiz1 = await Quiz.create({
      title: `Statistical Sampling Mastery Quiz ${testSuffix}`,
      materialId: `mat_${testSuffix}_1`,
      createdBy: userA._id,
      durationMinutes: 20,
      totalMarks: 100,
      tagCompetencyIds: [comp1._id],
    })
    fixtures.quizIds.push(quiz1._id)

    const quiz2 = await Quiz.create({
      title: `Advanced Regression Analysis Quiz ${testSuffix}`,
      materialId: `mat_${testSuffix}_2`,
      createdBy: userA._id,
      durationMinutes: 30,
      totalMarks: 100,
    })
    fixtures.quizIds.push(quiz2._id)

    const course1 = await Course.create({
      title: `National Accounts & Economic Statistics ${testSuffix}`,
      description: 'Official statistical frameworks course',
      source: 'igot',
      durationHours: 12,
    })
    fixtures.courseIds.push(course1._id)

    const course2 = await Course.create({
      title: `Index Numbers & Price Statistics ${testSuffix}`,
      description: 'Price index methodologies',
      source: 'nssta',
      durationHours: 8,
    })
    fixtures.courseIds.push(course2._id)

    // =========================================================================
    // SECTION 1: Assessment Certificate Authoritative Validation
    // =========================================================================
    console.log('\n--- SECTION 1: Assessment Certificate Authoritative Validation ---')

    // 1.1 In-progress assessment rejection
    const inProgressAttempt = await QuizAttempt.create({
      userId: userA._id,
      quizId: quiz2._id,
      score: 85,
      correctCount: 8,
      totalQuestions: 10,
      passed: true,
      status: 'in_progress',
      startedAt: new Date(),
    })
    fixtures.attemptIds.push(inProgressAttempt._id)

    const certInProgress = await certificateService.issueAssessmentCertificate(userA._id, quiz2._id, { attemptId: inProgressAttempt._id })
    assert(certInProgress === null, '1.1: In-progress assessment attempt is rejected (returns null)')

    // 1.2 Expired assessment rejection
    const expiredAttempt = await QuizAttempt.create({
      userId: userA._id,
      quizId: quiz2._id,
      score: 85,
      correctCount: 8,
      totalQuestions: 10,
      passed: true,
      status: 'expired',
      startedAt: new Date(Date.now() - 3600000),
    })
    fixtures.attemptIds.push(expiredAttempt._id)

    const certExpired = await certificateService.issueAssessmentCertificate(userA._id, quiz2._id, { attemptId: expiredAttempt._id })
    assert(certExpired === null, '1.2: Expired assessment attempt is rejected (returns null)')

    // 1.3 Assessment ownership mismatch
    const userBAttempt = await QuizAttempt.create({
      userId: userB._id,
      quizId: quiz2._id,
      score: 90,
      correctCount: 9,
      totalQuestions: 10,
      passed: true,
      status: 'completed',
      submittedAt: new Date(),
    })
    fixtures.attemptIds.push(userBAttempt._id)

    const certMismatch = await certificateService.issueAssessmentCertificate(userA._id, quiz2._id, { attemptId: userBAttempt._id })
    assert(certMismatch === null, '1.3: Assessment ownership mismatch is rejected (userA cannot use userB attempt)')

    // 1.4 Arbitrary caller-supplied score rejection
    const unattemptedQuiz = await Quiz.create({
      title: `Unattempted Quiz ${testSuffix}`,
      materialId: `mat_${testSuffix}_unattempted`,
      createdBy: userA._id,
      durationMinutes: 15,
    })
    fixtures.quizIds.push(unattemptedQuiz._id)

    const certForged = await certificateService.issueAssessmentCertificate(userA._id, unattemptedQuiz._id, 100)
    assert(certForged === null, '1.4: Caller-supplied score without authoritative DB attempt is rejected (returns null)')

    // 1.5 Missing authoritative attempt rejection
    const randomAttemptId = new mongoose.Types.ObjectId()
    const certMissing = await certificateService.issueAssessmentCertificate(userA._id, quiz2._id, { attemptId: randomAttemptId })
    assert(certMissing === null, '1.5: Non-existent attempt ID is rejected')

    // 1.6 Authoritative qualifying completed attempt succeeds
    const qualifyingAttemptA = await QuizAttempt.create({
      userId: userA._id,
      quizId: quiz1._id,
      score: 85,
      correctCount: 8,
      totalQuestions: 10,
      passed: true,
      status: 'completed',
      submittedAt: new Date(),
    })
    fixtures.attemptIds.push(qualifyingAttemptA._id)

    const certA1 = await certificateService.issueAssessmentCertificate(userA._id, quiz1._id, { attemptId: qualifyingAttemptA._id })
    fixtures.certificateIds.push(certA1._id)
    assert(certA1 && certA1.certificateId, '1.6.1: Authoritative completed attempt generates certificate')
    assert(certA1.score === 85, '1.6.2: Certificate score matches authoritative DB attempt score')
    assert(certA1.type === 'assessment_mastery', '1.6.3: Certificate type is assessment_mastery')

    // 1.7 Repeated higher-scoring assessment attempt policy
    const higherAttemptA = await QuizAttempt.create({
      userId: userA._id,
      quizId: quiz1._id,
      score: 95,
      correctCount: 9,
      totalQuestions: 10,
      passed: true,
      status: 'completed',
      submittedAt: new Date(),
    })
    fixtures.attemptIds.push(higherAttemptA._id)

    const certRetake = await certificateService.issueAssessmentCertificate(userA._id, quiz1._id, { attemptId: higherAttemptA._id })
    assert(certRetake.certificateId === certA1.certificateId, '1.7.1: Subsequent higher score returns existing certificate (deterministic)')
    assert(certRetake.score === 85, '1.7.2: Existing certificate preserves original qualifying attempt score')
    const countA1 = await Certificate.countDocuments({ userId: userA._id, quizId: quiz1._id })
    assert(countA1 === 1, '1.7.3: Total certificate count for (user, quiz) remains strictly 1')

    // =========================================================================
    // SECTION 2: Course Certificate Authoritative Validation
    // =========================================================================
    console.log('\n--- SECTION 2: Course Certificate Authoritative Validation ---')

    // 2.1 Course ownership mismatch
    const enrollmentB = await courseService.enrollUser(userB._id, course2._id)
    fixtures.enrollmentIds.push(enrollmentB._id)
    const certCourseMismatch = await certificateService.issueCourseCertificate(userA._id, course2._id)
    assert(certCourseMismatch === null, '2.1: Course ownership mismatch rejected (userA cannot claim userB enrollment)')

    // 2.2 Completed status with progress below 100%
    const enrollmentA1 = await courseService.enrollUser(userA._id, course1._id)
    fixtures.enrollmentIds.push(enrollmentA1._id)
    enrollmentA1.status = 'completed'
    enrollmentA1.progressPercent = 75 // illegal state: completed but < 100%
    await enrollmentA1.save()

    const certUnder100 = await certificateService.issueCourseCertificate(userA._id, course1._id)
    assert(certUnder100 === null, '2.2: Enrollment with completed status but progress < 100% is rejected')

    // 2.3 100% progress without completed status
    enrollmentA1.status = 'in_progress'
    enrollmentA1.progressPercent = 100
    await enrollmentA1.save()

    const certNotInProgress = await certificateService.issueCourseCertificate(userA._id, course1._id)
    assert(certNotInProgress === null, '2.3: Enrollment with 100% progress but status in_progress is rejected')

    // 2.4 Genuine 100% completed enrollment succeeds
    enrollmentA1.status = 'completed'
    enrollmentA1.progressPercent = 100
    enrollmentA1.completedAt = new Date()
    await enrollmentA1.save()

    const certCourseA1 = await certificateService.issueCourseCertificate(userA._id, course1._id)
    fixtures.certificateIds.push(certCourseA1._id)
    assert(certCourseA1 && certCourseA1.type === 'course_completion', '2.4.1: Genuine 100% completed enrollment issues course certificate')
    assert(certCourseA1.score === 100, '2.4.2: Course completion score is 100')

    // 2.5 Concurrent course certificate issuance
    enrollmentB.status = 'completed'
    enrollmentB.progressPercent = 100
    enrollmentB.completedAt = new Date()
    await enrollmentB.save()

    const concurrentCourses = await Promise.all([
      certificateService.issueCourseCertificate(userB._id, course2._id),
      certificateService.issueCourseCertificate(userB._id, course2._id),
      certificateService.issueCourseCertificate(userB._id, course2._id),
    ])
    fixtures.certificateIds.push(concurrentCourses[0]._id)
    const countCourseB = await Certificate.countDocuments({ userId: userB._id, courseId: course2._id })
    assert(countCourseB === 1, '2.5.1: Concurrent course issuance creates exactly 1 certificate document')
    assert(
      concurrentCourses[0].certificateId === concurrentCourses[1].certificateId &&
      concurrentCourses[1].certificateId === concurrentCourses[2].certificateId,
      '2.5.2: All concurrent course issuance promises return identical certificate ID'
    )

    // 2.6 Course certificate does NOT mutate UserCompetency
    const userCompCount = await UserCompetency.countDocuments({ user_id: userA._id })
    assert(userCompCount === 0, '2.6: Course certificate issuance strictly preserves UserCompetency (count = 0)')

    // =========================================================================
    // SECTION 3: Public Verification Privacy & Security
    // =========================================================================
    console.log('\n--- SECTION 3: Public Verification Privacy & Security ---')

    // 3.1 Valid certificate verification
    const resVerifyValid = await makeRequest(port, {
      path: `/api/certificates/verify/${certA1.certificateId}`,
      method: 'GET',
    })
    assert(resVerifyValid.status === 200, '3.1.1: Valid certificate verification returns HTTP 200')
    assert(resVerifyValid.body.valid === true, '3.1.2: Response body valid === true')
    assert(resVerifyValid.body.certificateId === certA1.certificateId, '3.1.3: certificateId matches')
    assert(resVerifyValid.body.type === 'assessment_mastery', '3.1.4: type matches')

    // 3.2 Privacy: Strict redaction of internal/sensitive fields
    assert(resVerifyValid.body.userId === undefined, '3.2.1: userId is NOT exposed')
    assert(resVerifyValid.body.email === undefined, '3.2.2: email is NOT exposed')
    assert(resVerifyValid.body._id === undefined, '3.2.3: Database internal _id is NOT exposed')
    assert(resVerifyValid.body.score === undefined, '3.2.4: Assessment score is NOT exposed')
    assert(resVerifyValid.body.answers === undefined, '3.2.5: User answers are NOT exposed')

    // 3.3 Recipient email privacy redaction
    const qualifyingAttemptC = await QuizAttempt.create({
      userId: userC._id,
      quizId: quiz1._id,
      score: 92,
      correctCount: 9,
      totalQuestions: 10,
      passed: true,
      status: 'completed',
      submittedAt: new Date(),
    })
    fixtures.attemptIds.push(qualifyingAttemptC._id)

    const certC = await certificateService.issueAssessmentCertificate(userC._id, quiz1._id, { attemptId: qualifyingAttemptC._id })
    fixtures.certificateIds.push(certC._id)

    assert(certC.recipientName === 'Learner', `3.3.1: Email name sanitized to 'Learner' on issue (actual: ${certC.recipientName})`)
    const resVerifyC = await makeRequest(port, {
      path: `/api/certificates/verify/${certC.certificateId}`,
      method: 'GET',
    })
    assert(resVerifyC.body.recipientName === 'Learner', '3.3.2: Public verification sanitizes email address to Learner')
    assert(!resVerifyC.body.recipientName.includes('@'), '3.3.3: Public recipientName does not contain @')

    // 3.4 Revoked certificate verification
    const certRevoked = await Certificate.create({
      userId: userB._id,
      quizId: quiz2._id,
      courseId: null,
      type: 'assessment_mastery',
      title: `${quiz2.title} Mastery`,
      recipientName: userB.name,
      score: 90,
      issuedAt: new Date(),
      certificateId: `KAUSHAL-CERT-REVOKED-${testSuffix}`,
      status: 'revoked',
    })
    fixtures.certificateIds.push(certRevoked._id)

    const resVerifyRevoked = await makeRequest(port, {
      path: `/api/certificates/verify/${certRevoked.certificateId}`,
      method: 'GET',
    })
    assert(resVerifyRevoked.status === 200, '3.4.1: Revoked certificate returns HTTP 200')
    assert(resVerifyRevoked.body.valid === false, '3.4.2: Revoked certificate has valid === false')
    assert(resVerifyRevoked.body.status === 'revoked', '3.4.3: Status is revoked')
    assert(resVerifyRevoked.body.message.includes('revoked'), '3.4.4: Revocation message included')

    // 3.5 Non-existent certificate verification
    const resVerifyNotFound = await makeRequest(port, {
      path: '/api/certificates/verify/KAUSHAL-CERT-9999-NOTFOUND',
      method: 'GET',
    })
    assert(resVerifyNotFound.status === 404, '3.5.1: Non-existent certificate returns HTTP 404')
    assert(resVerifyNotFound.body.valid === false, '3.5.2: Non-existent response has valid === false')
    assert(resVerifyNotFound.body.status === 'not_found', '3.5.3: Status is not_found')

    // 3.6 Malformed public certificate IDs rejection (HTTP 400 invalid_format)
    const malformedIds = [
      'KAUSHAL; DROP TABLE',
      '<script>alert(1)</script>',
      '../../etc/passwd',
      'SHORT-123',
      'KAUSHAL$INVALID',
    ]
    for (const mId of malformedIds) {
      const resMalformed = await makeRequest(port, {
        path: `/api/certificates/verify/${encodeURIComponent(mId)}`,
        method: 'GET',
      })
      assert(resMalformed.status === 400, `3.6: Malformed ID '${mId}' rejected with HTTP 400 (actual: ${resMalformed.status})`)
      assert(resMalformed.body.status === 'invalid_format', `3.6b: Malformed status is 'invalid_format'`)
    }

    // =========================================================================
    // SECTION 4: Failed Issuance Recovery (reconcileUserCertificates)
    // =========================================================================
    console.log('\n--- SECTION 4: Failed Issuance Recovery Engine ---')

    // Setup an uncertified completed assessment attempt (e.g. if issuance crashed earlier)
    const orphanQuiz = await Quiz.create({
      title: `Orphan Recovery Assessment ${testSuffix}`,
      materialId: `mat_recovery_${testSuffix}`,
      createdBy: userA._id,
      durationMinutes: 20,
    })
    fixtures.quizIds.push(orphanQuiz._id)

    const orphanAttempt = await QuizAttempt.create({
      userId: userA._id,
      quizId: orphanQuiz._id,
      score: 84,
      correctCount: 8,
      totalQuestions: 10,
      passed: true,
      status: 'completed',
      submittedAt: new Date(),
    })
    fixtures.attemptIds.push(orphanAttempt._id)

    // Setup an uncertified completed course enrollment
    const orphanCourse = await Course.create({
      title: `Orphan Recovery Course ${testSuffix}`,
      source: 'nssta',
      durationHours: 6,
    })
    fixtures.courseIds.push(orphanCourse._id)

    const orphanEnrollment = await Enrollment.create({
      userId: userA._id,
      courseId: orphanCourse._id,
      status: 'completed',
      progressPercent: 100,
      startedAt: new Date(Date.now() - 86400000),
      completedAt: new Date(),
    })
    fixtures.enrollmentIds.push(orphanEnrollment._id)

    // Pre-condition: neither has a certificate
    const certOrphanQuizBefore = await Certificate.findOne({ userId: userA._id, quizId: orphanQuiz._id })
    const certOrphanCourseBefore = await Certificate.findOne({ userId: userA._id, courseId: orphanCourse._id })
    assert(!certOrphanQuizBefore && !certOrphanCourseBefore, '4.1: Pre-condition: 0 certificates exist for orphan records')

    // Execute Recovery
    const recoveryResult = await certificateService.reconcileUserCertificates(userA._id)
    assert(recoveryResult.recoveredCount >= 2, `4.2: Recovery engine reconciled missing certificates (recovered: ${recoveryResult.recoveredCount})`)

    const certOrphanQuizAfter = await Certificate.findOne({ userId: userA._id, quizId: orphanQuiz._id })
    const certOrphanCourseAfter = await Certificate.findOne({ userId: userA._id, courseId: orphanCourse._id })
    if (certOrphanQuizAfter) fixtures.certificateIds.push(certOrphanQuizAfter._id)
    if (certOrphanCourseAfter) fixtures.certificateIds.push(certOrphanCourseAfter._id)

    assert(certOrphanQuizAfter !== null, '4.3: Assessment certificate successfully recovered from authoritative attempt')
    assert(certOrphanQuizAfter && certOrphanQuizAfter.score === 84, '4.4: Recovered assessment certificate has authoritative score 84')
    assert(certOrphanCourseAfter !== null, '4.5: Course certificate successfully recovered from authoritative enrollment')

    // Idempotent recovery check: repeating recovery produces 0 duplicates
    const repeatRecovery = await certificateService.reconcileUserCertificates(userA._id)
    assert(repeatRecovery.recoveredCount === 0, '4.6: Repeated recovery is idempotent (recoveredCount = 0)')

    // Authenticated HTTP reconciliation endpoint
    const resHttpReconcile = await makeRequest(port, {
      path: '/api/users/me/certificates/reconcile',
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    assert(resHttpReconcile.status === 200, `4.7: POST /api/users/me/certificates/reconcile returns HTTP 200`)
    assert(resHttpReconcile.body.recoveredCount === 0, '4.8: HTTP reconciliation endpoint reports 0 pending duplicates')

    // =========================================================================
    // SECTION 5: Quiz Competency Updates Intact Verification
    // =========================================================================
    console.log('\n--- SECTION 5: Quiz Competency Updates Intact Verification ---')

    // Submitting a quiz with tagged competency updates UserCompetency level
    const resQuizSubmit = await makeRequest(port, {
      path: `/api/quizzes/${quiz1._id}/attempts`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
    }, {
      answers: [
        { questionId: 'q1', selectedOptionIndex: 0, correctOptionIndex: 0 },
      ],
      totalQuestions: 1,
    })

    assert(resQuizSubmit.status === 201, '5.1: Quiz attempt submission returns HTTP 201')
    assert(resQuizSubmit.body.passed === true, '5.2: Quiz attempt marked passed')

    const certHttpB = await Certificate.findOne({ userId: userB._id, quizId: quiz1._id })
    if (certHttpB) fixtures.certificateIds.push(certHttpB._id)
    assert(certHttpB !== null, '5.3: Certificate automatically issued during controller attempt submission')

    // Check competencyUpdates in response or DB
    assert(Array.isArray(resQuizSubmit.body.competencyUpdates), '5.4: Competency updates returned in quiz attempt response')

    // =========================================================================
    // SECTION 6: Index & Legacy Record Safety
    // =========================================================================
    console.log('\n--- SECTION 6: Index & Legacy Record Safety ---')

    const indexes = await Certificate.collection.getIndexes()
    assert(Boolean(indexes.userId_1_quizId_1), '6.1: Partial unique index userId_1_quizId_1 exists on collection')
    assert(Boolean(indexes.userId_1_courseId_1), '6.2: Partial unique index userId_1_courseId_1 exists on collection')

    // Legacy record test: Record with null quizId and courseId does not crash index
    const legacyCert = await Certificate.create({
      userId: userC._id,
      title: 'Legacy Foundation Honor',
      score: 100,
      certificateId: `KAUSHAL-LEGACY-${testSuffix}`,
      status: 'valid',
    })
    fixtures.certificateIds.push(legacyCert._id)
    assert(legacyCert && legacyCert._id, '6.3: Legacy certificate without course/quiz IDs persists safely with partial indexes')

    // =========================================================================
    // SECTION 7: Public Verification Rate Limiting (Executed Last)
    // =========================================================================
    console.log('\n--- SECTION 7: Public Verification Rate Limiting ---')

    let rateLimitEncountered = false
    for (let i = 0; i < 35; i++) {
      const resRate = await makeRequest(port, {
        path: `/api/certificates/verify/${certA1.certificateId}`,
        method: 'GET',
      })
      if (resRate.status === 429) {
        rateLimitEncountered = true
        assert(resRate.body.status === 'rate_limited', '7.1: Rate limited response has status === rate_limited')
        break
      }
    }
    assert(rateLimitEncountered === true, '7.2: Public verification rate limiter triggers HTTP 429 on excessive requests')

  } finally {
    // --- TEARDOWN: Clean up test fixtures ---
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
    if (fixtures.competencyIds.length > 0) {
      await Competency.deleteMany({ _id: { $in: fixtures.competencyIds } })
    }
    if (fixtures.userCompetencyIds.length > 0) {
      await UserCompetency.deleteMany({ _id: { $in: fixtures.userCompetencyIds } })
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
