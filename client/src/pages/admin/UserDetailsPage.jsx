import { useParams, Link } from 'react-router-dom'
import Badge from '../../components/ui/Badge'

export default function UserDetailsPage() {
  const { id } = useParams()

  const user = {
    id: id || '1',
    name: 'Rajesh Sharma',
    email: 'rajesh.sharma@mospi.gov.in',
    empId: 'MOSPI-2018-041',
    role: 'employee',
    designation: 'Statistical Officer',
    department: 'Field Operations Division (FOD) Delhi',
    cadre: 'Subordinate Statistical Service (SSS)',
    joinedDate: '12 March 2018',
    status: 'Active',
    readinessScore: 78,
  }

  const competencies = [
    { name: 'Survey Sampling Techniques', level: 4, req: 4, status: 'Met' },
    { name: 'Data Quality (NQAF)', level: 3, req: 4, status: 'Gap (-1)' },
    { name: 'National Accounts Statistics', level: 3, req: 3, status: 'Met' },
    { name: 'Statistical Computing (R/Python)', level: 2, req: 3, status: 'Gap (-1)' },
  ]

  const enrollments = [
    { title: 'Foundations of Official Statistics', source: 'igot', progress: 100, status: 'Completed' },
    { title: 'Survey Sampling Techniques (NSSTA)', source: 'nssta', progress: 65, status: 'In Progress' },
  ]

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <Link to="/admin/users" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to User Management
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Officer Profile: {user.name}
          </h1>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Badge variant="success">Roster Verified</Badge>
            <Badge variant="igot">{user.cadre}</Badge>
          </div>
        </div>
      </div>

      {/* User Information Card */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        <div>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Official Email</span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>{user.email}</div>
        </div>
        <div>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Employee ID</span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>{user.empId}</div>
        </div>
        <div>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Designation &amp; Division</span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>{user.designation} • {user.department}</div>
        </div>
        <div>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Role Readiness</span>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>{user.readinessScore}%</div>
        </div>
      </div>

      {/* Competencies Table */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold' }}>Assigned Cadre Competencies</h3>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Competency Name</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Current Level</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Required Level</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Gap Status</th>
            </tr>
          </thead>
          <tbody>
            {competencies.map((c, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>Level {c.level}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>Level {c.req}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant={c.status === 'Met' ? 'success' : 'medium'}>{c.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Course Enrollments */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)' }}>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', marginBottom: 'var(--space-3)' }}>
          Course Enrolments &amp; Activity
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {enrollments.map((e, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)' }}>
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{e.title}</div>
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Source: {e.source.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{e.progress}%</span>
                <Badge variant={e.status === 'Completed' ? 'success' : 'igot'}>{e.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
