/**
 * testDbGuard.js
 * Comprehensive Test Database Isolation & Safety Guard for KaushalAI
 *
 * Enforces:
 * 1. Exclusive requirement for MONGODB_TEST_URI (zero fallback to MONGODB_URI/MONGO_URI).
 * 2. Strict rejection of development ('kaushalai') and production databases.
 * 3. Validation that target database is explicitly identifiable as a test database ('kaushalai_test').
 * 4. Masking of all database credentials and connection secrets in logs.
 * 5. Ephemeral test server management bound exclusively to the isolated test database.
 * 6. Guarded, non-destructive test fixture cleanup.
 */

'use strict'

const mongoose = require('mongoose')

const FORBIDDEN_DATABASES = new Set([
  'kaushalai',
  'kaushal_ai',
  'kaushalai_dev',
  'kaushalai_development',
  'kaushalai_prod',
  'kaushalai_production',
  'production',
  'prod',
  'development',
  'dev',
  'staging',
  'default',
  'admin',
  'local',
  'config',
])

/**
 * Masks database credentials from MongoDB connection URI
 */
function sanitizeUri(uri) {
  if (!uri || typeof uri !== 'string') return ''
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
}

/**
 * Extracts database name from MongoDB URI
 */
function extractDatabaseName(uri) {
  if (!uri || typeof uri !== 'string') return ''
  try {
    const normalized = uri.replace(/^mongodb(?:\+srv)?:\/\//i, 'http://')
    const parsed = new URL(normalized)
    const pathname = (parsed.pathname || '').replace(/^\/+/, '').split('/')[0]
    return pathname.split('?')[0].trim()
  } catch {
    const match = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?&#]+)/i)
    return match ? match[1].trim() : ''
  }
}

/**
 * Validates MONGODB_TEST_URI strictly with zero fallbacks.
 * Throws explicit descriptive errors on any safety violation.
 */
function validateTestDatabaseUri(uri) {
  if (!uri || typeof uri !== 'string' || uri.trim() === '') {
    throw new Error(
      'FATAL CONFIGURATION ERROR: MONGODB_TEST_URI is missing or empty. ' +
      'Automated tests MUST exclusively use a dedicated test database (e.g. kaushalai_test). ' +
      'Tests are strictly prohibited from falling back to MONGODB_URI, MONGO_URI, or development databases.'
    )
  }

  const trimmedUri = uri.trim()
  const dbName = extractDatabaseName(trimmedUri)

  if (!dbName) {
    throw new Error(
      `FATAL CONFIGURATION ERROR: MONGODB_TEST_URI (${sanitizeUri(trimmedUri)}) does not specify a target database name.`
    )
  }

  const lowerName = dbName.toLowerCase()

  // Guardrail: Reject known development / production databases
  if (FORBIDDEN_DATABASES.has(lowerName)) {
    throw new Error(
      `SECURITY ALERT: MONGODB_TEST_URI points to forbidden database "${dbName}". ` +
      'Automated tests are strictly barred from executing against development, production, or default databases.'
    )
  }

  // Guardrail: Must be explicitly identifiable as a test database
  const isIdentifiableTest =
    lowerName === 'kaushalai_test' ||
    lowerName.endsWith('_test') ||
    lowerName.endsWith('-test') ||
    lowerName.startsWith('test_') ||
    lowerName.startsWith('test-') ||
    lowerName.includes('test')

  if (!isIdentifiableTest) {
    throw new Error(
      `SECURITY REJECTION: Database name "${dbName}" is not explicitly identifiable as a dedicated test database. ` +
      'The database name must end with "_test", begin with "test_", or be "kaushalai_test".'
    )
  }

  return {
    uri: trimmedUri,
    dbName,
    sanitizedUri: sanitizeUri(trimmedUri),
  }
}

/**
 * Connects Mongoose exclusively to the verified test database
 */
async function connectTestDb(overrideUri = null) {
  const uriToTest = overrideUri || process.env.MONGODB_TEST_URI
  const { uri, dbName, sanitizedUri } = validateTestDatabaseUri(uriToTest)

  // If already connected to a different database, disconnect first
  if (mongoose.connection.readyState !== 0) {
    const currentName = mongoose.connection.name
    if (currentName !== dbName) {
      await mongoose.disconnect()
    }
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri)
  }

  // Post-connection safety verification
  const activeDb = mongoose.connection.name
  if (activeDb !== dbName || FORBIDDEN_DATABASES.has(activeDb.toLowerCase())) {
    await mongoose.disconnect()
    throw new Error(
      `SECURITY CRITICAL: Mongoose connected to unexpected database "${activeDb}" instead of verified test database "${dbName}". Aborting.`
    )
  }

  return { dbName, sanitizedUri }
}

let activeTestServer = null

/**
 * Starts an ephemeral in-process test HTTP server connected to the test database
 */
async function startTestServer() {
  if (activeTestServer) {
    return activeTestServer
  }

  const { dbName, sanitizedUri } = await connectTestDb()

  const app = require('../app')
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      const baseUrl = `http://127.0.0.1:${port}`
      activeTestServer = { server, port, baseUrl, dbName, sanitizedUri }
      resolve(activeTestServer)
    })
    server.on('error', reject)
  })
}

/**
 * Stops the active test HTTP server
 */
async function stopTestServer() {
  if (activeTestServer && activeTestServer.server) {
    await new Promise((resolve) => activeTestServer.server.close(resolve))
    activeTestServer = null
  }
}

/**
 * Closes the entire test environment (HTTP server + Mongoose connection)
 */
async function closeTestEnvironment() {
  await stopTestServer()
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
}

/**
 * Safely cleans up only deterministic test fixtures by email
 * Never runs destructive actions against non-test databases
 */
async function safeCleanupTestUsers(testEmails = []) {
  if (mongoose.connection.readyState === 0) return

  const currentDb = mongoose.connection.name
  if (!currentDb || !currentDb.toLowerCase().includes('test')) {
    throw new Error(`REFUSED TO CLEAN: Connected database "${currentDb}" is not a verified test database!`)
  }

  const {
    User,
    AssessmentAttempt,
    AssessmentResponse,
    SkillGap,
    Recommendation,
    LearningPath,
    LearningPathItem,
    Enrollment,
    QuizAttempt,
  } = require('../models')

  for (const email of testEmails) {
    if (!email) continue
    const user = await User.findOne({ email }).lean()
    if (user) {
      await AssessmentAttempt.deleteMany({ user_id: user._id })
      await AssessmentResponse.deleteMany({ user_id: user._id })
      await SkillGap.deleteMany({ user_id: user._id })
      await Recommendation.deleteMany({ user_id: user._id })
      await LearningPath.deleteMany({ user_id: user._id })
      await LearningPathItem.deleteMany({ user_id: user._id })
      await Enrollment.deleteMany({ userId: user._id })
      await QuizAttempt.deleteMany({ user_id: user._id })
      await User.deleteOne({ _id: user._id })
    }
  }
}

module.exports = {
  FORBIDDEN_DATABASES,
  sanitizeUri,
  extractDatabaseName,
  validateTestDatabaseUri,
  connectTestDb,
  startTestServer,
  stopTestServer,
  closeTestEnvironment,
  safeCleanupTestUsers,
}
