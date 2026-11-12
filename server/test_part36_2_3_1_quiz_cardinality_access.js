'use strict'

/**
 * Phase 36.2.3.1 Verification Suite: Quiz Relationship Cardinality & Access-Control
 *
 * Strictly executes against `mongodb://127.0.0.1:27017/kaushalai_test`.
 * Never mutates `kaushalai`. Never calls `syncIndexes()`.
 */

const assert = require('assert')
const http = require('http')
const path = require('path')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')

require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'kaushalai_dev_access_secret_change_in_prod'
const TEST_DB_URI = 'mongodb://127.0.0.1:27017/kaushalai_test'

const app = require('./src/app')
const {
  User,
  Course,
  Quiz,
  QuizAttempt,
  Enrollment,
  LearningProgress,
  Certificate,
} = require('./src/models')

function signToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      id: String(user._id),
      role: user.role,
      email: user.email,
      tokenVersion: user.tokenVersion || 1,
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )
}

function requestJson(port, { method = 'GET', path: reqPath, token = null, body = null }) {
  return new Promise((resolve, reject) => {
    const payload = body !== null ? JSON.stringify(body) : null
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload)

    const req = http.request(
      { hostname: '127.0.0.1', port, path: reqPath, method, headers },
      (res) => {
        let raw = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => { raw += chunk })
        res.on('end', () => {
          let parsed = null
          try {
            parsed = raw ? JSON.parse(raw) : null
          } catch {
            parsed = raw
          }
          resolve({ status: res.statusCode, body: parsed })
        })
      }
    )
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

const sampleQuestions = () => [
  {
    questionText: 'What is the primary purpose of stratified sampling?',
    options: ['Reduce sampling variance across subgroups', 'Eliminate sample frames', 'Avoid weighting', 'Increase bias'],
    correctOptionIndex: 0,
    explanation: 'Stratified sampling improves precision across strata.',
  },
  {
    questionText: 'What does MoSPI stand for?',
    options: ['Ministry of Statistics and Programme Implementation', 'Ministry of Social Policy', 'Monetary Standards Institute', 'None'],
    correctOptionIndex: 0,
    explanation: 'MoSPI is the Ministry of Statistics and Programme Implementation.',
  },
]

async function run() {
  let server
  try {
    await mongoose.connect(TEST_DB_URI)
    assert.strictEqual(mongoose.connection.name, 'kaushalai_test', 'Must run exclusively on kaushalai_test')

    await Promise.all([
      User.deleteMany({}),
      Course.deleteMany({}),
      Quiz.deleteMany({}),
      QuizAttempt.deleteMany({}),
      Enrollment.deleteMany({}),
      LearningProgress.deleteMany({}),
      Certificate.deleteMany({}),
    ])

    // Controlled index migration check: ensure legacy 1:1 unique index is NOT present
    try {
      await Quiz.collection.dropIndex('quiz_courseId_unique_objectid')
    } catch {
      // Ignore if absent
    }
    const indexes = await Quiz.collection.indexes()
    assert.ok(!indexes.some((i) => i.name === 'quiz_courseId_unique_objectid'), 'Unique index quiz_courseId_unique_objectid must be absent')
    const courseIdx = indexes.find((i) => i.name === 'courseId_1')
    assert.ok(courseIdx && !courseIdx.unique, 'courseId_1 must be present and non-unique')

    server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s))
    })
    const port = server.address().port

    const [adminUser, learnerA, learnerB] = await User.create([
      { name: 'Admin 36.2.3.1', email: 'admin36231@test.local', passwordHash: 'hash', role: 'admin', isEmailVerified: true },
      { name: 'Learner A', email: 'learnerA36231@test.local', passwordHash: 'hash', role: 'employee', isEmailVerified: true },
      { name: 'Learner B', email: 'learnerB36231@test.local', passwordHash: 'hash', role: 'employee', isEmailVerified: true },
    ])
    const adminToken = signToken(adminUser)
    const tokenA = signToken(learnerA)
    const tokenB = signToken(learnerB)

    const [activeCourse, otherCourse, archivedCourse, unpublishedCourse, deletedTargetCourse] = await Course.create([
      {
        title: 'Multi-Module Statistics Course',
        description: 'Active published course.',
        externalCourseId: 'CARD-ACT-01',
        competencyDomain: 'Statistics',
        status: 'active',
        isPublished: true,
        isDeleted: false,
      },
      {
        title: 'Other Active Course',
        description: 'Second active course.',
        externalCourseId: 'CARD-OTH-02',
        competencyDomain: 'Sampling',
        status: 'active',
        isPublished: true,
        isDeleted: false,
      },
      {
        title: 'Archived Course',
        description: 'Soft-deleted/archived.',
        externalCourseId: 'CARD-ARC-03',
        competencyDomain: 'Statistics',
        status: 'archived',
        isPublished: true,
        isDeleted: true,
      },
      {
        title: 'Unpublished Draft Course',
        description: 'Not published yet.',
        externalCourseId: 'CARD-UNP-04',
        competencyDomain: 'Statistics',
        status: 'draft',
        isPublished: false,
        isDeleted: false,
      },
      {
        title: 'Soon-to-be-deleted Course',
        description: 'Will be hard-deleted to test broken ref.',
        externalCourseId: 'CARD-DEL-05',
        competencyDomain: 'Statistics',
        status: 'active',
        isPublished: true,
        isDeleted: false,
      },
    ])

    let passed = 0
    const check = (label) => {
      passed += 1
      console.log(`  [PASS ${passed}] ${label}`)
    }

    // Cardinality Option B: One-to-many (multiple quizzes per course)
    const qPracticeRes = await requestJson(port, {
      method: 'POST',
      path: '/api/quizzes',
      token: adminToken,
      body: { title: 'Module 1 Practice Quiz', courseId: String(activeCourse._id), questions: sampleQuestions(), isPublished: true },
    })
    const qFinalRes = await requestJson(port, {
      method: 'POST',
      path: '/api/quizzes',
      token: adminToken,
      body: { title: 'Final Course Assessment', courseId: String(activeCourse._id), questions: sampleQuestions(), isPublished: true },
    })
    assert.strictEqual(qPracticeRes.status, 201)
    assert.strictEqual(qFinalRes.status, 201)
    const quizPracticeId = qPracticeRes.body.quiz._id
    const quizFinalId = qFinalRes.body.quiz._id

    const listCourseQuizzes = await requestJson(port, {
      method: 'GET',
      path: `/api/quizzes?courseId=${activeCourse._id}`,
      token: tokenA,
    })
    assert.strictEqual(listCourseQuizzes.status, 200)
    assert.strictEqual(listCourseQuizzes.body.quizzes.length, 2)
    check('Cardinality (Option B): One course supports multiple linked quizzes & GET /api/quizzes?courseId=... returns all')

    // Create standalone, archived-course, unpublished-course, and missing-course quizzes
    const qStandaloneRes = await requestJson(port, {
      method: 'POST',
      path: '/api/quizzes',
      token: adminToken,
      body: { title: 'Standalone General Quiz', courseId: null, questions: sampleQuestions(), isPublished: true },
    })
    const qArchivedRes = await requestJson(port, {
      method: 'POST',
      path: '/api/quizzes',
      token: adminToken,
      body: { title: 'Archived Course Quiz', questions: sampleQuestions(), isPublished: true },
    })
    const qUnpubRes = await requestJson(port, {
      method: 'POST',
      path: '/api/quizzes',
      token: adminToken,
      body: { title: 'Unpublished Course Quiz', courseId: String(unpublishedCourse._id), questions: sampleQuestions(), isPublished: true },
    })
    const qBrokenRes = await requestJson(port, {
      method: 'POST',
      path: '/api/quizzes',
      token: adminToken,
      body: { title: 'Broken Ref Quiz', courseId: String(deletedTargetCourse._id), questions: sampleQuestions(), isPublished: true },
    })
    assert.strictEqual(qStandaloneRes.status, 201)
    assert.strictEqual(qArchivedRes.status, 201)
    assert.strictEqual(qUnpubRes.status, 201)
    assert.strictEqual(qBrokenRes.status, 201)

    // Link qArchived to archivedCourse directly in DB to simulate a course archived after quiz creation
    await Quiz.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(qArchivedRes.body.quiz._id) },
      { $set: { courseId: archivedCourse._id } }
    )
    // Hard-delete deletedTargetCourse to simulate missing course ref
    await Course.deleteOne({ _id: deletedTargetCourse._id })

    const quizStandaloneId = qStandaloneRes.body.quiz._id
    const quizArchivedId = qArchivedRes.body.quiz._id
    const quizUnpubId = qUnpubRes.body.quiz._id
    const quizBrokenId = qBrokenRes.body.quiz._id

    // Scenario 1: Linked quiz with correct course context
    const s1Get = await requestJson(port, { method: 'GET', path: `/api/quizzes/${quizPracticeId}?courseId=${activeCourse._id}`, token: tokenA })
    assert.strictEqual(s1Get.status, 200)
    const s1Start = await requestJson(port, { method: 'POST', path: `/api/quizzes/${quizPracticeId}/start-attempt`, token: tokenA, body: { courseId: String(activeCourse._id) } })
    assert.strictEqual(s1Start.status, 201)
    const practiceQIds = s1Get.body.quiz.questionIds.map((q) => String(q._id))
    const s1Submit = await requestJson(port, {
      method: 'POST',
      path: `/api/quizzes/${quizPracticeId}/attempts`,
      token: tokenA,
      body: {
        attemptId: s1Start.body.attemptId,
        courseId: String(activeCourse._id),
        answers: practiceQIds.map((id) => ({ questionId: id, selectedOptionIndex: 0 })),
      },
    })
    assert.strictEqual(s1Submit.status, 201)
    assert.strictEqual(s1Submit.body.score, 100)
    assert.strictEqual(s1Submit.body.passed, true)
    const s1AttemptFetch = await requestJson(port, { method: 'GET', path: `/api/quizzes/attempts/${s1Start.body.attemptId}`, token: tokenA })
    assert.strictEqual(s1AttemptFetch.status, 200)
    check('Scenario 1: Linked quiz with correct courseId context works end-to-end')

    // Scenario 2: Linked quiz with incorrect course context
    const s2Get = await requestJson(port, { method: 'GET', path: `/api/quizzes/${quizPracticeId}?courseId=${otherCourse._id}`, token: tokenA })
    assert.strictEqual(s2Get.status, 403)
    assert.strictEqual(s2Get.body.code, 'QUIZ_COURSE_MISMATCH')
    const s2Start = await requestJson(port, { method: 'POST', path: `/api/quizzes/${quizPracticeId}/start-attempt`, token: tokenA, body: { courseId: String(otherCourse._id) } })
    assert.strictEqual(s2Start.status, 403)
    assert.strictEqual(s2Start.body.code, 'QUIZ_COURSE_MISMATCH')
    const s2Submit = await requestJson(port, {
      method: 'POST',
      path: `/api/quizzes/${quizPracticeId}/attempts`,
      token: tokenA,
      body: { courseId: String(otherCourse._id), answers: [{ questionId: practiceQIds[0], selectedOptionIndex: 0 }] },
    })
    assert.strictEqual(s2Submit.status, 403)
    assert.strictEqual(s2Submit.body.code, 'QUIZ_COURSE_MISMATCH')
    check('Scenario 2: Linked quiz with incorrect course context rejected (403 QUIZ_COURSE_MISMATCH)')

    // Scenario 3: Linked quiz with no course context (direct access for active published course)
    const s3Get = await requestJson(port, { method: 'GET', path: `/api/quizzes/${quizFinalId}`, token: tokenA })
    assert.strictEqual(s3Get.status, 200)
    const s3Start = await requestJson(port, { method: 'POST', path: `/api/quizzes/${quizFinalId}/start-attempt`, token: tokenA, body: {} })
    assert.strictEqual(s3Start.status, 201)
    const finalQIds = s3Get.body.quiz.questionIds.map((q) => String(q._id))
    const s3Submit = await requestJson(port, {
      method: 'POST',
      path: `/api/quizzes/${quizFinalId}/attempts`,
      token: tokenA,
      body: {
        attemptId: s3Start.body.attemptId,
        answers: [
          { questionId: finalQIds[0], selectedOptionIndex: 0 },
          { questionId: finalQIds[1], selectedOptionIndex: 1 }, // 50% < 70%
        ],
      },
    })
    assert.strictEqual(s3Submit.status, 201)
    assert.strictEqual(s3Submit.body.score, 50)
    assert.strictEqual(s3Submit.body.passed, false)
    check('Scenario 3: Linked quiz with no course context allowed for active published course & preserves 70% threshold')

    // Scenario 4: Standalone quiz with no course context
    const s4Get = await requestJson(port, { method: 'GET', path: `/api/quizzes/${quizStandaloneId}`, token: tokenA })
    assert.strictEqual(s4Get.status, 200)
    const s4Start = await requestJson(port, { method: 'POST', path: `/api/quizzes/${quizStandaloneId}/start-attempt`, token: tokenA, body: {} })
    assert.strictEqual(s4Start.status, 201)
    const stQIds = s4Get.body.quiz.questionIds.map((q) => String(q._id))
    const s4Submit = await requestJson(port, {
      method: 'POST',
      path: `/api/quizzes/${quizStandaloneId}/attempts`,
      token: tokenA,
      body: { attemptId: s4Start.body.attemptId, answers: stQIds.map((id) => ({ questionId: id, selectedOptionIndex: 0 })) },
    })
    assert.strictEqual(s4Submit.status, 201)
    check('Scenario 4: Standalone quiz with no course context works independently')

    // Scenario 5: Standalone quiz with unrelated course context
    const s5Get = await requestJson(port, { method: 'GET', path: `/api/quizzes/${quizStandaloneId}?courseId=${activeCourse._id}`, token: tokenA })
    assert.strictEqual(s5Get.status, 403)
    assert.strictEqual(s5Get.body.code, 'QUIZ_COURSE_MISMATCH')
    const s5Start = await requestJson(port, { method: 'POST', path: `/api/quizzes/${quizStandaloneId}/start-attempt`, token: tokenA, body: { courseId: String(activeCourse._id) } })
    assert.strictEqual(s5Start.status, 403)
    check('Scenario 5: Standalone quiz with unrelated course context rejected (403 QUIZ_COURSE_MISMATCH)')

    // Scenario 6: Linked quiz whose course is archived (with AND without courseId)
    const s6WithCtx = await requestJson(port, { method: 'GET', path: `/api/quizzes/${quizArchivedId}?courseId=${archivedCourse._id}`, token: tokenA })
    assert.strictEqual(s6WithCtx.status, 409)
    assert.strictEqual(s6WithCtx.body.code, 'COURSE_ARCHIVED')
    const s6DirectGet = await requestJson(port, { method: 'GET', path: `/api/quizzes/${quizArchivedId}`, token: tokenA })
    assert.strictEqual(s6DirectGet.status, 409)
    assert.strictEqual(s6DirectGet.body.code, 'COURSE_ARCHIVED')
    const s6DirectStart = await requestJson(port, { method: 'POST', path: `/api/quizzes/${quizArchivedId}/start-attempt`, token: tokenA, body: {} })
    assert.strictEqual(s6DirectStart.status, 409)
    assert.strictEqual(s6DirectStart.body.code, 'COURSE_ARCHIVED')
    check('Scenario 6: Archived linked course blocks access both with and without courseId (409 COURSE_ARCHIVED)')

    // Scenario 7: Linked quiz whose course is unpublished (learner blocked with & without courseId; admin allowed)
    const s7WithCtx = await requestJson(port, { method: 'GET', path: `/api/quizzes/${quizUnpubId}?courseId=${unpublishedCourse._id}`, token: tokenA })
    assert.strictEqual(s7WithCtx.status, 400)
    assert.strictEqual(s7WithCtx.body.code, 'COURSE_UNPUBLISHED')
    const s7DirectGet = await requestJson(port, { method: 'GET', path: `/api/quizzes/${quizUnpubId}`, token: tokenA })
    assert.strictEqual(s7DirectGet.status, 400)
    assert.strictEqual(s7DirectGet.body.code, 'COURSE_UNPUBLISHED')
    const s7DirectStart = await requestJson(port, { method: 'POST', path: `/api/quizzes/${quizUnpubId}/start-attempt`, token: tokenA, body: {} })
    assert.strictEqual(s7DirectStart.status, 400)
    assert.strictEqual(s7DirectStart.body.code, 'COURSE_UNPUBLISHED')
    const s7AdminGet = await requestJson(port, { method: 'GET', path: `/api/quizzes/${quizUnpubId}`, token: adminToken })
    assert.strictEqual(s7AdminGet.status, 200)
    check('Scenario 7: Unpublished linked course blocks learner direct & context access (400 COURSE_UNPUBLISHED); admin allowed')

    // Scenario 8: Learner attempting to access another learner's attempt
    const s8OtherAttempt = await requestJson(port, { method: 'GET', path: `/api/quizzes/attempts/${s1Start.body.attemptId}`, token: tokenB })
    assert.strictEqual(s8OtherAttempt.status, 404)
    check('Scenario 8: Cross-learner attempt retrieval blocked (404)')

    // Scenario 9: Learner attempting to submit an attempt belonging to another quiz
    const crossStart = await requestJson(port, { method: 'POST', path: `/api/quizzes/${quizPracticeId}/start-attempt`, token: tokenB, body: {} })
    assert.strictEqual(crossStart.status, 201)
    const crossSubmit = await requestJson(port, {
      method: 'POST',
      path: `/api/quizzes/${quizFinalId}/attempts`,
      token: tokenB,
      body: {
        attemptId: crossStart.body.attemptId,
        answers: finalQIds.map((id) => ({ questionId: id, selectedOptionIndex: 0 })),
      },
    })
    assert.strictEqual(crossSubmit.status, 403)
    assert.strictEqual(crossSubmit.body.code, 'ATTEMPT_QUIZ_MISMATCH')
    const untouchedCrossAttempt = await QuizAttempt.findById(crossStart.body.attemptId).lean()
    assert.strictEqual(untouchedCrossAttempt.status, 'in_progress')
    assert.strictEqual(String(untouchedCrossAttempt.quizId), String(quizPracticeId))
    check('Scenario 9: Submitting attemptId from another quiz rejected (403 ATTEMPT_QUIZ_MISMATCH) & original attempt untouched')

    // Scenario 10: Direct API bypass attempt on deleted/missing course link -> 404 COURSE_NOT_FOUND (never reinterpreted as standalone)
    const s10BrokenGet = await requestJson(port, { method: 'GET', path: `/api/quizzes/${quizBrokenId}`, token: tokenA })
    assert.strictEqual(s10BrokenGet.status, 404)
    assert.strictEqual(s10BrokenGet.body.code, 'COURSE_NOT_FOUND')
    const s10BrokenStart = await requestJson(port, { method: 'POST', path: `/api/quizzes/${quizBrokenId}/start-attempt`, token: tokenA, body: {} })
    assert.strictEqual(s10BrokenStart.status, 404)
    assert.strictEqual(s10BrokenStart.body.code, 'COURSE_NOT_FOUND')
    check('Scenario 10: Direct API call on broken course link rejected (404 COURSE_NOT_FOUND), never reinterpreted as standalone')

    // Preservation checks: Phase 36.2.2 non-bypass & course Certificate safety
    await Enrollment.create({ userId: learnerA._id, courseId: activeCourse._id, progressPercent: 0, status: 'enrolled', completedModules: [] })
    const lp = await LearningProgress.findOne({ userId: learnerA._id, courseId: activeCourse._id }).lean()
    const courseCerts = await Certificate.countDocuments({ userId: learnerA._id, courseId: activeCourse._id })
    assert.strictEqual(lp, null)
    assert.strictEqual(courseCerts, 0)
    check('Preservation: Linked quiz pass does not bypass LearningProgress or auto-issue course Certificates')

    console.log(`\nALL ${passed} PHASE 36.2.3.1 CHECKS PASSED ON kaushalai_test!\n`)
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect()
    }
  }
}

run().catch((err) => {
  console.error('\n[FAIL] Phase 36.2.3.1 test failed:', err)
  process.exit(1)
})

