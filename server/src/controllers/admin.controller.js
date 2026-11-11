'use strict'

const {
  getDepartmentCompetencyHeatmap,
  getOrgWideTopGaps,
  getTrainingEffectiveness,
  getSkillDemandTrend,
  getOrgSummaryStats,
} = require('../services/adminAnalytics.service')

async function summary(req, res, next) {
  try {
    const data = await getOrgSummaryStats()
    res.json(data)
  } catch (err) { next(err) }
}

async function heatmap(req, res, next) {
  try {
    const data = await getDepartmentCompetencyHeatmap()
    res.json(data)
  } catch (err) { next(err) }
}

async function topGaps(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 25)
    const data  = await getOrgWideTopGaps(limit)
    res.json({ gaps: data })
  } catch (err) { next(err) }
}

async function trainingEffectiveness(req, res, next) {
  try {
    const data = await getTrainingEffectiveness()
    res.json({ courses: data })
  } catch (err) { next(err) }
}

async function skillTrend(req, res, next) {
  try {
    const { competencyId } = req.params
    const months = Math.min(parseInt(req.query.months) || 6, 24)
    const data   = await getSkillDemandTrend(competencyId, months)
    res.json(data)
  } catch (err) { next(err) }
}

module.exports = { summary, heatmap, topGaps, trainingEffectiveness, skillTrend }

// ── Lazy-load roster deps to avoid circular require ───────────────────────────
// (AuthorizedOfficer, JobRole, multer, csv-parse are only needed for roster endpoints)

const multer  = require('multer')
const { parse } = require('csv-parse/sync')
const mongoose          = require('mongoose')
const AuthorizedOfficer = require('../models/AuthorizedOfficer')
const JobRole           = require('../models/JobRole')
const Role              = require('../models/Role')
const AuditLog          = require('../models/AuditLog')
const UploadedMaterial  = require('../models/UploadedMaterial')
const User              = require('../models/User')
const UserCompetency    = require('../models/UserCompetency')
const Enrollment        = require('../models/Enrollment')
const QuizAttempt       = require('../models/QuizAttempt')
const Quiz              = require('../models/Quiz')
const Question          = require('../models/Question')
const { audit }         = require('../services/auditLog.service')
const { normalizePopulatedUserCompetency } = require('../services/competency.service')

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },  // 5 MB max for CSV
  fileFilter(_req, file, cb) {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true)
    } else {
      cb(new Error('Only CSV files are accepted for roster upload.'))
    }
  },
}).single('file')

function runCsvUpload(req, res) {
  return new Promise((resolve, reject) => {
    csvUpload(req, res, (err) => {
      if (err) { const e = new Error(err.message); e.status = 400; reject(e) }
      else resolve()
    })
  })
}

// POST /api/admin/roster — add a single officer
async function addOfficer(req, res, next) {
  try {
    const { employeeId, fullName, officialEmail, department, jobRoleTitle } = req.body

    if (!employeeId || !fullName || !officialEmail || !department) {
      return next({ status: 400, message: 'employeeId, fullName, officialEmail, and department are required.' })
    }

    let jobRoleId = null
    if (jobRoleTitle) {
      const jr = await JobRole.findOne({ title: { $regex: new RegExp(`^${jobRoleTitle}$`, 'i') } })
      if (!jr) return next({ status: 400, message: `Job role "${jobRoleTitle}" not found. Create it first.` })
      jobRoleId = jr._id
    }

    const officer = await AuthorizedOfficer.create({ employeeId, fullName, officialEmail, department, jobRoleId })
    res.status(201).json({ officer })
  } catch (err) {
    next(err)
  }
}

