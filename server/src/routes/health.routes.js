'use strict'

const express = require('express')
const { isDbConnected } = require('../config/db')

const router = express.Router()

/**
 * Basic health check (backward compatible)
 */
router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'kaushalai-server',
    timestamp: new Date().toISOString(),
  })
})

/**
 * Liveness probe: confirms that the Node process is running and responsive.
 * Used by orchestrators (Kubernetes, Render, AWS) to determine if container needs restart.
 */
router.get('/live', (_req, res) => {
  const mem = process.memoryUsage()
  res.status(200).json({
    status: 'alive',
    service: 'kaushalai-server',
    uptime: Math.floor(process.uptime()),
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  })
})

/**
 * Readiness probe: confirms that essential dependencies (primarily MongoDB) are available.
 * Used by orchestrators to determine whether traffic can be routed to this instance.
 */
router.get('/ready', (_req, res) => {
  const dbConnected = isDbConnected()

  if (dbConnected) {
    return res.status(200).json({
      status: 'ready',
      service: 'kaushalai-server',
      database: 'connected',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    })
  }

  return res.status(503).json({
    status: 'not_ready',
    service: 'kaushalai-server',
    database: 'disconnected',
    message: 'Primary MongoDB database connection is not established.',
    timestamp: new Date().toISOString(),
  })
})

module.exports = router
