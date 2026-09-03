import { useQuery } from '@tanstack/react-query'
import { getMyActivityHistory } from '../../api/userFeatures.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

export default function LearningHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['myActivityHistory'],
    queryFn: getMyActivityHistory,
  })

  const activities = data?.timeline || []

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recent'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Learning History &amp; Audit Trail
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Chronological verified timeline of course enrolments, assessment evaluations, and competency level progressions
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Skeleton height="80px" />
          <Skeleton height="80px" />
          <Skeleton height="80px" />
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon="📜"
          title="No Learning History Yet"
          description="Complete an assessment or enroll in a recommended course to start building your official learning audit trail."
        />
      ) : (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Vertical spine line */}
          <div
            style={{
              position: 'absolute',
              top: 20,
              bottom: 20,
              left: 20,
              width: 2,
              background: 'var(--color-border)',
              zIndex: 0,
            }}
          />

          {activities.map((item) => (
            <div
              key={item.id}
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                gap: 'var(--space-4)',
                alignItems: 'flex-start',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-4) var(--space-5)',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-surface-alt)',
                  border: '2px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  flexShrink: 0,
                }}
              >
                {item.type === 'quiz_attempt' ? '📝' : item.type === 'course_enrolled' ? '📘' : '🎯'}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                    {formatDate(item.date)}
                  </span>
                  <Badge variant={item.badgeVariant || 'igot'}>{item.badge}</Badge>
                </div>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: '4px 0 2px' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
