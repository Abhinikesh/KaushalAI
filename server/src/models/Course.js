const mongoose = require('mongoose')

const moduleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    durationMins: { type: Number, default: 30 },
    youtubeUrl: { type: String, trim: true, default: '' },
  },
  { _id: true }
)

const resourceSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    type: { type: String, enum: ['PDF', 'Link', 'Video', 'Other'], default: 'PDF' },
    url: { type: String, trim: true, default: '' },
    sizeMB: { type: String, trim: true, default: '' },
  },
  { _id: false }
)

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
      default: '',
    },
    shortDescription: {
      type: String,
      trim: true,
      max: 300,
      default: '',
    },
    source: {
      type: String,
      required: true,
      enum: ['igot', 'nssta', 'mospi', 'other'],
      default: 'igot',
    },
    provider: {
      type: String,
      trim: true,
      default: 'iGOT Karmayogi',
    },
    externalCourseId: {
      type: String,
      trim: true,
      default: '',
    },
    youtubeUrl: {
      type: String,
      trim: true,
      default: '',
    },
    targetGroup: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    competencyTags: [
      {
        type: String,
        trim: true,
      },
    ],
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
      default: 'beginner',
    },
    language: {
      type: String,
      trim: true,
      default: 'English',
    },
    durationHours: {
      type: Number,
      min: 0,
      default: 1,
    },
    prerequisites: {
      type: String,
      trim: true,
      default: 'None',
    },
    objectives: [
      {
        type: String,
        trim: true,
      },
    ],
    modules: [moduleSchema],
    transcript: {
      type: String,
      trim: true,
      default: '',
    },
    resources: [resourceSchema],
    isPublished: {
      type: Boolean,
      default: true,
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
