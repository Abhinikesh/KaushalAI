import { create } from 'zustand'
import apiClient, { configureApiClient, broadcastAuthEvent } from '../api/client'
import { googleAuth as apiGoogleAuth, googleComplete as apiGoogleComplete } from '../api/auth.api'
import { updatePreferences as apiUpdatePreferences } from '../api/userFeatures.api'

const TOKEN_KEY = 'kaushalai_token'
const USER_KEY = 'kaushalai_user'
const SESSION_GEN_KEY = 'kaushalai_session_gen'

const getInitialAuth = () => {
  if (typeof window === 'undefined') {
    return { user: null, accessToken: null, isAuthenticated: false, isHydrating: true, sessionGen: null }
  }
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const userStr = localStorage.getItem(USER_KEY)
    const sessionGen = localStorage.getItem(SESSION_GEN_KEY) || null
    if (token && userStr) {
      const user = JSON.parse(userStr)
      if (user && user._id) {
        return { user, accessToken: token, isAuthenticated: true, isHydrating: false, sessionGen }
      }
    }
  } catch (e) {
    console.error('Failed to parse cached auth:', e)
  }
  return { user: null, accessToken: null, isAuthenticated: false, isHydrating: true, sessionGen: null }
}

const initial = getInitialAuth()

function generateSessionGen() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

