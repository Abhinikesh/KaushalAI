'use strict'

const mongoose = require('mongoose')

const learningPathItemSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    learning_path_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningPath',
      required: true,
      index: true,
    },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    sequence_order: {
      type: Number,
      required: true,
      default: 1,
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'learning_path_items',
  }
)

learningPathItemSchema.index({ learning_path_id: 1, sequence_order: 1 })
learningPathItemSchema.index({ user_id: 1, learning_path_id: 1 })

module.exports = mongoose.model('LearningPathItem', learningPathItemSchema)
