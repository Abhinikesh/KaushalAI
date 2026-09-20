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
} from 'lucide-react'
import CompetencyIcon from '../../components/shared/CompetencyIcon'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import LearningPathWidget from '../../components/dashboard/LearningPathWidget'
import AiAssistantWidget from '../../components/dashboard/AiAssistantWidget'
import styles from './EmployeeDashboard.module.css'

// Virtual Labs URL — reads from .env, falls back to deployed URL
const LABS_URL = import.meta.env.VITE_LABS_APP_URL || 'https://kaushal-ai-virtual-labs.vercel.app'

// ── Skeletons ─────────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className={styles.skeletonGrid}>
      <Skeleton.Card height="100px" />
      <div className={styles.statsGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton.Card key={i} height="120px" />
        ))}
      </div>
      <Skeleton.Card height="340px" />
      <Skeleton.Card height="280px" />
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

  // ── Client-side Dynamic Greeting ────────────────────────────────────────────
  const currentHour = new Date().getHours()
  const greetingTime =
    currentHour < 12
      ? t('dashboard.good_morning', 'Good morning')
      : currentHour < 17
      ? t('dashboard.good_afternoon', 'Good afternoon')
      : t('dashboard.good_evening', 'Good evening')

  const firstName = user?.name ? user.name.split(' ')[0] : 'Officer'

  // ── Authentic Metrics & Gap Analysis Calculations ───────────────────────────
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

  // Top 4 skill gaps for AI assistant widget
  const topGaps = skillGaps.slice(0, 4)

  // ── Monthly Learning Hours Calculation (Existing Documented Formula) ───────
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

  // ── Real In-Progress Enrollments for Continue Learning ──────────────────────
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

  // ── Client-side Search Filter for Recommendations ───────────────────────────
  const filteredRecs = allRecs.filter((r) => {
    const courseTitle = r.course_id?.title || r.title || ''
    return courseTitle.toLowerCase().includes(courseSearchTerm.toLowerCase().trim())
  })

  return (
    <div className={styles.page}>
      {/* ── 1. Welcome Section ────────────────────────────────────────────── */}
      <section className={styles.welcomeSection} aria-label="Dashboard Overview">
        <div className={styles.welcomeLeft}>
          <h1 className={styles.welcomeGreeting}>
            {greetingTime}, {firstName}
          </h1>
          <p className={styles.welcomeSub}>
            {user?.designation ? `${user.designation} • ` : ''}
            {user?.department || 'Official Statistics & Governance Directorate'}
          </p>
        </div>

        <div className={styles.welcomeBadges}>
          <div className={styles.welcomeBadgePill}>
            <div className={styles.welcomeBadgeIcon} style={{ background: '#eef2ff', color: '#4f46e5' }}>
              <TrendingUp size={13} />
            </div>
            <span>Overall Readiness: <strong>{readinessPct}%</strong></span>
          </div>

          <div className={styles.welcomeBadgePill}>
            <div
              className={styles.welcomeBadgeIcon}
              style={{
                background: priorityGapsCount > 0 ? '#fef2f2' : '#ecfdf5',
                color: priorityGapsCount > 0 ? '#dc2626' : '#10b981',
              }}
            >
              {priorityGapsCount > 0 ? <AlertTriangle size={13} /> : <Check size={13} />}
            </div>
            <span>
              {priorityGapsCount > 0
                ? `${priorityGapsCount} high-priority gap${priorityGapsCount > 1 ? 's' : ''} to address`
                : 'All competencies on track'}
            </span>
          </div>
        </div>
      </section>

      {/* ── 2. Key Statistics Cards (Max 4 Cards) ─────────────────────────── */}
      <section className={styles.statsGrid} aria-label="Key Competency Statistics">
        {/* Stat 1: Overall Readiness */}
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={styles.statIconWrap} style={{ background: '#eef2ff', color: '#4f46e5' }}>
              <Target size={20} />
            </div>
          </div>
          <div className={styles.statValue}>{readinessPct}%</div>
          <div className={styles.statMeta}>
            <span className={styles.statLabel}>Overall Readiness</span>
            <span className={styles.statSub}>Role competency target index</span>
          </div>
        </div>

        {/* Stat 2: Skills at/above Target */}
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={styles.statIconWrap} style={{ background: '#ecfdf5', color: '#10b981' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className={styles.statValue}>
            {metCount} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-gray-400)' }}>/ {totalSkills}</span>
          </div>
          <div className={styles.statMeta}>
            <span className={styles.statLabel}>Skills at Target</span>
            <span className={styles.statSub}>Required proficiencies met</span>
          </div>
        </div>

        {/* Stat 3: Priority Skill Gaps */}
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={styles.statIconWrap} style={{ background: '#fffbeb', color: '#d97706' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className={styles.statValue} style={{ color: priorityGapsCount > 0 ? '#b45309' : '#0f172a' }}>
            {priorityGapsCount}
          </div>
          <div className={styles.statMeta}>
            <span className={styles.statLabel}>Priority Skill Gaps</span>
            <span className={styles.statSub}>Targeted for developmental focus</span>
          </div>
        </div>

        {/* Stat 4: Learning Hours This Month */}
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={styles.statIconWrap} style={{ background: '#f0f9ff', color: '#0284c7' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className={styles.statValue}>
            {totalLearningHours} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-gray-400)' }}>hrs</span>
          </div>
          <div className={styles.statMeta}>
            <span className={styles.statLabel}>Hours This Month</span>
            <span className={styles.statSub}>iGOT, NSSTA &amp; assessments</span>
          </div>
        </div>
      </section>

      {/* ── 3. Skill Gap Analysis (NO Recommended Course Column) ───────────── */}
      <section className={styles.sectionCard} aria-label="Skill Gap Analysis">
        <div className={styles.cardHeaderArea}>
          <div className={styles.cardTitleGroup}>
            <h2 className={styles.cardTitle}>{t('dashboard.skill_gap_analysis', 'Skill Gap Analysis')}</h2>
            <p className={styles.cardSubtitle}>
              Benchmarked against your official Cadre Job Role curriculum requirements
            </p>
          </div>
          <Link to="/skill-gaps" className={styles.viewAllLink}>
            {t('dashboard.view_all_gaps', 'View All Gaps')} <ArrowRight size={14} />
          </Link>
        </div>

        <div className={styles.tableResponsiveWrap}>
          <table className={styles.gapTable}>
            <thead>
              <tr>
                <th>Skill Name</th>
                <th>Current Level</th>
                <th>Required Level</th>
                <th>Gap</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {skillGaps.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--color-gray-400)' }}>
                    No skill gaps detected. You are on track across all role competencies!
                  </td>
                </tr>
              ) : (
                skillGaps.slice(0, 6).map((g) => {
                  const comp = g.competency_id || {}
                  const cur = g.current_level || 1
                  const req = g.required_level || 1
                  const curPct = Math.min(100, Math.round((cur / 5) * 100))
                  const reqPct = Math.min(100, Math.round((req / 5) * 100))
                  const delta = Math.max(0, g.gap)
                  const isMet = delta === 0

                  const priority = (g.priority || 'low').toLowerCase()
                  const badgeStyle = isMet
                    ? { background: '#d1fae5', color: '#065f46' }
                    : priority === 'high'
                    ? { background: '#fee2e2', color: '#991b1b' }
                    : priority === 'medium'
                    ? { background: '#fef3c7', color: '#92400e' }
                    : { background: '#dbeafe', color: '#1e40af' }

                  const badgeLabel = isMet
                    ? 'Met'
                    : priority === 'high'
                    ? 'High'
                    : priority === 'medium'
                    ? 'Moderate'
                    : 'Low'

                  return (
                    <tr key={g._id || comp._id || comp.name}>
                      <td>
                        <div className={styles.skillNameCell}>
                          <div className={styles.skillIconWrap}>
                            <CompetencyIcon
                              name={comp.name}
                              category={comp.category}
                              size="sm"
                              color="var(--color-primary-600)"
                            />
                          </div>
                          <div className={styles.skillTitleBlock}>
                            <span className={styles.skillName}>{comp.name}</span>
                            <span className={styles.skillCategory}>{comp.category || 'Core Skill'}</span>
                          </div>
                        </div>
                      </td>

                      <td className={styles.levelCell}>
                        <div className={styles.levelText}>
                          <span>Level {cur}</span>
                          <span>{curPct}%</span>
                        </div>
                        <div className={styles.levelBarWrap}>
                          <div
                            className={styles.levelBarFill}
                            style={{
                              width: `${curPct}%`,
                              backgroundColor: isMet
                                ? '#10b981'
                                : priority === 'high'
                                ? '#ef4444'
                                : priority === 'medium'
                                ? '#f59e0b'
                                : '#3b82f6',
                            }}
                          />
                        </div>
                      </td>

                      <td>
                        <span style={{ fontWeight: 600 }}>Level {req}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginLeft: 6 }}>
                          ({reqPct}%)
                        </span>
                      </td>

                      <td>
                        {isMet ? (
                          <span style={{ color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Check size={13} strokeWidth={2.5} /> Met
                          </span>
                        ) : (
                          <span style={{ color: priority === 'high' ? '#dc2626' : '#b45309', fontWeight: 700 }}>
                            -{delta} {delta === 1 ? 'level' : 'levels'}
                          </span>
                        )}
                      </td>

                      <td>
                        <span className={styles.gapBadge} style={badgeStyle}>
                          {badgeLabel}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 4. Recommended for You (Single Primary Recommendation System) ── */}
      <section className={styles.sectionCard} aria-label="Course Recommendations">
        <div className={styles.cardHeaderArea}>
          <div className={styles.cardTitleGroup}>
            <h2 className={styles.cardTitle}>{t('dashboard.recommended_for_you', 'Recommended for You')}</h2>
            <p className={styles.cardSubtitle}>
              Curated and ranked to help close your verified cadre competency gaps
            </p>
          </div>
          <Link to="/recommendations" className={styles.viewAllLink}>
            {t('dashboard.view_all_recommendations', 'View All')} <ArrowRight size={14} />
          </Link>
        </div>

        <div className={styles.recsGrid}>
          {filteredRecs.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '36px 16px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
              No course recommendations available. Complete your diagnostic test to see recommendations.
            </div>
          ) : (
            filteredRecs.slice(0, 4).map((r) => {
              const course = r.course_id && typeof r.course_id === 'object' ? r.course_id : {}
              const cId = course._id || (typeof r.course_id === 'string' ? r.course_id : null)
              const isEnrolled = cId ? enrolledCourseIds.has(String(cId)) : false
              const providerName = (course.provider || 'iGOT').toUpperCase()
              const isNssta = providerName.includes('NSSTA') || course.source === 'nssta'
              const durationHrs = course.durationHours || course.duration || course.estimatedHours || 10
              const courseLevel = course.difficulty || course.level || 'Intermediate'

              return (
                <div key={r._id || cId} className={styles.recCard}>
                  <div className={styles.recTopRow}>
                    <div
                      className={styles.recIconWrap}
                      style={{
                        background: isNssta ? '#fffbeb' : '#eef2ff',
                        color: isNssta ? '#d97706' : '#4f46e5',
                      }}
                    >
                      {isNssta ? <Landmark size={20} /> : <BookOpen size={20} />}
                    </div>

                    <div className={styles.recMetaCol}>
                      <h3 className={styles.recTitle} title={course.title}>
                        {course.title || 'Course Module'}
                      </h3>

                      <div className={styles.recTagsRow}>
                        <span
                          className={styles.recSourceBadge}
                          style={{
                            background: isNssta ? '#fef3c7' : '#e0e7ff',
                            color: isNssta ? '#92400e' : '#3730a3',
                          }}
                        >
                          {isNssta ? 'NSSTA' : 'iGOT'}
                        </span>
                        <span className={styles.recDurationText}>
                          <Clock size={12} /> {durationHrs}h
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', textTransform: 'capitalize' }}>
                          {courseLevel}
                        </span>
                        {r.priority_rank && (
                          <span className={styles.recPriorityText}>#{r.priority_rank} Priority</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {r.reason && (
                    <div className={styles.recReasonBox}>
                      <Sparkles size={13} color="#4f46e5" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{r.reason}</span>
                    </div>
                  )}

                  <div className={styles.recBottomRow}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>
                      {course.provider || (isNssta ? 'NSSTA Academy' : 'iGOT Karmayogi')}
                    </span>

                    <button
                      type="button"
                      className={`${styles.recActionBtn} ${
                        isEnrolled ? styles.recActionBtnEnrolled : styles.recActionBtnPrimary
                      }`}
                      onClick={() => {
                        if (isEnrolled) {
                          navigate(`/my-courses/${cId}`)
                        } else if (cId) {
                          enrollMutation.mutate(cId, {
                            onSuccess: () => navigate(`/my-courses/${cId}`),
                          })
                        }
                      }}
                      disabled={enrollMutation.isPending}
                    >
                      {isEnrolled ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Check size={13} strokeWidth={2.5} /> Enrolled
                        </span>
                      ) : enrollMutation.isPending ? (
                        'Enrolling...'
                      ) : (
                        'Enroll & Start'
                      )}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* ── 5. Continue Learning (Real In-Progress Enrollments) ────────────── */}
      <section className={styles.sectionCard} aria-label="Continue Learning">
        <div className={styles.cardHeaderArea}>
          <div className={styles.cardTitleGroup}>
            <h2 className={styles.cardTitle}>{t('dashboard.continue_learning', 'Continue Learning')}</h2>
            <p className={styles.cardSubtitle}>
              Pick up where you left off in your currently active courses
            </p>
          </div>
          <Link to="/my-learning" className={styles.viewAllLink}>
            My Learning <ArrowRight size={14} />
          </Link>
        </div>

        {inProgressEnrollments.length === 0 ? (
          <div style={{ padding: '36px 20px' }}>
            <EmptyState
              icon={BookOpen}
              title="No Courses in Progress"
              description="You do not have any active courses in progress right now. Explore your recommended courses above to start building skills for your cadre."
              action="Explore Recommended Courses"
              onAction={() => navigate('/recommendations')}
            />
          </div>
        ) : (
          <div className={styles.continueGrid}>
            {inProgressEnrollments.slice(0, 3).map((e) => {
              const course = e.courseId && typeof e.courseId === 'object' ? e.courseId : {}
              const cId = course._id || e.courseId
              const progress = Math.min(100, Math.max(0, e.progressPercent || 0))
              const provider = course.provider || 'iGOT Karmayogi'

              return (
                <div key={e._id || cId} className={styles.continueCard}>
                  <div className={styles.continueCardHeader}>
                    <div className={styles.continueIconWrap}>
                      <PlayCircle size={20} />
                    </div>
                    <div className={styles.continueMeta}>
                      <h3 className={styles.continueTitle} title={course.title}>
                        {course.title || 'Course Module'}
                      </h3>
                      <span className={styles.continueProvider}>{provider}</span>
                    </div>
                  </div>

                  <div className={styles.continueProgressWrap}>
                    <div className={styles.continueProgressLabel}>
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className={styles.continueBarWrap}>
                      <div className={styles.continueBarFill} style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <Link to={`/my-courses/${cId}`} className={styles.continueActionBtn}>
                    Continue Learning <ArrowRight size={14} />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── 6. Virtual Labs Banner (Direct Practice Link) ─────────────────── */}
      <div className={styles.labsBanner}>
        <div className={styles.labsBannerLeft}>
          <div className={styles.labsBannerIcon}>
            <FlaskConical size={22} />
          </div>
          <div>
            <div className={styles.labsBannerTitle}>
              Hands-on Statistical &amp; Data Analysis Labs
            </div>
            <div className={styles.labsBannerSub}>
              Run live Python notebooks, query SQL databases, and test survey sampling algorithms — zero setup required.
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
          Launch Labs
        </a>
      </div>

      {/* ── 7 & 8. My Learning Path & AI Assistant ─────────────────────────── */}
      <section className={styles.bottomGrid} aria-label="Learning Path and Assistance">
        <LearningPathWidget items={lpItems} recommendations={allRecs} enrollments={enrollments} />
        <AiAssistantWidget gaps={topGaps.map((g) => ({ name: g.competency_id?.name || 'Competency', gap: g.gap }))} />
      </section>
    </div>
  )
}
