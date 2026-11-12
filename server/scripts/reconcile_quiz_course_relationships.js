'use strict'

/**
 * Phase 36.2.3: Quiz-to-Course Relationship Reconciliation Script
 *
 * Classifies every Quiz document into:
 *   - ALREADY_VALID     : courseId is an ObjectId pointing to an existing, non-archived Course
 *   - VERIFIED_MATCH    : courseId is a 24-hex ObjectId string or verified externalCourseId
 *                         mapping uniquely to an existing, non-archived Course (1-to-1)
 *   - AMBIGUOUS_MATCH   : multiple Course matches or multiple quizzes claiming the same Course
 *   - INVALID_REFERENCE : non-empty courseId referencing a missing, archived, or unmapped ref
 *   - NO_MATCH          : empty/unset courseId (standalone/unlinked quiz)
 *
 * Safety rules:
 *   - Defaults to --dry-run (strictly read-only; zero writes anywhere).
 *   - Never guesses mappings from title similarity alone.
 *   - Rejects --apply against protected databases (`kaushalai`, `prod*`) unless
 *     --allow-protected-db is explicitly passed.
 *   - Requires --backup-verified alongside --apply.
 *   - Never modifies QuizAttempt, UserCompetency, SkillGap, questions, or passPercent.
 *   - Records applied courseId updates in AuditLog.
 */

const path = require('path')
const mongoose = require('mongoose')
const dotenv = require('dotenv')

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const Quiz = require('../src/models/Quiz')
const Course = require('../src/models/Course')
const AuditLog = require('../src/models/AuditLog')

const isProtectedDatabaseName = (dbName) => {
  const normalized = String(dbName || '').trim().toLowerCase()
  return normalized === 'kaushalai' || normalized.startsWith('prod')
}

const toIdString = (val) => {
  if (val === undefined || val === null) return ''
  if (typeof val === 'string') return val.trim()
  if (val instanceof mongoose.Types.ObjectId) return val.toString()
  if (typeof val === 'object' && val._id) return String(val._id).trim()
  return String(val).trim()
}

/**
 * Run Quiz-to-Course relationship audit and (optionally) verified reconciliation.
 */
