'use strict'

const { Router } = require('express')
const { authenticate, authorize } = require('../middleware/auth.middleware')
const {
  summary, heatmap, topGaps, trainingEffectiveness, skillTrend,
  addOfficer, bulkUploadRoster, listRoster, getOfficer, deleteRosterEntry,
  listAuditLogs, listMaterials, departmentsSummary, rolesSummary,
  getComposedOfficerProfile, questionsSummary, getTrainerSummary,
  getSystemSettings, updateSystemSettings, clearCache,
  listUsers, getUser, updateUser, listCadreRoles,
} = require('../controllers/admin.controller')

const router = Router()

// ── All /admin/* routes require authentication and admin role ─────────────────
// Guards are applied explicitly on every route for defense-in-depth.
// The router.use below acts as a secondary catch-all for any future routes
// registered without explicit middleware.
router.use('/admin', authenticate, authorize(['admin']))

// ── Analytics & Reporting ─────────────────────────────────────────────────────
router.get('/admin/training-effectiveness', authenticate, authorize('admin'), trainingEffectiveness)
router.get('/admin/summary', authenticate, authorize('admin'), summary)
router.get('/admin/materials', authenticate, authorize('admin'), listMaterials)
router.get('/admin/questions-summary', authenticate, authorize('admin'), questionsSummary)
router.get('/admin/officers/:id', authenticate, authorize('admin'), getComposedOfficerProfile)
router.get('/admin/heatmap', authenticate, authorize('admin'), heatmap)
router.get('/admin/top-gaps', authenticate, authorize('admin'), topGaps)
router.get('/admin/skill-trend/:competencyId', authenticate, authorize('admin'), skillTrend)
router.get('/admin/departments-summary', authenticate, authorize('admin'), departmentsSummary)
router.get('/admin/roles-summary', authenticate, authorize('admin'), rolesSummary)

// ── Trainer Analytics ─────────────────────────────────────────────────────────
router.get('/trainer/summary', authenticate, authorize('admin'), getTrainerSummary)

// ── Roster Management ─────────────────────────────────────────────────────────
router.get('/admin/roster', authenticate, authorize('admin'), listRoster)
router.get('/admin/roster/:id', authenticate, authorize('admin'), getOfficer)
router.post('/admin/roster', authenticate, authorize('admin'), addOfficer)
router.post('/admin/roster/bulk-upload', authenticate, authorize('admin'), bulkUploadRoster)
router.delete('/admin/roster/:id', authenticate, authorize('admin'), deleteRosterEntry)

// ── Platform System Settings & Cache ──────────────────────────────────────────
router.get('/admin/system-settings', authenticate, authorize('admin'), getSystemSettings)
router.put('/admin/system-settings', authenticate, authorize('admin'), updateSystemSettings)
router.post('/admin/clear-cache', authenticate, authorize('admin'), clearCache)

// ── Security & Audit Logs ─────────────────────────────────────────────────────
router.get('/admin/audit-logs', authenticate, authorize('admin'), listAuditLogs)

// ── User Management ───────────────────────────────────────────────────────────
router.get('/admin/users', authenticate, authorize('admin'), listUsers)
router.get('/admin/users/:id', authenticate, authorize('admin'), getUser)
router.put('/admin/users/:id', authenticate, authorize('admin'), updateUser)
router.get('/admin/roles', authenticate, authorize('admin'), listCadreRoles)

// ── Manual Database Seeding Trigger (admin-only, never unauthenticated) ───────
router.post('/admin/seed', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const masterSeed = require('../seed/masterSeed')
    await masterSeed()
    res.json({ success: true, message: 'Master database seed executed successfully.' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
