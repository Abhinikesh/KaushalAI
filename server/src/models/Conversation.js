'use strict'

const mongoose = require('mongoose')

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      default: 'New Conversation',
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    messageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
)

// Index for listing user's conversations sorted by latest activity
conversationSchema.index({ userId: 1, lastMessageAt: -1 })
conversationSchema.index({ userId: 1, status: 1, lastMessageAt: -1 })

module.exports = mongoose.model('Conversation', conversationSchema)

