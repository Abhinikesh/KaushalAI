import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { getCourse } from '../../api/course.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

export default function TrainingDetailPage() {
  const { id } = useParams()
  const [training, setTraining] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    getCourse(id)
      .then((res) => {
        if (!mounted) return
        setTraining(res?.course || res || null)
      })
      .catch(() => {
        if (mounted) setTraining(null)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [id])

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <Skeleton.Text lines={2} />
        <Skeleton.Card />
      </div>
    )
  }

  if (!training) {
    return (
      <EmptyState
        icon={Search}
        title="Training programme not found"
        description="The requested NSSTA programme could not be located in the current calendar."
        action="Back to Programmes"
        onAction={() => window.history.back()}
      />
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <Link
          to="/training/nssta"
          style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-primary-600)', textDecoration: 'none' }}
        >
          ← Back to NSSTA Training Calendar
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            {training.title}
          </h1>
          <Badge variant="nssta">NSSTA Official</Badge>
        </div>
      </div>

      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <div style={{ background: 'var(--color-surface-alt)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Venue</span>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>NSSTA Campus, Greater Noida (UP)</div>
          </div>
          <div style={{ background: 'var(--color-surface-alt)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Duration</span>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>5 Working Days (30 Hours)</div>
          </div>
          <div style={{ background: 'var(--color-surface-alt)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Delivery Mode</span>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>Residential / Blended</div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: 6 }}>
            Programme Overview
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
            {training.description || 'Targeted training workshop on official survey methodologies, statistical registers, data quality frameworks, and national accounts.'}
          </p>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: 6 }}>
            Eligibility &amp; Target Cadres
          </h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>• Statistical Officers and Statistical Assistants in MOSPI (CSO / NSSO)</li>
            <li>• Officers of State / UT Directorates of Economics and Statistics (DES)</li>
            <li>• Minimum 1 year in current official cadre</li>
          </ul>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            Official nominations forwarded through your division head
          </span>
          <button
            type="button"
            onClick={() => alert('Nomination request submitted to your controlling officer for forwarding to NSSTA.')}
            style={{
              padding: 'var(--space-2) var(--space-5)',
              background: 'var(--color-primary-600)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Apply for Nomination
          </button>
        </div>
      </div>
    </div>
  )
}
