'use strict'

const mongoose = require('mongoose')

const functionalAreaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'functional_areas',
  }
)

module.exports = mongoose.model('FunctionalArea', functionalAreaSchema)
