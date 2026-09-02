import { useParams, Link } from 'react-router-dom'
import Badge from '../../components/ui/Badge'

export default function LearnerPerformancePage() {
  const { id } = useParams()

  const learner = {
    id: id || '1',
    name: 'Rajesh Sharma',
    empId: 'MOSPI-2018-041',
    designation: 'Statistical Officer',
    department: 'Field Operations Division (FOD) Delhi',
    cadre: 'Subordinate Statistical Service (SSS)',
    baselineScore: 58,
    latestScore: 88,
    streak: 14,
    hours: 36,
  }

  const competencies = [
    { name: 'Survey Sampling Techniques', pre: 2, post: 4, delta: '+2 Levels' },
    { name: 'National Accounts Statistics', pre: 1, post: 3, delta: '+2 Levels' },
    { name: 'Data Quality (NQAF)', pre: 2, post: 3, delta: '+1 Level' },
    { name: 'Statistical Computing (R/Python)', pre: 1, post: 2, delta: '+1 Level' },
  ]

  const attempts = [
    { title: 'Survey Sampling Methodology Evaluation', score: 88, date: '2 days ago', status: 'Passed' },
    { title: 'Data Quality & Field Audit Guidelines', score: 92, date: '1 week ago', status: 'Passed' },
    { title: 'Baseline Cadre Proficiency Diagnostic', score: 58, date: '3 weeks ago', status: 'Diagnostic' },
  ]

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <Link to="/trainer/learners" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Learners Directory
        </Link>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 4 }}>
          Learner Analysis &amp; Competency Growth
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Individual diagnostic, assessment performance, and skill level-ups for {learner.name}
        </p>
      </div>

      {/* Officer Summary Card */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{learner.name}</h2>
            <Badge variant="igot">{learner.cadre}</Badge>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            {learner.empId} • {learner.designation} • {learner.department}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--color-success)' }}>
              +{learner.latestScore - learner.baselineScore}%
            </div>
            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>Score Growth</span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--color-primary-600)' }}>
              {learner.hours} hrs
            </div>
            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>Learning Time</span>
          </div>
        </div>
      </div>

      {/* Competency Level Gain Table */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', marginBottom: 'var(--space-4)' }}>
          Official Competency Level-Up Progress
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {competencies.map((c, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--color-surface-alt)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {c.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  Baseline: Level {c.pre} → Current: Level {c.post} of 5
                </div>
              </div>

              <Badge variant="success">{c.delta}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Assessment Attempts History */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold' }}>Completed Evaluations</h3>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Assessment</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Score</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Status</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((a, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>{a.title}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold' }}>{a.score}%</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant={a.score >= 60 ? 'success' : 'medium'}>{a.status}</Badge>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)' }}>{a.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
