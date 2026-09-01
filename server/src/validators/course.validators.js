const Joi = require('joi')

const courseSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).required(),
  description: Joi.string().trim().max(2000),
  source: Joi.string().valid('igot', 'nssta').required(),
  externalCourseId: Joi.string().trim().max(100),
  skillTags: Joi.array().items(Joi.string().hex().length(24)).default([]),
  difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
  durationHours: Joi.number().min(0),
})

const enrollSchema = Joi.object({
  courseId: Joi.string().hex().length(24).required(),
})

const progressSchema = Joi.object({
  progressPercent: Joi.number().integer().min(0).max(100).required(),
})

module.exports = { courseSchema, enrollSchema, progressSchema }
