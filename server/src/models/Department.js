'use strict'

const mongoose = require('mongoose')

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    ministry: {
      type: String,
      required: true,
      trim: true,
      default: 'Ministry of Statistics and Programme Implementation',
    },
  },
  {
    timestamps: true,
    collection: 'departments',
  }
)

module.exports = mongoose.model('Department', departmentSchema)
