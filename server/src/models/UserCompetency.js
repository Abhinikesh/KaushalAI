const mongoose = require('mongoose')

const userCompetencySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    competencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competency',
      required: true,
    },
    currentLevel: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    source: {
      type: String,
      required: true,
      enum: ['self_assessed', 'quiz', 'course_completion'],
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

// One record per user per competency — upsert updates in place
userCompetencySchema.index({ userId: 1, competencyId: 1 }, { unique: true })

module.exports = mongoose.model('UserCompetency', userCompetencySchema)
