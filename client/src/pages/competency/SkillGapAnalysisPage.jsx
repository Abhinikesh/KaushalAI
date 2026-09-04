import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Download,
  SlidersHorizontal,
  Calendar,
  Info,
  ClipboardCheck,
  ListOrdered,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  BookOpen,
  BarChart2,
  AlertCircle,
  Search,
  ArrowUpRight,
  Filter,
  Check,
} from 'lucide-react'
import { getLearningPath } from '../../api/learningPath.api'
import styles from './SkillGapAnalysisPage.module.css'

// ── Default Mockup-Aligned Data ──────────────────────────────────────────────
const OVERVIEW_BARS = [
  { name: 'Data Collection',       current: 20, required: 90, gap: 70 },
  { name: 'Data Analysis',         current: 25, required: 85, gap: 60 },
  { name: 'Statistical Methods',   current: 35, required: 80, gap: 45 },
  { name: 'Data Visualization',    current: 35, required: 75, gap: 40 },
  { name: 'Report Writing',        current: 15, required: 80, gap: 65 },
  { name: 'Data Quality Assurance',current: 15, required: 70, gap: 55 },
  { name: 'IT & Tools',            current: 15, required: 80, gap: 75 },
]

const TOP_5_SKILLS = [
  { name: 'Advanced Statistical Modeling', gap: 45 },
  { name: 'Time Series Analysis',          gap: 40 },
  { name: 'Machine Learning for Statistics',gap: 38 },
  { name: 'GIS for Data Analysis',          gap: 35 },
  { name: 'Dashboard Development (Power BI)',gap: 30 },
]

const TREND_POINTS = [
  { month: 'Dec 2025', score: 70, x: 45,  y: 60 },
  { month: 'Jan 2026', score: 68, x: 115, y: 64 },
  { month: 'Feb 2026', score: 65, x: 185, y: 70 },
  { month: 'Mar 2026', score: 64, x: 255, y: 72 },
  { month: 'May 2026', score: 62, x: 325, y: 76 },
]

const COMPETENCY_AREAS = [
  { area: 'Data Collection',       current: 70, required: 90, gap: 20, priority: 'Medium' },
  { area: 'Data Analysis',         current: 60, required: 85, gap: 25, priority: 'High' },
  { area: 'Statistical Methods',   current: 45, required: 80, gap: 35, priority: 'High' },
  { area: 'Data Visualization',    current: 40, required: 75, gap: 35, priority: 'High' },
  { area: 'Report Writing',        current: 65, required: 80, gap: 15, priority: 'Medium' },
  { area: 'Data Quality Assurance',current: 55, required: 70, gap: 15, priority: 'Medium' },
  { area: 'IT & Tools',            current: 75, required: 80, gap: 5,  priority: 'Low' },
]

const ALL_SKILLS_DATA = [
  { id: 'SK-01', name: 'Advanced Statistical Modeling', category: 'Statistical Methods', current: 2, required: 4, gap: '45%', priority: 'High' },
  { id: 'SK-02', name: 'Time Series Analysis', category: 'Data Analysis', current: 2, required: 4, gap: '40%', priority: 'High' },
  { id: 'SK-03', name: 'Machine Learning for Statistics', category: 'IT & Tools', current: 1, required: 3, gap: '38%', priority: 'High' },
  { id: 'SK-04', name: 'GIS for Data Analysis', category: 'Data Visualization', current: 2, required: 3, gap: '35%', priority: 'High' },
  { id: 'SK-05', name: 'Dashboard Development (Power BI)', category: 'Data Visualization', current: 2, required: 4, gap: '30%', priority: 'High' },
  { id: 'SK-06', name: 'Sample Survey Design', category: 'Data Collection', current: 3, required: 4, gap: '25%', priority: 'Medium' },
  { id: 'SK-07', name: 'National Accounts Statistics', category: 'Statistical Methods', current: 3, required: 4, gap: '20%', priority: 'Medium' },
  { id: 'SK-08', name: 'Consumer Price Index (CPI) Estimation', category: 'Statistical Methods', current: 3, required: 4, gap: '20%', priority: 'Medium' },
  { id: 'SK-09', name: 'Data Verification & Auditing', category: 'Data Quality Assurance', current: 3, required: 4, gap: '15%', priority: 'Medium' },
  { id: 'SK-10', name: 'Official Report Drafting', category: 'Report Writing', current: 3, required: 4, gap: '15%', priority: 'Medium' },
  { id: 'SK-11', name: 'R Programming for Statistics', category: 'IT & Tools', current: 3, required: 4, gap: '15%', priority: 'Medium' },
  { id: 'SK-12', name: 'Field Enumeration Supervision', category: 'Data Collection', current: 4, required: 4, gap: '0%', priority: 'None' },
  { id: 'SK-13', name: 'Data Security Protocols', category: 'IT & Tools', current: 4, required: 4, gap: '5%', priority: 'Low' },
  { id: 'SK-14', name: 'SQL for Government Databases', category: 'IT & Tools', current: 4, required: 4, gap: '5%', priority: 'Low' },
]

