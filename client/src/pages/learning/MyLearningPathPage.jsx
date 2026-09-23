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
} from 'lucide-react'
import { getMyEnrollments, listCourses } from '../../api/course.api'
import { useAuthStore } from '../../store/authStore'
import { getCourseThumbnail } from '../../utils/courseThumbnail'

/* ── Local curated catalogue (fallback for iGOT courses) ── */
const CATALOGUE = {
  'igot-crs-01': { title: 'Data Analysis with Python',                       provider: 'Karmayogi Bharat', level: 'Intermediate', durationHours: 10 },
  'igot-crs-02': { title: 'Artificial Intelligence for Public Governance',    provider: 'Karmayogi Bharat', level: 'Intermediate', durationHours: 2.7 },
  'igot-crs-03': { title: 'Sustainable Development Goals',                    provider: 'Karmayogi Bharat', level: 'Beginner',     durationHours: 1 },
  'igot-crs-04': { title: 'Digital Personal Data Protection Act, 2023',       provider: 'Karmayogi Bharat', level: 'Beginner',     durationHours: 1.2 },
  'igot-crs-05': { title: 'Bharatiya Nyaya Sanhita, 2023: An Introduction',   provider: 'Karmayogi Bharat', level: 'Beginner',     durationHours: 1 },
  'igot-crs-06': { title: 'Personal Finance for Karmayogis',                  provider: 'Karmayogi Bharat', level: 'Beginner',     durationHours: 1 },
}

/* ── YouTube thumbnail map ─────────────────────────────── */
const YOUTUBE_MAP = {
  'igot-crs-01': 'KgCgpCIOkIs',
  'igot-crs-02': 'Vz8zcKawwEo',
  'igot-crs-03': 'hTnnf9AhDLM',
  'igot-crs-04': 'FUQW44EFmQQ',
  'igot-crs-05': 'B_jQ3DlrVs4',
  'igot-crs-06': 'kCthkqPKySw',
}

const TABS = [
  { key: 'all', label: 'All Courses' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'not_started', label: 'Not Started' },
]

