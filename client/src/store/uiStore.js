import { create } from 'zustand'

// Valid named color themes & appearance modes
export const COLOR_THEMES = ['abyss', 'cobalt', 'classic', 'forest', 'onsen']
export const APPEARANCE_MODES = ['light', 'dark']
const DEFAULT_THEME = 'abyss'
const DEFAULT_MODE = 'light'

function applyTheme(theme) {
  try {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('kai_theme', theme)
  } catch {}
}

function applyAppearanceMode(mode) {
  try {
    const validMode = APPEARANCE_MODES.includes(mode) ? mode : DEFAULT_MODE
    document.documentElement.setAttribute('data-mode', validMode)
    localStorage.setItem('kai_appearance_mode', validMode)
  } catch {}
}

export const useUiStore = create((set) => ({
  sidebarCollapsed: (() => {
    try {
      const stored = localStorage.getItem('kai_sidebar_collapsed')
      if (stored !== null) return stored === 'true'
      // Default to false (expanded) on desktop, true on mobile/tablet screens
      if (typeof window !== 'undefined' && window.innerWidth < 1024) return true
      return false
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

  // ── Appearance Mode (Light / Dark) ───────────────────────────────────────
  appearanceMode: (() => {
    try {
      const stored = localStorage.getItem('kai_appearance_mode')
      const valid = APPEARANCE_MODES.includes(stored) ? stored : DEFAULT_MODE
      applyAppearanceMode(valid)
      return valid
    } catch {
      return DEFAULT_MODE
    }
  })(),

  setAppearanceMode: (mode) =>
    set(() => {
      const valid = APPEARANCE_MODES.includes(mode) ? mode : DEFAULT_MODE
      applyAppearanceMode(valid)
      return { appearanceMode: valid }
    }),

  // Legacy toggle (kept for backward compat — maps to abyss/cobalt toggle)
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'abyss' ? 'cobalt' : 'abyss'
      applyTheme(next)
      return { theme: next }
    }),
}))
