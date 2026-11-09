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
    // PART 17.2.3: Track previous cadre role for atomic, role-scoped obsolete record cleanup
    previous_role_id: {
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
      default: 'Level 1',
    },
    level: {
      type: Number,
      min: 1,
      max: 5,
      default: 1,
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

// PART 17.2.3: Automatic tracking of previous_role_id across document and query mutations
userSchema.post('init', function () {
  this._originalRoleId = this.role_id
})

userSchema.post('save', function () {
  this._originalRoleId = this.role_id
})

// Enforce: must have either a password OR be google-linked, and record role transitions
userSchema.pre('save', async function () {
  if (this.isModified('role_id')) {
    if (!this.isNew) {
      if (!this._originalRoleId) {
        try {
          const existing = await this.constructor.findById(this._id).select('role_id').lean()
          if (existing && existing.role_id) {
            this._originalRoleId = existing.role_id
          }
        } catch {
          // Non-blocking query check
        }
      }
      if (this._originalRoleId && String(this._originalRoleId) !== String(this.role_id)) {
        this.previous_role_id = this._originalRoleId
      }
    } else {
      this._originalRoleId = this.role_id
    }
  }
  if (!this.passwordHash && !this.googleLinked) {
    throw new Error('A user account must have either a password or be Google-linked.')
  }
})

userSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], async function () {
  try {
    const update = this.getUpdate()
    if (!update) return
    const newRoleId = update.role_id !== undefined ? update.role_id : update.$set?.role_id
    if (newRoleId !== undefined) {
      const docToUpdate = await this.model.findOne(this.getQuery()).select('role_id').lean()
      if (docToUpdate && docToUpdate.role_id && String(docToUpdate.role_id) !== String(newRoleId)) {
        if (update.$set) {
          update.$set.previous_role_id = docToUpdate.role_id
        } else {
          update.previous_role_id = docToUpdate.role_id
        }
      }
    }
  } catch (err) {
    // Non-blocking query middleware hook
  }
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
