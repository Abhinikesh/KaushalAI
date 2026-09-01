const logger = require('../utils/logger')

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const status = err.status || 500

  // Always log server-side with full details
  if (status >= 500) {
    logger.error(`${req.method} ${req.path} →`, err)
  }

  const body = { message: err.message || 'Internal server error' }

  if (err.details) {
    body.details = err.details
  }

  // Never expose stack traces outside development
  if (process.env.NODE_ENV === 'development' && status >= 500) {
    body.stack = err.stack
  }

  res.status(status).json(body)
}

module.exports = errorHandler
