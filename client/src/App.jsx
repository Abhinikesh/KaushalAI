import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Landmark } from 'lucide-react'
import { useAuthStore } from './store/authStore'

import AppShell from './components/layout/AppShell'

// Authentication (Pages 1, 79, 80)
import LoginPage from './pages/auth/LoginPage'
import AdminLoginPage from './pages/auth/AdminLoginPage'
import SignupPage from './pages/auth/SignupPage'
import CompleteGoogleSignupPage from './pages/auth/CompleteGoogleSignupPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

// Onboarding & Diagnostic Test (Part 2 & Part 3)
import OnboardingFlowPage from './pages/onboarding/OnboardingFlowPage'
import DiagnosticTestPage from './pages/quiz/DiagnosticTestPage'
import SetJobRolePage from './pages/onboarding/SetJobRolePage'
import FirstTimeSetupPage from './pages/onboarding/FirstTimeSetupPage'

// Search (Page 82)
import SearchResultsPage from './pages/search/SearchResultsPage'

// Error & System Pages (Pages 83 to 86)
import NotFoundPage from './pages/error/NotFoundPage'
import UnauthorizedPage from './pages/error/UnauthorizedPage'
import ServerErrorPage from './pages/error/ServerErrorPage'
import MaintenancePage from './pages/system/MaintenancePage'

// Dashboard & Profile (Pages 2, 3, 4)
import EmployeeDashboard from './pages/dashboard/EmployeeDashboard'
import MyProfilePage from './pages/profile/MyProfilePage'
import EditProfilePage from './pages/profile/EditProfilePage'

// Competency (Pages 5, 6, 7)
import SkillsCompetencyPage from './pages/competency/SkillsCompetencyPage'
import SkillGapAnalysisPage from './pages/competency/SkillGapAnalysisPage'
import CompetencyDetailPage from './pages/competency/CompetencyDetailPage'
import CompetencyFrameworkPage from './pages/competency/CompetencyFrameworkPage'

// Learning & Courses (Pages 8, 9, 10, 11, 14, 15)
import RecommendedLearningPage from './pages/learning/RecommendedLearningPage'
import MyLearningPathPage from './pages/learning/MyLearningPathPage'
import IgotCoursesPage from './pages/courses/IgotCoursesPage'
import IgotIntegrationLearnerPage from './pages/courses/IgotIntegrationLearnerPage'
import CourseDetailPage from './pages/courses/CourseDetailPage'
import MyCoursesPage from './pages/courses/MyCoursesPage'
import CourseProgressPage from './pages/courses/CourseProgressPage'

// Training (Pages 12, 13)
import NsstaTrainingPage from './pages/training/NsstaTrainingPage'
import TrainingDetailPage from './pages/training/TrainingDetailPage'

// Quizzes & Assessments (Pages 16, 17, 18, 19, 23)
import QuizListPage from './pages/quiz/QuizListPage'
import TakeQuizPage from './pages/quiz/TakeQuizPage'
import AssessmentHistoryPage from './pages/quiz/AssessmentHistoryPage'
import GeneratedQuizReviewPage from './pages/quiz/GeneratedQuizReviewPage'
import QuizResultPage from './pages/quiz/QuizResultPage'


// AI Assistant (Pages 20, 21)
import AiTutorPage from './pages/assistant/AiTutorPage'
import AiTutorChatPage from './pages/assistant/AiTutorChatPage'

// Relocated Assessment & Content Engine (from Trainer to Admin)
import AiMcqGeneratorPage from './pages/admin/AiMcqGeneratorPage'
import AssessmentManagementPage from './pages/admin/AssessmentManagementPage'
import AssessmentResultsPage from './pages/admin/AssessmentResultsPage'
import LearnersDirectoryPage from './pages/admin/LearnersDirectoryPage'

// Activity & Engagement (Pages 24, 25, 27)
import AchievementsPage from './pages/activity/AchievementsPage'

