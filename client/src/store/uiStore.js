import { create } from 'zustand'

export const useUiStore = create((set) => ({
  sidebarCollapsed: (() => {
    try {
      const stored = localStorage.getItem('kai_sidebar_collapsed')
      return stored !== null ? stored === 'true' : true
    } catch {
      return true
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
