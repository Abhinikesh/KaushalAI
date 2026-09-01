const mongoose = require('mongoose')

const requiredCompetencySchema = new mongoose.Schema(
  {
    competencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competency',
      required: true,
    },
    requiredLevel: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  { _id: false }
)

const jobRoleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    requiredCompetencies: [requiredCompetencySchema],
  },
  { timestamps: true }
)

module.exports = mongoose.model('JobRole', jobRoleSchema)
