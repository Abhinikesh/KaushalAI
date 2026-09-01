import apiClient from './client'

export const getQuiz = (quizId) =>
  apiClient.get(`/quizzes/${quizId}`).then((r) => r.data)

export const submitQuizAttempt = (quizId, answers) =>
  apiClient.post(`/quizzes/${quizId}/attempts`, { answers }).then((r) => r.data)

export const getMyQuizAttempts = () =>
  apiClient.get('/users/me/quiz-attempts').then((r) => r.data)

export const getQuizStats = (quizId) =>
  apiClient.get(`/quizzes/${quizId}/stats`).then((r) => r.data)
