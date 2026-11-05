import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
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
  FlaskConical,
  Sun,
  Moon,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useSearchStore } from '../../store/searchStore'
import { useUiStore } from '../../store/uiStore'
import { getMyNotifications } from '../../api/userFeatures.api'
import Logo from '../shared/Logo'
import ErrorBoundary from '../ui/ErrorBoundary'
import styles from './AppShell.module.css'

// Virtual Labs URL — set via VITE_LABS_APP_URL in .env
const LABS_URL = import.meta.env.VITE_LABS_APP_URL || 'https://kaushal-ai-virtual-labs.vercel.app'

function useLearnerNav(t) {
  return [
    { section: t('nav.section_learner') },
    { to: '/dashboard',        label: t('nav.dashboard'),            icon: LayoutDashboard },
    { to: '/profile',          label: t('nav.my_profile'),           icon: User },
    { to: '/skills',           label: t('nav.skills'),               icon: BarChart3 },
    { to: '/skill-gaps',       label: t('nav.skill_gaps'),           icon: BarChart2 },
    { to: '/recommendations',  label: t('nav.recommended_learning'), icon: Compass },
    { to: '/my-learning',      label: 'My Learning',                 icon: Map },
    { to: '/courses/igot',     label: t('nav.courses_igot'),         icon: BookOpen },
    { to: '/quizzes',          label: t('nav.assessments_quizzes'),  icon: PenTool },
    { to: '/ai-tutor',         label: t('nav.ai_tutor'),             icon: Bot },
    { to: '/mcq-generator',    label: t('nav.mcq_generator'),        icon: Sparkles },
    // External link — opens Virtual Labs app in a new tab
    { to: LABS_URL, label: 'Hands-on Labs', icon: FlaskConical, external: true },
    { to: '/quiz-result',      label: t('nav.quiz_result'),          icon: FileCheck2 },
    { to: '/settings',         label: t('nav.settings'),             icon: Settings },
  ]
}

function useAdminNav(t) {
  return [
    { section: t('nav.section_exec') },
    { to: '/admin',                          label: t('nav.control_tower'),          icon: Landmark },
    { to: '/admin/users',                    label: t('nav.user_management'),        icon: Users },
    { to: '/admin/roster',                   label: t('nav.officer_roster'),         icon: Contact2 },

    { section: t('nav.section_capability') },
    { to: '/admin/competency-analytics',     label: t('nav.competency_analytics'),   icon: BarChart2 },
    { to: '/admin/skill-gap-analytics',      label: t('nav.cadre_skill_gaps'),       icon: AlertTriangle },
    { to: '/admin/department-analytics',     label: t('nav.divisional_analytics'),   icon: PieChart },
    { to: '/admin/quiz-analytics',           label: t('nav.psychometric_analytics'), icon: Microscope },

    { section: t('nav.section_assessment') },
    { to: '/admin/assessments',              label: t('nav.assessment_management'),  icon: FileCheck2 },
    { to: '/admin/question-bank-management', label: t('nav.question_bank_admin'),    icon: Archive },
    { to: '/admin/learners',                 label: t('nav.learners_directory'),     icon: Users },
    { to: '/admin/courses',                  label: t('nav.course_registry'),        icon: Library },

    { section: t('nav.section_system') },
    { to: '/admin/notifications-management', label: t('nav.broadcast_circulars'),    icon: Radio },
    { to: '/admin/audit-logs',               label: t('nav.security_audit_logs'),    icon: Lock },
    { to: '/admin/system-health',            label: t('nav.infrastructure_health'),  icon: Server },
    { to: '/admin/api-integrations',         label: t('nav.gateway_integrations'),   icon: Cable },
    { to: '/admin/ai-configuration',         label: t('nav.ai_model_config'),        icon: Cpu },
    { to: '/admin/system-settings',          label: t('nav.system_settings'),        icon: Settings },
    { to: '/admin/profile',                  label: t('nav.admin_profile'),          icon: UserCog },
  ]
}

