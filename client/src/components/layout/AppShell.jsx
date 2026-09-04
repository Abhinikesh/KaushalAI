import React, { useState } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
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

const NAV = [
  // ── LEARNER SECTION ──────────────────────────────────────────────────────────
  { section: 'LEARNER' },
  { to: '/dashboard',           label: 'Dashboard',             icon: LayoutDashboard,  roles: ['employee', 'trainer', 'admin'] },
  { to: '/profile',             label: 'My Profile',            icon: User,             roles: ['employee', 'trainer', 'admin'] },
  { to: '/skills',              label: 'Skills & Competencies', icon: BarChart3,        roles: ['employee', 'trainer', 'admin'] },
  { to: '/skill-gaps',          label: 'Skill Gap Analysis',    icon: TrendingUp,       roles: ['employee', 'trainer', 'admin'] },
  { to: '/recommendations',     label: 'Recommended Learning',  icon: Compass,          roles: ['employee', 'trainer', 'admin'] },
  { to: '/my-learning',         label: 'Learning Path',         icon: Map,              roles: ['employee', 'trainer', 'admin'] },
  { to: '/courses/igot',        label: 'Courses (iGOT)',        icon: BookOpen,         roles: ['employee', 'trainer', 'admin'] },
  { to: '/training/nssta',      label: 'NSSTA/TPAC Training',   icon: Landmark,         roles: ['employee', 'trainer', 'admin'] },
  { to: '/quizzes',             label: 'Assessments & Quizzes', icon: PenTool,          roles: ['employee', 'trainer', 'admin'] },
  { to: '/ai-tutor',            label: 'AI Tutor / Assistant',  icon: Bot,              roles: ['employee', 'trainer', 'admin'] },
  { to: '/learning-history',    label: 'Learning History',      icon: History,          roles: ['employee', 'trainer', 'admin'] },
  { to: '/certificates',        label: 'Certificates',          icon: Award,            roles: ['employee', 'trainer', 'admin'] },
  { to: '/achievements',        label: 'Achievements',          icon: Trophy,           roles: ['employee', 'trainer', 'admin'] },

  // ── QUICK LINKS SECTION ──────────────────────────────────────────────────────
  { section: 'QUICK LINKS' },
  { to: '/trainer/upload',      label: 'Upload Material',       icon: Upload,           roles: ['employee', 'trainer', 'admin'] },
  { to: '/notifications',       label: 'Notifications',         icon: Bell,             roles: ['employee', 'trainer', 'admin'], badge: 5 },

  // ── SUPPORT SECTION ──────────────────────────────────────────────────────────
  { section: 'SUPPORT' },
  { to: '/support',             label: 'Help & Support',        icon: HelpCircle,       roles: ['employee', 'trainer', 'admin'] },
  { to: '/support#faq',         label: 'FAQ',                   icon: HelpCircle,       roles: ['employee', 'trainer', 'admin'] },

  // ── TRAINER & FACULTY SECTION ────────────────────────────────────────────────
  { section: 'FACULTY & TRAINER' },
  { to: '/trainer/dashboard',     label: 'Trainer Dashboard',   icon: LayoutDashboard,  roles: ['trainer', 'admin'] },
  { to: '/trainer/profile',       label: 'Faculty Profile',     icon: User,             roles: ['trainer', 'admin'] },
  { to: '/trainer/programmes',    label: 'Training Programmes', icon: FolderKanban,     roles: ['trainer', 'admin'] },
  { to: '/trainer/learners',      label: 'Learners Directory',  icon: Users,            roles: ['trainer', 'admin'] },
  { to: '/trainer/mcq-generator', label: 'AI MCQ Generator',    icon: Zap,              roles: ['trainer', 'admin'] },
  { to: '/trainer/quiz-builder',  label: 'AI Quiz Builder',     icon: SlidersHorizontal,roles: ['trainer', 'admin'] },
  { to: '/trainer/question-bank', label: 'Question Bank',       icon: Database,         roles: ['trainer', 'admin'] },
  { to: '/trainer/assessments',   label: 'Assessments Admin',   icon: ClipboardList,    roles: ['trainer', 'admin'] },
  { to: '/trainer/analytics',     label: 'Training Analytics',  icon: LineChart,        roles: ['trainer', 'admin'] },

  // ── EXECUTIVE & ADMIN GOVERNANCE ─────────────────────────────────────────────
  { section: 'EXECUTIVE & GOVERNANCE' },
  { to: '/admin',                     label: 'Control Tower',           icon: Landmark,       roles: ['admin'] },
  { to: '/admin/users',               label: 'User Management',         icon: Users,          roles: ['admin'] },
  { to: '/admin/roles',               label: 'Roles & RBAC',            icon: Shield,         roles: ['admin'] },
  { to: '/admin/departments',         label: 'Departments / DES',      icon: Building2,      roles: ['admin'] },
  { to: '/admin/job-roles',           label: 'Cadre Job Roles',         icon: Briefcase,      roles: ['admin'] },
  { to: '/admin/competency-framework',label: 'Competency Framework',    icon: Layers,         roles: ['admin'] },
  { to: '/admin/skill-taxonomy',      label: 'AI Skill Taxonomy',       icon: Tag,            roles: ['admin'] },
  { to: '/admin/role-competency-matrix',label:'Role–Skill Matrix',      icon: Grid,           roles: ['admin'] },
  { to: '/admin/competency-analytics',label: 'Competency Analytics',    icon: BarChart2,      roles: ['admin'] },
  { to: '/admin/skill-gap-analytics', label: 'Cadre Skill Gaps',        icon: AlertTriangle,  roles: ['admin'] },
  { to: '/admin/department-analytics',label: 'Divisional Analytics',    icon: PieChart,       roles: ['admin'] },
  { to: '/admin/workforce-analytics', label: 'Workforce Capability',    icon: UserPlus,       roles: ['admin'] },
  { to: '/admin/predictive-insights', label: 'Predictive Insights',     icon: Sparkles,       roles: ['admin'] },
  { to: '/admin/training-effectiveness',label:'Training Outcomes',      icon: TrendingUp,     roles: ['admin'] },
  { to: '/admin/courses',             label: 'Course Registry',         icon: Library,        roles: ['admin'] },
  { to: '/admin/igot-integration',    label: 'iGOT Gateway Status',     icon: RefreshCw,      roles: ['admin'] },
  { to: '/admin/nssta-management',    label: 'NSSTA Campus Batches',    icon: School,         roles: ['admin'] },
  { to: '/admin/learning-path-management',label:'Learning Path Rules',  icon: GitFork,        roles: ['admin'] },
  { to: '/admin/content-library',     label: 'Content Library',         icon: FolderGit2,     roles: ['admin'] },
  { to: '/admin/assessment-management',label:'Assessment Governance',   icon: FileCheck2,     roles: ['admin'] },
  { to: '/admin/question-bank-management',label:'Question Bank Admin',  icon: Archive,        roles: ['admin'] },
  { to: '/admin/quiz-analytics',      label: 'Psychometric Analytics',  icon: Microscope,     roles: ['admin'] },
  { to: '/admin/roster',              label: 'Officer Roster',          icon: Contact2,       roles: ['admin'] },
  { to: '/admin/reports',             label: 'Official Reports',        icon: FileSpreadsheet,roles: ['admin'] },
  { to: '/admin/custom-reports',      label: 'Custom Report Builder',   icon: FileCog,        roles: ['admin'] },
  { to: '/admin/audit-logs',          label: 'Security Audit Logs',     icon: Lock,           roles: ['admin'] },
  { to: '/admin/notifications-management',label:'Broadcast Circulars',  icon: Radio,          roles: ['admin'] },
  { to: '/admin/system-health',       label: 'Infrastructure Health',   icon: Server,         roles: ['admin'] },
  { to: '/admin/api-integrations',    label: 'Gateway Integrations',    icon: Cable,          roles: ['admin'] },
  { to: '/admin/ai-configuration',    label: 'AI Model Config',         icon: Cpu,            roles: ['admin'] },
  { to: '/admin/security-center',     label: 'Security Center',         icon: ShieldAlert,    roles: ['admin'] },
  { to: '/admin/system-settings',     label: 'System Settings',         icon: Settings,       roles: ['admin'] },
  { to: '/admin/profile',             label: 'Admin Profile',           icon: UserCog,        roles: ['admin'] },
]

