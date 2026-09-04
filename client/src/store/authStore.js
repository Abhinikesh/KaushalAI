import { create } from 'zustand'
import apiClient, { configureApiClient } from '../api/client'
import { googleAuth as apiGoogleAuth, googleComplete as apiGoogleComplete } from '../api/auth.api'

export const useAuthStore = create((set, get) => {
  // ── Wire apiClient to this store's state — breaks the circular import ───────
  // client.js exports configureApiClient() precisely so it doesn't have to
  // import useAuthStore at module load time, which would cause a circular dep.
  configureApiClient({
    getToken:  () => get().accessToken,
    setAuth:   (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
    clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
  })

  return {
    user:            null,
    accessToken:     null,
    isAuthenticated: false,
    isHydrating:     true,

    setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true, isHydrating: false }),
    clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false, isHydrating: false }),

    login: async (email, password) => {
      const { data } = await apiClient.post('/auth/login', { email, password })
      set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true, isHydrating: false })
      return data.user
    },

    ssoLogin: async (payload = {}) => {
      const { data } = await apiClient.post('/auth/sso', payload)
      set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true, isHydrating: false })
      return data.user
    },

    signup: async (payload) => {
      const { data } = await apiClient.post('/auth/signup', payload)
      set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true, isHydrating: false })
      return data.user
    },

    /**
     * Send Google access_token to backend.
     * Returns:
     *   { user, accessToken }                   → existing account, logged in
     *   { requiresCompletion, prefillEmail, prefillName } → new user, needs employeeId
     */
    googleAuth: async (accessToken) => {
      const data = await apiGoogleAuth(accessToken)
      if (data.requiresCompletion) return data  // caller navigates to /auth/google/complete
      set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true, isHydrating: false })
      return data
    },

    /** Complete Google signup after roster verification */
    googleComplete: async (payload) => {
      const data = await apiGoogleComplete(payload)
      set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true, isHydrating: false })
      return data.user
    },

    logout: async () => {
      try { await apiClient.post('/auth/logout') } catch { /* ignore network errors on logout */ }
      set({ user: null, accessToken: null, isAuthenticated: false, isHydrating: false })
    },

    hydrate: async () => {
      if (get().isAuthenticated) {
        set({ isHydrating: false })
        return
      }
      try {
        const { data } = await apiClient.post('/auth/refresh')
        set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true, isHydrating: false })
      } catch {
        set({ user: null, accessToken: null, isAuthenticated: false, isHydrating: false })
      }
    },
  }
})
