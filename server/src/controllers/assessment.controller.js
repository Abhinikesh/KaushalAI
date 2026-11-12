'use strict'

const mongoose = require('mongoose')
const Assessment = require('../models/Assessment')
const AssessmentAttempt = require('../models/AssessmentAttempt')
const AssessmentResponse = require('../models/AssessmentResponse')
const Question = require('../models/Question')
const UserCompetency = require('../models/UserCompetency')
const User = require('../models/User')
const Role = require('../models/Role')
const RoleCompetency = require('../models/RoleCompetency')
const SkillGap = require('../models/SkillGap')
const Recommendation = require('../models/Recommendation')
const LearningPath = require('../models/LearningPath')
const {
  withUserLock,
  computeUserSkillGaps,
  generateRecommendationsAndLearningPath,
  runSkillGapAndRecommendationPipeline,
} = require('../services/skillGap.service')
const { generateAssessmentGrokAnalysis } = require('../services/grokAssessment.service')

// Per-attempt promise-chain mutex so concurrent save-answer and submit calls serialize cleanly
const _diagnosticAttemptLocks = new Map()
async function withDiagnosticAttemptLock(attemptId, fn) {
  const key = String(attemptId)
  const prev = _diagnosticAttemptLocks.get(key) || Promise.resolve()
  let release
  const next = new Promise((resolve) => { release = resolve })
  const chained = prev.then(() => next)
  _diagnosticAttemptLocks.set(key, chained)
  await prev
  try {
    return await fn()
  } finally {
    release()
    if (_diagnosticAttemptLocks.get(key) === chained) {
      _diagnosticAttemptLocks.delete(key)
    }
  }
}

// Fisher-Yates array shuffle utility
function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// 1-5 scale mapping based on percentage correct
function mapPercentageToLevel(percentage) {
  if (percentage <= 20) return 1
  if (percentage <= 40) return 2
  if (percentage <= 60) return 3
  if (percentage <= 80) return 4
  return 5
}

/**
 * POST /api/assessments/diagnostic/start
 * Initiates a 15-question diagnostic test tailored to the authenticated user's cadre level.
 */
