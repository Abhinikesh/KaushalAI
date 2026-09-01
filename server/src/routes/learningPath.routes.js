const { Router } = require('express')
const { getLearningPath } = require('../controllers/learningPath.controller')
const { authenticate } = require('../middleware/auth.middleware')

const router = Router()

router.get('/users/me/learning-path', authenticate, getLearningPath)

module.exports = router
