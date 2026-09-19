import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Sparkles,
  RefreshCw,
  Star,
  Target,
  BarChart2,
  Clock,
  Check,
  User,
  ListChecks,
  CheckCircle2,
  PlayCircle,
  CircleDot,
  Rocket,
  Info,
  X,
  ExternalLink,
  BookOpen,
  ArrowRight,
  AlertCircle,
  FlaskConical,
  Award,
  Library,
} from 'lucide-react'
import { getLearningPath, getSkillGaps, getRecommendations } from '../../api/learningPath.api'
import { getMyEnrollments } from '../../api/course.api'
import { useAuthStore } from '../../store/authStore'
import styles from './MyLearningPathPage.module.css'

// Virtual Labs URL — reads from .env, falls back to deployed URL
const LABS_URL = import.meta.env.VITE_LABS_APP_URL || 'https://kaushal-ai-virtual-labs.vercel.app'

export default function MyLearningPathPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [enrollTab, setEnrollTab] = useState('all') // 'all' | 'in_progress' | 'completed' | 'not_started'
  const [filter, setFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('recommended') // 'recommended' | 'duration'
  const [showWhyModal, setShowWhyModal] = useState(false)

  // ── Real Queries ─────────────────────────────────────────────────────────
  const { data: lpData, isLoading: isLpLoading } = useQuery({
    queryKey: ['learningPath'],
    queryFn: getLearningPath,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const { data: gapData } = useQuery({
    queryKey: ['skillGaps'],
    queryFn: getSkillGaps,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const { data: recData } = useQuery({
    queryKey: ['recommendations'],
    queryFn: getRecommendations,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // Real enrolled courses from DB
  const { data: enrollData, isLoading: isEnrollLoading } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
    staleTime: 60 * 1000,
    retry: 1,
  })

  const enrollments = useMemo(() => {
    const raw = enrollData?.enrollments || enrollData || []
    return Array.isArray(raw) ? raw : []
  }, [enrollData])

  const enrollInProgress = enrollments.filter((e) => e.status === 'in_progress' || (e.progressPercent > 0 && e.progressPercent < 100))
  const enrollCompleted = enrollments.filter((e) => e.status === 'completed' || e.progressPercent === 100)
  const enrollNotStarted = enrollments.filter((e) => !e.progressPercent || e.progressPercent === 0)

  const rawItems = lpData?.items || []
  const rawGaps = gapData?.skill_gaps || []
  const rawRecs = recData?.recommendations || []
  const learningPathInfo = lpData?.learning_path

  // Map items to milestones
  const milestones = useMemo(() => {
    return rawItems.map((item, idx) => {
      const course = item.course_id || {}
      const seq = item.sequence_order || idx + 1
      const num = String(seq).padStart(2, '0')

      // Duration
      let hours = 6
      if (course.estimatedHours) hours = course.estimatedHours
      else if (typeof course.duration === 'number') hours = course.duration
      else if (typeof course.duration === 'string') {
        const parsed = parseFloat(course.duration)
        if (!isNaN(parsed) && parsed > 0) hours = parsed
      }

      // Status
      const st = item.status || 'not_started'
      const statusLabel =
        st === 'completed'
          ? 'COMPLETED'
          : st === 'in_progress'
          ? 'IN PROGRESS'
          : seq === 1
          ? 'NEXT'
          : 'UPCOMING'

      const skills = (course.skillTags || []).map((t) => (typeof t === 'object' ? t.name : t))

      return {
        id: item._id || `item-${idx}`,
        num,
        seq,
        courseId: course._id,
        title: course.title || `Learning Module ${seq}`,
        description: course.description || 'Targeted training module aligned to role competency standards.',
        status: st,
        statusLabel,
        estimatedHours: hours,
        provider: course.provider || 'iGOT Karmayogi',
        level: course.level || 'Intermediate',
        skills: skills.length > 0 ? skills : ['Role Competency', 'Official Standards'],
        progress: st === 'completed' ? 100 : st === 'in_progress' ? 45 : 0,
        actionLabel: st === 'completed' ? 'Review' : st === 'in_progress' ? 'Continue Learning' : 'Start Learning',
        courseUrl: course._id ? `/courses/${course._id}` : '/courses/igot',
      }
    })
  }, [rawItems])

  // Computed metrics
  const totalActivities = milestones.length
  const completedCount = milestones.filter((m) => m.status === 'completed').length
  const inProgressCount = milestones.filter((m) => m.status === 'in_progress').length
  const upcomingCount = milestones.filter((m) => m.status === 'not_started' || m.status === 'upcoming').length
  const progressPercent = totalActivities > 0 ? Math.round((completedCount / totalActivities) * 100) : 0

  const remainingHours = useMemo(() => {
    return milestones
      .filter((m) => m.status !== 'completed')
      .reduce((acc, m) => acc + (m.estimatedHours || 0), 0)
  }, [milestones])

  // Top focus / gap names
  const topGaps = useMemo(() => {
    return [...rawGaps]
      .filter((g) => (g.gap || 0) > 0)
      .sort((a, b) => (b.gap || 0) - (a.gap || 0))
  }, [rawGaps])

  const topGapNames = topGaps
    .slice(0, 3)
    .map((g) => g.competency_id?.name)
    .filter(Boolean)
    .join(', ') || 'Core Role Skills'

  // AI Recommendation explanation text
  const aiReasonText = useMemo(() => {
    if (rawRecs.length > 0 && rawRecs[0]?.reason) {
      return rawRecs[0].reason
    }
    return `This path was synthesized for your role as ${
      user?.role_id?.title || 'Officer'
    }, sequenced to systematically eliminate your evaluated skill gaps in ${topGapNames}.`
  }, [rawRecs, user, topGapNames])

  // Filtered & Sorted Milestones
  const filteredMilestones = milestones
    .filter((m) => {
      if (filter === 'all') return true
      if (filter === 'in_progress') return m.status === 'in_progress'
      if (filter === 'completed') return m.status === 'completed'
      if (filter === 'upcoming') return m.status === 'not_started' || m.status === 'upcoming'
      return true
    })
    .sort((a, b) => {
      if (sortOrder === 'duration') return a.estimatedHours - b.estimatedHours
      return a.seq - b.seq
    })

  return (
    <div className={styles.pageContainer}>
      {/* ══════════════════════════════════════════════════════
          MY ENROLLED COURSES — Single Hub for all enrollments
          ══════════════════════════════════════════════════════ */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: '24px 28px',
        marginBottom: 28,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, background: '#ede9fe', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
              <Library size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>My Enrolled Courses</h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                {enrollments.length > 0 ? `${enrollments.length} course${enrollments.length !== 1 ? 's' : ''} enrolled` : 'No courses enrolled yet'}
              </p>
            </div>
          </div>
          <Link
            to="/courses/igot"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#4f46e5', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
          >
            <BookOpen size={14} />
            Browse Courses
          </Link>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid #f1f5f9', paddingBottom: 0 }}>
          {[
            { key: 'all', label: `All (${enrollments.length})` },
            { key: 'in_progress', label: `In Progress (${enrollInProgress.length})` },
            { key: 'completed', label: `Completed (${enrollCompleted.length})` },
            { key: 'not_started', label: `Not Started (${enrollNotStarted.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setEnrollTab(tab.key)}
              style={{
                padding: '8px 14px',
                border: 'none',
                background: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                color: enrollTab === tab.key ? '#4f46e5' : '#64748b',
                borderBottom: enrollTab === tab.key ? '2px solid #4f46e5' : '2px solid transparent',
                marginBottom: -1,
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Course cards */}
        {isEnrollLoading ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Loading your courses...</div>
        ) : (() => {
          const filtered = enrollTab === 'all' ? enrollments
            : enrollTab === 'in_progress' ? enrollInProgress
            : enrollTab === 'completed' ? enrollCompleted
            : enrollNotStarted

          if (filtered.length === 0) {
            return (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <BookOpen size={36} color="#cbd5e1" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>
                  {enrollments.length === 0
                    ? 'You have not enrolled in any courses yet.'
                    : 'No courses in this category.'}
                </p>
                {enrollments.length === 0 && (
                  <Link
                    to="/courses/igot"
                    style={{ display: 'inline-flex', marginTop: 14, alignItems: 'center', gap: 6, padding: '9px 18px', background: '#4f46e5', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
                  >
                    Browse iGOT Courses →
                  </Link>
                )}
              </div>
            )
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((enr) => {
                const course = enr.course_id || enr.course || {}
                const title = course.title || enr.title || 'Untitled Course'
                const provider = course.provider || enr.provider || 'iGOT Karmayogi'
                const progress = enr.progressPercent ?? enr.progress ?? 0
                const isComplete = progress >= 100 || enr.status === 'completed'
                const courseId = course._id || enr.course_id || enr._id
                const continueUrl = `/my-courses/${courseId}`

                return (
                  <div
                    key={enr._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '14px 16px',
                      background: '#f8fafc',
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {/* Icon */}
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: isComplete ? '#dcfce7' : '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isComplete
                        ? <Award size={20} color="#16a34a" />
                        : <PlayCircle size={20} color="#4f46e5" />}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{provider}</div>
                      {/* Progress bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <div style={{ flex: 1, height: 5, background: '#e2e8f0', borderRadius: 99 }}>
                          <div style={{ width: `${progress}%`, height: '100%', background: isComplete ? '#10b981' : '#4f46e5', borderRadius: 99, transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: isComplete ? '#10b981' : '#4f46e5', minWidth: 36 }}>{progress}%</span>
                      </div>
                    </div>

                    {/* Action */}
                    <button
                      type="button"
                      onClick={() => navigate(continueUrl)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: isComplete ? '1.5px solid #e2e8f0' : 'none',
                        background: isComplete ? '#fff' : '#4f46e5',
                        color: isComplete ? '#475569' : '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {isComplete ? 'Review' : progress > 0 ? 'Continue →' : 'Start →'}
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>

      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to="/dashboard" className={styles.breadcrumbLink}>
          Dashboard
        </Link>
        <span className={styles.breadcrumbSeparator}>›</span>
        <span className={styles.breadcrumbCurrent}>Learning Path</span>
      </nav>

      {/* Page Header */}
      <div className={styles.headerRow}>
        <div>
          <div className={styles.titleArea}>
            <h1 className={styles.pageTitle}>My Learning Path</h1>
            <span className={styles.aiBadge}>
              <Sparkles size={13} />
              AI Sequenced
            </span>
          </div>
          <p className={styles.pageSubtitle}>
            Your personalized learning journey based on your diagnostic assessment and role competency standards.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.regenerateBtn}
            disabled={true}
            title="Retake your diagnostic assessment to update your learning path"
            style={{ opacity: 0.65, cursor: 'not-allowed' }}
          >
            <RefreshCw size={15} />
            <span>Regenerate Path</span>
          </button>

          <Link to="/recommendations" className={styles.viewRecsBtn}>
            <Star size={15} fill="currentColor" />
            <span>View Recommendations</span>
            <span style={{ fontSize: 11, marginLeft: 2 }}>▾</span>
          </Link>
        </div>
      </div>

      {/* Empty State Banner if no learning path generated yet */}
      {!isLpLoading && totalActivities === 0 && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: '56px 24px',
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          <Sparkles size={42} color="#4f46e5" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
            No learning path generated yet
          </h3>
          <p style={{ fontSize: '0.9375rem', color: '#64748b', maxWidth: 480, margin: '0 auto 20px' }}>
            Take your diagnostic assessment to evaluate your competencies and automatically generate your personalized AI learning path.
          </p>
          <button
            type="button"
            onClick={() => navigate('/assessment')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              background: '#4f46e5',
              color: '#ffffff',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Take Diagnostic Assessment &rarr;
          </button>
        </div>
      )}

      {/* Top 4 KPI Cards */}
      <div className={styles.kpiGrid}>
        {/* KPI 1: Overall Progress */}
        <div className={styles.kpiCard}>
          <div className={styles.radialBox}>
            <svg className={styles.radialSvg} viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="3.2"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#10b981"
                strokeWidth="3.2"
                strokeDasharray={`${progressPercent}, 100`}
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Overall Progress</span>
            <span className={styles.kpiValue}>{progressPercent}%</span>
            <span className={styles.kpiSubtext}>
              {completedCount} of {totalActivities} activities completed
            </span>
          </div>
        </div>

        {/* KPI 2: Current Focus */}
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconBox} ${styles.kpiIconPurple}`}>
            <Target size={24} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Current Focus</span>
            <span className={styles.kpiValue} style={{ fontSize: 16 }}>
              {topGaps[0]?.competency_id?.name || 'Core Standards'}
            </span>
            <span className={styles.kpiSubtext}>
              {topGaps.length} priority {topGaps.length === 1 ? 'skill gap' : 'skill gaps'}
            </span>
          </div>
        </div>

        {/* KPI 3: Skills to Improve */}
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconBox} ${styles.kpiIconBlue}`}>
            <BarChart2 size={24} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Skills to Improve</span>
            <span className={styles.kpiValue}>{topGaps.length}</span>
            <span className={styles.kpiSubtext}>Assessed competency gaps</span>
          </div>
        </div>

        {/* KPI 4: Estimated Remaining Time */}
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconBox} ${styles.kpiIconOrange}`}>
            <Clock size={24} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Estimated Completion</span>
            <span className={styles.kpiValue}>{remainingHours} Hours</span>
            <span className={styles.kpiSubtext}>Remaining learning time</span>
          </div>
        </div>
      </div>

      {/* AI Learning Recommendation Banner */}
      <div className={styles.recommendationBanner}>
        <div className={styles.recLeft}>
          <div className={styles.recSparkleBox}>
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className={styles.recTitle}>AI Learning Path Sequencing Rationale</h2>
            <p className={styles.recDescription}>
              {aiReasonText}
            </p>
          </div>
        </div>

        <div className={styles.recRight}>
          {topGaps.slice(0, 2).map((g) => (
            <div key={g._id || g.competency_id?._id} className={styles.leapPill}>
              <span className={styles.leapLabel}>{g.competency_id?.name}</span>
              <span className={styles.leapStages}>
                <span className={styles.leapFrom}>Lvl {g.current_level}</span>
                <span style={{ color: '#94a3b8' }}>→</span>
                <span className={styles.leapTo}>Lvl {g.required_level}</span>
              </span>
            </div>
          ))}

          <button
            type="button"
            className={styles.whyPathBtn}
            onClick={() => setShowWhyModal(true)}
          >
            <span>Why this path?</span>
            <Info size={14} />
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className={styles.contentLayout}>
        {/* Left Column: Learning Journey */}
        <div className={styles.leftColumn}>
          <div className={styles.journeyHeader}>
            <h2 className={styles.journeyTitle}>Your Sequenced Journey</h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Filter Tabs */}
              <div className={styles.filterTabs}>
                <button
                  type="button"
                  className={`${styles.filterTab} ${filter === 'all' ? styles.filterTabActive : ''}`}
                  onClick={() => setFilter('all')}
                >
                  All ({totalActivities})
                </button>
                <button
                  type="button"
                  className={`${styles.filterTab} ${filter === 'in_progress' ? styles.filterTabActive : ''}`}
                  onClick={() => setFilter('in_progress')}
                >
                  In Progress ({inProgressCount})
                </button>
                <button
                  type="button"
                  className={`${styles.filterTab} ${filter === 'completed' ? styles.filterTabActive : ''}`}
                  onClick={() => setFilter('completed')}
                >
                  Completed ({completedCount})
                </button>
                <button
                  type="button"
                  className={`${styles.filterTab} ${filter === 'upcoming' ? styles.filterTabActive : ''}`}
                  onClick={() => setFilter('upcoming')}
                >
                  Upcoming ({upcomingCount})
                </button>
              </div>

              {/* Sort Order Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
                <span>Sort:</span>
                <select
                  className={styles.sortSelect}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <option value="recommended">Curriculum Order</option>
                  <option value="duration">Duration: Shortest First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Timeline Milestones */}
          <div className={styles.timelineList}>
            <div className={styles.timelineConnector} />

            {filteredMilestones.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                {totalActivities === 0
                  ? 'No learning activities in your path.'
                  : 'No activities match the selected filter.'}
              </div>
            ) : (
              filteredMilestones.map((m) => {
                const isCompleted = m.status === 'completed'
                const isInProgress = m.status === 'in_progress'

                return (
                  <div key={m.id} className={styles.timelineItem}>
                    {/* Numbered Node Circle */}
                    <div
                      className={`${styles.nodeCircle} ${
                        isCompleted
                          ? styles.nodeCompleted
                          : isInProgress
                          ? styles.nodeInProgress
                          : styles.nodeUpcoming
                      }`}
                    >
                      {isCompleted ? <Check size={20} strokeWidth={2.5} /> : m.num}
                    </div>

                    {/* Milestone Content Card */}
                    <div className={styles.milestoneCard}>
                      <div className={styles.milestoneMain}>
                        <div className={styles.milestoneHeaderRow}>
                          <h3 className={styles.milestoneTitle}>{m.title}</h3>
                          <span
                            className={
                              isCompleted
                                ? styles.badgeCompleted
                                : isInProgress
                                ? styles.badgeInProgress
                                : styles.badgeUpcoming
                            }
                          >
                            {m.statusLabel}
                          </span>
                        </div>

                        <p className={styles.milestoneDesc}>{m.description}</p>

                        <div className={styles.milestoneMetaTime}>
                          <Clock size={13} />
                          <span>Estimated time: {m.estimatedHours} hours</span>
                          <span>•</span>
                          <span>{m.provider}</span>
                          <span>•</span>
                          <span>Level: {m.level}</span>
                        </div>

                        {/* Skills Gained Pills */}
                        <div className={styles.skillsGainedRow}>
                          <span className={styles.skillsGainedLabel}>Skills Gained</span>
                          {m.skills.map((skill, sIdx) => (
                            <span key={sIdx} className={styles.skillPill}>
                              {skill}
                            </span>
                          ))}
                        </div>

                        {/* Hands-on Lab CTA — only shown for completed items */}
                        {isCompleted && (
                          <a
                            href={LABS_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.labBtn}
                          >
                            <FlaskConical size={13} />
                            Try Hands-on Lab
                          </a>
                        )}
                      </div>

                      {/* Milestone Right: Progress or Action */}
                      <div className={styles.milestoneRight}>
                        {isCompleted && (
                          <div className={styles.milestoneProgressBar}>
                            <div className={styles.progressTrack}>
                              <div
                                className={styles.progressFillGreen}
                                style={{ width: '100%' }}
                              />
                            </div>
                            <span className={styles.progressNum}>100%</span>
                          </div>
                        )}

                        {isInProgress && (
                          <>
                            <div className={styles.milestoneProgressBar}>
                              <div className={styles.progressTrack}>
                                <div
                                  className={styles.progressFillBlue}
                                  style={{ width: `${m.progress}%` }}
                                />
                              </div>
                              <span className={styles.progressNum}>{m.progress}%</span>
                            </div>
                            <button
                              type="button"
                              className={styles.continueBtn}
                              onClick={() => navigate(m.courseUrl)}
                            >
                              {m.actionLabel}
                            </button>
                          </>
                        )}

                        {!isCompleted && !isInProgress && (
                          <button
                            type="button"
                            className={styles.outlineActionBtn}
                            onClick={() => navigate(m.courseUrl)}
                          >
                            {m.actionLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Widgets */}
        <div className={styles.rightColumn}>
          {/* Widget 1: Path Overview */}
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>Path Overview</h3>
            <div className={styles.overviewList}>
              <div className={styles.overviewRow}>
                <div className={styles.overviewLabelGroup}>
                  <User size={15} />
                  <span>Target Role</span>
                </div>
                <span className={styles.overviewValue}>
                  {user?.role_id?.title || 'Designated Role'}
                </span>
              </div>

              <div className={styles.overviewRow}>
                <div className={styles.overviewLabelGroup}>
                  <Target size={15} />
                  <span>Cadre Level</span>
                </div>
                <span className={styles.overviewValue}>Level {user?.level || 1}</span>
              </div>

              <div className={styles.overviewRow}>
                <div className={styles.overviewLabelGroup}>
                  <ListChecks size={15} />
                  <span>Learning Activities</span>
                </div>
                <span className={styles.overviewValue}>{totalActivities}</span>
              </div>

              <div className={styles.overviewRow}>
                <div className={styles.overviewLabelGroup}>
                  <CheckCircle2 size={15} />
                  <span>Completed</span>
                </div>
                <span className={styles.overviewValue}>{completedCount}</span>
              </div>

              <div className={styles.overviewRow}>
                <div className={styles.overviewLabelGroup}>
                  <PlayCircle size={15} />
                  <span>In Progress</span>
                </div>
                <span className={styles.overviewValue}>{inProgressCount}</span>
              </div>

              <div className={styles.overviewRow}>
                <div className={styles.overviewLabelGroup}>
                  <CircleDot size={15} />
                  <span>Upcoming</span>
                </div>
                <span className={styles.overviewValue}>{upcomingCount}</span>
              </div>

              <div className={styles.overviewSeparator} />

              <div className={styles.overviewRow}>
                <div className={styles.overviewLabelGroup}>
                  <Clock size={15} />
                  <span>Remaining Time</span>
                </div>
                <span className={styles.overviewValue} style={{ color: '#0f172a' }}>
                  {remainingHours} Hours
                </span>
              </div>
            </div>
          </div>

          {/* Widget 2: AI Path Logic */}
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>AI Path Logic</h3>
            <div className={styles.logicList}>
              <div className={styles.logicItem}>
                <CheckCircle2 size={16} className={styles.logicCheck} />
                <span>Diagnostic test scores</span>
              </div>
              <div className={styles.logicItem}>
                <CheckCircle2 size={16} className={styles.logicCheck} />
                <span>Role competency benchmarks</span>
              </div>
              <div className={styles.logicItem}>
                <CheckCircle2 size={16} className={styles.logicCheck} />
                <span>Course duration and prerequisites</span>
              </div>
              <div className={styles.logicItem}>
                <CheckCircle2 size={16} className={styles.logicCheck} />
                <span>Priority gap resolution order</span>
              </div>
            </div>

            <Link to="/skill-gaps" className={styles.viewGapBtn}>
              <span>View Skill Gap Analysis</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Widget 3: Skills You Will Develop */}
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>Skills You Will Develop</h3>
            <table className={styles.skillsTable}>
              <thead>
                <tr>
                  <th style={{ width: '42%' }}>Skill</th>
                  <th>Current</th>
                  <th>Target</th>
                  <th>After Path</th>
                </tr>
              </thead>
              <tbody>
                {topGaps.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '16px' }}>
                      No evaluated gaps.
                    </td>
                  </tr>
                ) : (
                  topGaps.slice(0, 5).map((g) => (
                    <tr key={g._id || g.competency_id?._id}>
                      <td>
                        <div className={styles.skillNameCol}>
                          <span>•</span>
                          <span style={{ fontSize: '0.8125rem' }}>{g.competency_id?.name}</span>
                        </div>
                      </td>
                      <td>{g.current_level}/5</td>
                      <td>{g.required_level}/5</td>
                      <td className={styles.afterPathScore}>{g.required_level}/5</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Encouragement Banner */}
      <div className={styles.bottomBanner}>
        <div className={styles.bannerLeft}>
          <div className={styles.rocketIconBox}>
            <Rocket size={24} />
          </div>
          <div>
            <h3 className={styles.bannerTitle}>Stay focused on your journey!</h3>
            <p className={styles.bannerSubtext}>
              Complete courses in your sequence to prepare for verified competency evaluations.
            </p>
          </div>
        </div>

        <div className={styles.bannerProgressCenter}>
          <div className={styles.bannerProgressTop}>{progressPercent}% Complete</div>
          <div className={styles.bannerProgressTrack}>
            <div className={styles.bannerProgressFill} style={{ width: `${progressPercent}%` }} />
          </div>
          <div className={styles.bannerProgressSub}>
            {completedCount} of {totalActivities} learning activities completed
          </div>
        </div>

        <div className={styles.bannerActions}>
          <button
            type="button"
            className={styles.bannerContinueBtn}
            onClick={() => navigate(milestones[0]?.courseUrl || '/recommendations')}
          >
            Continue Learning
          </button>
          <Link to="/recommendations" className={styles.bannerExploreLink}>
            <span>Explore Recommendations</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Explainability Modal: Why This Path? */}
      {showWhyModal && (
        <div className={styles.modalOverlay} onClick={() => setShowWhyModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className={styles.recSparkleBox} style={{ width: 32, height: 32 }}>
                  <Sparkles size={16} />
                </div>
                <h3 className={styles.modalTitle}>AI Learning Path Sequencing Logic</h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowWhyModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.6, margin: 0 }}>
                  KaushalAI synthesized your path based on your role (
                  <strong>{user?.role_id?.title || 'Designated Role'}</strong>) and diagnostic assessment score.
                </p>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <h4 style={{ fontSize: 13.5, fontWeight: 700, margin: '0 0 10px', color: '#0f172a' }}>
                  🎯 Sequencing Methodology
                </h4>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                  <li>
                    <strong>Critical Gap Reduction:</strong> Addresses your largest evaluated competency gaps first.
                  </li>
                  <li>
                    <strong>Dependency Ordering:</strong> Foundational modules are introduced before advanced domain applications.
                  </li>
                  <li>
                    <strong>Official Alignment:</strong> Curriculum uses verified materials from iGOT Karmayogi and training academies.
                  </li>
                </ul>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 12,
                    background: '#ffffff',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>CADRE ROLE</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                    {user?.role_id?.title || 'Active Role'}
                  </div>
                  <div style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>Target: Level {user?.level || 1}</div>
                </div>

                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 12,
                    background: '#ffffff',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>CURRICULUM RUNWAY</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#4f46e5', marginTop: 4 }}>
                    {totalActivities} Courses
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{remainingHours} hours estimated</div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <Link
                to="/skill-gaps"
                className={styles.outlineActionBtn}
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => setShowWhyModal(false)}
              >
                <span>Examine Gap Matrix</span>
                <ExternalLink size={13} />
              </Link>
              <button
                type="button"
                className={styles.continueBtn}
                onClick={() => setShowWhyModal(false)}
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
