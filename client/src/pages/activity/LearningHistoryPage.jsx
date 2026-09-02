import { useQuery } from '@tanstack/react-query'
import { getMyEnrollments } from '../../api/course.api'
import { getMyQuizAttempts } from '../../api/quiz.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

export default function LearningHistoryPage() {
  const { data: enrollData, isLoading: enrollLoading } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
  })

  const { data: quizData, isLoading: quizLoading } = useQuery({
    queryKey: ['myAttempts'],
    queryFn: getMyQuizAttempts,
  })

  const loading = enrollLoading || quizLoading

  const enrollments = enrollData?.enrollments || []
  const attempts = quizData?.attempts || []

  // Combine activities chronologically
  const activities = []

  enrollments.forEach((e) => {
    activities.push({
      type: 'enrollment',
      date: new Date(e.updatedAt || e.startedAt || Date.now()),
      title: typeof e.courseId === 'object' ? e.courseId.title : 'Official Training Course',
      desc: e.status === 'completed' ? 'Completed 100% course syllabus' : `Progress updated to ${e.progressPercent || 0}%`,
      badge: e.status === 'completed' ? 'Course Completed' : 'Enrolled',
      icon: '📘',
    })
  })

  attempts.forEach((a) => {
    activities.push({
      type: 'quiz',
      date: new Date(a.attemptedAt || Date.now()),
      title: typeof a.quizId === 'object' ? a.quizId.title : 'Assessment Quiz',
      desc: `Scored ${Math.round(a.score || 0)}% (${a.correctCount || 0}/${a.totalQuestions || 0} correct)`,
      badge: (a.score || 0) >= 60 ? 'Assessment Passed' : 'Assessment Attempted',
      icon: '✏️',
    })
  })

  activities.sort((a, b) => b.date.getTime() - a.date.getTime())

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Learning History &amp; Audit Trail
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Chronological record of course enrolments, module completions, assessment attempts, and competency milestones
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Skeleton.Card />
          <Skeleton.Card />
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon="📜"
          title="No learning activity recorded yet"
          description="Your course progress and quiz attempts will automatically appear here."
        />
      ) : (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-5)',
          }}
        >
          {activities.map((act, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-4)',
                paddingBottom: idx === activities.length - 1 ? 0 : 'var(--space-4)',
                borderBottom: idx === activities.length - 1 ? 'none' : '1px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-surface-alt)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                {act.icon}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                    {act.title}
                  </span>
                  <Badge variant={act.badge.includes('Passed') || act.badge.includes('Completed') ? 'success' : 'igot'}>
                    {act.badge}
                  </Badge>
                </div>

                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {act.desc}
                </p>

                <span style={{ fontSize: 11, color: 'var(--color-text-disabled)', marginTop: 4, display: 'block' }}>
                  {act.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
