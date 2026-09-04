import React, { useState } from 'react'
import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom'

import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  User,
  BarChart3,
  TrendingUp,
  Compass,
  Map,
  BookOpen,
  Landmark,
  GraduationCap,
  PenTool,
  FileText,
  Bot,
  History,
  Award,
  Trophy,
  FolderKanban,
  Users,
  Upload,
  Zap,
  CheckSquare,
  SlidersHorizontal,
  Database,
  ClipboardList,
  LineChart,
  Shield,
  Building2,
  Briefcase,
  Layers,
  Tag,
  Grid,
  BarChart2,
  AlertTriangle,
  PieChart,
  UserPlus,
  Sparkles,
  Library,
  RefreshCw,
  School,
  GitFork,
  FolderGit2,
  FileCheck2,
  Archive,
  Microscope,
  Contact2,
  FileSpreadsheet,
  FileCog,
  Lock,
  Radio,
  Server,
  Cable,
  Cpu,
  ShieldAlert,
  Settings,
  UserCog,
  Bell,
  HelpCircle,
  MessageSquare,
  LogOut,
  Search,
  Menu,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useSearchStore } from '../../store/searchStore'
import { getMyNotifications } from '../../api/userFeatures.api'
import styles from './AppShell.module.css'

const LEARNER_NAV = [
  { section: 'LEARNER' },
  { to: '/dashboard',           label: 'Dashboard',             icon: LayoutDashboard },
  { to: '/profile',             label: 'My Profile',            icon: User },
  { to: '/skills',              label: 'Skills & Competencies', icon: BarChart3 },
  { to: '/skill-gaps',          label: 'Skill Gap Analysis',    icon: BarChart2 },
  { to: '/recommendations',     label: 'Recommended Learning',  icon: Compass },
  { to: '/my-learning',         label: 'Learning Path',         icon: Map },
  { to: '/courses/igot',        label: 'Courses (iGOT)',        icon: BookOpen },
  { to: '/igot-integration',    label: 'iGOT Integration',      icon: CheckSquare },
  { to: '/quizzes',             label: 'Assessments & Quizzes', icon: PenTool },
  { to: '/ai-tutor',            label: 'AI Tutor / Assistant',  icon: Bot },
  { to: '/trainer/mcq-generator', label: 'AI MCQ Generator',    icon: Zap },
  { to: '/learning-history',    label: 'Learning History',      icon: History },
  { to: '/upload',              label: 'Upload Material',       icon: Upload },
  { to: '/quiz-result',         label: 'Quiz Result',           icon: FileCheck2 },
  { to: '/certificates',        label: 'Certificates',          icon: Award },
  { to: '/training-effectiveness', label: 'Training Effectiveness', icon: LineChart },
  { to: '/settings',            label: 'Settings',              icon: Settings },
]

const TRAINER_NAV = [
  { section: 'TRAINER' },
  { to: '/trainer/dashboard',     label: 'Dashboard',             icon: LayoutDashboard },
  { to: '/trainer/profile',       label: 'My Profile',            icon: User },
  { to: '/trainer/programmes',    label: 'My Training Programmes', icon: FolderKanban },
  { to: '/trainer/learners',      label: 'Learners',              icon: Users },
  { to: '/trainer/upload',        label: 'Upload Material',       icon: Upload },
  { to: '/trainer/mcq-generator', label: 'AI MCQ Generator',      icon: Zap },
  { to: '/trainer/question-bank', label: 'Question Bank',         icon: Database },
  { to: '/trainer/assessments',   label: 'Assessments',           icon: ClipboardList },
  { to: '/trainer/analytics',     label: 'Results & Analytics',   icon: LineChart },
  { to: '/certificates',          label: 'Certificates',          icon: Award },
]

const SUPPORT_NAV = [
  { section: 'SUPPORT' },
  { to: '/support',             label: 'Help & Support',        icon: HelpCircle },
  { to: '/support#faq',         label: 'FAQs',                  icon: MessageSquare },
]

