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
const AuditLog          = require('../models/AuditLog')
const UploadedMaterial  = require('../models/UploadedMaterial')
const User              = require('../models/User')
const UserCompetency    = require('../models/UserCompetency')
const Enrollment        = require('../models/Enrollment')
const QuizAttempt       = require('../models/QuizAttempt')
const Quiz              = require('../models/Quiz')
const Question          = require('../models/Question')

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
      ;[competencies, enrollments, attempts] = await Promise.all([
        UserCompetency.find({ userId }).populate('competencyId', 'name category description code').lean(),
        Enrollment.find({ userId }).populate('courseId', 'title durationHours source difficulty').lean(),
        QuizAttempt.find({ userId }).populate('quizId', 'title').sort({ createdAt: -1 }).lean(),
      ])
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

// Extend exports with roster handlers & Group 2 features
Object.assign(module.exports, {
  addOfficer, bulkUploadRoster, listRoster, getOfficer, deleteRosterEntry,
  listAuditLogs, listMaterials, departmentsSummary, rolesSummary,
  getComposedOfficerProfile, questionsSummary, getTrainerSummary,
})
