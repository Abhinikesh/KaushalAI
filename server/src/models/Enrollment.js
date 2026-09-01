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
  },
  { timestamps: true }
)

enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true })

module.exports = mongoose.model('Enrollment', enrollmentSchema)
