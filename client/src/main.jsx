import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './styles/global.css'
import './i18n/index.js'
import App from './App.jsx'

try {
  const VALID_THEMES = ['abyss', 'cobalt', 'classic', 'forest', 'onsen']
  const storedTheme = localStorage.getItem('kai_theme')
  const theme = VALID_THEMES.includes(storedTheme) ? storedTheme : 'abyss'
  document.documentElement.setAttribute('data-theme', theme)

  const VALID_MODES = ['light', 'dark']
  const storedMode = localStorage.getItem('kai_appearance_mode')
  const mode = VALID_MODES.includes(storedMode) ? storedMode : 'light'
  document.documentElement.setAttribute('data-mode', mode)
} catch {}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 min — dashboard data doesn't need constant refetch
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
