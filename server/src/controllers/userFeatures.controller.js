'use strict'

const crypto = require('crypto')
const mongoose = require('mongoose')
const axios = require('axios')
const certificateService = require('../services/certificate.service')
const { normalizePopulatedUserCompetency } = require('../services/competency.service')
const {
  AssessmentAttempt,
  Notification,
  Certificate,
  QuizAttempt,
  UserCompetency,
  Enrollment,
  Course,
  Competency,
  User,
} = require('../models')

// ── Notifications ─────────────────────────────────────────────────────────────
async function listMyNotifications(req, res, next) {
  try {
    const userId = req.user.id
    let notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    // If user has 0 notifications yet, seed initial welcoming & recommendation notice
    if (notifications.length === 0) {
      const welcomeNotice = await Notification.create({
        userId,
        type: 'recommendation_ready',
        message: 'Welcome to KaushalAI! New personalized course recommendations are ready based on your cadre role profile.',
      })
      notifications = [welcomeNotice.toObject()]
    }

    const unreadCount = notifications.filter((n) => !n.isRead).length
    res.json({ notifications, unreadCount })
  } catch (err) {
    next(err)
  }
}

async function markNotificationAsRead(req, res, next) {
  try {
    const { id } = req.params
    const updated = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { isRead: true },
      { new: true }
    )
    if (!updated) return res.status(404).json({ message: 'Notification not found' })
    res.json({ notification: updated })
  } catch (err) {
    next(err)
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// ── Activity / Learning History ───────────────────────────────────────────────
async function getMyActivityHistory(req, res, next) {
  try {
    const userId = req.user.id
    const userQueryIds = [userId]
    if (mongoose.Types.ObjectId.isValid(userId)) {
      userQueryIds.push(new mongoose.Types.ObjectId(userId))
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50))

    const [attempts, enrollments, competencies, certificates] = await Promise.all([
      QuizAttempt.find({ userId: { $in: userQueryIds } })
        .populate('quizId', 'title domain')
        .lean(),
      Enrollment.find({ userId: { $in: userQueryIds }, status: { $ne: 'recommended' } })
        .populate('courseId', 'title source durationHours')
        .lean(),
      UserCompetency.find({ $or: [{ user_id: { $in: userQueryIds } }, { userId: { $in: userQueryIds } }] })
        .populate('competency_id', 'name category competencyCode')
        .lean(),
      Certificate.find({ userId: { $in: userQueryIds }, status: 'valid' })
        .lean(),
    ])

    const timeline = []

    // 1. Quiz attempts (accurately handles completed, in-progress, expired)
    attempts.forEach((a) => {
      const quizTitle = a.quizId?.title || a.quizTitle || 'Competency Quiz'
      // Strict rule: status === 'completed' uses ONLY valid completedAt, otherwise null.
      // Never substitute attemptedAt, startedAt, createdAt or the current date.
      let completionDate = null
      if (a.status === 'completed' && a.completedAt) {
        const parsed = new Date(a.completedAt)
        if (!isNaN(parsed.getTime())) {
          completionDate = parsed
        }
      }

      if (a.status === 'in_progress') {
        timeline.push({
          id: `attempt-${a._id}`,
          type: 'quiz_attempt',
          title: `Assessment in Progress: ${quizTitle}`,
          description: `Assessment ongoing with ${a.totalQuestions || 0} questions.`,
          date: null, // In-progress attempt must not be represented as having a completion date
          badge: 'In Progress',
          badgeVariant: 'warning',
        })
      } else if (a.status === 'expired') {
        timeline.push({
          id: `attempt-${a._id}`,
          type: 'quiz_attempt',
          title: `Assessment Expired: ${quizTitle}`,
          description: `Time limit expired. Score: ${a.score}%.`,
          date: null, // Expired attempt must not be represented as having a completion date
          badge: 'Expired',
          badgeVariant: 'danger',
        })
      } else {
        timeline.push({
          id: `attempt-${a._id}`,
          type: 'quiz_attempt',
          title: `Completed Assessment: ${quizTitle}`,
          description: `Scored ${a.score}% (${a.correctCount}/${a.totalQuestions} questions correct).`,
          date: completionDate, // Strict completedAt only; null if missing/invalid
          badge: a.passed || a.score >= 70 ? 'Passed' : 'Needs Retake',
          badgeVariant: a.passed || a.score >= 70 ? 'success' : 'medium',
        })
      }
    })

    // 2. Genuine Enrollments (strictly excludes recommendations)
    enrollments.forEach((e) => {
      timeline.push({
        id: `enrollment-${e._id}`,
        type: 'course_enrolled',
        title: `${e.status === 'completed' ? 'Completed Course' : 'Enrolled in Course'}: ${e.courseId?.title || 'Statistical Module'}`,
        description: `Progress: ${e.progressPercent}% • Source: ${(e.courseId?.source || 'iGOT').toUpperCase()}`,
        date: e.completedAt || e.startedAt || e.createdAt,
        badge: e.status === 'completed' ? 'Completed' : 'Active',
        badgeVariant: e.status === 'completed' ? 'success' : 'igot',
      })
    })

    // 3. Competency updates / evaluations
    competencies.forEach((rawComp) => {
      const c = normalizePopulatedUserCompetency(rawComp)
      const assessedDate = c.last_assessed_at || c.lastAssessedAt || c.updatedAt || null
      const compName = c.competency_id?.name || c.competencyId?.name || 'Statistical Standard'
      const compLevel = c.current_level ?? c.currentLevel
      if (assessedDate && typeof compLevel === 'number') {
        timeline.push({
          id: `comp-${c._id}`,
          type: 'competency_level',
          title: `Competency Assessment: ${compName}`,
          description: `Current proficiency verified at Level ${compLevel} / 5.`,
          date: assessedDate,
          badge: `Level ${compLevel}`,
          badgeVariant: 'nssta',
        })
      }
    })

    // 4. Earned Certificates
    certificates.forEach((cert) => {
      timeline.push({
        id: `cert-${cert._id}`,
        type: 'certificate_earned',
        title: `Earned Certificate: ${cert.title}`,
        description: `Official ID: ${cert.certificateId} • Recipient: ${cert.recipientName || 'Learner'}`,
        date: cert.issuedAt,
        badge: cert.type === 'course_completion' ? 'Course Certificate' : 'Assessment Certificate',
        badgeVariant: 'success',
      })
    })

    // Sort descending by date
    timeline.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))

    const total = timeline.length
    const paginated = timeline.slice((page - 1) * limit, page * limit)

    res.json({ timeline: paginated, total, page, limit })
  } catch (err) {
    next(err)
  }
}

function toValidDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

// ── Unified Assessment & Quiz History ─────────────────────────────────────────
async function getMyAssessmentHistory(req, res, next) {
  try {
    const userId = req.user.id
    const userQueryIds = [userId]
    if (mongoose.Types.ObjectId.isValid(userId)) {
      userQueryIds.push(new mongoose.Types.ObjectId(userId))
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20))
    const rawType = typeof req.query.type === 'string' ? req.query.type.trim().toLowerCase() : 'all'
    const typeFilter = rawType === 'diagnostic' || rawType === 'quiz' ? rawType : 'all'
    const includeIncomplete = req.query.includeIncomplete === 'true'

    const [diagnosticAttempts, quizAttempts] = await Promise.all([
      typeFilter === 'quiz'
        ? Promise.resolve([])
        : AssessmentAttempt.find({ user_id: { $in: userQueryIds } })
            .populate('assessment_id', 'name type level total_questions')
            .lean(),
      typeFilter === 'diagnostic'
        ? Promise.resolve([])
        : QuizAttempt.find({ userId: { $in: userQueryIds } })
            .populate('quizId', 'title domain durationMinutes')
            .lean(),
    ])

    let diagnosticCount = 0
    let quizCount = 0
    let inProgressCount = 0
    let expiredCount = 0
    const normalized = []

    for (const a of diagnosticAttempts) {
      const status = a.status || 'completed'
      const isIncomplete = status === 'in_progress' || status === 'expired'
      if (status === 'in_progress') inProgressCount += 1
      if (status === 'expired') expiredCount += 1
      if (isIncomplete && !includeIncomplete) continue

      diagnosticCount += 1
      const completedAt = isIncomplete ? null : toValidDate(a.completed_at)
      const startedAt = toValidDate(a.started_at)
      const effectiveDate = completedAt
      const assessmentDoc =
        a.assessment_id && typeof a.assessment_id === 'object' && a.assessment_id.name
          ? a.assessment_id
          : null

      const durationSeconds =
        !isIncomplete && startedAt && completedAt && completedAt.getTime() >= startedAt.getTime()
          ? Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)
          : null

      normalized.push({
        attemptId: String(a._id),
        kind: 'diagnostic',
        assessmentId: assessmentDoc ? assessmentDoc._id : a.assessment_id ?? null,
        quizId: null,
        title: assessmentDoc?.name || 'Competency Diagnostic Assessment',
        assessmentType: assessmentDoc?.type || 'diagnostic',
        domain: null,
        status,
        isCompleted: !isIncomplete,
        score: !isIncomplete && typeof a.overall_score === 'number' ? a.overall_score : null,
        passed: null,
        correctCount: null,
        totalQuestions:
          typeof assessmentDoc?.total_questions === 'number' && assessmentDoc.total_questions > 0
            ? assessmentDoc.total_questions
            : Array.isArray(a.question_ids)
              ? a.question_ids.length
              : null,
        competencyCount: Array.isArray(a.competency_scores) ? a.competency_scores.length : 0,
        startedAt,
        completedAt,
        attemptedAt: null,
        date: effectiveDate,
        dateIsLegacyFallback: false,
        durationSeconds,
        _sortMs: effectiveDate ? effectiveDate.getTime() : 0,
      })
    }

    for (const q of quizAttempts) {
      const status = q.status || 'completed'
      const isIncomplete = status === 'in_progress' || status === 'expired'
      if (status === 'in_progress') inProgressCount += 1
      if (status === 'expired') expiredCount += 1
      if (isIncomplete && !includeIncomplete) continue

      quizCount += 1
      const rawCompletedAt = isIncomplete ? null : toValidDate(q.completedAt)
      const rawAttemptedAt = toValidDate(q.attemptedAt)
      const rawStartedAt = toValidDate(q.startedAt)
      // Legacy QuizAttempt documents written before timer tracking may lack completedAt
      // and rely on attemptedAt. Keep completedAt truthful and expose legacy fallback explicitly.
      const effectiveDate = rawCompletedAt || (isIncomplete ? null : rawAttemptedAt)
      const dateIsLegacyFallback = Boolean(!rawCompletedAt && !isIncomplete && rawAttemptedAt)

      const quizDoc = q.quizId && typeof q.quizId === 'object' && q.quizId.title ? q.quizId : null
      const durationSeconds =
        !isIncomplete &&
        rawStartedAt &&
        rawCompletedAt &&
        rawCompletedAt.getTime() >= rawStartedAt.getTime()
          ? Math.round((rawCompletedAt.getTime() - rawStartedAt.getTime()) / 1000)
          : null

      const authoritativeScore = !isIncomplete && typeof q.score === 'number' ? q.score : null
      const authoritativePassed =
        !isIncomplete && typeof q.passed === 'boolean'
          ? q.passed
          : authoritativeScore !== null
            ? authoritativeScore >= 70
            : null

      normalized.push({
        attemptId: String(q._id),
        kind: 'quiz',
        assessmentId: null,
        quizId: quizDoc ? quizDoc._id : q.quizId ?? null,
        title: quizDoc?.title || q.quizTitle || 'Quiz Assessment',
        assessmentType: 'quiz',
        domain: quizDoc?.domain || q.domain || null,
        status,
        isCompleted: !isIncomplete,
        score: authoritativeScore,
        passed: authoritativePassed,
        correctCount: !isIncomplete && typeof q.correctCount === 'number' ? q.correctCount : null,
        totalQuestions: typeof q.totalQuestions === 'number' ? q.totalQuestions : null,
        competencyCount: Array.isArray(q.competencyUpdates) ? q.competencyUpdates.length : 0,
        startedAt: rawStartedAt,
        completedAt: rawCompletedAt,
        attemptedAt: rawAttemptedAt,
        date: effectiveDate,
        dateIsLegacyFallback,
        durationSeconds,
        _sortMs: effectiveDate ? effectiveDate.getTime() : 0,
      })
    }

    normalized.sort((a, b) => {
      if (b._sortMs !== a._sortMs) return b._sortMs - a._sortMs
      return b.attemptId.localeCompare(a.attemptId)
    })

    const total = normalized.length
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const items = normalized.slice(offset, offset + limit).map(({ _sortMs, ...rest }) => rest)

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      meta: {
        typeFilter,
        includeIncomplete,
        diagnosticCount,
        quizCount,
        inProgressCount,
        expiredCount,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ── Certificates ──────────────────────────────────────────────────────────────
async function listMyCertificates(req, res, next) {
  try {
    const userId = req.user.id
    const certs = await certificateService.listUserCertificates(userId)
    res.json({ certificates: certs })
  } catch (err) {
    next(err)
  }
}

async function reconcileMyCertificates(req, res, next) {
  try {
    const userId = req.user.id
    const result = await certificateService.reconcileUserCertificates(userId)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

// ── Preferences Persistence ───────────────────────────────────────────────────
async function updatePreferences(req, res, next) {
  try {
    const userId = req.user.id
    const { preferences } = req.body
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ message: 'Valid preferences object required.' })
    }

    // Build a dot-notation update so we merge individual keys (not overwrite the whole subdocument)
    const allowedKeys = ['courseAlerts', 'quizReminders', 'weeklyDigest', 'theme', 'appearanceMode', 'language', 'setupCompleted']
    const setFields = {}
    for (const key of allowedKeys) {
      if (key in preferences) {
        setFields[`preferences.${key}`] = preferences[key]
      }
    }

    if (Object.keys(setFields).length === 0) {
      return res.status(400).json({ message: 'No valid preference keys provided.' })
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: setFields },
      { new: true }
    )

    res.json({ user: updatedUser, preferences: updatedUser.preferences })
  } catch (err) {
    next(err)
  }
}

