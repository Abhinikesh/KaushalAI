'use strict'

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Optional — null for Google-linked accounts that haven't set a password
    passwordHash: {
      type: String,
      default: null,
    },
    // True for accounts created via "Continue with Google"
    googleLinked: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['employee', 'trainer', 'admin'],
      default: 'employee',
    },
    // Populated from the AuthorizedOfficer record at signup — not user-provided
    employeeId: {
      type: String,
      default: null,
      index: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    experienceYears: {
      type: Number,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    jobRoleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobRole',
      default: null,
    },
    qualifications: {
      type: [String],
      default: [],
    },
    previousTrainings: {
      type: [String],
      default: [],
    },
    preferences: {
      courseAlerts:  { type: Boolean, default: true },
      quizReminders: { type: Boolean, default: true },
      weeklyDigest:  { type: Boolean, default: false },
      theme:         { type: String, default: 'light' },
      language:      { type: String, default: 'en' },
    },
  },
  { timestamps: true }
)

// Enforce: must have either a password OR be google-linked
userSchema.pre('save', function (next) {
  if (!this.passwordHash && !this.googleLinked) {
    return next(new Error('A user account must have either a password or be Google-linked.'))
  }
  next()
})

userSchema.methods.comparePassword = function (plainPassword) {
  if (!this.passwordHash) return Promise.resolve(false)
  return bcrypt.compare(plainPassword, this.passwordHash)
}

// Strip sensitive fields from every JSON serialisation
userSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.passwordHash
  delete obj.__v
  return obj
}

module.exports = mongoose.model('User', userSchema)
