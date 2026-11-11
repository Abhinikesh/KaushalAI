'use strict'

/**
 * Phase 35.1 — Explicit Production Index Verification & Creation Script
 *
 * Inspects and creates only indexes justified by Phase 35.1 queries:
 *   1. quizattempts: { userId: 1, completedAt: -1, attemptedAt: -1 }
 *   2. assessment_attempts: { user_id: 1, completed_at: -1, started_at: -1 }
 *   3. user_competencies: verifies unique { user_id: 1, competency_id: 1 }
 *
 * Safety guarantees:
 *   - Defaults strictly to --dry-run (reads indexes & checks for duplicates without mutating).
 *   - Never invokes syncIndexes().
 *   - Requires --apply --target=<dbName> --confirm=CREATE_PHASE35_1_INDEXES to create indexes.
 */

const mongoose = require('mongoose')
const { sanitizeMongoUri } = require('./reconcile_user_competencies')

const REQUIRED_CONFIRM_TOKEN = 'CREATE_PHASE35_1_INDEXES'

const TARGET_INDEXES = [
  {
    collection: 'quizattempts',
    name: 'userId_1_completedAt_-1_attemptedAt_-1',
    key: { userId: 1, completedAt: -1, attemptedAt: -1 },
    options: { background: true, name: 'userId_1_completedAt_-1_attemptedAt_-1' },
  },
  {
    collection: 'assessment_attempts',
    name: 'user_id_1_completed_at_-1_started_at_-1',
    key: { user_id: 1, completed_at: -1, started_at: -1 },
    options: { background: true, name: 'user_id_1_completed_at_-1_started_at_-1' },
  },
  {
    collection: 'user_competencies',
    name: 'user_id_1_competency_id_1',
    key: { user_id: 1, competency_id: 1 },
    options: { unique: true, background: true, name: 'user_id_1_competency_id_1' },
  },
]

function keysEqual(a, b) {
  const entriesA = Object.entries(a || {})
  const entriesB = Object.entries(b || {})
  if (entriesA.length !== entriesB.length) return false
  return entriesA.every(([k, v], i) => entriesB[i][0] === k && entriesB[i][1] === v)
}

async function checkUserCompetencyDuplicates(db) {
  return db.collection('user_competencies').aggregate([
    {
      $group: {
        _id: { user_id: '$user_id', competency_id: '$competency_id' },
        count: { $sum: 1 },
        ids: { $push: '$_id' },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]).toArray()
}

async function ensurePhase351Indexes(db, options = {}) {
  const apply = Boolean(options.apply)
  const dbName = db?.databaseName || ''
  if (!dbName) throw new Error('TARGET_DB_UNKNOWN: Missing database handle.')

  if (apply) {
    if (!options.targetDb || options.targetDb !== dbName) {
      throw new Error(`TARGET_MISMATCH: --apply requires --target=${dbName}.`)
    }
    if (options.confirmToken !== REQUIRED_CONFIRM_TOKEN) {
      throw new Error(`CONFIRMATION_REQUIRED: --apply requires --confirm=${REQUIRED_CONFIRM_TOKEN}.`)
    }
  }

  const duplicates = await checkUserCompetencyDuplicates(db)
  if (duplicates.length > 0) {
    return {
      mode: apply ? 'apply' : 'dry_run',
      databaseName: dbName,
      status: 'ABORTED_DUPLICATES_FOUND',
      duplicates,
      results: [],
    }
  }

  const results = []
  for (const spec of TARGET_INDEXES) {
    const col = db.collection(spec.collection)
    const existing = await col.indexes()
    const match = existing.find((idx) => idx.name === spec.name || keysEqual(idx.key, spec.key))

    if (match) {
      results.push({
        collection: spec.collection,
        indexName: match.name,
        status: 'ALREADY_EXISTS',
        unique: Boolean(match.unique),
      })
      continue
    }

    if (!apply) {
      results.push({
        collection: spec.collection,
        indexName: spec.name,
        status: 'WOULD_CREATE',
        unique: Boolean(spec.options.unique),
      })
      continue
    }

    const createdName = await col.createIndex(spec.key, spec.options)
    const refreshed = await col.indexes()
    const verified = refreshed.find((idx) => idx.name === createdName)
    if (!verified) {
      throw new Error(`INDEX_VERIFICATION_FAILED: "${createdName}" on "${spec.collection}".`)
    }
    results.push({
      collection: spec.collection,
      indexName: createdName,
      status: 'CREATED',
      unique: Boolean(verified.unique),
    })
  }

  return {
    mode: apply ? 'apply' : 'dry_run',
    databaseName: dbName,
    status: apply ? 'APPLIED' : 'DRY_RUN_READY',
    duplicates: [],
    results,
  }
}

if (require.main === module) {
  const args = process.argv.slice(2)
  const getArg = (p) => {
    const f = args.find((a) => a.startsWith(p))
    return f ? f.slice(p.length) : null
  }
  const uri = getArg('--uri=') || process.env.MONGO_URI
  const apply = args.includes('--apply') && !args.includes('--dry-run')
  const targetDb = getArg('--target=')
  const confirmToken = getArg('--confirm=')

  if (!uri) {
    console.error('[INDEX SCRIPT ERROR] Missing --uri=<mongodb_uri> or MONGO_URI.')
    process.exit(1)
  }

  ;(async () => {
    try {
      console.log(`[INDEX SCRIPT] Connecting to ${sanitizeMongoUri(uri)}`)
      await mongoose.connect(uri)
      const res = await ensurePhase351Indexes(mongoose.connection.db, {
        apply,
        targetDb,
        confirmToken,
      })
      console.log(JSON.stringify(res, null, 2))
      await mongoose.disconnect()
      process.exit(res.status === 'ABORTED_DUPLICATES_FOUND' ? 1 : 0)
    } catch (err) {
      console.error('[INDEX SCRIPT ERROR]', err.message)
      await mongoose.disconnect().catch(() => {})
      process.exit(1)
    }
  })()
}

module.exports = {
  TARGET_INDEXES,
  REQUIRED_CONFIRM_TOKEN,
  checkUserCompetencyDuplicates,
  ensurePhase351Indexes,
}

