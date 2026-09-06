'use strict'

const mongoose = require('mongoose')

const userCompetencySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      alias: 'userId',
    },
    competency_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competency',
      required: true,
      index: true,
      alias: 'competencyId',
    },
    current_level: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      alias: 'currentLevel',
    },
    last_assessed_at: {
      type: Date,
      default: Date.now,
      alias: 'lastAssessedAt',
    },
    assessment_attempt_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentAttempt',
      default: null,
      alias: 'assessmentAttemptId',
    },
    source: {
      type: String,
      default: 'diagnostic_test',
    },
  },
  {
    timestamps: true,
    collection: 'user_competencies',
  }
)

// One record per user per competency — scoped to user_id
userCompetencySchema.index({ user_id: 1, competency_id: 1 }, { unique: true })

module.exports = mongoose.model('UserCompetency', userCompetencySchema)
