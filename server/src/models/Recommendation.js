'use strict'

const mongoose = require('mongoose')

const recommendationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    priority_rank: {
      type: Number,
      default: 1,
      index: true,
    },
    generated_at: {
      type: Date,
      default: Date.now,
    },
    assessment_attempt_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentAttempt',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'recommendations',
  }
)

recommendationSchema.index({ user_id: 1, priority_rank: 1 })
recommendationSchema.index({ user_id: 1, course_id: 1 })

module.exports = mongoose.model('Recommendation', recommendationSchema)
