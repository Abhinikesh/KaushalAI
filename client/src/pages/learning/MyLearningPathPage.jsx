import React, { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  PlayCircle,
  Award,
  CheckCircle2,
  Clock,
  BarChart2,
  Library,
  Sparkles,
  AlertCircle,
  RotateCw,
  Compass,
} from 'lucide-react'
import { getLearningPath } from '../../api/learningPath.api'
import { getMyEnrollments } from '../../api/course.api'
import { useAuthStore } from '../../store/authStore'
import { getCourseThumbnail } from '../../utils/courseThumbnail'

const TABS = [
  { key: 'all', label: 'All Milestones' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'not_started', label: 'Not Started' },
]

function formatDuration(h) {
  if (!h) return ''
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  if (hrs === 0) return `${mins}m`
  if (mins === 0) return `${hrs}h`
  return `${hrs}h ${mins}m`
}

export default function MyLearningPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [tab, setTab] = useState('all')

  // 1. Authoritative learning path query
  const {
    data: pathData,
    isLoading: isPathLoading,
    isError: isPathError,
    error: pathError,
    refetch: refetchPath,
  } = useQuery({
    queryKey: ['learningPath'],
    queryFn: getLearningPath,
    staleTime: 60 * 1000,
  })

  // 2. Authoritative enrollment state query for real-time progress reconciliation
  const {
    data: enrollData,
    isLoading: isEnrollLoading,
  } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
    staleTime: 60 * 1000,
  })

  const isLoading = isPathLoading || isEnrollLoading

  // Build enrollment lookup map: courseId -> enrollment document
  const enrollMap = useMemo(() => {
    const raw = enrollData?.enrollments || enrollData || []
    const map = new Map()
    if (Array.isArray(raw)) {
      raw.forEach((e) => {
        if (!e) return
        const rawId = typeof e.courseId === 'object' ? e.courseId?._id : e.courseId
        if (rawId) map.set(String(rawId), e)
      })
    }
    return map
  }, [enrollData])

  // Sequenced items from authoritative LearningPathItem records
  const items = useMemo(() => {
    const rawItems = pathData?.items || []
    if (!Array.isArray(rawItems)) return []

    const seenCourseIds = new Set()
    const resolved = []

    for (const it of rawItems) {
      if (!it || !it.course_id) continue
      const course = typeof it.course_id === 'object' ? it.course_id : null
      if (!course || course.isPublished === false) continue

      const cIdStr = String(course._id)
      if (seenCourseIds.has(cIdStr)) continue
      seenCourseIds.add(cIdStr)

      // Reconcile with live enrollment state
      const enr = enrollMap.get(cIdStr) || it.enrollment
      const progress = enr
        ? Math.max(0, Math.min(100, Math.round(Number(enr.progressPercent) || 0)))
        : Number(it.progressPercent) || 0

      const isCompleted = (enr && (enr.status === 'completed' || progress >= 100)) || it.status === 'completed'
      const isInProgress = !isCompleted && ((enr && (enr.status === 'in_progress' || progress > 0)) || it.status === 'in_progress')
      const isEnrolled = !isCompleted && !isInProgress && ((enr && enr.status === 'enrolled') || it.status === 'enrolled')

      const status = isCompleted ? 'completed' : isInProgress ? 'in_progress' : isEnrolled ? 'enrolled' : 'not_started'

      resolved.push({
        _id: it._id,
        sequence_order: it.sequence_order || resolved.length + 1,
        course_id: course,
        status,
        progressPercent: isCompleted ? 100 : progress,
        enrollment: enr || null,
      })
    }

    return resolved.sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))
  }, [pathData, enrollMap])

  const learningPath = pathData?.learning_path || null

  // Categorize
  const inProgress = items.filter((it) => it.status === 'in_progress')
  const completed = items.filter((it) => it.status === 'completed')
  const notStarted = items.filter((it) => it.status === 'not_started' || it.status === 'enrolled')

  const filtered = tab === 'all' ? items
    : tab === 'in_progress' ? inProgress
    : tab === 'completed' ? completed
    : notStarted

  // Real Path Stats
  const avgProgress = items.length > 0
    ? Math.round(items.reduce((acc, it) => acc + (it.progressPercent || 0), 0) / items.length)
    : 0

  const isAllPathCompleted = items.length > 0 && completed.length === items.length

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42, height: 42, background: 'var(--color-primary-100)', borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-600)',
              }}>
                <Library size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                    My Learning Path
                  </h1>
                  {learningPath?.target_role && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 10px', fontSize: 12, fontWeight: 700,
                      color: 'var(--color-primary-700)', background: 'var(--color-primary-50)',
                      border: '1px solid var(--color-primary-200)', borderRadius: 20,
                    }}>
                      <Sparkles size={12} /> {learningPath.target_role}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 13.5, color: '#64748b', marginTop: 3 }}>
                  Authoritative sequenced curriculum mapped to your professional cadre competencies
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link
                to="/skill-gap-analysis"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '9px 16px', background: '#fff', color: '#334155',
                  border: '1px solid #cbd5e1', borderRadius: 9, fontSize: 13.5, fontWeight: 600,
                  textDecoration: 'none', transition: 'all 0.15s',
                }}
              >
                <Compass size={15} />
                Skill Gap Analysis
              </Link>
              <Link
                to="/courses/igot"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '9px 18px', background: 'var(--color-primary-600)', color: '#fff',
                  borderRadius: 9, fontSize: 13.5, fontWeight: 600, textDecoration: 'none',
                }}
              >
                <BookOpen size={15} />
                Browse Catalogue
              </Link>
            </div>
          </div>
        </div>

        {/* ── Completion Celebration Banner ─────────────────────── */}
        {isAllPathCompleted && (
          <div style={{
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            borderRadius: 14,
            padding: '20px 24px',
            color: '#fff',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Award size={26} color="#fff" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                  Curriculum Milestones Completed!
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 13, opacity: 0.9 }}>
                  You have successfully finished all sequenced courses in your active learning path.
                </p>
              </div>
            </div>
            <Link
              to="/courses/igot"
              style={{
                padding: '9px 18px', background: '#fff', color: '#065f46',
                borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none',
              }}
            >
              Explore Next Courses →
            </Link>
          </div>
        )}

        {/* ── KPI cards ───────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 28,
        }}>
          {[
            {
              label: 'Milestones',
              value: items.length,
              sub: 'Sequenced courses',
              icon: BookOpen,
              color: 'var(--color-primary-600)',
              bg: 'var(--color-primary-100)',
            },
            {
              label: 'In Progress',
              value: inProgress.length,
              sub: 'Active learning',
              icon: PlayCircle,
              color: '#d97706',
              bg: '#fffbeb',
            },
            {
              label: 'Completed',
              value: completed.length,
              sub: 'Milestones finished',
              icon: Award,
              color: '#10b981',
              bg: '#ecfdf5',
            },
            {
              label: 'Path Progress',
              value: `${avgProgress}%`,
              sub: 'Across sequenced path',
              icon: BarChart2,
              color: '#3b82f6',
              bg: '#eff6ff',
            },
          ].map((kpi) => {
            const Icon = kpi.icon
            return (
              <div key={kpi.label} style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}>
                <div style={{
                  width: 44, height: 44, flexShrink: 0,
                  background: kpi.bg,
                  borderRadius: 11,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: kpi.color,
                }}>
                  <Icon size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                    {kpi.value}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginTop: 3 }}>{kpi.label}</div>
                  <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 1 }}>{kpi.sub}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Tabs ────────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          gap: 0,
          borderBottom: '2px solid #e2e8f0',
          marginBottom: 22,
        }}>
          {TABS.map((t) => {
            const count = t.key === 'all' ? items.length
              : t.key === 'in_progress' ? inProgress.length
              : t.key === 'completed' ? completed.length
              : notStarted.length
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                style={{
                  padding: '10px 20px',
                  background: 'none',
                  border: 'none',
                  borderBottom: tab === t.key ? '2px solid var(--color-primary-600)' : '2px solid transparent',
                  marginBottom: -2,
                  color: tab === t.key ? 'var(--color-primary-600)' : '#64748b',
                  fontSize: 14,
                  fontWeight: tab === t.key ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {t.label} ({count})
              </button>
            )
          })}
        </div>

        {/* ── Content States ──────────────────────────────────── */}
        {isLoading ? (
          <div style={{ padding: '64px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <RotateCw size={32} className="animate-spin" style={{ margin: '0 auto 14px', color: 'var(--color-primary-500)' }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: '#334155' }}>Loading your personalized learning path...</div>
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Retrieving authoritative sequenced milestones</p>
          </div>
        ) : isPathError ? (
          <div style={{
            padding: '36px 24px', textAlign: 'center', background: '#fff',
            border: '1px solid #fed7aa', borderRadius: 12,
          }}>
            <AlertCircle size={38} color="#f97316" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#9a3412', margin: 0 }}>
              Unable to Load Learning Path
            </h3>
            <p style={{ fontSize: 13.5, color: '#7c2d12', marginTop: 4, marginBottom: 16 }}>
              {pathError?.message || 'A network error occurred while retrieving your sequenced learning path.'}
            </p>
            <button
              type="button"
              onClick={() => refetchPath()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', background: 'var(--color-primary-600)', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <RotateCw size={14} /> Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div style={{
            padding: '60px 20px', textAlign: 'center', background: '#fff',
            border: '1px solid #e2e8f0', borderRadius: 12,
          }}>
            <Compass size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
              No Active Learning Path Assigned
            </h3>
            <p style={{ color: '#64748b', fontSize: 14, maxWidth: 480, margin: '0 auto 20px', lineHeight: 1.5 }}>
              Your personalized curriculum is automatically generated when you complete your diagnostic skill assessment or competency evaluation.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <Link
                to="/diagnostic-test"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '10px 22px', background: 'var(--color-primary-600)', color: '#fff',
                  borderRadius: 9, fontSize: 13.5, fontWeight: 600, textDecoration: 'none',
                }}
              >
                <Sparkles size={15} />
                Take Diagnostic Assessment →
              </Link>
              <Link
                to="/courses/igot"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '10px 20px', background: '#fff', color: '#334155',
                  border: '1px solid #cbd5e1', borderRadius: 9, fontSize: 13.5, fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Browse Catalogue
              </Link>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
            <BookOpen size={42} color="#cbd5e1" style={{ marginBottom: 14 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              No Milestones in this Category
            </h3>
            <p style={{ color: '#64748b', fontSize: 13.5, margin: '0 0 16px' }}>
              Select another tab to inspect other sequenced courses in your learning path.
            </p>
            <button
              type="button"
              onClick={() => setTab('all')}
              style={{
                padding: '8px 16px', background: '#f1f5f9', color: '#334155',
                border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              View All Milestones
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map((item) => {
              const course = item.course_id
              const courseId = String(course._id)
              const title = course.title || 'Course Milestone'
              const provider = course.provider || 'iGOT Karmayogi'
              const level = course.level || course.difficulty || 'Intermediate'
              const durationH = course.estimatedHours || course.durationHours || course.duration || 0
              const progress = item.progressPercent || 0
              const isComplete = item.status === 'completed'
              const isInProgress = item.status === 'in_progress'
              const thumbnail = getCourseThumbnail(course) || getCourseThumbnail(title)
              const continueUrl = `/my-courses/${courseId}`

              return (
                <div
                  key={item._id || courseId}
                  style={{
                    display: 'flex',
                    gap: 18,
                    padding: '18px 20px',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    transition: 'all 0.15s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'
                    e.currentTarget.style.borderColor = '#cbd5e1'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.borderColor = '#e2e8f0'
                  }}
                  onClick={() => navigate(continueUrl)}
                >
                  {/* Thumbnail */}
                  <div style={{
                    width: 150,
                    height: 95,
                    flexShrink: 0,
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: '#1e293b',
                    position: 'relative',
                  }}>
                    <img
                      src={thumbnail}
                      alt={title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(0,0,0,0.25)',
                    }}>
                      {isComplete ? (
                        <Award size={28} color="#10b981" />
                      ) : (
                        <PlayCircle size={28} color="#fff" style={{ opacity: 0.9 }} />
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    {/* Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 11.5, fontWeight: 700, color: 'var(--color-primary-700)',
                        background: 'var(--color-primary-100)', padding: '2px 8px', borderRadius: 5,
                      }}>
                        Milestone #{item.sequence_order}
                      </span>
                      <span style={{
                        fontSize: 11.5, fontWeight: 600, color: '#475569',
                        background: '#f1f5f9', padding: '2px 8px', borderRadius: 5,
                      }}>
                        {provider}
                      </span>
                      <span style={{
                        fontSize: 11.5, fontWeight: 600,
                        color: level.toLowerCase() === 'beginner' ? '#16a34a' : '#d97706',
                        background: level.toLowerCase() === 'beginner' ? '#f0fdf4' : '#fffbeb',
                        padding: '2px 8px', borderRadius: 5, textTransform: 'capitalize',
                      }}>
                        {level}
                      </span>
                      {isComplete && (
                        <span style={{
                          fontSize: 11.5, fontWeight: 600, color: '#10b981',
                          background: '#ecfdf5', padding: '2px 8px', borderRadius: 5,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <CheckCircle2 size={12} /> Completed
                        </span>
                      )}
                      {isInProgress && (
                        <span style={{
                          fontSize: 11.5, fontWeight: 600, color: '#d97706',
                          background: '#fffbeb', padding: '2px 8px', borderRadius: 5,
                        }}>
                          In Progress
                        </span>
                      )}
                    </div>

                    <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                      {title}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {durationH > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: '#64748b' }}>
                          <Clock size={12} /> {formatDuration(durationH)}
                        </span>
                      )}
                      {Array.isArray(course.skillTags) && course.skillTags.length > 0 && (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>
                          {course.skillTags.slice(0, 2).map((st) => st.name || st).join(', ')}
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginTop: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          {isComplete ? 'Milestone completed' : progress > 0 ? 'In progress' : 'Not started'}
                        </span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: isComplete ? '#10b981' : 'var(--color-primary-600)' }}>
                          {progress}%
                        </span>
                      </div>
                      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99 }}>
                        <div style={{
                          width: `${progress}%`,
                          height: '100%',
                          background: isComplete ? '#10b981' : 'var(--color-primary-600)',
                          borderRadius: 99,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* Action button */}
                  <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(continueUrl) }}
                      style={{
                        padding: '9px 18px',
                        background: isComplete ? '#fff' : 'var(--color-primary-600)',
                        color: isComplete ? '#475569' : '#fff',
                        border: isComplete ? '1.5px solid #e2e8f0' : 'none',
                        borderRadius: 8,
                        fontSize: 13.5, fontWeight: 600,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      {isComplete ? 'Review Course' : progress > 0 ? 'Continue →' : 'Start Course →'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Browse more banner ─────────────────────────────── */}
        <div style={{
          marginTop: 28,
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          borderRadius: 14,
          padding: '22px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 42, height: 42, background: 'rgba(255,255,255,0.15)',
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={21} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                Explore more courses
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                Browse the complete government training catalogue across all competencies
              </div>
            </div>
          </div>
          <Link
            to="/courses/igot"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', background: '#fff', color: 'var(--color-primary-600)',
              borderRadius: 8, fontSize: 13.5, fontWeight: 700, textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Browse Catalogue →
          </Link>
        </div>
      </main>
    </div>
  )
}
