import React, { useState, useMemo } from 'react'
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
  Check,
} from 'lucide-react'
import { getSkillGaps } from '../../api/learningPath.api'
import { useAuthStore } from '../../store/authStore'
import styles from './SkillGapAnalysisPage.module.css'

export default function SkillGapAnalysisPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'skills' | 'competencies' | 'role' | 'department' | 'proficiency'
  const [skillSearch, setSkillSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedPriority, setSelectedPriority] = useState('all')
  const [showFiltersModal, setShowFiltersModal] = useState(false)
  const [exportNotice, setExportNotice] = useState(false)

  // Real backend query strictly scoped to logged-in user
  const { data: gapData, isLoading } = useQuery({
    queryKey: ['skillGaps'],
    queryFn: getSkillGaps,
    retry: 1,
  })

  const rawGaps = gapData?.skill_gaps || []

  // Metrics computation from real records
  const totalSkills = rawGaps.length
  const sumCurrent = rawGaps.reduce((acc, g) => acc + (g.current_level || 0), 0)
  const sumRequired = rawGaps.reduce((acc, g) => acc + (g.required_level || 0), 0)
  const readinessPct = sumRequired > 0 ? Math.round((sumCurrent / sumRequired) * 100) : 0
  const avgGap = totalSkills > 0 ? (rawGaps.reduce((acc, g) => acc + (g.gap || 0), 0) / totalSkills).toFixed(1) : '0.0'

  const highPriorityGaps = rawGaps.filter((g) => g.priority === 'high' || (g.gap || 0) >= 2)
  const medPriorityGaps = rawGaps.filter((g) => g.priority === 'medium' || (g.gap === 1 && g.priority !== 'high'))
  const lowPriorityGaps = rawGaps.filter((g) => g.priority === 'low' && (g.gap || 0) > 0)
  const onTrackGaps = rawGaps.filter((g) => (g.gap || 0) <= 0 || (g.current_level || 0) >= (g.required_level || 0))
  const aheadGaps = rawGaps.filter((g) => (g.current_level || 0) > (g.required_level || 0))

  // Top 5 Skills with Highest Gap
  const top5Skills = useMemo(() => {
    return [...rawGaps]
      .filter((g) => (g.gap || 0) > 0)
      .sort((a, b) => (b.gap || 0) - (a.gap || 0))
      .slice(0, 5)
      .map((g) => {
        const name = g.competency_id?.name || 'Competency'
        const gapPct = g.required_level > 0 ? Math.round((g.gap / g.required_level) * 100) : Math.round((g.gap / 5) * 100)
        return {
          name,
          current: g.current_level || 0,
          required: g.required_level || 0,
          gap: g.gap || 0,
          gapPct,
        }
      })
  }, [rawGaps])

  // Group by Competency Area / Category
  const competencyAreas = useMemo(() => {
    const map = {}
    rawGaps.forEach((g) => {
      const area = g.competency_id?.category || g.competency_id?.name || 'Core Competency'
      if (!map[area]) {
        map[area] = { area, currentSum: 0, requiredSum: 0, gapSum: 0, count: 0, maxPriority: 'low' }
      }
      map[area].currentSum += g.current_level || 0
      map[area].requiredSum += g.required_level || 0
      map[area].gapSum += g.gap || 0
      map[area].count += 1
      if (g.priority === 'high') map[area].maxPriority = 'high'
      else if (g.priority === 'medium' && map[area].maxPriority !== 'high') map[area].maxPriority = 'medium'
    })

    return Object.values(map).map((item) => {
      const currentPct = Math.min(100, Math.round(((item.currentSum / item.count) / 5) * 100))
      const requiredPct = Math.min(100, Math.round(((item.requiredSum / item.count) / 5) * 100))
      const gapPct = Math.max(0, requiredPct - currentPct)
      return {
        area: item.area,
        current: currentPct,
        required: requiredPct,
        gap: gapPct,
        priority: item.maxPriority === 'high' ? 'High' : item.maxPriority === 'medium' ? 'Medium' : 'Low',
        count: item.count,
      }
    })
  }, [rawGaps])

  // Chart data for Overview Combo Chart (max 7 areas)
  const overviewBars = useMemo(() => {
    if (competencyAreas.length > 1) {
      return competencyAreas.slice(0, 7)
    }
    // If only 1 category exists, map per-competency records
    return rawGaps.slice(0, 7).map((g) => ({
      area: g.competency_id?.name || 'Skill',
      current: Math.min(100, Math.round(((g.current_level || 0) / 5) * 100)),
      required: Math.min(100, Math.round(((g.required_level || 0) / 5) * 100)),
      gap: Math.max(0, Math.round(((g.gap || 0) / 5) * 100)),
      priority: g.priority === 'high' ? 'High' : g.priority === 'medium' ? 'Medium' : 'Low',
    }))
  }, [competencyAreas, rawGaps])

  // Granular active skills list for By Skills tab
  const activeSkillsList = useMemo(() => {
    return rawGaps.map((g, idx) => {
      const name = g.competency_id?.name || `Skill ${idx + 1}`
      const category = g.competency_id?.category || 'Core Competency'
      const cur = g.current_level || 0
      const req = g.required_level || 0
      const gap = g.gap || 0
      const gapPct = req > 0 ? Math.round((gap / req) * 100) : 0
      const priority = g.priority === 'high' ? 'High' : g.priority === 'medium' ? 'Medium' : gap > 0 ? 'Low' : 'None'
      return {
        id: `SK-${String(idx + 1).padStart(2, '0')}`,
        name,
        category,
        current: cur,
        required: req,
        gap: gap > 0 ? `${gapPct}% (${gap} lvl)` : '0%',
        priority,
      }
    })
  }, [rawGaps])

  // Available categories for filter dropdown
  const uniqueCategories = useMemo(() => {
    const cats = new Set(activeSkillsList.map((s) => s.category))
    return Array.from(cats)
  }, [activeSkillsList])

  // Filter skills for 'By Skills' tab
  const filteredSkills = activeSkillsList.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(skillSearch.toLowerCase())
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory
    const matchesPri = selectedPriority === 'all' || s.priority === selectedPriority
    return matchesSearch && matchesCat && matchesPri
  })

  // Export report function
  const handleExport = () => {
    if (rawGaps.length === 0) return
    const csvHeader = 'Skill ID,Skill Title,Category,Current Level,Required Level,Gap,Priority\n'
    const csvRows = rawGaps.map((g, idx) => {
      const name = `"${(g.competency_id?.name || '').replace(/"/g, '""')}"`
      const cat = `"${(g.competency_id?.category || 'Core').replace(/"/g, '""')}"`
      return `SK-${idx + 1},${name},${cat},${g.current_level || 0},${g.required_level || 0},${g.gap || 0},${g.priority || 'normal'}`
    }).join('\n')
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `KaushalAI_Skill_Gap_Analytics_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setExportNotice(true)
    setTimeout(() => setExportNotice(false), 2500)
  }

  // Donut SVG calculations
  const circumference = 2 * Math.PI * 48 // ~301.59
  const highPct = totalSkills > 0 ? highPriorityGaps.length / totalSkills : 0
  const medPct = totalSkills > 0 ? medPriorityGaps.length / totalSkills : 0
  const lowPct = totalSkills > 0 ? lowPriorityGaps.length / totalSkills : 0
  const onTrackPct = totalSkills > 0 ? onTrackGaps.length / totalSkills : 0

  const highStroke = highPct * circumference
  const medStroke = medPct * circumference
  const lowStroke = lowPct * circumference
  const onTrackStroke = onTrackPct * circumference

  const highOffset = 0
  const medOffset = -highStroke
  const lowOffset = -(highStroke + medStroke)
  const onTrackOffset = -(highStroke + medStroke + lowStroke)

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
              title={`Role: ${user?.role_id?.title || 'Officer'} | Department: ${user?.department || 'Government Organization'}`}
            >
              <Info size={17} />
            </span>
          </div>
          <p className={styles.subtitle}>
            Identify the gap between your current proficiency and role requirements. Focus on high-impact areas to accelerate your growth.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.outlineActionBtn}
            onClick={handleExport}
            disabled={totalSkills === 0}
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
            <span>Diagnostic Baseline</span>
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
            marginBottom: 16,
          }}
        >
          <Check size={16} />
          Skill Gap Analytics Report exported successfully.
        </div>
      )}

      {/* ── Empty state banner if no assessment taken ── */}
      {!isLoading && totalSkills === 0 && (
        <div
          style={{
            padding: '24px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          <AlertCircle size={36} color="#4f46e5" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
            No Assessment Results Found
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: 480, margin: '0 auto 16px' }}>
            Complete your diagnostic assessment to calculate real skill gaps, generate your competency matrix, and unlock AI course recommendations.
          </p>
          <Link
            to="/assessment"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              background: '#4f46e5',
              color: '#ffffff',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: '0.875rem',
              textDecoration: 'none',
            }}
          >
            Take Diagnostic Assessment &rarr;
          </Link>
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
          By Skills ({totalSkills})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'competencies' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('competencies')}
        >
          By Competencies ({competencyAreas.length})
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
          TAB 1: OVERVIEW (Real Data Driven)
          ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          {/* ── 5 Metric Cards in a Row ── */}
          <section className={styles.metricsGrid}>
            {/* Card 1: Overall Skill Readiness */}
            <div className={styles.metricCard}>
              <div className={`${styles.metricIconWrap} ${styles.iconPurple}`}>
                <ClipboardCheck size={20} />
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricLabel}>Overall Readiness Score</span>
                <div className={styles.metricValueRow}>
                  <span className={styles.metricValue}>{readinessPct}%</span>
                  <span className={styles.metricStatus}>
                    {readinessPct >= 80 ? 'High' : readinessPct >= 50 ? 'Moderate' : 'Low'}
                  </span>
                </div>
                <div className={styles.deltaBadge}>
                  <span>Avg gap: {avgGap} levels</span>
                </div>
              </div>
            </div>

            {/* Card 2: Skills Assessed */}
            <div className={styles.metricCard}>
              <div className={`${styles.metricIconWrap} ${styles.iconBlue}`}>
                <ListOrdered size={20} />
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricLabel}>Skills Assessed</span>
                <div className={styles.metricValueRow}>
                  <span className={styles.metricValue}>{totalSkills}</span>
                </div>
                <span className={styles.metricSubtext}>
                  Across {competencyAreas.length} Competency {competencyAreas.length === 1 ? 'Area' : 'Areas'}
                </span>
              </div>
            </div>

            {/* Card 3: High Priority Gaps */}
            <div className={styles.metricCard}>
              <div className={`${styles.metricIconWrap} ${styles.iconRed}`}>
                <AlertTriangle size={20} />
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricLabel}>High Priority Gaps</span>
                <div className={styles.metricValueRow}>
                  <span className={styles.metricValue}>{highPriorityGaps.length}</span>
                </div>
                <span className={`${styles.metricSubtext} ${styles.textRed}`}>
                  Require Immediate Attention
                </span>
              </div>
            </div>

            {/* Card 4: Skills On Track */}
            <div className={styles.metricCard}>
              <div className={`${styles.metricIconWrap} ${styles.iconGreen}`}>
                <CheckCircle2 size={20} />
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricLabel}>Skills On Track</span>
                <div className={styles.metricValueRow}>
                  <span className={styles.metricValue}>{onTrackGaps.length}</span>
                </div>
                <span className={styles.metricSubtext}>Meeting Required Level</span>
              </div>
            </div>

            {/* Card 5: Skills Ahead */}
            <div className={styles.metricCard}>
              <div className={`${styles.metricIconWrap} ${styles.iconSky}`}>
                <TrendingUp size={20} />
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricLabel}>Skills Ahead</span>
                <div className={styles.metricValueRow}>
                  <span className={styles.metricValue}>{aheadGaps.length}</span>
                </div>
                <span className={styles.metricSubtext}>Exceeding Target Level</span>
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
                    <span>Current (%)</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDotRequired} />
                    <span>Required (%)</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendSquareGap} />
                    <span>Gap (%)</span>
                  </div>
                </div>
              </div>

              {/* Combo Bar + Line Chart SVG */}
              <div className={styles.svgChartContainer}>
                {overviewBars.length === 0 ? (
                  <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                    No competency data available yet.
                  </div>
                ) : (
                  <svg viewBox="0 0 740 260" className={styles.chartSvg}>
                    {/* Grid Lines */}
                    {[
                      { label: '100', y: 25 },
                      { label: '75', y: 72 },
                      { label: '50', y: 120 },
                      { label: '25', y: 168 },
                      { label: '0', y: 216 },
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
                    {overviewBars.map((b, i) => {
                      const spacing = Math.floor(660 / Math.max(1, overviewBars.length))
                      const cx = 65 + i * spacing + spacing / 2
                      const barH = Math.max(4, (b.gap / 100) * 191)
                      const barY = 216 - barH
                      return (
                        <g key={b.area || i}>
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
                            y={Math.max(35, barY + 14)}
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
                            y="236"
                            fontSize="10"
                            fontWeight="600"
                            fill="#475569"
                            textAnchor="middle"
                          >
                            {(b.area || '').length > 14 ? `${(b.area || '').slice(0, 13)}…` : b.area}
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
                      points={overviewBars.map((b, i) => {
                        const spacing = Math.floor(660 / Math.max(1, overviewBars.length))
                        const cx = 65 + i * spacing + spacing / 2
                        const py = 216 - (b.required / 100) * 191
                        return `${cx},${py}`
                      }).join(' ')}
                    />
                    {overviewBars.map((b, i) => {
                      const spacing = Math.floor(660 / Math.max(1, overviewBars.length))
                      const cx = 65 + i * spacing + spacing / 2
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
                      points={overviewBars.map((b, i) => {
                        const spacing = Math.floor(660 / Math.max(1, overviewBars.length))
                        const cx = 65 + i * spacing + spacing / 2
                        const py = 216 - (b.current / 100) * 191
                        return `${cx},${py}`
                      }).join(' ')}
                    />
                    {overviewBars.map((b, i) => {
                      const spacing = Math.floor(660 / Math.max(1, overviewBars.length))
                      const cx = 65 + i * spacing + spacing / 2
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
                )}
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
                  <h3 className={styles.cardTitle}>Gap Distribution</h3>
                </div>

                <div className={styles.donutWrapper}>
                  <div className={styles.donutSvgBox}>
                    <svg viewBox="0 0 140 140" className={styles.donutSvg}>
                      {totalSkills > 0 ? (
                        <>
                          {/* High Gap */}
                          <circle
                            cx="70"
                            cy="70"
                            r="48"
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="18"
                            strokeDasharray={`${highStroke} ${circumference}`}
                            strokeDashoffset={highOffset}
                          />
                          {/* Medium Gap */}
                          <circle
                            cx="70"
                            cy="70"
                            r="48"
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="18"
                            strokeDasharray={`${medStroke} ${circumference}`}
                            strokeDashoffset={medOffset}
                          />
                          {/* Low Gap */}
                          <circle
                            cx="70"
                            cy="70"
                            r="48"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="18"
                            strokeDasharray={`${lowStroke} ${circumference}`}
                            strokeDashoffset={lowOffset}
                          />
                          {/* On Track */}
                          <circle
                            cx="70"
                            cy="70"
                            r="48"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="18"
                            strokeDasharray={`${onTrackStroke} ${circumference}`}
                            strokeDashoffset={onTrackOffset}
                          />
                        </>
                      ) : (
                        <circle
                          cx="70"
                          cy="70"
                          r="48"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="18"
                        />
                      )}
                    </svg>

                    <div className={styles.donutCenterLabel}>
                      <span className={styles.donutTotalNum}>{totalSkills}</span>
                      <span className={styles.donutTotalText}>Total Skills</span>
                    </div>
                  </div>

                  <div className={styles.donutLegendList}>
                    <div className={styles.donutLegendRow}>
                      <div className={styles.donutLegendLeft}>
                        <span className={styles.donutSquare} style={{ background: '#ef4444' }} />
                        <span>High Priority</span>
                      </div>
                      <span className={styles.donutLegendCount}>
                        {highPriorityGaps.length} ({Math.round(highPct * 100)}%)
                      </span>
                    </div>

                    <div className={styles.donutLegendRow}>
                      <div className={styles.donutLegendLeft}>
                        <span className={styles.donutSquare} style={{ background: '#f59e0b' }} />
                        <span>Medium Priority</span>
                      </div>
                      <span className={styles.donutLegendCount}>
                        {medPriorityGaps.length} ({Math.round(medPct * 100)}%)
                      </span>
                    </div>

                    <div className={styles.donutLegendRow}>
                      <div className={styles.donutLegendLeft}>
                        <span className={styles.donutSquare} style={{ background: '#10b981' }} />
                        <span>Low Priority</span>
                      </div>
                      <span className={styles.donutLegendCount}>
                        {lowPriorityGaps.length} ({Math.round(lowPct * 100)}%)
                      </span>
                    </div>

                    <div className={styles.donutLegendRow}>
                      <div className={styles.donutLegendLeft}>
                        <span className={styles.donutSquare} style={{ background: '#3b82f6' }} />
                        <span>On Track / Ahead</span>
                      </div>
                      <span className={styles.donutLegendCount}>
                        {onTrackGaps.length} ({Math.round(onTrackPct * 100)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Top 5 Skills with Highest Gap */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>Top {top5Skills.length} Skills with Highest Gap</h3>
                  <button
                    type="button"
                    className={styles.viewAllLink}
                    onClick={() => setActiveTab('skills')}
                  >
                    View All
                  </button>
                </div>

                <div className={styles.topSkillsList}>
                  {top5Skills.length === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: '0.8125rem' }}>
                      {totalSkills === 0 ? 'No assessment data.' : 'Great job! No active skill gaps identified.'}
                    </div>
                  ) : (
                    top5Skills.map((skill) => (
                      <div key={skill.name} className={styles.skillProgressItem}>
                        <div className={styles.skillProgressTop}>
                          <span className={styles.skillProgressName}>{skill.name}</span>
                          <span className={styles.skillProgressGap}>
                            Lvl {skill.current} → {skill.required} (Gap: {skill.gap})
                          </span>
                        </div>
                        <div className={styles.skillProgressBar}>
                          <div
                            className={styles.skillProgressFill}
                            style={{ width: `${Math.min(100, Math.max(10, skill.gapPct))}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── Bottom Row: 3-column Grid ── */}
          <section className={styles.bottomGrid}>
            {/* Card 1: Diagnostic Assessment Baseline */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Assessment Baseline</h3>
                <div className={styles.legendItem}>
                  <span className={styles.legendDotCurrent} />
                  <span>Readiness ({readinessPct}%)</span>
                </div>
              </div>

              <div className={styles.trendSvgBox}>
                <svg viewBox="0 0 380 150" style={{ width: '100%', height: '100%' }}>
                  {/* Grid Lines */}
                  {[
                    { label: '100%', y: 25 },
                    { label: '75%', y: 55 },
                    { label: '50%', y: 85 },
                    { label: '25%', y: 115 },
                  ].map((g) => (
                    <g key={g.label}>
                      <text x="32" y={g.y + 4} fontSize="10" fill="#94a3b8" textAnchor="end">
                        {g.label}
                      </text>
                      <line
                        x1="40"
                        y1={g.y}
                        x2="370"
                        y2={g.y}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                    </g>
                  ))}

                  {/* Baseline Target line */}
                  <line
                    x1="40"
                    y1={135 - (readinessPct / 100) * 110}
                    x2="370"
                    y2={135 - (readinessPct / 100) * 110}
                    stroke="#818cf8"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />

                  {/* Single Diagnostic Baseline Point */}
                  <g>
                    <circle
                      cx="205"
                      cy={135 - (readinessPct / 100) * 110}
                      r="6"
                      fill="#4f46e5"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x="205"
                      y={Math.max(16, 135 - (readinessPct / 100) * 110 - 10)}
                      fontSize="11"
                      fontWeight="700"
                      fill="#4f46e5"
                      textAnchor="middle"
                    >
                      {readinessPct}%
                    </text>
                    <text
                      x="205"
                      y="142"
                      fontSize="10"
                      fontWeight="600"
                      fill="#64748b"
                      textAnchor="middle"
                    >
                      Current Diagnostic Baseline
                    </text>
                  </g>
                </svg>
              </div>

              <div className={styles.trendBanner}>
                <CheckCircle2 size={16} style={{ flexShrink: 0, color: '#4f46e5' }} />
                <span>
                  Historical trends will appear as you complete future post-course assessments.
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
                    <th>Current</th>
                    <th>Required</th>
                    <th>Gap</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {competencyAreas.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                        No competency area data.
                      </td>
                    </tr>
                  ) : (
                    competencyAreas.map((row) => {
                      let pillClass = styles.pillMedium
                      if (row.priority === 'High') pillClass = styles.pillHigh
                      if (row.priority === 'Low') pillClass = styles.pillLow
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
                    })
                  )}
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
                    {highPriorityGaps.length > 0
                      ? `Focus on your ${highPriorityGaps.length} high priority gap(s) to close role discrepancies rapidly.`
                      : 'Maintain strong performance across your evaluated competencies.'}
                  </span>
                </div>

                <div className={styles.recommendationItem}>
                  <div className={`${styles.recIconWrap} ${styles.recIconOrange}`}>
                    <BookOpen size={15} />
                  </div>
                  <span>
                    Your personalized learning path has prioritized courses mapped directly to these competencies.
                  </span>
                </div>

                <div className={styles.recommendationItem}>
                  <div className={`${styles.recIconWrap} ${styles.recIconGreen}`}>
                    <BarChart2 size={15} />
                  </div>
                  <span>
                    Retaking assessments upon course completion will raise your verified skill levels in real-time.
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
          TAB 2: BY SKILLS (Granular Skill Registry)
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
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
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
              {filteredSkills.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    {totalSkills === 0 ? 'No skills assessed yet.' : 'No skills match the selected filter criteria.'}
                  </td>
                </tr>
              ) : (
                filteredSkills.map((s) => {
                  let pillClass = styles.pillMedium
                  if (s.priority === 'High') pillClass = styles.pillHigh
                  if (s.priority === 'Low') pillClass = styles.pillLow
                  if (s.priority === 'None') pillClass = styles.pillLow
                  return (
                    <tr key={s.id}>
                      <td style={{ color: '#64748b', fontWeight: 600 }}>{s.id}</td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{s.name}</td>
                      <td>{s.category}</td>
                      <td>Level {s.current} / 5</td>
                      <td>Level {s.required} / 5</td>
                      <td style={{ fontWeight: 700, color: s.gap.startsWith('0%') ? '#16a34a' : '#ef4444' }}>
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
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          TAB 3: BY COMPETENCIES (Domain Deep-Dive)
          ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'competencies' && (
        <div className={styles.tabContentCard}>
          <h2 className={styles.cardTitle} style={{ marginBottom: 16 }}>
            Domain Competency Matrix ({competencyAreas.length} Areas)
          </h2>
          <table className={styles.skillsTable}>
            <thead>
              <tr>
                <th>Competency Area</th>
                <th>Skills Count</th>
                <th>Current Level (%)</th>
                <th>Required Level (%)</th>
                <th>Net Gap (%)</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {competencyAreas.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    No competency areas available. Take your diagnostic assessment first.
                  </td>
                </tr>
              ) : (
                competencyAreas.map((c) => (
                  <tr key={c.area}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{c.area}</td>
                    <td style={{ color: '#64748b' }}>{c.count} skills</td>
                    <td style={{ fontWeight: 600 }}>{c.current}%</td>
                    <td style={{ fontWeight: 600 }}>{c.required}%</td>
                    <td style={{ fontWeight: 700, color: c.gap === 0 ? '#16a34a' : '#ef4444' }}>
                      {c.gap}%
                    </td>
                    <td>
                      <span className={`${styles.priorityPill} ${c.priority === 'High' ? styles.pillHigh : c.priority === 'Medium' ? styles.pillMedium : styles.pillLow}`}>
                        {c.priority}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          TAB 4: BY ROLE (Benchmark against designated role)
          ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'role' && (
        <div className={styles.tabContentCard}>
          <h2 className={styles.cardTitle} style={{ marginBottom: 8 }}>
            Role Benchmark: {user?.role_id?.title || 'Designated Role'}
          </h2>
          <p className={styles.subtitle} style={{ marginBottom: 20 }}>
            Comparison of your current competency readiness against the role requirements in your department.
          </p>

          <table className={styles.skillsTable}>
            <thead>
              <tr>
                <th>Cadre Role</th>
                <th>Target Role Level</th>
                <th>Required Competency Index</th>
                <th>Your Readiness Index</th>
                <th>Readiness Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700, color: '#0f172a' }}>
                  {user?.role_id?.title || 'Active Role'} (Current)
                </td>
                <td>Level {user?.level || 1}</td>
                <td>100%</td>
                <td style={{ fontWeight: 700, color: readinessPct >= 80 ? '#16a34a' : '#4f46e5' }}>
                  {readinessPct}%
                </td>
                <td>
                  <span className={`${styles.priorityPill} ${readinessPct >= 80 ? styles.pillLow : styles.pillMedium}`}>
                    {readinessPct >= 100 ? 'Surpassed' : readinessPct >= 75 ? 'On Track' : 'In Progress'}
                  </span>
                </td>
              </tr>
              {user?.level < 5 && (
                <tr>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>Next Promotional Cadre</td>
                  <td>Level {Number(user?.level || 1) + 1}</td>
                  <td>100%</td>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>
                    {Math.max(0, readinessPct - 20)}%
                  </td>
                  <td>
                    <span className={`${styles.priorityPill} ${styles.pillMedium}`}>
                      Preparation Needed
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          TAB 5: BY DEPARTMENT
          ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'department' && (
        <div className={styles.tabContentCard}>
          <h2 className={styles.cardTitle} style={{ marginBottom: 8 }}>
            Departmental Competency Benchmark: {user?.department || 'Active Department'}
          </h2>
          <p className={styles.subtitle} style={{ marginBottom: 20 }}>
            Your skill readiness standing within your functional area: {user?.functional_area_id?.name || 'Assigned Area'}.
          </p>

          <table className={styles.skillsTable}>
            <thead>
              <tr>
                <th>Department / Unit</th>
                <th>Functional Area</th>
                <th>Skills Assessed</th>
                <th>Your Readiness Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700, color: '#0f172a' }}>
                  {user?.department || 'Department'}
                </td>
                <td>{user?.functional_area_id?.name || 'General Operations'}</td>
                <td>{totalSkills}</td>
                <td style={{ fontWeight: 700, color: '#4f46e5' }}>{readinessPct}%</td>
                <td>
                  <span className={`${styles.priorityPill} ${styles.pillLow}`}>Active</span>
                </td>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div style={{ padding: 16, border: '1px solid #fee2e2', borderRadius: 12, background: '#fef2f2' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#dc2626' }}>High Priority Gap (&gt;= 2 levels)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#991b1b', margin: '6px 0' }}>
                {highPriorityGaps.length} Skills
              </div>
              <div style={{ fontSize: '0.75rem', color: '#b91c1c' }}>Urgent training recommended via learning path modules.</div>
            </div>
            <div style={{ padding: 16, border: '1px solid #fef3c7', borderRadius: 12, background: '#fffbeb' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#d97706' }}>Medium Priority Gap (1 level)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#92400e', margin: '6px 0' }}>
                {medPriorityGaps.length} Skills
              </div>
              <div style={{ fontSize: '0.75rem', color: '#b45309' }}>Targeted courses recommended in upcoming weeks.</div>
            </div>
            <div style={{ padding: 16, border: '1px solid #dcfce7', borderRadius: 12, background: '#f0fdf4' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#16a34a' }}>Low Priority Gap</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#166534', margin: '6px 0' }}>
                {lowPriorityGaps.length} Skills
              </div>
              <div style={{ fontSize: '0.75rem', color: '#15803d' }}>Minor refinement or optional micro-learning.</div>
            </div>
            <div style={{ padding: 16, border: '1px solid #dbeafe', borderRadius: 12, background: '#eff6ff' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#2563eb' }}>On Track / Ahead (0 Gap)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e40af', margin: '6px 0' }}>
                {onTrackGaps.length} Skills
              </div>
              <div style={{ fontSize: '0.75rem', color: '#1d4ed8' }}>Fully meeting or exceeding role competency targets.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
