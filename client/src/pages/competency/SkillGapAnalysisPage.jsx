import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Search } from 'lucide-react'
import { getLearningPath } from '../../api/learningPath.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import styles from './SkillGapAnalysisPage.module.css'

const SEVERITY_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
  none: '#10b981',
}

export default function SkillGapAnalysisPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [severity, setSeverity] = useState('all')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['learningPath'],
    queryFn: getLearningPath,
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <Skeleton.Text lines={2} />
        </div>
        <div className={styles.gapList}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton.Card key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !data?.gapAnalysis) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Could not load Skill Gap Analysis"
        description="Please verify that your job role is configured and try again."
        action="Retry"
        onAction={() => refetch()}
      />
    )
  }

  const { gapAnalysis } = data
  const gaps = gapAnalysis.gaps || []

  const filtered = gaps.filter((g) => {
    const matchesSearch = (g.name || '').toLowerCase().includes(search.toLowerCase())
    const matchesCat = category === 'all' || (g.category || '').toLowerCase() === category
    const matchesSev = severity === 'all' || (g.gap_severity || '').toLowerCase() === severity
    return matchesSearch && matchesCat && matchesSev
  })

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Skill Gap Analysis</h1>
          <p className={styles.subtitle}>
            Comprehensive evaluation of competencies required for <strong>{gapAnalysis.job_role_title}</strong> vs your current proficiency
          </p>
        </div>
      </div>

      <div className={styles.filterCard}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search competency by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className={styles.select}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          <option value="domain">Domain</option>
          <option value="technical">Technical</option>
          <option value="behavioral">Behavioral</option>
        </select>

        <select
          className={styles.select}
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          <option value="all">All Severities</option>
          <option value="high">High Severity</option>
          <option value="medium">Medium Severity</option>
          <option value="low">Low Severity</option>
          <option value="none">No Gap (Met)</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No skill gaps match filters"
          description="Try broadening your search or resetting category and severity filters."
        />
      ) : (
        <div className={styles.gapList}>
          {filtered.map((g, idx) => {
            const current = g.current_level || 1
            const required = g.required_level || 1
            const pct = Math.min(100, Math.round((current / required) * 100))
            const delta = Math.max(0, required - current)
            const color = SEVERITY_COLORS[g.gap_severity] || '#6366f1'

            return (
              <div key={g.competency_id || idx} className={styles.gapCard}>
                <div className={styles.priorityBadge}>
                  #{g.priority_rank || idx + 1}
                </div>

                <div className={styles.gapMain}>
                  <div className={styles.gapTitleRow}>
                    <span className={styles.gapName}>{g.name}</span>
                    <span className={styles.gapCategory}>{g.category}</span>
                  </div>

                  <div className={styles.progressContainer}>
                    <div className={styles.progressBarBg}>
                      <div
                        className={styles.progressBarFill}
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                    <div className={styles.gapLevels}>
                      <span className={styles.currentVal}>Level {current}</span>
                      <span>/ Required {required}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.gapBadgeCol}>
                  <Badge variant={g.gap_severity}>{g.gap_severity}</Badge>
                  {delta > 0 ? (
                    <span className={styles.gapDelta}>Gap: -{delta} lvl</span>
                  ) : (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 600 }}>Target Met</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
