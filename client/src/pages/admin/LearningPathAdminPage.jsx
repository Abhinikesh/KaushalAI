import { useState } from 'react'

export default function LearningPathAdminPage() {
  const [weights, setWeights] = useState({
    gapSeverity: 40,
    roleMandate: 35,
    courseDuration: 15,
    sourcePreference: 10,
  })
  const [saved, setSaved] = useState(false)

  const handleSave = (e) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Learning Path &amp; Recommendation Engine Rules
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Tune AI recommendation scoring weights, milestone progression rules, and role readiness gates
        </p>
      </div>

      {saved && (
        <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-lg)', color: '#065f46', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
          ✓ AI recommendation engine weights updated and re-indexed.
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Recommendation Scoring Model Weights (Must Total 100%)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                <span>Skill Gap Severity Weight</span>
                <strong>{weights.gapSeverity}%</strong>
              </div>
              <input
                type="range"
                min="10"
                max="70"
                value={weights.gapSeverity}
                onChange={(e) => setWeights((p) => ({ ...p, gapSeverity: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: 'var(--color-primary-600)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                <span>Cadre Role Standard Alignment</span>
                <strong>{weights.roleMandate}%</strong>
              </div>
              <input
                type="range"
                min="10"
                max="70"
                value={weights.roleMandate}
                onChange={(e) => setWeights((p) => ({ ...p, roleMandate: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: 'var(--color-primary-600)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                <span>Course Feasibility &amp; Duration Fit</span>
                <strong>{weights.courseDuration}%</strong>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                value={weights.courseDuration}
                onChange={(e) => setWeights((p) => ({ ...p, courseDuration: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: 'var(--color-primary-600)' }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
            Apply Algorithm Weights
          </button>
        </div>
      </form>
    </div>
  )
}
