import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Landmark } from 'lucide-react'
import { useAuthStore } from './store/authStore'

import AppShell from './components/layout/AppShell'

// Authentication (Pages 1, 79, 80)
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import CompleteGoogleSignupPage from './pages/auth/CompleteGoogleSignupPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

// Onboarding (Page 81)
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

// Learning & Courses (Pages 8, 9, 10, 11, 14, 15)
import RecommendedLearningPage from './pages/learning/RecommendedLearningPage'
import MyLearningPathPage from './pages/learning/MyLearningPathPage'
import IgotCoursesPage from './pages/courses/IgotCoursesPage'
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

// Upload & Trainer Suite (Pages 22, 30 to 44)
import UploadMaterialPage from './pages/trainer/UploadMaterialPage'
import TrainerDashboard from './pages/trainer/TrainerDashboard'
import TrainerProfilePage from './pages/trainer/TrainerProfilePage'
import MyProgrammesPage from './pages/trainer/MyProgrammesPage'
import CreateProgrammePage from './pages/trainer/CreateProgrammePage'
import ProgrammeDetailPage from './pages/trainer/ProgrammeDetailPage'
import LearnersDirectoryPage from './pages/trainer/LearnersDirectoryPage'
import LearnerPerformancePage from './pages/trainer/LearnerPerformancePage'
import AiMcqGeneratorPage from './pages/trainer/AiMcqGeneratorPage'
import AiQuizBuilderPage from './pages/trainer/AiQuizBuilderPage'
import QuestionBankPage from './pages/trainer/QuestionBankPage'
import QuestionEditorPage from './pages/trainer/QuestionEditorPage'
import AssessmentManagementPage from './pages/trainer/AssessmentManagementPage'
import AssessmentResultsPage from './pages/trainer/AssessmentResultsPage'
import TrainingAnalyticsPage from './pages/trainer/TrainingAnalyticsPage'

// Activity & Engagement (Pages 24, 25, 27)
import LearningHistoryPage from './pages/activity/LearningHistoryPage'
import CertificatesPage from './pages/activity/CertificatesPage'
import AchievementsPage from './pages/activity/AchievementsPage'

// System & Preferences (Pages 26, 28, 29)
import NotificationsPage from './pages/system/NotificationsPage'
import SettingsPage from './pages/system/SettingsPage'
import HelpSupportPage from './pages/system/HelpSupportPage'

// Admin Governance (Pages 45 to 78)
import AdminDashboard from './pages/admin/AdminDashboard'
import OfficerRosterPage from './pages/admin/OfficerRosterPage'
import UserManagementPage from './pages/admin/UserManagementPage'
import UserDetailsPage from './pages/admin/UserDetailsPage'
import BulkUserImportPage from './pages/admin/BulkUserImportPage'
import RolesPermissionsPage from './pages/admin/RolesPermissionsPage'
import DepartmentManagementPage from './pages/admin/DepartmentManagementPage'
import JobRoleManagementPage from './pages/admin/JobRoleManagementPage'
import CompetencyFrameworkPage from './pages/admin/CompetencyFrameworkPage'
import SkillTaxonomyPage from './pages/admin/SkillTaxonomyPage'
import RoleCompetencyMatrixPage from './pages/admin/RoleCompetencyMatrixPage'
import CompetencyAnalyticsPage from './pages/admin/CompetencyAnalyticsPage'
import SkillGapAnalyticsPage from './pages/admin/SkillGapAnalyticsPage'
import DepartmentAnalyticsPage from './pages/admin/DepartmentAnalyticsPage'
import WorkforceAnalyticsPage from './pages/admin/WorkforceAnalyticsPage'
import PredictiveInsightsPage from './pages/admin/PredictiveInsightsPage'
import TrainingEffectivenessAdminPage from './pages/admin/TrainingEffectivenessAdminPage'
import CourseManagementPage from './pages/admin/CourseManagementPage'
import IgotIntegrationPage from './pages/admin/IgotIntegrationPage'
import NsstaManagementPage from './pages/admin/NsstaManagementPage'
import LearningPathAdminPage from './pages/admin/LearningPathAdminPage'
import ContentLibraryPage from './pages/admin/ContentLibraryPage'
import AssessmentAdminPage from './pages/admin/AssessmentAdminPage'
import QuestionBankAdminPage from './pages/admin/QuestionBankAdminPage'
import QuizAnalyticsAdminPage from './pages/admin/QuizAnalyticsAdminPage'
import ReportsInsightsPage from './pages/admin/ReportsInsightsPage'
import CustomReportsPage from './pages/admin/CustomReportsPage'
import AuditLogsPage from './pages/admin/AuditLogsPage'
import NotificationsAdminPage from './pages/admin/NotificationsAdminPage'
import SystemHealthPage from './pages/admin/SystemHealthPage'
import ApiIntegrationsPage from './pages/admin/ApiIntegrationsPage'
import AiConfigurationPage from './pages/admin/AiConfigurationPage'
import SecurityCenterPage from './pages/admin/SecurityCenterPage'
import SystemSettingsPage from './pages/admin/SystemSettingsPage'
import AdminProfilePage from './pages/admin/AdminProfilePage'

