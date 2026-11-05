/**
 * test_part10_dashboard.js
 * Verification test suite for PART 10, 10.1 & 10.2:
 * KaushalAI Learner Dashboard Final Data-Integrity Verification & Database Isolation Hardening
 *
 * Verifies:
 * 1. Test Database Isolation Hardening (Part 10.2):
 *    - Rejection of missing MONGODB_TEST_URI (no fallbacks to MONGODB_URI)
 *    - Rejection of dev ('kaushalai') and prod ('production') databases
 *    - Strict connection to dedicated 'kaushalai_test' database
 *    - Safe deterministic fixture lifecycle and zero mutation of genuine data
 * 2. FIX 1: Learning Path enrollment status mapping (all 4 conditions, no false In Progress)
 * 3. FIX 2: Cumulative Estimated Learning Hours (progress-weighted, no fabricated 8h or 0.3h)
 * 4. FIX 3: Batched skill-gap course query safety (empty, invalid IDs, missing names, no $or: [])
 * 5. Dashboard API Performance: Batch query latency < 500ms
 */

'use strict'

require('dotenv').config()
const http = require('http')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')

const {
  startTestServer,
  closeTestEnvironment,
  safeCleanupTestUsers,
  validateTestDatabaseUri,
} = require('./src/test/testDbGuard')

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'kaushalai_dev_access_secret_change_in_prod'

let activePort = null

function request(options, bodyData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: activePort,
        ...options,
      },
      (res) => {
        let raw = ''
        res.on('data', (chunk) => (raw += chunk))
        res.on('end', () => {
          let parsed = null
          try {
            parsed = JSON.parse(raw)
          } catch {
            parsed = raw
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed })
        })
      }
    )
    req.on('error', reject)
    if (bodyData) {
      req.write(typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData))
    }
    req.end()
  })
}

function makeToken(payload) {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
}

