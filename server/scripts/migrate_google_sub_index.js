'use strict'

/**
 * Migration Script: Controlled Creation of Google Subject Unique Partial Index
 *
 * Index specification:
 *   Key: { googleSub: 1 }
 *   Options: {
 *     unique: true,
 *     partialFilterExpression: { googleSub: { $type: 'string', $gt: '' } },
 *     background: true
 *   }
 *
 * Safety guarantees:
 *   - Idempotent: Skips creation if index with exact spec already exists.
 *   - Pre-flight validation: Runs an aggregation scan to identify any duplicate
 *     googleSub strings among existing documents before attempting creation.
 *   - Aborts safely without modifying state if collisions are detected.
 *   - Supports --dry-run mode for pre-flight verification without index creation.
 */

const { MongoClient } = require('mongodb')

function sanitizeMongoUri(uri) {
  try {
    const parsed = new URL(uri)
    if (parsed.password) parsed.password = '****'
    return parsed.toString()
  } catch {
    return uri.replace(/:([^:@]+)@/, ':****@')
  }
}

async function checkDuplicates(collection) {
  const duplicates = await collection
    .aggregate([
      {
        $match: {
          googleSub: { $type: 'string', $gt: '' },
        },
      },
      {
        $group: {
          _id: '$googleSub',
          count: { $sum: 1 },
          emails: { $push: '$email' },
          ids: { $push: '$_id' },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ])
    .toArray()

  return duplicates
}

async function migrateGoogleSubIndex(db, options = {}) {
  const dryRun = Boolean(options.dryRun)
  const dbName = db.databaseName || (db.s && db.s.namespace && db.s.namespace.db) || 'unknown'
  console.log(`[MIGRATION] Target database verified: "${dbName}"`)

  const collection = db.collection('users')

  console.log(`[MIGRATION] Inspecting existing indexes on "${dbName}.users"...`)
  const existingIndexes = await collection.indexes()
  const existingSubIndex = existingIndexes.find(
    (idx) => idx.name === 'googleSub_1' || (idx.key && idx.key.googleSub === 1)
  )

  if (existingSubIndex) {
    const isUnique = Boolean(existingSubIndex.unique)
    const filter = existingSubIndex.partialFilterExpression || {}
    const hasCorrectFilter =
      filter.googleSub &&
      filter.googleSub.$type === 'string' &&
      filter.googleSub.$gt === ''

    if (isUnique && hasCorrectFilter) {
      console.log(`[MIGRATION] Index "googleSub_1" already exists with correct unique partial filter in "${dbName}". No action needed.`)
      return {
        status: 'ALREADY_EXISTS',
        databaseName: dbName,
        indexName: existingSubIndex.name,
        existingIndex: existingSubIndex,
      }
    } else {
      console.warn(`[MIGRATION] WARNING: Index on googleSub exists in "${dbName}" but does not match target specification:`, existingSubIndex)
      return {
        status: 'CONFLICTING_INDEX_EXISTS',
        databaseName: dbName,
        indexName: existingSubIndex.name,
        existingIndex: existingSubIndex,
      }
    }
  }

  console.log(`[MIGRATION] Running pre-flight collision scan for duplicate googleSub values in "${dbName}.users"...`)
  const duplicates = await checkDuplicates(collection)
  if (duplicates.length > 0) {
    console.error(`[MIGRATION ERROR] Cannot create unique index: Found ${duplicates.length} duplicate googleSub group(s) in "${dbName}"!`)
    for (const dup of duplicates) {
      console.error(`  - googleSub: "${dup._id}" (Count: ${dup.count}, Emails: ${dup.emails.join(', ')})`)
    }
    return {
      status: 'ABORTED_DUPLICATES_FOUND',
      databaseName: dbName,
      duplicates,
    }
  }

  console.log(`[MIGRATION] Pre-flight scan clean. 0 duplicate googleSub records found in "${dbName}.users".`)

  if (dryRun) {
    console.log(`[MIGRATION] [DRY RUN] Verified: Index { googleSub: 1 } can be safely created on "${dbName}.users".`)
    return {
      status: 'DRY_RUN_SUCCESS',
      databaseName: dbName,
      wouldCreate: true,
    }
  }

  console.log(`[MIGRATION] Creating partial unique index on "${dbName}.users" { googleSub: 1 }...`)
  const createdIndexName = await collection.createIndex(
    { googleSub: 1 },
    {
      unique: true,
      partialFilterExpression: { googleSub: { $type: 'string', $gt: '' } },
      background: true,
      name: 'googleSub_1',
    }
  )

  console.log(`[MIGRATION] Successfully created index "${createdIndexName}" in "${dbName}". Verifying...`)
  const updatedIndexes = await collection.indexes()
  const verified = updatedIndexes.find((idx) => idx.name === createdIndexName)

  if (!verified || !verified.unique) {
    throw new Error(`[MIGRATION FAILURE] Index ${createdIndexName} could not be verified post-creation in "${dbName}".`)
  }

  console.log('[MIGRATION] Index verification passed:', JSON.stringify(verified, null, 2))
  return {
    status: 'CREATED',
    databaseName: dbName,
    indexName: createdIndexName,
    indexSpec: verified,
  }
}

// Direct CLI execution support
if (require.main === module) {
  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry-run')
  const uriArg = args.find((a) => a.startsWith('--uri='))
  const mongoUri = uriArg ? uriArg.split('=')[1] : process.env.MONGO_URI

  if (!mongoUri) {
    console.error('[MIGRATION ERROR] Missing target database URI. Provide --uri=<mongodb_uri> or set MONGO_URI.')
    process.exit(1)
  }

  ;(async () => {
    let client
    try {
      console.log(`Connecting to MongoDB at: ${sanitizeMongoUri(mongoUri)}`)
      client = new MongoClient(mongoUri)
      await client.connect()
      const db = client.db()

      const result = await migrateGoogleSubIndex(db, { dryRun: isDryRun })
      console.log(`[MIGRATION RESULT] Status: ${result.status} (DB: ${result.databaseName})`)

      const isSuccess = result.status === 'CREATED' || result.status === 'ALREADY_EXISTS' || result.status === 'DRY_RUN_SUCCESS'
      process.exit(isSuccess ? 0 : 1)
    } catch (err) {
      console.error('[MIGRATION FATAL ERROR]', err)
      process.exit(1)
    } finally {
      if (client) await client.close()
    }
  })()
}

module.exports = {
  migrateGoogleSubIndex,
  checkDuplicates,
  sanitizeMongoUri,
}

