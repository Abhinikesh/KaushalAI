import Badge from '../../components/ui/Badge'

export default function SecurityCenterPage() {
  const events = [
    { time: '02 Sep 2026, 17:10:22', type: 'FAILED_AUTH_BLOCKED', ip: '185.220.101.5', detail: 'Unregistered email rejected by roster validation filter', level: 'Warning' },
    { time: '02 Sep 2026, 14:05:18', type: 'SESSION_REVOKED', ip: '10.24.18.92', detail: 'User session expired after 24h idle timeout policy', level: 'Info' },
    { time: '01 Sep 2026, 09:15:33', type: 'SSO_TOKEN_VALIDATED', ip: '10.24.18.45', detail: 'Google OAuth SSO exchange token verified successfully', level: 'Info' },
  ]

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Security Governance &amp; Threat Monitoring
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Real-time authentication audits, intrusion prevention, and roster boundary verification
          </p>
        </div>

        <Badge variant="success">Security Status: Secure</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Roster Verification Gate</span>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--color-success)', marginTop: 2 }}>Enforced (Strict)</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Pre-registration roster check</span>
        </div>

        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Failed Logins (24h)</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>2 Blocked</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Rate limit enforced</span>
        </div>

        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Encryption Standards</span>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 2 }}>TLS 1.3 / AES-256</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>All microservice traffic</span>
        </div>
      </div>

      {/* Security Events */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold' }}>Recent Security Audit Events</h3>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Timestamp</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Event Type</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>IP Address</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Incident Details</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 11, color: 'var(--color-text-secondary)' }}>{e.time}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant={e.level === 'Warning' ? 'medium' : 'igot'}>{e.type}</Badge>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 11 }}><code>{e.ip}</code></td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