export default function SkillGapAnalysisPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'skills' | 'competencies' | 'role' | 'department' | 'proficiency'
  const [dateRange, setDateRange] = useState('01 May 2026 - 31 May 2026')
  const [skillSearch, setSkillSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedPriority, setSelectedPriority] = useState('all')
  const [showFiltersModal, setShowFiltersModal] = useState(false)
  const [exportNotice, setExportNotice] = useState(false)

  const { data: apiData } = useQuery({
    queryKey: ['learningPath'],
    queryFn: getLearningPath,
    retry: 1,
  })

  // Export report function
  const handleExport = () => {
    const csvHeader = 'Category,Competency Area,Current (%),Required (%),Gap (%),Priority\n'
    const csvRows = COMPETENCY_AREAS.map(
      (c) => `Official Statistics,${c.area},${c.current}%,${c.required}%,${c.gap}%,${c.priority}`
    ).join('\n')
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `MoSPI_Skill_Gap_Analytics_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setExportNotice(true)
    setTimeout(() => setExportNotice(false), 2500)
  }

  // Live gap list from real MongoDB backend
  const liveGaps = apiData?.gapAnalysis?.gaps || []
  const activeSkillsList = liveGaps.length > 0
    ? liveGaps.map((g, idx) => ({
        id: `SK-${idx + 1}`,
        name: g.name,
        category: g.category === 'statistical' ? 'Statistical Methods' : g.category === 'technical' ? 'IT & Tools' : 'Core Statistics',
        current: g.current_level,
        required: g.required_level,
        gap: `${Math.round((g.gap / (g.required_level || 1)) * 100)}%`,
        priority: g.gap_severity === 'high' ? 'High' : g.gap_severity === 'medium' ? 'Medium' : g.gap > 0 ? 'Low' : 'None',
      }))
    : ALL_SKILLS_DATA

  // Filter skills for 'By Skills' tab
  const filteredSkills = activeSkillsList.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(skillSearch.toLowerCase())
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory
    const matchesPri = selectedPriority === 'all' || s.priority === selectedPriority
    return matchesSearch && matchesCat && matchesPri
  })

  return (
    <div className={styles.page}>
      {/* ── Breadcrumb ── */}
      <div className={styles.breadcrumb}>
        <Link to="/dashboard" className={styles.breadcrumbLink}>
          Dashboard
        </Link>
        <span>&gt;</span>
        <span className={styles.breadcrumbCurrent}>Skill Gap Analysis</span>
      </div>

      {/* ── Page Header ── */}
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Skill Gap Analytics</h1>
            <span
              className={styles.infoIcon}
              title="Calculated against MoSPI Statistical Officer Job Competency Framework"
            >
              <Info size={17} />
            </span>
          </div>
          <p className={styles.subtitle}>
            Identify the gap between current and required skills. Focus on high-impact areas to accelerate your growth.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.outlineActionBtn}
            onClick={handleExport}
            title="Download CSV report"
          >
            <Download size={15} />
            Export Report
          </button>

          <button
            type="button"
            className={styles.outlineActionBtn}
            onClick={() => setShowFiltersModal(!showFiltersModal)}
            title="Toggle filters"
          >
            <SlidersHorizontal size={15} />
            Filters
          </button>

          <div className={styles.dateRangePicker}>
            <Calendar size={15} color="#4f46e5" />
            <span>{dateRange}</span>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>▼</span>
          </div>
        </div>
      </div>

      {exportNotice && (
        <div
          style={{
            padding: '10px 16px',
            background: '#f0fdf4',
            border: '1px solid #dcfce7',
            borderRadius: 8,
            color: '#15803d',
            fontSize: '0.8125rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Check size={16} />
          Skill Gap Analytics Report exported successfully.
        </div>
      )}

      {/* ── Secondary Tab Bar ── */}
      <nav className={styles.tabBar} aria-label="Skill Gap Views">
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'skills' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          By Skills
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'competencies' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('competencies')}
        >
          By Competencies
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'role' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('role')}
        >
          By Role
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'department' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('department')}
        >
          By Department
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'proficiency' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('proficiency')}
        >
          By Proficiency Level
        </button>
      </nav>

      {/* ──────────────────────────────────────────────────────────────────────
          TAB 1: OVERVIEW (Exact Reference Mockup Layout)
          ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          {/* ── 5 Metric Cards in a Row ── */}
          <section className={styles.metricsGrid}>
            {/* Card 1 */}
            <div className={styles.metricCard}>
              <div className={`${styles.metricIconWrap} ${styles.iconPurple}`}>
                <ClipboardCheck size={20} />
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricLabel}>Overall Skill Gap Score</span>
                <div className={styles.metricValueRow}>
                  <span className={styles.metricValue}>62%</span>
                  <span className={styles.metricStatus}>Moderate</span>
                </div>
                <div className={styles.deltaBadge}>
                  <span>↑ 8% vs last assessment</span>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className={styles.metricCard}>
              <div className={`${styles.metricIconWrap} ${styles.iconBlue}`}>
                <ListOrdered size={20} />
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricLabel}>Skills Assessed</span>
                <div className={styles.metricValueRow}>
                  <span className={styles.metricValue}>48</span>
                </div>
                <span className={styles.metricSubtext}>Across 7 Competency Areas</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className={styles.metricCard}>
              <div className={`${styles.metricIconWrap} ${styles.iconRed}`}>
                <AlertTriangle size={20} />
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricLabel}>High Priority Gaps</span>
                <div className={styles.metricValueRow}>
                  <span className={styles.metricValue}>12</span>
                </div>
                <span className={`${styles.metricSubtext} ${styles.textRed}`}>
                  Require Immediate Attention
                </span>
              </div>
            </div>

            {/* Card 4 */}
            <div className={styles.metricCard}>
              <div className={`${styles.metricIconWrap} ${styles.iconGreen}`}>
                <CheckCircle2 size={20} />
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricLabel}>Skills On Track</span>
                <div className={styles.metricValueRow}>
                  <span className={styles.metricValue}>18</span>
                </div>
                <span className={styles.metricSubtext}>Meeting Required Level</span>
              </div>
            </div>

            {/* Card 5 */}
            <div className={styles.metricCard}>
              <div className={`${styles.metricIconWrap} ${styles.iconSky}`}>
                <TrendingUp size={20} />
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricLabel}>Skills Ahead</span>
                <div className={styles.metricValueRow}>
                  <span className={styles.metricValue}>8</span>
                </div>
                <span className={styles.metricSubtext}>Exceeding Expectations</span>
              </div>
            </div>
          </section>

          {/* ── Middle Row: 2-column Grid ── */}
          <section className={styles.middleGrid}>
            {/* Left: Skill Gap Overview Combo Chart */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Skill Gap Overview</h2>
                <div className={styles.chartLegendRow}>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDotCurrent} />
                    <span>Current Proficiency (%)</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDotRequired} />
                    <span>Required Proficiency (%)</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendSquareGap} />
                    <span>Gap (%)</span>
                  </div>
                </div>
              </div>

              {/* Combo Bar + Line Chart SVG */}
              <div className={styles.svgChartContainer}>
                <svg viewBox="0 0 740 260" className={styles.chartSvg}>
                  {/* Grid Lines */}
                  {[
                    { label: '100', y: 25 },
                    { label: '75',  y: 72 },
                    { label: '50',  y: 120 },
                    { label: '25',  y: 168 },
                    { label: '0',   y: 216 },
                  ].map((g) => (
                    <g key={g.label}>
                      <text x="24" y={g.y + 4} fontSize="11" fill="#94a3b8" textAnchor="end">
                        {g.label}
                      </text>
                      <line
                        x1="36"
                        y1={g.y}
                        x2="720"
                        y2={g.y}
                        stroke="#f1f5f9"
                        strokeDasharray={g.label === '0' ? 'none' : '3 3'}
                        strokeWidth="1.2"
                      />
                    </g>
                  ))}

                  {/* Bars for Gap (%) */}
                  {OVERVIEW_BARS.map((b, i) => {
                    const cx = 85 + i * 95
                    const barH = (b.gap / 100) * 191
                    const barY = 216 - barH
                    return (
                      <g key={b.name}>
                        {/* Rounded Bar */}
                        <rect
                          x={cx - 18}
                          y={barY}
                          width="36"
                          height={barH}
                          rx="4"
                          fill="#4f46e5"
                          opacity="0.88"
                        />
                        {/* Top Gap Value inside bar */}
                        <text
                          x={cx}
                          y={barY + 16}
                          fontSize="11"
                          fontWeight="700"
                          fill="#ffffff"
                          textAnchor="middle"
                        >
                          {b.gap}%
                        </text>
                        {/* Bottom Current Value inside bar */}
                        <text
                          x={cx}
                          y={208}
                          fontSize="10"
                          fontWeight="600"
                          fill="rgba(255,255,255,0.85)"
                          textAnchor="middle"
                        >
                          {b.current}%
                        </text>
                        {/* Category Name below */}
                        <text
                          x={cx}
                          y="238"
                          fontSize="10.5"
                          fontWeight="600"
                          fill="#475569"
                          textAnchor="middle"
                        >
                          {b.name.length > 14 ? (
                            <>
                              <tspan x={cx} dy="0">{b.name.split(' ')[0]}</tspan>
                              <tspan x={cx} dy="11">{b.name.slice(b.name.indexOf(' ') + 1)}</tspan>
                            </>
                          ) : (
                            b.name
                          )}
                        </text>
                      </g>
                    )
                  })}

                  {/* Line 1: Required Proficiency (Gray Dashed Line) */}
                  <polyline
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="1.8"
                    strokeDasharray="4 4"
                    points={OVERVIEW_BARS.map((b, i) => {
                      const cx = 85 + i * 95
                      const py = 216 - (b.required / 100) * 191
                      return `${cx},${py}`
                    }).join(' ')}
                  />
                  {OVERVIEW_BARS.map((b, i) => {
                    const cx = 85 + i * 95
                    const py = 216 - (b.required / 100) * 191
                    return (
                      <g key={'req-' + i}>
                        <circle cx={cx} cy={py} r="4" fill="#ffffff" stroke="#94a3b8" strokeWidth="2" />
                        <text x={cx} y={py - 8} fontSize="9.5" fontWeight="600" fill="#64748b" textAnchor="middle">
                          {b.required}%
                        </text>
                      </g>
                    )
                  })}

                  {/* Line 2: Current Proficiency (Purple Solid Line) */}
                  <polyline
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.4"
                    points={OVERVIEW_BARS.map((b, i) => {
                      const cx = 85 + i * 95
                      const py = 216 - (b.current / 100) * 191
                      return `${cx},${py}`
                    }).join(' ')}
                  />
                  {OVERVIEW_BARS.map((b, i) => {
                    const cx = 85 + i * 95
                    const py = 216 - (b.current / 100) * 191
                    return (
                      <circle
                        key={'curr-' + i}
                        cx={cx}
                        cy={py}
                        r="4"
                        fill="#4f46e5"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )
                  })}
                </svg>
              </div>

              <button
                type="button"
                className={styles.cardFooterBtn}
                onClick={() => setActiveTab('skills')}
              >
                View Skill-wise Details &rarr;
              </button>
            </div>

            {/* Right Stack: Donut Chart + Top 5 Skills */}
            <div className={styles.rightStack}>
              {/* Card 1: Gap by Proficiency Level */}
              <div className={styles.card}>
                <div className={styles.cardHeader} style={{ marginBottom: 8 }}>
                  <h3 className={styles.cardTitle}>Gap by Proficiency Level</h3>
                </div>

                <div className={styles.donutWrapper}>
                  <div className={styles.donutSvgBox}>
                    <svg viewBox="0 0 140 140" className={styles.donutSvg}>
                      {/* Circumference = 2 * PI * 48 = ~301.6 */}
                      {/* Red: 25% (75.4) */}
                      <circle
                        cx="70"
                        cy="70"
                        r="48"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="18"
                        strokeDasharray="75.4 226.2"
                        strokeDashoffset="0"
                      />
                      {/* Orange: 42% (126.7) */}
                      <circle
                        cx="70"
                        cy="70"
                        r="48"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="18"
                        strokeDasharray="126.7 174.9"
                        strokeDashoffset="-75.4"
                      />
                      {/* Green: 17% (51.3) */}
                      <circle
                        cx="70"
                        cy="70"
                        r="48"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="18"
                        strokeDasharray="51.3 250.3"
                        strokeDashoffset="-202.1"
                      />
                      {/* Blue: 16% (48.2) */}
                      <circle
                        cx="70"
                        cy="70"
                        r="48"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="18"
                        strokeDasharray="48.2 253.4"
                        strokeDashoffset="-253.4"
                      />
                    </svg>

                    <div className={styles.donutCenterLabel}>
                      <span className={styles.donutTotalNum}>48</span>
                      <span className={styles.donutTotalText}>Total Skills</span>
                    </div>
                  </div>

                  <div className={styles.donutLegendList}>
                    <div className={styles.donutLegendRow}>
                      <div className={styles.donutLegendLeft}>
                        <span className={styles.donutSquare} style={{ background: '#ef4444' }} />
                        <span>High Gap (&gt;30%)</span>
                      </div>
                      <span className={styles.donutLegendCount}>12 (25%)</span>
                    </div>

                    <div className={styles.donutLegendRow}>
                      <div className={styles.donutLegendLeft}>
                        <span className={styles.donutSquare} style={{ background: '#f59e0b' }} />
                        <span>Medium Gap (10-30%)</span>
                      </div>
                      <span className={styles.donutLegendCount}>20 (42%)</span>
                    </div>

                    <div className={styles.donutLegendRow}>
                      <div className={styles.donutLegendLeft}>
                        <span className={styles.donutSquare} style={{ background: '#10b981' }} />
                        <span>Low Gap (&lt;10%)</span>
                      </div>
                      <span className={styles.donutLegendCount}>8 (17%)</span>
                    </div>

                    <div className={styles.donutLegendRow}>
                      <div className={styles.donutLegendLeft}>
                        <span className={styles.donutSquare} style={{ background: '#3b82f6' }} />
                        <span>No Gap (On Track)</span>
                      </div>
                      <span className={styles.donutLegendCount}>8 (16%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Top 5 Skills with Highest Gap */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>Top 5 Skills with Highest Gap</h3>
                  <button
                    type="button"
                    className={styles.viewAllLink}
                    onClick={() => setActiveTab('skills')}
                  >
                    View All
                  </button>
                </div>

                <div className={styles.topSkillsList}>
                  {TOP_5_SKILLS.map((skill) => (
                    <div key={skill.name} className={styles.skillProgressItem}>
                      <div className={styles.skillProgressTop}>
                        <span className={styles.skillProgressName}>{skill.name}</span>
                        <span className={styles.skillProgressGap}>Gap {skill.gap}%</span>
                      </div>
                      <div className={styles.skillProgressBar}>
                        <div
                          className={styles.skillProgressFill}
                          style={{ width: `${(skill.gap / 50) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Bottom Row: 3-column Grid ── */}
          <section className={styles.bottomGrid}>
            {/* Card 1: Gap Trend Over Time */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Gap Trend Over Time</h3>
                <div className={styles.legendItem}>
                  <span className={styles.legendDotCurrent} />
                  <span>Overall Gap Score (%)</span>
                </div>
              </div>

              <div className={styles.trendSvgBox}>
                <svg viewBox="0 0 380 150" style={{ width: '100%', height: '100%' }}>
                  {/* Grid Lines */}
                  {[
                    { label: '100', y: 15 },
                    { label: '75',  y: 45 },
                    { label: '50',  y: 75 },
                    { label: '25',  y: 105 },
                    { label: '0',   y: 135 },
                  ].map((g) => (
                    <g key={g.label}>
                      <text x="24" y={g.y + 4} fontSize="10" fill="#94a3b8" textAnchor="end">
                        {g.label}
                      </text>
                      <line
                        x1="32"
                        y1={g.y}
                        x2="370"
                        y2={g.y}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                    </g>
                  ))}

                  {/* Area fill */}
                  <polygon
                    fill="rgba(99, 102, 241, 0.08)"
                    points={`45,135 ${TREND_POINTS.map((p) => `${p.x},${p.y}`).join(' ')} 325,135`}
                  />

                  {/* Connected line */}
                  <polyline
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.4"
                    points={TREND_POINTS.map((p) => `${p.x},${p.y}`).join(' ')}
                  />

                  {/* Points with text score */}
                  {TREND_POINTS.map((p) => (
                    <g key={p.month}>
                      <circle cx={p.x} cy={p.y} r="4" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                      <text
                        x={p.x}
                        y={p.y - 8}
                        fontSize="9.5"
                        fontWeight="700"
                        fill="#4f46e5"
                        textAnchor="middle"
                      >
                        {p.score}%
                      </text>
                      <text
                        x={p.x}
                        y="148"
                        fontSize="9"
                        fontWeight="500"
                        fill="#64748b"
                        textAnchor="middle"
                      >
                        {p.month}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              <div className={styles.trendBanner}>
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>
                  Great! Your overall skill gap has improved by 8% compared to last assessment.
                </span>
              </div>
            </div>

            {/* Card 2: Gap by Competency Area */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Gap by Competency Area</h3>
                <button
                  type="button"
                  className={styles.viewAllLink}
                  onClick={() => setActiveTab('competencies')}
                >
                  View All
                </button>
              </div>

              <table className={styles.competencyTable}>
                <thead>
                  <tr>
                    <th>Competency Area</th>
                    <th>Current (%)</th>
                    <th>Required (%)</th>
                    <th>Gap (%)</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPETENCY_AREAS.map((row) => {
                    let pillClass = styles.pillMedium
                    if (row.priority === 'High') pillClass = styles.pillHigh
                    if (row.priority === 'Low')  pillClass = styles.pillLow
                    return (
                      <tr key={row.area}>
                        <td className={styles.areaNameCell}>{row.area}</td>
                        <td>{row.current}%</td>
                        <td>{row.required}%</td>
                        <td>{row.gap}%</td>
                        <td>
                          <span className={`${styles.priorityPill} ${pillClass}`}>
                            {row.priority}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Card 3: Recommendations */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  <Sparkles size={16} color="#4f46e5" />
                  Recommendations
                </h3>
              </div>

              <div className={styles.recommendationsList}>
                <div className={styles.recommendationItem}>
                  <div className={`${styles.recIconWrap} ${styles.recIconRed}`}>
                    <AlertCircle size={15} />
                  </div>
                  <span>
                    Focus on high gap areas (Statistical Methods, ML) to improve your overall competency score.
                  </span>
                </div>

                <div className={styles.recommendationItem}>
                  <div className={`${styles.recIconWrap} ${styles.recIconOrange}`}>
                    <BookOpen size={15} />
                  </div>
                  <span>
                    Start with recommended courses to close skill gaps faster.
                  </span>
                </div>

                <div className={styles.recommendationItem}>
                  <div className={`${styles.recIconWrap} ${styles.recIconGreen}`}>
                    <BarChart2 size={15} />
                  </div>
                  <span>
                    Regular assessments will help you track improvement and progress.
                  </span>
                </div>
              </div>

              <button
                type="button"
                className={styles.viewPathBtn}
                onClick={() => navigate('/my-learning')}
              >
                View Learning Path &rarr;
              </button>
            </div>
          </section>
        </>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          TAB 2: BY SKILLS (Detailed Granular Skill Registry)
          ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'skills' && (
        <div className={styles.tabContentCard}>
          <div className={styles.filterBar}>
            <input
              type="text"
              className={styles.filterSearchInput}
              placeholder="Search skill title or keyword..."
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
            />

            <select
              className={styles.filterSelect}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Competency Areas</option>
              <option value="Statistical Methods">Statistical Methods</option>
              <option value="Data Analysis">Data Analysis</option>
              <option value="Data Collection">Data Collection</option>
              <option value="Data Visualization">Data Visualization</option>
              <option value="IT & Tools">IT & Tools</option>
              <option value="Data Quality Assurance">Data Quality Assurance</option>
              <option value="Report Writing">Report Writing</option>
            </select>

            <select
              className={styles.filterSelect}
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
              <option value="None">On Track (0% Gap)</option>
            </select>
          </div>

          <table className={styles.skillsTable}>
            <thead>
              <tr>
                <th>Skill ID</th>
                <th>Skill Title</th>
                <th>Competency Area</th>
                <th>Current Level</th>
                <th>Required Level</th>
                <th>Calculated Gap</th>
                <th>Priority</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSkills.map((s) => {
                let pillClass = styles.pillMedium
                if (s.priority === 'High') pillClass = styles.pillHigh
                if (s.priority === 'Low')  pillClass = styles.pillLow
                if (s.priority === 'None') pillClass = styles.pillLow
                return (
                  <tr key={s.id}>
                    <td style={{ color: '#64748b', fontWeight: 600 }}>{s.id}</td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{s.name}</td>
                    <td>{s.category}</td>
                    <td>Level {s.current} / 5</td>
                    <td>Level {s.required} / 5</td>
                    <td style={{ fontWeight: 700, color: s.gap === '0%' ? '#16a34a' : '#ef4444' }}>
                      {s.gap}
                    </td>
                    <td>
                      <span className={`${styles.priorityPill} ${pillClass}`}>
                        {s.priority}
                      </span>
                    </td>
                    <td>
                      <Link
                        to="/recommendations"
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: '#4f46e5',
                          textDecoration: 'none',
                        }}
                      >
                        Enrol &rarr;
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          TAB 3: BY COMPETENCIES (Competency Domain Deep-Dive)
          ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'competencies' && (
        <div className={styles.tabContentCard}>
          <h2 className={styles.cardTitle} style={{ marginBottom: 16 }}>
            Domain Competency Matrix (7 Official Areas)
          </h2>
          <table className={styles.skillsTable}>
            <thead>
              <tr>
                <th>Competency Area</th>
                <th>Core Focus</th>
                <th>Current Level (%)</th>
                <th>Required Level (%)</th>
                <th>Net Gap (%)</th>
                <th>Priority Rank</th>
              </tr>
            </thead>
            <tbody>
              {COMPETENCY_AREAS.map((c, i) => (
                <tr key={c.area}>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>{c.area}</td>
                  <td style={{ color: '#64748b' }}>
                    {c.area === 'Data Collection' && 'Household surveys, enterprise canvassing, CAPI validation'}
                    {c.area === 'Data Analysis' && 'Hypothesis testing, variance estimation, econometric models'}
                    {c.area === 'Statistical Methods' && 'Sampling theory, probability distributions, index numbers'}
                    {c.area === 'Data Visualization' && 'Power BI dashboards, geospatial mapping, thematic reporting'}
                    {c.area === 'Report Writing' && 'Quarterly bulletin drafting, metadata standards, executive briefs'}
                    {c.area === 'Data Quality Assurance' && 'Outlier detection, audit protocols, non-sampling error reduction'}
                    {c.area === 'IT & Tools' && 'R, Python, SQL, CAPI tablets, secure data transmission'}
                  </td>
                  <td style={{ fontWeight: 600 }}>{c.current}%</td>
                  <td style={{ fontWeight: 600 }}>{c.required}%</td>
                  <td style={{ fontWeight: 700, color: '#ef4444' }}>{c.gap}%</td>
                  <td>#{i + 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          TAB 4: BY ROLE (Statistical Officer Benchmarking)
          ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'role' && (
        <div className={styles.tabContentCard}>
          <h2 className={styles.cardTitle} style={{ marginBottom: 8 }}>
            Cadre Role Benchmark: Statistical Officer vs Target Next Role
          </h2>
          <p className={styles.subtitle} style={{ marginBottom: 20 }}>
            Comparison of your current competencies against requirements for Senior Statistical Officer (SSO) and Deputy Director.
          </p>

          <table className={styles.skillsTable}>
            <thead>
              <tr>
                <th>Cadre Role</th>
                <th>Grade Level</th>
                <th>Required Competency Index</th>
                <th>Your Readiness Index</th>
                <th>Readiness Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700, color: '#0f172a' }}>Junior Statistical Officer (JSO)</td>
                <td>Level 7</td>
                <td>65%</td>
                <td style={{ fontWeight: 700, color: '#16a34a' }}>92%</td>
                <td><span className={`${styles.priorityPill} ${styles.pillLow}`}>Surpassed</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: '#0f172a' }}>Statistical Officer (Current)</td>
                <td>Level 10</td>
                <td>80%</td>
                <td style={{ fontWeight: 700, color: '#4f46e5' }}>62%</td>
                <td><span className={`${styles.priorityPill} ${styles.pillMedium}`}>In Progress</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: '#0f172a' }}>Senior Statistical Officer (SSO)</td>
                <td>Level 11</td>
                <td>88%</td>
                <td style={{ fontWeight: 700, color: '#ef4444' }}>48%</td>
                <td><span className={`${styles.priorityPill} ${styles.pillHigh}`}>Preparation Needed</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: '#0f172a' }}>Deputy Director (Statistics)</td>
                <td>Level 12</td>
                <td>95%</td>
                <td style={{ fontWeight: 700, color: '#ef4444' }}>36%</td>
                <td><span className={`${styles.priorityPill} ${styles.pillHigh}`}>Long Term Goal</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          TAB 5: BY DEPARTMENT (NSO / MoSPI Benchmarks)
          ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'department' && (
        <div className={styles.tabContentCard}>
          <h2 className={styles.cardTitle} style={{ marginBottom: 8 }}>
            Departmental Competency Benchmark (National Statistics Office)
          </h2>
          <p className={styles.subtitle} style={{ marginBottom: 20 }}>
            Your division skill performance compared against ministry divisional averages.
          </p>

          <table className={styles.skillsTable}>
            <thead>
              <tr>
                <th>Division / Wing</th>
                <th>Officers Assessed</th>
                <th>Average Competency Score</th>
                <th>Your Score</th>
                <th>Percentile Standing</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700, color: '#0f172a' }}>National Accounts Division (NAD)</td>
                <td>142</td>
                <td>68%</td>
                <td style={{ fontWeight: 700, color: '#4f46e5' }}>62%</td>
                <td>68th Percentile</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: '#0f172a' }}>Survey Design &amp; Research Division (SDRD)</td>
                <td>210</td>
                <td>64%</td>
                <td style={{ fontWeight: 700, color: '#4f46e5' }}>62%</td>
                <td>74th Percentile</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: '#0f172a' }}>Field Operations Division (FOD)</td>
                <td>480</td>
                <td>59%</td>
                <td style={{ fontWeight: 700, color: '#16a34a' }}>62%</td>
                <td>82nd Percentile</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: '#0f172a' }}>Data Quality Assurance Division (DQAD)</td>
                <td>95</td>
                <td>71%</td>
                <td style={{ fontWeight: 700, color: '#ef4444' }}>62%</td>
                <td>58th Percentile</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          TAB 6: BY PROFICIENCY LEVEL
          ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'proficiency' && (
        <div className={styles.tabContentCard}>
          <h2 className={styles.cardTitle} style={{ marginBottom: 16 }}>
            Skills Distribution by Gap Severity
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div style={{ padding: 16, border: '1px solid #fee2e2', borderRadius: 12, background: '#fef2f2' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#dc2626' }}>High Gap (&gt;30%)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#991b1b', margin: '6px 0' }}>12 Skills</div>
              <div style={{ fontSize: '0.75rem', color: '#b91c1c' }}>Urgent training required via NSSTA / iGOT modules.</div>
            </div>
            <div style={{ padding: 16, border: '1px solid #fef3c7', borderRadius: 12, background: '#fffbeb' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#d97706' }}>Medium Gap (10-30%)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#92400e', margin: '6px 0' }}>20 Skills</div>
              <div style={{ fontSize: '0.75rem', color: '#b45309' }}>Self-paced micro-courses recommended.</div>
            </div>
            <div style={{ padding: 16, border: '1px solid #dcfce7', borderRadius: 12, background: '#f0fdf4' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#16a34a' }}>Low Gap (&lt;10%)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#166534', margin: '6px 0' }}>8 Skills</div>
              <div style={{ fontSize: '0.75rem', color: '#15803d' }}>Minor refinement needed through quizzes.</div>
            </div>
            <div style={{ padding: 16, border: '1px solid #dbeafe', borderRadius: 12, background: '#eff6ff' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#2563eb' }}>On Track (0% Gap)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e40af', margin: '6px 0' }}>8 Skills</div>
              <div style={{ fontSize: '0.75rem', color: '#1d4ed8' }}>Fully meeting MoSPI Statistical Officer requirement.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
