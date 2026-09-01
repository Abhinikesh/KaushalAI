const { Schema, model } = require('mongoose')

const quizAttemptSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    answers: [
      {
        questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
        selectedOptionIndex: { type: Number, required: true, min: 0, max: 3 },
      },
    ],
    score: { type: Number, required: true, min: 0, max: 100 },       // percentage, 1 decimal
    correctCount: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    // Each entry represents a competency that was improved by this attempt.
    // Empty array means either no tags on the quiz or no improvement occurred.
    competencyUpdates: [
      {
        competencyId: { type: Schema.Types.ObjectId, ref: 'Competency' },
        previousLevel: { type: Number, min: 1, max: 5 },
        newLevel: { type: Number, min: 1, max: 5 },
      },
    ],
    attemptedAt: { type: Date, default: Date.now },
  },
  { timestamps: false } // attemptedAt is our canonical timestamp
)

module.exports = model('QuizAttempt', quizAttemptSchema)
