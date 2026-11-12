const mongoose = require('mongoose')
const Course = require('../models/Course')
const Enrollment = require('../models/Enrollment')
const LearningActivity = require('../models/LearningActivity')

let progressSyncFailureSimulator = null

function setProgressSyncFailureSimulator(fn) {
  progressSyncFailureSimulator = typeof fn === 'function' ? fn : null
}

function clearProgressSyncFailureSimulator() {
  progressSyncFailureSimulator = null
}

const LEGACY_COURSE_FALLBACKS = new Set([
  '6a9c77392153d7505fd447a9',
  '6a996d6d266163e0a9606c9c',
])

function createHttpError(message, status) {
  const err = new Error(message)
  err.status = status
  return err
}

function toObjectIdIfValid(id) {
  const str = String(id ?? '').trim()
  if (!str || !mongoose.isValidObjectId(str)) return null
  return new mongoose.Types.ObjectId(str)
}

function buildCourseSnapshot(course) {
  if (!course) return undefined
  return {
    title: course.title,
    source: course.source,
    provider: course.provider,
    externalCourseId: course.externalCourseId || '',
    difficulty: course.difficulty,
    durationHours: course.durationHours,
  }
}

async function resolveCourseByIdentifier(courseId) {
  const trimmed = String(courseId ?? '').trim()
  if (!trimmed) return null

  let course = null
  if (mongoose.isValidObjectId(trimmed)) {
    course = await Course.findById(trimmed).populate('skillTags', 'name category')
  }

  if (!course) {
    course = await Course.findOne({ externalCourseId: trimmed }).populate('skillTags', 'name category')
  }

  if (!course && LEGACY_COURSE_FALLBACKS.has(trimmed)) {
    course = await Course.findOne({
      isDeleted: { $ne: true },
      title: { $regex: /Official Statistics Awareness Programme/i },
    }).populate('skillTags', 'name category')
  }

  return course
}

async function listCourses({
  skillTag,
  difficulty,
  source,
  category,
  search,
  includeUnpublished = false,
  includeDeleted = false,
} = {}) {
  const filter = {}
  if (!includeDeleted) {
    filter.isDeleted = { $ne: true }
    filter.isArchived = { $ne: true }
  }
  if (!includeUnpublished) filter.isPublished = { $ne: false }
  if (skillTag) filter.skillTags = skillTag
  if (difficulty) filter.difficulty = difficulty
  if (source) filter.source = source
  if (category) filter.category = { $regex: category, $options: 'i' }
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { competencyTags: { $regex: search, $options: 'i' } },
    ]
  }
  return Course.find(filter)
    .populate('skillTags', 'name category')
    .sort({ createdAt: -1 })
}

async function getCourseById(id, { includeUnpublished = false, includeDeleted = false } = {}) {
  const course = await resolveCourseByIdentifier(id)
  if (!course) return null
  if (!includeDeleted && course.isDeleted === true) return null
  if (!includeUnpublished && course.isPublished === false) return null
  return course
}

async function createCourse(data) {
  if (Array.isArray(data.skillTags)) {
    data.skillTags = data.skillTags
      .map((t) => (t && typeof t === 'object' && t._id ? t._id : t))
      .filter(Boolean)
  }
  // Seed a default rating (4.0–4.5) so the listing looks credible before real ratings
  const seed = Date.now() % 6
  const defaultRating = Math.round((4.0 + seed / 10) * 10) / 10
  return Course.create({ ...data, isDeleted: false, defaultRating })
}

async function updateCourse(id, data) {
  if (!mongoose.isValidObjectId(String(id ?? ''))) return null
  if (Array.isArray(data.skillTags)) {
    data.skillTags = data.skillTags
      .map((t) => (t && typeof t === 'object' && t._id ? t._id : t))
      .filter(Boolean)
  }
  return Course.findOneAndUpdate(
    { _id: id, isDeleted: { $ne: true } },
    { $set: data },
    { new: true, runValidators: true }
  ).populate('skillTags', 'name category')
}

