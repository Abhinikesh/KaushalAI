import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCourseById } from '../../api/course.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function ProgrammeDetailPage() {
  const { id } = useParams()

  const { data: course, isLoading, isError } = useQuery({
    queryKey: ['course', id],
    queryFn: () => getCourseById(id),
  })

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <Skeleton height="30px" width="200px" />
        <Skeleton height="150px" />
      </div>
    )
  }

  if (isError || !course) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 'var(--space-8)', textAlign: 'center' }}>
        <h2>Course Record Not Found</h2>
        <p style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-4) 0' }}>
          No official course curriculum matches ID: <code>{id}</code>.
        </p>
        <Link to="/trainer/programmes" style={{ color: 'var(--color-primary-600)', fontWeight: 600 }}>
          ← Return to Programmes
        </Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <Link to="/trainer/programmes" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Programmes
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            {course.title}
          </h1>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Badge variant={course.source === 'nssta' ? 'nssta' : 'igot'}>
              {(course.source || 'iGOT').toUpperCase()}
            </Badge>
            <Badge variant="success">Active Curriculum</Badge>
          </div>
        </div>
      </div>

      {/* Programme Metadata Card */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <div>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Delivery Source</span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>
            {course.source === 'nssta' ? 'NSSTA Greater Noida (Residential / Blended)' : 'iGOT Karmayogi National Portal'}
          </div>
        </div>

        <div>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Curriculum Duration</span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>
            {course.durationHours || 15} Instructional Hours
          </div>
        </div>

        <div>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Proficiency Level</span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2, textTransform: 'capitalize' }}>
            {course.level || 'Intermediate'}
          </div>
        </div>

        <div>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Assessment Requirement</span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2, color: 'var(--color-success)' }}>
            ✓ Verified Quiz &ge;70%
          </div>
        </div>
      </div>

      {/* Course Overview */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: 'var(--space-3)' }}>
          Curriculum Overview &amp; Learning Objectives
        </h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
          {course.description || 'Comprehensive statistical capacity building programme designed to elevate cadre proficiency to national benchmark standards.'}
        </p>
      </div>

      {/* Mapped Competencies */}
      <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: 'var(--space-3)' }}>
          Directly Mapped Statistical Competencies
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {(course.skillTags || []).length > 0 ? (
            course.skillTags.map((tag, idx) => (
              <Badge key={idx} variant="igot">
                {typeof tag === 'object' && tag.name ? tag.name : tag}
              </Badge>
            ))
          ) : (
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              Core Official Statistics &amp; Survey Sampling Competency
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
