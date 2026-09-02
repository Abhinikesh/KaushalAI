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
  // Step 1: pull all users with their department
  const users = await User.find({ isActive: true, department: { $exists: true, $ne: '' } })
    .select('_id department')
    .lean()

  if (!users.length) return { departments: [], categories: [], cells: {} }

  const userMap = {}   // userId -> department
  users.forEach((u) => { userMap[u._id.toString()] = u.department })
  const userIds = users.map((u) => u._id)

  // Step 2: aggregate UserCompetency grouped by userId + competencyId
  const ucAgg = await UserCompetency.aggregate([
    { $match: { userId: { $in: userIds } } },
    {
      $lookup: {
        from: 'competencies',
        localField: 'competencyId',
        foreignField: '_id',
        as: 'comp',
      },
    },
    { $unwind: '$comp' },
    {
      $project: {
        userId: 1,
        currentLevel: 1,
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
    const dept = userMap[row.userId.toString()]
    if (!dept) continue
    const cat  = row.category
    deptSet.add(dept)
    catSet.add(cat)
    const key = `${dept}::${cat}`
    if (!cellAcc[key]) cellAcc[key] = { sum: 0, count: 0, byComp: {} }
    cellAcc[key].sum   += row.currentLevel
    cellAcc[key].count += 1
    const bc = cellAcc[key].byComp
    if (!bc[row.competencyName]) bc[row.competencyName] = { sum: 0, count: 0 }
    bc[row.competencyName].sum   += row.currentLevel
    bc[row.competencyName].count += 1
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
 * For each competency that is required by at least one job role, compute the
 * average gap (required - current) across all users whose job role requires it.
 * Returns the top `limit` competencies by avg gap descending.
 */
async function getOrgWideTopGaps(limit = 10) {
  // Fetch all job roles with their required competencies
  const jobRoles = await JobRole.find({}).lean()

  // Build map: competencyId -> requiredLevel (from role with highest requirement — conservative)
  // Also map userId -> requiredLevel for their specific role
  const users = await User.find({ isActive: true, jobRoleId: { $ne: null } })
    .select('_id jobRoleId')
    .lean()

  if (!users.length) return []

  const roleMap = {}   // roleId -> requiredCompetencies array
  jobRoles.forEach((r) => { roleMap[r._id.toString()] = r.requiredCompetencies })

  // competencyId -> { sumGap, count, requiredLevel }
  const gapAcc = {}

  for (const user of users) {
    const reqComps = roleMap[user.jobRoleId?.toString()] ?? []
    for (const rc of reqComps) {
      const cid = rc.competencyId.toString()
      if (!gapAcc[cid]) gapAcc[cid] = { sumRequired: 0, count: 0 }
      gapAcc[cid].sumRequired += rc.requiredLevel
      gapAcc[cid].count       += 1
    }
  }

  // Fetch actual user competency levels
  const userIds = users.map((u) => u._id)
  const ucRecords = await UserCompetency.find({ userId: { $in: userIds } }).lean()

  // For each user+competency pair, compute gap vs their role's requirement
  const compGapAcc = {}   // competencyId -> { sumGap, pairs }

  for (const user of users) {
    const reqComps = roleMap[user.jobRoleId?.toString()] ?? []
    if (!reqComps.length) continue
    const userUC = ucRecords.filter((uc) => uc.userId.toString() === user._id.toString())
    const ucLevelMap = {}
    userUC.forEach((uc) => { ucLevelMap[uc.competencyId.toString()] = uc.currentLevel })

    for (const rc of reqComps) {
      const cid = rc.competencyId.toString()
      const current = ucLevelMap[cid] ?? 1
      const gap = Math.max(0, rc.requiredLevel - current)
      if (!compGapAcc[cid]) compGapAcc[cid] = { sumGap: 0, pairs: 0, requiredLevel: rc.requiredLevel }
      compGapAcc[cid].sumGap      += gap
      compGapAcc[cid].pairs       += 1
      compGapAcc[cid].requiredLevel = Math.max(compGapAcc[cid].requiredLevel, rc.requiredLevel)
    }
  }

  // Fetch competency names
  const compIds   = Object.keys(compGapAcc).filter((id) => mongoose.Types.ObjectId.isValid(id))
  const comps     = await Competency.find({ _id: { $in: compIds } }).select('name category').lean()
  const compNames = {}
  comps.forEach((c) => { compNames[c._id.toString()] = { name: c.name, category: c.category } })

  const result = Object.entries(compGapAcc)
    .map(([cid, acc]) => ({
      competencyId:   cid,
      name:           compNames[cid]?.name ?? 'Unknown',
      category:       compNames[cid]?.category ?? 'statistical',
      avgGap:         Math.round((acc.sumGap / acc.pairs) * 100) / 100,
      requiredLevel:  acc.requiredLevel,
      affectedUsers:  acc.pairs,
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
    { $unwind: { path: '$quiz', preserveNullAndEmpty: false } },
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
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)

  const records = await UserCompetency.find({
    competencyId: new mongoose.Types.ObjectId(competencyId),
    lastUpdated: { $gte: cutoff },
  }).select('currentLevel lastUpdated').lean()

  // Bucket by YYYY-MM
  const buckets = {}
  for (const r of records) {
    const label = toMonthLabel(r.lastUpdated)
    if (!buckets[label]) buckets[label] = { sum: 0, count: 0 }
    buckets[label].sum   += r.currentLevel
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
 */
async function getOrgSummaryStats() {
  const [totalOfficials, departments, userComps, coursesThisMonth] = await Promise.all([
    User.countDocuments({ isActive: true }),

    User.distinct('department', { isActive: true, department: { $exists: true, $ne: '' } }),

    // All active users' competency levels + their job role requirements
    // for computing overall readiness %
    (async () => {
      const users = await User.find({ isActive: true, jobRoleId: { $ne: null } })
        .select('_id jobRoleId').lean()
      if (!users.length) return { sumCurrent: 0, sumRequired: 0 }

      const jobRoles  = await JobRole.find({}).lean()
      const roleMap   = {}
      jobRoles.forEach((r) => { roleMap[r._id.toString()] = r.requiredCompetencies })

      const userIds  = users.map((u) => u._id)
      const ucAll    = await UserCompetency.find({ userId: { $in: userIds } }).lean()
      const ucMap    = {}
      ucAll.forEach((uc) => {
        const uid = uc.userId.toString()
        if (!ucMap[uid]) ucMap[uid] = {}
        ucMap[uid][uc.competencyId.toString()] = uc.currentLevel
      })

      let sumCurrent = 0, sumRequired = 0
      for (const user of users) {
        const reqComps = roleMap[user.jobRoleId?.toString()] ?? []
        const userLevels = ucMap[user._id.toString()] ?? {}
        for (const rc of reqComps) {
          const cid     = rc.competencyId.toString()
          sumCurrent   += userLevels[cid] ?? 1
          sumRequired  += rc.requiredLevel
        }
      }
      return { sumCurrent, sumRequired }
    })(),

    // Courses completed this calendar month (quiz attempts as proxy, since Enrollment model may not track completions yet)
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
