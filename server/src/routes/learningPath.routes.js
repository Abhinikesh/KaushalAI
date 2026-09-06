const { Router } = require('express')
const { getLearningPath } = require('../controllers/learningPath.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { requireOnboardingCompleted } = require('../middleware/onboardingGuard')

const router = Router()

router.get('/users/me/learning-path', authenticate, requireOnboardingCompleted, getLearningPath)

module.exports = router
