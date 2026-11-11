'use strict'

const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 8000,
    },
    provider: {
      type: String,
      trim: true,
      default: null,
    },
    model: {
      type: String,
      trim: true,
      default: null,
    },
    tokensUsed: {
      type: Number,
      default: null,
    },
    clientMessageId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    feedback: {
      type: String,
      enum: ['helpful', 'not-helpful', null],
      default: null,
    },
    isSaved: {
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

// Index for chronological retrieval of conversation messages
messageSchema.index({ conversationId: 1, createdAt: 1 })
// Sparse compound index for client idempotency checks
messageSchema.index(
  { userId: 1, conversationId: 1, clientMessageId: 1 },
  { sparse: true }
)

module.exports = mongoose.model('Message', messageSchema)

