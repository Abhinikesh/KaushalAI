import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import Button from '../../components/ui/Button'

export default function NotFoundPage() {
  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 'var(--space-6)' }}>
      <div style={{ marginBottom: 'var(--space-3)', display: 'flex', justifyContent: 'center' }}>
        <Search size={48} color="var(--color-primary-600)" />
      </div>
      <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'bold', color: 'var(--color-primary-600)' }}>
        404
      </div>
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 'var(--space-2)' }}>
        Page Not Found
      </h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', maxWidth: 460, marginTop: 'var(--space-2)', lineHeight: 1.5 }}>
        The statistical portal resource or administrative document you are looking for does not exist or has been archived.
      </p>

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
        <Link to="/dashboard">
          <Button>Return to Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
