const crypto = require('crypto')
const mongoose = require('mongoose')
const Quiz = require('../models/Quiz')
const Question = require('../models/Question')
const QuizAttempt = require('../models/QuizAttempt')
const Notification = require('../models/Notification')
const Certificate = require('../models/Certificate')
const certificateService = require('../services/certificate.service')
const { scoreAttempt } = require('../services/quizScoring.service')
const { applyCompetencyUpdates } = require('../services/competencyUpdate.service')

async function startAttempt(req, res, next) {
  try {
    const quizParamId = req.params.id
    let query = {}
    if (mongoose.Types.ObjectId.isValid(quizParamId)) {
      query = { _id: quizParamId }
    } else {
      query = { $or: [{ materialId: quizParamId }, { customId: quizParamId }, { slug: quizParamId }] }
    }

    let quiz = await Quiz.findOne(query).lean()
    if (!quiz) {
      quiz = await Quiz.findOne({ title: new RegExp(quizParamId.replace(/-/g, ' '), 'i') }).lean()
    }

    const durationMinutes = quiz?.durationMinutes || 20
    const resolvedQuizId = quiz?._id ? String(quiz._id) : quizParamId

    const userQueryIds = [req.user.id]
    if (mongoose.Types.ObjectId.isValid(req.user.id)) {
      userQueryIds.push(new mongoose.Types.ObjectId(req.user.id))
    }

    // Check if user already has an active in-progress attempt for this quiz
    const existing = await QuizAttempt.findOne({
      userId: { $in: userQueryIds },
      quizId: { $in: [quiz?._id, resolvedQuizId, quizParamId].filter(Boolean) },
      status: 'in_progress',
    }).sort({ startedAt: -1 })

    const now = Date.now()

    if (existing) {
      const deadlineMs = existing.deadline
        ? existing.deadline.getTime()
        : (existing.startedAt ? existing.startedAt.getTime() + durationMinutes * 60 * 1000 : now + durationMinutes * 60 * 1000)

      if (now < deadlineMs) {
        // Return existing active attempt with authoritative remaining seconds
        const remainingSeconds = Math.max(0, Math.floor((deadlineMs - now) / 1000))
        return res.json({
          attemptId: existing._id,
          startedAt: existing.startedAt,
          deadline: new Date(deadlineMs),
          durationMinutes,
          remainingSeconds,
          isNew: false,
        })
      } else {
        existing.status = 'expired'
        await existing.save()
        if (req.query.fresh !== 'true') {
          return res.json({
            attemptId: existing._id,
            startedAt: existing.startedAt,
            deadline: new Date(deadlineMs),
            durationMinutes,
            remainingSeconds: 0,
            isExpired: true,
            isNew: false,
          })
        }
      }
    }

    // Start a fresh attempt with authoritative duration (default: 20 minutes / 1200s)
    const startedAt = new Date()
    const deadline = new Date(startedAt.getTime() + durationMinutes * 60 * 1000)

    const newAttempt = await QuizAttempt.create({
      userId: req.user.id,
      quizId: resolvedQuizId,
      quizTitle: quiz?.title || 'Data Analysis with Python & Pandas Assessment',
      domain: quiz?.domain || 'Data Management',
      answers: [],
      score: 0,
      correctCount: 0,
      totalQuestions: quiz?.questionCount || 30,
      durationMinutes,
      startedAt,
      deadline,
      status: 'in_progress',
      attemptedAt: startedAt,
    })

    return res.status(201).json({
      attemptId: newAttempt._id,
      startedAt: newAttempt.startedAt,
      deadline: newAttempt.deadline,
      durationMinutes,
      remainingSeconds: durationMinutes * 60,
      isNew: true,
    })
  } catch (err) {
    next(err)
  }
}

