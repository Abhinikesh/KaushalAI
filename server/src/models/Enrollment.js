const mongoose = require('mongoose')

const enrollmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['recommended', 'enrolled', 'in_progress', 'completed'],
      default: 'enrolled',
    },
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    completedModules: {
      type: [Number],
      default: [],
    },
    lastAccessedAt: {
      type: Date,
      default: null,
    },
    needsProgressSync: {
      type: Boolean,
      default: false,
    },
    progressSyncError: {
      type: String,
      default: null,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    contentProgressSummary: {
      completedContentItems: { type: Number, default: 0 },
      totalRequiredContentItems: { type: Number, default: 0 },
      eligibleModulesCount: { type: Number, default: 0 },
      completedModulesCount: { type: Number, default: 0 },
      completionPolicy: { type: String, default: 'server_authoritative_module_evidence' },
    },
    courseSnapshot: {
      title: { type: String },
      source: { type: String },
      provider: { type: String },
      externalCourseId: { type: String },
      difficulty: { type: String },
      durationHours: { type: Number },
    },
  },
  { timestamps: true }
)

enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true })

module.exports = mongoose.model('Enrollment', enrollmentSchema)
