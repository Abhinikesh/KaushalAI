'use strict'

/**
 * Phase 35.3 Verification Suite: Assessment-to-Competency Integrity
 *
 * Strictly executes against `mongodb://127.0.0.1:27017/kaushalai_test`.
 * Never mutates the `kaushalai` development database.
 */

const assert = require('assert')
const http = require('http')
const path = require('path')
const express = require('express')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')

require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'kaushalai_dev_access_secret_change_in_prod'
const TEST_DB_URI = 'mongodb://127.0.0.1:27017/kaushalai_test'
const DEV_DB_URI = 'mongodb://127.0.0.1:27017/kaushalai'

const {
  User,
  Role,
  Department,
  Competency,
  RoleCompetency,
  SkillGap,
  UserCompetency,
  AssessmentAttempt,
  AssessmentResponse,
  Question,
  Quiz,
  QuizAttempt,
  Course,
  Certificate,
  Conversation,
  Message,
} = require('./src/models')

const {
  applyCompetencyUpdates,
  recoverPendingSkillGapSync,
  recoverAllPendingSkillGapSyncs,
  setSyncFailureSimulator,
  clearSyncFailureSimulator,
} = require('./src/services/competencyUpdate.service')
const { computeUserSkillGaps } = require('./src/services/skillGap.service')
const { getDepartmentCompetencyHeatmap, getOrgWideTopGaps } = require('./src/services/adminAnalytics.service')

const assessmentRoutes = require('./src/routes/assessment.routes')
const mcqRoutes = require('./src/routes/mcq.routes')
const skillGapRoutes = require('./src/routes/skillGap.routes')
const competencyRoutes = require('./src/routes/competency.routes')
const userFeaturesRoutes = require('./src/routes/userFeatures.routes')
const aiRoutes = require('./src/routes/aiChat.routes')

function makeToken(user) {
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
    const headers = {}
    if (token) headers.Authorization = `Bearer ${token}`
    let payload = null
    if (body !== null) {
      payload = JSON.stringify(body)
      headers['Content-Type'] = 'application/json'
      headers['Content-Length'] = Buffer.byteLength(payload)
    }

    const req = http.request(
      { hostname: '127.0.0.1', port, path: reqPath, method, headers },
      (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} })
          } catch (_err) {
            resolve({ status: res.statusCode, body: { raw: data } })
          }
        })
      }
    )
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

async function getDevDbSnapshot() {
  const conn = await mongoose.createConnection(DEV_DB_URI).asPromise()
  try {
    const cols = ['users', 'user_competencies', 'usercompetencies', 'skill_gaps', 'assessment_attempts', 'quizattempts']
    const counts = {}
    for (const c of cols) {
      counts[c] = await conn.db.collection(c).countDocuments()
    }
    return counts
  } finally {
    await conn.close()
  }
}

