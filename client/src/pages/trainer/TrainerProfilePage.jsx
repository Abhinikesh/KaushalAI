import { useAuthStore } from '../../store/authStore'
import { ShieldCheck, BookOpen } from 'lucide-react'
import Badge from '../../components/ui/Badge'

export default function TrainerProfilePage() {
  const { user } = useAuthStore()

  const initials = (user?.name || 'Trainer')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Faculty &amp; Trainer Profile
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Institutional faculty credentials, authenticated designation, and instructional specializations
        </p>
      </div>

      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 'bold',
            }}
          >
            {initials}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                {user?.name || 'Faculty Member'}
              </h2>
              <Badge variant="nssta">Authorized Trainer</Badge>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {user?.email} • Employee ID: <strong>{user?.employeeId || 'Verified Official'}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-5)' }}>
          <div style={{ background: 'var(--color-surface-alt)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Official Designation</span>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>
              {user?.designation || 'Statistical Officer / Trainer'}
            </div>
          </div>

          <div style={{ background: 'var(--color-surface-alt)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Affiliated Division</span>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>
              {user?.department || 'National Statistical Systems Training Academy (NSSTA)'}
            </div>
          </div>

          <div style={{ background: 'var(--color-surface-alt)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Account Role</span>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2, textTransform: 'capitalize' }}>
              {user?.role || 'Trainer'}
            </div>
          </div>

          <div style={{ background: 'var(--color-surface-alt)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Verification Status</span>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2, color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ShieldCheck size={14} /> Roster Authenticated
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: 'var(--space-3)' }}>
            Areas of Instructional Specialisation
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {[
              'Official Statistics Framework',
              'Large Scale Sample Survey Design',
              'National Accounts & GVA Estimation',
              'Data Quality Frameworks (NQAF)',
              'Survey Sampling Variance Estimation',
              'R & Python for Official Statistics',
            ].map((area, i) => (
              <span
                key={i}
                style={{
                  padding: '4px 12px',
                  background: 'var(--color-surface-alt)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-primary)',
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <BookOpen size={12} /> {area}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
