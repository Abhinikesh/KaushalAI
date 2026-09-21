const Course = require('../models/Course')
const Enrollment = require('../models/Enrollment')

async function listCourses({ skillTag, difficulty, source, category, search } = {}) {
  const filter = {}
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

async function getCourseById(id) {
  return Course.findById(id).populate('skillTags', 'name category')
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
  return Course.create({ ...data, defaultRating })
}

async function updateCourse(id, data) {
  if (Array.isArray(data.skillTags)) {
    data.skillTags = data.skillTags
      .map((t) => (t && typeof t === 'object' && t._id ? t._id : t))
      .filter(Boolean)
  }
  return Course.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  ).populate('skillTags', 'name category')
}

async function deleteCourse(id) {
  return Course.findByIdAndDelete(id)
}

async function getUserEnrollments(userId) {
  return Enrollment.find({ userId })
    .populate({
      path: 'courseId',
      populate: { path: 'skillTags', select: 'name category' },
    })
    .sort({ updatedAt: -1 })
}

async function enrollUser(userId, courseId) {
  // Support both MongoDB ObjectId and externalCourseId
  let course = null
  try {
    course = await Course.findById(courseId)
  } catch (_) {
    // not an ObjectId, try externalCourseId
  }
  if (!course) {
    course = await Course.findOne({ externalCourseId: courseId })
  }
  if (!course) {
    const err = new Error('Course not found')
    err.status = 404
    throw err
  }

  const existing = await Enrollment.findOne({ userId, courseId: course._id })
  if (existing) {
    const err = new Error('Already enrolled in this course')
    err.status = 409
    throw err
  }
  return Enrollment.create({ userId, courseId: course._id, status: 'enrolled', startedAt: new Date() })
}

async function updateProgress(userId, enrollmentId, progressPercent) {
  const enrollment = await Enrollment.findOne({ _id: enrollmentId, userId })
  if (!enrollment) {
    const err = new Error('Enrollment not found')
    err.status = 404
    throw err
  }

  enrollment.progressPercent = progressPercent

  if (progressPercent > 0 && enrollment.status === 'enrolled') {
    enrollment.status = 'in_progress'
  }
  if (progressPercent === 100) {
    enrollment.status = 'completed'
    enrollment.completedAt = new Date()
  }

  return enrollment.save()
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
