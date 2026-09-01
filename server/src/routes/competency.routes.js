const { Router } = require('express')
const competencyController = require('../controllers/competency.controller')
const { authenticate, authorize } = require('../middleware/auth.middleware')
const validate = require('../middleware/validate')
const {
  competencySchema,
  jobRoleSchema,
  selfAssessSchema,
  setJobRoleSchema,
} = require('../validators/competency.validators')

const router = Router()

router.get('/competencies', authenticate, competencyController.listCompetencies)
router.post(
  '/competencies',
  authenticate,
  authorize('admin'),
  validate(competencySchema),
  competencyController.createCompetency
)

router.get('/job-roles', authenticate, competencyController.listJobRoles)
router.post(
  '/job-roles',
  authenticate,
  authorize('admin'),
  validate(jobRoleSchema),
  competencyController.createJobRole
)

router.get('/users/me/competencies', authenticate, competencyController.getMyCompetencies)
router.put(
  '/users/me/competencies/:competencyId',
  authenticate,
  validate(selfAssessSchema),
  competencyController.selfAssess
)
router.put(
  '/users/me/job-role',
  authenticate,
  validate(setJobRoleSchema),
  competencyController.setMyJobRole
)

module.exports = router
