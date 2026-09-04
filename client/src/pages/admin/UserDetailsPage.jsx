import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getAdminComposedOfficer } from '../../api/admin.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function UserDetailsPage() {
  const { id } = useParams()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['composedOfficerProfile', id],
    queryFn: () => getAdminComposedOfficer(id),
  })

  const officer = data?.officer
  const user = data?.user
  const competencies = data?.competencies || []
  const enrollments = data?.enrollments || []
  const attempts = data?.attempts || []

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <Skeleton height="30px" width="200px" />
        <Skeleton height="150px" />
      </div>
    )
  }

  if (isError || !officer) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 'var(--space-8)', textAlign: 'center' }}>
        <h2>Officer Record Not Found</h2>
        <p style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-4) 0' }}>
          No officer entry matches ID: <code>{id}</code>.
        </p>
        <Link to="/admin/roster" style={{ color: 'var(--color-primary-600)', fontWeight: 600 }}>
          ← Return to Officer Roster
        </Link>
      </div>
    )
  }

  const name = officer.name || officer.fullName || user?.name || 'Officer'
  const email = officer.email || officer.officialEmail || user?.email
  const employeeId = officer.employeeId || user?.employeeId || 'N/A'

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <Link to="/admin/roster" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Authorized Roster
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Officer Profile: {name}
          </h1>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Badge variant={officer.isClaimed || user ? 'success' : 'medium'}>
              {officer.isClaimed || user ? 'Account Active' : 'Unclaimed Roster Slot'}
            </Badge>
            <Badge variant="igot">{officer.cadre || 'Official Cadre'}</Badge>
          </div>
        </div>
      </div>

      {/* User Information Card */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        <div>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Employee ID</span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>{employeeId}</div>
        </div>

        <div>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Official Email</span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>{email}</div>
        </div>

        <div>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Department</span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>{officer.department || user?.department || 'Field Operations Division'}</div>
        </div>

        <div>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Designation / Job Role</span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>{officer.designation || officer.jobRoleId?.title || user?.designation || 'Statistical Officer'}</div>
        </div>
      </div>

      {/* Competencies Breakdown */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)', fontWeight: 'bold', fontSize: 'var(--text-sm)' }}>
          Assessed Competency Levels ({competencies.length} Profiled)
        </div>
        {competencies.length === 0 ? (
          <div style={{ padding: 'var(--space-5)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
            No individual competency records logged yet for this officer.
          </div>
        ) : (
          <div style={{ padding: 'var(--space-4)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
            {competencies.map((c) => (
              <div key={c._id} style={{ background: 'var(--color-surface-alt)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)' }}>
                <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600 }}>{c.competencyId?.category || 'Competency'}</span>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{c.competencyId?.name || 'Skill'}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', marginTop: 2 }}>Current Level: <strong>L{c.currentLevel || 1}</strong></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enrolled Courses & Attempts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-5)' }}>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)' }}>
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', margin: '0 0 var(--space-3)' }}>
            Course Enrollments ({enrollments.length})
          </h3>
          {enrollments.length === 0 ? (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>Not currently enrolled in training courses.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 'var(--text-xs)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {enrollments.map((e) => (
                <li key={e._id}>
                  <strong>{e.courseId?.title || 'Course'}</strong> — {e.progressPercent || 0}% completed ({e.status})
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)' }}>
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', margin: '0 0 var(--space-3)' }}>
            Quiz &amp; Assessment Attempts ({attempts.length})
          </h3>
          {attempts.length === 0 ? (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>No assessment attempts submitted yet.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 'var(--text-xs)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {attempts.map((a) => (
                <li key={a._id}>
                  <strong>{a.quizId?.title || 'Quiz'}</strong> — Score: <Badge variant={a.score >= 70 ? 'success' : 'medium'}>{a.score}%</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
