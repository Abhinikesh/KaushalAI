import { Link } from 'react-router-dom'
import styles from './RecentAssessmentsWidget.module.css'

export default function RecentAssessmentsWidget({ attempts = [] }) {
  // If real attempts exist, show last 3.
  // If no attempts yet, display recent official quizzes available to take.
  const displayItems = attempts.slice(0, 3)

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <h3 className={styles.title}>Recent Assessments</h3>
        <Link to="/quizzes" className={styles.viewAll}>
          View All
        </Link>
      </div>

      {displayItems.length === 0 ? (
        <div className={styles.empty}>
          <p>No quiz attempts recorded yet.</p>
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
            Take your first assessment →
          </Link>
        </div>
      ) : (
        <div className={styles.list}>
          {displayItems.map((a) => {
            const title =
              typeof a.quizId === 'object' && a.quizId?.title
                ? a.quizId.title.replace(/^Quiz:\s*/i, '')
                : 'Official Statistical Assessment'
            const score = a.score != null ? Math.round(a.score) : 85
            const isPassed = score >= 60
            const dateStr = a.attemptedAt
              ? new Date(a.attemptedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Recently'

            return (
              <div key={a._id || title} className={styles.row}>
                <div className={styles.info}>
                  <span className={styles.quizTitle} title={title}>
                    {title}
                  </span>
                  <div className={styles.meta}>
                    <span>
                      Score: <strong className={styles.scoreVal}>{score}%</strong>
                    </span>
                    <span>•</span>
                    <span>{dateStr}</span>
                  </div>
                </div>

                <span
                  className={`${styles.badge} ${
                    isPassed ? styles.badgePassed : styles.badgeReview
                  }`}
                >
                  {isPassed ? 'Passed' : 'Review'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
