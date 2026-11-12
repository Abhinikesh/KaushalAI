'use strict'

/**
 * Phase 36.2.4 Verification Suite: Competency Mapping & Recommendation Integrity
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
  Department,
  Role,
  Competency,
  RoleCompetency,
  UserCompetency,
  SkillGap,
  Course,
  CourseCompetency,
  Quiz,
  QuizAttempt,
  Enrollment,
  LearningActivity,
  LearningProgress,
  Recommendation,
  LearningPath,
  LearningPathItem,
} = require('./src/models')
const {
  syncCourseCompetencies,
  upsertCourseCompetency,
} = require('./src/services/courseCompetencySync')
const {
  computeUserSkillGaps,
  generateRecommendationsAndLearningPath,
} = require('./src/services/skillGap.service')

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

async function run() {
  let server
  try {
    await mongoose.connect(TEST_DB_URI)
    assert.strictEqual(mongoose.connection.name, 'kaushalai_test', 'Must run exclusively on kaushalai_test')

    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      Role.deleteMany({}),
      Competency.deleteMany({}),
      RoleCompetency.deleteMany({}),
      UserCompetency.deleteMany({}),
      SkillGap.deleteMany({}),
      Course.deleteMany({}),
      CourseCompetency.deleteMany({}),
      Quiz.deleteMany({}),
      QuizAttempt.deleteMany({}),
      Enrollment.deleteMany({}),
      LearningActivity.deleteMany({}),
      LearningProgress.deleteMany({}),
      Recommendation.deleteMany({}),
      LearningPath.deleteMany({}),
      LearningPathItem.deleteMany({}),
    ])

    server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s))
    })
    const port = server.address().port

    // Seed Department + Role + Competencies + RoleCompetencies
    const dept = await Department.create({ name: 'MoSPI', code: 'MOSPI-3624' })
    const role = await Role.create({
      name: 'Statistical Officer',
      level: 2,
      department: 'MoSPI',
      department_ref: dept._id,
      description: 'Official statistical officer.',
    })

    const [compPy, compSurv, compViz, compUnused] = await Competency.create([
      { name: 'Python Data Analysis', category: 'technical', competencyCode: 'COMP-PY-3624' },
      { name: 'Survey Sampling', category: 'statistical', competencyCode: 'COMP-SURV-3624' },
      { name: 'Data Visualization', category: 'technical', competencyCode: 'COMP-VIZ-3624' },
      { name: 'Cloud Architecture', category: 'technical', competencyCode: 'COMP-CLD-3624' },
    ])

    await RoleCompetency.create([
      { role_id: role._id, competency_id: compPy._id, required_level: 4 },
      { role_id: role._id, competency_id: compSurv._id, required_level: 4 },
      { role_id: role._id, competency_id: compViz._id, required_level: 3 },
    ])

    const [adminUser, learnerUser] = await User.create([
      { name: 'Admin 3624', email: 'admin3624@test.local', passwordHash: 'hash', role: 'admin', isEmailVerified: true },
      {
        name: 'Learner 3624',
        email: 'learner3624@test.local',
        passwordHash: 'hash',
        role: 'employee',
        role_id: role._id,
        department: 'MoSPI',
        department_ref: dept._id,
        isEmailVerified: true,
        onboardingCompleted: true,
      },
    ])
    const adminToken = signToken(adminUser)
    const learnerToken = signToken(learnerUser)

    // Pre-seed >20 CourseCompetency rows on dummy active courses to prove syncCourseCompetencies no longer short-circuits at 20
    const dummyComps = await Competency.create(
      Array.from({ length: 22 }, (_, idx) => ({
        name: `Filler Comp ${idx}`,
        category: 'technical',
        competencyCode: `FILL-${idx}`,
      }))
    )
    const [courseActive, courseCompleted, courseArchived, courseUnpublished, courseForSync] = await Course.create([
      {
        title: 'Applied Python & Survey Analytics',
        description: 'Active published course.',
        competencyDomain: 'Statistics',
        isPublished: true,
        isDeleted: false,
        modules: [{ title: 'Module 1', durationMins: 30, slides: [{ slideNumber: 1, title: 'Slide 1', bulletPoints: ['Key point'] }] }],
      },
      {
        title: 'Completed Visualization Course',
        description: 'Already completed by learner.',
        competencyDomain: 'Data Visualization',
        isPublished: true,
        isDeleted: false,
      },
      {
        title: 'Archived Python Course',
        description: 'Archived.',
        competencyDomain: 'Statistics',
        isPublished: true,
        isDeleted: true,
      },
      {
        title: 'Unpublished Draft Course',
        description: 'Unpublished.',
        competencyDomain: 'Statistics',
        isPublished: false,
        isDeleted: false,
      },
      {
        title: 'Explicitly Tagged Survey Course',
        description: 'Synced via skillTags after >20 existing mappings.',
        competencyDomain: 'Survey',
        skillTags: [compSurv._id],
        isPublished: true,
        isDeleted: false,
      },
    ])
    await CourseCompetency.insertMany(
      dummyComps.map((c) => ({ course_id: courseForSync._id, competency_id: c._id, relevance_weight: 0.5 }))
    )

    let passed = 0
    const check = (label) => {
      passed += 1
      console.log(`  [PASS ${passed}] ${label}`)
    }

    // 1. Valid course-to-competency mapping + syncCourseCompetencies past >20 rows
    const cc1 = await upsertCourseCompetency({ courseId: courseActive._id, competencyId: compPy._id, relevanceWeight: 1.0 })
    assert.strictEqual(String(cc1.course_id), String(courseActive._id))
    assert.strictEqual(String(cc1.competency_id), String(compPy._id))
    await upsertCourseCompetency({ courseId: courseCompleted._id, competencyId: compViz._id, relevanceWeight: 1.0 })
    await assert.rejects(
      () => upsertCourseCompetency({ courseId: courseArchived._id, competencyId: compPy._id, relevanceWeight: 1.0 }),
      /archived/i
    )
    // Simulate a CourseCompetency row that existed before courseArchived was archived
    await CourseCompetency.create({ course_id: courseArchived._id, competency_id: compPy._id, relevance_weight: 1.0 })
    await upsertCourseCompetency({ courseId: courseUnpublished._id, competencyId: compPy._id, relevanceWeight: 1.0 })

    const synced = await syncCourseCompetencies()
    assert.ok(synced >= 1, 'syncCourseCompetencies must sync explicit skillTags even when existingCount > 20')
    const syncedSurveyCC = await CourseCompetency.findOne({ course_id: courseForSync._id, competency_id: compSurv._id }).lean()
    assert.ok(syncedSurveyCC, 'Explicit Course.skillTags must be synced to CourseCompetency')
    check('1. Valid course-to-competency mapping & syncCourseCompetencies bypasses old >20 short-circuit without guessing')

    // 2. Invalid competency reference rejection (CourseCompetency + Quiz API)
    await assert.rejects(
      () => upsertCourseCompetency({ courseId: courseActive._id, competencyId: new mongoose.Types.ObjectId() }),
      /not found/i
    )
    const badQuizComp = await requestJson(port, {
      method: 'POST',
      path: '/api/quizzes',
      token: adminToken,
      body: {
        title: 'Bad Comp Quiz',
        courseId: String(courseActive._id),
        tagCompetencyIds: [String(new mongoose.Types.ObjectId())],
        questions: [{ questionText: 'Q1?', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0 }],
      },
    })
    assert.strictEqual(badQuizComp.status, 404)
    assert.strictEqual(badQuizComp.body.code, 'COMPETENCY_NOT_FOUND')
    check('2. Invalid competency reference rejected in CourseCompetency & Quiz creation')

    // 3. Duplicate mapping prevention
    await upsertCourseCompetency({ courseId: courseActive._id, competencyId: compPy._id, relevanceWeight: 0.9 })
    const dupCount = await CourseCompetency.countDocuments({ course_id: courseActive._id, competency_id: compPy._id })
    assert.strictEqual(dupCount, 1)
    check('3. Duplicate CourseCompetency mapping prevented (1 row preserved)')

    // 4. Multiple quizzes linked to one course (one-to-many)
    const qMulti1 = await requestJson(port, {
      method: 'POST',
      path: '/api/quizzes',
      token: adminToken,
      body: {
        title: 'Course Active — Question-Mapped Quiz',
        courseId: String(courseActive._id),
        tagCompetencyIds: [String(compViz._id)], // Quiz-level tag should be overridden by question-level tags
        questions: [
          { questionText: 'Py Q1', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0, competency_id: String(compPy._id) },
          { questionText: 'Py Q2', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0, competency_id: String(compPy._id) },
          { questionText: 'Surv Q1', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0, competency_id: String(compSurv._id) },
          { questionText: 'Surv Q2', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0, competency_id: String(compSurv._id) },
        ],
        isPublished: true,
      },
    })
    const qMulti2 = await requestJson(port, {
      method: 'POST',
      path: '/api/quizzes',
      token: adminToken,
      body: {
        title: 'Course Active — Quiz-Level Fallback Quiz',
        courseId: String(courseActive._id),
        tagCompetencyIds: [String(compViz._id)],
        questions: [
          { questionText: 'Viz Q1', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0 },
          { questionText: 'Viz Q2', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0 },
        ],
        isPublished: true,
      },
    })
    assert.strictEqual(qMulti1.status, 201)
    assert.strictEqual(qMulti2.status, 201)
    const courseQuizzesRes = await requestJson(port, {
      method: 'GET',
      path: `/api/quizzes?courseId=${courseActive._id}`,
      token: learnerToken,
    })
    assert.strictEqual(courseQuizzesRes.status, 200)
    assert.strictEqual(courseQuizzesRes.body.quizzes.length, 2)
    check('4. Multiple quizzes linked to one course (one-to-many)')

    // Seed historical UserCompetency for compUnused to verify it remains intact (check 15)
    await UserCompetency.create({
      user_id: learnerUser._id,
      competency_id: compUnused._id,
      current_level: 3,
      source: 'diagnostic_test',
    })

    // 5. Question-level competency mapping takes priority over quiz-level tagCompetencyIds
    const q1Obj = qMulti1.body.quiz
    const start1 = await requestJson(port, {
      method: 'POST',
      path: `/api/quizzes/${q1Obj._id}/start-attempt`,
      token: learnerToken,
      body: { courseId: String(courseActive._id) },
    })
    assert.strictEqual(start1.status, 201)
    // Pass overall (75%): 2/2 Python (100% -> level 4), 1/2 Survey (50% -> level 2); compViz (quiz-level tag) NOT updated
    const sub1 = await requestJson(port, {
      method: 'POST',
      path: `/api/quizzes/${q1Obj._id}/attempts`,
      token: learnerToken,
      body: {
        attemptId: start1.body.attemptId,
        courseId: String(courseActive._id),
        answers: [
          { questionId: String(q1Obj.questionIds[0]._id), selectedOptionIndex: 0 },
          { questionId: String(q1Obj.questionIds[1]._id), selectedOptionIndex: 0 },
          { questionId: String(q1Obj.questionIds[2]._id), selectedOptionIndex: 0 },
          { questionId: String(q1Obj.questionIds[3]._id), selectedOptionIndex: 1 }, // wrong
        ],
      },
    })
    assert.strictEqual(sub1.status, 201)
    assert.strictEqual(sub1.body.passed, true)
    const ucPyAfter = await UserCompetency.findOne({ user_id: learnerUser._id, competency_id: compPy._id }).lean()
    const ucSurvAfter = await UserCompetency.findOne({ user_id: learnerUser._id, competency_id: compSurv._id }).lean()
    const ucVizBefore = await UserCompetency.findOne({ user_id: learnerUser._id, competency_id: compViz._id }).lean()
    assert.strictEqual(ucPyAfter.current_level, 4)
    assert.strictEqual(ucSurvAfter.current_level, 2)
    assert.strictEqual(ucVizBefore, null, 'Quiz-level tag must not update when question-level tags are present')
    check('5. Question-level competency mapping takes priority & scores each tested competency independently')

    // 7. Failed quiz (<70%) does not update competencies
    const q2Obj = qMulti2.body.quiz
    const failStart = await requestJson(port, {
      method: 'POST',
      path: `/api/quizzes/${q2Obj._id}/start-attempt`,
      token: learnerToken,
      body: { courseId: String(courseActive._id) },
    })
    const failSub = await requestJson(port, {
      method: 'POST',
      path: `/api/quizzes/${q2Obj._id}/attempts`,
      token: learnerToken,
      body: {
        attemptId: failStart.body.attemptId,
        courseId: String(courseActive._id),
        answers: [
          { questionId: String(q2Obj.questionIds[0]._id), selectedOptionIndex: 0 },
          { questionId: String(q2Obj.questionIds[1]._id), selectedOptionIndex: 1 }, // 50% < 70%
        ],
      },
    })
    assert.strictEqual(failSub.status, 201)
    assert.strictEqual(failSub.body.passed, false)
    assert.strictEqual(await UserCompetency.findOne({ user_id: learnerUser._id, competency_id: compViz._id }).lean(), null)
    check('7. Failed quiz (<70%) does not update competencies')

    // 6. Quiz-level fallback mapping updates compViz when passed
    const passStart2 = await requestJson(port, {
      method: 'POST',
      path: `/api/quizzes/${q2Obj._id}/start-attempt`,
      token: learnerToken,
      body: { courseId: String(courseActive._id) },
    })
    const passSub2 = await requestJson(port, {
      method: 'POST',
      path: `/api/quizzes/${q2Obj._id}/attempts`,
      token: learnerToken,
      body: {
        attemptId: passStart2.body.attemptId,
        courseId: String(courseActive._id),
        answers: [
          { questionId: String(q2Obj.questionIds[0]._id), selectedOptionIndex: 0 },
          { questionId: String(q2Obj.questionIds[1]._id), selectedOptionIndex: 0 },
        ],
      },
    })
    assert.strictEqual(passSub2.status, 201)
    assert.strictEqual(passSub2.body.passed, true)
    const ucVizAfter = await UserCompetency.findOne({ user_id: learnerUser._id, competency_id: compViz._id }).lean()
    assert.strictEqual(ucVizAfter.current_level, 4)
    check('6. Quiz-level tagCompetencyIds fallback updates competency when questions have no competency_id')

    // 8. Duplicate quiz submission does not update competencies twice
    const dupSub = await requestJson(port, {
      method: 'POST',
      path: `/api/quizzes/${q2Obj._id}/attempts`,
      token: learnerToken,
      body: {
        attemptId: passStart2.body.attemptId,
        courseId: String(courseActive._id),
        answers: [
          { questionId: String(q2Obj.questionIds[0]._id), selectedOptionIndex: 0 },
          { questionId: String(q2Obj.questionIds[1]._id), selectedOptionIndex: 0 },
        ],
      },
    })
    assert.strictEqual(dupSub.status, 400)
    assert.strictEqual(dupSub.body.code, 'ATTEMPT_ALREADY_COMPLETED')
    check('8. Duplicate quiz submission rejected (400 ATTEMPT_ALREADY_COMPLETED) without double credit')

    // 9 & 10. Course enrollment & 100% LearningActivity completion without quiz/assessment evidence do NOT fabricate competency updates
    const ucSnapshotBefore = await UserCompetency.find({ user_id: learnerUser._id }).sort({ competency_id: 1 }).lean()
    const enrollRes = await requestJson(port, {
      method: 'POST',
      path: '/api/users/me/enrollments',
      token: learnerToken,
      body: { courseId: String(courseActive._id) },
    })
    assert.strictEqual(enrollRes.status, 201)
    const enrollId = enrollRes.body.enrollment._id
    const ucAfterEnroll = await UserCompetency.find({ user_id: learnerUser._id }).sort({ competency_id: 1 }).lean()
    assert.deepStrictEqual(
      ucAfterEnroll.map((u) => [String(u.competency_id), u.current_level]),
      ucSnapshotBefore.map((u) => [String(u.competency_id), u.current_level])
    )
    check('9. Course enrollment alone does not improve competencies')

    const slideId = String(courseActive.modules[0].slides[0]._id)
    const actRes = await requestJson(port, {
      method: 'POST',
      path: `/api/users/me/enrollments/${enrollId}/activity`,
      token: learnerToken,
      body: {
        moduleId: String(courseActive.modules[0]._id),
        moduleIndex: 0,
        contentType: 'slide',
        contentId: slideId,
      },
    })
    assert.strictEqual(actRes.status, 200)
    const pctAfterAct = actRes.body.enrollment?.progressPercent ?? actRes.body.progress?.progressPercent
    assert.strictEqual(pctAfterAct, 100)
    const ucAfterComplete = await UserCompetency.find({ user_id: learnerUser._id }).sort({ competency_id: 1 }).lean()
    assert.deepStrictEqual(
      ucAfterComplete.map((u) => [String(u.competency_id), u.current_level]),
      ucSnapshotBefore.map((u) => [String(u.competency_id), u.current_level])
    )
    check('10. Course completion via LearningActivity without assessment evidence does not fabricate competency improvement')

    // 11. Skill-gap recalculation uses valid learner records
    const gaps = await computeUserSkillGaps(learnerUser._id)
    const gapByComp = new Map(gaps.map((g) => [String(g.competency_id), g]))
    assert.strictEqual(gapByComp.get(String(compPy._id)).gap, 0)   // req 4 - cur 4
    assert.strictEqual(gapByComp.get(String(compSurv._id)).gap, 2) // req 4 - cur 2
    assert.strictEqual(gapByComp.get(String(compViz._id)).gap, -1) // req 3 - cur 4
    check('11. Skill-gap recalculation computes accurate gaps from UserCompetency + RoleCompetency')

    // 12 & 13. Recommendations exclude completed, archived, and unpublished courses
    // Mark courseCompleted as completed for learnerUser
    await Enrollment.create({ userId: learnerUser._id, courseId: courseCompleted._id, progressPercent: 100, status: 'completed' })
    // Also add compSurv gap coverage to courseCompleted & courseArchived so only courseForSync is eligible
    await upsertCourseCompetency({ courseId: courseCompleted._id, competencyId: compSurv._id, relevanceWeight: 1.0 })
    await CourseCompetency.create({ course_id: courseArchived._id, competency_id: compSurv._id, relevance_weight: 1.0 })
    await upsertCourseCompetency({ courseId: courseUnpublished._id, competencyId: compSurv._id, relevanceWeight: 1.0 })

    const recPipe = await generateRecommendationsAndLearningPath(learnerUser._id)
    const recCourseIds = recPipe.recommendations.map((r) => String(r.course_id?._id || r.course_id))
    assert.ok(recCourseIds.includes(String(courseForSync._id)), 'Active eligible course matching gap should be recommended')
    assert.ok(!recCourseIds.includes(String(courseCompleted._id)), 'Completed course must be excluded')
    assert.ok(!recCourseIds.includes(String(courseArchived._id)), 'Archived course must be excluded')
    assert.ok(!recCourseIds.includes(String(courseUnpublished._id)), 'Unpublished course must be excluded')

    const apiRecs = await requestJson(port, { method: 'GET', path: '/api/recommendations', token: learnerToken })
    assert.strictEqual(apiRecs.status, 200)
    const apiRecIds = apiRecs.body.recommendations.map((r) => String(r.course_id._id))
    assert.ok(!apiRecIds.includes(String(courseCompleted._id)))
    assert.ok(!apiRecIds.includes(String(courseArchived._id)))
    assert.ok(!apiRecIds.includes(String(courseUnpublished._id)))
    check('12 & 13. Completed, archived, and unpublished courses excluded in recommendation generation and GET /api/recommendations')

    // 14. Missing mappings produce safe empty behavior (no fabricated fallback)
    await CourseCompetency.deleteMany({ competency_id: compSurv._id })
    await Course.updateMany({}, { $set: { skillTags: [] } })
    const emptyRecPipe = await generateRecommendationsAndLearningPath(learnerUser._id)
    assert.deepStrictEqual(emptyRecPipe.recommendations, [])
    check('14. Missing course-competency mappings produce safe empty recommendations without fabricated placeholders')

    // 15. Historical competency record remains intact
    const ucUnusedAfter = await UserCompetency.findOne({ user_id: learnerUser._id, competency_id: compUnused._id }).lean()
    assert.strictEqual(ucUnusedAfter.current_level, 3)
    assert.strictEqual(ucUnusedAfter.source, 'diagnostic_test')
    check('15. Existing historical UserCompetency records remain intact')

    console.log(`\nALL ${passed} PHASE 36.2.4 CHECKS PASSED ON kaushalai_test!\n`)
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
  console.error('\n[FAIL] Phase 36.2.4 test failed:', err)
  process.exit(1)
})
