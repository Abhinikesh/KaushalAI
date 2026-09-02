'use strict'

const Joi = require('joi')

// Quiz attempt body schema
// answers: array of { questionId, selectedOptionIndex }
const submitAttemptSchema = Joi.object({
  answers: Joi.array()
    .items(
      Joi.object({
        questionId:          Joi.string().hex().length(24).required(),
        selectedOptionIndex: Joi.number().integer().min(0).max(3).required(),
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one answer is required.',
    }),
})

// Quiz creation schema (trainer review + publish)
const createQuizSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).required(),
  questions: Joi.array()
    .items(
      Joi.object({
        questionText:       Joi.string().trim().min(5).required(),
        options:            Joi.array().items(Joi.string().trim()).length(4).required(),
        correctOptionIndex: Joi.number().integer().min(0).max(3).required(),
        explanation:        Joi.string().trim().allow(''),
        difficulty:         Joi.string().valid('easy', 'medium', 'hard').required(),
      })
    )
    .min(1)
    .required(),
  tagCompetencyIds: Joi.array().items(Joi.string().hex().length(24)).default([]),
  sourceMaterialId: Joi.string().hex().length(24).optional(),
})

module.exports = { submitAttemptSchema, createQuizSchema }
