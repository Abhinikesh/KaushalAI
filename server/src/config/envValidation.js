'use strict'

const crypto = require('crypto')

const PLACEHOLDER = 'replace_with_a_long_random_secret'

/**
 * Validates environment configuration at server startup.
 * Enforces strict fail-fast validation in production while allowing safe
 * ephemeral fallbacks in development and test environments.
 *
 * @param {Object} env - Environment object (defaults to process.env)
 * @returns {{ valid: boolean, warnings: string[], errors: string[] }}
 */
function validateEnv(env = process.env) {
  const isProd = env.NODE_ENV === 'production'
  const isTest = env.NODE_ENV === 'test'
  const errors = []
  const warnings = []

  // 1. Database Connection String
  const mongoUri = env.MONGO_URI || env.MONGODB_URI
  if (!mongoUri) {
    errors.push('Neither MONGO_URI nor MONGODB_URI is set. A MongoDB connection string is required.')
  }

  // 2. Cryptographic Secrets
  const secretKeys = [
    { name: 'ACCESS_TOKEN_SECRET', minLen: 32 },
    { name: 'REFRESH_TOKEN_SECRET', minLen: 32 },
    { name: 'COOKIE_SECRET', minLen: 32 },
  ]

  for (const { name, minLen } of secretKeys) {
    const val = env[name]
    const isMissing = !val || val.trim() === ''
    const isPlaceholder = val && (val.startsWith(PLACEHOLDER) || val === PLACEHOLDER)
    const isTooShort = val && val.length < minLen

    if (isProd) {
      if (isMissing) {
        errors.push(`Production requires ${name} to be explicitly configured.`)
      } else if (isPlaceholder) {
        errors.push(`Production disallows placeholder value for ${name}. Provide a strong random secret.`)
      } else if (isTooShort) {
        errors.push(`${name} must be at least ${minLen} characters long in production (current length: ${val.length}).`)
      }
    } else {
      // Development / Test fallback
      if (isMissing || isPlaceholder || isTooShort) {
        if (!isTest) {
          warnings.push(`[envValidation] WARNING: ${name} is missing, placeholder, or too short. Generating ephemeral fallback for this process.`)
        }
        env[name] = crypto.randomBytes(32).toString('hex')
      }
    }
  }

  // 3. Client Origin (CORS) in Production
  if (isProd) {
    const clientOrigin = env.CLIENT_ORIGIN || env.CLIENT_URL
    if (!clientOrigin) {
      warnings.push('CLIENT_ORIGIN or CLIENT_URL is not set in production. Defaulting to production Vercel deployment domain.')
    }
  }

  // 4. Course Source Mode (Live Adapters Validation)
  if (env.COURSE_SOURCE_MODE === 'live') {
    if (!env.IGOT_API_BASE_URL || !env.IGOT_API_KEY) {
      errors.push('COURSE_SOURCE_MODE=live requires IGOT_API_BASE_URL and IGOT_API_KEY to be configured.')
    }
    if (!env.NSSTA_API_BASE_URL || !env.NSSTA_API_KEY) {
      errors.push('COURSE_SOURCE_MODE=live requires NSSTA_API_BASE_URL and NSSTA_API_KEY to be configured.')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Executes startup validation and fails fast if production configuration is invalid.
 */
function assertProductionConfig(env = process.env) {
  const result = validateEnv(env)

  for (const w of result.warnings) {
    console.warn(w)
  }

  if (!result.valid) {
    console.error('\n======================================================')
    console.error('FATAL CONFIGURATION ERROR - SERVER STARTUP HALTED')
    console.error('======================================================')
    for (const err of result.errors) {
      console.error(`- ${err}`)
    }
    console.error('======================================================\n')
    throw new Error(`Invalid environment configuration: ${result.errors.join('; ')}`)
  }

  return result
}

module.exports = {
  validateEnv,
  assertProductionConfig,
  PLACEHOLDER,
}

