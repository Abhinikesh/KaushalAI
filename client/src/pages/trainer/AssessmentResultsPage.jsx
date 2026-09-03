import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getQuiz, getQuizStats } from '../../api/quiz.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function AssessmentResultsPage() {
  const { id } = useParams()

  const { data: quizData, isLoading: quizLoading } = useQuery({
    queryKey: ['quiz', id],
    queryFn: () => getQuiz(id),
    enabled: !!id,
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['quizStats', id],
    queryFn: () => getQuizStats(id),
    enabled: !!id,
  })

  const isLoading = quizLoading || statsLoading
  const quiz = quizData?.quiz || quizData || { title: 'Official Survey Sampling Evaluation' }

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <Link to="/trainer/assessments" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Assessments
        </Link>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 4 }}>
          Assessment Results &amp; Analytics
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          {quiz.title} • Batch Evaluation Performance
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <Skeleton height="100px" />
          <Skeleton height="100px" />
          <Skeleton height="100px" />
        </div>
      ) : (
        <>
          {/* Real KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
            <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Total Attempts</span>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>
                {stats?.attemptCount ?? 0} Officers
              </div>
            </div>

            <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Average Score</span>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>
                {stats?.averageScore != null ? `${stats.averageScore}%` : '—'}
              </div>
            </div>

            <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Passing Standard</span>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-success)', marginTop: 2 }}>
                70% Score
              </div>
            </div>
          </div>

          {/* Breakdown / Questions Performance */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
            <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)', fontWeight: 'bold', fontSize: 'var(--text-sm)' }}>
              Per-Question Item Performance Breakdown
            </div>

            {(stats?.perQuestionCorrectRate || []).length === 0 ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                No officer attempts have been submitted for this assessment yet.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Question Item</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Responses</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Accuracy Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.perQuestionCorrectRate.map((q, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>Item #{idx + 1} ({q.questionId})</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{q.totalAttempts}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <Badge variant={q.correctRate >= 70 ? 'success' : 'high'}>
                          {q.correctRate}% Correct
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
