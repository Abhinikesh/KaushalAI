const { Router } = require('express')
const achievementController = require('../controllers/achievement.controller')
const { authenticate } = require('../middleware/auth.middleware')

const router = Router()

// Authenticated learner achievement endpoints
router.get('/achievements/my', authenticate, achievementController.getMyAchievements)
router.get('/my-achievements', authenticate, achievementController.getMyAchievements)

module.exports = router

