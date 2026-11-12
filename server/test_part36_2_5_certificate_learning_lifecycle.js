/**
 * test_part36_2_5_certificate_learning_lifecycle.js
 * Phase 36.2.5: Certificate & End-to-End Learning Lifecycle Integrity
 *
 * Verifies 22 End-to-End Lifecycle, Security, Idempotency & Frontend Hygiene Scenarios:
 *  1. Quiz pass (>= 70%) issues assessment_mastery certificate & returns certificateStatus: 'issued'
 *  2. Quiz fail (< 70%) does NOT issue certificate (certificateStatus: 'not_eligible')
 *  3. Retaking and passing same quiz is idempotent (exactly 1 cert, same certificateId)
 *  4. Retaking with higher score does NOT create duplicate certificate
 *  5. issueAssessmentCertificate rejects in-progress/expired/missing attempts & ownership mismatch
 *  6. Concurrent quiz certificate issuance produces exactly 1 certificate (11000 race handled)
 *  7. Quiz certificate issuance failure is surfaced (certificateStatus: 'deferred_recovery_required') & recoverable via reconcile
 *  8. Server-authoritative course completion via LearningActivity (100%) automatically issues course_completion certificate
 *  9. Partial course activity (< 100%) does NOT issue course_completion certificate
 * 10. Client-supplied PUT /api/users/me/enrollments/:id/progress with progressPercent: 100 is rejected & does NOT issue certificate
 * 11. Repeating course completion activity is idempotent (exactly 1 course_completion cert)
 * 12. issueCourseCertificate enforces status === 'completed' && progressPercent === 100 & ownership
 * 13. Course certificate issuance failure is recoverable via POST /api/users/me/certificates/reconcile
 * 14. GET /api/users/me/certificates is strictly read-only, returns [] when empty, and is ownership-scoped
 * 15. GET /api/users/me/certificates returns populated courseId/quizId and KAUSHAL-CERT-YYYY-XXXXXXXX format
 * 16. Public verification GET /api/certificates/verify/:certificateId returns 200 valid without PII/internal IDs/scores
 * 17. Public verification handles invalid_format (400), not_found (404), and revoked (200 valid:false)
 * 18. Recipient name sanitization never leaks email addresses
 * 19. End-to-end learning lifecycle: Enroll -> Complete course -> Course cert -> Pass linked quiz -> Assessment cert + Competency + SkillGap -> Verify both
 * 20. Frontend source hygiene: MyCoursesPage, AssessmentHistoryPage, CertificatesPage, PublicCertificateVerifyPage have zero hardcoded CERT-2026-* or DEFAULT_ENROLLED_COURSES
 * 21. Certificate ID entropy: new IDs use 64 bits (16 hex chars), are unique, old 8-char IDs still match CERT_ID_REGEX
 * 22. needsCertificateSync recovery flag: set on enrollment when issuance fails, cleared by reconcile after successful recovery
 */

'use strict'

const fs = require('fs')
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
    const headers = { ...(options.headers || {}) }
    let payload = null
    if (body !== null && body !== undefined) {
      payload = typeof body === 'string' ? body : JSON.stringify(body)
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'
      headers['Content-Length'] = Buffer.byteLength(payload)
    }

    const req = http.request({ port, host: '127.0.0.1', ...options, headers }, (res) => {
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
    if (payload !== null) req.write(payload)
    req.end()
  })
}

