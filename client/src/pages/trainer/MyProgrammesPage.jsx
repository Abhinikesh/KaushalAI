import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listCourses } from '../../api/course.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function MyProgrammesPage() {
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => listCourses(),
  })

  const courses = data?.courses || data || []

  const filtered = courses.filter((p) => {
    const matchSearch = (p.title || '').toLowerCase().includes(search.toLowerCase())
    const matchSource = sourceFilter === 'all' || p.source === sourceFilter
    return matchSearch && matchSource
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Training Programmes Catalogue
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Official curricula across NSSTA residential workshops and iGOT Karmayogi civil service modules
          </p>
        </div>

        <Link
          to="/trainer/upload"
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
          + Upload Course Material
        </Link>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          alignItems: 'center',
          flexWrap: 'wrap',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-4)',
        }}
      >
        <input
          type="text"
          placeholder="Search programmes by title or topic..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 240,
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--text-sm)',
          }}
        />

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {['all', 'nssta', 'igot'].map((src) => (
            <button
              key={src}
              type="button"
              onClick={() => setSourceFilter(src)}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-full)',
                border: sourceFilter === src ? '1px solid var(--color-primary-600)' : '1px solid var(--color-border)',
                background: sourceFilter === src ? 'var(--color-primary-600)' : 'var(--color-surface)',
                color: sourceFilter === src ? 'white' : 'var(--color-text-secondary)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {src}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
          <Skeleton height="180px" />
          <Skeleton height="180px" />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          No programmes found matching your search.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
          {filtered.map((prog) => (
            <div
              key={prog._id}
              style={{
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-5)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Badge variant={prog.source === 'igot' ? 'igot' : 'nssta'}>
                  {(prog.source || 'iGOT').toUpperCase()}
                </Badge>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                  ⏱ {prog.durationHours || 15} Hours
                </span>
              </div>

              <div>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                  {prog.title}
                </h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: '4px 0 0' }}>
                  {prog.description || 'Comprehensive capacity building module aligned with official MOSPI statistical standards.'}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                  Level: <strong>{prog.level || 'Intermediate'}</strong>
                </span>
                <Link
                  to={`/courses/${prog._id}`}
                  style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-primary-600)', textDecoration: 'none' }}
                >
                  Manage Curriculum →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
