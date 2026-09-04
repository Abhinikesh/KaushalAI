import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, Clock, Landmark } from 'lucide-react'
import { listCourses } from '../../api/course.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

export default function NsstaTrainingPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['courses', 'nssta'],
    queryFn: () => listCourses({ source: 'nssta' }),
  })

  const courses = data?.courses || data || []
  const filtered = courses.filter((c) =>
    (c.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            NSSTA &amp; TPAC Training Programmes
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Official statistical training programmes conducted by the National Statistical Systems Training Academy
          </p>
        </div>
      </div>

      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-4) var(--space-5)',
        }}
      >
        <input
          type="text"
          placeholder="Search training programmes by keyword or subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: 'var(--space-2) var(--space-3)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-sm)',
            background: 'var(--color-surface)',
          }}
        />
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton.Card key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No NSSTA programmes found"
          description="Try a different keyword or search query."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
          {filtered.map((item) => (
            <div
              key={item._id}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-5)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Badge variant="nssta">NSSTA / TPAC</Badge>
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Building2 size={13} /> Greater Noida / Hybrid
                </span>
              </div>

              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                {item.title}
              </h3>

              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5, flex: 1 }}>
                {item.description || 'Specialized hands-on workshop tailored for Indian Statistical Service (ISS) and Subordinate Statistical Service (SSS) officers.'}
              </p>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> {item.durationHours || 30} hrs • 5 Days
                </span>

                <Link
                  to={`/training/${item._id}`}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: 'var(--color-primary-600)',
                    color: 'white',
                    textDecoration: 'none',
                  }}
                >
                  View Schedule &amp; Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
