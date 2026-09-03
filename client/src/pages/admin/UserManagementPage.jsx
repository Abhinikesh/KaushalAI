import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listRoster } from '../../api/roster.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import styles from './OfficerRosterPage.module.css'

export default function UserManagementPage() {
  const [officers, setOfficers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listRoster({ page: 1, limit: 50 })
      .then((data) => setOfficers(data.officers || []))
      .catch(() => setOfficers([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)' }}>
            User Management &amp; Officer Directory
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Manage authorized officials permitted to register and access official MOSPI dashboards
          </p>
        </div>

        <Link
          to="/admin/roster"
          style={{
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--color-primary-600)',
            color: 'white',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-semibold)',
            textDecoration: 'none',
          }}
        >
          Manage &amp; Upload Roster CSV
        </Link>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 'var(--space-6)' }}>
            <Skeleton.Text lines={5} />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Employee ID</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Full Name</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Official Email</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Department</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Account Status</th>
              </tr>
            </thead>
            <tbody>
              {officers.map((o) => (
                <tr key={o._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>{o.employeeId}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <Link to={`/admin/users/${o._id}`} style={{ color: 'var(--color-primary-600)', textDecoration: 'none', fontWeight: 600 }}>
                      {o.name || o.fullName}
                    </Link>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)' }}>{o.email || o.officialEmail}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{o.department || 'MOSPI'}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <Badge variant={o.isClaimed ? 'success' : 'neutral'}>
                      {o.isClaimed ? 'Registered / Claimed' : 'Pending Invite'}
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
