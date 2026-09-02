import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useSearchStore } from '../../store/searchStore'
import styles from './AppShell.module.css'

const NAV = [
  // ── LEARNER SECTION ──────────────────────────────────────────────────────────
  { section: 'LEARNER' },
  { to: '/dashboard',           label: 'Dashboard',             icon: '⬡',  roles: ['employee', 'trainer', 'admin'] },
  { to: '/profile',             label: 'My Profile',            icon: '👤', roles: ['employee', 'trainer', 'admin'] },
  { to: '/skills',              label: 'Skills & Competency',   icon: '📊', roles: ['employee', 'trainer', 'admin'] },
  { to: '/skill-gaps',          label: 'Skill Gap Analysis',    icon: '📈', roles: ['employee', 'trainer', 'admin'] },
  { to: '/recommendations',     label: 'Recommended Learning',  icon: '🎯', roles: ['employee', 'trainer', 'admin'] },
  { to: '/my-learning',         label: 'My Learning Path',      icon: '🗺️', roles: ['employee', 'trainer', 'admin'] },
  { to: '/courses/igot',        label: 'iGOT Courses',          icon: '📘', roles: ['employee', 'trainer', 'admin'] },
  { to: '/training/nssta',      label: 'NSSTA Training',        icon: '🏛️', roles: ['employee', 'trainer', 'admin'] },
  { to: '/my-courses',          label: 'My Enrolments',         icon: '📚', roles: ['employee', 'trainer', 'admin'] },
  { to: '/quizzes',             label: 'Assessments & Quizzes', icon: '✏️', roles: ['employee', 'trainer', 'admin'] },
  { to: '/assessments/history', label: 'Assessment History',    icon: '📝', roles: ['employee', 'trainer', 'admin'] },
  { to: '/ai-tutor',            label: 'AI Tutor / Assistant',  icon: '🤖', roles: ['employee', 'trainer', 'admin'] },

  // ── ACTIVITY & PROGRESS ──────────────────────────────────────────────────────
  { section: 'PROGRESS & RECOGNITION' },
  { to: '/learning-history',    label: 'Learning History',      icon: '📜', roles: ['employee', 'trainer', 'admin'] },
  { to: '/certificates',        label: 'Certificates',          icon: '🎖️', roles: ['employee', 'trainer', 'admin'] },
  { to: '/achievements',        label: 'Achievements',          icon: '🏆', roles: ['employee', 'trainer', 'admin'] },

  // ── TRAINER SECTION ──────────────────────────────────────────────────────────
  { section: 'TRAINER' },
  { to: '/upload',              label: 'Upload Material',       icon: '⬆',  roles: ['trainer', 'admin'] },

  // ── ADMIN SECTION ────────────────────────────────────────────────────────────
  { section: 'ADMIN' },
  { to: '/admin/users',         label: 'User Management',       icon: '👥', roles: ['admin'] },
  { to: '/admin',               label: 'Department Analytics',  icon: '🏛️', roles: ['admin'] },
  { to: '/admin/training',      label: 'Training Effectiveness',icon: '📈', roles: ['admin'] },
  { to: '/admin/roster',        label: 'Officer Roster',        icon: '📋', roles: ['admin'] },
  { to: '/admin/reports',       label: 'Reports & Insights',    icon: '📄', roles: ['admin'] },

  // ── SYSTEM & SUPPORT ─────────────────────────────────────────────────────────
  { section: 'SYSTEM & SUPPORT' },
  { to: '/notifications',       label: 'Notifications',         icon: '🔔', roles: ['employee', 'trainer', 'admin'] },
  { to: '/settings',            label: 'Settings',              icon: '⚙️', roles: ['employee', 'trainer', 'admin'] },
  { to: '/support',             label: 'Help & Support',        icon: '❓', roles: ['employee', 'trainer', 'admin'] },
]

export default function AppShell() {
  const { user, logout } = useAuthStore()
  const { courseSearchTerm, setCourseSearchTerm } = useSearchStore()
  const navigate = useNavigate()

  const role = user?.role ?? 'employee'
  const initials = (user?.name ?? 'U')
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
        <div className={styles.logo}>
          <div className={styles.logoMark}>K</div>
          <div>
            <div className={styles.logoText}>KaushalAI</div>
            <div className={styles.logoSub}>iGOT Karmayogi · MOSPI</div>
          </div>
        </div>

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
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [styles.navLink, isActive ? styles.active : ''].join(' ')
                }
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* ── Need Help Card ─────────────────────────────────────────────────── */}
        <Link to="/ai-tutor/chat" className={styles.sidebarHelpCard}>
          <div className={styles.helpIcon}>💬</div>
          <div>
            <div className={styles.helpTitle}>Need Help?</div>
            <div className={styles.helpSub}>Ask AI Assistant</div>
          </div>
        </Link>

        {/* ── User Card ─────────────────────────────────────────────────────── */}
        <div className={styles.userCard}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.name ?? 'User'}</div>
            <div className={styles.userRole}>{user?.designation || role}</div>
          </div>
          <button
            className={styles.logoutBtn}
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
          >
            ⏏
          </button>
        </div>
      </aside>

      {/* ── Main Panel ────────────────────────────────────────────────────────── */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          {/* Search bar on left */}
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search your courses..."
              value={courseSearchTerm}
              onChange={(e) => setCourseSearchTerm(e.target.value)}
              aria-label="Search your courses"
            />
          </div>

          {/* Right actions: notification + profile chip */}
          <div className={styles.topbarRight}>
            <Link
              to="/notifications"
              className={styles.bellBtn}
              aria-label="Notifications"
              title="Notifications"
            >
              🔔
              <span className={styles.bellDot} />
            </Link>

            <Link to="/profile" className={styles.profileChip}>
              <div className={styles.chipAvatar}>{initials}</div>
              <div className={styles.chipMeta}>
                <span className={styles.chipName}>{user?.name ?? 'Officer'}</span>
                <span className={styles.chipRole}>{user?.designation || 'Statistical Officer'}</span>
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
