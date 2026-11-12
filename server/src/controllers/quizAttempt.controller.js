const crypto = require('crypto')
const mongoose = require('mongoose')
const Quiz = require('../models/Quiz')
const Question = require('../models/Question')
const QuizAttempt = require('../models/QuizAttempt')
const Competency = require('../models/Competency')
const Notification = require('../models/Notification')
const Certificate = require('../models/Certificate')
const certificateService = require('../services/certificate.service')
const { scoreAttempt } = require('../services/quizScoring.service')
const { applyCompetencyUpdates, applyCompetencyScoreMap } = require('../services/competencyUpdate.service')
const { validateQuizCourseContext } = require('../services/quizCourse.service')

// Per-user promise-chain mutex to serialize concurrent quiz attempt submissions
const _quizSubmitLocks = new Map()
async function withQuizSubmitLock(userId, fn) {
  const key = String(userId)
  const prev = _quizSubmitLocks.get(key) || Promise.resolve()
  let release
  const next = new Promise((resolve) => { release = resolve })
  const chained = prev.then(() => next)
  _quizSubmitLocks.set(key, chained)
  await prev
  try {
    return await fn()
  } finally {
    release()
    if (_quizSubmitLocks.get(key) === chained) {
      _quizSubmitLocks.delete(key)
    }
  }
}

function normalizeOptionStrings(options) {
  if (!Array.isArray(options)) return []
  return options.map((opt) => {
    if (typeof opt === 'string') return opt
    if (opt && typeof opt === 'object') return opt.text || opt.label || opt.id || ''
    return String(opt)
  })
}