// ── Route guards ──────────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { isAuthenticated, isHydrating } = useAuthStore()
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
  return isAuthenticated ? children : <Navigate to="/login" replace />
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

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate)
  useEffect(() => { hydrate() }, [hydrate])

  return (
    <BrowserRouter>
      <Routes>
        {/* 1, 79, 80. Authentication & Recovery (Public) */}
        <Route path="/login"  element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
        <Route path="/auth/google/complete" element={<PublicRoute><CompleteGoogleSignupPage /></PublicRoute>} />

        {/* 86. Maintenance Page */}
        <Route path="/maintenance" element={<MaintenancePage />} />

        {/* 81. Onboarding */}
        <Route path="/onboarding/job-role" element={
          <ProtectedRoute><SetJobRolePage /></ProtectedRoute>
        } />
        <Route path="/onboarding/first-time-setup" element={
          <ProtectedRoute><FirstTimeSetupPage /></ProtectedRoute>
        } />

        {/* Authenticated Platform Shell */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          {/* 2. Dashboard */}
          <Route path="/dashboard" element={<EmployeeDashboard />} />

          {/* 3 & 4. Profile */}
          <Route path="/profile" element={<MyProfilePage />} />
          <Route path="/profile/edit" element={<EditProfilePage />} />

          {/* 5, 6 & 7. Competencies */}
          <Route path="/skills" element={<SkillsCompetencyPage />} />
          <Route path="/skill-gaps" element={<SkillGapAnalysisPage />} />
          <Route path="/competencies/:id" element={<CompetencyDetailPage />} />

          {/* 8, 9, 10, 11, 14 & 15. Courses & Learning */}
          <Route path="/recommendations" element={<RecommendedLearningPage />} />
          <Route path="/my-learning" element={<MyLearningPathPage />} />
          <Route path="/courses/igot" element={<IgotCoursesPage />} />
          <Route path="/courses/:id" element={<CourseDetailPage />} />
          <Route path="/my-courses" element={<MyCoursesPage />} />
          <Route path="/my-courses/:id" element={<CourseProgressPage />} />

          {/* 12 & 13. NSSTA / TPAC Training */}
          <Route path="/training/nssta" element={<NsstaTrainingPage />} />
          <Route path="/training/:id" element={<TrainingDetailPage />} />

          {/* 16, 17, 18, 19 & 23. Quizzes & Assessments */}
          <Route path="/quizzes" element={<QuizListPage />} />
          <Route path="/quizzes/:id" element={<TakeQuizPage />} />
          <Route path="/quizzes/:id/result" element={<QuizResultPage />} />
          <Route path="/quiz-result" element={<QuizResultPage />} />
          <Route path="/quiz-result/:id" element={<QuizResultPage />} />
          <Route path="/assessments/history" element={<AssessmentHistoryPage />} />
          <Route path="/quizzes/generated/:id" element={<GeneratedQuizReviewPage />} />


          {/* 20 & 21. AI Assistant */}
          <Route path="/ai-tutor" element={<AiTutorPage />} />
          <Route path="/ai-tutor/chat" element={<AiTutorChatPage />} />
          <Route path="/mcq-generator" element={<AiMcqGeneratorPage />} />

          {/* 22. Upload Material */}
          <Route path="/upload" element={<UploadMaterialPage />} />

          {/* 24, 25 & 27. Activity & Progress */}
          <Route path="/learning-history" element={<LearningHistoryPage />} />
          <Route path="/certificates" element={<CertificatesPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />

          {/* 26, 28 & 29. System & Support */}
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/support" element={<HelpSupportPage />} />

          {/* 82. Global Search */}
          <Route path="/search" element={<SearchResultsPage />} />

          {/* 30 to 44. Trainer & Faculty Portal */}
          <Route path="/trainer/dashboard" element={<TrainerDashboard />} />
          <Route path="/trainer/profile" element={<TrainerProfilePage />} />
          <Route path="/trainer/programmes" element={<MyProgrammesPage />} />
          <Route path="/trainer/programmes/new" element={<CreateProgrammePage />} />
          <Route path="/trainer/programmes/:id" element={<ProgrammeDetailPage />} />
          <Route path="/trainer/learners" element={<LearnersDirectoryPage />} />
          <Route path="/trainer/learners/:id" element={<LearnerPerformancePage />} />
          <Route path="/trainer/upload" element={<UploadMaterialPage />} />
          <Route path="/trainer/mcq-generator" element={<AiMcqGeneratorPage />} />
          <Route path="/trainer/quiz-builder" element={<AiQuizBuilderPage />} />
          <Route path="/trainer/question-bank" element={<QuestionBankPage />} />
          <Route path="/trainer/questions/:id/edit" element={<QuestionEditorPage />} />
          <Route path="/trainer/assessments" element={<AssessmentManagementPage />} />
          <Route path="/trainer/assessments/:id/results" element={<AssessmentResultsPage />} />
          <Route path="/trainer/analytics" element={<TrainingAnalyticsPage />} />

          {/* 45 to 78. Executive & Administrative Governance Suite */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><UserManagementPage /></AdminRoute>} />
          <Route path="/admin/users/import" element={<AdminRoute><BulkUserImportPage /></AdminRoute>} />
          <Route path="/admin/users/:id" element={<AdminRoute><UserDetailsPage /></AdminRoute>} />
          <Route path="/admin/roles" element={<AdminRoute><RolesPermissionsPage /></AdminRoute>} />
          <Route path="/admin/departments" element={<AdminRoute><DepartmentManagementPage /></AdminRoute>} />
          <Route path="/admin/job-roles" element={<AdminRoute><JobRoleManagementPage /></AdminRoute>} />
          <Route path="/admin/competency-framework" element={<AdminRoute><CompetencyFrameworkPage /></AdminRoute>} />
          <Route path="/admin/skill-taxonomy" element={<AdminRoute><SkillTaxonomyPage /></AdminRoute>} />
          <Route path="/admin/role-competency-matrix" element={<AdminRoute><RoleCompetencyMatrixPage /></AdminRoute>} />
          <Route path="/admin/competency-analytics" element={<AdminRoute><CompetencyAnalyticsPage /></AdminRoute>} />
          <Route path="/admin/skill-gap-analytics" element={<AdminRoute><SkillGapAnalyticsPage /></AdminRoute>} />
          <Route path="/admin/department-analytics" element={<AdminRoute><DepartmentAnalyticsPage /></AdminRoute>} />
          <Route path="/admin/workforce-analytics" element={<AdminRoute><WorkforceAnalyticsPage /></AdminRoute>} />
          <Route path="/admin/predictive-insights" element={<AdminRoute><PredictiveInsightsPage /></AdminRoute>} />
          <Route path="/admin/training-effectiveness" element={<AdminRoute><TrainingEffectivenessAdminPage /></AdminRoute>} />
          <Route path="/admin/training" element={<AdminRoute><TrainingEffectivenessAdminPage /></AdminRoute>} />
          <Route path="/admin/courses" element={<AdminRoute><CourseManagementPage /></AdminRoute>} />
          <Route path="/admin/igot-integration" element={<AdminRoute><IgotIntegrationPage /></AdminRoute>} />
          <Route path="/admin/nssta-management" element={<AdminRoute><NsstaManagementPage /></AdminRoute>} />
          <Route path="/admin/learning-path-management" element={<AdminRoute><LearningPathAdminPage /></AdminRoute>} />
          <Route path="/admin/content-library" element={<AdminRoute><ContentLibraryPage /></AdminRoute>} />
          <Route path="/admin/assessment-management" element={<AdminRoute><AssessmentAdminPage /></AdminRoute>} />
          <Route path="/admin/question-bank-management" element={<AdminRoute><QuestionBankAdminPage /></AdminRoute>} />
          <Route path="/admin/quiz-analytics" element={<AdminRoute><QuizAnalyticsAdminPage /></AdminRoute>} />
          <Route path="/admin/roster" element={<AdminRoute><OfficerRosterPage /></AdminRoute>} />
          <Route path="/admin/reports" element={<AdminRoute><ReportsInsightsPage /></AdminRoute>} />
          <Route path="/admin/custom-reports" element={<AdminRoute><CustomReportsPage /></AdminRoute>} />
          <Route path="/admin/audit-logs" element={<AdminRoute><AuditLogsPage /></AdminRoute>} />
          <Route path="/admin/notifications-management" element={<AdminRoute><NotificationsAdminPage /></AdminRoute>} />
          <Route path="/admin/system-health" element={<AdminRoute><SystemHealthPage /></AdminRoute>} />
          <Route path="/admin/api-integrations" element={<AdminRoute><ApiIntegrationsPage /></AdminRoute>} />
          <Route path="/admin/ai-configuration" element={<AdminRoute><AiConfigurationPage /></AdminRoute>} />
          <Route path="/admin/security-center" element={<AdminRoute><SecurityCenterPage /></AdminRoute>} />
          <Route path="/admin/system-settings" element={<ProtectedRoute><SystemSettingsPage /></ProtectedRoute>} />
          <Route path="/admin/profile" element={<AdminRoute><AdminProfilePage /></AdminRoute>} />

          {/* Error pages within layout */}
          <Route path="/403" element={<UnauthorizedPage />} />
          <Route path="/500" element={<ServerErrorPage />} />
          <Route path="/404" element={<NotFoundPage />} />
        </Route>

        {/* Fallbacks (Page 83) */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
