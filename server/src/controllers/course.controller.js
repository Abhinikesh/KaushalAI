const courseService = require('../services/course.service')

async function listCourses(req, res, next) {
  try {
    const { skillTag, difficulty, source, category, search } = req.query
    const courses = await courseService.listCourses({ skillTag, difficulty, source, category, search })
    res.json({ courses })
  } catch (err) {
    next(err)
  }
}

async function getCourse(req, res, next) {
  try {
    const course = await courseService.getCourseById(req.params.id)
    if (!course) return res.status(404).json({ message: 'Course not found' })
    res.json(course)
  } catch (err) {
    next(err)
  }
}

async function createCourse(req, res, next) {
  try {
    const course = await courseService.createCourse({ ...req.body, createdBy: req.user.id })
    res.status(201).json({ course })
  } catch (err) {
    next(err)
  }
}

async function updateCourse(req, res, next) {
  try {
    const course = await courseService.updateCourse(req.params.id, req.body)
    if (!course) return res.status(404).json({ message: 'Course not found' })
    res.json({ course })
  } catch (err) {
    next(err)
  }
}

async function deleteCourse(req, res, next) {
  try {
    const result = await courseService.deleteCourse(req.params.id)
    if (!result) return res.status(404).json({ message: 'Course not found' })
    res.json({ message: 'Course deleted successfully' })
  } catch (err) {
    next(err)
  }
}

async function getMyEnrollments(req, res, next) {
  try {
    const enrollments = await courseService.getUserEnrollments(req.user.id)
    res.json({ enrollments })
  } catch (err) {
    next(err)
  }
}

async function enrollSelf(req, res, next) {
  try {
    const enrollment = await courseService.enrollUser(req.user.id, req.body.courseId)
    res.status(201).json({ enrollment })
  } catch (err) {
    next(err)
  }
}

async function updateProgress(req, res, next) {
  try {
    const enrollment = await courseService.updateProgress(
      req.user.id,
      req.params.id,
      req.body.progressPercent
    )
    res.json({ enrollment })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  getMyEnrollments,
  enrollSelf,
  updateProgress,
}
