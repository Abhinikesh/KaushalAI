import Badge from '../../components/ui/Badge'

export default function TrainingAnalyticsPage() {
  const cadres = [
    { cadre: 'Subordinate Statistical Service (SSS)', enrolled: 98, completion: '82%', avgScore: '84.2%', delta: '+26%' },
    { cadre: 'Indian Statistical Service (ISS)', enrolled: 42, completion: '91%', avgScore: '89.6%', delta: '+18%' },
    { cadre: 'State DES Statistical Cadres', enrolled: 44, completion: '74%', avgScore: '78.5%', delta: '+31%' },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Training Effectiveness &amp; Analytics
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Kirkpatrick Level 2 &amp; Level 3 learning retention metrics across NSSTA cohorts
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--color-primary-600)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          📄 Export Effectiveness Report
        </button>
      </div>

      {/* Effectiveness KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Avg. Knowledge Delta</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-success)', marginTop: 2 }}>+28.4%</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Pre vs Post Assessment Gain</span>
        </div>

        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Participant Satisfaction</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>4.82 / 5.0</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Based on 142 course reviews</span>
        </div>

        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Competencies Leveled Up</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>318 Upgrades</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Across all trained officers</span>
        </div>

        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Total Certified Officers</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-success)', marginTop: 2 }}>164 Passed</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Certified by NSSTA Academy</span>
        </div>
      </div>

      {/* Cadre Performance Table */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold' }}>Cadre-Wise Effectiveness Breakdown</h3>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Cadre Group</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Enrolled</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Completion Rate</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Post-Assessment Avg</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Skill Growth Delta</th>
            </tr>
          </thead>
          <tbody>
            {cadres.map((c, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {c.cadre}
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{c.enrolled} Officers</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{c.completion}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold' }}>{c.avgScore}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant="success">{c.delta}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
