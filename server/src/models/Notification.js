'use strict'

const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['recommendation_ready', 'quiz_scored', 'competency_levelup', 'material_reviewed', 'system'],
      default: 'system',
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    relatedId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Notification', notificationSchema)
