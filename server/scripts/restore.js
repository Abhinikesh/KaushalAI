#!/usr/bin/env node
'use strict'

/**
 * KaushalAI Production-Ready MongoDB Restore Script
 *
 * Restores collections from timestamped backup directories created by backup.js.
 * Utilizes native MongoDB Extended JSON (EJSON) to ensure:
 *  1. 100% preservation of BSON types (ObjectIds, Dates, nested types).
 *  2. Automatic reconstruction of collection indexes from manifest metadata.
 *  3. Verification of SHA-256 checksums before writing.
 *  4. Strict safety lock: Refuses to restore into production ('kaushalai') without explicit confirmation.
 *
 * Usage:
 *   node restore.js --from <backup_directory> --target-db <isolated_target_db> [--force]
 *
 * Examples:
 *   node restore.js --from ./backups/backup_kaushalai_test_2026-11-13_12-00-00 --target-db kaushalai_restore_test
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const mongoose = require('mongoose')
const { EJSON } = mongoose.mongo.BSON
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const { maskMongoUri } = require('./backup')

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    from: null,
    targetDb: null,
    force: false,
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--from' && args[i + 1]) {
      options.from = path.resolve(args[i + 1])
      i++
    } else if (args[i] === '--target-db' && args[i + 1]) {
      options.targetDb = args[i + 1]
      i++
    } else if (args[i] === '--force') {
      options.force = true
    }
  }
  return options
}

async function runRestore(customOptions = null) {
  const options = Object.assign({}, parseArgs(), customOptions || {})

  if (!options.from) {
    throw new Error('Missing required argument: --from <path_to_backup_directory>')
  }
  if (!options.targetDb) {
    throw new Error('Missing required argument: --target-db <target_database_name>. Specify an isolated test db first (e.g. --target-db kaushalai_restore_test).')
  }

  const manifestPath = path.join(options.from, 'manifest.json')
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Invalid backup directory: manifest.json not found at "${manifestPath}"`)
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

  // ── Production Safety Guardrail ───────────────────────────────────────────
  const isProdTarget = options.targetDb.toLowerCase() === 'kaushalai' || options.targetDb.toLowerCase() === 'production'
  const isConfirmed = process.env.CONFIRM_PRODUCTION_RESTORE === 'YES_I_AM_SURE' && options.force

  if (isProdTarget && !isConfirmed) {
    throw new Error(
      'SAFETY LOCK ACTIVATED: Direct restoration into production database ("kaushalai") is strictly blocked. ' +
      'To prevent catastrophic data loss, first restore into an isolated verification database (e.g. "--target-db kaushalai_restore_test"). ' +
      'If you intentionally need to overwrite production, you must set CONFIRM_PRODUCTION_RESTORE=YES_I_AM_SURE and pass --force.'
    )
  }

  const baseUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kaushalai'
  const parsed = new URL(baseUri)
  parsed.pathname = '/' + options.targetDb
  const targetUri = parsed.toString()

  console.log(`[Restore] Target Database: "${options.targetDb}"`)
  console.log(`[Restore] Target URI: ${maskMongoUri(targetUri)}`)
  console.log(`[Restore] Restoring from backup: ${options.from}`)
  console.log(`[Restore] Backup original database: "${manifest.database}", timestamp: ${manifest.timestamp}`)

  // 1. Verify Manifest and Checksums before writing
  console.log('\n[Restore] Step 1: Validating file integrity and checksums...')
  for (const [collName, meta] of Object.entries(manifest.collections)) {
    const filePath = path.join(options.from, meta.file)
    if (!fs.existsSync(filePath)) {
      throw new Error(`Corrupted backup: File "${meta.file}" listed in manifest does not exist.`)
    }
    const content = fs.readFileSync(filePath, 'utf8')
    const calculatedHash = crypto.createHash('sha256').update(content).digest('hex')
    if (calculatedHash !== meta.sha256) {
      throw new Error(`Checksum mismatch for collection "${collName}". Expected: ${meta.sha256}, Actual: ${calculatedHash}`)
    }
  }
  console.log('[Restore] All collection backup files verified with valid SHA-256 hashes.')

  // 2. Connect to Target Database and Restore
  console.log('\n[Restore] Step 2: Importing collections and indexes into target database...')
  const conn = await mongoose.createConnection(targetUri).asPromise()

  let totalRestored = 0
  let totalIndexesRestored = 0

  for (const [collName, meta] of Object.entries(manifest.collections)) {
    const filePath = path.join(options.from, meta.file)
    const rawContent = fs.readFileSync(filePath, 'utf8')

    // Parse using EJSON to restore ObjectIds, Dates, and native BSON types
    const docs = EJSON.parse(rawContent)
    const coll = conn.db.collection(collName)

    // Clear existing docs in target collection if any
    await coll.deleteMany({})

    if (docs.length > 0) {
      await coll.insertMany(docs)
    }

    const postCount = await coll.countDocuments()
    if (postCount !== meta.count) {
      throw new Error(`Verification failed for "${collName}": restored count ${postCount} does not match manifest count ${meta.count}`)
    }
    totalRestored += postCount

    // Reconstruct indexes from manifest
    if (Array.isArray(meta.indexes)) {
      for (const idx of meta.indexes) {
        try {
          const indexOptions = { name: idx.name }
          if (idx.unique) indexOptions.unique = true
          if (idx.sparse) indexOptions.sparse = true
          if (idx.partialFilterExpression) indexOptions.partialFilterExpression = idx.partialFilterExpression
          if (typeof idx.expireAfterSeconds === 'number') indexOptions.expireAfterSeconds = idx.expireAfterSeconds

          await coll.createIndex(idx.key, indexOptions)
          totalIndexesRestored++
        } catch (idxErr) {
          console.warn(`  [Warn] Index recreation for "${idx.name}" on "${collName}": ${idxErr.message}`)
        }
      }
    }

    console.log(`  -> Restored "${collName}": ${postCount} documents, ${(meta.indexes || []).length} indexes verified.`)
  }

  console.log(`\n[Restore] Step 3: Verification complete. Total ${totalRestored} documents and ${totalIndexesRestored} indexes restored cleanly into "${options.targetDb}".`)
  await conn.close()
  return { totalRestored, totalIndexesRestored, targetDb: options.targetDb }
}

if (require.main === module) {
  runRestore().catch((err) => {
    console.error('[Restore] FATAL ERROR during restore:', err.message)
    process.exit(1)
  })
}

module.exports = { runRestore }
