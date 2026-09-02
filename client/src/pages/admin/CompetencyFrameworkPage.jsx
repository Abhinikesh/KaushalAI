import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCompetencies } from '../../api/competency.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function CompetencyFrameworkPage() {
  const [catFilter, setCatFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['competencies'],
    queryFn: getCompetencies,
  })

  const competencies = data?.competencies || data || []
  const filtered = competencies.filter((c) => catFilter === 'all' || c.category === catFilter)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            National Statistical Competency Framework
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Official proficiency standards across Domain, Technical, and Behavioral competencies
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert('New competency modal opens')}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--color-primary-600)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Add Competency
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {[
          { key: 'all', label: `All Standards (${competencies.length})` },
          { key: 'domain', label: 'Domain Competencies' },
          { key: 'technical', label: 'Technical Competencies' },
          { key: 'behavioral', label: 'Behavioral Competencies' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setCatFilter(t.key)}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-full)',
              border: catFilter === t.key ? '1px solid var(--color-primary-600)' : '1px solid var(--color-border)',
              background: catFilter === t.key ? 'var(--color-primary-600)' : 'var(--color-surface)',
              color: catFilter === t.key ? 'white' : 'var(--color-text-secondary)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Competencies Table */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 'var(--space-6)' }}>
            <Skeleton.Text lines={6} />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Competency Name</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Category</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Official Description</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Scale</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {c.name}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <Badge variant={c.category === 'domain' ? 'igot' : c.category === 'technical' ? 'nssta' : 'neutral'}>
                      {c.category}
                    </Badge>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', maxWidth: 460 }}>
                    {c.description || 'Core official competency evaluated across cadre tiers.'}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold' }}>
                    1 – 5 Levels
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