function resolveCorrectOptionIndex(q) {
  if (typeof q.correctOptionIndex === 'number') return q.correctOptionIndex
  if (q.correct_option_id && Array.isArray(q.options)) {
    const idx = q.options.findIndex((opt) => (opt?.id || opt?.key || String(opt)) === String(q.correct_option_id))
    if (idx >= 0) return idx
  }
  return 0
}

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

    const courseIdContext = req.body?.courseId ?? req.query?.courseId
    await validateQuizCourseContext(quiz, courseIdContext, {
      isAdmin: req.user?.role === 'admin',
    })

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

    const result = await withQuizSubmitLock(req.user.id, async () => {
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
        quiz = await Quiz.findOne({ title: new RegExp(quizParamId.replace(/-/g, ' '), 'i') })
          .populate('questionIds')
          .populate('tagCompetencyIds', '_id name')
          .lean()
      }

      const courseIdContext = req.body?.courseId ?? req.query?.courseId
      await validateQuizCourseContext(quiz, courseIdContext, {
        isAdmin: req.user?.role === 'admin',
      })

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
        if (activeAttempt) {
          const expectedQuizIds = new Set(
            [quiz?._id ? String(quiz._id) : null, quizParamId ? String(quizParamId) : null].filter(Boolean)
          )
          const attemptQuizId = activeAttempt.quizId ? String(activeAttempt.quizId) : null
          if (attemptQuizId && expectedQuizIds.size > 0 && !expectedQuizIds.has(attemptQuizId)) {
            return {
              status: 403,
              body: {
                message: 'This attempt does not belong to the requested quiz.',
                code: 'ATTEMPT_QUIZ_MISMATCH',
              },
            }
          }
        }
      }
      if (!activeAttempt) {
        activeAttempt = await QuizAttempt.findOne({
          userId: { $in: userQueryIds },
          quizId: { $in: [quiz?._id, quizParamId].filter(Boolean) },
          status: 'in_progress',
        }).sort({ startedAt: -1 })
      }

      if (activeAttempt && activeAttempt.status === 'completed') {
        return {
          status: 400,
          body: {
            message: 'This assessment attempt has already been submitted and completed.',
            code: 'ATTEMPT_ALREADY_COMPLETED',
            attemptId: activeAttempt._id,
            score: activeAttempt.score,
            passed: activeAttempt.passed,
          },
        }
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
        return {
          status: 400,
          body: {
            message: 'Assessment time limit of 20 minutes has expired. Submissions are no longer accepted.',
            code: 'ASSESSMENT_EXPIRED',
            expired: true,
          },
        }
      }

      // ── 2. Evaluate answers against quiz questions or submitted options ───────
      let score = 0
      let correctCount = 0
      const questionsList = (quiz?.questionIds && quiz.questionIds.length > 0) ? quiz.questionIds : []
      const totalQuestions = questionsList.length > 0 ? questionsList.length : (clientTotal || answers.length)

      const detailedResults = []
      // Per-question competency tracker (populated when questions carry competency_id)
      const perCompStats = new Map()

      if (questionsList.length > 0) {
        questionsList.forEach((q, idx) => {
          const qIdStr = q._id?.toString() || String(q.id || idx + 1)
          const userAns = answers.find(
            (a) => (a.questionId?.toString?.() || String(a.questionId)) === qIdStr || a.number === idx + 1
          )
          const selectedIdx = typeof userAns?.selectedOptionIndex === 'number' ? userAns.selectedOptionIndex : null
          const correctOptIdx = resolveCorrectOptionIndex(q)
          const isCorrect = selectedIdx === correctOptIdx
          if (isCorrect) correctCount++

          const rawCompId = q.competency_id?._id || q.competency_id
          if (rawCompId && mongoose.Types.ObjectId.isValid(rawCompId)) {
            const compKey = String(rawCompId)
            const curStat = perCompStats.get(compKey) || { competencyId: rawCompId, correct: 0, total: 0 }
            curStat.total += 1
            if (isCorrect) curStat.correct += 1
            perCompStats.set(compKey, curStat)
          }

          detailedResults.push({
            id: qIdStr,
            number: idx + 1,
            text: q.questionText,
            options: normalizeOptionStrings(q.options),
            correctOption: correctOptIdx,
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
            options: normalizeOptionStrings(ans.options),
            correctOption: correctOpt,
            userAnswer: selectedIdx,
            isCorrect: Boolean(isCorrect),
            explanation: ans.explanation || 'Curriculum assessment item.',
          })
        })
        score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 1000) / 10 : 0
      }

      const attemptedAt = new Date()
      const quizTitle = quiz?.title || clientQuizTitle || 'Official Statistical Assessment'
      const domain = quiz?.domain || clientDomain || 'Data Management'
      // Existing 70% passing threshold preserved
      const passed = score >= 70

      // ── 3. Atomically claim completion BEFORE competency/SkillGap mutation ────
      let savedAttempt
      if (activeAttempt) {
        const claimed = await QuizAttempt.findOneAndUpdate(
          {
            _id: activeAttempt._id,
            userId: { $in: userQueryIds },
            status: 'in_progress',
          },
          {
            $set: {
              quizTitle,
              domain,
              answers,
              score,
              correctCount,
              totalQuestions,
              passed,
              detailedResults,
              competencyUpdates: [],
              status: 'completed',
              completedAt: attemptedAt,
              attemptedAt,
            },
          },
          { new: true }
        )

        if (!claimed) {
          const latest = await QuizAttempt.findById(activeAttempt._id).lean()
          return {
            status: 400,
            body: {
              message: 'This assessment attempt has already been submitted and completed.',
              code: 'ATTEMPT_ALREADY_COMPLETED',
              attemptId: activeAttempt._id,
              score: latest?.score ?? activeAttempt.score,
              passed: latest?.passed ?? activeAttempt.passed,
            },
          }
        }
        savedAttempt = claimed
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
          competencyUpdates: [],
          durationMinutes,
          startedAt: attemptedAt,
          deadline: new Date(attemptedAt.getTime() + durationMinutes * 60 * 1000),
          completedAt: attemptedAt,
          status: 'completed',
          attemptedAt,
        })
      }

      // ── 4. Apply competency updates only if quiz is PASSED (>= 70%) ──────────
      let competencyUpdates = []
      if (passed) {
        if (perCompStats.size > 0) {
          // Multi-competency / question-mapped accuracy: score each assessed competency independently
          const scoreEntries = Array.from(perCompStats.values()).map((stat) => ({
            competencyId: stat.competencyId,
            scorePercent: stat.total > 0 ? Math.round((stat.correct / stat.total) * 1000) / 10 : 0,
          }))
          competencyUpdates = await applyCompetencyScoreMap(
            req.user.id,
            scoreEntries,
            attemptedAt
          ).catch(() => [])
        } else {
          // Legacy / quiz-level tag fallback when questions do not carry per-question competency_id
          const tagIds = quiz?.tagCompetencyIds?.map((c) => c._id || c) ?? []
          competencyUpdates = await applyCompetencyUpdates(
            req.user.id,
            tagIds,
            score,
            attemptedAt
          ).catch(() => [])
        }

        if (competencyUpdates.length > 0) {
          savedAttempt = await QuizAttempt.findByIdAndUpdate(
            savedAttempt._id,
            { $set: { competencyUpdates } },
            { new: true }
          )
        }
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

      return {
        status: 201,
        body: {
          attempt: savedAttempt,
          score,
          correctCount,
          totalQuestions,
          passed,
          detailedResults,
          competencyUpdates: competencyUpdates || [],
        },
      }
    })

    return res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
}

