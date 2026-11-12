import apiClient from './client'

export const getMyNotifications = () =>
  apiClient.get('/users/me/notifications').then((r) => r.data)

export const markNotificationRead = (id) =>
  apiClient.put(`/users/me/notifications/${id}/read`).then((r) => r.data)

export const markAllNotificationsRead = () =>
  apiClient.put('/users/me/notifications/read-all').then((r) => r.data)

export const getMyActivityHistory = () =>
  apiClient.get('/users/me/activity-history').then((r) => r.data)

export const getMyAssessmentHistory = (params = {}) =>
  apiClient.get('/users/me/assessment-history', { params }).then((r) => r.data)

export const getMyCertificates = () =>
  apiClient.get('/users/me/certificates').then((r) => r.data)

export const reconcileMyCertificates = () =>
  apiClient.post('/users/me/certificates/reconcile').then((r) => r.data)

export const verifyCertificatePublic = async (certificateId) => {
  try {
    const res = await apiClient.get(`/certificates/verify/${encodeURIComponent(certificateId)}`)
    return res.data
  } catch (err) {
    if (err.response?.data) {
      return err.response.data
    }
    throw err
  }
}

export const updatePreferences = (preferences) =>
  apiClient.put('/users/me/preferences', { preferences }).then((r) => r.data)

export const globalSearch = (q) =>
  apiClient.get('/search', { params: { q } }).then((r) => r.data)

export const getIgotStatus = () =>
  apiClient.get('/admin/igot-status').then((r) => r.data)

export const getSystemHealth = () =>
  apiClient.get('/admin/system-health').then((r) => r.data)
