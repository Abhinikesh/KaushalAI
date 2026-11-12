import apiClient from './client'

export const listQuizzes = (params) =>
  apiClient.get('/quizzes', { params }).then((r) => r.data)

export const getQuizList = listQuizzes

export const getQuiz = (quizId, params = {}) =>
  apiClient.get(`/quizzes/${quizId}`, { params }).then((r) => r.data)

/** Find all quizzes linked to a specific course (one-to-many relationship) */
export const getQuizzesByCourse = (courseId) => {
  if (!courseId) return Promise.resolve({ quizzes: [], count: 0, courseId: null })
  return apiClient.get('/quizzes', { params: { courseId } }).then((r) => {
    const quizzes = r.data?.quizzes || []
    return {
      quizzes,
      count: r.data?.count ?? quizzes.length,
      courseId: r.data?.courseId || courseId,
    }
  })
}

/** Find the primary quiz linked to a specific course (backward compatibility) */
export const getQuizByCourse = (courseId) => {
  if (!courseId) return Promise.resolve(null)
  return getQuizzesByCourse(courseId).then((res) => (res.quizzes.length > 0 ? res.quizzes[0] : null))
}

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

export const getQuizAttemptById = (attemptId) =>
  apiClient.get(`/quizzes/attempts/${encodeURIComponent(attemptId)}`).then((r) => r.data)

export const getQuizAttempts = getMyQuizAttempts

export const getQuizStats = (quizId) =>
  apiClient.get(`/quizzes/${quizId}/stats`).then((r) => r.data)
