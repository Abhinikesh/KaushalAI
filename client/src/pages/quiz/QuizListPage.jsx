import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getQuizList } from '../../api/mcq.api'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import styles from './QuizListPage.module.css'

export default function QuizListPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['quizList'],
    queryFn: getQuizList,
  })

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Quizzes</h1>
        </div>
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton.Card key={i} />)}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        icon="⚠️"
        title="Couldn't load quizzes"
        description="There was a problem fetching the quiz list. Please try again."
        action="Retry"
        onAction={refetch}
      />
    )
  }

  const quizzes = data?.quizzes ?? []

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quizzes</h1>
          <p className={styles.subtitle}>{quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} available</p>
        </div>
      </div>

      {quizzes.length === 0 ? (
        <EmptyState
          icon="✏️"
          title="No quizzes yet"
          description="Trainers can upload learning material to generate AI-powered quizzes."
        />
      ) : (
        <div className={styles.grid}>
          {quizzes.map((quiz) => (
            <Card key={quiz._id} hoverable className={styles.quizCard}>
              <div className={styles.cardTop}>
                <Badge variant="info">
                  {quiz.questionCount} question{quiz.questionCount !== 1 ? 's' : ''}
                </Badge>
                {quiz.tagCompetencyIds?.length > 0 && (
                  <Badge variant="success">
                    {quiz.tagCompetencyIds.length} skill{quiz.tagCompetencyIds.length > 1 ? 's' : ''} tagged
                  </Badge>
                )}
              </div>
              <h2 className={styles.quizTitle}>{quiz.title}</h2>
              <p className={styles.quizMeta}>
                By {quiz.createdBy?.name ?? 'Unknown'} ·{' '}
                {new Date(quiz.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={() => navigate(`/quizzes/${quiz._id}`)}
                style={{ marginTop: 'var(--space-4)' }}
              >
                Start Quiz →
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
