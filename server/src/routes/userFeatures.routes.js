'use strict'

const { Router } = require('express')
const { authenticate, authorize } = require('../middleware/auth.middleware')
const {
  listMyNotifications,
  markNotificationAsRead,
  markAllNotificationsRead,
  getMyActivityHistory,
  listMyCertificates,
  updatePreferences,
  globalSearch,
  getIgotStatus,
  getSystemHealth,
} = require('../controllers/userFeatures.controller')

const router = Router()

// ── Authenticated User Features ──────────────────────────────────────────────
router.get('/users/me/notifications',        authenticate, listMyNotifications)
router.put('/users/me/notifications/:id/read', authenticate, markNotificationAsRead)
router.put('/users/me/notifications/read-all', authenticate, markAllNotificationsRead)
router.get('/users/me/activity-history',     authenticate, getMyActivityHistory)
router.get('/users/me/certificates',         authenticate, listMyCertificates)
router.put('/users/me/preferences',          authenticate, updatePreferences)

// ── Global Search ─────────────────────────────────────────────────────────────
router.get('/search', authenticate, globalSearch)

// ── Admin Institutional & Health Status ───────────────────────────────────────
router.get('/admin/igot-status',   authenticate, authorize(['admin', 'trainer']), getIgotStatus)
router.get('/admin/system-health', authenticate, authorize(['admin']),            getSystemHealth)

module.exports = router
