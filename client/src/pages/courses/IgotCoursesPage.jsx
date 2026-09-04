import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Check } from 'lucide-react'
import { listCourses, getMyEnrollments, enrollInCourse } from '../../api/course.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

export default function IgotCoursesPage() {
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState('all')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['courses', 'igot'],
    queryFn: () => listCourses({ source: 'igot' }),
  })

  const { data: enrollmentsData } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
  })

  const enrolledSet = new Set(
    (enrollmentsData?.enrollments || []).map((e) =>
      typeof e.courseId === 'object' ? String(e.courseId._id) : String(e.courseId)
    )
  )

  const enrollMutation = useMutation({
    mutationFn: (courseId) => enrollInCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myEnrollments'] })
    },
  })

  const courses = data?.courses || data || []
  const filtered = courses.filter((c) => {
    const matchesSearch = (c.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(search.toLowerCase())
    const matchesDiff = difficulty === 'all' || (c.difficulty || '').toLowerCase() === difficulty
    return matchesSearch && matchesDiff
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            iGOT Karmayogi Courses
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Explore online capacity building courses available on the national civil services learning portal
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-4) var(--space-5)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="Search iGOT courses by title or topic..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 240,
            padding: 'var(--space-2) var(--space-3)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-sm)',
            background: 'var(--color-surface)',
          }}
        />

        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          style={{
            padding: 'var(--space-2) var(--space-3)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-sm)',
            background: 'var(--color-surface)',
          }}
        >
          <option value="all">All Difficulties</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton.Card key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No iGOT courses found"
          description="Try broadening your search term or selecting All Difficulties."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
          {filtered.map((c) => {
            const isEnrolled = enrolledSet.has(String(c._id))
            return (
              <div
                key={c._id}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--space-5)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Badge variant="igot">iGOT</Badge>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                    {c.difficulty || 'Intermediate'}
                  </span>
                </div>

                <Link
                  to={`/courses/${c._id}`}
                  style={{
                    fontSize: 'var(--text-base)',
                    fontWeight: 'bold',
                    color: 'var(--color-text-primary)',
                    textDecoration: 'none',
                    lineHeight: 1.3,
                  }}
                >
                  {c.title}
                </Link>

                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5, flex: 1 }}>
                  {c.description || 'Comprehensive training module aligned with civil service capacity framework.'}
                </p>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: 'var(--space-3)',
                    marginTop: 'auto',
                  }}
                >
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                    ⏱ {c.durationHours || 12} hrs
                  </span>

                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <Link
                      to={`/courses/${c._id}`}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--color-primary-600)',
                        border: '1px solid var(--color-border)',
                        textDecoration: 'none',
                      }}
                    >
                      Details
                    </Link>

                    <button
                      type="button"
                      onClick={() => enrollMutation.mutate(c._id)}
                      disabled={isEnrolled || enrollMutation.isPending}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: isEnrolled ? 'var(--color-success)' : 'var(--color-primary-600)',
                        color: 'white',
                        border: 'none',
                        cursor: isEnrolled ? 'default' : 'pointer',
                      }}
                    >
                      {isEnrolled ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Check size={12} strokeWidth={2.5} /> Enrolled
                        </span>
                      ) : (
                        'Enroll'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
