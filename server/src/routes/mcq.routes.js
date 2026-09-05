'use strict'

const { Router }        = require('express')
const rateLimit         = require('express-rate-limit')
const { ipKeyGenerator } = require('express-rate-limit')
const { uploadMaterial, getQuiz, listQuizzes, createQuiz } = require('../controllers/mcq.controller')
const { submitAttempt, listMyAttempts, getQuizStats } = require('../controllers/quizAttempt.controller')
const { authenticate, authorize } = require('../middleware/auth.middleware')
const validate = require('../middleware/validate')
const { submitAttemptSchema } = require('../validators/mcq.validators')

const router = Router()

// ── Rate limiter: material upload (LLM-backed — expensive per call) ───────────
// Keyed by userId (req.user.id set by authenticate middleware) rather than IP
// alone, because multiple officials can share the same office/NAT IP address.
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Upload limit reached. You can upload up to 5 documents per 15 minutes.' },
})

// ── Rate limiter: quiz attempt submission (prevent rapid-fire re-submission) ──
const attemptLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute window
  max: 10,               // max 10 submissions per minute per user (generous — stops bots)
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many quiz submissions. Please wait before trying again.' },
})

// ── Material upload (admin only) ─────────────────────────────────────────────
router.post(
  '/materials/upload',
  authenticate,
  authorize('admin'),
  uploadLimiter,
  uploadMaterial
)

// ── Quiz list & creation (authenticated users / admins) ──────────────────────
router.get('/quizzes', authenticate, listQuizzes)
router.post('/quizzes', authenticate, authorize('admin', 'employee'), createQuiz)


// ── Quiz fetch (any authenticated user) ──────────────────────────────────────
router.get('/quizzes/:id', authenticate, getQuiz)

// ── Quiz attempt flow ─────────────────────────────────────────────────────────
router.post(
  '/quizzes/:id/attempts',
  authenticate,
  attemptLimiter,
  validate(submitAttemptSchema),
  submitAttempt
)
router.get('/users/me/quiz-attempts', authenticate, listMyAttempts)

// ── Quiz stats (creator or admin only — enforced in controller) ───────────────
router.get('/quizzes/:id/stats', authenticate, getQuizStats)

module.exports = router
