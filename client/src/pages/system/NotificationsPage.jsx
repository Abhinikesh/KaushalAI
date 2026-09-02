import { useState } from 'react'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'

export default function NotificationsPage() {
  const [filter, setFilter] = useState('all')
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'course',
      title: 'New Recommended Course Available',
      desc: 'Machine Learning Fundamentals has been added to your Recommended Learning based on your recent skill gap evaluation.',
      date: '2 hours ago',
      read: false,
    },
    {
      id: 2,
      type: 'quiz',
      title: 'Assessment Evaluation Passed',
      desc: 'You scored 85% on Sampling Techniques Quiz and improved your Survey Sampling competency to Level 3.',
      date: '1 day ago',
      read: false,
    },
    {
      id: 3,
      type: 'system',
      title: 'Officer Roster Verification Complete',
      desc: 'Your employee ID and MOSPI cadre credentials have been verified by the system administrator.',
      date: '3 days ago',
      read: true,
    },
    {
      id: 4,
      type: 'course',
      title: 'NSSTA Training Programme Announced',
      desc: 'National Accounts Statistics 5-day residential workshop nominations are now open.',
      date: '5 days ago',
      read: true,
    },
  ])

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const filtered = notifications.filter((n) => (filter === 'all' ? true : n.type === filter))

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Notifications Center
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            System updates, course recommendations, assessment alerts, and roster messages
          </p>
        </div>

        <button
          type="button"
          onClick={markAllRead}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
          }}
        >
          Mark all as read
        </button>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {[
          { key: 'all', label: 'All Notifications' },
          { key: 'course', label: 'Courses' },
          { key: 'quiz', label: 'Assessments' },
          { key: 'system', label: 'System' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-full)',
              border: filter === t.key ? '1px solid var(--color-primary-600)' : '1px solid var(--color-border)',
              background: filter === t.key ? 'var(--color-primary-600)' : 'var(--color-surface)',
              color: filter === t.key ? 'white' : 'var(--color-text-secondary)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: 'var(--space-8)' }}>
            <EmptyState icon="🔔" title="No notifications" description="You have no notifications in this category." />
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-4)',
                padding: 'var(--space-4) var(--space-5)',
                borderBottom: '1px solid var(--color-border)',
                background: n.read ? 'var(--color-surface)' : 'rgba(99, 102, 241, 0.04)',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-full)',
                  background: n.read ? 'var(--color-surface-alt)' : 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                {n.type === 'course' ? '📘' : n.type === 'quiz' ? '🎯' : '⚙️'}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: n.read ? 600 : 'bold', color: 'var(--color-text-primary)' }}>
                    {n.title}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{n.date}</span>
                </div>

                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                  {n.desc}
                </p>
              </div>

              {!n.read && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary-600)', marginTop: 6 }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
