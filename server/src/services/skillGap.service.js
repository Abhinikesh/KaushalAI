'use strict'

const mongoose = require('mongoose')

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
  Enrollment,
} = require('../models')
const { syncCourseCompetencies } = require('./courseCompetencySync')
const { generateCourseRecommendations } = require('./aiServiceClient')
const { resolveAuthoritativeRole } = require('../utils/roleResolution')

/**
 * 1. SKILL GAP COMPUTATION (Deterministic)
 * Given a user_id:
 * - Fetches user's role and role_competencies (required_level per competency)
 * - Unambiguously resolves user's authoritative cadre role via resolveAuthoritativeRole
 * - Fails closed if role resolution is missing or ambiguous (no destructive cleanup)
 * - Fetches role_competencies (authoritative required_level per competency)
 * - Fetches user_competencies (current_level per competency from latest assessment/quiz)
 * - Computes:
 *     gap = required_level - current_level
 *     priority = "high" if gap >= 2, "medium" if gap == 1, "low" if gap <= 0
 * - Upserts active role competencies into skill_gaps collection
 * - Removes obsolete orphaned skill_gaps outside the active competency set (Option A)
 * - Never modifies UserCompetency or assessment history
 */
// In-process serialization mutex for per-user calculation concurrency (ISSUE-17-2-D)
const userCalculationLocks = new Map()

// Test hook support for deterministic synchronization barriers
let preCleanupHook = null
let postCheckPreDeleteHook = null
let preDeleteHook = null
let betweenDeletionsHook = null
let postDeleteHook = null

function setPreCleanupHook(fn) {
  preCleanupHook = fn
}

function clearPreCleanupHook() {
  preCleanupHook = null
}

function setPostCheckPreDeleteHook(fn) {
  postCheckPreDeleteHook = fn
}

function clearPostCheckPreDeleteHook() {
  postCheckPreDeleteHook = null
}

function setPreDeleteHook(fn) {
  preDeleteHook = fn
}

function clearPreDeleteHook() {
  preDeleteHook = null
}

function setBetweenDeletionsHook(fn) {
  betweenDeletionsHook = fn
}

function clearBetweenDeletionsHook() {
  betweenDeletionsHook = null
}

function setPostDeleteHook(fn) {
  postDeleteHook = fn
}

function clearPostDeleteHook() {
  postDeleteHook = null
}

async function withUserLock(userId, fn) {
  const key = String(userId)
  const prevPromise = userCalculationLocks.get(key) || Promise.resolve()

  let resolveCurrent
  const currentPromise = new Promise((resolve) => {
    resolveCurrent = resolve
  })
  userCalculationLocks.set(key, currentPromise)

  try {
    await prevPromise
    return await fn()
  } finally {
    resolveCurrent()
    if (userCalculationLocks.get(key) === currentPromise) {
      userCalculationLocks.delete(key)
    }
  }
}

async function computeUserSkillGaps(userId) {
  return withUserLock(userId, async () => {
    return _computeUserSkillGapsInternal(userId)
  })
}

