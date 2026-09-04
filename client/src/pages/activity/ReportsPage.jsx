import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart2,
  GraduationCap,
  Trophy,
  Clock,
  Award,
  Download,
  Calendar,
  ChevronDown,
  Info,
  ChevronRight,
  FileText,
  TrendingUp,
  PieChart,
  CheckCircle2,
  Star,
  Check,
  BookOpen,
  ClipboardCheck,
  Target,
  Layers,
  LineChart
} from 'lucide-react'
import styles from './ReportsPage.module.css'

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('01 May 2026 - 19 May 2026')
  const [activeTab, setActiveTab] = useState('Overview')
  const [toastMessage, setToastMessage] = useState(null)
  const [activeModal, setActiveModal] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  const handleDownloadReport = (name) => {
    showToast(`${name} generated and downloaded successfully!`)
  }

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumb ─────────────────────────────────────── */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
        <span className={styles.breadcrumbSep}>&gt;</span>
        <span className={styles.breadcrumbCurrent}>Reports</span>
      </nav>

      {/* ── Page Header & Controls ─────────────────────────── */}
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Reports</h1>
          <p className={styles.pageSubtitle}>
            Comprehensive insights and analytics across your learning journey.
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
            onClick={() => setActiveModal('export-all')}
          >
            <Download size={14} />
            Export Report
          </button>
        </div>
      </div>

      {/* ── Top 5 KPI Metrics ──────────────────────────────── */}
      <div className={styles.topMetricsGrid}>
        {/* Card 1: Courses Enrolled */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconPurple}`}>
            <BarChart2 size={20} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Courses Enrolled</span>
            <span className={styles.metricValue}>24</span>
            <div className={styles.metricTrend}>
              <span>&uarr; 14%</span>
              <span className={styles.metricTrendMuted}>vs last 30 days</span>
            </div>
          </div>
        </div>

        {/* Card 2: Courses Completed */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconGreen}`}>
            <GraduationCap size={20} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Courses Completed</span>
            <span className={styles.metricValue}>16</span>
            <div className={styles.metricTrend}>
              <span>&uarr; 18%</span>
              <span className={styles.metricTrendMuted}>vs last 30 days</span>
            </div>
          </div>
        </div>

        {/* Card 3: Avg. Assessment Score */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconOrange}`}>
            <Trophy size={20} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Avg. Assessment Score</span>
            <span className={styles.metricValue}>78.4%</span>
            <div className={styles.metricTrend}>
              <span>&uarr; 6.2%</span>
              <span className={styles.metricTrendMuted}>vs last 30 days</span>
            </div>
          </div>
        </div>

        {/* Card 4: Learning Hours */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconBlue}`}>
            <Clock size={20} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Learning Hours</span>
            <span className={styles.metricValue}>32h 15m</span>
            <div className={styles.metricTrend}>
              <span>&uarr; 11%</span>
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
            <span className={styles.metricValue}>8</span>
            <div className={styles.metricTrend}>
              <span>&uarr; 33%</span>
              <span className={styles.metricTrendMuted}>vs last 30 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Underline Tabs ─────────────────────────────────── */}
      <div className={styles.tabsNav}>
        {[
          'Overview',
          'Learning',
          'Assessments',
          'Skills & Competencies',
          'iGOT',
          'Training Effectiveness',
          'Certificates',
        ].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tabItem} ${activeTab === tab ? styles.activeTabItem : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Main Two-Column Layout ─────────────────────────── */}
      <div className={styles.mainLayout}>
        {/* Left Column */}
        <div className={styles.leftCol}>
          {/* Row 1: Dual Cards (Learning Progress Over Time + Learning by Category) */}
          <div className={styles.dualCardsGrid}>
            {/* Card 1: Learning Progress Over Time */}
            <div className={styles.cardBox}>
              <div>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>
                    Learning Progress Over Time
                    <Info size={14} className={styles.infoIcon} onClick={() => setActiveModal('progress-info')} />
                  </h3>
                  <p className={styles.cardSub}>Track your learning progress and completion trend.</p>
                </div>

                <div className={styles.chartLegend}>
                  <div className={styles.legendItem}>
                    <span className={styles.legendSquareGreen} />
                    <span>Courses Completed</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDotPurple} />
                    <span>Learning Hours (hrs)</span>
                  </div>
                </div>

                {/* SVG Combo Chart (Bars + Line) */}
                <div className={styles.comboChartWrap}>
                  <svg viewBox="0 0 380 160" className={styles.comboChartSvg}>
                    {/* Horizontal Gridlines */}
                    {[0, 5, 10, 15, 20].map((v, i) => {
                      const y = 130 - (v / 20) * 105
                      return (
                        <g key={v}>
                          <line x1="30" y1={y} x2="350" y2={y} className={styles.chartGridLine} />
                          {/* Left Axis Label (Courses: 0, 5, 10, 15, 20) */}
                          <text x="22" y={y + 3.5} textAnchor="end" className={styles.chartAxisLabel}>{v}</text>
                          {/* Right Axis Label (Hours: 0, 10, 20, 30, 40) */}
                          <text x="358" y={y + 3.5} textAnchor="start" className={styles.chartAxisLabel}>{v * 2}</text>
                        </g>
                      )
                    })}

                    {/* Bar 1: 1 - 7 May (Completed: 5, Hours: 10.5) */}
                    {/* Y for 5 = 130 - (5/20)*105 = 103.75, height = 26.25 */}
                    <rect x="75" y="103.75" width="34" height="26.25" rx="3" fill="#10B981" />
                    <text x="92" y="98" textAnchor="middle" fontSize="10" fontWeight="700" fill="#059669">5</text>
                    <text x="92" y="148" textAnchor="middle" className={styles.chartAxisLabel}>1 – 7 May</text>

                    {/* Bar 2: 8 - 14 May (Completed: 7, Hours: 12.0) */}
                    {/* Y for 7 = 130 - (7/20)*105 = 93.25, height = 36.75 */}
                    <rect x="180" y="93.25" width="34" height="36.75" rx="3" fill="#10B981" />
                    <text x="197" y="87" textAnchor="middle" fontSize="10" fontWeight="700" fill="#059669">7</text>
                    <text x="197" y="148" textAnchor="middle" className={styles.chartAxisLabel}>8 – 14 May</text>

                    {/* Bar 3: 15 - 19 May (Completed: 4, Hours: 9.7) */}
                    {/* Y for 4 = 130 - (4/20)*105 = 109, height = 21 */}
                    <rect x="285" y="109" width="34" height="21" rx="3" fill="#10B981" />
                    <text x="302" y="103" textAnchor="middle" fontSize="10" fontWeight="700" fill="#059669">4</text>
                    <text x="302" y="148" textAnchor="middle" className={styles.chartAxisLabel}>15 – 19 May</text>

                    {/* Line for Hours (scaled to 40 max) */}
                    {/* Pt 1: (92, 130 - (10.5/40)*105 = 102.4) */}
                    {/* Pt 2: (197, 130 - (12.0/40)*105 = 98.5) */}
                    {/* Pt 3: (302, 130 - (9.7/40)*105 = 104.5) */}
                    <polyline
                      fill="none"
                      stroke="#6366F1"
                      strokeWidth="2.5"
                      points="92,72 197,62 302,76"
                    />

                    {/* Pt 1 Circle & Label */}
                    <circle cx="92" cy="72" r="3.5" fill="#6366F1" stroke="#FFFFFF" strokeWidth="1.5" />
                    <text x="92" y="64" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#4F46E5">10.5</text>

                    {/* Pt 2 Circle & Label */}
                    <circle cx="197" cy="62" r="3.5" fill="#6366F1" stroke="#FFFFFF" strokeWidth="1.5" />
                    <text x="197" y="54" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#4F46E5">12.0</text>

                    {/* Pt 3 Circle & Label */}
                    <circle cx="302" cy="76" r="3.5" fill="#6366F1" stroke="#FFFFFF" strokeWidth="1.5" />
                    <text x="302" y="68" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#4F46E5">9.7</text>
                  </svg>
                </div>
              </div>

              <div className={styles.cardFooterLink}>
                <button
                  type="button"
                  className={styles.footerLinkBtn}
                  onClick={() => setActiveModal('learning-detail')}
                >
                  View Full Learning Report &rarr;
                </button>
              </div>
            </div>

            {/* Card 2: Learning by Category */}
            <div className={styles.cardBox}>
              <div>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>
                    Learning by Category
                    <Info size={14} className={styles.infoIcon} onClick={() => setActiveModal('category-info')} />
                  </h3>
                  <p className={styles.cardSub}>Distribution of learning hours by category.</p>
                </div>

                <div className={styles.donutRow}>
                  <div className={styles.donutSvgArea}>
                    <svg viewBox="0 0 100 100" className={styles.donutSvg}>
                      {/* Circumference = 251.3 */}
                      {/* Official Statistics: 40.5% -> 101.8 */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#10B981"
                        strokeWidth="14"
                        strokeDasharray="96.7 142.1"
                        strokeDashoffset="0"
                      />
                      {/* Data Analysis: 24.7% -> 59.0 */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#2563EB"
                        strokeWidth="14"
                        strokeDasharray="59.0 179.8"
                        strokeDashoffset="-96.7"
                      />
                      {/* IT & Digital Skills: 15.3% -> 36.5 */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#F97316"
                        strokeWidth="14"
                        strokeDasharray="36.5 202.3"
                        strokeDashoffset="-155.7"
                      />
                      {/* Management: 10.6% -> 25.3 */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#EF4444"
                        strokeWidth="14"
                        strokeDasharray="25.3 213.5"
                        strokeDashoffset="-192.2"
                      />
                      {/* Others: 8.9% -> 21.3 */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#06B6D4"
                        strokeWidth="14"
                        strokeDasharray="21.3 217.5"
                        strokeDashoffset="-217.5"
                      />
                    </svg>
                    <div className={styles.donutCenterLabel}>
                      <span className={styles.donutCenterCount}>32h 15m</span>
                      <span className={styles.donutCenterSub}>Total Hours</span>
                    </div>
                  </div>

                  <div className={styles.categoryLegend}>
                    <div className={styles.categoryItem}>
                      <div className={styles.categoryLeft}>
                        <span className={styles.categorySquare} style={{ background: '#10B981' }} />
                        <span>Official Statistics</span>
                      </div>
                      <span className={styles.categoryPct}>40.5%</span>
                    </div>
                    <div className={styles.categoryItem}>
                      <div className={styles.categoryLeft}>
                        <span className={styles.categorySquare} style={{ background: '#2563EB' }} />
                        <span>Data Analysis</span>
                      </div>
                      <span className={styles.categoryPct}>24.7%</span>
                    </div>
                    <div className={styles.categoryItem}>
                      <div className={styles.categoryLeft}>
                        <span className={styles.categorySquare} style={{ background: '#F97316' }} />
                        <span>IT &amp; Digital Skills</span>
                      </div>
                      <span className={styles.categoryPct}>15.3%</span>
                    </div>
                    <div className={styles.categoryItem}>
                      <div className={styles.categoryLeft}>
                        <span className={styles.categorySquare} style={{ background: '#EF4444' }} />
                        <span>Management</span>
                      </div>
                      <span className={styles.categoryPct}>10.6%</span>
                    </div>
                    <div className={styles.categoryItem}>
                      <div className={styles.categoryLeft}>
                        <span className={styles.categorySquare} style={{ background: '#06B6D4' }} />
                        <span>Others</span>
                      </div>
                      <span className={styles.categoryPct}>8.9%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.cardFooterLink}>
                <button
                  type="button"
                  className={styles.footerLinkBtn}
                  onClick={() => setActiveModal('category-detail')}
                >
                  View Category Report &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Dual Cards (Top Courses by Completion + Assessment Performance) */}
          <div className={styles.dualCardsGrid2}>
            {/* Card 3: Top Courses by Completion */}
            <div className={styles.cardBox}>
              <div>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>
                    Top Courses by Completion
                    <Info size={14} className={styles.infoIcon} onClick={() => setActiveModal('courses-info')} />
                  </h3>
                  <p className={styles.cardSub}>Your most active and completed courses.</p>
                </div>

                <table className={styles.coursesTable}>
                  <thead>
                    <tr>
                      <th style={{ width: 20 }}>#</th>
                      <th>Course Name</th>
                      <th>Provider</th>
                      <th>Progress</th>
                      <th>Completion Rate</th>
                      <th>Last Accessed</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={styles.courseIndex}>1</td>
                      <td><strong>Data Visualization for Official Statistics</strong></td>
                      <td><span className={styles.providerBadge}>iGOT</span></td>
                      <td>
                        <span className={styles.progressBarTrack}>
                          <span className={styles.progressBarFill} style={{ width: '100%' }} />
                        </span>
                      </td>
                      <td><strong>100%</strong></td>
                      <td style={{ color: '#64748B' }}>19 May 2026</td>
                    </tr>
                    <tr>
                      <td className={styles.courseIndex}>2</td>
                      <td><strong>Survey Design and Sampling Methods</strong></td>
                      <td><span className={styles.providerBadge}>iGOT</span></td>
                      <td>
                        <span className={styles.progressBarTrack}>
                          <span className={styles.progressBarFill} style={{ width: '90%' }} />
                        </span>
                      </td>
                      <td><strong>90%</strong></td>
                      <td style={{ color: '#64748B' }}>18 May 2026</td>
                    </tr>
                    <tr>
                      <td className={styles.courseIndex}>3</td>
                      <td><strong>Official Statistics: Concepts and Principles</strong></td>
                      <td><span className={styles.providerBadge}>iGOT</span></td>
                      <td>
                        <span className={styles.progressBarTrack}>
                          <span className={styles.progressBarFill} style={{ width: '75%' }} />
                        </span>
                      </td>
                      <td><strong>75%</strong></td>
                      <td style={{ color: '#64748B' }}>17 May 2026</td>
                    </tr>
                    <tr>
                      <td className={styles.courseIndex}>4</td>
                      <td><strong>Data Quality and Validation</strong></td>
                      <td><span className={styles.providerBadge}>iGOT</span></td>
                      <td>
                        <span className={styles.progressBarTrack}>
                          <span className={styles.progressBarFill} style={{ width: '60%' }} />
                        </span>
                      </td>
                      <td><strong>60%</strong></td>
                      <td style={{ color: '#64748B' }}>16 May 2026</td>
                    </tr>
                    <tr>
                      <td className={styles.courseIndex}>5</td>
                      <td><strong>Use of R in Official Statistics</strong></td>
                      <td><span className={styles.providerBadge}>iGOT</span></td>
                      <td>
                        <span className={styles.progressBarTrack}>
                          <span className={styles.progressBarFill} style={{ width: '40%' }} />
                        </span>
                      </td>
                      <td><strong>40%</strong></td>
                      <td style={{ color: '#64748B' }}>15 May 2026</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className={styles.cardFooterLink}>
                <button
                  type="button"
                  className={styles.footerLinkBtn}
                  onClick={() => setActiveModal('all-courses-report')}
                >
                  View All Courses Report &rarr;
                </button>
              </div>
            </div>

            {/* Card 4: Assessment Performance */}
            <div className={styles.cardBox}>
              <div>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>
                    Assessment Performance
                    <Info size={14} className={styles.infoIcon} onClick={() => setActiveModal('assessment-info')} />
                  </h3>
                  <p className={styles.cardSub}>Performance summary of your assessments.</p>
                </div>

                <div className={styles.gaugeRow}>
                  <div className={styles.gaugeScoreArea}>
                    <span className={styles.gaugeScoreLabel}>Average Score</span>
                    <span className={styles.gaugeScoreVal}>78.4%</span>
                    <span className={styles.gaugeScoreBadge}>&uarr; 6.2% vs last 30 days</span>
                  </div>

                  {/* SVG Speedometer Gauge Meter */}
                  <div className={styles.gaugeSvgArea}>
                    <svg viewBox="0 0 100 60" className={styles.gaugeSvg}>
                      {/* Background Arch */}
                      <path
                        d="M 15 50 A 35 35 0 0 1 85 50"
                        fill="none"
                        stroke="#E2E8F0"
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      {/* Green Filled Arch (78.4%) */}
                      <path
                        d="M 15 50 A 35 35 0 0 1 85 50"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="8"
                        strokeDasharray="86 110"
                        strokeDashoffset="0"
                        strokeLinecap="round"
                      />
                      {/* Needle */}
                      {/* Angle for 78.4% = 180 * 0.784 = ~141 deg from left -> (50,50) to (71, 23) */}
                      <line
                        x1="50"
                        y1="50"
                        x2="69"
                        y2="25"
                        stroke="#1E293B"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <circle cx="50" cy="50" r="4.5" fill="#1E293B" />
                      <text x="12" y="58" fontSize="7" fill="#94A3B8" fontWeight="600">0%</text>
                      <text x="80" y="58" fontSize="7" fill="#94A3B8" fontWeight="600">100%</text>
                    </svg>
                  </div>
                </div>

                <div className={styles.gaugeStatsRow}>
                  <div className={styles.gaugeStatItem}>
                    <span className={styles.gaugeStatLabel}>Assessments Taken</span>
                    <span className={styles.gaugeStatVal}>15</span>
                  </div>
                  <div className={styles.gaugeStatItem}>
                    <span className={styles.gaugeStatLabel}>Passed</span>
                    <span className={styles.gaugeStatVal} style={{ color: '#10B981' }}>12</span>
                  </div>
                  <div className={styles.gaugeStatItem}>
                    <span className={styles.gaugeStatLabel}>Pass Rate</span>
                    <span className={styles.gaugeStatVal}>80%</span>
                  </div>
                </div>
              </div>

              <div className={styles.cardFooterLink}>
                <button
                  type="button"
                  className={styles.footerLinkBtn}
                  onClick={() => setActiveModal('assessment-detail')}
                >
                  View Assessment Report &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions, Recent Reports, Insights */}
        <div className={styles.rightCol}>
          {/* Card 1: Quick Actions */}
          <div className={styles.cardBox}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Quick Actions</h3>
            </div>
            <div className={styles.quickActionsList}>
              <div
                className={styles.quickActionItem}
                onClick={() => handleDownloadReport('Learning Report')}
              >
                <div className={styles.quickActionLeft}>
                  <Download size={14} color="#6366F1" />
                  <span>Download Learning Report</span>
                </div>
                <ChevronRight size={14} color="#94A3B8" />
              </div>

              <div
                className={styles.quickActionItem}
                onClick={() => handleDownloadReport('Assessment Report')}
              >
                <div className={styles.quickActionLeft}>
                  <Download size={14} color="#6366F1" />
                  <span>Download Assessment Report</span>
                </div>
                <ChevronRight size={14} color="#94A3B8" />
              </div>

              <div
                className={styles.quickActionItem}
                onClick={() => handleDownloadReport('Certificate Report')}
              >
                <div className={styles.quickActionLeft}>
                  <Download size={14} color="#6366F1" />
                  <span>Download Certificate Report</span>
                </div>
                <ChevronRight size={14} color="#94A3B8" />
              </div>

              <div
                className={styles.quickActionItem}
                onClick={() => handleDownloadReport('All Learning & Compliance Reports')}
              >
                <div className={styles.quickActionLeft}>
                  <Download size={14} color="#6366F1" />
                  <span>Export All Reports</span>
                </div>
                <ChevronRight size={14} color="#94A3B8" />
              </div>
            </div>
          </div>

          {/* Card 2: Recent Reports */}
          <div className={styles.cardBox}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Recent Reports</h3>
            </div>

            <div className={styles.recentReportsList}>
              <div
                className={styles.recentReportItem}
                onClick={() => handleDownloadReport('Learning Summary Report')}
              >
                <div className={styles.reportIconSquare}>
                  <FileText size={14} />
                </div>
                <div className={styles.reportMeta}>
                  <span className={styles.reportName}>Learning Summary Report</span>
                  <span className={styles.reportDate}>Generated on 19 May 2026, 10:30 AM</span>
                </div>
              </div>

              <div
                className={styles.recentReportItem}
                onClick={() => handleDownloadReport('Assessment Performance Report')}
              >
                <div className={styles.reportIconSquare}>
                  <FileText size={14} />
                </div>
                <div className={styles.reportMeta}>
                  <span className={styles.reportName}>Assessment Performance Report</span>
                  <span className={styles.reportDate}>Generated on 19 May 2026, 10:15 AM</span>
                </div>
              </div>

              <div
                className={styles.recentReportItem}
                onClick={() => handleDownloadReport('iGOT Learning Report')}
              >
                <div className={styles.reportIconSquare}>
                  <FileText size={14} />
                </div>
                <div className={styles.reportMeta}>
                  <span className={styles.reportName}>iGOT Learning Report</span>
                  <span className={styles.reportDate}>Generated on 18 May 2026, 06:20 PM</span>
                </div>
              </div>

              <div
                className={styles.recentReportItem}
                onClick={() => handleDownloadReport('Skill Progress Report')}
              >
                <div className={styles.reportIconSquare}>
                  <FileText size={14} />
                </div>
                <div className={styles.reportMeta}>
                  <span className={styles.reportName}>Skill Progress Report</span>
                  <span className={styles.reportDate}>Generated on 18 May 2026, 05:45 PM</span>
                </div>
              </div>

              <div
                className={styles.recentReportItem}
                onClick={() => handleDownloadReport('Certificate Report')}
              >
                <div className={styles.reportIconSquare}>
                  <FileText size={14} />
                </div>
                <div className={styles.reportMeta}>
                  <span className={styles.reportName}>Certificate Report</span>
                  <span className={styles.reportDate}>Generated on 17 May 2026, 11:10 AM</span>
                </div>
              </div>
            </div>

            <div className={styles.cardFooterLink}>
              <button
                type="button"
                className={styles.footerLinkBtn}
                onClick={() => setActiveModal('recent-all')}
              >
                View All Reports &rarr;
              </button>
            </div>
          </div>

          {/* Card 3: Insights */}
          <div className={styles.cardBox}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Insights</h3>
            </div>

            <div className={styles.insightsWidgetList}>
              <div className={styles.insightWidgetItem}>
                <div className={styles.insightWidgetIcon} style={{ background: '#ECFDF5', color: '#10B981' }}>
                  <TrendingUp size={13} />
                </div>
                <span>You have increased your learning hours by 11% compared to last 30 days. Keep it up!</span>
              </div>

              <div className={styles.insightWidgetItem}>
                <div className={styles.insightWidgetIcon} style={{ background: '#FFFBEB', color: '#F59E0B' }}>
                  <Clock size={13} />
                </div>
                <span>Data Analysis is your top learning category with 24.7% of total learning hours.</span>
              </div>

              <div className={styles.insightWidgetItem}>
                <div className={styles.insightWidgetIcon} style={{ background: '#EFF6FF', color: '#3B82F6' }}>
                  <Star size={13} />
                </div>
                <span>You are performing above average in assessments. Great job!</span>
              </div>
            </div>

            <div className={styles.cardFooterLink}>
              <button
                type="button"
                className={styles.footerLinkBtn}
                onClick={() => setActiveModal('insights-modal')}
              >
                View Insights Report &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Explore More Reports ─────────── */}
      <div className={styles.exploreSection}>
        <h3 className={styles.exploreTitle}>Explore More Reports</h3>

        <div className={styles.exploreGrid}>
          <div className={styles.exploreCard} onClick={() => handleDownloadReport('Learning Report')}>
            <div className={styles.exploreIconArea} style={{ background: '#EEF2FF', color: '#6366F1' }}>
              <BookOpen size={18} />
            </div>
            <div>
              <h4 className={styles.exploreCardTitle}>Learning Reports</h4>
              <p className={styles.exploreCardDesc}>
                Detailed insights on courses, progress and learning hours.
              </p>
            </div>
          </div>

          <div className={styles.exploreCard} onClick={() => handleDownloadReport('Assessment Report')}>
            <div className={styles.exploreIconArea} style={{ background: '#ECFDF5', color: '#10B981' }}>
              <ClipboardCheck size={18} />
            </div>
            <div>
              <h4 className={styles.exploreCardTitle}>Assessment Reports</h4>
              <p className={styles.exploreCardDesc}>
                Performance analysis of quizzes and assessments.
              </p>
            </div>
          </div>

          <div className={styles.exploreCard} onClick={() => handleDownloadReport('Competency Report')}>
            <div className={styles.exploreIconArea} style={{ background: '#FFFBEB', color: '#F59E0B' }}>
              <Target size={18} />
            </div>
            <div>
              <h4 className={styles.exploreCardTitle}>Competency Reports</h4>
              <p className={styles.exploreCardDesc}>
                Track skills, proficiency and gap analysis.
              </p>
            </div>
          </div>

          <div className={styles.exploreCard} onClick={() => handleDownloadReport('iGOT Integration Report')}>
            <div className={styles.exploreIconArea} style={{ background: '#EFF6FF', color: '#3B82F6' }}>
              <Layers size={18} />
            </div>
            <div>
              <h4 className={styles.exploreCardTitle}>iGOT Reports</h4>
              <p className={styles.exploreCardDesc}>
                iGOT course progress and learning summary.
              </p>
            </div>
          </div>

          <div className={styles.exploreCard} onClick={() => handleDownloadReport('Training Effectiveness Report')}>
            <div className={styles.exploreIconArea} style={{ background: '#F5F3FF', color: '#8B5CF6' }}>
              <LineChart size={18} />
            </div>
            <div>
              <h4 className={styles.exploreCardTitle}>Training Reports</h4>
              <p className={styles.exploreCardDesc}>
                Training effectiveness and impact analysis.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Interactive Modals ─────────────────────────────── */}
      {activeModal && (
        <div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {activeModal === 'export-all' && 'Export Comprehensive Journey Reports'}
                {activeModal === 'progress-info' && 'About Learning Progress Over Time'}
                {activeModal === 'category-info' && 'About Learning by Category'}
                {activeModal === 'category-detail' && 'Full Category Learning Distribution'}
                {activeModal === 'learning-detail' && 'Weekly Learning & Hours Log'}
                {activeModal === 'courses-info' && 'About Course Completion Index'}
                {activeModal === 'all-courses-report' && 'All Enrolled Courses & Completion Log'}
                {activeModal === 'assessment-info' && 'Assessment Evaluation Methodology'}
                {activeModal === 'assessment-detail' && 'Comprehensive Assessment History'}
                {activeModal === 'recent-all' && 'Archive of Generated Reports'}
                {activeModal === 'insights-modal' && 'AI Learning Insights & Recommendations'}
              </h3>
              <button type="button" className={styles.closeBtn} onClick={() => setActiveModal(null)}>
                &times;
              </button>
            </div>

            {activeModal === 'export-all' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13.5, color: '#334155', margin: 0 }}>
                  Choose the report package for dates <strong>{dateRange}</strong>:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    type="button"
                    className={styles.exportBtn}
                    style={{ justifyContent: 'center' }}
                    onClick={() => { setActiveModal(null); handleDownloadReport('Consolidated Executive PDF Dossier'); }}
                  >
                    Consolidated Executive PDF Dossier
                  </button>
                  <button
                    type="button"
                    className={styles.exportBtn}
                    style={{ justifyContent: 'center' }}
                    onClick={() => { setActiveModal(null); handleDownloadReport('Raw Assessment & Activity CSVs (ZIP)'); }}
                  >
                    Raw Assessment &amp; Activity CSVs (ZIP)
                  </button>
                </div>
              </div>
            )}

            {activeModal !== 'export-all' && (
              <div style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.55 }}>
                <p>
                  This institutional report synthesizes learning velocity across MoSPI courses, iGOT Karmayogi civil service modules, and competency assessments.
                </p>
                <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0', marginTop: 10 }}>
                  <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                    Record Highlights:
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12.5, color: '#475569', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <li>Total active courses tracked: <strong>24 modules</strong> (16 completed, 8 in progress)</li>
                    <li>Cumulative learning hours: <strong>32 hours 15 minutes</strong></li>
                    <li>Verified assessment pass rate: <strong>80%</strong> with an average score of <strong>78.4%</strong></li>
                    <li>Official accredited certificates issued: <strong>8 certifications</strong></li>
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
