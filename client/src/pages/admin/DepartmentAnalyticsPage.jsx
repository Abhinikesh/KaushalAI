import { useQuery } from '@tanstack/react-query'
import { getAdminHeatmap } from '../../api/admin.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function DepartmentAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['adminHeatmap'],
    queryFn: getAdminHeatmap,
  })

  const departments = data?.departments || []
  const categories = data?.categories || []
  const cells = data?.cells || {}

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Divisional &amp; Directorate Analytics
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Comparative capability benchmarking across MOSPI divisions and State DES directorates
        </p>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)', fontWeight: 'bold', fontSize: 'var(--text-sm)' }}>
          Divisional Proficiency Matrix (Live Ingestion)
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
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Division / Directorate</th>
                {categories.map((cat) => (
                  <th key={cat} style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600, textAlign: 'center' }}>
                    {cat}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>{d}</td>
                  {categories.map((cat) => {
                    const cell = cells[`${d}::${cat}`]
                    const avg = cell?.avgLevel ?? '—'
                    const count = cell?.count ?? 0
                    return (
                      <td key={cat} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--color-primary-600)' }}>
                          {typeof avg === 'number' ? `Lvl ${avg}` : '—'}
                        </div>
                        {count > 0 && (
                          <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
                            ({count} assessments)
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
