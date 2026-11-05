'use strict'

const mongoose = require('mongoose')
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

    let rawGaps = await SkillGap.find({ user_id: userId })
      .populate({
        path: 'competency_id',
        select: 'name category description level levelDescriptions',
      })
      .lean()

    // Auto-generate initial role-competency skill gaps if not yet generated
    if (rawGaps.length === 0) {
      try {
        const { computeUserSkillGaps } = require('../services/skillGap.service')
        await computeUserSkillGaps(userId)
        rawGaps = await SkillGap.find({ user_id: userId })
          .populate({
            path: 'competency_id',
            select: 'name category description level levelDescriptions',
          })
          .lean()
      } catch (computeErr) {
        console.warn(`[getSkillGaps] Baseline compute fallback for user ${userId}:`, computeErr.message)
      }
    }

    // Sort by priority (high -> medium -> low), then by gap descending
    const sortedGaps = rawGaps.sort((a, b) => {
      const orderA = PRIORITY_ORDER[a.priority] || 4
      const orderB = PRIORITY_ORDER[b.priority] || 4
      if (orderA !== orderB) {
        return orderA - orderB
      }
      return (b.gap || 0) - (a.gap || 0)
    })

    // Resolve mapped course for each skill gap using Recommendations and Course collection
    const Course = require('../models/Course')
    const Recommendation = require('../models/Recommendation')

    // 1. Fetch user's existing recommendations to find directly mapped courses
    const userRecs = await Recommendation.find({ user_id: userId })
      .populate({
        path: 'course_id',
        select: '_id title description level duration estimatedHours provider url skillTags competencyTags difficulty isPublished',
      })
      .lean()

    const compToCourseMap = new Map()

    for (const rec of userRecs) {
      if (rec.course_id && rec.course_id.isPublished !== false) {
        const c = rec.course_id
        if (Array.isArray(c.skillTags)) {
          for (const st of c.skillTags) {
            const stId = (st._id || st).toString()
            if (!compToCourseMap.has(stId)) {
              compToCourseMap.set(stId, c)
            }
          }
        }
      }
    }

    // 2. For competencies not covered by recommendations, batch-fetch published Courses (N+1 query elimination)
    const unmappedCompIds = []
    const unmappedCompNames = []

    for (const gap of sortedGaps) {
      if (!gap) continue
      const rawCompId = gap.competency_id?._id || gap.competency_id
      const compId = rawCompId ? rawCompId.toString() : null
      const compName =
        typeof gap.competency_id?.name === 'string' && gap.competency_id.name.trim().length > 0
          ? gap.competency_id.name.trim()
          : typeof gap.name === 'string' && gap.name.trim().length > 0
          ? gap.name.trim()
          : null

      if (compId && compToCourseMap.has(compId)) {
        gap.course = compToCourseMap.get(compId)
      } else {
        // Validate ObjectId safely before querying MongoDB to prevent CastError
        if (compId && mongoose.Types.ObjectId.isValid(compId)) {
          unmappedCompIds.push(new mongoose.Types.ObjectId(compId))
        }
        if (compName) {
          unmappedCompNames.push(compName)
        }
      }
    }

    const orClauses = []
    if (unmappedCompIds.length > 0) {
      orClauses.push({ skillTags: { $in: unmappedCompIds } })
    }
    if (unmappedCompNames.length > 0) {
      const regexes = unmappedCompNames.map((n) => new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
      orClauses.push({ competencyTags: { $in: regexes } })
      orClauses.push({ title: { $in: regexes } })
    }

    let candidateCourses = []
    // Safety check: Skip query if orClauses is empty to prevent MongoDB "$or must be an array of at least 1 clause" error
    if (orClauses.length > 0) {
      candidateCourses = await Course.find({
        isPublished: true,
        $or: orClauses,
      })
        .select('_id title description level duration estimatedHours provider url skillTags competencyTags difficulty isPublished')
        .lean()
    }

    for (const c of candidateCourses) {
      if (Array.isArray(c.skillTags)) {
        for (const st of c.skillTags) {
          const stId = (st._id || st).toString()
          if (!compToCourseMap.has(stId)) {
            compToCourseMap.set(stId, c)
          }
        }
      }
    }

    for (const gap of sortedGaps) {
      if (!gap || gap.course) continue
      const rawCompId = gap.competency_id?._id || gap.competency_id
      const compId = rawCompId ? rawCompId.toString() : null
      const compName = (typeof gap.competency_id?.name === 'string' ? gap.competency_id.name : gap.name)?.trim().toLowerCase()

      if (compId && compToCourseMap.has(compId)) {
        gap.course = compToCourseMap.get(compId)
      } else if (compName) {
        const matched = candidateCourses.find((c) => {
          const matchTag =
            Array.isArray(c.competencyTags) &&
            c.competencyTags.some((ct) => ct && typeof ct === 'string' && ct.toLowerCase().includes(compName))
          const matchTitle = typeof c.title === 'string' && c.title.toLowerCase().includes(compName)
          return matchTag || matchTitle
        })
        if (matched) {
          if (compId) compToCourseMap.set(compId, matched)
          gap.course = matched
        } else {
          gap.course = null
        }
      } else {
        gap.course = null
      }
    }

    const AssessmentAttempt = require('../models/AssessmentAttempt')
    const latestAttempt = await AssessmentAttempt.findOne({
      user_id: userId,
      status: 'completed',
    })
      .sort({ completed_at: -1 })
      .select('overall_score competency_scores ai_analysis completed_at')
      .lean()

    return res.status(200).json({
      success: true,
      count: sortedGaps.length,
      skill_gaps: sortedGaps,
      latest_assessment: latestAttempt || null,
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
        select: 'title description level duration estimatedHours provider url skillTags thumbnail thumbnailUrl slides durationHours difficulty rating reviewsCount ratingCount',
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
        select: 'title description level duration estimatedHours provider url skillTags thumbnail thumbnailUrl slides durationHours difficulty rating reviewsCount',
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
