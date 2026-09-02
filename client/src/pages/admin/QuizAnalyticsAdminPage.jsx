import Badge from '../../components/ui/Badge'

export default function QuizAnalyticsAdminPage() {
  const metrics = [
    { title: 'Item Difficulty Index (P-value)', val: '0.68 (Optimal)', desc: 'Average proportion of correct responses across all official cadre test items.' },
    { title: 'Item Discrimination Index (D-value)', val: '0.41 (Excellent)', desc: 'Ability of assessment items to differentiate high performers from low performers.' },
    { title: 'Distractor Efficiency', val: '84.2%', desc: 'Proportion of incorrect options effectively chosen by at least 5% of test-takers.' },
    { title: 'Test Reliability (Cronbach Alpha)', val: '0.86', desc: 'Internal consistency reliability across multi-question evaluations.' },
  ]

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Assessment Psychometrics &amp; Item Analytics
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Scientific measurement of assessment validity, question reliability, and distractor performance
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-5)' }}>
        {metrics.map((m, i) => (
          <div
            key={i}
            style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              {m.title}
            </span>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-primary-600)', margin: 'var(--space-1) 0' }}>
              {m.val}
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginTop: 'auto' }}>
              {m.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
