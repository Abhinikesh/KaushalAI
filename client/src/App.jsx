import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

import AppShell from './components/layout/AppShell'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import CompleteGoogleSignupPage from './pages/auth/CompleteGoogleSignupPage'
import SetJobRolePage from './pages/onboarding/SetJobRolePage'
import EmployeeDashboard from './pages/dashboard/EmployeeDashboard'

// Profile
import MyProfilePage from './pages/profile/MyProfilePage'
import EditProfilePage from './pages/profile/EditProfilePage'

// Competency
import SkillsCompetencyPage from './pages/competency/SkillsCompetencyPage'
import SkillGapAnalysisPage from './pages/competency/SkillGapAnalysisPage'
import CompetencyDetailPage from './pages/competency/CompetencyDetailPage'

// Learning & Courses
import RecommendedLearningPage from './pages/learning/RecommendedLearningPage'
import MyLearningPathPage from './pages/learning/MyLearningPathPage'
import IgotCoursesPage from './pages/courses/IgotCoursesPage'
import CourseDetailPage from './pages/courses/CourseDetailPage'
import MyCoursesPage from './pages/courses/MyCoursesPage'
import CourseProgressPage from './pages/courses/CourseProgressPage'

// Training
import NsstaTrainingPage from './pages/training/NsstaTrainingPage'
import TrainingDetailPage from './pages/training/TrainingDetailPage'

// Quizzes & Assessments
import QuizListPage from './pages/quiz/QuizListPage'
import TakeQuizPage from './pages/quiz/TakeQuizPage'
import AssessmentHistoryPage from './pages/quiz/AssessmentHistoryPage'
import GeneratedQuizReviewPage from './pages/quiz/GeneratedQuizReviewPage'

// AI Assistant
import AiTutorPage from './pages/assistant/AiTutorPage'
import AiTutorChatPage from './pages/assistant/AiTutorChatPage'

// Upload & Training Tools
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

// Activity & Engagement
import LearningHistoryPage from './pages/activity/LearningHistoryPage'
import CertificatesPage from './pages/activity/CertificatesPage'
import AchievementsPage from './pages/activity/AchievementsPage'

// System & Preferences
import NotificationsPage from './pages/system/NotificationsPage'
import SettingsPage from './pages/system/SettingsPage'
import HelpSupportPage from './pages/system/HelpSupportPage'

// Admin
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
        {/* 1. Login / SSO (Public) */}
        <Route path="/login"  element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
        <Route path="/auth/google/complete" element={<PublicRoute><CompleteGoogleSignupPage /></PublicRoute>} />

        {/* Onboarding */}
        <Route path="/onboarding/job-role" element={
          <ProtectedRoute><SetJobRolePage /></ProtectedRoute>
        } />

        {/* Authenticated app shell with all 44 platform pages */}
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
          <Route path="/quizzes/:id/result" element={<TakeQuizPage />} />
          <Route path="/assessments/history" element={<AssessmentHistoryPage />} />
          <Route path="/quizzes/generated/:id" element={<GeneratedQuizReviewPage />} />

          {/* 20 & 21. AI Assistant */}
          <Route path="/ai-tutor" element={<AiTutorPage />} />
          <Route path="/ai-tutor/chat" element={<AiTutorChatPage />} />

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

          {/* Admin routes */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/training" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><UserManagementPage /></AdminRoute>} />
          <Route path="/admin/roster" element={<AdminRoute><OfficerRosterPage /></AdminRoute>} />
          <Route path="/admin/reports" element={<AdminRoute><ReportsInsightsPage /></AdminRoute>} />
        </Route>

        {/* Fallbacks */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
