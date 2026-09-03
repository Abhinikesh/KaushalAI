import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'

export default function ReportsInsightsPage() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)' }}>
          Reports &amp; Capacity Insights
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Department-wide competency trends, completion ratios, and capacity forecasting for India's Statistical System
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-5)' }}>
        <Card padding="padded">
          <Badge variant="igot">Quarterly Report</Badge>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginTop: 'var(--space-3)' }}>
            MOSPI Cadre Skill Index (Q2 2026)
          </h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 'var(--space-2) 0 var(--space-4)' }}>
            Summary of statistical programming, National Accounts, and survey sampling competency scores across all cadres.
          </p>
          <Link to="/admin/department-analytics" style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-primary-600)' }}>
            View Department Analytics →
          </Link>
        </Card>

        <Card padding="padded">
          <Badge variant="nssta">NSSTA Training</Badge>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginTop: 'var(--space-3)' }}>
            Training Effectiveness &amp; ROI
          </h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 'var(--space-2) 0 var(--space-4)' }}>
            Pre- and post-training assessment scores, quiz mastery metrics, and competency gain distribution.
          </p>
          <Link to="/admin/training-effectiveness" style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-primary-600)' }}>
            Explore Training Insights →
          </Link>
        </Card>

        <Card padding="padded">
          <Badge variant="neutral">Roster Status</Badge>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginTop: 'var(--space-3)' }}>
            Authorized Officer Coverage
          </h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 'var(--space-2) 0 var(--space-4)' }}>
            Official onboarding and activation metrics across CSO, NSSO, and state statistical directorates.
          </p>
          <Link to="/admin/roster" style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-primary-600)' }}>
            Manage Roster →
          </Link>
        </Card>
      </div>
    </div>
  )
}
