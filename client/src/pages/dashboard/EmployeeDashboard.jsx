import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { getLearningPath } from '../../api/learningPath.api'
import { getMyQuizAttempts } from '../../api/quiz.api'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import styles from './EmployeeDashboard.module.css'

// ── Readiness ring ────────────────────────────────────────────────────────────
function ReadinessRing({ pct }) {
  const r = 52, circ = 2 * Math.PI * r
  const filled = (pct / 100) * circ
  const color = pct >= 70 ? 'var(--color-success)' : pct >= 40 ? 'var(--color-warning)' : 'var(--color-error)'
  return (
    <svg width={130} height={130} viewBox="0 0 130 130" aria-label={`${pct}% role ready`}>
      <circle cx={65} cy={65} r={r} fill="none" stroke="var(--color-gray-100)" strokeWidth={10} />
      <circle cx={65} cy={65} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 65 65)" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      <text x={65} y={60} textAnchor="middle" fontSize={22} fontWeight={700} fill="var(--color-text-primary)">{pct}%</text>
      <text x={65} y={78} textAnchor="middle" fontSize={11} fill="var(--color-text-secondary)">Role Ready</text>
    </svg>
  )
}

// ── Competency chart ──────────────────────────────────────────────────────────
const SEVERITY_COLORS = {
  none: 'var(--color-success)',
  low: 'var(--color-info)',
  medium: 'var(--color-warning)',
  high: 'var(--color-error)',
}