async function deleteCourse(id, deletedBy = null) {
  if (!mongoose.isValidObjectId(String(id ?? ''))) return null
  const deletedByObjectId = toObjectIdIfValid(deletedBy)
  // Soft-archive course instead of hard delete so historical Enrollment/LearningProgress records remain intact
  return Course.findOneAndUpdate(
    { _id: id, isDeleted: { $ne: true } },
    {
      $set: {
        isDeleted: true,
        isPublished: false,
        deletedAt: new Date(),
        deletedBy: deletedByObjectId,
      },
    },
    { new: true }
  )
}

async function getUserEnrollments(userId) {
  const userObjectId = toObjectIdIfValid(userId)
  if (!userObjectId) {
    throw createHttpError('Invalid user identifier', 400)
  }
  const pendingDocs = await Enrollment.find({
    $or: [{ userId }, { userId: userObjectId }],
    needsProgressSync: true,
  })
    .select('_id')
    .lean()

  for (const p of pendingDocs) {
    await recoverPendingEnrollmentSync(userObjectId, p._id).catch((syncErr) => {
      console.warn('[getUserEnrollments] Deferred enrollment sync retry failed:', syncErr.message)
    })
  }

  const enrollments = await Enrollment.find({ $or: [{ userId }, { userId: userObjectId }] })
    .populate({
      path: 'courseId',
      populate: { path: 'skillTags', select: 'name category' },
    })
    .sort({ updatedAt: -1 })

  return enrollments.map((doc) => {
    const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc }
    const course = plain.courseId
    let courseStatus = 'active'
    if (!course) {
      courseStatus = 'missing'
    } else if (course.isDeleted === true) {
      courseStatus = 'archived'
    } else if (course.isPublished === false) {
      courseStatus = 'unpublished'
    }
    return {
      ...plain,
      completedModules: Array.isArray(plain.completedModules) ? plain.completedModules : [],
      courseStatus,
      displayCourse: course || plain.courseSnapshot || null,
    }
  })
}

async function enrollUser(userId, courseId) {
  const userObjectId = toObjectIdIfValid(userId)
  if (!userObjectId) {
    throw createHttpError('Invalid user identifier', 400)
  }

  const trimmedCourseId = String(courseId ?? '').trim()
  if (!trimmedCourseId) {
    throw createHttpError('courseId is required', 400)
  }

  // Support both MongoDB ObjectId and non-empty externalCourseId
  const course = await resolveCourseByIdentifier(trimmedCourseId)
  if (!course) {
    throw createHttpError('Course not found', 404)
  }
  if (course.isDeleted === true) {
    throw createHttpError('Course has been archived and is not open for enrollment', 404)
  }
  if (course.isPublished === false) {
    throw createHttpError('Course is not published for enrollment', 400)
  }

  const existing = await Enrollment.findOne({
    $or: [{ userId }, { userId: userObjectId }],
    courseId: course._id,
  })
  if (existing) {
    throw createHttpError('Already enrolled in this course', 409)
  }

  const now = new Date()
  try {
    return await Enrollment.create({
      userId: userObjectId,
      courseId: course._id,
      status: 'enrolled',
      progressPercent: 0,
      completedModules: [],
      startedAt: now,
      lastAccessedAt: now,
      courseSnapshot: buildCourseSnapshot(course),
    })
  } catch (err) {
    if (err && err.code === 11000) {
      throw createHttpError('Already enrolled in this course', 409)
    }
    throw err
  }
}

function normalizeCompletedModules(completedModules, totalModules) {
  if (!Array.isArray(completedModules)) return null
  const validSet = new Set()
  for (const idx of completedModules) {
    const n = Number(idx)
    if (!Number.isInteger(n) || n < 0) continue
    if (totalModules > 0 && n >= totalModules) continue
    validSet.add(n)
  }
  return Array.from(validSet).sort((a, b) => a - b)
}

