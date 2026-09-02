import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getQuiz } from '../../api/quiz.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function AssessmentResultsPage() {
  const { id } = useParams()

  const { data, isLoading } = useQuery({
    queryKey: ['quiz', id],
    queryFn: () => getQuiz(id),
    enabled: !!id,
  })

  const quiz = data?.quiz || data || { title: 'Official Survey Sampling Evaluation' }

  const submissions = [
    { id: '1', name: 'Rajesh Sharma', empId: 'MOSPI-2018-041', score: 92, status: 'Passed', date: 'Yesterday' },
    { id: '2', name: 'Sunita Verma', empId: 'MOSPI-2019-112', score: 88, status: 'Passed', date: '2 days ago' },
    { id: '3', name: 'Amitabh Sen', empId: 'MOSPI-2020-089', score: 76, status: 'Passed', date: '3 days ago' },
    { id: '4', name: 'Kavita Patel', empId: 'MOSPI-2021-304', score: 54, status: 'Needs Review', date: '4 days ago' },
    { id: '5', name: 'Manoj Kumar', empId: 'MOSPI-2017-019', score: 96, status: 'Passed', date: '5 days ago' },
  ]

  const hardestQuestions = [
    { text: 'In rural NSSO survey sampling, what constitutes the First Stage Unit?', failRate: '38% Incorrect' },
    { text: 'Calculation of Jevons elementary index vs modified Laspeyres CPI?', failRate: '45% Incorrect' },
  ]

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

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Total Attempts</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>32 Officers</div>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Average Score</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>81.2%</div>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Pass Rate (&ge;60%)</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-success)', marginTop: 2 }}>87.5%</div>
        </div>
      </div>

      {/* Score Distribution & Hardest Questions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
        {/* Score Distribution */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', marginBottom: 'var(--space-4)' }}>
            Score Distribution
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[
              { label: '90% – 100% (Distinction)', pct: 40, count: '13 Officers', color: '#10b981' },
              { label: '75% – 89% (Proficient)', pct: 35, count: '11 Officers', color: '#6366f1' },
              { label: '60% – 74% (Satisfactory)', pct: 15, count: '5 Officers', color: '#f59e0b' },
              { label: '< 60% (Requires Remediation)', pct: 10, count: '3 Officers', color: '#ef4444' },
            ].map((bar, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{bar.label}</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{bar.count}</span>
                </div>
                <div style={{ height: 8, background: 'var(--color-gray-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{ width: `${bar.pct}%`, height: '100%', background: bar.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hardest Questions */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', marginBottom: 'var(--space-4)' }}>
            Concepts Needing Reinforcement
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {hardestQuestions.map((hq, idx) => (
              <div key={idx} style={{ padding: 'var(--space-3)', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {hq.text}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-error)', fontWeight: 'bold', marginTop: 4 }}>
                  ⚠️ {hq.failRate}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold' }}>Individual Officer Submissions</h3>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Officer</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Score</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Status</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{s.empId}</div>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold' }}>
                  {s.score}%
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant={s.score >= 60 ? 'success' : 'medium'}>{s.status}</Badge>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)' }}>
                  {s.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
