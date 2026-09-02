import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import styles from './AppShell.module.css'

const NAV = [
  { to: '/dashboard',    label: 'Dashboard',       icon: '⬡', roles: ['employee','trainer','admin'] },
  { to: '/my-learning',  label: 'My Learning',     icon: '📚', roles: ['employee','trainer','admin'] },
  { to: '/quizzes',      label: 'Quizzes',         icon: '✏️', roles: ['employee','trainer','admin'] },
  { section: 'Trainer' },
  { to: '/upload',       label: 'Upload Material', icon: '⬆',  roles: ['trainer','admin'] },
  { section: 'Admin' },
  { to: '/admin',        label: 'Admin Dashboard', icon: '⚙',  roles: ['admin'] },
  { to: '/admin/roster', label: 'Officer Roster',  icon: '👥', roles: ['admin'] },
]

const PAGE_TITLES = {
  '/dashboard':     'Dashboard',
  '/my-learning':   'My Learning Path',
  '/quizzes':       'Quizzes',
  '/upload':        'Upload Material',
  '/admin':         'Admin Dashboard',
  '/admin/roster':  'Officer Roster',
}

export default function AppShell() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const role = user?.role ?? 'employee'
  const initials = (user?.name ?? 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
  const pageTitle = PAGE_TITLES[pathname] ?? 'KaushalAI'

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>K</div>
          <div>
            <div className={styles.logoText}>KaushalAI</div>
            <div className={styles.logoSub}>iGOT Karmayogi</div>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Main navigation">
          {NAV.map((item, i) => {
            if (item.section) {
              const hasItems = NAV.slice(i+1).some(n => !n.section && n.roles?.includes(role))
              return hasItems
                ? <div key={item.section} className={styles.navSection}>{item.section}</div>
                : null
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

        <div className={styles.userCard}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.name ?? 'User'}</div>
            <div className={styles.userRole}>{role}</div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Sign out" aria-label="Sign out">
            ⏏
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <span className={styles.topbarTitle}>{pageTitle}</span>
          <div className={styles.topbarRight}>
            <span className={styles.rolePill}>{role}</span>
          </div>
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
