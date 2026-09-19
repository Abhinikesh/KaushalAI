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
    /* ── Ratings ──────────────────────────────────────────────── */
    ratingSum:   { type: Number, default: 0, min: 0 },
    ratingCount: { type: Number, default: 0, min: 0 },
    // Map of userId -> star (1-5) so each user can only rate once
    ratings: {
      type: Map,
      of: Number,
      default: {},
    },
    /* Seed default so listings look good before real ratings come in */
    defaultRating: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true } }
)

/* Virtual: return real average if ratings exist, else defaultRating */
courseSchema.virtual('rating').get(function () {
  if (this.ratingCount > 0) {
    return Math.round((this.ratingSum / this.ratingCount) * 10) / 10
  }
  return this.defaultRating || 4.3
})

courseSchema.virtual('reviewsCount').get(function () {
  return this.ratingCount || 0
})

module.exports = mongoose.model('Course', courseSchema)
