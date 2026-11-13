'use strict'

const rateLimit = require('express-rate-limit')
const { ipKeyGenerator } = require('express-rate-limit')

/**
 * Standard client IP resolver respecting trusted reverse proxy configuration.
 */
function getClientIpKey(req) {
  const rawIp = req.ip || req.socket?.remoteAddress || '127.0.0.1'
  return ipKeyGenerator(rawIp)
}

/**
 * Creates a standard JSON error response for rate limit violations.
 */
function createRateLimitResponse(message, retryAfterSeconds = 900) {
  return {
    status: 429,
    message,
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfterSeconds,
  }
}

const isProd = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'

// 1. Auth & Login Rate Limiter (20 requests per 15 minutes in production)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : (isProd ? 20 : 5000),
  keyGenerator: getClientIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: createRateLimitResponse('Too many login/signup attempts. Please try again in 15 minutes.', 900),
})

// 2. Token Refresh Rate Limiter (120 requests per 15 minutes in production)
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : (isProd ? 120 : 5000),
  keyGenerator: getClientIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: createRateLimitResponse('Too many token refresh requests. Please try again later.', 900),
})

// 3. AI Chat & Tutor Rate Limiter (60 messages per minute per user/IP)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 10000 : 60,
  keyGenerator: (req) => req.user?.id || getClientIpKey(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: createRateLimitResponse('Too many messages to the AI Tutor. Please wait a minute before asking more questions.', 60),
})

// 4. Statistical Analysis Rate Limiter (60 calls per minute per user/IP)
const statsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 10000 : 60,
  keyGenerator: (req) => req.user?.id || getClientIpKey(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: createRateLimitResponse('Statistical analysis calculation limit reached. Please wait a minute before running more analyses.', 60),
})

// 5. File & Dataset Upload Rate Limiter (30 uploads per 15 minutes per user/IP)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : (isProd ? 30 : 1000),
  keyGenerator: (req) => req.user?.id || getClientIpKey(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: createRateLimitResponse('Upload limit reached. Please wait a few minutes before uploading more datasets.', 900),
})

// 6. Admin Sensitive Operations Limiter (60 write operations per 15 minutes per admin)
const adminWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : (isProd ? 60 : 1000),
  keyGenerator: (req) => req.user?.id || getClientIpKey(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: createRateLimitResponse('Administrative operation rate limit reached. Please wait a few minutes.', 900),
})

module.exports = {
  authLimiter,
  refreshLimiter,
  chatLimiter,
  statsLimiter,
  uploadLimiter,
  adminWriteLimiter,
  getClientIpKey,
  createRateLimitResponse,
}

