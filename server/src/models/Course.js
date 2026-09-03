const mongoose = require('mongoose')

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      required: true,
      enum: ['igot', 'nssta'],
    },
    externalCourseId: {
      type: String,
      trim: true,
    },
    targetGroup: {
      type: String,
      trim: true,
    },
    skillTags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Competency',
      },
    ],
    difficulty: {
      type: String,
      required: true,
      enum: ['beginner', 'intermediate', 'advanced'],
    },
    durationHours: {
      type: Number,
      min: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Course', courseSchema)
