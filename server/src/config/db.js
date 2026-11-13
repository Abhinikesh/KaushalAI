'use strict'

const mongoose = require('mongoose')
const logger = require('../utils/logger')

const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50,
  minPoolSize: 5,
  retryWrites: true,
  retryReads: true,
}

// Attach event listeners once
let listenersAttached = false

function attachConnectionListeners() {
  if (listenersAttached) return
  listenersAttached = true

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connection established successfully')
  })

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error:', err.message)
  })

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Retrying connection...')
  })

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected successfully')
  })
}

async function connectDB(customUri = null) {
  const uri = customUri || process.env.MONGODB_URI || process.env.MONGO_URI
  if (!uri) {
    throw new Error(
      'Neither MONGO_URI nor MONGODB_URI environment variable is set. ' +
      'Please set your MongoDB connection string in environment settings or server/.env.'
    )
  }

  attachConnectionListeners()

  try {
    await mongoose.connect(uri, MONGO_OPTIONS)
    return mongoose.connection
  } catch (err) {
    logger.error('Fatal MongoDB connection error during startup:', err.message)
    throw err
  }
}

/**
 * Checks if the primary MongoDB connection is active and ready to accept queries.
 * Mongoose readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
 */
function isDbConnected() {
  return mongoose.connection.readyState === 1
}

/**
 * Gracefully closes the MongoDB connection.
 * @param {boolean} force - Whether to force close without waiting for pending queries.
 */
async function disconnectDB(force = false) {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.close(force)
      logger.info('MongoDB connection closed gracefully')
    } catch (err) {
      logger.error('Error during MongoDB disconnect:', err.message)
    }
  }
}

module.exports = {
  connectDB,
  disconnectDB,
  isDbConnected,
  MONGO_OPTIONS,
}
