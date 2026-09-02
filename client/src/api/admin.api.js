import apiClient from './client'

export const getAdminSummary             = () => apiClient.get('/admin/summary').then((r) => r.data)
export const getAdminHeatmap             = () => apiClient.get('/admin/heatmap').then((r) => r.data)
export const getAdminTopGaps             = (limit = 10) => apiClient.get(`/admin/top-gaps?limit=${limit}`).then((r) => r.data)
export const getAdminTrainingEffectiveness = () => apiClient.get('/admin/training-effectiveness').then((r) => r.data)
export const getAdminSkillTrend          = (competencyId, months = 6) =>
  apiClient.get(`/admin/skill-trend/${competencyId}?months=${months}`).then((r) => r.data)
