import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import {
  getAdminSummary,
  getAdminHeatmap,
  getAdminTopGaps,
  getAdminTrainingEffectiveness,
  getAdminSkillTrend,
} from '../../api/admin.api'
import { getCompetencies } from '../../api/competency.api'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import CompetencyHeatmap from '../../components/admin/CompetencyHeatmap'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import styles from './AdminDashboard.module.css'

// ── Summary stat card ─────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }) {
  return (
    <Card padding="padded" className={styles.statCard}>
      <div className={styles.statIcon} style={{ color }}>{icon}</div>
      <div className={styles.statValue} style={{ color }}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </Card>
  )
}

// ── Skill trend chart ─────────────────────────────────────────────────────────
function SkillTrendChart({ competencyId }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['skillTrend', competencyId],
    queryFn:  () => getAdminSkillTrend(competencyId, 6),
    enabled:  !!competencyId,
  })

  if (isLoading) return <Skeleton height="200px" />
  if (isError || !data) return <p className={styles.empty}>Could not load trend data.</p>

  const { historical, projected } = data
  if (!historical.length) {
    return <p className={styles.empty}>No competency update data in the last 6 months for this competency.</p>
  }

  // Merge historical + projected for the chart — projected points use "avgLevelProjected"
  const chartData = [
    ...historical.map((h) => ({ month: h.month, actual: h.avgLevel })),
    ...projected.map((p)  => ({ month: p.month, projected: p.avgLevel })),
  ]

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
          <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} width={20} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }}
            formatter={(v, name) => [v?.toFixed(2), name === 'actual' ? 'Avg level (actual)' : 'Avg level (projected)']}
          />
          <Legend formatter={(v) => v === 'actual' ? 'Actual' : 'Projected'} />
          <ReferenceLine x={historical[historical.length - 1]?.month} stroke="var(--color-border)" strokeDasharray="4 2" />
          <Line type="monotone" dataKey="actual"    stroke="var(--color-primary-600)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />
          <Line type="monotone" dataKey="projected" stroke="var(--color-accent-500)"  strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
      <p className={styles.trendCaption}>
        Linear trend projection based on the last 6 months of competency update data.
        Projection is an OLS linear extrapolation — not a machine learning model.
      </p>
    </div>
  )
}

