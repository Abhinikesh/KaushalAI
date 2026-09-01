import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getQuiz, submitQuizAttempt } from '../../api/mcq.api'
import QuestionCard from '../../components/quiz/QuestionCard'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import styles from './TakeQuizPage.module.css'

// ── Results view ──────────────────────────────────────────────────────────────
function ResultsView({ result, questions, answers, onRetake }) {
  const { score, correctCount, totalQuestions, perQuestionResult, competencyUpdates } = result
  const scoreColor = score >= 80 ? 'var(--color-success)' : score >= 50 ? 'var(--color-warning)' : 'var(--color-error)'

  return (
    <div className={styles.results}>
      {/* Score hero */}
      <div className={styles.scoreHero}>
        <div className={styles.scoreCircle} style={{ borderColor: scoreColor }}>
          <span className={styles.scorePct} style={{ color: scoreColor }}>{score}%</span>
          <span className={styles.scoreLabel}>Score</span>
        </div>
        <div className={styles.scoreMeta}>
          <h1 className={styles.resultsTitle}>
            {score >= 80 ? '🎉 Excellent work!' : score >= 50 ? '👍 Good effort!' : '💪 Keep practicing!'}
          </h1>
          <p className={styles.resultsSubtitle}>
            {correctCount} of {totalQuestions} correct
          </p>

          {/* Competency level-ups — the most exciting part */}
          {competencyUpdates?.length > 0 && (
            <div className={styles.levelUps}>
              <div className={styles.levelUpsLabel}>🏆 Skills improved!</div>
              {competencyUpdates.map((u) => (
                <div key={u.competencyId} className={styles.levelUpRow}>
                  <span className={styles.levelUpText}>
                    Level {u.previousLevel} → Level {u.newLevel}
                  </span>
                  <Badge variant="success">Skill levelled up</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.retakeRow}>
        <Button variant="secondary" onClick={onRetake}>Retake Quiz</Button>
      </div>

      {/* Per-question breakdown */}
      <h2 className={styles.breakdownTitle}>Question Breakdown</h2>
      <div className={styles.breakdown}>
        {questions.map((q, i) => {
          const pqr = perQuestionResult[i]
          const submitted = answers[i]
          return (
            <div key={q._id} className={styles.breakdownItem}>
              <div className={styles.breakdownHeader}>
                <span className={styles.breakdownNum}>Q{i + 1}</span>
                <Badge variant={pqr?.correct ? 'none' : 'high'}>
                  {pqr?.correct ? '✓ Correct' : '✗ Incorrect'}
                </Badge>
              </div>
              <QuestionCard
                question={q}
                selectedIndex={submitted?.selectedOptionIndex}
                correctIndex={q.correctOptionIndex}
                revealMode
                questionNumber={null}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main quiz-taking page ─────────────────────────────────────────────────────
export default function TakeQuizPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [current, setCurrent]     = useState(0)
  const [answers, setAnswers]     = useState({})   // { [questionIndex]: { questionId, selectedOptionIndex } }
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [result, setResult]       = useState(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['quiz', id],
    queryFn: () => getQuiz(id),
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton height="2rem" width="50%" />
        <div style={{ marginTop: 'var(--space-6)' }}><Skeleton.Card /></div>
      </div>
    )
  }

  if (isError || !data?.quiz) {
    return (
      <EmptyState
        icon="⚠️"
        title="Quiz not found"
        description="This quiz may have been removed or the link is invalid."
        action="Back to Quizzes"
        onAction={() => navigate('/quizzes')}
      />
    )
  }

  const { quiz } = data
  const questions = quiz.questionIds ?? []

  if (questions.length === 0) {
    return (
      <EmptyState
        icon="📭"
        title="This quiz has no questions"
        description="Please contact your trainer."
        action="Back to Quizzes"
        onAction={() => navigate('/quizzes')}
      />
    )
  }

  // Show results after submission
  if (result) {
    return (
      <div className={styles.page}>
        <ResultsView
          result={result}
          questions={questions}
          answers={Object.values(answers)}
          onRetake={() => { setResult(null); setCurrent(0); setAnswers({}) }}
        />
      </div>
    )
  }

  const total = questions.length
  const q = questions[current]
  const selectedIndex = answers[current]?.selectedOptionIndex ?? null
  const isLast = current === total - 1

  const handleSelect = (idx) => {
    setAnswers((a) => ({ ...a, [current]: { questionId: q._id, selectedOptionIndex: idx } }))
  }

  const handleNext = () => setCurrent((c) => Math.min(c + 1, total - 1))
  const handlePrev = () => setCurrent((c) => Math.max(c - 1, 0))

  const handleSubmit = async () => {
    setSubmitError('')
    setSubmitting(true)
    try {
      const answersArray = Array.from({ length: total }, (_, i) => answers[i]).filter(Boolean)
      const res = await submitQuizAttempt(id, answersArray)
      setResult(res)
    } catch (err) {
      setSubmitError(err.response?.data?.message ?? 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const answered = Object.keys(answers).length
  const progress = Math.round((answered / total) * 100)

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.quizHeader}>
        <div>
          <h1 className={styles.quizTitle}>{quiz.title}</h1>
          <p className={styles.quizProgress}>Question {current + 1} of {total}</p>
        </div>
        <div className={styles.progressWrap}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.progressLabel}>{answered}/{total} answered</span>
        </div>
      </div>

      {/* Question dots nav */}
      <div className={styles.dots} role="tablist" aria-label="Question navigation">
        {questions.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === current}
            aria-label={`Question ${i + 1}${answers[i] ? ' (answered)' : ''}`}
            className={[
              styles.dot,
              i === current ? styles.dotActive : '',
              answers[i] ? styles.dotAnswered : '',
            ].filter(Boolean).join(' ')}
            onClick={() => setCurrent(i)}
          />
        ))}
      </div>

      {/* Question card — key on index so transitions are clean, no content bleed */}
      <div className={styles.questionWrap} key={current}>
        <QuestionCard
          question={q}
          selectedIndex={selectedIndex}
          onChange={handleSelect}
          questionNumber={current + 1}
        />
      </div>

      {/* Error message */}
      {submitError && (
        <div className={styles.errorBox}>{submitError}</div>
      )}

      {/* Navigation */}
      <div className={styles.nav}>
        <Button
          variant="secondary"
          onClick={handlePrev}
          disabled={current === 0}
        >
          ← Previous
        </Button>

        <div className={styles.navRight}>
          {isLast ? (
            <Button
              variant="primary"
              loading={submitting}
              disabled={selectedIndex === null}
              onClick={handleSubmit}
            >
              {submitting ? 'Submitting…' : 'Submit Quiz'}
            </Button>
          ) : (
            <Button
              variant="primary"
              disabled={selectedIndex === null}
              onClick={handleNext}
            >
              Next →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
