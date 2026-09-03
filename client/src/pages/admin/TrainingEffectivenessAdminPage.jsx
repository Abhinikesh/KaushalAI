import { useQuery } from '@tanstack/react-query'
import { getAdminTrainingEffectiveness } from '../../api/admin.api'
import RoadmapNotice from '../../components/shared/RoadmapNotice'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function TrainingEffectivenessAdminPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['adminTrainingEffectiveness'],
    queryFn: getAdminTrainingEffectiveness,
  })

  const courses = data?.courses || []

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Training Effectiveness &amp; Assessment Outcomes
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Empirical evaluation of learning gains, assessment pass rates, and institutional mastery across courses
        </p>
      </div>

      {/* Real Empirical Learning Outcomes (Kirkpatrick Level 2) */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', margin: 0 }}>
              Evaluated Course &amp; Quiz Outcomes (Database Aggregation)
            </h3>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              Real-time aggregation from live MongoDB QuizAttempt collections
            </span>
          </div>
          <Badge variant="igot">Kirkpatrick Level 2 (Learning)</Badge>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Skeleton height="60px" />
            <Skeleton height="60px" />
          </div>
        ) : courses.length === 0 ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            No assessment attempts recorded yet. As officers complete quizzes, pass rates and average scores will aggregate here automatically.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Assessment / Course</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Attempts</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Average Score</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Pass Rate (&ge;60%)</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>
                      {c.title}
                      {c.linkedCourseSource && (
                        <span style={{ marginLeft: 8 }}>
                          <Badge variant={c.linkedCourseSource === 'igot' ? 'igot' : 'nssta'}>
                            {c.linkedCourseSource.toUpperCase()}
                          </Badge>
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{c.attemptCount}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold', color: 'var(--color-primary-600)' }}>
                      {c.avgScore}%
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <Badge variant={c.passRate >= 70 ? 'success' : c.passRate >= 50 ? 'medium' : 'high'}>
                        {c.passRate}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Honest Roadmap Notice for Level 4 Field ROI / Discrepancy Reduction */}
      <RoadmapNotice
        title="Kirkpatrick Level 3 &amp; Level 4 Field Operational Impact &amp; ROI"
        subtitle="Measurement of on-the-job behavioral changes, field inspection error rate reduction, and survey tabulation speedup"
        icon="📊"
        phase="Phase II Impact Evaluation Engine"
        description="Evaluating true organizational ROI (Kirkpatrick Level 4) requires linking officer training completions with Data Quality Assurance Division (DQAD) field audit discrepancies across NSS rounds. In this production stage, KaushalAI shows verified Level 2 learning metrics above while scoping enterprise integration for field audit logs."
        prerequisites={[
          'Ingestion of NSSO field schedule scrutiny reports from Computer-Assisted Field Entry (CAFE) database.',
          'Post-training supervisor 180-day behavioral evaluation rubric.',
          'Statistical tabulation speed benchmarking across National Accounts and CPI divisions.',
        ]}
      />
    </div>
  )
}
