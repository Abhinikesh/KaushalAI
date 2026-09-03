import { useQuery } from '@tanstack/react-query'
import { getMyQuizAttempts } from '../../api/quiz.api'
import { getMyEnrollments } from '../../api/course.api'
import Badge from '../../components/ui/Badge'

export default function AchievementsPage() {
  const { data: attemptsData } = useQuery({ queryKey: ['myAttempts'], queryFn: getMyQuizAttempts })
  const { data: enrollData } = useQuery({ queryKey: ['myEnrollments'], queryFn: getMyEnrollments })

  const attempts = attemptsData?.attempts || []
  const enrollments = enrollData?.enrollments || []

  // Count distinct activity dates for streak
  const dates = new Set(
    attempts.map((a) => (a.createdAt ? new Date(a.createdAt).toDateString() : null)).filter(Boolean)
  )
  const activeDays = dates.size

  const badges = [
    {
      id: 'badge-1',
      icon: '🎯',
      title: 'First Assessment Ace',
      desc: 'Achieved 70%+ score on an official statistical cadre assessment.',
      earned: attempts.some((a) => (a.score || 0) >= 70),
      category: 'Excellence',
    },
    {
      id: 'badge-2',
      icon: '📊',
      title: 'Survey Methodologist',
      desc: 'Enrolled in and engaged with at least 2 official statistical capacity modules.',
      earned: enrollments.length >= 2,
      category: 'Domain Skill',
    },
    {
      id: 'badge-3',
      icon: '💻',
      title: 'Statistical Analyst',
      desc: 'Completed at least 3 separate assessment attempts.',
      earned: attempts.length >= 3,
      category: 'Technical',
    },
    {
      id: 'badge-4',
      icon: '🔥',
      title: 'Active Scholar',
      desc: 'Engaged in capacity building across multiple distinct calendar days.',
      earned: activeDays >= 2,
      category: 'Consistency',
    },
    {
      id: 'badge-5',
      icon: '🏛️',
      title: 'Distinction Scholar',
      desc: 'Achieved a distinction score of 90%+ on any official evaluation.',
      earned: attempts.some((a) => (a.score || 0) >= 90),
      category: 'Mastery',
    },
  ]

  const earnedCount = badges.filter((b) => b.earned).length

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Achievements &amp; Skill Badges
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Recognition of official capacity milestones, assessment distinctions, and authentic learning activity
        </p>
      </div>

      {/* Real Activity Hero Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: '1.5rem' }}>🔥</span>
            <span style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold' }}>Active Learning Days</span>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.7)', marginTop: 4, maxWidth: 450 }}>
            Official evaluation attempts logged across {activeDays} distinct day{activeDays === 1 ? '' : 's'}. Complete a quiz or enroll in a module to build your official record!
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b', lineHeight: 1 }}>
            {activeDays} Day{activeDays === 1 ? '' : 's'}
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
            {earnedCount} of {badges.length} Badges Unlocked
          </span>
        </div>
      </div>

      {/* Badges Grid */}
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)' }}>
          Earned &amp; Available Badges
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-5)' }}>
          {badges.map((b) => (
            <div
              key={b.id}
              style={{
                background: 'var(--color-surface)',
                border: b.earned ? '1.5px solid var(--color-primary-600)' : '1px dashed var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-5)',
                display: 'flex',
                gap: 'var(--space-4)',
                opacity: b.earned ? 1 : 0.65,
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-xl)',
                  background: b.earned ? 'var(--color-primary-50)' : 'var(--color-surface-alt)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  flexShrink: 0,
                }}
              >
                {b.icon}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    {b.category}
                  </span>
                  <Badge variant={b.earned ? 'success' : 'neutral'}>
                    {b.earned ? 'Unlocked' : 'In Progress'}
                  </Badge>
                </div>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: '2px 0 0' }}>
                  {b.title}
                </h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: '4px 0 0', lineHeight: 1.4 }}>
                  {b.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
