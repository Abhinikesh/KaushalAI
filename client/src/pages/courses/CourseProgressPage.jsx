import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listCourses, getMyEnrollments, updateProgress } from '../../api/course.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

export default function CourseProgressPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()

  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => listCourses(),
  })

  const { data: enrollmentsData } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
  })

  const courses = coursesData?.courses || coursesData || []
  const course = courses.find((c) => String(c._id) === String(id))

  const enrollments = enrollmentsData?.enrollments || []
  const enrollment = enrollments.find((e) => {
    const cId = typeof e.courseId === 'object' ? e.courseId._id : e.courseId
    return String(cId) === String(id)
  })

  const modulesList = [
    'Module 1: Principles of Official Statistics and National Guidelines',
    'Module 2: Practical Data Collection and Sampling Techniques',
    'Module 3: Advanced Tabulation and Variance Estimation',
    'Module 4: Quality Assessment, Auditing and Dissemination Standards',
  ]

  const initialPct = enrollment?.progressPercent != null ? enrollment.progressPercent : 50
  const [completedModules, setCompletedModules] = useState([0, 1])

  useEffect(() => {
    if (enrollment?.progressPercent != null) {
      const count = Math.round((enrollment.progressPercent / 100) * modulesList.length)
      setCompletedModules(Array.from({ length: count }, (_, i) => i))
    }
  }, [enrollment])

  const progressMutation = useMutation({
    mutationFn: (newPercent) => {
      if (!enrollment?._id) return Promise.resolve()
      return updateProgress(enrollment._id, newPercent)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myEnrollments'] })
    },
  })

  const toggleModule = (idx) => {
    let next
    if (completedModules.includes(idx)) {
      next = completedModules.filter((i) => i !== idx)
    } else {
      next = [...completedModules, idx]
    }
    setCompletedModules(next)
    const newPct = Math.round((next.length / modulesList.length) * 100)
    progressMutation.mutate(newPct)
  }

  if (coursesLoading) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <Skeleton.Card />
      </div>
    )
  }

  const currentPct = Math.round((completedModules.length / modulesList.length) * 100)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <Link
          to="/my-courses"
          style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-primary-600)', textDecoration: 'none' }}
        >
          ← Back to My Courses
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            {course?.title || 'Statistical Methods & Survey Data Analysis'}
          </h1>
          <Badge variant="igot">{currentPct === 100 ? 'Completed' : 'In Progress'}</Badge>
        </div>
      </div>

      {/* Progress Hero */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Overall Course Progress
            </span>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 2 }}>
              {currentPct}% Completed
            </div>
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            {completedModules.length} of {modulesList.length} modules finished
          </span>
        </div>

        <div style={{ height: 10, background: 'var(--color-gray-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${currentPct}%`,
              background: currentPct === 100 ? 'var(--color-success)' : 'var(--color-primary-600)',
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {currentPct === 100 && (
          <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-lg)', color: '#065f46', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
            🎉 Congratulations! You have completed all syllabus modules for this course. Your learning hours and streak have been recorded.
          </div>
        )}
      </div>

      {/* Modules Checklist */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
        }}
      >
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)' }}>
          Modules Checklist
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {modulesList.map((modTitle, idx) => {
            const isChecked = completedModules.includes(idx)
            return (
              <label
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  background: isChecked ? 'rgba(99, 102, 241, 0.04)' : 'var(--color-surface-alt)',
                  border: isChecked ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleModule(idx)}
                  style={{ width: 18, height: 18, accentColor: 'var(--color-primary-600)', cursor: 'pointer' }}
                />
                <span
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: isChecked ? 600 : 400,
                    color: isChecked ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    textDecoration: isChecked ? 'none' : 'none',
                  }}
                >
                  {modTitle}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Linked Assessment Quiz */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Assessment &amp; Certification Quiz
          </h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Take the end-of-course assessment to test comprehension and level up your competency score
          </p>
        </div>

        <Link
          to="/quizzes"
          style={{
            padding: 'var(--space-2) var(--space-5)',
            background: 'var(--color-primary-600)',
            color: 'white',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Take Quiz →
        </Link>
      </div>
    </div>
  )
}