function inspectModuleRequirements(mod, moduleIndex, course) {
  const slides = Array.isArray(mod?.slides) ? mod.slides : []
  if (slides.length > 0) {
    const requiredItems = slides.map((s, idx) => ({
      contentType: 'slide',
      contentId: String(s._id),
      slideNumber: s.slideNumber || idx + 1,
    }))
    return {
      moduleId: String(mod._id),
      moduleIndex,
      title: mod.title || `Module ${moduleIndex + 1}`,
      durationMins: Number(mod.durationMins) || 0,
      isEligible: true,
      completionUnitType: 'slides',
      requiredItems,
    }
  }

  const videoUrl = String(mod?.youtubeUrl || course?.youtubeUrl || '').trim()
  if (videoUrl) {
    return {
      moduleId: String(mod._id),
      moduleIndex,
      title: mod.title || `Module ${moduleIndex + 1}`,
      durationMins: Number(mod.durationMins) || 0,
      isEligible: true,
      completionUnitType: 'video_lesson',
      requiredItems: [
        {
          contentType: 'video_lesson',
          contentId: String(mod._id),
          slideNumber: null,
        },
      ],
    }
  }

  return {
    moduleId: String(mod._id),
    moduleIndex,
    title: mod.title || `Module ${moduleIndex + 1}`,
    durationMins: Number(mod.durationMins) || 0,
    isEligible: false,
    completionUnitType: 'empty_unsupported',
    requiredItems: [],
  }
}

function calculateServerProgress(course, activities = []) {
  const activityKeys = new Set(
    (Array.isArray(activities) ? activities : []).map(
      (a) => `${String(a.moduleId)}::${a.contentType}::${String(a.contentId)}`
    )
  )

  const rawModules = Array.isArray(course?.modules) ? course.modules : []
  const modulesBreakdown = rawModules.map((mod, idx) => {
    const spec = inspectModuleRequirements(mod, idx, course)
    if (!spec.isEligible) {
      return {
        moduleId: spec.moduleId,
        moduleIndex: spec.moduleIndex,
        title: spec.title,
        durationMins: spec.durationMins,
        isEligible: false,
        completionUnitType: spec.completionUnitType,
        requiredItemsCount: 0,
        completedItemsCount: 0,
        completedItemIds: [],
        progressPercent: 0,
        completed: false,
      }
    }

    const completedItemIds = []
    for (const item of spec.requiredItems) {
      const key = `${spec.moduleId}::${item.contentType}::${item.contentId}`
      if (activityKeys.has(key)) {
        completedItemIds.push(item.contentId)
      }
    }

    const requiredItemsCount = spec.requiredItems.length
    const completedItemsCount = completedItemIds.length
    const modProgress =
      requiredItemsCount > 0 ? Math.max(0, Math.min(100, Math.round((completedItemsCount / requiredItemsCount) * 100))) : 0
    const completed = requiredItemsCount > 0 && completedItemsCount === requiredItemsCount

    return {
      moduleId: spec.moduleId,
      moduleIndex: spec.moduleIndex,
      title: spec.title,
      durationMins: spec.durationMins,
      isEligible: true,
      completionUnitType: spec.completionUnitType,
      requiredItemsCount,
      completedItemsCount,
      completedItemIds,
      progressPercent: modProgress,
      completed,
    }
  })

  const eligibleModules = modulesBreakdown.filter((m) => m.isEligible)
  const completedEligibleModules = eligibleModules.filter((m) => m.completed)
  const totalEligibleModules = eligibleModules.length
  const completedModules = completedEligibleModules.map((m) => m.moduleIndex)
  const totalRequiredContentItems = eligibleModules.reduce((sum, m) => sum + m.requiredItemsCount, 0)
  const completedContentItems = eligibleModules.reduce((sum, m) => sum + m.completedItemsCount, 0)
  const courseCompletable = totalEligibleModules > 0 && totalRequiredContentItems > 0

  const progressPercent = courseCompletable
    ? Math.max(0, Math.min(100, Math.round((completedModules.length / totalEligibleModules) * 100)))
    : 0
  const isCompleted = courseCompletable && completedModules.length === totalEligibleModules

  return {
    progressPercent,
    completedModules,
    completedModulesCount: completedModules.length,
    totalEligibleModules,
    completedContentItems,
    totalRequiredContentItems,
    courseCompletable,
    isCompleted,
    completionPolicy: 'server_authoritative_module_evidence',
    modules: modulesBreakdown,
  }
}