// System & Preferences (Pages 26, 28)
import NotificationsPage from './pages/system/NotificationsPage'
import SettingsPage from './pages/system/SettingsPage'

// Admin Governance Suite
import AdminDashboard from './pages/admin/AdminDashboard'
import OfficerRosterPage from './pages/admin/OfficerRosterPage'
import UserManagementPage from './pages/admin/UserManagementPage'
import UserDetailsPage from './pages/admin/UserDetailsPage'
import BulkUserImportPage from './pages/admin/BulkUserImportPage'
import CompetencyAnalyticsPage from './pages/admin/CompetencyAnalyticsPage'
import SkillGapAnalyticsPage from './pages/admin/SkillGapAnalyticsPage'
import DepartmentAnalyticsPage from './pages/activity/DepartmentAnalyticsPage'
import CourseManagementPage from './pages/admin/CourseManagementPage'
import NsstaManagementPage from './pages/admin/NsstaManagementPage'
import QuestionBankAdminPage from './pages/admin/QuestionBankAdminPage'
import QuizAnalyticsAdminPage from './pages/admin/QuizAnalyticsAdminPage'
import AuditLogsPage from './pages/admin/AuditLogsPage'
import NotificationsAdminPage from './pages/admin/NotificationsAdminPage'
import SystemHealthPage from './pages/admin/SystemHealthPage'
import ApiIntegrationsPage from './pages/admin/ApiIntegrationsPage'
import AiConfigurationPage from './pages/admin/AiConfigurationPage'
import SystemSettingsPage from './pages/admin/SystemSettingsPage'
import AdminProfilePage from './pages/admin/AdminProfilePage'

// ── Route guards ──────────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { isAuthenticated, user, isHydrating } = useAuthStore()
  const location = useLocation()

  if (isHydrating) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
            <Landmark size={36} color="var(--color-primary-600)" />
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            Verifying MOSPI session...
          </div>
        </div>
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />

  // Enforce onboarding completion: employee accounts must complete profile & diagnostic test
  // before accessing the main dashboard or application shell.
  if (
    user &&
    user.role !== 'admin' &&
    !user.onboarding_completed &&
    location.pathname !== '/onboarding' &&
    location.pathname !== '/diagnostic-test'
  ) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}

function AdminRoute({ children }) {
  const { user, isHydrating } = useAuthStore()
  if (isHydrating) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
            <Landmark size={36} color="var(--color-primary-600)" />
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            Verifying administrative privileges...
          </div>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/403" replace />
  return children
}

// Prevents admin users from accessing learner-only pages.
// If an admin lands on /dashboard or other learner routes, redirect them to the admin panel.
function LearnerRoute({ children }) {
  const { user, isHydrating } = useAuthStore()
  if (isHydrating) return null
  if (user?.role === 'admin') return <Navigate to="/admin/overview" replace />
  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore()
  if (isAuthenticated) {
    if (user?.role === 'admin') return <Navigate to="/admin/overview" replace />
    if (!user?.onboarding_completed) return <Navigate to="/onboarding" replace />
    return <Navigate to="/dashboard" replace />
  }
  return children
}

