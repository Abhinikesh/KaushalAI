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

// Analytics & Management endpoints: accessible by admin
router.get('/admin/training-effectiveness', authenticate, authorize('admin'), trainingEffectiveness)
router.get('/admin/summary',                authenticate, authorize('admin'), summary)
router.get('/admin/materials',              authenticate, authorize('admin'), listMaterials)
router.get('/admin/questions-summary',      authenticate, authorize('admin'), questionsSummary)
router.get('/admin/officers/:id',           authenticate, authorize('admin'), getComposedOfficerProfile)
router.get('/trainer/summary',              authenticate, authorize('admin'), getTrainerSummary)

// Roster reads: admin
router.get('/admin/roster',                 authenticate, authorize('admin'), listRoster)
router.get('/admin/roster/:id',             authenticate, authorize('admin'), getOfficer)

// ── Platform System Settings ──────────────────────────────────────────────────
router.get('/admin/system-settings',           authenticate, getSystemSettings)
router.put('/admin/system-settings',           authenticate, updateSystemSettings)
router.post('/admin/clear-cache',              authenticate, clearCache)

// Administrative management routes require admin role
router.use('/admin', authenticate, authorize(['admin']))

router.get('/admin/heatmap',                   heatmap)
router.get('/admin/top-gaps',                  topGaps)
router.get('/admin/skill-trend/:competencyId', skillTrend)
router.get('/admin/departments-summary',       departmentsSummary)
router.get('/admin/roles-summary',             rolesSummary)

// ── Security & Audit Logs ─────────────────────────────────────────────────────
router.get('/admin/audit-logs',                listAuditLogs)

router.post  ('/admin/roster',             addOfficer)
router.post  ('/admin/roster/bulk-upload', bulkUploadRoster)
router.delete('/admin/roster/:id',         deleteRosterEntry)

// ── Manual Database Seeding Trigger ──────────────────────────────────────────
router.post('/admin/seed', async (req, res, next) => {
  try {
    const masterSeed = require('../seed/masterSeed')
    await masterSeed()
    res.json({ success: true, message: 'Master database seed executed successfully.' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
