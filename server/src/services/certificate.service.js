'use strict'

const crypto = require('crypto')
const mongoose = require('mongoose')
const Certificate = require('../models/Certificate')
const User = require('../models/User')
const Quiz = require('../models/Quiz')
const QuizAttempt = require('../models/QuizAttempt')
const Course = require('../models/Course')
const Enrollment = require('../models/Enrollment')

// Strict certificate ID regex: matches official KAUSHAL-CERT-YYYY-HEX8 as well as legacy/test KAUSHAL-YYYY-xxx
const CERT_ID_REGEX = /^KAUSHAL(-CERT)?-[A-Z0-9]{3,10}-[A-Z0-9]{4,16}$/i

function generateCertificateId() {
  const year = new Date().getFullYear()
  // 64 bits of entropy: crypto.randomBytes(8) → 16 uppercase hex chars
  // Previous: randomUUID().slice(0,8) gave only 32 bits (8 hex chars)
  const rand = crypto.randomBytes(8).toString('hex').toUpperCase()
  return `KAUSHAL-CERT-${year}-${rand}`
}

/**
 * Sanitizes a recipient name to prevent leaking email addresses or PII.
 */
function sanitizeRecipientName(name) {
  if (typeof name !== 'string') return 'Learner'
  const trimmed = name.trim()
  if (!trimmed || trimmed.includes('@')) {
    return 'Learner'
  }
  return trimmed
}

/**
 * Issues an assessment mastery certificate for a user based STRICTLY on authoritative DB evidence.
 * Idempotent: returns existing certificate if one was already issued for (userId, quizId).
 * Invariants:
 * 1. User owns the attempt.
 * 2. Attempt belongs to the specified quiz.
 * 3. Attempt status is strictly 'completed'.
 * 4. Attempt is not 'in_progress'.
 * 5. Attempt is not 'expired'.
 * 6. Authoritative recorded score in DB is at least 70%.
 * 7. Caller-supplied score is never trusted.
 * 8. User and Quiz must exist in the database.
 * 9. One user receives at most one assessment certificate per quiz.
 */
async function issueAssessmentCertificate(userId, quizId, optionsOrAttemptId = null) {
  // 1. Check for existing certificate (idempotent: exactly 1 certificate per user per quiz)
  const existing = await Certificate.findOne({ userId, quizId })
  if (existing) {
    return existing
  }

  // 2. Resolve attemptId if provided
  let attemptId = null
  if (optionsOrAttemptId) {
    if (typeof optionsOrAttemptId === 'string' || optionsOrAttemptId instanceof mongoose.Types.ObjectId) {
      if (mongoose.Types.ObjectId.isValid(optionsOrAttemptId)) {
        attemptId = optionsOrAttemptId
      }
    } else if (typeof optionsOrAttemptId === 'object' && optionsOrAttemptId.attemptId) {
      if (mongoose.Types.ObjectId.isValid(optionsOrAttemptId.attemptId)) {
        attemptId = optionsOrAttemptId.attemptId
      }
    }
  }

  // 3. Query authoritative completed attempt from database
  // QuizAttempt.userId and QuizAttempt.quizId are Schema.Types.Mixed (may be String or ObjectId)
  const userCandidates = [String(userId)]
  if (mongoose.Types.ObjectId.isValid(String(userId))) {
    userCandidates.push(new mongoose.Types.ObjectId(String(userId)))
  }
  const quizCandidates = [String(quizId)]
  if (mongoose.Types.ObjectId.isValid(String(quizId))) {
    quizCandidates.push(new mongoose.Types.ObjectId(String(quizId)))
  }

  const attemptQuery = {
    userId: { $in: userCandidates },
    quizId: { $in: quizCandidates },
    status: 'completed',
    score: { $gte: 70 },
  }
  if (attemptId) {
    attemptQuery._id = attemptId
  }

  const qualifyingAttempt = await QuizAttempt.findOne(attemptQuery)
    .sort({ score: -1, completedAt: 1, createdAt: 1 })
    .lean()

  // Invariants check: Must have genuine qualifying completed attempt with score >= 70
  if (!qualifyingAttempt || qualifyingAttempt.status !== 'completed' || qualifyingAttempt.score < 70) {
    return null
  }

  // 4. Verify User and Quiz exist in database
  const [user, quiz] = await Promise.all([
    User.findById(userId).select('name email').lean(),
    Quiz.findById(quizId).select('title').lean(),
  ])

  if (!user || !quiz) {
    return null
  }

  // 5. Privacy: recipient name must never leak an email address
  const recipientName = sanitizeRecipientName(user.name)
  const title = `${quiz.title || 'Assessment'} Mastery`
  const certificateId = generateCertificateId()

  // 6. Create certificate using authoritative DB attempt score & completion date
  try {
    const cert = await Certificate.create({
      userId,
      quizId,
      courseId: null,
      type: 'assessment_mastery',
      title,
      recipientName,
      score: Math.round(qualifyingAttempt.score),
      issuedAt: qualifyingAttempt.completedAt || qualifyingAttempt.attemptedAt || new Date(),
      certificateId,
      status: 'valid',
    })
    return cert
  } catch (err) {
    if (err.code === 11000) {
      const raceExisting = await Certificate.findOne({ userId, quizId })
      if (raceExisting) return raceExisting
    }
    console.error(`[CertificateIssuanceFailed] user=${userId}, quiz=${quizId}, error=${err.message}`)
    throw err
  }
}