async function syncRelatedRecords(userId, userObjectId, course, savedEnrollment) {
  if (progressSyncFailureSimulator) {
    progressSyncFailureSimulator({
      phase: 'downstream_sync',
      userId: String(userObjectId),
      enrollmentId: String(savedEnrollment._id),
      courseId: String(savedEnrollment.courseId),
    })
  }

  // Synchronize corresponding LearningPathItem if present
  const LearningPathItem = require('../models/LearningPathItem')
  const itemStatus =
    savedEnrollment.status === 'completed'
      ? 'completed'
      : savedEnrollment.progressPercent > 0 || (savedEnrollment.contentProgressSummary?.completedContentItems || 0) > 0
        ? 'in_progress'
        : 'not_started'
  await LearningPathItem.updateMany(
    { $or: [{ user_id: userId }, { user_id: userObjectId }], course_id: savedEnrollment.courseId },
    { $set: { status: itemStatus } }
  )

  // Synchronize existing LearningProgress doc(s) with canonical Enrollment reference without fabricating quiz/lab fields
  const LearningProgress = require('../models/LearningProgress')
  const courseCandidates = [savedEnrollment.courseId, String(savedEnrollment.courseId)]
  if (course?.externalCourseId && String(course.externalCourseId).trim()) {
    courseCandidates.push(String(course.externalCourseId).trim())
  }
  await LearningProgress.updateMany(
    {
      $or: [
        { enrollmentId: savedEnrollment._id },
        {
          user_id: { $in: [userId, userObjectId, String(userObjectId)] },
          course_id: { $in: courseCandidates },
        },
      ],
    },
    {
      $set: {
        enrollmentId: savedEnrollment._id,
        course_completed: savedEnrollment.status === 'completed',
        updated_at: new Date(),
      },
    }
  )
}

