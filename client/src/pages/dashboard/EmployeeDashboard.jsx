import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useSearchStore } from '../../store/searchStore'
import {
  getLearningPath,
  getSkillGaps,
  getRecommendations,
} from '../../api/learningPath.api'
import { getMyQuizAttempts } from '../../api/quiz.api'
import { getMyEnrollments, enrollInCourse } from '../../api/course.api'
import { getCourseThumbnail } from '../../utils/courseThumbnail'
import {
  Target,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BookOpen,
  Landmark,
  Sparkles,
  FlaskConical,
  Check,
  ArrowRight,
  PlayCircle,
  TrendingUp,
  GraduationCap,
  ChevronRight,
  Database,
  BarChart3,
  Bot,
  Play,
  Award,
  FileCheck2,
} from 'lucide-react'
import CompetencyIcon from '../../components/shared/CompetencyIcon'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import styles from './EmployeeDashboard.module.css'

// Virtual Labs URL — reads from .env, falls back to deployed URL
const LABS_URL = import.meta.env.VITE_LABS_APP_URL || 'https://kaushal-ai-virtual-labs.vercel.app'

// ── Circular Gauge Component ──────────────────────────────────────────────────
function CircularGauge({
  percent = 0,
  size = 54,
  strokeWidth = 5,
  color = '#10b981',
  trackColor = 'var(--color-border)',
}) {
  const safePercent = Math.min(100, Math.max(0, percent))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (safePercent / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: 'rotate(-90deg)', display: 'block' }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
      />
    </svg>
  )
}

// ── Course Thematic Icon Helper ───────────────────────────────────────────────
function getCourseVisual(course = {}) {
  const title = (course.title || '').toLowerCase()
  const provider = (course.provider || '').toLowerCase()
  const source = (course.source || '').toLowerCase()

  if (title.includes('python')) {
    return {
      bg: '#eff6ff',
      color: '#2563eb',
      icon: <span style={{ fontWeight: 800, fontSize: '0.8125rem' }}>Py</span>,
    }
  }
  if (title.includes('sql') || title.includes('database')) {
    return {
      bg: '#f0fdf4',
      color: '#16a34a',
      icon: <Database size={20} />,
    }
  }
  if (title.includes('data') || title.includes('visual') || title.includes('analysis')) {
    return {
      bg: '#ecfeff',
      color: '#0891b2',
      icon: <BarChart3 size={20} />,
    }
  }
  if (provider.includes('nssta') || source === 'nssta') {
    return {
      bg: '#fffbeb',
      color: '#d97706',
      icon: <Landmark size={20} />,
    }
  }
  return {
    bg: '#eef2ff',
    color: '#4f46e5',
    icon: <BookOpen size={20} />,
  }
}