const ADMIN_NAV = [
  { section: 'EXECUTIVE & GOVERNANCE' },
  { to: '/admin',                     label: 'Control Tower',           icon: Landmark },
  { to: '/admin/users',               label: 'User Management',         icon: Users },
  { to: '/admin/roles',               label: 'Roles & RBAC',            icon: Shield },
  { to: '/admin/departments',         label: 'Departments / DES',      icon: Building2 },
  { to: '/admin/job-roles',           label: 'Cadre Job Roles',         icon: Briefcase },
  { to: '/admin/competency-framework',label: 'Competency Framework',    icon: Layers },
  { to: '/admin/skill-taxonomy',      label: 'AI Skill Taxonomy',       icon: Tag },
  { to: '/admin/role-competency-matrix',label:'Role–Skill Matrix',      icon: Grid },
  { to: '/admin/competency-analytics',label: 'Competency Analytics',    icon: BarChart2 },
  { to: '/admin/skill-gap-analytics', label: 'Cadre Skill Gaps',        icon: AlertTriangle },
  { to: '/admin/department-analytics',label: 'Divisional Analytics',    icon: PieChart },
  { to: '/admin/workforce-analytics', label: 'Workforce Capability',    icon: UserPlus },
  { to: '/admin/predictive-insights', label: 'Predictive Insights',     icon: Sparkles },
  { to: '/admin/training-effectiveness',label:'Training Outcomes',      icon: TrendingUp },
  { to: '/admin/courses',             label: 'Course Registry',         icon: Library },
  { to: '/admin/igot-integration',    label: 'iGOT Gateway Status',     icon: RefreshCw },
  { to: '/admin/nssta-management',    label: 'NSSTA Campus Batches',    icon: School },
  { to: '/admin/learning-path-management',label:'Learning Path Rules',  icon: GitFork },
  { to: '/admin/content-library',     label: 'Content Library',         icon: FolderGit2 },
  { to: '/admin/assessment-management',label:'Assessment Governance',   icon: FileCheck2 },
  { to: '/admin/question-bank-management',label:'Question Bank Admin',  icon: Archive },
  { to: '/admin/quiz-analytics',      label: 'Psychometric Analytics',  icon: Microscope },
  { to: '/admin/roster',              label: 'Officer Roster',          icon: Contact2 },
  { to: '/admin/reports',             label: 'Official Reports',        icon: FileSpreadsheet },
  { to: '/admin/custom-reports',      label: 'Custom Report Builder',   icon: FileCog },
  { to: '/admin/audit-logs',          label: 'Security Audit Logs',     icon: Lock },
  { to: '/admin/notifications-management',label:'Broadcast Circulars',  icon: Radio },
  { to: '/admin/system-health',       label: 'Infrastructure Health',   icon: Server },
  { to: '/admin/api-integrations',    label: 'Gateway Integrations',    icon: Cable },
  { to: '/admin/ai-configuration',    label: 'AI Model Config',         icon: Cpu },
  { to: '/admin/security-center',     label: 'Security Center',         icon: ShieldAlert },
  { to: '/admin/system-settings',     label: 'System Settings',         icon: Settings },
  { to: '/admin/profile',             label: 'Admin Profile',           icon: UserCog },
]


