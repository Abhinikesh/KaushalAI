import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  extractIdString,
  formatAttemptDate,
  getAttemptStatusMeta,
} from '../../utils/assessmentFormatters'
import styles from './RecentAssessmentsWidget.module.css'

export default function RecentAssessmentsWidget({ attempts = [] }) {
  const { t } = useTranslation()
  // Display up to 3 recent assessment attempts (quizzes or diagnostic tests)
  const displayItems = attempts.slice(0, 3)

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t('dashboard.recent_assessments', 'Recent Assessments')}</h3>
        <Link to="/assessments/history" className={styles.viewAll}>
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
            const kind = a.kind || (a.assessmentType ? 'diagnostic' : 'quiz')
            const isDiagnostic = kind === 'diagnostic'
            const attemptId = extractIdString(a.attemptId || a._id)

            const title =
              typeof a.quizId === 'object' && a.quizId?.title
                ? a.quizId.title.replace(/^Quiz:\s*/i, '')
                : a.title || (isDiagnostic ? 'Skill Gap Diagnostic' : 'Topic Quiz')

            const status = a.status || (a.isCompleted === false ? 'in_progress' : 'completed')
            const isCompleted = status === 'completed'
            const hasValidScore =
              isCompleted && a.score != null && !Number.isNaN(Number(a.score)) && Number(a.score) >= 0
            const score = hasValidScore ? Math.round(Number(a.score) * 10) / 10 : null

            const passedFlag = isDiagnostic
              ? null
              : typeof a.passed === 'boolean'
                ? a.passed
                : score !== null
                  ? score >= 70
                  : null

            const statusMeta = getAttemptStatusMeta({
              status,
              kind,
              score,
              passed: passedFlag,
            })
            const dateRaw = a.date || a.completedAt || a.attemptedAt || a.completed_at || a.startedAt || a.createdAt
            const dateStr = formatAttemptDate(dateRaw)

            const targetHref =
              !isDiagnostic && attemptId
                ? `/quiz-result/${encodeURIComponent(attemptId)}`
                : '/assessments/history'

            const badgeClass =
              statusMeta.tone === 'success'
                ? styles.badgePassed
                : statusMeta.tone === 'danger'
                  ? styles.badgeReview
                  : ''

            return (
              <Link
                key={attemptId || `${title}-${idx}`}
                to={targetHref}
                className={styles.row}
                style={{ textDecoration: 'none' }}
              >
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
                        {status === 'in_progress'
                          ? t('dashboard.in_progress', 'In Progress')
                          : status === 'expired'
                            ? t('dashboard.expired', 'Expired')
                            : t('dashboard.score_pending', 'Evaluation Pending')}
                      </span>
                    )}
                    <span>•</span>
                    <span>{dateStr}</span>
                  </div>
                </div>

                <span
                  className={`${styles.badge} ${badgeClass}`}
                  style={
                    badgeClass
                      ? undefined
                      : {
                          background: 'var(--color-surface-alt)',
                          color: 'var(--color-text-secondary)',
                          border: '1px solid var(--color-border)',
                        }
                  }
                >
                  {statusMeta.label}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
