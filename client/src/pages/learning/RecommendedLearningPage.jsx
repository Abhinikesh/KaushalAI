import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, BookOpen, Clock, Check } from 'lucide-react'
import { getLearningPath } from '../../api/learningPath.api'
import { getMyEnrollments, enrollInCourse } from '../../api/course.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import styles from './RecommendedLearningPage.module.css'

export default function RecommendedLearningPage() {
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('all')
  const queryClient = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['learningPath'],
    queryFn: getLearningPath,
    retry: 1,
  })

  const { data: enrollmentsData } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
    retry: 1,
  })

  const enrolledCourseIds = new Set(
    (enrollmentsData?.enrollments || []).map((e) =>
      typeof e.courseId === 'object' ? String(e.courseId._id) : String(e.courseId)
    )
  )

  const enrollMutation = useMutation({
    mutationFn: (courseId) => enrollInCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myEnrollments'] })
    },
  })

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <Skeleton.Text lines={2} />
        </div>
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton.Card key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !data?.recommendations) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Could not load course recommendations"
        description="Please ensure that your role requirements are configured."
        action="Retry"
        onAction={() => refetch()}
      />
    )
  }

  const recs = data.recommendations.recommendations || []
  const filtered = recs.filter((r) => {
    const matchesSearch = (r.title || '').toLowerCase().includes(search.toLowerCase())
    const matchesSource = source === 'all' || (r.source || '').toLowerCase() === source
    return matchesSearch && matchesSource
  })

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Recommended Learning</h1>
          <p className={styles.subtitle}>
            All 10 AI-curated courses from iGOT Karmayogi and NSSTA/TPAC ranked specifically to close your skill gaps
          </p>
        </div>
      </div>

      <div className={styles.filterCard}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search courses by title or topic..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className={styles.sourceToggle}>
          <button
            type="button"
            className={`${styles.sourceBtn} ${source === 'all' ? styles.sourceBtnActive : ''}`}
            onClick={() => setSource('all')}
          >
            All Sources
          </button>
          <button
            type="button"
            className={`${styles.sourceBtn} ${source === 'igot' ? styles.sourceBtnActive : ''}`}
            onClick={() => setSource('igot')}
          >
            iGOT Karmayogi
          </button>
          <button
            type="button"
            className={`${styles.sourceBtn} ${source === 'nssta' ? styles.sourceBtnActive : ''}`}
            onClick={() => setSource('nssta')}
          >
            NSSTA / TPAC
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses match search"
          description="Try broadening your search term or selecting All Sources."
        />
      ) : (
        <div className={styles.grid}>
          {filtered.map((r) => {
            const isEnrolled = enrolledCourseIds.has(String(r.course_id))

            return (
              <div key={r.course_id} className={styles.card}>
                <div className={styles.cardTop}>
                  <Badge variant={r.source === 'igot' ? 'igot' : 'nssta'}>
                    {r.source === 'igot' ? 'iGOT' : 'NSSTA'}
                  </Badge>
                  <span className={styles.scoreBadge}>Match: {r.final_score.toFixed(1)}</span>
                </div>

                <h3 className={styles.courseTitle}>{r.title}</h3>
                <p className={styles.reasonBox}>{r.reason_text}</p>

                <div className={styles.cardMeta}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={13} /> {r.duration_hours || 12} hrs
                  </span>
                  <span>•</span>
                  <span style={{ textTransform: 'capitalize' }}>{r.difficulty || 'Intermediate'}</span>
                </div>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.startBtn}
                    onClick={() => enrollMutation.mutate(r.course_id)}
                    disabled={isEnrolled || enrollMutation.isPending}
                  >
                    {isEnrolled ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Check size={14} /> Enrolled
                      </span>
                    ) : (
                      'Start Course'
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
