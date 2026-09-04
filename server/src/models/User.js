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
    phone: {
      type: String,
      default: '+91 98765 43210',
    },
    personalEmail: {
      type: String,
      default: null,
    },
    dateOfBirth: {
      type: String,
      default: '15 March 1990',
    },
    gender: {
      type: String,
      default: 'Male',
    },
    nationality: {
      type: String,
      default: 'Indian',
    },
    aadhaarMasked: {
      type: String,
      default: 'XXXX XXXX 5678',
    },
    address: {
      type: String,
      default: 'C-123, Sector 15, Rohini, New Delhi - 110085, India',
    },
    workLocation: {
      type: String,
      default: 'New Delhi, India',
    },
    gradeLevel: {
      type: String,
      default: 'Level 10',
    },
    dateOfJoining: {
      type: String,
      default: '12 August 2016',
    },
    reportingTo: {
      type: String,
      default: 'Deputy Director (Statistics)',
    },
    areasOfWork: {
      type: [String],
      default: ['Data Collection', 'Statistical Analysis', 'Survey Design', 'Data Quality Assurance', 'Report Preparation', 'Dissemination'],
    },
    emergencyContact: {
      contactPerson: { type: String, default: 'Suresh Kumar (Father)' },
      relationship:  { type: String, default: 'Father' },
      phone:         { type: String, default: '+91 98765 43211' },
    },
    cadre: {
      type: String,
      default: 'Indian Statistical Service (ISS)',
    },
    batch: {
      type: String,
      default: '2016',
    },
    profileCompletion: {
      type: Number,
      default: 85,
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
