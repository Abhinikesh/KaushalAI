'use strict'

/**
 * Phase 35.1 — Safe Legacy Competency Collection Reconciliation Script
 *
 * Reconciles records from legacy collection `usercompetencies` (camelCase) into
 * canonical collection `user_competencies` (snake_case) using idempotent,
 * non-overwriting `$setOnInsert` semantics.
 *
 * Guarantees:
 *   - Defaults strictly to --dry-run (zero database writes).
 *   - Never executes automatically at server startup or during autoSeed.
 *   - Requires explicit --target=<dbName> and --confirm=RECONCILE_USER_COMPETENCIES for --apply.
 *   - Refuses `kaushalai` and production database names on --apply unless an additional
 *     explicit `--allow-protected-db=<dbName>` confirmation flag is supplied.
 *   - Requires and verifies a readable JSON backup of `usercompetencies` before any write.
 *   - Preserves canonical records (including diagnostic_test overrides); never drops or clears `usercompetencies`.
 *   - Triggers `computeUserSkillGaps()` (under `withUserLock()`) ONLY for eligible non-admin learner accounts
 *     whose canonical competencies gained at least one newly inserted record.
 */

const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')

const LEGACY_COLLECTION = 'usercompetencies'
const CANONICAL_COLLECTION = 'user_competencies'
const REQUIRED_CONFIRM_TOKEN = 'RECONCILE_USER_COMPETENCIES'

const PROTECTED_DATABASES = new Set([
  'kaushalai',
  'kaushal_ai',
  'kaushalai_prod',
  'kaushalai_production',
  'production',
  'prod',
])

const ALLOWED_SOURCES = new Set([
  'diagnostic_test',
  'quiz',
  'manual_override',
  'course_completion',
  'self_assessed',
])

function sanitizeMongoUri(uri) {
  if (!uri || typeof uri !== 'string') return ''
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
}

function toValidObjectId(val) {
  if (!val) return null
  if (val instanceof mongoose.Types.ObjectId) return val
  const str = String(val).trim()
  if (!mongoose.Types.ObjectId.isValid(str)) return null
  return new mongoose.Types.ObjectId(str)
}

function toValidDate(val) {
  if (!val) return null
  const d = val instanceof Date ? val : new Date(val)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Verifies that a backup JSON file exists, is readable JSON array,
 * and matches all legacy document IDs & counts.
 */
function verifyLegacyBackupFile(backupPath, legacyDocs) {
  if (!backupPath || typeof backupPath !== 'string') {
    throw new Error('BACKUP_REQUIRED: Missing backup file path before apply.')
  }
  const resolved = path.resolve(backupPath)
  if (!fs.existsSync(resolved)) {
    throw new Error(`BACKUP_NOT_FOUND: Backup file does not exist at "${resolved}".`)
  }
  const raw = fs.readFileSync(resolved, 'utf8')
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    throw new Error(`BACKUP_CORRUPT: Backup file "${resolved}" is not valid JSON (${err.message}).`)
  }
  const docs = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.documents) ? parsed.documents : null)
  if (!Array.isArray(docs)) {
    throw new Error(`BACKUP_INVALID_FORMAT: Backup file "${resolved}" must contain a JSON array or { documents: [] }.`)
  }
  if (docs.length !== legacyDocs.length) {
    throw new Error(
      `BACKUP_COUNT_MISMATCH: Backup contains ${docs.length} records, but "${LEGACY_COLLECTION}" has ${legacyDocs.length} records.`
    )
  }
  const expectedIds = new Set(legacyDocs.map((d) => String(d._id)))
  for (const item of docs) {
    if (!item || !expectedIds.has(String(item._id))) {
      throw new Error(`BACKUP_CONTENT_MISMATCH: Backup contains unexpected or missing legacy record ID "${item?._id}".`)
    }
  }
  return {
    verified: true,
    backupPath: resolved,
    recordCount: docs.length,
  }
}