function CompetencyChart({ gaps }) {
  const data = gaps.map((g) => ({
    name: g.name.length > 20 ? g.name.slice(0, 18) + '…' : g.name,
    current: g.current_level,
    required: g.required_level,
    severity: g.gap_severity,
  }))

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }} barGap={4}>
        <XAxis type="number" domain={[0, 5]} ticks={[1,2,3,4,5]}
          tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={140}
          tick={{ fontSize: 12, fill: 'var(--color-text-primary)' }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v, name) => [v, name === 'current' ? 'Your level' : 'Required']}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }}
        />
        <ReferenceLine x={0} stroke="transparent" />
        <Bar dataKey="required" fill="var(--color-gray-100)" radius={[0, 4, 4, 0]} name="Required" />
        <Bar dataKey="current" radius={[0, 4, 4, 0]} name="Current">
          {data.map((d, i) => (
            <Cell key={i} fill={SEVERITY_COLORS[d.severity] ?? 'var(--color-primary-500)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Skeletons ─────────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className={styles.grid}>
      {Array.from({ length: 4 }).map((_, i) => <Skeleton.Card key={i} />)}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function EmployeeDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const lpQuery = useQuery({
    queryKey: ['learningPath'],
    queryFn: getLearningPath,
    retry: false,
  })

  const attemptsQuery = useQuery({
    queryKey: ['myAttempts'],
    queryFn: getMyQuizAttempts,
    retry: false,
  })

  // No job role set — redirect to onboarding
  if (lpQuery.error?.response?.status === 400) {
    return (
      <EmptyState
        icon="🎯"
        title="Set your job role to get started"
        description="We need to know your role so we can analyse your skill gaps and generate your personalised learning path."
        action="Set Job Role"
        onAction={() => navigate('/onboarding/job-role')}
      />
    )
  }

  if (lpQuery.isLoading) return <DashboardSkeleton />

  if (lpQuery.isError) {
    return (
      <EmptyState
        icon="⚠️"
        title="Couldn't load your dashboard"
        description="There was a problem fetching your learning path. Please refresh or try again shortly."
        action="Retry"
        onAction={() => lpQuery.refetch()}
      />
    )
  }

  const { gapAnalysis, recommendations } = lpQuery.data
  const pct = Math.round(gapAnalysis.overall_readiness_percent)
  const topGaps = [...gapAnalysis.gaps].sort((a, b) => a.priority_rank - b.priority_rank).slice(0, 5)
  const attempts = attemptsQuery.data?.attempts ?? []

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            Good to see you, {user?.name?.split(' ')[0] ?? 'Officer'} 👋
          </h1>
          <p className={styles.pageSubtitle}>
            Here's your skill intelligence snapshot for <strong>{gapAnalysis.job_role_title}</strong>
          </p>
        </div>
      </div>

      {/* ── Section 1: Readiness + summary ── */}
      <div className={styles.topRow}>
        <Card className={styles.readinessCard} padding="padded">
          <div className={styles.readinessInner}>
            <ReadinessRing pct={pct} />
            <div className={styles.readinessMeta}>
              <h2 className={styles.sectionTitle}>Overall Readiness</h2>
              <p className={styles.readinessBody}>
                You are <strong>{pct}%</strong> ready for your current role.{' '}
                {pct < 50 ? 'Focus on addressing the skill gaps below.' : pct < 80 ? 'Good progress — keep building.' : 'Excellent! You\'re well-prepared.'}
              </p>
              <div className={styles.summaryPills}>
                {Object.entries(gapAnalysis.summary).map(([k, v]) => v > 0 && (
                  <div key={k} className={styles.summaryPill}>
                    <Badge variant={k}>{k}</Badge>
                    <span className={styles.summaryCount}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Quick stats */}
        <div className={styles.statsCol}>
          {[
            { label: 'Competencies', value: gapAnalysis.gaps.length, sub: 'assessed' },
            { label: 'Recommendations', value: recommendations.recommendations.length, sub: 'courses found' },
            { label: 'Quizzes taken', value: attempts.length, sub: 'so far' },
          ].map((s) => (
            <Card key={s.label} padding="padded" className={styles.statCard}>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
              <div className={styles.statSub}>{s.sub}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Section 2: Competency breakdown chart ── */}
      <Card padding="compact" className={styles.section}>
        <Card.Header title="Competency Breakdown" subtitle="Current vs required level across all role competencies" />
        <Card.Body>
          <CompetencyChart gaps={gapAnalysis.gaps} />
        </Card.Body>
      </Card>

      {/* ── Section 3: Top skill gaps ── */}
      <Card padding="compact" className={styles.section}>
        <Card.Header title="Priority Skill Gaps" subtitle="Ranked by impact on your role readiness" />
        <Card.Body>
          {topGaps.length === 0
            ? <EmptyState icon="✅" title="No skill gaps detected!" description="You meet all requirements for your current role." />
            : (
              <div className={styles.gapList}>
                {topGaps.map((g, i) => (
                  <div key={g.competency_id} className={styles.gapRow}>
                    <span className={styles.gapRank}>#{i + 1}</span>
                    <div className={styles.gapInfo}>
                      <span className={styles.gapName}>{g.name}</span>
                      <span className={styles.gapCategory}>{g.category}</span>
                    </div>
                    <div className={styles.gapLevels}>
                      <span className={styles.gapLevel}>Level {g.current_level}</span>
                      <span className={styles.gapArrow}>→</span>
                      <span className={styles.gapLevelReq}>Level {g.required_level}</span>
                    </div>
                    <Badge variant={g.gap_severity}>{g.gap_severity}</Badge>
                  </div>
                ))}
              </div>
            )}
        </Card.Body>
      </Card>

      {/* ── Section 4: Recommended learning ── */}
      <Card padding="compact" className={styles.section}>
        <Card.Header
          title="Recommended Courses"
          subtitle="AI-matched to your skill gaps — ranked by relevance"
        />
        <Card.Body>
          {recommendations.recommendations.length === 0
            ? <EmptyState icon="📚" title="No recommendations yet" description="Complete your self-assessment to get personalised course recommendations." />
            : (
              <div className={styles.recGrid}>
                {recommendations.recommendations.slice(0, 6).map((r) => (
                  <div key={r.course_id} className={styles.recCard} hoverable="true">
                    <div className={styles.recHeader}>
                      <Badge variant={r.source === 'igot' ? 'igot' : 'nssta'}>
                        {r.source === 'igot' ? 'iGOT' : 'NSSTA'}
                      </Badge>
                      <span className={styles.recScore}>{r.final_score.toFixed(1)}</span>
                    </div>
                    <h3 className={styles.recTitle}>{r.title}</h3>
                    {/* The explainability differentiator — reason_text is shown prominently */}
                    <p className={styles.recReason}>{r.reason_text}</p>
                  </div>
                ))}
              </div>
            )}
        </Card.Body>
      </Card>

      {/* ── Section 5: Recent quiz attempts ── */}
      <Card padding="compact" className={styles.section}>
        <Card.Header title="Recent Quiz Attempts" subtitle="Your latest assessments" />
        <Card.Body>
          {attemptsQuery.isLoading ? (
            <Skeleton.Text lines={3} />
          ) : attempts.length === 0 ? (
            <EmptyState
              icon="✏️"
              title="No quizzes attempted yet"
              description="Take a quiz to test your knowledge and automatically update your competency profile."
              action="Browse Quizzes"
              onAction={() => navigate('/quizzes')}
            />
          ) : (
            <div className={styles.attemptList}>
              {attempts.slice(0, 5).map((a) => (
                <div key={a._id} className={styles.attemptRow}>
                  <div className={styles.attemptInfo}>
                    <span className={styles.attemptTitle}>
                      {typeof a.quizId === 'object' ? a.quizId.title : 'Quiz'}
                    </span>
                    <span className={styles.attemptDate}>
                      {new Date(a.attemptedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                    </span>
                  </div>
                  <div className={styles.attemptRight}>
                    <span
                      className={styles.attemptScore}
                      style={{ color: a.score >= 80 ? 'var(--color-success)' : a.score >= 50 ? 'var(--color-warning)' : 'var(--color-error)' }}
                    >
                      {a.score}%
                    </span>
                    {a.competencyUpdates?.length > 0 && (
                      <Badge variant="success">+{a.competencyUpdates.length} skill{a.competencyUpdates.length > 1 ? 's' : ''} improved</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}
