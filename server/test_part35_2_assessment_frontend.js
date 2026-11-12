'use strict'

const assert = require('assert')
const fs = require('fs')
const http = require('http')
const path = require('path')
const { pathToFileURL } = require('url')
const express = require('express')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')

require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'kaushalai_dev_access_secret_change_in_prod'
const TEST_DB_URI = 'mongodb://127.0.0.1:27017/kaushalai_test'

const {
  Assessment,
  AssessmentAttempt,
  Competency,
  Department,
  Quiz,
  QuizAttempt,
  User,
} = require('./src/models')

const mcqRoutes = require('./src/routes/mcq.routes')
const userFeaturesRoutes = require('./src/routes/userFeatures.routes')

function makeRequest(port, options, body = null) {
  return new Promise((resolve, reject) => {
    const reqOpts = {
      hostname: '127.0.0.1',
      port,
      path: options.path,
      method: options.method || 'GET',
      headers: { ...(options.headers || {}) },
    }
    let payload = null
    if (body !== null) {
      payload = JSON.stringify(body)
      reqOpts.headers['Content-Type'] = 'application/json'
      reqOpts.headers['Content-Length'] = Buffer.byteLength(payload)
    }

    const req = http.request(reqOpts, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} })
        } catch (_err) {
          resolve({ status: res.statusCode, body: { raw: data } })
        }
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

function signToken(user) {
  return jwt.sign(
    { id: String(user._id), role: user.role, email: user.email },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '30m' }
  )
}

async function cleanupP352Fixtures() {
  const users = await User.find({ email: /@p352\.test$/i }).select('_id').lean()
  const userIds = users.map((u) => u._id)
  const depts = await Department.find({ code: /^P352_/ }).select('_id').lean()
  const deptIds = depts.map((d) => d._id)
  const quizzes = await Quiz.find({ title: /^P352_/ }).select('_id').lean()
  const quizIds = quizzes.map((q) => q._id)

  if (userIds.length > 0) {
    await AssessmentAttempt.deleteMany({ user_id: { $in: userIds } })
    await QuizAttempt.deleteMany({ userId: { $in: userIds } })
  }
  if (quizIds.length > 0) {
    await QuizAttempt.deleteMany({ quizId: { $in: quizIds } })
  }
  await Quiz.deleteMany({ title: /^P352_/ })
  await Assessment.deleteMany({ name: /^P352_/ })
  await Competency.deleteMany({ $or: [{ competencyCode: /^P352_/ }, { code: /^P352_/ }] })
  await User.deleteMany({ email: /@p352\.test$/i })
  if (deptIds.length > 0) {
    await Department.deleteMany({ _id: { $in: deptIds } })
  }
}

function readClientFile(relPath) {
  return fs.readFileSync(path.resolve(__dirname, '../client/src', relPath), 'utf8')
}