function writeLegacyBackupFile(backupPath, dbName, legacyDocs) {
  const resolved = path.resolve(backupPath)
  fs.mkdirSync(path.dirname(resolved), { recursive: true })
  const payload = {
    collection: LEGACY_COLLECTION,
    database: dbName,
    exportedAt: new Date().toISOString(),
    count: legacyDocs.length,
    documents: legacyDocs,
  }
  fs.writeFileSync(resolved, JSON.stringify(payload, null, 2), 'utf8')
  return resolved
}

/**
 * Executes reconciliation against an active MongoDB `Db` handle.
 */
async function reconcileUserCompetencies(db, options = {}) {
  const apply = Boolean(options.apply)
  const dbName = db?.databaseName || (db?.s?.namespace?.db) || ''
  if (!dbName) {
    throw new Error('TARGET_DB_UNKNOWN: Cannot determine MongoDB database name.')
  }

  // Safeguard: validate database target when applying
  if (apply) {
    if (!options.targetDb || String(options.targetDb).trim() !== dbName) {
      throw new Error(
        `TARGET_MISMATCH: --apply requires explicit --target=${dbName} matching the connected database (got "${options.targetDb || ''}").`
      )
    }
    if (options.confirmToken !== REQUIRED_CONFIRM_TOKEN) {
      throw new Error(
        `CONFIRMATION_REQUIRED: --apply requires explicit --confirm=${REQUIRED_CONFIRM_TOKEN}.`
      )
    }
    if (PROTECTED_DATABASES.has(dbName.toLowerCase()) && options.allowProtectedDb !== dbName) {
      throw new Error(
        `PROTECTED_DATABASE_REFUSED: Target database "${dbName}" is protected. Supply explicit --allow-protected-db=${dbName} to override.`
      )
    }
  }

  const legacyCol = db.collection(LEGACY_COLLECTION)
  const canonicalCol = db.collection(CANONICAL_COLLECTION)
  const usersCol = db.collection('users')
  const competenciesCol = db.collection('competencies')

  const [beforeCanonicalCount, legacyDocs] = await Promise.all([
    canonicalCol.countDocuments(),
    legacyCol.find({}).sort({ _id: 1 }).toArray(),
  ])

  let backupInfo = null
  if (apply) {
    if (options.createBackup && options.backupFile) {
      writeLegacyBackupFile(options.backupFile, dbName, legacyDocs)
    }
    backupInfo = verifyLegacyBackupFile(options.backupFile, legacyDocs)
  }

  // Preload referenced users & competencies once for deterministic FK validation
  const rawUserIds = legacyDocs.map((d) => toValidObjectId(d.userId || d.user_id)).filter(Boolean)
  const rawCompIds = legacyDocs.map((d) => toValidObjectId(d.competencyId || d.competency_id)).filter(Boolean)

  const [existingUsers, existingComps] = await Promise.all([
    rawUserIds.length > 0
      ? usersCol.find({ _id: { $in: rawUserIds } }, { projection: { _id: 1, role: 1, role_id: 1, department: 1, level: 1, email: 1 } }).toArray()
      : [],
    rawCompIds.length > 0
      ? competenciesCol.find({ _id: { $in: rawCompIds } }, { projection: { _id: 1, name: 1 } }).toArray()
      : [],
  ])

  const userMap = new Map(existingUsers.map((u) => [String(u._id), u]))
  const compMap = new Map(existingComps.map((c) => [String(c._id), c]))

  const inserted = []
  const skippedExisting = []
  const conflicts = []
  const invalidRecords = []
  const raceSkipped = []
  const pairSeenInLegacy = new Set()
  const usersWithInsertedCompetencies = new Set()

  for (const doc of legacyDocs) {
    const legacyId = String(doc._id)
    const userObjId = toValidObjectId(doc.userId || doc.user_id)
    const compObjId = toValidObjectId(doc.competencyId || doc.competency_id)
    const rawLevel = doc.currentLevel ?? doc.current_level
    const numericLevel = Number(rawLevel)

    if (!userObjId || !compObjId) {
      invalidRecords.push({
        legacyId,
        reason: 'invalid_object_id',
        userId: doc.userId ?? doc.user_id ?? null,
        competencyId: doc.competencyId ?? doc.competency_id ?? null,
      })
      continue
    }

    if (!Number.isInteger(numericLevel) || numericLevel < 1 || numericLevel > 5) {
      invalidRecords.push({
        legacyId,
        reason: 'invalid_level',
        userId: String(userObjId),
        competencyId: String(compObjId),
        currentLevel: rawLevel,
      })
      continue
    }

    const userExists = userMap.has(String(userObjId))
    const compExists = compMap.has(String(compObjId))
    if (!userExists || !compExists) {
      invalidRecords.push({
        legacyId,
        reason: !userExists && !compExists ? 'missing_user_and_competency' : (!userExists ? 'missing_user' : 'missing_competency'),
        userId: String(userObjId),
        competencyId: String(compObjId),
      })
      continue
    }

    const pairKey = `${String(userObjId)}:${String(compObjId)}`
    if (pairSeenInLegacy.has(pairKey)) {
      skippedExisting.push({
        legacyId,
        pairKey,
        reason: 'duplicate_pair_in_legacy',
      })
      continue
    }
    pairSeenInLegacy.add(pairKey)

    const existingCanonical = await canonicalCol.findOne({
      user_id: userObjId,
      competency_id: compObjId,
    })

    const sourceVal = typeof doc.source === 'string' && ALLOWED_SOURCES.has(doc.source)
      ? doc.source
      : 'self_assessed'
    const lastAssessedAt =
      toValidDate(doc.lastUpdated) ||
      toValidDate(doc.last_assessed_at) ||
      toValidDate(doc.updatedAt) ||
      toValidDate(doc.createdAt) ||
      new Date()
    const createdAt = toValidDate(doc.createdAt) || lastAssessedAt
    const updatedAt = toValidDate(doc.updatedAt) || lastAssessedAt

    if (existingCanonical) {
      const canonicalUpdatedAt = toValidDate(existingCanonical.updatedAt || existingCanonical.last_assessed_at)
      const isValueOrSourceConflict =
        existingCanonical.current_level !== numericLevel ||
        existingCanonical.source !== sourceVal

      const entry = {
        legacyId,
        canonicalId: String(existingCanonical._id),
        user_id: String(userObjId),
        competency_id: String(compObjId),
        canonical: {
          current_level: existingCanonical.current_level,
          source: existingCanonical.source,
          updatedAt: canonicalUpdatedAt ? canonicalUpdatedAt.toISOString() : null,
        },
        legacy: {
          currentLevel: numericLevel,
          source: sourceVal,
          updatedAt: updatedAt ? updatedAt.toISOString() : null,
        },
        action: 'preserved_canonical',
      }

      if (isValueOrSourceConflict) {
        conflicts.push(entry)
      } else {
        skippedExisting.push(entry)
      }
      continue
    }

    const candidateDoc = {
      user_id: userObjId,
      competency_id: compObjId,
      current_level: numericLevel,
      last_assessed_at: lastAssessedAt,
      assessment_attempt_id: null,
      source: sourceVal,
      createdAt,
      updatedAt,
    }

    if (!apply) {
      inserted.push({
        legacyId,
        user_id: String(userObjId),
        competency_id: String(compObjId),
        current_level: numericLevel,
        source: sourceVal,
        last_assessed_at: lastAssessedAt.toISOString(),
        action: 'would_insert',
      })
      usersWithInsertedCompetencies.add(String(userObjId))
      continue
    }

    if (typeof options.beforeInsertHook === 'function') {
      await options.beforeInsertHook({ user_id: userObjId, competency_id: compObjId, legacyId })
    }

    try {
      const res = await canonicalCol.updateOne(
        { user_id: userObjId, competency_id: compObjId },
        { $setOnInsert: candidateDoc },
        { upsert: true }
      )

      if (res.upsertedCount === 1) {
        inserted.push({
          legacyId,
          canonicalId: String(res.upsertedId),
          user_id: String(userObjId),
          competency_id: String(compObjId),
          current_level: numericLevel,
          source: sourceVal,
          last_assessed_at: lastAssessedAt.toISOString(),
          action: 'inserted',
        })
        usersWithInsertedCompetencies.add(String(userObjId))
      } else {
        raceSkipped.push({
          legacyId,
          user_id: String(userObjId),
          competency_id: String(compObjId),
          reason: 'existing_pair_matched_during_upsert',
        })
      }
    } catch (err) {
      if (err && err.code === 11000) {
        raceSkipped.push({
          legacyId,
          user_id: String(userObjId),
          competency_id: String(compObjId),
          reason: 'duplicate_key_race_preserved_canonical',
        })
      } else {
        throw err
      }
    }
  }

  // Section A4: SkillGap synchronization for eligible learner accounts only
  const skillGapSync = {
    evaluatedUsers: [],
    syncedLearners: [],
    deferredLearners: [],
    skippedAdmins: [],
    skippedUnresolvedRole: [],
  }

  const syncFlag = options.syncSkillGaps !== false
  if (syncFlag && usersWithInsertedCompetencies.size > 0) {
    const { resolveAuthoritativeRole } = require('../src/utils/roleResolution')
    const { computeUserSkillGaps } = require('../src/services/skillGap.service')

    for (const userIdStr of usersWithInsertedCompetencies) {
      const userObj = userMap.get(userIdStr)
      if (!userObj) continue
      skillGapSync.evaluatedUsers.push(userIdStr)

      if (userObj.role === 'admin') {
        skillGapSync.skippedAdmins.push({ userId: userIdStr, reason: 'admin_account_excluded' })
        continue
      }

      const roleRes = await resolveAuthoritativeRole(userObj)
      if (!roleRes.resolved || !roleRes.role) {
        skillGapSync.skippedUnresolvedRole.push({
          userId: userIdStr,
          reason: roleRes.reason || 'unresolved_role',
        })
        continue
      }

      if (!apply) {
        skillGapSync.syncedLearners.push({
          userId: userIdStr,
          roleId: String(roleRes.role._id),
          action: 'would_sync',
        })
        continue
      }

      try {
        if (typeof options.skillGapSyncSimulator === 'function') {
          await options.skillGapSyncSimulator(userIdStr)
        } else {
          await computeUserSkillGaps(userIdStr)
        }
        skillGapSync.syncedLearners.push({
          userId: userIdStr,
          roleId: String(roleRes.role._id),
          action: 'synced',
        })
      } catch (syncErr) {
        await usersCol.updateOne(
          { _id: new mongoose.Types.ObjectId(userIdStr) },
          {
            $set: {
              needs_skillgap_sync: true,
              skillgap_sync_error: syncErr.message || 'Migration SkillGap sync failed',
              skillgap_sync_requested_at: new Date(),
            },
          }
        )
        skillGapSync.deferredLearners.push({
          userId: userIdStr,
          roleId: String(roleRes.role._id),
          error: syncErr.message,
          action: 'marked_deferred',
        })
      }
    }
  }

  const [afterCanonicalCount, afterLegacyCount] = await Promise.all([
    canonicalCol.countDocuments(),
    legacyCol.countDocuments(),
  ])

  return {
    mode: apply ? 'apply' : 'dry_run',
    databaseName: dbName,
    backup: backupInfo,
    counts: {
      beforeCanonicalCount,
      legacySourceCount: legacyDocs.length,
      insertedCount: inserted.length,
      skippedExistingCount: skippedExisting.length,
      conflictCount: conflicts.length,
      invalidCount: invalidRecords.length,
      raceSkippedCount: raceSkipped.length,
      afterCanonicalCount,
      afterLegacyCount,
    },
    legacyCollectionPreserved: afterLegacyCount === legacyDocs.length,
    skillGapSync,
    details: {
      inserted,
      skippedExisting,
      conflicts,
      invalidRecords,
      raceSkipped,
    },
  }
}

