import apiClient from './client'

export const listCourses = (params = {}) =>
  apiClient.get('/courses', { params }).then((r) => r.data)

export const getCourseById = (courseId) =>
  apiClient.get(`/courses/${courseId}`).then((r) => r.data)

export const getMyEnrollments = () =>
  apiClient.get('/users/me/enrollments').then((r) => r.data)

export const enrollInCourse = (courseId) =>
  apiClient.post('/users/me/enrollments', { courseId }).then((r) => r.data)

export const updateProgress = (enrollmentId, progressPercent) =>
  apiClient.put(`/users/me/enrollments/${enrollmentId}/progress`, { progressPercent }).then((r) => r.data)
