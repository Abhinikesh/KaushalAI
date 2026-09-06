'use strict'

const {
  User,
  Role,
  Competency,
  RoleCompetency,
  UserCompetency,
  SkillGap,
  Course,
  CourseCompetency,
  Recommendation,
  LearningPath,
  LearningPathItem,
} = require('../models')
const { syncCourseCompetencies } = require('./courseCompetencySync')
const { generateCourseRecommendations } = require('./aiServiceClient')

/**
 * 1. SKILL GAP COMPUTATION (Deterministic)
 * Given a user_id:
 * - Fetches user's role and role_competencies (required_level per competency)
 * - Fetches user_competencies (current_level per competency from latest assessment)
 * - Computes:
 *     gap = required_level - current_level
 *     priority = "high" if gap >= 2, "medium" if gap == 1, "low" if gap <= 0
 * - Upserts results into skill_gaps collection
 */
async function computeUserSkillGaps(userId) {
  try {
    const user = await User.findById(userId).populate('role_id')
    if (!user) {
      throw new Error(`User not found: ${userId}`)
    }

    // Determine target role
    let role = user.role_id
    if (!role) {
      const userLevel = user.level || 1
      role = await Role.findOne({ level: userLevel })
      if (!role) {
        role = await Role.findOne({})
      }
    }

    if (!role) {
      throw new Error('No role or reference roles found in system to compute skill gaps.')
    }

    // Fetch required competencies for this role
    let roleCompetencies = await RoleCompetency.find({ role_id: role._id }).populate('competency_id')

    // If role has no specific role_competency records, fallback to any role with same level
    if (roleCompetencies.length === 0) {
      const fallbackRole = await Role.findOne({ level: role.level })
      if (fallbackRole && fallbackRole._id.toString() !== role._id.toString()) {
        roleCompetencies = await RoleCompetency.find({ role_id: fallbackRole._id }).populate('competency_id')
      }
    }

    // If still empty, create baseline role competencies using all available competencies
    if (roleCompetencies.length === 0) {
      const allComps = await Competency.find({})
      const targetReqLevel = Math.min(5, Math.max(1, role.level || user.level || 3))
      for (const comp of allComps) {
        const rc = await RoleCompetency.findOneAndUpdate(
          { role_id: role._id, competency_id: comp._id },
          { role_id: role._id, competency_id: comp._id, required_level: targetReqLevel },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
        roleCompetencies.push(rc)
      }
    }

    // Fetch user's current assessed competencies
    const userCompetencies = await UserCompetency.find({ user_id: userId })
    const userCompMap = new Map()
    userCompetencies.forEach((uc) => {
      const cId = uc.competency_id?._id ? uc.competency_id._id.toString() : uc.competency_id.toString()
      userCompMap.set(cId, uc.current_level)
    })

    const upsertedGaps = []

    for (const rc of roleCompetencies) {
      const compId = rc.competency_id?._id ? rc.competency_id._id : rc.competency_id
      const compIdStr = compId.toString()

      // Current level defaults to 1 if unassessed
      const currentLevel = userCompMap.has(compIdStr) ? userCompMap.get(compIdStr) : 1
      const requiredLevel = rc.required_level || 3
      const gap = requiredLevel - currentLevel

      let priority = 'low'
      if (gap >= 2) {
        priority = 'high'
      } else if (gap === 1) {
        priority = 'medium'
      } else {
        priority = 'low'
      }

      const gapDoc = await SkillGap.findOneAndUpdate(
        { user_id: userId, competency_id: compId },
        {
          user_id: userId,
          competency_id: compId,
          current_level: currentLevel,
          required_level: requiredLevel,
          gap,
          priority,
          computed_at: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      upsertedGaps.push(gapDoc)
    }

    console.log(`[SkillGapPipeline] Gaps computed for user ${userId} (${upsertedGaps.length} gaps found)`)
    return upsertedGaps
  } catch (err) {
    console.error(`[SkillGapPipeline] Error computing skill gaps for user ${userId}:`, err.message)
    throw err
  }
}

/**
 * Helper to build deterministic fallback recommendations when AI service is unavailable
 */
function buildLocalDeterministicRecommendations(eligibleCourses, skillGaps, roleName) {
  const highGaps = skillGaps.filter((g) => g.priority === 'high')
  const medGaps = skillGaps.filter((g) => g.priority === 'medium')
  const highCompNames = new Set(highGaps.map((g) => (g.competency_id?.name || '').toLowerCase()))
  const medCompNames = new Set(medGaps.map((g) => (g.competency_id?.name || '').toLowerCase()))

  const scored = eligibleCourses.map((c) => {
    let score = 0
    let primaryReason = ''

    const addressed = (c.competencies_addressed || []).map((x) => String(x).toLowerCase())
    for (const compName of addressed) {
      if (Array.from(highCompNames).some((h) => h.includes(compName) || compName.includes(h))) {
        score += 20
        if (!primaryReason) {
          primaryReason = `Directly bridges critical competency gap in ${compName} required for ${roleName}.`
        }
      } else if (Array.from(medCompNames).some((m) => m.includes(compName) || compName.includes(m))) {
        score += 10
        if (!primaryReason) {
          primaryReason = `Strengthens medium priority competency in ${compName} for ${roleName}.`
        }
      } else {
        score += 3
      }
    }

    if (!primaryReason) {
      primaryReason = `Foundational development aligned with ${roleName} standards.`
    }

    return {
      course_id: c.course_id,
      title: c.title,
      score,
      reason: primaryReason,
    }
  })

  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, 10).map((item, idx) => ({
    course_id: item.course_id,
    reason: item.reason,
    priority_rank: idx + 1,
  }))
}

/**
 * 2 & 3. AI RECOMMENDATIONS + LEARNING PATH GENERATION
 * - Aggregates user skill gaps and eligible courses
 * - Calls Python AI service (with defensive local ranking fallback)
 * - Writes recommendations to `recommendations` collection
 * - Sequences into `learning_paths` and `learning_path_items`
 */
async function generateRecommendationsAndLearningPath(userId, attemptId = null) {
  try {
    // Ensure course competencies are indexed and populated
    await syncCourseCompetencies()

    const user = await User.findById(userId).populate('role_id').populate('functional_area_id')
    if (!user) {
      throw new Error(`User not found: ${userId}`)
    }

    // Retrieve computed skill gaps
    const skillGaps = await SkillGap.find({ user_id: userId }).populate('competency_id')
    if (skillGaps.length === 0) {
      // If no gaps computed yet, run computation first
      await computeUserSkillGaps(userId)
    }

    const refreshedGaps = await SkillGap.find({ user_id: userId }).populate('competency_id')
    const gapCompIds = refreshedGaps
      .filter((g) => g.gap > 0 && g.competency_id)
      .map((g) => g.competency_id._id)

    // Find eligible courses that address at least one of this user's gaps
    let courseCompetencies = []
    if (gapCompIds.length > 0) {
      courseCompetencies = await CourseCompetency.find({
        competency_id: { $in: gapCompIds },
      })
        .populate('course_id')
        .populate('competency_id')
    }

    // Collect eligible courses with competencies addressed
    const eligibleCoursesMap = new Map()

    for (const cc of courseCompetencies) {
      if (cc.course_id && cc.competency_id) {
        const cIdStr = cc.course_id._id.toString()
        if (!eligibleCoursesMap.has(cIdStr)) {
          eligibleCoursesMap.set(cIdStr, {
            course_id: cIdStr,
            title: cc.course_id.title,
            competencies_addressed: [],
            difficulty: cc.course_id.level || 'intermediate',
            duration_hours: cc.course_id.estimatedHours || 20,
          })
        }
        const item = eligibleCoursesMap.get(cIdStr)
        if (!item.competencies_addressed.includes(cc.competency_id.name)) {
          item.competencies_addressed.push(cc.competency_id.name)
        }
      }
    }

    // Also check Course collection directly by skillTags
    if (gapCompIds.length > 0) {
      const directCourses = await Course.find({
        skillTags: { $in: gapCompIds },
      }).populate('skillTags')

      for (const dc of directCourses) {
        const cIdStr = dc._id.toString()
        if (!eligibleCoursesMap.has(cIdStr)) {
          eligibleCoursesMap.set(cIdStr, {
            course_id: cIdStr,
            title: dc.title,
            competencies_addressed: (dc.skillTags || []).map((t) => t.name || 'Skill'),
            difficulty: dc.level || 'intermediate',
            duration_hours: dc.estimatedHours || 20,
          })
        }
      }
    }

    // If still no courses found, take active catalogue courses so recommendations never fail
    if (eligibleCoursesMap.size === 0) {
      const allActiveCourses = await Course.find({}).limit(10).populate('skillTags')
      for (const ac of allActiveCourses) {
        const cIdStr = ac._id.toString()
        eligibleCoursesMap.set(cIdStr, {
          course_id: cIdStr,
          title: ac.title,
          competencies_addressed: (ac.skillTags || []).map((t) => t.name || 'Core Skill'),
          difficulty: ac.level || 'intermediate',
          duration_hours: ac.estimatedHours || 15,
        })
      }
    }

    const eligibleCourses = Array.from(eligibleCoursesMap.values())

    // Format skill gaps for payload
    const formattedGaps = refreshedGaps.map((g) => ({
      competency: g.competency_id?.name || 'Competency',
      current: g.current_level,
      target: g.required_level,
      gap: g.gap,
      priority: g.priority,
    }))

    const roleTitle = user.role_id?.name || user.designation || 'Officer'
    const deptName = user.department || 'Statistics & Programme Implementation'
    const funcName = user.functional_area_id?.name || 'Statistical Operations'

    const payload = {
      role: roleTitle,
      level: user.level || user.role_id?.level || 1,
      department: deptName,
      functional_area: funcName,
      experience_years: user.experience_years || 0,
      education: user.education_level || "Bachelor's Degree",
      skill_gaps: formattedGaps,
      eligible_courses: eligibleCourses,
    }

    console.log(`[SkillGapPipeline] Calling AI recommendation service for user ${userId}...`)

    let recommendedResources = []
    try {
      const aiResponse = await generateCourseRecommendations(payload)
      if (aiResponse && Array.isArray(aiResponse.recommended_resources) && aiResponse.recommended_resources.length > 0) {
        recommendedResources = aiResponse.recommended_resources
      } else {
        console.warn('[SkillGapPipeline] AI response empty, using local deterministic fallback.')
        recommendedResources = buildLocalDeterministicRecommendations(eligibleCourses, refreshedGaps, roleTitle)
      }
    } catch (aiErr) {
      console.warn('[SkillGapPipeline] AI service call failed, applying local deterministic ranking:', aiErr.message)
      recommendedResources = buildLocalDeterministicRecommendations(eligibleCourses, refreshedGaps, roleTitle)
    }

    // Persist recommendations into `recommendations` collection
    // Clear any previous recommendations for this user
    await Recommendation.deleteMany({ user_id: userId })

    const savedRecommendations = []
    for (const rec of recommendedResources) {
      // Validate that course_id corresponds to a real course in DB
      const courseExists = await Course.findById(rec.course_id)
      if (courseExists) {
        const doc = await Recommendation.create({
          user_id: userId,
          course_id: rec.course_id,
          reason: rec.reason || `Targeted recommendation for ${roleTitle}`,
          priority_rank: rec.priority_rank || savedRecommendations.length + 1,
          generated_at: new Date(),
          assessment_attempt_id: attemptId || null,
        })
        savedRecommendations.push(doc)
      }
    }

    console.log(`[SkillGapPipeline] Recommendations saved for user ${userId} (${savedRecommendations.length} recommendations)`)

    // Sequence into Learning Path
    // Archive any previous active learning path for this user
    await LearningPath.updateMany({ user_id: userId, status: 'active' }, { status: 'archived' })

    const learningPath = await LearningPath.create({
      user_id: userId,
      target_role: roleTitle,
      target_competency_level: user.level || user.role_id?.level || 1,
      generated_at: new Date(),
      status: 'active',
    })

    // Sort saved recommendations by priority_rank ascending
    savedRecommendations.sort((a, b) => a.priority_rank - b.priority_rank)

    const pathItems = []
    for (let i = 0; i < savedRecommendations.length; i++) {
      const rec = savedRecommendations[i]
      const item = await LearningPathItem.create({
        user_id: userId,
        learning_path_id: learningPath._id,
        course_id: rec.course_id,
        sequence_order: i + 1,
        status: 'not_started',
      })
      pathItems.push(item)
    }

    console.log(`[SkillGapPipeline] Learning path saved for user ${userId} (${pathItems.length} items)`)

    return {
      recommendations: savedRecommendations,
      learningPath,
      items: pathItems,
    }
  } catch (err) {
    console.error(`[SkillGapPipeline] Error generating recommendations/path for user ${userId}:`, err.message)
    throw err
  }
}

/**
 * Full Pipeline Runner
 * Triggered automatically post-diagnostic assessment:
 * 1. Computes deterministic skill gaps
 * 2. Generates AI course recommendations & persists them
 * 3. Builds sequenced learning path
 */
async function runSkillGapAndRecommendationPipeline(userId, attemptId = null) {
  console.log(`[SkillGapPipeline] >>> Starting Skill Gap & AI Recommendation Pipeline for user ${userId}...`)
  const gaps = await computeUserSkillGaps(userId)
  const result = await generateRecommendationsAndLearningPath(userId, attemptId)
  console.log(`[SkillGapPipeline] >>> Pipeline completed successfully for user ${userId}.`)
  return {
    gaps,
    recommendations: result.recommendations,
    learningPath: result.learningPath,
    items: result.items,
  }
}

module.exports = {
  computeUserSkillGaps,
  generateRecommendationsAndLearningPath,
  runSkillGapAndRecommendationPipeline,
}
