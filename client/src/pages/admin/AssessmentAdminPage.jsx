import Badge from '../../components/ui/Badge'

export default function AssessmentAdminPage() {
  const policies = [
    { title: 'Annual Statistical Cadre Proficiency Diagnostic', cadence: 'Annual (Mandatory)', target: 'All Statistical Officers (SSS)', passPct: '60%', compliance: '91%' },
    { title: 'Induction Phase Competency Gateway', cadence: 'Post-Induction (100 Days)', target: 'Newly Recruited Statistical Assistants', passPct: '70%', compliance: '100%' },
    { title: 'Large Scale Survey Fieldwork Certification', cadence: 'Before every NSSO Round', target: 'Field Investigators & Supervisors', passPct: '65%', compliance: '94%' },
  ]

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Assessment Governance &amp; Certification Policies
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Mandatory cadre evaluation cadences, certification thresholds, and compliance monitoring
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {policies.map((p, i) => (
          <div
            key={i}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-5)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 'var(--space-4)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                  {p.title}
                </h3>
                <Badge variant="igot">{p.cadence}</Badge>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                Target Cadre: <strong>{p.target}</strong> • Pass Standard: <strong>{p.passPct}</strong>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--color-success)' }}>
                {p.compliance}
              </div>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Cadre Compliance</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
