'use strict'

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
  const isProd = process.env.NODE_ENV === 'production'

  // Try to map known Mongoose/Mongo errors first
  const mapped = mapMongooseError(err)
  if (mapped) {
    return res.status(mapped.status).json({
      message: mapped.message,
      ...(mapped.details ? { details: mapped.details } : {}),
      ...(req.id ? { requestId: req.id } : {}),
    })
  }

  const status = err.status || 500

  // Always log server-side with full detail and correlation ID
  if (status >= 500) {
    logger.error(`[${req.id || 'NO_REQ_ID'}] ${req.method} ${req.path} →`, err)
  }

  // In production, never leak internal unhandled error messages for 500 errors
  let safeMessage = err.message || 'Internal server error'
  if (isProd && status >= 500) {
    safeMessage = 'An internal server error occurred. Please try again later.'
  }

  const body = { message: safeMessage }

  if (req.id) {
    body.requestId = req.id
  }

  if (typeof err.code === 'string' && err.code) {
    body.code = err.code
  }

  if (err.details) {
    body.details = err.details
  }

  // Never expose stack traces outside development
  if (process.env.NODE_ENV === 'development' && status >= 500 && err.stack) {
    body.stack = err.stack
  }

  res.status(status).json(body)
}

module.exports = errorHandler
