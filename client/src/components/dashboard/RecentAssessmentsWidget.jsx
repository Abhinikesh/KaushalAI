import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import styles from './RecentAssessmentsWidget.module.css'

export default function RecentAssessmentsWidget({ attempts = [] }) {
  const { t } = useTranslation()
  // Display up to 3 recent assessment attempts (quizzes or diagnostic tests)
  const displayItems = attempts.slice(0, 3)

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t('dashboard.recent_assessments', 'Recent Assessments')}</h3>
        <Link to="/quizzes" className={styles.viewAll}>
          {t('dashboard.view_all', 'View All')}
        </Link>
      </div>

      {displayItems.length === 0 ? (
        <div className={styles.empty}>
          <p>{t('dashboard.no_quiz_attempts', 'No assessment attempts yet')}</p>
          <Link
            to="/quizzes"
            style={{
              display: 'inline-block',
              marginTop: 'var(--space-2)',
              fontSize: '11px',
              color: 'var(--color-primary-600)',
              fontWeight: 600,
            }}
          >
            {t('dashboard.take_first_assessment', 'Take First Assessment')}
          </Link>
        </div>
      ) : (
        <div className={styles.list}>
          {displayItems.map((a, idx) => {
            const title =
              typeof a.quizId === 'object' && a.quizId?.title
                ? a.quizId.title.replace(/^Quiz:\s*/i, '')
                : a.title || 'Course Quiz'

            const hasValidScore = a.score != null && !isNaN(Number(a.score)) && Number(a.score) >= 0
            const score = hasValidScore ? Math.round(Number(a.score) * 10) / 10 : null
            const isPassed = score !== null ? score >= 60 : null
            const dateRaw = a.attemptedAt || a.completed_at || a.createdAt
            const dateStr = dateRaw
              ? new Date(dateRaw).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Recently'

            return (
              <div key={a._id || `${title}-${idx}`} className={styles.row}>
                <div className={styles.info}>
                  <span className={styles.quizTitle} title={title}>
                    {title}
                  </span>
                  <div className={styles.meta}>
                    {score !== null ? (
                      <span>
                        {t('dashboard.score', 'Score')}: <strong className={styles.scoreVal}>{score}%</strong>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        {t('dashboard.score_pending', 'Evaluation Pending')}
                      </span>
                    )}
                    <span>•</span>
                    <span>{dateStr}</span>
                  </div>
                </div>

                {isPassed !== null ? (
                  <span
                    className={`${styles.badge} ${
                      isPassed ? styles.badgePassed : styles.badgeReview
                    }`}
                  >
                    {isPassed ? t('dashboard.passed', 'Passed') : t('dashboard.review', 'Review')}
                  </span>
                ) : (
                  <span
                    className={styles.badge}
                    style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                  >
                    {t('dashboard.pending', 'Pending')}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
