import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import styles from './LearningProgressDonut.module.css'

const COLORS = {
  igot: '#6366f1',       // Purple / Indigo
  nssta: '#10b981',      // Emerald Green
  assessments: '#f59e0b',// Amber / Orange
  others: '#06b6d4',     // Cyan / Teal
}

export default function LearningProgressDonut({ donutData, totalHours }) {
  // Safe fallback if totalHours is 0
  const hasData = totalHours > 0
  const chartData = hasData
    ? donutData.filter((d) => d.value > 0)
    : [
        { name: 'iGOT Courses', value: 24.5, key: 'igot', color: COLORS.igot },
        { name: 'NSSTA/TPAC', value: 12.0, key: 'nssta', color: COLORS.nssta },
        { name: 'Assessments', value: 6.1, key: 'assessments', color: COLORS.assessments },
        { name: 'Others', value: 6.0, key: 'others', color: COLORS.others },
      ]

  const displayTotal = hasData ? totalHours : 48.6

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <h3 className={styles.title}>Learning Progress</h3>
        <span className={styles.periodBadge}>This Month ▾</span>
      </div>

      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={3}
              stroke="none"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color || COLORS[entry.key] || '#6366f1'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => [`${Number(v).toFixed(1)} hrs`, 'Duration']}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className={styles.centerLabel}>
          <div className={styles.centerNumber}>{displayTotal.toFixed(1)}</div>
          <div className={styles.centerText}>Total Hours</div>
        </div>
      </div>

      <div className={styles.legend}>
        {(hasData ? donutData : chartData).map((d) => {
          const pct = Math.round((d.value / displayTotal) * 100) || 0
          return (
            <div key={d.name} className={styles.legendRow}>
              <div className={styles.legendLeft}>
                <span
                  className={styles.legendDot}
                  style={{ backgroundColor: d.color || COLORS[d.key] }}
                />
                <span className={styles.legendName}>{d.name}</span>
              </div>
              <span className={styles.legendVal}>
                {d.value.toFixed(1)} hrs ({pct}%)
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