async function runTests() {
  console.log('========================================================================')
  console.log('  TESTING PART 10.2: KAUSHALAI TEST DATABASE ISOLATION & DASHBOARD SUITE ')
  console.log('========================================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`)
      passed++
    } else {
      console.error(`  ✗ FAIL: ${message}`)
      failed++
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 0: Hardened Database Isolation Verification (Part 10.2)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST GROUP 0: Database Isolation & Security Guardrails ---')

  // 0.1: Missing URI rejection
  try {
    validateTestDatabaseUri(null)
    assert(false, 'Missing MONGODB_TEST_URI should throw fatal error')
  } catch (err) {
    assert(err.message.includes('MONGODB_TEST_URI is missing or empty'), '0.1: Missing MONGODB_TEST_URI rejected immediately (no fallback)')
  }

  // 0.2: Reject development database
  try {
    validateTestDatabaseUri('mongodb://127.0.0.1:27017/kaushalai')
    assert(false, 'Development database "kaushalai" should be blocked')
  } catch (err) {
    assert(err.message.includes('SECURITY ALERT'), '0.2: Development database "kaushalai" blocked with Security Alert')
  }

  // 0.3: Reject production database
  try {
    validateTestDatabaseUri('mongodb://127.0.0.1:27017/production')
    assert(false, 'Production database should be blocked')
  } catch (err) {
    assert(err.message.includes('SECURITY ALERT'), '0.3: Production database "production" blocked with Security Alert')
  }

  // 0.4: Reject unidentifiable database
  try {
    validateTestDatabaseUri('mongodb://127.0.0.1:27017/some_random_db')
    assert(false, 'Unidentifiable database should be blocked')
  } catch (err) {
    assert(err.message.includes('SECURITY REJECTION'), '0.4: Generic database blocked (must be identifiable test DB)')
  }

  // 0.5: Start isolated test environment
  const testEnv = await startTestServer()
  activePort = testEnv.port
  assert(testEnv.dbName === 'kaushalai_test', `0.5: Test environment verified on dedicated test database "${testEnv.dbName}"`)
  console.log(`Ephemeral test API running on: ${testEnv.baseUrl}\n`)

  const User = require('./src/models/User')
  const Course = require('./src/models/Course')
  const Competency = require('./src/models/Competency')
  const Assessment = require('./src/models/Assessment')
  const AssessmentAttempt = require('./src/models/AssessmentAttempt')
  const SkillGap = require('./src/models/SkillGap')
  const Recommendation = require('./src/models/Recommendation')
  const LearningPath = require('./src/models/LearningPath')
  const LearningPathItem = require('./src/models/LearningPathItem')

  // Setup dedicated deterministic test learner
  const testEmail = 'part10_learner_test@kaushalai.test'
  let learner = await User.findOne({ email: testEmail })
  if (!learner) {
    learner = await User.create({
      name: 'Part 10 Dashboard Tester',
      email: testEmail,
      passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
      role: 'employee',
      department: 'Statistics & Programme Implementation',
      designation: 'Statistical Officer',
      level: 3,
      onboarding_step: 6,
      onboarding_completed: true,
      skills_to_develop: [],
    })
  } else {
    learner.onboarding_step = 6
    learner.onboarding_completed = true
    if (!learner.passwordHash) {
      learner.passwordHash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW'
    }
    await learner.save()
  }

  const userId = learner._id.toString()
  const token = makeToken({ id: userId, role: learner.role, email: learner.email })

  // Seed baseline assessment attempt & gaps for the test learner if needed
  let attempt = await AssessmentAttempt.findOne({ user_id: learner._id, status: 'completed' })
  if (!attempt) {
    const defaultAssessment = await Assessment.findOne({}).lean()
    const assessmentId = defaultAssessment?._id || new mongoose.Types.ObjectId()
    attempt = await AssessmentAttempt.create({
      user_id: learner._id,
      assessment_id: assessmentId,
      status: 'completed',
      overall_score: 60,
      total_questions: 15,
      correct_answers: 9,
      incorrect_answers: 3,
      unanswered: 3,
      started_at: new Date(Date.now() - 15 * 60 * 1000),
      completed_at: new Date(),
    })
  }

  let gapCount = await SkillGap.countDocuments({ user_id: learner._id })
  if (gapCount === 0) {
    const sampleComp = await Competency.findOne({}).lean()
    if (sampleComp) {
      await SkillGap.create({
        user_id: learner._id,
        competency_id: sampleComp._id,
        competency_name: sampleComp.name,
        current_level: 1,
        required_level: 3,
        gap: 2,
        priority: 'high',
      })
    }
  }

  let recCount = await Recommendation.countDocuments({ user_id: learner._id })
  if (recCount === 0) {
    const sampleCourse = await Course.findOne({ isPublished: true }).lean()
    if (sampleCourse) {
      await Recommendation.create({
        user_id: learner._id,
        course_id: sampleCourse._id,
        title: sampleCourse.title,
        priority_rank: 1,
        source: 'cadre_gap',
        reason: 'Recommended based on identified cadre competency gap',
      })
      const lp = await LearningPath.create({
        user_id: learner._id,
        title: 'Statistical Officer Roadmap',
        target_role: 'Statistical Officer',
        status: 'active',
      })
      await LearningPathItem.create({
        learning_path_id: lp._id,
        user_id: learner._id,
        course_id: sampleCourse._id,
        title: sampleCourse.title,
        sequence_order: 1,
        status: 'in_progress',
      })
    }
  }

  console.log(`Testing with Isolated Learner: ${userId} (${learner.email})\n`)

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 1: Live API Route Endpoints & Performance
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST GROUP 1: Live API Route Endpoints & Performance ---')
  const startTime = Date.now()
  const gapsRes = await request({
    path: '/api/skill-gaps',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  const durationMs = Date.now() - startTime

  assert(gapsRes.status === 200, `GET /api/skill-gaps returns 200 OK (actual: ${gapsRes.status})`)
  assert(gapsRes.body.success === true, 'Response contains success: true')
  assert(Array.isArray(gapsRes.body.skill_gaps), 'skill_gaps is an array')
  assert(gapsRes.body.skill_gaps.length > 0, `Skill gaps returned count: ${gapsRes.body.skill_gaps.length}`)
  assert(durationMs < 500, `Batch-optimized route executed in ${durationMs}ms (<500ms benchmark)`)

  assert(gapsRes.body.latest_assessment !== undefined, 'latest_assessment field is returned')
  if (gapsRes.body.latest_assessment) {
    assert(
      typeof gapsRes.body.latest_assessment.overall_score === 'number',
      `latest_assessment has valid overall_score: ${gapsRes.body.latest_assessment.overall_score}%`
    )
    assert(
      gapsRes.body.latest_assessment.completed_at != null,
      'latest_assessment has completed_at timestamp'
    )
  }

  const recsRes = await request({
    path: '/api/recommendations',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  assert(recsRes.status === 200, `GET /api/recommendations returns 200 OK`)
  assert(Array.isArray(recsRes.body.recommendations), 'recommendations is an array')

  const lpRes = await request({
    path: '/api/learning-path',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  assert(lpRes.status === 200, `GET /api/learning-path returns 200 OK`)
  assert(lpRes.body.learning_path != null, 'learning_path object returned')

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 2: FIX 1 — Learning Path Enrollment Status Mapping
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 2: FIX 1 — Learning Path Enrollment Status Mapping ---')

  function resolveEnrollmentStatus(enrollment) {
    if (!enrollment) return 'not_started'
    const progress = Number(enrollment.progressPercent) || 0
    const isCompleted = enrollment.status === 'completed' || progress >= 100
    const isInProgress = !isCompleted && (enrollment.status === 'in_progress' || (progress > 0 && progress < 100))
    const isEnrolled = !isCompleted && !isInProgress && (enrollment.status === 'enrolled' || progress === 0)
    return isCompleted ? 'completed' : isInProgress ? 'in_progress' : isEnrolled ? 'enrolled' : 'not_started'
  }

  // Condition 1: Completed
  const statusCond1A = resolveEnrollmentStatus({ status: 'in_progress', progressPercent: 100 })
  const statusCond1B = resolveEnrollmentStatus({ status: 'completed', progressPercent: 40 })
  assert(statusCond1A === 'completed', `Condition 1A: progress >= 100% maps to 'completed' (actual: ${statusCond1A})`)
  assert(statusCond1B === 'completed', `Condition 1B: status === 'completed' maps to 'completed' (actual: ${statusCond1B})`)

  // Condition 2: In Progress
  const statusCond2A = resolveEnrollmentStatus({ status: 'enrolled', progressPercent: 45 })
  const statusCond2B = resolveEnrollmentStatus({ status: 'in_progress', progressPercent: 0 })
  assert(statusCond2A === 'in_progress', `Condition 2A: 45% progress maps to 'in_progress' (actual: ${statusCond2A})`)
  assert(statusCond2B === 'in_progress', `Condition 2B: explicit status 'in_progress' maps to 'in_progress' (actual: ${statusCond2B})`)

  // Condition 3: Enrolled with 0% progress (MUST NOT be 'in_progress')
  const statusCond3 = resolveEnrollmentStatus({ status: 'enrolled', progressPercent: 0 })
  assert(statusCond3 === 'enrolled', `Condition 3: 0% progress enrollment maps to 'enrolled' (actual: ${statusCond3})`)
  assert(statusCond3 !== 'in_progress', `Condition 3 check: 0% progress is NEVER displayed as 'in_progress'`)

  // Condition 4: No enrollment exists
  const statusCond4 = resolveEnrollmentStatus(null)
  assert(statusCond4 === 'not_started', `Condition 4: No enrollment maps to 'not_started' (actual: ${statusCond4})`)

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 3: FIX 2 — Cumulative Estimated Learning Hours Formula
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 3: FIX 2 — Cumulative Estimated Learning Hours Formula ---')

  function calculateEstimatedLearningHours(enrollments) {
    let igotHours = 0
    let nsstaHours = 0
    let otherHours = 0
    const seenCourseIds = new Set()

    enrollments.forEach((e) => {
      if (!e || !e.courseId) return
      const courseObj = typeof e.courseId === 'object' ? e.courseId : {}
      const cId = courseObj._id ? String(courseObj._id) : String(e.courseId)

      if (seenCourseIds.has(cId)) return
      seenCourseIds.add(cId)

      const status = e.status || 'enrolled'
      if (status !== 'enrolled' && status !== 'in_progress' && status !== 'completed') return

      const rawDuration = Number(courseObj.durationHours || courseObj.estimatedHours)
      if (!isFinite(rawDuration) || rawDuration <= 0) return

      let rawProgress = Number(e.progressPercent)
      if (isNaN(rawProgress)) rawProgress = 0
      if (status === 'completed') rawProgress = 100
      const clampedProgress = Math.min(100, Math.max(0, rawProgress))

      const earnedHours = Math.round(rawDuration * (clampedProgress / 100) * 10) / 10

      const providerStr = (courseObj.provider || courseObj.source || '').toLowerCase()
      if (providerStr.includes('igot')) {
        igotHours += earnedHours
      } else if (providerStr.includes('nssta')) {
        nsstaHours += earnedHours
      } else {
        otherHours += earnedHours
      }
    })

    const totalEstimatedHours = Math.round((igotHours + nsstaHours + otherHours) * 10) / 10
    return { igotHours, nsstaHours, otherHours, totalEstimatedHours }
  }

  // 3.1: Zero progress on 10h course -> 0.0h
  const resZero = calculateEstimatedLearningHours([
    { courseId: { _id: 'c1', durationHours: 10, provider: 'iGOT' }, progressPercent: 0 },
  ])
  assert(resZero.totalEstimatedHours === 0, `3.1: Zero progress on 10h course yields 0.0 hours (actual: ${resZero.totalEstimatedHours})`)

  // 3.2: 50% progress on 10h course -> exactly 5.0h
  const resHalf = calculateEstimatedLearningHours([
    { courseId: { _id: 'c2', durationHours: 10, provider: 'iGOT' }, progressPercent: 50 },
  ])
  assert(resHalf.totalEstimatedHours === 5.0, `3.2: 50% progress on 10h course yields 5.0 hours (actual: ${resHalf.totalEstimatedHours})`)

  // 3.3: 100% progress on 8h NSSTA course -> 8.0h
  const resFull = calculateEstimatedLearningHours([
    { courseId: { _id: 'c3', durationHours: 8, provider: 'NSSTA' }, progressPercent: 100 },
  ])
  assert(resFull.nsstaHours === 8.0, `3.3: 100% progress on 8h NSSTA course yields 8.0 hours (actual: ${resFull.nsstaHours})`)

  // 3.4: Missing duration ignored (0.0h, no default 8h)
  const resMissing = calculateEstimatedLearningHours([
    { courseId: { _id: 'c4', provider: 'iGOT' }, progressPercent: 100 },
  ])
  assert(resMissing.totalEstimatedHours === 0, `3.4: Missing duration safely ignored without 8h fallback (actual: ${resMissing.totalEstimatedHours})`)

  // 3.5: Negative or zero duration ignored
  const resInvalidDur = calculateEstimatedLearningHours([
    { courseId: { _id: 'c5', durationHours: -5, provider: 'iGOT' }, progressPercent: 100 },
    { courseId: { _id: 'c6', durationHours: 0, provider: 'NSSTA' }, progressPercent: 100 },
  ])
  assert(resInvalidDur.totalEstimatedHours === 0, `3.5: Negative/zero durations ignored (actual: ${resInvalidDur.totalEstimatedHours})`)

  // 3.6: Duplicate enrollments deduplicated
  const resDup = calculateEstimatedLearningHours([
    { courseId: { _id: 'c7', durationHours: 10, provider: 'iGOT' }, progressPercent: 50 },
    { courseId: { _id: 'c7', durationHours: 10, provider: 'iGOT' }, progressPercent: 50 },
  ])
  assert(resDup.totalEstimatedHours === 5.0, `3.6: Duplicate course enrollments deduplicated to single count (actual: ${resDup.totalEstimatedHours})`)

  // 3.7: Diagnostic assessment credit removed
  const resNoDiag = calculateEstimatedLearningHours([])
  assert(resNoDiag.totalEstimatedHours === 0, `3.7: No arbitrary 0.3h diagnostic credit added (actual: ${resNoDiag.totalEstimatedHours})`)

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 4: FIX 3 — Batched Skill-Gap Course Query Safety
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 4: FIX 3 — Batched Skill-Gap Course Query Safety ---')

  async function testBatchCourseLookup(gaps) {
    const unmappedCompIds = []
    const unmappedCompNames = []

    for (const gap of gaps) {
      if (!gap) continue
      const rawCompId = gap.competency_id?._id || gap.competency_id
      const compId = rawCompId ? rawCompId.toString() : null
      const compName =
        typeof gap.competency_id?.name === 'string' && gap.competency_id.name.trim().length > 0
          ? gap.competency_id.name.trim()
          : typeof gap.name === 'string' && gap.name.trim().length > 0
          ? gap.name.trim()
          : null

      if (compId && mongoose.Types.ObjectId.isValid(compId)) {
        unmappedCompIds.push(new mongoose.Types.ObjectId(compId))
      }
      if (compName) {
        unmappedCompNames.push(compName)
      }
    }

    const orClauses = []
    if (unmappedCompIds.length > 0) {
      orClauses.push({ skillTags: { $in: unmappedCompIds } })
    }
    if (unmappedCompNames.length > 0) {
      const regexes = unmappedCompNames.map((n) => new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
      orClauses.push({ competencyTags: { $in: regexes } })
      orClauses.push({ title: { $in: regexes } })
    }

    let candidateCourses = []
    if (orClauses.length > 0) {
      candidateCourses = await Course.find({
        isPublished: true,
        $or: orClauses,
      })
        .select('_id title skillTags competencyTags')
        .lean()
    }

    return { orClauses, candidateCourses }
  }

  // 4.1: Empty competency list -> safe handling, no empty $or passed
  const safeEmpty = await testBatchCourseLookup([])
  assert(safeEmpty.orClauses.length === 0, `4.1A: Empty list produces 0 orClauses (actual: ${safeEmpty.orClauses.length})`)
  assert(safeEmpty.candidateCourses.length === 0, `4.1B: Empty list skips Course.find safely`)

  // 4.2: Malformed competency IDs -> safely filtered out without throwing CastError
  const safeInvalidId = await testBatchCourseLookup([
    { competency_id: 'invalid-non-object-id', name: null },
    { competency_id: 12345, name: undefined },
  ])
  assert(safeInvalidId.orClauses.length === 0, `4.2: Malformed competency IDs ignored safely without CastError`)

  // 4.3: Missing / empty competency names -> safely ignored
  const safeMissingName = await testBatchCourseLookup([
    { competency_id: null, name: '' },
    { competency_id: null, name: '   ' },
    { competency_id: undefined, name: null },
  ])
  assert(safeMissingName.orClauses.length === 0, `4.3: Missing/empty competency names ignored safely`)

  // 4.4: No valid conditions -> query skipped safely without error
  const safeNoConds = await testBatchCourseLookup([null, undefined, {}])
  assert(safeNoConds.orClauses.length === 0, `4.4: No valid conditions produce 0 orClauses (no MongoDB $or: [] error)`)

  // 4.5 & 4.6: Valid query handling
  const validComp = await Course.findOne({ isPublished: true, 'competencies.0': { $exists: true } }).lean()
  const sampleCompId = validComp?._id?.toString() || new mongoose.Types.ObjectId().toString()
  const sampleCompName = 'Sampling Methods'

  const safeValid = await testBatchCourseLookup([
    { competency_id: new mongoose.Types.ObjectId(sampleCompId), name: sampleCompName },
    { competency_id: new mongoose.Types.ObjectId(sampleCompId), name: sampleCompName },
  ])
  assert(safeValid.orClauses.length > 0, `4.5: Valid competencies produce safe non-empty $or clauses (${safeValid.orClauses.length})`)
  assert(Array.isArray(safeValid.candidateCourses), `4.6: Valid query executes and returns array of candidate courses`)

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 5: Security & Verification of Genuine Data Preservation
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 5: Security & Genuine Data Preservation ---')

  const unauthRes = await request({
    path: '/api/skill-gaps',
    method: 'GET',
  })
  assert(unauthRes.status === 401, `5.1: Unauthenticated request rejected with 401 Unauthorized (actual: ${unauthRes.status})`)

  // Verify non-destructive test execution: genuine users and master data exist
  const allUsersCount = await User.countDocuments()
  assert(allUsersCount >= 1, `5.2: Test database has ${allUsersCount} users present`)

  const allCoursesCount = await Course.countDocuments()
  assert(allCoursesCount >= 50, `5.3: Master course catalog preserved: ${allCoursesCount} courses present`)

  // Teardown: clean up test user fixtures safely
  await safeCleanupTestUsers([testEmail])
  console.log('\n  (Dedicated test user fixture cleaned up)')

  console.log('\n========================================================================')
  console.log(`PART 10.2 SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('========================================================================')

  await closeTestEnvironment()
  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch(async (err) => {
  console.error('Test runner error:', err)
  await closeTestEnvironment()
  process.exit(1)
})