// ── Search ────────────────────────────────────────────────────────────────────
async function globalSearch(req, res, next) {
  try {
    const q = (req.query.q || '').trim()
    if (!q) {
      return res.json({ query: '', courses: [], competencies: [] })
    }

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

    const [courses, competencies] = await Promise.all([
      Course.find({
        $or: [{ title: regex }, { description: regex }],
      })
        .limit(20)
        .lean(),
      Competency.find({
        $or: [{ name: regex }, { description: regex }, { category: regex }],
      })
        .limit(20)
        .lean(),
    ])

    res.json({ query: q, courses, competencies })
  } catch (err) {
    next(err)
  }
}

// ── iGOT Status ───────────────────────────────────────────────────────────────
async function getIgotStatus(req, res, next) {
  try {
    const [igotCount, nsstaCount, totalCount] = await Promise.all([
      Course.countDocuments({ source: 'igot' }),
      Course.countDocuments({ source: 'nssta' }),
      Course.countDocuments(),
    ])

    res.json({
      gatewayStatus: 'ONLINE',
      mode: process.env.COURSE_SOURCE_MODE || 'HYBRID',
      syncInterval: '24 Hours',
      totalCourses: totalCount,
      sourceCounts: {
        igot: igotCount,
        nssta: nsstaCount,
      },
      lastSyncTimestamp: new Date().toISOString(),
    })
  } catch (err) {
    next(err)
  }
}

