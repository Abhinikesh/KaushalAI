import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { getAdminTrainingEffectiveness } from '../../api/admin.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function TrainingAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['trainerAnalyticsEffectiveness'],
    queryFn: getAdminTrainingEffectiveness,
  })

  const courses = data?.courses || []
  const totalAttempts = courses.reduce((acc, c) => acc + (c.attemptCount || 0), 0)
  const avgOverallScore = courses.length > 0
    ? Math.round((courses.reduce((acc, c) => acc + (c.avgScore || 0), 0) / courses.length) * 10) / 10
    : 0

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Training Effectiveness &amp; Cohort Analytics
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Empirical evaluation of learning outcomes and assessment pass rates across NSSTA and iGOT modules
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
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Printer size={14} /> Print Analytics Report
        </button>
      </div>

      {/* Real Aggregate Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Total Assessed Quizzes</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>
            {courses.length} Assessments
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Evaluated with attempts</span>
        </div>

        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Officer Attempts Logged</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-success)', marginTop: 2 }}>
            {totalAttempts} Submissions
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Verified QuizAttempt records</span>
        </div>

        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Mean Score Across Modules</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 2 }}>
            {avgOverallScore}%
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Overall cohort average</span>
        </div>
      </div>

      {/* Real Breakdown Table */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)', fontWeight: 'bold', fontSize: 'var(--text-sm)' }}>
          Course &amp; Assessment Outcome Registry
        </div>

        {isLoading ? (
          <div style={{ padding: 'var(--space-6)' }}>
            <Skeleton height="100px" />
          </div>
        ) : courses.length === 0 ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            No assessment attempt data logged yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Programme Title</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Submissions</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Average Score</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Pass Rate</th>
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
                    <Badge variant={c.passRate >= 70 ? 'success' : 'medium'}>{c.passRate}%</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
