const mongoose = require('mongoose')

const competencySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['statistical', 'technical', 'digital_governance', 'behavioural'],
    },
    description: {
      type: String,
      trim: true,
    },
    competencyCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
    },
    levelDescriptions: {
      beginner:     { type: String, default: '' },
      intermediate: { type: String, default: '' },
      advanced:     { type: String, default: '' },
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Competency', competencySchema)
