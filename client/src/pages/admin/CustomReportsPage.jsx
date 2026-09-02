import { useState } from 'react'

export default function CustomReportsPage() {
  const [cadre, setCadre] = useState('all')
  const [division, setDivision] = useState('all')
  const [period, setPeriod] = useState('q2-2026')
  const [generated, setGenerated] = useState(false)

  const handleGenerate = (e) => {
    e.preventDefault()
    setGenerated(true)
  }

  return (
    <div style={{ maxWidth: 950, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Custom Report Query Builder
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Generate customized statistical capacity reports, competency summaries, and audit logs
        </p>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Target Cadre
              </label>
              <select
                value={cadre}
                onChange={(e) => setCadre(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: 'var(--space-2) var(--space-3)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', fontSize: 'var(--text-sm)' }}
              >
                <option value="all">All Cadres (SSS + ISS + DES)</option>
                <option value="sss">Subordinate Statistical Service (SSS)</option>
                <option value="iss">Indian Statistical Service (ISS)</option>
                <option value="des">State/UT DES Officers</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Division / Directorate
              </label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: 'var(--space-2) var(--space-3)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', fontSize: 'var(--text-sm)' }}
              >
                <option value="all">All Divisions</option>
                <option value="fod">Field Operations Division (FOD)</option>
                <option value="sdrd">Survey Design &amp; Research (SDRD)</option>
                <option value="nad">National Accounts (NAD)</option>
                <option value="nssta">NSSTA Greater Noida</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Reporting Timeframe
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: 'var(--space-2) var(--space-3)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', fontSize: 'var(--text-sm)' }}
              >
                <option value="q2-2026">Current Quarter (Q2 2026)</option>
                <option value="q1-2026">Previous Quarter (Q1 2026)</option>
                <option value="fy2025-26">Full Financial Year 2025–26</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <button
              type="submit"
              style={{
                padding: 'var(--space-2) var(--space-6)',
                background: 'var(--color-primary-600)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Generate Report View
            </button>
          </div>
        </form>
      </div>

      {generated && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold' }}>
              Report Output: Cadre Capacity Diagnostic ({period.toUpperCase()})
            </h3>

            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{ padding: '4px 12px', background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                🖨️ Print / Save PDF
              </button>
              <button
                type="button"
                onClick={() => alert('CSV file generated and exported')}
                style={{ padding: '4px 12px', background: 'var(--color-primary-600)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                📥 Export CSV
              </button>
            </div>
          </div>

          <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            <div>Total Officers Analyzed: <strong>184</strong></div>
            <div>Average Cadre Readiness Score: <strong>78.6%</strong></div>
            <div>Total Cumulative Learning Hours Delivered: <strong>4,820 Hours</strong></div>
            <div>Official Certification Pass Rate: <strong>82.8%</strong></div>
          </div>
        </div>
      )}
    </div>
  )
}
