import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import apiClient from '../api/client'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      login: async (email, password) => {
        const { data } = await apiClient.post('/auth/login', { email, password })
        localStorage.setItem('kaushalai_token', data.accessToken)
        set({ user: data.user, token: data.accessToken })
        return data.user
      },

      signup: async (payload) => {
        const { data } = await apiClient.post('/auth/signup', payload)
        localStorage.setItem('kaushalai_token', data.accessToken)
        set({ user: data.user, token: data.accessToken })
        return data.user
      },

      logout: async () => {
        try { await apiClient.post('/auth/logout') } catch {}
        localStorage.removeItem('kaushalai_token')
        set({ user: null, token: null })
      },

      fetchMe: async () => {
        const { data } = await apiClient.get('/auth/me')
        set({ user: data.user })
        return data.user
      },

      isAuthenticated: () => !!get().token,
    }),
    { name: 'kaushalai-auth', partialize: (s) => ({ token: s.token, user: s.user }) }
  )
)
