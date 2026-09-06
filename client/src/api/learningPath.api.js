import apiClient from './client'

export const getLearningPath = () =>
  apiClient.get('/learning-path').then((r) => r.data)

export const getLegacyLearningPath = () =>
  apiClient.get('/users/me/learning-path').then((r) => r.data)

export const getRecommendations = () =>
  apiClient.get('/recommendations').then((r) => r.data)

export const getSkillGaps = () =>
  apiClient.get('/skill-gaps').then((r) => r.data)

export const getUserCompetencies = () =>
  apiClient.get('/user-competencies').then((r) => r.data)
