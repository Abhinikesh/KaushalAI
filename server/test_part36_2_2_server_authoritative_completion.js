'use strict'

/**
 * Phase 36.2.2 Verification Suite: Server-Authoritative Learning Completion
 *
 * Strictly executes against `mongodb://127.0.0.1:27017/kaushalai_test`.
 * Reads real course structures (#60 slide deck, #61 iGOT video, #1 metadata-only) read-only from `kaushalai`
 * and clones them into isolated `kaushalai_test` fixtures.
 * Never mutates `kaushalai`.
 */

const assert = require('assert')
const http = require('http')
const path = require('path')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')

require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'kaushalai_dev_access_secret_change_in_prod'
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
const {
  recoverPendingEnrollmentSync,
  setProgressSyncFailureSimulator,
  clearProgressSyncFailureSimulator,
} = require('./src/services/course.service')

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

async function getDevSnapshot() {
  const conn = await mongoose.createConnection(DEV_DB_URI).asPromise()
  try {
    const cols = [
      'users',
      'courses',
      'enrollments',
      'learning_progress',
      'certificates',
      'user_competencies',
      'skill_gaps',
      'learning_activities',
    ]
    const counts = {}
    for (const c of cols) {
      counts[c] = await conn.db.collection(c).countDocuments()
    }
    const templates = {
      nsstaCourse: await conn.db
        .collection('courses')
        .findOne({ _id: new mongoose.Types.ObjectId('6a996d6d266163e0a9606c9c') }),
      igotVideoCourse: await conn.db
        .collection('courses')
        .findOne({ _id: new mongoose.Types.ObjectId('6ab01da7b465324f4d5c9577') }),
      metadataCourse: await conn.db
        .collection('courses')
        .findOne({ _id: new mongoose.Types.ObjectId('6a996d6d266163e0a9606c61') }),
    }
    return { counts, templates }
  } finally {
    await conn.close()
  }
}

function stripCourseForTestClone(doc, { title, externalCourseId = '', isPublished = true, isDeleted = false }) {
  const clone = { ...doc }
  delete clone._id
  delete clone.createdAt
  delete clone.updatedAt
  clone.title = title
  clone.externalCourseId = externalCourseId
  clone.isPublished = isPublished
  clone.isDeleted = isDeleted
  if (Array.isArray(clone.modules)) {
    clone.modules = clone.modules.map((m) => ({
      title: m.title,
      durationMins: m.durationMins,
      youtubeUrl: m.youtubeUrl || '',
      slides: Array.isArray(m.slides)
        ? m.slides.map((s) => ({
            slideNumber: s.slideNumber,
            title: s.title,
            bulletPoints: s.bulletPoints || [],
            imageUrl: s.imageUrl || '',
            notes: s.notes || '',
          }))
        : [],
    }))
  }
  return clone
}