export default function AppShell() {
  const { t } = useTranslation()
  const { user, logout } = useAuthStore()
  const { courseSearchTerm, setCourseSearchTerm } = useSearchStore()
  const navigate = useNavigate()
  const location = useLocation()

  // Admin search state
  const [adminQuery, setAdminQuery] = useState('')
  const [adminResults, setAdminResults] = useState([])
  const [showAdminResults, setShowAdminResults] = useState(false)
  const [activeResultIdx, setActiveResultIdx] = useState(-1)
  const adminSearchRef = useRef(null)

  const { data: notifData } = useQuery({
    queryKey: ['myNotifications'],
    queryFn: getMyNotifications,
    enabled: !!user,
    refetchInterval: 30000,
  })

  const { sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useUiStore()

  const role = user?.role ?? 'employee'
  // isAdminMode is determined SOLELY by the user's actual role, never by URL.
  // This prevents admin nav from leaking onto learner routes and vice versa.
  const isAdminMode = role === 'admin'

  // Determine active navigation list (hooks called unconditionally)
  const learnerNav = useLearnerNav(t)
  const adminNav = useAdminNav(t)
  const navItems = isAdminMode ? adminNav : learnerNav

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

  // Build searchable admin nav items (flat, no section headers)
  const searchableAdminNav = adminNav.filter((item) => item.to && item.label)

  const handleAdminSearch = (val) => {
    setAdminQuery(val)
    setActiveResultIdx(-1)
    if (!val.trim()) {
      setAdminResults([])
      setShowAdminResults(false)
      return
    }
    const q = val.toLowerCase()
    const matched = searchableAdminNav.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.to.toLowerCase().includes(q)
    )
    setAdminResults(matched)
    setShowAdminResults(true)
  }

  const handleAdminResultClick = (item) => {
    navigate(item.to)
    setAdminQuery('')
    setAdminResults([])
    setShowAdminResults(false)
    setActiveResultIdx(-1)
  }

  const handleAdminKeyDown = (e) => {
    if (!showAdminResults || adminResults.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveResultIdx((i) => Math.min(i + 1, adminResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveResultIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = activeResultIdx >= 0 ? adminResults[activeResultIdx] : adminResults[0]
      if (target) handleAdminResultClick(target)
    } else if (e.key === 'Escape') {
      setShowAdminResults(false)
      setActiveResultIdx(-1)
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (adminSearchRef.current && !adminSearchRef.current.contains(e.target)) {
        setShowAdminResults(false)
        setActiveResultIdx(-1)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
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

            // External link items (e.g. Hands-on Labs) use <a> with target=_blank
            if (item.external) {
              return (
                <a
                  key={item.to + item.label}
                  href={item.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={item.label}
                  className={styles.navLink}
                >
                  <span className={styles.navIcon}>
                    {NavIcon && <NavIcon size={18} />}
                  </span>
                  <span className={styles.navLabel}>{item.label}</span>
                  {item.textBadge && (
                    <span className={styles.navTextBadge}>{item.textBadge}</span>
                  )}
                </a>
              )
            }

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
          <div className={styles.sidebarAiCard} title={t('ai_card.title')}>
            <div className={styles.aiCardHeader}>
              <div className={styles.aiCardIcon}>
                <Bot size={20} />
              </div>
              <div className={styles.aiCardText}>
                <div className={styles.aiCardTitle}>{t('ai_card.title')}</div>
                <div className={styles.aiCardSub}>
                  {t('ai_card.subtitle')}
                </div>
              </div>
            </div>
            <Link to="/ai-tutor" className={styles.aiAskNowBtn}>
              {t('ai_card.start_chat')}
            </Link>
          </div>
        )}

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
            title={t('topbar.sign_out')}
            aria-label={t('topbar.sign_out')}
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
              aria-label={sidebarCollapsed ? t('topbar.expand_sidebar') : t('topbar.collapse_sidebar')}
              title={sidebarCollapsed ? t('topbar.expand_sidebar') : t('topbar.collapse_sidebar')}
              aria-expanded={!sidebarCollapsed}
              onClick={toggleSidebar}
            >
              <Menu size={20} />
            </button>
            {/* Search — admin mode: navigate to page | learner mode: /search route */}
            {isAdminMode ? (
              <div className={styles.searchWrap} ref={adminSearchRef}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  ref={searchInputRef}
                  type="text"
                  className={styles.searchInput}
                  placeholder={t('topbar.search_admin')}
                  value={adminQuery}
                  onChange={(e) => handleAdminSearch(e.target.value)}
                  onKeyDown={handleAdminKeyDown}
                  aria-label="Search admin pages"
                  autoComplete="off"
                />
                <kbd className={styles.searchKbd}>⌘K</kbd>

                {showAdminResults && (
                  <div className={styles.adminSearchDropdown}>
                    {adminResults.length === 0 ? (
                      <div className={styles.adminSearchEmpty}>No pages found for "{adminQuery}"</div>
                    ) : (
                      adminResults.map((item, idx) => {
                        const Icon = item.icon
                        return (
                          <button
                            key={item.to}
                            type="button"
                            className={[
                              styles.adminSearchResult,
                              idx === activeResultIdx ? styles.adminSearchResultActive : '',
                            ].join(' ')}
                            onMouseDown={() => handleAdminResultClick(item)}
                          >
                            <span className={styles.adminSearchResultIcon}>
                              {Icon && <Icon size={15} />}
                            </span>
                            <span className={styles.adminSearchResultLabel}>{item.label}</span>
                            <span className={styles.adminSearchResultPath}>{item.to}</span>
                          </button>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.searchWrap}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  ref={searchInputRef}
                  type="text"
                  className={styles.searchInput}
                  placeholder={t('topbar.search_learner')}
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
            )}
          </div>

          {/* Right actions: notification + chat + profile chip */}
          <div className={styles.topbarRight}>
            <button
              type="button"
              className={styles.topbarIconBtn}
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <Link
              to="/notifications"
              className={styles.topbarIconBtn}
              aria-label={t('topbar.notifications')}
              title={t('topbar.notifications')}
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
                aria-label={t('topbar.ai_tutor_chat')}
                title={t('topbar.ai_tutor_chat')}
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

