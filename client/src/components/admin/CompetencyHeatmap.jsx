import { useState } from 'react'
import styles from './CompetencyHeatmap.module.css'

// Level 1→5 mapped to a CSS colour via inline style (no external lib)
const LEVEL_COLORS = {
  0: { bg: '#f3f4f6', text: '#9ca3af' },   // no data
  1: { bg: '#fde8e8', text: '#991b1b' },
  2: { bg: '#fef3c7', text: '#92400e' },
  3: { bg: '#fef9c3', text: '#713f12' },
  4: { bg: '#d1fae5', text: '#065f46' },
  5: { bg: '#a7f3d0', text: '#047857' },
}

function cellColor(avgLevel) {
  const rounded = Math.round(avgLevel) || 0
  return LEVEL_COLORS[Math.min(5, Math.max(0, rounded))]
}

const CATEGORY_LABELS = {
  statistical:        'Statistical',
  technical:          'Technical',
  digital_governance: 'Digital Gov.',
  behavioural:        'Behavioural',
}

/**
 * CompetencyHeatmap — pure CSS grid table.
 * Props: departments[], categories[], cells{ "dept::cat": { avgLevel, count, breakdown[] } }
 */
export default function CompetencyHeatmap({ departments, categories, cells }) {
  const [expanded, setExpanded] = useState(null)   // expanded department name

  if (!departments?.length || !categories?.length) {
    return <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>No competency data yet.</p>
  }

  const toggleDept = (dept) => setExpanded((d) => (d === dept ? null : dept))

  return (
    <div>
      <div className={styles.heatmapWrap}>
        <table className={styles.table} role="grid" aria-label="Department competency heatmap">
          <thead>
            <tr>
              <th className={[styles.th, styles.thDept].join(' ')}>Department</th>
              {categories.map((cat) => (
                <th key={cat} className={styles.th}>
                  {CATEGORY_LABELS[cat] ?? cat}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => (
              <>
                <tr key={dept}>
                  <td
                    className={styles.deptCell}
                    onClick={() => toggleDept(dept)}
                    role="button"
                    aria-expanded={expanded === dept}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && toggleDept(dept)}
                  >
                    {dept}
                    <span className={styles.expandArrow}>{expanded === dept ? '▲' : '▼'}</span>
                  </td>
                  {categories.map((cat) => {
                    const key  = `${dept}::${cat}`
                    const cell = cells[key]
                    const color = cell ? cellColor(cell.avgLevel) : LEVEL_COLORS[0]
                    return (
                      <td
                        key={cat}
                        className={styles.cell}
                        style={{ background: color.bg }}
                        title={cell ? `${dept} / ${cat}: avg level ${cell.avgLevel} (${cell.count} records)` : 'No data'}
                      >
                        {cell ? (
                          <>
                            <div className={styles.cellLevel} style={{ color: color.text }}>
                              {cell.avgLevel.toFixed(1)}
                            </div>
                            <div className={styles.cellCount}>{cell.count} records</div>
                          </>
                        ) : (
                          <span className={styles.empty}>—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>

                {/* Drill-down breakdown row */}
                {expanded === dept && (
                  <tr key={`${dept}-breakdown`} className={styles.breakdownRow}>
                    <td colSpan={categories.length + 1}>
                      <div className={styles.breakdown}>
                        {categories.map((cat) => {
                          const cell = cells[`${dept}::${cat}`]
                          if (!cell?.breakdown?.length) return null
                          return cell.breakdown.map((b) => (
                            <div key={b.name} className={styles.bItem}>
                              <span className={styles.bName}>{b.name}</span>
                              <span className={styles.bLevel}
                                style={{ background: cellColor(b.avgLevel).bg, color: cellColor(b.avgLevel).text }}>
                                L{b.avgLevel.toFixed(1)}
                              </span>
                            </div>
                          ))
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendLabel}>Level:</span>
        <div className={styles.legendScale}>
          {[1, 2, 3, 4, 5].map((l) => (
            <div key={l} className={styles.legendStep}
              style={{ background: LEVEL_COLORS[l].bg }}
              title={`Level ${l}`} />
          ))}
        </div>
        <span className={styles.legendLabel}>1 (low) → 5 (high)</span>
      </div>
    </div>
  )
}
