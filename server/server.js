'use strict'

require('dotenv').config()

const { assertProductionConfig } = require('./src/config/envValidation')
const { connectDB, disconnectDB } = require('./src/config/db')
const logger = require('./src/utils/logger')

// ── Startup Environment & Secrets Validation ─────────────────────────────────
// Enforces strict fail-fast validation in production while enabling frictionless
// development / test execution with secure ephemeral secrets.
assertProductionConfig(process.env)

const app = require('./src/app')
const { autoSeed } = require('./src/services/autoSeed.service')

const PORT = process.env.PORT ?? 5000
let server = null
let isShuttingDown = false

async function start() {
  await connectDB()

  server = app.listen(PORT, async () => {
    logger.info(`Server running on port ${PORT} [NODE_ENV=${process.env.NODE_ENV || 'development'}]`)
    // Check and populate initial official datasets and records if MongoDB is fresh
    try {
      await autoSeed()
    } catch (err) {
      logger.error('AutoSeed encountered an error during startup:', err.message)
    }
  })

  // Configure HTTP keep-alive timeouts for reverse proxy / load balancer compatibility
  server.keepAliveTimeout = 65000 // Ensure higher than typical ALB/Nginx 60s timeout
  server.headersTimeout = 66000
}

// ── Graceful Shutdown Handling ────────────────────────────────────────────────
async function handleShutdown(signal) {
  if (isShuttingDown) return
  isShuttingDown = true

  logger.info(`Received ${signal}. Starting graceful shutdown...`)

  // Set 10-second force shutdown timer in case connections hang
  const forceExitTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10s. Forcing exit.')
    process.exit(1)
  }, 10000)
  forceExitTimer.unref()

  if (server) {
    server.close(async (err) => {
      if (err) {
        logger.error('Error closing HTTP server:', err.message)
      } else {
        logger.info('HTTP server closed. No longer accepting new connections.')
      }

      await disconnectDB(false)
      logger.info('Graceful shutdown completed successfully.')
      process.exit(0)
    })
  } else {
    await disconnectDB(false)
    process.exit(0)
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'))
process.on('SIGINT', () => handleShutdown('SIGINT'))

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason)
})

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception thrown:', err)
  handleShutdown('uncaughtException')
})

start().catch((err) => {
  logger.error('Failed to start server:', err.message)
  process.exit(1)
})