export default function AppShell() {
  const { user, logout } = useAuthStore()
  const { courseSearchTerm, setCourseSearchTerm } = useSearchStore()
  const navigate = useNavigate()
  const location = useLocation()

  const { data: notifData } = useQuery({
    queryKey: ['myNotifications'],
    queryFn: getMyNotifications,
    enabled: !!user,
    refetchInterval: 30000,
  })

  const role = user?.role ?? 'employee'
  const isTrainerMode = role === 'trainer' || location.pathname.startsWith('/trainer')
  const isAdminMode = role === 'admin' && !isTrainerMode

  // Determine active navigation list
  const navItems = isTrainerMode
    ? [...TRAINER_NAV, ...SUPPORT_NAV]
    : isAdminMode
    ? [...ADMIN_NAV, ...SUPPORT_NAV]
    : [...LEARNER_NAV, ...SUPPORT_NAV]

  const displayName = isTrainerMode
    ? (user?.role === 'trainer' && user?.name ? user.name : 'Amit Verma')
    : (user?.name || 'Rahul Kumar')

  const displayDesignation = isTrainerMode
    ? 'Trainer'
    : (user?.designation || 'Statistical Officer')

  const avatarSrc = isTrainerMode
    ? '/avatars/amit_verma.jpg'
    : (user?.avatarUrl || '/avatars/rahul_kumar.jpg')

  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ───────────────────────────────────────────────────────────── */}
      <aside className={styles.sidebar}>
        <Link to={isTrainerMode ? '/trainer/dashboard' : '/dashboard'} className={styles.logo}>
          <div className={styles.logoMark}>
            <GraduationCap size={22} color="#ffffff" />
          </div>
          <div>
            <div className={styles.logoText}>KaushalAI</div>
            <div className={styles.logoSub}>
              AI {isTrainerMode ? 'Enabled' : 'Powered'} Learning Platform<br />for Official Statistics
            </div>
          </div>
        </Link>

        <nav className={styles.nav} aria-label="Main navigation">
          {navItems.map((item, i) => {
            if (item.section) {
              return (
                <div key={item.section} className={styles.navSection}>
                  {item.section}
                </div>
              )
            }
            const NavIcon = item.icon
            const badgeValue = item.to === '/notifications'
              ? (notifData?.unreadCount ?? item.badge)
              : item.badge

            return (
              <NavLink
                key={item.to + item.label}
                to={item.to}
                className={({ isActive }) => {
                  const isCustomActive = isActive ||
                    (item.to === '/quizzes' && (location.pathname.startsWith('/quizzes') || location.pathname.startsWith('/assessment'))) ||
                    (item.to === '/igot-integration' && location.pathname.startsWith('/igot-integration')) ||
                    (item.to === '/my-learning' && (location.pathname.startsWith('/my-learning') || location.pathname.startsWith('/learning-path'))) ||
                    (item.to === '/certificates' && location.pathname.startsWith('/certificates')) ||
                    (item.to === '/training-effectiveness' && (location.pathname.startsWith('/training-effectiveness') || location.pathname.startsWith('/training/effectiveness'))) ||
                    (item.to === '/trainer/mcq-generator' && location.pathname.startsWith('/trainer/mcq-generator'))
                  return [styles.navLink, isCustomActive ? styles.active : ''].join(' ')
                }}
              >
                <span className={styles.navIcon}>
                  {NavIcon && <NavIcon size={18} />}
                </span>
                <span className={styles.navLabel}>{item.label}</span>
                {badgeValue !== undefined && badgeValue > 0 && (
                  <span className={styles.navBadge}>{badgeValue}</span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* ── AI Assistant Card at Sidebar Bottom ────────────────────────────── */}
        <div className={styles.sidebarAiCard}>
          <div className={styles.aiCardHeader}>
            <div className={styles.aiCardIcon}>
              <Bot size={20} />
            </div>
            <div className={styles.aiCardText}>
              <div className={styles.aiCardTitle}>KaushalAI Assistant</div>
              <div className={styles.aiCardSub}>
                {isTrainerMode
                  ? 'Your AI companion for learning and growth'
                  : 'Your intelligent learning companion'}
              </div>
            </div>
          </div>
          <Link to="/ai-tutor" className={styles.aiAskNowBtn}>
            {isTrainerMode ? 'Ask Anything' : 'Start New Chat'}
          </Link>
        </div>

        {/* ── User Card at Sidebar Bottom ────────────────────────────────────── */}
        <div className={styles.userCard}>
          <div className={styles.avatar}>
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={displayName}
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                onError={(e) => { e.target.style.display = 'none' }}
              />
            ) : initials}
          </div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{displayName}</div>
            <div className={styles.userRole}>{displayDesignation}</div>
          </div>
          <button
            className={styles.logoutBtn}
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ── Main Panel ────────────────────────────────────────────────────────── */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          {/* Left: Menu toggle + Search bar */}
          <div className={styles.topbarLeft}>
            <button
              type="button"
              className={styles.menuToggleBtn}
              aria-label="Toggle Navigation"
            >
              <Menu size={20} />
            </button>
            <div className={styles.searchWrap}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder={
                  isTrainerMode
                    ? 'Search for learners, trainings, courses...'
                    : 'Search for skills, courses, topics...'
                }
                value={courseSearchTerm}
                onChange={(e) => setCourseSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && courseSearchTerm.trim()) {
                    navigate(`/search?q=${encodeURIComponent(courseSearchTerm.trim())}`)
                  }
                }}
                aria-label="Search"
              />
              <Search size={18} className={styles.searchIcon} />
            </div>
          </div>

          {/* Right actions: notification + chat + profile chip */}
          <div className={styles.topbarRight}>
            <Link
              to="/notifications"
              className={styles.topbarIconBtn}
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={19} />
              <span className={styles.topbarBadge}>
                {isTrainerMode ? 6 : (notifData?.unreadCount || 7)}
              </span>
            </Link>

            <Link
              to="/ai-tutor"
              className={styles.topbarIconBtn}
              aria-label="AI Tutor Chat"
              title="AI Tutor Chat"
            >
              <MessageSquare size={18} />
            </Link>

            <Link to={isTrainerMode ? '/trainer/profile' : '/profile'} className={styles.profileChip}>
              <img
                src={avatarSrc}
                alt={displayName}
                className={styles.chipAvatarImg}
                onError={(e) => {
                  e.target.style.display = 'none'
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'
                }}
              />
              <div className={styles.chipAvatarFallback} style={{ display: 'none' }}>
                {initials}
              </div>
              <div className={styles.chipMeta}>
                <span className={styles.chipName}>{displayName}</span>
                <span className={styles.chipRole}>{displayDesignation}</span>
              </div>
            </Link>
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