/**
 * Issues a course completion certificate for a user based STRICTLY on authoritative DB evidence.
 * Invariants:
 * 1. Enrollment status must be strictly 'completed'.
 * 2. Enrollment progressPercent must be strictly 100.
 * 3. Enrollment must belong to the specified user and course.
 * 4. User and Course must exist in database.
 * 5. Exactly 1 certificate per user per course.
 */
async function issueCourseCertificate(userId, courseId) {
  // 1. Check for existing certificate
  const existing = await Certificate.findOne({ userId, courseId })
  if (existing) {
    return existing
  }

  // 2. Validate authoritative enrollment completion: BOTH status 'completed' AND 100% progress required
  const enrollment = await Enrollment.findOne({ userId, courseId }).lean()
  if (!enrollment || enrollment.status !== 'completed' || enrollment.progressPercent !== 100) {
    return null
  }

  // 3. User and Course must exist in database
  const [user, course] = await Promise.all([
    User.findById(userId).select('name email').lean(),
    Course.findById(courseId).select('title').lean(),
  ])

  if (!user || !course) {
    return null
  }

  // 4. Privacy: recipient name must never leak an email address
  const recipientName = sanitizeRecipientName(user.name)
  const title = `${course.title || 'Course'} Completion`
  const certificateId = generateCertificateId()

  // 5. Create certificate with duplicate key collision handling
  try {
    const cert = await Certificate.create({
      userId,
      courseId,
      quizId: null,
      type: 'course_completion',
      title,
      recipientName,
      score: 100,
      issuedAt: enrollment.completedAt || new Date(),
      certificateId,
      status: 'valid',
    })
    return cert
  } catch (err) {
    if (err.code === 11000) {
      const raceExisting = await Certificate.findOne({ userId, courseId })
      if (raceExisting) return raceExisting
    }
    console.error(`[CertificateIssuanceFailed] user=${userId}, course=${courseId}, error=${err.message}`)
    throw err
  }
}

/**
 * Retrieves public certificate verification details by certificateId.
 * Validates ID against strict format and never leaks sensitive data.
 */
async function getPublicCertificate(certificateId) {
  if (!certificateId || typeof certificateId !== 'string') {
    return { valid: false, status: 'invalid_format', message: 'Certificate ID is required' }
  }

  const cleanId = certificateId.trim()
  if (!CERT_ID_REGEX.test(cleanId)) {
    return { valid: false, status: 'invalid_format', message: 'Invalid certificate ID format' }
  }

  const cert = await Certificate.findOne({ certificateId: cleanId }).lean()

  if (!cert) {
    return { valid: false, status: 'not_found', message: 'Certificate not found' }
  }

  if (cert.status === 'revoked') {
    return {
      valid: false,
      status: 'revoked',
      certificateId: cert.certificateId,
      title: cert.title,
      issuedAt: cert.issuedAt,
      message: 'This certificate has been revoked',
    }
  }

  return {
    valid: true,
    status: 'valid',
    certificateId: cert.certificateId,
    title: cert.title,
    type: cert.type || 'assessment_mastery',
    recipientName: sanitizeRecipientName(cert.recipientName),
    issuedAt: cert.issuedAt,
  }
}

/**
 * Idempotent recovery mechanism:
 * Reconciles and issues any missing certificates for a user based strictly on authoritative
 * completed attempts (status: completed, score >= 70) and completed enrollments (status: completed, progressPercent: 100).
 */
