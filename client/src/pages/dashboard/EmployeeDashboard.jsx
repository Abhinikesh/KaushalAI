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

        {/* Right Motif: Quote & Mascot */}
        <div className={styles.heroRight}>
          <div className={styles.heroQuoteBlock}>
            <span className={styles.heroQuoteText}>
              “Better skills.<br />Bigger opportunities.”
            </span>
            <div className={styles.heroTagBadge}>
              <Sparkles size={11} /> Learn • Grow • Achieve
            </div>
          </div>

          <div className={styles.heroMascot}>
            <div
              style={{
                width: 90,
                height: 90,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(59,130,246,0.3) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.25)',
              }}
            >
              <Bot size={48} color="#4f46e5" />
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Four Key Statistics Cards Row ─────────────────────────────────── */}
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
              <span className={`${styles.trendBadge} ${styles.trendUp}`}>
                <TrendingUp size={10} /> +12%
              </span>
            </div>
            <span className={styles.statLabel}>Learning Progress</span>
            <span className={styles.statSub}>Overall completion</span>
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
              <span className={`${styles.trendBadge} ${styles.trendUp}`}>
                <TrendingUp size={10} /> +3%
              </span>
            </div>
            <span className={styles.statLabel}>Skills</span>
            <span className={styles.statSub}>Skills achieved</span>
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
              <span className={`${styles.trendBadge} ${styles.trendNeutral}`}>
                ↓ 1 gap
              </span>
            </div>
            <span className={styles.statLabel}>Skill Gaps</span>
            <span className={styles.statSub}>Areas to improve</span>
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
              <span className={`${styles.trendBadge} ${styles.trendUp}`}>
                <TrendingUp size={10} /> +18%
              </span>
            </div>
            <span className={styles.statLabel}>Learning Hours</span>
            <span className={styles.statSub}>Total learning time</span>
          </div>
        </div>
      </section>

      {/* ── 3. Middle Section: 2 Columns (~62% Left, ~38% Right) ──────────────── */}
      <section className={styles.middleGrid} aria-label="Skills and Recommendations Grid">
        {/* Left Column: Skill Gap Analysis (NO RECOMMENDED COURSE COLUMN) */}
        <div className={styles.cardPanel}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderTitleGroup}>
              <div className={styles.cardHeaderIcon} style={{ background: '#e0e7ff', color: '#4338ca' }}>
                <Target size={18} />
              </div>
              <div>
                <h2 className={styles.cardTitle}>Skill Gap Analysis</h2>
                <p className={styles.cardSubtitle}>
                  AI-powered insights into your current and required skill levels
                </p>
              </div>
            </div>
            <Link to="/skill-gaps" className={styles.cardActionLink}>
              View Detailed Report <ArrowRight size={14} />
            </Link>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.skillTable}>
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>Current Level</th>
                  <th>Required Level</th>
                  <th>Gap</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {skillGaps.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-disabled)' }}>
                      No skill gaps detected. You are on track across all cadre competencies!
                    </td>
                  </tr>
                ) : (
                  skillGaps.slice(0, 5).map((g) => {
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
                              <Check size={12} strokeWidth={2.5} style={{ marginRight: 3 }} /> Met
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
              <span>Low Gap (5–19%)</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#f59e0b' }} />
              <span>Moderate Gap (20–34%)</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#ef4444' }} />
              <span>Critical Gap (≥35%)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Recommended for You (Single Primary Recommendation Area) */}
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
              View All <ArrowRight size={14} />
            </Link>
          </div>

          <div className={styles.recsList}>
            {filteredRecs.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--color-text-disabled)' }}>
                No course recommendations available.
              </div>
            ) : (
              filteredRecs.slice(0, 4).map((r) => {
                const course = r.course_id && typeof r.course_id === 'object' ? r.course_id : {}
                const cId = course._id || (typeof r.course_id === 'string' ? r.course_id : null)
                const isEnrolled = cId ? enrolledCourseIds.has(String(cId)) : false
                const durationHrs = course.durationHours || course.estimatedHours || 6
                const courseLevel = course.difficulty || course.level || 'Beginner'
                const visual = getCourseVisual(course)

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
                  >
                    <div
                      className={styles.recThumbnailBox}
                      style={{ background: visual.bg, color: visual.color }}
                    >
                      {visual.icon}
                    </div>

                    <div className={styles.recDetailsCol}>
                      <h4 className={styles.recCardTitle} title={course.title}>
                        {course.title || 'Course Module'}
                      </h4>

                      <div className={styles.recTagsRow}>
                        <span className={styles.recBadgeLevel}>{courseLevel}</span>
                        <span className={styles.recDurationText}>
                          <Clock size={11} /> {durationHrs}h
                        </span>
                        {isEnrolled && (
                          <span style={{ color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            <Check size={11} /> Enrolled
                          </span>
                        )}
                      </div>

                      {r.reason && (
                        <div className={styles.recReasonText} title={r.reason}>
                          <Sparkles size={11} /> {r.reason}
                        </div>
                      )}
                    </div>

                    <ChevronRight size={18} className={styles.recChevron} />
                  </div>
                )
              })
            )}
          </div>
        </div>
      </section>

      {/* ── 4. Lower Section: 3 Columns on Desktop ────────────────────────────── */}
      <section className={styles.lowerGrid} aria-label="Active Learning and Practice">
        {/* Column 1: Continue Learning */}
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
              View All <ArrowRight size={14} />
            </Link>
          </div>

          <div className={styles.continueContentArea}>
            {inProgressEnrollments.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No Courses in Progress"
                description="Explore your recommendations above to start building cadre skills."
                action="Explore Courses"
                onAction={() => navigate('/recommendations')}
              />
            ) : (
              inProgressEnrollments.slice(0, 2).map((e) => {
                const course = e.courseId && typeof e.courseId === 'object' ? e.courseId : {}
                const cId = course._id || e.courseId
                const progress = Math.min(100, Math.max(0, e.progressPercent || 0))
                const provider = course.provider || 'iGOT Karmayogi'

                return (
                  <div key={e._id || cId} className={styles.continueCard}>
                    <div className={styles.continueHeader}>
                      <div className={styles.continueIconBox}>
                        <Play size={16} />
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
                        <span>{progress}%</span>
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
