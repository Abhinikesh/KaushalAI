import apiClient from './client'

export const getAdminSummary             = () => apiClient.get('/admin/summary').then((r) => r.data)
export const getAdminHeatmap             = () => apiClient.get('/admin/heatmap').then((r) => r.data)
export const getAdminTopGaps             = (limit = 10) => apiClient.get(`/admin/top-gaps?limit=${limit}`).then((r) => r.data)
export const getAdminTrainingEffectiveness = () => apiClient.get('/admin/training-effectiveness').then((r) => r.data)
export const getAdminSkillTrend          = (competencyId, months = 6) =>
  apiClient.get(`/admin/skill-trend/${competencyId}?months=${months}`).then((r) => r.data)
export const getAdminAuditLogs           = (page = 1, limit = 20) =>
  apiClient.get(`/admin/audit-logs?page=${page}&limit=${limit}`).then((r) => r.data)
export const getAdminMaterials           = () =>
  apiClient.get('/admin/materials').then((r) => r.data)
export const getAdminDepartmentsSummary  = () =>
  apiClient.get('/admin/departments-summary').then((r) => r.data)
export const getAdminRolesSummary        = () =>
  apiClient.get('/admin/roles-summary').then((r) => r.data)
export const getAdminComposedOfficer     = (id) =>
  apiClient.get(`/admin/officers/${id}`).then((r) => r.data)
export const getAdminQuestionsSummary    = () =>
  apiClient.get('/admin/questions-summary').then((r) => r.data)
export const getTrainerSummary           = () =>
  apiClient.get('/trainer/summary').then((r) => r.data)
