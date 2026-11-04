'use strict'

const { Router } = require('express')
const { authenticate } = require('../middleware/auth.middleware')
const {
  getOnboardingOptions,
  getOnboardingState,
  saveOnboardingStep,
  completeOnboarding,
  saveOnboardingProfile,
} = require('../controllers/onboarding.controller')

const router = Router()

// GET /api/onboarding/options — dropdown options for onboarding questionnaire
router.get('/options', getOnboardingOptions)

// GET /api/onboarding/state — authoritative user onboarding state
router.get('/state', authenticate, getOnboardingState)

// PUT & POST /api/onboarding/step/:stepNumber — incremental step saving with order validation
router.put('/step/:stepNumber', authenticate, saveOnboardingStep)
router.post('/step/:stepNumber', authenticate, saveOnboardingStep)

// POST /api/onboarding/complete — final graduation action from step 6
router.post('/complete', authenticate, completeOnboarding)

// POST & PUT /api/onboarding/profile — backward-compatible profile save
router.post('/profile', authenticate, saveOnboardingProfile)
router.put('/profile', authenticate, saveOnboardingProfile)

module.exports = router
