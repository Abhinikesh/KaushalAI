'use strict'

const mongoose = require('mongoose')
const Course = require('../models/Course')
const Quiz = require('../models/Quiz')

function createHttpError(message, status, code = null) {
  const err = new Error(message)
  err.status = status
  if (code) {
    err.code = code
    err.details = { code }
  }
  return err
}

/**
 * Resolve a raw course identifier (Course ObjectId or externalCourseId) to an
 * active Course document. Returns { course: null, isUnlinked: true } when blank.
 */
async function resolveCourseForQuiz(rawCourseId, { allowExternalId = true, allowUnpublished = false } = {}) {
  if (rawCourseId === undefined || rawCourseId === null) {
    return { course: null, isUnlinked: true }
  }

  const trimmed = String(rawCourseId).trim()
  if (!trimmed) {
    return { course: null, isUnlinked: true }
  }

  let course = null
  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    course = await Course.findById(trimmed).lean()
    if (!course) {
      throw createHttpError('Referenced course not found.', 404, 'COURSE_NOT_FOUND')
    }
  } else if (allowExternalId) {
    course = await Course.findOne({ externalCourseId: trimmed }).lean()
    if (!course) {
      throw createHttpError(
        `Invalid courseId reference "${trimmed}". Must reference a valid active Course.`,
        400,
        'INVALID_COURSE_REFERENCE'
      )
    }
  } else {
    throw createHttpError(
      `Invalid courseId reference "${trimmed}". Must be a valid Course ObjectId.`,
      400,
      'INVALID_COURSE_REFERENCE'
    )
  }

  if (course.isDeleted === true || course.isArchived === true) {
    throw createHttpError(
      'Referenced course has been archived and cannot be linked or accessed for quizzes.',
      409,
      'COURSE_ARCHIVED'
    )
  }

  if (!allowUnpublished && course.isPublished === false) {
    throw createHttpError('Referenced course is not published.', 400, 'COURSE_UNPUBLISHED')
  }

  return { course, isUnlinked: false }
}

/**
 * Validate a courseId assignment on quiz create/update (one-to-many: multiple quizzes per course).
 * Returns canonical Course ObjectId or null (for standalone quizzes).
 */
async function validateQuizCourseAssignment(rawCourseId, { allowUnpublished = false } = {}) {
  const { course, isUnlinked } = await resolveCourseForQuiz(rawCourseId, {
    allowExternalId: true,
    allowUnpublished,
  })

  if (isUnlinked || !course) {
    return null
  }

  return course._id
}

/**
 * List quizzes canonically linked to a validated active Course._id.
 */
async function findCourseLinkedQuizzes(rawCourseId, { isAdmin = false } = {}) {
  const { course, isUnlinked } = await resolveCourseForQuiz(rawCourseId, {
    allowExternalId: true,
    allowUnpublished: isAdmin,
  })

  if (isUnlinked || !course) {
    return { course: null, quizzes: [] }
  }

  const quizzes = await Quiz.find({ courseId: course._id })
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .lean()

  return { course, quizzes }
}

/**
 * Validate that a quiz matches the requested course context (when provided),
 * or if the quiz itself is linked to a course, ensure that course is not archived.
 */
async function validateQuizCourseContext(quiz, rawCourseId, { isAdmin = false } = {}) {
  const hasExplicitCourse = rawCourseId !== undefined && rawCourseId !== null && String(rawCourseId).trim() !== ''

  if (hasExplicitCourse) {
    const { course } = await resolveCourseForQuiz(rawCourseId, {
      allowExternalId: true,
      allowUnpublished: isAdmin,
    })

    if (!quiz) {
      throw createHttpError('Quiz not found.', 404, 'QUIZ_NOT_FOUND')
    }

    const linkedId =
      quiz.courseId && mongoose.Types.ObjectId.isValid(String(quiz.courseId)) ? String(quiz.courseId) : null

    if (!linkedId || linkedId !== String(course._id)) {
      throw createHttpError(
        'This quiz is not linked to the specified course.',
        403,
        'QUIZ_COURSE_MISMATCH'
      )
    }

    return { course }
  }

  // No explicit courseId context: standalone quizzes are allowed;
  // linked quizzes must still enforce course existence, archive, and publish state
  // so omitting courseId never bypasses course availability.
  if (quiz?.courseId && mongoose.Types.ObjectId.isValid(String(quiz.courseId))) {
    const linkedCourse = await Course.findById(quiz.courseId).lean()
    if (!linkedCourse) {
      throw createHttpError('The course linked to this quiz no longer exists.', 404, 'COURSE_NOT_FOUND')
    }
    if (linkedCourse.isDeleted === true || linkedCourse.isArchived === true) {
      throw createHttpError(
        'The course linked to this quiz has been archived.',
        409,
        'COURSE_ARCHIVED'
      )
    }
    if (!isAdmin && linkedCourse.isPublished === false) {
      throw createHttpError(
        'The course linked to this quiz is not published.',
        400,
        'COURSE_UNPUBLISHED'
      )
    }
    return { course: linkedCourse }
  }

  return { course: null }
}

module.exports = {
  createHttpError,
  resolveCourseForQuiz,
  validateQuizCourseAssignment,
  findCourseLinkedQuizzes,
  validateQuizCourseContext,
}
