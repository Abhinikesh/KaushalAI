import Badge from '../../components/ui/Badge'

export default function QuestionBankAdminPage() {
  const stats = [
    { domain: 'Survey Sampling Techniques', items: 124, approved: 118, avgDiscrim: '0.42 (High)', status: 'Calibrated' },
    { domain: 'National Accounts Statistics', items: 86, approved: 78, avgDiscrim: '0.38 (Good)', status: 'Calibrated' },
    { domain: 'Data Quality & NQAF', items: 94, approved: 90, avgDiscrim: '0.45 (High)', status: 'Calibrated' },
    { domain: 'Index Numbers (CPI/IIP)', items: 72, approved: 65, avgDiscrim: '0.35 (Good)', status: 'Calibrated' },
    { domain: 'Statistical Computing (R/Python)', items: 64, approved: 52, avgDiscrim: '0.48 (High)', status: 'Calibrated' },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Question Bank Governance &amp; Psychometrics
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Macro quality audits, item discrimination indices, and psychometric reliability across domains
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Total Banked Items</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>440 Questions</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>403 Verified &amp; Approved</span>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Average Discrimination</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-success)', marginTop: 2 }}>0.41 Index</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>High Psychometric Reliability</span>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>AI Generated Share</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 2 }}>64% Generated</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>36% Manually Authored</span>
        </div>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Domain Area</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Items</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Faculty Approved</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Avg. Discrimination</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>{s.domain}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{s.items} Items</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold', color: 'var(--color-success)' }}>{s.approved}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{s.avgDiscrim}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant="success">{s.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
