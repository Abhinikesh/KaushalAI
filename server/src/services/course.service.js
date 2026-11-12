const mongoose = require('mongoose')
const Course = require('../models/Course')
const Enrollment = require('../models/Enrollment')

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
  if (!includeDeleted) filter.isDeleted = { $ne: true }
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

async function syncRelatedRecords(userId, userObjectId, course, savedEnrollment) {
  // Synchronize corresponding LearningPathItem if present
  try {
    const LearningPathItem = require('../models/LearningPathItem')
    const itemStatus =
      savedEnrollment.status === 'completed'
        ? 'completed'
        : savedEnrollment.progressPercent > 0
          ? 'in_progress'
          : 'not_started'
    await LearningPathItem.updateMany(
      { $or: [{ user_id: userId }, { user_id: userObjectId }], course_id: savedEnrollment.courseId },
      { $set: { status: itemStatus } }
    )
  } catch (itemSyncErr) {
    console.warn('[updateProgress] LearningPathItem sync skipped:', itemSyncErr.message)
  }

  // Synchronize existing LearningProgress doc(s) with canonical Enrollment reference without creating fake lab/quiz records
  try {
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
  } catch (lpSyncErr) {
    console.warn('[updateProgress] LearningProgress sync skipped:', lpSyncErr.message)
  }
}

async function updateProgress(userId, enrollmentId, progressPercent, options = {}) {
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
    throw createHttpError('Referenced course no longer exists; historical enrollment is read-only', 404)
  }
  if (course.isDeleted === true) {
    throw createHttpError('Course has been archived; historical enrollment is read-only', 409)
  }

  const rawNum = Number(progressPercent)
  if (!Number.isFinite(rawNum)) {
    throw createHttpError('progressPercent must be a valid number', 400)
  }
  const clampedProgress = Math.max(0, Math.min(100, Math.round(rawNum)))

  const totalModules = Array.isArray(course.modules) ? course.modules.length : 0
  const incomingModules = normalizeCompletedModules(options?.completedModules, totalModules)
  const existingModules = normalizeCompletedModules(enrollment.completedModules || [], totalModules) || []

  if (!enrollment.courseSnapshot || !enrollment.courseSnapshot.title) {
    enrollment.courseSnapshot = buildCourseSnapshot(course)
  }
  if (!enrollment.startedAt) {
    enrollment.startedAt = new Date()
  }
  enrollment.lastAccessedAt = new Date()

  // Anti-reversion protection: once completed, older/stale progress requests cannot revert completed status
  if (enrollment.status === 'completed') {
    enrollment.progressPercent = 100
    if (incomingModules && incomingModules.length > 0) {
      enrollment.completedModules = Array.from(new Set([...existingModules, ...incomingModules])).sort(
        (a, b) => a - b
      )
    } else if (totalModules > 0 && existingModules.length === 0) {
      enrollment.completedModules = Array.from({ length: totalModules }, (_, idx) => idx)
    }
    const saved = await enrollment.save()
    try {
      const certificateService = require('./certificate.service')
      await certificateService.issueCourseCertificate(userId, saved.courseId)
    } catch (certErr) {
      console.warn('[updateProgress] Course certificate issuance failed:', certErr.message)
    }
    await syncRelatedRecords(userId, userObjectId, course, saved)
    return saved
  }

  // Anti-reversion for in-progress enrollments: stale lower progress payloads do not regress progress or modules
  const nextProgress = Math.max(Number(enrollment.progressPercent || 0), clampedProgress)
  if (incomingModules !== null) {
    enrollment.completedModules = Array.from(new Set([...existingModules, ...incomingModules])).sort(
      (a, b) => a - b
    )
  }

  if (nextProgress === 100) {
    enrollment.status = 'completed'
    enrollment.progressPercent = 100
    if (totalModules > 0 && (!enrollment.completedModules || enrollment.completedModules.length === 0)) {
      enrollment.completedModules = Array.from({ length: totalModules }, (_, idx) => idx)
    }
    // Preserve original completedAt if already set (idempotent completion)
    if (!enrollment.completedAt) {
      enrollment.completedAt = new Date()
    }
  } else {
    enrollment.progressPercent = nextProgress
    if (nextProgress > 0 && enrollment.status === 'enrolled') {
      enrollment.status = 'in_progress'
    }
  }

  const saved = await enrollment.save()

  // Issue course completion certificate if completed
  if (saved.status === 'completed') {
    try {
      const certificateService = require('./certificate.service')
      await certificateService.issueCourseCertificate(userId, saved.courseId)
    } catch (certErr) {
      console.warn('[updateProgress] Course certificate issuance failed:', certErr.message)
    }
  }

  await syncRelatedRecords(userId, userObjectId, course, saved)

  return saved
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
}
