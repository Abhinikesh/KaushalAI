const { buildLearningPathForUser } = require('../services/learningPath.service')

async function getLearningPath(req, res, next) {
  try {
    const result = await buildLearningPathForUser(req.user.id)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

module.exports = { getLearningPath }
