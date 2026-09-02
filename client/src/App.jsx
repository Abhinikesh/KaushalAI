import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

import AppShell from './components/layout/AppShell'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import SetJobRolePage from './pages/onboarding/SetJobRolePage'
import EmployeeDashboard from './pages/dashboard/EmployeeDashboard'
import QuizListPage from './pages/quiz/QuizListPage'
import TakeQuizPage from './pages/quiz/TakeQuizPage'
import UploadMaterialPage from './pages/trainer/UploadMaterialPage'
import AdminDashboard from './pages/admin/AdminDashboard'

// ── Route guards ──────────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate)
  useEffect(() => { hydrate() }, [hydrate])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"  element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />

        {/* Onboarding — authenticated, outside AppShell */}
        <Route path="/onboarding/job-role" element={
          <ProtectedRoute><SetJobRolePage /></ProtectedRoute>
        } />

        {/* Authenticated app shell */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/dashboard"     element={<EmployeeDashboard />} />
          <Route path="/quizzes"       element={<QuizListPage />} />
          <Route path="/quizzes/:id"   element={<TakeQuizPage />} />
          <Route path="/upload"        element={<UploadMaterialPage />} />
          <Route path="/my-learning"   element={<ComingSoon title="My Learning" icon="📚" desc="Full learning path timeline coming in stage 11." />} />
          <Route path="/admin"         element={<AdminDashboard />} />
        </Route>

        {/* Fallback */}
        <Route path="/"  element={<Navigate to="/dashboard" replace />} />
        <Route path="*"  element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function ComingSoon({ title, icon = '🚧', desc = 'Coming in the next stage.' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
      <span style={{ fontSize: '2.5rem' }}>{icon}</span>
      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-primary)' }}>{title}</h2>
      <p style={{ fontSize: 'var(--text-sm)', maxWidth: 320 }}>{desc}</p>
    </div>
  )
}
