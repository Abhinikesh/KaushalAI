import apiClient from './client'

export const listQuizzes = (params) =>
  apiClient.get('/quizzes', { params }).then((r) => r.data)

export const getQuizList = listQuizzes

export const getQuiz = (quizId) =>
  apiClient.get(`/quizzes/${quizId}`).then((r) => r.data)

/** Find the quiz linked to a specific course */
export const getQuizByCourse = (courseId) =>
  apiClient.get('/quizzes', { params: { courseId } }).then((r) => {
    const quizzes = r.data?.quizzes || []
    return quizzes.length > 0 ? quizzes[0] : null
  })

export const createQuiz = (payload) =>
  apiClient.post('/quizzes', payload).then((r) => r.data)

export const updateQuiz = (quizId, payload) =>
  apiClient.put(`/quizzes/${quizId}`, payload).then((r) => r.data)

export const deleteQuiz = (quizId) =>
  apiClient.delete(`/quizzes/${quizId}`).then((r) => r.data)

export const submitQuizAttempt = (quizId, answers) =>
  apiClient.post(`/quizzes/${quizId}/attempts`, { answers }).then((r) => r.data)

export const getMyQuizAttempts = () =>
  apiClient.get('/users/me/quiz-attempts').then((r) => r.data)

export const getQuizAttempts = getMyQuizAttempts

export const getQuizStats = (quizId) =>
  apiClient.get(`/quizzes/${quizId}/stats`).then((r) => r.data)
