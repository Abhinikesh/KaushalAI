/**
 * Middleware factory that validates req.body against a Joi schema.
 * On failure, returns 400 with an array of field-level error details.
 */
function validate(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }))
      return next({ status: 400, message: 'Validation failed', details })
    }

    // Replace req.body with the sanitised, coerced value from Joi
    req.body = value
    next()
  }
}

module.exports = validate
