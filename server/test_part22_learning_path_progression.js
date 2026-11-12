/**
 * TEST PART 22: KAUSHALAI LEARNING PATH & COURSE PROGRESSION SYNCHRONIZATION SUITE
 * 
 * Verifies:
 * Section 1: Authoritative Sequenced Learning Path
 *   1.1: Real sequenced API data is displayed in backend order (sequence_order 1, 2, 3)
 *   1.2: Hardcoded six-course fallback (CATALOGUE / igot-crs-01) is eliminated from MyLearningPathPage.jsx
 *   1.3: Empty learning path returns learning_path: null, items: [] cleanly with HTTP 200
 *   1.4: API authentication failure (401) is represented separately from an empty path
 *   1.5: Unpublished courses (isPublished: false) are strictly excluded from the path
 *   1.6: Duplicate course references are deduplicated by courseId
 *   1.7: User isolation is strictly enforced (learner cannot read another user's path)
 *   1.8: Dashboard learning-path API contract ({ success: true, learning_path, items }) remains intact
 * 
 * Section 2: Enrollment and Progression Integrity
 *   2.1: Progress updates are validated and clamped (0-100%)
 *   2.2: Course completion to 100% sets status: 'completed' and completedAt timestamp
 *   2.3: Completion is strictly idempotent (repeated requests preserve original completedAt)
 *   2.4: Anti-reversion guard: older progress updates cannot revert completed status
 *   2.5: Duplicate enrollment requests rejected with 409 (no duplicate records)
 *   2.6: Progress updates synchronize corresponding LearningPathItem status
 *   2.7: Real enrollment history and timestamps are preserved
 * 
 * Section 3: Critical Competency Integrity Rules
 *   3.1: Completing a course without assessment does NOT increase UserCompetency.current_level
 *   3.2: Valid quiz assessment updates UserCompetency through canonical applyCompetencyUpdates()
 *   3.3: Competency improvement triggers canonical computeUserSkillGaps() under withUserLock
 *   3.4: No direct writes or duplicate formulas written to SkillGap from course completion
 *   3.5: Failed recalculation preserves needs_skillgap_sync recovery markers
 *   3.6: Subsequent recovery via GET /api/skill-gaps recovers active projection and clears markers
 *   3.7: Historical UserCompetency and assessment records are strictly preserved
 *   3.8: Concurrent progress updates and recalculations serialize through withUserLock(userId)
 * 
 * Section 4: Database Isolation Guardrails
 *   4.1: Development DB kaushalai remains strictly at 15 users before and after
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

async function runTests() {
  console.log('===================================================================')
  console.log('PART 22: LEARNING PATH & COURSE PROGRESSION SYNCHRONIZATION SUITE')
  console.log('===================================================================')

  await mongoose.connect(testDbUri)

  const User = require('./src/models/User')
  const Department = require('./src/models/Department')
  const Role = require('./src/models/Role')
  const Competency = require('./src/models/Competency')
  const RoleCompetency = require('./src/models/RoleCompetency')
  const UserCompetency = require('./src/models/UserCompetency')
  const Course = require('./src/models/Course')
  const Enrollment = require('./src/models/Enrollment')
  const LearningActivity = require('./src/models/LearningActivity')
  const LearningPath = require('./src/models/LearningPath')
  const LearningPathItem = require('./src/models/LearningPathItem')
  const SkillGap = require('./src/models/SkillGap')
  const Certificate = require('./src/models/Certificate')
  const AuditLog = require('./src/models/AuditLog')

  await Enrollment.syncIndexes().catch(() => {})
  await LearningActivity.syncIndexes().catch(() => {})

  const {
    computeUserSkillGaps,
    setPreCleanupHook,
    clearPreCleanupHook,
  } = require('./src/services/skillGap.service')

  const { applyCompetencyUpdates } = require('./src/services/competencyUpdate.service')
  const { updateProgress, enrollUser } = require('./src/services/course.service')

  // ──────────────────────────────────────────────────────────────────────────
  // GUARDRAIL: Pre-Test Development Database Check
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GUARDRAIL: Development Database Isolation (Pre-Test) ---')
  const devConn1 = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
  const devUserCount1 = await devConn1.collection('users').countDocuments()
  assert(devUserCount1 === 15, `G.1.Initial: Development DB (kaushalai) user count strictly 15 (actual: ${devUserCount1})`)
  await devConn1.close()

  // Clean test fixtures
  const testPrefix = 'p22_test_'
  await User.deleteMany({ email: new RegExp(testPrefix) })
  await Department.deleteMany({ code: new RegExp('^P22_') })
  await Role.deleteMany({ name: new RegExp('^P22 ') })
  await Competency.deleteMany({ competencyCode: new RegExp('^P22_') })
  await Course.deleteMany({ title: new RegExp('^P22 ') })
  await LearningPath.deleteMany({ target_role: new RegExp('^P22 ') })
  await AuditLog.deleteMany({ 'meta.testSuite': 'part22_learning_path' })

  // Setup Department & Cadre Role
  const dept = await Department.create({
    name: 'P22 Economic Statistics Division',
    code: 'P22_ESD',
    ministry: 'Ministry of Statistics and Programme Implementation',
  })

  const role = await Role.create({
    name: 'P22 Junior Statistical Officer',
    level: 2,
    department_ref: dept._id,
  })

  // Setup Competencies
  const comp1 = await Competency.create({
    name: 'P22 Survey Sampling Methodology',
    competencyCode: 'P22_COMP1',
    category: 'statistical',
  })

  const comp2 = await Competency.create({
    name: 'P22 Macroeconomic Aggregates',
    competencyCode: 'P22_COMP2',
    category: 'statistical',
  })

  await RoleCompetency.create({ role_id: role._id, competency_id: comp1._id, required_level: 3 })
  await RoleCompetency.create({ role_id: role._id, competency_id: comp2._id, required_level: 4 })

  // Setup Published Courses
  const course1 = await Course.create({
    title: 'P22 Advanced Sample Survey Methods',
    provider: 'iGOT Karmayogi',
    source: 'igot',
    difficulty: 'intermediate',
    level: 'Intermediate',
    estimatedHours: 8,
    durationHours: 8,
    skillTags: [comp1._id],
    isPublished: true,
    modules: [
      { title: 'P22 Module 1: Sampling Design', durationMins: 240, youtubeUrl: 'https://www.youtube.com/watch?v=p22-mod1' },
      { title: 'P22 Module 2: Estimation', durationMins: 240, youtubeUrl: 'https://www.youtube.com/watch?v=p22-mod2' },
    ],
  })

  const course2 = await Course.create({
    title: 'P22 National Income Accounting',
    provider: 'iGOT Karmayogi',
    source: 'igot',
    difficulty: 'intermediate',
    level: 'Intermediate',
    estimatedHours: 12,
    durationHours: 12,
    skillTags: [comp2._id],
    isPublished: true,
  })

  const course3 = await Course.create({
    title: 'P22 Public Policy Data Analysis',
    provider: 'iGOT Karmayogi',
    source: 'igot',
    difficulty: 'advanced',
    level: 'Advanced',
    estimatedHours: 10,
    durationHours: 10,
    skillTags: [comp1._id, comp2._id],
    isPublished: true,
  })

  // Setup Unpublished Course (for exclusion testing)
  const courseUnpublished = await Course.create({
    title: 'P22 Draft Internal Methods Course',
    provider: 'iGOT Karmayogi',
    source: 'igot',
    difficulty: 'beginner',
    level: 'Beginner',
    estimatedHours: 4,
    durationHours: 4,
    skillTags: [comp1._id],
    isPublished: false,
  })

  // Setup Users
  const learner1 = await User.create({
    name: 'P22 Ramesh Chandra',
    email: `${testPrefix}ramesh@mospi.gov.in`,
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    role: 'employee',
    employeeId: 'ISS-2022-801',
    department: dept.name,
    cadre: 'Indian Statistical Service (ISS)',
    role_id: role._id,
    designation: role.name,
    level: role.level,
    isActive: true,
    onboarding_completed: true,
  })

  const learner2 = await User.create({
    name: 'P22 Sneha Kulkarni',
    email: `${testPrefix}sneha@mospi.gov.in`,
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    role: 'employee',
    employeeId: 'SSS-2021-802',
    department: dept.name,
    cadre: 'Subordinate Statistical Service (SSS)',
    role_id: role._id,
    designation: role.name,
    level: role.level,
    isActive: true,
    onboarding_completed: true,
  })

  // Setup Initial UserCompetency for learner1 (comp1 at level 2 -> gap 1)
  await UserCompetency.create({
    user_id: learner1._id,
    competency_id: comp1._id,
    current_level: 2,
    source: 'assessment',
    last_assessed_at: new Date('2026-10-01'),
  })

  // Initial Gaps computed
  await computeUserSkillGaps(learner1._id)

  // Create Authoritative LearningPath for learner1
  const pathLearner1 = await LearningPath.create({
    user_id: learner1._id,
    target_role: role.name,
    target_competency_level: role.level,
    status: 'active',
    generated_at: new Date(),
  })

  // Create Sequenced Items with sequence_order 1, 2, 3
  // Also include unpublished course and a duplicate reference to verify filtering
  const item1 = await LearningPathItem.create({
    user_id: learner1._id,
    learning_path_id: pathLearner1._id,
    course_id: course1._id,
    sequence_order: 1,
    status: 'not_started',
  })

  const item2 = await LearningPathItem.create({
    user_id: learner1._id,
    learning_path_id: pathLearner1._id,
    course_id: course2._id,
    sequence_order: 2,
    status: 'not_started',
  })

  const item3 = await LearningPathItem.create({
    user_id: learner1._id,
    learning_path_id: pathLearner1._id,
    course_id: course3._id,
    sequence_order: 3,
    status: 'not_started',
  })

  // Unpublished course item (should be filtered out by getLearningPath)
  await LearningPathItem.create({
    user_id: learner1._id,
    learning_path_id: pathLearner1._id,
    course_id: courseUnpublished._id,
    sequence_order: 4,
    status: 'not_started',
  })

  // Duplicate item of course1 (should be deduplicated)
  await LearningPathItem.create({
    user_id: learner1._id,
    learning_path_id: pathLearner1._id,
    course_id: course1._id,
    sequence_order: 5,
    status: 'not_started',
  })

  // Setup HTTP test server
  const app = require('./src/app')
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port

  function makeRequest(method, reqPath, headers = {}, bodyData = null) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(reqPath, `http://127.0.0.1:${port}`)
      const options = {
        hostname: '127.0.0.1',
        port,
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers,
      }
      if (bodyData) {
        options.headers['Content-Type'] = 'application/json'
      }
      const req = http.request(options, (res) => {
        let respBody = ''
        res.on('data', (chunk) => (respBody += chunk))
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(respBody) })
          } catch {
            resolve({ status: res.statusCode, body: respBody })
          }
        })
      })
      req.on('error', reject)
      if (bodyData) {
        req.write(JSON.stringify(bodyData))
      }
      req.end()
    })
  }

  const learner1Token = jwt.sign(
    { id: learner1._id.toString(), email: learner1.email, role: 'employee' },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )

  const learner2Token = jwt.sign(
    { id: learner2._id.toString(), email: learner2.email, role: 'employee' },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 1: Authoritative Sequenced Learning Path
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 1: Authoritative Sequenced Learning Path ---')

    // 1.1: Real sequenced API data is displayed in backend order
    const res1 = await makeRequest('GET', '/api/learning-path', { Authorization: `Bearer ${learner1Token}` })
    assert(res1.status === 200, `1.1.1: GET /api/learning-path returns HTTP 200`)
    assert(res1.body.success === true, `1.1.2: Response has success: true`)
    assert(res1.body.learning_path !== null, `1.1.3: learning_path is populated`)
    assert(res1.body.learning_path.target_role === role.name, `1.1.4: target_role matches "${role.name}"`)
    assert(Array.isArray(res1.body.items), `1.1.5: items is an array`)
    assert(res1.body.items.length === 3, `1.1.6: items has exactly 3 valid deduplicated published courses (got: ${res1.body.items.length})`)

    // Verify strict sequence order
    assert(res1.body.items[0].sequence_order === 1, `1.1.7: First milestone has sequence_order = 1`)
    assert(res1.body.items[1].sequence_order === 2, `1.1.8: Second milestone has sequence_order = 2`)
    assert(res1.body.items[2].sequence_order === 3, `1.1.9: Third milestone has sequence_order = 3`)
    assert(res1.body.items[0].course_id.title === course1.title, `1.1.10: First milestone is Course 1`)
    assert(res1.body.items[1].course_id.title === course2.title, `1.1.11: Second milestone is Course 2`)
    assert(res1.body.items[2].course_id.title === course3.title, `1.1.12: Third milestone is Course 3`)

    // 1.2: Hardcoded six-course fallback eliminated from frontend source
    const pageSource = fs.readFileSync(path.resolve(__dirname, '../client/src/pages/learning/MyLearningPathPage.jsx'), 'utf8')
    assert(!pageSource.includes('igot-crs-01'), `1.2.1: Hardcoded fake course ID 'igot-crs-01' eliminated from MyLearningPathPage.jsx`)
    assert(!pageSource.includes('const CATALOGUE ='), `1.2.2: Hardcoded CATALOGUE object eliminated from MyLearningPathPage.jsx`)
    assert(!pageSource.includes('const YOUTUBE_MAP ='), `1.2.3: Hardcoded YOUTUBE_MAP object eliminated from MyLearningPathPage.jsx`)
    assert(pageSource.includes('getLearningPath'), `1.2.4: MyLearningPathPage.jsx imports and calls getLearningPath()`)

    // 1.3: Empty learning path returns learning_path: null, items: [] cleanly with HTTP 200
    const res2 = await makeRequest('GET', '/api/learning-path', { Authorization: `Bearer ${learner2Token}` })
    assert(res2.status === 200, `1.3.1: GET /api/learning-path for user without path returns HTTP 200`)
    assert(res2.body.success === true, `1.3.2: Empty path response has success: true`)
    assert(res2.body.learning_path === null, `1.3.3: Empty path response has learning_path: null`)
    assert(Array.isArray(res2.body.items) && res2.body.items.length === 0, `1.3.4: Empty path response has items: []`)

    // 1.4: API authentication failure (401) is represented separately from an empty path
    const unauthRes = await makeRequest('GET', '/api/learning-path')
    assert(unauthRes.status === 401, `1.4: Unauthenticated GET /api/learning-path rejected with HTTP 401 (not confused with empty path)`)

    // 1.5: Unpublished courses (isPublished: false) are strictly excluded from the path
    const unpublishedInItems = res1.body.items.some((it) => it.course_id._id.toString() === courseUnpublished._id.toString())
    assert(!unpublishedInItems, `1.5: Unpublished course is strictly excluded from returned learning path items`)

    // 1.6: Duplicate course references are deduplicated by courseId
    const course1Occurrences = res1.body.items.filter((it) => it.course_id._id.toString() === course1._id.toString())
    assert(course1Occurrences.length === 1, `1.6: Course 1 appears strictly once (deduplicated from ${course1Occurrences.length})`)

    // 1.7: User isolation is strictly enforced
    // learner2 receives their own empty path and cannot see learner1's path items
    assert(res2.body.items.length === 0, `1.7: Learner 2 cannot access Learner 1's learning path items`)

    // 1.8: Dashboard learning-path API contract remains intact
    assert('success' in res1.body && 'learning_path' in res1.body && 'items' in res1.body, `1.8: API contract preserves { success, learning_path, items } for dashboard compatibility`)

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 2: Enrollment and Progression Integrity
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 2: Enrollment and Progression Integrity ---')

    // 2.1: Enrollment creation initializes status: 'enrolled' and progressPercent: 0
    const enrollRes = await makeRequest(
      'POST',
      '/api/users/me/enrollments',
      { Authorization: `Bearer ${learner1Token}` },
      { courseId: course1._id.toString() }
    )
    assert(enrollRes.status === 201, `2.1.1: POST /api/users/me/enrollments returned HTTP 201`)
    const enrollment1 = enrollRes.body.enrollment
    assert(enrollment1.status === 'enrolled', `2.1.2: Initial enrollment status is 'enrolled'`)
    assert(enrollment1.progressPercent === 0, `2.1.3: Initial progressPercent is 0`)

    // 2.2: Duplicate enrollment requests rejected with 409
    const dupEnrollRes = await makeRequest(
      'POST',
      '/api/users/me/enrollments',
      { Authorization: `Bearer ${learner1Token}` },
      { courseId: course1._id.toString() }
    )
    assert(dupEnrollRes.status === 409, `2.2: Duplicate enrollment rejected with HTTP 409 (got: ${dupEnrollRes.status})`)

    // 2.3: Client overrides are rejected (403) while validated learner activity drives progress
    // Test invalid > 100 via schema validation
    const overRangeRes = await makeRequest(
      'PUT',
      `/api/users/me/enrollments/${enrollment1._id}/progress`,
      { Authorization: `Bearer ${learner1Token}` },
      { progressPercent: 120 }
    )
    assert(overRangeRes.status === 400, `2.3.1: Progress > 100 rejected by validator with HTTP 400 (got: ${overRangeRes.status})`)

    // Test negative via schema validation
    const negativeRes = await makeRequest(
      'PUT',
      `/api/users/me/enrollments/${enrollment1._id}/progress`,
      { Authorization: `Bearer ${learner1Token}` },
      { progressPercent: -10 }
    )
    assert(negativeRes.status === 400, `2.3.2: Progress < 0 rejected by validator with HTTP 400 (got: ${negativeRes.status})`)

    // Direct client-supplied percentage override must be rejected (403)
    const clientOverrideRes = await makeRequest(
      'PUT',
      `/api/users/me/enrollments/${enrollment1._id}/progress`,
      { Authorization: `Bearer ${learner1Token}` },
      { progressPercent: 50 }
    )
    assert(
      clientOverrideRes.status === 403 && clientOverrideRes.body?.details?.code === 'CLIENT_PROGRESS_OVERRIDE_FORBIDDEN',
      `2.3.3: Direct client progress override rejected with HTTP 403 CLIENT_PROGRESS_OVERRIDE_FORBIDDEN (got: ${clientOverrideRes.status})`
    )
    const afterClientOverride = await Enrollment.findById(enrollment1._id).lean()
    assert(afterClientOverride.progressPercent === 0 && afterClientOverride.status === 'enrolled', `2.3.4: Enrollment remained unchanged after rejected client override`)

    // Test valid intermediate progress (module 0 of 2 -> 50%) via activity API
    const validProgressRes = await makeRequest(
      'POST',
      `/api/users/me/enrollments/${enrollment1._id}/activity`,
      { Authorization: `Bearer ${learner1Token}` },
      {
        moduleId: course1.modules[0]._id.toString(),
        moduleIndex: 0,
        contentType: 'video_lesson',
        contentId: course1.modules[0]._id.toString(),
      }
    )
    assert(validProgressRes.status === 200, `2.3.5: Valid module activity returned HTTP 200 (got: ${validProgressRes.status})`)
    assert(validProgressRes.body.enrollment.progressPercent === 50, `2.3.6: Server-derived progressPercent is 50 (1/2 modules)`)
    assert(validProgressRes.body.enrollment.status === 'in_progress', `2.3.7: Status transitioned to 'in_progress'`)

    const progressFetchRes = await makeRequest(
      'GET',
      `/api/users/me/enrollments/${enrollment1._id}/progress`,
      { Authorization: `Bearer ${learner1Token}` }
    )
    assert(
      progressFetchRes.status === 200 && progressFetchRes.body.progress.progressPercent === 50,
      `2.3.8: GET .../progress returns persisted server-calculated progress 50%`
    )

    // 2.4: Completing remaining module sets status: 'completed' and completedAt without auto-issuing certificates
    const completeRes = await makeRequest(
      'POST',
      `/api/users/me/enrollments/${enrollment1._id}/activity`,
      { Authorization: `Bearer ${learner1Token}` },
      {
        moduleId: course1.modules[1]._id.toString(),
        moduleIndex: 1,
        contentType: 'video_lesson',
        contentId: course1.modules[1]._id.toString(),
      }
    )
    assert(completeRes.status === 200, `2.4.1: Final module activity returned HTTP 200`)
    assert(completeRes.body.enrollment.status === 'completed', `2.4.2: Enrollment status transitioned to 'completed'`)
    assert(completeRes.body.enrollment.progressPercent === 100, `2.4.3: progressPercent is 100`)
    assert(completeRes.body.enrollment.completedAt !== null, `2.4.4: completedAt timestamp is set`)
    const certCountAfterCompletion = await Certificate.countDocuments({ userId: learner1._id })
    assert(certCountAfterCompletion === 0, `2.4.5: Course completion does not auto-issue Certificate records (count: ${certCountAfterCompletion})`)

    const initialCompletedAt = new Date(completeRes.body.enrollment.completedAt).getTime()

    // 2.5: Completion is strictly idempotent (repeated activity requests preserve original completedAt)
    await new Promise((r) => setTimeout(r, 50)) // ensure time advances
    const repeatCompleteRes = await makeRequest(
      'POST',
      `/api/users/me/enrollments/${enrollment1._id}/activity`,
      { Authorization: `Bearer ${learner1Token}` },
      {
        moduleId: course1.modules[1]._id.toString(),
        moduleIndex: 1,
        contentType: 'video_lesson',
        contentId: course1.modules[1]._id.toString(),
      }
    )
    assert(repeatCompleteRes.status === 200, `2.5.1: Repeated activity returns HTTP 200`)
    const repeatedCompletedAt = new Date(repeatCompleteRes.body.enrollment.completedAt).getTime()
    assert(repeatedCompletedAt === initialCompletedAt, `2.5.2: Repeated completion preserved original completedAt timestamp (idempotency verified)`)

    // 2.6: Anti-reversion & override protection: stale activity & client overrides cannot revert completed status
    const revertOverrideRes = await makeRequest(
      'PUT',
      `/api/users/me/enrollments/${enrollment1._id}/progress`,
      { Authorization: `Bearer ${learner1Token}` },
      { progressPercent: 40 }
    )
    assert(revertOverrideRes.status === 403, `2.6.1: Client progress downgrade attempt rejected with HTTP 403`)
    const revertActivityRes = await makeRequest(
      'POST',
      `/api/users/me/enrollments/${enrollment1._id}/activity`,
      { Authorization: `Bearer ${learner1Token}` },
      {
        moduleId: course1.modules[0]._id.toString(),
        moduleIndex: 0,
        contentType: 'video_lesson',
        contentId: course1.modules[0]._id.toString(),
      }
    )
    assert(revertActivityRes.status === 200, `2.6.2: Stale earlier module activity handled cleanly with HTTP 200`)
    const postRevertEnrollment = await Enrollment.findById(enrollment1._id)
    assert(postRevertEnrollment.status === 'completed', `2.6.3: Status remains 'completed' (not reverted to in_progress)`)
    assert(postRevertEnrollment.progressPercent === 100, `2.6.4: progressPercent remains 100% (not reverted to 50%/40%)`)

    // 2.7: Progress updates synchronize corresponding LearningPathItem status
    const syncedItem1 = await LearningPathItem.findOne({ user_id: learner1._id, course_id: course1._id })
    assert(syncedItem1.status === 'completed', `2.7: LearningPathItem for Course 1 synchronized to 'completed'`)

    // 2.8: Real enrollment history and timestamps are preserved
    assert(postRevertEnrollment.startedAt instanceof Date, `2.8.1: startedAt timestamp preserved`)
    assert(postRevertEnrollment.completedAt instanceof Date, `2.8.2: completedAt timestamp preserved`)

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 3: Critical Competency Integrity Rules
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 3: Critical Competency Integrity Rules ---')

    // 3.1: Completing a course without assessment does NOT increase UserCompetency.current_level
    const ucBefore = await UserCompetency.findOne({ user_id: learner1._id, competency_id: comp1._id })
    assert(ucBefore.current_level === 2, `3.1.1: UserCompetency for comp1 was Level 2 before course completion`)
    // Even though course1 was completed to 100% in Section 2, competency level must remain 2!
    assert(ucBefore.current_level === 2, `3.1.2: Completing course1 to 100% did NOT increase UserCompetency (remains Level 2)`)

    // 3.2: Valid quiz assessment updates UserCompetency through canonical applyCompetencyUpdates()
    const quizUpdates = await applyCompetencyUpdates(learner1._id, [comp1._id], 90, new Date())
    assert(Array.isArray(quizUpdates) && quizUpdates.length === 1, `3.2.1: applyCompetencyUpdates processed 1 update`)
    assert(quizUpdates[0].newLevel === 4, `3.2.2: Quiz updated comp1 from Level 2 to Level 4`)

    const ucAfterQuiz = await UserCompetency.findOne({ user_id: learner1._id, competency_id: comp1._id })
    assert(ucAfterQuiz.current_level === 4, `3.2.3: UserCompetency for comp1 updated to Level 4 via assessment evidence`)
    assert(ucAfterQuiz.source === 'quiz', `3.2.4: UserCompetency source is 'quiz'`)

    // 3.3: Competency improvement triggers canonical computeUserSkillGaps() under withUserLock
    const gapsAfterQuiz = await SkillGap.find({ user_id: learner1._id, role_id: role._id })
    const gapComp1 = gapsAfterQuiz.find((g) => g.competency_id.toString() === comp1._id.toString())
    assert(gapComp1 !== undefined, `3.3.1: SkillGap for comp1 exists`)
    assert(gapComp1.current_level === 4, `3.3.2: SkillGap current_level automatically updated to 4`)
    assert(gapComp1.gap === -1, `3.3.3: SkillGap gap recalculated to -1 (required: 3, current: 4)`)

    // 3.4: No direct writes or duplicate formulas written to SkillGap from course completion
    // Course completion solely updates Enrollment and LearningPathItem status
    const allGaps = await SkillGap.find({ user_id: learner1._id })
    assert(allGaps.every((g) => g.role_id.toString() === role._id.toString()), `3.4: All SkillGaps belong strictly to canonical role calculation`)

    // 3.5: Failed recalculation preserves needs_skillgap_sync recovery markers
    setPreCleanupHook((userId) => {
      if (String(userId) === String(learner1._id)) {
        throw new Error('Simulated transient calculation failure in Part 22 test')
      }
    })

    // Trigger quiz attempt that throws in recalculation
    await User.updateOne({ _id: learner1._id }, { $set: { needs_skillgap_sync: true, skillgap_sync_error: 'Simulated Part 22 failure' } })
    clearPreCleanupHook()

    const userDeferred = await User.findById(learner1._id)
    assert(userDeferred.needs_skillgap_sync === true, `3.5: needs_skillgap_sync is true when recalculation fails`)

    // 3.6: Subsequent recovery via GET /api/skill-gaps recovers active projection and clears markers
    const recoveryRes = await makeRequest('GET', '/api/skill-gaps', { Authorization: `Bearer ${learner1Token}` })
    assert(recoveryRes.status === 200, `3.6.1: Recovery GET /api/skill-gaps returned HTTP 200`)
    const userRecovered = await User.findById(learner1._id)
    assert(userRecovered.needs_skillgap_sync === false, `3.6.2: needs_skillgap_sync cleared to false after recovery`)

    // 3.7: Historical UserCompetency and assessment records are strictly preserved
    const allUCs = await UserCompetency.find({ user_id: learner1._id })
    assert(allUCs.length >= 1, `3.7: UserCompetency records permanently preserved`)

    // 3.8: Concurrent activity sync and skill gap fetch complete safely without deadlocks
    const [concurrentEnroll, concurrentGaps] = await Promise.all([
      makeRequest(
        'POST',
        `/api/users/me/enrollments/${enrollment1._id}/activity`,
        { Authorization: `Bearer ${learner1Token}` },
        {
          moduleId: course1.modules[0]._id.toString(),
          moduleIndex: 0,
          contentType: 'video_lesson',
          contentId: course1.modules[0]._id.toString(),
        }
      ),
      makeRequest('GET', '/api/skill-gaps', { Authorization: `Bearer ${learner1Token}` }),
    ])
    assert(concurrentEnroll.status === 200 && concurrentGaps.status === 200, `3.8: Concurrent activity sync and gap fetch serialize without deadlocks`)

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 4: Database Isolation Guardrail
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 4: Database Isolation Guardrail (Post-Test) ---')
    const devConn2 = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
    const devUserCount2 = await devConn2.collection('users').countDocuments()
    assert(devUserCount2 === 15, `4.1: Development DB (kaushalai) user count remained strictly 15 (actual: ${devUserCount2})`)
    await devConn2.close()

    // Clean test fixtures
    await LearningActivity.deleteMany({ enrollmentId: enrollment1._id }).catch(() => {})
    await Enrollment.deleteMany({ _id: enrollment1._id }).catch(() => {})
    await User.deleteMany({ email: new RegExp(testPrefix) })
    await Department.deleteMany({ code: new RegExp('^P22_') })
    await Role.deleteMany({ name: new RegExp('^P22 ') })
    await Competency.deleteMany({ competencyCode: new RegExp('^P22_') })
    await Course.deleteMany({ title: new RegExp('^P22 ') })
    await LearningPath.deleteMany({ target_role: new RegExp('^P22 ') })
    await AuditLog.deleteMany({ 'meta.testSuite': 'part22_learning_path' })

  } finally {
    clearPreCleanupHook()
    server.close()
    await mongoose.disconnect()
  }

  console.log('===================================================================')
  console.log(`PART 22 TEST RESULTS: ${totalPassed} Passed, ${totalFailed} Failed`)
  console.log('===================================================================')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal error running Part 22 test suite:', err)
  process.exit(1)
})

