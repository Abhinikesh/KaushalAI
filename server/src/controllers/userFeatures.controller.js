'use strict'

const crypto = require('crypto')
const mongoose = require('mongoose')
const axios = require('axios')
const certificateService = require('../services/certificate.service')
const {
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
        .populate('competencyId', 'name category')
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
    competencies.forEach((c) => {
      if (c.updatedAt || c.lastAssessedAt) {
        timeline.push({
          id: `comp-${c._id}`,
          type: 'competency_level',
          title: `Competency Assessment: ${c.competencyId?.name || 'Statistical Standard'}`,
          description: `Current proficiency verified at Level ${c.currentLevel} / 5.`,
          date: c.lastAssessedAt || c.updatedAt,
          badge: `Level ${c.currentLevel}`,
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
  listMyCertificates,
  reconcileMyCertificates,
  updatePreferences,
  globalSearch,
  getIgotStatus,
  getSystemHealth,
}