// ── System Health (Real Pings) ────────────────────────────────────────────────
async function getSystemHealth(req, res, next) {
  try {
    const startTime = Date.now()

    // 1. Ping Mongo
    const mongoState = mongoose.connection.readyState // 1 = connected
    let mongoLatency = 0
    if (mongoState === 1 && mongoose.connection.db) {
      const dbStart = Date.now()
      await mongoose.connection.db.admin().ping()
      mongoLatency = Date.now() - dbStart
    }

    // 2. Ping FastAPI AI Service
    let aiStatus = 'DOWN'
    let aiLatency = 0
    const aiBaseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000'
    try {
      const aiStart = Date.now()
      const aiRes = await axios.get(`${aiBaseUrl}/health`, { timeout: 3000 })
      if (aiRes.status === 200) {
        aiStatus = 'HEALTHY'
        aiLatency = Date.now() - aiStart
      }
    } catch {
      aiStatus = 'DOWN'
    }

    const totalLatency = Date.now() - startTime

    res.json({
      status: mongoState === 1 && aiStatus === 'HEALTHY' ? 'OPERATIONAL' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      services: {
        apiServer: {
          status: 'HEALTHY',
          uptime: `${Math.floor(process.uptime())}s`,
          memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          latencyMs: totalLatency,
        },
        database: {
          status: mongoState === 1 ? 'CONNECTED' : 'DISCONNECTED',
          latencyMs: mongoLatency,
          collectionsCount: Object.keys(mongoose.connection.collections || {}).length,
        },
        aiVectorService: {
          status: aiStatus,
          latencyMs: aiLatency,
          endpoint: aiBaseUrl,
        },
      },
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listMyNotifications,
  markNotificationAsRead,
  markAllNotificationsRead,
  getMyActivityHistory,
  getMyAssessmentHistory,
  listMyCertificates,
  reconcileMyCertificates,
  updatePreferences,
  globalSearch,
  getIgotStatus,
  getSystemHealth,
}
