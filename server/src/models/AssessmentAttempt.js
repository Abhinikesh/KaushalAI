'use strict'

const mongoose = require('mongoose')

const assessmentAttemptSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assessment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: true,
      index: true,
    },
    started_at: {
      type: Date,
      default: Date.now,
    },
    completed_at: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed'],
      default: 'in_progress',
      index: true,
    },
    overall_score: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'assessment_attempts',
  }
)

assessmentAttemptSchema.index({ user_id: 1, assessment_id: 1, started_at: -1 })

module.exports = mongoose.model('AssessmentAttempt', assessmentAttemptSchema)
