'use strict'

/**
 * Phase 36.2.1 — Enrollment & LearningProgress Reconciliation Script
 *
 * Defaults to --dry-run (strictly read-only; zero database mutations).
 * Pass --apply only after reviewing dry-run conflicts on a target database.
 * Never deletes learner history, never auto-overwrites conflicting completion states,
 * and never auto-issues certificates.
 *
 * Usage:
 *   node server/scripts/reconcile_enrollment_learning_progress.js [--dry-run] [--apply] [--json]
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const mongoose = require('mongoose')
const Course = require('../src/models/Course')
const Enrollment = require('../src/models/Enrollment')
const LearningProgress = require('../src/models/LearningProgress')
const LearningPathItem = require('../src/models/LearningPathItem')
const User = require('../src/models/User')

function parseArgs(argv) {
  const apply = argv.includes('--apply')
  const json = argv.includes('--json')
  return { mode: apply ? 'apply' : 'dry-run', json }
}

async function inspectCollectionIndexes() {
  const [enrollmentIndexes, lpIndexes, courseIndexes] = await Promise.all([
    Enrollment.collection.indexes(),
    LearningProgress.collection.indexes(),
    Course.collection.indexes(),
  ])
  return {
    enrollments: enrollmentIndexes.map((idx) => ({
      name: idx.name,
      key: idx.key,
      unique: Boolean(idx.unique),
    })),
    learning_progress: lpIndexes.map((idx) => ({
      name: idx.name,
      key: idx.key,
      unique: Boolean(idx.unique),
    })),
    courses: courseIndexes.map((idx) => ({
      name: idx.name,
      key: idx.key,
      unique: Boolean(idx.unique),
    })),
  }
}

async function reconcileEnrollmentAndLearningProgress({ apply = false } = {}) {
  const [courses, users, enrollments, learningProgressDocs, pathItems] = await Promise.all([
    Course.find({}).lean(),
    User.find({}).select('_id name email role').lean(),
    Enrollment.find({}).lean(),
    LearningProgress.find({}).lean(),
    LearningPathItem.find({}).lean(),
  ])

  const courseById = new Map()
  const courseByExternalId = new Map()
  for (const c of courses) {
    courseById.set(String(c._id), c)
    if (c.externalCourseId && String(c.externalCourseId).trim()) {
      courseByExternalId.set(String(c.externalCourseId).trim(), c)
    }
  }

  const userById = new Set(users.map((u) => String(u._id)))

  const enrollmentByUserCourse = new Map()
  const duplicateEnrollmentPairs = []
  const enrollmentFindings = []

  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    enrollmentsTotal: enrollments.length,
    learningProgressTotal: learningProgressDocs.length,
    learningPathItemsTotal: pathItems.length,
    duplicateEnrollmentPairs: 0,
    orphanEnrollmentCourseRefs: 0,
    orphanEnrollmentUserRefs: 0,
    wouldBackfillSnapshots: 0,
    backfilledSnapshots: 0,
    learningProgressMatchedToEnrollment: 0,
    learningProgressWithoutEnrollment: 0,
    learningProgressStandalonePractice: 0,
    conflictsRequiringReview: 0,
    wouldLinkLearningProgress: 0,
    linkedLearningProgress: 0,
    learningPathItemMismatches: 0,
  }

  for (const enr of enrollments) {
    const uStr = enr.userId ? String(enr.userId) : ''
    const cStr = enr.courseId ? String(enr.courseId) : ''
    const pairKey = `${uStr}::${cStr}`
    if (enrollmentByUserCourse.has(pairKey)) {
      duplicateEnrollmentPairs.push({ pairKey, enrollmentId: String(enr._id) })
      summary.duplicateEnrollmentPairs += 1
    } else {
      enrollmentByUserCourse.set(pairKey, enr)
    }

    const userExists = userById.has(uStr)
    if (!userExists) summary.orphanEnrollmentUserRefs += 1

    const course = courseById.get(cStr) || null
    if (!course) {
      summary.orphanEnrollmentCourseRefs += 1
      enrollmentFindings.push({
        enrollmentId: String(enr._id),
        userId: uStr,
        courseId: cStr,
        status: enr.status,
        progressPercent: enr.progressPercent,
        action: 'orphan_course_preserved_read_only',
        reason: 'Referenced Course document does not exist in courses collection',
      })
      continue
    }

    if (!enr.courseSnapshot || !enr.courseSnapshot.title) {
      summary.wouldBackfillSnapshots += 1
      const snapshot = {
        title: course.title,
        source: course.source,
        provider: course.provider,
        externalCourseId: course.externalCourseId || '',
        difficulty: course.difficulty,
        durationHours: course.durationHours,
      }
      if (apply) {
        await Enrollment.updateOne({ _id: enr._id }, { $set: { courseSnapshot: snapshot } })
        summary.backfilledSnapshots += 1
      }
      enrollmentFindings.push({
        enrollmentId: String(enr._id),
        userId: uStr,
        courseId: cStr,
        action: apply ? 'backfilled_snapshot' : 'would_backfill_snapshot',
        courseArchived: Boolean(course.isDeleted),
      })
    }
  }

  const learningProgressFindings = []
  const lpPairSeen = new Map()
  const duplicateLearningProgressPairs = []

  for (const lp of learningProgressDocs) {
    const rawUser = lp.user_id !== undefined && lp.user_id !== null ? String(lp.user_id).trim() : ''
    const rawCourse = lp.course_id !== undefined && lp.course_id !== null ? String(lp.course_id).trim() : ''

    if (rawCourse === 'Independent Practice') {
      summary.learningProgressStandalonePractice += 1
      learningProgressFindings.push({
        learningProgressId: String(lp._id),
        userId: rawUser,
        courseId: rawCourse,
        action: 'standalone_practice_unchanged',
      })
      continue
    }

    let resolvedCourse = null
    if (mongoose.isValidObjectId(rawCourse)) {
      resolvedCourse = courseById.get(rawCourse) || null
    }
    if (!resolvedCourse && rawCourse) {
      resolvedCourse = courseByExternalId.get(rawCourse) || null
    }

    const canonicalCourseIdStr = resolvedCourse ? String(resolvedCourse._id) : rawCourse
    const canonicalPair = `${rawUser}::${canonicalCourseIdStr}`

    if (lpPairSeen.has(canonicalPair)) {
      duplicateLearningProgressPairs.push({
        pairKey: canonicalPair,
        firstId: lpPairSeen.get(canonicalPair),
        duplicateId: String(lp._id),
      })
    } else {
      lpPairSeen.set(canonicalPair, String(lp._id))
    }

    const matchedEnrollment = enrollmentByUserCourse.get(canonicalPair) || null
    if (!matchedEnrollment) {
      summary.learningProgressWithoutEnrollment += 1
      learningProgressFindings.push({
        learningProgressId: String(lp._id),
        userId: rawUser,
        rawCourseId: rawCourse,
        resolvedCourseId: resolvedCourse ? String(resolvedCourse._id) : null,
        courseCompletedFlag: Boolean(lp.course_completed),
        labCompleted: Boolean(lp.lab_completed),
        action: 'unlinked_no_enrollment_manual_review',
        reason: resolvedCourse
          ? 'No canonical Enrollment exists for resolved user+course'
          : 'Course identifier does not resolve to an existing Course document',
      })
      continue
    }

    summary.learningProgressMatchedToEnrollment += 1
    const enrollmentCompleted = matchedEnrollment.status === 'completed'
    const lpCompleted = Boolean(lp.course_completed)

    if (lpCompleted !== enrollmentCompleted) {
      summary.conflictsRequiringReview += 1
      learningProgressFindings.push({
        learningProgressId: String(lp._id),
        enrollmentId: String(matchedEnrollment._id),
        userId: rawUser,
        courseId: String(matchedEnrollment.courseId),
        enrollmentStatus: matchedEnrollment.status,
        enrollmentProgressPercent: matchedEnrollment.progressPercent,
        lpCourseCompleted: lpCompleted,
        lpQuizPassed: Boolean(lp.quiz_passed),
        lpLabCompleted: Boolean(lp.lab_completed),
        action: 'conflict_manual_review',
        reason:
          'LearningProgress.course_completed disagrees with authoritative Enrollment.status; preserved without auto-overwrite',
      })
      continue
    }

    const needsLink = !lp.enrollmentId || String(lp.enrollmentId) !== String(matchedEnrollment._id)
    if (needsLink) {
      summary.wouldLinkLearningProgress += 1
      if (apply) {
        await LearningProgress.updateOne(
          { _id: lp._id },
          { $set: { enrollmentId: matchedEnrollment._id } }
        )
        summary.linkedLearningProgress += 1
      }
      learningProgressFindings.push({
        learningProgressId: String(lp._id),
        enrollmentId: String(matchedEnrollment._id),
        userId: rawUser,
        courseId: String(matchedEnrollment.courseId),
        action: apply ? 'linked_enrollment_id' : 'would_link_enrollment_id',
      })
    } else {
      learningProgressFindings.push({
        learningProgressId: String(lp._id),
        enrollmentId: String(matchedEnrollment._id),
        userId: rawUser,
        courseId: String(matchedEnrollment.courseId),
        action: 'already_aligned',
      })
    }
  }

  const pathItemFindings = []
  for (const item of pathItems) {
    const key = `${String(item.user_id || '')}::${String(item.course_id || '')}`
    const enr = enrollmentByUserCourse.get(key)
    if (!enr) continue
    const expectedStatus =
      enr.status === 'completed' ? 'completed' : enr.progressPercent > 0 ? 'in_progress' : 'not_started'
    if (item.status !== expectedStatus) {
      summary.learningPathItemMismatches += 1
      pathItemFindings.push({
        learningPathItemId: String(item._id),
        enrollmentId: String(enr._id),
        currentStatus: item.status,
        expectedFromEnrollment: expectedStatus,
        action: 'path_item_status_drift_reported',
      })
    }
  }

  const indexes = await inspectCollectionIndexes()

  return {
    summary,
    indexes,
    duplicateEnrollmentPairs,
    duplicateLearningProgressPairs,
    enrollmentFindings,
    learningProgressFindings,
    pathItemFindings,
  }
}

async function runCli() {
  const { mode, json } = parseArgs(process.argv.slice(2))
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/kaushalai'
  await mongoose.connect(uri)
  try {
    const report = await reconcileEnrollmentAndLearningProgress({ apply: mode === 'apply' })
    if (json) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      console.log('=== Phase 36.2.1 Enrollment & LearningProgress Reconciliation ===')
      console.log(JSON.stringify(report.summary, null, 2))
      if (report.duplicateLearningProgressPairs.length > 0) {
        console.log('Duplicate normalized LearningProgress pairs:', report.duplicateLearningProgressPairs)
      }
      if (report.learningProgressFindings.length > 0) {
        console.log('LearningProgress findings:', JSON.stringify(report.learningProgressFindings, null, 2))
      }
      if (report.enrollmentFindings.some((f) => f.action === 'orphan_course_preserved_read_only')) {
        console.log(
          'Orphan Enrollments:',
          JSON.stringify(
            report.enrollmentFindings.filter((f) => f.action === 'orphan_course_preserved_read_only'),
            null,
            2
          )
        )
      }
    }
  } finally {
    await mongoose.disconnect()
  }
}

if (require.main === module) {
  runCli().catch((err) => {
    console.error('[reconcile_enrollment_learning_progress] Error:', err)
    process.exit(1)
  })
}

module.exports = { reconcileEnrollmentAndLearningProgress, inspectCollectionIndexes }

