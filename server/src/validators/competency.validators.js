const Joi = require('joi')

const competencySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  category: Joi.string()
    .valid('statistical', 'technical', 'digital_governance', 'behavioural')
    .required(),
  description: Joi.string().trim().max(500),
})

const jobRoleSchema = Joi.object({
  title: Joi.string().trim().min(2).max(100).required(),
  department: Joi.string().trim().max(100),
  requiredCompetencies: Joi.array()
    .items(
      Joi.object({
        competencyId: Joi.string().hex().length(24).required(),
        requiredLevel: Joi.number().integer().min(1).max(5).required(),
      })
    )
    .default([]),
})

const selfAssessSchema = Joi.object({
  level: Joi.number().integer().min(1).max(5).required(),
})

const setJobRoleSchema = Joi.object({
  jobRoleId: Joi.string().hex().length(24).required(),
})

module.exports = { competencySchema, jobRoleSchema, selfAssessSchema, setJobRoleSchema }
