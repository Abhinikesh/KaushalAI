'use strict'

const mongoose = require('mongoose')

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      // 1=Support Staff, 2=Junior Assistant, 3=Section Officer, 4=Senior Officer, 5=Department Head
    },
    department_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'roles',
  }
)

roleSchema.index({ department_ref: 1, level: 1 })

module.exports = mongoose.model('Role', roleSchema)
