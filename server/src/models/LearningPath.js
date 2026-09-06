'use strict'

const mongoose = require('mongoose')

const learningPathSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    target_role: {
      type: String,
      required: true,
      trim: true,
    },
    target_competency_level: {
      type: Number,
      min: 1,
      max: 5,
      default: 1,
    },
    generated_at: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'in_progress', 'completed', 'archived'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'learning_paths',
  }
)

learningPathSchema.index({ user_id: 1, status: 1 })

module.exports = mongoose.model('LearningPath', learningPathSchema)
