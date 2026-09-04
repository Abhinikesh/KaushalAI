'use strict'

const { Router } = require('express')
const { authenticate, authorize } = require('../middleware/auth.middleware')
const {
  summary, heatmap, topGaps, trainingEffectiveness, skillTrend,
  addOfficer, bulkUploadRoster, listRoster, getOfficer, deleteRosterEntry,
  listAuditLogs, listMaterials, departmentsSummary, rolesSummary,
  getComposedOfficerProfile, questionsSummary, getTrainerSummary,
  getSystemSettings, updateSystemSettings, clearCache,
} = require('../controllers/admin.controller')

const router = Router()

// Analytics & Trainer endpoints: accessible by admin and trainer
router.get('/admin/training-effectiveness', authenticate, authorize(['admin', 'trainer']), trainingEffectiveness)
router.get('/admin/summary',                authenticate, authorize(['admin', 'trainer']), summary)
router.get('/admin/materials',              authenticate, authorize(['admin', 'trainer']), listMaterials)
router.get('/admin/questions-summary',      authenticate, authorize(['admin', 'trainer']), questionsSummary)
router.get('/admin/officers/:id',           authenticate, authorize(['admin', 'trainer']), getComposedOfficerProfile)
router.get('/trainer/summary',              authenticate, authorize(['admin', 'trainer']), getTrainerSummary)

// Roster reads: admin and trainer
router.get('/admin/roster',                 authenticate, authorize(['admin', 'trainer']), listRoster)
router.get('/admin/roster/:id',             authenticate, authorize(['admin', 'trainer']), getOfficer)

// ── Platform System Settings ──────────────────────────────────────────────────
router.get('/admin/system-settings',           authenticate, getSystemSettings)
router.put('/admin/system-settings',           authenticate, updateSystemSettings)
router.post('/admin/clear-cache',              authenticate, clearCache)

// Administrative management routes require admin role
router.use(authenticate, authorize(['admin']))

router.get('/admin/heatmap',                   heatmap)
router.get('/admin/top-gaps',                  topGaps)
router.get('/admin/skill-trend/:competencyId', skillTrend)
router.get('/admin/departments-summary',       departmentsSummary)
router.get('/admin/roles-summary',             rolesSummary)

// ── Security & Audit Logs ─────────────────────────────────────────────────────
router.get('/admin/audit-logs',                listAuditLogs)

// ── Officer roster management mutations ───────────────────────────────────────
router.post  ('/admin/roster',             addOfficer)
router.post  ('/admin/roster/bulk-upload', bulkUploadRoster)
router.delete('/admin/roster/:id',         deleteRosterEntry)

module.exports = router