async function _computeUserSkillGapsInternal(userId) {
  try {
    const user = await User.findById(userId).populate('role_id')
    if (!user) {
      throw new Error(`User not found: ${userId}`)
    }

    // Unambiguously resolve authoritative role
    const { role, resolved, reason } = await resolveAuthoritativeRole(user)
    if (!resolved || !role) {
      throw new Error(`Cannot compute skill gaps: user ${userId} has no resolvable authoritative role (${reason || 'unresolved'}).`)
    }

    // ISSUE-17-2-D: Track unique calculation token on User for optimistic concurrency checking
    const calculationToken = new mongoose.Types.ObjectId()
    await User.findByIdAndUpdate(userId, {
      $set: { latest_calculation_token: calculationToken },
    })

    // Fetch authoritative required competencies for this specific role
    const roleCompetencies = await RoleCompetency.find({ role_id: role._id }).populate('competency_id')

    // Compute active competency ID set
    const activeCompObjectIds = roleCompetencies
      .map((rc) => rc.competency_id?._id || rc.competency_id)
      .filter(Boolean)

    // Fetch user's current assessed competencies
    const userCompetencies = await UserCompetency.find({ user_id: userId })
    const userCompMap = new Map()
    userCompetencies.forEach((uc) => {
      const cId = uc.competency_id?._id ? uc.competency_id._id.toString() : uc.competency_id.toString()
      userCompMap.set(cId, uc.current_level)
    })

    const upsertedGaps = []

    // PART 17.2.2: Ensure calculation is not stale before upserting
    const userPreUpsert = await User.findById(userId).select('role_id latest_calculation_token').lean()
    if (
      !userPreUpsert ||
      String(userPreUpsert.role_id) !== String(role._id) ||
      (userPreUpsert.latest_calculation_token &&
        String(userPreUpsert.latest_calculation_token) !== String(calculationToken))
    ) {
      console.warn(
        `[SkillGapPipeline] Stale calculation detected prior to upsert for user ${userId}. Aborting upsert to protect current role data.`
      )
      return []
    }

    // 1. Upsert active role competencies first (safe against partial failure)
    for (const rc of roleCompetencies) {
      const compId = rc.competency_id?._id ? rc.competency_id._id : rc.competency_id
      if (!compId) continue
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
          role_id: role._id,
          calculation_token: calculationToken,
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

    // ISSUE-17-2-D: Deterministic synchronization barrier for testing concurrent race conditions
    // Window 1: immediately before final authoritative role check
    if (typeof preCleanupHook === 'function') {
      await preCleanupHook(userId, role._id)
    }

    // ISSUE-17-2-D: Authoritative concurrency & state check
    // Re-fetch current user and verify that role is still resolved, still the same role,
    // and calculation token is still the latest one before performing destructive cleanup.
    const currentUserCheck = await User.findById(userId).populate('role_id').lean()
    const freshRoleRes = await resolveAuthoritativeRole(currentUserCheck)

    if (!freshRoleRes.resolved || !freshRoleRes.role) {
      console.warn(
        `[SkillGapPipeline] User ${userId} role is now unresolved or null (${freshRoleRes.reason || 'unresolved'}). ` +
          `Aborting orphan cleanup to prevent data corruption.`
      )
      return upsertedGaps
    }

    if (String(freshRoleRes.role._id) !== String(role._id)) {
      console.warn(
        `[SkillGapPipeline] Concurrent role change detected for user ${userId}. ` +
          `Expected role=${String(role._id)}, found role=${String(freshRoleRes.role._id)}. ` +
          `Aborting orphan cleanup to prevent deleting newer role records.`
      )
      return upsertedGaps
    }

    if (
      currentUserCheck.latest_calculation_token &&
      String(currentUserCheck.latest_calculation_token) !== String(calculationToken)
    ) {
      console.warn(
        `[SkillGapPipeline] Newer calculation token detected for user ${userId}. ` +
          `Aborting orphan cleanup from older calculation run.`
      )
      return upsertedGaps
    }

    // PART 17.2.2: Window 2 — immediately after final role check
    if (typeof postCheckPreDeleteHook === 'function') {
      await postCheckPreDeleteHook(userId, role._id)
    }

    // PART 17.2.2: Window 3 — immediately before cleanup query
    if (typeof preDeleteHook === 'function') {
      await preDeleteHook(userId, role._id)
    }

    // PART 17.2.2: Immediate Pre-Delete Re-Verification (Closes check-then-delete race window)
    const preDeleteUser = await User.findById(userId).populate('role_id').lean()
    const preDeleteRoleRes = await resolveAuthoritativeRole(preDeleteUser)

    if (!preDeleteRoleRes.resolved || !preDeleteRoleRes.role) {
      console.warn(
        `[SkillGapPipeline] User ${userId} role became unresolved or null immediately prior to cleanup. ` +
          `Aborting cleanup to prevent data loss.`
      )
      return upsertedGaps
    }

    if (String(preDeleteRoleRes.role._id) !== String(role._id)) {
      console.warn(
        `[SkillGapPipeline] Concurrent role mutation detected immediately prior to cleanup for user ${userId}. ` +
          `Expected role=${String(role._id)}, current role=${String(preDeleteRoleRes.role._id)}. Aborting cleanup.`
      )
      return upsertedGaps
    }

    if (
      preDeleteUser.latest_calculation_token &&
      String(preDeleteUser.latest_calculation_token) !== String(calculationToken)
    ) {
      console.warn(
        `[SkillGapPipeline] Superseded calculation token detected immediately prior to cleanup for user ${userId}. Aborting cleanup.`
      )
      return upsertedGaps
    }

    // PART 17.2.3: Atomic Role-Safe Cleanup (Option A with Targeted Positive Bounding)
    // 1. Purge obsolete records specifically stamped with this calculation's role
    if (activeCompObjectIds.length > 0) {
      await SkillGap.deleteMany({
        user_id: userId,
        role_id: role._id,
        competency_id: { $nin: activeCompObjectIds },
      })
    } else {
      // Confirmed zero-competency role: purge records belonging to this role
      await SkillGap.deleteMany({
        user_id: userId,
        role_id: role._id,
      })
    }

    // PART 17.2.3: Deterministic test hook between the first and second deletion queries
    if (typeof betweenDeletionsHook === 'function') {
      await betweenDeletionsHook(userId, role._id)
    }

    // 2. Safe & deterministic cleanup of previous/obsolete roles (Option A):
    // Strictly targeted positive predicates per role ID — NEVER open-ended $nin on role_id!
    const freshUserForCleanup = await User.findById(userId)
      .select('previous_role_id role_id latest_calculation_token')
      .lean()

    if (
      freshUserForCleanup &&
      String(freshUserForCleanup.role_id) === String(role._id) &&
      (!freshUserForCleanup.latest_calculation_token ||
        String(freshUserForCleanup.latest_calculation_token) === String(calculationToken))
    ) {
      // Find all distinct roles currently in SkillGap for this user that are NOT this active role
      const distinctOtherRoles = await SkillGap.distinct('role_id', {
        user_id: userId,
        role_id: { $ne: null, $nin: [role._id] },
      })

      const rolesToPurge = new Set(distinctOtherRoles.map((r) => String(r)))
      if (
        freshUserForCleanup.previous_role_id &&
        String(freshUserForCleanup.previous_role_id) !== String(role._id)
      ) {
        rolesToPurge.add(String(freshUserForCleanup.previous_role_id))
      }

      for (const oldRoleId of rolesToPurge) {
        if (activeCompObjectIds.length > 0) {
          await SkillGap.deleteMany({
            user_id: userId,
            role_id: oldRoleId,
            competency_id: { $nin: activeCompObjectIds },
          })
        } else {
          await SkillGap.deleteMany({
            user_id: userId,
            role_id: oldRoleId,
          })
        }
      }

      if (freshUserForCleanup.previous_role_id) {
        await User.findByIdAndUpdate(userId, { $set: { previous_role_id: null } })
      }
    }

    // PART 17.2.2: Window 4 — immediately after cleanup
    if (typeof postDeleteHook === 'function') {
      await postDeleteHook(userId, role._id)
    }

    // ISSUE-17-2-C: Clear deferred recovery flags on successful calculation
    await User.findByIdAndUpdate(userId, {
      $set: {
        needs_skillgap_sync: false,
        skillgap_sync_error: null,
        skillgap_sync_requested_at: null,
      },
    })

    console.log(`[SkillGapPipeline] Gaps computed for user ${userId} (${upsertedGaps.length} active gaps found)`)
    return upsertedGaps
  } catch (err) {
    console.error(`[SkillGapPipeline] Error computing skill gaps for user ${userId}:`, err.message)
    throw err
  }
}

/**
 * Helper to build deterministic recommendations when AI service is unavailable
 * Ensures recommendation diversity based on specific high/medium gaps and excludes completed courses.
 */
function buildLocalDeterministicRecommendations(eligibleCourses, skillGaps, roleName, completedCourseIds = new Set()) {
  const highGaps = skillGaps.filter((g) => g.priority === 'high' || (g.gap || 0) >= 2)
  const medGaps = skillGaps.filter((g) => g.priority === 'medium' || (g.gap || 0) === 1)

  // Map competency keywords to gap items
  const gapMap = new Map()
  skillGaps.forEach((g) => {
    const name = (g.competency_id?.name || '').toLowerCase()
    if (name) gapMap.set(name, g)
  })

  // Exclude completed courses
  const candidates = eligibleCourses.filter((c) => !completedCourseIds.has(String(c.course_id)))

  const scored = candidates.map((c) => {
    let score = 0
    let primaryReason = ''
    let matchingHighGap = null
    let matchingMedGap = null

    const addressed = (c.competencies_addressed || []).map((x) => String(x).toLowerCase())
    for (const compName of addressed) {
      for (const [gName, gDoc] of gapMap.entries()) {
        if (gName.includes(compName) || compName.includes(gName)) {
          if (gDoc.priority === 'high' || (gDoc.gap || 0) >= 2) {
            score += 40 + ((gDoc.gap || 2) * 5)
            if (!matchingHighGap) matchingHighGap = gDoc
          } else if (gDoc.priority === 'medium' || (gDoc.gap || 0) === 1) {
            score += 18
            if (!matchingMedGap) matchingMedGap = gDoc
          } else {
            score += 2
          }
        }
      }
    }

    if (matchingHighGap) {
      const compTitle = matchingHighGap.competency_id?.name || 'core area'
      primaryReason = `Critical Priority: Directly addresses your ${matchingHighGap.gap}-level gap in ${compTitle} required for ${roleName}.`
    } else if (matchingMedGap) {
      const compTitle = matchingMedGap.competency_id?.name || 'core area'
      primaryReason = `Targeted Development: Strengthens competency in ${compTitle} to satisfy ${roleName} standards.`
    } else {
      primaryReason = `Cadre Foundation: General skill development aligned with ${roleName} duties.`
    }

    return {
      course_id: c.course_id,
      title: c.title,
      score,
      reason: primaryReason,
    }
  })

  // Sort descending by calculated score
  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, 8).map((item, idx) => ({
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

    // Retrieve completed courses to ensure they are not recommended again (Case 7)
    const completedEnrollments = await Enrollment.find({
      user_id: userId,
      status: 'completed',
    }).select('course_id')
    const completedCourseIds = new Set(
      completedEnrollments
        .filter((e) => e && e.course_id)
        .map((e) => e.course_id.toString())
    )

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

    // If still no courses found, take active catalogue courses so recommendations never fail (ISSUE-07: restrict to published)
    if (eligibleCoursesMap.size === 0) {
      const allActiveCourses = await Course.find({ isPublished: true }).limit(10).populate('skillTags')
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
        recommendedResources = aiResponse.recommended_resources.filter(
          (r) => !completedCourseIds.has(String(r.course_id))
        )
      } else {
        console.warn('[SkillGapPipeline] AI response empty, using local deterministic fallback.')
        recommendedResources = buildLocalDeterministicRecommendations(eligibleCourses, refreshedGaps, roleTitle, completedCourseIds)
      }
    } catch (aiErr) {
      console.warn('[SkillGapPipeline] AI service call failed, applying local deterministic ranking:', aiErr.message)
      recommendedResources = buildLocalDeterministicRecommendations(eligibleCourses, refreshedGaps, roleTitle, completedCourseIds)
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

    // Populate course details for rich frontend rendering
    const populatedRecommendations = await Recommendation.find({ user_id: userId })
      .sort({ priority_rank: 1 })
      .populate({
        path: 'course_id',
        select: 'title description level duration estimatedHours provider url skillTags thumbnail thumbnailUrl slides durationHours difficulty rating reviewsCount ratingCount',
        populate: { path: 'skillTags', select: 'name' },
      })
      .lean()

    console.log(`[SkillGapPipeline] Recommendations saved for user ${userId} (${populatedRecommendations.length} recommendations)`)

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

    const pathItems = []
    for (let i = 0; i < populatedRecommendations.length; i++) {
      const rec = populatedRecommendations[i]
      const item = await LearningPathItem.create({
        user_id: userId,
        learning_path_id: learningPath._id,
        course_id: rec.course_id?._id || rec.course_id,
        sequence_order: i + 1,
        status: 'not_started',
      })
      pathItems.push(item)
    }

    console.log(`[SkillGapPipeline] Learning path saved for user ${userId} (${pathItems.length} items)`)

    return {
      recommendations: populatedRecommendations,
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
  const rawGaps = await computeUserSkillGaps(userId)
  const populatedGaps = await SkillGap.find({ user_id: userId }).populate('competency_id').lean()
  const result = await generateRecommendationsAndLearningPath(userId, attemptId)
  console.log(`[SkillGapPipeline] >>> Pipeline completed successfully for user ${userId}.`)
  return {
    gaps: populatedGaps,
    recommendations: result.recommendations,
    learningPath: result.learningPath,
    items: result.items,
  }
}

module.exports = {
  computeUserSkillGaps,
  generateRecommendationsAndLearningPath,
  runSkillGapAndRecommendationPipeline,
  withUserLock,
  setPreCleanupHook,
  clearPreCleanupHook,
  setPostCheckPreDeleteHook,
  clearPostCheckPreDeleteHook,
  setPreDeleteHook,
  clearPreDeleteHook,
  setBetweenDeletionsHook,
  clearBetweenDeletionsHook,
  setPostDeleteHook,
  clearPostDeleteHook,
}
