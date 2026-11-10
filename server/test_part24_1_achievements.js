/**
 * test_part24_1_achievements.js
 * Dedicated test suite for PART 24.1 & PART 24.1.2:
 * ACHIEVEMENTS & BADGES ENGINE AUTOMATED TEST SUITE & BUSINESS-RULE CORRECTIONS
 *
 * Verifies:
 * 1. Endpoint Access & Authentication (1-3):
 *    - 1. Unauthenticated request rejected with HTTP 401
 *    - 2. Invalid token rejected with HTTP 401
 *    - 3. Authenticated learner request returns HTTP 200
 * 2. Baseline & Zero Activity Integrity (4-7):
 *    - 4. Learner with 0 activity returns 0 unlocked badges and total_achievements = 6
 *    - 5. All 6 badges report unlocked = false and progress_percent = 0
 *    - 6. Summary metrics (completed_courses, passed_assessments, verified_competencies, active_learning_days) are all 0
 *    - 7. Response contains honest, verified metrics without fabricated XP or arbitrary ranks
 * 3. Individual Badge Evaluation Rules (8-13):
 *    - 8. First Assessment Ace: Unlocks with >= 1 passed quiz attempt (score >= 70)
 *    - 9. Survey Methodologist: Unlocks with >= 2 active course enrollments
 *    - 10. Statistical Analyst: Unlocks with >= 3 completed quiz attempts
 *    - 11. Active Learning Scholar: Unlocks with learning activity across >= 3 distinct calendar days
 *    - 12. Distinction Scholar: Unlocks with >= 1 assessment attempt with score >= 90%
 *    - 13. Grandmaster of Statistics: Unlocks with >= 2 Level 4/5 competencies
 * 4. User Isolation & Multi-Tenancy (14-16):
 *    - 14. Learner A's achievements are strictly isolated from Learner B
 *    - 15. Learner A cannot see or unlock badges using Learner B's records
 *    - 16. Learner B with independent records reflects correct individual progress
 * 5. Read-Only Invariants & Guardrails (17-20):
 *    - 17. GET /api/achievements/my performs zero database writes (pure read-only deterministic engine)
 *    - 18. Subsequent calls are idempotent with zero side effects
 *    - 19. Aliased route /api/my-achievements returns identical response contract
 *    - 20. Development database (kaushalai) remains strictly untouched at 15 users
 * 6. Business-Rule Corrections Verification - Part 24.1.2 (21-35):
 *    - 21. DEF-24.1.1-01: In-progress attempt with score 0 is NOT counted as completed
 *    - 22. DEF-24.1.1-01: Expired attempt without submission is NOT counted as completed
 *    - 23. DEF-24.1.1-01: In-progress/expired attempts do NOT increment passed_assessments
 *    - 24. DEF-24.1.1-01: Statistical Analyst badge requires 3 genuinely completed attempts
 *    - 25. DEF-24.1.1-02: Active Learning Scholar unlock date is strictly the 3rd qualifying day
 *    - 26. DEF-24.1.1-02: Additional activity days (4th, 5th) do NOT cause unlock date to drift
 *    - 27. DEF-24.1.1-02: Fewer than 3 qualifying days do not unlock Active Learning Scholar
 *    - 28. DEF-24.1.1-03: Unaccepted recommendation enrollments do NOT create active learning days
 *    - 29. DEF-24.1.1-03: Administrative updatedAt changes do NOT create active learning days
 *    - 30. DEF-24.1.1-03: Duplicate activities on the same day count as 1 distinct calendar day
 *    - 31. DEF-24.1.1-04: Non-chronological attempts are sorted chronologically by completion date
 *    - 32. DEF-24.1.1-04: Earliest qualifying evidence is selected deterministically regardless of insert order
 *    - 33. DEF-24.1.1-05: Self-assessed Level 4/5 competencies are EXCLUDED from verified_competencies
 *    - 34. DEF-24.1.1-05: Self-assessed Level 5 competencies do NOT unlock Grandmaster of Statistics
 *    - 35. DEF-24.1.1-05: Objectively assessed Level 4/5 competencies remain fully eligible
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

async function runTests() {
  console.log('===================================================================')
  console.log('PART 24.1 & PART 24.1.2: ACHIEVEMENTS & BADGES ENGINE TEST SUITE')
  console.log('===================================================================')

  await mongoose.connect(testDbUri)

  const User = require('./src/models/User')
  const QuizAttempt = require('./src/models/QuizAttempt')
  const Enrollment = require('./src/models/Enrollment')
  const Course = require('./src/models/Course')
  const Competency = require('./src/models/Competency')
  const UserCompetency = require('./src/models/UserCompetency')

  // --- GUARD: Pre-Test Development Database Check ---
  console.log('\n--- GUARDRAIL: Development Database Isolation (Pre-Test) ---')
  const devConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
  const devUserCountBefore = await devConn.collection('users').countDocuments()
  await devConn.close()
  assert(
    devUserCountBefore === 15,
    `G.1.Initial: Development DB (kaushalai) user count strictly 15 (actual: ${devUserCountBefore})`
  )

  let server
  let baseUrl

  const testSuffix = Date.now().toString()
  const fixtures = {
    userIds: [],
    courseIds: [],
    compIds: [],
    attemptIds: [],
    enrollmentIds: [],
    userCompIds: []
  }

  try {
    // 1. Create Test Courses & Competencies
    const course1 = await Course.create({
      title: `P24 Test Course 1 ${testSuffix}`,
      code: `P24C1_${testSuffix.slice(-5)}`,
      description: 'Course for achievement testing 1',
      category: 'official_statistics',
      status: 'published',
      isPublished: true,
      duration: '4 hours'
    })
    fixtures.courseIds.push(course1._id)

    const course2 = await Course.create({
      title: `P24 Test Course 2 ${testSuffix}`,
      code: `P24C2_${testSuffix.slice(-5)}`,
      description: 'Course for achievement testing 2',
      category: 'data_analytics',
      status: 'published',
      isPublished: true,
      duration: '6 hours'
    })
    fixtures.courseIds.push(course2._id)

    const comp1 = await Competency.create({
      name: `P24 Survey Design ${testSuffix}`,
      category: 'statistical',
      competencyCode: `P24_SD_${testSuffix.slice(-4)}`,
      description: 'Survey sampling and design'
    })
    fixtures.compIds.push(comp1._id)

    const comp2 = await Competency.create({
      name: `P24 Big Data Analytics ${testSuffix}`,
      category: 'technical',
      competencyCode: `P24_BDA_${testSuffix.slice(-4)}`,
      description: 'Statistical big data tools'
    })
    fixtures.compIds.push(comp2._id)

    const comp3 = await Competency.create({
      name: `P24 Governance Ethics ${testSuffix}`,
      category: 'digital_governance',
      competencyCode: `P24_GE_${testSuffix.slice(-4)}`,
      description: 'Ethics in governance'
    })
    fixtures.compIds.push(comp3._id)

    // 2. Create Test Users:
    // User Zero: Fresh learner with zero activity
    const userZero = await User.create({
      name: 'P24 Zero Activity Learner',
      email: `p24_zero_${testSuffix}@kaushalai.gov.in`,
      role: 'employee',
      level: 1,
      googleLinked: true,
      onboarding_completed: true
    })
    fixtures.userIds.push(userZero._id)

    // User A: High achiever
    const userA = await User.create({
      name: 'P24 Achiever Learner',
      email: `p24_achiever_${testSuffix}@kaushalai.gov.in`,
      role: 'employee',
      level: 3,
      googleLinked: true,
      onboarding_completed: true
    })
    fixtures.userIds.push(userA._id)

    // User B: Partial learner
    const userB = await User.create({
      name: 'P24 Partial Learner',
      email: `p24_partial_${testSuffix}@kaushalai.gov.in`,
      role: 'employee',
      level: 2,
      googleLinked: true,
      onboarding_completed: true
    })
    fixtures.userIds.push(userB._id)

    // User C: Assessment Lifecycle & Expiry Tester (DEF-24.1.1-01)
    const userC = await User.create({
      name: 'P24 Lifecycle Learner',
      email: `p24_lifecycle_${testSuffix}@kaushalai.gov.in`,
      role: 'employee',
      level: 2,
      googleLinked: true,
      onboarding_completed: true
    })
    fixtures.userIds.push(userC._id)

    // User D: Unlock Date Drift & Stability Tester (DEF-24.1.1-02 & DEF-24.1.1-04)
    const userD = await User.create({
      name: 'P24 Date Stability Learner',
      email: `p24_date_${testSuffix}@kaushalai.gov.in`,
      role: 'employee',
      level: 2,
      googleLinked: true,
      onboarding_completed: true
    })
    fixtures.userIds.push(userD._id)

    // User E: Passive Recommendations & Administrative Noise Tester (DEF-24.1.1-03)
    const userE = await User.create({
      name: 'P24 Passive Learner',
      email: `p24_passive_${testSuffix}@kaushalai.gov.in`,
      role: 'employee',
      level: 2,
      googleLinked: true,
      onboarding_completed: true
    })
    fixtures.userIds.push(userE._id)

    // User F: Self-Assessment vs Objective Assessment Tester (DEF-24.1.1-05)
    const userF = await User.create({
      name: 'P24 Self Assessed Learner',
      email: `p24_self_${testSuffix}@kaushalai.gov.in`,
      role: 'employee',
      level: 2,
      googleLinked: true,
      onboarding_completed: true
    })
    fixtures.userIds.push(userF._id)

    // 3. Populate Activity for User A:
    // (a) Enrollments: 2 courses (both enrolled, one completed)
    const enrA1 = await Enrollment.create({
      userId: userA._id,
      courseId: course1._id,
      status: 'completed',
      progressPercent: 100,
      startedAt: new Date('2026-11-01T10:00:00Z'),
      completedAt: new Date('2026-11-01T14:00:00Z')
    })
    fixtures.enrollmentIds.push(enrA1._id)

    const enrA2 = await Enrollment.create({
      userId: userA._id,
      courseId: course2._id,
      status: 'in_progress',
      progressPercent: 50,
      startedAt: new Date('2026-11-02T10:00:00Z')
    })
    fixtures.enrollmentIds.push(enrA2._id)

    // (b) Quiz Attempts: 3 completed attempts across distinct days, 1 distinction (95%), 1 pass (75%), 1 lower (65%)
    const attA1 = await QuizAttempt.create({
      userId: userA._id,
      quizId: new mongoose.Types.ObjectId(),
      quizTitle: 'Official Sampling Quiz',
      score: 95,
      correctCount: 19,
      totalQuestions: 20,
      passed: true,
      status: 'completed',
      attemptedAt: new Date('2026-11-01T11:00:00Z'),
      completedAt: new Date('2026-11-01T11:30:00Z')
    })
    fixtures.attemptIds.push(attA1._id)

    const attA2 = await QuizAttempt.create({
      userId: userA._id,
      quizId: new mongoose.Types.ObjectId(),
      quizTitle: 'Index Numbers Quiz',
      score: 75,
      correctCount: 15,
      totalQuestions: 20,
      passed: true,
      status: 'completed',
      attemptedAt: new Date('2026-11-03T10:00:00Z'),
      completedAt: new Date('2026-11-03T10:45:00Z')
    })
    fixtures.attemptIds.push(attA2._id)

    const attA3 = await QuizAttempt.create({
      userId: userA._id,
      quizId: new mongoose.Types.ObjectId(),
      quizTitle: 'Advanced Econometrics Quiz',
      score: 65,
      correctCount: 13,
      totalQuestions: 20,
      passed: false,
      status: 'completed',
      attemptedAt: new Date('2026-11-04T09:00:00Z'),
      completedAt: new Date('2026-11-04T09:40:00Z')
    })
    fixtures.attemptIds.push(attA3._id)

    // (c) User Competencies: 2 at level 4 or 5 with objective diagnostic/quiz source
    const ucA1 = await UserCompetency.create({
      user_id: userA._id,
      competency_id: comp1._id,
      current_level: 4,
      source: 'diagnostic_test',
      last_assessed_at: new Date('2026-11-01T12:00:00Z')
    })
    fixtures.userCompIds.push(ucA1._id)

    const ucA2 = await UserCompetency.create({
      user_id: userA._id,
      competency_id: comp2._id,
      current_level: 5,
      source: 'quiz',
      last_assessed_at: new Date('2026-11-03T11:00:00Z')
    })
    fixtures.userCompIds.push(ucA2._id)

    // 4. Populate Activity for User B:
    const enrB1 = await Enrollment.create({
      userId: userB._id,
      courseId: course1._id,
      status: 'enrolled',
      progressPercent: 20,
      startedAt: new Date('2026-11-05T08:00:00Z')
    })
    fixtures.enrollmentIds.push(enrB1._id)

    const attB1 = await QuizAttempt.create({
      userId: userB._id,
      quizId: new mongoose.Types.ObjectId(),
      quizTitle: 'Basic Sampling Quiz',
      score: 72,
      correctCount: 14,
      totalQuestions: 20,
      passed: true,
      status: 'completed',
      attemptedAt: new Date('2026-11-05T09:00:00Z'),
      completedAt: new Date('2026-11-05T09:30:00Z')
    })
    fixtures.attemptIds.push(attB1._id)

    // 5. Populate Activity for User C (DEF-24.1.1-01: In-progress and expired attempts):
    // Attempt 1: In-progress attempt with score 0 (merely started, not completed!)
    const attC1 = await QuizAttempt.create({
      userId: userC._id,
      quizId: new mongoose.Types.ObjectId(),
      quizTitle: 'In-Progress Incomplete Quiz',
      score: 0,
      correctCount: 0,
      totalQuestions: 20,
      passed: false,
      status: 'in_progress',
      startedAt: new Date('2026-11-06T10:00:00Z'),
      attemptedAt: new Date('2026-11-06T10:00:00Z')
    })
    fixtures.attemptIds.push(attC1._id)

    // Attempt 2: Expired attempt without submission (timed out, abandoned!)
    const attC2 = await QuizAttempt.create({
      userId: userC._id,
      quizId: new mongoose.Types.ObjectId(),
      quizTitle: 'Expired Timed-Out Quiz',
      score: 0,
      correctCount: 0,
      totalQuestions: 20,
      passed: false,
      status: 'expired',
      startedAt: new Date('2026-11-07T10:00:00Z'),
      attemptedAt: new Date('2026-11-07T10:00:00Z')
    })
    fixtures.attemptIds.push(attC2._id)

    // Attempt 3: One genuinely completed attempt (score 65%, failed)
    const attC3 = await QuizAttempt.create({
      userId: userC._id,
      quizId: new mongoose.Types.ObjectId(),
      quizTitle: 'Genuinely Completed Attempt',
      score: 65,
      correctCount: 13,
      totalQuestions: 20,
      passed: false,
      status: 'completed',
      attemptedAt: new Date('2026-11-08T10:00:00Z'),
      completedAt: new Date('2026-11-08T10:35:00Z')
    })
    fixtures.attemptIds.push(attC3._id)

    // 6. Populate Activity for User D (DEF-24.1.1-02 & DEF-24.1.1-04):
    // Four distinct activity days: Nov 1, Nov 2, Nov 3, Nov 10.
    // Inserted deliberately in reverse chronological order to verify deterministic sorting!
    const attD_nov10 = await QuizAttempt.create({
      userId: userD._id,
      quizId: new mongoose.Types.ObjectId(),
      quizTitle: 'Nov 10 Quiz',
      score: 92,
      correctCount: 18,
      totalQuestions: 20,
      passed: true,
      status: 'completed',
      attemptedAt: new Date('2026-11-10T14:00:00Z'),
      completedAt: new Date('2026-11-10T14:30:00Z')
    })
    fixtures.attemptIds.push(attD_nov10._id)

    const attD_nov03 = await QuizAttempt.create({
      userId: userD._id,
      quizId: new mongoose.Types.ObjectId(),
      quizTitle: 'Nov 3 Milestone Quiz',
      score: 75,
      correctCount: 15,
      totalQuestions: 20,
      passed: true,
      status: 'completed',
      attemptedAt: new Date('2026-11-03T11:00:00Z'),
      completedAt: new Date('2026-11-03T11:30:00Z')
    })
    fixtures.attemptIds.push(attD_nov03._id)

    const attD_nov02 = await QuizAttempt.create({
      userId: userD._id,
      quizId: new mongoose.Types.ObjectId(),
      quizTitle: 'Nov 2 Quiz',
      score: 80,
      correctCount: 16,
      totalQuestions: 20,
      passed: true,
      status: 'completed',
      attemptedAt: new Date('2026-11-02T10:00:00Z'),
      completedAt: new Date('2026-11-02T10:30:00Z')
    })
    fixtures.attemptIds.push(attD_nov02._id)

    const enrD_nov01 = await Enrollment.create({
      userId: userD._id,
      courseId: course1._id,
      status: 'in_progress',
      progressPercent: 30,
      startedAt: new Date('2026-11-01T09:00:00Z')
    })
    fixtures.enrollmentIds.push(enrD_nov01._id)

    // 7. Populate Activity for User E (DEF-24.1.1-03: Passive recommendations & admin updates):
    // Only has a 'recommended' course (unaccepted recommendation)
    const enrE_rec = await Enrollment.create({
      userId: userE._id,
      courseId: course1._id,
      status: 'recommended',
      progressPercent: 0,
      createdAt: new Date('2026-11-01T08:00:00Z'),
      updatedAt: new Date('2026-11-05T12:00:00Z')
    })
    fixtures.enrollmentIds.push(enrE_rec._id)

    // 8. Populate Activity for User F (DEF-24.1.1-05: Self-assessed vs objective competencies):
    // Two self-assessed Level 5/4 competencies (subjective ratings)
    const ucF_self1 = await UserCompetency.create({
      user_id: userF._id,
      competency_id: comp1._id,
      current_level: 5,
      source: 'self_assessed',
      last_assessed_at: new Date('2026-11-01T10:00:00Z')
    })
    fixtures.userCompIds.push(ucF_self1._id)

    const ucF_self2 = await UserCompetency.create({
      user_id: userF._id,
      competency_id: comp2._id,
      current_level: 4,
      source: 'self_assessed',
      last_assessed_at: new Date('2026-11-02T10:00:00Z')
    })
    fixtures.userCompIds.push(ucF_self2._id)

    // One objectively assessed Level 4 competency
    const ucF_obj = await UserCompetency.create({
      user_id: userF._id,
      competency_id: comp3._id,
      current_level: 4,
      source: 'diagnostic_test',
      last_assessed_at: new Date('2026-11-03T10:00:00Z')
    })
    fixtures.userCompIds.push(ucF_obj._id)

    // Create JWT tokens for all test users
    const tokens = {
      zero: jwt.sign({ id: userZero._id.toString(), role: userZero.role }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' }),
      userA: jwt.sign({ id: userA._id.toString(), role: userA.role }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' }),
      userB: jwt.sign({ id: userB._id.toString(), role: userB.role }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' }),
      userC: jwt.sign({ id: userC._id.toString(), role: userC.role }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' }),
      userD: jwt.sign({ id: userD._id.toString(), role: userD.role }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' }),
      userE: jwt.sign({ id: userE._id.toString(), role: userE.role }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' }),
      userF: jwt.sign({ id: userF._id.toString(), role: userF.role }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
    }

    // Start ephemeral test server
    const app = require('./src/app')
    server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, resolve))
    const port = server.address().port
    baseUrl = `http://127.0.0.1:${port}`

    function apiGet(pathUrl, token = null) {
      return new Promise((resolve, reject) => {
        const url = new URL(pathUrl, baseUrl)
        const headers = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`

        http
          .get(url, { headers }, (res) => {
            let data = ''
            res.on('data', (chunk) => (data += chunk))
            res.on('end', () => {
              let body
              try {
                body = JSON.parse(data)
              } catch {
                body = data
              }
              resolve({ status: res.statusCode, body })
            })
          })
          .on('error', reject)
      })
    }

    // ─────────────────────────────────────────────────────────────────
    // SECTION 1: Endpoint Access & Authentication (Tests 1-3)
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 1: Endpoint Access & Authentication ---')

    const resNoAuth = await apiGet('/api/achievements/my')
    assert(resNoAuth.status === 401, `1. Unauthenticated request rejected with HTTP 401 (got: ${resNoAuth.status})`)

    const resInvalidToken = await apiGet('/api/achievements/my', 'invalid.jwt.token')
    assert(resInvalidToken.status === 401, `2. Invalid token rejected with HTTP 401 (got: ${resInvalidToken.status})`)

    const resAuth = await apiGet('/api/achievements/my', tokens.zero)
    assert(resAuth.status === 200, `3. Authenticated learner request returns HTTP 200 (got: ${resAuth.status})`)

    // ─────────────────────────────────────────────────────────────────
    // SECTION 2: Baseline & Zero Activity Integrity (Tests 4-7)
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 2: Baseline & Zero Activity Integrity ---')

    const zeroBody = resAuth.body
    assert(
      zeroBody.summary?.total_achievements === 6 && zeroBody.summary?.unlocked_count === 0,
      `4. Learner with zero activity returns 0 unlocked badges and total_achievements = 6 (unlocked: ${zeroBody.summary?.unlocked_count})`
    )

    const allZeroUnlocked = zeroBody.achievements?.every((a) => a.unlocked === false && a.progress_percent === 0)
    assert(allZeroUnlocked === true, `5. All 6 badges report unlocked = false and progress_percent = 0`)

    assert(
      zeroBody.summary?.completed_courses === 0 &&
        zeroBody.summary?.passed_assessments === 0 &&
        zeroBody.summary?.verified_competencies === 0 &&
        zeroBody.summary?.active_learning_days === 0,
      `6. All summary activity counts are exactly 0 for zero-activity learner`
    )

    assert(
      zeroBody.summary?.xp === undefined &&
        zeroBody.summary?.streak === undefined &&
        zeroBody.summary?.cadre_standing === undefined,
      `7. Response is honest and free of fabricated XP, streak days, or cadre ranking`
    )

    // ─────────────────────────────────────────────────────────────────
    // SECTION 3: Individual Badge Evaluation Rules (Tests 8-13)
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 3: Individual Badge Evaluation Rules ---')

    const resAchiever = await apiGet('/api/achievements/my', tokens.userA)
    assert(resAchiever.status === 200, `Fetch User A achievements returns HTTP 200`)
    const aBody = resAchiever.body
    const aBadges = aBody.achievements || []

    const b1 = aBadges.find((b) => b.id === 'first_assessment_ace')
    assert(
      b1 && b1.unlocked === true && b1.current >= 1 && b1.progress_percent === 100,
      `8. First Assessment Ace: Unlocked with >= 1 passed quiz (actual current: ${b1?.current})`
    )

    const b2 = aBadges.find((b) => b.id === 'survey_methodologist')
    assert(
      b2 && b2.unlocked === true && b2.current >= 2 && b2.progress_percent === 100,
      `9. Survey Methodologist: Unlocked with >= 2 active course enrollments (actual current: ${b2?.current})`
    )

    const b3 = aBadges.find((b) => b.id === 'statistical_analyst')
    assert(
      b3 && b3.unlocked === true && b3.current >= 3 && b3.progress_percent === 100,
      `10. Statistical Analyst: Unlocked with >= 3 completed attempts (actual current: ${b3?.current})`
    )

    const b4 = aBadges.find((b) => b.id === 'active_learning_scholar')
    assert(
      b4 && b4.unlocked === true && b4.current >= 3 && b4.progress_percent === 100,
      `11. Active Learning Scholar: Unlocked with activity spanning >= 3 distinct days (actual current: ${b4?.current})`
    )

    const b5 = aBadges.find((b) => b.id === 'distinction_scholar')
    assert(
      b5 && b5.unlocked === true && b5.current >= 1 && b5.progress_percent === 100,
      `12. Distinction Scholar: Unlocked with distinction score >= 90% (evidence: ${b5?.evidence})`
    )

    const b6 = aBadges.find((b) => b.id === 'competency_master')
    assert(
      b6 && b6.unlocked === true && b6.current >= 2 && b6.progress_percent === 100,
      `13. Grandmaster of Statistics: Unlocked with >= 2 Level 4/5 competencies (actual current: ${b6?.current})`
    )

    // Summary count checks for User A
    assert(
      aBody.summary?.unlocked_count === 6 &&
        aBody.summary?.completed_courses === 1 &&
        aBody.summary?.passed_assessments === 2 &&
        aBody.summary?.verified_competencies === 2,
      `Summary counts for User A match database records (unlocked: ${aBody.summary?.unlocked_count}, courses: ${aBody.summary?.completed_courses}, passed: ${aBody.summary?.passed_assessments}, competencies: ${aBody.summary?.verified_competencies})`
    )

    // ─────────────────────────────────────────────────────────────────
    // SECTION 4: User Isolation & Multi-Tenancy (Tests 14-16)
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 4: User Isolation & Multi-Tenancy ---')

    const resPartial = await apiGet('/api/achievements/my', tokens.userB)
    assert(resPartial.status === 200, `Fetch User B achievements returns HTTP 200`)
    const bBody = resPartial.body
    const bBadges = bBody.achievements || []

    const bUser_b1 = bBadges.find((b) => b.id === 'first_assessment_ace')
    const bUser_b2 = bBadges.find((b) => b.id === 'survey_methodologist')
    const bUser_b3 = bBadges.find((b) => b.id === 'statistical_analyst')
    const bUser_b5 = bBadges.find((b) => b.id === 'distinction_scholar')

    assert(
      bUser_b1?.unlocked === true && bUser_b1?.current === 1,
      `14. User B has Badge 1 (First Assessment Ace) unlocked from their 1 passed attempt (72%)`
    )

    assert(
      bUser_b2?.unlocked === false && bUser_b2?.current === 1 && bUser_b2?.progress_percent === 50,
      `15. User B has Badge 2 locked at 50% (1/2 enrollments), completely isolated from User A`
    )

    assert(
      bUser_b3?.unlocked === false && bUser_b5?.unlocked === false && bBody.summary?.unlocked_count === 1,
      `16. User B summary reflects exactly 1 unlocked badge out of 6 without leakage from User A`
    )

    // ─────────────────────────────────────────────────────────────────
    // SECTION 5: Read-Only Invariants & Guardrails (Tests 17-20)
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 5: Read-Only Invariants & Guardrails ---')

    const attemptsCountBefore = await QuizAttempt.countDocuments()
    const enrollmentsCountBefore = await Enrollment.countDocuments()
    const competenciesCountBefore = await UserCompetency.countDocuments()

    // Call endpoint again multiple times
    await apiGet('/api/achievements/my', tokens.userA)
    await apiGet('/api/achievements/my', tokens.userB)
    await apiGet('/api/achievements/my', tokens.zero)

    const attemptsCountAfter = await QuizAttempt.countDocuments()
    const enrollmentsCountAfter = await Enrollment.countDocuments()
    const competenciesCountAfter = await UserCompetency.countDocuments()

    assert(
      attemptsCountBefore === attemptsCountAfter &&
        enrollmentsCountBefore === enrollmentsCountAfter &&
        competenciesCountBefore === competenciesCountAfter,
      `17. GET /api/achievements/my performs zero database writes (read-only invariant verified)`
    )

    const secondCall = await apiGet('/api/achievements/my', tokens.userA)
    assert(
      JSON.stringify(secondCall.body) === JSON.stringify(aBody),
      `18. Subsequent calls are strictly idempotent and return identical response structures`
    )

    const aliasCall = await apiGet('/api/my-achievements', tokens.userA)
    assert(
      aliasCall.status === 200 && JSON.stringify(aliasCall.body) === JSON.stringify(aBody),
      `19. Aliased route /api/my-achievements returns identical response contract`
    )

    // Check dev DB isolation
    const devConnAfter = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
    const devUserCountAfter = await devConnAfter.collection('users').countDocuments()
    await devConnAfter.close()
    assert(
      devUserCountAfter === 15,
      `20. Development database (kaushalai) strictly preserved at 15 users (actual: ${devUserCountAfter})`
    )

    // ─────────────────────────────────────────────────────────────────
    // SECTION 6: Business-Rule Corrections Verification - Part 24.1.2 (Tests 21-35)
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 6: Part 24.1.2 Business-Rule Corrections ---')

    // [DEF-24.1.1-01 Verification: In-Progress & Expired Attempts]
    const resUserC = await apiGet('/api/achievements/my', tokens.userC)
    assert(resUserC.status === 200, `Fetch User C achievements returns HTTP 200`)
    const cBody = resUserC.body
    const cBadges = cBody.achievements || []

    const cBadge3 = cBadges.find((b) => b.id === 'statistical_analyst')
    const cBadge1 = cBadges.find((b) => b.id === 'first_assessment_ace')

    assert(
      cBadge3 && cBadge3.current === 1 && cBadge3.unlocked === false,
      `21. DEF-24.1.1-01: In-progress and expired attempts with score 0 are NOT counted as completed (completed: ${cBadge3?.current} / 3)`
    )

    assert(
      cBadge1 && cBadge1.current === 0 && cBadge1.unlocked === false,
      `22. DEF-24.1.1-01: In-progress/expired attempts do not count as passed assessments (passed: ${cBadge1?.current})`
    )

    assert(
      cBody.summary?.passed_assessments === 0,
      `23. DEF-24.1.1-01: Summary passed_assessments strictly 0 when only 1 completed failed attempt exists`
    )

    assert(
      cBadge3.progress_percent === 33 && cBadge3.unlocked === false,
      `24. DEF-24.1.1-01: Statistical Analyst badge locked at 33% (1/3), accurately reflecting genuine completion`
    )

    // [DEF-24.1.1-02 & DEF-24.1.1-04 Verification: Stable Unlock Date & Chronological Sorting]
    const resUserD = await apiGet('/api/achievements/my', tokens.userD)
    assert(resUserD.status === 200, `Fetch User D achievements returns HTTP 200`)
    const dBody = resUserD.body
    const dBadges = dBody.achievements || []

    const dBadge4 = dBadges.find((b) => b.id === 'active_learning_scholar')
    const dBadge1 = dBadges.find((b) => b.id === 'first_assessment_ace')

    assert(
      dBadge4 && dBadge4.unlocked === true && dBadge4.current === 4,
      `25. DEF-24.1.1-02: Active Learning Scholar unlocks when distinct active days >= 3 (actual: ${dBadge4?.current})`
    )

    assert(
      dBadge4?.unlocked_at === '2026-11-03',
      `26. DEF-24.1.1-02: Unlock date is strictly the 3rd qualifying day (2026-11-03), NOT the latest day (actual: ${dBadge4?.unlocked_at})`
    )

    // Verify stability: Insert a 5th activity day (Nov 15) and verify unlock_at DOES NOT DRIFT
    const attD_nov15 = await QuizAttempt.create({
      userId: userD._id,
      quizId: new mongoose.Types.ObjectId(),
      quizTitle: 'Nov 15 Future Quiz',
      score: 88,
      correctCount: 17,
      totalQuestions: 20,
      passed: true,
      status: 'completed',
      attemptedAt: new Date('2026-11-15T10:00:00Z'),
      completedAt: new Date('2026-11-15T10:30:00Z')
    })
    fixtures.attemptIds.push(attD_nov15._id)

    const resUserD2 = await apiGet('/api/achievements/my', tokens.userD)
    const dBadge4_after = resUserD2.body.achievements?.find((b) => b.id === 'active_learning_scholar')
    assert(
      dBadge4_after?.unlocked_at === '2026-11-03' && dBadge4_after?.current === 5,
      `27. DEF-24.1.1-02: Future activity (5 days) does NOT drift the unlock date; remains locked at 2026-11-03`
    )

    // DEF-24.1.1-04: Deterministic ordering verification for User D
    // User D has attD_nov02 (score 80, passed) and attD_nov03 (score 75, passed) and attD_nov10 (score 92, passed).
    // attD_nov10 was inserted first in MongoDB, but attD_nov02 is chronologically earliest!
    assert(
      dBadge1?.evidence === 'Passed assessment with score 80%',
      `28. DEF-24.1.1-04: Earliest qualifying evidence selected deterministically (score 80% on Nov 2, not Nov 10 inserted first)`
    )

    // [DEF-24.1.1-03 Verification: Passive Recommendations & Administrative Updates]
    const resUserE = await apiGet('/api/achievements/my', tokens.userE)
    assert(resUserE.status === 200, `Fetch User E achievements returns HTTP 200`)
    const eBody = resUserE.body
    const eBadges = eBody.achievements || []

    const eBadge2 = eBadges.find((b) => b.id === 'survey_methodologist')
    const eBadge4 = eBadges.find((b) => b.id === 'active_learning_scholar')

    assert(
      eBody.summary?.active_learning_days === 0,
      `29. DEF-24.1.1-03: Passive recommendation createdAt/updatedAt does NOT award active learning days (days: ${eBody.summary?.active_learning_days})`
    )

    assert(
      eBadge2 && eBadge2.current === 0 && eBadge2.unlocked === false,
      `30. DEF-24.1.1-03: Recommendation enrollments do not count towards active enrollments (current: ${eBadge2?.current} / 2)`
    )

    assert(
      eBadge4 && eBadge4.current === 0 && eBadge4.unlocked === false,
      `31. DEF-24.1.1-03: Active Learning Scholar locked at 0% for passive learner without genuine activity`
    )

    // [DEF-24.1.1-05 Verification: Self-Assessed vs Objective Competencies]
    const resUserF = await apiGet('/api/achievements/my', tokens.userF)
    assert(resUserF.status === 200, `Fetch User F achievements returns HTTP 200`)
    const fBody = resUserF.body
    const fBadges = fBody.achievements || []

    const fBadge6 = fBadges.find((b) => b.id === 'competency_master')

    assert(
      fBody.summary?.verified_competencies === 1,
      `32. DEF-24.1.1-05: Subjective self-assessed competencies excluded from verified_competencies (actual: ${fBody.summary?.verified_competencies}, expected: 1)`
    )

    assert(
      fBadge6 && fBadge6.current === 1 && fBadge6.unlocked === false,
      `33. DEF-24.1.1-05: Self-assessed Level 4/5 competencies do NOT unlock Grandmaster of Statistics (current: ${fBadge6?.current} / 2)`
    )

    assert(
      fBadge6.progress_percent === 50,
      `34. DEF-24.1.1-05: Grandmaster of Statistics accurately shows 50% progress from 1 objectively verified competency`
    )

    // Verify idempotency and consistency across repeated calls
    const resUserF_repeat = await apiGet('/api/achievements/my', tokens.userF)
    assert(
      JSON.stringify(resUserF.body) === JSON.stringify(resUserF_repeat.body),
      `35. Repeated evaluation on User F produces strictly identical deterministic output`
    )

  } finally {
    // Cleanup fixtures from test database
    console.log('\n--- Cleaning up test fixtures in kaushalai_test ---')
    await User.deleteMany({ _id: { $in: fixtures.userIds } })
    await Course.deleteMany({ _id: { $in: fixtures.courseIds } })
    await Competency.deleteMany({ _id: { $in: fixtures.compIds } })
    await QuizAttempt.deleteMany({ _id: { $in: fixtures.attemptIds } })
    await Enrollment.deleteMany({ _id: { $in: fixtures.enrollmentIds } })
    await UserCompetency.deleteMany({ _id: { $in: fixtures.userCompIds } })

    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
    await mongoose.disconnect()
  }

  console.log('\n===================================================================')
  console.log(`TEST SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`)
  console.log('===================================================================')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err)
  process.exit(1)
})
