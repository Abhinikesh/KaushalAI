import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import styles from './LearningPathWidget.module.css'

export default function LearningPathWidget({ items = [], recommendations = [], enrollments = [] }) {
  const { t } = useTranslation()
  const enrollMap = new Map()
  enrollments.forEach((e) => {
    const id = typeof e.courseId === 'object' ? String(e.courseId._id) : String(e.courseId)
    enrollMap.set(id, e.status)
  })

  // Prefer real sequenced items from learning_path_items
  let steps = []
  if (items && items.length > 0) {
    steps = items.slice(0, 4).map((it, i) => {
      const course = it.course_id || {}
      const cId = course._id || course.course_id || it._id || i
      const title = course.title || it.title || `Course Module ${it.sequence_order || i + 1}`
      const status = it.status || enrollMap.get(String(cId)) || 'not_started'
      return {
        id: cId,
        title,
        status,
      }
    })
  } else if (recommendations && recommendations.length > 0) {
    steps = recommendations.slice(0, 4).map((r, i) => {
      const cId = r.course_id?._id || r.course_id || i
      const title = r.course_id?.title || r.title || `Recommended Course ${i + 1}`
      const status = enrollMap.get(String(cId)) || 'not_started'
      return {
        id: cId,
        title,
        status,
      }
    })
  }

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t('dashboard.my_learning_path')}</h3>
        <Link to="/my-learning" className={styles.viewAll}>
          {t('dashboard.view_full_path')}
        </Link>
      </div>

      <div className={styles.timeline}>
        {steps.map((step, idx) => {
          const isDone = step.status === 'completed'
          const isInProgress = step.status === 'in_progress'

          return (
            <div key={step.id} className={styles.step}>
              <div
                className={`${styles.node} ${
                  isDone
                    ? styles.nodeCompleted
                    : isInProgress
                    ? styles.nodeInProgress
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
                  {isDone ? t('dashboard.completed') : isInProgress ? t('dashboard.in_progress') : t('dashboard.not_started')}
                </span>
              </div>

              {isDone && (
                <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center' }}>
                  <Check size={14} strokeWidth={2.5} />
                </span>
              )}

              {isInProgress && (
                <Link to="/my-learning" className={styles.continueBtn}>
                  {t('dashboard.continue')}
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
