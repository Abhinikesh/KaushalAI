import Badge from '../../components/ui/Badge'

export default function TrainingEffectivenessAdminPage() {
  const levels = [
    { lvl: 'Level 1: Reaction', metric: '4.82 / 5.0 Rating', desc: 'Participant feedback on syllabus relevance, instructor expertise, and training materials across all NSSTA workshops.' },
    { lvl: 'Level 2: Learning', metric: '+28.4% Score Gain', desc: 'Pre-training diagnostic vs post-training evaluation competency score growth across enrolled officers.' },
    { lvl: 'Level 3: Behavior', metric: '-34.2% Audit Errors', desc: 'Reduction in field schedule data capture discrepancies reported by DQAD inspection teams in NSSO rounds.' },
    { lvl: 'Level 4: Impact', metric: '+18.5% Timeliness', desc: 'Accelerated quarterly survey tabulation and dissemination timelines following national accounts computing workshops.' },
  ]

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Institutional Training Effectiveness (Kirkpatrick Model)
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Evaluation of training outcomes, knowledge retention, and field survey quality impact
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-5)' }}>
        {levels.map((l, i) => (
          <div
            key={i}
            style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <Badge variant="igot">{l.lvl}</Badge>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-success)', margin: 'var(--space-2) 0' }}>
              {l.metric}
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginTop: 'auto' }}>
              {l.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
