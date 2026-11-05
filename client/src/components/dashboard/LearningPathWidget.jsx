import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import styles from './LearningPathWidget.module.css'

export default function LearningPathWidget({
  items = [],
  recommendations = [],
  enrollments = [],
  isLoading = false,
  error = null,
}) {
  const { t } = useTranslation()
  const enrollMap = new Map()

  enrollments.forEach((e) => {
    if (!e || e.courseId == null) return
    const id = e.courseId && typeof e.courseId === 'object' ? String(e.courseId._id) : String(e.courseId)
    const progress = Number(e.progressPercent) || 0
    const isCompleted = e.status === 'completed' || progress >= 100
    const isInProgress = !isCompleted && (e.status === 'in_progress' || (progress > 0 && progress < 100))
    const isEnrolled = !isCompleted && !isInProgress // enrollment exists with 0% progress
    const status = isCompleted ? 'completed' : isInProgress ? 'in_progress' : isEnrolled ? 'enrolled' : 'not_started'
    enrollMap.set(id, status)
  })

  // Prefer real sequenced items from learning_path_items
  let steps = []
  if (items && items.length > 0) {
    steps = items.slice(0, 4).map((it, i) => {
      const course = it.course_id && typeof it.course_id === 'object' ? it.course_id : null
      const cId = course?._id || it.course_id || it._id || `item-${i}`
      const title = course?.title || it.title || `Competency Milestone ${it.sequence_order || i + 1}`
      const enrollStatus = enrollMap.get(String(cId))
      const itemStatus = it.status

      // Real status: do not mark complete or in-progress merely because enrolled
      let status = 'not_started'
      if (enrollStatus === 'completed' || itemStatus === 'completed') {
        status = 'completed'
      } else if (enrollStatus === 'in_progress' || itemStatus === 'in_progress') {
        status = 'in_progress'
      } else if (enrollStatus === 'enrolled' || itemStatus === 'enrolled') {
        status = 'enrolled'
      }

      return {
        id: cId,
        title,
        status,
        sequenceOrder: it.sequence_order || i + 1,
        courseAvailable: !!course,
      }
    })
  } else if (recommendations && recommendations.length > 0) {
    steps = recommendations.slice(0, 4).map((r, i) => {
      const course = r.course_id && typeof r.course_id === 'object' ? r.course_id : null
      const cId = course?._id || r.course_id || `rec-${i}`
      const title = course?.title || r.title || `Recommended Course ${i + 1}`
      const enrollStatus = enrollMap.get(String(cId))
      const status = enrollStatus || 'not_started'

      return {
        id: cId,
        title,
        status,
        sequenceOrder: i + 1,
        courseAvailable: !!course,
      }
    })
  }

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t('dashboard.my_learning_path', 'My Learning Path')}</h3>
        <Link to="/my-learning" className={styles.viewAll}>
          {t('dashboard.view_full_path', 'View Full Path')}
        </Link>
      </div>

      {isLoading ? (
        <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
          {t('common.loading', 'Loading milestones...')}
        </div>
      ) : error ? (
        <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: '#ef4444', fontSize: '13px' }}>
          {t('dashboard.lp_error', 'Unable to retrieve learning path milestones.')}
        </div>
      ) : steps.length === 0 ? (
        <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
          <p>{t('dashboard.no_learning_path_items', 'Your learning path milestones will appear here as you enroll in courses.')}</p>
          <Link
            to="/courses/igot"
            style={{
              display: 'inline-block',
              marginTop: 'var(--space-2)',
              fontSize: '12px',
              color: 'var(--color-primary-600)',
              fontWeight: 600,
            }}
          >
            {t('dashboard.browse_courses', 'Browse Course Catalog')}
          </Link>
        </div>
      ) : (
        <div className={styles.timeline}>
          {steps.map((step, idx) => {
            const isDone = step.status === 'completed'
            const isInProgress = step.status === 'in_progress'
            const isEnrolled = step.status === 'enrolled'

            return (
              <div key={step.id || idx} className={styles.step}>
                <div
                  className={`${styles.node} ${
                    isDone
                      ? styles.nodeCompleted
                      : isInProgress
                      ? styles.nodeInProgress
                      : isEnrolled
                      ? styles.nodeEnrolled
                      : styles.nodeNotStarted
                  }`}
                >
                  {isDone ? <Check size={12} strokeWidth={3} /> : idx + 1}
                </div>

                <div className={styles.stepContent}>
                  <span className={styles.stepTitle} title={step.title}>
                    {step.title}
                  </span>
                  <span className={styles.stepStatus}>
                    {isDone
                      ? t('dashboard.completed', 'Completed')
                      : isInProgress
                      ? t('dashboard.in_progress', 'In Progress')
                      : isEnrolled
                      ? t('dashboard.enrolled', 'Enrolled')
                      : t('dashboard.not_started', 'Not Started')}
                  </span>
                </div>

                {isDone && (
                  <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center' }}>
                    <Check size={14} strokeWidth={2.5} />
                  </span>
                )}

                {isInProgress && (
                  <Link to="/my-learning" className={styles.continueBtn}>
                    {t('dashboard.continue', 'Continue')}
                  </Link>
                )}

                {isEnrolled && (
                  <Link to="/my-learning" className={styles.continueBtn}>
                    {t('dashboard.start', 'Start')}
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