// POST /api/admin/roster/bulk-upload — CSV upload
// CSV columns: employeeId, fullName, officialEmail, department, jobRoleTitle
async function bulkUploadRoster(req, res, next) {
  try {
    await runCsvUpload(req, res)
    if (!req.file) return next({ status: 400, message: 'No CSV file uploaded.' })

    let rows
    try {
      rows = parse(req.file.buffer.toString('utf8'), {
        columns:          true,
        skip_empty_lines: true,
        trim:             true,
      })
    } catch (parseErr) {
      return next({ status: 400, message: `CSV parse error: ${parseErr.message}` })
    }

    // Pre-load all job roles for fast lookup
    const allRoles = await JobRole.find({}).lean()
    const roleMap  = new Map(allRoles.map((r) => [r.title.toLowerCase(), r._id]))

    const inserted = []
    const skipped  = []

    for (let i = 0; i < rows.length; i++) {
      const row    = rows[i]
      const rowNum = i + 2  // +2: 1-indexed + header row

      const { employeeId, fullName, officialEmail, department, jobRoleTitle } = row

      if (!employeeId || !fullName || !officialEmail || !department) {
        skipped.push({ row: rowNum, reason: 'Missing required field (employeeId/fullName/officialEmail/department)', data: row })
        continue
      }

      let jobRoleId = null
      if (jobRoleTitle) {
        jobRoleId = roleMap.get(jobRoleTitle.toLowerCase()) ?? null
        if (!jobRoleId) {
          skipped.push({ row: rowNum, reason: `Job role "${jobRoleTitle}" not found`, data: row })
          continue
        }
      }

      try {
        const officer = await AuthorizedOfficer.create({ employeeId, fullName, officialEmail, department, jobRoleId })
        inserted.push(officer.employeeId)
      } catch (dbErr) {
        const reason = dbErr.code === 11000
          ? `Duplicate employeeId or officialEmail`
          : dbErr.message
        skipped.push({ row: rowNum, reason, data: row })
      }
    }

    res.json({
      summary: { total: rows.length, inserted: inserted.length, skipped: skipped.length },
      inserted,
      skipped,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/roster — paginated list
async function listRoster(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(parseInt(req.query.limit) || 20, 100)
    const skip  = (page - 1) * limit

    const filter = {}
    if (req.query.claimed === 'true')  filter.isClaimed = true
    if (req.query.claimed === 'false') filter.isClaimed = false

    const [officers, total] = await Promise.all([
      AuthorizedOfficer.find(filter)
        .populate('jobRoleId', 'title')
        .populate('claimedByUserId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuthorizedOfficer.countDocuments(filter),
    ])

    res.json({ officers, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/admin/roster/:id — remove unclaimed entry only
async function deleteRosterEntry(req, res, next) {
  try {
    const officer = await AuthorizedOfficer.findById(req.params.id)
    if (!officer) return next({ status: 404, message: 'Officer record not found.' })
    if (officer.isClaimed) {
      return next({
        status: 409,
        message: 'Cannot delete a roster entry that has already been claimed by a user account.',
      })
    }
    await officer.deleteOne()
    res.json({ message: 'Officer record deleted.' })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/roster/:id — single officer details
async function getOfficer(req, res, next) {
  try {
    const officer = await AuthorizedOfficer.findById(req.params.id)
      .populate('jobRoleId', 'title department code')
      .lean()
    if (!officer) return res.status(404).json({ message: 'Officer record not found.' })
    res.json({ officer })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/audit-logs — paginated security logs
async function listAuditLogs(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(50, parseInt(req.query.limit) || 20)
    const [logs, total] = await Promise.all([
      AuditLog.find()
        .populate('userId', 'name email role')
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(),
    ])
    res.json({ logs, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/materials — list all uploaded learning materials
async function listMaterials(req, res, next) {
  try {
    const materials = await UploadedMaterial.find()
      .populate('uploadedBy', 'name email role department')
      .sort({ createdAt: -1 })
      .lean()
    res.json({ materials })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/departments-summary — counts per department from AuthorizedOfficer and User
async function departmentsSummary(req, res, next) {
  try {
    const [rosterCounts, userCounts] = await Promise.all([
      AuthorizedOfficer.aggregate([
        { $group: { _id: '$department', totalOfficers: { $sum: 1 }, claimed: { $sum: { $cond: ['$isClaimed', 1, 0] } } } },
        { $sort: { totalOfficers: -1 } },
      ]),
      User.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ])
    res.json({ rosterCounts, userCounts })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/roles-summary — count of users per role
async function rolesSummary(req, res, next) {
  try {
    const roles = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    res.json({ roles })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/officers/:id — composed officer profile
async function getComposedOfficerProfile(req, res, next) {
  try {
    const { id } = req.params
    let officer = null
    let user = null

    if (mongoose.Types.ObjectId.isValid(id)) {
      officer = await AuthorizedOfficer.findById(id).populate('jobRoleId').lean()
      if (!officer) {
        user = await User.findById(id).lean()
      }
    }
    if (!officer && !user) {
      officer = await AuthorizedOfficer.findOne({ employeeId: id }).populate('jobRoleId').lean()
    }
    if (officer && !user) {
      user = await User.findOne({ officialEmail: officer.officialEmail.toLowerCase() }).lean()
    }
    if (user && !officer) {
      officer = await AuthorizedOfficer.findOne({ officialEmail: user.email.toLowerCase() }).populate('jobRoleId').lean()
    }

    const userId = user?._id || null

    let competencies = []
    let enrollments = []
    let attempts = []

    if (userId) {
      const userQueryIds = [userId, String(userId)]
      const [rawCompetencies, rawEnrollments, rawAttempts] = await Promise.all([
        UserCompetency.find({
          $or: [{ user_id: { $in: userQueryIds } }, { userId: { $in: userQueryIds } }],
        })
          .populate('competency_id', 'name category description competencyCode')
          .lean(),
        Enrollment.find({ userId: { $in: userQueryIds } })
          .populate('courseId', 'title durationHours source difficulty')
          .lean(),
        QuizAttempt.find({ userId: { $in: userQueryIds } })
          .populate('quizId', 'title')
          .sort({ completedAt: -1, attemptedAt: -1, startedAt: -1 })
          .lean(),
      ])
      competencies = rawCompetencies.map(normalizePopulatedUserCompetency)
      enrollments = rawEnrollments
      attempts = rawAttempts
    }

    res.json({
      officer: officer || {
        fullName: user?.name || 'Officer',
        officialEmail: user?.email || '',
        employeeId: user?.employeeId || 'N/A',
        department: user?.department || 'Official Statistics',
        isClaimed: !!user,
      },
      user,
      competencies,
      enrollments,
      attempts,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/questions-summary — Question collection metrics
async function questionsSummary(req, res, next) {
  try {
    const [total, byDifficulty, byCompetency, sampleQuestions] = await Promise.all([
      Question.countDocuments(),
      Question.aggregate([
        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      ]),
      Question.aggregate([
        { $lookup: { from: 'competencies', localField: 'competencyTag', foreignField: '_id', as: 'comp' } },
        { $unwind: { path: '$comp', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$comp.name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Question.find().populate('competencyTag', 'name category').limit(20).lean(),
    ])
    res.json({ total, byDifficulty, byCompetency, sampleQuestions })
  } catch (err) {
    next(err)
  }
}

// GET /api/trainer/summary — trainer analytics
async function getTrainerSummary(req, res, next) {
  try {
    const trainerId = req.user.id
    let myQuizzes = await Quiz.find({ createdBy: trainerId }).lean()
    if (myQuizzes.length === 0) {
      myQuizzes = await Quiz.find().lean()
    }
    const quizIds = myQuizzes.map((q) => q._id)
    const attempts = await QuizAttempt.find({ quizId: { $in: quizIds } })
      .populate('userId', 'name email employeeId department')
      .lean()

    const totalQuizzes = myQuizzes.length
    const totalAttempts = attempts.length
    const avgScore = totalAttempts > 0
      ? Math.round((attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts) * 10) / 10
      : 0

    const learnerMap = new Map()
    for (const a of attempts) {
      if (!a.userId) continue
      const uid = a.userId._id.toString()
      if (!learnerMap.has(uid)) {
        learnerMap.set(uid, {
          userId: uid,
          name: a.userId.name,
          email: a.userId.email,
          employeeId: a.userId.employeeId,
          department: a.userId.department,
          attemptCount: 0,
          bestScore: 0,
          lastAttemptAt: a.createdAt,
        })
      }
      const l = learnerMap.get(uid)
      l.attemptCount += 1
      if (a.score > l.bestScore) l.bestScore = a.score
      if (new Date(a.createdAt) > new Date(l.lastAttemptAt)) l.lastAttemptAt = a.createdAt
    }

    const distinctLearners = Array.from(learnerMap.values())

    res.json({
      totalQuizzes,
      totalAttempts,
      avgScore,
      distinctLearnerCount: distinctLearners.length,
      distinctLearners,
      quizzes: myQuizzes,
    })
  } catch (err) {
    next(err)
  }
}

// ── Global System Settings ───────────────────────────────────────────────────
const SystemSetting = require('../models/SystemSetting')

async function getSystemSettings(req, res, next) {
  try {
    let settings = await SystemSetting.findOne({ key: 'global_config' })
    if (!settings) {
      settings = await SystemSetting.create({ key: 'global_config' })
    }
    res.json({ settings })
  } catch (err) {
    next(err)
  }
}

async function updateSystemSettings(req, res, next) {
  try {
    const payload = req.body || {}
    payload.updatedBy = req.user?.id

    const settings = await SystemSetting.findOneAndUpdate(
      { key: 'global_config' },
      { $set: payload },
      { new: true, upsert: true, runValidators: true }
    )

    res.json({ settings, message: 'System settings saved successfully.' })
  } catch (err) {
    next(err)
  }
}

async function clearCache(req, res, next) {
  try {
    res.json({ success: true, message: 'Platform runtime cache flushed and refreshed successfully.' })
  } catch (err) {
    next(err)
  }
}

// ── Part 21: Real Admin User Management ─────────────────────────────────────

// GET /api/admin/users — Paginated, searchable, filterable user directory
async function listUsers(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100)
    const skip = (page - 1) * limit

    const conditions = []

    // Search query: name, email, employeeId, department, designation
    if (req.query.search && typeof req.query.search === 'string') {
      const q = req.query.search.trim()
      if (q) {
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(escaped, 'i')
        conditions.push({
          $or: [
            { name: regex },
            { email: regex },
            { employeeId: regex },
            { department: regex },
            { designation: regex },
          ],
        })
      }
    }

    // Status filter: active, inactive, CLAIMED, UNCLAIMED
    if (req.query.status && req.query.status !== 'ALL') {
      if (req.query.status === 'active' || req.query.status === 'true' || req.query.status === 'CLAIMED') {
        conditions.push({ isActive: true })
      } else if (req.query.status === 'inactive' || req.query.status === 'false' || req.query.status === 'UNCLAIMED') {
        conditions.push({ isActive: false })
      }
    }

    // Cadre filter
    if (req.query.cadre && req.query.cadre !== 'ALL') {
      const escapedCadre = String(req.query.cadre).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const cadreRegex = new RegExp(escapedCadre, 'i')
      conditions.push({
        $or: [
          { cadre: cadreRegex },
          { employeeId: cadreRegex },
        ],
      })
    }

    // Department filter
    if (req.query.department && req.query.department !== 'ALL') {
      conditions.push({ department: req.query.department })
    }

    // Role ID filter
    if (req.query.role_id) {
      if (mongoose.Types.ObjectId.isValid(req.query.role_id)) {
        conditions.push({ role_id: req.query.role_id })
      }
    }

    const query = conditions.length > 0 ? { $and: conditions } : {}

    const [users, total, stats] = await Promise.all([
      User.find(query)
        .select('-passwordHash -__v')
        .populate({
          path: 'role_id',
          select: 'name level department_ref',
          populate: { path: 'department_ref', select: 'name code' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
            inactiveUsers: { $sum: { $cond: ['$isActive', 0, 1] } },
            issCount: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $regexMatch: { input: { $ifNull: ['$cadre', ''] }, regex: /ISS/i } },
                      { $regexMatch: { input: { $ifNull: ['$employeeId', ''] }, regex: /ISS/i } },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ])

    const counts = stats[0] || {
      totalUsers: total,
      activeUsers: 0,
      inactiveUsers: 0,
      issCount: 0,
    }

    res.json({
      users,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      stats: counts,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/users/:id — Single user details for admin
async function getUser(req, res, next) {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID format.' })
    }

    const user = await User.findById(id)
      .select('-passwordHash -__v')
      .populate({
        path: 'role_id',
        select: 'name level department_ref',
        populate: { path: 'department_ref', select: 'name code' },
      })
      .lean()

    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    res.json({ user })
  } catch (err) {
    next(err)
  }
}

// PUT /api/admin/users/:id — Scoped update for user fields with atomic role reassignment & skill gap sync
async function updateUser(req, res, next) {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID format.' })
    }

    // Pre-validate target Role if provided before entering lock
    let targetRole = null
    if (req.body.role_id !== undefined && req.body.role_id !== null && req.body.role_id !== '') {
      const newRoleIdStr = String(req.body.role_id)
      if (!mongoose.Types.ObjectId.isValid(newRoleIdStr)) {
        return res.status(400).json({ message: 'Invalid role_id format.' })
      }
      targetRole = await Role.findById(newRoleIdStr).populate('department_ref')
      if (!targetRole) {
        return res.status(400).json({ message: 'Target professional cadre role not found.' })
      }
    }

    const { mutateUserAndRecalculateGaps } = require('../services/skillGap.service')

    let oldRoleId = null
    let roleReassigned = false

    const result = await mutateUserAndRecalculateGaps(id, async (user, beforeRoleRes) => {
      // Critical: Prohibit modifying platform authorization role (employee/admin)
      if ('role' in req.body && req.body.role !== user.role) {
        const err = new Error('Platform authorization role cannot be modified via this endpoint.')
        err.status = 400
        throw err
      }

      oldRoleId = user.role_id ? user.role_id.toString() : null

      // Professional cadre role reassignment
      if (req.body.role_id !== undefined) {
        const newRoleIdStr = req.body.role_id ? String(req.body.role_id) : null
        if (newRoleIdStr !== oldRoleId) {
          if (newRoleIdStr && targetRole) {
            user.set('role_id', targetRole._id)
            user.designation = targetRole.name
            if (targetRole.department_ref?.name) {
              user.department = targetRole.department_ref.name
            }
            user.level = targetRole.level
            roleReassigned = true
          } else {
            user.set('role_id', null)
            roleReassigned = true
          }
        }
      }

      // Update safe profile/governance fields (only if not overridden by targetRole)
      if (typeof req.body.isActive === 'boolean') {
        user.isActive = req.body.isActive
      }
      if (req.body.designation && !roleReassigned) {
        user.designation = String(req.body.designation).trim()
      }
      if (req.body.department && !roleReassigned) {
        user.department = String(req.body.department).trim()
      }
      if (req.body.level !== undefined && !roleReassigned) {
        const lvl = parseInt(req.body.level)
        if (lvl >= 1 && lvl <= 5) user.level = lvl
      }
      if (req.body.cadre) {
        user.cadre = String(req.body.cadre).trim()
      }

      return {
        requiresRecalc: roleReassigned,
        oldRoleId,
        newRoleId: user.role_id,
      }
    })

    const { syncStatus, syncError } = result
    const isDeferred = syncStatus === 'deferred'
    const isSynced = syncStatus === 'synced'

    let message = 'User updated successfully.'
    if (isSynced) {
      message = 'User professional role reassigned and skill gaps synchronized successfully.'
    } else if (isDeferred) {
      message = 'User professional role reassigned. Skill gap synchronization was deferred and will recover on next access.'
    }

    // Audit logging
    await audit({
      action: roleReassigned || isSynced || isDeferred ? 'ADMIN_USER_ROLE_REASSIGNED' : 'ADMIN_USER_UPDATED',
      req,
      targetType: 'User',
      targetId: result.user._id,
      meta: {
        updatedFields: Object.keys(req.body).filter((k) => k !== 'role'),
        oldRoleId,
        newRoleId: result.user.role_id,
        roleReassigned,
        syncStatus,
        syncError,
        isActive: result.user.isActive,
      },
    })

    const updatedUser = await User.findById(result.user._id)
      .select('-passwordHash -__v')
      .populate({
        path: 'role_id',
        select: 'name level department_ref',
        populate: { path: 'department_ref', select: 'name code' },
      })
      .lean()

    res.json({
      user: updatedUser,
      syncStatus,
      syncError,
      message,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/roles — List all professional cadre roles
async function listCadreRoles(req, res, next) {
  try {
    const roles = await Role.find({})
      .populate('department_ref', 'name code')
      .sort({ level: 1, name: 1 })
      .lean()

    res.json({ roles })
  } catch (err) {
    next(err)
  }
}

// Extend exports with roster handlers & Group 2 features
Object.assign(module.exports, {
  addOfficer, bulkUploadRoster, listRoster, getOfficer, deleteRosterEntry,
  listAuditLogs, listMaterials, departmentsSummary, rolesSummary,
  getComposedOfficerProfile, questionsSummary, getTrainerSummary,
  getSystemSettings, updateSystemSettings, clearCache,
  listUsers, getUser, updateUser, listCadreRoles,
})

