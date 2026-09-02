import Badge from '../../components/ui/Badge'

export default function DepartmentAnalyticsPage() {
  const depts = [
    { name: 'Field Operations Division (FOD)', officers: 84, readiness: '82.4%', completion: '86%', topGap: 'Digital Survey Capture' },
    { name: 'Survey Design and Research (SDRD)', officers: 42, readiness: '88.1%', completion: '92%', topGap: 'Bayesian Small Area Estimation' },
    { name: 'National Accounts Division (NAD)', officers: 38, readiness: '76.5%', completion: '78%', topGap: 'Supply-Use Matrix Balancing' },
    { name: 'Economic Statistics Division (ESD)', officers: 32, readiness: '80.2%', completion: '84%', topGap: 'Index Number Deflators' },
    { name: 'State/UT Directorates of Economics (DES)', officers: 65, readiness: '71.8%', completion: '72%', topGap: 'Sampling Variance Computation' },
  ]

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
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Division / Directorate</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Active Officers</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Avg. Readiness Score</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Training Completion Rate</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Primary Skill Deficit</th>
            </tr>
          </thead>
          <tbody>
            {depts.map((d, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>{d.name}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{d.officers} Officers</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold', color: 'var(--color-primary-600)' }}>{d.readiness}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant="success">{d.completion}</Badge>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-error)', fontSize: 11, fontWeight: 500 }}>
                  ⚠️ {d.topGap}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