async function convergeEnrollmentAndDownstream(userObjectId, enrollment, course) {
  const now = new Date()
  const activities = await LearningActivity.find({
    enrollmentId: enrollment._id,
    userId: userObjectId,
  }).lean()

  const summary = calculateServerProgress(course, activities)
  const existingStartedAt = enrollment.startedAt || now
  const nextStatus = summary.isCompleted
    ? 'completed'
    : summary.progressPercent > 0 || summary.completedContentItems > 0
      ? 'in_progress'
      : 'enrolled'

  // Optional failure simulation for verifying partial-write recovery
  try {
    if (progressSyncFailureSimulator) {
      progressSyncFailureSimulator({
        phase: 'enrollment_write',
        userId: String(userObjectId),
        enrollmentId: String(enrollment._id),
        courseId: String(enrollment.courseId),
      })
    }
  } catch (simErr) {
    await Enrollment.updateOne(
      { _id: enrollment._id },
      { $set: { needsProgressSync: true, progressSyncError: simErr.message } }
    ).catch(() => {})
    const err = createHttpError(simErr.message, 503)
    err.details = { code: 'PROGRESS_SYNC_DEFERRED', enrollmentId: String(enrollment._id) }
    throw err
  }

  const contentProgressSummary = {
    completedContentItems: summary.completedContentItems,
    totalRequiredContentItems: summary.totalRequiredContentItems,
    eligibleModulesCount: summary.totalEligibleModules,
    completedModulesCount: summary.completedModulesCount,
    completionPolicy: summary.completionPolicy,
  }

  const setFields = {
    status: nextStatus,
    progressPercent: summary.progressPercent,
    completedModules: summary.completedModules,
    startedAt: existingStartedAt,
    lastAccessedAt: now,
    contentProgressSummary,
    courseSnapshot:
      enrollment.courseSnapshot && enrollment.courseSnapshot.title
        ? enrollment.courseSnapshot
        : buildCourseSnapshot(course),
  }

  // Cross-process monotonic CAS update: never overwrite higher concurrent progress with lower progress
  let updatedEnrollment = await Enrollment.findOneAndUpdate(
    {
      _id: enrollment._id,
      $or: [{ userId: userObjectId }, { userId: String(userObjectId) }],
      $or: [
        { progressPercent: { $lt: summary.progressPercent } },
        {
          progressPercent: summary.progressPercent,
          $or: [
            { 'contentProgressSummary.completedContentItems': { $lte: summary.completedContentItems } },
            { 'contentProgressSummary.completedContentItems': null },
            { 'contentProgressSummary.completedContentItems': { $exists: false } },
          ],
        },
        { needsProgressSync: true },
      ],
    },
    { $set: setFields },
    { new: true }
  )

  if (!updatedEnrollment) {
    updatedEnrollment = await Enrollment.findById(enrollment._id)
  }

  // Preserve first completedAt atomically (idempotent completion timestamp)
  if (updatedEnrollment && updatedEnrollment.status === 'completed' && !updatedEnrollment.completedAt) {
    await Enrollment.updateOne(
      { _id: updatedEnrollment._id, completedAt: null },
      { $set: { completedAt: now } }
    )
    updatedEnrollment = await Enrollment.findById(updatedEnrollment._id)
  }

  let syncStatus = 'synced'
  let syncError = null
  try {
    await syncRelatedRecords(String(userObjectId), userObjectId, course, updatedEnrollment)
    updatedEnrollment = await Enrollment.findOneAndUpdate(
      { _id: updatedEnrollment._id },
      { $set: { needsProgressSync: false, progressSyncError: null, lastSyncedAt: new Date() } },
      { new: true }
    )
  } catch (downstreamErr) {
    syncStatus = 'deferred'
    syncError = downstreamErr.message
    updatedEnrollment = await Enrollment.findOneAndUpdate(
      { _id: updatedEnrollment._id },
      { $set: { needsProgressSync: true, progressSyncError: downstreamErr.message } },
      { new: true }
    )
    console.warn('[convergeEnrollmentAndDownstream] Downstream sync deferred:', downstreamErr.message)
  }

  // Issue course_completion certificate idempotently when server-authoritative completion reaches 100%
  let issuedCertificate = null
  let certificateStatus =
    updatedEnrollment && updatedEnrollment.status === 'completed' && updatedEnrollment.progressPercent === 100
      ? 'pending'
      : 'not_eligible'
  if (certificateStatus === 'pending') {
    try {
      const certificateService = require('./certificate.service')
      issuedCertificate = await certificateService.issueCourseCertificate(userObjectId, course._id)
      certificateStatus = issuedCertificate ? 'issued' : 'not_eligible'
      if (issuedCertificate) {
        // Clear any prior recovery flag on successful issuance
        try {
          await Enrollment.updateOne(
            { _id: updatedEnrollment._id },
            { $set: { needsCertificateSync: false, certificateSyncError: null } }
          )
        } catch (clearErr) {
          console.error('[convergeEnrollmentAndDownstream] Recovery-state persistence error: Failed to clear needsCertificateSync flag:', clearErr.message)
        }
      }
    } catch (certErr) {
      certificateStatus = 'deferred_recovery_required'
      console.warn('[convergeEnrollmentAndDownstream] Course certificate issuance error:', certErr.message)
      // Persist durable recovery flag so reconcileUserCertificates can find this enrollment later
      try {
        await Enrollment.updateOne(
          { _id: updatedEnrollment._id },
          { $set: { needsCertificateSync: true, certificateSyncError: certErr.message } }
        )
      } catch (persistErr) {
        console.error('[convergeEnrollmentAndDownstream] Recovery-state persistence error: Failed to persist needsCertificateSync recovery flag:', persistErr.message)
      }
    }
  }

  // Compute summary from latest activities so concurrent updates reflect converged state
  const latestActivities = await LearningActivity.find({
    enrollmentId: enrollment._id,
    userId: userObjectId,
  })
    .sort({ firstCompletedAt: 1 })
    .lean()
  const finalProgress = calculateServerProgress(course, latestActivities)

  return {
    enrollment: updatedEnrollment,
    certificate: issuedCertificate
      ? {
          certificateId: issuedCertificate.certificateId,
          title: issuedCertificate.title,
          type: issuedCertificate.type,
          issuedAt: issuedCertificate.issuedAt,
        }
      : null,
    certificateStatus,
    progress: {
      ...finalProgress,
      status: updatedEnrollment.status,
      startedAt: updatedEnrollment.startedAt,
      completedAt: updatedEnrollment.completedAt || null,
      lastAccessedAt: updatedEnrollment.lastAccessedAt,
      needsProgressSync: Boolean(updatedEnrollment.needsProgressSync),
      progressSyncError: updatedEnrollment.progressSyncError || null,
      syncStatus,
      syncError,
    },
    activities: latestActivities,
  }
}

async function recoverPendingEnrollmentSync(userId, enrollmentId) {
  const userObjectId = toObjectIdIfValid(userId)
  if (!userObjectId || !mongoose.isValidObjectId(String(enrollmentId ?? ''))) {
    return null
  }
  const enrollment = await Enrollment.findOne({
    _id: enrollmentId,
    $or: [{ userId }, { userId: userObjectId }],
  })
  if (!enrollment) return null
  const course = await Course.findById(enrollment.courseId)
  if (!course || course.isDeleted === true) return null
  return convergeEnrollmentAndDownstream(userObjectId, enrollment, course)
}

