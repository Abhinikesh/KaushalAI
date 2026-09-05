import { create } from 'zustand'

export const useUiStore = create((set) => ({
  sidebarCollapsed: (() => {
    try {
      return localStorage.getItem('kai_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })(),

  toggleSidebar: () =>
    set((state) => {
      const nextState = !state.sidebarCollapsed
      try {
        localStorage.setItem('kai_sidebar_collapsed', String(nextState))
      } catch {}
      return { sidebarCollapsed: nextState }
    }),

  setSidebarCollapsed: (collapsed) =>
    set(() => {
      try {
        localStorage.setItem('kai_sidebar_collapsed', String(collapsed))
      } catch {}
      return { sidebarCollapsed: collapsed }
    }),
}))
