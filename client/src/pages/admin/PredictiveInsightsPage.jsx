import Badge from '../../components/ui/Badge'

export default function PredictiveInsightsPage() {
  const forecasts = [
    {
      horizon: 'Next 6 Months',
      trend: 'Computer-Assisted Personal Interviewing (CAPI) & Tablet Validation',
      impact: 'High',
      gapRisk: '42 Officers at Risk of Methodology Gap',
      action: 'Mandate digital questionnaire scripting module on iGOT',
    },
    {
      horizon: 'Next 12 Months',
      trend: 'Geospatial Integration with Statistical Registers (PM Gati Shakti)',
      impact: 'High',
      gapRisk: '78 Officers lacking GIS/spatial layering skills',
      action: 'Deploy NSSTA workshop: Spatial Data Layering for Census & Surveys',
    },
    {
      horizon: 'Next 18–24 Months',
      trend: 'Big Data & Satellite Imagery for Crop Yield and Economic Proxies',
      impact: 'Strategic',
      gapRisk: 'Emerging discipline — zero current cadre certifications',
      action: 'Launch pilot fellowship in Machine Learning for Official Statistics',
    },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          AI Predictive Workforce Insights
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Machine learning forecasts of upcoming statistical survey requirements and future capability gaps
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-5)' }}>
        {forecasts.map((f, i) => (
          <div
            key={i}
            style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: i === 0 ? '#10b981' : i === 1 ? '#6366f1' : '#f59e0b' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--color-primary-600)', textTransform: 'uppercase' }}>
                {f.horizon}
              </span>
              <Badge variant={f.impact === 'Strategic' ? 'high' : 'igot'}>{f.impact} Impact</Badge>
            </div>

            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
              {f.trend}
            </h3>

            <div style={{ padding: 'var(--space-3)', background: 'rgba(239, 68, 68, 0.06)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: 11, color: 'var(--color-error)', fontWeight: 600 }}>
              ⚠️ Projected Gap: {f.gapRisk}
            </div>

            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
              <span style={{ fontSize: 10, fontWeight: 'bold', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                AI Recommended Cadre Action
              </span>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-primary)', marginTop: 2, fontWeight: 500 }}>
                💡 {f.action}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
