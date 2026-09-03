import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMyNotifications, markNotificationRead, markAllNotificationsRead } from '../../api/userFeatures.api'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import Skeleton from '../../components/ui/Skeleton'

export default function NotificationsPage() {
  const [filter, setFilter] = useState('all')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['myNotifications'],
    queryFn: getMyNotifications,
  })

  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myNotifications'] })
    },
  })

  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myNotifications'] })
    },
  })

  const notifications = data?.notifications || []
  const filtered = notifications.filter((n) => (filter === 'all' ? true : n.type === filter))

  const formatTimestamp = (d) => {
    if (!d) return 'Recently'
    const date = new Date(d)
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Notifications Center
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Official alerts for recommendation updates, assessment scores, and competency progression
          </p>
        </div>

        {notifications.some((n) => !n.isRead) && (
          <button
            type="button"
            onClick={() => readAllMutation.mutate()}
            disabled={readAllMutation.isPending}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-primary-600)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {[
          { key: 'all', label: `All (${notifications.length})` },
          { key: 'quiz_scored', label: 'Assessments' },
          { key: 'competency_levelup', label: 'Level-ups' },
          { key: 'recommendation_ready', label: 'Recommendations' },
          { key: 'material_reviewed', label: 'MCQs & Material' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-full)',
              border: filter === tab.key ? '1px solid var(--color-primary-600)' : '1px solid var(--color-border)',
              background: filter === tab.key ? 'var(--color-primary-600)' : 'var(--color-surface)',
              color: filter === tab.key ? 'white' : 'var(--color-text-secondary)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Skeleton height="80px" />
          <Skeleton height="80px" />
          <Skeleton height="80px" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="No notifications in this category"
          description="You are completely up to date with your assessments and recommendations."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filtered.map((item) => (
            <div
              key={item._id}
              onClick={() => {
                if (!item.isRead) readMutation.mutate(item._id)
              }}
              style={{
                background: item.isRead ? 'var(--color-surface)' : 'rgba(99, 102, 241, 0.05)',
                border: item.isRead ? '1px solid var(--color-border)' : '1.5px solid var(--color-primary-600)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-4) var(--space-5)',
                display: 'flex',
                gap: 'var(--space-4)',
                alignItems: 'flex-start',
                cursor: item.isRead ? 'default' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-surface-alt)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  flexShrink: 0,
                }}
              >
                {item.type === 'quiz_scored' ? '📝' : item.type === 'competency_levelup' ? '🎯' : item.type === 'material_reviewed' ? '📄' : '✨'}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Badge variant={item.type === 'quiz_scored' ? 'igot' : item.type === 'competency_levelup' ? 'success' : 'neutral'}>
                    {item.type.replace(/_/g, ' ')}
                  </Badge>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                    {formatTimestamp(item.createdAt)}
                  </span>
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', margin: 0, fontWeight: item.isRead ? 400 : 600, lineHeight: 1.5 }}>
                  {item.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