async function reconcileQuizCourseRelationships({
  dryRun = true,
  allowProtectedDb = false,
  backupVerified = false,
  verifiedExternalMappings = {},
  actorId = null,
} = {}) {
  const dbName = mongoose.connection?.name || mongoose.connection?.db?.databaseName || ''

  if (!dryRun) {
    if (isProtectedDatabaseName(dbName) && !allowProtectedDb) {
      throw new Error(
        `Refusing --apply against protected database "${dbName}". Pass --allow-protected-db only after verified backup.`
      )
    }
    if (!backupVerified) {
      throw new Error('Refusing --apply without --backup-verified flag.')
    }
  }

  // Read raw documents from collection to preserve legacy string/undefined courseId values
  const [rawQuizzes, rawCourses] = await Promise.all([
    Quiz.collection.find({}).sort({ createdAt: 1, _id: 1 }).toArray(),
    Course.collection
      .find({}, { projection: { _id: 1, title: 1, externalCourseId: 1, isArchived: 1, isDeleted: 1 } })
      .toArray(),
  ])

  const activeCoursesById = new Map()
  const archivedCourseIds = new Set()
  const activeCoursesByExternalId = new Map()

  for (const course of rawCourses) {
    const idStr = String(course._id)
    if (course.isDeleted === true || course.isArchived === true) {
      archivedCourseIds.add(idStr)
      continue
    }
    activeCoursesById.set(idStr, course)
    if (typeof course.externalCourseId === 'string' && course.externalCourseId.trim()) {
      const extKey = course.externalCourseId.trim()
      const list = activeCoursesByExternalId.get(extKey) || []
      list.push(course)
      activeCoursesByExternalId.set(extKey, list)
    }
  }

  // Track Course._id claims (informational; one-to-many course-to-quiz links are valid)
  const claimedCourseToQuizIds = new Map()
  for (const quiz of rawQuizzes) {
    if (quiz.courseId instanceof mongoose.Types.ObjectId) {
      const targetId = quiz.courseId.toString()
      if (activeCoursesById.has(targetId)) {
        const list = claimedCourseToQuizIds.get(targetId) || []
        list.push(String(quiz._id))
        claimedCourseToQuizIds.set(targetId, list)
      }
    }
  }

  // First pass: resolve candidate matches per quiz
  const provisional = rawQuizzes.map((quiz) => {
    const quizId = String(quiz._id)
    const rawCourseId = quiz.courseId
    const courseIdStr = toIdString(rawCourseId)
    const baseItem = {
      quizId,
      title: quiz.title || '',
      materialId: quiz.materialId || '',
      rawCourseId: rawCourseId === undefined ? null : rawCourseId,
      classification: 'NO_MATCH',
      targetCourseId: null,
      targetCourseTitle: null,
      reason: '',
      applied: false,
    }

    if (!courseIdStr) {
      return {
        ...baseItem,
        classification: 'NO_MATCH',
        reason: 'Quiz has empty or unset courseId.',
      }
    }

    // Case A: Already an ObjectId instance
    if (rawCourseId instanceof mongoose.Types.ObjectId) {
      if (activeCoursesById.has(courseIdStr)) {
        return {
          ...baseItem,
          classification: 'ALREADY_VALID',
          targetCourseId: courseIdStr,
          targetCourseTitle: activeCoursesById.get(courseIdStr).title || null,
          reason: 'Quiz already links via ObjectId to an active Course.',
        }
      }
      if (archivedCourseIds.has(courseIdStr)) {
        return {
          ...baseItem,
          classification: 'INVALID_REFERENCE',
          reason: `Referenced Course ${courseIdStr} is archived.`,
        }
      }
      return {
        ...baseItem,
        classification: 'INVALID_REFERENCE',
        reason: `Referenced Course ObjectId ${courseIdStr} does not exist.`,
      }
    }

    // Case B: String 24-hex ObjectId (needs normalization to BSON ObjectId)
    if (mongoose.Types.ObjectId.isValid(courseIdStr) && /^[0-9a-fA-F]{24}$/.test(courseIdStr)) {
      if (activeCoursesById.has(courseIdStr)) {
        return {
          ...baseItem,
          classification: 'VERIFIED_MATCH',
          targetCourseId: courseIdStr,
          targetCourseTitle: activeCoursesById.get(courseIdStr).title || null,
          reason: 'String ObjectId matches an active Course and should be normalized to ObjectId.',
        }
      }
      if (archivedCourseIds.has(courseIdStr)) {
        return {
          ...baseItem,
          classification: 'INVALID_REFERENCE',
          reason: `String ObjectId ${courseIdStr} points to an archived Course.`,
        }
      }
      return {
        ...baseItem,
        classification: 'INVALID_REFERENCE',
        reason: `String ObjectId ${courseIdStr} does not exist in courses.`,
      }
    }

    // Case C: Legacy non-ObjectId identifier (e.g. "C01", "igot-crs-01")
    // Check explicit verified mapping table first, then exact externalCourseId match
    const explicitMappedTarget =
      verifiedExternalMappings && typeof verifiedExternalMappings === 'object'
        ? verifiedExternalMappings[courseIdStr]
        : null

    if (explicitMappedTarget) {
      const mappedIdStr = toIdString(explicitMappedTarget)
      if (activeCoursesById.has(mappedIdStr)) {
        return {
          ...baseItem,
          classification: 'VERIFIED_MATCH',
          targetCourseId: mappedIdStr,
          targetCourseTitle: activeCoursesById.get(mappedIdStr).title || null,
          reason: `Verified external mapping "${courseIdStr}" -> Course ${mappedIdStr}.`,
        }
      }
      return {
        ...baseItem,
        classification: 'INVALID_REFERENCE',
        reason: `Verified mapping target ${mappedIdStr} for "${courseIdStr}" is missing or archived.`,
      }
    }

    const extMatches = activeCoursesByExternalId.get(courseIdStr) || []
    if (extMatches.length === 1) {
      return {
        ...baseItem,
        classification: 'VERIFIED_MATCH',
        targetCourseId: String(extMatches[0]._id),
        targetCourseTitle: extMatches[0].title || null,
        reason: `Exact externalCourseId match "${courseIdStr}" -> Course ${extMatches[0]._id}.`,
      }
    }
    if (extMatches.length > 1) {
      return {
        ...baseItem,
        classification: 'AMBIGUOUS_MATCH',
        reason: `Multiple active Courses (${extMatches.map((c) => c._id).join(', ')}) share externalCourseId "${courseIdStr}".`,
      }
    }

    return {
      ...baseItem,
      classification: 'INVALID_REFERENCE',
      reason: `Legacy reference "${courseIdStr}" has no matching Course externalCourseId.`,
    }
  })

  // Apply only VERIFIED_MATCH items when dryRun === false
  let appliedCount = 0
  const appliedChanges = []

  if (!dryRun) {
    for (const item of provisional) {
      if (item.classification !== 'VERIFIED_MATCH' || !item.targetCourseId) continue

      const targetObjectId = new mongoose.Types.ObjectId(item.targetCourseId)
      const quizObjectId = new mongoose.Types.ObjectId(item.quizId)
      const updateResult = await Quiz.collection.updateOne(
        { _id: quizObjectId },
        { $set: { courseId: targetObjectId, updatedAt: new Date() } }
      )
      if (updateResult.modifiedCount === 1 || updateResult.matchedCount === 1) {
        item.applied = true
        appliedCount += 1
        appliedChanges.push({
          quizId: item.quizId,
          previousCourseId: item.rawCourseId,
          newCourseId: item.targetCourseId,
          reason: item.reason,
        })
      }
    }

    if (appliedChanges.length > 0) {
      await AuditLog.create({
        userId: actorId && mongoose.Types.ObjectId.isValid(String(actorId)) ? actorId : null,
        action: 'QUIZ_COURSE_RECONCILIATION',
        targetType: 'Quiz',
        targetId: null,
        meta: {
          database: dbName,
          appliedCount,
          changes: appliedChanges,
        },
      })
    }
  }

  const counts = {
    totalQuizzes: provisional.length,
    ALREADY_VALID: provisional.filter((x) => x.classification === 'ALREADY_VALID').length,
    VERIFIED_MATCH: provisional.filter((x) => x.classification === 'VERIFIED_MATCH').length,
    AMBIGUOUS_MATCH: provisional.filter((x) => x.classification === 'AMBIGUOUS_MATCH').length,
    INVALID_REFERENCE: provisional.filter((x) => x.classification === 'INVALID_REFERENCE').length,
    NO_MATCH: provisional.filter((x) => x.classification === 'NO_MATCH').length,
    appliedCount,
  }

  return {
    mode: dryRun ? 'dry-run' : 'apply',
    database: dbName,
    counts,
    items: provisional,
    appliedChanges,
  }
}

