const { Router } = require('express')
const courseController = require('../controllers/course.controller')
const { authenticate, authorize } = require('../middleware/auth.middleware')
const validate = require('../middleware/validate')
const { courseSchema, enrollSchema, progressSchema } = require('../validators/course.validators')

const router = Router()

router.get('/courses', authenticate, courseController.listCourses)
router.get('/courses/:id', authenticate, courseController.getCourse)
router.post(
  '/courses',
  authenticate,
  authorize('admin'),
  validate(courseSchema),
  courseController.createCourse
)

router.get('/users/me/enrollments', authenticate, courseController.getMyEnrollments)
router.post(
  '/users/me/enrollments',
  authenticate,
  validate(enrollSchema),
  courseController.enrollSelf
)
router.put(
  '/users/me/enrollments/:id/progress',
  authenticate,
  validate(progressSchema),
  courseController.updateProgress
)

module.exports = router
