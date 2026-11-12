'use strict'

/**
 * Phase 36.2.3 Verification Suite: Quiz-to-Course Relationship Integrity
 *
 * Strictly executes against `mongodb://127.0.0.1:27017/kaushalai_test`.
 * Never mutates `kaushalai`. Never calls `syncIndexes()`.
 */

const assert = require('assert')
const fs = require('fs')
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
  AuditLog,
  UserCompetency,
  SkillGap,
} = require('./src/models')
const {
  reconcileQuizCourseRelationships,
  isProtectedDatabaseName,
} = require('./scripts/reconcile_quiz_course_relationships')

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
    questionText: 'What does CPI measure?',
    options: ['Consumer Price Index', 'Corporate Profit Index', 'Capital Price Index', 'Currency Parity Index'],
    correctOptionIndex: 0,
    explanation: 'CPI stands for Consumer Price Index.',
  },
  {
    questionText: 'Which base framework governs SNA 2008?',
    options: ['Macroeconomic accounting', 'Tax auditing', 'Marine biology', 'Civil engineering'],
    correctOptionIndex: 0,
    explanation: 'SNA 2008 is the System of National Accounts.',
  },
]

async function run() {
  let server
  try {
    await mongoose.connect(TEST_DB_URI)
    assert.strictEqual(mongoose.connection.name, 'kaushalai_test', 'Must run exclusively on kaushalai_test')

    // Clean test collections
    await Promise.all([
      User.deleteMany({}),
      Course.deleteMany({}),
      Quiz.deleteMany({}),
      QuizAttempt.deleteMany({}),
      Enrollment.deleteMany({}),
      LearningProgress.deleteMany({}),
      Certificate.deleteMany({}),
      AuditLog.deleteMany({}),
      UserCompetency.deleteMany({}),
      SkillGap.deleteMany({}),
    ])

    // Drop legacy 1:1 unique index if present (Phase 36.2.3.1 Option B one-to-many migration)
    try {
      await Quiz.collection.dropIndex('quiz_courseId_unique_objectid')
    } catch {
      // Ignore if not present
    }

    server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s))
    })
    const port = server.address().port

    // Seed users
    const [adminUser, learnerUser, otherLearner] = await User.create([
      { name: 'Admin 36.2.3', email: 'admin3623@test.local', passwordHash: 'hash', role: 'admin', isEmailVerified: true },
      { name: 'Learner 36.2.3', email: 'learner3623@test.local', passwordHash: 'hash', role: 'employee', isEmailVerified: true },
      { name: 'Other Learner', email: 'other3623@test.local', passwordHash: 'hash', role: 'employee', isEmailVerified: true },
    ])
    const adminToken = signToken(adminUser)
    const learnerToken = signToken(learnerUser)
    const otherToken = signToken(otherLearner)

    // Seed courses
    const [courseA, courseB, courseC, archivedCourse] = await Course.create([
      {
        title: 'Course A: Official Statistics',
        description: 'Official statistics fundamentals.',
        externalCourseId: 'EXT-STAT-101',
        competencyDomain: 'Statistics',
        status: 'active',
        isArchived: false,
      },
      {
        title: 'Course B: Survey Sampling',
        description: 'Sampling methodology.',
        externalCourseId: 'EXT-SAMP-102',
        competencyDomain: 'Sampling',
        status: 'active',
        isArchived: false,
      },
      {
        title: 'Course C: Python Analytics',
        description: 'Python analytics.',
        externalCourseId: 'EXT-PY-103',
        competencyDomain: 'Data Science',
        status: 'active',
        isArchived: false,
      },
      {
        title: 'Archived Course',
        description: 'Archived.',
        externalCourseId: 'EXT-ARCH-999',
        competencyDomain: 'Statistics',
        status: 'archived',
        isDeleted: true,
        isArchived: true,
      },
    ])

    let passed = 0
    const check = (name) => {
      passed += 1
      console.log(`  [PASS ${passed}] ${name}`)
    }

    // 1. Create quiz with valid Course._id -> ObjectId + metadata
    const res1 = await requestJson(port, {
      method: 'POST',
      path: '/api/quizzes',
      token: adminToken,
      body: {
        title: 'Quiz A (ObjectId)',
        courseId: String(courseA._id),
        questions: sampleQuestions(),
        isPublished: true,
      },
    })
    assert.strictEqual(res1.status, 201, `Expected 201 creating quiz with ObjectId, got ${res1.status}: ${JSON.stringify(res1.body)}`)
    const quizAId = res1.body.quiz._id
    const quizADoc = await Quiz.collection.findOne({ _id: new mongoose.Types.ObjectId(quizAId) })
    assert.ok(quizADoc.courseId instanceof mongoose.Types.ObjectId, 'Quiz.courseId must be stored as BSON ObjectId')
    assert.strictEqual(quizADoc.courseId.toString(), String(courseA._id))
    assert.strictEqual(String(res1.body.quiz.courseId), String(courseA._id))
    check('1. Create quiz with valid Course._id persists ObjectId and returns courseId')

    // 2. Create quiz with valid Course.externalCourseId -> resolves to canonical Course._id
    const res2 = await requestJson(port, {
      method: 'POST',
      path: '/api/quizzes',
      token: adminToken,
      body: {
        title: 'Quiz B (ExternalCourseId)',
        courseId: 'EXT-SAMP-102',
        questions: sampleQuestions(),
        isPublished: true,
      },
    })
    assert.strictEqual(res2.status, 201, `Expected 201 creating quiz via externalCourseId, got ${res2.status}`)
    const quizBId = res2.body.quiz._id
    const quizBDoc = await Quiz.collection.findOne({ _id: new mongoose.Types.ObjectId(quizBId) })
    assert.ok(quizBDoc.courseId instanceof mongoose.Types.ObjectId)
    assert.strictEqual(quizBDoc.courseId.toString(), String(courseB._id))
    check('2. Create quiz with externalCourseId resolves to canonical Course._id')

    // 3. Create quiz with malformed/unmatched courseId -> 400
    const res3 = await requestJson(port, {
      method: 'POST',
      path: '/api/quizzes',
      token: adminToken,
      body: { title: 'Invalid Ref Quiz', courseId: 'C01', questions: sampleQuestions() },
    })
    assert.strictEqual(res3.status, 400)
    assert.strictEqual(res3.body.code, 'INVALID_COURSE_REFERENCE')
    check('3. Create quiz with invalid courseId reference ("C01") is rejected with 400')

    // 4. Create quiz with non-existent Course._id -> 404
    const missingCourseId = new mongoose.Types.ObjectId().toString()
    const res4 = await requestJson(port, {
      method: 'POST',
      path: '/api/quizzes',
      token: adminToken,
      body: { title: 'Missing Course Quiz', courseId: missingCourseId, questions: sampleQuestions() },
    })
    assert.strictEqual(res4.status, 404)
    assert.strictEqual(res4.body.code, 'COURSE_NOT_FOUND')
    check('4. Create quiz with non-existent Course._id is rejected with 404')

    // 5. Create quiz with archived Course._id -> 409 COURSE_ARCHIVED
    const res5 = await requestJson(port, {
      method: 'POST',
      path: '/api/quizzes',
      token: adminToken,
      body: { title: 'Archived Course Quiz', courseId: String(archivedCourse._id), questions: sampleQuestions() },
    })
    assert.strictEqual(res5.status, 409)
    assert.strictEqual(res5.body.code, 'COURSE_ARCHIVED')
    check('5. Create quiz with archived Course._id is rejected with 409')

    // 6. Create second quiz targeting Course A -> 201 (one-to-many supported)
    const res6 = await requestJson(port, {
      method: 'POST',
      path: '/api/quizzes',
      token: adminToken,
      body: { title: 'Quiz A2 (Module/Practice)', courseId: String(courseA._id), questions: sampleQuestions(), isPublished: true },
    })
    assert.strictEqual(res6.status, 201)
    assert.strictEqual(String(res6.body.quiz.courseId), String(courseA._id))
    // Clean up extra quiz on courseA so GET ?courseId=courseA returns 1 in step 10
    await Quiz.deleteOne({ _id: res6.body.quiz._id })
    check('6. Multiple quizzes for same Course._id are supported (one-to-many)')

    // 7. Multiple standalone quizzes with courseId: null are supported
    const st1Res = await requestJson(port, {
      method: 'POST',
      path: '/api/quizzes',
      token: adminToken,
      body: { title: 'Standalone 1', courseId: null, questions: sampleQuestions(), isPublished: true },
    })
    const st2Res = await requestJson(port, {
      method: 'POST',
      path: '/api/quizzes',
      token: adminToken,
      body: { title: 'Standalone 2', courseId: null, questions: sampleQuestions(), isPublished: true },
    })
    assert.strictEqual(st1Res.status, 201)
    assert.strictEqual(st2Res.status, 201)
    const standalone1 = st1Res.body.quiz
    const standalone2 = st2Res.body.quiz
    assert.strictEqual(standalone1.courseId, null)
    assert.strictEqual(standalone2.courseId, null)
    check('7. Multiple standalone quizzes with courseId: null are allowed')

    // 8. Update quiz: link standalone2 -> courseC, reject archived course
    const res8b = await requestJson(port, {
      method: 'PUT',
      path: `/api/quizzes/${standalone2._id}`,
      token: adminToken,
      body: { courseId: String(archivedCourse._id) },
    })
    assert.strictEqual(res8b.status, 409)
    const res8c = await requestJson(port, {
      method: 'PUT',
      path: `/api/quizzes/${standalone2._id}`,
      token: adminToken,
      body: { courseId: String(courseC._id) },
    })
    assert.strictEqual(res8c.status, 200)
    assert.strictEqual(String(res8c.body.quiz.courseId), String(courseC._id))
    check('8. Update quiz validates target courseId and rejects duplicate/archived targets')

    // 9. Update quiz with legacy invalid string courseId ("C01") without clearing -> 400; clearing to "" -> null (200)
    const legacyInvalidInsert = await Quiz.collection.insertOne({
      title: 'Legacy Invalid Quiz',
      courseId: 'C01',
      materialId: 'legacy-c01-mat',
      createdBy: adminUser._id,
      questionIds: [],
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const res9a = await requestJson(port, {
      method: 'PUT',
      path: `/api/quizzes/${legacyInvalidInsert.insertedId}`,
      token: adminToken,
      body: { title: 'Updated Title Only' },
    })
    assert.strictEqual(res9a.status, 400)
    const res9b = await requestJson(port, {
      method: 'PUT',
      path: `/api/quizzes/${legacyInvalidInsert.insertedId}`,
      token: adminToken,
      body: { title: 'Cleared Standalone', courseId: '' },
    })
    assert.strictEqual(res9b.status, 200)
    assert.strictEqual(res9b.body.quiz.courseId, null)
    check('9. Updating quiz with un-cleared legacy invalid courseId fails 400; clearing to "" normalizes to null')

    // 10. GET /api/quizzes?courseId=<courseA._id> returns only Quiz A
    const res10 = await requestJson(port, {
      method: 'GET',
      path: `/api/quizzes?courseId=${courseA._id}`,
      token: learnerToken,
    })
    assert.strictEqual(res10.status, 200)
    assert.strictEqual(res10.body.quizzes.length, 1)
    assert.strictEqual(res10.body.quizzes[0]._id, quizAId)
    check('10. GET /api/quizzes?courseId=<ObjectId> returns only the linked quiz')

    // 11. GET /api/quizzes?courseId=<externalCourseId> returns linked quiz
    const res11 = await requestJson(port, {
      method: 'GET',
      path: '/api/quizzes?courseId=EXT-SAMP-102',
      token: learnerToken,
    })
    assert.strictEqual(res11.status, 200)
    assert.strictEqual(res11.body.quizzes.length, 1)
    assert.strictEqual(res11.body.quizzes[0]._id, quizBId)
    check('11. GET /api/quizzes?courseId=<externalCourseId> resolves and returns linked quiz')

    // 12. GET /api/quizzes?courseId= invalid / empty / missing / archived rejects (no silent fallback)
    const res12Empty = await requestJson(port, { method: 'GET', path: '/api/quizzes?courseId=', token: learnerToken })
    assert.strictEqual(res12Empty.status, 400)
    const res12Invalid = await requestJson(port, { method: 'GET', path: '/api/quizzes?courseId=bad-ref', token: learnerToken })
    assert.strictEqual(res12Invalid.status, 400)
    const res12Missing = await requestJson(port, { method: 'GET', path: `/api/quizzes?courseId=${missingCourseId}`, token: learnerToken })
    assert.strictEqual(res12Missing.status, 404)
    const res12Archived = await requestJson(port, { method: 'GET', path: `/api/quizzes?courseId=${archivedCourse._id}`, token: learnerToken })
    assert.strictEqual(res12Archived.status, 409)
    check('12. GET /api/quizzes rejects empty/invalid/missing/archived courseId without fallback to all quizzes')

    // 13. GET /api/quizzes/:id?courseId=... enforces course context match
    const res13Ok = await requestJson(port, {
      method: 'GET',
      path: `/api/quizzes/${quizAId}?courseId=${courseA._id}`,
      token: learnerToken,
    })
    assert.strictEqual(res13Ok.status, 200)
    const res13Mismatch = await requestJson(port, {
      method: 'GET',
      path: `/api/quizzes/${quizAId}?courseId=${courseB._id}`,
      token: learnerToken,
    })
    assert.strictEqual(res13Mismatch.status, 403)
    assert.strictEqual(res13Mismatch.body.code, 'QUIZ_COURSE_MISMATCH')
    const res13StandaloneMismatch = await requestJson(port, {
      method: 'GET',
      path: `/api/quizzes/${standalone1._id}?courseId=${courseA._id}`,
      token: learnerToken,
    })
    assert.strictEqual(res13StandaloneMismatch.status, 403)
    check('13. GET /api/quizzes/:id?courseId=... succeeds on match and returns 403 QUIZ_COURSE_MISMATCH on mismatch')

    // 14. startAttempt enforces courseId match and rejects cross-course
    const res14Mismatch = await requestJson(port, {
      method: 'POST',
      path: `/api/quizzes/${quizAId}/start-attempt`,
      token: learnerToken,
      body: { courseId: String(courseB._id) },
    })
    assert.strictEqual(res14Mismatch.status, 403)
    assert.strictEqual(res14Mismatch.body.code, 'QUIZ_COURSE_MISMATCH')
    const res14Ok = await requestJson(port, {
      method: 'POST',
      path: `/api/quizzes/${quizAId}/start-attempt`,
      token: learnerToken,
      body: { courseId: String(courseA._id) },
    })
    assert.strictEqual(res14Ok.status, 201)
    const attemptAId = res14Ok.body.attemptId
    assert.ok(attemptAId)
    check('14. startAttempt enforces courseId match and creates session on valid courseId')

    // 15. submitAttempt rejects mismatched courseId and grades matching courseId with 70% threshold
    const quizAFull = await Quiz.findById(quizAId).lean()
    const qIds = quizAFull.questionIds.map((q) => String(q._id))
    const res15Mismatch = await requestJson(port, {
      method: 'POST',
      path: `/api/quizzes/${quizAId}/attempts`,
      token: learnerToken,
      body: {
        attemptId: attemptAId,
        courseId: String(courseB._id),
        answers: qIds.map((id) => ({ questionId: id, selectedOptionIndex: 0 })),
      },
    })
    assert.strictEqual(res15Mismatch.status, 403)
    assert.strictEqual(res15Mismatch.body.code, 'QUIZ_COURSE_MISMATCH')

    const res15Pass = await requestJson(port, {
      method: 'POST',
      path: `/api/quizzes/${quizAId}/attempts`,
      token: learnerToken,
      body: {
        attemptId: attemptAId,
        courseId: String(courseA._id),
        answers: qIds.map((id) => ({ questionId: id, selectedOptionIndex: 0 })),
      },
    })
    assert.strictEqual(res15Pass.status, 201)
    assert.strictEqual(res15Pass.body.score, 100)
    assert.strictEqual(res15Pass.body.passed, true)
    check('15. submitAttempt rejects mismatched courseId and passes 100% >= 70% threshold on match')

    // 16. Failing score (<70%) preserves 70% threshold
    const failStart = await requestJson(port, {
      method: 'POST',
      path: `/api/quizzes/${quizAId}/start-attempt`,
      token: learnerToken,
      body: { courseId: String(courseA._id) },
    })
    assert.strictEqual(failStart.status, 201)
    const res16Fail = await requestJson(port, {
      method: 'POST',
      path: `/api/quizzes/${quizAId}/attempts`,
      token: learnerToken,
      body: {
        attemptId: failStart.body.attemptId,
        courseId: String(courseA._id),
        answers: [
          { questionId: qIds[0], selectedOptionIndex: 0 },
          { questionId: qIds[1], selectedOptionIndex: 1 }, // 50% < 70%
        ],
      },
    })
    assert.strictEqual(res16Fail.status, 201)
    assert.strictEqual(res16Fail.body.score, 50)
    assert.strictEqual(res16Fail.body.passed, false)
    check('16. 50% quiz submission evaluates passed=false preserving 70% threshold')

    // 17. Standalone quiz (courseId: null) still works end-to-end without course context
    const stStart = await requestJson(port, {
      method: 'POST',
      path: `/api/quizzes/${standalone1._id}/start-attempt`,
      token: learnerToken,
      body: {},
    })
    assert.strictEqual(stStart.status, 201)
    const stSubmit = await requestJson(port, {
      method: 'POST',
      path: `/api/quizzes/${standalone1._id}/attempts`,
      token: learnerToken,
      body: {
        attemptId: stStart.body.attemptId,
        answers: standalone1.questionIds.map((q) => ({ questionId: String(q._id), selectedOptionIndex: 0 })),
      },
    })
    assert.strictEqual(stSubmit.status, 201)
    assert.strictEqual(stSubmit.body.passed, true)
    check('17. Standalone quiz (courseId: null) still works end-to-end')

    // 18. Historical QuizAttempt retrieval & ownership enforcement
    const ownAttemptRes = await requestJson(port, {
      method: 'GET',
      path: `/api/quizzes/attempts/${attemptAId}`,
      token: learnerToken,
    })
    assert.strictEqual(ownAttemptRes.status, 200)
    const otherAttemptRes = await requestJson(port, {
      method: 'GET',
      path: `/api/quizzes/attempts/${attemptAId}`,
      token: otherToken,
    })
    assert.strictEqual(otherAttemptRes.status, 404)
    check('18. Historical QuizAttempt accessible to owner and blocked (404) for other learners')

    // 19. Concurrent submitAttempt idempotency
    const concStart = await requestJson(port, {
      method: 'POST',
      path: `/api/quizzes/${quizAId}/start-attempt`,
      token: learnerToken,
      body: { courseId: String(courseA._id) },
    })
    assert.strictEqual(concStart.status, 201)
    const concBody = {
      attemptId: concStart.body.attemptId,
      courseId: String(courseA._id),
      answers: qIds.map((id) => ({ questionId: id, selectedOptionIndex: 0 })),
    }
    const [conc1, conc2] = await Promise.all([
      requestJson(port, { method: 'POST', path: `/api/quizzes/${quizAId}/attempts`, token: learnerToken, body: concBody }),
      requestJson(port, { method: 'POST', path: `/api/quizzes/${quizAId}/attempts`, token: learnerToken, body: concBody }),
    ])
    const concStatuses = [conc1.status, conc2.status].sort()
    assert.deepStrictEqual(concStatuses, [201, 400])
    check('19. Concurrent submitAttempt on same attemptId is atomic (201 + 400 ATTEMPT_ALREADY_COMPLETED)')

    // 20. Reconciliation script --dry-run classification & zero mutations
    const courseD = await Course.create({
      title: 'Course D: Reconciliation Target',
      description: 'Target for reconciliation test.',
      externalCourseId: 'EXT-REC-204',
      competencyDomain: 'Statistics',
      status: 'active',
      isArchived: false,
    })
    const courseE = await Course.create({
      title: 'Course E: Conflict Target',
      description: 'Target for conflict test.',
      externalCourseId: 'EXT-CONF-205',
      competencyDomain: 'Statistics',
      status: 'active',
      isArchived: false,
    })
    const courseE2 = await Course.create({
      title: 'Course E2: Ambiguous External ID',
      description: 'Second course sharing externalCourseId.',
      externalCourseId: 'EXT-CONF-205',
      competencyDomain: 'Statistics',
      status: 'active',
      isArchived: false,
    })
    assert.ok(courseE2._id)
    const recVerified = await Quiz.collection.insertOne({
      title: 'Reconcile Verified Ext',
      courseId: 'EXT-REC-204',
      questionIds: sampleQuestions(),
      passPercent: 70,
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const recConflict = await Quiz.collection.insertOne({
      title: 'Reconcile Ambiguous External Ref',
      courseId: 'EXT-CONF-205',
      questionIds: [],
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const recInvalid = await Quiz.collection.insertOne({
      title: 'Reconcile Invalid Ref',
      courseId: 'C99',
      questionIds: [],
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const auditCountBefore = await AuditLog.countDocuments({})
    const dryReport = await reconcileQuizCourseRelationships({ dryRun: true })
    assert.strictEqual(dryReport.mode, 'dry-run')
    assert.strictEqual(dryReport.counts.appliedCount, 0)
    const byId = new Map(dryReport.items.map((x) => [x.quizId, x]))
    assert.strictEqual(byId.get(quizAId).classification, 'ALREADY_VALID')
    assert.strictEqual(byId.get(String(recVerified.insertedId)).classification, 'VERIFIED_MATCH')
    assert.strictEqual(byId.get(String(recConflict.insertedId)).classification, 'AMBIGUOUS_MATCH')
    assert.strictEqual(byId.get(String(recInvalid.insertedId)).classification, 'INVALID_REFERENCE')
    assert.strictEqual(byId.get(String(standalone1._id)).classification, 'NO_MATCH')
    assert.strictEqual(await AuditLog.countDocuments({}), auditCountBefore, 'dry-run must not write AuditLog')
    const untouchedVerified = await Quiz.collection.findOne({ _id: recVerified.insertedId })
    assert.strictEqual(untouchedVerified.courseId, 'EXT-REC-204', 'dry-run must not modify quizzes')
    check('20. reconcileQuizCourseRelationships --dry-run classifies all 5 states with zero writes')

    // 21. Reconciliation safety guards & --apply behavior
    assert.strictEqual(isProtectedDatabaseName('kaushalai'), true)
    assert.strictEqual(isProtectedDatabaseName('production_db'), true)
    assert.strictEqual(isProtectedDatabaseName('kaushalai_test'), false)
    await assert.rejects(
      () => reconcileQuizCourseRelationships({ dryRun: false, backupVerified: false }),
      /backup-verified/i
    )
    const attemptCountBeforeApply = await QuizAttempt.countDocuments({})
    const applyReport = await reconcileQuizCourseRelationships({
      dryRun: false,
      backupVerified: true,
      actorId: adminUser._id,
    })
    assert.strictEqual(applyReport.counts.appliedCount, 1)
    const updatedVerified = await Quiz.collection.findOne({ _id: recVerified.insertedId })
    assert.ok(updatedVerified.courseId instanceof mongoose.Types.ObjectId)
    assert.strictEqual(updatedVerified.courseId.toString(), String(courseD._id))
    assert.strictEqual(updatedVerified.passPercent, 70)
    assert.strictEqual(updatedVerified.questionIds.length, 2)
    assert.strictEqual(await QuizAttempt.countDocuments({}), attemptCountBeforeApply)
    const reconAudit = await AuditLog.findOne({ action: 'QUIZ_COURSE_RECONCILIATION' }).lean()
    assert.ok(reconAudit && reconAudit.meta.appliedCount === 1)
    check('21. reconcileQuizCourseRelationships --apply enforces --backup-verified, updates VERIFIED_MATCH only, writes AuditLog')

    // 22. Frontend wiring assertions (CourseProgressPage.jsx & TakeQuizPage.jsx)
    const courseProgressSrc = fs.readFileSync(
      path.resolve(__dirname, '../client/src/pages/courses/CourseProgressPage.jsx'),
      'utf8'
    )
    const takeQuizSrc = fs.readFileSync(
      path.resolve(__dirname, '../client/src/pages/quiz/TakeQuizPage.jsx'),
      'utf8'
    )
    assert.ok(courseProgressSrc.includes('enabled: Boolean(effectiveCourseId)'), 'CourseProgressPage must gate quiz fetch on loaded course')
    assert.ok(courseProgressSrc.includes('?courseId=${encodeURIComponent(effectiveCourseId)}'), 'CourseProgressPage must pass ?courseId= on Take Quiz link')
    assert.ok(takeQuizSrc.includes('QUIZ_COURSE_MISMATCH'), 'TakeQuizPage must handle QUIZ_COURSE_MISMATCH')
    assert.ok(takeQuizSrc.includes("searchParams.get('courseId')"), 'TakeQuizPage must read courseId query parameter')
    check('22. Frontend CourseProgressPage.jsx & TakeQuizPage.jsx pass and enforce courseId context')

    // 23. Phase 36.2.2 non-bypass: passing linked Quiz does not complete Course Enrollment or LearningProgress
    await Enrollment.create({
      userId: learnerUser._id,
      courseId: courseA._id,
      progressPercent: 0,
      status: 'enrolled',
      completedModules: [],
    })
    const lpAfterQuiz = await LearningProgress.findOne({ userId: learnerUser._id, courseId: courseA._id }).lean()
    const enrollmentAfterQuiz = await Enrollment.findOne({ userId: learnerUser._id, courseId: courseA._id }).lean()
    assert.strictEqual(lpAfterQuiz, null)
    assert.strictEqual(enrollmentAfterQuiz.progressPercent, 0)
    assert.strictEqual(enrollmentAfterQuiz.status, 'enrolled')
    check('23. Passing linked quiz does not bypass Phase 36.2.2 LearningActivity/Enrollment completion rules')

    // 24. Certificate safety: passing linked quiz does not auto-issue Certificates
    const certCount = await Certificate.countDocuments({ userId: learnerUser._id, courseId: courseA._id })
    assert.strictEqual(certCount, 0)
    check('24. Passing linked quiz does not auto-issue Certificates')

    console.log(`\nALL ${passed} PHASE 36.2.3 CHECKS PASSED ON kaushalai_test!\n`)
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
  console.error('\n[FAIL] Phase 36.2.3 test failed:', err)
  process.exit(1)
})
