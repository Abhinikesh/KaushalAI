import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  Users,
  BookOpen,
  BarChart2,
  Award,
  Download,
  Calendar,
  ChevronDown,
  Info,
  Briefcase,
  MapPin,
  TrendingUp,
  Target,
  Sparkles,
  Lightbulb,
  Check,
  ArrowRight
} from 'lucide-react'
import styles from './DepartmentAnalyticsPage.module.css'

export default function DepartmentAnalyticsPage() {
  const [dateRange, setDateRange] = useState('01 May 2026 - 19 May 2026')
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all')
  const [selectedDesigFilter, setSelectedDesigFilter] = useState('all')
  const [selectedLocFilter, setSelectedLocFilter] = useState('all')
  const [topCount, setTopCount] = useState('8')
  const [toastMessage, setToastMessage] = useState(null)
  const [activeModal, setActiveModal] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  // Department learning hours data (Top 8)
  const deptHours = [
    { name: 'Statistics Division', short: 'Statistics Div.', hours: 54 },
    { name: 'Data Management', short: 'Data Mgmt.', hours: 48 },
    { name: 'IT & Systems', short: 'IT & Systems', hours: 41 },
    { name: 'Field Operations', short: 'Field Ops.', hours: 38 },
    { name: 'Research & Analysis', short: 'Research & Analysis', hours: 32 },
    { name: 'Administration', short: 'Admin.', hours: 24 },
    { name: 'Planning & Coordination', short: 'Planning & Coord.', hours: 18 },
    { name: 'Training & Capacity Building', short: 'Training & Cap.', hours: 15 },
  ]

  // Completion rates
  const completionData = [
    { name: 'Data Management', rate: 93.4 },
    { name: 'Statistics Division', rate: 91.2 },
    { name: 'IT & Systems', rate: 88.6 },
    { name: 'Research & Analysis', rate: 86.7 },
    { name: 'Field Operations', rate: 84.3 },
    { name: 'Administration', rate: 80.5 },
    { name: 'Planning & Coordination', rate: 78.9 },
    { name: 'Training & Capacity Building', rate: 76.1 },
  ]

  // Performance summary rows
  const summaryRows = [
    { id: 1, name: 'Data Management', learners: 210, hours: '48h 20m', completion: '93.4%', score: '82.6%', certs: 68 },
    { id: 2, name: 'Statistics Division', learners: 276, hours: '54h 10m', completion: '91.2%', score: '79.8%', certs: 74 },
    { id: 3, name: 'IT & Systems', learners: 186, hours: '41h 05m', completion: '88.6%', score: '77.3%', certs: 46 },
    { id: 4, name: 'Field Operations', learners: 198, hours: '38h 40m', completion: '84.3%', score: '74.1%', certs: 52 },
    { id: 5, name: 'Research & Analysis', learners: 164, hours: '32h 25m', completion: '86.7%', score: '80.2%', certs: 43 },
    { id: 6, name: 'Administration', learners: 128, hours: '24h 15m', completion: '80.5%', score: '71.6%', certs: 28 },
    { id: 7, name: 'Planning & Coordination', learners: 64, hours: '18h 30m', completion: '78.9%', score: '69.4%', certs: 12 },
    { id: 8, name: 'Training & Capacity Building', learners: 28, hours: '15h 05m', completion: '76.1%', score: '67.8%', certs: 5 },
  ]

  // Assessment scores coordinates for SVG Line Chart (8 points)
  const assessmentPoints = [
    { name: 'Data Mgmt.', score: 82.6 },
    { name: 'Statistics Div.', score: 79.8 },
    { name: 'IT & Systems', score: 77.3 },
    { name: 'Research & Analysis', score: 80.2 },
    { name: 'Field Ops.', score: 74.1 },
    { name: 'Admin.', score: 71.6 },
    { name: 'Planning & Coord.', score: 69.4 },
    { name: 'Training & Capacity', score: 67.8 },
  ]

  const lineChartW = 340
  const lineChartH = 110
  const padLeft = 32
  const padTop = 15
  const getLineY = (val) => padTop + (1 - val / 100) * (lineChartH - 20)
  const getLineX = (i) => padLeft + (i / (assessmentPoints.length - 1)) * (lineChartW - padLeft - 15)

  const linePointsStr = assessmentPoints
    .map((p, i) => `${getLineX(i)},${getLineY(p.score)}`)
    .join(' ')

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumb ─────────────────────────────────────── */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
        <span className={styles.breadcrumbSep}>&gt;</span>
        <span className={styles.breadcrumbCurrent}>Department Analytics</span>
      </nav>

      {/* ── Page Header & Action Controls ──────────────────── */}
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Department Analytics</h1>
          <p className={styles.pageSubtitle}>
            Data-driven insights on learning performance across departments.
          </p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.dateSelectWrap}>
            <Calendar size={14} className={styles.dateIcon} />
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value)
                showToast(`Report period updated: ${e.target.value}`)
              }}
              className={styles.dateSelect}
            >
              <option value="01 May 2026 - 19 May 2026">01 May 2026 - 19 May 2026</option>
              <option value="01 Apr 2026 - 30 Apr 2026">01 Apr 2026 - 30 Apr 2026</option>
              <option value="Q1 2026 (Jan - Mar)">Q1 2026 (Jan - Mar)</option>
              <option value="FY 2025-26">FY 2025-26</option>
            </select>
            <ChevronDown size={14} className={styles.dateChevron} />
          </div>

          <button
            type="button"
            className={styles.exportBtn}
            onClick={() => setActiveModal('export')}
          >
            <Download size={14} />
            Export Report
          </button>
        </div>
      </div>

      {/* ── Filter Bar (3 Selectors) ───────────────────────── */}
      <div className={styles.filterBar}>
        <div className={styles.filterSelectWrap}>
          <Building2 size={13} className={styles.filterIcon} />
          <select
            value={selectedDeptFilter}
            onChange={(e) => {
              setSelectedDeptFilter(e.target.value)
              showToast(`Filtered by Department: ${e.target.options[e.target.selectedIndex].text}`)
            }}
            className={styles.filterSelect}
          >
            <option value="all">All Departments</option>
            <option value="stats">Statistics Division</option>
            <option value="data">Data Management</option>
            <option value="it">IT &amp; Systems</option>
            <option value="field">Field Operations</option>
            <option value="research">Research &amp; Analysis</option>
            <option value="admin">Administration</option>
            <option value="planning">Planning &amp; Coordination</option>
            <option value="training">Training &amp; Capacity</option>
          </select>
          <ChevronDown size={13} className={styles.filterChevron} />
        </div>

        <div className={styles.filterSelectWrap}>
          <Briefcase size={13} className={styles.filterIcon} />
          <select
            value={selectedDesigFilter}
            onChange={(e) => {
              setSelectedDesigFilter(e.target.value)
              showToast(`Filtered by Designation: ${e.target.options[e.target.selectedIndex].text}`)
            }}
            className={styles.filterSelect}
          >
            <option value="all">All Designations</option>
            <option value="director">Directors &amp; Joint Directors</option>
            <option value="deputy">Deputy Directors</option>
            <option value="senior">Senior Statistical Officers (SSO)</option>
            <option value="junior">Junior Statistical Officers (JSO)</option>
            <option value="analysts">Data Analysts &amp; Programmers</option>
          </select>
          <ChevronDown size={13} className={styles.filterChevron} />
        </div>

        <div className={styles.filterSelectWrap}>
          <MapPin size={13} className={styles.filterIcon} />
          <select
            value={selectedLocFilter}
            onChange={(e) => {
              setSelectedLocFilter(e.target.value)
              showToast(`Filtered by Location: ${e.target.options[e.target.selectedIndex].text}`)
            }}
            className={styles.filterSelect}
          >
            <option value="all">All Locations</option>
            <option value="delhi">New Delhi Headquarters</option>
            <option value="kolkata">Kolkata Regional Office</option>
            <option value="nagpur">Nagpur Training Center</option>
            <option value="noida">NSSTA Greater Noida</option>
          </select>
          <ChevronDown size={13} className={styles.filterChevron} />
        </div>
      </div>

      {/* ── Top 5 KPI Metrics ──────────────────────────────── */}
      <div className={styles.topMetricsGrid}>
        {/* Card 1: Total Departments */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconPurple}`}>
            <Building2 size={20} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Total Departments</span>
            <span className={styles.metricValue}>12</span>
            <span style={{ fontSize: 11.5, color: '#64748B' }}>Active departments</span>
          </div>
        </div>

        {/* Card 2: Total Learners */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconGreen}`}>
            <Users size={20} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Total Learners</span>
            <span className={styles.metricValue}>1,254</span>
            <div className={styles.metricTrend}>
              <span>&uarr; 8.3%</span>
              <span className={styles.metricTrendMuted}>vs last 30 days</span>
            </div>
          </div>
        </div>

        {/* Card 3: Learning Hours */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconOrange}`}>
            <BookOpen size={20} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Learning Hours</span>
            <span className={styles.metricValue}>32h 15m</span>
            <div className={styles.metricTrend}>
              <span>&uarr; 11.2%</span>
              <span className={styles.metricTrendMuted}>vs last 30 days</span>
            </div>
          </div>
        </div>

        {/* Card 4: Avg. Completion Rate */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconBlue}`}>
            <BarChart2 size={20} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Avg. Completion Rate</span>
            <span className={styles.metricValue}>87.6%</span>
            <div className={styles.metricTrend}>
              <span>&uarr; 6.7%</span>
              <span className={styles.metricTrendMuted}>vs last 30 days</span>
            </div>
          </div>
        </div>

        {/* Card 5: Certificates Earned */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconViolet}`}>
            <Award size={20} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Certificates Earned</span>
            <span className={styles.metricValue}>328</span>
            <div className={styles.metricTrend}>
              <span>&uarr; 14.6%</span>
              <span className={styles.metricTrendMuted}>vs last 30 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Middle Row 1 (3 Analytics Cards) ──────────────── */}
      <div className={styles.analyticsRow1}>
        {/* Card 1: Learning Hours by Department */}
        <div className={styles.cardBox}>
          <div>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderRow}>
                <h3 className={styles.cardTitle}>
                  Learning Hours by Department
                  <Info size={14} className={styles.infoIcon} onClick={() => setActiveModal('hours-info')} />
                </h3>
                <select
                  value={topCount}
                  onChange={(e) => setTopCount(e.target.value)}
                  className={styles.miniSelect}
                >
                  <option value="8">Top 8 Departments</option>
                  <option value="5">Top 5 Departments</option>
                  <option value="12">All 12 Departments</option>
                </select>
              </div>
              <p className={styles.cardSub}>Total learning hours logged in the selected period.</p>
            </div>

            {/* Vertical Bar Chart (SVG) */}
            <div className={styles.vBarChartWrap}>
              <svg viewBox="0 0 450 180" className={styles.vBarChartSvg}>
                {/* Horizontal Gridlines (0 to 60 in increments of 10) */}
                {[0, 10, 20, 30, 40, 50, 60].map((val) => {
                  const y = 140 - (val / 60) * 120
                  return (
                    <g key={val}>
                      <line x1="26" y1={y} x2="435" y2={y} className={styles.chartGridLine} />
                      <text x="20" y={y + 3.5} textAnchor="end" className={styles.chartAxisLabel}>{val}</text>
                    </g>
                  )
                })}

                {/* X Axis Label Unit */}
                <text x="10" y="16" fontSize="9" fill="#94A3B8" fontWeight="600">Hours</text>

                {/* 8 Bars */}
                {deptHours.map((d, i) => {
                  const x = 38 + i * 50
                  const barH = (d.hours / 60) * 120
                  const y = 140 - barH
                  return (
                    <g key={d.name}>
                      {/* Bar */}
                      <rect
                        x={x}
                        y={y}
                        width="20"
                        height={barH}
                        rx="3"
                        fill="#2563EB"
                      />
                      {/* Value on top */}
                      <text
                        x={x + 10}
                        y={y - 5}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight="700"
                        fill="#1E40AF"
                      >
                        {d.hours}h
                      </text>
                      {/* X label (two lines if needed) */}
                      <text
                        x={x + 10}
                        y="152"
                        textAnchor="middle"
                        fontSize="7.5"
                        fill="#64748B"
                      >
                        {d.name.split(' ')[0]}
                      </text>
                      <text
                        x={x + 10}
                        y="161"
                        textAnchor="middle"
                        fontSize="7.5"
                        fill="#64748B"
                      >
                        {d.name.split(' ').slice(1).join(' ').substring(0, 12)}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>

          <div className={styles.cardFooterLink}>
            <button
              type="button"
              className={styles.footerLinkBtn}
              onClick={() => setActiveModal('full-hours-report')}
            >
              View Full Report &rarr;
            </button>
          </div>
        </div>

        {/* Card 2: Completion Rate by Department */}
        <div className={styles.cardBox}>
          <div>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                Completion Rate by Department
                <Info size={14} className={styles.infoIcon} onClick={() => setActiveModal('completion-info')} />
              </h3>
              <p className={styles.cardSub}>Average course completion rate.</p>
            </div>

            <div className={styles.hBarList}>
              {completionData.map((dept) => (
                <div key={dept.name} className={styles.hBarItem}>
                  <span className={styles.hBarDeptName}>{dept.name}</span>
                  <span className={styles.hBarTrack}>
                    <span className={styles.hBarFill} style={{ width: `${dept.rate}%` }} />
                  </span>
                  <span className={styles.hBarPct}>{dept.rate}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.cardFooterLink}>
            <button
              type="button"
              className={styles.footerLinkBtn}
              onClick={() => setActiveModal('full-completion-report')}
            >
              View Full Report &rarr;
            </button>
          </div>
        </div>

        {/* Card 3: Learner Engagement by Department */}
        <div className={styles.cardBox}>
          <div>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                Learner Engagement by Department
                <Info size={14} className={styles.infoIcon} onClick={() => setActiveModal('engagement-info')} />
              </h3>
              <p className={styles.cardSub}>Based on active learners and learning activities.</p>
            </div>

            <div className={styles.donutRow}>
              <div className={styles.donutSvgArea}>
                <svg viewBox="0 0 100 100" className={styles.donutSvg}>
                  {/* Total C = 238.7 */}
                  {/* High (80-100): 32.1% -> 76.6 */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#10B981"
                    strokeWidth="14"
                    strokeDasharray="76.6 162.1"
                    strokeDashoffset="0"
                  />
                  {/* Above Average (60-79): 28.4% -> 67.8 */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#2563EB"
                    strokeWidth="14"
                    strokeDasharray="67.8 170.9"
                    strokeDashoffset="-76.6"
                  />
                  {/* Average (40-59): 21.7% -> 51.8 */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#F59E0B"
                    strokeWidth="14"
                    strokeDasharray="51.8 186.9"
                    strokeDashoffset="-144.4"
                  />
                  {/* Below Average (20-39): 11.7% -> 27.9 */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#F97316"
                    strokeWidth="14"
                    strokeDasharray="27.9 210.8"
                    strokeDashoffset="-196.2"
                  />
                  {/* Low (0-19): 6.1% -> 14.6 */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#EF4444"
                    strokeWidth="14"
                    strokeDasharray="14.6 224.1"
                    strokeDashoffset="-224.1"
                  />
                </svg>
                <div className={styles.donutCenterLabel}>
                  <span className={styles.donutCenterCount}>1,254</span>
                  <span className={styles.donutCenterSub}>Total Learners</span>
                </div>
              </div>

              <div className={styles.legendList}>
                <div className={styles.legendRow}>
                  <div className={styles.legendLeft}>
                    <span className={styles.legendSquare} style={{ background: '#10B981' }} />
                    <span>High (80-100)</span>
                  </div>
                  <span className={styles.legendPct}>32.1%</span>
                </div>
                <div className={styles.legendRow}>
                  <div className={styles.legendLeft}>
                    <span className={styles.legendSquare} style={{ background: '#2563EB' }} />
                    <span>Above Average (60-79)</span>
                  </div>
                  <span className={styles.legendPct}>28.4%</span>
                </div>
                <div className={styles.legendRow}>
                  <div className={styles.legendLeft}>
                    <span className={styles.legendSquare} style={{ background: '#F59E0B' }} />
                    <span>Average (40-59)</span>
                  </div>
                  <span className={styles.legendPct}>21.7%</span>
                </div>
                <div className={styles.legendRow}>
                  <div className={styles.legendLeft}>
                    <span className={styles.legendSquare} style={{ background: '#F97316' }} />
                    <span>Below Average (20-39)</span>
                  </div>
                  <span className={styles.legendPct}>11.7%</span>
                </div>
                <div className={styles.legendRow}>
                  <div className={styles.legendLeft}>
                    <span className={styles.legendSquare} style={{ background: '#EF4444' }} />
                    <span>Low (0-19)</span>
                  </div>
                  <span className={styles.legendPct}>6.1%</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.cardFooterLink}>
            <button
              type="button"
              className={styles.footerLinkBtn}
              onClick={() => setActiveModal('full-engagement-report')}
            >
              View Full Report &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* ── Middle Row 2 (3 Analytics Cards) ──────────────── */}
      <div className={styles.analyticsRow2}>
        {/* Card 1: Department Performance Summary */}
        <div className={styles.cardBox}>
          <div>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                Department Performance Summary
                <Info size={14} className={styles.infoIcon} onClick={() => setActiveModal('summary-info')} />
              </h3>
              <p className={styles.cardSub}>Key performance metrics across departments.</p>
            </div>

            <table className={styles.summaryTable}>
              <thead>
                <tr>
                  <th style={{ width: 18 }}>#</th>
                  <th>Department</th>
                  <th>Total Learners</th>
                  <th>Learning Hours</th>
                  <th>Completion Rate</th>
                  <th>Avg. Assessment Score</th>
                  <th>Certificates Earned</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((r) => (
                  <tr key={r.id}>
                    <td className={styles.deptIndex}>{r.id}</td>
                    <td><strong>{r.name}</strong></td>
                    <td>{r.learners}</td>
                    <td>{r.hours}</td>
                    <td><strong>{r.completion}</strong></td>
                    <td><strong>{r.score}</strong></td>
                    <td>{r.certs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.cardFooterLink}>
            <button
              type="button"
              className={styles.footerLinkBtn}
              onClick={() => setActiveModal('detailed-performance')}
            >
              View Detailed Report &rarr;
            </button>
          </div>
        </div>

        {/* Card 2: Assessment Score by Department */}
        <div className={styles.cardBox}>
          <div>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                Assessment Score by Department
                <Info size={14} className={styles.infoIcon} onClick={() => setActiveModal('score-info')} />
              </h3>
              <p className={styles.cardSub}>Average assessment score achieved.</p>
            </div>

            {/* Line Chart (SVG) */}
            <div className={styles.lineChartWrap}>
              <svg viewBox="0 0 350 160" className={styles.lineChartSvg}>
                {/* Y Axis Gridlines (0% to 100%) */}
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = getLineY(val)
                  return (
                    <g key={val}>
                      <line x1={padLeft} y1={y} x2={340} y2={y} className={styles.chartGridLine} />
                      <text x={padLeft - 6} y={y + 3.5} textAnchor="end" className={styles.chartAxisLabel}>
                        {val}%
                      </text>
                    </g>
                  )
                })}

                {/* Purple Line */}
                <polyline
                  fill="none"
                  stroke="#6366F1"
                  strokeWidth="2"
                  points={linePointsStr}
                />

                {/* Nodes & Labels */}
                {assessmentPoints.map((p, i) => {
                  const x = getLineX(i)
                  const y = getLineY(p.score)
                  return (
                    <g key={p.name}>
                      <circle cx={x} cy={y} r="3.5" fill="#6366F1" stroke="#FFFFFF" strokeWidth="1.5" />
                      <text
                        x={x}
                        y={y - 6}
                        textAnchor="middle"
                        fontSize="8.5"
                        fontWeight="700"
                        fill="#4F46E5"
                      >
                        {p.score}%
                      </text>
                      {/* Short Name at Bottom */}
                      <text
                        x={x}
                        y="142"
                        textAnchor="middle"
                        fontSize="7"
                        fill="#64748B"
                      >
                        {p.name.split(' ')[0]}
                      </text>
                      <text
                        x={x}
                        y="151"
                        textAnchor="middle"
                        fontSize="7"
                        fill="#64748B"
                      >
                        {p.name.split(' ').slice(1).join(' ').substring(0, 8)}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>

          <div className={styles.cardFooterLink}>
            <button
              type="button"
              className={styles.footerLinkBtn}
              onClick={() => setActiveModal('full-assessment-report')}
            >
              View Full Report &rarr;
            </button>
          </div>
        </div>

        {/* Card 3: Department Distribution */}
        <div className={styles.cardBox}>
          <div>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                Department Distribution
                <Info size={14} className={styles.infoIcon} onClick={() => setActiveModal('dist-info')} />
              </h3>
              <p className={styles.cardSub}>Distribution of departments by size (learners).</p>
            </div>

            <div className={styles.donutRow}>
              <div className={styles.donutSvgArea}>
                <svg viewBox="0 0 100 100" className={styles.donutSvg}>
                  {/* Total Circumference = 238.7 */}
                  {/* Large (200+): 3 (25%) -> 59.7 */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#2563EB"
                    strokeWidth="14"
                    strokeDasharray="59.7 179.0"
                    strokeDashoffset="0"
                  />
                  {/* Medium (100-199): 5 (42%) -> 100.2 */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#10B981"
                    strokeWidth="14"
                    strokeDasharray="100.2 138.5"
                    strokeDashoffset="-59.7"
                  />
                  {/* Small (50-99): 3 (25%) -> 59.7 */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#F59E0B"
                    strokeWidth="14"
                    strokeDasharray="59.7 179.0"
                    strokeDashoffset="-159.9"
                  />
                  {/* Very Small (<50): 1 (8%) -> 19.1 */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#F97316"
                    strokeWidth="14"
                    strokeDasharray="19.1 219.6"
                    strokeDashoffset="-219.6"
                  />
                </svg>
                <div className={styles.donutCenterLabel}>
                  <span className={styles.donutCenterCount}>12</span>
                  <span className={styles.donutCenterSub}>Departments</span>
                </div>
              </div>

              <div className={styles.legendList}>
                <div className={styles.legendRow}>
                  <div className={styles.legendLeft}>
                    <span className={styles.legendSquare} style={{ background: '#2563EB' }} />
                    <span>Large (200+)</span>
                  </div>
                  <span className={styles.legendPct}>3 (25%)</span>
                </div>
                <div className={styles.legendRow}>
                  <div className={styles.legendLeft}>
                    <span className={styles.legendSquare} style={{ background: '#10B981' }} />
                    <span>Medium (100-199)</span>
                  </div>
                  <span className={styles.legendPct}>5 (42%)</span>
                </div>
                <div className={styles.legendRow}>
                  <div className={styles.legendLeft}>
                    <span className={styles.legendSquare} style={{ background: '#F59E0B' }} />
                    <span>Small (50-99)</span>
                  </div>
                  <span className={styles.legendPct}>3 (25%)</span>
                </div>
                <div className={styles.legendRow}>
                  <div className={styles.legendLeft}>
                    <span className={styles.legendSquare} style={{ background: '#F97316' }} />
                    <span>Very Small (&lt;50)</span>
                  </div>
                  <span className={styles.legendPct}>1 (8%)</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.cardFooterLink}>
            <button
              type="button"
              className={styles.footerLinkBtn}
              onClick={() => setActiveModal('full-dept-distribution')}
            >
              View Full Report &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom Banner: Insights & Recommendations ─────── */}
      <div className={styles.insightsBanner}>
        <div className={styles.insightsLeft}>
          <div className={styles.insightsIconCircle}>
            <Lightbulb size={22} />
          </div>
          <div className={styles.insightsCols}>
            {/* Col 1 */}
            <div className={styles.insightCol}>
              <div className={styles.insightColIcon} style={{ background: '#ECFDF5', color: '#10B981' }}>
                <TrendingUp size={14} />
              </div>
              <div className={styles.insightColText}>
                <h4 className={styles.insightColTitle}>Top Performer</h4>
                <p className={styles.insightColDesc}>
                  Data Management leads in completion rate (93.4%) and assessment score (82.6%).
                </p>
              </div>
            </div>

            {/* Col 2 */}
            <div className={styles.insightCol}>
              <div className={styles.insightColIcon} style={{ background: '#EFF6FF', color: '#3B82F6' }}>
                <Target size={14} />
              </div>
              <div className={styles.insightColText}>
                <h4 className={styles.insightColTitle}>Learning Opportunity</h4>
                <p className={styles.insightColDesc}>
                  Training &amp; Capacity Building has the lowest completion rate (76.1%). Focus on engagement.
                </p>
              </div>
            </div>

            {/* Col 3 */}
            <div className={styles.insightCol}>
              <div className={styles.insightColIcon} style={{ background: '#ECFDF5', color: '#10B981' }}>
                <Users size={14} />
              </div>
              <div className={styles.insightColText}>
                <h4 className={styles.insightColTitle}>High Engagement</h4>
                <p className={styles.insightColDesc}>
                  32.1% of learners are in the High engagement category. Keep up the good work!
                </p>
              </div>
            </div>

            {/* Col 4 */}
            <div className={styles.insightCol}>
              <div className={styles.insightColIcon} style={{ background: '#FFFBEB', color: '#F59E0B' }}>
                <Sparkles size={14} />
              </div>
              <div className={styles.insightColText}>
                <h4 className={styles.insightColTitle}>Action Recommended</h4>
                <p className={styles.insightColDesc}>
                  Increase learning hours in Planning &amp; Coordination to improve overall performance.
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          className={styles.viewAllRecsBtn}
          onClick={() => setActiveModal('all-recommendations')}
        >
          View All Recommendations
          <ArrowRight size={14} />
        </button>
      </div>

      {/* ── Interactive Modals ─────────────────────────────── */}
      {activeModal && (
        <div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {activeModal === 'export' && 'Export Department Analytics Dossier'}
                {activeModal === 'hours-info' && 'About Learning Hours Metric'}
                {activeModal === 'full-hours-report' && 'Department Learning Hours Breakdown'}
                {activeModal === 'completion-info' && 'About Course Completion Index'}
                {activeModal === 'full-completion-report' && 'Full Completion Rate League Table'}
                {activeModal === 'engagement-info' && 'Learner Engagement Classification'}
                {activeModal === 'full-engagement-report' && 'Engagement Tier Distribution'}
                {activeModal === 'summary-info' && 'Performance Metric Definitions'}
                {activeModal === 'detailed-performance' && 'Complete 12-Department Performance Registry'}
                {activeModal === 'score-info' && 'Assessment Normalization Methodology'}
                {activeModal === 'full-assessment-report' && 'Department Assessment Scores Audit'}
                {activeModal === 'dist-info' && 'Cadre & Department Sizing'}
                {activeModal === 'full-dept-distribution' && 'Department Size & Headcount Report'}
                {activeModal === 'all-recommendations' && 'AI Learning & Performance Directives'}
              </h3>
              <button type="button" className={styles.closeBtn} onClick={() => setActiveModal(null)}>
                &times;
              </button>
            </div>

            {activeModal === 'export' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13.5, color: '#334155', margin: 0 }}>
                  Select the export package for date range <strong>{dateRange}</strong>:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    type="button"
                    className={styles.exportBtn}
                    style={{ justifyContent: 'center' }}
                    onClick={() => {
                      setActiveModal(null)
                      showToast('Department Analytics Executive PDF exported successfully!')
                    }}
                  >
                    Executive PDF Briefing (All 12 Divisions)
                  </button>
                  <button
                    type="button"
                    className={styles.exportBtn}
                    style={{ justifyContent: 'center' }}
                    onClick={() => {
                      setActiveModal(null)
                      showToast('Departmental Performance CSV Raw Data exported successfully!')
                    }}
                  >
                    Divisional Raw Performance Data (CSV)
                  </button>
                </div>
              </div>
            )}

            {activeModal !== 'export' && (
              <div style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.55 }}>
                <p>
                  Departmental performance benchmarks aggregate active data across all 12 operational divisions in the Ministry of Statistics and Programme Implementation (MoSPI).
                </p>
                <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0', marginTop: 10 }}>
                  <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                    Divisional Insights:
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12.5, color: '#475569', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <li>Highest completion rate: <strong>Data Management (93.4%)</strong> with 48h 20m logged</li>
                    <li>Largest cadre size: <strong>Statistics Division</strong> with 276 active officers</li>
                    <li>Average assessment mastery across ministry: <strong>78.4%</strong></li>
                    <li>Target growth division: <strong>Training &amp; Capacity Building</strong> targeted for structured blended learning</li>
                  </ul>
                </div>
                <div style={{ textAlign: 'right', marginTop: 16 }}>
                  <button
                    type="button"
                    className={styles.exportBtn}
                    onClick={() => setActiveModal(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Toast Feedback ─────────────────────────────────── */}
      {toastMessage && (
        <div className={styles.toastBanner}>
          <Check size={16} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
