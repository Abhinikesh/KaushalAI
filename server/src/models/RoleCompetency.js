'use strict'

const mongoose = require('mongoose')

const roleCompetencySchema = new mongoose.Schema(
  {
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
      index: true,
    },
    competency_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competency',
      required: true,
      index: true,
    },
    required_level: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
    collection: 'role_competencies',
  }
)

roleCompetencySchema.index({ role_id: 1, competency_id: 1 }, { unique: true })

module.exports = mongoose.model('RoleCompetency', roleCompetencySchema)
