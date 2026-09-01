const { Schema, model } = require('mongoose')

const questionSchema = new Schema(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    questionText: { type: String, required: true },
    options: {
      type: [String],
      required: true,
      validate: { validator: (v) => v.length === 4, message: 'Exactly 4 options required' },
    },
    correctOptionIndex: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  },
  { timestamps: true }
)

module.exports = model('Question', questionSchema)
