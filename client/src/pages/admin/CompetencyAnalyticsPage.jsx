import Badge from '../../components/ui/Badge'

export default function CompetencyAnalyticsPage() {
  const stats = [
    { name: 'Survey Sampling Techniques', avgLvl: 3.4, targetLvl: 4.0, readiness: '85%', count: 142 },
    { name: 'Data Quality & NQAF', avgLvl: 2.8, targetLvl: 3.5, readiness: '80%', count: 128 },
    { name: 'National Accounts & GVA', avgLvl: 2.6, targetLvl: 3.5, readiness: '74%', count: 96 },
    { name: 'Index Numbers (CPI/IIP)', avgLvl: 3.1, targetLvl: 3.5, readiness: '88%', count: 110 },
    { name: 'Statistical Computing (R/Python)', avgLvl: 2.1, targetLvl: 3.0, readiness: '70%', count: 88 },
    { name: 'Fieldwork Team Leadership', avgLvl: 3.8, targetLvl: 4.0, readiness: '95%', count: 154 },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Organization-Wide Competency Analytics
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Macro proficiency distribution across all MOSPI divisions and cadres
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Overall Cadre Readiness</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>78.6%</div>
          <span style={{ fontSize: 11, color: 'var(--color-success)', fontWeight: 600 }}>↑ 4.2% vs Q1 Benchmark</span>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Officers Assessed</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 2 }}>184 / 210</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>87.6% Compliance Rate</span>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Highest Mastery Area</span>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--color-success)', marginTop: 2 }}>Survey Sampling</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Avg Level: 3.4 / 5.0</span>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Priority Training Need</span>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--color-error)', marginTop: 2 }}>Statistical Computing</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Avg Level: 2.1 / 5.0</span>
        </div>
      </div>

      {/* Competencies Table */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Competency Standard</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Cadre Average</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Mandated Benchmark</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Readiness %</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Evaluated Officers</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>{s.name}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold' }}>Level {s.avgLvl}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)' }}>Level {s.targetLvl}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant={Number(s.readiness.replace('%', '')) >= 80 ? 'success' : 'medium'}>{s.readiness}</Badge>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{s.count} Officers</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
