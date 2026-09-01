import apiClient from './client'

export const getLearningPath = () =>
  apiClient.get('/users/me/learning-path').then((r) => r.data)
