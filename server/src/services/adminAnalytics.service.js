'use strict'

/**
 * adminAnalytics.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All org-wide aggregation pipelines for the Admin Dashboard.
 *
 * Performance notes:
 *   - UserCompetency already has compound index { userId, competencyId }.
 *   - For department-based heatmap queries to scale, add:
 *       db.users.createIndex({ department: 1, jobRoleId: 1 })
 *       db.usercompetencies.createIndex({ competencyId: 1, currentLevel: 1 })
 *   These are logged below but NOT auto-applied here; run them manually on
 *   the Atlas/Mongo instance when scaling beyond ~1 000 users.
 *
 * Projection / ML honesty note:
 *   getSkillDemandTrend() uses a simple OLS linear regression (slope/intercept).
 *   It is labelled clearly as a linear trend projection in both this code and
 *   the frontend — never "AI-powered" or "machine learning".
 * ─────────────────────────────────────────────────────────────────────────────
 */

const mongoose      = require('mongoose')
const User          = require('../models/User')
const UserCompetency = require('../models/UserCompetency')
const Competency    = require('../models/Competency')
const JobRole       = require('../models/JobRole')
const Role          = require('../models/Role')
const RoleCompetency = require('../models/RoleCompetency')
const QuizAttempt   = require('../models/QuizAttempt')
const Course        = require('../models/Course')

// ── Pure math helper ──────────────────────────────────────────────────────────

/**
 * computeLinearTrend — ordinary least-squares linear regression.
 *
 * @param  {Array<{x: number, y: number}>} points  (x = month index 0…N-1, y = value)
 * @returns {{ slope: number, intercept: number }}
 *
 * Formula:
 *   slope     = (N·Σxy - Σx·Σy) / (N·Σx² - (Σx)²)
 *   intercept = (Σy - slope·Σx) / N
 *
 * Returns { slope: 0, intercept: mean(y) } if only one point or degenerate input.
 */