// Smart root redirect: sends users to the correct home based on their role.
function RootRedirect() {
  const { isAuthenticated, user, isHydrating } = useAuthStore()
  if (isHydrating) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role === 'admin') return <Navigate to="/admin/overview" replace />
  if (!user?.onboarding_completed) return <Navigate to="/onboarding" replace />
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate)
  useEffect(() => { hydrate() }, [hydrate])

  return (
    <BrowserRouter>
      <Routes>
        {/* 1, 79, 80. Authentication & Recovery (Public) */}
        <Route path="/login"  element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/admin/login" element={<PublicRoute><AdminLoginPage /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
        <Route path="/auth/google/complete" element={<PublicRoute><CompleteGoogleSignupPage /></PublicRoute>} />

        {/* 86. Maintenance Page */}
        <Route path="/maintenance" element={<MaintenancePage />} />

        {/* Onboarding Flow & Diagnostic Test (Part 2 & Part 3) */}
        <Route path="/onboarding" element={
          <ProtectedRoute><OnboardingFlowPage /></ProtectedRoute>
        } />
        <Route path="/diagnostic-test" element={
          <ProtectedRoute><DiagnosticTestPage /></ProtectedRoute>
        } />
        <Route path="/onboarding/job-role" element={
          <ProtectedRoute><SetJobRolePage /></ProtectedRoute>
        } />
        <Route path="/onboarding/first-time-setup" element={
          <ProtectedRoute><FirstTimeSetupPage /></ProtectedRoute>
        } />

        {/* Authenticated Platform Shell */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          {/* 2. Dashboard */}
          <Route path="/dashboard" element={<LearnerRoute><EmployeeDashboard /></LearnerRoute>} />

          {/* 3 & 4. Profile */}
          <Route path="/profile" element={<LearnerRoute><MyProfilePage /></LearnerRoute>} />
          <Route path="/profile/edit" element={<LearnerRoute><EditProfilePage /></LearnerRoute>} />

          {/* 5, 6 & 7. Competencies */}
          <Route path="/skills" element={<LearnerRoute><SkillsCompetencyPage /></LearnerRoute>} />
          <Route path="/competency-framework" element={<LearnerRoute><CompetencyFrameworkPage /></LearnerRoute>} />
          <Route path="/competencies/framework" element={<LearnerRoute><CompetencyFrameworkPage /></LearnerRoute>} />
          <Route path="/skill-gaps" element={<LearnerRoute><SkillGapAnalysisPage /></LearnerRoute>} />
          <Route path="/competencies/:id" element={<LearnerRoute><CompetencyDetailPage /></LearnerRoute>} />

          {/* 8, 9, 10, 11, 14 & 15. Courses & Learning */}
          <Route path="/recommendations" element={<LearnerRoute><RecommendedLearningPage /></LearnerRoute>} />
          <Route path="/my-learning" element={<LearnerRoute><MyLearningPathPage /></LearnerRoute>} />
          <Route path="/courses/igot" element={<LearnerRoute><IgotCoursesPage /></LearnerRoute>} />
          <Route path="/igot-integration" element={<LearnerRoute><IgotIntegrationLearnerPage /></LearnerRoute>} />
          <Route path="/courses/igot-integration" element={<LearnerRoute><IgotIntegrationLearnerPage /></LearnerRoute>} />
          <Route path="/courses/:id" element={<LearnerRoute><CourseDetailPage /></LearnerRoute>} />
          <Route path="/my-courses" element={<LearnerRoute><MyCoursesPage /></LearnerRoute>} />
          <Route path="/my-courses/:id" element={<LearnerRoute><CourseProgressPage /></LearnerRoute>} />

          {/* 12 & 13. NSSTA / TPAC Training */}
          <Route path="/training/nssta" element={<LearnerRoute><NsstaTrainingPage /></LearnerRoute>} />
          <Route path="/training/:id" element={<LearnerRoute><TrainingDetailPage /></LearnerRoute>} />

          {/* 16, 17, 18, 19 & 23. Quizzes & Assessments */}
          <Route path="/quizzes" element={<LearnerRoute><QuizListPage /></LearnerRoute>} />
          <Route path="/quizzes/:id" element={<LearnerRoute><TakeQuizPage /></LearnerRoute>} />
          <Route path="/assessment" element={<LearnerRoute><TakeQuizPage /></LearnerRoute>} />
          <Route path="/assessments/:id" element={<LearnerRoute><TakeQuizPage /></LearnerRoute>} />
          <Route path="/quizzes/:id/result" element={<LearnerRoute><QuizResultPage /></LearnerRoute>} />
          <Route path="/quiz-result" element={<LearnerRoute><QuizResultPage /></LearnerRoute>} />
          <Route path="/quiz-result/:id" element={<LearnerRoute><QuizResultPage /></LearnerRoute>} />
          <Route path="/assessments/history" element={<LearnerRoute><AssessmentHistoryPage /></LearnerRoute>} />
          <Route path="/quizzes/generated/:id" element={<LearnerRoute><GeneratedQuizReviewPage /></LearnerRoute>} />


          {/* 20 & 21. AI Assistant */}
          <Route path="/ai-tutor" element={<LearnerRoute><AiTutorPage /></LearnerRoute>} />
          <Route path="/ai-tutor/chat" element={<LearnerRoute><AiTutorChatPage /></LearnerRoute>} />
          <Route path="/mcq-generator" element={<LearnerRoute><AiMcqGeneratorPage /></LearnerRoute>} />

          {/* 24, 25 & 27. Activity & Progress */}
          <Route path="/achievements" element={<LearnerRoute><AchievementsPage /></LearnerRoute>} />

          {/* 26 & 28. System */}
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<LearnerRoute><SettingsPage /></LearnerRoute>} />

          {/* 82. Global Search */}
          <Route path="/search" element={<SearchResultsPage />} />

          {/* Executive & Administrative Governance Suite */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/overview" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><UserManagementPage /></AdminRoute>} />
          <Route path="/admin/users/import" element={<AdminRoute><BulkUserImportPage /></AdminRoute>} />
          <Route path="/admin/users/:id" element={<AdminRoute><UserDetailsPage /></AdminRoute>} />
          <Route path="/admin/competency-analytics" element={<AdminRoute><CompetencyAnalyticsPage /></AdminRoute>} />
          <Route path="/admin/skill-gap-analytics" element={<AdminRoute><SkillGapAnalyticsPage /></AdminRoute>} />
          <Route path="/admin/department-analytics" element={<AdminRoute><DepartmentAnalyticsPage /></AdminRoute>} />
          <Route path="/admin/courses" element={<AdminRoute><CourseManagementPage /></AdminRoute>} />
          <Route path="/admin/nssta-management" element={<AdminRoute><NsstaManagementPage /></AdminRoute>} />
          <Route path="/admin/question-bank-management" element={<AdminRoute><QuestionBankAdminPage /></AdminRoute>} />
          <Route path="/admin/quiz-analytics" element={<AdminRoute><QuizAnalyticsAdminPage /></AdminRoute>} />
          <Route path="/admin/roster" element={<AdminRoute><OfficerRosterPage /></AdminRoute>} />
          <Route path="/admin/audit-logs" element={<AdminRoute><AuditLogsPage /></AdminRoute>} />
          <Route path="/admin/notifications-management" element={<AdminRoute><NotificationsAdminPage /></AdminRoute>} />
          <Route path="/admin/system-health" element={<AdminRoute><SystemHealthPage /></AdminRoute>} />
          <Route path="/admin/api-integrations" element={<AdminRoute><ApiIntegrationsPage /></AdminRoute>} />
          <Route path="/admin/ai-configuration" element={<AdminRoute><AiConfigurationPage /></AdminRoute>} />
          <Route path="/admin/system-settings" element={<ProtectedRoute><SystemSettingsPage /></ProtectedRoute>} />
          <Route path="/admin/profile" element={<AdminRoute><AdminProfilePage /></AdminRoute>} />

          {/* Relocated Genuine Assessment & Content Engine */}
          <Route path="/admin/assessments" element={<AdminRoute><AssessmentManagementPage /></AdminRoute>} />
          <Route path="/admin/assessments/:id/results" element={<AdminRoute><AssessmentResultsPage /></AdminRoute>} />
          <Route path="/admin/learners" element={<AdminRoute><LearnersDirectoryPage /></AdminRoute>} />

          {/* Error pages within layout */}
          <Route path="/403" element={<UnauthorizedPage />} />
          <Route path="/500" element={<ServerErrorPage />} />
          <Route path="/404" element={<NotFoundPage />} />
        </Route>

        {/* Fallbacks (Page 83) */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
