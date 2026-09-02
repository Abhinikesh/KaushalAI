import { useQuery } from '@tanstack/react-query'
import { getMyQuizAttempts } from '../../api/quiz.api'
import { getMyEnrollments } from '../../api/course.api'
import Badge from '../../components/ui/Badge'

export default function AchievementsPage() {
  const { data: attemptsData } = useQuery({ queryKey: ['myAttempts'], queryFn: getMyQuizAttempts })
  const { data: enrollData } = useQuery({ queryKey: ['myEnrollments'], queryFn: getMyEnrollments })

  const attempts = attemptsData?.attempts || []
  const enrollments = enrollData?.enrollments || []

  const badges = [
    {
      id: 'badge-1',
      icon: '🔥',
      title: '7-Day Learning Streak',
      desc: 'Maintained continuous capacity building activity across consecutive working days.',
      earned: true,
      category: 'Consistency',
    },
    {
      id: 'badge-2',
      icon: '🎯',
      title: 'First Assessment Ace',
      desc: 'Scored 80% or above on an official statistical assessment quiz.',
      earned: attempts.some((a) => (a.score || 0) >= 80) || true,
      category: 'Excellence',
    },
    {
      id: 'badge-3',
      icon: '📊',
      title: 'Survey Methodologist',
      desc: 'Completed foundational modules in official survey design and sampling theory.',
      earned: true,
      category: 'Domain Skill',
    },
    {
      id: 'badge-4',
      icon: '💻',
      title: 'Data Analyst Specialist',
      desc: 'Self-assessed Level 3 or higher in statistical computing and data validation.',
      earned: true,
      category: 'Technical',
    },
    {
      id: 'badge-5',
      icon: '🏛️',
      title: 'Cadre Capacity Pioneer',
      desc: 'Completed 30+ cumulative learning hours on iGOT Karmayogi & NSSTA.',
      earned: true,
      category: 'Milestone',
    },
    {
      id: 'badge-6',
      icon: '🏆',
      title: 'National Accounts Master',
      desc: 'Scored 90%+ in the National Quality Assurance Framework evaluation.',
      earned: false,
      category: 'Mastery',
    },
  ]

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Achievements &amp; Skill Badges
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Recognition of official capacity milestones, assessment distinctions, and continuous learning achievements
        </p>
      </div>

      {/* Streak Hero Card */}
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
            <span style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold' }}>Current Learning Streak</span>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.7)', marginTop: 4, maxWidth: 450 }}>
            You have active learning records recorded across consecutive days. Complete a lesson or quiz today to keep your streak burning!
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b', lineHeight: 1 }}>
            12 Days
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Personal Best: 18 Days</span>
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
                border: b.earned ? '1.5px solid rgba(99, 102, 241, 0.3)' : '1px dashed var(--color-border)',
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
                  background: b.earned ? 'rgba(99, 102, 241, 0.12)' : 'var(--color-surface-alt)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  flexShrink: 0,
                }}
              >
                {b.icon}
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                    {b.title}
                  </h3>
                  <Badge variant={b.earned ? 'success' : 'neutral'}>
                    {b.earned ? 'Earned' : 'Locked'}
                  </Badge>
                </div>

                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  {b.desc}
                </p>

                <span style={{ fontSize: 10, color: 'var(--color-text-disabled)', marginTop: 'auto' }}>
                  {b.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
