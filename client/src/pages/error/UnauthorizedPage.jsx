import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import Button from '../../components/ui/Button'

export default function UnauthorizedPage() {
  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 'var(--space-6)' }}>
      <div style={{ marginBottom: 'var(--space-3)', display: 'flex', justifyContent: 'center' }}>
        <ShieldAlert size={48} color="var(--color-error)" />
      </div>
      <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'bold', color: 'var(--color-error)' }}>
        403
      </div>
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 'var(--space-2)' }}>
        Access Restricted
      </h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', maxWidth: 460, marginTop: 'var(--space-2)', lineHeight: 1.5 }}>
        You do not possess the required administrative privileges to access this governance view.
      </p>

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
        <Link to="/dashboard">
          <Button>Return to My Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
