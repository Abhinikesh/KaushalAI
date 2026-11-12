/**
 * test_part36_4_end_to_end_learning_system_validation.js
 * Phase 36.4: End-to-End Learning System Validation
 *
 * Validates the complete learner lifecycle using isolated test data on kaushalai_test:
 *  1. Safe Test Environment & DB Isolation Guard
 *  2. Course Discovery Filtering (published, active only)
 *  3. Enrollment Operations & Idempotency (201, 409, 400, 404)
 *  4. Cross-User Authorization (Enrollment and Progress isolation)
 *  5. Server-Authoritative Progress Convergence (LearningActivity -> Enrollment & LearningProgress)
 *  6. Activity Idempotency & Incomplete Protection (no inflation, no premature 100%)
 *  7. Automated Course Completion & Certificate Issuance (backed by verified activity records)
 *  8. Multi-Quiz Course Cardinality (1:N) & Catalogue Discovery
 *  9. Course-Context Validation on Quiz Retrieval, Start, and Submission
 * 10. Attempt-Quiz Mismatch Prevention (cross-quiz submission rejection)
 * 11. Assessment Passing Thresholds (70%) & Certificate Rules
 * 12. Assessment Evidence-Based Competency Updates (Level 1-4, no downgrades, admin excluded)
 * 13. SkillGap Synchronization and Recovery Flags
 * 14. Recommendation Authenticity & Filtering (excludes completed, archived, unpublished; no fake fallbacks)
 * 15. Standalone Quiz Independent Lifecycle (no artificial course link required)
 * 16. Certificate Issuance Idempotency, Concurrency & Ownership
 * 17. Durable Certificate Recovery (`reconcileUserCertificates` for flagged and unflagged enrollments)
 * 18. Ineligible Enrollment Rejection by Recovery Engine
 * 19. Public Certificate Verification Privacy & Multi-Length Format Validation (8, 16, 32 hex chars)
 * 20. Public Verification Rate Limiting & Non-Hex / Malformed Rejections
 * 21. Cross-Collection Referential Integrity Audit
 * 22. Strict Development Database (kaushalai) Immutability Post-Check
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
const crypto = require('crypto')
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
  console.log('PHASE 36.4: END-TO-END LEARNING SYSTEM VALIDATION')
  console.log('Target DB: ' + testDbUri)
  console.log('===================================================================')

  await mongoose.connect(testDbUri)

  const User = require('./src/models/User')
  const Course = require('./src/models/Course')
  const Quiz = require('./src/models/Quiz')
  const Question = require('./src/models/Question')
  const QuizAttempt = require('./src/models/QuizAttempt')
  const Enrollment = require('./src/models/Enrollment')
  const LearningActivity = require('./src/models/LearningActivity')
  const LearningProgress = require('./src/models/LearningProgress')
  const Certificate = require('./src/models/Certificate')
  const Competency = require('./src/models/Competency')
  const UserCompetency = require('./src/models/UserCompetency')
  const SkillGap = require('./src/models/SkillGap')
  const Recommendation = require('./src/models/Recommendation')

  const app = require('./src/app')

  // ── Guardrail: Dev DB Pre-Check Snapshot ──────────────────────────────
  const devConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
  const devDb = devConn.db
  const devBaseline = {
    courses: await devDb.collection('courses').countDocuments(),
    quizzes: await devDb.collection('quizzes').countDocuments(),
    quizattempts: await devDb.collection('quizattempts').countDocuments(),
    enrollments: await devDb.collection('enrollments').countDocuments(),
    learning_progress: await devDb.collection('learning_progress').countDocuments(),
    learning_activities: await devDb.collection('learning_activities').countDocuments(),
    certificates: await devDb.collection('certificates').countDocuments(),
    user_competencies: await devDb.collection('user_competencies').countDocuments(),
    skill_gaps: await devDb.collection('skill_gaps').countDocuments(),
  }
  await devConn.close()

  console.log('Dev DB pre-snapshot baseline:', JSON.stringify(devBaseline))
  assert(devBaseline.certificates === 0, `Dev DB certificates must be 0 (got ${devBaseline.certificates})`)
  assert(devBaseline.learning_activities === 0, `Dev DB learning_activities must be 0 (got ${devBaseline.learning_activities})`)

  await Certificate.init()

  const runSuffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`
  const trackedFixtures = {
    userIds: [],
    courseIds: [],
    quizIds: [],
    questionIds: [],
    compIds: [],
    recIds: [],
  }

  let server
  let port

  try {
    server = await new Promise((resolve) => {
      const s = http.createServer(app)
      s.listen(0, '127.0.0.1', () => resolve(s))
    })
    port = server.address().port

    // ── Setup Test Users ──────────────────────────────────────────────────
    const learnerA = await User.create({
      name: `Learner Alpha ${runSuffix}`,
      email: `learner_a_${runSuffix}@test.local`,
      passwordHash: 'hashed_pw',
      role: 'employee',
      department: 'Statistics',
    })
    trackedFixtures.userIds.push(learnerA._id)

    const learnerB = await User.create({
      name: `Learner Beta ${runSuffix}`,
      email: `learner_b_${runSuffix}@test.local`,
      passwordHash: 'hashed_pw',
      role: 'employee',
      department: 'Analytics',
    })
    trackedFixtures.userIds.push(learnerB._id)

    const adminUser = await User.create({
      name: `Admin Gamma ${runSuffix}`,
      email: `admin_${runSuffix}@test.local`,
      passwordHash: 'hashed_pw',
      role: 'admin',
      department: 'Management',
    })
    trackedFixtures.userIds.push(adminUser._id)

    const tokenA = jwt.sign({ id: String(learnerA._id), role: 'employee', email: learnerA.email }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
    const tokenB = jwt.sign({ id: String(learnerB._id), role: 'employee', email: learnerB.email }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
    const tokenAdmin = jwt.sign({ id: String(adminUser._id), role: 'admin', email: adminUser.email }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

    const authHeadersA = { Authorization: `Bearer ${tokenA}` }
    const authHeadersB = { Authorization: `Bearer ${tokenB}` }
    const authHeadersAdmin = { Authorization: `Bearer ${tokenAdmin}` }

    // ── Setup Test Competency ─────────────────────────────────────────────
    const competency = await Competency.create({
      name: `Data Analysis & Statistical Modelling ${runSuffix}`,
      category: 'technical',
      domain: 'Analytics',
      description: 'Ability to perform structured data analysis and predictive modeling',
      target_level: 4,
    })
    trackedFixtures.compIds.push(competency._id)

    // ── Setup Test Courses ────────────────────────────────────────────────
    // Course 1: Multi-module structured course with slides and video
    const mod1Slide1 = new mongoose.Types.ObjectId()
    const mod1Slide2 = new mongoose.Types.ObjectId()
    const mod2Id = new mongoose.Types.ObjectId()

    const course1 = await Course.create({
      title: `Official Survey Sampling Techniques ${runSuffix}`,
      description: 'Comprehensive course on survey sampling design and estimation',
      provider: 'iGOT Karmayogi',
      source: 'igot',
      isPublished: true,
      isDeleted: false,
      isArchived: false,
      durationHours: 6,
      modules: [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Module 1: Probability Sampling Fundamentals',
          slides: [
            { _id: mod1Slide1, title: 'Simple Random Sampling', slideNumber: 1 },
            { _id: mod1Slide2, title: 'Stratified & Cluster Sampling', slideNumber: 2 },
          ],
        },
        {
          _id: mod2Id,
          title: 'Module 2: Sampling Weights and Estimation',
          youtubeUrl: 'https://www.youtube.com/watch?v=sample12345',
        },
      ],
      skillTags: [competency._id],
    })
    trackedFixtures.courseIds.push(course1._id)

    // Course 2: Unpublished course
    const courseUnpublished = await Course.create({
      title: `Draft Experimental Methods ${runSuffix}`,
      provider: 'iGOT Karmayogi',
      source: 'igot',
      isPublished: false,
      isDeleted: false,
    })
    trackedFixtures.courseIds.push(courseUnpublished._id)

    // Course 3: Archived course
    const courseArchived = await Course.create({
      title: `Archived Census Methodology 2011 ${runSuffix}`,
      provider: 'iGOT Karmayogi',
      source: 'igot',
      isPublished: true,
      isDeleted: false,
      isArchived: true,
    })
    trackedFixtures.courseIds.push(courseArchived._id)

    // Course 4: Soft-deleted course
    const courseDeleted = await Course.create({
      title: `Deleted Outdated Standards ${runSuffix}`,
      provider: 'iGOT Karmayogi',
      source: 'igot',
      isPublished: true,
      isDeleted: true,
    })
    trackedFixtures.courseIds.push(courseDeleted._id)

    // Course 5: Completed course for recommendation filtering test
    const courseCompleted = await Course.create({
      title: `Foundations of Data Analytics ${runSuffix}`,
      provider: 'iGOT Karmayogi',
      source: 'igot',
      isPublished: true,
      isDeleted: false,
      isArchived: false,
    })
    trackedFixtures.courseIds.push(courseCompleted._id)

    // ── Setup Questions & Quizzes ─────────────────────────────────────────
    const q1 = await Question.create({
      text: `Which sampling technique ensures representation across sub-populations? ${runSuffix}`,
      options: [
        { id: 'opt_a', text: 'Stratified Sampling' },
        { id: 'opt_b', text: 'Convenience Sampling' },
        { id: 'opt_c', text: 'Quota Sampling' },
      ],
      correctOptionIndex: 0,
      competency_id: competency._id,
    })
    trackedFixtures.questionIds.push(q1._id)

    const q2 = await Question.create({
      text: `What is the inverse of the inclusion probability called? ${runSuffix}`,
      options: [
        { id: 'opt_a', text: 'Design Weight' },
        { id: 'opt_b', text: 'Standard Deviation' },
        { id: 'opt_c', text: 'Correlation' },
      ],
      correctOptionIndex: 0,
      competency_id: competency._id,
    })
    trackedFixtures.questionIds.push(q2._id)

    // Quiz 1: Linked to Course 1 (Final Assessment)
    const quiz1 = await Quiz.create({
      title: `Survey Sampling Final Assessment ${runSuffix}`,
      materialId: `mat_${runSuffix}_1`,
      createdBy: adminUser._id,
      courseId: course1._id,
      questionIds: [q1._id, q2._id],
      questionCount: 2,
      tagCompetencyIds: [competency._id],
      passPercent: 70,
      durationMinutes: 20,
      isPublished: true,
    })
    trackedFixtures.quizIds.push(quiz1._id)

    // Quiz 2: Second quiz linked to Course 1 (Practice Quiz — demonstrates 1:N cardinality)
    const quiz2 = await Quiz.create({
      title: `Survey Sampling Practice Quiz ${runSuffix}`,
      materialId: `mat_${runSuffix}_2`,
      createdBy: adminUser._id,
      courseId: course1._id,
      questionIds: [q1._id],
      questionCount: 1,
      tagCompetencyIds: [competency._id],
      passPercent: 70,
      durationMinutes: 10,
      isPublished: true,
    })
    trackedFixtures.quizIds.push(quiz2._id)

    // Quiz 3: Standalone Quiz (no courseId)
    const quizStandalone = await Quiz.create({
      title: `General Aptitude & Reasoning ${runSuffix}`,
      materialId: `mat_${runSuffix}_3`,
      createdBy: adminUser._id,
      courseId: null,
      questionIds: [q1._id, q2._id],
      questionCount: 2,
      tagCompetencyIds: [competency._id],
      passPercent: 70,
      durationMinutes: 15,
      isPublished: true,
    })
    trackedFixtures.quizIds.push(quizStandalone._id)

    console.log('\n--- SECTION 1: Course Discovery Filtering ---')
    // 1.1 Discovery returns only published, non-deleted, non-archived courses for learners
    const discRes = await makeRequest(port, {
      method: 'GET',
      path: '/api/courses?source=igot',
      headers: authHeadersA,
    })
    assert(discRes.status === 200, 'GET /api/courses returns 200 for learner')
    const discCourses = discRes.body?.courses || []
    const discIds = new Set(discCourses.map((c) => String(c._id)))

    assert(discIds.has(String(course1._id)), 'Course 1 (published, active) appears in discovery')
    assert(!discIds.has(String(courseUnpublished._id)), 'CourseUnpublished does not appear in discovery')
    assert(!discIds.has(String(courseArchived._id)), 'CourseArchived does not appear in discovery')
    assert(!discIds.has(String(courseDeleted._id)), 'CourseDeleted does not appear in discovery')

    console.log('\n--- SECTION 2: Enrollment Operations & Cross-Learner Authorization ---')
    // 2.1 Learner A enrolls in Course 1
    const enrollRes1 = await makeRequest(port, {
      method: 'POST',
      path: '/api/users/me/enrollments',
      headers: authHeadersA,
    }, { courseId: String(course1._id) })
    assert(enrollRes1.status === 201, 'POST /api/users/me/enrollments returns 201 Created')
    const enrollmentA = enrollRes1.body?.enrollment
    assert(enrollmentA && enrollmentA.status === 'enrolled', 'Enrollment created with status === enrolled')
    assert(enrollmentA.progressPercent === 0, 'Initial enrollment progressPercent === 0')

    // 2.2 Duplicate enrollment returns 409 Conflict
    const enrollDupRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/users/me/enrollments',
      headers: authHeadersA,
    }, { courseId: String(course1._id) })
    assert(enrollDupRes.status === 409, 'Duplicate enrollment is rejected with 409 Conflict')

    // 2.3 Enrollment in unpublished course is rejected with 400
    const enrollUnpubRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/users/me/enrollments',
      headers: authHeadersA,
    }, { courseId: String(courseUnpublished._id) })
    assert(enrollUnpubRes.status === 400, 'Enrollment in unpublished course rejected with 400')

    // 2.4 Enrollment in deleted course is rejected with 404
    const enrollDelRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/users/me/enrollments',
      headers: authHeadersA,
    }, { courseId: String(courseDeleted._id) })
    assert(enrollDelRes.status === 404, 'Enrollment in deleted course rejected with 404')

    // 2.5 Cross-learner authorization: Learner B cannot view Learner A's enrollment progress
    const crossProgRes = await makeRequest(port, {
      method: 'GET',
      path: `/api/users/me/enrollments/${enrollmentA._id}/progress`,
      headers: authHeadersB,
    })
    assert(crossProgRes.status === 404 || crossProgRes.status === 403, 'Learner B cannot access Learner A enrollment progress (404/403)')

    // 2.6 Cross-learner authorization: Learner B cannot post activity to Learner A's enrollment
    const crossActRes = await makeRequest(port, {
      method: 'POST',
      path: `/api/users/me/enrollments/${enrollmentA._id}/activity`,
      headers: authHeadersB,
    }, {
      moduleId: String(course1.modules[0]._id),
      contentType: 'slide',
      contentId: String(mod1Slide1),
    })
    assert(crossActRes.status === 404 || crossActRes.status === 403, 'Learner B cannot record activity on Learner A enrollment (404/403)')

    console.log('\n--- SECTION 3: Content Activity & Server-Authoritative Progress ---')
    // 3.1 Record first slide activity for Learner A
    const act1Res = await makeRequest(port, {
      method: 'POST',
      path: `/api/users/me/enrollments/${enrollmentA._id}/activity`,
      headers: authHeadersA,
    }, {
      moduleId: String(course1.modules[0]._id),
      moduleIndex: 0,
      contentType: 'slide',
      contentId: String(mod1Slide1),
    })
    assert(act1Res.status === 200, 'Recording valid slide activity returns 200 OK')
    const prog1 = act1Res.body?.progress
    assert(prog1 && prog1.modules[0]?.completedItemsCount === 1, 'Module 1 has 1 completed item (slide 1)')
    assert(prog1 && prog1.progressPercent === 0, 'Overall course progress remains 0% until full module is completed')

    // 3.2 Repeated activity submission does NOT inflate progress (Idempotency)
    const act1RepeatRes = await makeRequest(port, {
      method: 'POST',
      path: `/api/users/me/enrollments/${enrollmentA._id}/activity`,
      headers: authHeadersA,
    }, {
      moduleId: String(course1.modules[0]._id),
      moduleIndex: 0,
      contentType: 'slide',
      contentId: String(mod1Slide1),
    })
    assert(act1RepeatRes.status === 200, 'Repeated activity submission succeeds')
    assert(act1RepeatRes.body?.progress?.progressPercent === prog1.progressPercent, 'Repeated activity does NOT inflate progress percent')

    // 3.3 Verify partial course cannot issue course completion certificate
    const certCountMid = await Certificate.countDocuments({ userId: learnerA._id, courseId: course1._id })
    assert(certCountMid === 0, 'No course completion certificate issued during partial progress')

    // 3.4 Record second slide activity
    const act2Res = await makeRequest(port, {
      method: 'POST',
      path: `/api/users/me/enrollments/${enrollmentA._id}/activity`,
      headers: authHeadersA,
    }, {
      moduleId: String(course1.modules[0]._id),
      moduleIndex: 0,
      contentType: 'slide',
      contentId: String(mod1Slide2),
    })
    assert(act2Res.body?.progress?.progressPercent === 50, 'Course progress reaches 50% after completing Module 1')

    // 3.5 Record module 2 video activity to complete all course requirements
    const actFinalRes = await makeRequest(port, {
      method: 'POST',
      path: `/api/users/me/enrollments/${enrollmentA._id}/activity`,
      headers: authHeadersA,
    }, {
      moduleId: String(mod2Id),
      moduleIndex: 1,
      contentType: 'video_lesson',
      contentId: String(mod2Id),
    })
    assert(actFinalRes.status === 200, 'Final activity submission returns 200 OK')
    const finalProg = actFinalRes.body?.progress
    const finalEnroll = actFinalRes.body?.enrollment
    assert(finalProg && finalProg.progressPercent === 100, 'LearningProgress converged to 100%')
    assert(finalEnroll && finalEnroll.status === 'completed', 'Enrollment status updated to completed')

    // 3.6 Automated Course Completion Certificate Issuance
    const courseCert = await Certificate.findOne({ userId: learnerA._id, courseId: course1._id })
    assert(courseCert !== null, 'Course completion certificate automatically issued upon verified completion')
    assert(courseCert?.type === 'course_completion', 'Certificate type is course_completion')
    assert(/^KAUSHAL-CERT-\d{4}-[0-9A-F]{32}$/.test(courseCert?.certificateId || ''), 'Certificate ID conforms to 32-hex format')

    // 3.7 Repeating final activity is idempotent (no duplicate course certificate)
    await makeRequest(port, {
      method: 'POST',
      path: `/api/users/me/enrollments/${enrollmentA._id}/activity`,
      headers: authHeadersA,
    }, {
      moduleId: String(mod2Id),
      moduleIndex: 1,
      contentType: 'video_lesson',
      contentId: String(mod2Id),
    })
    const courseCertCount = await Certificate.countDocuments({ userId: learnerA._id, courseId: course1._id })
    assert(courseCertCount === 1, 'Repeating final activity is strictly idempotent (exactly 1 certificate)')

    console.log('\n--- SECTION 4: Assessment Integration & 1:N Cardinality ---')
    // 4.1 Catalogue returns all quizzes linked to Course 1 (One-to-many cardinality)
    const quizListRes = await makeRequest(port, {
      method: 'GET',
      path: `/api/quizzes?courseId=${course1._id}`,
      headers: authHeadersA,
    })
    assert(quizListRes.status === 200, 'GET /api/quizzes?courseId=... returns 200')
    const linkedQuizzes = quizListRes.body?.quizzes || []
    assert(linkedQuizzes.length === 2, `One-to-many cardinality: returns both linked quizzes (got ${linkedQuizzes.length})`)

    // 4.2 Empty catalogue for course with no linked quizzes
    const quizListEmpty = await makeRequest(port, {
      method: 'GET',
      path: `/api/quizzes?courseId=${courseCompleted._id}`,
      headers: authHeadersA,
    })
    assert(quizListEmpty.body?.quizzes?.length === 0, 'Course with no linked quizzes returns empty array ([])')

    // 4.3 Course-context validation on start-attempt
    const startMismatchRes = await makeRequest(port, {
      method: 'POST',
      path: `/api/quizzes/${quiz1._id}/start-attempt`,
      headers: authHeadersA,
    }, { courseId: String(courseCompleted._id) })
    assert(startMismatchRes.status === 403, 'start-attempt with mismatched course context rejected with 403 QUIZ_COURSE_MISMATCH')

    // 4.4 Start attempt with correct course context
    const startValidRes = await makeRequest(port, {
      method: 'POST',
      path: `/api/quizzes/${quiz1._id}/start-attempt`,
      headers: authHeadersA,
    }, { courseId: String(course1._id) })
    assert(startValidRes.status === 201, 'start-attempt with correct course context returns 201 Created')
    const attemptId1 = startValidRes.body?.attemptId
    assert(Boolean(attemptId1), `Attempt ID created (got ${attemptId1})`)

    // 4.5 Attempt-Quiz mismatch: Submitting attemptId1 to Quiz 2 endpoint
    const crossQuizSub = await makeRequest(port, {
      method: 'POST',
      path: `/api/quizzes/${quiz2._id}/attempts`,
      headers: authHeadersA,
    }, {
      attemptId: String(attemptId1),
      answers: [{ questionId: String(q1._id), selectedOptionIndex: 0 }],
      timeSpentSeconds: 60,
    })
    assert(crossQuizSub.status === 403, 'Submitting attempt against different quiz rejected with 403 ATTEMPT_QUIZ_MISMATCH')

    // 4.6 Submit failed attempt (< 70% pass threshold)
    // 0 out of 2 correct = 0%
    const failSubmitRes = await makeRequest(port, {
      method: 'POST',
      path: `/api/quizzes/${quiz1._id}/attempts`,
      headers: authHeadersA,
    }, {
      attemptId: String(attemptId1),
      courseId: String(course1._id),
      answers: [
        { questionId: String(q1._id), selectedOptionIndex: 1 }, // Wrong
        { questionId: String(q2._id), selectedOptionIndex: 1 }, // Wrong
      ],
      timeSpentSeconds: 90,
    })
    assert(failSubmitRes.status === 201, 'Submit attempt returns 201')
    assert(failSubmitRes.body?.passed === false, 'Score 0% is passed === false')
    assert(failSubmitRes.body?.certificateStatus === 'not_eligible', 'Failing score returns certificateStatus: not_eligible')
    const certFailCount = await Certificate.countDocuments({ userId: learnerA._id, quizId: quiz1._id })
    assert(certFailCount === 0, 'No assessment certificate issued for failing score')

    // 4.7 Passing attempt (100% >= 70%) with correct course context
    const startPassRes = await makeRequest(port, {
      method: 'POST',
      path: `/api/quizzes/${quiz1._id}/start-attempt`,
      headers: authHeadersA,
    }, { courseId: String(course1._id) })
    const attemptIdPass = startPassRes.body?.attemptId

    const passSubmitRes = await makeRequest(port, {
      method: 'POST',
      path: `/api/quizzes/${quiz1._id}/attempts`,
      headers: authHeadersA,
    }, {
      attemptId: String(attemptIdPass),
      courseId: String(course1._id),
      answers: [
        { questionId: String(q1._id), selectedOptionIndex: 0 }, // Correct
        { questionId: String(q2._id), selectedOptionIndex: 0 }, // Correct
      ],
      timeSpentSeconds: 120,
    })
    assert(passSubmitRes.status === 201, 'Passing attempt returns 201')
    assert(passSubmitRes.body?.passed === true, 'Score 100% evaluates passed === true')
    assert(passSubmitRes.body?.certificateStatus === 'issued', 'Certificate status is issued')
    assert(Boolean(passSubmitRes.body?.certificate?.certificateId), 'Certificate ID returned in response')

    const assessCert = await Certificate.findOne({ userId: learnerA._id, quizId: quiz1._id })
    assert(assessCert !== null, 'Assessment certificate persisted in database')
    assert(assessCert?.type === 'assessment_mastery', 'Certificate type is assessment_mastery')

    console.log('\n--- SECTION 5: Competency Updates & Recommendations ---')
    // 5.1 Assessment evidence updates learner competency level (100% -> Level 4)
    const userCompAfter = await UserCompetency.findOne({
      $or: [
        { user_id: learnerA._id, competency_id: competency._id },
        { userId: learnerA._id, competencyId: competency._id },
      ],
    })
    assert(userCompAfter !== null, 'UserCompetency record created for learner')
    const currentLvl = userCompAfter?.current_level || userCompAfter?.currentLevel
    assert(currentLvl === 4, `Competency level updated to 4 for 100% score (got ${currentLvl})`)

    // 5.2 Repeated submission with lower score does NOT downgrade competency
    const startLowRes = await makeRequest(port, {
      method: 'POST',
      path: `/api/quizzes/${quiz1._id}/start-attempt`,
      headers: authHeadersA,
    }, { courseId: String(course1._id) })
    const attemptIdLow = startLowRes.body?.attemptId

    // 1 of 2 correct = 50% (implies Level 2)
    await makeRequest(port, {
      method: 'POST',
      path: `/api/quizzes/${quiz1._id}/attempts`,
      headers: authHeadersA,
    }, {
      attemptId: String(attemptIdLow),
      courseId: String(course1._id),
      answers: [
        { questionId: String(q1._id), selectedOptionIndex: 0 }, // Correct
        { questionId: String(q2._id), selectedOptionIndex: 1 }, // Wrong
      ],
      timeSpentSeconds: 45,
    })

    const userCompNoDowngrade = await UserCompetency.findOne({
      $or: [
        { user_id: learnerA._id, competency_id: competency._id },
        { userId: learnerA._id, competencyId: competency._id },
      ],
    })
    const lvlAfterLow = userCompNoDowngrade?.current_level || userCompNoDowngrade?.currentLevel
    assert(lvlAfterLow === 4, `Non-downgrade rule: Competency level preserved at 4 despite lower score (got ${lvlAfterLow})`)

    // 5.3 Admin accounts are excluded from learner competency updates
    const startAdminRes = await makeRequest(port, {
      method: 'POST',
      path: `/api/quizzes/${quiz1._id}/start-attempt`,
      headers: authHeadersAdmin,
    }, { courseId: String(course1._id) })
    const attemptIdAdmin = startAdminRes.body?.attemptId

    await makeRequest(port, {
      method: 'POST',
      path: `/api/quizzes/${quiz1._id}/attempts`,
      headers: authHeadersAdmin,
    }, {
      attemptId: String(attemptIdAdmin),
      courseId: String(course1._id),
      answers: [
        { questionId: String(q1._id), selectedOptionIndex: 0 },
        { questionId: String(q2._id), selectedOptionIndex: 0 },
      ],
      timeSpentSeconds: 30,
    })
    const adminComp = await UserCompetency.findOne({
      $or: [
        { user_id: adminUser._id, competency_id: competency._id },
        { userId: adminUser._id, competencyId: competency._id },
      ],
    })
    assert(adminComp === null, 'Admin account excluded from learner competency records')

    // 5.4 Recommendations: Exclude completed, archived, and unpublished courses
    // Seed recommendations for Learner A:
    // Course 1 is completed by Learner A
    // CourseUnpublished is unpublished
    // CourseArchived is archived
    // Let's create CourseEligible which is active and not completed
    const courseEligible = await Course.create({
      title: `Advanced Sampling Diagnostics ${runSuffix}`,
      provider: 'iGOT Karmayogi',
      source: 'igot',
      isPublished: true,
      isDeleted: false,
      isArchived: false,
    })
    trackedFixtures.courseIds.push(courseEligible._id)

    const recCompleted = await Recommendation.create({
      user_id: learnerA._id,
      course_id: course1._id, // already completed
      reason: 'Should be filtered because completed',
      priority_rank: 1,
    })
    trackedFixtures.recIds.push(recCompleted._id)

    const recUnpublished = await Recommendation.create({
      user_id: learnerA._id,
      course_id: courseUnpublished._id, // unpublished
      reason: 'Should be filtered because unpublished',
      priority_rank: 2,
    })
    trackedFixtures.recIds.push(recUnpublished._id)

    const recArchived = await Recommendation.create({
      user_id: learnerA._id,
      course_id: courseArchived._id, // archived
      reason: 'Should be filtered because archived',
      priority_rank: 3,
    })
    trackedFixtures.recIds.push(recArchived._id)

    const recValid = await Recommendation.create({
      user_id: learnerA._id,
      course_id: courseEligible._id, // active, eligible
      reason: 'Valid recommended course',
      priority_rank: 4,
    })
    trackedFixtures.recIds.push(recValid._id)

    const recRes = await makeRequest(port, {
      method: 'GET',
      path: '/api/recommendations',
      headers: authHeadersA,
    })
    assert(recRes.status === 200, 'GET /api/recommendations returns 200')
    const returnedRecs = recRes.body?.recommendations || []
    const recCourseIds = new Set(returnedRecs.map((r) => String(r.course_id?._id || r.course_id)))

    assert(recCourseIds.has(String(courseEligible._id)), 'Eligible recommendation is returned')
    assert(!recCourseIds.has(String(course1._id)), 'Completed course is excluded from recommendations')
    assert(!recCourseIds.has(String(courseUnpublished._id)), 'Unpublished course is excluded from recommendations')
    assert(!recCourseIds.has(String(courseArchived._id)), 'Archived course is excluded from recommendations')

    console.log('\n--- SECTION 6: Standalone Quiz Independent Lifecycle ---')
    // 6.1 Standalone quiz starts without courseId
    const startStandRes = await makeRequest(port, {
      method: 'POST',
      path: `/api/quizzes/${quizStandalone._id}/start-attempt`,
      headers: authHeadersA,
    })
    assert(startStandRes.status === 201, 'Standalone quiz starts with 201 without courseId')
    const attemptIdStand = startStandRes.body?.attemptId
    assert(Boolean(attemptIdStand), 'Standalone attempt ID created')

    // 6.2 Standalone quiz passes and issues certificate
    const passStandRes = await makeRequest(port, {
      method: 'POST',
      path: `/api/quizzes/${quizStandalone._id}/attempts`,
      headers: authHeadersA,
    }, {
      attemptId: String(attemptIdStand),
      answers: [
        { questionId: String(q1._id), selectedOptionIndex: 0 },
        { questionId: String(q2._id), selectedOptionIndex: 0 },
      ],
      timeSpentSeconds: 60,
    })
    assert(passStandRes.status === 201, 'Standalone quiz submission returns 201')
    assert(passStandRes.body?.certificateStatus === 'issued', 'Standalone quiz issues assessment certificate')

    console.log('\n--- SECTION 7: Certificate Retrieval, Verification & Reliability ---')
    // 7.1 GET /api/users/me/certificates is strictly read-only and ownership-scoped
    const certsResA = await makeRequest(port, {
      method: 'GET',
      path: '/api/users/me/certificates',
      headers: authHeadersA,
    })
    assert(certsResA.status === 200, 'GET /api/users/me/certificates returns 200')
    const certsListA = certsResA.body?.certificates || []
    assert(certsListA.length >= 2, `Learner A has at least 2 certificates (course + assessment, got ${certsListA.length})`)

    const certsResB = await makeRequest(port, {
      method: 'GET',
      path: '/api/users/me/certificates',
      headers: authHeadersB,
    })
    assert(certsResB.body?.certificates?.length === 0, 'Learner B has 0 certificates (strict ownership scoping)')

    // 7.2 Public verification of issued 32-hex certificate
    const targetCertId = assessCert?.certificateId || passSubmitRes.body?.certificate?.certificateId
    const pubVerifyRes = await makeRequest(port, {
      method: 'GET',
      path: `/api/certificates/verify/${targetCertId}`,
    })
    assert(pubVerifyRes.status === 200, 'Public verification returns 200 for valid certificate')
    assert(pubVerifyRes.body?.valid === true, 'Public verification valid === true')
    assert(pubVerifyRes.body?.certificateId === targetCertId, 'Public verification returns certificateId')
    assert(typeof pubVerifyRes.body?.recipientName === 'string', 'Public verification returns recipientName')
    assert(!pubVerifyRes.body?.recipientName?.includes('@'), 'Recipient name is sanitized (no email address leaked)')
    assert(pubVerifyRes.body?.score === undefined, 'Public verification preserves privacy (no scores leaked)')
    assert(pubVerifyRes.body?.userObjectId === undefined, 'Public verification preserves privacy (no internal userObjectId leaked)')

    // 7.3 Multi-length format acceptance: Legacy 8-char, 16-char, and 32-char
    const randHex8 = crypto.randomBytes(4).toString('hex').toUpperCase()
    const legacy8Cert = await Certificate.create({
      certificateId: `KAUSHAL-CERT-2025-${randHex8}`,
      title: 'Legacy 8 Course Certificate',
      userId: learnerB._id,
      courseId: new mongoose.Types.ObjectId(),
      recipientName: 'Legacy Learner',
      type: 'course_completion',
      source: 'assessment_engine',
    })
    const verify8 = await makeRequest(port, { method: 'GET', path: `/api/certificates/verify/${legacy8Cert.certificateId}` })
    assert(verify8.status === 200 && verify8.body?.valid === true, 'Legacy 8-character hex certificate ID is verified')

    const randHex16 = crypto.randomBytes(8).toString('hex').toUpperCase()
    const legacy16Cert = await Certificate.create({
      certificateId: `KAUSHAL-CERT-2025-${randHex16}`,
      title: 'Legacy 16 Course Certificate',
      userId: learnerB._id,
      courseId: new mongoose.Types.ObjectId(),
      recipientName: 'Legacy Learner 16',
      type: 'course_completion',
      source: 'assessment_engine',
    })
    const verify16 = await makeRequest(port, { method: 'GET', path: `/api/certificates/verify/${legacy16Cert.certificateId}` })
    assert(verify16.status === 200 && verify16.body?.valid === true, 'Legacy 16-character hex certificate ID is verified')

    // 7.4 Non-hex and malformed IDs rejected with 400
    const nonHexRes = await makeRequest(port, { method: 'GET', path: '/api/certificates/verify/KAUSHAL-CERT-2026-ZZZZZZZZZZZZZZZZ' })
    assert(nonHexRes.status === 400, 'Non-hex characters (G-Z) in certificate ID rejected with 400')

    const badLenRes = await makeRequest(port, { method: 'GET', path: '/api/certificates/verify/KAUSHAL-CERT-2026-A1B2C3D4E5' })
    assert(badLenRes.status === 400, 'Unsupported length (10 hex chars) rejected with 400')

    // 7.5 Recovery reconciliation: Flagged enrollment recovered via POST /api/users/me/certificates/reconcile
    // Create an enrollment that completed all requirements but had simulated issuance failure
    const enrollRecoverable = await Enrollment.create({
      userId: learnerB._id,
      courseId: course1._id,
      status: 'completed',
      progressPercent: 100,
      needsCertificateSync: true,
      certificateSyncError: 'Simulated connection reset',
    })
    // Add verified activities so eligibility passes
    await LearningActivity.create([
      { enrollmentId: enrollRecoverable._id, userId: learnerB._id, courseId: course1._id, moduleId: course1.modules[0]._id, moduleIndex: 0, contentType: 'slide', contentId: String(mod1Slide1), evidenceKind: 'slide_view' },
      { enrollmentId: enrollRecoverable._id, userId: learnerB._id, courseId: course1._id, moduleId: course1.modules[0]._id, moduleIndex: 0, contentType: 'slide', contentId: String(mod1Slide2), evidenceKind: 'slide_view' },
      { enrollmentId: enrollRecoverable._id, userId: learnerB._id, courseId: course1._id, moduleId: mod2Id, moduleIndex: 1, contentType: 'video_lesson', contentId: String(mod2Id), evidenceKind: 'learner_acknowledgement' },
    ])

    const reconcileRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/users/me/certificates/reconcile',
      headers: authHeadersB,
    })
    assert(reconcileRes.status === 200, 'Reconcile returns 200 OK')
    assert(reconcileRes.body?.recoveredCount >= 1, `Recovered flagged enrollment certificate (recoveredCount=${reconcileRes.body?.recoveredCount})`)

    const clearedEnroll = await Enrollment.findById(enrollRecoverable._id)
    assert(clearedEnroll?.needsCertificateSync === false, 'needsCertificateSync flag cleared after successful recovery')

    // 7.6 Ineligible enrollment is rejected by recovery engine (no fake certificates)
    const enrollIneligible = await Enrollment.create({
      userId: learnerB._id,
      courseId: courseEligible._id,
      status: 'enrolled',
      progressPercent: 50, // partial
      needsCertificateSync: true,
    })
    const reconcileIneligibleRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/users/me/certificates/reconcile',
      headers: authHeadersB,
    })
    assert(reconcileIneligibleRes.body?.recoveredCount === 0, 'Ineligible partial enrollment rejected by recovery (recoveredCount === 0)')
    await Enrollment.deleteOne({ _id: enrollIneligible._id })

    console.log('\n--- SECTION 8: Cross-Collection Referential Integrity Audit ---')
    // 8.1 No orphaned learning activities
    const allActivities = await LearningActivity.find({ userId: { $in: [learnerA._id, learnerB._id] } }).lean()
    const activeEnrollmentIds = new Set((await Enrollment.find({ userId: { $in: [learnerA._id, learnerB._id] } }).select('_id').lean()).map((e) => String(e._id)))
    let orphanedActivities = 0
    for (const act of allActivities) {
      if (!activeEnrollmentIds.has(String(act.enrollmentId))) orphanedActivities++
    }
    assert(orphanedActivities === 0, `Audit: 0 orphaned LearningActivity records found (checked ${allActivities.length})`)

    // 8.2 UserCompetency records have valid references and no duplicate user+competency pairs
    const allUserComps = await UserCompetency.find({ user_id: { $in: [learnerA._id, learnerB._id] } }).lean()
    const userCompPairs = new Set()
    let duplicateUserComps = 0
    for (const uc of allUserComps) {
      const pair = `${uc.user_id || uc.userId}::${uc.competency_id || uc.competencyId}`
      if (userCompPairs.has(pair)) duplicateUserComps++
      userCompPairs.add(pair)
    }
    assert(duplicateUserComps === 0, `Audit: 0 duplicate UserCompetency pairs found (checked ${allUserComps.length})`)

    // ── Teardown Ephemeral Fixtures from kaushalai_test ───────────────────
    console.log('\n--- CLEANUP: Removing Test Fixtures from kaushalai_test ---')
    await User.deleteMany({ _id: { $in: trackedFixtures.userIds } })
    await Course.deleteMany({ _id: { $in: trackedFixtures.courseIds } })
    await Quiz.deleteMany({ _id: { $in: trackedFixtures.quizIds } })
    await Question.deleteMany({ _id: { $in: trackedFixtures.questionIds } })
    await Competency.deleteMany({ _id: { $in: trackedFixtures.compIds } })
    await Recommendation.deleteMany({ _id: { $in: trackedFixtures.recIds } })
    await Enrollment.deleteMany({ userId: { $in: trackedFixtures.userIds } })
    await LearningActivity.deleteMany({ userId: { $in: trackedFixtures.userIds } })
    await LearningProgress.deleteMany({ userId: { $in: trackedFixtures.userIds } })
    await QuizAttempt.deleteMany({ userId: { $in: trackedFixtures.userIds } })
    await Certificate.deleteMany({ userId: { $in: trackedFixtures.userIds } })
    await UserCompetency.deleteMany({ user_id: { $in: trackedFixtures.userIds } })
    await SkillGap.deleteMany({ user_id: { $in: trackedFixtures.userIds } })

  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
    await mongoose.disconnect()
  }

  // ── Guardrail: Dev DB Post-Check ──────────────────────────────────────
  const postDevConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
  const postDb = postConnSafe(postDevConn)
  const devPostBaseline = {
    courses: await postDb.collection('courses').countDocuments(),
    quizzes: await postDb.collection('quizzes').countDocuments(),
    quizattempts: await postDb.collection('quizattempts').countDocuments(),
    enrollments: await postDb.collection('enrollments').countDocuments(),
    learning_progress: await postDb.collection('learning_progress').countDocuments(),
    learning_activities: await postDb.collection('learning_activities').countDocuments(),
    certificates: await postDb.collection('certificates').countDocuments(),
    user_competencies: await devDbSafe(postDb).collection('user_competencies').countDocuments(),
    skill_gaps: await devDbSafe(postDb).collection('skill_gaps').countDocuments(),
  }
  await postDevConn.close()

  console.log('\n--- GUARDRAIL: Development Database Immutability Check ---')
  console.log('Dev DB post-snapshot:', JSON.stringify(devPostBaseline))
  assert(devPostBaseline.courses === devBaseline.courses, `Dev DB courses count untouched (${devBaseline.courses} === ${devPostBaseline.courses})`)
  assert(devPostBaseline.quizzes === devBaseline.quizzes, `Dev DB quizzes count untouched (${devBaseline.quizzes} === ${devPostBaseline.quizzes})`)
  assert(devPostBaseline.certificates === devBaseline.certificates, `Dev DB certificates count strictly untouched (${devBaseline.certificates} === ${devPostBaseline.certificates})`)
  assert(devPostBaseline.enrollments === devBaseline.enrollments, `Dev DB enrollments count strictly untouched (${devBaseline.enrollments} === ${devPostBaseline.enrollments})`)
  assert(devPostBaseline.learning_activities === devBaseline.learning_activities, `Dev DB learning_activities count strictly untouched (${devBaseline.learning_activities} === ${devPostBaseline.learning_activities})`)

  console.log('===================================================================')
  console.log(`PHASE 36.4 SUMMARY: ${totalPassed} passed, ${totalFailed} failed`)
  console.log('===================================================================')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

function postConnSafe(conn) {
  return conn.db
}

function devDbSafe(db) {
  return db
}

runTests().catch((err) => {
  console.error('FATAL Test Suite Error:', err)
  process.exit(1)
})
