'use strict'

const { Router } = require('express')
const { authenticate, authorize } = require('../middleware/auth.middleware')
const {
  summary, heatmap, topGaps, trainingEffectiveness, skillTrend,
  addOfficer, bulkUploadRoster, listRoster, getOfficer, deleteRosterEntry,
  listAuditLogs,
} = require('../controllers/admin.controller')

const router = Router()

// Analytics: admin and trainers can view training effectiveness and summary stats
router.get('/admin/training-effectiveness', authenticate, authorize(['admin', 'trainer']), trainingEffectiveness)
router.get('/admin/summary',                authenticate, authorize(['admin', 'trainer']), summary)

// Administrative management routes require admin role
router.use(authenticate, authorize(['admin']))

router.get('/admin/heatmap',                   heatmap)
router.get('/admin/top-gaps',                  topGaps)
router.get('/admin/skill-trend/:competencyId', skillTrend)

// ── Security & Audit Logs ─────────────────────────────────────────────────────
router.get('/admin/audit-logs',                listAuditLogs)

// ── Officer roster management ─────────────────────────────────────────────────
router.get   ('/admin/roster',             authenticate, authorize(['admin', 'trainer']), listRoster)
router.get   ('/admin/roster/:id',         authenticate, authorize(['admin', 'trainer']), getOfficer)
router.post  ('/admin/roster',             addOfficer)
router.post  ('/admin/roster/bulk-upload', bulkUploadRoster)
router.delete('/admin/roster/:id',         deleteRosterEntry)

module.exports = router
