import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine,
} from 'recharts'
import Card from '../ui/Card'
import styles from './SkillCompetencyOverview.module.css'

// Severity color palette adhering to design tokens
const SEVERITY_COLORS = {
  none: '#10B981',    // Emerald / success
  low: '#06B6D4',     // Cyan / info
  medium: '#F59E0B',  // Amber / warning
  high: '#EF4444',    // Rose / error
}

/**
 * SkillCompetencyOverview
 * Redesigned percentage-based competency progress widget
 * Displays progress toward required role proficiency (0-100%) with clear threshold markers.
 */
export default function SkillCompetencyOverview({ gaps = [], maxItems = 7 }) {
  const { t } = useTranslation()
  // Take top 6-8 competencies
  const displayedGaps = (gaps || []).slice(0, maxItems)

  const chartData = displayedGaps.map((g) => {
    const req = Math.max(1, g.required_level || 3)
    const cur = Math.max(0, g.current_level ?? 1)
    const pct = Math.min(100, Math.round((cur / req) * 100))
    const gapLevels = Math.max(0, req - cur)

    return {
      name: g.name,
      current: cur,
      required: req,
      progress: pct,
      percentageLabel: `${pct}%`,
      gap: gapLevels,
      severity: g.gap_severity || (gapLevels === 0 ? 'none' : gapLevels > 1 ? 'high' : 'medium'),
      levelSummary: `Lvl ${cur} of ${req}`,
    }
  })

  // Custom tooltip for clarity
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null
    const data = payload[0].payload

    return (
      <div className={styles.tooltip}>
        <div className={styles.tooltipTitle}>{data.name}</div>
        <div className={styles.tooltipRow}>
          <span className={styles.tooltipLabel}>Proficiency:</span>
          <span className={styles.tooltipValue}>
            Level {data.current} / Required: Level {data.required}
          </span>
        </div>
        <div className={styles.tooltipRow}>
          <span className={styles.tooltipLabel}>Requirement Reached:</span>
          <span className={styles.tooltipValue} style={{ color: SEVERITY_COLORS[data.severity] || '#4F46E5', fontWeight: 700 }}>
            {data.progress}%
          </span>
        </div>
        {data.gap > 0 ? (
          <div className={styles.tooltipGap}>
            Gap to Target: {data.gap} {data.gap === 1 ? 'level' : 'levels'}
          </div>
        ) : (
          <div className={styles.tooltipMet}>✓ Target Met</div>
        )}
      </div>
    )
  }

  return (
    <Card padding="compact" className={styles.overviewCard}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.cardTitle}>{t('dashboard.skill_competency_overview')}</h3>
          <p className={styles.cardSubtitle}>
            {t('dashboard.skill_competency_subtitle')}
          </p>
        </div>
        <Link to="/skill-gaps" className={styles.viewAllLink}>
          {t('dashboard.view_all')}
        </Link>
      </div>

      <div className={styles.chartContainer}>
        {chartData.length === 0 ? (
          <div className={styles.emptyState}>{t('dashboard.no_competencies')}</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 36)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 8, right: 36, top: 8, bottom: 8 }}
              barSize={14}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={155}
                tick={{ fontSize: 11.5, fill: '#1E293B', fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                x={100}
                stroke="#94A3B8"
                strokeDasharray="3 3"
                label={{
                  value: 'Target 100%',
                  position: 'top',
                  fill: '#94A3B8',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
              <Bar
                dataKey="progress"
                name="Progress"
                radius={[0, 4, 4, 0]}
                background={{ fill: '#F1F5F9', radius: [0, 4, 4, 0] }}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={SEVERITY_COLORS[entry.severity] || '#4F46E5'}
                  />
                ))}
                <LabelList
                  dataKey="percentageLabel"
                  position="right"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    fill: '#475569',
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className={styles.chartFooter}>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#10B981' }} />
          <span>{t('dashboard.met_100')}</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#06B6D4' }} />
          <span>{t('dashboard.low_gap')}</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#F59E0B' }} />
          <span>{t('dashboard.moderate_gap')}</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#EF4444' }} />
          <span>{t('dashboard.critical_gap')}</span>
        </div>
        <div className={styles.legendTrack}>
          <span className={styles.legendTrackBar} />
          <span>{t('dashboard.required_target')}</span>
        </div>
      </div>
    </Card>
  )
}
