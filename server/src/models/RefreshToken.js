const mongoose = require('mongoose')

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    replacedByTokenHash: {
      type: String,
      default: null,
    },
    graceCount: {
      type: Number,
      default: 0,
    },
    rotationState: {
      type: String,
      enum: ['idle', 'in_progress', 'committed', 'failed'],
      default: 'idle',
      index: true,
    },
    rotationStartedAt: {
      type: Date,
      default: null,
    },
    rotationAttemptId: {
      type: String,
      default: null,
    },
    supersededAttemptId: {
      type: String,
      default: null,
    },
    supersededTokenHash: {
      type: String,
      default: null,
    },
    recoveryCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
)

// MongoDB auto-deletes documents once expiresAt is past
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
refreshTokenSchema.index({ familyId: 1, revoked: 1 })

module.exports = mongoose.model('RefreshToken', refreshTokenSchema)
