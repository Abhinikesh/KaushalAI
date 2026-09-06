'use strict'

const { User } = require('../models')

/**
 * requireOnboardingCompleted middleware
 *
 * Enforces that employee accounts must have finished the onboarding questionnaire
 * and diagnostic assessment (onboarding_completed === true) before accessing
 * live dashboard metrics, skills, skill gaps, recommendations, or learning paths.
 */
async function requireOnboardingCompleted(req, res, next) {
  try {
    const userId = req.user && req.user.id
    if (!userId) {
      return next({ status: 401, message: 'Authentication required' })
    }

    // Admins bypass onboarding checks
    if (req.user.role === 'admin') {
      return next()
    }

    const user = await User.findById(userId).select('onboarding_completed role').lean()
    if (!user) {
      return next({ status: 404, message: 'User record not found' })
    }

    if (user.role !== 'admin' && !user.onboarding_completed) {
      return res.status(403).json({
        success: false,
        code: 'ONBOARDING_INCOMPLETE',
        message: 'Onboarding is incomplete. Please complete your professional profile setup and initial diagnostic assessment.',
      })
    }

    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { requireOnboardingCompleted }
