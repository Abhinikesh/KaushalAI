'use strict'

const mongoose = require('mongoose')

const assessmentResponseSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    attempt_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentAttempt',
      required: true,
      index: true,
    },
    question_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
      index: true,
    },
    selected_option_id: {
      type: String,
      default: null,
    },
    is_correct: {
      type: Boolean,
      default: false,
    },
    time_taken_seconds: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'assessment_responses',
  }
)

assessmentResponseSchema.index({ attempt_id: 1, question_id: 1 })
assessmentResponseSchema.index({ user_id: 1, attempt_id: 1 })

module.exports = mongoose.model('AssessmentResponse', assessmentResponseSchema)
