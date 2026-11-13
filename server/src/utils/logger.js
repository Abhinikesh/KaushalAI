'use strict'

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'refreshtoken',
  'accesstoken',
  'secret',
  'authorization',
  'cookie',
  'set-cookie',
  'api_key',
  'apikey',
])

/**
 * Recursively redacts sensitive keys from log objects.
 */
function sanitizeForLogging(data, depth = 0) {
  if (depth > 5) return '[Truncated: Max Depth]'
  if (data === null || data === undefined) return data

  if (typeof data !== 'object') {
    return data
  }

  if (data instanceof Error) {
    return {
      message: data.message,
      name: data.name,
      code: data.code,
      ...(process.env.NODE_ENV !== 'production' ? { stack: data.stack } : {}),
    }
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForLogging(item, depth + 1))
  }

  const sanitized = {}
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]'
    } else {
      sanitized[key] = sanitizeForLogging(value, depth + 1)
    }
  }
  return sanitized
}

function formatMessage(level, args) {
  const timestamp = new Date().toISOString()
  const isProd = process.env.NODE_ENV === 'production'

  const sanitizedArgs = args.map((arg) =>
    typeof arg === 'object' && arg !== null ? sanitizeForLogging(arg) : arg
  )

  if (isProd) {
    // Structured JSON log for production log aggregators
    let messageText = ''
    const extraMeta = []

    for (const item of sanitizedArgs) {
      if (typeof item === 'string') {
        messageText += (messageText ? ' ' : '') + item
      } else {
        extraMeta.push(item)
      }
    }

    const logEntry = {
      timestamp,
      level,
      message: messageText || 'Log entry',
      ...(extraMeta.length > 0 ? { meta: extraMeta.length === 1 ? extraMeta[0] : extraMeta } : {}),
    }
    return JSON.stringify(logEntry)
  }

  // Development: Human-friendly format
  return `[${timestamp}] [${level.toUpperCase()}] ${sanitizedArgs.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ')}`
}

const logger = {
  info: (...args) => console.info(formatMessage('info', args)),
  warn: (...args) => console.warn(formatMessage('warn', args)),
  error: (...args) => console.error(formatMessage('error', args)),
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG) {
      console.debug(formatMessage('debug', args))
    }
  },
  sanitizeForLogging,
}

module.exports = logger
