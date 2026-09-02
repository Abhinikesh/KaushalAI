import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listCourses, getMyEnrollments, enrollInCourse } from '../../api/course.api'
import { getLearningPath } from '../../api/learningPath.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

export default function CourseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => listCourses(),
  })

  const { data: enrollmentsData } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
  })

  const { data: lpData } = useQuery({
    queryKey: ['learningPath'],
    queryFn: getLearningPath,
  })

  const enrollMutation = useMutation({
    mutationFn: (courseId) => enrollInCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myEnrollments'] })
    },
  })

  const courses = coursesData?.courses || coursesData || []
  const course = courses.find((c) => String(c._id) === String(id))

  const enrollments = enrollmentsData?.enrollments || []
  const enrollment = enrollments.find((e) => {
    const cId = typeof e.courseId === 'object' ? e.courseId._id : e.courseId
    return String(cId) === String(id)
  })

  const recs = lpData?.recommendations?.recommendations || []
  const recMatch = recs.find((r) => String(r.course_id) === String(id))

  if (coursesLoading) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <Skeleton.Card />
        <Skeleton.Card />
      </div>
    )
  }

  if (!course) {
    return (
      <EmptyState
        icon="🔍"
        title="Course not found"
        description="The course could not be located in the current catalogue."
        action="Back to Courses"
        onAction={() => navigate('/courses/igot')}
      />
    )
  }

  const modules = [
    'Module 1: Foundations & Legal Framework of Official Statistics',
    'Module 2: Methodological Standards and Sampling Designs',
    'Module 3: Survey Data Cleaning, Validation and Verification',
    'Module 4: Tabulation, Indicator Estimation and Dissemination',
    'Module 5: Practical Field Exercises & Continuous Assessment',
  ]

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <Link
          to="/courses/igot"
          style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-primary-600)', textDecoration: 'none' }}
        >
          ← Back to Course Catalogue
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            {course.title}
          </h1>
          <Badge variant={course.source === 'igot' ? 'igot' : 'nssta'}>
            {course.source === 'igot' ? 'iGOT Karmayogi' : 'NSSTA / TPAC'}
          </Badge>
        </div>
      </div>

      {/* Main Details Card */}
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
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
          <span>⏱ Duration: <strong>{course.durationHours || 15} hours</strong></span>
          <span>•</span>
          <span>Level: <strong style={{ textTransform: 'capitalize' }}>{course.difficulty || 'Intermediate'}</strong></span>
          <span>•</span>
          <span>Format: <strong>Self-paced eLearning</strong></span>
        </div>

        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
          {course.description || 'Specialized capacity building programme for official statisticians and data officers covering core principles, computational analysis, and practical survey methodology.'}
        </p>

        {/* Explainability / Why Recommended */}
        {recMatch && (
          <div
            style={{
              background: 'rgba(99, 102, 241, 0.08)',
              borderLeft: '4px solid var(--color-primary-600)',
              borderRadius: '0 var(--radius-lg) var(--radius-lg) 0',
              padding: 'var(--space-3) var(--space-4)',
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--color-primary-700)', marginBottom: 2 }}>
              💡 Why KaushalAI Recommended This Course for You:
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
              {recMatch.reason_text}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
          <div>
            {enrollment ? (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 600 }}>
                ✓ Enrolled ({enrollment.progressPercent || 0}% completed)
              </span>
            ) : (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                Free enrollment for all authorized civil service officers
              </span>
            )}
          </div>

          <div>
            {enrollment ? (
              <Link
                to={`/my-courses/${id}`}
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
                Go to Course Progress →
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => enrollMutation.mutate(id)}
                disabled={enrollMutation.isPending}
                style={{
                  padding: 'var(--space-2) var(--space-5)',
                  background: 'var(--color-primary-600)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {enrollMutation.isPending ? 'Enrolling...' : 'Enroll Now'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Syllabus / Modules */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
        }}
      >
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)' }}>
          Curriculum &amp; Course Modules
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {modules.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--color-surface-alt)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-primary)',
              }}
            >
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--color-primary-100)', color: 'var(--color-primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 'bold' }}>
                {idx + 1}
              </span>
              <span>{m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