async function listMyAttempts(req, res, next) {
  try {
    const userQueryIds = [req.user.id]
    if (mongoose.Types.ObjectId.isValid(req.user.id)) {
      userQueryIds.push(new mongoose.Types.ObjectId(req.user.id))
    }

    const attempts = await QuizAttempt.find({ userId: { $in: userQueryIds } })
      .populate('quizId', 'title domain questionCount')
      .sort({ completedAt: -1, attemptedAt: -1, startedAt: -1 })
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

/**
 * GET /api/quizzes/attempts/:attemptId
 * Returns an authoritative single quiz attempt belonging strictly to the
 * authenticated user. Missing or unauthorized attempts both yield 404.
 */
async function getAttemptById(req, res, next) {
  try {
    const { attemptId } = req.params
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ message: 'Invalid attempt ID format.' })
    }

    const userQueryIds = [req.user.id]
    if (mongoose.Types.ObjectId.isValid(req.user.id)) {
      userQueryIds.push(new mongoose.Types.ObjectId(req.user.id))
    }

    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      userId: { $in: userQueryIds },
    }).lean()

    if (!attempt) {
      return res.status(404).json({ message: 'Quiz attempt not found.' })
    }

    const startedMs = attempt.startedAt ? new Date(attempt.startedAt).getTime() : NaN
    const completedMs = attempt.completedAt ? new Date(attempt.completedAt).getTime() : NaN
    const isCompletedStatus = attempt.status !== 'in_progress' && attempt.status !== 'expired'
    const hasValidWindow =
      isCompletedStatus &&
      Number.isFinite(startedMs) &&
      Number.isFinite(completedMs) &&
      completedMs >= startedMs

    const durationSeconds = hasValidWindow ? Math.round((completedMs - startedMs) / 1000) : null

    const totalQuestions = typeof attempt.totalQuestions === 'number' ? attempt.totalQuestions : null
    const correctCount = typeof attempt.correctCount === 'number' ? attempt.correctCount : null
    const incorrectCount =
      totalQuestions !== null && correctCount !== null
        ? Math.max(0, totalQuestions - correctCount)
        : null

    const authoritativeScore = isCompletedStatus && typeof attempt.score === 'number' ? attempt.score : null
    const authoritativePassed =
      isCompletedStatus && typeof attempt.passed === 'boolean'
        ? attempt.passed
        : isCompletedStatus && typeof attempt.score === 'number'
          ? attempt.score >= 70
          : null

    let populatedQuiz = null
    if (attempt.quizId && typeof attempt.quizId === 'object' && attempt.quizId.title) {
      populatedQuiz = attempt.quizId
    } else if (attempt.quizId && mongoose.Types.ObjectId.isValid(String(attempt.quizId))) {
      populatedQuiz = await Quiz.findById(attempt.quizId)
        .select('title domain durationMinutes questionCount')
        .lean()
    } else if (typeof attempt.quizId === 'string' && attempt.quizId.trim()) {
      populatedQuiz = await Quiz.findOne({ materialId: attempt.quizId.trim() })
        .select('title domain durationMinutes questionCount')
        .lean()
    }

    const rawUpdates = Array.isArray(attempt.competencyUpdates) ? attempt.competencyUpdates : []
    let enrichedCompetencyUpdates = []
    if (rawUpdates.length > 0) {
      const compIds = rawUpdates
        .map((u) => u?.competencyId)
        .filter((cid) => cid && mongoose.Types.ObjectId.isValid(String(cid)))
        .map((cid) => new mongoose.Types.ObjectId(String(cid)))
      const compDocs = compIds.length > 0
        ? await Competency.find({ _id: { $in: compIds } }).select('name competencyCode code category').lean()
        : []
      const compMap = new Map(compDocs.map((c) => [String(c._id), c]))
      enrichedCompetencyUpdates = rawUpdates.map((u) => {
        const compIdStr = u?.competencyId ? String(u.competencyId) : null
        const compDoc = compIdStr ? compMap.get(compIdStr) : null
        return {
          competencyId: u?.competencyId ?? null,
          competencyName: compDoc?.name || null,
          competencyCode: compDoc?.competencyCode || compDoc?.code || null,
          competencyCategory: compDoc?.category || null,
          previousLevel: typeof u?.previousLevel === 'number' ? u.previousLevel : null,
          newLevel: typeof u?.newLevel === 'number' ? u.newLevel : null,
        }
      })
    }

    const normalizedAttempt = {
      _id: attempt._id,
      quizId: populatedQuiz ? populatedQuiz._id : attempt.quizId ?? null,
      quizTitle: populatedQuiz?.title || attempt.quizTitle || 'Quiz Assessment',
      domain: populatedQuiz?.domain || attempt.domain || null,
      status: attempt.status || 'completed',
      score: authoritativeScore,
      passed: authoritativePassed,
      correctCount: isCompletedStatus ? correctCount : null,
      incorrectCount: isCompletedStatus ? incorrectCount : null,
      totalQuestions,
      startedAt: attempt.startedAt || null,
      completedAt: attempt.completedAt || null,
      attemptedAt: attempt.attemptedAt || null,
      durationSeconds,
      quizDurationMinutes:
        typeof populatedQuiz?.durationMinutes === 'number'
          ? populatedQuiz.durationMinutes
          : typeof attempt.durationMinutes === 'number'
            ? attempt.durationMinutes
            : null,
      detailedResults: Array.isArray(attempt.detailedResults) ? attempt.detailedResults : [],
      competencyUpdates: enrichedCompetencyUpdates,
    }

    res.json({ attempt: normalizedAttempt })
  } catch (err) {
    next(err)
  }
}

module.exports = { startAttempt, submitAttempt, listMyAttempts, getAttemptById, getQuizStats }
