'use strict'

const mongoose = require('mongoose')

const courseCompetencySchema = new mongoose.Schema(
  {
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    competency_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competency',
      required: true,
      index: true,
    },
    relevance_weight: {
      type: Number,
      default: 1.0,
      min: 0,
      max: 1,
    },
  },
  {
    timestamps: true,
    collection: 'course_competencies',
  }
)

courseCompetencySchema.index({ course_id: 1, competency_id: 1 }, { unique: true })

module.exports = mongoose.model('CourseCompetency', courseCompetencySchema)
