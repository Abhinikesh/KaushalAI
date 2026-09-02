'use strict'

const { Router } = require('express')
const { authenticate, authorize } = require('../middleware/auth.middleware')
const {
  summary, heatmap, topGaps, trainingEffectiveness, skillTrend,
  addOfficer, bulkUploadRoster, listRoster, deleteRosterEntry,
} = require('../controllers/admin.controller')

const router = Router()

// All admin routes require authentication + admin role
router.use(authenticate, authorize(['admin']))

// ── Analytics ─────────────────────────────────────────────────────────────────
router.get('/admin/summary',                   summary)
router.get('/admin/heatmap',                   heatmap)
router.get('/admin/top-gaps',                  topGaps)
router.get('/admin/training-effectiveness',    trainingEffectiveness)
router.get('/admin/skill-trend/:competencyId', skillTrend)

// ── Officer roster management ─────────────────────────────────────────────────
router.get   ('/admin/roster',             listRoster)
router.post  ('/admin/roster',             addOfficer)
router.post  ('/admin/roster/bulk-upload', bulkUploadRoster)
router.delete('/admin/roster/:id',         deleteRosterEntry)

module.exports = router
