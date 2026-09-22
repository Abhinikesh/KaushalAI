import { create } from 'zustand'

export const useUiStore = create((set) => ({
  sidebarCollapsed: (() => {
    try {
      const stored = sessionStorage.getItem('kai_sidebar_collapsed')
      return stored !== null ? stored === 'true' : true
    } catch {
      return true
    }
  })(),

  toggleSidebar: () =>
    set((state) => {
      const nextState = !state.sidebarCollapsed
      try {
        sessionStorage.setItem('kai_sidebar_collapsed', String(nextState))
      } catch {}
      return { sidebarCollapsed: nextState }
    }),

  setSidebarCollapsed: (collapsed) =>
    set(() => {
      try {
        sessionStorage.setItem('kai_sidebar_collapsed', String(collapsed))
      } catch {}
      return { sidebarCollapsed: collapsed }
    }),

  theme: (() => {
    try {
      const stored = localStorage.getItem('kai_theme')
      if (stored) {
        document.documentElement.setAttribute('data-theme', stored)
        return stored
      }
      return 'light'
    } catch {
      return 'light'
    }
  })(),

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem('kai_theme', next)
        document.documentElement.setAttribute('data-theme', next)
      } catch {}
      return { theme: next }
    }),
}))

