'use strict'

const crypto = require('crypto')
const mongoose = require('mongoose')
const axios = require('axios')
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

    const [attempts, enrollments, competencies] = await Promise.all([
      QuizAttempt.find({ userId })
        .populate('quizId', 'title')
        .lean(),
      Enrollment.find({ userId })
        .populate('courseId', 'title source durationHours')
        .lean(),
      UserCompetency.find({ userId })
        .populate('competencyId', 'name category')
        .lean(),
    ])

    const timeline = []

    // 1. Quiz attempts
    attempts.forEach((a) => {
      timeline.push({
        id: `attempt-${a._id}`,
        type: 'quiz_attempt',
        title: `Completed Assessment: ${a.quizId?.title || 'Competency Quiz'}`,
        description: `Scored ${a.score}% (${a.correctCount}/${a.totalQuestions} questions correct).`,
        date: a.attemptedAt || a.createdAt,
        badge: a.score >= 70 ? 'Passed' : 'Completed',
        badgeVariant: a.score >= 70 ? 'success' : 'medium',
      })
    })

    // 2. Enrollments
    enrollments.forEach((e) => {
      timeline.push({
        id: `enrollment-${e._id}`,
        type: 'course_enrolled',
        title: `Enrolled in Course: ${e.courseId?.title || 'Statistical Module'}`,
        description: `Progress: ${e.progressPercent}% • Source: ${(e.courseId?.source || 'iGOT').toUpperCase()}`,
        date: e.createdAt,
        badge: e.status === 'completed' ? 'Completed' : 'Active',
        badgeVariant: e.status === 'completed' ? 'success' : 'igot',
      })
    })

    // 3. Competency updates / self-assessments
    competencies.forEach((c) => {
      if (c.updatedAt) {
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

    // Sort descending by date
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date))

    res.json({ timeline })
  } catch (err) {
    next(err)
  }
}

// ── Certificates ──────────────────────────────────────────────────────────────
async function listMyCertificates(req, res, next) {
  try {
    const userId = req.user.id
    let certs = await Certificate.find({ userId })
      .populate('courseId', 'title durationHours source')
      .populate('quizId', 'title')
      .sort({ issuedAt: -1 })
      .lean()

    // Auto-generate certificates from passing quiz attempts (score >= 70) if not already generated
    const attempts = await QuizAttempt.find({ userId, score: { $gte: 70 } })
      .populate('quizId', 'title')
      .lean()

    for (const a of attempts) {
      if (!a.quizId) continue
      const exists = certs.some((c) => String(c.quizId?._id || c.quizId) === String(a.quizId._id))
      if (!exists) {
        const certId = `MOSPI-CERT-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
        const newCert = await Certificate.create({
          userId,
          quizId: a.quizId._id,
          title: `${a.quizId.title} Mastery`,
          score: a.score,
          issuedAt: a.attemptedAt || a.createdAt,
          certificateId: certId,
        })
        certs.push({
          ...newCert.toObject(),
          quizId: a.quizId,
        })
      }
    }

    res.json({ certificates: certs })
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

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { preferences } },
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
  updatePreferences,
  globalSearch,
  getIgotStatus,
  getSystemHealth,
}
