import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'

export default function ServerErrorPage() {
  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 'var(--space-6)' }}>
      <div style={{ fontSize: '4rem', marginBottom: 'var(--space-2)' }}>⚠️</div>
      <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'bold', color: '#d97706' }}>
        500
      </div>
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 'var(--space-2)' }}>
        Internal Server Error
      </h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', maxWidth: 460, marginTop: 'var(--space-2)', lineHeight: 1.5 }}>
        An unexpected server exception occurred while processing this statistical query. The incident has been automatically logged to the audit registry.
      </p>

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
        <Button onClick={() => window.location.reload()}>
          🔄 Reload Page
        </Button>
        <Link to="/dashboard">
          <Button variant="secondary">Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
