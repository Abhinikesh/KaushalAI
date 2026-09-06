'use strict'

const { SkillGap, Recommendation, LearningPath, LearningPathItem } = require('../models')

/**
 * Priority weighting for sorting:
 * 'high' -> 1, 'medium' -> 2, 'low' -> 3
 */
const PRIORITY_ORDER = {
  high: 1,
  medium: 2,
  low: 3,
}

/**
 * GET /api/skill-gaps
 * Returns the authenticated user's own skill gaps, sorted by priority (high -> medium -> low)
 * Strictly scoped to req.user.id
 */
async function getSkillGaps(req, res, next) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const rawGaps = await SkillGap.find({ user_id: userId })
      .populate({
        path: 'competency_id',
        select: 'name category description level',
      })
      .lean()

    // Sort by priority (high -> medium -> low), then by gap descending
    const sortedGaps = rawGaps.sort((a, b) => {
      const orderA = PRIORITY_ORDER[a.priority] || 4
      const orderB = PRIORITY_ORDER[b.priority] || 4
      if (orderA !== orderB) {
        return orderA - orderB
      }
      return (b.gap || 0) - (a.gap || 0)
    })

    return res.status(200).json({
      success: true,
      count: sortedGaps.length,
      skill_gaps: sortedGaps,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/recommendations
 * Returns the authenticated user's own course recommendations, sorted by priority_rank asc
 * Strictly scoped to req.user.id
 */
async function getRecommendations(req, res, next) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const recommendations = await Recommendation.find({ user_id: userId })
      .sort({ priority_rank: 1 })
      .populate({
        path: 'course_id',
        select: 'title description level duration estimatedHours provider url skillTags thumbnail',
        populate: { path: 'skillTags', select: 'name' },
      })
      .lean()

    return res.status(200).json({
      success: true,
      count: recommendations.length,
      recommendations,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/learning-path
 * Returns the authenticated user's own active learning path and sequenced items with status
 * Strictly scoped to req.user.id
 */
async function getLearningPath(req, res, next) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    // Retrieve the active learning path for this user
    const learningPath = await LearningPath.findOne({
      user_id: userId,
      status: 'active',
    })
      .sort({ generated_at: -1 })
      .lean()

    if (!learningPath) {
      return res.status(200).json({
        success: true,
        learning_path: null,
        items: [],
      })
    }

    // Retrieve items in sequenced order with full course details
    const items = await LearningPathItem.find({
      learning_path_id: learningPath._id,
      user_id: userId,
    })
      .sort({ sequence_order: 1 })
      .populate({
        path: 'course_id',
        select: 'title description level duration estimatedHours provider url skillTags thumbnail',
        populate: { path: 'skillTags', select: 'name' },
      })
      .lean()

    return res.status(200).json({
      success: true,
      learning_path: learningPath,
      items,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/user-competencies
 * Returns the authenticated user's own user_competencies records
 * Strictly scoped to req.user.id
 */
async function getUserCompetencies(req, res, next) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const UserCompetency = require('../models/UserCompetency')
    const userCompetencies = await UserCompetency.find({ user_id: userId })
      .populate({
        path: 'competency_id',
        select: 'name category description level levelDescriptions',
      })
      .sort({ last_assessed_at: -1 })
      .lean()

    return res.status(200).json({
      success: true,
      count: userCompetencies.length,
      user_competencies: userCompetencies,
      competencies: userCompetencies,
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getSkillGaps,
  getRecommendations,
  getLearningPath,
  getUserCompetencies,
}
