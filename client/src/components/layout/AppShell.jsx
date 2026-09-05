import React, { useState } from 'react'
import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom'

import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  User,
  BarChart3,
  Compass,
  Map,
  BookOpen,
  Landmark,
  GraduationCap,
  PenTool,
  Bot,
  Users,
  Sparkles,
  CheckSquare,
  BarChart2,
  AlertTriangle,
  PieChart,
  Library,
  School,
  FileCheck2,
  Archive,
  Microscope,
  Contact2,
  Lock,
  Radio,
  Server,
  Cable,
  Cpu,
  Settings,
  UserCog,
  Bell,
  MessageSquare,
  LogOut,
  Search,
  Menu,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useSearchStore } from '../../store/searchStore'
import { useUiStore } from '../../store/uiStore'
import { getMyNotifications } from '../../api/userFeatures.api'
import Logo from '../shared/Logo'
import ErrorBoundary from '../ui/ErrorBoundary'
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
  { to: '/mcq-generator',       label: 'AI MCQ Generator',      icon: Sparkles },
  { to: '/quiz-result',         label: 'Quiz Result',           icon: FileCheck2 },

  { to: '/settings',            label: 'Settings',              icon: Settings },
]

const ADMIN_NAV = [
  { section: 'EXECUTIVE & GOVERNANCE' },
  { to: '/admin',                     label: 'Control Tower',           icon: Landmark },
  { to: '/admin/users',               label: 'User Management',         icon: Users },
  { to: '/admin/roster',              label: 'Officer Roster',          icon: Contact2 },

  { section: 'CAPABILITY & ANALYTICS' },
  { to: '/admin/competency-analytics',label: 'Competency Analytics',    icon: BarChart2 },
  { to: '/admin/skill-gap-analytics', label: 'Cadre Skill Gaps',        icon: AlertTriangle },
  { to: '/admin/department-analytics',label: 'Divisional Analytics',    icon: PieChart },
  { to: '/admin/quiz-analytics',      label: 'Psychometric Analytics',  icon: Microscope },

  { section: 'ASSESSMENT & CONTENT ENGINE' },
  { to: '/admin/assessments',         label: 'Assessment Management',   icon: FileCheck2 },
  { to: '/admin/question-bank-management', label: 'Question Bank Admin', icon: Archive },
  { to: '/admin/learners',            label: 'Learners Directory',      icon: Users },
  { to: '/admin/courses',             label: 'Course Registry',         icon: Library },
  { to: '/admin/nssta-management',    label: 'NSSTA Campus Batches',    icon: School },

  { section: 'SYSTEM & INTEGRATIONS' },
  { to: '/admin/notifications-management', label: 'Broadcast Circulars', icon: Radio },
  { to: '/admin/audit-logs',          label: 'Security Audit Logs',     icon: Lock },
  { to: '/admin/system-health',       label: 'Infrastructure Health',   icon: Server },
  { to: '/admin/api-integrations',    label: 'Gateway Integrations',    icon: Cable },
  { to: '/admin/ai-configuration',    label: 'AI Model Config',         icon: Cpu },
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

  const { sidebarCollapsed, toggleSidebar } = useUiStore()

  const role = user?.role ?? 'employee'
  const isAdminMode = role === 'admin' || location.pathname.startsWith('/admin')

  // Determine active navigation list
  const navItems = isAdminMode ? ADMIN_NAV : LEARNER_NAV

  const displayName = user?.name || (isAdminMode ? 'Super Administrator' : 'Rahul Kumar')
  const displayDesignation = user?.designation || (isAdminMode ? 'MoSPI HQ Administrator' : 'Statistical Officer')
  const avatarSrc = user?.avatarUrl || (isAdminMode ? '/avatars/priya_nair.jpg' : '/avatars/rahul_kumar.jpg')

  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const searchInputRef = React.useRef(null)

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={[styles.shell, sidebarCollapsed ? styles.collapsed : ''].filter(Boolean).join(' ')}>
      {/* ── Sidebar ───────────────────────────────────────────────────────────── */}
      <aside className={[styles.sidebar, sidebarCollapsed ? styles.collapsed : ''].filter(Boolean).join(' ')}>
        <Link
          to={isAdminMode ? '/admin' : '/dashboard'}
          className={styles.logo}
          title="KaushalAI"
        >
          <Logo collapsed={sidebarCollapsed} />
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
                title={item.label}
                className={({ isActive }) => {
                  const isCustomActive = isActive ||
                    (item.to === '/skills' && (location.pathname.startsWith('/skills') || location.pathname.startsWith('/competency-framework') || location.pathname.startsWith('/competencies'))) ||
                    (item.to === '/quizzes' && (location.pathname.startsWith('/quizzes') || location.pathname.startsWith('/assessment'))) ||
                    (item.to === '/igot-integration' && location.pathname.startsWith('/igot-integration')) ||
                    (item.to === '/my-learning' && (location.pathname.startsWith('/my-learning') || location.pathname.startsWith('/learning-path'))) ||
                    (item.to === '/mcq-generator' && location.pathname.startsWith('/mcq-generator'))
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

        {/* ── AI Assistant Card at Sidebar Bottom (Employee Only) ──────────────── */}
        {!isAdminMode && (
          <div className={styles.sidebarAiCard} title="KaushalAI Assistant">
            <div className={styles.aiCardHeader}>
              <div className={styles.aiCardIcon}>
                <Bot size={20} />
              </div>
              <div className={styles.aiCardText}>
                <div className={styles.aiCardTitle}>KaushalAI Assistant</div>
                <div className={styles.aiCardSub}>
                  Your intelligent learning companion
                </div>
              </div>
            </div>
            <Link to="/ai-tutor" className={styles.aiAskNowBtn}>
              Start New Chat
            </Link>
          </div>
        )}

        {/* ── User Card at Sidebar Bottom ────────────────────────────────────── */}
        <div className={styles.userCard} title={`${displayName} (${displayDesignation})`}>
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
              aria-label={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-expanded={!sidebarCollapsed}
              onClick={toggleSidebar}
            >
              <Menu size={20} />
            </button>
            <div className={styles.searchWrap}>
              <Search size={16} className={styles.searchIcon} />
              <input
                ref={searchInputRef}
                type="text"
                className={styles.searchInput}
                placeholder={
                  isAdminMode
                    ? 'Search administration, officers, courses...'
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
              <kbd className={styles.searchKbd}>⌘K</kbd>
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
                {notifData?.unreadCount ?? 0}
              </span>
            </Link>

            {!isAdminMode && (
              <Link
                to="/ai-tutor"
                className={styles.topbarIconBtn}
                aria-label="AI Tutor Chat"
                title="AI Tutor Chat"
              >
                <MessageSquare size={18} />
              </Link>
            )}

            <Link to={isAdminMode ? '/admin/profile' : '/profile'} className={styles.profileChip}>
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
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

