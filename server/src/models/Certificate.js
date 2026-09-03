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
    title: {
      type: String,
      required: true,
      trim: true,
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
  },
  { timestamps: true }
)

module.exports = mongoose.model('Certificate', certificateSchema)
