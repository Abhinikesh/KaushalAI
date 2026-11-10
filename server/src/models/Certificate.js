'use strict'

const mongoose = require('mongoose')

const certificateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      default: null,
    },
    type: {
      type: String,
      enum: ['assessment_mastery', 'course_completion'],
      required: true,
      default: 'assessment_mastery',
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    recipientName: {
      type: String,
      trim: true,
      default: '',
    },
    score: {
      type: Number,
      default: 100,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    certificateId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['valid', 'revoked'],
      default: 'valid',
      index: true,
    },
  },
  { timestamps: true }
)

certificateSchema.index(
  { userId: 1, quizId: 1 },
  { unique: true, partialFilterExpression: { quizId: { $type: 'objectId' } } }
)

certificateSchema.index(
  { userId: 1, courseId: 1 },
  { unique: true, partialFilterExpression: { courseId: { $type: 'objectId' } } }
)

module.exports = mongoose.model('Certificate', certificateSchema)
