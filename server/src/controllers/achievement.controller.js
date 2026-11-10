const achievementService = require('../services/achievement.service')

/**
 * Controller to fetch authenticated learner's achievements and metrics.
 * Route: GET /api/achievements/my
 */
async function getMyAchievements(req, res, next) {
  try {
    const userId = req.user?.id || req.user?._id
    if (!userId) {
      return next({ status: 401, message: 'Authentication required' })
    }

    const data = await achievementService.getUserAchievements(userId)
    res.json(data)
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getMyAchievements
}

