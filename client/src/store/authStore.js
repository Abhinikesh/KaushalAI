import { create } from 'zustand'
import apiClient from '../api/client'
import { googleAuth as apiGoogleAuth, googleComplete as apiGoogleComplete } from '../api/auth.api'

export const useAuthStore = create((set, get) => ({
  user:            null,
  accessToken:     null,
  isAuthenticated: false,

  setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
  clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),

  login: async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password })
    set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true })
    return data.user
  },

  signup: async (payload) => {
    const { data } = await apiClient.post('/auth/signup', payload)
    set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true })
    return data.user
  },

  /**
   * Send Google ID token to backend.
   * Returns:
   *   { user, accessToken }          → user already exists, logged in
   *   { requiresCompletion: true, prefillEmail, prefillName } → new user needs employeeId
   */
  googleAuth: async (idToken) => {
    const data = await apiGoogleAuth(idToken)
    if (data.requiresCompletion) return data  // caller handles redirect
    set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true })
    return data
  },

  /**
   * Complete Google signup with roster-verified employeeId.
   */
  googleComplete: async (payload) => {
    const data = await apiGoogleComplete(payload)
    set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true })
    return data.user
  },

  logout: async () => {
    try { await apiClient.post('/auth/logout') } catch { /* ignore */ }
    set({ user: null, accessToken: null, isAuthenticated: false })
  },

  hydrate: async () => {
    if (get().isAuthenticated) return
    try {
      const { data } = await apiClient.post('/auth/refresh')
      set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true })
    } catch {
      set({ user: null, accessToken: null, isAuthenticated: false })
    }
  },
}))
