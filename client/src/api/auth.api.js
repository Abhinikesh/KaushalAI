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
