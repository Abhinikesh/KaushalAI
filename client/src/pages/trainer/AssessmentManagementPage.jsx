import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listQuizzes } from '../../api/quiz.api'
import { getAdminTrainingEffectiveness } from '../../api/admin.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function AssessmentManagementPage() {
  const { data: quizData, isLoading: qLoading } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => listQuizzes(),
  })

  const { data: effectData, isLoading: eLoading } = useQuery({
    queryKey: ['adminTrainingEffectiveness'],
    queryFn: getAdminTrainingEffectiveness,
  })

  const isLoading = qLoading || eLoading
  const quizzes = quizData?.quizzes || quizData || []
  const effectCourses = effectData?.courses || []

  // Map real effectiveness metrics by title or id
  const effectMap = {}
  effectCourses.forEach((ec) => {
    effectMap[ec.title] = ec
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Assessment Management &amp; Evaluations
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Manage official evaluations and monitor authentic officer attempt volumes across programmes
          </p>
        </div>

        <Link
          to="/trainer/upload"
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
          + Upload Material &amp; Build Quiz
        </Link>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)', fontWeight: 'bold', fontSize: 'var(--text-sm)' }}>
          Active Assessments in System ({quizzes.length})
        </div>

        {isLoading ? (
          <div style={{ padding: 'var(--space-6)' }}>
            <Skeleton height="150px" />
          </div>
        ) : quizzes.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No assessments available. Upload source material to generate your first quiz.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Assessment Title</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Questions</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Attempts Logged</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Avg Score</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Pass Rate</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((q) => {
                const eff = effectMap[q.title]
                const attempts = eff?.attemptCount ?? 0
                const avg = eff?.avgScore ?? '—'
                const passRate = eff?.passRate ?? '—'

                return (
                  <tr key={q._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>{q.title}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <Badge variant="neutral">{q.questionCount ?? q.questionIds?.length ?? 5} Items</Badge>
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold' }}>{attempts} Submissions</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--color-primary-600)' }}>
                      {typeof avg === 'number' ? `${avg}%` : '—'}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      {typeof passRate === 'number' ? (
                        <Badge variant={passRate >= 70 ? 'success' : 'medium'}>{passRate}%</Badge>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>No attempts</span>
                      )}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <Link
                        to={`/quizzes/${q._id}`}
                        style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-primary-600)', textDecoration: 'none' }}
                      >
                        Preview Quiz →
                      </Link>
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
