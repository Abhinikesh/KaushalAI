'use strict'

const mongoose = require('mongoose')

/**
 * Persisted unit-level learning activity evidence for Phase 36.2.2.
 * Each record binds an authenticated learner + Enrollment + Course + Module + Content unit.
 * Uniquely indexed on (enrollmentId, moduleId, contentType, contentId) for idempotency.
 */
const learningActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    moduleIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    contentType: {
      type: String,
      required: true,
      enum: ['slide', 'video_lesson'],
    },
    contentId: {
      type: String,
      required: true,
      trim: true,
    },
    slideNumber: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      required: true,
      enum: ['completed'],
      default: 'completed',
    },
    // Honestly distinguishes slide views vs learner acknowledgement of external YouTube video embeds
    evidenceKind: {
      type: String,
      required: true,
      enum: ['slide_view', 'learner_acknowledgement'],
    },
    watchDurationSec: {
      type: Number,
      default: 0,
      min: 0,
      max: 86400,
    },
    firstCompletedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastActivityAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    clientTimestamp: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'learning_activities',
  }
)

learningActivitySchema.index(
  { enrollmentId: 1, moduleId: 1, contentType: 1, contentId: 1 },
  { unique: true }
)
learningActivitySchema.index({ userId: 1, courseId: 1 })

module.exports = mongoose.model('LearningActivity', learningActivitySchema)

