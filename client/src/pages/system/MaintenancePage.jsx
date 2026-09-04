import { Wrench } from 'lucide-react'
import Badge from '../../components/ui/Badge'

export default function MaintenancePage() {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 'var(--space-6)' }}>
      <div style={{ marginBottom: 'var(--space-3)', display: 'flex', justifyContent: 'center' }}>
        <Wrench size={48} color="var(--color-primary-600)" />
      </div>
      <Badge variant="igot">Scheduled System Maintenance</Badge>
      <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 'var(--space-4)' }}>
        KaushalAI is Currently Under Maintenance
      </h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', maxWidth: 520, marginTop: 'var(--space-2)', lineHeight: 1.6 }}>
        The platform is undergoing scheduled database schema updates and AI vector embedding re-indexing to support the upcoming National Sample Survey rounds.
      </p>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4) var(--space-6)', marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-6)', textAlign: 'left' }}>
        <div>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Estimated Window</span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>Sunday 02:00 AM – 06:00 AM IST</div>
        </div>
        <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: 'var(--space-6)' }}>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Services Affected</span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>Learner Dashboard &amp; Quiz Engine</div>
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-6)' }}>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: 'var(--space-2) var(--space-5)',
            background: 'var(--color-primary-600)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Check Service Status
        </button>
      </div>
    </div>
  )
}
