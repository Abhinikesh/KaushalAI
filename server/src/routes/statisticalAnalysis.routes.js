'use strict'

const { Router } = require('express')
const rateLimit = require('express-rate-limit')
const { authenticate } = require('../middleware/auth.middleware')
const {
  analyzeDataset,
  runRegression,
  runHypothesis,
  getSample,
  listExcelSheets,
} = require('../controllers/statisticalAnalysis.controller')

const router = Router()

// Rate limiter for dataset processing (60 calls per minute per user/IP)
const statsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Statistical analysis rate limit reached. Please wait a minute before running more calculations.',
  },
})

// ── Authenticated Statistical Analysis Routes ─────────────────────────────────
router.post('/statistical-analysis/upload',          authenticate, statsLimiter, analyzeDataset)
router.post('/statistical-analysis/sheets',          authenticate, statsLimiter, listExcelSheets)
router.post('/statistical-analysis/regression',      authenticate, statsLimiter, runRegression)
router.post('/statistical-analysis/hypothesis-test', authenticate, statsLimiter, runHypothesis)
router.get('/statistical-analysis/sample',           authenticate, statsLimiter, getSample)

module.exports = router