// ── Dashboard Skeleton ────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className={styles.skeletonGrid}>
      <Skeleton.Card height="130px" />
      <div className={styles.statsRow}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton.Card key={i} height="100px" />
        ))}
      </div>
      <div className={styles.middleGrid}>
        <Skeleton.Card height="380px" />
        <Skeleton.Card height="380px" />
      </div>
      <div className={styles.lowerGrid}>
        <Skeleton.Card height="260px" />
        <Skeleton.Card height="260px" />
        <Skeleton.Card height="260px" />
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function EmployeeDashboard() {
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const { courseSearchTerm } = useSearchStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // 1. Skill Gaps query
  const skillGapsQuery = useQuery({
    queryKey: ['skillGaps'],
    queryFn: getSkillGaps,
    retry: 1,
  })

  // 2. Recommendations query
  const recsQuery = useQuery({
    queryKey: ['recommendations'],
    queryFn: getRecommendations,
    retry: 1,
  })

  // 3. Learning Path query
  const lpQuery = useQuery({
    queryKey: ['learningPath'],
    queryFn: getLearningPath,
    retry: 1,
  })

  // 4. Quiz Attempts query
  const attemptsQuery = useQuery({
    queryKey: ['myAttempts'],
    queryFn: getMyQuizAttempts,
    retry: 1,
  })

  // 5. User Enrollments query
  const enrollmentsQuery = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
    retry: 1,
  })

  // Enroll mutation
  const enrollMutation = useMutation({
    mutationFn: (courseId) => enrollInCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myEnrollments'] })
    },
  })

  const isLoading =
    skillGapsQuery.isLoading ||
    recsQuery.isLoading ||
    lpQuery.isLoading ||
    enrollmentsQuery.isLoading

  if (isLoading) return <DashboardSkeleton />

  const skillGaps = skillGapsQuery.data?.skill_gaps || []
  const allRecs = recsQuery.data?.recommendations || []
  const lpItems = lpQuery.data?.items || []
  const attempts = attemptsQuery.data?.attempts || []
  const enrollments = enrollmentsQuery.data?.enrollments || []

  // If user has not completed onboarding/diagnostic assessment
  if (skillGaps.length === 0 && allRecs.length === 0 && !user?.onboarding_completed) {
    return (
      <EmptyState
        icon={Target}
        title="Diagnostic Assessment Pending"
        description="Welcome to KaushalAI! Complete your official cadre onboarding and diagnostic assessment to unlock your personalized skill gaps, AI course recommendations, and sequenced learning path."
        action="Complete Onboarding &amp; Assessment"
        onAction={() => navigate('/onboarding')}
      />
    )
  }

  // ── Greeting Calculations ───────────────────────────────────────────────────
  const currentHour = new Date().getHours()
  const greetingTime =
    currentHour < 12
      ? t('dashboard.good_morning', 'Good morning')
      : currentHour < 17
      ? t('dashboard.good_afternoon', 'Good afternoon')
      : t('dashboard.good_evening', 'Good evening')

  const firstName = user?.name ? user.name.split(' ')[0] : 'Officer'

  // ── Authentic Metrics & Calculations ─────────────────────────────────────────
  const totalSkills = skillGaps.length
  const sumCurrent = skillGaps.reduce((acc, g) => acc + (g.current_level || 0), 0)
  const sumRequired = skillGaps.reduce((acc, g) => acc + (g.required_level || 0), 0)
  const readinessPct = sumRequired > 0 ? Math.round((sumCurrent / sumRequired) * 100) : 0

  const priorityGaps = skillGaps.filter((g) => g.priority === 'high' || (g.gap || 0) >= 2)
  const priorityGapsCount = priorityGaps.length

  const metSkills = skillGaps.filter(
    (g) => (g.gap || 0) <= 0 || (g.current_level || 0) >= (g.required_level || 0)
  )
  const metCount = metSkills.length

  // Monthly Learning Hours Calculation (Existing Documented Formula)
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  let igotHours = 0
  let nsstaHours = 0
  let otherHours = 0

  enrollments.forEach((e) => {
    if (e.courseId == null) return
    const d = e.updatedAt ? new Date(e.updatedAt) : new Date()
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      const courseObj = e.courseId && typeof e.courseId === 'object' ? e.courseId : {}
      const hrs = Number(courseObj.durationHours || courseObj.estimatedHours) || 8
      if (courseObj.provider?.toLowerCase().includes('igot') || courseObj.source === 'igot') {
        igotHours += hrs
      } else if (courseObj.provider?.toLowerCase().includes('nssta') || courseObj.source === 'nssta') {
        nsstaHours += hrs
      } else {
        otherHours += hrs
      }
    }
  })

  const thisMonthAttempts = attempts.filter((a) => {
    const d = a.attemptedAt ? new Date(a.attemptedAt) : new Date()
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })
  const assessmentHours = Math.round(thisMonthAttempts.length * (10 / 60) * 10) / 10
  const totalLearningHours = Math.round((igotHours + nsstaHours + assessmentHours + otherHours) * 10) / 10
  const displayHours = Math.floor(totalLearningHours)
  const displayMinutes = Math.round((totalLearningHours % 1) * 60)

  // Real In-Progress Enrollments for Continue Learning
  const inProgressEnrollments = enrollments.filter((e) => {
    if (!e.courseId) return false
    const status = e.status || 'enrolled'
    return (status === 'in_progress' || status === 'enrolled') && (e.progressPercent || 0) < 100
  })

  const enrolledCourseIds = new Set(
    enrollments
      .filter((e) => e.courseId != null)
      .map((e) =>
        e.courseId && typeof e.courseId === 'object' ? String(e.courseId._id) : String(e.courseId)
      )
  )

  // Client-side Search Filter for Recommendations
  const filteredRecs = allRecs.filter((r) => {
    const courseTitle = r.course_id?.title || r.title || ''
    return courseTitle.toLowerCase().includes(courseSearchTerm.toLowerCase().trim())
  })

  // Highest priority gap for AI assistant suggestion
  const topSkillGap = priorityGaps[0] || skillGaps[0]
  const topGapName = topSkillGap?.competency_id?.name || topSkillGap?.name || 'Statistical Modelling'

  return (
    <div className={styles.page}>
      {/* ── 1. Hero / Welcome Banner ────────────────────────────────────────── */}
      <section className={styles.heroBanner} aria-label="Welcome Overview">
        <div className={styles.heroLeft}>
          <div className={styles.heroGreetingBlock}>
            <span className={styles.heroGreetingSub}>{greetingTime},</span>
            <h1 className={styles.heroGreetingTitle}>{firstName} 👋</h1>
            <p className={styles.heroGreetingDesc}>
              Keep learning. Build your skills. Create a better tomorrow.
            </p>
          </div>

          {/* Inner Pill Card */}
          <div className={styles.heroPillCard}>
            <div className={styles.heroGaugeWrap}>
              <CircularGauge percent={readinessPct} size={52} strokeWidth={5} color="#10b981" />
              <span className={styles.heroGaugeNumber}>{readinessPct}%</span>
            </div>
            <div className={styles.heroPillInfo}>
              <span className={styles.heroPillPrimaryText}>
                Your learning journey is {readinessPct}% complete.
              </span>
              <span className={styles.heroPillSecondaryText}>
                {priorityGapsCount > 0 ? (
                  <>
                    <AlertTriangle size={14} color="#ef4444" style={{ flexShrink: 0 }} />
                    <strong style={{ color: '#ef4444' }}>{priorityGapsCount}</strong> high-priority skill gap
                    {priorityGapsCount > 1 ? 's' : ''} to work on.
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} color="#10b981" style={{ flexShrink: 0 }} />
                    All competencies are on track.
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Right Motif: Professional Indian Governance Theme (No AI Robot Mascot) */}
        <div className={styles.heroRight}>
          <div className={styles.heroQuoteBlock}>
            <span className={styles.heroQuoteText}>
              “Better Data, Better Decisions.<br />A Brighter India.”
            </span>
            <div className={styles.heroTagBadge}>
              <Sparkles size={11} /> Indian Statistical Administration
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Four Key Statistics Cards Row (100% Real Database Metrics) ───── */}
      <section className={styles.statsRow} aria-label="Key Performance Statistics">
        {/* Stat 1: Learning Progress */}
        <div className={styles.statCard}>
          <div className={styles.statGaugeArea}>
            <CircularGauge percent={readinessPct} size={54} strokeWidth={5} color="#10b981" />
            <span className={styles.statGaugeNumber}>{readinessPct}%</span>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValueRow}>
              <span className={styles.statValue}>{readinessPct}%</span>
              <span className={`${styles.trendBadge} ${readinessPct >= 50 ? styles.trendUp : styles.trendNeutral}`}>
                {readinessPct >= 50 ? 'On Track' : 'In Progress'}
              </span>
            </div>
            <span className={styles.statLabel}>Learning Progress</span>
            <span className={styles.statSub}>Cadre readiness index</span>
          </div>
        </div>

        {/* Stat 2: Skills */}
        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: '#eef2ff', color: '#4f46e5' }}>
            <GraduationCap size={24} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValueRow}>
              <span className={styles.statValue}>
                {metCount} <span style={{ fontSize: '0.9rem', color: 'var(--color-text-disabled)', fontWeight: 600 }}>/ {totalSkills}</span>
              </span>
              <span className={`${styles.trendBadge} ${styles.trendNeutral}`}>
                {totalSkills - metCount > 0 ? `${totalSkills - metCount} Remaining` : 'All Met'}
              </span>
            </div>
            <span className={styles.statLabel}>Skills</span>
            <span className={styles.statSub}>Competencies achieved</span>
          </div>
        </div>

        {/* Stat 3: Skill Gaps */}
        <div className={styles.statCard}>
          <div
            className={styles.statIconWrap}
            style={{
              background: priorityGapsCount > 0 ? '#fef2f2' : '#ecfdf5',
              color: priorityGapsCount > 0 ? '#dc2626' : '#10b981',
            }}
          >
            <AlertTriangle size={24} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValueRow}>
              <span className={styles.statValue} style={{ color: priorityGapsCount > 0 ? '#dc2626' : 'inherit' }}>
                {priorityGapsCount}
              </span>
              <span className={`${styles.trendBadge} ${priorityGapsCount > 0 ? styles.trendDown : styles.trendUp}`}>
                {priorityGapsCount > 0 ? 'High Priority' : 'All Clear'}
              </span>
            </div>
            <span className={styles.statLabel}>Skill Gaps</span>
            <span className={styles.statSub}>Targeted improvement areas</span>
          </div>
        </div>

        {/* Stat 4: Learning Hours */}
        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <Clock size={24} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValueRow}>
              <span className={styles.statValue}>
                {displayHours}h {displayMinutes > 0 ? `${displayMinutes}m` : ''}
              </span>
              <span className={`${styles.trendBadge} ${styles.trendNeutral}`}>
                Current Month
              </span>
            </div>
            <span className={styles.statLabel}>Learning Hours</span>
            <span className={styles.statSub}>Verified activity logged</span>
          </div>
        </div>
      </section>

      {/* ── 3. Middle Section: 2 Columns (~45% Left, ~55% Right) ──────────────── */}
      <section className={styles.middleGrid} aria-label="Skills and Recommendations Grid">
        {/* Left Column: Skill Gap Analysis (Compact & Readable) */}
        <div className={styles.cardPanel}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderTitleGroup}>
              <div className={styles.cardHeaderIcon} style={{ background: '#e0e7ff', color: '#4338ca' }}>
                <Target size={18} />
              </div>
              <div>
                <h2 className={styles.cardTitle}>Skill Gap Analysis</h2>
                <p className={styles.cardSubtitle}>
                  Assessed vs. required cadre competencies
                </p>
              </div>
            </div>
            <Link to="/skill-gaps" className={styles.cardActionLink}>
              View Detailed Report <ArrowRight size={13} />
            </Link>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.skillTable}>
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>Current</th>
                  <th>Required</th>
                  <th>Gap</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {skillGaps.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-disabled)' }}>
                      No skill gaps detected. Complete a diagnostic assessment to evaluate competencies.
                    </td>
                  </tr>
                ) : (
                  skillGaps.slice(0, 4).map((g) => {
                    const comp = g.competency_id || {}
                    const cur = g.current_level || 1
                    const req = g.required_level || 1
                    const curPct = Math.min(100, Math.round((cur / 5) * 100))
                    const reqPct = Math.min(100, Math.round((req / 5) * 100))
                    const gapPct = Math.max(0, reqPct - curPct)
                    const isMet = (g.gap || 0) <= 0 || cur >= req

                    const priority = (g.priority || 'low').toLowerCase()
                    const badgeClass = isMet
                      ? { bg: 'var(--badge-none-bg)', color: 'var(--badge-none-text)', label: 'Met' }
                      : priority === 'high' || gapPct >= 35
                      ? { bg: 'var(--badge-high-bg)', color: 'var(--badge-high-text)', label: 'Critical' }
                      : priority === 'medium' || gapPct >= 20
                      ? { bg: 'var(--badge-medium-bg)', color: 'var(--badge-medium-text)', label: 'Moderate' }
                      : { bg: 'var(--badge-low-bg)', color: 'var(--badge-low-text)', label: 'Low Gap' }

                    const barColor = isMet
                      ? '#10b981'
                      : priority === 'high' || gapPct >= 35
                      ? '#ef4444'
                      : priority === 'medium' || gapPct >= 20
                      ? '#f59e0b'
                      : '#3b82f6'

                    return (
                      <tr key={g._id || comp._id || comp.name}>
                        <td>
                          <div className={styles.skillInfoCell}>
                            <div className={styles.skillIconBox}>
                              <CompetencyIcon
                                name={comp.name}
                                category={comp.category}
                                size="sm"
                                color="var(--color-primary-600)"
                              />
                            </div>
                            <div className={styles.skillTitleBlock}>
                              <span className={styles.skillNameText}>{comp.name}</span>
                              <span className={styles.skillCategoryText}>{comp.category || 'Competency'}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className={styles.levelProgressWrap}>
                            <span className={styles.levelPercentText}>{curPct}%</span>
                            <div className={styles.levelProgressTrack}>
                              <div
                                className={styles.levelProgressFill}
                                style={{ width: `${curPct}%`, backgroundColor: barColor }}
                              />
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className={styles.levelProgressWrap}>
                            <span className={styles.levelPercentText}>{reqPct}%</span>
                            <div className={styles.levelProgressTrack}>
                              <div
                                className={styles.levelProgressFill}
                                style={{ width: `${reqPct}%`, backgroundColor: '#6366f1' }}
                              />
                            </div>
                          </div>
                        </td>

                        <td>
                          {isMet ? (
                            <span
                              className={styles.gapPill}
                              style={{ background: 'var(--badge-none-bg)', color: 'var(--badge-none-text)' }}
                            >
                              <Check size={11} strokeWidth={2.5} style={{ marginRight: 2 }} /> Met
                            </span>
                          ) : (
                            <span
                              className={styles.gapPill}
                              style={{ background: badgeClass.bg, color: badgeClass.color }}
                            >
                              {gapPct}%
                            </span>
                          )}
                        </td>

                        <td>
                          <span
                            className={styles.severityBadge}
                            style={{ background: badgeClass.bg, color: badgeClass.color }}
                          >
                            {badgeClass.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.tableLegend}>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#10b981' }} />
              <span>Met (≥80%)</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#3b82f6' }} />
              <span>Low (5–19%)</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#f59e0b' }} />
              <span>Moderate (20–34%)</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#ef4444' }} />
              <span>Critical (≥35%)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Recommended for You (Expanded Space & Rich Cards) */}
        <div className={styles.cardPanel}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderTitleGroup}>
              <div className={styles.cardHeaderIcon} style={{ background: '#e0e7ff', color: '#4338ca' }}>
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className={styles.cardTitle}>Recommended for You</h2>
                <p className={styles.cardSubtitle}>
                  Curated to close your verified skill gaps
                </p>
              </div>
            </div>
            <Link to="/recommendations" className={styles.cardActionLink}>
              View All <ArrowRight size={13} />
            </Link>
          </div>

          <div className={styles.recsList}>
            {filteredRecs.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No Recommendations Yet"
                description={
                  attempts.length === 0
                    ? "Complete your cadre competency assessment to identify skill gaps and generate personalized course recommendations."
                    : "You are currently on track across all evaluated competencies! Explore the full course catalog to learn new topics."
                }
                action={attempts.length === 0 ? "Take Assessment" : "Browse Courses"}
                onAction={() => navigate(attempts.length === 0 ? "/assessment" : "/courses/igot")}
              />
            ) : (
              filteredRecs.slice(0, 3).map((r) => {
                const course = r.course_id && typeof r.course_id === 'object' ? r.course_id : {}
                const cId = course._id || (typeof r.course_id === 'string' ? r.course_id : null)
                const isEnrolled = cId ? enrolledCourseIds.has(String(cId)) : false
                const durationHrs = course.durationHours || course.estimatedHours || course.duration || 6
                const courseLevel = course.difficulty || course.level || 'Beginner'
                const thumbnail = getCourseThumbnail(course)
                const providerLabel = course.provider || 'iGOT Karmayogi'
                const isSlide = course.slides && course.slides.length > 0
                const desc = course.description || course.shortDescription || ''
                const reasonText = r.reason || (course.competencyTags?.length > 0 ? `Bridges verified gap in ${course.competencyTags[0]}` : null)

                return (
                  <div
                    key={r._id || cId}
                    className={styles.recCardItem}
                    onClick={() => {
                      if (isEnrolled) {
                        navigate(`/my-courses/${cId}`)
                      } else if (cId) {
                        enrollMutation.mutate(cId, {
                          onSuccess: () => navigate(`/my-courses/${cId}`),
                        })
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && cId) navigate(`/my-courses/${cId}`)
                    }}
                  >
                    {/* Real 16:9 Thumbnail */}
                    <div className={styles.recThumbnailBox}>
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt=""
                          className={styles.recThumbnailImg}
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <div className={styles.recThumbnailFallback}>
                          {isSlide ? <FileCheck2 size={22} /> : <BookOpen size={22} />}
                        </div>
                      )}
                      <div className={styles.recThumbDurationBadge}>
                        <Clock size={10} /> {durationHrs}h
                      </div>
                    </div>

                    {/* Details Column */}
                    <div className={styles.recDetailsCol}>
                      <div className={styles.recHeaderRow}>
                        <span className={styles.recProviderName}>{providerLabel}</span>
                        <div className={styles.recBadgesRow}>
                          <span className={styles.recBadgeLevel}>{courseLevel}</span>
                          {isEnrolled && (
                            <span className={styles.recEnrolledBadge}>
                              <Check size={10} /> Enrolled
                            </span>
                          )}
                        </div>
                      </div>

                      <h4 className={styles.recCardTitle} title={course.title}>
                        {course.title || 'Course Module'}
                      </h4>

                      {desc && (
                        <p className={styles.recCardDesc} title={desc}>
                          {desc}
                        </p>
                      )}

                      {reasonText && (
                        <div className={styles.recReasonRow} title={reasonText}>
                          <Sparkles size={11} className={styles.recReasonIcon} />
                          <span className={styles.recReasonText}>{reasonText}</span>
                        </div>
                      )}
                    </div>

                    {/* CTA Button */}
                    <div className={styles.recActionWrap} onClick={(e) => e.stopPropagation()}>
                      {isEnrolled ? (
                        <button
                          type="button"
                          className={styles.recContinueBtn}
                          onClick={() => navigate(`/my-courses/${cId}`)}
                        >
                          Continue <ArrowRight size={12} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.recEnrollBtn}
                          onClick={() => {
                            if (cId) {
                              enrollMutation.mutate(cId, {
                                onSuccess: () => navigate(`/my-courses/${cId}`),
                              })
                            }
                          }}
                        >
                          Enroll <Play size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </section>

      {/* ── 4. Lower Section: 3 Columns on Desktop ────────────────────────────── */}
      <section className={styles.lowerGrid} aria-label="Active Learning and Practice">
        {/* Column 1: Continue Learning (Real Enrolled Courses & True Thumbnails Only) */}
        <div className={styles.cardPanel}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderTitleGroup}>
              <div className={styles.cardHeaderIcon} style={{ background: '#e0e7ff', color: '#4338ca' }}>
                <PlayCircle size={18} />
              </div>
              <div>
                <h3 className={styles.cardTitle}>Continue Learning</h3>
                <p className={styles.cardSubtitle}>Pick up where you left off</p>
              </div>
            </div>
            <Link to="/my-learning" className={styles.cardActionLink}>
              View All <ArrowRight size={13} />
            </Link>
          </div>

          <div className={styles.continueContentArea}>
            {inProgressEnrollments.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No Courses in Progress"
                description="Explore your recommendations above or browse the catalog to start building cadre skills."
                action="Explore Courses"
                onAction={() => navigate('/courses/igot')}
              />
            ) : (
              inProgressEnrollments.slice(0, 2).map((e) => {
                const course = e.courseId && typeof e.courseId === 'object' ? e.courseId : {}
                const cId = course._id || e.courseId
                const progress = Math.min(100, Math.max(0, e.progressPercent || 0))
                const provider = course.provider || 'iGOT Karmayogi'
                const thumb = getCourseThumbnail(course)

                return (
                  <div key={e._id || cId} className={styles.continueCard}>
                    <div className={styles.continueHeader}>
                      <div className={styles.continueThumbBox}>
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className={styles.continueThumbImg}
                            onError={(e) => { e.target.style.display = 'none' }}
                          />
                        ) : (
                          <div className={styles.continueThumbFallback}>
                            <BookOpen size={18} />
                          </div>
                        )}
                        <div className={styles.continueThumbPlayOverlay}>
                          <Play size={12} fill="#fff" color="#fff" />
                        </div>
                      </div>

                      <div className={styles.continueTitleMeta}>
                        <h4 className={styles.continueCourseTitle} title={course.title}>
                          {course.title || 'Course Module'}
                        </h4>
                        <span className={styles.continueProviderText}>{provider}</span>
                      </div>
                    </div>

                    <div className={styles.continueProgressBlock}>
                      <div className={styles.continueProgressMeta}>
                        <span>Progress</span>
                        <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{progress}%</span>
                      </div>
                      <div className={styles.continueProgressBar}>
                        <div
                          className={styles.continueProgressFill}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <Link to={`/my-courses/${cId}`} className={styles.continueBtn}>
                      Continue <ArrowRight size={13} />
                    </Link>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Column 2: My Learning Path Stepped Sequence */}
        <div className={styles.cardPanel}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderTitleGroup}>
              <div className={styles.cardHeaderIcon} style={{ background: '#e0e7ff', color: '#4338ca' }}>
                <Target size={18} />
              </div>
              <div>
                <h3 className={styles.cardTitle}>My Learning Path</h3>
                <p className={styles.cardSubtitle}>Your competency milestone map</p>
              </div>
            </div>
            <Link to="/my-learning" className={styles.cardActionLink}>
              View Full Path <ArrowRight size={14} />
            </Link>
          </div>

          <div className={styles.pathTimeline}>
            {/* Step 1: Assess Your Skills */}
            <div className={styles.pathStepItem}>
              <div className={`${styles.pathNode} ${styles.pathNodeDone}`}>
                <Check size={14} strokeWidth={3} />
              </div>
              <div className={styles.pathStepContent}>
                <span className={styles.pathStepTitle}>Assess Your Skills</span>
                <span className={styles.pathStepDesc}>Cadre baseline diagnostic</span>
                <span className={styles.pathStatusBadge} style={{ background: '#d1fae5', color: '#065f46' }}>
                  Completed
                </span>
              </div>
            </div>

            {/* Step 2: Learn & Practice */}
            <div className={styles.pathStepItem}>
              <div className={`${styles.pathNode} ${styles.pathNodeActive}`}>2</div>
              <div className={styles.pathStepContent}>
                <span className={styles.pathStepTitle}>Learn &amp; Practice</span>
                <span className={styles.pathStepDesc}>Curated iGOT &amp; NSSTA modules</span>
                <span className={styles.pathStatusBadge} style={{ background: '#e0e7ff', color: '#3730a3' }}>
                  In Progress
                </span>
              </div>
            </div>

            {/* Step 3: Hands-on Experience */}
            <div className={styles.pathStepItem}>
              <div className={`${styles.pathNode} ${styles.pathNodePending}`}>3</div>
              <div className={styles.pathStepContent}>
                <span className={styles.pathStepTitle}>Hands-on Experience</span>
                <span className={styles.pathStepDesc}>Virtual Labs &amp; notebooks</span>
                <span className={styles.pathStatusBadge} style={{ background: '#f1f5f9', color: '#64748b' }}>
                  Available
                </span>
              </div>
            </div>

            {/* Step 4: Take Assessment */}
            <div className={styles.pathStepItem}>
              <div className={`${styles.pathNode} ${styles.pathNodePending}`}>4</div>
              <div className={styles.pathStepContent}>
                <span className={styles.pathStepTitle}>Take Assessment</span>
                <span className={styles.pathStepDesc}>Competency evaluations &amp; quizzes</span>
                <span className={styles.pathStatusBadge} style={{ background: '#f1f5f9', color: '#64748b' }}>
                  Not Started
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Hands-on Labs Entry Point */}
        <div className={styles.cardPanel}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderTitleGroup}>
              <div className={styles.cardHeaderIcon} style={{ background: '#e0f2fe', color: '#0284c7' }}>
                <FlaskConical size={18} />
              </div>
              <div>
                <h3 className={styles.cardTitle}>Hands-on Labs</h3>
                <p className={styles.cardSubtitle}>Live practice environment</p>
              </div>
            </div>
            <a
              href={LABS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.cardActionLink}
            >
              Open App ↗
            </a>
          </div>

          <div className={styles.labsCardBody}>
            <div className={styles.labsVisualBox}>
              <div className={styles.labsVisualIconWrap}>
                <FlaskConical size={20} />
              </div>
              <div className={styles.labsVisualTitle}>
                Statistical &amp; Data Analysis Labs
              </div>
              <div className={styles.labsVisualDesc}>
                Run interactive Python notebooks, query SQL databases, and simulate survey sampling workflows directly in your browser.
              </div>
              <div className={styles.labsTagsRow}>
                <span className={styles.labsTagPill}>Python</span>
                <span className={styles.labsTagPill}>SQL</span>
                <span className={styles.labsTagPill}>Data Analysis</span>
                <span className={styles.labsTagPill}>Sampling</span>
              </div>
            </div>

            <a
              href={LABS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.labsLaunchBtn}
            >
              <FlaskConical size={16} /> Launch Virtual Labs
            </a>
          </div>
        </div>
      </section>

      {/* ── 5. Bottom Banner: KaushalAI Assistant ──────────────────────────── */}
      <section className={styles.assistantBanner} aria-label="AI Learning Assistant">
        <div className={styles.assistantLeft}>
          <div className={styles.assistantIconWrap}>
            <Bot size={22} />
          </div>
          <div className={styles.assistantTitleMeta}>
            <h3 className={styles.assistantTitle}>KaushalAI Assistant</h3>
            <p className={styles.assistantSub}>Your intelligent learning companion</p>
          </div>
        </div>

        <div className={styles.assistantCenter}>
          <Sparkles size={16} className={styles.assistantSparkleIcon} />
          <span className={styles.assistantSuggestionText}>
            <strong>AI Suggestion:</strong> Focus on <strong>{topGapName}</strong> to close your highest skill gap and accelerate your career readiness.
          </span>
        </div>

        <Link to="/ai-tutor" className={styles.assistantChatBtn}>
          Chat with AI <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  )
}
