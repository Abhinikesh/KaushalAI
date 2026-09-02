'use strict'

const { Router } = require('express')
const { authenticate, authorize } = require('../middleware/auth.middleware')
const {
  summary,
  heatmap,
  topGaps,
  trainingEffectiveness,
  skillTrend,
} = require('../controllers/admin.controller')

const router = Router()

// All admin routes require authentication + admin role
router.use(authenticate, authorize(['admin']))

router.get('/admin/summary',              summary)
router.get('/admin/heatmap',              heatmap)
router.get('/admin/top-gaps',             topGaps)
router.get('/admin/training-effectiveness', trainingEffectiveness)
router.get('/admin/skill-trend/:competencyId', skillTrend)

module.exports = router