function computeLinearTrend(points) {
  const n = points.length
  if (n < 2) {
    const intercept = n === 1 ? points[0].y : 0
    return { slope: 0, intercept }
  }
  const sumX  = points.reduce((a, p) => a + p.x, 0)
  const sumY  = points.reduce((a, p) => a + p.y, 0)
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0)
  const sumX2 = points.reduce((a, p) => a + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return { slope: 0, intercept: sumY / n }
  const slope     = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

/** Format a Date as "YYYY-MM" for display labels */
function toMonthLabel(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * getDepartmentCompetencyHeatmap
 * Returns a 2-D grid: rows = departments, columns = competency categories,
 * each cell = { avgLevel, count, breakdown: [{competencyName, avgLevel}] }
 */
async function getDepartmentCompetencyHeatmap() {
  // Step 1: pull all non-admin active users with their department
  const users = await User.find({
    isActive: true,
    role: { $ne: 'admin' },
    department: { $exists: true, $ne: '' },
  })
    .select('_id department')
    .lean()

  if (!users.length) return { departments: [], categories: [], cells: {} }

  const userMap = {}   // userId -> department
  users.forEach((u) => { userMap[u._id.toString()] = u.department })
  const userIds = users.map((u) => u._id)

  // Step 2: aggregate UserCompetency grouped by userId + competencyId
  // Supports both modern BSON fields (user_id, competency_id, current_level) and legacy camelCase aliases
  const ucAgg = await UserCompetency.aggregate([
    {
      $match: {
        $or: [
          { user_id: { $in: userIds } },
          { userId: { $in: userIds } },
        ],
      },
    },
    {
      $lookup: {
        from: 'competencies',
        let: { compId: { $ifNull: ['$competency_id', '$competencyId'] } },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$compId'] } } },
        ],
        as: 'comp',
      },
    },
    { $unwind: '$comp' },
    {
      $project: {
        userId: { $ifNull: ['$user_id', '$userId'] },
        currentLevel: { $ifNull: ['$current_level', '$currentLevel'] },
        competencyName: '$comp.name',
        category: '$comp.category',
      },
    },
  ])

  // Step 3: group in JS (faster than a deep Mongo pipeline for this shape)
  // cell key = `${department}::${category}`
  const cellAcc = {}     // { key: { sum, count, byComp: { name: {sum,count} } } }
  const deptSet = new Set()
  const catSet  = new Set()

  for (const row of ucAgg) {
    if (!row.userId) continue
    const dept = userMap[row.userId.toString()]
    if (!dept) continue
    const cat  = row.category
    if (!cat) continue
    deptSet.add(dept)
    catSet.add(cat)
    const key = `${dept}::${cat}`
    if (!cellAcc[key]) cellAcc[key] = { sum: 0, count: 0, byComp: {} }
    const lvl = Number(row.currentLevel) || 1
    cellAcc[key].sum   += lvl
    cellAcc[key].count += 1
    const bc = cellAcc[key].byComp
    const compName = row.competencyName || 'Competency'
    if (!bc[compName]) bc[compName] = { sum: 0, count: 0 }
    bc[compName].sum   += lvl
    bc[compName].count += 1
  }

  // Step 4: build final cells object
  const cells = {}
  for (const [key, acc] of Object.entries(cellAcc)) {
    const avgLevel = Math.round((acc.sum / acc.count) * 10) / 10
    const breakdown = Object.entries(acc.byComp)
      .map(([name, b]) => ({ name, avgLevel: Math.round((b.sum / b.count) * 10) / 10 }))
      .sort((a, b) => a.avgLevel - b.avgLevel)
    cells[key] = { avgLevel, count: acc.count, breakdown }
  }

  const departments = [...deptSet].sort()
  const categories  = [...catSet].sort()
  return { departments, categories, cells }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * getOrgWideTopGaps
 * For each competency that is required by active users' cadre roles, compute the
 * average gap (required - current) across all users whose role requires it.
 * Returns the top `limit` competencies by avg gap descending.
 * 
 * Modern Architecture (ISSUE-16-10):
 * - Uses active users with valid `role_id` references pointing to `Role`.
 * - Resolves authoritative required levels from `RoleCompetency`.
 * - Compares with `UserCompetency` (supporting user_id/userId and current_level/currentLevel).
 * - Excludes invalid, missing, or inactive assignments.
 * - Returns a genuine empty array `[]` when no gaps exist (never mock data).
 */
async function getOrgWideTopGaps(limit = 10) {
  // Step 1: pull active non-admin users who have an assigned role_id
  const users = await User.find({
    isActive: true,
    role: { $ne: 'admin' },
    role_id: { $ne: null },
  })
    .select('_id role_id department')
    .lean()

  if (!users.length) return []

  // Step 2: Validate roles exist in Role collection
  const rawRoleIds = [...new Set(users.map((u) => u.role_id?.toString()).filter(Boolean))]
  const validObjectIds = rawRoleIds.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id))
  if (!validObjectIds.length) return []

  const validRoles = await Role.find({ _id: { $in: validObjectIds } }).select('_id name level').lean()
  const validRoleIdSet = new Set(validRoles.map((r) => r._id.toString()))

  const activeUsers = users.filter((u) => u.role_id && validRoleIdSet.has(u.role_id.toString()))
  if (!activeUsers.length) return []

  // Step 3: Fetch authoritative RoleCompetency mappings for these roles
  const roleCompetencies = await RoleCompetency.find({
    role_id: { $in: Array.from(validRoleIdSet).map((id) => new mongoose.Types.ObjectId(id)) },
  }).lean()

  // Map: roleId -> Map(competencyId -> requiredLevel)
  const roleReqMap = new Map()
  for (const rc of roleCompetencies) {
    const rId = (rc.role_id?._id || rc.role_id)?.toString()
    const cId = (rc.competency_id?._id || rc.competency_id)?.toString()
    if (!rId || !cId) continue
    if (!roleReqMap.has(rId)) {
      roleReqMap.set(rId, new Map())
    }
    roleReqMap.get(rId).set(cId, rc.required_level || 1)
  }

  // Step 4: Fetch actual UserCompetency records for active users
  const userIds = activeUsers.map((u) => u._id)
  const ucRecords = await UserCompetency.find({
    $or: [{ user_id: { $in: userIds } }, { userId: { $in: userIds } }],
  }).lean()

  // Map: userId -> Map(competencyId -> currentLevel)
  const userLevelMap = new Map()
  for (const uc of ucRecords) {
    const uId = (uc.user_id || uc.userId)?.toString()
    const cId = (uc.competency_id?._id || uc.competency_id || uc.competencyId)?.toString()
    if (!uId || !cId) continue
    const lvl = uc.current_level ?? uc.currentLevel ?? 1
    if (!userLevelMap.has(uId)) {
      userLevelMap.set(uId, new Map())
    }
    userLevelMap.get(uId).set(cId, lvl)
  }

  // Step 5: For each user and required role competency, compute gap
  // competencyId -> { sumGap, count, requiredLevel, affectedCount }
  const compGapAcc = {}

  for (const user of activeUsers) {
    const uIdStr = user._id.toString()
    const rIdStr = user.role_id.toString()
    const reqComps = roleReqMap.get(rIdStr)
    if (!reqComps || reqComps.size === 0) continue

    const userComps = userLevelMap.get(uIdStr)

    for (const [cId, reqLevel] of reqComps.entries()) {
      const current = userComps && userComps.has(cId) ? userComps.get(cId) : 1
      const gap = reqLevel - current
      if (gap > 0) {
        if (!compGapAcc[cId]) {
          compGapAcc[cId] = { sumGap: 0, count: 0, requiredLevel: reqLevel, affectedUsers: 0 }
        }
        compGapAcc[cId].sumGap += gap
        compGapAcc[cId].count += 1
        compGapAcc[cId].affectedUsers += 1
        compGapAcc[cId].requiredLevel = Math.max(compGapAcc[cId].requiredLevel, reqLevel)
      }
    }
  }

  // Step 6: Fetch competency names and categories
  const compIds = Object.keys(compGapAcc).filter((id) => mongoose.Types.ObjectId.isValid(id))
  if (compIds.length === 0) return []

  const comps = await Competency.find({ _id: { $in: compIds } }).select('name category').lean()
  const compNames = {}
  comps.forEach((c) => {
    compNames[c._id.toString()] = { name: c.name, category: c.category }
  })

  const result = Object.entries(compGapAcc)
    .map(([cid, acc]) => ({
      competencyId: cid,
      name: compNames[cid]?.name ?? 'Unknown',
      category: compNames[cid]?.category ?? 'Statistical',
      avgGap: Math.round((acc.sumGap / acc.count) * 100) / 100,
      requiredLevel: acc.requiredLevel,
      affectedUsers: acc.affectedUsers,
      affectedCount: acc.affectedUsers,
    }))
    .filter((r) => r.avgGap > 0)
    .sort((a, b) => b.avgGap - a.avgGap)
    .slice(0, limit)

  return result
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * getTrainingEffectiveness
 * For each quiz that has at least one attempt, returns:
 *   - quiz title, source (igot/nssta via tagCompetencyIds → course lookup)
 *   - attempt count, average score, pass rate (≥ 60%)
 *
 * Matching logic: we join Quiz → QuizAttempt directly (most reliable link).
 * Associating quizzes back to specific courses requires matching on
 * tagCompetencyIds — documented below as best-effort.
 */
async function getTrainingEffectiveness() {
  const Quiz = require('../models/Quiz')

  const results = await QuizAttempt.aggregate([
    {
      $group: {
        _id:         '$quizId',
        attemptCount: { $sum: 1 },
        avgScore:    { $avg: '$score' },
        passCount:   { $sum: { $cond: [{ $gte: ['$score', 60] }, 1, 0] } },
      },
    },
    {
      $lookup: {
        from:         'quizzes',
        localField:   '_id',
        foreignField: '_id',
        as:           'quiz',
      },
    },
    { $unwind: { path: '$quiz', preserveNullAndEmptyArrays: false } },
    {
      $project: {
        title:        '$quiz.title',
        tagCompetencyIds: '$quiz.tagCompetencyIds',
        attemptCount: 1,
        avgScore:     { $round: ['$avgScore', 1] },
        passRate:     {
          $round: [{ $multiply: [{ $divide: ['$passCount', '$attemptCount'] }, 100] }, 1],
        },
      },
    },
    { $sort: { avgScore: -1 } },
  ])

  // Best-effort: find courses whose skillTags overlap with quiz tagCompetencyIds.
  // This is approximate — a quiz may not be tied to any course in the catalogue.
  // Logged as "best-effort" per the requirements.
  for (const r of results) {
    if (r.tagCompetencyIds?.length) {
      const course = await Course.findOne({ skillTags: { $in: r.tagCompetencyIds } })
        .select('title source')
        .lean()
      r.linkedCourseTitle  = course?.title ?? null
      r.linkedCourseSource = course?.source ?? null
    } else {
      r.linkedCourseTitle  = null
      r.linkedCourseSource = null
    }
  }

  return results
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * getSkillDemandTrend
 * Pulls UserCompetency lastUpdated timestamps for a given competency
 * over the trailing `months` months, buckets by month, and projects
 * the next 2 months using OLS linear regression.
 *
 * "Demand" proxy: average competency level across all users who have
 * been assessed on this competency in a given month.
 * A rising average level across the org signals growing capability
 * (and implicitly, growing training investment/demand).
 */
async function getSkillDemandTrend(competencyId, months = 6) {
  if (!competencyId || !mongoose.Types.ObjectId.isValid(String(competencyId))) {
    return { historical: [], projected: [] }
  }

  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)

  const compObjectId = new mongoose.Types.ObjectId(String(competencyId))
  const records = await UserCompetency.find({
    $and: [
      {
        $or: [
          { competency_id: compObjectId },
          { competencyId: compObjectId },
        ],
      },
      {
        $or: [
          { last_assessed_at: { $gte: cutoff } },
          { createdAt: { $gte: cutoff } },
          { updatedAt: { $gte: cutoff } },
        ],
      },
    ],
  }).select('current_level currentLevel last_assessed_at createdAt updatedAt').lean()

  // Bucket by YYYY-MM
  const buckets = {}
  for (const r of records) {
    const dateVal = r.last_assessed_at || r.createdAt || r.updatedAt
    if (!dateVal) continue
    const label = toMonthLabel(dateVal)
    const level = r.current_level ?? r.currentLevel ?? 1
    if (!buckets[label]) buckets[label] = { sum: 0, count: 0 }
    buckets[label].sum   += level
    buckets[label].count += 1
  }

  // Build chronologically sorted historical array
  const historical = Object.entries(buckets)
    .map(([month, b]) => ({ month, avgLevel: Math.round((b.sum / b.count) * 100) / 100 }))
    .sort((a, b) => a.month.localeCompare(b.month))

  if (!historical.length) return { historical: [], projected: [] }

  // Build regression input: x = 0…N-1 (month index), y = avgLevel
  const points = historical.map((h, i) => ({ x: i, y: h.avgLevel }))
  const { slope, intercept } = computeLinearTrend(points)

  // Project next 2 months from the last historical month
  const lastDate  = new Date(historical[historical.length - 1].month + '-01')
  const projected = []
  for (let i = 1; i <= 2; i++) {
    const projDate = new Date(lastDate)
    projDate.setMonth(projDate.getMonth() + i)
    const x = points.length - 1 + i
    const projLevel = Math.max(1, Math.min(5, slope * x + intercept))
    projected.push({
      month:    toMonthLabel(projDate),
      avgLevel: Math.round(projLevel * 100) / 100,
    })
  }

  return { historical, projected }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * getOrgSummaryStats
 * Lightweight stats snapshot for the top summary cards.
 * Uses modern User.role_id, Role, and RoleCompetency relationships.
 */
async function getOrgSummaryStats() {
  const [totalOfficials, departments, userComps, coursesThisMonth] = await Promise.all([
    User.countDocuments({ isActive: true }),

    User.distinct('department', { isActive: true, department: { $exists: true, $ne: '' } }),

    // All active users' competency levels + their authoritative role requirements
    // for computing overall readiness %
    (async () => {
      // 1. Fetch active users who have an assigned professional role_id
      const users = await User.find({ isActive: true, role_id: { $ne: null } })
        .select('_id role_id')
        .lean()

      // Also support legacy users who only have jobRoleId (defensive)
      const legacyUsers = await User.find({ isActive: true, role_id: null, jobRoleId: { $ne: null } })
        .select('_id jobRoleId')
        .lean()

      if (!users.length && !legacyUsers.length) return { sumCurrent: 0, sumRequired: 0 }

      // 2. Fetch authoritative RoleCompetency for modern roles
      const rawRoleIds = [...new Set(users.map((u) => u.role_id?.toString()).filter(Boolean))]
      const validRoleObjectIds = rawRoleIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id))

      const roleCompetencies = validRoleObjectIds.length > 0
        ? await RoleCompetency.find({ role_id: { $in: validRoleObjectIds } }).lean()
        : []

      const roleMap = new Map() // roleId -> Map(compId -> requiredLevel)
      for (const rc of roleCompetencies) {
        const rId = (rc.role_id?._id || rc.role_id)?.toString()
        const cId = (rc.competency_id?._id || rc.competency_id)?.toString()
        if (!rId || !cId) continue
        if (!roleMap.has(rId)) roleMap.set(rId, new Map())
        roleMap.get(rId).set(cId, rc.required_level || 3)
      }

      // 3. Fetch UserCompetencies for all relevant users
      const allUserIds = [...users.map((u) => u._id), ...legacyUsers.map((u) => u._id)]
      const ucAll = await UserCompetency.find({
        $or: [
          { user_id: { $in: allUserIds } },
          { userId: { $in: allUserIds } },
        ],
      }).lean()

      const ucMap = new Map() // userId -> Map(compId -> currentLevel)
      for (const uc of ucAll) {
        const uId = (uc.user_id || uc.userId)?.toString()
        const cId = (uc.competency_id?._id || uc.competency_id || uc.competencyId)?.toString()
        if (!uId || !cId) continue
        const lvl = uc.current_level ?? uc.currentLevel ?? 1
        if (!ucMap.has(uId)) ucMap.set(uId, new Map())
        ucMap.get(uId).set(cId, lvl)
      }

      let sumCurrent = 0
      let sumRequired = 0

      // Compute readiness across modern roles
      for (const user of users) {
        const rId = user.role_id?.toString()
        const reqComps = roleMap.get(rId)
        if (!reqComps || reqComps.size === 0) continue

        const userLevels = ucMap.get(user._id.toString())
        for (const [cId, reqLevel] of reqComps.entries()) {
          const current = userLevels && userLevels.has(cId) ? userLevels.get(cId) : 1
          sumCurrent += Math.min(current, reqLevel)
          sumRequired += reqLevel
        }
      }

      // Compute readiness across legacy job roles if present
      if (legacyUsers.length > 0) {
        const jobRoles = await JobRole.find({}).lean()
        const jobRoleMap = new Map()
        jobRoles.forEach((jr) => jobRoleMap.set(jr._id.toString(), jr.requiredCompetencies || []))

        for (const user of legacyUsers) {
          const reqComps = jobRoleMap.get(user.jobRoleId?.toString()) || []
          const userLevels = ucMap.get(user._id.toString())
          for (const rc of reqComps) {
            const cId = rc.competencyId ? rc.competencyId.toString() : String(rc)
            const reqLevel = rc.requiredLevel || 3
            const current = userLevels && userLevels.has(cId) ? userLevels.get(cId) : 1
            sumCurrent += Math.min(current, reqLevel)
            sumRequired += reqLevel
          }
        }
      }

      return { sumCurrent, sumRequired }
    })(),

    // Courses completed this calendar month (quiz attempts as proxy)
    QuizAttempt.countDocuments({
      attemptedAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    }),
  ])

  const { sumCurrent, sumRequired } = userComps
  const avgReadinessPct = sumRequired > 0
    ? Math.round((sumCurrent / sumRequired) * 100)
    : 0

  return {
    totalOfficials,
    totalDepartments: departments.length,
    avgReadinessPct,
    quizAttemptsThisMonth: coursesThisMonth,
  }
}

module.exports = {
  getDepartmentCompetencyHeatmap,
  getOrgWideTopGaps,
  getTrainingEffectiveness,
  getSkillDemandTrend,
  getOrgSummaryStats,
}
