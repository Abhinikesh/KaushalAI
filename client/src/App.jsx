import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

import AppShell from './components/layout/AppShell'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import CompleteGoogleSignupPage from './pages/auth/CompleteGoogleSignupPage'
import SetJobRolePage from './pages/onboarding/SetJobRolePage'
import EmployeeDashboard from './pages/dashboard/EmployeeDashboard'
import MyProfilePage from './pages/profile/MyProfilePage'
import SkillsCompetencyPage from './pages/competency/SkillsCompetencyPage'
import SkillGapAnalysisPage from './pages/competency/SkillGapAnalysisPage'
import RecommendedLearningPage from './pages/learning/RecommendedLearningPage'
import MyLearningPathPage from './pages/learning/MyLearningPathPage'
import QuizListPage from './pages/quiz/QuizListPage'
import TakeQuizPage from './pages/quiz/TakeQuizPage'
import AiTutorPage from './pages/assistant/AiTutorPage'
import UploadMaterialPage from './pages/trainer/UploadMaterialPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import OfficerRosterPage from './pages/admin/OfficerRosterPage'
import UserManagementPage from './pages/admin/UserManagementPage'
import ReportsInsightsPage from './pages/admin/ReportsInsightsPage'

// ── Route guards ──────────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
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

        {/* Google OAuth completion — public, requires location.state from Google flow */}
        <Route path="/auth/google/complete" element={<PublicRoute><CompleteGoogleSignupPage /></PublicRoute>} />

        {/* Onboarding — authenticated, outside AppShell */}
        <Route path="/onboarding/job-role" element={
          <ProtectedRoute><SetJobRolePage /></ProtectedRoute>
        } />

        {/* Authenticated app shell */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          {/* Learner routes */}
          <Route path="/dashboard"        element={<EmployeeDashboard />} />
          <Route path="/profile"          element={<MyProfilePage />} />
          <Route path="/skills"           element={<SkillsCompetencyPage />} />
          <Route path="/skill-gaps"       element={<SkillGapAnalysisPage />} />
          <Route path="/recommendations"  element={<RecommendedLearningPage />} />
          <Route path="/my-learning"      element={<MyLearningPathPage />} />
          <Route path="/quizzes"          element={<QuizListPage />} />
          <Route path="/quizzes/:id"      element={<TakeQuizPage />} />
          <Route path="/ai-tutor"         element={<AiTutorPage />} />
          <Route path="/upload"           element={<UploadMaterialPage />} />

          {/* Admin routes */}
          <Route path="/admin"            element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/training"   element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users"      element={<AdminRoute><UserManagementPage /></AdminRoute>} />
          <Route path="/admin/roster"     element={<AdminRoute><OfficerRosterPage /></AdminRoute>} />
          <Route path="/admin/reports"    element={<AdminRoute><ReportsInsightsPage /></AdminRoute>} />
        </Route>

        {/* Fallback */}
        <Route path="/"  element={<Navigate to="/dashboard" replace />} />
        <Route path="*"  element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
