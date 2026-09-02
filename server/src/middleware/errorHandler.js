const logger = require('../utils/logger')

// Known Mongoose/MongoDB error types mapped to clean user-facing messages.
// This prevents stack traces, file paths, and raw DB error text from leaking
// to clients — especially important in production on a government platform.
function mapMongooseError(err) {
  // Mongoose validation failure
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }))
    return { status: 400, message: 'Validation failed', details }
  }

  // Mongoose cast failure (e.g. invalid ObjectId in URL param)
  if (err.name === 'CastError') {
    return { status: 400, message: `Invalid value for field '${err.path}'.` }
  }

  // MongoDB duplicate key (e.g. unique email constraint)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'field'
    return { status: 409, message: `A record with this ${field} already exists.` }
  }

  return null
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  // Try to map known Mongoose/Mongo errors first
  const mapped = mapMongooseError(err)
  if (mapped) {
    return res.status(mapped.status).json({
      message: mapped.message,
      ...(mapped.details ? { details: mapped.details } : {}),
    })
  }

  const status = err.status || 500

  // Always log server-side with full detail
  if (status >= 500) {
    logger.error(`${req.method} ${req.path} →`, err)
  }

  const body = { message: err.message || 'Internal server error' }

  if (err.details) {
    body.details = err.details
  }

  // Never expose stack traces, Mongoose internals, or file paths outside development
  if (process.env.NODE_ENV === 'development' && status >= 500) {
    body.stack = err.stack
  }

  res.status(status).json(body)
}

module.exports = errorHandler
