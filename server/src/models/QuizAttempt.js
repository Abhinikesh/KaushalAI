const { Schema, model } = require('mongoose')

const quizAttemptSchema = new Schema(
  {
    userId: { type: Schema.Types.Mixed, required: true, index: true },
    quizId: { type: Schema.Types.Mixed, required: true, index: true },
    quizTitle: { type: String, default: '' },
    domain: { type: String, default: 'Data Management' },
    answers: [
      {
        questionId: { type: Schema.Types.Mixed, required: true },
        selectedOptionIndex: { type: Number, required: true },
      },
    ],
    score: { type: Number, required: true, min: 0, max: 100 },
    correctCount: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    passed: { type: Boolean, default: false },
    detailedResults: [
      {
        id: Schema.Types.Mixed,
        number: Number,
        text: String,
        options: [String],
        correctOption: Number,
        userAnswer: Number,
        isCorrect: Boolean,
        explanation: String,
      },
    ],
    competencyUpdates: [
      {
        competencyId: { type: Schema.Types.ObjectId, ref: 'Competency' },
        previousLevel: { type: Number, min: 1, max: 5 },
        newLevel: { type: Number, min: 1, max: 5 },
      },
    ],
    attemptedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

module.exports = model('QuizAttempt', quizAttemptSchema)
