import { useQuery } from '@tanstack/react-query'
import { getAdminSummary, getAdminHeatmap } from '../../api/admin.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function CompetencyAnalyticsPage() {
  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['adminSummary'],
    queryFn: getAdminSummary,
  })

  const { data: heatmap, isLoading: heatLoading } = useQuery({
    queryKey: ['adminHeatmap'],
    queryFn: getAdminHeatmap,
  })

  const isLoading = sumLoading || heatLoading
  const departments = heatmap?.departments || []
  const categories = heatmap?.categories || []
  const cells = heatmap?.cells || {}

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Organization-Wide Competency Analytics
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Macro capability distribution across all registered MOSPI divisions and statistical cadres
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
          <Skeleton height="100px" />
          <Skeleton height="100px" />
          <Skeleton height="100px" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
          <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Overall Cadre Readiness</span>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>
              {summary?.avgReadinessScore ?? 0}%
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Evaluated across active cadres</span>
          </div>

          <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Registered Officers</span>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 2 }}>
              {summary?.activeLearners ?? 0} / {summary?.totalUsers ?? 0}
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Active learners in system</span>
          </div>

          <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Average Cadre Skill Gap</span>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: (summary?.orgAvgSkillGap ?? 0) > 1.5 ? 'var(--color-error)' : 'var(--color-success)', marginTop: 2 }}>
              {summary?.orgAvgSkillGap ?? 0} Levels
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Required vs actual delta</span>
          </div>

          <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Assessments Completed</span>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-success)', marginTop: 2 }}>
              {summary?.totalAssessmentsTaken ?? 0} Submissions
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Verified evaluation events</span>
          </div>
        </div>
      )}

      {/* Real Department Heatmap Table */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)', fontWeight: 'bold', fontSize: 'var(--text-sm)' }}>
          Division &times; Competency Category Mean Proficiency Heatmap
        </div>

        {isLoading ? (
          <div style={{ padding: 'var(--space-6)' }}>
            <Skeleton height="150px" />
          </div>
        ) : departments.length === 0 ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            No divisional assessment records logged yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>MOSPI Division</th>
                  {categories.map((cat) => (
                    <th key={cat} style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600, textAlign: 'center' }}>
                      {cat}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>{dept}</td>
                    {categories.map((cat) => {
                      const cell = cells[`${dept}::${cat}`]
                      const avg = cell?.avgLevel ?? '—'
                      const isHigh = typeof avg === 'number' && avg >= 3.5
                      const isLow = typeof avg === 'number' && avg < 2.5
                      return (
                        <td key={cat} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-md)',
                              fontWeight: 600,
                              fontSize: 'var(--text-xs)',
                              background: isHigh ? 'rgba(16, 185, 129, 0.15)' : isLow ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                              color: isHigh ? '#065f46' : isLow ? '#991b1b' : '#3730a3',
                            }}
                          >
                            {typeof avg === 'number' ? `Lvl ${avg}` : '—'}
                          </span>
                        </td>
                      )
                    })}
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
