'use strict'

const mongoose = require('mongoose')
const Course = require('../models/Course')
const Competency = require('../models/Competency')
const CourseCompetency = require('../models/CourseCompetency')

function createValidationError(message, status = 400, code = 'INVALID_COMPETENCY_MAPPING') {
  const err = new Error(message)
  err.status = status
  err.code = code
  return err
}

/**
 * Validate and deduplicate an array of Competency IDs against existing Competency documents.
 * Rejects malformed ObjectIds and non-existent Competency IDs.
 */
async function validateCompetencyIds(rawIds = []) {
  if (!Array.isArray(rawIds) || rawIds.length === 0) return []

  const uniqueStrs = []
  const seen = new Set()
  for (const raw of rawIds) {
    if (raw === undefined || raw === null || raw === '') continue
    const idStr = String(raw._id || raw).trim()
    if (!idStr) continue
    if (!mongoose.Types.ObjectId.isValid(idStr)) {
      throw createValidationError(
        `Invalid competency reference "${idStr}". Must be a valid Competency ObjectId.`,
        400,
        'INVALID_COMPETENCY_REFERENCE'
      )
    }
    if (!seen.has(idStr)) {
      seen.add(idStr)
      uniqueStrs.push(idStr)
    }
  }

  if (uniqueStrs.length === 0) return []

  const existing = await Competency.find({ _id: { $in: uniqueStrs } })
    .select('_id')
    .lean()
  const existingSet = new Set(existing.map((c) => String(c._id)))
  const missing = uniqueStrs.filter((id) => !existingSet.has(id))
  if (missing.length > 0) {
    throw createValidationError(
      `Referenced competency not found: ${missing.join(', ')}`,
      404,
      'COMPETENCY_NOT_FOUND'
    )
  }

  return uniqueStrs.map((id) => new mongoose.Types.ObjectId(id))
}

/**
 * Create or update a single verified CourseCompetency mapping.
 * Validates both Course (exists & not archived) and Competency (exists).
 * Prevents duplicate mappings (relying on compound unique index + upsert).
 */
async function upsertCourseCompetency({ courseId, competencyId, relevanceWeight = 1.0 }) {
  if (!courseId || !mongoose.Types.ObjectId.isValid(String(courseId))) {
    throw createValidationError('Invalid courseId for CourseCompetency mapping.', 400, 'INVALID_COURSE_REFERENCE')
  }
  if (!competencyId || !mongoose.Types.ObjectId.isValid(String(competencyId))) {
    throw createValidationError('Invalid competencyId for CourseCompetency mapping.', 400, 'INVALID_COMPETENCY_REFERENCE')
  }

  const [course, competency] = await Promise.all([
    Course.findById(courseId).select('_id isDeleted isArchived').lean(),
    Competency.findById(competencyId).select('_id').lean(),
  ])

  if (!course) {
    throw createValidationError('Referenced course not found.', 404, 'COURSE_NOT_FOUND')
  }
  if (course.isDeleted === true || course.isArchived === true) {
    throw createValidationError('Cannot map competencies to an archived course.', 409, 'COURSE_ARCHIVED')
  }
  if (!competency) {
    throw createValidationError('Referenced competency not found.', 404, 'COMPETENCY_NOT_FOUND')
  }

  const weight = Math.max(0, Math.min(1, Number(relevanceWeight) || 1.0))

  return CourseCompetency.findOneAndUpdate(
    { course_id: course._id, competency_id: competency._id },
    { $set: { relevance_weight: weight } },
    { upsert: true, new: true }
  )
}

/**
 * Synchronizes verified explicit Course.skillTags into CourseCompetency without
 * deleting existing valid mappings and without guessing mappings from titles/descriptions.
 * Returns the number of verified Course.skillTags relationships synced.
 */
async function syncCourseCompetencies() {
  try {
    const [activeCourses, validCompetencies] = await Promise.all([
      Course.find({ isDeleted: { $ne: true }, isArchived: { $ne: true } })
        .select('_id skillTags')
        .lean(),
      Competency.find({}).select('_id').lean(),
    ])

    const validCompIds = new Set(validCompetencies.map((c) => String(c._id)))
    let syncCount = 0

    for (const course of activeCourses) {
      if (!Array.isArray(course.skillTags) || course.skillTags.length === 0) continue

      const seen = new Set()
      for (const rawTag of course.skillTags) {
        const compIdStr = rawTag ? String(rawTag._id || rawTag) : ''
        if (!compIdStr || !validCompIds.has(compIdStr) || seen.has(compIdStr)) continue
        seen.add(compIdStr)

        await CourseCompetency.findOneAndUpdate(
          { course_id: course._id, competency_id: new mongoose.Types.ObjectId(compIdStr) },
          { $setOnInsert: { relevance_weight: 1.0 } },
          { upsert: true }
        )
        syncCount++
      }
    }

    return syncCount
  } catch (err) {
    console.error('[CourseCompetencySync] Sync error:', err.message)
    return 0
  }
}

module.exports = {
  syncCourseCompetencies,
  upsertCourseCompetency,
  validateCompetencyIds,
}