export const useAuthStore = create((set, get) => {
  configureApiClient({
    getToken: () => get().accessToken || (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null),
    getSessionGen: () => get().sessionGen || (typeof window !== 'undefined' ? localStorage.getItem(SESSION_GEN_KEY) : null),
    setAuth: (user, accessToken) => {
      if (typeof window !== 'undefined') {
        if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken)
        if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
      }
      set({ user, accessToken, isAuthenticated: true, isHydrating: false })
    },
    clearAuth: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        localStorage.removeItem(SESSION_GEN_KEY)
      }
      set({ user: null, accessToken: null, isAuthenticated: false, isHydrating: false, sessionGen: null })
    },
  })

  const startSession = (user, accessToken) => {
    const sessionGen = generateSessionGen()
    if (typeof window !== 'undefined') {
      if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken)
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
      localStorage.setItem(SESSION_GEN_KEY, sessionGen)
    }
    set({ user, accessToken, isAuthenticated: true, isHydrating: false, sessionGen })
  }

  return {
    user: initial.user,
    accessToken: initial.accessToken,
    isAuthenticated: initial.isAuthenticated,
    isHydrating: initial.isHydrating,
    sessionGen: initial.sessionGen,

    setAuth: (user, accessToken) => {
      if (typeof window !== 'undefined') {
        if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken)
        if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
      }
      set({ user, accessToken, isAuthenticated: true, isHydrating: false })
    },

    clearAuth: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        localStorage.removeItem(SESSION_GEN_KEY)
      }
      set({ user: null, accessToken: null, isAuthenticated: false, isHydrating: false, sessionGen: null })
    },

    login: async (email, password) => {
      const { data } = await apiClient.post('/auth/login', { email, password })
      startSession(data.user, data.accessToken)
      return data.user
    },

    // Admin-only login — uses /auth/admin-login which rejects non-admin accounts at the backend
    adminLogin: async (email, password) => {
      const { data } = await apiClient.post('/auth/admin-login', { email, password })
      startSession(data.user, data.accessToken)
      return data.user
    },

    ssoLogin: async (payload = {}) => {
      const { data } = await apiClient.post('/auth/sso', payload)
      startSession(data.user, data.accessToken)
      return data.user
    },

    bypassLogin: async (role = 'employee') => {
      try {
        const { data } = await apiClient.post('/auth/bypass', { role })
        startSession(data.user, data.accessToken)
        return data.user
      } catch (err) {
        // Fallback test user in case of server network issues
        const mockUsers = {
          employee: {
            _id: '6a985034a6f94a0ddf04bac5',
            name: 'Priya Nair',
            email: 'priya.nair@mospi.gov.in',
            role: 'employee',
            employeeId: 'MOSPI-2024-001',
            department: 'National Accounts Division (NAD)',
            experienceYears: 4,
            isActive: true,
            jobRoleId: { _id: 'jr-mock-1', title: 'Statistical Officer' }
          },
          admin: {
            _id: '6a9716b23a22a65916c92285',
            name: 'Priya Nair (Admin)',
            email: 'priya@mospi.gov.in',
            role: 'admin',
            employeeId: 'MOSPI-ADM-01',
            department: 'MoSPI Computer Centre HQ',
            experienceYears: 15,
            isActive: true,
          }
        }
        const fallbackUser = mockUsers[role] || mockUsers.employee
        const fallbackToken = 'kaushalai_bypass_token_' + Date.now()
        startSession(fallbackUser, fallbackToken)
        return fallbackUser
      }
    },


    signup: async (payload) => {
      const { data } = await apiClient.post('/auth/signup', payload)
      startSession(data.user, data.accessToken)
      return data.user
    },

    googleAuth: async (idToken) => {
      const data = await apiGoogleAuth(idToken)
      startSession(data.user, data.accessToken)
      return data
    },

    googleComplete: async (payload) => {
      const data = await apiGoogleComplete(payload)
      startSession(data.user, data.accessToken)
      return data.user
    },

    logout: async () => {
      try {
        await apiClient.post('/auth/logout')
      } catch {
        // ignore network error
      }
      const currentGen = get().sessionGen || (typeof window !== 'undefined' ? localStorage.getItem(SESSION_GEN_KEY) : null)
      broadcastAuthEvent({ type: 'AUTH_LOGOUT', sessionGen: currentGen })
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        localStorage.removeItem(SESSION_GEN_KEY)
      }
      set({ user: null, accessToken: null, isAuthenticated: false, isHydrating: false, sessionGen: null })
    },

    logoutAll: async () => {
      try {
        await apiClient.post('/auth/logout-all')
      } catch {
        // ignore network error
      }
      const currentGen = get().sessionGen || (typeof window !== 'undefined' ? localStorage.getItem(SESSION_GEN_KEY) : null)
      broadcastAuthEvent({ type: 'AUTH_LOGOUT', sessionGen: currentGen })
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        localStorage.removeItem(SESSION_GEN_KEY)
      }
      set({ user: null, accessToken: null, isAuthenticated: false, isHydrating: false, sessionGen: null })
    },

    hydrate: async () => {
      const current = get()
      if (current.isAuthenticated && current.accessToken) {
        // Already authenticated from localStorage! Silently refresh user profile in background
        set({ isHydrating: false })
        try {
          const { data } = await apiClient.get('/auth/me')
          if (data?.user) {
            set({ user: data.user })
            if (typeof window !== 'undefined') {
              localStorage.setItem(USER_KEY, JSON.stringify(data.user))
            }
          }
        } catch (err) {
          if (err.response?.status === 401) {
            try {
              const refreshRes = await apiClient.post('/auth/refresh')
              if (refreshRes.data?.accessToken) {
                const { user, accessToken: newToken } = refreshRes.data
                startSession(user, newToken)
                return
              }
            } catch {
              // Token invalid and refresh failed
              if (typeof window !== 'undefined') {
                localStorage.removeItem(TOKEN_KEY)
                localStorage.removeItem(USER_KEY)
                localStorage.removeItem(SESSION_GEN_KEY)
              }
              set({ user: null, accessToken: null, isAuthenticated: false, sessionGen: null })
            }
          }
        }
        return
      }

      // No localStorage credentials, attempt refresh from cookie
      try {
        const { data } = await apiClient.post('/auth/refresh')
        if (data?.user && data?.accessToken) {
          startSession(data.user, data.accessToken)
          return
        }
      } catch {
        // Not logged in
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem(SESSION_GEN_KEY)
      }
      set({ user: null, accessToken: null, isAuthenticated: false, isHydrating: false, sessionGen: null })
    },
    updateUserPreferences: async (prefsPartial) => {
      const result = await apiUpdatePreferences(prefsPartial)
      const updatedUser = result.user
      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser))
      }
      set({ user: updatedUser })
      return updatedUser
    },
    updateUser: (updatedUser) => {
      if (!updatedUser) return
      const current = get().user || {}
      const merged = { ...current, ...updatedUser }
      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_KEY, JSON.stringify(merged))
      }
      set({ user: merged })
      return merged
    },
  }
})
