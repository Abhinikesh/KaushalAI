import { create } from 'zustand'

// Valid named color themes
export const COLOR_THEMES = ['abyss', 'cobalt', 'classic', 'forest', 'onsen']
const DEFAULT_THEME = 'abyss'

function applyTheme(theme) {
  try {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('kai_theme', theme)
  } catch {}
}

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

  // ── Named color theme ───────────────────────────────────────────────────
  theme: (() => {
    try {
      const stored = localStorage.getItem('kai_theme')
      const valid = COLOR_THEMES.includes(stored) ? stored : DEFAULT_THEME
      applyTheme(valid)
      return valid
    } catch {
      return DEFAULT_THEME
    }
  })(),

  setTheme: (theme) =>
    set(() => {
      const valid = COLOR_THEMES.includes(theme) ? theme : DEFAULT_THEME
      applyTheme(valid)
      return { theme: valid }
    }),

  // Legacy toggle (kept for backward compat — maps to abyss/cobalt toggle)
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'abyss' ? 'cobalt' : 'abyss'
      applyTheme(next)
      return { theme: next }
    }),
}))