async function startDiagnosticAssessment(req, res, next) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const user = await User.findById(userId).populate('role_id').populate('functional_area_id')
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Verify onboarding progress: user must have completed Step 4 (Skills to Develop)
    if (
      user.role !== 'admin' &&
      (user.onboarding_step < 4 || !Array.isArray(user.skills_to_develop) || user.skills_to_develop.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        code: 'STEP_PREREQUISITE_NOT_MET',
        message: 'You must complete Step 4 (Skills to Develop) and select at least one competency before starting the diagnostic assessment.',
      })
    }

    // Determine user's level (1 to 5)
    let userLevel = Number(user.level) || 3
    if (userLevel < 1 || userLevel > 5) userLevel = 3

    // Locate or create the master Assessment for this level
    const tierTitles = [
      '',
      'Support Staff',
      'Junior Assistant',
      'Section Officer',
      'Senior Officer',
      'Department Head',
    ]

    let assessment = await Assessment.findOne({ level: userLevel, type: 'diagnostic' })
    if (!assessment) {
      assessment = await Assessment.create({
        name: `Cadre Level ${userLevel} Diagnostic Assessment (${tierTitles[userLevel]})`,
        type: 'diagnostic',
        level: userLevel,
        total_questions: 15,
      })
    }

    // Check for an existing in_progress active attempt (prevents duplicate attempts on reload/repeated clicks)
    const now = new Date()
    const activeAttempt = await AssessmentAttempt.findOne({
      user_id: user._id,
      status: 'in_progress',
    }).populate('assessment_id')

    if (activeAttempt) {
      if (activeAttempt.expires_at && now > new Date(activeAttempt.expires_at)) {
        // Active attempt has expired; mark it expired
        activeAttempt.status = 'expired'
        await activeAttempt.save()
      } else {
        // Return existing active attempt with its original questions, expiry timestamp, and saved answers
        const existingQuestions = await Question.find({ _id: { $in: activeAttempt.question_ids } }).populate('competency_id')
        const qMap = new Map(existingQuestions.map((q) => [q._id.toString(), q]))
        const orderedQuestions = activeAttempt.question_ids.map((id) => qMap.get(id.toString())).filter(Boolean)

        const sanitizedQuestions = orderedQuestions.map((q, idx) => ({
          _id: q._id,
          questionNumber: idx + 1,
          text: q.text,
          options: (q.options || []).map((opt) => ({
            id: opt.id || opt.key || String(opt),
            text: opt.text || String(opt),
          })),
          competency_id: q.competency_id?._id || null,
          competency_name: q.competency_id?.name || 'General Competency',
          level: q.level,
          difficulty: q.difficulty,
        }))

        const savedResponses = await AssessmentResponse.find({ attempt_id: activeAttempt._id }).lean()
        const remainingSeconds = Math.max(
          0,
          Math.round((new Date(activeAttempt.expires_at).getTime() - now.getTime()) / 1000)
        )

        return res.status(200).json({
          success: true,
          attemptId: activeAttempt._id,
          is_resumed: true,
          attempt: {
            id: activeAttempt._id,
            started_at: activeAttempt.started_at,
            expires_at: activeAttempt.expires_at,
            duration_seconds: 1200,
            remaining_seconds: remainingSeconds,
          },
          assessment: {
            id: activeAttempt.assessment_id?._id || assessment._id,
            name: activeAttempt.assessment_id?.name || assessment.name,
            level: assessment.level,
            tierTitle: tierTitles[userLevel],
            total_questions: sanitizedQuestions.length,
          },
          profile: {
            role: user.role_id?.name || user.designation || tierTitles[userLevel],
            tierTitle: tierTitles[userLevel],
            cadreLevel: userLevel,
            department: user.department || 'Statistics & Programme Implementation',
            functionalArea: user.functional_area_id?.name || 'Statistical Operations',
            experience_years: user.experience_years || 2,
          },
          saved_responses: savedResponses.map((r) => ({
            question_id: r.question_id,
            selected_option_id: r.selected_option_id,
            time_taken_seconds: r.time_taken_seconds || 0,
          })),
          questions: sanitizedQuestions,
        })
      }
    }

    // Fetch candidate questions for this level with populated competency
    let pool = await Question.find({ level: userLevel, quizId: null }).populate('competency_id')

    if (!pool || pool.length === 0) {
      console.log(`[Diagnostic Assessment] No questions found for Level ${userLevel}. Auto-seeding 131 questions...`)
      const seedQuestionBank = require('../seed/seedQuestionBankPart3')
      await seedQuestionBank()
      pool = await Question.find({ level: userLevel, quizId: null }).populate('competency_id')
    }

    if (!pool || pool.length === 0) {
      return res.status(404).json({
        message: `No diagnostic questions found in question bank for Level ${userLevel}`,
      })
    }

    // Group questions by competency ID
    const byComp = new Map()
    pool.forEach((q) => {
      const cId = q.competency_id?._id?.toString() || 'general'
      if (!byComp.has(cId)) byComp.set(cId, [])
      byComp.get(cId).push(q)
    })

    // Shuffle questions within each competency bucket
    for (const [cId, questions] of byComp.entries()) {
      byComp.set(cId, shuffle(questions))
    }

    const selectedQuestions = []
    const TARGET_QUESTIONS = 15

    // Step 1: Ensure every competency for this level gets at least 2 questions
    for (const [cId, questions] of byComp.entries()) {
      const takeCount = Math.min(2, questions.length)
      for (let i = 0; i < takeCount; i++) {
        selectedQuestions.push(questions[i])
      }
    }

    // Step 2: Fill remaining slots up to 15 questions in balanced round-robin
    const compKeys = Array.from(byComp.keys())
    let compIdx = 0
    const takenIndexMap = new Map()
    compKeys.forEach((k) => takenIndexMap.set(k, 2))

    while (selectedQuestions.length < TARGET_QUESTIONS && compKeys.length > 0) {
      const currentCompId = compKeys[compIdx % compKeys.length]
      const compPool = byComp.get(currentCompId)
      const nextIdx = takenIndexMap.get(currentCompId) || 0

      if (nextIdx < compPool.length) {
        selectedQuestions.push(compPool[nextIdx])
        takenIndexMap.set(currentCompId, nextIdx + 1)
      }

      compIdx++
      // If we cycled through all and have enough or exhausted
      if (compIdx >= compKeys.length * 10) break
    }

    // If still under TARGET_QUESTIONS, fill from whatever remaining pool exists
    if (selectedQuestions.length < TARGET_QUESTIONS) {
      const selectedIds = new Set(selectedQuestions.map((q) => q._id.toString()))
      for (const q of pool) {
        if (!selectedIds.has(q._id.toString())) {
          selectedQuestions.push(q)
          selectedIds.add(q._id.toString())
          if (selectedQuestions.length >= TARGET_QUESTIONS) break
        }
      }
    }

    // Randomize order of the selected 15 questions so they are not clustered by competency
    const finalQuestions = shuffle(selectedQuestions).slice(0, TARGET_QUESTIONS)

    // Create an in_progress attempt with exact 20-minute expiration window (1200 seconds)
    const startedAt = new Date()
    const expiresAt = new Date(startedAt.getTime() + 20 * 60 * 1000)

    const attempt = await AssessmentAttempt.create({
      user_id: user._id,
      assessment_id: assessment._id,
      status: 'in_progress',
      started_at: startedAt,
      expires_at: expiresAt,
      question_ids: finalQuestions.map((q) => q._id),
      overall_score: 0,
    })

    // Extract unique competencies tested in this assessment and fetch role required levels
    const roleComps = user.role_id ? await RoleCompetency.find({ role_id: user.role_id._id }) : []
    const roleReqMap = new Map()
    roleComps.forEach((rc) => roleReqMap.set(rc.competency_id.toString(), rc.required_level))

    const competencyMap = new Map()
    finalQuestions.forEach((q) => {
      if (q.competency_id) {
        const id = q.competency_id._id.toString()
        if (!competencyMap.has(id)) {
          competencyMap.set(id, {
            id,
            name: q.competency_id.name,
            category: q.competency_id.category,
            required_level: roleReqMap.get(id) || Math.min(5, Math.max(1, userLevel + 1)),
          })
        }
      }
    })

    // Strip out correct_option_id and explanation before sending to client
    const sanitizedQuestions = finalQuestions.map((q, idx) => ({
      _id: q._id,
      questionNumber: idx + 1,
      text: q.text,
      options: (q.options || []).map((opt) => ({
        id: opt.id || opt.key || String(opt),
        text: opt.text || String(opt),
      })),
      competency_id: q.competency_id?._id || null,
      competency_name: q.competency_id?.name || 'General Competency',
      level: q.level,
      difficulty: q.difficulty,
    }))

    return res.status(201).json({
      success: true,
      attemptId: attempt._id,
      is_resumed: false,
      attempt: {
        id: attempt._id,
        started_at: startedAt,
        expires_at: expiresAt,
        duration_seconds: 1200,
        remaining_seconds: 1200,
      },
      assessment: {
        id: assessment._id,
        name: assessment.name,
        level: assessment.level,
        tierTitle: tierTitles[userLevel],
        total_questions: sanitizedQuestions.length,
      },
      profile: {
        role: user.role_id?.name || user.designation || tierTitles[userLevel],
        tierTitle: tierTitles[userLevel],
        cadreLevel: userLevel,
        department: user.department || 'Statistics & Programme Implementation',
        functionalArea: user.functional_area_id?.name || 'Statistical Operations',
        experience_years: user.experience_years || 2,
      },
      saved_responses: [],
      competencies: Array.from(competencyMap.values()),
      questions: sanitizedQuestions,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/assessments/diagnostic/:attemptId/save-answer
 * Progressively autosaves an answer selection for a specific question during the test.
 */
async function saveDiagnosticAnswer(req, res, next) {
  try {
    const userId = req.user?.id
    const { attemptId } = req.params
    const { question_id, selected_option_id, time_taken_seconds } = req.body

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    if (!attemptId || !String(attemptId).match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, code: 'INVALID_ATTEMPT_ID', message: 'Invalid attempt ID format' })
    }

    const result = await withDiagnosticAttemptLock(attemptId, async () => {
      const attempt = await AssessmentAttempt.findById(attemptId)
      if (!attempt) {
        return { status: 404, body: { success: false, code: 'ATTEMPT_NOT_FOUND', message: 'Assessment attempt not found' } }
      }

      if (attempt.user_id.toString() !== userId.toString()) {
        return { status: 403, body: { success: false, code: 'FORBIDDEN', message: 'You do not own this assessment attempt' } }
      }

      if (attempt.status === 'completed') {
        return {
          status: 409,
          body: {
            success: false,
            code: 'ATTEMPT_ALREADY_COMPLETED',
            message: 'This diagnostic assessment attempt has already been submitted and finalized.',
          },
        }
      }

      // Server-enforced expiry check
      const now = new Date()
      if (attempt.status === 'expired' || (attempt.expires_at && now > new Date(attempt.expires_at))) {
        if (attempt.status !== 'expired') {
          attempt.status = 'expired'
          await attempt.save()
        }
        return {
          status: 400,
          body: {
            success: false,
            code: 'ATTEMPT_EXPIRED',
            message: 'The 20-minute assessment window has expired. Answers can no longer be modified.',
          },
        }
      }

      if (!question_id || !String(question_id).match(/^[0-9a-fA-F]{24}$/)) {
        return { status: 400, body: { success: false, code: 'INVALID_QUESTION_ID', message: 'Invalid question ID format' } }
      }

      const isQuestionInAttempt = (attempt.question_ids || []).some(
        (qid) => qid.toString() === question_id.toString()
      )
      if (!isQuestionInAttempt) {
        return {
          status: 400,
          body: {
            success: false,
            code: 'INVALID_QUESTION_ID',
            message: 'The specified question does not belong to this assessment attempt.',
          },
        }
      }

      const question = await Question.findById(question_id)
      if (!question) {
        return { status: 404, body: { success: false, code: 'QUESTION_NOT_FOUND', message: 'Question record not found' } }
      }

      if (selected_option_id !== null && selected_option_id !== undefined && selected_option_id !== '') {
        const isValidOption = (question.options || []).some(
          (opt) => (opt.id || opt.key || String(opt)) === String(selected_option_id)
        )
        if (!isValidOption) {
          return {
            status: 400,
            body: {
              success: false,
              code: 'INVALID_OPTION_ID',
              message: `Option '${selected_option_id}' is not a valid option for this question.`,
            },
          }
        }
      }

      const isCorrect = Boolean(selected_option_id && selected_option_id === question.correct_option_id)

      const updatedResp = await AssessmentResponse.findOneAndUpdate(
        { attempt_id: attempt._id, question_id: question._id },
        {
          user_id: userId,
          attempt_id: attempt._id,
          question_id: question._id,
          selected_option_id: selected_option_id || null,
          is_correct: isCorrect,
          time_taken_seconds: Math.max(0, Number(time_taken_seconds) || 0),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )

      return {
        status: 200,
        body: {
          success: true,
          saved_at: new Date(),
          response: {
            question_id: updatedResp.question_id,
            selected_option_id: updatedResp.selected_option_id,
          },
        },
      }
    })

    return res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/assessments/diagnostic/:attemptId/submit
 * Submits and grades the diagnostic test deterministically server-side.
 */
async function submitDiagnosticAssessment(req, res, next) {
  try {
    const userId = req.user?.id
    const { attemptId } = req.params
    const { responses } = req.body

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    if (!attemptId || !String(attemptId).match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, code: 'INVALID_ATTEMPT_ID', message: 'Invalid attempt ID format' })
    }

    if (responses !== undefined && !Array.isArray(responses)) {
      return res.status(400).json({ success: false, code: 'INVALID_RESPONSES_PAYLOAD', message: 'Responses must be an array' })
    }

    const result = await withDiagnosticAttemptLock(attemptId, async () => {
      // Validate attempt ownership and immutable completed status
      const attempt = await AssessmentAttempt.findById(attemptId)
      if (!attempt) {
        return { status: 404, body: { success: false, code: 'ATTEMPT_NOT_FOUND', message: 'Assessment attempt not found' } }
      }

      if (attempt.user_id.toString() !== userId.toString()) {
        return { status: 403, body: { success: false, code: 'FORBIDDEN', message: 'Forbidden: You do not own this assessment attempt' } }
      }

      if (attempt.status === 'completed') {
        return {
          status: 409,
          body: {
            success: false,
            code: 'ATTEMPT_ALREADY_COMPLETED',
            message: 'This diagnostic assessment attempt has already been submitted and is finalized.',
          },
        }
      }

      // Authoritative server-side expiry enforcement
      const now = new Date()
      if (attempt.status === 'expired' || (attempt.expires_at && now > new Date(attempt.expires_at))) {
        if (attempt.status !== 'expired') {
          attempt.status = 'expired'
          await attempt.save()
        }
        return {
          status: 400,
          body: {
            success: false,
            code: 'ATTEMPT_EXPIRED',
            message: 'The 20-minute assessment window has expired. Answers can no longer be submitted.',
          },
        }
      }

      // Determine questions to evaluate (from attempt.question_ids)
      const questionIds =
        Array.isArray(attempt.question_ids) && attempt.question_ids.length > 0
          ? attempt.question_ids
          : Array.isArray(responses) ? responses.map((r) => r.question_id) : []

      const questions = await Question.find({ _id: { $in: questionIds } }).populate('competency_id')

      // Retrieve previously autosaved responses from AssessmentResponse collection
      const previouslySavedResponses = await AssessmentResponse.find({ attempt_id: attempt._id }).lean()
      const clientResponsesMap = new Map()
      previouslySavedResponses.forEach((r) => {
        clientResponsesMap.set(r.question_id.toString(), {
          question_id: r.question_id.toString(),
          selected_option_id: r.selected_option_id,
          time_taken_seconds: r.time_taken_seconds || 0,
        })
      })

      // If client supplied responses in the submission body, merge/override
      if (Array.isArray(responses)) {
        responses.forEach((r) => {
          if (r && r.question_id) {
            clientResponsesMap.set(r.question_id.toString(), r)
          }
        })
      }

      // Grade each response server-side
      const competencyStats = new Map()
      let totalCorrect = 0

      for (const q of questions) {
        const qIdStr = q._id.toString()
        const userSubmission = clientResponsesMap.get(qIdStr)
        const selectedOptionId = userSubmission?.selected_option_id || null
        const timeTaken = Math.max(0, Number(userSubmission?.time_taken_seconds) || 0)

        const isCorrect = Boolean(selectedOptionId && selectedOptionId === q.correct_option_id)
        if (isCorrect) totalCorrect++

        // Upsert persistent AssessmentResponse
        await AssessmentResponse.findOneAndUpdate(
          { attempt_id: attempt._id, question_id: q._id },
          {
            user_id: userId,
            attempt_id: attempt._id,
            question_id: q._id,
            selected_option_id: selectedOptionId,
            is_correct: isCorrect,
            time_taken_seconds: timeTaken,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )

        // Aggregate statistics by competency
        const compId = q.competency_id?._id?.toString() || 'unclassified'
        const compName = q.competency_id?.name || 'General'

        if (!competencyStats.has(compId)) {
          competencyStats.set(compId, {
            competency_id: compId,
            competency_name: compName,
            correct: 0,
            total: 0,
          })
        }
        const stat = competencyStats.get(compId)
        stat.total += 1
        if (isCorrect) stat.correct += 1
      }

      const user = await User.findById(userId).populate('role_id').populate('functional_area_id')
      if (!user) {
        return { status: 404, body: { success: false, code: 'USER_NOT_FOUND', message: 'User record not found' } }
      }

      const userLevel = Number(user?.level) || 3
      const roleComps = user?.role_id ? await RoleCompetency.find({ role_id: user.role_id._id }) : []
      const roleReqMap = new Map()
      roleComps.forEach((rc) => roleReqMap.set(rc.competency_id.toString(), rc.required_level))

      // Compute per-competency scores
      const perCompetencyScores = []
      for (const stat of competencyStats.values()) {
        const percentage = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0
        const derivedLevel = mapPercentageToLevel(percentage)
        const requiredLevel = roleReqMap.get(stat.competency_id) || Math.min(5, Math.max(1, userLevel + 1))
        const gap = requiredLevel - derivedLevel
        const priority = gap >= 2 ? 'high' : gap === 1 ? 'medium' : 'low'

        perCompetencyScores.push({
          competency_id: stat.competency_id,
          competency_name: stat.competency_name,
          correct: stat.correct,
          total: stat.total,
          percentage,
          derived_level: derivedLevel,
          required_level: requiredLevel,
          gap,
          priority,
        })
      }

      const totalQuestions = questions.length || 15
      const overallScore = Math.round((totalCorrect / totalQuestions) * 100)

      // Atomically claim attempt completion BEFORE any UserCompetency or SkillGap mutations
      const completedAt = new Date()
      const claimedAttempt = await AssessmentAttempt.findOneAndUpdate(
        { _id: attempt._id, user_id: userId, status: 'in_progress' },
        {
          $set: {
            status: 'completed',
            completed_at: completedAt,
            overall_score: overallScore,
            competency_scores: perCompetencyScores,
          },
        },
        { new: true }
      )

      if (!claimedAttempt) {
        return {
          status: 409,
          body: {
            success: false,
            code: 'ATTEMPT_ALREADY_COMPLETED',
            message: 'This diagnostic assessment attempt has already been submitted and is finalized.',
          },
        }
      }

      const isAdmin = user.role === 'admin'
      let updatedUser = user
      let pipelineResult = null

      if (!isAdmin) {
        // Persist canonical UserCompetency baseline under withUserLock (prevents cross-service races)
        await withUserLock(String(userId), async () => {
          for (const itemScore of perCompetencyScores) {
            if (itemScore.competency_id !== 'unclassified' && mongoose.Types.ObjectId.isValid(itemScore.competency_id)) {
              const existingUc = await UserCompetency.findOne({
                $or: [
                  { user_id: userId, competency_id: itemScore.competency_id },
                  { userId, competencyId: itemScore.competency_id },
                ],
              })
              if (existingUc) {
                await UserCompetency.findByIdAndUpdate(
                  existingUc._id,
                  {
                    $set: {
                      user_id: existingUc.user_id || userId,
                      competency_id: existingUc.competency_id || itemScore.competency_id,
                      current_level: itemScore.derived_level,
                      last_assessed_at: completedAt,
                      assessment_attempt_id: claimedAttempt._id,
                      source: 'diagnostic_test',
                    },
                  },
                  { new: true }
                )
              } else {
                await UserCompetency.findOneAndUpdate(
                  { user_id: userId, competency_id: itemScore.competency_id },
                  {
                    $set: {
                      current_level: itemScore.derived_level,
                      last_assessed_at: completedAt,
                      assessment_attempt_id: claimedAttempt._id,
                      source: 'diagnostic_test',
                    },
                  },
                  { upsert: true, new: true }
                )
              }
            }
          }
        })

        // Advance user to Step 6 (Results Review) — do NOT mark onboarding_completed = true yet.
        updatedUser = await User.findByIdAndUpdate(
          userId,
          { onboarding_step: 6 },
          { new: true }
        )

        // Trigger deterministic skill gap computation (with explicit failure deferral) + recommendations + learning path
        let skillGapSynced = false
        try {
          await computeUserSkillGaps(userId)
          skillGapSynced = true
          await User.findByIdAndUpdate(userId, {
            $set: {
              needs_skillgap_sync: false,
              skillgap_sync_error: null,
              skillgap_sync_requested_at: null,
            },
          })
          const populatedGaps = await SkillGap.find({ user_id: userId }).populate('competency_id').lean()
          const recResult = await generateRecommendationsAndLearningPath(userId, claimedAttempt._id)
          pipelineResult = {
            gaps: populatedGaps,
            recommendations: recResult.recommendations,
            learningPath: recResult.learningPath,
            items: recResult.items,
          }
          console.log(`[Diagnostic Assessment] Skill gap & AI recommendation pipeline completed for user ${userId}.`)
        } catch (pipelineErr) {
          if (!skillGapSynced) {
            await User.findByIdAndUpdate(userId, {
              $set: {
                needs_skillgap_sync: true,
                skillgap_sync_error: pipelineErr.message || 'SkillGap calculation failed during diagnostic submission',
                skillgap_sync_requested_at: new Date(),
              },
            })
          } else {
            const populatedGaps = await SkillGap.find({ user_id: userId }).populate('competency_id').lean()
            pipelineResult = {
              gaps: populatedGaps,
              recommendations: [],
              learningPath: null,
              items: [],
            }
          }
          console.error(`[Diagnostic Assessment] Error running skill gap pipeline for user ${userId}:`, pipelineErr.message)
        }
      }

      // Generate Grok AI Assessment Analysis (or deterministic fallback)
      let aiAnalysis = null
      try {
        aiAnalysis = await generateAssessmentGrokAnalysis({
          user,
          assessmentAttempt: {
            overall_score: overallScore,
            total_questions: totalQuestions,
            total_correct: totalCorrect,
          },
          competencies: perCompetencyScores,
          gaps: pipelineResult?.gaps || [],
        })
      } catch (aiErr) {
        console.warn('[Diagnostic Assessment] AI analysis failed, applying fallback:', aiErr.message)
      }

      if (aiAnalysis) {
        await AssessmentAttempt.findByIdAndUpdate(claimedAttempt._id, {
          $set: { ai_analysis: aiAnalysis },
        })
      }

      return {
        status: 200,
        body: {
          success: true,
          attemptId: claimedAttempt._id,
          overall_score: overallScore,
          total_questions: totalQuestions,
          total_correct: totalCorrect,
          per_competency_scores: perCompetencyScores,
          onboarding_completed: Boolean(updatedUser?.onboarding_completed),
          onboarding_step: updatedUser?.onboarding_step ?? 6,
          user: {
            id: updatedUser._id,
            name: updatedUser.name,
            level: updatedUser.level,
            role: user.role_id?.name || user.designation || 'Officer',
            department: updatedUser.department,
            onboarding_completed: Boolean(updatedUser?.onboarding_completed),
            onboarding_step: updatedUser?.onboarding_step ?? 6,
          },
          ai_analysis: aiAnalysis,
          skill_gaps: pipelineResult?.gaps || [],
          skill_gaps_count: pipelineResult?.gaps?.length || 0,
          recommendations: pipelineResult?.recommendations || [],
          recommendations_count: pipelineResult?.recommendations?.length || 0,
          learning_path: pipelineResult?.learningPath || null,
          learning_path_id: pipelineResult?.learningPath?._id || null,
          summary: {
            title: 'Diagnostic Assessment Completed',
            message: `You answered ${totalCorrect} of ${totalQuestions} questions correctly (${overallScore}%). Your baseline competency ratings, skill gaps, and personalized AI recommendations have been generated.`,
          },
        },
      }
    })

    return res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/assessments/attempts/:attemptId/results
 * Fetches completed diagnostic assessment results, AI analysis, skill gaps, and recommendations.
 */
async function getDiagnosticAttemptResults(req, res, next) {
  try {
    const userId = req.user?.id
    const { attemptId } = req.params
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const attempt = await AssessmentAttempt.findById(attemptId).populate('assessment_id')
    if (!attempt) {
      return res.status(404).json({ message: 'Assessment attempt not found' })
    }

    if (attempt.user_id.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not own this assessment attempt' })
    }

    const user = await User.findById(userId).populate('role_id').populate('functional_area_id')
    const skillGaps = await SkillGap.find({ user_id: userId }).populate('competency_id').lean()
    const recommendations = await Recommendation.find({ user_id: userId })
      .sort({ priority_rank: 1 })
      .populate({
        path: 'course_id',
        select: 'title description level duration estimatedHours provider url skillTags thumbnail thumbnailUrl slides durationHours difficulty rating reviewsCount ratingCount',
        populate: { path: 'skillTags', select: 'name' },
      })
      .lean()

    const learningPath = await LearningPath.findOne({ user_id: userId, status: 'active' }).lean()

    return res.status(200).json({
      success: true,
      attemptId: attempt._id,
      overall_score: attempt.overall_score || 0,
      status: attempt.status,
      completed_at: attempt.completed_at,
      per_competency_scores: attempt.competency_scores || [],
      ai_analysis: attempt.ai_analysis || null,
      skill_gaps: skillGaps,
      recommendations,
      learning_path: learningPath,
      user: {
        id: user._id,
        name: user.name,
        level: user.level,
        role: user.role_id?.name || user.designation || 'Officer',
        department: user.department,
        onboarding_completed: user.onboarding_completed,
      },
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  startDiagnosticAssessment,
  saveDiagnosticAnswer,
  submitDiagnosticAssessment,
  getDiagnosticAttemptResults,
}
