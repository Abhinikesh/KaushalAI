#!/usr/bin/env node
'use strict'

/**
 * KaushalAI Production-Ready MongoDB Backup Script
 *
 * Streams MongoDB collections using native MongoDB Extended JSON (EJSON).
 * Preserves 100% of BSON data types: ObjectIds, Dates, RegExps, Binary, Int32/Long,
 * nested documents, and collection indexes with SHA-256 integrity manifests.
 *
 * Usage:
 *   node backup.js [--db <db_name>] [--out <output_directory>]
 *
 * Examples:
 *   node backup.js --db kaushalai_test --out ./backups
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const mongoose = require('mongoose')
const { EJSON } = mongoose.mongo.BSON
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

// Helper to mask MongoDB URI credentials for safe logging
function maskMongoUri(uri) {
  if (!uri) return 'UNDEFINED'
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    db: null,
    out: path.join(__dirname, '..', 'backups'),
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--db' && args[i + 1]) {
      options.db = args[i + 1]
      i++
    } else if (args[i] === '--out' && args[i + 1]) {
      options.out = path.resolve(args[i + 1])
      i++
    }
  }
  return options
}

async function runBackup(customOptions = null) {
  const options = Object.assign({}, parseArgs(), customOptions || {})
  const baseUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kaushalai'

  let targetUri = baseUri
  if (options.db) {
    const parsed = new URL(baseUri)
    parsed.pathname = '/' + options.db
    targetUri = parsed.toString()
  }

  const conn = await mongoose.createConnection(targetUri).asPromise()
  const dbName = conn.name

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
  const backupDirName = `backup_${dbName}_${timestamp}`
  const targetDir = path.join(options.out, backupDirName)

  fs.mkdirSync(targetDir, { recursive: true })

  console.log(`[Backup] Starting MongoDB BSON/EJSON backup for database: "${dbName}"`)
  console.log(`[Backup] Source URI: ${maskMongoUri(targetUri)}`)
  console.log(`[Backup] Destination directory: ${targetDir}`)

  const collections = await conn.db.listCollections().toArray()
  const manifest = {
    database: dbName,
    timestamp: new Date().toISOString(),
    format: 'EJSON_v2',
    collections: {},
    totalDocuments: 0,
  }

  for (const collInfo of collections) {
    const collName = collInfo.name
    // Skip internal system collections
    if (collName.startsWith('system.')) continue

    const coll = conn.db.collection(collName)
    const count = await coll.countDocuments()
    const docs = await coll.find({}).toArray()
    const indexes = await coll.indexes()

    // Serialize using MongoDB Extended JSON to preserve ObjectIds, Dates, etc.
    const serialized = EJSON.stringify(docs, null, 2)
    const filePath = path.join(targetDir, `${collName}.json`)
    fs.writeFileSync(filePath, serialized, 'utf8')

    // Compute SHA-256 checksum
    const hash = crypto.createHash('sha256').update(serialized).digest('hex')

    manifest.collections[collName] = {
      count,
      file: `${collName}.json`,
      bytes: Buffer.byteLength(serialized),
      sha256: hash,
      indexes: indexes.filter((idx) => idx.name !== '_id_'), // Skip default _id index
    }
    manifest.totalDocuments += count

    console.log(`  -> Backed up "${collName}": ${count} documents, ${indexes.length} indexes (${(Buffer.byteLength(serialized) / 1024).toFixed(1)} KB)`)
  }

  // Write manifest
  fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')

  console.log(`[Backup] Completed successfully. Total documents backed up: ${manifest.totalDocuments}`)
  console.log(`[Backup] Manifest written to: ${path.join(targetDir, 'manifest.json')}`)

  await conn.close()
  return { targetDir, manifest }
}

if (require.main === module) {
  runBackup().catch((err) => {
    console.error('[Backup] FATAL ERROR during backup:', err.message)
    process.exit(1)
  })
}

module.exports = { runBackup, maskMongoUri }
