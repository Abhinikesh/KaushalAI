const Joi = require('joi')

const passwordRule = Joi.string()
  .min(8)
  .pattern(/[0-9]/, 'at least one number')
  .required()
  .messages({
    'string.pattern.name': '{{#label}} must contain at least one number',
    'string.min': '{{#label}} must be at least 8 characters',
  })

const signupSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().lowercase().required(),
  password: passwordRule,
  role: Joi.string().valid('employee', 'trainer').default('employee'),
  designation: Joi.string().trim().max(100),
  department: Joi.string().trim().max(100),
  experienceYears: Joi.number().integer().min(0).max(60),
})

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
})

module.exports = { signupSchema, loginSchema }
