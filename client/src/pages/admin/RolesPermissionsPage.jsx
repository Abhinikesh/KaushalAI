import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ShieldCheck,
  Users,
  CheckCircle2,
  ChevronRight,
  KeyRound,
  Lock,
  FileCheck2,
  UserCheck
} from 'lucide-react'
import { getAdminRolesSummary } from '../../api/admin.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import styles from './RolesPermissionsPage.module.css'

export default function RolesPermissionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['adminRolesSummary'],
    queryFn: getAdminRolesSummary,
  })

  const roles = data?.roles || [
    { _id: 'employee', count: 486 },
    { _id: 'trainer', count: 24 },
    { _id: 'admin', count: 6 }
  ]

  const roleDefinitions = {
    employee: {
      title: 'Statistical Officer / Learner',
      badge: 'igot',
      desc: 'Official cadre statistical investigators, assistants, and officers engaged in capacity assessments, iGOT learning pathways, and competency benchmarking.',
      perms: [
        'Perform diagnostic competency self-assessments',
        'Take official proctored quizzes and certification tests',
        'Enroll in iGOT Karmayogi & NSSTA residential modules',
        'Earn tamper-evident cryptographic micro-credentials',
        'Interact with personalized MoSPI AI Statistical Tutor'
      ],
    },
    trainer: {
      title: 'Academy Faculty / Trainer',
      badge: 'nssta',
      desc: 'NSSTA instructors, subject-matter experts, and syllabus directors creating, approving, and evaluating statistical training programs.',
      perms: [
        'Upload survey manuals, circulars & official course materials',
        'Generate AI MCQs via FastAPI vector RAG engine',
        'Author & validate question stems with item discrimination analytics',
        'Monitor learner cohort longitudinal effectiveness & pre/post gains',
        'Record mentor guidance notes on officer competency files'
      ],
    },
    admin: {
      title: 'System Administrator',
      badge: 'high',
      desc: 'MoSPI Computer Centre & IT Directorate administrators overseeing platform security, cadre roster whitelists, and institutional governance.',
      perms: [
        'Master officer roster management & bulk CSV onboarding',
        'Platform infrastructure & microservice telemetry inspection',
        'Immutable cryptographic audit trail & CERT-In compliance',
        'Organization-wide competency heatmap & workforce forecasting',
        'Full administrative override across all trainer & learner portals'
      ],
    },
  }

  const totalUsers = roles.reduce((acc, r) => acc + (r.count || 0), 0)
  const employeeCount = roles.find(r => r._id === 'employee')?.count ?? 486
  const trainerCount = roles.find(r => r._id === 'trainer')?.count ?? 24
  const adminCount = roles.find(r => r._id === 'admin')?.count ?? 6

  return (
    <div className={styles.container}>
      {/* Breadcrumb Navigation */}
      <nav className={styles.breadcrumb}>
        <Link to="/dashboard">Dashboard</Link>
        <ChevronRight size={13} />
        <Link to="/admin">Admin Governance</Link>
        <ChevronRight size={13} />
        <span className={styles.breadcrumbActive}>Institutional Roles &amp; RBAC</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Institutional Roles &amp; Permissions (RBAC)</h1>
          <p className={styles.subtitle}>
            Cryptographically enforced role boundaries, active account allocations, and institutional capability entitlements
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link to="/admin/users" className={styles.btnSecondary}>
            <Users size={14} /> View All Users
          </Link>
          <Link to="/admin/security" className={styles.btnPrimary}>
            <ShieldCheck size={15} /> Security Policy Center
          </Link>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5' }}>
            <Users size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Total Accounts</div>
            <div className={styles.kpiValue}>{totalUsers} Users</div>
            <div className={styles.kpiHelper}>Active in JWT Database</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9' }}>
            <UserCheck size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Learner Cadre</div>
            <div className={styles.kpiValue}>{employeeCount} Officers</div>
            <div className={styles.kpiHelper}>ISS &amp; SSS Statistical Staff</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <KeyRound size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Academy Faculty</div>
            <div className={styles.kpiValue}>{trainerCount} Trainers</div>
            <div className={styles.kpiHelper}>NSSTA &amp; Division Mentors</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <Lock size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Admin Gateways</div>
            <div className={styles.kpiValue}>{adminCount} Operators</div>
            <div className={styles.kpiHelper}>MoSPI IT Directorate / Computer Centre</div>
          </div>
        </div>
      </div>

      {/* Role Cards Grid */}
      {isLoading ? (
        <div className={styles.roleGrid}>
          <Skeleton height="240px" />
          <Skeleton height="240px" />
          <Skeleton height="240px" />
        </div>
      ) : (
        <div className={styles.roleGrid}>
          {['employee', 'trainer', 'admin'].map((roleKey) => {
            const rCount = roles.find((r) => r._id === roleKey)?.count ?? 0
            const def = roleDefinitions[roleKey]

            return (
              <div key={roleKey} className={styles.roleCard}>
                <div className={styles.roleCardHeader}>
                  <Badge variant={def.badge}>
                    {roleKey.toUpperCase()}
                  </Badge>
                  <span className={styles.roleAccountCount}>
                    {rCount} Active Account{rCount === 1 ? '' : 's'}
                  </span>
                </div>

                <div>
                  <h3 className={styles.roleTitle}>{def.title}</h3>
                  <p className={styles.roleDesc} style={{ marginTop: 6 }}>
                    {def.desc}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14, marginTop: 'auto' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Active JWT Role Entitlements:
                  </span>
                  <ul className={styles.permList}>
                    {def.perms.map((p, idx) => (
                      <li key={idx} className={styles.permItem}>
                        <CheckCircle2 size={14} className={styles.permCheck} />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
