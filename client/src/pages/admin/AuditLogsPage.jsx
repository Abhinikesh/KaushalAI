import Badge from '../../components/ui/Badge'

export default function AuditLogsPage() {
  const logs = [
    { time: '02 Sep 2026, 17:45:12', user: 'priya@mospi.gov.in', action: 'OFFICER_ROSTER_BULK_UPLOAD', ip: '10.24.18.92', status: 'SUCCESS', details: 'Uploaded 14 new officers via roster CSV' },
    { time: '02 Sep 2026, 16:30:04', user: 'system_scheduler', action: 'IGOT_COURSES_DAILY_SYNC', ip: '127.0.0.1', status: 'SUCCESS', details: 'Synced 42 active courses with iGOT API' },
    { time: '02 Sep 2026, 14:12:30', user: 'abhi@gmail.com', action: 'OFFICER_PROFILE_UPDATE', ip: '192.168.1.104', status: 'SUCCESS', details: 'Updated designation to Statistical Officer' },
    { time: '02 Sep 2026, 11:05:19', user: 'faculty.nssta@mospi.gov.in', action: 'QUIZ_PUBLISHED', ip: '10.24.40.11', status: 'SUCCESS', details: 'Published Survey Sampling Evaluation (15 Questions)' },
    { time: '01 Sep 2026, 18:22:45', user: 'test.officer@mospi.gov.in', action: 'AUTH_LOGIN_GOOGLE', ip: '10.24.18.45', status: 'SUCCESS', details: 'OAuth2 SSO login via Google' },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Security &amp; System Audit Logs
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Immutable audit trail of administrative operations, identity authentication, and data modifications
        </p>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Timestamp (IST)</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Actor / Email</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Action Event</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Source IP</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 11 }}>{l.time}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>{l.user}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <code>{l.action}</code>
                  <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2 }}>{l.details}</div>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 11 }}>{l.ip}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant="success">{l.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
