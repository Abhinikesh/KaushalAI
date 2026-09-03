import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getTrainerSummary } from '../../api/admin.api'
import { listRoster } from '../../api/roster.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function LearnersDirectoryPage() {
  const [search, setSearch] = useState('')

  const { data: trainerSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['trainerSummary'],
    queryFn: getTrainerSummary,
  })

  const { data: rosterData, isLoading: rosterLoading } = useQuery({
    queryKey: ['rosterLearners'],
    queryFn: () => listRoster({ page: 1, limit: 50 }),
  })

  const isLoading = summaryLoading || rosterLoading

  const evaluatedLearners = trainerSummary?.distinctLearners || []
  const rosterOfficers = rosterData?.officers || []

  // Combine evaluated learners with roster
  const displayList = evaluatedLearners.length > 0
    ? evaluatedLearners.map((l) => ({
        id: l.userId,
        name: l.name || 'Officer',
        email: l.email,
        empId: l.employeeId || 'N/A',
        dept: l.department || 'Field Operations Division',
        attempts: l.attemptCount,
        score: l.bestScore,
        lastActive: l.lastAttemptAt,
        status: 'Evaluated',
      }))
    : rosterOfficers.map((o) => ({
        id: o._id,
        name: o.name || o.fullName || 'Officer',
        email: o.email || o.officialEmail,
        empId: o.employeeId || 'N/A',
        dept: o.department || 'Official Statistics',
        attempts: 0,
        score: null,
        lastActive: null,
        status: o.isClaimed ? 'Active Account' : 'Roster Seat',
      }))

  const filtered = displayList.filter((l) => {
    const query = search.toLowerCase()
    return (
      (l.name || '').toLowerCase().includes(query) ||
      (l.email || '').toLowerCase().includes(query) ||
      (l.empId || '').toLowerCase().includes(query) ||
      (l.dept || '').toLowerCase().includes(query)
    )
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Learners &amp; Evaluated Officers Directory
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Real-time directory of statistical officers who have attempted curriculum assessments
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
          placeholder="Search learners by name, email, department, or employee ID..."
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
          Active Officers ({displayList.length} Records)
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
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Attempts</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Best Score</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>{l.empId}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {l.name}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 12 }}>
                    {l.email}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{l.dept}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <Badge variant="neutral">{l.attempts} Quizzes</Badge>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold' }}>
                    {l.score != null ? (
                      <span style={{ color: l.score >= 70 ? 'var(--color-success)' : 'var(--color-error)' }}>
                        {l.score}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <Link
                      to={`/admin/users/${l.id}`}
                      style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-primary-600)', textDecoration: 'none' }}
                    >
                      View Profile →
                    </Link>
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
