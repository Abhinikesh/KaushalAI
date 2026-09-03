import Badge from '../ui/Badge'
import Card from '../ui/Card'

export default function RoadmapNotice({
  title,
  subtitle = 'Planned for Production Rollout',
  description,
  prerequisites = [],
  phase = 'Phase II Production Deployment',
  icon = '🏛️',
}) {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
          <Badge variant="igot">{phase}</Badge>
          <Badge variant="neutral">Architecture Specification Ready</Badge>
        </div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          {title}
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
          {subtitle}
        </p>
      </div>

      <Card padding="padded">
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-xl)',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', flex: 1 }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: 0 }}>
              Official Deployment Scope &amp; Purpose
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {description}
            </p>
          </div>
        </div>
      </Card>

      {prerequisites.length > 0 && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Enterprise Prerequisites for Activation
          </h3>
          <ul style={{ margin: 0, paddingLeft: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {prerequisites.map((req, i) => (
              <li key={i} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {req}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
        ℹ️ <strong>System Note:</strong> KaushalAI maintains strict data authenticity. In alignment with governance guidelines, this interface deliberately displays architectural intent rather than fabricated metrics or simulated synthetic values.
      </div>
    </div>
  )
}