function parseCliArgs(argv) {
  const args = argv.slice(2)
  const getArg = (prefix) => {
    const found = args.find((a) => a.startsWith(prefix))
    return found ? found.slice(prefix.length) : null
  }
  return {
    apply: args.includes('--apply') && !args.includes('--dry-run'),
    uri: getArg('--uri=') || process.env.MONGO_URI || null,
    targetDb: getArg('--target='),
    confirmToken: getArg('--confirm='),
    allowProtectedDb: getArg('--allow-protected-db='),
    backupFile: getArg('--backup-file='),
    createBackup: args.includes('--create-backup'),
    skipSkillGapSync: args.includes('--skip-skillgap-sync'),
    json: args.includes('--json'),
  }
}

if (require.main === module) {
  const opts = parseCliArgs(process.argv)
  if (!opts.uri) {
    console.error('[RECONCILE ERROR] Missing target URI. Supply --uri=<mongodb_uri> or MONGO_URI.')
    process.exit(1)
  }

  ;(async () => {
    try {
      if (!opts.json) {
        console.log(`[RECONCILE] Connecting cleanly to ${sanitizeMongoUri(opts.uri)}...`)
      }
      await mongoose.connect(opts.uri)
      const result = await reconcileUserCompetencies(mongoose.connection.db, {
        apply: opts.apply,
        targetDb: opts.targetDb,
        confirmToken: opts.confirmToken,
        allowProtectedDb: opts.allowProtectedDb,
        backupFile: opts.backupFile,
        createBackup: opts.createBackup,
        syncSkillGaps: !opts.skipSkillGapSync,
      })

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        console.log('\n====================================================================')
        console.log(`  COMPETENCY RECONCILIATION SUMMARY (${result.mode.toUpperCase()})`)
        console.log('====================================================================')
        console.log(`  Database              : ${result.databaseName}`)
        console.log(`  Before Canonical      : ${result.counts.beforeCanonicalCount}`)
        console.log(`  Legacy Source         : ${result.counts.legacySourceCount}`)
        console.log(`  Inserted / WouldInsert: ${result.counts.insertedCount}`)
        console.log(`  Skipped Existing      : ${result.counts.skippedExistingCount}`)
        console.log(`  Conflicts (Preserved) : ${result.counts.conflictCount}`)
        console.log(`  Invalid References    : ${result.counts.invalidCount}`)
        console.log(`  Race Skipped          : ${result.counts.raceSkippedCount}`)
        console.log(`  After Canonical       : ${result.counts.afterCanonicalCount}`)
        console.log(`  Legacy Preserved      : ${result.legacyCollectionPreserved}`)
        console.log(`  SkillGap Sync         : synced=${result.skillGapSync.syncedLearners.length}, deferred=${result.skillGapSync.deferredLearners.length}, skippedAdmin=${result.skillGapSync.skippedAdmins.length}`)
        console.log('====================================================================\n')
      }
      await mongoose.disconnect()
      process.exit(0)
    } catch (err) {
      console.error(`[RECONCILE FAILED] ${err.message}`)
      await mongoose.disconnect().catch(() => {})
      process.exit(1)
    }
  })()
}

module.exports = {
  LEGACY_COLLECTION,
  CANONICAL_COLLECTION,
  REQUIRED_CONFIRM_TOKEN,
  PROTECTED_DATABASES,
  sanitizeMongoUri,
  verifyLegacyBackupFile,
  writeLegacyBackupFile,
  reconcileUserCompetencies,
  parseCliArgs,
}