async function run() {
  let server = null
  const testRunId = Date.now()
  let passed = 0
  let failed = 0

  async function check(name, fn) {
    try {
      await fn()
      console.log(`  ✓ ${name}`)
      passed++
    } catch (err) {
      console.error(`  ✗ ${name}:`, err.message)
      failed++
    }
  }

  console.log('\n=== Phase 35.3: Assessment-to-Competency Integrity Test Suite ===')
  const devSnapshotBefore = await getDevDbSnapshot()
  console.log('Dev DB baseline counts:', devSnapshotBefore)

  await mongoose.connect(TEST_DB_URI)
  assert.strictEqual(mongoose.connection.name, 'kaushalai_test', 'Must run exclusively on kaushalai_test')

  // Build focused Express test app matching app.js router mount prefixes
  const app = express()
  app.use(express.json())
  app.use('/api/assessments', assessmentRoutes)
  app.use('/api', mcqRoutes)
  app.use('/api', skillGapRoutes)
  app.use('/api', competencyRoutes)
  app.use('/api', userFeaturesRoutes)
  app.use('/api', aiRoutes)
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ message: err.message || 'Internal error' })
  })

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve)
  })
  const { port } = server.address()

  const createdUserIds = []
  const createdRoleIds = []
  const createdCompIds = []
  const createdQuizIds = []
  const createdCourseIds = []
  let deptDoc = null

  try {
    // ── Seed clean isolated domain fixtures ─────────────────────────────────
    deptDoc = await Department.create({
      name: `P353 Statistical Methods ${testRunId}`,
      code: `P353_SM_${testRunId}`,
      description: 'Phase 35.3 test department',
    })

    const roleDoc = await Role.create({
      name: `P353 Statistical Analyst ${testRunId}`,
      department_ref: deptDoc._id,
      level: 3,
    })
    createdRoleIds.push(roleDoc._id)

    const [compA, compB, compC] = await Competency.insertMany([
      { name: `P353 Survey Design ${testRunId}`, category: 'statistical', competencyCode: `P353A_${testRunId}` },
      { name: `P353 Sampling Inference ${testRunId}`, category: 'technical', competencyCode: `P353B_${testRunId}` },
      { name: `P353 Data Governance ${testRunId}`, category: 'digital_governance', competencyCode: `P353C_${testRunId}` },
    ])
    createdCompIds.push(compA._id, compB._id, compC._id)

    await RoleCompetency.insertMany([
      { role_id: roleDoc._id, competency_id: compA._id, required_level: 4 },
      { role_id: roleDoc._id, competency_id: compB._id, required_level: 3 },
      { role_id: roleDoc._id, competency_id: compC._id, required_level: 4 },
    ])

    const courseDoc = await Course.create({
      title: `P353 Advanced Sampling Course ${testRunId}`,
      description: 'Published course for recommendation pipeline',
      domain: 'Statistics',
      level: 'intermediate',
      estimatedHours: 8,
      isPublished: true,
      skillTags: [compA._id, compB._id],
    })
    createdCourseIds.push(courseDoc._id)

    const learner = await User.create({
      name: 'Phase 35.3 Learner',
      email: `p353.learner.${testRunId}@kaushalai.test`,
      passwordHash: '$2b$10$dummyhashfortestingonly1234567890',
      role: 'employee',
      department: deptDoc.name,
      role_id: roleDoc._id,
      level: 3,
      isActive: true,
    })
    const adminUser = await User.create({
      name: 'Phase 35.3 Admin',
      email: `p353.admin.${testRunId}@kaushalai.test`,
      passwordHash: '$2b$10$dummyhashfortestingonly1234567890',
      role: 'admin',
      department: deptDoc.name,
      role_id: roleDoc._id,
      level: 5,
      isActive: true,
    })
    const noRoleLearner = await User.create({
      name: 'Phase 35.3 Unresolved Role Learner',
      email: `p353.norole.${testRunId}@kaushalai.test`,
      passwordHash: '$2b$10$dummyhashfortestingonly1234567890',
      role: 'employee',
      department: `Unmapped Dept ${testRunId}`,
      role_id: null,
      level: 2,
      isActive: true,
    })
    createdUserIds.push(learner._id, adminUser._id, noRoleLearner._id)

    const learnerToken = makeToken(learner)
    const adminToken = makeToken(adminUser)
    const noRoleToken = makeToken(noRoleLearner)

    // Helper: create a diagnostic in_progress attempt with deterministic 2-competency questions
    async function createSeededDiagnosticAttempt(userDoc, minutesLeft = 20) {
      const qDocs = await Question.insertMany([
        {
          question_text: 'P353 Diag Q1 (Comp A)',
          questionText: 'P353 Diag Q1 (Comp A)',
          competency_id: compA._id,
          options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }, { id: 'c', text: 'C' }, { id: 'd', text: 'D' }],
          correct_option_id: 'a',
          difficulty_level: 2,
          is_active: true,
        },
        {
          question_text: 'P353 Diag Q2 (Comp A)',
          questionText: 'P353 Diag Q2 (Comp A)',
          competency_id: compA._id,
          options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }, { id: 'c', text: 'C' }, { id: 'd', text: 'D' }],
          correct_option_id: 'b',
          difficulty_level: 3,
          is_active: true,
        },
        {
          question_text: 'P353 Diag Q3 (Comp B)',
          questionText: 'P353 Diag Q3 (Comp B)',
          competency_id: compB._id,
          options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }, { id: 'c', text: 'C' }, { id: 'd', text: 'D' }],
          correct_option_id: 'c',
          difficulty_level: 2,
          is_active: true,
        },
        {
          question_text: 'P353 Diag Q4 (Comp B)',
          questionText: 'P353 Diag Q4 (Comp B)',
          competency_id: compB._id,
          options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }, { id: 'c', text: 'C' }, { id: 'd', text: 'D' }],
          correct_option_id: 'd',
          difficulty_level: 2,
          is_active: true,
        },
      ])
      const startedAt = new Date(Date.now() - (20 - minutesLeft) * 60 * 1000)
      const expiresAt = new Date(Date.now() + minutesLeft * 60 * 1000)
      const attempt = await AssessmentAttempt.create({
        user_id: userDoc._id,
        assessment_id: new mongoose.Types.ObjectId(),
        question_ids: qDocs.map((q) => q._id),
        status: 'in_progress',
        started_at: startedAt,
        expires_at: expiresAt,
      })
      return { attempt, qDocs }
    }

    // 1. Diagnostic submission updates canonical UserCompetency + SkillGap accurately
    await check('1. Diagnostic submission atomically completes attempt, updates canonical UserCompetency and computes SkillGap', async () => {
      const { attempt, qDocs } = await createSeededDiagnosticAttempt(learner, 18)

      // Save one answer before submit to test merge
      const saveRes = await requestJson(port, {
        method: 'POST',
        path: `/api/assessments/diagnostic/${attempt._id}/save-answer`,
        token: learnerToken,
        body: { question_id: qDocs[0]._id, selected_option_id: 'a', time_taken_seconds: 12 },
      })
      assert.strictEqual(saveRes.status, 200)

      // Submit: Comp A = 2/2 (100% -> Level 5), Comp B = 0/2 (0% -> Level 1)
      const submitRes = await requestJson(port, {
        method: 'POST',
        path: `/api/assessments/diagnostic/${attempt._id}/submit`,
        token: learnerToken,
        body: {
          responses: [
            { question_id: qDocs[0]._id, selected_option_id: 'a' },
            { question_id: qDocs[1]._id, selected_option_id: 'b' },
            { question_id: qDocs[2]._id, selected_option_id: 'a' }, // wrong
            { question_id: qDocs[3]._id, selected_option_id: 'a' }, // wrong
          ],
        },
      })
      assert.strictEqual(submitRes.status, 200)
      assert.strictEqual(submitRes.body.overall_score, 50)
      assert.strictEqual(submitRes.body.onboarding_step, 6)

      const ucA = await UserCompetency.findOne({ user_id: learner._id, competency_id: compA._id })
      const ucB = await UserCompetency.findOne({ user_id: learner._id, competency_id: compB._id })
      assert.strictEqual(ucA.current_level, 5)
      assert.strictEqual(ucA.source, 'diagnostic_test')
      assert.strictEqual(ucB.current_level, 1)
      assert.strictEqual(ucB.source, 'diagnostic_test')

      // Check SkillGap values match req - cur formula
      const gapA = await SkillGap.findOne({ user_id: learner._id, competency_id: compA._id })
      const gapB = await SkillGap.findOne({ user_id: learner._id, competency_id: compB._id })
      assert.strictEqual(gapA.gap, -1) // req 4 - cur 5
      assert.strictEqual(gapA.priority, 'low')
      assert.strictEqual(gapB.gap, 2) // req 3 - cur 1
      assert.strictEqual(gapB.priority, 'high')
    })

    // 2. Diagnostic duplicate & concurrent submission protection
    await check('2. Duplicate & concurrent diagnostic submit protection prevents double writes', async () => {
      // Create a fresh attempt to submit concurrently
      const { attempt, qDocs } = await createSeededDiagnosticAttempt(learner, 15)

      const [r1, r2] = await Promise.all([
        requestJson(port, {
          method: 'POST',
          path: `/api/assessments/diagnostic/${attempt._id}/submit`,
          token: learnerToken,
          body: {
            responses: [
              { question_id: qDocs[0]._id, selected_option_id: 'b' }, // 50% Comp A -> wait diagnostic writes Comp A=2/2? Let's send 100% Comp A & 50% Comp B -> L5 & L3
              { question_id: qDocs[1]._id, selected_option_id: 'b' },
              { question_id: qDocs[2]._id, selected_option_id: 'c' }, // right
              { question_id: qDocs[3]._id, selected_option_id: 'a' }, // wrong -> Comp B = 50% -> L3
            ],
          },
        }),
        requestJson(port, {
          method: 'POST',
          path: `/api/assessments/diagnostic/${attempt._id}/submit`,
          token: learnerToken,
          body: {
            responses: [
              { question_id: qDocs[0]._id, selected_option_id: 'a' },
              { question_id: qDocs[1]._id, selected_option_id: 'b' },
              { question_id: qDocs[2]._id, selected_option_id: 'c' },
              { question_id: qDocs[3]._id, selected_option_id: 'a' },
            ],
          },
        }),
      ])

      const statuses = [r1.status, r2.status].sort((a, b) => a - b)
      assert.deepStrictEqual(statuses, [200, 409])
      const ucRowsB = await UserCompetency.find({ user_id: learner._id, competency_id: compB._id })
      const gapRowsB = await SkillGap.find({ user_id: learner._id, competency_id: compB._id })
      assert.strictEqual(ucRowsB.length, 1)
      assert.strictEqual(gapRowsB.length, 1)

      // Third submit also returns 409
      const r3 = await requestJson(port, {
        method: 'POST',
        path: `/api/assessments/diagnostic/${attempt._id}/submit`,
        token: learnerToken,
        body: { responses: [] },
      })
      assert.strictEqual(r3.status, 409)
      assert.strictEqual(r3.body.code, 'ATTEMPT_ALREADY_COMPLETED')
    })

    // 3. Multi-competency quiz only updates accurately passed/assessed competencies & no-downgrade rule
    await check('3. Multi-competency quiz updates ONLY assessed high-accuracy competency, never unrelated or 0% ones, and never downgrades', async () => {
      // Reset learner baseline: Comp A = Level 4 (so 75% quiz doesn't downgrade), Comp B = Level 1, Comp C = Level 1
      await UserCompetency.findOneAndUpdate({ user_id: learner._id, competency_id: compA._id }, { current_level: 4 }, { upsert: true })
      await UserCompetency.findOneAndUpdate({ user_id: learner._id, competency_id: compB._id }, { current_level: 1 }, { upsert: true })
      await UserCompetency.findOneAndUpdate({ user_id: learner._id, competency_id: compC._id }, { current_level: 1 }, { upsert: true })
      await computeUserSkillGaps(learner._id)

      // Build quiz via POST /api/quizzes (using admin token) with per-question competency_id tags:
      // 3 questions for Comp B (all answered right -> 100% -> Level 4)
      // 1 question for Comp C (answered wrong -> 0% -> Level 1, NO upgrade!)
      // Overall score: 3/4 = 75% (PASSED >= 70%), yet Comp C got 0%!
      const createRes = await requestJson(port, {
        method: 'POST',
        path: '/api/quizzes',
        token: adminToken,
        body: {
          title: `P353 Mixed Comp Quiz ${testRunId}`,
          domain: 'Statistics',
          tagCompetencyIds: [compB._id, compC._id],
          questions: [
            { questionText: 'B1', options: ['x', 'y'], correctOptionIndex: 0, competency_id: compB._id },
            { questionText: 'B2', options: ['x', 'y'], correctOptionIndex: 0, competency_id: compB._id },
            { questionText: 'B3', options: ['x', 'y'], correctOptionIndex: 0, competency_id: compB._id },
            { questionText: 'C1', options: ['x', 'y'], correctOptionIndex: 0, competency_id: compC._id },
          ],
        },
      })
      assert.strictEqual(createRes.status, 201)
      const quiz = createRes.body.quiz
      createdQuizIds.push(quiz._id)
      const qIds = quiz.questionIds

      const startRes = await requestJson(port, {
        method: 'POST',
        path: `/api/quizzes/${quiz._id}/start-attempt`,
        token: learnerToken,
      })
      assert.strictEqual(startRes.status, 201)

      const subRes = await requestJson(port, {
        method: 'POST',
        path: `/api/quizzes/${quiz._id}/attempts`,
        token: learnerToken,
        body: {
          attemptId: startRes.body.attemptId,
          answers: [
            { questionId: qIds[0]._id, selectedOptionIndex: 0 }, // B1 right
            { questionId: qIds[1]._id, selectedOptionIndex: 0 }, // B2 right
            { questionId: qIds[2]._id, selectedOptionIndex: 0 }, // B3 right -> Comp B 100% -> Level 4
            { questionId: qIds[3]._id, selectedOptionIndex: 1 }, // C1 wrong -> Comp C 0% -> stay Level 1!
          ],
        },
      })
      assert.strictEqual(subRes.status, 201)
      assert.strictEqual(subRes.body.score, 75)
      assert.strictEqual(subRes.body.passed, true)
      assert.strictEqual(subRes.body.competencyUpdates.length, 1)
      assert.strictEqual(String(subRes.body.competencyUpdates[0].competencyId), String(compB._id))
      assert.strictEqual(subRes.body.competencyUpdates[0].newLevel, 4)

      const ucB = await UserCompetency.findOne({ user_id: learner._id, competency_id: compB._id })
      const ucC = await UserCompetency.findOne({ user_id: learner._id, competency_id: compC._id })
      const ucA = await UserCompetency.findOne({ user_id: learner._id, competency_id: compA._id })
      assert.strictEqual(ucB.current_level, 4)
      assert.strictEqual(ucC.current_level, 1) // 0% on Comp C must NOT upgrade even though quiz passed!
      assert.strictEqual(ucA.current_level, 4) // Unrelated Comp A untouched

      const gapB = await SkillGap.findOne({ user_id: learner._id, competency_id: compB._id })
      assert.strictEqual(gapB.current_level, 4)
      assert.strictEqual(gapB.gap, -1) // req 3 - cur 4
      assert.strictEqual(gapB.priority, 'low')
    })

    // 4. Failed quiz (< 70%), expired quiz, expired diagnostic, and duplicate quiz submit rules
    await check('4. Failed (<70%), expired, incomplete, and duplicate quiz attempts apply zero unauthorized competency updates', async () => {
      await UserCompetency.findOneAndUpdate({ user_id: learner._id, competency_id: compC._id }, { current_level: 1 }, { upsert: true })

      // Failed quiz (2 questions, 1 right -> 50% < 70%)
      const failQuizRes = await requestJson(port, {
        method: 'POST',
        path: '/api/quizzes',
        token: adminToken,
        body: {
          title: `P353 Fail Quiz ${testRunId}`,
          domain: 'Statistics',
          tagCompetencyIds: [compC._id],
          questions: [
            { questionText: 'Q1', options: ['a', 'b'], correctOptionIndex: 0 },
            { questionText: 'Q2', options: ['a', 'b'], correctOptionIndex: 0 },
          ],
        },
      })
      const failQuiz = failQuizRes.body.quiz
      createdQuizIds.push(failQuiz._id)

      const failStart = await requestJson(port, {
        method: 'POST',
        path: `/api/quizzes/${failQuiz._id}/start-attempt`,
        token: learnerToken,
      })
      const failSubmit = await requestJson(port, {
        method: 'POST',
        path: `/api/quizzes/${failQuiz._id}/attempts`,
        token: learnerToken,
        body: {
          attemptId: failStart.body.attemptId,
          answers: [
            { questionId: failQuiz.questionIds[0]._id, selectedOptionIndex: 0 }, // right
            { questionId: failQuiz.questionIds[1]._id, selectedOptionIndex: 1 }, // wrong -> 50% FAIL
          ],
        },
      })
      assert.strictEqual(failSubmit.status, 201)
      assert.strictEqual(failSubmit.body.score, 50)
      assert.strictEqual(failSubmit.body.passed, false)
      assert.deepStrictEqual(failSubmit.body.competencyUpdates, [])

      const ucCAfterFail = await UserCompetency.findOne({ user_id: learner._id, competency_id: compC._id })
      assert.strictEqual(ucCAfterFail.current_level, 1)

      // Duplicate quiz submit on completed attempt -> 400 ATTEMPT_ALREADY_COMPLETED
      const dupQuizSubmit = await requestJson(port, {
        method: 'POST',
        path: `/api/quizzes/${failQuiz._id}/attempts`,
        token: learnerToken,
        body: {
          attemptId: failStart.body.attemptId,
          answers: [
            { questionId: failQuiz.questionIds[0]._id, selectedOptionIndex: 0 },
            { questionId: failQuiz.questionIds[1]._id, selectedOptionIndex: 0 },
          ],
        },
      })
      assert.strictEqual(dupQuizSubmit.status, 400)
      assert.strictEqual(dupQuizSubmit.body.code, 'ATTEMPT_ALREADY_COMPLETED')

      // Expired quiz submit
      const expQuizStart = await requestJson(port, {
        method: 'POST',
        path: `/api/quizzes/${failQuiz._id}/start-attempt`,
        token: learnerToken,
      })
      await QuizAttempt.findByIdAndUpdate(expQuizStart.body.attemptId, {
        deadline: new Date(Date.now() - 60000),
      })
      const expQuizSubmit = await requestJson(port, {
        method: 'POST',
        path: `/api/quizzes/${failQuiz._id}/attempts`,
        token: learnerToken,
        body: {
          attemptId: expQuizStart.body.attemptId,
          answers: [
            { questionId: failQuiz.questionIds[0]._id, selectedOptionIndex: 0 },
            { questionId: failQuiz.questionIds[1]._id, selectedOptionIndex: 0 },
          ],
        },
      })
      assert.strictEqual(expQuizSubmit.status, 400)
      assert.strictEqual(expQuizSubmit.body.code, 'ASSESSMENT_EXPIRED')
      const ucCAfterExpired = await UserCompetency.findOne({ user_id: learner._id, competency_id: compC._id })
      assert.strictEqual(ucCAfterExpired.current_level, 1)

      // Expired diagnostic submit
      const { attempt: expDiag } = await createSeededDiagnosticAttempt(learner, -2)
      const expDiagSubmit = await requestJson(port, {
        method: 'POST',
        path: `/api/assessments/diagnostic/${expDiag._id}/submit`,
        token: learnerToken,
        body: { responses: [] },
      })
      assert.strictEqual(expDiagSubmit.status, 400)
      assert.strictEqual(expDiagSubmit.body.code, 'ATTEMPT_EXPIRED')
      const reloadedExpDiag = await AssessmentAttempt.findById(expDiag._id)
      assert.strictEqual(reloadedExpDiag.status, 'expired')
    })

    // 5. Concurrent quiz submission protection (same attempt + cross-quiz downgrade race)
    await check('5. Concurrent quiz submissions serialize safely (no duplicate credit & no lower-score overwrite)', async () => {
      await UserCompetency.findOneAndUpdate({ user_id: learner._id, competency_id: compC._id }, { current_level: 1 }, { upsert: true })

      const quizHighRes = await requestJson(port, {
        method: 'POST',
        path: '/api/quizzes',
        token: adminToken,
        body: {
          title: `P353 Concurrent High ${testRunId}`,
          domain: 'Statistics',
          tagCompetencyIds: [compC._id],
          questions: [
            { questionText: 'H1', options: ['a', 'b'], correctOptionIndex: 0 },
            { questionText: 'H2', options: ['a', 'b'], correctOptionIndex: 0 },
          ],
        },
      })
      const quizMidRes = await requestJson(port, {
        method: 'POST',
        path: '/api/quizzes',
        token: adminToken,
        body: {
          title: `P353 Concurrent Mid ${testRunId}`,
          domain: 'Statistics',
          tagCompetencyIds: [compC._id],
          questions: [
            { questionText: 'M1', options: ['a', 'b'], correctOptionIndex: 0 },
            { questionText: 'M2', options: ['a', 'b'], correctOptionIndex: 0 },
            { questionText: 'M3', options: ['a', 'b'], correctOptionIndex: 0 },
            { questionText: 'M4', options: ['a', 'b'], correctOptionIndex: 0 },
          ],
        },
      })
      const qHigh = quizHighRes.body.quiz
      const qMid = quizMidRes.body.quiz
      createdQuizIds.push(qHigh._id, qMid._id)

      const startHigh = await requestJson(port, {
        method: 'POST',
        path: `/api/quizzes/${qHigh._id}/start-attempt`,
        token: learnerToken,
      })

      // Fire 2 simultaneous submissions for the SAME attemptId + 1 concurrent submission for qMid (75% -> Level 3)
      const [subH1, subH2, subMid] = await Promise.all([
        requestJson(port, {
          method: 'POST',
          path: `/api/quizzes/${qHigh._id}/attempts`,
          token: learnerToken,
          body: {
            attemptId: startHigh.body.attemptId,
            answers: [
              { questionId: qHigh.questionIds[0]._id, selectedOptionIndex: 0 },
              { questionId: qHigh.questionIds[1]._id, selectedOptionIndex: 0 }, // 100% -> Level 4
            ],
          },
        }),
        requestJson(port, {
          method: 'POST',
          path: `/api/quizzes/${qHigh._id}/attempts`,
          token: learnerToken,
          body: {
            attemptId: startHigh.body.attemptId,
            answers: [
              { questionId: qHigh.questionIds[0]._id, selectedOptionIndex: 0 },
              { questionId: qHigh.questionIds[1]._id, selectedOptionIndex: 0 },
            ],
          },
        }),
        requestJson(port, {
          method: 'POST',
          path: `/api/quizzes/${qMid._id}/attempts`,
          token: learnerToken,
          body: {
            answers: [
              { questionId: qMid.questionIds[0]._id, selectedOptionIndex: 0 },
              { questionId: qMid.questionIds[1]._id, selectedOptionIndex: 0 },
              { questionId: qMid.questionIds[2]._id, selectedOptionIndex: 0 },
              { questionId: qMid.questionIds[3]._id, selectedOptionIndex: 1 }, // 75% -> Level 3
            ],
          },
        }),
      ])

      const highStatuses = [subH1.status, subH2.status].sort((a, b) => a - b)
      assert.deepStrictEqual(highStatuses, [201, 400])
      assert.strictEqual(subMid.status, 201)

      const ucC = await UserCompetency.findOne({ user_id: learner._id, competency_id: compC._id })
      assert.strictEqual(ucC.current_level, 4) // Higher level always preserved, never downgraded to 3!
      const ucCDocs = await UserCompetency.find({ user_id: learner._id, competency_id: compC._id })
      assert.strictEqual(ucCDocs.length, 1)
    })

    // 6. SkillGap sync failure deferral + recovery (both Quiz & Diagnostic paths)
    await check('6. SkillGap failure sets needs_skillgap_sync=true on quiz & diagnostic failures and recovers cleanly', async () => {
      // 6a. Quiz SkillGap sync failure simulator
      await UserCompetency.findOneAndUpdate({ user_id: learner._id, competency_id: compC._id }, { current_level: 2 }, { upsert: true })
      setSyncFailureSimulator(async () => {
        throw new Error('Simulated SkillGap failure during quiz sync')
      })
      try {
        const up = await applyCompetencyUpdates(learner._id, [compC._id], 95, new Date())
        assert.strictEqual(up.length, 1)
      } finally {
        clearSyncFailureSimulator()
      }

      const flaggedUser = await User.findById(learner._id)
      assert.strictEqual(flaggedUser.needs_skillgap_sync, true)
      assert.ok(flaggedUser.skillgap_sync_error.includes('Simulated SkillGap failure'))

      const recRes = await recoverPendingSkillGapSync(learner._id)
      assert.strictEqual(recRes.recovered, true)
      const clearedUser = await User.findById(learner._id)
      assert.strictEqual(clearedUser.needs_skillgap_sync, false)
      const recoveredGapC = await SkillGap.findOne({ user_id: learner._id, competency_id: compC._id })
      assert.strictEqual(recoveredGapC.current_level, 4)
      assert.strictEqual(recoveredGapC.gap, 0)

      // 6b. Diagnostic SkillGap failure when role is unresolved marks needs_skillgap_sync=true instead of silently swallowing
      const { attempt: noRoleAttempt, qDocs: nrQDocs } = await createSeededDiagnosticAttempt(noRoleLearner, 15)
      const nrSub = await requestJson(port, {
        method: 'POST',
        path: `/api/assessments/diagnostic/${noRoleAttempt._id}/submit`,
        token: noRoleToken,
        body: {
          responses: [
            { question_id: nrQDocs[0]._id, selected_option_id: 'a' },
            { question_id: nrQDocs[1]._id, selected_option_id: 'b' },
          ],
        },
      })
      assert.strictEqual(nrSub.status, 200)
      const noRoleAfter = await User.findById(noRoleLearner._id)
      assert.strictEqual(noRoleAfter.needs_skillgap_sync, true)
      assert.ok(noRoleAfter.skillgap_sync_error)
      // Once role is later assigned, batch recovery clears and computes gaps!
      await User.findByIdAndUpdate(noRoleLearner._id, { role_id: roleDoc._id })
      const batchRec = await recoverAllPendingSkillGapSyncs()
      assert.ok(batchRec.recoveredCount >= 1)
      const nrCleared = await User.findById(noRoleLearner._id)
      assert.strictEqual(nrCleared.needs_skillgap_sync, false)
      const nrGaps = await SkillGap.find({ user_id: noRoleLearner._id })
      assert.strictEqual(nrGaps.length, 3)
    })

    // 7. Admin exclusion across services, endpoints & admin analytics
    await check('7. Admin users are excluded from competency mutations, SkillGap creation, recovery, and org analytics', async () => {
      const adminCompUpdates = await applyCompetencyUpdates(adminUser._id, [compA._id], 100, new Date())
      assert.deepStrictEqual(adminCompUpdates, [])
      assert.strictEqual(await UserCompetency.countDocuments({ user_id: adminUser._id }), 0)

      const adminGaps = await computeUserSkillGaps(adminUser._id)
      assert.deepStrictEqual(adminGaps, [])
      assert.strictEqual(await SkillGap.countDocuments({ user_id: adminUser._id }), 0)

      // Admin submitting diagnostic attempt still gets response if previewed, without writing SkillGap or UserCompetency
      const { attempt: adminDiag, qDocs: aQDocs } = await createSeededDiagnosticAttempt(adminUser, 15)
      const adminDiagSub = await requestJson(port, {
        method: 'POST',
        path: `/api/assessments/diagnostic/${adminDiag._id}/submit`,
        token: adminToken,
        body: { responses: [{ question_id: aQDocs[0]._id, selected_option_id: 'a' }] },
      })
      assert.strictEqual(adminDiagSub.status, 200)
      assert.strictEqual(await UserCompetency.countDocuments({ user_id: adminUser._id }), 0)
      assert.strictEqual(await SkillGap.countDocuments({ user_id: adminUser._id }), 0)

      // Even if someone manually seeds a stale UserCompetency or needs_skillgap_sync on adminUser, analytics & recovery exclude admin
      await UserCompetency.create({ user_id: adminUser._id, competency_id: compA._id, current_level: 1, source: 'system' })
      await User.findByIdAndUpdate(adminUser._id, { needs_skillgap_sync: true })
      const adminRec = await recoverPendingSkillGapSync(adminUser._id)
      assert.strictEqual(adminRec.status, 'admin_exempt')

      const heatmap = await getDepartmentCompetencyHeatmap()
      // Only learner (Level 4 on compA) is in deptDoc.name; admin's Level 1 must NOT dilute avg!
      const cell = heatmap.cells[`${deptDoc.name}::statistical`]
      assert.ok(cell)
      assert.strictEqual(cell.count, 1) // admin excluded!
      assert.strictEqual(cell.avgLevel, 4) // learner is Level 4; would be 2.5 if admin Level 1 included

      // Ensure compA currently has zero gaps for learners; adminUser's Level 1 would create false gap 3 if not excluded
      await UserCompetency.findOneAndUpdate({ user_id: learner._id, competency_id: compA._id }, { current_level: 4 })
      await UserCompetency.findOneAndUpdate({ user_id: noRoleLearner._id, competency_id: compA._id }, { current_level: 5 })
      const topGaps = await getOrgWideTopGaps(50)
      assert.strictEqual(topGaps.some((g) => String(g.competencyId) === String(compA._id)), false)
    })

    // 8. Legacy `usercompetencies` collection & conflict preservation guard
    await check('8. Legacy `usercompetencies` collection and Level 5 vs Level 4 differences remain untouched', async () => {
      const legacyCol = mongoose.connection.db.collection('usercompetencies')
      const legacyDoc = {
        userId: learner._id,
        competencyId: compA._id,
        currentLevel: 5,
        marker: `P353_LEGACY_${testRunId}`,
      }
      await legacyCol.insertOne(legacyDoc)
      await UserCompetency.findOneAndUpdate({ user_id: learner._id, competency_id: compA._id }, { current_level: 4 })

      const gaps = await computeUserSkillGaps(learner._id)
      const gapA = gaps.find((g) => String(g.competency_id) === String(compA._id))
      assert.strictEqual(gapA.current_level, 4) // Canonical level 4 used, NOT legacy level 5

      const legacyAfter = await legacyCol.findOne({ marker: `P353_LEGACY_${testRunId}` })
      assert.ok(legacyAfter)
      assert.strictEqual(legacyAfter.currentLevel, 5) // Untouched!
      await legacyCol.deleteMany({ marker: `P353_LEGACY_${testRunId}` })
    })

    // 9. History, Competency & SkillGap endpoints reflect exact persisted canonical state + Auth/Phase 34 isolation
    await check('9. Learner history, competency, skill-gap endpoints match persisted state and Phase 34 / Auth boundaries hold', async () => {
      const histRes = await requestJson(port, {
        method: 'GET',
        path: '/api/users/me/assessment-history?limit=20&includeIncomplete=true',
        token: learnerToken,
      })
      assert.strictEqual(histRes.status, 200)
      assert.ok(histRes.body.items.length >= 2)
      const quizItem = histRes.body.items.find((it) => it.kind === 'quiz' && it.score === 75 && it.title.includes(`P353 Mixed Comp Quiz ${testRunId}`))
      assert.ok(quizItem)

      const detailRes = await requestJson(port, {
        method: 'GET',
        path: `/api/quizzes/attempts/${quizItem.attemptId}`,
        token: learnerToken,
      })
      assert.strictEqual(detailRes.status, 200)
      assert.strictEqual(detailRes.body.attempt.competencyUpdates.length, 1)

      const diagItem = histRes.body.items.find((it) => it.kind === 'diagnostic')
      assert.ok(diagItem)
      const diagRes = await requestJson(port, {
        method: 'GET',
        path: `/api/assessments/attempts/${diagItem.attemptId}/results`,
        token: learnerToken,
      })
      assert.strictEqual(diagRes.status, 200)

      const compRes = await requestJson(port, {
        method: 'GET',
        path: '/api/user-competencies',
        token: learnerToken,
      })
      assert.strictEqual(compRes.status, 200)
      const compList = compRes.body.user_competencies || compRes.body.competencies || []
      assert.ok(Array.isArray(compList))
      const compCItem = compList.find((c) => String(c.competency_id?._id || c.competency_id || c.competency?._id) === String(compC._id))
      assert.ok(compCItem)
      assert.strictEqual(compCItem.current_level, 4)

      const sgRes = await requestJson(port, {
        method: 'GET',
        path: '/api/skill-gaps',
        token: learnerToken,
      })
      assert.strictEqual(sgRes.status, 200)
      assert.ok(Array.isArray(sgRes.body.skill_gaps))
      assert.strictEqual(sgRes.body.skill_gaps.length, 3)

      const unauthRes = await requestJson(port, {
        method: 'GET',
        path: '/api/skill-gaps',
      })
      assert.strictEqual(unauthRes.status, 401)

      const convRes = await requestJson(port, {
        method: 'GET',
        path: '/api/ai/conversations',
        token: learnerToken,
      })
      assert.strictEqual(convRes.status, 200)
    })
  } finally {
    clearSyncFailureSimulator()
    // Cleanup ONLY Phase 35.3 test records from kaushalai_test
    await AssessmentResponse.deleteMany({ user_id: { $in: createdUserIds } })
    await AssessmentAttempt.deleteMany({ user_id: { $in: createdUserIds } })
    await QuizAttempt.deleteMany({ userId: { $in: createdUserIds } })
    await Certificate.deleteMany({ userId: { $in: createdUserIds } })
    await SkillGap.deleteMany({ user_id: { $in: createdUserIds } })
    await UserCompetency.deleteMany({ user_id: { $in: createdUserIds } })
    await Question.deleteMany({ $or: [{ quizId: { $in: createdQuizIds } }, { competency_id: { $in: createdCompIds } }] })
    await Quiz.deleteMany({ _id: { $in: createdQuizIds } })
    await Course.deleteMany({ _id: { $in: createdCourseIds } })
    await RoleCompetency.deleteMany({ role_id: { $in: createdRoleIds } })
    await Role.deleteMany({ _id: { $in: createdRoleIds } })
    await Competency.deleteMany({ _id: { $in: createdCompIds } })
    if (deptDoc) await Department.deleteMany({ _id: deptDoc._id })
    await Message.deleteMany({ user_id: { $in: createdUserIds } })
    await Conversation.deleteMany({ user_id: { $in: createdUserIds } })
    await User.deleteMany({ _id: { $in: createdUserIds } })

    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
    await mongoose.disconnect()
  }

  const devSnapshotAfter = await getDevDbSnapshot()
  console.log('Dev DB post-test counts:', devSnapshotAfter)
  assert.deepStrictEqual(devSnapshotAfter, devSnapshotBefore, 'Development DB counts must remain completely unchanged!')
  console.log(`\nPhase 35.3 Results: ${passed} Passed, ${failed} Failed`)
  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error('Fatal error in Phase 35.3 test suite:', err)
  process.exit(1)
})
