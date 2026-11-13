#!/usr/bin/env node
'use strict'

/**
 * KaushalAI — Controlled Production Index Initialization Utility
 *
 * Inspects collections and creates only missing query-critical indexes safely.
 * Strict Safety Rules:
 *  1. Checks existing indexes via `listIndexes()` before executing `createIndex()`.
 *  2. NEVER runs blanket `syncIndexes()`.
 *  3. NEVER drops or mutates existing indexes.
 *  4. Safe and repeatable — re-running is an idempotent no-op.
 *
 * Usage:
 *   node init_production_indexes.js [--db <db_name>]
 */

const path = require('path')
const mongoose = require('mongoose')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

// Mask credentials helper
function maskMongoUri(uri) {
  if (!uri) return 'UNDEFINED'
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
}

// Definition of application query-critical indexes
const REQUIRED_INDEXES = {
  users: [
    { key: { email: 1 }, options: { name: 'idx_users_email_unique', unique: true } },
    { key: { employeeId: 1 }, options: { name: 'idx_users_employeeId' } },
    { key: { role: 1 }, options: { name: 'idx_users_role' } },
    {
      key: { googleSub: 1 },
      options: {
        name: 'idx_users_googleSub_unique',
        unique: true,
        partialFilterExpression: { googleSub: { $type: 'string', $gt: '' } },
      },
    },
  ],
  courses: [
    { key: { isDeleted: 1, isPublished: 1, source: 1 }, options: { name: 'idx_courses_published_source' } },
    { key: { externalCourseId: 1 }, options: { name: 'idx_courses_externalCourseId' } },
  ],
  enrollments: [
    { key: { userId: 1, courseId: 1 }, options: { name: 'idx_enrollments_user_course_unique', unique: true } },
    { key: { userId: 1, status: 1 }, options: { name: 'idx_enrollments_user_status' } },
  ],
  learning_progress: [
    { key: { user_id: 1, course_id: 1 }, options: { name: 'idx_progress_user_course_unique', unique: true } },
  ],
  quizzes: [
    { key: { courseId: 1 }, options: { name: 'idx_quizzes_courseId' } },
    { key: { createdBy: 1 }, options: { name: 'idx_quizzes_createdBy' } },
  ],
  quizattempts: [
    { key: { userId: 1, completedAt: -1 }, options: { name: 'idx_quizattempts_user_completed' } },
    { key: { quizId: 1 }, options: { name: 'idx_quizattempts_quizId' } },
  ],
  certificates: [
    {
      key: { verificationHash: 1 },
      options: {
        name: 'idx_certs_hash_unique',
        unique: true,
        partialFilterExpression: { verificationHash: { $type: 'string', $gt: '' } },
      },
    },
    { key: { userId: 1, courseId: 1 }, options: { name: 'idx_certs_user_course' } },
  ],
  skill_gaps: [
    { key: { user_id: 1, competency_id: 1 }, options: { name: 'idx_skillgaps_user_comp_unique', unique: true } },
    { key: { user_id: 1, priority: 1 }, options: { name: 'idx_skillgaps_user_priority' } },
  ],
  conversations: [
    { key: { userId: 1, lastMessageAt: -1 }, options: { name: 'idx_conversations_user_lastMsg' } },
  ],
  messages: [
    { key: { conversationId: 1, createdAt: 1 }, options: { name: 'idx_messages_conversation_created' } },
  ],
  auditlogs: [
    { key: { action: 1 }, options: { name: 'idx_auditlogs_action' } },
    { key: { timestamp: -1 }, options: { name: 'idx_auditlogs_timestamp' } },
  ],
}

/**
 * Checks if a key pattern already matches an existing index in the collection.
 */
function hasMatchingKey(existingIndexes, targetKey) {
  const targetEntries = Object.entries(targetKey)
  return existingIndexes.some((existing) => {
    const existingEntries = Object.entries(existing.key)
    if (existingEntries.length !== targetEntries.length) return false
    return targetEntries.every(([k, v], idx) => {
      const [exK, exV] = existingEntries[idx]
      return k === exK && v === exV
    })
  })
}

async function initializeIndexes(targetDbName = null) {
  const baseUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kaushalai'
  let targetUri = baseUri
  if (targetDbName) {
    const parsed = new URL(baseUri)
    parsed.pathname = '/' + targetDbName
    targetUri = parsed.toString()
  }

  console.log(`[IndexInit] Connecting to target database: ${maskMongoUri(targetUri)}`)
  const conn = await mongoose.createConnection(targetUri).asPromise()

  let totalExisting = 0
  let totalCreated = 0
  let totalFailed = 0

  const summary = []

  for (const [collName, desiredList] of Object.entries(REQUIRED_INDEXES)) {
    const coll = conn.db.collection(collName)

    let existing = []
    try {
      existing = await coll.indexes()
    } catch {
      // Collection might not exist yet
      existing = []
    }

    for (const desired of desiredList) {
      const keyStr = JSON.stringify(desired.key)
      if (hasMatchingKey(existing, desired.key)) {
        totalExisting++
        console.log(`  [ALREADY EXISTS] ${collName} -> ${keyStr}`)
        summary.push({ collection: collName, key: keyStr, status: 'EXISTS' })
      } else {
        try {
          await coll.createIndex(desired.key, desired.options)
          totalCreated++
          console.log(`  [CREATED] ${collName} -> ${keyStr} (${desired.options.name})`)
          summary.push({ collection: collName, key: keyStr, status: 'CREATED' })
        } catch (err) {
          totalFailed++
          console.error(`  [FAILED] ${collName} -> ${keyStr}: ${err.message}`)
          summary.push({ collection: collName, key: keyStr, status: 'FAILED', error: err.message })
        }
      }
    }
  }

  console.log(`\n[IndexInit] Summary: ${totalExisting} already existed, ${totalCreated} created, ${totalFailed} failed.`)
  await conn.close()
  return { totalExisting, totalCreated, totalFailed, summary }
}

if (require.main === module) {
  const dbArg = process.argv[2]?.startsWith('--db=')
    ? process.argv[2].split('=')[1]
    : (process.argv[2] === '--db' ? process.argv[3] : null)

  initializeIndexes(dbArg).catch((err) => {
    console.error('[IndexInit] FATAL ERROR:', err.message)
    process.exit(1)
  })
}

module.exports = { initializeIndexes, REQUIRED_INDEXES }
