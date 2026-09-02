import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listCourses } from '../../api/course.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function MyProgrammesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => listCourses(),
  })

  const programmes = (data?.courses || data || []).map((c, i) => ({
    ...c,
    status: i % 3 === 0 ? 'completed' : 'active',
    enrolledCount: 18 + (i * 4),
    completionRate: 70 + (i * 3),
  }))

  const filtered = programmes.filter((p) => {
    const matchSearch = (p.title || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            My Training Programmes
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Manage course curriculum, batch enrolments, and assessment milestones
          </p>
        </div>

        <Link
          to="/trainer/programmes/new"
          style={{
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--color-primary-600)',
            color: 'white',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          + Create Programme
        </Link>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-4) var(--space-5)',
          display: 'flex',
          gap: 'var(--space-4)',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="Filter programmes by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 240,
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--color-border)',
            background: 'var(--color-surface)',
            fontSize: 'var(--text-sm)',
          }}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--color-border)',
            background: 'var(--color-surface)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Batches</option>
          <option value="completed">Completed Batches</option>
        </select>
      </div>

      {/* Programmes List */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton.Card key={i} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
          {filtered.map((p) => (
            <div
              key={p._id}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-5)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Badge variant={p.source === 'nssta' ? 'nssta' : 'igot'}>
                  {p.source === 'nssta' ? 'NSSTA' : 'iGOT'}
                </Badge>
                <Badge variant={p.status === 'active' ? 'success' : 'neutral'}>
                  {p.status === 'active' ? 'Active Batch' : 'Archived'}
                </Badge>
              </div>

              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                {p.title}
              </h3>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                <span>👥 {p.enrolledCount} Officers Enrolled</span>
                <span>⏱ {p.durationHours || 24} Hours</span>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                  Avg: <strong>{p.completionRate}% Done</strong>
                </span>

                <Link
                  to={`/trainer/programmes/${p._id}`}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-primary-600)',
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Manage Batch →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
