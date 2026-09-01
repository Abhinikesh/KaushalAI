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
    userCompetencies.map((uc) => [uc.competencyId._id.toString(), uc.currentLevel])
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
  const gapAnalysis = await getGapAnalysis(gapPayload)

  // ── Step 5: Fetch course catalogue + user completions ─────────────────────
  const [igotCourses, nsstaCourses, completedEnrollments] = await Promise.all([
    getCourseAdapter().fetchCatalogue(),
    getNsstaAdapter().fetchCatalogue(),
    Enrollment.find({ userId, status: 'completed' }).select('courseId').lean(),
  ])

  const availableCourses = [...igotCourses, ...nsstaCourses]
  const completedCourseIds = completedEnrollments.map((e) => e.courseId.toString())

  // ── Step 6: Get recommendations ──────────────────────────────────────────
  const recPayload = {
    user_id: userId.toString(),
    gaps: gapAnalysis.gaps,
    completed_course_ids: completedCourseIds,
    target_job_role_title: jobRole.title,
    available_courses: availableCourses,
  }
  const recommendations = await getRecommendations(recPayload)

  // ── Step 7: Return combined result ────────────────────────────────────────
  return { gapAnalysis, recommendations }
}

module.exports = { buildLearningPathForUser }