async function submitAttempt(req, res, next) {
  try {
    const { answers, quizTitle: clientQuizTitle, domain: clientDomain, totalQuestions: clientTotal } = req.body

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: 'answers must be a non-empty array.' })
    }

    const quizParamId = req.params.id
    let query = {}
    if (mongoose.Types.ObjectId.isValid(quizParamId)) {
      query = { _id: quizParamId }
    } else {
      query = { $or: [{ materialId: quizParamId }, { customId: quizParamId }, { slug: quizParamId }] }
    }

    // ── 1. Fetch quiz with populated questions ────────────────────────────────
    let quiz = await Quiz.findOne(query)
      .populate('questionIds')
      .populate('tagCompetencyIds', '_id name')
      .lean()

    if (!quiz) {
      // Check if title match exists
      quiz = await Quiz.findOne({ title: new RegExp(quizParamId.replace(/-/g, ' '), 'i') })
        .populate('questionIds')
        .populate('tagCompetencyIds', '_id name')
        .lean()
    }

    // ── 1b. Validate Deadline Against Server Authority ────────────────────────
    const nowTime = Date.now()
    const durationMinutes = quiz?.durationMinutes || 20

    const userQueryIds = [req.user.id]
    if (mongoose.Types.ObjectId.isValid(req.user.id)) {
      userQueryIds.push(new mongoose.Types.ObjectId(req.user.id))
    }

    let activeAttempt = null
    if (req.body.attemptId && mongoose.Types.ObjectId.isValid(req.body.attemptId)) {
      activeAttempt = await QuizAttempt.findOne({ _id: req.body.attemptId, userId: { $in: userQueryIds } })
    }
    if (!activeAttempt) {
      activeAttempt = await QuizAttempt.findOne({
        userId: { $in: userQueryIds },
        quizId: { $in: [quiz?._id, quizParamId].filter(Boolean) },
        status: 'in_progress',
      }).sort({ startedAt: -1 })
    }

    if (activeAttempt && activeAttempt.status === 'completed') {
      return res.status(400).json({
        message: 'This assessment attempt has already been submitted and completed.',
        code: 'ATTEMPT_ALREADY_COMPLETED',
        score: activeAttempt.score,
        passed: activeAttempt.passed,
      })
    }

    const deadlineTime = activeAttempt?.deadline
      ? activeAttempt.deadline.getTime()
      : (activeAttempt?.startedAt
          ? activeAttempt.startedAt.getTime() + durationMinutes * 60 * 1000
          : (req.body.startedAt ? new Date(req.body.startedAt).getTime() + durationMinutes * 60 * 1000 : null))

    // Reject submissions after expiry (with 15s grace period for network transit)
    if (activeAttempt?.status === 'expired' || (deadlineTime && nowTime > deadlineTime + 15000)) {
      if (activeAttempt && activeAttempt.status !== 'expired') {
        activeAttempt.status = 'expired'
        await activeAttempt.save()
      }
      return res.status(400).json({
        message: 'Assessment time limit of 20 minutes has expired. Submissions are no longer accepted.',
        code: 'ASSESSMENT_EXPIRED',
        expired: true,
      })
    }

    // ── 2. Evaluate answers against quiz questions or submitted options ───────
    let score = 0
    let correctCount = 0
    const questionsList = (quiz?.questionIds && quiz.questionIds.length > 0) ? quiz.questionIds : []
    const totalQuestions = questionsList.length > 0 ? questionsList.length : (clientTotal || answers.length)

    const detailedResults = []

    if (questionsList.length > 0) {
      questionsList.forEach((q, idx) => {
        const qIdStr = q._id?.toString() || String(q.id || idx + 1)
        const userAns = answers.find(
          (a) => (a.questionId?.toString?.() || String(a.questionId)) === qIdStr || a.number === idx + 1
        )
        const selectedIdx = typeof userAns?.selectedOptionIndex === 'number' ? userAns.selectedOptionIndex : null
        const isCorrect = selectedIdx === q.correctOptionIndex
        if (isCorrect) correctCount++

        detailedResults.push({
          id: qIdStr,
          number: idx + 1,
          text: q.questionText,
          options: q.options || [],
          correctOption: q.correctOptionIndex,
          userAnswer: selectedIdx,
          isCorrect: Boolean(isCorrect),
          explanation: q.explanation || 'Official statistical standard explanation.',
        })
      })

      score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 1000) / 10 : 0
    } else {
      // Fallback for standalone/direct quizzes
      answers.forEach((ans, idx) => {
        const selectedIdx = typeof ans.selectedOptionIndex === 'number' ? ans.selectedOptionIndex : null
        const correctOpt = typeof ans.correctOptionIndex === 'number' ? ans.correctOptionIndex : 0
        const isCorrect = selectedIdx === correctOpt
        if (isCorrect) correctCount++

        detailedResults.push({
          id: ans.questionId || idx + 1,
          number: idx + 1,
          text: ans.questionText || `Question ${idx + 1}`,
          options: ans.options || [],
          correctOption: correctOpt,
          userAnswer: selectedIdx,
          isCorrect: Boolean(isCorrect),
          explanation: ans.explanation || 'Curriculum assessment item.',
        })
      })
      score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 1000) / 10 : 0
    }

    // ── 3. Apply competency updates if tagged ──────────────────────────────────
    const attemptedAt = new Date()
    const tagIds = quiz?.tagCompetencyIds?.map((c) => c._id) ?? []
    const competencyUpdates = await applyCompetencyUpdates(
      req.user.id,
      tagIds,
      score,
      attemptedAt
    ).catch(() => [])

    // ── 4. Persist attempt ────────────────────────────────────────────────────
    const quizTitle = quiz?.title || clientQuizTitle || 'Official Statistical Assessment'
    const domain = quiz?.domain || clientDomain || 'Data Management'
    const passed = score >= 70

    let savedAttempt
    if (activeAttempt) {
      activeAttempt.quizTitle = quizTitle
      activeAttempt.domain = domain
      activeAttempt.answers = answers
      activeAttempt.score = score
      activeAttempt.correctCount = correctCount
      activeAttempt.totalQuestions = totalQuestions
      activeAttempt.passed = passed
      activeAttempt.detailedResults = detailedResults
      activeAttempt.competencyUpdates = competencyUpdates || []
      activeAttempt.status = 'completed'
      activeAttempt.completedAt = attemptedAt
      activeAttempt.attemptedAt = attemptedAt
      await activeAttempt.save()
      savedAttempt = activeAttempt
    } else {
      savedAttempt = await QuizAttempt.create({
        userId: req.user.id,
        quizId: quiz?._id || quizParamId,
        quizTitle,
        domain,
        answers,
        score,
        correctCount,
        totalQuestions,
        passed,
        detailedResults,
        competencyUpdates: competencyUpdates || [],
        durationMinutes,
        startedAt: attemptedAt,
        deadline: new Date(attemptedAt.getTime() + durationMinutes * 60 * 1000),
        completedAt: attemptedAt,
        status: 'completed',
        attemptedAt,
      })
    }

    // ── 5a. Quiz-scored notification ─────────────────────────────────────────
    Notification.create({
      userId: req.user.id,
      type: 'quiz_scored',
      message: `You scored ${score}% (${correctCount}/${totalQuestions}) on assessment: ${quizTitle}.`,
      relatedId: String(quiz?._id || savedAttempt._id),
    }).catch(() => {})

    // ── 5b. Competency level-up notifications ────────────────────────────────
    const levelUps = (competencyUpdates || []).filter((u) => u.newLevel > u.previousLevel)
    for (const u of levelUps) {
      Notification.create({
        userId: req.user.id,
        type: 'competency_levelup',
        message: `Competency Level Up! Increased to Level ${u.newLevel} based on recent assessment evaluation.`,
        relatedId: u.competencyId?.toString(),
      }).catch(() => {})
    }

    // ── 5c. Issue certificate if passed (score >= 70) ────────────────────────
    if (passed && quiz?._id) {
      try {
        await certificateService.issueAssessmentCertificate(req.user.id, quiz._id, { attemptId: savedAttempt._id })
      } catch (certErr) {
        console.error('[QuizAttempt] Certificate issuance failed:', certErr.message)
      }
    }

    // ── 6. Return unified feedback ────────────────────────────────────────────
    return res.status(201).json({
      attempt: savedAttempt,
      score,
      correctCount,
      totalQuestions,
      passed,
      detailedResults,
      competencyUpdates: competencyUpdates || [],
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

    // Quiz creator or admin can view aggregate stats
    const isCreator = quiz.createdBy && quiz.createdBy.toString() === req.user.id
    const isAdmin = req.user.role === 'admin'
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'Access denied. Stats are visible to faculty and administrators only.' })
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

module.exports = { startAttempt, submitAttempt, listMyAttempts, getQuizStats }