export default function AppShell() {
  const { user, logout } = useAuthStore()
  const { courseSearchTerm, setCourseSearchTerm } = useSearchStore()
  const navigate = useNavigate()

  const { data: notifData } = useQuery({
    queryKey: ['myNotifications'],
    queryFn: getMyNotifications,
    enabled: !!user,
    refetchInterval: 30000,
  })

  const role = user?.role ?? 'employee'
  const displayName = user?.name || 'Rahul Kumar'
  const displayDesignation = user?.designation || 'Statistical Officer'
  const avatarSrc = user?.avatarUrl || '/avatars/rahul_kumar.jpg'

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
        <Link to="/dashboard" className={styles.logo}>
          <div className={styles.logoMark}>
            <GraduationCap size={22} color="#ffffff" />
          </div>
          <div>
            <div className={styles.logoText}>KaushalAI</div>
            <div className={styles.logoSub}>
              AI Powered Learning Platform<br />for Official Statistics
            </div>
          </div>
        </Link>

        <nav className={styles.nav} aria-label="Main navigation">
          {NAV.map((item, i) => {
            if (item.section) {
              const hasItems = NAV.slice(i + 1).some(
                (n) => !n.section && n.roles?.includes(role)
              )
              return hasItems ? (
                <div key={item.section} className={styles.navSection}>
                  {item.section}
                </div>
              ) : null
            }
            if (!item.roles?.includes(role)) return null
            const NavIcon = item.icon
            const badgeValue = item.to === '/notifications'
              ? (notifData?.unreadCount ?? item.badge)
              : item.badge

            return (
              <NavLink
                key={item.to + item.label}
                to={item.to}
                className={({ isActive }) =>
                  [styles.navLink, isActive ? styles.active : ''].join(' ')
                }
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
        <Link to="/ai-tutor" className={styles.sidebarAiCard}>
          <div className={styles.aiCardIcon}>
            <Bot size={20} />
          </div>
          <div className={styles.aiCardText}>
            <div className={styles.aiCardTitle}>AI Assistant</div>
            <div className={styles.aiCardSub}>Ask me anything about learning or skills...</div>
          </div>
        </Link>

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
                placeholder="Search for skills, courses, topics..."
                value={courseSearchTerm}
                onChange={(e) => setCourseSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && courseSearchTerm.trim()) {
                    navigate(`/search?q=${encodeURIComponent(courseSearchTerm.trim())}`)
                  }
                }}
                aria-label="Search for skills, courses, topics"
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
                {notifData?.unreadCount || 5}
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

            <Link to="/profile" className={styles.profileChip}>
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
