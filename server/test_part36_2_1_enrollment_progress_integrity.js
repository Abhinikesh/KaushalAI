'use strict'

/**
 * Phase 36.2.1 Verification Suite: Enrollment & Learning Progress Integrity
 *
 * Executes strictly against `mongodb://127.0.0.1:27017/kaushalai_test`.
 * Verifies `kaushalai` dev database counts remain identical before/after.
 */

const assert = require('assert')
const http = require('http')
const path = require('path')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')

require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'kaushalai_dev_access_secret_change_in_prod'
const LABS_WEBHOOK_SECRET =
  process.env.LABS_WEBHOOK_SECRET ||
  '02097ff73adcb64ee969157a570f206b4b0238f1090b5ea56ecbc5d2a1d5cf0053f4ac1bfe98380fc155d2fac2eeb5cacc06149e0b3205cb922c2500f9bcf18c'
const TEST_DB_URI = 'mongodb://127.0.0.1:27017/kaushalai_test'
const DEV_DB_URI = 'mongodb://127.0.0.1:27017/kaushalai'

const app = require('./src/app')
const {
  User,
  Course,
  Enrollment,
  LearningActivity,
  LearningProgress,
  LearningPath,
  LearningPathItem,
  Certificate,
} = require('./src/models')
const { reconcileEnrollmentAndLearningProgress } = require('./scripts/reconcile_enrollment_learning_progress')

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

function requestJson(port, { method = 'GET', path: reqPath, token = null, headers: extraHeaders = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const headers = { ...extraHeaders }
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
        res.on('data', (chunk) => {
          data += chunk
        })
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
    const cols = ['users', 'courses', 'enrollments', 'learning_progress', 'learning_paths', 'learning_path_items']
    const counts = {}
    for (const c of cols) {
      counts[c] = await conn.db.collection(c).countDocuments()
    }
    return counts
  } finally {
    await conn.close()
  }
}

