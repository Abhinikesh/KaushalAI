'use strict'

const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth.middleware')
const {
  startDiagnosticAssessment,
  submitDiagnosticAssessment,
  getDiagnosticAttemptResults,
  saveDiagnosticAnswer,
} = require('../controllers/assessment.controller')

// Authenticated diagnostic assessment lifecycle endpoints
router.post('/diagnostic/start', authenticate, startDiagnosticAssessment)
router.post('/diagnostic/:attemptId/save-answer', authenticate, saveDiagnosticAnswer)
router.post('/diagnostic/:attemptId/submit', authenticate, submitDiagnosticAssessment)
router.get('/attempts/:attemptId/results', authenticate, getDiagnosticAttemptResults)

module.exports = router
