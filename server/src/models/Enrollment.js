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
