require('../models')
const User = require('../models/User')
const UserCompetency = require('../models/UserCompetency')
const Enrollment = require('../models/Enrollment')
const { getGapAnalysis, getRecommendations } = require('./aiServiceClient')
const { getCourseAdapter } = require('./adapters/igotAdapter')
const { getNsstaAdapter } = require('./adapters/nsstaAdapter')

async function buildLearningPathForUser(userId) {
  // ── Step 1: Load user with job role requirements ──────────────────────────
  const user = await User.findById(userId)
    .populate({
      path: 'jobRoleId',
      populate: { path: 'requiredCompetencies.competencyId', select: 'name category' },
    })
    .lean()

  if (!user.jobRoleId) {
    const err = new Error('No job role set. Use PUT /api/users/me/job-role to set one before requesting a learning path.')
    err.status = 400
    throw err
  }

  const jobRole = user.jobRoleId
  const requiredCompetencies = jobRole.requiredCompetencies ?? []

  if (requiredCompetencies.length === 0) {
    const err = new Error('Assigned job role has no required competencies configured.')
    err.status = 400
    throw err
  }

  // ── Step 2: Load user's self-assessed competency levels ───────────────────
  const userCompetencies = await UserCompetency.find({ userId })
    .populate('competencyId', 'name category')
    .lean()

  const currentLevelMap = Object.fromEntries(
    userCompetencies
      .filter((uc) => uc.competencyId && uc.competencyId._id)
      .map((uc) => [uc.competencyId._id.toString(), uc.currentLevel])
  )

  // ── Step 3: Build CompetencyScore array for the AI service ────────────────
  // Default current_level to 1 if the user hasn't self-assessed a required competency yet
  const competencies = requiredCompetencies
    .filter((rc) => rc.competencyId) // guard against dangling refs
    .map((rc) => ({
      competency_id: rc.competencyId._id.toString(),
      name: rc.competencyId.name,
      category: rc.competencyId.category,
      current_level: currentLevelMap[rc.competencyId._id.toString()] ?? 1,
      required_level: rc.requiredLevel,
    }))

  // ── Step 4: Gap analysis ──────────────────────────────────────────────────
  const gapPayload = {
    user_id: userId.toString(),
    job_role_title: jobRole.title,
    competencies,
  }
  let gapAnalysis
  try {
    gapAnalysis = await getGapAnalysis(gapPayload)
  } catch (err) {
    console.warn('[learningPath.service] AI service unavailable for gap analysis, calculating locally:', err.message)
    const gaps = competencies.map((c) => {
      const gap = Math.max(0, c.required_level - c.current_level)
      let priority = 'low'
      if (gap >= 2) priority = 'high'
      else if (gap === 1) priority = 'medium'
      return {
        competency_id: c.competency_id,
        name: c.name,
        category: c.category,
        current_level: c.current_level,
        required_level: c.required_level,
        gap,
        priority,
      }
    }).sort((a, b) => b.gap - a.gap)

    const totalRequired = competencies.reduce((acc, c) => acc + (c.required_level || 1), 0)
    const totalCurrent = competencies.reduce((acc, c) => acc + Math.min(c.current_level || 1, c.required_level || 1), 0)
    const overall_readiness_percent = totalRequired > 0 ? Math.round((totalCurrent / totalRequired) * 100) : 100

    const summary = {
      high: gaps.filter((g) => g.priority === 'high').length,
      medium: gaps.filter((g) => g.priority === 'medium').length,
      low: gaps.filter((g) => g.priority === 'low').length,
      none: gaps.filter((g) => g.gap === 0).length,
    }

    gapAnalysis = {
      user_id: userId.toString(),
      job_role_title: jobRole.title,
      overall_readiness_percent,
      total_competencies: competencies.length,
      competencies_with_gap: gaps.filter((g) => g.gap > 0).length,
      gaps,
      summary,
    }
  }

  // ── Step 5: Fetch course catalogue + user completions ─────────────────────
  const [igotCourses, nsstaCourses, completedEnrollments] = await Promise.all([
    getCourseAdapter().fetchCatalogue(),
    getNsstaAdapter().fetchCatalogue(),
    Enrollment.find({ userId, status: 'completed' }).select('courseId').lean(),
  ])

  const availableCourses = [...igotCourses, ...nsstaCourses]
  const completedCourseIds = completedEnrollments.map((e) => e.courseId.toString())

  // Create lookup map for fast enrichment
  const courseMap = new Map()
  for (const c of availableCourses) {
    courseMap.set(String(c.course_id), c)
  }

  // ── Step 6: Get recommendations ──────────────────────────────────────────
  const recPayload = {
    user_id: userId.toString(),
    gaps: gapAnalysis.gaps,
    completed_course_ids: completedCourseIds,
    target_job_role_title: jobRole.title,
    available_courses: availableCourses,
  }

  let recommendations
  try {
    recommendations = await getRecommendations(recPayload)
  } catch (err) {
    console.warn('[learningPath.service] AI service unavailable for recommendations, computing local recommendations:', err.message)
    const uncompletedCourses = availableCourses.filter(
      (c) => !completedCourseIds.includes(String(c.course_id))
    )

    // Calculate score based on gap keyword matching and priority
    const scoredCourses = uncompletedCourses.map((course) => {
      let matchScore = 20
      const courseText = `${course.title} ${course.description} ${(course.skill_tags || []).join(' ')}`.toLowerCase()
      for (const gap of gapAnalysis.gaps || []) {
        const gapName = (gap.name || '').toLowerCase()
        if (gapName && courseText.includes(gapName)) {
          matchScore += (gap.priority === 'high' ? 40 : gap.priority === 'medium' ? 25 : 15)
        }
      }
      const finalScore = Math.min(98, Math.max(35, matchScore))
      return {
        course_id: course.course_id,
        title: course.title,
        source: course.source,
        final_score: finalScore,
        reason: {
          gap_match_score: finalScore * 0.4,
          role_relevance_score: finalScore * 0.3,
          difficulty_match_score: 85,
          career_relevance_score: finalScore * 0.3,
        },
        reason_text: `Recommended for ${jobRole.title} to address priority competencies.`,
      }
    })

    scoredCourses.sort((a, b) => b.final_score - a.final_score)
    recommendations = {
      user_id: userId.toString(),
      recommendations: scoredCourses.slice(0, 12),
    }
  }

  // Enrich recommendations with full details from availableCourses
  if (recommendations?.recommendations) {
    recommendations.recommendations = recommendations.recommendations.map((rec) => {
      const details = courseMap.get(String(rec.course_id)) || {}
      return {
        ...rec,
        description: details.description || '',
        skill_tags: details.skill_tags || [],
        difficulty: details.difficulty || 'intermediate',
        duration_hours: details.duration_hours || 10,
        source: rec.source || details.source || 'igot',
      }
    })
  }

  // ── Step 7: Return combined result ────────────────────────────────────────
  return { gapAnalysis, recommendations }
}

module.exports = { buildLearningPathForUser }
