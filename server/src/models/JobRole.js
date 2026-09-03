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
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium',
    },
    requirementType: {
      type: String,
      enum: ['Core', 'Supporting', 'Emerging'],
      default: 'Core',
    },
  },
  { _id: false }
)

const jobRoleSchema = new mongoose.Schema(
  {
    roleCode: {
      type: String,
      trim: true,
      index: true,
    },
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
