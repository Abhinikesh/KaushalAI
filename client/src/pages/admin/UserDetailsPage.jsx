import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getOfficer } from '../../api/roster.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function UserDetailsPage() {
  const { id } = useParams()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['rosterOfficer', id],
    queryFn: () => getOfficer(id),
  })

  const officer = data?.officer

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
          No authorized officer entry matches ID: <code>{id}</code>.
        </p>
        <Link to="/admin/roster" style={{ color: 'var(--color-primary-600)', fontWeight: 600 }}>
          ← Return to Officer Roster
        </Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <Link to="/admin/roster" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Authorized Roster
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Officer Profile: {officer.name}
          </h1>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Badge variant={officer.isClaimed ? 'success' : 'medium'}>
              {officer.isClaimed ? '✓ Account Claimed' : 'Unclaimed Roster Slot'}
            </Badge>
            <Badge variant="igot">{officer.cadre || 'MOSPI Cadre'}</Badge>
          </div>
        </div>
      </div>

      {/* User Information Card */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        <div>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Official Email</span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>{officer.email}</div>
        </div>

        <div>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Employee ID</span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>{officer.employeeId}</div>
        </div>

        <div>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Official Designation</span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>{officer.designation || 'Statistical Officer'}</div>
        </div>

        <div>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Department / Division</span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>{officer.department || 'Field Operations Division (FOD)'}</div>
        </div>

        <div>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Role Authorization</span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2, textTransform: 'capitalize' }}>{officer.role}</div>
        </div>

        <div>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Roster Ingestion Date</span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>
            {officer.createdAt ? new Date(officer.createdAt).toLocaleDateString('en-IN') : 'Official Roster Seed'}
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Cadre Assignment &amp; Job Role
        </h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Mapped to official Job Role: <strong>{typeof officer.jobRoleId === 'object' && officer.jobRoleId ? officer.jobRoleId.title : 'Official Statistics Cadre'}</strong>.
        </p>
      </div>
    </div>
  )
}
