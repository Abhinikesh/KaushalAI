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
  },
  { timestamps: true }
)

module.exports = mongoose.model('Competency', competencySchema)
