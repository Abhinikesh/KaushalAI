import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMyQuizAttempts } from '../../api/quiz.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

export default function AssessmentHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['myAttempts'],
    queryFn: getMyQuizAttempts,
  })

  const attempts = data?.attempts || []

  const totalAttempts = attempts.length
  const avgScore = totalAttempts > 0
    ? Math.round(attempts.reduce((acc, a) => acc + (a.score || 0), 0) / totalAttempts)
    : 0
  const passCount = attempts.filter((a) => (a.score || 0) >= 60).length
  const passRate = totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 0

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Assessment History &amp; Score Logs
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Detailed records of all completed competency evaluations, quizzes, and skill improvements
          </p>
        </div>
        <Link
          to="/quizzes"
          style={{
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--color-primary-600)',
            color: 'white',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Take New Quiz →
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4) var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Total Attempts</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>{totalAttempts}</div>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4) var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Average Score</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>{avgScore}%</div>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4) var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Passing Rate (&ge;60%)</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-success)', marginTop: 2 }}>{passRate}%</div>
        </div>
      </div>

      {/* Attempts Table / List */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 'var(--space-6)' }}>
            <Skeleton.Text lines={5} />
          </div>
        ) : attempts.length === 0 ? (
          <div style={{ padding: 'var(--space-8)' }}>
            <EmptyState
              icon="✏️"
              title="No quiz attempts recorded yet"
              description="Test your skills on official statistical topics to start building your assessment history."
              action="Browse Quizzes"
              onAction={() => window.location.assign('/quizzes')}
            />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Assessment Title</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Score</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Result</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Date</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Competency Gain</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => {
                const title = typeof a.quizId === 'object' && a.quizId?.title
                  ? a.quizId.title.replace(/^Quiz:\s*/i, '')
                  : 'Official Assessment'
                const isPassed = (a.score || 0) >= 60
                const dateStr = a.attemptedAt
                  ? new Date(a.attemptedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'Recent'

                return (
                  <tr key={a._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {title}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold' }}>
                      {Math.round(a.score || 0)}%
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <Badge variant={isPassed ? 'success' : 'medium'}>
                        {isPassed ? 'Passed' : 'Needs Review'}
                      </Badge>
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)' }}>
                      {dateStr}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      {a.competencyUpdates?.length > 0 ? (
                        <span style={{ fontSize: 11, color: 'var(--color-success)', fontWeight: 600 }}>
                          +{a.competencyUpdates.length} Level Up
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Standard verified</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
