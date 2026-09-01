const Question = require('../models/Question')

/**
 * Score a quiz attempt against the stored correct answers.
 *
 * @param {Object[]} questionDocs  - Populated Question documents from the DB
 * @param {Object[]} answers       - [{questionId, selectedOptionIndex}] from the request
 * @returns {{ score, correctCount, totalQuestions, perQuestionResult }}
 */
function scoreAttempt(questionDocs, answers) {
  // Build lookup map: questionId (string) -> Question document
  const questionMap = new Map(questionDocs.map((q) => [q._id.toString(), q]))

  let correctCount = 0
  const perQuestionResult = answers.map(({ questionId, selectedOptionIndex }) => {
    const question = questionMap.get(questionId.toString())
    // Caller must validate question membership before calling this function.
    // Guard here anyway — missing question counts as incorrect.
    if (!question) {
      return { questionId, correct: false, correctOptionIndex: null, explanation: null }
    }

    const correct = selectedOptionIndex === question.correctOptionIndex
    if (correct) correctCount += 1

    return {
      questionId,
      correct,
      correctOptionIndex: question.correctOptionIndex,
      explanation: question.explanation,
    }
  })

  const totalQuestions = answers.length
  const score = totalQuestions > 0
    ? Math.round((correctCount / totalQuestions) * 1000) / 10  // 1 decimal, e.g. 66.7
    : 0

  return { score, correctCount, totalQuestions, perQuestionResult }
}

module.exports = { scoreAttempt }
