const { Router } = require('express')
const { uploadMaterial, getQuiz } = require('../controllers/mcq.controller')
const { submitAttempt, listMyAttempts, getQuizStats } = require('../controllers/quizAttempt.controller')
const { authenticate, authorize } = require('../middleware/auth.middleware')

const router = Router()

// ── Material upload (trainer/admin only) ─────────────────────────────────────
// Accepts optional tagCompetencyIds[] in the multipart body alongside the file.
// The mcq.controller reads it and saves it to the Quiz document.
router.post('/materials/upload', authenticate, authorize(['trainer', 'admin']), uploadMaterial)

// ── Quiz fetch (any authenticated user) ──────────────────────────────────────
router.get('/quizzes/:id', authenticate, getQuiz)

// ── Quiz attempt flow ─────────────────────────────────────────────────────────
router.post('/quizzes/:id/attempts', authenticate, submitAttempt)
router.get('/users/me/quiz-attempts', authenticate, listMyAttempts)

// ── Quiz stats (creator or admin only — enforced in controller) ───────────────
router.get('/quizzes/:id/stats', authenticate, getQuizStats)

module.exports = router
