import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

import AppShell from './components/layout/AppShell'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import SetJobRolePage from './pages/onboarding/SetJobRolePage'
import EmployeeDashboard from './pages/dashboard/EmployeeDashboard'

// ── Protected route wrapper ───────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

// ── Public route wrapper (redirect to dashboard if already logged in) ─────────
function PublicRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

// ── App with session hydration ────────────────────────────────────────────────
export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate)

  // On first mount, attempt to silently restore session from httpOnly cookie
  useEffect(() => { hydrate() }, [hydrate])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth routes */}
        <Route path="/login"  element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />

        {/* Onboarding — authenticated but outside AppShell */}
        <Route path="/onboarding/job-role" element={
          <ProtectedRoute><SetJobRolePage /></ProtectedRoute>
        } />

        {/* Authenticated app routes — all wrapped in AppShell */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/dashboard"  element={<EmployeeDashboard />} />
          {/* Placeholder routes for stages 10+ */}
          <Route path="/my-learning" element={<ComingSoon title="My Learning" />} />
          <Route path="/quizzes"     element={<ComingSoon title="Quizzes" />} />
          <Route path="/upload"      element={<ComingSoon title="Upload Material" />} />
          <Route path="/admin"       element={<ComingSoon title="Admin Dashboard" />} />
        </Route>

        {/* Default redirects */}
        <Route path="/"   element={<Navigate to="/dashboard" replace />} />
        <Route path="*"   element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function ComingSoon({ title }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: 'var(--color-text-secondary)' }}>
      <span style={{ fontSize: '2.5rem' }}>🚧</span>
      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-primary)' }}>{title}</h2>
      <p style={{ fontSize: 'var(--text-sm)' }}>Coming in the next stage.</p>
    </div>
  )
}
