import { create } from 'zustand'
import apiClient from '../api/client'

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
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

  logout: async () => {
    try { await apiClient.post('/auth/logout') } catch { /* ignore */ }
    set({ user: null, accessToken: null, isAuthenticated: false })
  },

  // Called once on app mount — silently tries to restore session via httpOnly refresh cookie.
  // On success: sets auth state. On failure: stays unauthenticated (token expired or no cookie).
  hydrate: async () => {
    if (get().isAuthenticated) return  // already have a session
    try {
      const { data } = await apiClient.post('/auth/refresh')
      set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true })
    } catch {
      // Refresh failed — user needs to log in
      set({ user: null, accessToken: null, isAuthenticated: false })
    }
  },
}))
