const Joi = require('joi')

const slideSchema = Joi.object({
  _id: Joi.any().optional(),
  slideNumber: Joi.number().optional(),
  title: Joi.string().trim().allow('').optional(),
  bulletPoints: Joi.array().items(Joi.string().trim().allow('')).default([]),
  imageUrl: Joi.string().trim().allow('', null).optional(),
  notes: Joi.string().trim().allow('', null).optional(),
}).unknown(true)

const moduleSchema = Joi.object({
  _id: Joi.any().optional(),
  title: Joi.string().trim().min(1).max(300).required(),
  durationMins: Joi.number().min(0).default(30),
  youtubeUrl: Joi.string().trim().allow('', null).optional(),
  slides: Joi.array().items(slideSchema).default([]),
}).unknown(true)

const resourceSchema = Joi.object({
  _id: Joi.any().optional(),
  label: Joi.string().trim().max(200).allow('').optional(),
  type: Joi.string().valid('PDF', 'Link', 'Video', 'Other').default('PDF'),
  url: Joi.string().trim().allow('', null).optional(),
  sizeMB: Joi.string().trim().allow('').optional(),
}).unknown(true)

const skillTagItemSchema = Joi.alternatives().try(
  Joi.string().trim(),
  Joi.object().unknown(true)
)

const courseSchema = Joi.object({
  _id: Joi.any().optional(),
  title: Joi.string().trim().min(2).max(300).required(),
  description: Joi.string().trim().max(5000).allow('').optional(),
  shortDescription: Joi.string().trim().max(400).allow('').optional(),
  source: Joi.string().valid('igot', 'nssta', 'mospi', 'other').required(),
  provider: Joi.string().trim().max(200).allow('').optional(),
  externalCourseId: Joi.string().trim().max(100).allow('').optional(),
  youtubeUrl: Joi.string().trim().allow('', null).optional(),
  slides: Joi.array().items(slideSchema).default([]),
  targetGroup: Joi.string().trim().max(200).allow('').optional(),
  category: Joi.string().trim().max(200).allow('').optional(),
  competencyTags: Joi.array().items(Joi.string().trim()).default([]),
  skillTags: Joi.array().items(skillTagItemSchema).default([]),
  difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
  language: Joi.string().trim().max(100).allow('').optional(),
  durationHours: Joi.number().min(0).optional(),
  prerequisites: Joi.string().trim().max(500).allow('').optional(),
  objectives: Joi.array().items(Joi.string().trim()).default([]),
  modules: Joi.array().items(moduleSchema).default([]),
  transcript: Joi.string().trim().max(20000).allow('').optional(),
  resources: Joi.array().items(resourceSchema).default([]),
  isPublished: Joi.boolean().default(true),
}).unknown(true)

const courseUpdateSchema = courseSchema.fork(
  ['title', 'source', 'difficulty'],
  (schema) => schema.optional()
)

const enrollSchema = Joi.object({
  courseId: Joi.string().required(), // allow both ObjectId and externalCourseId strings
})

const progressSchema = Joi.object({
  progressPercent: Joi.number().integer().min(0).max(100).required(),
})

module.exports = { courseSchema, courseUpdateSchema, enrollSchema, progressSchema }
