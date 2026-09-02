import { useState } from 'react'
import { Link } from 'react-router-dom'
import Badge from '../../components/ui/Badge'

export default function LearnersDirectoryPage() {
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')

  const learners = [
    { id: '1', name: 'Rajesh Sharma', email: 'rajesh.sharma@mospi.gov.in', empId: 'MOSPI-2018-041', dept: 'FOD Delhi', programme: 'Survey Sampling Techniques', progress: 85, score: 88, status: 'Active' },
    { id: '2', name: 'Sunita Verma', email: 'sunita.verma@mospi.gov.in', empId: 'MOSPI-2019-112', dept: 'SDRD Kolkata', programme: 'National Accounts Statistics', progress: 100, score: 92, status: 'Completed' },
    { id: '3', name: 'Amitabh Sen', email: 'amitabh.sen@mospi.gov.in', empId: 'MOSPI-2020-089', dept: 'DES West Bengal', programme: 'Data Quality & NQAF Framework', progress: 60, score: 74, status: 'Active' },
    { id: '4', name: 'Kavita Patel', email: 'kavita.patel@mospi.gov.in', empId: 'MOSPI-2021-304', dept: 'NAD New Delhi', programme: 'Survey Sampling Techniques', progress: 40, score: 65, status: 'Active' },
    { id: '5', name: 'Manoj Kumar', email: 'manoj.kumar@mospi.gov.in', empId: 'MOSPI-2017-019', dept: 'NSSTA Greater Noida', programme: 'Official Statistics Induction', progress: 95, score: 90, status: 'Active' },
    { id: '6', name: 'Deepika Iyer', email: 'deepika.iyer@mospi.gov.in', empId: 'MOSPI-2022-442', dept: 'ESD New Delhi', programme: 'Data Quality & NQAF Framework', progress: 75, score: 82, status: 'Active' },
  ]

  const filtered = learners.filter((l) => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      l.empId.toLowerCase().includes(search.toLowerCase())
    const matchDept = deptFilter === 'all' || l.dept.includes(deptFilter)
    return matchSearch && matchDept
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Learners Directory
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Officers participating in NSSTA and official training cohorts
          </p>
        </div>
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
          placeholder="Search by officer name, official email, or Employee ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 260,
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--color-border)',
            background: 'var(--color-surface)',
            fontSize: 'var(--text-sm)',
          }}
        />

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          style={{
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--color-border)',
            background: 'var(--color-surface)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <option value="all">All Divisions &amp; Directorates</option>
          <option value="Delhi">FOD Delhi</option>
          <option value="Kolkata">SDRD Kolkata</option>
          <option value="West Bengal">DES West Bengal</option>
          <option value="NAD">NAD New Delhi</option>
          <option value="NSSTA">NSSTA</option>
        </select>
      </div>

      {/* Directory Table */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Officer Name &amp; ID</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Division / DES</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Enrolled Programme</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Syllabus Progress</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Latest Score</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{l.empId} • {l.email}</div>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)' }}>
                  {l.dept}
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {l.programme}
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 70, height: 6, background: 'var(--color-gray-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{ width: `${l.progress}%`, height: '100%', background: l.progress === 100 ? 'var(--color-success)' : 'var(--color-primary-600)' }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{l.progress}%</span>
                  </div>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold' }}>
                  {l.score}%
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Link
                    to={`/trainer/learners/${l.id}`}
                    style={{
                      padding: '3px 8px',
                      background: 'var(--color-surface-alt)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--color-primary-600)',
                      textDecoration: 'none',
                    }}
                  >
                    View Analysis →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
