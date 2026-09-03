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
const AuthorizedOfficer = require('../models/AuthorizedOfficer')
const JobRole           = require('../models/JobRole')
const AuditLog          = require('../models/AuditLog')

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

// Extend exports with roster handlers
Object.assign(module.exports, { addOfficer, bulkUploadRoster, listRoster, getOfficer, deleteRosterEntry, listAuditLogs })
