import { create } from 'zustand'
import apiClient, { configureApiClient } from '../api/client'
import { googleAuth as apiGoogleAuth, googleComplete as apiGoogleComplete } from '../api/auth.api'

const TOKEN_KEY = 'kaushalai_token'
const USER_KEY = 'kaushalai_user'

const getInitialAuth = () => {
  if (typeof window === 'undefined') {
    return { user: null, accessToken: null, isAuthenticated: false, isHydrating: true }
  }
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const userStr = localStorage.getItem(USER_KEY)
    if (token && userStr) {
      const user = JSON.parse(userStr)
      if (user && user._id) {
        return { user, accessToken: token, isAuthenticated: true, isHydrating: false }
      }
    }
  } catch (e) {
    console.error('Failed to parse cached auth:', e)
  }
  return { user: null, accessToken: null, isAuthenticated: false, isHydrating: true }
}

const initial = getInitialAuth()

export const useAuthStore = create((set, get) => {
  configureApiClient({
    getToken: () => get().accessToken || (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null),
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
      }
      set({ user: null, accessToken: null, isAuthenticated: false, isHydrating: false })
    },
  })

  return {
    user: initial.user,
    accessToken: initial.accessToken,
    isAuthenticated: initial.isAuthenticated,
    isHydrating: initial.isHydrating,

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
      }
      set({ user: null, accessToken: null, isAuthenticated: false, isHydrating: false })
    },

    login: async (email, password) => {
      const { data } = await apiClient.post('/auth/login', { email, password })
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, data.accessToken)
        localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      }
      set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true, isHydrating: false })
      return data.user
    },

    ssoLogin: async (payload = {}) => {
      const { data } = await apiClient.post('/auth/sso', payload)
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, data.accessToken)
        localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      }
      set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true, isHydrating: false })
      return data.user
    },

    bypassLogin: async (role = 'employee') => {
      try {
        const { data } = await apiClient.post('/auth/bypass', { role })
        if (typeof window !== 'undefined') {
          localStorage.setItem(TOKEN_KEY, data.accessToken)
          localStorage.setItem(USER_KEY, JSON.stringify(data.user))
        }
        set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true, isHydrating: false })
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
        if (typeof window !== 'undefined') {
          localStorage.setItem(TOKEN_KEY, fallbackToken)
          localStorage.setItem(USER_KEY, JSON.stringify(fallbackUser))
        }
        set({ user: fallbackUser, accessToken: fallbackToken, isAuthenticated: true, isHydrating: false })
        return fallbackUser
      }
    },


    signup: async (payload) => {
      const { data } = await apiClient.post('/auth/signup', payload)
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, data.accessToken)
        localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      }
      set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true, isHydrating: false })
      return data.user
    },

    googleAuth: async (accessToken) => {
      const data = await apiGoogleAuth(accessToken)
      if (data.requiresCompletion) return data
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, data.accessToken)
        localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      }
      set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true, isHydrating: false })
      return data
    },

    googleComplete: async (payload) => {
      const data = await apiGoogleComplete(payload)
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, data.accessToken)
        localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      }
      set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true, isHydrating: false })
      return data.user
    },

    logout: async () => {
      try {
        await apiClient.post('/auth/logout')
      } catch {
        // ignore network error
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      }
      set({ user: null, accessToken: null, isAuthenticated: false, isHydrating: false })
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
                set({ user, accessToken: newToken, isAuthenticated: true })
                if (typeof window !== 'undefined') {
                  localStorage.setItem(TOKEN_KEY, newToken)
                  localStorage.setItem(USER_KEY, JSON.stringify(user))
                }
                return
              }
            } catch {
              // Token invalid and refresh failed
              if (typeof window !== 'undefined') {
                localStorage.removeItem(TOKEN_KEY)
                localStorage.removeItem(USER_KEY)
              }
              set({ user: null, accessToken: null, isAuthenticated: false })
            }
          }
        }
        return
      }

      // No localStorage credentials, attempt refresh from cookie
      try {
        const { data } = await apiClient.post('/auth/refresh')
        if (data?.user && data?.accessToken) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(TOKEN_KEY, data.accessToken)
            localStorage.setItem(USER_KEY, JSON.stringify(data.user))
          }
          set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true, isHydrating: false })
          return
        }
      } catch {
        // Not logged in
      }
      set({ user: null, accessToken: null, isAuthenticated: false, isHydrating: false })
    },
  }
})