async function reconcileUserCertificates(userId) {
  const user = await User.findById(userId).select('_id').lean()
  if (!user) {
    return { recoveredCount: 0, totalChecked: 0, certificates: [] }
  }

  let recoveredCount = 0

  const userCandidates = [String(userId)]
  if (mongoose.Types.ObjectId.isValid(String(userId))) {
    userCandidates.push(new mongoose.Types.ObjectId(String(userId)))
  }

  // 1. Authoritative quiz attempts
  const qualifyingAttempts = await QuizAttempt.find({
    userId: { $in: userCandidates },
    status: 'completed',
    score: { $gte: 70 },
  }).lean()

  for (const attempt of qualifyingAttempts) {
    if (!attempt.quizId) continue
    const exists = await Certificate.findOne({ userId, quizId: attempt.quizId })
    if (!exists) {
      try {
        const cert = await issueAssessmentCertificate(userId, attempt.quizId, { attemptId: attempt._id })
        if (cert) recoveredCount++
      } catch (err) {
        console.error(`[RecoveryError] Quiz certificate recovery failed for user ${userId}, quiz ${attempt.quizId}:`, err.message)
      }
    }
  }

  // 2. Authoritative course enrollments
  const qualifyingEnrollments = await Enrollment.find({
    userId,
    status: 'completed',
    progressPercent: 100,
  }).lean()

  for (const enrollment of qualifyingEnrollments) {
    if (!enrollment.courseId) continue
    const exists = await Certificate.findOne({ userId, courseId: enrollment.courseId })
    if (!exists) {
      try {
        const cert = await issueCourseCertificate(userId, enrollment.courseId)
        if (cert) {
          recoveredCount++
          // Clear recovery flag if set
          await Enrollment.updateOne(
            { _id: enrollment._id },
            { $set: { needsCertificateSync: false, certificateSyncError: null } }
          ).catch(() => {})
        }
      } catch (err) {
        console.error(`[RecoveryError] Course certificate recovery failed for user ${userId}, course ${enrollment.courseId}:`, err.message)
      }
    } else {
      // Cert already exists — clear any stale recovery flag
      if (enrollment.needsCertificateSync) {
        await Enrollment.updateOne(
          { _id: enrollment._id },
          { $set: { needsCertificateSync: false, certificateSyncError: null } }
        ).catch(() => {})
      }
    }
  }

  // 3. Also recover any enrollments flagged with needsCertificateSync that weren't in the qualifying scan
  //    (e.g., enrollments where cert issuance failed but enrollment is complete)
  const flaggedEnrollments = await Enrollment.find({
    userId,
    needsCertificateSync: true,
    status: 'completed',
    progressPercent: 100,
  }).lean()

  for (const enrollment of flaggedEnrollments) {
    if (!enrollment.courseId) continue
    // Skip if already handled in step 2
    const alreadyCovered = qualifyingEnrollments.some(
      (e) => String(e._id) === String(enrollment._id)
    )
    if (alreadyCovered) continue
    const exists = await Certificate.findOne({ userId, courseId: enrollment.courseId })
    if (!exists) {
      try {
        const cert = await issueCourseCertificate(userId, enrollment.courseId)
        if (cert) {
          recoveredCount++
          await Enrollment.updateOne(
            { _id: enrollment._id },
            { $set: { needsCertificateSync: false, certificateSyncError: null } }
          ).catch(() => {})
        }
      } catch (err) {
        console.error(`[RecoveryError] Flagged course certificate recovery failed for user ${userId}, course ${enrollment.courseId}:`, err.message)
      }
    } else {
      // Already has cert — clear the stale flag
      await Enrollment.updateOne(
        { _id: enrollment._id },
        { $set: { needsCertificateSync: false, certificateSyncError: null } }
      ).catch(() => {})
    }
  }

  const certificates = await listUserCertificates(userId)
  return {
    recoveredCount,
    totalChecked: qualifyingAttempts.length + qualifyingEnrollments.length + flaggedEnrollments.length,
    certificates,
  }
}

/**
 * Lists all valid certificates for a user (pure read-only).
 */
async function listUserCertificates(userId) {
  return Certificate.find({ userId, status: 'valid' })
    .populate('courseId', 'title durationHours source')
    .populate('quizId', 'title')
    .sort({ issuedAt: -1 })
    .lean()
}

module.exports = {
  issueAssessmentCertificate,
  issueCourseCertificate,
  getPublicCertificate,
  reconcileUserCertificates,
  listUserCertificates,
  CERT_ID_REGEX,
}
