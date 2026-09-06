'use strict'

const mongoose = require('mongoose')
const Assessment = require('../models/Assessment')
const AssessmentAttempt = require('../models/AssessmentAttempt')
const AssessmentResponse = require('../models/AssessmentResponse')
const Question = require('../models/Question')
const UserCompetency = require('../models/UserCompetency')
const User = require('../models/User')
const { runSkillGapAndRecommendationPipeline } = require('../services/skillGap.service')

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

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
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

    // Create an in_progress attempt
    const attempt = await AssessmentAttempt.create({
      user_id: user._id,
      assessment_id: assessment._id,
      status: 'in_progress',
      started_at: new Date(),
      question_ids: finalQuestions.map((q) => q._id),
      overall_score: 0,
    })

    // Extract unique competencies tested in this assessment for the intro display
    const competencyMap = new Map()
    finalQuestions.forEach((q) => {
      if (q.competency_id) {
        const id = q.competency_id._id.toString()
        if (!competencyMap.has(id)) {
          competencyMap.set(id, {
            id,
            name: q.competency_id.name,
            category: q.competency_id.category,
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
      attemptId: attempt._id,
      assessment: {
        id: assessment._id,
        name: assessment.name,
        level: assessment.level,
        tierTitle: tierTitles[userLevel],
        total_questions: sanitizedQuestions.length,
      },
      competencies: Array.from(competencyMap.values()),
      questions: sanitizedQuestions,
    })
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
      return res.status(401).json({ message: 'Authentication required' })
    }

    if (!Array.isArray(responses)) {
      return res.status(400).json({ message: 'Responses array is required' })
    }

    // Validate attempt ownership and immutable completed status
    const attempt = await AssessmentAttempt.findById(attemptId)
    if (!attempt) {
      return res.status(404).json({ message: 'Assessment attempt not found' })
    }

    if (attempt.user_id.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not own this assessment attempt' })
    }

    if (attempt.status === 'completed') {
      return res.status(409).json({
        code: 'ATTEMPT_ALREADY_COMPLETED',
        message: 'This diagnostic assessment attempt has already been submitted and is finalized.',
      })
    }

    // Determine questions to evaluate (from attempt.question_ids or responses)
    const questionIds =
      Array.isArray(attempt.question_ids) && attempt.question_ids.length > 0
        ? attempt.question_ids
        : responses.map((r) => r.question_id)

    const questions = await Question.find({ _id: { $in: questionIds } }).populate('competency_id')
    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]))

    const clientResponsesMap = new Map()
    responses.forEach((r) => {
      if (r && r.question_id) {
        clientResponsesMap.set(r.question_id.toString(), r)
      }
    })

    // Grade each response server-side
    const gradedResponses = []
    const competencyStats = new Map()
    let totalCorrect = 0

    for (const q of questions) {
      const qIdStr = q._id.toString()
      const userSubmission = clientResponsesMap.get(qIdStr)
      const selectedOptionId = userSubmission?.selected_option_id || null
      const timeTaken = Math.max(0, Number(userSubmission?.time_taken_seconds) || 0)

      const isCorrect = Boolean(selectedOptionId && selectedOptionId === q.correct_option_id)
      if (isCorrect) totalCorrect++

      // Create persistent AssessmentResponse
      const respDoc = await AssessmentResponse.create({
        user_id: userId,
        attempt_id: attempt._id,
        question_id: q._id,
        selected_option_id: selectedOptionId,
        is_correct: isCorrect,
        time_taken_seconds: timeTaken,
      })
      gradedResponses.push(respDoc)

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

    // Compute per-competency scores and write to UserCompetency collection
    const perCompetencyScores = []
    for (const stat of competencyStats.values()) {
      const percentage = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0
      const derivedLevel = mapPercentageToLevel(percentage)

      const itemScore = {
        competency_id: stat.competency_id,
        competency_name: stat.competency_name,
        correct: stat.correct,
        total: stat.total,
        percentage,
        derived_level: derivedLevel,
      }
      perCompetencyScores.push(itemScore)

      // Upsert user_competencies with new assessed level
      if (stat.competency_id !== 'unclassified') {
        await UserCompetency.findOneAndUpdate(
          { user_id: userId, competency_id: stat.competency_id },
          {
            current_level: derivedLevel,
            last_assessed_at: new Date(),
            assessment_attempt_id: attempt._id,
            source: 'diagnostic_test',
          },
          { upsert: true, new: true }
        )
      }
    }

    // Mark attempt completed with overall score
    const totalQuestions = questions.length || 15
    const overallScore = Math.round((totalCorrect / totalQuestions) * 100)

    attempt.status = 'completed'
    attempt.completed_at = new Date()
    attempt.overall_score = overallScore
    await attempt.save()

    // Formally graduate user: set onboarding_completed = true
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        onboarding_completed: true,
      },
      { new: true }
    )

    // Trigger deterministic skill gap computation + AI recommendations + learning path generation
    let pipelineResult = null
    try {
      pipelineResult = await runSkillGapAndRecommendationPipeline(userId, attempt._id)
      console.log(`[Diagnostic Assessment] Skill gap & AI recommendation pipeline completed for user ${userId}.`)
    } catch (pipelineErr) {
      console.error(`[Diagnostic Assessment] Error running skill gap pipeline for user ${userId}:`, pipelineErr.message)
    }

    return res.status(200).json({
      success: true,
      attemptId: attempt._id,
      overall_score: overallScore,
      total_questions: totalQuestions,
      total_correct: totalCorrect,
      per_competency_scores: perCompetencyScores,
      onboarding_completed: true,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        level: updatedUser.level,
        onboarding_completed: updatedUser.onboarding_completed,
      },
      skill_gaps_count: pipelineResult?.gaps?.length || 0,
      recommendations_count: pipelineResult?.recommendations?.length || 0,
      learning_path_id: pipelineResult?.learningPath?._id || null,
      summary: {
        title: 'Diagnostic Assessment Completed',
        message: `You answered ${totalCorrect} of ${totalQuestions} questions correctly (${overallScore}%). Your baseline competency ratings, skill gaps, and AI recommendations have been generated.`,
      },
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  startDiagnosticAssessment,
  submitDiagnosticAssessment,
}
