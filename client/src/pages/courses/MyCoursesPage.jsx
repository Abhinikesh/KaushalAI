import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Check, Clock } from 'lucide-react'
import { getMyEnrollments } from '../../api/course.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

export default function MyCoursesPage() {
  const [tab, setTab] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
  })

  const enrollments = data?.enrollments || []
  const filtered = enrollments.filter((e) => {
    if (tab === 'in_progress') return e.status !== 'completed'
    if (tab === 'completed') return e.status === 'completed'
    return true
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            My Courses &amp; Enrolments
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Track your ongoing courses, module progress, and completed certifications
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {[
          { key: 'all', label: `All Courses (${enrollments.length})` },
          { key: 'in_progress', label: 'In Progress' },
          { key: 'completed', label: 'Completed' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-full)',
              border: tab === t.key ? '1px solid var(--color-primary-600)' : '1px solid var(--color-border)',
              background: tab === t.key ? 'var(--color-primary-600)' : 'var(--color-surface)',
              color: tab === t.key ? 'white' : 'var(--color-text-secondary)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton.Card key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses enrolled yet"
          description="Browse iGOT courses or recommended learning to begin capacity building."
          action="Browse Recommendations"
          onAction={() => window.location.assign('/recommendations')}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
          {filtered.map((e) => {
            const course = typeof e.courseId === 'object' ? e.courseId : { title: 'Official Statistical Training', source: 'igot', durationHours: 12 }
            const cId = typeof e.courseId === 'object' ? e.courseId._id : e.courseId
            const pct = e.progressPercent != null ? e.progressPercent : (e.status === 'completed' ? 100 : 45)
            const isDone = e.status === 'completed' || pct === 100

            return (
              <div
                key={e._id || cId}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--space-5)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Badge variant={course.source === 'igot' ? 'igot' : 'nssta'}>
                    {course.source === 'igot' ? 'iGOT' : 'NSSTA'}
                  </Badge>
                  <span style={{ fontSize: 11, fontWeight: 'bold', color: isDone ? 'var(--color-success)' : 'var(--color-primary-600)' }}>
                    {isDone ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Check size={12} strokeWidth={2.5} /> Completed
                      </span>
                    ) : (
                      `${pct}% in progress`
                    )}
                  </span>
                </div>

                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                  {course.title}
                </h3>

                {/* Progress bar */}
                <div>
                  <div style={{ height: 6, background: 'var(--color-gray-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: isDone ? 'var(--color-success)' : 'var(--color-primary-600)',
                        borderRadius: 'var(--radius-full)',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} /> {course.durationHours || 12} hrs
                  </span>

                  <Link
                    to={`/my-courses/${cId}`}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'var(--color-primary-600)',
                      color: 'white',
                      textDecoration: 'none',
                    }}
                  >
                    {isDone ? 'Review Course' : 'Continue'}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