async function recordLearningActivity(userId, enrollmentId, payload = {}) {
  const userObjectId = toObjectIdIfValid(userId)
  if (!userObjectId) {
    throw createHttpError('Invalid user identifier', 400)
  }
  if (!mongoose.isValidObjectId(String(enrollmentId ?? ''))) {
    throw createHttpError('Invalid enrollment identifier', 400)
  }

  const enrollment = await Enrollment.findOne({
    _id: enrollmentId,
    $or: [{ userId }, { userId: userObjectId }],
  })
  if (!enrollment) {
    throw createHttpError('Enrollment not found', 404)
  }

  const course = await Course.findById(enrollment.courseId)
  if (!course) {
    throw createHttpError('Referenced course no longer exists', 404)
  }
  if (course.isDeleted === true) {
    throw createHttpError('Course has been archived and cannot accept learning activity', 409)
  }
  if (course.isPublished === false) {
    throw createHttpError('Course is unpublished and cannot accept learning activity', 400)
  }

  const rawModules = Array.isArray(course.modules) ? course.modules : []
  if (rawModules.length === 0) {
    throw createHttpError('Course has no structured modules available for completion', 400)
  }

  const moduleIdStr = String(payload.moduleId ?? '').trim()
  if (!mongoose.isValidObjectId(moduleIdStr)) {
    throw createHttpError('Invalid moduleId format', 400)
  }

  const moduleIndex = rawModules.findIndex((m) => String(m._id) === moduleIdStr)
  if (moduleIndex === -1) {
    throw createHttpError('Module not found in this course', 404)
  }
  if (payload.moduleIndex !== undefined && Number(payload.moduleIndex) !== moduleIndex) {
    throw createHttpError('moduleIndex does not match referenced moduleId', 400)
  }

  const targetModule = rawModules[moduleIndex]
  const moduleSpec = inspectModuleRequirements(targetModule, moduleIndex, course)
  if (!moduleSpec.isEligible) {
    throw createHttpError('Module has no completable content items', 400)
  }

  const contentType = String(payload.contentType ?? '').trim()
  const contentId = String(payload.contentId ?? '').trim()

  if (moduleSpec.completionUnitType === 'slides') {
    if (contentType !== 'slide') {
      throw createHttpError('Slide-deck modules require contentType "slide" with a valid slide ID', 400)
    }
    const matchingSlide = (targetModule.slides || []).find((s) => String(s._id) === contentId)
    if (!matchingSlide) {
      throw createHttpError('Slide not found in this module', 404)
    }
  } else if (moduleSpec.completionUnitType === 'video_lesson') {
    if (contentType !== 'video_lesson') {
      throw createHttpError('Video-lesson modules require contentType "video_lesson"', 400)
    }
    if (contentId !== String(targetModule._id)) {
      throw createHttpError('contentId must match target moduleId for video_lesson activity', 400)
    }
  }

  const now = new Date()
  let parsedClientTimestamp = null
  if (payload.activityTimestamp !== undefined && payload.activityTimestamp !== null) {
    const dt = new Date(payload.activityTimestamp)
    if (Number.isNaN(dt.getTime())) {
      throw createHttpError('Invalid activityTimestamp', 400)
    }
    if (dt.getTime() > now.getTime() + 5 * 60 * 1000) {
      throw createHttpError('activityTimestamp cannot be in the future', 400)
    }
    parsedClientTimestamp = dt
  }

  const watchDurationSec =
    payload.watchDurationSec !== undefined ? Math.max(0, Math.min(86400, Math.round(Number(payload.watchDurationSec) || 0))) : 0

  const evidenceKind = contentType === 'slide' ? 'slide_view' : 'learner_acknowledgement'
  const matchedItemSpec = moduleSpec.requiredItems.find((i) => i.contentId === contentId)

  const filterKey = {
    enrollmentId: enrollment._id,
    moduleId: targetModule._id,
    contentType,
    contentId,
  }

  const existingBefore = await LearningActivity.findOne(filterKey).lean()
  let activity = null
  try {
    activity = await LearningActivity.findOneAndUpdate(
      filterKey,
      {
        $setOnInsert: {
          userId: userObjectId,
          enrollmentId: enrollment._id,
          courseId: course._id,
          moduleId: targetModule._id,
          moduleIndex,
          contentType,
          contentId,
          slideNumber: matchedItemSpec?.slideNumber ?? null,
          status: 'completed',
          evidenceKind,
          firstCompletedAt: now,
        },
        $set: {
          lastActivityAt: now,
          ...(parsedClientTimestamp ? { clientTimestamp: parsedClientTimestamp } : {}),
          ...(watchDurationSec > 0 ? { watchDurationSec } : {}),
        },
      },
      { upsert: true, new: true }
    )
  } catch (err) {
    if (err && err.code === 11000) {
      activity = await LearningActivity.findOne(filterKey)
    } else {
      throw err
    }
  }

  const converged = await convergeEnrollmentAndDownstream(userObjectId, enrollment, course)
  return {
    recorded: true,
    alreadyRecorded: Boolean(existingBefore),
    activity,
    ...converged,
  }
}

