import apiClient from './client'

export const getMyNotifications = () =>
  apiClient.get('/users/me/notifications').then((r) => r.data)

export const markNotificationRead = (id) =>
  apiClient.put(`/users/me/notifications/${id}/read`).then((r) => r.data)

export const markAllNotificationsRead = () =>
  apiClient.put('/users/me/notifications/read-all').then((r) => r.data)

export const getMyActivityHistory = () =>
  apiClient.get('/users/me/activity-history').then((r) => r.data)

export const getMyCertificates = () =>
  apiClient.get('/users/me/certificates').then((r) => r.data)

export const updatePreferences = (preferences) =>
  apiClient.put('/users/me/preferences', { preferences }).then((r) => r.data)

export const globalSearch = (q) =>
  apiClient.get('/search', { params: { q } }).then((r) => r.data)

export const getIgotStatus = () =>
  apiClient.get('/admin/igot-status').then((r) => r.data)

export const getSystemHealth = () =>
  apiClient.get('/admin/system-health').then((r) => r.data)