// ── Main AdminDashboard ───────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user }   = useAuthStore()
  const navigate   = useNavigate()
  const [trendCompId, setTrendCompId] = useState('')
  const [sortCol,  setSortCol]  = useState('avgScore')
  const [sortDir,  setSortDir]  = useState('desc')

  // Role guard
  if (user?.role !== 'admin') {
    return (
      <EmptyState
        icon="🚫"
        title="Access denied"
        description="Admin Dashboard is restricted to administrators."
        action="Go to Dashboard"
        onAction={() => navigate('/dashboard')}
      />
    )
  }

  const summaryQ     = useQuery({ queryKey: ['adminSummary'],       queryFn: getAdminSummary })
  const heatmapQ     = useQuery({ queryKey: ['adminHeatmap'],       queryFn: getAdminHeatmap })
  const topGapsQ     = useQuery({ queryKey: ['adminTopGaps'],       queryFn: () => getAdminTopGaps(10) })
  const effectivenessQ = useQuery({ queryKey: ['adminEffectiveness'], queryFn: getAdminTrainingEffectiveness })
  const compsQ       = useQuery({ queryKey: ['competencies'],       queryFn: getCompetencies })

  // ── Section 1: Summary ────────────────────────────────────────────────────
  const s = summaryQ.data

  // ── Section 4: sortable effectiveness table ───────────────────────────────
  const courses = effectivenessQ.data?.courses ?? []
  const sorted  = [...courses].sort((a, b) => {
    const av = a[sortCol] ?? 0, bv = b[sortCol] ?? 0
    return sortDir === 'asc' ? av - bv : bv - av
  })
  const toggleSort = (col) => {
    if (sortCol === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }
  const sortArrow = (col) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Admin Dashboard</h1>
        <p className={styles.pageSubtitle}>Org-wide skill intelligence · live from MongoDB aggregations</p>
      </div>

      {/* ── Section 1: Summary cards ── */}
      <div className={styles.summaryGrid}>
        {summaryQ.isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="110px" />)
          : [
            { icon: '👥', label: 'Officials',          value: s?.totalOfficials ?? '—',        sub: 'active users',            color: 'var(--color-primary-600)' },
            { icon: '🏛️',  label: 'Departments',        value: s?.totalDepartments ?? '—',       sub: 'tracked',                 color: 'var(--color-info)' },
            { icon: '📊',  label: 'Avg Readiness',      value: s ? `${s.avgReadinessPct}%` : '—', sub: 'across all roles',       color: s?.avgReadinessPct >= 70 ? 'var(--color-success)' : 'var(--color-warning)' },
            { icon: '✏️',  label: 'Quiz Attempts',      value: s?.quizAttemptsThisMonth ?? '—', sub: 'this month',              color: 'var(--color-accent-600)' },
          ].map((stat) => <StatCard key={stat.label} {...stat} />)
        }
      </div>

      {/* ── Section 2: Heatmap ── */}
      <Card padding="compact">
        <Card.Header
          title="Competency Heatmap"
          subtitle="Average level by department × competency category. Click a department row to drill down."
        />
        <Card.Body>
          {heatmapQ.isLoading ? <Skeleton height="220px" /> :
           heatmapQ.isError   ? <p className={styles.empty}>Could not load heatmap data.</p> :
           <CompetencyHeatmap {...heatmapQ.data} />
          }
        </Card.Body>
      </Card>

      {/* ── Section 3: Top skill gaps ── */}
      <Card padding="compact">
        <Card.Header
          title="Org-Wide Priority Skill Gaps"
          subtitle="Average gap (required − current) across all officials whose role requires each competency"
        />
        <Card.Body>
          {topGapsQ.isLoading ? <Skeleton.Text lines={5} /> :
           topGapsQ.data?.gaps?.length === 0 ? (
             <EmptyState icon="✅" title="No gaps found" description="All officials meet their role requirements." />
           ) : (
             <div className={styles.gapList}>
               {(topGapsQ.data?.gaps ?? []).map((g, i) => (
                 <div key={g.competencyId} className={styles.gapRow}>
                   <span className={styles.gapRank}>#{i + 1}</span>
                   <div className={styles.gapInfo}>
                     <span className={styles.gapName}>{g.name}</span>
                     <span className={styles.gapCategory}>{g.category}</span>
                   </div>
                   <div className={styles.gapRight}>
                     <span className={styles.gapUsers}>{g.affectedUsers} officials</span>
                     <Badge variant={g.avgGap >= 2 ? 'high' : g.avgGap >= 1 ? 'medium' : 'low'}>
                       avg gap {g.avgGap.toFixed(1)}
                     </Badge>
                   </div>
                 </div>
               ))}
             </div>
           )
          }
        </Card.Body>
      </Card>

      {/* ── Section 4: Training effectiveness table ── */}
      <Card padding="compact">
        <Card.Header
          title="Training Effectiveness"
          subtitle="Quizzes ranked by average score. Click column headers to sort."
        />
        <Card.Body>
          {effectivenessQ.isLoading ? <Skeleton.Text lines={5} /> :
           sorted.length === 0 ? (
             <EmptyState icon="📚" title="No quiz attempts yet" description="Employees need to take quizzes for effectiveness data to appear." />
           ) : (
             <div className={styles.tableWrap}>
               <table className={styles.effectTable}>
                 <thead>
                   <tr>
                     <th className={styles.effectTh} style={{ textAlign: 'left' }}>Quiz</th>
                     <th className={styles.effectTh}>Source</th>
                     <th className={[styles.effectTh, styles.sortable].join(' ')} onClick={() => toggleSort('attemptCount')}>
                       Attempts{sortArrow('attemptCount')}
                     </th>
                     <th className={[styles.effectTh, styles.sortable].join(' ')} onClick={() => toggleSort('avgScore')}>
                       Avg Score{sortArrow('avgScore')}
                     </th>
                     <th className={[styles.effectTh, styles.sortable].join(' ')} onClick={() => toggleSort('passRate')}>
                       Pass Rate{sortArrow('passRate')}
                     </th>
                   </tr>
                 </thead>
                 <tbody>
                   {sorted.map((c) => (
                     <tr key={c._id} className={styles.effectRow}>
                       <td className={styles.effectTd}>
                         <div className={styles.courseTitle}>{c.title}</div>
                         {c.linkedCourseTitle && (
                           <div className={styles.linkedCourse}>↳ {c.linkedCourseTitle}</div>
                         )}
                       </td>
                       <td className={styles.effectTd} style={{ textAlign: 'center' }}>
                         {c.linkedCourseSource
                           ? <Badge variant="info">{c.linkedCourseSource}</Badge>
                           : <span className={styles.empty}>—</span>
                         }
                       </td>
                       <td className={styles.effectTdNum}>{c.attemptCount}</td>
                       <td className={styles.effectTdNum}>
                         <span style={{ color: c.avgScore >= 70 ? 'var(--color-success)' : c.avgScore >= 50 ? 'var(--color-warning)' : 'var(--color-error)', fontWeight: 'var(--font-bold)' }}>
                           {c.avgScore}%
                         </span>
                       </td>
                       <td className={styles.effectTdNum}>{c.passRate}%</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )
          }
        </Card.Body>
      </Card>

      {/* ── Section 5: Skill demand trend ── */}
      <Card padding="compact">
        <Card.Header
          title="Skill Level Trend"
          subtitle="Select a competency to see its org-wide average level over time and a 2-month linear projection"
        />
        <Card.Body>
          <div className={styles.trendSelect}>
            <label htmlFor="trendComp" className={styles.trendLabel}>Competency</label>
            <select
              id="trendComp"
              className={styles.select}
              value={trendCompId}
              onChange={(e) => setTrendCompId(e.target.value)}
            >
              <option value="">— Select a competency —</option>
              {(compsQ.data?.competencies ?? []).map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          {trendCompId ? (
            <SkillTrendChart competencyId={trendCompId} />
          ) : (
            <p className={styles.empty}>Select a competency above to view the trend.</p>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}
