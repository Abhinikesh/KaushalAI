'use strict'

const Joi = require('joi')

// ── Env-driven email domain restriction ──────────────────────────────────────
// ALLOWED_EMAIL_DOMAINS: comma-separated list, e.g. "gov.in,nic.in"
// If empty or unset → no domain restriction (current testing mode).
// Set it in server/.env to enforce gov.in domains for production.
const _rawDomains = (process.env.ALLOWED_EMAIL_DOMAINS || '').trim()
const ALLOWED_DOMAINS = _rawDomains
  ? _rawDomains.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean)
  : []

function buildEmailRule() {
  let rule = Joi.string().email().lowercase().required()
  if (ALLOWED_DOMAINS.length > 0) {
    rule = rule.custom((value, helpers) => {
      const domain = value.split('@')[1]?.toLowerCase()
      if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
        return helpers.error('email.domain', {
          allowed: ALLOWED_DOMAINS.join(', '),
        })
      }
      return value
    }).messages({
      'email.domain': `Email must be from an allowed domain: {{#allowed}}`,
    })
  }
  return rule
}

const passwordRule = Joi.string()
  .min(8)
  .pattern(/[0-9]/, 'at least one number')
  .required()
  .messages({
    'string.pattern.name': 'Password must contain at least one number',
    'string.min':          'Password must be at least 8 characters',
  })

const signupSchema = Joi.object({
  employeeId:      Joi.string().trim().min(2).max(50).required()
    .messages({ 'any.required': 'Employee ID is required', 'string.empty': 'Employee ID is required' }),
  name:            Joi.string().trim().min(2).max(100).required(),
  email:           buildEmailRule(),
  password:        passwordRule,
  role:            Joi.string().valid('employee', 'trainer').default('employee'),
  experienceYears: Joi.number().integer().min(0).max(60).default(0),
  // department and designation are intentionally NOT accepted from the client —
  // they are pulled from the AuthorizedOfficer roster record server-side.
})

const loginSchema = Joi.object({
  email:    Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
})

const googleCompleteSchema = Joi.object({
  employeeId:      Joi.string().trim().min(2).max(50).required(),
  idToken:         Joi.string().required(),
  experienceYears: Joi.number().integer().min(0).max(60).default(0),
  role:            Joi.string().valid('employee', 'trainer').default('employee'),
})

module.exports = { signupSchema, loginSchema, googleCompleteSchema, ALLOWED_DOMAINS }
