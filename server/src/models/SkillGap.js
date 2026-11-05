'use strict'

const mongoose = require('mongoose')

const skillGapSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // ISSUE-17-2-D: Tag each SkillGap with the authoritative role it was computed for
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      default: null,
      index: true,
    },
    // ISSUE-17-2-D: Unique token of the calculation run that produced or updated this gap
    calculation_token: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    competency_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competency',
      required: true,
      index: true,
    },
    current_level: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
    },
    required_level: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    gap: {
      type: Number,
      required: true,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      required: true,
      default: 'medium',
      index: true,
    },
    computed_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'skill_gaps',
  }
)

skillGapSchema.index({ user_id: 1, competency_id: 1 }, { unique: true })
skillGapSchema.index({ user_id: 1, priority: 1 })

module.exports = mongoose.model('SkillGap', skillGapSchema)
