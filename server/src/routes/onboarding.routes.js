'use strict'

const { Router } = require('express')
const { authenticate } = require('../middleware/auth.middleware')
const {
  getOnboardingOptions,
  saveOnboardingProfile,
} = require('../controllers/onboarding.controller')

const router = Router()

// GET /api/onboarding/options — dropdown options for onboarding questionnaire
router.get('/options', getOnboardingOptions)

// POST /api/onboarding/profile — save profile and derive level (1-5)
router.post('/profile', authenticate, saveOnboardingProfile)
router.put('/profile', authenticate, saveOnboardingProfile)

module.exports = router
