const crypto = require('crypto')
const Quiz = require('../models/Quiz')
const Question = require('../models/Question')
const QuizAttempt = require('../models/QuizAttempt')
const Notification = require('../models/Notification')
const Certificate = require('../models/Certificate')
const { scoreAttempt } = require('../services/quizScoring.service')
const { applyCompetencyUpdates } = require('../services/competencyUpdate.service')

async function submitAttempt(req, res, next) {
  try {
    const { answers } = req.body

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: 'answers must be a non-empty array.' })
    }

    // ── 1. Fetch quiz with populated questions ────────────────────────────────
    const quiz = await Quiz.findById(req.params.id)
      .populate('questionIds')
      .populate('tagCompetencyIds', '_id name')
      .lean()

    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' })

    // ── 2. Validate every submitted questionId belongs to this quiz ───────────
    const validQuestionIds = new Set(quiz.questionIds.map((q) => q._id.toString()))
    const invalidAnswer = answers.find((a) => !validQuestionIds.has(a.questionId?.toString()))
    if (invalidAnswer) {
      return res.status(400).json({
        message: `Question ${invalidAnswer.questionId} does not belong to quiz ${quiz._id}.`,
      })
    }

    // Validate selectedOptionIndex values
    for (const a of answers) {
      if (typeof a.selectedOptionIndex !== 'number' || ![0,1,2,3].includes(a.selectedOptionIndex)) {
        return res.status(400).json({
          message: `Invalid selectedOptionIndex for question ${a.questionId}. Must be 0, 1, 2, or 3.`,
        })
      }
    }

    // ── 3. Score the attempt ──────────────────────────────────────────────────
    const { score, correctCount, totalQuestions, perQuestionResult } = scoreAttempt(
      quiz.questionIds,
      answers
    )

    // ── 4. Apply competency updates ───────────────────────────────────────────
    const attemptedAt = new Date()
    const tagIds = quiz.tagCompetencyIds?.map((c) => c._id) ?? []
    const competencyUpdates = await applyCompetencyUpdates(
      req.user.id,
      tagIds,
      score,
      attemptedAt
    )

    // ── 5. Persist attempt ────────────────────────────────────────────────────
    await QuizAttempt.create({
      userId: req.user.id,
      quizId: quiz._id,
      answers,
      score,
      correctCount,
      totalQuestions,
      competencyUpdates,
      attemptedAt,
    })

    // ── Create real notifications ─────────────────────────────────────────────
    Notification.create({
      userId: req.user.id,
      type: 'quiz_scored',
      message: `You scored ${score}% (${correctCount}/${totalQuestions}) on assessment: ${quiz.title}.`,
      relatedId: quiz._id.toString(),
    }).catch(() => {})

    const levelUps = (competencyUpdates || []).filter((u) => u.newLevel > u.previousLevel)
    for (const u of levelUps) {
      Notification.create({
        userId: req.user.id,
        type: 'competency_levelup',
        message: `Competency Level Up! Increased to Level ${u.newLevel} based on recent assessment evaluation.`,
        relatedId: u.competencyId?.toString(),
      }).catch(() => {})
    }

    // ── Issue real Certificate if passed (score >= 70) ────────────────────────
    if (score >= 70) {
      const certId = `MOSPI-CERT-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
      Certificate.create({
        userId: req.user.id,
        quizId: quiz._id,
        title: `${quiz.title} Mastery`,
        score,
        issuedAt: attemptedAt,
        certificateId: certId,
      }).catch(() => {})
    }

    // ── 6. Return feedback ────────────────────────────────────────────────────
    res.json({
      score,
      correctCount,
      totalQuestions,
      perQuestionResult,
      competencyUpdates,
    })
  } catch (err) {
    next(err)
  }
}

async function listMyAttempts(req, res, next) {
  try {
    const attempts = await QuizAttempt.find({ userId: req.user.id })
      .populate('quizId', 'title questionCount')
      .sort({ attemptedAt: -1 })
      .lean()

    res.json({ attempts })
  } catch (err) {
    next(err)
  }
}

async function getQuizStats(req, res, next) {
  try {
    const quiz = await Quiz.findById(req.params.id).lean()
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' })

    // Quiz creator, trainer, or admin can view aggregate stats
    const isCreator = quiz.createdBy && quiz.createdBy.toString() === req.user.id
    const isAdmin = req.user.role === 'admin'
    const isTrainer = req.user.role === 'trainer'
    if (!isCreator && !isAdmin && !isTrainer) {
      return res.status(403).json({ message: 'Access denied. Stats are visible to faculty, trainers, and admins only.' })
    }

    const attempts = await QuizAttempt.find({ quizId: quiz._id }).lean()
    if (attempts.length === 0) {
      return res.json({ attemptCount: 0, averageScore: null, perQuestionCorrectRate: [] })
    }

    const averageScore = Math.round(
      (attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length) * 10
    ) / 10

    // Per-question correct rate
    const questionTallies = new Map() // questionId -> { correct, total }
    for (const attempt of attempts) {
      for (const ans of attempt.answers) {
        const qId = ans.questionId.toString()
        const question = await Question.findById(qId).lean()
        if (!question) continue
        if (!questionTallies.has(qId)) questionTallies.set(qId, { correct: 0, total: 0 })
        const tally = questionTallies.get(qId)
        tally.total += 1
        if (ans.selectedOptionIndex === question.correctOptionIndex) tally.correct += 1
      }
    }

    const perQuestionCorrectRate = Array.from(questionTallies.entries()).map(([qId, t]) => ({
      questionId: qId,
      correctRate: Math.round((t.correct / t.total) * 100),
      totalAttempts: t.total,
    }))

    res.json({ attemptCount: attempts.length, averageScore, perQuestionCorrectRate })
  } catch (err) {
    next(err)
  }
}

module.exports = { submitAttempt, listMyAttempts, getQuizStats }
