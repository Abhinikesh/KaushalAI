'use strict'

const mongoose = require('mongoose')

const assessmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      default: 'diagnostic',
      trim: true,
    },
    level: {
      type: Number,
      min: 1,
      max: 5,
      default: 1,
    },
    total_questions: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'assessments',
  }
)

module.exports = mongoose.model('Assessment', assessmentSchema)