async function runTests() {
  const initialDev = await getDevSnapshot()
  const devBefore = initialDev.counts
  const { nsstaCourse, igotVideoCourse, metadataCourse } = initialDev.templates
  assert.ok(nsstaCourse && nsstaCourse.modules?.length === 5, 'Expected real NSSTA 5-module slide course in dev DB')
  assert.ok(igotVideoCourse && igotVideoCourse.modules?.length === 6, 'Expected real iGOT 6-module video course in dev DB')
  assert.ok(metadataCourse && (!metadataCourse.modules || metadataCourse.modules.length === 0), 'Expected real metadata-only course in dev DB')

  await mongoose.connect(TEST_DB_URI)
  await Enrollment.syncIndexes().catch(() => {})
  await LearningActivity.syncIndexes().catch(() => {})

  const runId = `p3622_${Date.now()}`
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port

  const created = {
    users: [],
    courses: [],
    enrollments: [],
    activities: [],
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
    const learnerA = await User.create({
      name: 'P3622 Learner A',
      email: `${runId}_a@mospi.gov.in`,
      passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
      role: 'employee',
      employeeId: `EMP-${runId}-A`,
      isActive: true,
    })
    const learnerB = await User.create({
      name: 'P3622 Learner B',
      email: `${runId}_b@mospi.gov.in`,
      passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
      role: 'employee',
      employeeId: `EMP-${runId}-B`,
      isActive: true,
    })
    const adminUser = await User.create({
      name: 'P3622 Admin',
      email: `${runId}_admin@mospi.gov.in`,
      passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
      role: 'admin',
      employeeId: `ADM-${runId}`,
      isActive: true,
    })
    created.users.push(learnerA._id, learnerB._id, adminUser._id)

    const tokenA = signToken(learnerA)
    const tokenB = signToken(learnerB)
    const tokenAdmin = signToken(adminUser)

    // Clone real DB course shapes into test DB
    const slideCourse = await Course.create(
      stripCourseForTestClone(nsstaCourse, {
        title: `P3622 Cloned NSSTA Slides ${runId}`,
      })
    )
    const videoCourse = await Course.create(
      stripCourseForTestClone(igotVideoCourse, {
        title: `P3622 Cloned iGOT Video ${runId}`,
        externalCourseId: `ext-vid-${runId}`,
      })
    )
    const emptyCourse = await Course.create(
      stripCourseForTestClone(metadataCourse, {
        title: `P3622 Cloned Metadata Only ${runId}`,
      })
    )
    const mixedEmptyModuleCourse = await Course.create({
      title: `P3622 Mixed Empty+Video Course ${runId}`,
      source: 'mospi',
      difficulty: 'beginner',
      isPublished: true,
      modules: [
        { title: 'Empty Module (No slides or video)', durationMins: 20, slides: [], youtubeUrl: '' },
        {
          title: 'Valid Video Module',
          durationMins: 30,
          slides: [],
          youtubeUrl: 'https://www.youtube.com/watch?v=KgCgpCIOkIs',
        },
      ],
    })
    const toArchiveCourse = await Course.create({
      title: `P3622 To Archive Course ${runId}`,
      source: 'igot',
      difficulty: 'beginner',
      isPublished: true,
      modules: [
        {
          title: 'Archive Module 1',
          durationMins: 15,
          youtubeUrl: 'https://www.youtube.com/watch?v=Vz8zcKawwEo',
          slides: [],
        },
      ],
    })
    const unpublishedCourse = await Course.create({
      title: `P3622 Unpublished Course ${runId}`,
      source: 'nssta',
      difficulty: 'beginner',
      isPublished: false,
      modules: [
        {
          title: 'Unpublished Module 1',
          durationMins: 15,
          youtubeUrl: 'https://www.youtube.com/watch?v=Vz8zcKawwEo',
          slides: [],
        },
      ],
    })

    created.courses.push(
      slideCourse._id,
      videoCourse._id,
      emptyCourse._id,
      mixedEmptyModuleCourse._id,
      toArchiveCourse._id,
      unpublishedCourse._id
    )

    // Enroll Learner A in slideCourse, videoCourse, emptyCourse, mixedEmptyModuleCourse, toArchiveCourse
    async function enroll(token, cId) {
      const res = await requestJson(port, {
        method: 'POST',
        path: '/api/users/me/enrollments',
        token,
        body: { courseId: String(cId) },
      })
      assert.strictEqual(res.status, 201)
      created.enrollments.push(new mongoose.Types.ObjectId(res.body.enrollment._id))
      return res.body.enrollment
    }

    const slideEnr = await enroll(tokenA, slideCourse._id)
    const videoEnr = await enroll(tokenA, videoCourse.externalCourseId)
    const emptyEnr = await enroll(tokenA, emptyCourse._id)
    const mixedEnr = await enroll(tokenA, mixedEmptyModuleCourse._id)
    const archiveEnr = await enroll(tokenA, toArchiveCourse._id)

    // Link LearningPathItem + LearningProgress for slideCourse to check downstream consistency
    const lp = await LearningPath.create({
      user_id: learnerA._id,
      target_role: 'P3622 Test Officer',
      status: 'active',
    })
    created.learningPaths.push(lp._id)
    const lpItem = await LearningPathItem.create({
      learning_path_id: lp._id,
      user_id: learnerA._id,
      course_id: slideCourse._id,
      sequence_order: 1,
      status: 'not_started',
    })
    created.learningPathItems.push(lpItem._id)
    const lpDoc = await LearningProgress.create({
      user_id: learnerA._id,
      course_id: slideCourse._id,
      lab_unlocked: true,
      lab_completed: false,
    })
    created.learningProgress.push(lpDoc._id)

    const mod0 = slideCourse.modules[0]
    const mod1 = slideCourse.modules[1]

    await test('1. Valid learner activity is persisted in learning_activities', async () => {
      const slide0 = mod0.slides[0]
      const res = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${slideEnr._id}/activity`,
        token: tokenA,
        body: {
          moduleId: String(mod0._id),
          moduleIndex: 0,
          contentType: 'slide',
          contentId: String(slide0._id),
        },
      })
      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.recorded, true)
      assert.strictEqual(res.body.alreadyRecorded, false)
      assert.strictEqual(res.body.activity.evidenceKind, 'slide_view')
      assert.strictEqual(String(res.body.activity.userId), String(learnerA._id))
      assert.strictEqual(String(res.body.activity.enrollmentId), String(slideEnr._id))
      created.activities.push(res.body.activity._id)

      const persisted = await LearningActivity.findById(res.body.activity._id).lean()
      assert.ok(persisted)
      assert.strictEqual(String(persisted.contentId), String(slide0._id))
    })

    await test('2. Invalid course ID is rejected', async () => {
      const badCourse = await requestJson(port, {
        method: 'POST',
        path: '/api/users/me/enrollments',
        token: tokenA,
        body: { courseId: String(new mongoose.Types.ObjectId()) },
      })
      assert.strictEqual(badCourse.status, 404)
    })

    await test('3. Invalid enrollment ID is rejected cleanly (400 / 404)', async () => {
      const malformed = await requestJson(port, {
        method: 'POST',
        path: '/api/users/me/enrollments/not-an-object-id/activity',
        token: tokenA,
        body: {
          moduleId: String(mod0._id),
          contentType: 'slide',
          contentId: String(mod0.slides[0]._id),
        },
      })
      assert.strictEqual(malformed.status, 400)

      const nonexistent = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${new mongoose.Types.ObjectId()}/activity`,
        token: tokenA,
        body: {
          moduleId: String(mod0._id),
          contentType: 'slide',
          contentId: String(mod0.slides[0]._id),
        },
      })
      assert.strictEqual(nonexistent.status, 404)
    })

    await test('4. Cross-user activity submission and progress read are rejected', async () => {
      const crossAct = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${slideEnr._id}/activity`,
        token: tokenB,
        body: {
          moduleId: String(mod0._id),
          contentType: 'slide',
          contentId: String(mod0.slides[1]._id),
        },
      })
      assert.strictEqual(crossAct.status, 404)

      const crossGet = await requestJson(port, {
        method: 'GET',
        path: `/api/users/me/enrollments/${slideEnr._id}/progress`,
        token: tokenB,
      })
      assert.strictEqual(crossGet.status, 404)
    })

    await test('5. Nonexistent module or mismatched moduleIndex is rejected', async () => {
      const badMod = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${slideEnr._id}/activity`,
        token: tokenA,
        body: {
          moduleId: String(new mongoose.Types.ObjectId()),
          contentType: 'slide',
          contentId: String(mod0.slides[0]._id),
        },
      })
      assert.strictEqual(badMod.status, 404)

      const wrongIdx = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${slideEnr._id}/activity`,
        token: tokenA,
        body: {
          moduleId: String(mod0._id),
          moduleIndex: 3,
          contentType: 'slide',
          contentId: String(mod0.slides[0]._id),
        },
      })
      assert.strictEqual(wrongIdx.status, 400)
    })

    await test('6. Nonexistent slide/lesson ID or cross-module slide ID is rejected', async () => {
      const fakeSlide = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${slideEnr._id}/activity`,
        token: tokenA,
        body: {
          moduleId: String(mod0._id),
          contentType: 'slide',
          contentId: String(new mongoose.Types.ObjectId()),
        },
      })
      assert.strictEqual(fakeSlide.status, 404)

      // Slide belonging to module 1 claimed under module 0 must fail
      const crossModuleSlide = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${slideEnr._id}/activity`,
        token: tokenA,
        body: {
          moduleId: String(mod0._id),
          contentType: 'slide',
          contentId: String(mod1.slides[0]._id),
        },
      })
      assert.strictEqual(crossModuleSlide.status, 404)

      // Claiming video_lesson on a slide-deck module must fail
      const wrongType = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${slideEnr._id}/activity`,
        token: tokenA,
        body: {
          moduleId: String(mod0._id),
          contentType: 'video_lesson',
          contentId: String(mod0._id),
        },
      })
      assert.strictEqual(wrongType.status, 400)
    })

    await test('7. Duplicate activity submission is idempotent and preserves firstCompletedAt', async () => {
      const beforeAct = await LearningActivity.findOne({
        enrollmentId: slideEnr._id,
        moduleId: mod0._id,
        contentId: String(mod0.slides[0]._id),
      }).lean()
      await new Promise((r) => setTimeout(r, 25))

      const dupRes = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${slideEnr._id}/activity`,
        token: tokenA,
        body: {
          moduleId: String(mod0._id),
          contentType: 'slide',
          contentId: String(mod0.slides[0]._id),
        },
      })
      assert.strictEqual(dupRes.status, 200)
      assert.strictEqual(dupRes.body.alreadyRecorded, true)
      assert.strictEqual(
        new Date(dupRes.body.activity.firstCompletedAt).getTime(),
        new Date(beforeAct.firstCompletedAt).getTime()
      )

      const count = await LearningActivity.countDocuments({
        enrollmentId: slideEnr._id,
        moduleId: mod0._id,
        contentId: String(mod0.slides[0]._id),
      })
      assert.strictEqual(count, 1)
    })

    await test('8 & 9. Partial module completion keeps module incomplete & computes partial progress accurately; completing final slide completes module 0 (20%)', async () => {
      // Complete slides 1..(len-2) of mod0 (leaving last slide unviewed)
      for (let i = 1; i < mod0.slides.length - 1; i++) {
        const res = await requestJson(port, {
          method: 'POST',
          path: `/api/users/me/enrollments/${slideEnr._id}/activity`,
          token: tokenA,
          body: {
            moduleId: String(mod0._id),
            contentType: 'slide',
            contentId: String(mod0.slides[i]._id),
          },
        })
        assert.strictEqual(res.status, 200)
        created.activities.push(res.body.activity._id)
      }

      const partialRes = await requestJson(port, {
        method: 'GET',
        path: `/api/users/me/enrollments/${slideEnr._id}/progress`,
        token: tokenA,
      })
      assert.strictEqual(partialRes.status, 200)
      assert.strictEqual(partialRes.body.enrollment.status, 'in_progress')
      assert.strictEqual(partialRes.body.progress.progressPercent, 0)
      assert.deepStrictEqual(partialRes.body.progress.completedModules, [])
      assert.strictEqual(partialRes.body.progress.completedContentItems, mod0.slides.length - 1)
      assert.strictEqual(partialRes.body.progress.modules[0].completed, false)
      assert.strictEqual(
        partialRes.body.progress.modules[0].progressPercent,
        Math.round(((mod0.slides.length - 1) / mod0.slides.length) * 100)
      )

      // Complete final slide of mod0 -> Module 0 completes, course progress becomes 1/5 = 20%
      const lastSlide = mod0.slides[mod0.slides.length - 1]
      const finalMod0Res = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${slideEnr._id}/activity`,
        token: tokenA,
        body: {
          moduleId: String(mod0._id),
          contentType: 'slide',
          contentId: String(lastSlide._id),
        },
      })
      assert.strictEqual(finalMod0Res.status, 200)
      created.activities.push(finalMod0Res.body.activity._id)
      assert.strictEqual(finalMod0Res.body.progress.modules[0].completed, true)
      assert.deepStrictEqual(finalMod0Res.body.progress.completedModules, [0])
      assert.strictEqual(finalMod0Res.body.progress.progressPercent, 20)
      assert.strictEqual(finalMod0Res.body.enrollment.progressPercent, 20)
    })

    await test('11 & 12 & 20. Client-supplied progressPercent: 100 and completedModules cannot complete course or trigger certificate issuance', async () => {
      const attempt100 = await requestJson(port, {
        method: 'PUT',
        path: `/api/users/me/enrollments/${slideEnr._id}/progress`,
        token: tokenA,
        body: { progressPercent: 100, completedModules: [0, 1, 2, 3, 4] },
      })
      assert.strictEqual(attempt100.status, 403)
      assert.strictEqual(attempt100.body.details?.code, 'CLIENT_PROGRESS_OVERRIDE_FORBIDDEN')

      const attemptEmptyCourse = await requestJson(port, {
        method: 'PUT',
        path: `/api/users/me/enrollments/${emptyEnr._id}/progress`,
        token: tokenA,
        body: { progressPercent: 100 },
      })
      assert.strictEqual(attemptEmptyCourse.status, 403)

      const slideDb = await Enrollment.findById(slideEnr._id).lean()
      assert.strictEqual(slideDb.progressPercent, 20)
      assert.strictEqual(slideDb.status, 'in_progress')

      const certCount = await Certificate.countDocuments({ userId: learnerA._id })
      assert.strictEqual(certCount, 0)
    })

    await test('10. Backend calculates full completion for both NSSTA 31-slide course and iGOT 6-module video course cleanly and issues course certificates', async () => {
      // Complete remaining 4 modules of slideCourse (modules 1..4)
      for (let mIdx = 1; mIdx < slideCourse.modules.length; mIdx++) {
        const m = slideCourse.modules[mIdx]
        for (const s of m.slides) {
          const r = await requestJson(port, {
            method: 'POST',
            path: `/api/users/me/enrollments/${slideEnr._id}/activity`,
            token: tokenA,
            body: { moduleId: String(m._id), contentType: 'slide', contentId: String(s._id) },
          })
          assert.strictEqual(r.status, 200)
          created.activities.push(r.body.activity._id)
        }
      }

      const slideFinal = await requestJson(port, {
        method: 'GET',
        path: `/api/users/me/enrollments/${slideEnr._id}/progress`,
        token: tokenA,
      })
      assert.strictEqual(slideFinal.status, 200)
      assert.strictEqual(slideFinal.body.enrollment.status, 'completed')
      assert.strictEqual(slideFinal.body.progress.progressPercent, 100)
      assert.deepStrictEqual(slideFinal.body.progress.completedModules, [0, 1, 2, 3, 4])
      assert.strictEqual(slideFinal.body.progress.completedContentItems, 31)
      assert.strictEqual(slideFinal.body.progress.totalRequiredContentItems, 31)

      // Complete all 6 video_lesson modules of cloned iGOT course (#61)
      for (let mIdx = 0; mIdx < videoCourse.modules.length; mIdx++) {
        const m = videoCourse.modules[mIdx]
        const r = await requestJson(port, {
          method: 'POST',
          path: `/api/users/me/enrollments/${videoEnr._id}/activity`,
          token: tokenA,
          body: {
            moduleId: String(m._id),
            contentType: 'video_lesson',
            contentId: String(m._id),
            watchDurationSec: 120,
          },
        })
        assert.strictEqual(r.status, 200)
        assert.strictEqual(r.body.activity.evidenceKind, 'learner_acknowledgement')
        created.activities.push(r.body.activity._id)
      }

      const vidFinal = await Enrollment.findById(videoEnr._id).lean()
      assert.strictEqual(vidFinal.status, 'completed')
      assert.strictEqual(vidFinal.progressPercent, 100)
      assert.deepStrictEqual(vidFinal.completedModules, [0, 1, 2, 3, 4, 5])

      // Verify course_completion certificates issued for both genuinely completed courses (Phase 36.2.5)
      const certCount = await Certificate.countDocuments({ userId: learnerA._id, type: 'course_completion' })
      assert.strictEqual(certCount, 2)
    })

    await test('13. Empty metadata-only course and empty modules cannot be completed', async () => {
      // Metadata-only course progress read shows courseCompletable: false
      const emptyProg = await requestJson(port, {
        method: 'GET',
        path: `/api/users/me/enrollments/${emptyEnr._id}/progress`,
        token: tokenA,
      })
      assert.strictEqual(emptyProg.status, 200)
      assert.strictEqual(emptyProg.body.progress.courseCompletable, false)
      assert.strictEqual(emptyProg.body.progress.progressPercent, 0)
      assert.strictEqual(emptyProg.body.enrollment.status, 'enrolled')

      // Submitting activity for an empty module inside mixedEmptyModuleCourse fails
      const emptyMod = mixedEmptyModuleCourse.modules[0]
      const rejectEmptyMod = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${mixedEnr._id}/activity`,
        token: tokenA,
        body: {
          moduleId: String(emptyMod._id),
          contentType: 'video_lesson',
          contentId: String(emptyMod._id),
        },
      })
      assert.strictEqual(rejectEmptyMod.status, 400)

      // Completing the sole eligible module completes only the eligible set (1/1 eligible, empty skipped)
      const validMod = mixedEmptyModuleCourse.modules[1]
      const okValidMod = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${mixedEnr._id}/activity`,
        token: tokenA,
        body: {
          moduleId: String(validMod._id),
          contentType: 'video_lesson',
          contentId: String(validMod._id),
        },
      })
      assert.strictEqual(okValidMod.status, 200)
      created.activities.push(okValidMod.body.activity._id)
      assert.strictEqual(okValidMod.body.progress.totalEligibleModules, 1)
      assert.deepStrictEqual(okValidMod.body.progress.completedModules, [1])
    })

    await test('14 & 21. Archived and unpublished courses reject completion activity; admin/learner authorization holds', async () => {
      // Learner cannot soft-delete course
      const learnerDel = await requestJson(port, {
        method: 'DELETE',
        path: `/api/courses/${toArchiveCourse._id}`,
        token: tokenA,
      })
      assert.strictEqual(learnerDel.status, 403)

      // Admin archives course
      const adminDel = await requestJson(port, {
        method: 'DELETE',
        path: `/api/courses/${toArchiveCourse._id}`,
        token: tokenAdmin,
      })
      assert.strictEqual(adminDel.status, 200)

      // Submitting activity to archived course rejects with 409
      const archAct = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${archiveEnr._id}/activity`,
        token: tokenA,
        body: {
          moduleId: String(toArchiveCourse.modules[0]._id),
          contentType: 'video_lesson',
          contentId: String(toArchiveCourse.modules[0]._id),
        },
      })
      assert.strictEqual(archAct.status, 409)

      // Direct unpublished enrollment rejected 400
      const unpubEnroll = await requestJson(port, {
        method: 'POST',
        path: '/api/users/me/enrollments',
        token: tokenA,
        body: { courseId: String(unpublishedCourse._id) },
      })
      assert.strictEqual(unpubEnroll.status, 400)
    })

    await test('15 & 16 & 17. Timestamps stable on repeat, reload restores persisted state, Enrollment & LearningProgress & LearningPathItem consistent', async () => {
      const beforeEnr = await Enrollment.findById(slideEnr._id).lean()
      await new Promise((r) => setTimeout(r, 25))

      const repeatAct = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${slideEnr._id}/activity`,
        token: tokenA,
        body: {
          moduleId: String(mod0._id),
          contentType: 'slide',
          contentId: String(mod0.slides[0]._id),
        },
      })
      assert.strictEqual(repeatAct.status, 200)
      assert.strictEqual(
        new Date(repeatAct.body.enrollment.startedAt).getTime(),
        new Date(beforeEnr.startedAt).getTime()
      )
      assert.strictEqual(
        new Date(repeatAct.body.enrollment.completedAt).getTime(),
        new Date(beforeEnr.completedAt).getTime()
      )

      const reloadGet = await requestJson(port, {
        method: 'GET',
        path: `/api/users/me/enrollments/${slideEnr._id}/progress`,
        token: tokenA,
      })
      assert.strictEqual(reloadGet.status, 200)
      assert.strictEqual(reloadGet.body.activities.length, 31)
      assert.strictEqual(reloadGet.body.progress.progressPercent, 100)

      const pathItemUpdated = await LearningPathItem.findById(lpItem._id).lean()
      assert.strictEqual(pathItemUpdated.status, 'completed')

      const lpUpdated = await LearningProgress.findById(lpDoc._id).lean()
      assert.strictEqual(String(lpUpdated.enrollmentId), String(slideEnr._id))
      assert.strictEqual(lpUpdated.course_completed, true)
      assert.strictEqual(lpUpdated.quiz_passed, false)
    })

    await test('18. Partial synchronization failures are surfaced and recover cleanly', async () => {
      // Create a fresh video enrollment for Learner B to test partial sync recovery
      const enrB = await enroll(tokenB, videoCourse._id)
      const vidMod0 = videoCourse.modules[0]

      // Phase A: simulate downstream_sync failure after Enrollment updates
      setProgressSyncFailureSimulator(({ phase }) => {
        if (phase === 'downstream_sync') {
          throw new Error('Simulated downstream LearningPathItem sync outage')
        }
      })

      const resDegraded = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${enrB._id}/activity`,
        token: tokenB,
        body: {
          moduleId: String(vidMod0._id),
          contentType: 'video_lesson',
          contentId: String(vidMod0._id),
        },
      })
      clearProgressSyncFailureSimulator()

      assert.strictEqual(resDegraded.status, 200)
      created.activities.push(resDegraded.body.activity._id)
      assert.strictEqual(resDegraded.body.progress.syncStatus, 'deferred')
      assert.strictEqual(resDegraded.body.progress.needsProgressSync, true)
      assert.ok(resDegraded.body.progress.progressSyncError.includes('Simulated downstream'))

      // Reload GET /progress heals deferred sync automatically
      const healedRes = await requestJson(port, {
        method: 'GET',
        path: `/api/users/me/enrollments/${enrB._id}/progress`,
        token: tokenB,
      })
      assert.strictEqual(healedRes.status, 200)
      assert.strictEqual(healedRes.body.progress.needsProgressSync, false)
      assert.strictEqual(healedRes.body.progress.progressSyncError, null)

      // Phase B: simulate enrollment_write failure right after LearningActivity write
      const vidMod1 = videoCourse.modules[1]
      setProgressSyncFailureSimulator(({ phase }) => {
        if (phase === 'enrollment_write') {
          throw new Error('Simulated enrollment write failure')
        }
      })
      const failWriteRes = await requestJson(port, {
        method: 'POST',
        path: `/api/users/me/enrollments/${enrB._id}/activity`,
        token: tokenB,
        body: {
          moduleId: String(vidMod1._id),
          contentType: 'video_lesson',
          contentId: String(vidMod1._id),
        },
      })
      clearProgressSyncFailureSimulator()
      assert.strictEqual(failWriteRes.status, 503)

      const dirtyEnr = await Enrollment.findById(enrB._id).lean()
      assert.strictEqual(dirtyEnr.needsProgressSync, true)

      const recovered = await recoverPendingEnrollmentSync(learnerB._id, enrB._id)
      assert.strictEqual(recovered.enrollment.needsProgressSync, false)
      assert.strictEqual(recovered.enrollment.progressPercent, 33) // 2 of 6 modules
      assert.deepStrictEqual(recovered.enrollment.completedModules, [0, 1])

      const actsForB = await LearningActivity.find({ enrollmentId: enrB._id }).select('_id').lean()
      actsForB.forEach((a) => created.activities.push(a._id))
    })

    await test('19. Concurrent slide completions and concurrent duplicate requests never corrupt state', async () => {
      const concSlideEnr = await enroll(tokenB, slideCourse._id)

      // Fire all 7 slides of Module 0 concurrently + 4 extra duplicates of slide 0
      const mod0Requests = mod0.slides.map((s) =>
        requestJson(port, {
          method: 'POST',
          path: `/api/users/me/enrollments/${concSlideEnr._id}/activity`,
          token: tokenB,
          body: { moduleId: String(mod0._id), contentType: 'slide', contentId: String(s._id) },
        })
      )
      const duplicateFlood = Array.from({ length: 4 }, () =>
        requestJson(port, {
          method: 'POST',
          path: `/api/users/me/enrollments/${concSlideEnr._id}/activity`,
          token: tokenB,
          body: {
            moduleId: String(mod0._id),
            contentType: 'slide',
            contentId: String(mod0.slides[0]._id),
          },
        })
      )

      const allRes = await Promise.all([...mod0Requests, ...duplicateFlood])
      assert.ok(allRes.every((r) => r.status === 200))

      const persistedActs = await LearningActivity.find({ enrollmentId: concSlideEnr._id }).lean()
      assert.strictEqual(persistedActs.length, mod0.slides.length)
      persistedActs.forEach((a) => created.activities.push(a._id))

      const converged = await requestJson(port, {
        method: 'GET',
        path: `/api/users/me/enrollments/${concSlideEnr._id}/progress`,
        token: tokenB,
      })
      assert.strictEqual(converged.status, 200)
      assert.strictEqual(converged.body.progress.progressPercent, 20)
      assert.deepStrictEqual(converged.body.progress.completedModules, [0])
    })

    await test('22. Phase 36.2.1 core enrollment uniqueness under concurrency remains intact', async () => {
      const attempts = Array.from({ length: 5 }, () =>
        requestJson(port, {
          method: 'POST',
          path: '/api/users/me/enrollments',
          token: tokenB,
          body: { courseId: String(mixedEmptyModuleCourse._id) },
        })
      )
      const results = await Promise.all(attempts)
      assert.deepStrictEqual(results.map((r) => r.status).sort(), [201, 409, 409, 409, 409])
      const enrB = await Enrollment.findOne({ userId: learnerB._id, courseId: mixedEmptyModuleCourse._id }).lean()
      created.enrollments.push(enrB._id)
    })

    console.log(`\nALL PHASE 36.2.2 TESTS PASSED: ${passed}/${total}`)
  } finally {
    clearProgressSyncFailureSimulator()
    await Certificate.deleteMany({ userId: { $in: created.users } }).catch(() => {})
    await LearningActivity.deleteMany({ _id: { $in: created.activities } }).catch(() => {})
    await LearningActivity.deleteMany({ enrollmentId: { $in: created.enrollments } }).catch(() => {})
    await Enrollment.deleteMany({ _id: { $in: created.enrollments } }).catch(() => {})
    await LearningProgress.deleteMany({ _id: { $in: created.learningProgress } }).catch(() => {})
    await LearningPathItem.deleteMany({ _id: { $in: created.learningPathItems } }).catch(() => {})
    await LearningPath.deleteMany({ _id: { $in: created.learningPaths } }).catch(() => {})
    await Course.deleteMany({ _id: { $in: created.courses } }).catch(() => {})
    await User.deleteMany({ _id: { $in: created.users } }).catch(() => {})

    await new Promise((resolve) => server.close(resolve))
    await mongoose.disconnect()

    const { counts: devAfter } = await getDevSnapshot()
    assert.deepStrictEqual(devAfter, devBefore, 'kaushalai dev DB must remain completely unchanged!')
    console.log('Verified kaushalai dev DB counts unchanged:', JSON.stringify(devAfter))
  }
}

runTests().catch((err) => {
  console.error('Phase 36.2.2 Suite Failed:', err)
  process.exit(1)
})

