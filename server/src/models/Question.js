'use strict'

const { Schema, model } = require('mongoose')

const questionSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      alias: 'questionText',
    },
    options: {
      type: [Schema.Types.Mixed],
      required: true,
      default: [],
    },
    correct_option_id: {
      type: String,
      default: null,
    },
    correctOptionIndex: {
      type: Number,
      default: null,
    },
    competency_id: {
      type: Schema.Types.ObjectId,
      ref: 'Competency',
      default: null,
      index: true,
    },
    level: {
      type: Number,
      min: 1,
      max: 5,
      default: 1,
      // 1=Support Staff, 2=Junior Assistant, 3=Section Officer, 4=Senior Officer, 5=Department Head
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    explanation: {
      type: String,
      default: '',
    },
    quizId: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'questions',
  }
)

questionSchema.index({ competency_id: 1, level: 1 })

module.exports = model('Question', questionSchema)
