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
  { to: '/skills',              label: 'Skills & Competency',   icon: BarChart3,        roles: ['employee', 'trainer', 'admin'] },
  { to: '/skill-gaps',          label: 'Skill Gap Analysis',    icon: TrendingUp,       roles: ['employee', 'trainer', 'admin'] },
  { to: '/recommendations',     label: 'Recommended Learning',  icon: Compass,          roles: ['employee', 'trainer', 'admin'] },
  { to: '/my-learning',         label: 'My Learning Path',      icon: Map,              roles: ['employee', 'trainer', 'admin'] },
  { to: '/courses/igot',        label: 'iGOT Courses',          icon: BookOpen,         roles: ['employee', 'trainer', 'admin'] },
  { to: '/training/nssta',      label: 'NSSTA Training',        icon: Landmark,         roles: ['employee', 'trainer', 'admin'] },
  { to: '/my-courses',          label: 'My Enrolments',         icon: GraduationCap,    roles: ['employee', 'trainer', 'admin'] },
  { to: '/quizzes',             label: 'Assessments & Quizzes', icon: PenTool,          roles: ['employee', 'trainer', 'admin'] },
  { to: '/assessments/history', label: 'Assessment History',    icon: FileText,         roles: ['employee', 'trainer', 'admin'] },
  { to: '/ai-tutor',            label: 'AI Tutor / Assistant',  icon: Bot,              roles: ['employee', 'trainer', 'admin'] },

  // ── ACTIVITY & PROGRESS ──────────────────────────────────────────────────────
  { section: 'PROGRESS & RECOGNITION' },
  { to: '/learning-history',    label: 'Learning History',      icon: History,          roles: ['employee', 'trainer', 'admin'] },
  { to: '/certificates',        label: 'Certificates',          icon: Award,            roles: ['employee', 'trainer', 'admin'] },
  { to: '/achievements',        label: 'Achievements',          icon: Trophy,           roles: ['employee', 'trainer', 'admin'] },

  // ── TRAINER & FACULTY SECTION ────────────────────────────────────────────────
  { section: 'FACULTY & TRAINER' },
  { to: '/trainer/dashboard',     label: 'Trainer Dashboard',   icon: LayoutDashboard,  roles: ['trainer', 'admin'] },
  { to: '/trainer/profile',       label: 'Faculty Profile',     icon: User,             roles: ['trainer', 'admin'] },
  { to: '/trainer/programmes',    label: 'Training Programmes', icon: FolderKanban,     roles: ['trainer', 'admin'] },
  { to: '/trainer/learners',      label: 'Learners Directory',  icon: Users,            roles: ['trainer', 'admin'] },
  { to: '/trainer/upload',        label: 'Upload Material',     icon: Upload,           roles: ['trainer', 'admin'] },
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

  // ── SYSTEM & SUPPORT ─────────────────────────────────────────────────────────
  { section: 'SYSTEM & SUPPORT' },
  { to: '/notifications',       label: 'Notifications',         icon: Bell,           roles: ['employee', 'trainer', 'admin'] },
  { to: '/settings',            label: 'Settings',              icon: Settings,       roles: ['employee', 'trainer', 'admin'] },
  { to: '/support',             label: 'Help & Support',        icon: HelpCircle,     roles: ['employee', 'trainer', 'admin'] },
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
            const NavIcon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [styles.navLink, isActive ? styles.active : ''].join(' ')
                }
              >
                <span className={styles.navIcon}>
                  {NavIcon && <NavIcon size={16} />}
                </span>
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* ── Need Help Card ─────────────────────────────────────────────────── */}
        <Link to="/ai-tutor/chat" className={styles.sidebarHelpCard}>
          <div className={styles.helpIcon}>
            <MessageSquare size={16} />
          </div>
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
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ── Main Panel ────────────────────────────────────────────────────────── */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          {/* Search bar on left */}
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} style={{ color: 'var(--color-text-tertiary)', marginRight: 'var(--space-2)' }} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search courses, skills... (press Enter)"
              value={courseSearchTerm}
              onChange={(e) => setCourseSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && courseSearchTerm.trim()) {
                  navigate(`/search?q=${encodeURIComponent(courseSearchTerm.trim())}`)
                }
              }}
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
              <Bell size={18} />
              {notifData?.unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    background: 'var(--color-primary-600)',
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 'bold',
                    borderRadius: 'var(--radius-full)',
                    padding: '1px 5px',
                    lineHeight: 1.2,
                  }}
                >
                  {notifData.unreadCount}
                </span>
              )}
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
