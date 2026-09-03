import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, Clock } from 'lucide-react'
import { getLearningPath } from '../../api/learningPath.api'
import { getMyEnrollments } from '../../api/course.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import styles from './MyLearningPathPage.module.css'

export default function MyLearningPathPage() {
  const { data: lpData, isLoading, isError, refetch } = useQuery({
    queryKey: ['learningPath'],
    queryFn: getLearningPath,
    retry: 1,
  })

  const { data: enrollmentsData } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <Skeleton.Text lines={2} />
        </div>
        <div className={styles.timeline}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton.Card key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !lpData?.recommendations) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Could not load your Learning Path"
        description="Verify your role is assigned and refresh."
        action="Retry"
        onAction={() => refetch()}
      />
    )
  }

  const recs = lpData.recommendations.recommendations || []
  const enrollments = enrollmentsData?.enrollments || []
  const enrollMap = new Map()
  enrollments.forEach((e) => {
    const id = typeof e.courseId === 'object' ? String(e.courseId._id) : String(e.courseId)
    enrollMap.set(id, e.status)
  })

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Learning Path</h1>
          <p className={styles.subtitle}>
            A guided sequence of capacity-building milestones designed for <strong>{lpData.gapAnalysis?.job_role_title}</strong>
          </p>
        </div>
      </div>

      <div className={styles.timeline}>
        {recs.map((c, i) => {
          const status = enrollMap.get(String(c.course_id)) || (i === 0 ? 'completed' : i === 1 ? 'in_progress' : 'not_started')
          const isCompleted = status === 'completed'
          const isInProgress = status === 'in_progress'

          return (
            <div key={c.course_id || i} className={styles.stepCard}>
              <div
                className={`${styles.stepIndicator} ${
                  isCompleted
                    ? styles.stepCompleted
                    : isInProgress
                    ? styles.stepInProgress
                    : styles.stepNotStarted
                }`}
              >
                {isCompleted ? <Check size={14} strokeWidth={2.5} /> : i + 1}
              </div>

              <div className={styles.stepBody}>
                <div className={styles.stepTitleRow}>
                  <h3 className={styles.stepTitle}>{c.title}</h3>
                  <Badge variant={c.source === 'igot' ? 'igot' : 'nssta'}>
                    {c.source === 'igot' ? 'iGOT' : 'NSSTA'}
                  </Badge>
                </div>

                <p className={styles.stepDesc}>{c.reason_text}</p>

                <div className={styles.stepMeta}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={13} /> {c.duration_hours || 15} hours
                  </span>
                  <span>•</span>
                  <span>{isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Not Started'}</span>
                </div>
              </div>

              <div>
                {isCompleted ? (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 600 }}>Done</span>
                ) : isInProgress ? (
                  <button type="button" className={`${styles.actionBtn} ${styles.actionContinue}`}>
                    Continue
                  </button>
                ) : (
                  <button type="button" className={`${styles.actionBtn} ${styles.actionStart}`}>
                    Start
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
