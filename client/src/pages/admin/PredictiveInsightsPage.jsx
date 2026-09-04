import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp } from 'lucide-react'
import { getCompetencies } from '../../api/competency.api'
import { getAdminSkillTrend } from '../../api/admin.api'
import RoadmapNotice from '../../components/shared/RoadmapNotice'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'

export default function PredictiveInsightsPage() {
  const [selectedCompId, setSelectedCompId] = useState('')

  const { data: compData } = useQuery({
    queryKey: ['competencies'],
    queryFn: getCompetencies,
  })

  const competencies = compData?.competencies || compData || []
  const activeCompId = selectedCompId || (competencies.length > 0 ? competencies[0]._id : '')

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['skillTrend', activeCompId],
    queryFn: () => getAdminSkillTrend(activeCompId, 6),
    enabled: !!activeCompId,
  })

  const historical = trendData?.historical || []
  const projected = trendData?.projected || []

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Predictive Skill Demand &amp; Workforce Forecasting
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Empirical Ordinary Least Squares (OLS) regression trend on active competency trajectories
        </p>
      </div>

      {/* Real OLS Linear Trend Engine */}
      <Card padding="padded">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', margin: 0 }}>
              Statistical Competency Trajectory (Empirical OLS Model)
            </h3>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              Historical monthly average levels and 2-month linear projection
            </span>
          </div>

          <select
            value={activeCompId}
            onChange={(e) => setSelectedCompId(e.target.value)}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
            }}
          >
            {competencies.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.category})
              </option>
            ))}
          </select>
        </div>

        {trendLoading ? (
          <Skeleton height="160px" />
        ) : historical.length === 0 ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            Insufficient historical assessment volume for this competency yet. Complete more cadre assessments to generate mathematical regression models.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
              {historical.map((h) => (
                <div key={h.month} style={{ background: 'var(--color-surface-alt)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{h.month} (Actual)</div>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 2 }}>
                    Lvl {h.avgLevel}
                  </div>
                </div>
              ))}
              {projected.map((p) => (
                <div key={p.month} style={{ background: 'rgba(99, 102, 241, 0.08)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', border: '1.5px dashed var(--color-primary-600)', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--color-primary-600)', fontWeight: 600 }}>{p.month} (Projected)</div>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>
                    Lvl {p.projectedAvgLevel}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
              * Computed using Ordinary Least Squares regression: <code>y = mx + c</code> over user assessment records.
            </div>
          </div>
        )}
      </Card>

      {/* Honest Roadmap Notice for long-horizon predictive features */}
      <RoadmapNotice
        title="Long-Horizon Macroeconomic Survey &amp; Cadre Risk Forecasting"
        subtitle="Predictive skill risk modeling based on upcoming decennial census, nationwide surveys, and PM Gati Shakti mandates"
        icon={TrendingUp}
        phase="Phase II Predictive Analytics Suite"
        description="While KaushalAI currently executes empirical OLS trend projection on active test data, multi-year macro capability forecasting requires ingestion of national survey schedules, retirement rosters from DOPT, and official CAPI automation deadlines to compute true cadre-at-risk percentages."
        prerequisites={[
          'Formal API link with MOSPI Survey Planning and Field Operations Division calendar.',
          'Historical time-series dataset of cadre training velocity spanning 3+ fiscal years.',
          'Bayesian time-series forecasting model (e.g. Prophet or NeuralProphet) integrated into Python microservice.',
        ]}
      />
    </div>
  )
}