async function runTests() {
  const devBefore = await getDevDbSnapshot()
  await mongoose.connect(TEST_DB_URI)
  await Enrollment.syncIndexes().catch(() => {})
  await LearningActivity.syncIndexes().catch(() => {})
  await LearningProgress.syncIndexes().catch(() => {})

  const runId = `p3621_${Date.now()}`
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port

  const createdIds = {
    users: [],
    courses: [],
    enrollments: [],
    learningProgress: [],
    learningPaths: [],
    learningPathItems: [],
  }

  let passed = 0
  let total = 0

  async function test(name, fn) {
    total += 1
    try {
      await fn()
      passed += 1
      console.log(`PASS [${total}]: ${name}`)
    } catch (err) {
      console.error(`FAIL [${total}]: ${name}\n`, err)
      throw err
    }
  }

  try {
    // Seed isolated test entities
    const learnerA = await User.create({
      name: 'P3621 Learner A',
      email: `${runId}_a@mospi.gov.in`,
      passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
      role: 'employee',
      employeeId: `EMP-${runId}-A`,
      isActive: true,
    })
    const learnerB = await User.create({
      name: 'P3621 Learner B',
      email: `${runId}_b@mospi.gov.in`,
      passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
      role: 'employee',
      employeeId: `EMP-${runId}-B`,
      isActive: true,
    })
    const adminUser = await User.create({
      name: 'P3621 Admin',
      email: `${runId}_admin@mospi.gov.in`,
      passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
      role: 'admin',
      employeeId: `ADM-${runId}`,
      isActive: true,
    })
    createdIds.users.push(learnerA._id, learnerB._id, adminUser._id)

    const tokenA = signToken(learnerA)
    const tokenB = signToken(learnerB)
    const tokenAdmin = signToken(adminUser)

    const courseActive = await Course.create({
      title: `P3621 Active Module Course ${runId}`,
      provider: 'iGOT Karmayogi',
      source: 'igot',
      difficulty: 'beginner',
      durationHours: 3,
      externalCourseId: '',
      isPublished: true,
      modules: [
        { title: 'Module 1: Overview', durationMins: 20, youtubeUrl: 'https://www.youtube.com/watch?v=p3621-active-1' },
        { title: 'Module 2: Methods', durationMins: 30, youtubeUrl: 'https://www.youtube.com/watch?v=p3621-active-2' },
        { title: 'Module 3: Practice', durationMins: 40, youtubeUrl: 'https://www.youtube.com/watch?v=p3621-active-3' },
      ],
    })
    const courseExternal = await Course.create({
      title: `P3621 External ID Course ${runId}`,
      provider: 'iGOT Karmayogi',
      source: 'igot',
      difficulty: 'intermediate',
      durationHours: 4,
      externalCourseId: `ext-${runId}`,
      isPublished: true,
      modules: [
        { title: 'Mod 1', durationMins: 15, youtubeUrl: 'https://www.youtube.com/watch?v=p3621-ext-1' },
        { title: 'Mod 2', durationMins: 25, youtubeUrl: 'https://www.youtube.com/watch?v=p3621-ext-2' },
      ],
    })
    const courseUnpublished = await Course.create({
      title: `P3621 Unpublished Course ${runId}`,
      provider: 'NSSTA',
      source: 'nssta',
      difficulty: 'advanced',
      durationHours: 2,
      externalCourseId: '',
      isPublished: false,
    })
    const courseSoftDeleted = await Course.create({
      title: `P3621 Pre-Archived Course ${runId}`,
      provider: 'MoSPI',
      source: 'mospi',
      difficulty: 'beginner',
      durationHours: 1,
      externalCourseId: '',
      isPublished: false,
      isDeleted: true,
      deletedAt: new Date(),
    })
    const courseConcurrent = await Course.create({
      title: `P3621 Concurrency Course ${runId}`,
      provider: 'iGOT Karmayogi',
      source: 'igot',
      difficulty: 'beginner',
      durationHours: 2,
      externalCourseId: `conc-${runId}`,
      isPublished: true,
    })
    createdIds.courses.push(
      courseActive._id,
      courseExternal._id,
      courseUnpublished._id,
      courseSoftDeleted._id,
      courseConcurrent._id
    )

    // Path item linked to courseActive for learnerA to test downstream sync
    const lpPath = await LearningPath.create({
      user_id: learnerA._id,
      target_role: 'Test Statistical Officer',
      status: 'active',
    })
    createdIds.learningPaths.push(lpPath._id)
    const lpPathItem = await LearningPathItem.create({
      learning_path_id: lpPath._id,
      user_id: learnerA._id,
      course_id: courseActive._id,
      sequence_order: 1,
      status: 'not_started',
    })
    createdIds.learningPathItems.push(lpPathItem._id)

    let primaryEnrollmentId = null
    let externalEnrollmentId = null

    await test('1. Successful enrollment by ObjectId & externalCourseId normalizes canonical IDs and snapshot', async () => {
      const r1 = await requestJson(port, {
        method: 'POST',
        path: '/api/users/me/enrollments',
        token: tokenA,
        body: { courseId: String(courseActive._id) },
      })
      assert.strictEqual(r1.status, 201)
      assert.strictEqual(String(r1.body.enrollment.userId), String(learnerA._id))
      assert.strictEqual(String(r1.body.enrollment.courseId), String(courseActive._id))
      assert.strictEqual(r1.body.enrollment.status, 'enrolled')
      assert.strictEqual(r1.body.enrollment.progressPercent, 0)
      assert.deepStrictEqual(r1.body.enrollment.completedModules, [])
      assert.ok(r1.body.enrollment.startedAt)
      assert.strictEqual(r1.body.enrollment.courseSnapshot.title, courseActive.title)
      primaryEnrollmentId = r1.body.enrollment._id
      createdIds.enrollments.push(new mongoose.Types.ObjectId(primaryEnrollmentId))

      const r2 = await requestJson(port, {
        method: 'POST',
        path: '/api/users/me/enrollments',
        token: tokenA,
        body: { courseId: courseExternal.externalCourseId },
      })
      assert.strictEqual(r2.status, 201)
      assert.strictEqual(String(r2.body.enrollment.courseId), String(courseExternal._id))
      assert.strictEqual(r2.body.enrollment.courseSnapshot.externalCourseId, courseExternal.externalCourseId)
      externalEnrollmentId = r2.body.enrollment._id
      createdIds.enrollments.push(new mongoose.Types.ObjectId(externalEnrollmentId))
    })

    await test('2. Duplicate enrollment returns HTTP 409 for both ObjectId and externalCourseId', async () => {
      const dup1 = await requestJson(port, {
        method: 'POST',
        path: '/api/users/me/enrollments',
        token: tokenA,
        body: { courseId: String(courseActive._id) },
      })
      assert.strictEqual(dup1.status, 409)

      const dup2 = await requestJson(port, {
        method: 'POST',
        path: '/api/users/me/enrollments',
        token: tokenA,
        body: { courseId: String(courseExternal._id) },
      })
      assert.strictEqual(dup2.status, 409)
    })

    await test('3. Invalid, nonexistent, soft-deleted, and unpublished course enrollments are rejected', async () => {
      const badBlank = await requestJson(port, {
        method: 'POST',
        path: '/api/users/me/enrollments',
        token: tokenA,
        body: { courseId: '   ' },
      })
      assert.strictEqual(badBlank.status, 400)

      const nonexistent = await requestJson(port, {
        method: 'POST',
        path: '/api/users/me/enrollments',
        token: tokenA,
        body: { courseId: String(new mongoose.Types.ObjectId()) },
      })
      assert.strictEqual(nonexistent.status, 404)

      const unpublished = await requestJson(port, {
        method: 'POST',
        path: '/api/users/me/enrollments',
        token: tokenA,
        body: { courseId: String(courseUnpublished._id) },
      })
      assert.strictEqual(unpublished.status, 400)

      const archived = await requestJson(port, {
        method: 'POST',
        path: '/api/users/me/enrollments',
        token: tokenA,
        body: { courseId: String(courseSoftDeleted._id) },
      })
      assert.strictEqual(archived.status, 404)
    })

    await test('4. Unauthenticated requests and extra userId spoofing payload are rejected', async () => {
      const unauth = await requestJson(port, {
        method: 'POST',
        path: '/api/users/me/enrollments',
        body: { courseId: String(courseActive._id) },
      })
      assert.strictEqual(unauth.status, 401)

      const spoofed = await requestJson(port, {
        method: 'POST',
        path: '/api/users/me/enrollments',
        token: tokenA,
        body: { courseId: String(courseActive._id), userId: String(learnerB._id) },
      })
      assert.strictEqual(spoofed.status, 400)
    })

    await test('5. Progress rejects client PUT overrides (403) and persists server-authoritative activity completions', async () => {
      const badHigh = await requestJson(port, {
        method: 'PUT',
        path: `/api/users/me/enrollments/${primaryEnrollmentId}/progress`,
        token: tokenA,
        body: { progressPercent: 120 },
      })
      assert.strictEqual(badHigh.status, 400)

      const badNeg = await requestJson(port, {
        method: 'PUT',
        path: `/api/users/me/enrollments/${primaryEnrollmentId}/progress`,
        token: tokenA,
        body: { progressPercent: -5 },
      })
      assert.strictEqual(badNeg.status, 400)

      const overrideRes = await requestJson(port, {
        method: 'PUT',
        path: `/api/users/me/enrollments/${primaryEnrollmentId}/progress`,
        token: tokenA,
        body: { progressPercent: 67, completedModules: [0, 2] },
      })
      assert.strictEqual(overrideRes.status, 403)

      const afterOverrideEnr = await Enrollment.findById(primaryEnrollmentId).lean()
      assert.strictEqual(afterOverrideEnr.progressPercent, 0)
      assert.deepStrictEqual(afterOverrideEnr.completedModules, [])

      // Record legitimate learner activity for module 0 and module 2
      const act0 = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${primaryEnrollmentId}/activity`,
        token: tokenA,
        body: {
          moduleId: String(courseActive.modules[0]._id),
          moduleIndex: 0,
          contentType: 'video_lesson',
          contentId: String(courseActive.modules[0]._id),
        },
      })
      assert.strictEqual(act0.status, 200)
      assert.strictEqual(act0.body.enrollment.status, 'in_progress')
      assert.strictEqual(act0.body.enrollment.progressPercent, 33)
      assert.deepStrictEqual(act0.body.enrollment.completedModules, [0])

      const act2 = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${primaryEnrollmentId}/activity`,
        token: tokenA,
        body: {
          moduleId: String(courseActive.modules[2]._id),
          moduleIndex: 2,
          contentType: 'video_lesson',
          contentId: String(courseActive.modules[2]._id),
        },
      })
      assert.strictEqual(act2.status, 200)
      assert.strictEqual(act2.body.enrollment.status, 'in_progress')
      assert.strictEqual(act2.body.enrollment.progressPercent, 67)
      assert.deepStrictEqual(act2.body.enrollment.completedModules, [0, 2])
    })

    await test('6. Reload retrieval preserves exact completedModules and timestamps', async () => {
      const getRes = await requestJson(port, {
        method: 'GET',
        path: '/api/users/me/enrollments',
        token: tokenA,
      })
      assert.strictEqual(getRes.status, 200)
      const match = getRes.body.enrollments.find((e) => String(e._id) === String(primaryEnrollmentId))
      assert.ok(match)
      assert.strictEqual(match.progressPercent, 67)
      assert.deepStrictEqual(match.completedModules, [0, 2])
      assert.strictEqual(match.courseStatus, 'active')
      assert.ok(match.startedAt)
      assert.ok(match.lastAccessedAt)

      const progRes = await requestJson(port, {
        method: 'GET',
        path: `/api/users/me/enrollments/${primaryEnrollmentId}/progress`,
        token: tokenA,
      })
      assert.strictEqual(progRes.status, 200)
      assert.strictEqual(progRes.body.progress.progressPercent, 67)
      assert.deepStrictEqual(progRes.body.progress.completedModules, [0, 2])
    })

    let firstCompletedAt = null
    let originalStartedAt = null

    await test('7. Duplicate/stale progress is anti-reversion & completion preserves startedAt/completedAt without auto-issuing certificates', async () => {
      // Client PUT downgrade override blocked (403)
      const staleOverride = await requestJson(port, {
        method: 'PUT',
        path: `/api/users/me/enrollments/${primaryEnrollmentId}/progress`,
        token: tokenA,
        body: { progressPercent: 33, completedModules: [0] },
      })
      assert.strictEqual(staleOverride.status, 403)

      // Repeat module 0 activity preserves accumulated 67% ([0, 2]) progress
      const stale = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${primaryEnrollmentId}/activity`,
        token: tokenA,
        body: {
          moduleId: String(courseActive.modules[0]._id),
          moduleIndex: 0,
          contentType: 'video_lesson',
          contentId: String(courseActive.modules[0]._id),
        },
      })
      assert.strictEqual(stale.status, 200)
      assert.strictEqual(stale.body.enrollment.progressPercent, 67)
      assert.deepStrictEqual(stale.body.enrollment.completedModules, [0, 2])

      // Complete final module 1 via validated activity API
      const complete = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${primaryEnrollmentId}/activity`,
        token: tokenA,
        body: {
          moduleId: String(courseActive.modules[1]._id),
          moduleIndex: 1,
          contentType: 'video_lesson',
          contentId: String(courseActive.modules[1]._id),
        },
      })
      assert.strictEqual(complete.status, 200)
      assert.strictEqual(complete.body.enrollment.status, 'completed')
      assert.strictEqual(complete.body.enrollment.progressPercent, 100)
      assert.deepStrictEqual(complete.body.enrollment.completedModules, [0, 1, 2])
      assert.ok(complete.body.enrollment.completedAt)
      firstCompletedAt = complete.body.enrollment.completedAt
      originalStartedAt = complete.body.enrollment.startedAt

      // Post-completion client override blocked (403) and enrollment stays completed
      const revertTry = await requestJson(port, {
        method: 'PUT',
        path: `/api/users/me/enrollments/${primaryEnrollmentId}/progress`,
        token: tokenA,
        body: { progressPercent: 40, completedModules: [0] },
      })
      assert.strictEqual(revertTry.status, 403)

      const persistedCompleted = await Enrollment.findById(primaryEnrollmentId).lean()
      assert.strictEqual(persistedCompleted.status, 'completed')
      assert.strictEqual(persistedCompleted.progressPercent, 100)
      assert.strictEqual(persistedCompleted.completedAt.toISOString(), new Date(firstCompletedAt).toISOString())
      assert.strictEqual(persistedCompleted.startedAt.toISOString(), new Date(originalStartedAt).toISOString())

      const updatedPathItem = await LearningPathItem.findById(lpPathItem._id).lean()
      assert.strictEqual(updatedPathItem.status, 'completed')

      const certCount = await Certificate.countDocuments({ userId: learnerA._id, type: 'course_completion' })
      assert.strictEqual(certCount, 1)
    })

    await test('8. LearningProgress & Virtual Labs webhook never forge course_completed or quiz_passed', async () => {
      // Learner B has NOT completed courseExternal (in fact not even enrolled in it)
      const webhookRes = await requestJson(port, {
        method: 'POST',
        path: '/api/labs/webhook/completion',
        headers: { 'X-Labs-Webhook-Secret': LABS_WEBHOOK_SECRET },
        body: {
          user_id: String(learnerB._id),
          course_id: courseExternal.externalCourseId,
          lab_id: 'nsso_survey_sampling',
          score: 92,
        },
      })
      assert.strictEqual(webhookRes.status, 200)

      const lpDoc = await LearningProgress.findOne({
        user_id: learnerB._id,
        course_id: courseExternal._id,
      }).lean()
      assert.ok(lpDoc, 'LearningProgress should normalize user_id and course_id to canonical ObjectIds')
      createdIds.learningProgress.push(lpDoc._id)
      assert.strictEqual(lpDoc.lab_completed, true)
      assert.strictEqual(lpDoc.lab_score, 92)
      assert.strictEqual(lpDoc.course_completed, false)
      assert.strictEqual(lpDoc.quiz_passed, false)
      assert.strictEqual(lpDoc.quiz_score, 0)

      // GET /api/labs/status/:courseId should resolve via both externalCourseId and ObjectId
      const statusByExt = await requestJson(port, {
        method: 'GET',
        path: `/api/labs/status/${courseExternal.externalCourseId}`,
        token: tokenB,
      })
      assert.strictEqual(statusByExt.status, 200)
      assert.strictEqual(statusByExt.body.lab_completed, true)
      assert.strictEqual(statusByExt.body.canonical_course_id, String(courseExternal._id))

      // Learner A's existing LearningProgress links and updates course_completed when Enrollment completes
      const lpA = await LearningProgress.create({
        user_id: learnerA._id,
        course_id: courseExternal._id,
        lab_unlocked: true,
        lab_completed: false,
      })
      createdIds.learningProgress.push(lpA._id)

      for (let idx = 0; idx < courseExternal.modules.length; idx += 1) {
        const mod = courseExternal.modules[idx]
        const completeExt = await requestJson(port, {
          method: 'POST',
          path: `/api/users/me/enrollments/${externalEnrollmentId}/activity`,
          token: tokenA,
          body: {
            moduleId: String(mod._id),
            moduleIndex: idx,
            contentType: 'video_lesson',
            contentId: String(mod._id),
          },
        })
        assert.strictEqual(completeExt.status, 200)
      }

      const lpARefreshed = await LearningProgress.findById(lpA._id).lean()
      assert.strictEqual(String(lpARefreshed.enrollmentId), String(externalEnrollmentId))
      assert.strictEqual(lpARefreshed.course_completed, true)
    })

    await test('9. Admin soft-delete preserves historical enrollments & blocks new progress/enrollment; legacy orphan safe', async () => {
      // Soft-delete courseExternal via admin DELETE /api/courses/:id
      const delRes = await requestJson(port, {
        method: 'DELETE',
        path: `/api/courses/${courseExternal._id}`,
        token: tokenAdmin,
      })
      assert.strictEqual(delRes.status, 200)

      const archivedCourse = await Course.findById(courseExternal._id).lean()
      assert.ok(archivedCourse, 'Course must be soft-archived, not hard-deleted')
      assert.strictEqual(archivedCourse.isDeleted, true)
      assert.strictEqual(archivedCourse.isPublished, false)
      assert.ok(archivedCourse.deletedAt)
      assert.strictEqual(String(archivedCourse.deletedBy), String(adminUser._id))

      // Learner catalog & detail hide archived course
      const getArchived = await requestJson(port, {
        method: 'GET',
        path: `/api/courses/${courseExternal._id}`,
        token: tokenA,
      })
      assert.strictEqual(getArchived.status, 404)

      // Activity submission on archived course enrollment is rejected cleanly (409)
      const mutArchived = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${externalEnrollmentId}/activity`,
        token: tokenA,
        body: {
          moduleId: String(courseExternal.modules[0]._id),
          moduleIndex: 0,
          contentType: 'video_lesson',
          contentId: String(courseExternal.modules[0]._id),
        },
      })
      assert.strictEqual(mutArchived.status, 409)

      // Create synthetic legacy orphan enrollment pointing to nonexistent Course ID
      const orphanEnr = await Enrollment.create({
        userId: learnerB._id,
        courseId: new mongoose.Types.ObjectId(),
        status: 'enrolled',
        progressPercent: 15,
        courseSnapshot: { title: 'Legacy Removed Course', source: 'igot' },
      })
      createdIds.enrollments.push(orphanEnr._id)

      const enrListB = await requestJson(port, {
        method: 'GET',
        path: '/api/users/me/enrollments',
        token: tokenB,
      })
      assert.strictEqual(enrListB.status, 200)
      const orphanItem = enrListB.body.enrollments.find((e) => String(e._id) === String(orphanEnr._id))
      assert.ok(orphanItem)
      assert.strictEqual(orphanItem.courseStatus, 'missing')
      assert.strictEqual(orphanItem.displayCourse.title, 'Legacy Removed Course')

      const mutOrphan = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${orphanEnr._id}/activity`,
        token: tokenB,
        body: {
          moduleId: String(new mongoose.Types.ObjectId()),
          moduleIndex: 0,
          contentType: 'video_lesson',
          contentId: String(new mongoose.Types.ObjectId()),
        },
      })
      assert.strictEqual(mutOrphan.status, 404)
    })

    await test('10. Cross-user isolation across enrollment GET, PUT override, POST activity, progress GET, and labs status', async () => {
      const crossPut = await requestJson(port, {
        method: 'PUT',
        path: `/api/users/me/enrollments/${primaryEnrollmentId}/progress`,
        token: tokenB,
        body: { progressPercent: 80 },
      })
      assert.strictEqual(crossPut.status, 404)

      const crossActivity = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${primaryEnrollmentId}/activity`,
        token: tokenB,
        body: {
          moduleId: String(courseActive.modules[0]._id),
          moduleIndex: 0,
          contentType: 'video_lesson',
          contentId: String(courseActive.modules[0]._id),
        },
      })
      assert.strictEqual(crossActivity.status, 404)

      const crossProgressGet = await requestJson(port, {
        method: 'GET',
        path: `/api/users/me/enrollments/${primaryEnrollmentId}/progress`,
        token: tokenB,
      })
      assert.strictEqual(crossProgressGet.status, 404)

      const enrListB = await requestJson(port, {
        method: 'GET',
        path: '/api/users/me/enrollments',
        token: tokenB,
      })
      assert.strictEqual(enrListB.status, 200)
      assert.ok(!enrListB.body.enrollments.some((e) => String(e._id) === String(primaryEnrollmentId)))

      const labsA = await requestJson(port, {
        method: 'GET',
        path: `/api/labs/status/${courseExternal.externalCourseId}`,
        token: tokenA,
      })
      assert.strictEqual(labsA.status, 200)
      assert.strictEqual(labsA.body.lab_completed, false)
    })

    await test('11. Historical startedAt & completedAt preserved on idempotent activity re-completion', async () => {
      const reComplete = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${primaryEnrollmentId}/activity`,
        token: tokenA,
        body: {
          moduleId: String(courseActive.modules[0]._id),
          moduleIndex: 0,
          contentType: 'video_lesson',
          contentId: String(courseActive.modules[0]._id),
        },
      })
      assert.strictEqual(reComplete.status, 200)
      assert.strictEqual(reComplete.body.enrollment.startedAt, originalStartedAt)
      assert.strictEqual(reComplete.body.enrollment.completedAt, firstCompletedAt)
    })

    await test('12. Concurrent enrollment requests enforce strict uniqueness (1x 201, 4x 409, zero 500s)', async () => {
      const attempts = Array.from({ length: 5 }, () =>
        requestJson(port, {
          method: 'POST',
          path: '/api/users/me/enrollments',
          token: tokenB,
          body: { courseId: String(courseConcurrent._id) },
        })
      )
      const results = await Promise.all(attempts)
      const statuses = results.map((r) => r.status).sort()
      assert.deepStrictEqual(statuses, [201, 409, 409, 409, 409])

      const dbMatches = await Enrollment.find({
        userId: learnerB._id,
        courseId: courseConcurrent._id,
      }).lean()
      assert.strictEqual(dbMatches.length, 1)
      createdIds.enrollments.push(dbMatches[0]._id)
    })

    await test('13. Dry-run reconciliation detects conflict without modifying kaushalai_test records', async () => {
      const conflictLp = await LearningProgress.create({
        user_id: learnerB._id,
        course_id: courseConcurrent._id,
        course_completed: true,
        lab_completed: true,
      })
      createdIds.learningProgress.push(conflictLp._id)

      const report = await reconcileEnrollmentAndLearningProgress({ apply: false })
      assert.strictEqual(report.summary.mode, 'dry-run')
      const finding = report.learningProgressFindings.find(
        (f) => String(f.learningProgressId) === String(conflictLp._id)
      )
      assert.ok(finding)
      assert.strictEqual(finding.action, 'conflict_manual_review')

      // Confirm conflict record and enrollment were NOT altered
      const unchangedEnr = await Enrollment.findOne({
        userId: learnerB._id,
        courseId: courseConcurrent._id,
      }).lean()
      assert.strictEqual(unchangedEnr.status, 'enrolled')
    })

    console.log(`\nALL PHASE 36.2.1 TESTS PASSED: ${passed}/${total}`)
  } finally {
    // Clean up test data cleanly
    await Certificate.deleteMany({ userId: { $in: createdIds.users } }).catch(() => {})
    await LearningActivity.deleteMany({ enrollmentId: { $in: createdIds.enrollments } }).catch(() => {})
    await Enrollment.deleteMany({ _id: { $in: createdIds.enrollments } }).catch(() => {})
    await LearningProgress.deleteMany({ _id: { $in: createdIds.learningProgress } }).catch(() => {})
    await LearningPathItem.deleteMany({ _id: { $in: createdIds.learningPathItems } }).catch(() => {})
    await LearningPath.deleteMany({ _id: { $in: createdIds.learningPaths } }).catch(() => {})
    await Course.deleteMany({ _id: { $in: createdIds.courses } }).catch(() => {})
    await User.deleteMany({ _id: { $in: createdIds.users } }).catch(() => {})

    await new Promise((resolve) => server.close(resolve))
    await mongoose.disconnect()

    const devAfter = await getDevDbSnapshot()
    assert.deepStrictEqual(devAfter, devBefore, 'kaushalai development DB must remain untouched!')
    console.log('Verified kaushalai dev DB snapshot unchanged:', JSON.stringify(devAfter))
  }
}

runTests().catch((err) => {
  console.error('Phase 36.2.1 Test Suite Failed:', err)
  process.exit(1)
})

