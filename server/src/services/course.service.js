const Course = require('../models/Course')
const Enrollment = require('../models/Enrollment')

async function listCourses({ skillTag, difficulty, source } = {}) {
  const filter = {}
  if (skillTag) filter.skillTags = skillTag
  if (difficulty) filter.difficulty = difficulty
  if (source) filter.source = source
  return Course.find(filter)
    .populate('skillTags', 'name category')
    .sort({ createdAt: -1 })
}

async function createCourse(data) {
  return Course.create(data)
}

async function getUserEnrollments(userId) {
  return Enrollment.find({ userId })
    .populate({ path: 'courseId', populate: { path: 'skillTags', select: 'name category' } })
    .sort({ updatedAt: -1 })
}

async function enrollUser(userId, courseId) {
  const existing = await Enrollment.findOne({ userId, courseId })
  if (existing) {
    const err = new Error('Already enrolled in this course')
    err.status = 409
    throw err
  }
  const courseExists = await Course.exists({ _id: courseId })
  if (!courseExists) {
    const err = new Error('Course not found')
    err.status = 404
    throw err
  }
  return Enrollment.create({ userId, courseId, status: 'enrolled', startedAt: new Date() })
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

async function getCourseById(id) {
  return Course.findById(id).populate('skillTags', 'name category')
}

module.exports = { listCourses, createCourse, getUserEnrollments, enrollUser, updateProgress, getCourseById }