function getThumbnail(courseId) {
  const ytId = YOUTUBE_MAP[courseId]
  return ytId
    ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
    : `https://placehold.co/300x170/4f46e5/ffffff?text=iGOT`
}

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

  const { data: enrollData, isLoading } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
    staleTime: 60 * 1000,
  })

  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: listCourses,
    staleTime: 5 * 60 * 1000,
  })

  /* Build courseId → course lookup map: API data first, then CATALOGUE */
  const courseMap = useMemo(() => {
    const map = { ...CATALOGUE }
    const apiCourses = coursesData?.courses || coursesData || []
    ;(Array.isArray(apiCourses) ? apiCourses : []).forEach((c) => {
      if (c._id) map[String(c._id)] = {
        title:         c.title,
        provider:      c.provider || 'iGOT Karmayogi',
        level:         c.level || c.difficulty || 'Intermediate',
        durationHours: c.estimatedHours || c.durationHours || c.duration || 0,
      }
    })
    return map
  }, [coursesData])

  const enrollments = useMemo(() => {
    const raw = enrollData?.enrollments || enrollData || []
    return Array.isArray(raw) ? raw : []
  }, [enrollData])

  // Categorize
  const inProgress = enrollments.filter((e) => {
    const p = e.progressPercent ?? e.progress ?? 0
    return p > 0 && p < 100 && e.status !== 'completed'
  })
  const completed = enrollments.filter((e) => {
    const p = e.progressPercent ?? e.progress ?? 0
    return p >= 100 || e.status === 'completed'
  })
  const notStarted = enrollments.filter((e) => {
    const p = e.progressPercent ?? e.progress ?? 0
    return (!p || p === 0) && e.status !== 'completed'
  })

  const filtered = tab === 'all' ? enrollments
    : tab === 'in_progress' ? inProgress
    : tab === 'completed' ? completed
    : notStarted

  // Stats
  const totalHours = enrollments.reduce((acc, e) => {
    const course = e.course_id || e.course || {}
    return acc + (course.estimatedHours || course.durationHours || 0)
  }, 0)

  const avgProgress = enrollments.length > 0
    ? Math.round(enrollments.reduce((acc, e) => acc + (e.progressPercent ?? 0), 0) / enrollments.length)
    : 0

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, background: 'var(--color-primary-100)', borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-600)',
              }}>
                <Library size={21} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 800, color: '#0f172a' }}>
                  My Learning
                </h1>
                <p style={{ margin: 0, fontSize: 13.5, color: '#64748b', marginTop: 2 }}>
                  Track your progress and continue where you left off
                </p>
              </div>
            </div>
            <Link
              to="/courses/igot"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', background: 'var(--color-primary-600)', color: '#fff',
                borderRadius: 9, fontSize: 13.5, fontWeight: 600, textDecoration: 'none',
              }}
            >
              <BookOpen size={15} />
              Browse Courses
            </Link>
          </div>
        </div>

        {/* ── KPI cards ───────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 28,
        }}>
          {[
            {
              label: 'Enrolled',
              value: enrollments.length,
              sub: 'Total courses',
              icon: BookOpen,
              color: 'var(--color-primary-600)',
              bg: 'var(--color-primary-100)',
            },
            {
              label: 'In Progress',
              value: inProgress.length,
              sub: 'Ongoing learning',
              icon: PlayCircle,
              color: '#f59e0b',
              bg: '#fffbeb',
            },
            {
              label: 'Completed',
              value: completed.length,
              sub: 'Courses finished',
              icon: Award,
              color: '#10b981',
              bg: '#ecfdf5',
            },
            {
              label: 'Avg. Progress',
              value: `${avgProgress}%`,
              sub: 'Across all courses',
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
            const count = t.key === 'all' ? enrollments.length
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
                  borderBottom: tab === t.key ? '2px solid #4f46e5' : '2px solid transparent',
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

        {/* ── Course cards ─────────────────────────────────────── */}
        {isLoading ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
            Loading your courses...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <BookOpen size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
              {enrollments.length === 0 ? 'No courses enrolled yet' : 'No courses in this category'}
            </h3>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
              {enrollments.length === 0
                ? 'Browse the iGOT Karmayogi catalogue to find courses for your role.'
                : 'Try a different tab to see other courses.'}
            </p>
            {enrollments.length === 0 && (
              <Link
                to="/courses/igot"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '10px 22px', background: 'var(--color-primary-600)', color: '#fff',
                  borderRadius: 9, fontSize: 14, fontWeight: 600, textDecoration: 'none',
                }}
              >
                Browse iGOT Courses →
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map((enr) => {
              /* Resolve courseId (might be ObjectId string or populated object) */
              const rawCourseId = enr.courseId && typeof enr.courseId === 'object'
                ? enr.courseId?._id
                : enr.courseId
              const courseId = String(
                rawCourseId ||
                enr.course_id?._id ||
                enr.course?._id ||
                enr._id
              )

              /* Look up course details from map (API + CATALOGUE) */
              const courseInfo = courseMap[courseId] || {}
              /* Also check if populated object came from server */
              const populated = (enr.courseId && typeof enr.courseId === 'object' ? enr.courseId : null)
                             || enr.course_id
                             || enr.course
                             || {}

              const title        = courseInfo.title        || populated.title        || enr.title        || 'iGOT Karmayogi Course'
              const provider     = courseInfo.provider     || populated.provider     || enr.provider     || 'iGOT Karmayogi'
              const level        = courseInfo.level        || populated.level        || populated.difficulty || 'Intermediate'
              const durationH    = courseInfo.durationHours|| populated.estimatedHours || populated.durationHours || 0
              const progress     = enr.progressPercent ?? enr.progress ?? 0
              const isComplete   = progress >= 100 || enr.status === 'completed'
              const thumbnail    = getCourseThumbnail(populated?._id ? populated : enr) || getCourseThumbnail(courseId) || getCourseThumbnail(title)
              const continueUrl  = `/my-courses/${courseId}`

              return (
                <div
                  key={enr._id || courseId}
                  style={{
                    display: 'flex',
                    gap: 18,
                    padding: '18px 20px',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    transition: 'box-shadow 0.15s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.07)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
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
                      background: 'rgba(0,0,0,0.2)',
                    }}>
                      {isComplete
                        ? <Award size={26} color="#10b981" />
                        : <PlayCircle size={26} color="#fff" style={{ opacity: 0.85 }} />}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    {/* Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{
                        fontSize: 11.5, fontWeight: 600, color: 'var(--color-primary-600)',
                        background: 'var(--color-primary-100)', padding: '2px 8px', borderRadius: 5,
                      }}>
                        iGOT Karmayogi
                      </span>
                      <span style={{
                        fontSize: 11.5, fontWeight: 600,
                        color: level === 'Beginner' ? '#16a34a' : '#d97706',
                        background: level === 'Beginner' ? '#f0fdf4' : '#fffbeb',
                        padding: '2px 8px', borderRadius: 5,
                      }}>
                        {level}
                      </span>
                      {isComplete && (
                        <span style={{
                          fontSize: 11.5, fontWeight: 600, color: '#10b981',
                          background: '#ecfdf5', padding: '2px 8px', borderRadius: 5,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <CheckCircle2 size={11} /> Completed
                        </span>
                      )}
                    </div>

                    <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                      {title}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: 12.5, color: '#64748b' }}>{provider}</span>
                      {durationH > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: '#64748b' }}>
                          <Clock size={12} /> {formatDuration(durationH)}
                        </span>
                      )}
                    </div>

                    {/* Progress section */}
                    <div style={{ marginTop: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          {isComplete ? 'Course completed' : progress > 0 ? 'In progress' : 'Not started'}
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
                          transition: 'width 0.4s ease',
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
        {enrollments.length > 0 && (
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
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                  248+ iGOT Karmayogi courses available for government officers
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
        )}
      </main>
    </div>
  )
}
