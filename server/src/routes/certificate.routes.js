'use strict'

const { Router } = require('express')
const rateLimit = require('express-rate-limit')
const { verifyCertificate } = require('../controllers/certificate.controller')

const router = Router()

// Rate limiter for public verification endpoint (30 calls per minute per IP)
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    valid: false,
    status: 'rate_limited',
    message: 'Too many verification attempts. Please try again later.',
  },
})

// ── Public Certificate Verification (Unauthenticated) ────────────────────────
router.get('/certificates/verify/:certificateId', verifyLimiter, verifyCertificate)

module.exports = router
