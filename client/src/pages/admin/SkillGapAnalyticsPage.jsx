import Badge from '../../components/ui/Badge'

export default function SkillGapAnalyticsPage() {
  const gaps = [
    { rank: 1, name: 'Statistical Computing (R & Python)', category: 'Technical', affected: 96, avgGap: 1.4, severity: 'High', intervention: '5-Day Hands-on Workshop: R for Official Statistics' },
    { rank: 2, name: 'National Accounts & Supply-Use Tables', category: 'Domain', affected: 82, avgGap: 1.1, severity: 'High', intervention: 'Residential Programme: National Accounts Compilation' },
    { rank: 3, name: 'Data Quality Assurance & Field Auditing', category: 'Domain', affected: 64, avgGap: 0.8, severity: 'Medium', intervention: 'iGOT Course: UN NQAF Implementation' },
    { rank: 4, name: 'Index Numbers (Base Year Revision)', category: 'Domain', affected: 48, avgGap: 0.6, severity: 'Medium', intervention: 'Workshop: CPI Elementary Aggregates Compilation' },
    { rank: 5, name: 'Survey Sampling Variance Estimation', category: 'Domain', affected: 35, avgGap: 0.5, severity: 'Low', intervention: 'Online Seminar: Complex Survey Analysis' },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Cadre Skill Gap Diagnostics
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Priority skill deficits identified across the statistical cadre requiring academy training intervention
        </p>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Priority</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Skill Competency Deficit</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Category</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Affected Officers</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Severity</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Recommended Intervention</th>
            </tr>
          </thead>
          <tbody>
            {gaps.map((g) => (
              <tr key={g.rank} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold' }}>#{g.rank}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>{g.name}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant={g.category === 'Technical' ? 'nssta' : 'igot'}>{g.category}</Badge>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold' }}>{g.affected} Officers</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant={g.severity === 'High' ? 'high' : g.severity === 'Medium' ? 'medium' : 'low'}>{g.severity}</Badge>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 11, color: 'var(--color-primary-600)', fontWeight: 500 }}>
                  {g.intervention}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
