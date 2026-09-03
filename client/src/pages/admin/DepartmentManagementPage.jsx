import { useQuery } from '@tanstack/react-query'
import { getAdminDepartmentsSummary } from '../../api/admin.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function DepartmentManagementPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['adminDepartmentsSummary'],
    queryFn: getAdminDepartmentsSummary,
  })

  const rosterCounts = data?.rosterCounts || []
  const totalOfficers = rosterCounts.reduce((acc, r) => acc + (r.totalOfficers || 0), 0)
  const totalClaimed = rosterCounts.reduce((acc, r) => acc + (r.claimed || 0), 0)

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          MOSPI Divisional Roster &amp; Cadre Distribution
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Official statistical officer allocations across headquarters research divisions, regional FOD offices, and state DES units
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Active Divisions Mapped</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>
            {rosterCounts.length}
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Divisional &amp; State Units</span>
        </div>

        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Authorized Officers</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 2 }}>
            {totalOfficers}
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>On official master roster</span>
        </div>

        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Activated Accounts</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-success)', marginTop: 2 }}>
            {totalClaimed} / {totalOfficers}
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            {totalOfficers > 0 ? Math.round((totalClaimed / totalOfficers) * 100) : 0}% Roster Onboarding Rate
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)', fontWeight: 'bold', fontSize: 'var(--text-sm)' }}>
          Divisional Officer Distribution (Live Database Aggregation)
        </div>

        {isLoading ? (
          <div style={{ padding: 'var(--space-6)' }}>
            <Skeleton height="150px" />
          </div>
        ) : rosterCounts.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No divisional roster records loaded yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Division / Directorate Name</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Authorized Seats</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Claimed / Active Users</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Onboarding Status</th>
              </tr>
            </thead>
            <tbody>
              {rosterCounts.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>{r._id || 'Unassigned Division'}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{r.totalOfficers} Officers</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold', color: 'var(--color-primary-600)' }}>
                    {r.claimed}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <Badge variant={r.claimed > 0 ? 'success' : 'neutral'}>
                      {r.claimed > 0 ? `${Math.round((r.claimed / r.totalOfficers) * 100)}% Onboarded` : 'Pending Roster Claims'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
