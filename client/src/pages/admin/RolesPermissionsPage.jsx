import { useQuery } from '@tanstack/react-query'
import { getAdminRolesSummary } from '../../api/admin.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function RolesPermissionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['adminRolesSummary'],
    queryFn: getAdminRolesSummary,
  })

  const roles = data?.roles || []

  const roleDefinitions = {
    employee: {
      title: 'Statistical Officer / Learner',
      desc: 'Official cadre statistical investigators, assistants, and officers engaged in capacity assessments and courses.',
      perms: ['Competency self-assessments', 'Take official quizzes', 'Enroll in iGOT & NSSTA modules', 'Earn verified certificates', 'Interact with AI Tutor'],
    },
    trainer: {
      title: 'Academy Faculty / Trainer',
      desc: 'NSSTA instructors, subject-matter experts, and syllabus directors creating and evaluating statistical training.',
      perms: ['Upload course manuals & materials', 'Generate AI MCQs via FastAPI vector engine', 'Manage quizzes & test banks', 'Monitor learner cohort effectiveness', 'Inspect assessment metrics'],
    },
    admin: {
      title: 'System Administrator',
      desc: 'MOSPI IT Directorate administrators overseeing platform infrastructure, roster, and framework taxonomy.',
      perms: ['Officer roster management & CSV onboarding', 'Microservice system health monitoring', 'Security audit log inspection', 'Organization-wide competency heatmap', 'All trainer capabilities'],
    },
  }

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Institutional Roles &amp; Permissions (RBAC)
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Cryptographically enforced role boundaries, active account counts, and institutional capability entitlements
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-5)' }}>
          <Skeleton height="200px" />
          <Skeleton height="200px" />
          <Skeleton height="200px" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-5)' }}>
          {['employee', 'trainer', 'admin'].map((roleKey) => {
            const rCount = roles.find((r) => r._id === roleKey)?.count ?? 0
            const def = roleDefinitions[roleKey]

            return (
              <div
                key={roleKey}
                style={{
                  background: 'var(--color-surface)',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--space-6)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Badge variant={roleKey === 'admin' ? 'high' : roleKey === 'trainer' ? 'nssta' : 'igot'}>
                    {roleKey.toUpperCase()}
                  </Badge>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                    {rCount} Active Account{rCount === 1 ? '' : 's'}
                  </span>
                </div>

                <div>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: 0 }}>
                    {def.title}
                  </h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: '4px 0 0', lineHeight: 1.5 }}>
                    {def.desc}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', marginTop: 'auto' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    Active JWT Role Capabilities:
                  </span>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {def.perms.map((p, idx) => (
                      <li key={idx}>{p}</li>
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
