import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  GraduationCap,
  Award,
  Target,
  Download,
  Calendar,
  ChevronDown,
  Info,
  ArrowUpRight,
  Monitor,
  Video,
  School,
  RefreshCw,
  TrendingUp,
  FileText,
  Sparkles,
  Check,
  BarChart2,
  PieChart,
  DollarSign,
  Briefcase
} from 'lucide-react'
import styles from './TrainingEffectivenessPage.module.css'

export default function TrainingEffectivenessPage() {
  const [dateRange, setDateRange] = useState('last-90-days')
  const [activeTab, setActiveTab] = useState('Overview')
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  // Modals
  const [activeModal, setActiveModal] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  // Trend data points (24 Feb to 19 May)
  const trendData = [
    { date: '24 Feb', impact: 68.2, assessment: 65.1 },
    { date: '10 Mar', impact: 70.5, assessment: 66.8 },
    { date: '24 Mar', impact: 72.8, assessment: 69.2 },
    { date: '7 Apr',  impact: 75.1, assessment: 71.4 },
    { date: '21 Apr', impact: 77.3, assessment: 73.6 },
    { date: '5 May',  impact: 80.4, assessment: 76.9 },
    { date: '19 May', impact: 82.1, assessment: 78.4 },
  ]

  // Chart coordinate mapping
  // X: 40 to 460 (width 500), Y: 20 to 140 (height 160)
  const chartW = 460
  const chartH = 140
  const padLeft = 40
  const padTop = 15
  const getY = (val) => padTop + (1 - val / 100) * (chartH - 25)
  const getX = (idx) => padLeft + (idx / (trendData.length - 1)) * (chartW - padLeft - 20)

  const impactPointsStr = trendData.map((d, i) => `${getX(i)},${getY(d.impact)}`).join(' ')
  const assessmentPointsStr = trendData.map((d, i) => `${getX(i)},${getY(d.assessment)}`).join(' ')

  const handleExport = (type = 'CSV') => {
    showToast(`Training effectiveness ${type} report downloaded successfully!`)
  }

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumb ─────────────────────────────────────── */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
        <span className={styles.breadcrumbSep}>&gt;</span>
        <span className={styles.breadcrumbCurrent}>Training Effectiveness</span>
      </nav>

      {/* ── Page Header & Controls ─────────────────────────── */}
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Training Effectiveness</h1>
          <p className={styles.pageSubtitle}>
            Measure the impact of training and learning initiatives with data-driven insights.
          </p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.dateSelectWrap}>
            <Calendar size={14} className={styles.dateIcon} />
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value)
                showToast(`Data refreshed for: ${e.target.options[e.target.selectedIndex].text}`)
              }}
              className={styles.dateSelect}
            >
              <option value="last-90-days">Last 90 Days</option>
              <option value="last-30-days">Last 30 Days</option>
              <option value="last-6-months">Last 6 Months</option>
              <option value="ytd">Year to Date (2026)</option>
              <option value="all-time">All Time</option>
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

      {/* ── Top 4 KPI Metrics ──────────────────────────────── */}
      <div className={styles.topMetricsGrid}>
        {/* Card 1: Total Learners Trained */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconPurple}`}>
            <Users size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Total Learners Trained</span>
            <span className={styles.metricValue}>1,254</span>
            <div className={styles.metricTrend}>
              <span>&uarr; 12%</span>
              <span className={styles.metricTrendMuted}>vs previous 90 days</span>
            </div>
          </div>
        </div>

        {/* Card 2: Training Completion Rate */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconGreen}`}>
            <GraduationCap size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Training Completion Rate</span>
            <span className={styles.metricValue}>87.6%</span>
            <div className={styles.metricTrend}>
              <span>&uarr; 8.4%</span>
              <span className={styles.metricTrendMuted}>vs previous 90 days</span>
            </div>
          </div>
        </div>

        {/* Card 3: Average Assessment Score */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconOrange}`}>
            <Award size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Average Assessment Score</span>
            <span className={styles.metricValue}>78.4%</span>
            <div className={styles.metricTrend}>
              <span>&uarr; 6.3%</span>
              <span className={styles.metricTrendMuted}>vs previous 90 days</span>
            </div>
          </div>
        </div>

        {/* Card 4: Learning Impact Score */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconBlue}`}>
            <Target size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Learning Impact Score</span>
            <span className={styles.metricValue}>82.1/100</span>
            <div className={styles.metricTrend}>
              <span>&uarr; 9.7%</span>
              <span className={styles.metricTrendMuted}>vs previous 90 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Underline Tabs ─────────────────────────────────── */}
      <div className={styles.tabsNav}>
        {[
          'Overview',
          'Course Effectiveness',
          'Assessment Impact',
          'Skill Improvement',
          'Behavior Change',
          'ROI Analysis',
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

      {/* ── Row 1 of Analytics Cards (3 Cards) ─────────────── */}
      <div className={styles.analyticsRow}>
        {/* Card 1: Training Effectiveness Trend */}
        <div className={styles.cardBox}>
          <div>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                Training Effectiveness Trend
                <Info size={14} className={styles.infoIcon} onClick={() => setActiveModal('trend-info')} />
              </h3>
            </div>

            <div className={styles.trendLegend}>
              <div className={styles.legendItem}>
                <span className={styles.legendDotPurple} />
                <span>Learning Impact Score</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDotGreen} />
                <span>Average Assessment Score</span>
              </div>
            </div>

            {/* SVG Chart */}
            <div className={styles.chartWrap}>
              <svg viewBox="0 0 500 170" className={styles.chartSvg}>
                {/* Y Axis Gridlines & Labels */}
                {[100, 75, 50, 25, 0].map((val) => {
                  const y = getY(val)
                  return (
                    <g key={val}>
                      <line x1={padLeft} y1={y} x2={480} y2={y} className={styles.chartGridLine} />
                      <text x={padLeft - 10} y={y + 4} textAnchor="end" className={styles.chartAxisLabel}>
                        {val}
                      </text>
                    </g>
                  )
                })}

                {/* X Axis Labels */}
                {trendData.map((d, i) => (
                  <text
                    key={d.date}
                    x={getX(i)}
                    y={162}
                    textAnchor="middle"
                    className={styles.chartAxisLabel}
                  >
                    {d.date}
                  </text>
                ))}

                {/* Purple Line (Impact) */}
                <polyline
                  fill="none"
                  stroke="#6366F1"
                  strokeWidth="2.5"
                  points={impactPointsStr}
                />

                {/* Green Line (Assessment) */}
                <polyline
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  points={assessmentPointsStr}
                />

                {/* Data Points with Text Labels & Tooltips */}
                {trendData.map((d, i) => {
                  const x = getX(i)
                  const yImpact = getY(d.impact)
                  const yAssessment = getY(d.assessment)
                  return (
                    <g key={i}>
                      {/* Purple Node */}
                      <circle cx={x} cy={yImpact} r="4" fill="#6366F1" stroke="#FFFFFF" strokeWidth="2" />
                      <text x={x} y={yImpact - 7} textAnchor="middle" fontSize="9.5" fill="#4F46E5" fontWeight="600">
                        {d.impact}
                      </text>

                      {/* Green Node */}
                      <circle cx={x} cy={yAssessment} r="4" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                      <text x={x} y={yAssessment + 12} textAnchor="middle" fontSize="9.5" fill="#059669" fontWeight="600">
                        {d.assessment}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>

          <div className={styles.trendFootnote}>
            Trend shows overall improvement in learning effectiveness over time.
          </div>
        </div>

        {/* Card 2: Learning Impact Distribution */}
        <div className={styles.cardBox}>
          <div>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                Learning Impact Distribution
                <Info size={14} className={styles.infoIcon} onClick={() => setActiveModal('distribution-info')} />
              </h3>
            </div>

            <div className={styles.donutContent}>
              <div className={styles.donutSvgArea}>
                <svg viewBox="0 0 100 100" className={styles.donutSvg}>
                  {/* Total Circumference = 2 * PI * 40 = ~251.32 */}
                  {/* High (80-100): 38% -> 95.5 */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#10B981"
                    strokeWidth="15"
                    strokeDasharray="95.5 155.8"
                    strokeDashoffset="0"
                  />
                  {/* Above Average (60-79): 42% -> 105.5 */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#3B82F6"
                    strokeWidth="15"
                    strokeDasharray="105.5 145.8"
                    strokeDashoffset="-95.5"
                  />
                  {/* Average (40-59): 15% -> 37.7 */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#F59E0B"
                    strokeWidth="15"
                    strokeDasharray="37.7 213.6"
                    strokeDashoffset="-201"
                  />
                  {/* Below Average (0-39): 5% -> 12.6 */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#EF4444"
                    strokeWidth="15"
                    strokeDasharray="12.6 238.7"
                    strokeDashoffset="-238.7"
                  />
                </svg>
                <div className={styles.donutCenterLabel}>
                  <span className={styles.donutCenterCount}>1,254</span>
                  <span className={styles.donutCenterSub}>Learners</span>
                </div>
              </div>

              <div className={styles.distributionLegend}>
                <div className={styles.distItem}>
                  <div className={styles.distItemLeft}>
                    <span className={styles.distSquare} style={{ background: '#10B981' }} />
                    <span>High (80-100)</span>
                  </div>
                  <span className={styles.distPct}>38%</span>
                </div>
                <div className={styles.distItem}>
                  <div className={styles.distItemLeft}>
                    <span className={styles.distSquare} style={{ background: '#3B82F6' }} />
                    <span>Above Average (60-79)</span>
                  </div>
                  <span className={styles.distPct}>42%</span>
                </div>
                <div className={styles.distItem}>
                  <div className={styles.distItemLeft}>
                    <span className={styles.distSquare} style={{ background: '#F59E0B' }} />
                    <span>Average (40-59)</span>
                  </div>
                  <span className={styles.distPct}>15%</span>
                </div>
                <div className={styles.distItem}>
                  <div className={styles.distItemLeft}>
                    <span className={styles.distSquare} style={{ background: '#EF4444' }} />
                    <span>Below Average (0-39)</span>
                  </div>
                  <span className={styles.distPct}>5%</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.cardFooterLink}>
            <button
              type="button"
              className={styles.footerLinkBtn}
              onClick={() => setActiveModal('distribution-detail')}
            >
              View Full Report &rarr;
            </button>
          </div>
        </div>

        {/* Card 3: Top Performing Courses */}
        <div className={styles.cardBox}>
          <div>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                Top Performing Courses
                <Info size={14} className={styles.infoIcon} onClick={() => setActiveModal('courses-info')} />
              </h3>
            </div>

            <table className={styles.topCoursesTable}>
              <thead>
                <tr>
                  <th>Course Name</th>
                  <th>Learning Impact Score</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className={styles.courseIndex}>1.</span> Data Visualization</td>
                  <td>94.2/100</td>
                </tr>
                <tr>
                  <td><span className={styles.courseIndex}>2.</span> Statistical Analysis using R</td>
                  <td>91.6/100</td>
                </tr>
                <tr>
                  <td><span className={styles.courseIndex}>3.</span> Survey Design &amp; Sampling</td>
                  <td>89.3/100</td>
                </tr>
                <tr>
                  <td><span className={styles.courseIndex}>4.</span> Official Statistics: Concepts</td>
                  <td>86.7/100</td>
                </tr>
                <tr>
                  <td><span className={styles.courseIndex}>5.</span> Data Quality &amp; Validation</td>
                  <td>83.5/100</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={styles.cardFooterLink}>
            <button
              type="button"
              className={styles.footerLinkBtn}
              onClick={() => setActiveModal('all-courses')}
            >
              View All Courses &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* ── Row 2 of Analytics Cards (3 Cards) ─────────────── */}
      <div className={styles.analyticsRow}>
        {/* Card 1: Effectiveness by Training Type */}
        <div className={styles.cardBox}>
          <div>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                Effectiveness by Training Type
                <Info size={14} className={styles.infoIcon} onClick={() => setActiveModal('type-info')} />
              </h3>
            </div>

            <table className={styles.typeTable}>
              <thead>
                <tr>
                  <th>Training Type</th>
                  <th>Learners Trained</th>
                  <th>Completion Rate</th>
                  <th style={{ textAlign: 'right' }}>Learning Impact Score</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className={styles.typeNameCell}>
                      <div className={styles.typeIconBadge}>
                        <Monitor size={14} />
                      </div>
                      <span>Online Courses</span>
                    </div>
                  </td>
                  <td>782</td>
                  <td>
                    <span>88.9%</span>
                    <span className={styles.typeProgressBarTrack}>
                      <span className={styles.typeProgressBarFill} style={{ width: '88.9%' }} />
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>84.3/100</td>
                </tr>
                <tr>
                  <td>
                    <div className={styles.typeNameCell}>
                      <div className={styles.typeIconBadge}>
                        <Video size={14} />
                      </div>
                      <span>Virtual Instructor Led</span>
                    </div>
                  </td>
                  <td>256</td>
                  <td>
                    <span>86.3%</span>
                    <span className={styles.typeProgressBarTrack}>
                      <span className={styles.typeProgressBarFill} style={{ width: '86.3%' }} />
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>81.7/100</td>
                </tr>
                <tr>
                  <td>
                    <div className={styles.typeNameCell}>
                      <div className={styles.typeIconBadge}>
                        <School size={14} />
                      </div>
                      <span>Classroom Training</span>
                    </div>
                  </td>
                  <td>146</td>
                  <td>
                    <span>84.2%</span>
                    <span className={styles.typeProgressBarTrack}>
                      <span className={styles.typeProgressBarFill} style={{ width: '84.2%' }} />
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>79.8/100</td>
                </tr>
                <tr>
                  <td>
                    <div className={styles.typeNameCell}>
                      <div className={styles.typeIconBadge}>
                        <RefreshCw size={14} />
                      </div>
                      <span>Blended Learning</span>
                    </div>
                  </td>
                  <td>70</td>
                  <td>
                    <span>90.0%</span>
                    <span className={styles.typeProgressBarTrack}>
                      <span className={styles.typeProgressBarFill} style={{ width: '90%' }} />
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>87.6/100</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={styles.cardFooterLink}>
            <button
              type="button"
              className={styles.footerLinkBtn}
              onClick={() => setActiveModal('type-detail')}
            >
              View Detailed Report &rarr;
            </button>
          </div>
        </div>

        {/* Card 2: Impact on Job Performance */}
        <div className={styles.cardBox}>
          <div>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                Impact on Job Performance
                <Info size={14} className={styles.infoIcon} onClick={() => setActiveModal('performance-info')} />
              </h3>
            </div>

            <div className={styles.bigKpiArea}>
              <span className={styles.bigKpiVal}>72%</span>
              <span className={styles.bigKpiBadge}>&uarr; 11% vs previous 90 days</span>
            </div>
            <p className={styles.bigKpiSub}>
              Learners reported improvement in job performance after training
            </p>

            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
              Key Areas of Improvement
            </div>

            <div className={styles.skillBarsList}>
              <div className={styles.skillBarItem}>
                <div className={styles.skillBarHeader}>
                  <div className={styles.skillBarHeaderLeft}>
                    <BarChart2 size={12} color="#6366F1" />
                    <span>Analytical Skills</span>
                  </div>
                  <strong>76%</strong>
                </div>
                <div className={styles.skillBarTrack}>
                  <div className={styles.skillBarFill} style={{ width: '76%' }} />
                </div>
              </div>

              <div className={styles.skillBarItem}>
                <div className={styles.skillBarHeader}>
                  <div className={styles.skillBarHeaderLeft}>
                    <TrendingUp size={12} color="#6366F1" />
                    <span>Data Interpretation</span>
                  </div>
                  <strong>74%</strong>
                </div>
                <div className={styles.skillBarTrack}>
                  <div className={styles.skillBarFill} style={{ width: '74%' }} />
                </div>
              </div>

              <div className={styles.skillBarItem}>
                <div className={styles.skillBarHeader}>
                  <div className={styles.skillBarHeaderLeft}>
                    <Target size={12} color="#6366F1" />
                    <span>Decision Making</span>
                  </div>
                  <strong>70%</strong>
                </div>
                <div className={styles.skillBarTrack}>
                  <div className={styles.skillBarFill} style={{ width: '70%' }} />
                </div>
              </div>

              <div className={styles.skillBarItem}>
                <div className={styles.skillBarHeader}>
                  <div className={styles.skillBarHeaderLeft}>
                    <Sparkles size={12} color="#6366F1" />
                    <span>Problem Solving</span>
                  </div>
                  <strong>68%</strong>
                </div>
                <div className={styles.skillBarTrack}>
                  <div className={styles.skillBarFill} style={{ width: '68%' }} />
                </div>
              </div>

              <div className={styles.skillBarItem}>
                <div className={styles.skillBarHeader}>
                  <div className={styles.skillBarHeaderLeft}>
                    <FileText size={12} color="#6366F1" />
                    <span>Reporting &amp; Documentation</span>
                  </div>
                  <strong>62%</strong>
                </div>
                <div className={styles.skillBarTrack}>
                  <div className={styles.skillBarFill} style={{ width: '62%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.cardFooterLink}>
            <button
              type="button"
              className={styles.footerLinkBtn}
              onClick={() => setActiveModal('performance-detail')}
            >
              View Full Report &rarr;
            </button>
          </div>
        </div>

        {/* Card 3: Return on Investment (ROI) */}
        <div className={styles.cardBox}>
          <div>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                Return on Investment (ROI)
                <Info size={14} className={styles.infoIcon} onClick={() => setActiveModal('roi-info')} />
              </h3>
            </div>

            <div className={styles.bigKpiArea}>
              <span className={styles.bigKpiVal}>4.3x</span>
              <span className={styles.bigKpiBadge}>&uarr; 0.6x vs previous 90 days</span>
            </div>
            <p className={styles.bigKpiSub}>
              Average ROI for training initiatives
            </p>

            <table className={styles.roiBreakdownTable}>
              <tbody>
                <tr>
                  <td className={styles.roiLabel}>Cost Savings (Estimated)</td>
                  <td className={styles.roiValue}>&#8377; 18.6 Lakhs</td>
                </tr>
                <tr>
                  <td className={styles.roiLabel}>Productivity Gain (Estimated)</td>
                  <td className={styles.roiValue}>&#8377; 25.4 Lakhs</td>
                </tr>
                <tr>
                  <td className={styles.roiLabel}>Total Training Investment</td>
                  <td className={styles.roiValue}>&#8377; 10.2 Lakhs</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={styles.cardFooterLink}>
            <button
              type="button"
              className={styles.footerLinkBtn}
              onClick={() => setActiveModal('roi-detail')}
            >
              View ROI Analysis &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom Banner: Insights & Recommendations ─────── */}
      <div className={styles.insightsBanner}>
        <div className={styles.insightsLeft}>
          <div className={styles.insightsIconCircle}>
            <Sparkles size={22} />
          </div>
          <div className={styles.insightsCols}>
            <div className={styles.insightCol}>
              <h4 className={styles.insightColTitle}>Focus on High Impact Areas</h4>
              <p className={styles.insightColDesc}>
                Analytical Skills and Data Interpretation have the highest impact. Consider more advanced modules.
              </p>
            </div>

            <div className={styles.insightCol}>
              <h4 className={styles.insightColTitle}>Improve Completion Rates</h4>
              <p className={styles.insightColDesc}>
                Blended learning shows highest completion. Encourage more self-paced learning.
              </p>
            </div>

            <div className={styles.insightCol}>
              <h4 className={styles.insightColTitle}>Sustain the Momentum</h4>
              <p className={styles.insightColDesc}>
                Learning Impact Score is improving steadily. Continue regular assessments and feedback.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          className={styles.generateReportBtn}
          onClick={() => setActiveModal('generate-report')}
        >
          <FileText size={15} />
          Generate Detailed Report
        </button>
      </div>

      {/* ── Interactive Modals ─────────────────────────────── */}
      {activeModal && (
        <div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {activeModal === 'export' && 'Export Training Effectiveness Data'}
                {activeModal === 'trend-info' && 'About Training Effectiveness Trend'}
                {activeModal === 'distribution-info' && 'About Learning Impact Distribution'}
                {activeModal === 'distribution-detail' && 'Full Impact Distribution Report'}
                {activeModal === 'courses-info' && 'About Course Effectiveness Ranking'}
                {activeModal === 'all-courses' && 'All Evaluated Courses & Impact Scores'}
                {activeModal === 'type-info' && 'Delivery Modality Metrics'}
                {activeModal === 'type-detail' && 'Modality Performance & Completion Deep Dive'}
                {activeModal === 'performance-info' && 'Job Performance Measurement Rubric'}
                {activeModal === 'performance-detail' && 'Full Job Performance & Competency Gains'}
                {activeModal === 'roi-info' && 'Phillips ROI Methodology for Civil Services'}
                {activeModal === 'roi-detail' && 'Comprehensive ROI & Cost-Benefit Analysis'}
                {activeModal === 'generate-report' && 'Generate Detailed Institutional Report'}
              </h3>
              <button type="button" className={styles.closeBtn} onClick={() => setActiveModal(null)}>
                &times;
              </button>
            </div>

            {/* Modal Body Variations */}
            {activeModal === 'export' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13.5, color: '#334155', margin: 0 }}>
                  Select format to export full training effectiveness metrics for <strong>{dateRange}</strong>:
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className={styles.exportBtn}
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => { setActiveModal(null); handleExport('PDF'); }}
                  >
                    Executive PDF Report
                  </button>
                  <button
                    type="button"
                    className={styles.exportBtn}
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => { setActiveModal(null); handleExport('CSV'); }}
                  >
                    Raw Data (CSV)
                  </button>
                </div>
              </div>
            )}

            {activeModal === 'all-courses' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                  All 7 high-impact evaluated courses across MoSPI &amp; iGOT Karmayogi:
                </p>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <table className={styles.topCoursesTable}>
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Provider</th>
                        <th>Impact Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td>1. Data Visualization</td><td>MoSPI</td><td>94.2/100</td></tr>
                      <tr><td>2. Statistical Analysis using R</td><td>MoSPI</td><td>91.6/100</td></tr>
                      <tr><td>3. Survey Design &amp; Sampling</td><td>NISG</td><td>89.3/100</td></tr>
                      <tr><td>4. Official Statistics: Concepts</td><td>MoSPI</td><td>86.7/100</td></tr>
                      <tr><td>5. Data Quality &amp; Validation</td><td>NISG</td><td>83.5/100</td></tr>
                      <tr><td>6. National Accounts Fundamentals</td><td>MoSPI</td><td>81.2/100</td></tr>
                      <tr><td>7. Consumer Price Index Methodology</td><td>MoSPI</td><td>79.4/100</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeModal === 'generate-report' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.5, margin: 0 }}>
                  Generating a comprehensive institutional briefing document incorporating:
                </p>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#475569', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <li>Kirkpatrick Levels 1-4 Analysis for Ministry Leadership</li>
                  <li>Departmental completion benchmarks across MoSPI divisions</li>
                  <li>Automated generative AI recommendations for FY 2026-27 training calendar</li>
                </ul>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                  <button
                    type="button"
                    className={styles.exportBtn}
                    onClick={() => setActiveModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.generateReportBtn}
                    onClick={() => {
                      setActiveModal(null)
                      showToast('Comprehensive institutional report compiled and ready for download!')
                    }}
                  >
                    Download Institutional PDF
                  </button>
                </div>
              </div>
            )}

            {(activeModal.includes('-info') || activeModal.includes('-detail')) && activeModal !== 'all-courses' && (
              <div style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.55 }}>
                <p>
                  Training effectiveness is evaluated using the internationally recognized <strong>Kirkpatrick 4-Level Evaluation Model</strong> combined with the <strong>Phillips ROI Framework</strong>.
                </p>
                <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0', marginTop: 12 }}>
                  <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                    Measurement Highlights:
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12.5, color: '#475569', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <li><strong>Reaction &amp; Planned Action:</strong> 92% positive feedback from civil service participants.</li>
                    <li><strong>Learning Gains:</strong> Pre- vs post-assessment score gain averaging +21.4%.</li>
                    <li><strong>Behavioral Change:</strong> 72% reported improvement in field survey error reduction.</li>
                    <li><strong>Business ROI:</strong> ₹ 44.0 Lakhs in combined cost savings and productivity gains vs ₹ 10.2 Lakhs investment.</li>
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
