import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getJobRoles } from '../../api/competency.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function JobRoleManagementPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['adminJobRoles'],
    queryFn: getJobRoles,
  })

  const jobRoles = data?.jobRoles || data || []

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Cadre Job Role Management
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Official job role specifications across Subordinate Statistical Service (SSS) and Indian Statistical Service (ISS)
          </p>
        </div>

        <Link
          to="/admin/role-competency-matrix"
          style={{
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--color-primary-600)',
            color: 'white',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          View Role–Competency Matrix →
        </Link>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
          <Skeleton height="160px" />
          <Skeleton height="160px" />
          <Skeleton height="160px" />
        </div>
      ) : jobRoles.length === 0 ? (
        <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          No job roles defined in database.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
          {jobRoles.map((r) => (
            <div
              key={r._id}
              style={{
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-5)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Badge variant="igot">{r.department || 'Official Cadre'}</Badge>
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  Code: <code>{r.code || 'MOSPI'}</code>
                </span>
              </div>

              <div>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                  {r.title}
                </h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: '4px 0 0' }}>
                  {r.description || 'Core cadre position executing statistical surveys, national accounts, or price index compilation.'}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                <span>Mapped Competencies: <strong>{r.requiredCompetencies?.length || 0} Standards</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