async function runCli() {
  const args = new Set(process.argv.slice(2))
  const apply = args.has('--apply')
  const dryRun = !apply || args.has('--dry-run')
  const jsonOutput = args.has('--json')
  const backupVerified = args.has('--backup-verified')
  const allowProtectedDb = args.has('--allow-protected-db')

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kaushalai'

  await mongoose.connect(mongoUri)
  try {
    const report = await reconcileQuizCourseRelationships({
      dryRun,
      allowProtectedDb,
      backupVerified,
    })

    if (jsonOutput) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      console.log(`\n[reconcile_quiz_course_relationships] mode=${report.mode} db=${report.database}`)
      console.log('Summary:', JSON.stringify(report.counts))
      for (const item of report.items) {
        console.log(
          `- ${item.quizId} | ${item.classification} | rawCourseId=${JSON.stringify(item.rawCourseId)} | title="${item.title}" | ${item.reason}`
        )
      }
      console.log('')
    }
  } finally {
    await mongoose.disconnect()
  }
}

if (require.main === module) {
  runCli().catch((err) => {
    console.error('[reconcile_quiz_course_relationships] ERROR:', err.message)
    process.exit(1)
  })
}

module.exports = {
  reconcileQuizCourseRelationships,
  isProtectedDatabaseName,
}