async function run() {
  let passed = 0
  let failed = 0

  const check = async (name, fn) => {
    try {
      await fn()
      console.log(`  PASS: ${name}`)
      passed++
    } catch (err) {
      console.error(`  FAIL: ${name}\n    ${err.stack || err.message}`)
      failed++
    }
  }

  let server
  try {
    await mongoose.connect(TEST_DB_URI)
    await cleanupP352Fixtures()

    const app = express()
    app.use(express.json())
    app.use('/api', mcqRoutes)
    app.use('/api', userFeaturesRoutes)

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve)
    })
    const port = server.address().port

    // Seed Phase 35.2 fixtures on kaushalai_test
    const dept = await Department.create({ name: 'P352 Analytics', code: 'P352_ANALYTICS' })
    const learner = await User.create({
      name: 'P352 Learner',
      email: 'learner@p352.test',
      passwordHash: '$2a$10$p352testplaceholderhashvalue0000000000000000000000',
      role: 'employee',
      department: 'P352_ANALYTICS',
      departmentId: dept._id,
    })
    const otherLearner = await User.create({
      name: 'P352 Other',
      email: 'other@p352.test',
      passwordHash: '$2a$10$p352testplaceholderhashvalue0000000000000000000000',
      role: 'employee',
      department: 'P352_ANALYTICS',
      departmentId: dept._id,
    })

    const compReal = await Competency.create({
      competencyCode: 'P352_COMP_1',
      name: 'Official Statistical Sampling',
      category: 'statistical',
      description: 'Sampling methodology',
    })
    const orphanCompId = new mongoose.Types.ObjectId()

    const qId = new mongoose.Types.ObjectId()
    const quiz = await Quiz.create({
      _id: qId,
      title: 'P352_Official Statistics Quiz',
      materialId: 'P352_MAT_1',
      createdBy: learner._id,
      domain: 'Official Statistics',
      durationMinutes: 20,
      passPercent: 70,
      questionCount: 1,
    })

    const assessment = await Assessment.create({
      name: 'P352_Diagnostic Baseline',
      type: 'diagnostic',
      level: 2,
      total_questions: 2,
    })

    // 1) Completed diagnostic with null overall_score (fallback to competency percentage avg)
    const diagCompleted = await AssessmentAttempt.create({
      user_id: learner._id,
      assessment_id: assessment._id,
      status: 'completed',
      completed_at: new Date('2026-10-15T10:20:00Z'),
      started_at: new Date('2026-10-15T10:00:00Z'),
      overall_score: null,
      competency_scores: [
        { competency_id: compReal._id, competency_name: compReal.name, percentage: 80, correct: 4, total: 5 },
        { competency_id: orphanCompId, competency_name: 'Survey Design', percentage: 60, correct: 3, total: 5 },
      ],
    })

    // 2) Completed quiz with enriched + orphaned competencyUpdates
    const completedQuizAttempt = await QuizAttempt.create({
      userId: learner._id,
      quizId: quiz._id,
      status: 'completed',
      score: 100,
      passed: true,
      correctCount: 1,
      totalQuestions: 1,
      startedAt: new Date('2026-10-16T09:00:00Z'),
      completedAt: new Date('2026-10-16T09:05:30Z'),
      attemptedAt: new Date('2026-10-16T09:05:30Z'),
      detailedResults: [
        {
          questionId: new mongoose.Types.ObjectId(),
          questionText: 'What is stratified sampling?',
          options: ['Divide into strata', 'Random only', 'Convenience', 'None'],
          selectedOptionIndex: 0,
          correctOptionIndex: 0,
          isCorrect: true,
          explanation: 'Population is partitioned into homogenous strata before sampling.',
        },
      ],
      competencyUpdates: [
        { competencyId: compReal._id, previousLevel: 1, newLevel: 2 },
        { competencyId: orphanCompId, previousLevel: 2, newLevel: 3 },
      ],
    })

    // 3) Legacy completed quiz (missing completedAt & startedAt, only attemptedAt)
    const legacyQuizAttempt = await QuizAttempt.create({
      userId: learner._id,
      quizId: quiz._id,
      status: 'completed',
      score: 55,
      passed: false,
      correctCount: 0,
      totalQuestions: 1,
      attemptedAt: new Date('2026-10-10T08:00:00Z'),
    })

    // 4) In-progress and expired quiz attempts (use distinct quizzes so active attempt per user-quiz works cleanly)
    const quizInProg = await Quiz.create({
      title: 'P352_Active Session Quiz',
      materialId: 'P352_MAT_2',
      createdBy: learner._id,
      domain: 'Survey Design',
      durationMinutes: 15,
      passPercent: 70,
      questionCount: 1,
    })
    const inProgressAttempt = await QuizAttempt.create({
      userId: learner._id,
      quizId: quizInProg._id,
      status: 'in_progress',
      score: 0,
      correctCount: 0,
      startedAt: new Date('2026-10-17T11:00:00Z'),
      attemptedAt: new Date('2026-10-17T11:00:00Z'),
      totalQuestions: 1,
    })

    const quizExpired = await Quiz.create({
      title: 'P352_Expired Session Quiz',
      materialId: 'P352_MAT_3',
      createdBy: learner._id,
      domain: 'Data Governance',
      durationMinutes: 10,
      passPercent: 70,
      questionCount: 1,
    })
    const expiredAttempt = await QuizAttempt.create({
      userId: learner._id,
      quizId: quizExpired._id,
      status: 'expired',
      score: 0,
      correctCount: 0,
      startedAt: new Date('2026-10-14T11:00:00Z'),
      attemptedAt: new Date('2026-10-14T11:00:00Z'),
      totalQuestions: 1,
    })

    const learnerToken = signToken(learner)
    const otherToken = signToken(otherLearner)
    const authHdr = { Authorization: `Bearer ${learnerToken}` }

    await check('1. Unified history paginates, filters by type, and handles includeIncomplete', async () => {
      const resCompletedOnly = await makeRequest(port, {
        path: '/api/users/me/assessment-history?page=1&limit=2&type=all&includeIncomplete=false',
        headers: authHdr,
      })
      assert.strictEqual(resCompletedOnly.status, 200)
      assert.strictEqual(resCompletedOnly.body.items.length, 2)
      assert.strictEqual(resCompletedOnly.body.pagination.total, 3)
      assert.strictEqual(resCompletedOnly.body.pagination.totalPages, 2)
      assert.strictEqual(resCompletedOnly.body.meta.inProgressCount, 1)
      assert.strictEqual(resCompletedOnly.body.meta.expiredCount, 1)

      const resWithIncomplete = await makeRequest(port, {
        path: '/api/users/me/assessment-history?page=1&limit=10&type=all&includeIncomplete=true',
        headers: authHdr,
      })
      assert.strictEqual(resWithIncomplete.status, 200)
      assert.strictEqual(resWithIncomplete.body.items.length, 5)
      const diagRow = resWithIncomplete.body.items.find((i) => i.attemptId === String(diagCompleted._id))
      assert.ok(diagRow)
      assert.strictEqual(diagRow.kind, 'diagnostic')
      assert.strictEqual(diagRow.score, null)
      assert.strictEqual(diagRow.passed, null)

      const legacyRow = resWithIncomplete.body.items.find((i) => i.attemptId === String(legacyQuizAttempt._id))
      assert.ok(legacyRow)
      assert.strictEqual(legacyRow.dateIsLegacyFallback, true)
      assert.strictEqual(legacyRow.durationSeconds, null)

      const diagFilter = await makeRequest(port, {
        path: '/api/users/me/assessment-history?page=1&limit=10&type=diagnostic&includeIncomplete=true',
        headers: authHdr,
      })
      assert.strictEqual(diagFilter.body.items.length, 1)
      assert.strictEqual(diagFilter.body.items[0].kind, 'diagnostic')
    })

    await check('2. GET /api/quizzes/attempts/:attemptId enriches Competency names and handles orphans safely', async () => {
      const res = await makeRequest(port, {
        path: `/api/quizzes/attempts/${completedQuizAttempt._id}`,
        headers: authHdr,
      })
      assert.strictEqual(res.status, 200)
      const att = res.body.attempt
      assert.ok(att)
      assert.strictEqual(att.quizTitle, 'P352_Official Statistics Quiz')
      assert.strictEqual(att.durationSeconds, 330)
      assert.strictEqual(att.competencyUpdates.length, 2)

      const resolved = att.competencyUpdates.find((u) => String(u.competencyId) === String(compReal._id))
      assert.strictEqual(resolved.competencyName, 'Official Statistical Sampling')
      assert.strictEqual(resolved.competencyCode, 'P352_COMP_1')
      assert.strictEqual(resolved.competencyCategory, 'statistical')
      assert.strictEqual(resolved.previousLevel, 1)
      assert.strictEqual(resolved.newLevel, 2)

      const orphan = att.competencyUpdates.find((u) => String(u.competencyId) === String(orphanCompId))
      assert.strictEqual(orphan.competencyName, null)
      assert.strictEqual(orphan.competencyCode, null)
      assert.strictEqual(String(orphan.competencyId), String(orphanCompId))
    })

    await check('3. GET /api/quizzes/attempts/:attemptId enforces ownership (404), malformed ID (400), and truthful incomplete states', async () => {
      const crossUser = await makeRequest(port, {
        path: `/api/quizzes/attempts/${completedQuizAttempt._id}`,
        headers: { Authorization: `Bearer ${otherToken}` },
      })
      assert.strictEqual(crossUser.status, 404)

      const badId = await makeRequest(port, {
        path: '/api/quizzes/attempts/not-an-object-id',
        headers: authHdr,
      })
      assert.strictEqual(badId.status, 400)

      const inProgRes = await makeRequest(port, {
        path: `/api/quizzes/attempts/${inProgressAttempt._id}`,
        headers: authHdr,
      })
      assert.strictEqual(inProgRes.status, 200)
      assert.strictEqual(inProgRes.body.attempt.status, 'in_progress')
      assert.strictEqual(inProgRes.body.attempt.durationSeconds, null)

      const expRes = await makeRequest(port, {
        path: `/api/quizzes/attempts/${expiredAttempt._id}`,
        headers: authHdr,
      })
      assert.strictEqual(expRes.status, 200)
      assert.strictEqual(expRes.body.attempt.status, 'expired')
      assert.strictEqual(expRes.body.attempt.durationSeconds, null)
    })

    await check('4. Duplicate submission (ATTEMPT_ALREADY_COMPLETED) returns completed attemptId', async () => {
      // Create another already-completed attempt for an unused in-progress reference ID passed as attemptId
      const quizDup = await Quiz.create({
        title: 'P352_Duplicate Guard Quiz',
        materialId: 'P352_MAT_4',
        createdBy: learner._id,
        domain: 'Governance',
        durationMinutes: 10,
        passPercent: 70,
        questionCount: 1,
      })
      const alreadyDone = await QuizAttempt.create({
        userId: learner._id,
        quizId: quizDup._id,
        status: 'completed',
        score: 100,
        passed: true,
        correctCount: 1,
        totalQuestions: 1,
        startedAt: new Date(),
        completedAt: new Date(),
      })

      const res = await makeRequest(
        port,
        {
          method: 'POST',
          path: `/api/quizzes/${quizDup._id}/attempts`,
          headers: authHdr,
        },
        {
          attemptId: String(alreadyDone._id),
          answers: [{ questionId: 'q1', selectedOptionIndex: 0 }],
        }
      )
      assert.strictEqual(res.status, 400)
      assert.strictEqual(res.body.code, 'ATTEMPT_ALREADY_COMPLETED')
      assert.strictEqual(String(res.body.attemptId), String(alreadyDone._id))
    })

    await check('5. Client assessmentFormatters handles IDs, legacy dates, durations, and pass/diagnostic badges', async () => {
      const fmtUrl = pathToFileURL(path.resolve(__dirname, '../client/src/utils/assessmentFormatters.js')).href
      const fmt = await import(fmtUrl)

      assert.strictEqual(fmt.extractIdString('507f1f77bcf86cd799439011'), '507f1f77bcf86cd799439011')
      assert.strictEqual(fmt.extractIdString({ _id: '507f1f77bcf86cd799439011' }), '507f1f77bcf86cd799439011')
      assert.strictEqual(fmt.extractIdString(null), null)

      assert.strictEqual(fmt.formatDurationSeconds(null), null)
      assert.strictEqual(fmt.formatDurationSeconds(45), '45s')
      assert.strictEqual(fmt.formatDurationSeconds(125), '2m 05s')
      assert.strictEqual(fmt.formatDurationSeconds(3665), '1h 01m')

      assert.strictEqual(fmt.formatAttemptDate(null), 'Date unavailable')
      assert.notStrictEqual(fmt.formatAttemptDate('2026-10-16T09:05:30Z'), 'Recently')

      assert.deepStrictEqual(
        fmt.getAttemptStatusMeta({ status: 'completed', kind: 'quiz', passed: true }),
        { status: 'completed', label: 'Passed', tone: 'success' }
      )
      assert.deepStrictEqual(
        fmt.getAttemptStatusMeta({ status: 'completed', kind: 'quiz', passed: false }),
        { status: 'completed', label: 'Needs Retake', tone: 'danger' }
      )
      assert.deepStrictEqual(
        fmt.getAttemptStatusMeta({ status: 'completed', kind: 'diagnostic', passed: null }),
        { status: 'completed', label: 'Evaluated', tone: 'diagnostic' }
      )
      assert.deepStrictEqual(
        fmt.getAttemptStatusMeta({ status: 'in_progress', kind: 'quiz', passed: null }),
        { status: 'in_progress', label: 'In Progress', tone: 'info' }
      )
      assert.deepStrictEqual(
        fmt.getAttemptStatusMeta({ status: 'expired', kind: 'quiz', passed: null }),
        { status: 'expired', label: 'Expired', tone: 'danger' }
      )
    })

    await check('6. AssessmentHistoryPage uses Phase 35.1 API, filter reset, retry, legacy hint, and mobile CSS', async () => {
      const src = readClientFile('pages/quiz/AssessmentHistoryPage.jsx')
      const css = readClientFile('pages/quiz/AssessmentHistoryPage.module.css')

      assert.ok(src.includes('getMyAssessmentHistory'))
      assert.ok(src.includes('getDiagnosticAttemptResults'))
      assert.ok(src.includes('includeIncomplete'))
      assert.ok(src.includes('setPage(1)'))
      assert.ok(src.includes('dateIsLegacyFallback'))
      assert.ok(src.includes('/quiz-result/'))
      assert.ok(!src.includes('OFFICIAL_ATTEMPTS'))
      assert.ok(!src.includes("'Recently'"))
      assert.ok(!src.includes(': 80'))
      assert.ok(css.includes('@media (max-width: 768px)'))
    })

    await check('7. QuizResultPage removes static mocks/localStorage and integrates getQuizAttemptById + latest fallback', async () => {
      const src = readClientFile('pages/quiz/QuizResultPage.jsx')

      assert.ok(src.includes('getQuizAttemptById'))
      assert.ok(src.includes('getMyAssessmentHistory'))
      assert.ok(src.includes('competencyUpdates'))
      assert.ok(src.includes('detailedResults'))
      assert.ok(src.includes('Attempt In Progress'))
      assert.ok(src.includes('Attempt Expired'))
      assert.ok(!src.includes('SECTION_PERFORMANCE'))
      assert.ok(!src.includes('TOPIC_ANALYSIS'))
      assert.ok(!src.includes('INCORRECT_QUESTIONS'))
      assert.ok(!src.includes('kai_last_quiz_result'))
      assert.ok(!src.includes('kai_quiz_attempts'))
      assert.ok(!src.includes('quiz-data-analysis-02'))
      assert.ok(!src.includes('18m 42s'))
      assert.ok(!src.includes('30m 00s'))
    })

    await check('8. QuizListPage, TakeQuizPage, RecentAssessmentsWidget, and AppShell remove hardcoded/localStorage duplicates', async () => {
      const listSrc = readClientFile('pages/quiz/QuizListPage.jsx')
      assert.ok(listSrc.includes('getMyAssessmentHistory'))
      assert.ok(listSrc.includes('/assessments/history'))
      assert.ok(listSrc.includes('isQuizzesError'))
      assert.ok(!listSrc.includes('kai_quiz_attempts'))
      assert.ok(!listSrc.includes("'Recently'"))
      assert.ok(!listSrc.includes('to="/quizzes" style={{ color'))

      const takeSrc = readClientFile('pages/quiz/TakeQuizPage.jsx')
      assert.ok(!takeSrc.includes('kai_quiz_attempts'))
      assert.ok(!takeSrc.includes('kai_last_quiz_result'))
      assert.ok(!takeSrc.includes('Data Analysis with Python'))
      assert.ok(!takeSrc.includes('30 Questions'))
      assert.ok(!takeSrc.includes('30 Marks'))
      assert.ok(takeSrc.includes('createdAttemptId'))

      const widgetSrc = readClientFile('components/dashboard/RecentAssessmentsWidget.jsx')
      assert.ok(widgetSrc.includes('score >= 70'))
      assert.ok(!widgetSrc.includes('score >= 60'))
      assert.ok(!widgetSrc.includes("'Recently'"))
      assert.ok(widgetSrc.includes('to="/assessments/history"'))
      assert.ok(widgetSrc.includes('/quiz-result/'))

      const shellSrc = readClientFile('components/layout/AppShell.jsx')
      assert.ok(!shellSrc.includes('Rahul Kumar'))
      assert.ok(!shellSrc.includes('/avatars/rahul_kumar.jpg'))
    })
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
    try {
      await cleanupP352Fixtures()
    } catch (_cleanupErr) {}
    await mongoose.disconnect()
  }

  console.log(`\nPhase 35.2 Suite Summary: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
