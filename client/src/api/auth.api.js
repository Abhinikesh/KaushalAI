import apiClient from './client'

export const login = (email, password) =>
  apiClient.post('/auth/login', { email, password }).then((r) => r.data)

export const signup = (payload) =>
  apiClient.post('/auth/signup', payload).then((r) => r.data)

export const logout = () =>
  apiClient.post('/auth/logout').then((r) => r.data)

export const refreshToken = () =>
  apiClient.post('/auth/refresh').then((r) => r.data)

export const getMe = () =>
  apiClient.get('/auth/me').then((r) => r.data)

/** Send Google ID token to backend for verification */
export const googleAuth = (idToken) =>
  apiClient.post('/auth/google', { idToken }).then((r) => r.data)

/** Complete Google signup with employeeId after roster check */
export const googleComplete = (payload) =>
  apiClient.post('/auth/google/complete', payload).then((r) => r.data)