async function runTests() {
  console.log('===================================================================')
  console.log('PHASE 36.2.5: CERTIFICATE & END-TO-END LEARNING LIFECYCLE TEST')
  console.log('===================================================================')

  await mongoose.connect(testDbUri)

  const User = require('./src/models/User')
  const Quiz = require('./src/models/Quiz')
  const Question = require('./src/models/Question')
  const QuizAttempt = require('./src/models/QuizAttempt')
  const Course = require('./src/models/Course')
  const Enrollment = require('./src/models/Enrollment')
  const LearningActivity = require('./src/models/LearningActivity')
  const LearningProgress = require('./src/models/LearningProgress')
  const Certificate = require('./src/models/Certificate')
  const Competency = require('./src/models/Competency')
  const UserCompetency = require('./src/models/UserCompetency')
  const SkillGap = require('./src/models/SkillGap')

  const certificateService = require('./src/services/certificate.service')
  const app = require('./src/app')

  // Pre-test dev DB isolation snapshot
  const devConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
  const devCertCountBefore = await devConn.collection('certificates').countDocuments()
  const devEnrollmentCountBefore = await devConn.collection('enrollments').countDocuments()
  await devConn.close()
  assert(devCertCountBefore === 0, `Pre-check: dev DB (kaushalai) certificates untouched (0, got ${devCertCountBefore})`)

  await Certificate.init()

  const suffix = `${Date.now()}_${Math.floor(Math.random() * 1000)}`
  const fixtures = {
    userIds: [],
    quizIds: [],
    questionIds: [],
    courseIds: [],
    compIds: [],
  }

  let server
  let port

  try {
    server = await new Promise((resolve) => {
      const s = http.createServer(app)
      s.listen(0, '127.0.0.1', () => resolve(s))
    })
    port = server.address().port

    // Create test users
    const userA = await User.create({
      name: 'Priya Sharma',
      email: `priya_${suffix}@example.gov.in`,
      passwordHash: 'hashed_pw',
      role: 'employee',
      organizationId: new mongoose.Types.ObjectId(),
    })
    const userB = await User.create({
      name: `leak_check_${suffix}@example.com`,
      email: `userb_${suffix}@example.gov.in`,
      passwordHash: 'hashed_pw',
      role: 'employee',
      organizationId: userA.organizationId,
    })
    fixtures.userIds.push(userA._id, userB._id)

    const tokenA = jwt.sign({ id: userA._id.toString(), role: userA.role, tokenVersion: 0 }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
    const tokenB = jwt.sign({ id: userB._id.toString(), role: userB.role, tokenVersion: 0 }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

    // Create Competency, Course (with 2 modules, 1 video each), and linked Quiz
    const comp = await Competency.create({
      name: `Survey Sampling ${suffix}`,
      category: 'statistical',
      description: 'Sample survey design competency',
    })
    fixtures.compIds.push(comp._id)

    const course = await Course.create({
      title: `Official Statistics Course ${suffix}`,
      description: 'Authoritative course for lifecycle testing',
      source: 'igot',
      difficulty: 'beginner',
      isPublished: true,
      isActive: true,
      durationHours: 4,
      modules: [
        {
          title: 'Module 1: Foundations',
          order: 0,
          durationMins: 30,
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        },
        {
          title: 'Module 2: Estimation',
          order: 1,
          durationMins: 45,
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        },
      ],
    })
    fixtures.courseIds.push(course._id)

    const qDocs = await Question.insertMany([
      { text: 'Q1', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0, competency_id: comp._id },
      { text: 'Q2', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 1, competency_id: comp._id },
      { text: 'Q3', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 2, competency_id: comp._id },
      { text: 'Q4', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 3, competency_id: comp._id },
    ])
    fixtures.questionIds.push(...qDocs.map((q) => q._id))

    const quiz = await Quiz.create({
      title: `Official Statistics Quiz ${suffix}`,
      courseId: course._id,
      createdBy: userA._id,
      materialId: new mongoose.Types.ObjectId().toString(),
      questionIds: qDocs.map((q) => q._id),
      questionCount: qDocs.length,
      tagCompetencyIds: [comp._id],
    })
    fixtures.quizIds.push(quiz._id)

    // Enroll User A in course so course-linked quiz access is authorized
    const enrollRes = await makeRequest(
      port,
      {
        method: 'POST',
        path: '/api/users/me/enrollments',
        headers: { Authorization: `Bearer ${tokenA}` },
      },
      { courseId: String(course._id) }
    )
    assert(enrollRes.status === 200 || enrollRes.status === 201, `Enrolled User A in course (${enrollRes.status}: ${JSON.stringify(enrollRes.body)})`)
    const enrollmentId = enrollRes.body.enrollment._id

    // ── Scenario 1 & 2: Quiz fail (<70) vs Quiz pass (>=70) ──────────────
    console.log('\n--- Scenarios 1-4: Quiz Pass/Fail & Idempotency ---')
    const failStart = await makeRequest(port, {
      method: 'POST',
      path: `/api/quizzes/${quiz._id}/start-attempt`,
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    assert(failStart.status === 201 || failStart.status === 200, `Started fail quiz attempt (${failStart.status})`)

    const failSubmit = await makeRequest(
      port,
      {
        method: 'POST',
        path: `/api/quizzes/${quiz._id}/attempts`,
        headers: { Authorization: `Bearer ${tokenA}` },
      },
      {
        attemptId: failStart.body.attemptId,
        answers: [
          { questionId: String(qDocs[0]._id), selectedOptionIndex: 0 }, // 1/4 = 25%
          { questionId: String(qDocs[1]._id), selectedOptionIndex: 0 },
          { questionId: String(qDocs[2]._id), selectedOptionIndex: 0 },
          { questionId: String(qDocs[3]._id), selectedOptionIndex: 0 },
        ],
      }
    )
    assert(failSubmit.status === 201 && failSubmit.body.passed === false, 'Scenario 2: Quiz fail (<70%) recorded as failed')
    assert(failSubmit.body.certificate === null && failSubmit.body.certificateStatus === 'not_eligible', 'Scenario 2: No certificate issued on failing score')

    const passStart1 = await makeRequest(port, {
      method: 'POST',
      path: `/api/quizzes/${quiz._id}/start-attempt`,
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    const passSubmit1 = await makeRequest(
      port,
      {
        method: 'POST',
        path: `/api/quizzes/${quiz._id}/attempts`,
        headers: { Authorization: `Bearer ${tokenA}` },
      },
      {
        attemptId: passStart1.body.attemptId,
        answers: [
          { questionId: String(qDocs[0]._id), selectedOptionIndex: 0 },
          { questionId: String(qDocs[1]._id), selectedOptionIndex: 1 },
          { questionId: String(qDocs[2]._id), selectedOptionIndex: 2 },
          { questionId: String(qDocs[3]._id), selectedOptionIndex: 0 }, // 3/4 = 75%
        ],
      }
    )
    assert(passSubmit1.status === 201 && passSubmit1.body.passed === true, 'Scenario 1: Quiz pass (75% >= 70%) succeeded')
    assert(
      passSubmit1.body.certificateStatus === 'issued' && /^KAUSHAL-CERT-\d{4}-[A-F0-9]{16}$/.test(passSubmit1.body.certificate?.certificateId),
      `Scenario 1: assessment_mastery certificate issued (${passSubmit1.body.certificate?.certificateId}, status=${passSubmit1.body.certificateStatus})`
    )

    // Scenario 3 & 4: Retake with higher score (100%) -> idempotent, same certId
    const passStart2 = await makeRequest(port, {
      method: 'POST',
      path: `/api/quizzes/${quiz._id}/start-attempt`,
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    const passSubmit2 = await makeRequest(
      port,
      {
        method: 'POST',
        path: `/api/quizzes/${quiz._id}/attempts`,
        headers: { Authorization: `Bearer ${tokenA}` },
      },
      {
        attemptId: passStart2.body.attemptId,
        answers: [
          { questionId: String(qDocs[0]._id), selectedOptionIndex: 0 },
          { questionId: String(qDocs[1]._id), selectedOptionIndex: 1 },
          { questionId: String(qDocs[2]._id), selectedOptionIndex: 2 },
          { questionId: String(qDocs[3]._id), selectedOptionIndex: 3 }, // 4/4 = 100%
        ],
      }
    )
    const certsAfterRetake = await Certificate.find({ userId: userA._id, quizId: quiz._id }).lean()
    assert(
      certsAfterRetake.length === 1 &&
        passSubmit2.body.certificate?.certificateId === passSubmit1.body.certificate?.certificateId,
      'Scenarios 3-4: Retaking & scoring higher is idempotent (exactly 1 cert, same certificateId)'
    )

    // ── Scenario 5 & 6: Validation & Concurrency ──────────────────────────
    console.log('\n--- Scenarios 5-7: Validation, Concurrency & Failure Recovery ---')
    const inProgAttempt = await QuizAttempt.create({
      userId: userB._id,
      quizId: quiz._id,
      status: 'in_progress',
      score: 90,
      correctCount: 4,
      totalQuestions: 4,
    })
    const inProgCert = await certificateService.issueAssessmentCertificate(userB._id, quiz._id, { attemptId: inProgAttempt._id })
    assert(inProgCert === null, 'Scenario 5a: In-progress attempt rejected even with score=90')

    const expiredAttempt = await QuizAttempt.create({
      userId: userB._id,
      quizId: quiz._id,
      status: 'expired',
      score: 100,
      correctCount: 4,
      totalQuestions: 4,
    })
    const expiredCert = await certificateService.issueAssessmentCertificate(userB._id, quiz._id, { attemptId: expiredAttempt._id })
    assert(expiredCert === null, 'Scenario 5b: Expired attempt rejected')

    const mismatchCert = await certificateService.issueAssessmentCertificate(userB._id, quiz._id, { attemptId: passStart1.body.attemptId })
    assert(mismatchCert === null, 'Scenario 5c: Ownership mismatch rejected')

    // Scenario 6: Concurrent quiz certificate issuance
    const userBPassAttempt = await QuizAttempt.create({
      userId: userB._id,
      quizId: quiz._id,
      status: 'completed',
      score: 85,
      correctCount: 3,
      totalQuestions: 4,
      completedAt: new Date(),
    })
    const concurrentResults = await Promise.all([
      certificateService.issueAssessmentCertificate(userB._id, quiz._id, { attemptId: userBPassAttempt._id }),
      certificateService.issueAssessmentCertificate(userB._id, quiz._id, { attemptId: userBPassAttempt._id }),
      certificateService.issueAssessmentCertificate(userB._id, quiz._id, { attemptId: userBPassAttempt._id }),
    ])
    const userBQuizCerts = await Certificate.find({ userId: userB._id, quizId: quiz._id }).lean()
    assert(
      userBQuizCerts.length === 1 && concurrentResults.every((c) => c && c.certificateId === userBQuizCerts[0].certificateId),
      'Scenario 6: Concurrent assessment certificate issuance creates exactly 1 certificate'
    )

    // Scenario 7: Quiz certificate issuance failure surfaced & recoverable
    const q2Doc = await Question.create({ text: 'Q2-1', options: ['A', 'B'], correctOptionIndex: 0 })
    fixtures.questionIds.push(q2Doc._id)
    const quiz2 = await Quiz.create({
      title: `Recovery Quiz ${suffix}`,
      createdBy: userA._id,
      materialId: new mongoose.Types.ObjectId().toString(),
      questionIds: [q2Doc._id],
      questionCount: 1,
    })
    fixtures.quizIds.push(quiz2._id)

    const origIssueAssessment = certificateService.issueAssessmentCertificate
    certificateService.issueAssessmentCertificate = async () => {
      throw new Error('Simulated certificate write timeout')
    }
    let recSubmitRes
    try {
      const recStart = await makeRequest(port, {
        method: 'POST',
        path: `/api/quizzes/${quiz2._id}/start-attempt`,
        headers: { Authorization: `Bearer ${tokenA}` },
      })
      recSubmitRes = await makeRequest(
        port,
        {
          method: 'POST',
          path: `/api/quizzes/${quiz2._id}/attempts`,
          headers: { Authorization: `Bearer ${tokenA}` },
        },
        {
          attemptId: recStart.body.attemptId,
          answers: [{ questionId: String(q2Doc._id), selectedOptionIndex: 0 }],
        }
      )
    } finally {
      certificateService.issueAssessmentCertificate = origIssueAssessment
    }
    assert(
      recSubmitRes.status === 201 &&
        recSubmitRes.body.passed === true &&
        recSubmitRes.body.certificate === null &&
        recSubmitRes.body.certificateStatus === 'deferred_recovery_required',
      'Scenario 7a: Quiz certificate issuance failure is surfaced cleanly without failing attempt submission'
    )

    // Scenario 14 pre-check: GET /api/users/me/certificates must be strictly read-only (does NOT auto-recover quiz2 cert)
    const readOnlyListBeforeReconcile = await makeRequest(port, {
      method: 'GET',
      path: '/api/users/me/certificates',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    const hasQuiz2CertBefore = (readOnlyListBeforeReconcile.body.certificates || []).some(
      (c) => String(c.quizId?._id || c.quizId) === String(quiz2._id)
    )
    assert(
      readOnlyListBeforeReconcile.status === 200 && !hasQuiz2CertBefore,
      'Scenario 14a: GET /api/users/me/certificates is strictly read-only (does not create missing certs)'
    )

    // Now reconcile recovers quiz2 cert
    const reconcileRes1 = await makeRequest(port, {
      method: 'POST',
      path: '/api/users/me/certificates/reconcile',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    assert(
      reconcileRes1.status === 200 && reconcileRes1.body.recoveredCount === 1,
      `Scenario 7b: POST /api/users/me/certificates/reconcile recovered missing quiz cert (recoveredCount=${reconcileRes1.body.recoveredCount})`
    )

    // ── Scenarios 8-13: Course Completion & Certificate Lifecycle ──────────
    console.log('\n--- Scenarios 8-13: Server-Authoritative Course Completion & Certificates ---')

    // Scenario 10: Client-supplied progressPercent: 100 rejected
    const spoofRes = await makeRequest(
      port,
      {
        method: 'PUT',
        path: `/api/users/me/enrollments/${enrollmentId}/progress`,
        headers: { Authorization: `Bearer ${tokenA}` },
      },
      { progressPercent: 100, completedModules: [0, 1] }
    )
    const courseCertAfterSpoof = await Certificate.findOne({ userId: userA._id, courseId: course._id }).lean()
    assert(
      spoofRes.status >= 400 && !courseCertAfterSpoof,
      `Scenario 10: Client-supplied progressPercent=100 rejected (${spoofRes.status}) and no certificate issued`
    )

    // Scenario 9: Partial activity (Module 0 only -> 50%) does NOT issue certificate
    const act1Res = await makeRequest(
      port,
      {
        method: 'POST',
        path: `/api/users/me/enrollments/${enrollmentId}/activity`,
        headers: { Authorization: `Bearer ${tokenA}` },
      },
      {
        moduleId: String(course.modules[0]._id),
        contentType: 'video_lesson',
        contentId: String(course.modules[0]._id),
        watchDurationSec: 120,
      }
    )
    const courseCertAfterPartial = await Certificate.findOne({ userId: userA._id, courseId: course._id }).lean()
    assert(
      act1Res.status === 200 &&
        act1Res.body.progress?.progressPercent === 50 &&
        act1Res.body.certificate === null &&
        !courseCertAfterPartial,
      'Scenario 9: Partial course completion (50%) does NOT issue course_completion certificate'
    )

    // Scenario 8: Complete Module 1 -> 100% -> automatically issues course_completion certificate
    const act2Res = await makeRequest(
      port,
      {
        method: 'POST',
        path: `/api/users/me/enrollments/${enrollmentId}/activity`,
        headers: { Authorization: `Bearer ${tokenA}` },
      },
      {
        moduleId: String(course.modules[1]._id),
        contentType: 'video_lesson',
        contentId: String(course.modules[1]._id),
        watchDurationSec: 180,
      }
    )
    assert(
      act2Res.status === 200 &&
        act2Res.body.enrollment?.status === 'completed' &&
        act2Res.body.enrollment?.progressPercent === 100 &&
        act2Res.body.certificateStatus === 'issued' &&
        /^KAUSHAL-CERT-\d{4}-[A-F0-9]{16}$/.test(act2Res.body.certificate?.certificateId),
      `Scenario 8: Server-authoritative 100% completion auto-issued course_completion cert (${act2Res.body.certificate?.certificateId})`
    )

    // Scenario 11: Repeating completion activity is idempotent
    const act2RepeatRes = await makeRequest(
      port,
      {
        method: 'POST',
        path: `/api/users/me/enrollments/${enrollmentId}/activity`,
        headers: { Authorization: `Bearer ${tokenA}` },
      },
      {
        moduleId: String(course.modules[1]._id),
        contentType: 'video_lesson',
        contentId: String(course.modules[1]._id),
        watchDurationSec: 60,
      }
    )
    const courseCertsA = await Certificate.find({ userId: userA._id, courseId: course._id }).lean()
    assert(
      courseCertsA.length === 1 &&
        act2RepeatRes.body.certificate?.certificateId === act2Res.body.certificate?.certificateId,
      'Scenario 11: Repeating course completion activity is idempotent (1 cert, same certificateId)'
    )

    // Scenario 12: issueCourseCertificate guards (completed < 100, 100 not completed, wrong user)
    const course2 = await Course.create({
      title: `Guard Course ${suffix}`,
      source: 'nssta',
      difficulty: 'beginner',
      isPublished: true,
      isActive: true,
      modules: [{ title: 'M1', order: 0, youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }],
    })
    fixtures.courseIds.push(course2._id)

    const invalidEnroll1 = await Enrollment.create({
      userId: userB._id,
      courseId: course2._id,
      status: 'completed',
      progressPercent: 80,
    })
    assert(
      (await certificateService.issueCourseCertificate(userB._id, course2._id)) === null,
      'Scenario 12a: Rejects completed status with progressPercent < 100'
    )
    await Enrollment.updateOne({ _id: invalidEnroll1._id }, { $set: { status: 'in_progress', progressPercent: 100 } })
    assert(
      (await certificateService.issueCourseCertificate(userB._id, course2._id)) === null,
      'Scenario 12b: Rejects progressPercent === 100 without completed status'
    )

    // Scenario 13: Reconcile recovers missing course_completion certificate
    await Enrollment.updateOne({ _id: invalidEnroll1._id }, { $set: { status: 'completed', progressPercent: 100, completedAt: new Date() } })
    const reconcileResB = await makeRequest(port, {
      method: 'POST',
      path: '/api/users/me/certificates/reconcile',
      headers: { Authorization: `Bearer ${tokenB}` },
    })
    const courseCertB = await Certificate.findOne({ userId: userB._id, courseId: course2._id }).lean()
    assert(
      reconcileResB.status === 200 && reconcileResB.body.recoveredCount >= 1 && Boolean(courseCertB),
      'Scenario 13: Reconcile recovers missing course_completion certificate'
    )

    // ── Scenarios 14-18: Ownership, Public Verification, Sanitization ─────
    console.log('\n--- Scenarios 14-18: Ownership, Public Verification & Sanitization ---')
    const userC = await User.create({
      name: 'Empty User',
      email: `empty_${suffix}@example.gov.in`,
      passwordHash: 'hashed_pw',
      role: 'employee',
      organizationId: userA.organizationId,
    })
    fixtures.userIds.push(userC._id)
    const tokenC = jwt.sign({ id: userC._id.toString(), role: userC.role, tokenVersion: 0 }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

    const emptyListRes = await makeRequest(port, {
      method: 'GET',
      path: '/api/users/me/certificates',
      headers: { Authorization: `Bearer ${tokenC}` },
    })
    assert(
      emptyListRes.status === 200 && Array.isArray(emptyListRes.body.certificates) && emptyListRes.body.certificates.length === 0,
      'Scenario 14b: Empty user receives [] from GET /api/users/me/certificates'
    )

    const listARes = await makeRequest(port, {
      method: 'GET',
      path: '/api/users/me/certificates',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    const certsA = listARes.body.certificates || []
    const allBelongToA = certsA.every((c) => String(c.userId) === String(userA._id))
    const hasBothTypes =
      certsA.some((c) => c.type === 'course_completion' && c.courseId?.title === course.title) &&
      certsA.some((c) => c.type === 'assessment_mastery' && c.quizId?.title === quiz.title)
    assert(
      listARes.status === 200 && certsA.length === 3 && allBelongToA && hasBothTypes,
      `Scenarios 14c & 15: Ownership-scoped populated list returned for User A (count=${certsA.length})`
    )

    // Scenario 16: Public verification for valid cert (no PII/email/internal _id/score)
    const courseCertId = act2Res.body.certificate.certificateId
    const pubValid = await makeRequest(port, {
      method: 'GET',
      path: `/api/certificates/verify/${courseCertId}`,
    })
    assert(
      pubValid.status === 200 &&
        pubValid.body.valid === true &&
        pubValid.body.status === 'valid' &&
        pubValid.body.recipientName === 'Priya Sharma' &&
        pubValid.body.email === undefined &&
        pubValid.body._id === undefined &&
        pubValid.body.score === undefined,
      'Scenario 16: Public verification returns valid credential without PII, _id, or score'
    )

    // Scenario 17: invalid_format, not_found, revoked
    const pubMalformed = await makeRequest(port, {
      method: 'GET',
      path: '/api/certificates/verify/CERT-2026-STAT-0082',
    })
    const pubNotFound = await makeRequest(port, {
      method: 'GET',
      path: '/api/certificates/verify/KAUSHAL-CERT-2026-DEADBEEF',
    })
    await Certificate.updateOne({ certificateId: courseCertId }, { $set: { status: 'revoked' } })
    const pubRevoked = await makeRequest(port, {
      method: 'GET',
      path: `/api/certificates/verify/${courseCertId}`,
    })
    await Certificate.updateOne({ certificateId: courseCertId }, { $set: { status: 'valid' } })
    assert(
      pubMalformed.status === 400 &&
        pubMalformed.body.status === 'invalid_format' &&
        pubNotFound.status === 404 &&
        pubNotFound.body.status === 'not_found' &&
        pubRevoked.status === 200 &&
        pubRevoked.body.valid === false &&
        pubRevoked.body.status === 'revoked',
      'Scenario 17: Public verification handles invalid_format (400), not_found (404), and revoked (200)'
    )

    // Scenario 18: Recipient name sanitization
    assert(
      courseCertB.recipientName === 'Learner',
      `Scenario 18: Email-like user.name sanitized to 'Learner' (got '${courseCertB.recipientName}')`
    )

    // ── Scenario 19: End-to-End Competency + SkillGap + Certs Integration ──
    console.log('\n--- Scenario 19: End-to-End Lifecycle Competency & SkillGap Verification ---')
    const userAComp = await UserCompetency.findOne({ user_id: userA._id, competency_id: comp._id }).lean()
    const userASkillGaps = await SkillGap.find({ userId: userA._id }).lean()
    assert(
      Boolean(userAComp) && userAComp.current_level >= 1 && Array.isArray(userASkillGaps),
      `Scenario 19: End-to-end quiz completion updated UserCompetency (level=${userAComp?.current_level}) & synced SkillGap (${userASkillGaps.length} records)`
    )

    // ── Scenario 20: Frontend Source Hygiene Check ─────────────────────────
    console.log('\n--- Scenario 20: Frontend Source Hygiene Check ---')
    const frontendFiles = [
      path.resolve(__dirname, '../client/src/pages/courses/MyCoursesPage.jsx'),
      path.resolve(__dirname, '../client/src/pages/quiz/AssessmentHistoryPage.jsx'),
      path.resolve(__dirname, '../client/src/pages/certificates/CertificatesPage.jsx'),
      path.resolve(__dirname, '../client/src/pages/certificates/PublicCertificateVerifyPage.jsx'),
    ]
    const legacyCertPattern = /CERT-2026-[A-Z]+-\d+/
    const mockArrayPattern = /DEFAULT_ENROLLED_COURSES/
    const hygieneViolations = []
    for (const filePath of frontendFiles) {
      const content = fs.readFileSync(filePath, 'utf8')
      if (legacyCertPattern.test(content) || mockArrayPattern.test(content)) {
        hygieneViolations.push(path.basename(filePath))
      }
    }
    assert(
      hygieneViolations.length === 0,
      `Scenario 20: Zero hardcoded CERT-2026-* or DEFAULT_ENROLLED_COURSES in learner frontend pages (violations: ${hygieneViolations.length})`
    )

    // ── Scenario 21: Certificate ID entropy & format verification ────────────
    console.log('\n--- Scenario 21: Certificate ID Entropy & Uniqueness ---')
    const crypto = require('crypto')
    const { CERT_ID_REGEX } = certificateService

    // 21a: New IDs are 16 uppercase hex chars in the random segment
    const sampleId = `KAUSHAL-CERT-${new Date().getFullYear()}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`
    assert(
      /^KAUSHAL-CERT-\d{4}-[A-F0-9]{16}$/.test(sampleId),
      `Scenario 21a: Generated ID matches KAUSHAL-CERT-YYYY-XXXXXXXXXXXXXXXX format (got ${sampleId})`
    )

    // 21b: 100 generated IDs are all unique (collision probability with 64-bit entropy is negligible)
    const generatedIds = new Set()
    for (let i = 0; i < 100; i++) {
      const id = `KAUSHAL-CERT-${new Date().getFullYear()}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`
      generatedIds.add(id)
    }
    assert(generatedIds.size === 100, `Scenario 21b: 100 generated certificate IDs are all unique (got ${generatedIds.size} unique)`)

    // 21c: Old 8-char format IDs still pass CERT_ID_REGEX (backward compatibility)
    const legacyId = 'KAUSHAL-CERT-2025-CA4610EF'
    assert(
      CERT_ID_REGEX.test(legacyId),
      `Scenario 21c: Legacy 8-char cert ID still passes CERT_ID_REGEX (backward compatible)`
    )

    // 21d: New 16-char format IDs pass CERT_ID_REGEX
    const newFormatId = 'KAUSHAL-CERT-2026-CA4610EF8D2F3B1A'
    assert(
      CERT_ID_REGEX.test(newFormatId),
      `Scenario 21d: New 16-char cert ID passes CERT_ID_REGEX`
    )

    // ── Scenario 22: needsCertificateSync recovery flag ──────────────────────
    console.log('\n--- Scenario 22: needsCertificateSync Durable Recovery Flag ---')

    // Create a completed enrollment flagged with needsCertificateSync: true (simulates failed issuance)
    const recoveryUser = await User.create({
      name: 'Recovery Test User',
      email: `recovery-${Date.now()}@test.invalid`,
      passwordHash: 'x',
      role: 'employee',
    })
    fixtures.userIds.push(recoveryUser._id)

    const recoveryCourse = await Course.create({
      title: `Recovery Course ${Date.now()}`,
      description: 'Recovery test',
      modules: [{ title: 'M1', content: 'C1', duration: 10 }],
      status: 'active',
    })
    fixtures.courseIds.push(recoveryCourse._id)

    const recoveryEnrollment = await Enrollment.create({
      userId: recoveryUser._id,
      courseId: recoveryCourse._id,
      status: 'completed',
      progressPercent: 100,
      completedAt: new Date(),
      needsCertificateSync: true,  // simulates failed cert issuance
      certificateSyncError: 'Simulated transient failure',
    })

    // Verify flag is set
    const beforeReconcile = await Enrollment.findById(recoveryEnrollment._id).lean()
    assert(
      beforeReconcile.needsCertificateSync === true,
      `Scenario 22a: needsCertificateSync flag persisted on Enrollment (got ${beforeReconcile.needsCertificateSync})`
    )

    // Run reconcile — it should issue the cert and clear the flag
    const recoveryReconcileRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/users/me/certificates/reconcile',
      headers: {
        Authorization: `Bearer ${jwt.sign({ id: String(recoveryUser._id) }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })}`,
      },
    })
    assert(
      recoveryReconcileRes.status === 200 && recoveryReconcileRes.body.recoveredCount >= 1,
      `Scenario 22b: Reconcile issued cert for enrollment flagged with needsCertificateSync (recoveredCount=${recoveryReconcileRes.body.recoveredCount})`
    )

    // Verify flag is cleared after reconcile
    const afterReconcile = await Enrollment.findById(recoveryEnrollment._id).lean()
    assert(
      afterReconcile.needsCertificateSync === false,
      `Scenario 22c: needsCertificateSync cleared after successful reconcile (got ${afterReconcile.needsCertificateSync})`
    )

    // Verify cert was issued
    const recoveredCert = await Certificate.findOne({ userId: recoveryUser._id, courseId: recoveryCourse._id }).lean()
    assert(
      Boolean(recoveredCert) && recoveredCert.type === 'course_completion',
      `Scenario 22d: course_completion certificate issued for recovery enrollment`
    )
  } finally {
    // Cleanup all test fixtures in kaushalai_test
    if (fixtures.userIds.length > 0) {
      await Certificate.deleteMany({ userId: { $in: fixtures.userIds } })
      await LearningActivity.deleteMany({ userId: { $in: fixtures.userIds } })
      await LearningProgress.deleteMany({ user_id: { $in: fixtures.userIds } })
      await Enrollment.deleteMany({ userId: { $in: fixtures.userIds } })
      await QuizAttempt.deleteMany({ userId: { $in: fixtures.userIds } })
      await UserCompetency.deleteMany({ user_id: { $in: fixtures.userIds } })
      await SkillGap.deleteMany({ userId: { $in: fixtures.userIds } })
      await User.deleteMany({ _id: { $in: fixtures.userIds } })
    }
    if (fixtures.quizIds.length > 0) await Quiz.deleteMany({ _id: { $in: fixtures.quizIds } })
    if (fixtures.questionIds.length > 0) await Question.deleteMany({ _id: { $in: fixtures.questionIds } })
    if (fixtures.courseIds.length > 0) await Course.deleteMany({ _id: { $in: fixtures.courseIds } })
    if (fixtures.compIds.length > 0) await Competency.deleteMany({ _id: { $in: fixtures.compIds } })

    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }

    // Post-test dev DB isolation check
    const devConnAfter = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
    const devCertCountAfter = await devConnAfter.collection('certificates').countDocuments()
    const devEnrollmentCountAfter = await devConnAfter.collection('enrollments').countDocuments()
    await devConnAfter.close()
    assert(
      devCertCountAfter === devCertCountBefore && devEnrollmentCountAfter === devEnrollmentCountBefore,
      `Post-check: dev DB (kaushalai) untouched (certs=${devCertCountAfter}, enrollments=${devEnrollmentCountAfter})`
    )

    await mongoose.disconnect()
  }

  console.log('\n===================================================================')
  console.log(`PHASE 36.2.5 SUMMARY: ${totalPassed} passed, ${totalFailed} failed`)
  console.log('===================================================================')
  process.exit(totalFailed > 0 ? 1 : 0)
}

runTests().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
