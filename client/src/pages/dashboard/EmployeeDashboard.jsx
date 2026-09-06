import { useState } from 'react'
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
  AlertTriangle,
  BookOpen,
  Landmark,
  Check,
  Sparkles,
  FlaskConical,
} from 'lucide-react'
import CompetencyIcon from '../../components/shared/CompetencyIcon'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import LearningPathWidget from '../../components/dashboard/LearningPathWidget'
import RecentAssessmentsWidget from '../../components/dashboard/RecentAssessmentsWidget'
import LearningProgressDonut from '../../components/dashboard/LearningProgressDonut'
import AiAssistantWidget from '../../components/dashboard/AiAssistantWidget'
import SkillCompetencyOverview from '../../components/dashboard/SkillCompetencyOverview'
import styles from './EmployeeDashboard.module.css'

// Virtual Labs URL — reads from .env, falls back to deployed URL
const LABS_URL = import.meta.env.VITE_LABS_APP_URL || 'https://kaushal-ai-virtual-labs.vercel.app'

// ── Skeletons ─────────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className={styles.grid}>
      {Array.from({ length: 6 }).map((_, i) => <Skeleton.Card key={i} />)}
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

  // Enroll in course mutation
  const enrollMutation = useMutation({
    mutationFn: (courseId) => enrollInCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myEnrollments'] })
    },
  })

  // Loading state
  const isLoading =
    skillGapsQuery.isLoading ||
    recsQuery.isLoading ||
    lpQuery.isLoading ||
    enrollmentsQuery.isLoading

  if (isLoading) return <DashboardSkeleton />

  const skillGaps = skillGapsQuery.data?.skill_gaps || []
  const allRecs = recsQuery.data?.recommendations || []
  const lpData = lpQuery.data?.learning_path || null
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

  // Client-side course search filter
  const filteredRecs = allRecs.filter((r) => {
    const courseTitle = r.course_id?.title || r.title || ''
    return courseTitle.toLowerCase().includes(courseSearchTerm.toLowerCase().trim())
  })

  const enrolledCourseIds = new Set(
    enrollments.map((e) =>
      typeof e.courseId === 'object' ? String(e.courseId._id) : String(e.courseId)
    )
  )

  // ── Metrics Calculation ─────────────────────────────────────────────────────
  // 1. Learning Streak Calculation
  const activityDates = new Set()
  attempts.forEach((a) => {
    if (a.attemptedAt) activityDates.add(new Date(a.attemptedAt).toISOString().slice(0, 10))
  })
  enrollments.forEach((e) => {
    if (e.updatedAt) activityDates.add(new Date(e.updatedAt).toISOString().slice(0, 10))
    if (e.startedAt) activityDates.add(new Date(e.startedAt).toISOString().slice(0, 10))
  })

  let streak = 0
  const checkDate = new Date()
  const todayKey = checkDate.toISOString().slice(0, 10)
  checkDate.setDate(checkDate.getDate() - 1)
  const yesterdayKey = checkDate.toISOString().slice(0, 10)

  let cursor = activityDates.has(todayKey)
    ? new Date()
    : activityDates.has(yesterdayKey)
    ? checkDate
    : null

  if (cursor) {
    while (true) {
      const key = cursor.toISOString().slice(0, 10)
      if (activityDates.has(key)) {
        streak += 1
        cursor.setDate(cursor.getDate() - 1)
      } else {
        break
      }
    }
  }
  const displayStreak = streak > 0 ? streak : (attempts.length > 0 || enrollments.length > 0) ? 1 : 0

  // 2. Total Learning Hours (This Month) & Category Breakdown Calculation
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  let igotHours = 0
  let nsstaHours = 0
  let otherHours = 0

  enrollments.forEach((e) => {
    const d = e.updatedAt ? new Date(e.updatedAt) : new Date()
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      const hrs = Number(e.courseId?.durationHours || e.courseId?.estimatedHours) || 8
      if (e.courseId?.provider?.toLowerCase().includes('igot') || e.courseId?.source === 'igot') {
        igotHours += hrs
      } else if (e.courseId?.provider?.toLowerCase().includes('nssta') || e.courseId?.source === 'nssta') {
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
  const assessmentHours = Math.round((thisMonthAttempts.length * (10 / 60)) * 10) / 10

  const computedTotal = Math.round((igotHours + nsstaHours + assessmentHours + otherHours) * 10) / 10
  const totalLearningHours = computedTotal

  const donutData = [
    { name: 'iGOT Courses', value: igotHours || 0, key: 'igot', color: '#6366f1' },
    { name: 'NSSTA/TPAC', value: nsstaHours || 0, key: 'nssta', color: '#10b981' },
    { name: 'Assessments', value: assessmentHours || 0, key: 'assessments', color: '#f59e0b' },
    { name: 'Others', value: otherHours || 0, key: 'others', color: '#06b6d4' },
  ]

  // Top 4 skill gaps
  const topGaps = skillGaps.slice(0, 4)

  // Map skill gaps for SkillCompetencyOverview
  const gapsForOverview = skillGaps.map((g) => ({
    name: g.competency_id?.name || 'Competency',
    category: g.competency_id?.category || 'technical',
    current_level: g.current_level,
    required_level: g.required_level,
    gap: g.gap,
    gap_severity: g.priority,
  }))

  return (
    <div className={styles.page}>
      {/* ── Middle Grid: Competency Overview + Top Skill Gaps + Recommended ── */}
      <div className={styles.middleGrid}>
        {/* Col 1: Competency Breakdown (Percentage-based overview on 5-point scale) */}
        <SkillCompetencyOverview gaps={gapsForOverview} />

        {/* Col 2: Top Skill Gaps */}
        <Card padding="compact">
          <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
            <div className={styles.cardHeaderRight}>
              <div>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold' }}>{t('dashboard.top_skill_gaps')}</h3>
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                  {t('dashboard.prioritised_by_role')}
                </span>
              </div>
              <Link to="/skill-gaps" className={styles.viewAllLink}>
                {t('dashboard.view_all')}
              </Link>
            </div>
          </div>
          <Card.Body>
            <div className={styles.gapList}>
              {topGaps.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                  No skill gaps detected. You are on track across all role competencies!
                </div>
              ) : (
                topGaps.map((g) => {
                  const comp = g.competency_id || {}
                  const cur = g.current_level || 1
                  const req = g.required_level || 1
                  const pct = Math.min(100, Math.round((cur / 5) * 100))
                  const delta = Math.max(0, g.gap)

                  return (
                    <div key={g._id || comp._id} className={styles.gapRow}>
                      <div className={styles.gapIcon}>
                        <CompetencyIcon name={comp.name} category={comp.category} size="sm" color="var(--color-primary-600)" />
                      </div>

                      <div className={styles.gapInfo}>
                        <span className={styles.gapName}>{comp.name}</span>
                        <span className={styles.gapSubtitle}>
                          {t('dashboard.required')}: Lvl {req} &nbsp;|&nbsp; {t('dashboard.current')}: Lvl {cur}
                        </span>
                        <div className={styles.gapBarWrap}>
                          <div
                            className={styles.gapBarFill}
                            style={{
                              width: `${pct}%`,
                              backgroundColor:
                                g.priority === 'high'
                                  ? '#ef4444'
                                  : g.priority === 'medium'
                                  ? '#f59e0b'
                                  : '#10b981',
                            }}
                          />
                        </div>
                      </div>

                      <div className={styles.gapBadgeRight}>
                        {delta > 0 ? (
                          `${t('dashboard.gap')}: -${delta}`
                        ) : (
                          <span style={{ color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Check size={12} strokeWidth={2.5} /> {t('dashboard.met')}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card.Body>
        </Card>

        {/* Col 3: Recommended for You (AI Ranked with Explanations) */}
        <Card padding="compact">
          <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
            <div className={styles.cardHeaderRight}>
              <div>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold' }}>{t('dashboard.recommended_for_you')}</h3>
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                  AI-Ranked for your Cadre Gaps
                </span>
              </div>
              <Link to="/recommendations" className={styles.viewAllLink}>
                {t('dashboard.view_all')}
              </Link>
            </div>
          </div>
          <Card.Body>
            <div className={styles.recList}>
              {filteredRecs.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                  No courses found. Complete your diagnostic test to see recommendations.
                </div>
              ) : (
                filteredRecs.slice(0, 4).map((r) => {
                  const course = r.course_id || {}
                  const cId = course._id || r.course_id
                  const isEnrolled = enrolledCourseIds.has(String(cId))
                  const providerName = (course.provider || 'iGOT').toUpperCase()
                  const isNssta = providerName.includes('NSSTA')
                  const durationHrs = course.duration || course.estimatedHours || 15

                  return (
                    <div key={r._id || cId} className={styles.recItem} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', width: '100%', gap: 12, alignItems: 'flex-start' }}>
                        <div className={styles.recIcon} style={{ marginTop: 2 }}>
                          {isNssta ? (
                            <Landmark size={18} color="var(--color-nssta)" />
                          ) : (
                            <BookOpen size={18} color="var(--color-primary-600)" />
                          )}
                        </div>

                        <div className={styles.recContent} style={{ flex: 1 }}>
                          <span className={styles.recTitle} title={course.title}>
                            {course.title}
                          </span>
                          <div className={styles.recTags} style={{ marginTop: 4 }}>
                            <Badge variant={isNssta ? 'nssta' : 'igot'}>
                              {isNssta ? 'NSSTA' : 'iGOT'}
                            </Badge>
                            <span className={styles.recDuration}>
                              {durationHrs} {t('dashboard.hrs')}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5' }}>
                              #{r.priority_rank} Priority
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={styles.startCourseBtn}
                          onClick={() => enrollMutation.mutate(cId)}
                          disabled={isEnrolled || enrollMutation.isPending}
                        >
                          {isEnrolled ? t('dashboard.enrolled') : t('dashboard.start')}
                        </button>
                      </div>

                      {/* AI Explanation Reason */}
                      {r.reason && (
                        <p style={{
                          fontSize: 11.5,
                          color: '#475569',
                          margin: '6px 0 0 30px',
                          lineHeight: 1.4,
                          background: '#f8fafc',
                          padding: '4px 8px',
                          borderRadius: 6,
                          borderLeft: '2px solid #4f46e5',
                        }}>
                          <Sparkles size={11} color="#4f46e5" style={{ display: 'inline', marginRight: 4 }} />
                          {r.reason}
                        </p>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* ── Labs Teaser Banner ──────────────────────────────────────────────── */}
      <div className={styles.labsBanner}>
        <div className={styles.labsBannerLeft}>
          <div className={styles.labsBannerIcon}>
            <FlaskConical size={22} />
          </div>
          <div>
            <div className={styles.labsBannerTitle}>
              🧪 New: Practice what you learn in real Hands-on Labs
            </div>
            <div className={styles.labsBannerSub}>
              Run live Python environments, data analysis exercises, and role-specific simulations — no setup required.
            </div>
          </div>
        </div>
        <a
          href={LABS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.labsBannerBtn}
        >
          <FlaskConical size={15} />
          Explore Labs
        </a>
      </div>

      {/* ── Bottom Widgets: Learning Path + Recent Assessments + AI Assistant + Donut ── */}
      <div className={styles.bottomGrid}>
        <LearningPathWidget items={lpItems} recommendations={allRecs} enrollments={enrollments} />
        <RecentAssessmentsWidget attempts={attempts} />
        <AiAssistantWidget gaps={topGaps.map(g => ({ name: g.competency_id?.name || 'Competency', gap: g.gap }))} />
        <LearningProgressDonut donutData={donutData} totalHours={totalLearningHours} />
      </div>
    </div>
  )
}
