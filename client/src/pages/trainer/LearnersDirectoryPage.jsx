import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listRoster } from '../../api/roster.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function LearnersDirectoryPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['rosterLearners'],
    queryFn: () => listRoster({ page: 1, limit: 50 }),
  })

  const learners = data?.officers || []

  const filtered = learners.filter((l) => {
    const name = l.name || l.fullName || ''
    const email = l.email || l.officialEmail || ''
    const empId = l.employeeId || ''
    const query = search.toLowerCase()
    return name.toLowerCase().includes(query) || email.toLowerCase().includes(query) || empId.toLowerCase().includes(query)
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Learners Directory
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Official statistical officers registered for training programmes and competency evaluations
          </p>
        </div>
      </div>

      {/* Search Bar */}
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
          placeholder="Search officers by name, email, or employee ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--text-sm)',
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)', fontWeight: 'bold', fontSize: 'var(--text-sm)' }}>
          Authorized Officers ({learners.length} Registered)
        </div>

        {isLoading ? (
          <div style={{ padding: 'var(--space-6)' }}>
            <Skeleton height="150px" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No matching officers found.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Employee ID</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Officer Name</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Official Email</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Department</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>{l.employeeId}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {l.name || l.fullName}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)' }}>
                    {l.email || l.officialEmail}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{l.department || 'Field Operations Division'}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <Badge variant={l.isClaimed ? 'success' : 'neutral'}>
                      {l.isClaimed ? 'Active Account' : 'Roster Seat'}
                    </Badge>
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
