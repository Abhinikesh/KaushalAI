import { useQuery } from '@tanstack/react-query'
import { getAdminTopGaps } from '../../api/admin.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function SkillGapAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['adminTopGaps'],
    queryFn: () => getAdminTopGaps(15),
  })

  const gaps = data?.gaps || []

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Organization-Wide Skill Gap Diagnostics
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Priority skill deficits identified across the statistical cadre requiring academy training intervention
        </p>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)', fontWeight: 'bold', fontSize: 'var(--text-sm)' }}>
          Cadre Priority Deficit Rankings (Live Aggregation)
        </div>

        {isLoading ? (
          <div style={{ padding: 'var(--space-6)' }}>
            <Skeleton height="150px" />
          </div>
        ) : gaps.length === 0 ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            No critical cadre skill gaps detected. All registered officers meet or exceed their job role competency benchmarks.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Priority</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Skill Competency Deficit</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Category</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Affected Officers</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Average Gap</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Severity</th>
              </tr>
            </thead>
            <tbody>
              {gaps.map((g, idx) => {
                const avgGap = g.avgGap || 0
                const severity = avgGap >= 2.0 ? 'High' : avgGap >= 1.0 ? 'Medium' : 'Low'
                return (
                  <tr key={g.competencyId || idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold' }}>#{idx + 1}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>{g.competencyName}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <Badge variant="igot">{g.category || 'Domain'}</Badge>
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold' }}>
                      {g.affectedCount ?? g.count ?? 0} Officers
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--color-primary-600)' }}>
                      -{avgGap} Levels
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <Badge variant={severity === 'High' ? 'high' : severity === 'Medium' ? 'medium' : 'low'}>
                        {severity}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
