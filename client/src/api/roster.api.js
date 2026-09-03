import apiClient from './client'

/** GET /api/admin/roster — paginated list */
export const listRoster = (params = {}) =>
  apiClient.get('/admin/roster', { params }).then((r) => r.data)

/** POST /api/admin/roster — add single officer */
export const addOfficer = (body) =>
  apiClient.post('/admin/roster', body).then((r) => r.data)

/** POST /api/admin/roster/bulk-upload — CSV file */
export const bulkUploadRoster = (file) => {
  const fd = new FormData()
  fd.append('file', file)
  return apiClient.post('/admin/roster/bulk-upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)
}

/** GET /api/admin/roster/:id */
export const getOfficer = (id) =>
  apiClient.get(`/admin/roster/${id}`).then((r) => r.data)

/** DELETE /api/admin/roster/:id */
export const deleteRosterEntry = (id) =>
  apiClient.delete(`/admin/roster/${id}`).then((r) => r.data)