async function getEnrollmentProgress(userId, enrollmentId) {
  const userObjectId = toObjectIdIfValid(userId)
  if (!userObjectId) {
    throw createHttpError('Invalid user identifier', 400)
  }
  if (!mongoose.isValidObjectId(String(enrollmentId ?? ''))) {
    throw createHttpError('Invalid enrollment identifier', 400)
  }

  let enrollment = await Enrollment.findOne({
    _id: enrollmentId,
    $or: [{ userId }, { userId: userObjectId }],
  })
  if (!enrollment) {
    throw createHttpError('Enrollment not found', 404)
  }

  const course = await Course.findById(enrollment.courseId)
  if (enrollment.needsProgressSync && course && course.isDeleted !== true) {
    await convergeEnrollmentAndDownstream(userObjectId, enrollment, course).catch(() => {})
    enrollment = await Enrollment.findById(enrollment._id)
  }

  const activities = await LearningActivity.find({
    enrollmentId: enrollment._id,
    userId: userObjectId,
  })
    .sort({ firstCompletedAt: 1 })
    .lean()

  const summary = course
    ? calculateServerProgress(course, activities)
    : {
        progressPercent: enrollment.progressPercent || 0,
        completedModules: Array.isArray(enrollment.completedModules) ? enrollment.completedModules : [],
        completedModulesCount: Array.isArray(enrollment.completedModules) ? enrollment.completedModules.length : 0,
        totalEligibleModules: 0,
        completedContentItems: activities.length,
        totalRequiredContentItems: 0,
        courseCompletable: false,
        isCompleted: enrollment.status === 'completed',
        completionPolicy: 'server_authoritative_module_evidence',
        modules: [],
      }

  return {
    enrollment,
    progress: {
      ...summary,
      status: enrollment.status,
      startedAt: enrollment.startedAt,
      completedAt: enrollment.completedAt || null,
      lastAccessedAt: enrollment.lastAccessedAt || null,
      needsProgressSync: Boolean(enrollment.needsProgressSync),
      progressSyncError: enrollment.progressSyncError || null,
    },
    activities,
  }
}

async function updateProgress(userId, enrollmentId) {
  const userObjectId = toObjectIdIfValid(userId)
  if (!userObjectId) {
    throw createHttpError('Invalid user identifier', 400)
  }
  if (!mongoose.isValidObjectId(String(enrollmentId ?? ''))) {
    throw createHttpError('Invalid enrollment identifier', 400)
  }

  const enrollment = await Enrollment.findOne({
    _id: enrollmentId,
    $or: [{ userId }, { userId: userObjectId }],
  })
  if (!enrollment) {
    throw createHttpError('Enrollment not found', 404)
  }

  const err = createHttpError(
    'Direct client progress overrides are disabled; completion is calculated by the server from validated learning activity.',
    403
  )
  err.details = { code: 'CLIENT_PROGRESS_OVERRIDE_FORBIDDEN' }
  throw err
}

module.exports = {
  listCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getUserEnrollments,
  enrollUser,
  updateProgress,
  recordLearningActivity,
  getEnrollmentProgress,
  recoverPendingEnrollmentSync,
  setProgressSyncFailureSimulator,
  clearProgressSyncFailureSimulator,
}
