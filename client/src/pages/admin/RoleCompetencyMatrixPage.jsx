import { useState } from 'react'
import Badge from '../../components/ui/Badge'

export default function RoleCompetencyMatrixPage() {
  const roles = ['Statistical Assistant', 'Statistical Officer', 'Senior Statistical Officer', 'Assistant Director (ISS)']

  const [matrix, setMatrix] = useState([
    { competency: 'Survey Sampling Techniques', levels: [2, 3, 4, 5] },
    { competency: 'National Accounts Statistics', levels: [1, 2, 4, 5] },
    { competency: 'Data Quality & NQAF', levels: [2, 3, 4, 4] },
    { competency: 'Index Numbers (CPI/IIP)', levels: [2, 3, 3, 4] },
    { competency: 'Statistical Computing (R/Python)', levels: [1, 2, 3, 4] },
    { competency: 'Fieldwork Team Leadership', levels: [1, 2, 3, 4] },
    { competency: 'Administrative Registers', levels: [1, 2, 3, 4] },
  ])

  const setLevel = (cIdx, rIdx, newLvl) => {
    const updated = [...matrix]
    updated[cIdx].levels[rIdx] = Number(newLvl)
    setMatrix(updated)
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Role–Competency Proficiency Matrix
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Define mandated proficiency levels (1–5) for each cadre job role against official competencies
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert('Matrix changes saved to official standard')}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--color-primary-600)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Save Matrix Standards
        </button>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600, minWidth: 240 }}>
                Competency Standard
              </th>
              {roles.map((r, i) => (
                <th key={i} style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600, textAlign: 'center' }}>
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, cIdx) => (
              <tr key={cIdx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {row.competency}
                </td>
                {row.levels.map((lvl, rIdx) => (
                  <td key={rIdx} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                    <select
                      value={lvl}
                      onChange={(e) => setLevel(cIdx, rIdx, e.target.value)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        background: lvl >= 4 ? 'rgba(99, 102, 241, 0.1)' : 'var(--color-surface)',
                        fontWeight: 'bold',
                        fontSize: 11,
                        color: lvl >= 4 ? 'var(--color-primary-700)' : 'var(--color-text-primary)',
                      }}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>Level {n}</option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
