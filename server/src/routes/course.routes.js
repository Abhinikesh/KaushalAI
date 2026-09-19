const { Router } = require('express')
const courseController = require('../controllers/course.controller')
const { authenticate, authorize } = require('../middleware/auth.middleware')
const validate = require('../middleware/validate')
const { courseSchema, courseUpdateSchema, enrollSchema, progressSchema } = require('../validators/course.validators')

const router = Router()

/* ── Public (authenticated) reads ─────────────────────── */
router.get('/courses', authenticate, courseController.listCourses)
router.get('/courses/:id', authenticate, courseController.getCourse)

/* ── Admin: create / update / delete ──────────────────── */
router.post(
  '/courses',
  authenticate,
  authorize('admin'),
  validate(courseSchema),
  courseController.createCourse
)

router.put(
  '/courses/:id',
  authenticate,
  authorize('admin'),
  validate(courseUpdateSchema),
  courseController.updateCourse
)

router.delete(
  '/courses/:id',
  authenticate,
  authorize('admin'),
  courseController.deleteCourse
)

/* ── Enrollments ───────────────────────────────────────── */
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
