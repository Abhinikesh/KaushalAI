import { useQuery } from '@tanstack/react-query'
import { getAdminAuditLogs } from '../../api/admin.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function AuditLogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['adminAuditLogs'],
    queryFn: () => getAdminAuditLogs(1, 50),
  })

  const logs = data?.logs || []

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Security &amp; System Audit Logs
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Immutable audit trail of administrative operations, identity authentication, and material uploads
        </p>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)', fontWeight: 'bold', fontSize: 'var(--text-sm)' }}>
          Recorded System Events ({data?.total ?? logs.length} Records)
        </div>

        {isLoading ? (
          <div style={{ padding: 'var(--space-6)' }}>
            <Skeleton height="150px" />
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            No administrative audit events recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Timestamp (IST)</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Actor / Email</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Action Event</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Source IP</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Target Entity</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 11 }}>
                      {l.timestamp ? new Date(l.timestamp).toLocaleString('en-IN') : 'N/A'}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>
                      {l.userId?.email || l.userId?.name || 'System'}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <code>{l.action}</code>
                      {l.meta && Object.keys(l.meta).length > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                          {JSON.stringify(l.meta)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 11 }}>
                      {l.ipAddress || '127.0.0.1'}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <Badge variant="igot">{l.targetType || 'System'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
