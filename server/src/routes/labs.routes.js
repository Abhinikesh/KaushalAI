'use strict'

const { Router } = require('express')
const { issueLabAccessToken, getLabStatus } = require('../controllers/labs.controller')
const { authenticate } = require('../middleware/auth.middleware')

const router = Router()

// Issue 5-minute signed JWT token for accessing the Virtual Labs sandbox
router.post('/access-token', authenticate, issueLabAccessToken)

// Check lab unlock status for a course
router.get('/status/:courseId', authenticate, getLabStatus)

module.exports = router
