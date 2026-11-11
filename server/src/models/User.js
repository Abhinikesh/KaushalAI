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
    // Persistent Google subject identifier (verified sub claim from Google ID token)
    googleSub: {
      type: String,
      default: null,
      trim: true,
      validate: {
        validator: function (v) {
          if (v === null || v === undefined) return true
          return typeof v === 'string' && v.trim().length > 0
        },
        message: 'googleSub cannot be an empty or whitespace string.',
      },
    },
    role: {
      type: String,
      enum: ['employee', 'admin'],
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
    experience_years: {
      type: Number,
      min: 0,
      default: 0,
      alias: 'experienceYears',
    },
    education_level: {
      type: String,
      default: null,
      trim: true,
    },
    field_of_study: {
      type: String,
      default: null,
      trim: true,
    },
    certifications: {
      type: [String],
      default: [],
    },
    current_responsibilities: {
      type: [String],
      default: [],
    },
    functional_area_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FunctionalArea',
      default: null,
      index: true,
    },
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      default: null,
      index: true,
    },
    onboarding_completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    onboarding_step: {
      type: Number,
      min: 1,
      max: 6,
      default: 1,
      index: true,
    },
    learning_interests: {
      type: [String],
      default: [],
    },
    skills_to_develop: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Competency',
      },
    ],
    onboarding_draft: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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
    phone: {
      type: String,
      default: null,
    },
    personalEmail: {
      type: String,
      default: null,
    },
    dateOfBirth: {
      type: String,
      default: null,
    },
    gender: {
      type: String,
      default: null,
    },
    nationality: {
      type: String,
      default: null,
    },
    address: {
      type: String,
      default: null,
    },
    workLocation: {
      type: String,
      default: null,
    },
    gradeLevel: {
      type: String,
      default: null,
    },
    level: {
      type: Number,
      min: 1,
      max: 5,
      default: 1,
    },
    dateOfJoining: {
      type: String,
      default: null,
    },
    reportingTo: {
      type: String,
      default: null,
    },
    areasOfWork: {
      type: [String],
      default: [],
    },
    emergencyContact: {
      contactPerson: { type: String, default: null },
      relationship:  { type: String, default: null },
      phone:         { type: String, default: null },
    },
    cadre: {
      type: String,
      default: null,
    },
    batch: {
      type: String,
      default: null,
    },
    profileCompletion: {
      type: Number,
      default: 0,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    previousTrainings: {
      type: [String],
      default: [],
    },
    preferences: {
      courseAlerts:    { type: Boolean, default: true },
      quizReminders:   { type: Boolean, default: true },
      weeklyDigest:    { type: Boolean, default: false },
      theme:           { type: String, default: 'abyss' },
      appearanceMode:  { type: String, enum: ['light', 'dark'], default: 'light' },
      language:        { type: String, default: 'en' },
      setupCompleted:  { type: Boolean, default: false },
    },
    // ISSUE-17-2-C: Detectable recovery state for failed quiz-to-SkillGap syncs
    needs_skillgap_sync: {
      type: Boolean,
      default: false,
      index: true,
    },
    skillgap_sync_error: {
      type: String,
      default: null,
    },
    skillgap_sync_requested_at: {
      type: Date,
      default: null,
    },
    // ISSUE-17-2-D: Optimistic concurrency tracking token for active calculations
    latest_calculation_token: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true }
)

// Partial unique index: enforces uniqueness for valid non-empty googleSub strings
userSchema.index(
  { googleSub: 1 },
  {
    unique: true,
    partialFilterExpression: { googleSub: { $type: 'string', $gt: '' } },
  }
)

// Clean googleSub: normalize whitespace; convert empty string to null before validation
userSchema.pre('validate', function (next) {
  if (typeof this.googleSub === 'string') {
    const trimmed = this.googleSub.trim()
    this.googleSub = trimmed.length > 0 ? trimmed : null
  }
  next()
})

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
