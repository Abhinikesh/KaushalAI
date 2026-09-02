import { useAuthStore } from '../../store/authStore'
import Badge from '../../components/ui/Badge'

export default function AdminProfilePage() {
  const { user } = useAuthStore()

  return (
    <div style={{ maxWidth: 850, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          System Administrator Profile
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Master governance credentials and administrative cryptographic access signatures
        </p>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, #dc2626, #f97316)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
            👑
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                {user?.name || 'Central Administrator'}
              </h2>
              <Badge variant="high">Superuser</Badge>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {user?.email || 'admin@mospi.gov.in'} • Admin Node: <strong>KAUSH-NODE-01</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
          <div style={{ background: 'var(--color-surface-alt)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Privilege Tier</span>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>Tier 1 (Root Governance)</div>
          </div>
          <div style={{ background: 'var(--color-surface-alt)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>MFA Status</span>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-success)', marginTop: 2 }}>Enforced (Government TOTP)</div>
          </div>
          <div style={{ background: 'var(--color-surface-alt)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Last Sign-in</span>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>Today (Local Session)</div>
          </div>
        </div>
      </div>
    </div>
  )
}
