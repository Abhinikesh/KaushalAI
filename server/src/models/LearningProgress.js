'use strict'

const mongoose = require('mongoose')

const learningProgressSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    course_id: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    course_completed: {
      type: Boolean,
      default: false,
    },
    quiz_passed: {
      type: Boolean,
      default: false,
    },
    quiz_score: {
      type: Number,
      default: 0,
    },
    lab_unlocked: {
      type: Boolean,
      default: false,
    },
    lab_completed: {
      type: Boolean,
      default: false,
    },
    lab_score: {
      type: Number,
      default: 0,
    },
    lab_completed_at: {
      type: Date,
      default: null,
    },
    lab_id: {
      type: String,
      default: null,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'learning_progress',
  }
)

learningProgressSchema.index({ user_id: 1, course_id: 1 }, { unique: true })

module.exports = mongoose.model('LearningProgress', learningProgressSchema)
