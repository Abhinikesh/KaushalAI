import { useState } from 'react'
import Badge from '../../components/ui/Badge'

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState([
    {
      id: 'employee',
      name: 'Learner / Officer',
      usersCount: 164,
      desc: 'Statistical officers, assistants, and field enumerators engaged in learning and competency assessments.',
      perms: ['view_dashboard', 'take_quizzes', 'view_courses', 'self_assess'],
    },
    {
      id: 'trainer',
      name: 'Faculty / Trainer',
      usersCount: 18,
      desc: 'NSSTA instructors, guest faculty, and curriculum directors authoring courses and evaluations.',
      perms: ['view_dashboard', 'take_quizzes', 'view_courses', 'self_assess', 'upload_content', 'generate_mcq', 'build_quizzes', 'view_learner_analytics'],
    },
    {
      id: 'admin',
      name: 'System Administrator',
      usersCount: 4,
      desc: 'MOSPI IT Directorate administrators managing institutional configurations, roster, and framework.',
      perms: ['all_permissions'],
    },
    {
      id: 'auditor',
      name: 'Governance Auditor',
      usersCount: 2,
      desc: 'Read-only compliance officers inspecting audit logs, reports, and training effectiveness metrics.',
      perms: ['view_dashboard', 'view_reports', 'view_audit_logs'],
    },
  ])

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Roles &amp; Access Permissions (RBAC)
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Configure institutional roles, capability boundaries, and authorization access policies
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-5)' }}>
        {roles.map((r) => (
          <div
            key={r.id}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                {r.name}
              </h3>
              <Badge variant="igot">{r.usersCount} Assigned</Badge>
            </div>

            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              {r.desc}
            </p>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', marginTop: 'auto' }}>
              <span style={{ fontSize: 10, fontWeight: 'bold', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Active Capabilities
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {r.perms.map((p, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 10,
                      background: 'var(--color-surface-alt)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    ✓ {p.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
