import Badge from '../../components/ui/Badge'

export default function WorkforceAnalyticsPage() {
  const tiers = [
    { tier: 'Junior Statistical Officers (0–5 yrs)', count: 95, certifiedPct: '88%', avgHours: 42.5, readiness: '79%' },
    { tier: 'Senior Statistical Officers (5–15 yrs)', count: 68, certifiedPct: '82%', avgHours: 36.0, readiness: '84%' },
    { tier: 'ISS Officers (Grade IV & JTS)', count: 32, certifiedPct: '94%', avgHours: 52.0, readiness: '91%' },
    { tier: 'Senior Administrative Cadre (15+ yrs)', count: 24, certifiedPct: '75%', avgHours: 24.0, readiness: '86%' },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Workforce Capability &amp; Cadre Analytics
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Experience tier distribution, certification penetration, and institutional training depth
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Total Active Cadre</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>219 Officers</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Across MOSPI &amp; State DES</span>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Avg. Training Penetration</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-success)', marginTop: 2 }}>84.7%</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Enrolled in active courses</span>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Cadre Renewal (5-Year)</span>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: '#d97706', marginTop: 2 }}>38 Retirements</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Succession pipeline active</span>
        </div>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Cadre Experience Tier</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Officer Count</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Certification Rate</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Avg. Annual Learning Hours</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Cadre Readiness</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>{t.tier}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{t.count} Officers</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant="success">{t.certifiedPct}</Badge>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold' }}>{t.avgHours} hrs</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold', color: 'var(--color-primary-600)' }}>{t.readiness}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
