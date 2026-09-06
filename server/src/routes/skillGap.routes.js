'use strict'

const { Router } = require('express')
const {
  getSkillGaps,
  getRecommendations,
  getLearningPath,
} = require('../controllers/skillGap.controller')
const { authenticate } = require('../middleware/auth.middleware')

const router = Router()

/**
 * All three endpoints require valid authentication and are strictly
 * scoped to req.user.id from the session/JWT token.
 */
router.get('/skill-gaps', authenticate, getSkillGaps)
router.get('/recommendations', authenticate, getRecommendations)
router.get('/learning-path', authenticate, getLearningPath)

module.exports = router
