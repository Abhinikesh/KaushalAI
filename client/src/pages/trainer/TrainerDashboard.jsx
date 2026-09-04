import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  Users,
  Clock,
  ClipboardList,
  Shield,
  ArrowRight,
  TrendingUp,
  Calendar,
  ChevronDown,
  UploadCloud,
  Sparkles,
  CheckCircle,
  FileSpreadsheet,
  BarChart3,
  Video,
  X,
  Plus,
  Play,
  Share2,
} from 'lucide-react'
import { listCourses } from '../../api/course.api'
import { listQuizzes } from '../../api/quiz.api'
import { getTrainerSummary } from '../../api/admin.api'
import { useAuthStore } from '../../store/authStore'
import styles from './TrainerDashboard.module.css'

// Default authentic programmes matching official statistics curriculum
const TOP_PROGRAMMES_DATA = [
  {
    id: 'prog-python',
    title: 'Python for Data Analysis',
    source: 'igot',
    learners: 64,
    completed: 52,
    avgScore: 82,
    completionRate: 81,
    iconType: 'python',
  },
  {
    id: 'prog-quality',
    title: 'Official Statistics & Data Quality',
    source: 'nssta',
    learners: 48,
    completed: 38,
    avgScore: 78,
    completionRate: 79,
    iconType: 'quality',
  },
  {
    id: 'prog-excel',
    title: 'Advanced Excel for Statisticians',
    source: 'igot',
    learners: 35,
    completed: 27,
    avgScore: 75,
    completionRate: 77,
    iconType: 'excel',
  },
  {
    id: 'prog-sampling',
    title: 'Sampling Techniques',
    source: 'nssta',
    learners: 28,
    completed: 20,
    avgScore: 72,
    completionRate: 71,
    iconType: 'sampling',
  },
  {
    id: 'prog-powerbi',
    title: 'Data Visualization with Power BI',
    source: 'igot',
    learners: 26,
    completed: 18,
    avgScore: 70,
    completionRate: 69,
    iconType: 'powerbi',
  },
]

// Progress chart dataset over time points
const PROGRESS_DATA_BY_PERIOD = {
  'this-month': {
    labels: ['1 May', '8 May', '15 May', '22 May', '29 May'],
    enrolled: [115, 138, 136, 168, 172],
    inProgress: [90, 108, 102, 118, 135],
    completed: [48, 55, 62, 78, 92],
  },
  'last-month': {
    labels: ['1 Apr', '8 Apr', '15 Apr', '22 Apr', '29 Apr'],
    enrolled: [95, 110, 120, 135, 148],
    inProgress: [75, 88, 95, 102, 115],
    completed: [35, 42, 50, 60, 72],
  },
  'this-quarter': {
    labels: ['Mar', 'Apr', 'May', 'Jun'],
    enrolled: [220, 280, 320, 356],
    inProgress: [160, 210, 240, 268],
    completed: [90, 140, 185, 220],
  },
}

// Scheduled sessions
const UPCOMING_SESSIONS = [
  {
    id: 'sess-1',
    day: '03',
    month: 'JUN',
    title: 'Live Session: Data Visualization',
    time: '10:00 AM - 11:30 AM',
    source: 'igot',
    learners: 25,
    roomLink: 'https://meet.gov.in/nssta-dataviz-03',
    agenda: 'Advanced dashboard layouts in Power BI and MoSPI indicator mapping.',
  },
  {
    id: 'sess-2',
    day: '05',
    month: 'JUN',
    title: 'Training: Survey Methodology',
    time: '02:00 PM - 04:00 PM',
    source: 'nssta',
    learners: 32,
    roomLink: 'https://meet.gov.in/nssta-surveymeth-05',
    agenda: 'Two-stage stratified sampling protocol review and variance estimation.',
  },
  {
    id: 'sess-3',
    day: '07',
    month: 'JUN',
    title: 'Live Q&A: Advanced SQL',
    time: '11:00 AM - 12:00 PM',
    source: 'igot',
    learners: 18,
    roomLink: 'https://meet.gov.in/nssta-sql-07',
    agenda: 'Window functions and microdata joins for National Accounts analysis.',
  },
]

export default function TrainerDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // ── Local State ───────────────────────────────────────────────────────────
  const [selectedPeriod, setSelectedPeriod] = useState('this-month')
  const [hoveredDataPoint, setHoveredDataPoint] = useState(null)
  const [selectedSession, setSelectedSession] = useState(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isCreateAssessmentOpen, setIsCreateAssessmentOpen] = useState(false)
  const [isActivitiesOpen, setIsActivitiesOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Form state for Create Assessment modal
  const [newAssessment, setNewAssessment] = useState({
    title: '',
    programme: 'Python for Data Analysis',
    durationMinutes: 30,
    numQuestions: 15,
    passingScore: 70,
    difficulty: 'medium',
  })

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: () => listCourses(),
    staleTime: 60 * 1000,
  })

  const { data: quizzesData } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => listQuizzes(),
    staleTime: 60 * 1000,
  })

  const { data: trainerSummary } = useQuery({
    queryKey: ['trainerSummary'],
    queryFn: () => getTrainerSummary(),
    staleTime: 60 * 1000,
  })

  // Chart data calculations
  const chartData = PROGRESS_DATA_BY_PERIOD[selectedPeriod] || PROGRESS_DATA_BY_PERIOD['this-month']
  const chartWidth = 340
  const chartHeight = 150
  const maxY = 200

  const getPointsString = (dataArr) => {
    const stepX = chartWidth / (dataArr.length - 1)
    return dataArr
      .map((val, idx) => {
        const x = idx * stepX + 10
        const y = chartHeight - (val / maxY) * (chartHeight - 20)
        return `${x},${y}`
      })
      .join(' ')
  }

  const enrolledPoints = useMemo(() => getPointsString(chartData.enrolled), [chartData])
  const inProgressPoints = useMemo(() => getPointsString(chartData.inProgress), [chartData])
  const completedPoints = useMemo(() => getPointsString(chartData.completed), [chartData])

  // Quick Assessment creation submit
  const handleCreateAssessmentSubmit = (e) => {
    e.preventDefault()
    if (!newAssessment.title.trim()) {
      showToast('Please enter an assessment title.')
      return
    }
    setIsCreateAssessmentOpen(false)
    showToast(`Assessment "${newAssessment.title}" created successfully!`)
    navigate('/trainer/assessments')
  }

  return (
    <div className={styles.page}>
      {/* ── Top Header ───────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Trainer Dashboard</h1>
          <p className={styles.subtitle}>
            Welcome back, {user?.name || 'Amit'}! Manage your trainings, learners and track progress.
          </p>
        </div>

        <button
          type="button"
          className={styles.datePickerBadge}
          onClick={() => setIsCalendarOpen(true)}
          title="Change reporting timeframe or view schedule"
        >
          <Calendar size={15} color="#475569" />
          <span>02 June 2026, Tuesday</span>
          <ChevronDown size={14} color="#64748b" />
        </button>
      </div>

      {/* ── 5 Top KPI Cards ──────────────────────────────────────────────── */}
      <div className={styles.statsGrid}>
        {/* Card 1: Total Programmes */}
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIconWrapper} ${styles.iconPurple}`}>
              <BookOpen size={18} strokeWidth={2.4} />
            </div>
            <div className={styles.statBody}>
              <span className={styles.statLabel}>Total Programmes</span>
              <div className={styles.bigStatNumber}>
                {coursesData?.courses?.length || 12}
              </div>
              <div className={styles.statTrend}>
                <TrendingUp size={13} strokeWidth={2.5} />
                <span>2 this month</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className={styles.statLink}
            onClick={() => navigate('/trainer/programmes')}
          >
            View all programmes <ArrowRight size={13} strokeWidth={2.4} />
          </button>
        </div>

        {/* Card 2: Total Learners */}
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIconWrapper} ${styles.iconGreen}`}>
              <Users size={18} strokeWidth={2.4} />
            </div>
            <div className={styles.statBody}>
              <span className={styles.statLabel}>Total Learners</span>
              <div className={styles.bigStatNumber}>356</div>
              <div className={styles.statTrend}>
                <TrendingUp size={13} strokeWidth={2.5} />
                <span>28 this month</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className={styles.statLink}
            onClick={() => navigate('/trainer/learners')}
          >
            View all learners <ArrowRight size={13} strokeWidth={2.4} />
          </button>
        </div>

        {/* Card 3: Training Hours */}
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIconWrapper} ${styles.iconBlue}`}>
              <Clock size={18} strokeWidth={2.4} />
            </div>
            <div className={styles.statBody}>
              <span className={styles.statLabel}>Training Hours</span>
              <div className={styles.bigStatNumber}>128.5 hrs</div>
              <div className={styles.statTrend}>
                <TrendingUp size={13} strokeWidth={2.5} />
                <span>15% this month</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className={styles.statLink}
            onClick={() => navigate('/trainer/analytics')}
          >
            View analytics <ArrowRight size={13} strokeWidth={2.4} />
          </button>
        </div>

        {/* Card 4: Assessments Created */}
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIconWrapper} ${styles.iconOrange}`}>
              <ClipboardList size={18} strokeWidth={2.4} />
            </div>
            <div className={styles.statBody}>
              <span className={styles.statLabel}>Assessments Created</span>
              <div className={styles.bigStatNumber}>
                {quizzesData?.quizzes?.length || 24}
              </div>
              <div className={styles.statTrend}>
                <TrendingUp size={13} strokeWidth={2.5} />
                <span>6 this month</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className={styles.statLink}
            onClick={() => navigate('/trainer/assessments')}
          >
            View assessments <ArrowRight size={13} strokeWidth={2.4} />
          </button>
        </div>

        {/* Card 5: Avg. Learner Score */}
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIconWrapper} ${styles.iconViolet}`}>
              <Shield size={18} strokeWidth={2.4} />
            </div>
            <div className={styles.statBody}>
              <span className={styles.statLabel}>Avg. Learner Score</span>
              <div className={styles.bigStatNumber}>76%</div>
              <div className={styles.statTrend}>
                <TrendingUp size={13} strokeWidth={2.5} />
                <span>8% this month</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className={styles.statLink}
            onClick={() => navigate('/trainer/analytics')}
          >
            View results <ArrowRight size={13} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* ── Middle Row ───────────────────────────────────────────────────── */}
      <div className={styles.middleRow}>
        {/* Left: Training Overview Card */}
        <div className={styles.trainingOverviewCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Training Overview</h3>
            <select
              className={styles.periodSelect}
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="this-quarter">This Quarter</option>
            </select>
          </div>

          <div className={styles.overviewSplit}>
            {/* Sub-left: Programme Progress Line Chart */}
            <div className={styles.progressChartArea}>
              <div className={styles.chartSubheader}>
                <h4 className={styles.chartTitle}>Programme Progress</h4>
                <div className={styles.chartLegend}>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: '#6366f1' }} />
                    <span>Enrolled</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: '#3b82f6' }} />
                    <span>In Progress</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: '#10b981' }} />
                    <span>Completed</span>
                  </div>
                </div>
              </div>

              <div className={styles.chartContainer}>
                <svg
                  viewBox={`0 0 ${chartWidth + 30} ${chartHeight + 25}`}
                  className={styles.chartSvg}
                >
                  <defs>
                    <linearGradient id="gradEnrolled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines & Y labels */}
                  {[0, 50, 100, 150, 200].map((yVal) => {
                    const y = chartHeight - (yVal / maxY) * (chartHeight - 20)
                    return (
                      <g key={yVal}>
                        <line
                          x1="28"
                          y1={y}
                          x2={chartWidth + 20}
                          y2={y}
                          stroke="#f1f5f9"
                          strokeDasharray="3 3"
                        />
                        <text
                          x="0"
                          y={y + 4}
                          fontSize="10"
                          fill="#94a3b8"
                          fontWeight="500"
                        >
                          {yVal}
                        </text>
                      </g>
                    )
                  })}

                  {/* Lines */}
                  <polyline
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={enrolledPoints}
                  />
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={inProgressPoints}
                  />
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={completedPoints}
                  />

                  {/* Data Points */}
                  {chartData.labels.map((lbl, idx) => {
                    const stepX = chartWidth / (chartData.labels.length - 1)
                    const x = idx * stepX + 10
                    const yEnrolled = chartHeight - (chartData.enrolled[idx] / maxY) * (chartHeight - 20)
                    const yProgress = chartHeight - (chartData.inProgress[idx] / maxY) * (chartHeight - 20)
                    const yDone = chartHeight - (chartData.completed[idx] / maxY) * (chartHeight - 20)

                    return (
                      <g key={idx}>
                        {/* X-axis labels */}
                        <text
                          x={x}
                          y={chartHeight + 18}
                          fontSize="10"
                          fill="#64748b"
                          textAnchor="middle"
                          fontWeight="500"
                        >
                          {lbl}
                        </text>

                        {/* Interactive dots */}
                        <circle
                          cx={x}
                          cy={yEnrolled}
                          r="3.5"
                          fill="#ffffff"
                          stroke="#6366f1"
                          strokeWidth="2"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() =>
                            setHoveredDataPoint({
                              label: lbl,
                              type: 'Enrolled',
                              value: chartData.enrolled[idx],
                              x,
                              y: yEnrolled,
                            })
                          }
                          onMouseLeave={() => setHoveredDataPoint(null)}
                        />
                        <circle
                          cx={x}
                          cy={yProgress}
                          r="3.5"
                          fill="#ffffff"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() =>
                            setHoveredDataPoint({
                              label: lbl,
                              type: 'In Progress',
                              value: chartData.inProgress[idx],
                              x,
                              y: yProgress,
                            })
                          }
                          onMouseLeave={() => setHoveredDataPoint(null)}
                        />
                        <circle
                          cx={x}
                          cy={yDone}
                          r="3.5"
                          fill="#ffffff"
                          stroke="#10b981"
                          strokeWidth="2"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() =>
                            setHoveredDataPoint({
                              label: lbl,
                              type: 'Completed',
                              value: chartData.completed[idx],
                              x,
                              y: yDone,
                            })
                          }
                          onMouseLeave={() => setHoveredDataPoint(null)}
                        />
                      </g>
                    )
                  })}
                </svg>

                {/* Tooltip on hover */}
                {hoveredDataPoint && (
                  <div
                    className={styles.chartTooltip}
                    style={{
                      left: `${(hoveredDataPoint.x / (chartWidth + 30)) * 100}%`,
                      top: `${(hoveredDataPoint.y / (chartHeight + 25)) * 100}%`,
                    }}
                  >
                    <strong>{hoveredDataPoint.label}</strong>: {hoveredDataPoint.value} {hoveredDataPoint.type}
                  </div>
                )}
              </div>
            </div>

            {/* Sub-right: Top Performing Programmes Mini List */}
            <div className={styles.overviewTopProgrammes}>
              <h4 className={styles.chartTitle}>Top Performing Programmes</h4>
              <div className={styles.miniProgrammeList}>
                {TOP_PROGRAMMES_DATA.slice(0, 4).map((prog) => (
                  <div key={prog.id} className={styles.miniProgrammeItem}>
                    <div className={styles.miniProgrammeLeft}>
                      <div
                        className={`${styles.programmeIconBox} ${
                          prog.iconType === 'python'
                            ? styles.boxPython
                            : prog.iconType === 'quality'
                            ? styles.boxQuality
                            : prog.iconType === 'excel'
                            ? styles.boxExcel
                            : styles.boxSampling
                        }`}
                      >
                        {prog.iconType === 'python' && '🐍'}
                        {prog.iconType === 'quality' && '📊'}
                        {prog.iconType === 'excel' && '📈'}
                        {prog.iconType === 'sampling' && '🎯'}
                      </div>
                      <div className={styles.miniProgrammeMeta}>
                        <div className={styles.miniProgrammeTitleRow}>
                          <span className={styles.miniProgrammeTitle} title={prog.title}>
                            {prog.title}
                          </span>
                          <span
                            className={`${styles.sourceBadgeSmall} ${
                              prog.source === 'igot'
                                ? styles.sourceBadgeIgot
                                : styles.sourceBadgeNssta
                            }`}
                          >
                            {prog.source === 'igot' ? 'iGOT' : 'NSSTA/TPAC'}
                          </span>
                        </div>
                        <span className={styles.miniProgrammeLearners}>
                          {prog.learners} Learners
                        </span>
                      </div>
                    </div>

                    <div className={styles.miniProgrammeScore}>
                      <div className={styles.scoreVal}>{prog.avgScore}%</div>
                      <span className={styles.scoreLabel}>Avg. Score</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className={styles.viewFullLink}
                onClick={() => navigate('/trainer/analytics')}
              >
                View full analytics <ArrowRight size={13} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Stack: Upcoming Sessions & Recent Activities */}
        <div className={styles.rightStack}>
          {/* Card 1: Upcoming Sessions */}
          <div className={styles.sideCard}>
            <div className={styles.sideCardHeader}>
              <h3 className={styles.sideCardTitle}>Upcoming Sessions</h3>
              <button
                type="button"
                className={styles.sideCardLink}
                onClick={() => setIsCalendarOpen(true)}
              >
                View Calendar <ArrowRight size={12} strokeWidth={2.4} />
              </button>
            </div>

            <div className={styles.sessionsList}>
              {UPCOMING_SESSIONS.map((sess) => (
                <div
                  key={sess.id}
                  className={styles.sessionItem}
                  onClick={() => setSelectedSession(sess)}
                  title="Click to view session room and details"
                >
                  <div className={styles.sessionLeft}>
                    <div className={styles.dateBlock}>
                      <span className={styles.dateDay}>{sess.day}</span>
                      <span className={styles.dateMonth}>{sess.month}</span>
                    </div>
                    <div className={styles.sessionDetails}>
                      <span className={styles.sessionTitle} title={sess.title}>
                        {sess.title}
                      </span>
                      <div className={styles.sessionTimeRow}>
                        <span>{sess.time}</span>
                        <span
                          className={`${styles.sourceBadgeSmall} ${
                            sess.source === 'igot'
                              ? styles.sourceBadgeIgot
                              : styles.sourceBadgeNssta
                          }`}
                        >
                          {sess.source === 'igot' ? 'iGOT' : 'NSSTA/TPAC'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.sessionRight}>
                    {sess.learners} Learners
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Recent Activities */}
          <div className={styles.sideCard}>
            <div className={styles.sideCardHeader}>
              <h3 className={styles.sideCardTitle}>Recent Activities</h3>
              <button
                type="button"
                className={styles.sideCardLink}
                onClick={() => setIsActivitiesOpen(true)}
              >
                View All <ArrowRight size={12} strokeWidth={2.4} />
              </button>
            </div>

            <div className={styles.activitiesList}>
              <div className={styles.activityItem}>
                <div
                  className={styles.activityIconCircle}
                  style={{ background: '#f5f3ff', color: '#6366f1' }}
                >
                  <UploadCloud size={15} strokeWidth={2.4} />
                </div>
                <div className={styles.activityBody}>
                  <span className={styles.activityText}>
                    You uploaded new material "<strong>Probability Basics.pdf</strong>"
                  </span>
                  <span className={styles.activityTime}>2 Jun 2026, 10:15 AM</span>
                </div>
              </div>

              <div className={styles.activityItem}>
                <div
                  className={styles.activityIconCircle}
                  style={{ background: '#f0fdf4', color: '#10b981' }}
                >
                  <Sparkles size={15} strokeWidth={2.4} />
                </div>
                <div className={styles.activityBody}>
                  <span className={styles.activityText}>
                    AI generated 25 MCQs for "<strong>Data Cleaning Techniques</strong>"
                  </span>
                  <span className={styles.activityTime}>2 Jun 2026, 09:40 AM</span>
                </div>
              </div>

              <div className={styles.activityItem}>
                <div
                  className={styles.activityIconCircle}
                  style={{ background: '#fff7ed', color: '#f97316' }}
                >
                  <BarChart3 size={15} strokeWidth={2.4} />
                </div>
                <div className={styles.activityBody}>
                  <span className={styles.activityText}>
                    Assessment "<strong>Python Quiz 1</strong>" completed by 28 learners
                  </span>
                  <span className={styles.activityTime}>1 Jun 2026, 04:30 PM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Row (3 Columns) ───────────────────────────────────────── */}
      <div className={styles.bottomRow}>
        {/* Bottom Col 1: Top Performing Programmes Table */}
        <div className={styles.bottomCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Top Performing Programmes</h3>
            <button
              type="button"
              className={styles.sideCardLink}
              onClick={() => navigate('/trainer/programmes')}
            >
              View All <ArrowRight size={12} strokeWidth={2.4} />
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.progTable}>
              <thead>
                <tr>
                  <th>Programme</th>
                  <th>Enrolled</th>
                  <th>Completed</th>
                  <th>Avg. Score</th>
                  <th>Completion Rate</th>
                </tr>
              </thead>
              <tbody>
                {TOP_PROGRAMMES_DATA.map((prog) => (
                  <tr key={prog.id}>
                    <td>
                      <div className={styles.tableProgCell}>
                        <span className={styles.tableProgTitle} title={prog.title}>
                          {prog.title}
                        </span>
                        <span
                          className={`${styles.sourceBadgeSmall} ${
                            prog.source === 'igot'
                              ? styles.sourceBadgeIgot
                              : styles.sourceBadgeNssta
                          }`}
                        >
                          {prog.source === 'igot' ? 'iGOT' : 'NSSTA/TPAC'}
                        </span>
                      </div>
                    </td>
                    <td>{prog.learners}</td>
                    <td>{prog.completed}</td>
                    <td>
                      <strong>{prog.avgScore}%</strong>
                    </td>
                    <td>
                      <div className={styles.rateCell}>
                        <div className={styles.rateBarBg}>
                          <div
                            className={styles.rateBarFill}
                            style={{ width: `${prog.completionRate}%` }}
                          />
                        </div>
                        <span>{prog.completionRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Col 2: Assessment Overview Donut Chart */}
        <div className={styles.bottomCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Assessment Overview</h3>
          </div>

          <div className={styles.donutArea}>
            <div className={styles.donutSvgWrapper}>
              <svg viewBox="0 0 100 100" className={styles.donutSvg}>
                {/* Circumference = 2 * PI * 38 ≈ 238.76 */}
                {/* Slices: Excellent 38% (90.7), Good 42% (100.3), Average 15% (35.8), Needs Improvement 5% (11.9) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#e2e8f0"
                  strokeWidth="12"
                />
                {/* Needs Improvement: 5% (offset: 0) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#ef4444"
                  strokeWidth="12"
                  strokeDasharray="11.9 226.86"
                  strokeDashoffset="0"
                />
                {/* Average: 15% (offset: -11.9) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#f59e0b"
                  strokeWidth="12"
                  strokeDasharray="35.8 202.96"
                  strokeDashoffset="-11.9"
                />
                {/* Good: 42% (offset: -47.7) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#3b82f6"
                  strokeWidth="12"
                  strokeDasharray="100.3 138.46"
                  strokeDashoffset="-47.7"
                />
                {/* Excellent: 38% (offset: -148) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray="90.7 148.06"
                  strokeDashoffset="-148"
                />
              </svg>
              <div className={styles.donutCenterText}>
                <div className={styles.donutCenterLabel}>Total</div>
                <div className={styles.donutCenterNum}>24</div>
                <div className={styles.donutCenterLabel}>Assessments</div>
              </div>
            </div>

            <div className={styles.donutLegend}>
              <div className={styles.donutLegendItem}>
                <div className={styles.donutLegendLeft}>
                  <span className={styles.donutSquare} style={{ background: '#10b981' }} />
                  <span>Excellent (80-100%)</span>
                </div>
                <span className={styles.donutPct}>38%</span>
              </div>

              <div className={styles.donutLegendItem}>
                <div className={styles.donutLegendLeft}>
                  <span className={styles.donutSquare} style={{ background: '#3b82f6' }} />
                  <span>Good (60-79%)</span>
                </div>
                <span className={styles.donutPct}>42%</span>
              </div>

              <div className={styles.donutLegendItem}>
                <div className={styles.donutLegendLeft}>
                  <span className={styles.donutSquare} style={{ background: '#f59e0b' }} />
                  <span>Average (40-59%)</span>
                </div>
                <span className={styles.donutPct}>15%</span>
              </div>

              <div className={styles.donutLegendItem}>
                <div className={styles.donutLegendLeft}>
                  <span className={styles.donutSquare} style={{ background: '#ef4444' }} />
                  <span>Needs Improvement (&lt;40%)</span>
                </div>
                <span className={styles.donutPct}>5%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Col 3: Quick Actions (2x3 Grid) */}
        <div className={styles.bottomCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Quick Actions</h3>
          </div>

          <div className={styles.quickActionsGrid}>
            <Link to="/trainer/upload" className={styles.actionBtn}>
              <div className={styles.actionIconBox} style={{ background: '#eff6ff', color: '#3b82f6' }}>
                <UploadCloud size={16} strokeWidth={2.4} />
              </div>
              <span>Upload Material</span>
            </Link>

            <Link to="/trainer/mcq-generator" className={styles.actionBtn}>
              <div className={styles.actionIconBox} style={{ background: '#faf5ff', color: '#8b5cf6' }}>
                <Sparkles size={16} strokeWidth={2.4} />
              </div>
              <span>AI MCQ Generator</span>
            </Link>

            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => setIsCreateAssessmentOpen(true)}
            >
              <div className={styles.actionIconBox} style={{ background: '#f0fdf4', color: '#16a34a' }}>
                <CheckCircle size={16} strokeWidth={2.4} />
              </div>
              <span>Create Assessment</span>
            </button>

            <Link to="/trainer/question-bank" className={styles.actionBtn}>
              <div className={styles.actionIconBox} style={{ background: '#eff6ff', color: '#6366f1' }}>
                <BookOpen size={16} strokeWidth={2.4} />
              </div>
              <span>View Question Bank</span>
            </Link>

            <Link to="/trainer/learners" className={styles.actionBtn}>
              <div className={styles.actionIconBox} style={{ background: '#eff6ff', color: '#3b82f6' }}>
                <Users size={16} strokeWidth={2.4} />
              </div>
              <span>View Learners</span>
            </Link>

            <Link to="/trainer/analytics" className={styles.actionBtn}>
              <div className={styles.actionIconBox} style={{ background: '#faf5ff', color: '#8b5cf6' }}>
                <BarChart3 size={16} strokeWidth={2.4} />
              </div>
              <span>Results & Analytics</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Modal 1: Create Assessment Quick Modal ───────────────────────── */}
      {isCreateAssessmentOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsCreateAssessmentOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create New Assessment</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsCreateAssessmentOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAssessmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Assessment Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Statistical Sampling & Estimation Quiz 02"
                  value={newAssessment.title}
                  onChange={(e) => setNewAssessment({ ...newAssessment, title: e.target.value })}
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Associated Programme
                </label>
                <select
                  value={newAssessment.programme}
                  onChange={(e) => setNewAssessment({ ...newAssessment, programme: e.target.value })}
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  <option value="Python for Data Analysis">Python for Data Analysis [iGOT]</option>
                  <option value="Official Statistics & Data Quality">Official Statistics & Data Quality [NSSTA/TPAC]</option>
                  <option value="Advanced Excel for Statisticians">Advanced Excel for Statisticians [iGOT]</option>
                  <option value="Sampling Techniques">Sampling Techniques [NSSTA/TPAC]</option>
                  <option value="Data Visualization with Power BI">Data Visualization with Power BI [iGOT]</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="180"
                    value={newAssessment.durationMinutes}
                    onChange={(e) => setNewAssessment({ ...newAssessment, durationMinutes: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                    Passing Score (%)
                  </label>
                  <input
                    type="number"
                    min="40"
                    max="100"
                    value={newAssessment.passingScore}
                    onChange={(e) => setNewAssessment({ ...newAssessment, passingScore: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsCreateAssessmentOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  style={{
                    padding: '9px 16px',
                    background: '#ffffff',
                    border: '1.5px solid #6366f1',
                    borderRadius: 8,
                    color: '#4f46e5',
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setIsCreateAssessmentOpen(false)
                    navigate('/trainer/quiz-builder')
                  }}
                >
                  Open AI Quiz Builder →
                </button>
                <button type="submit" className={styles.saveBtn}>
                  Save Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2: Session Details & Virtual Room ──────────────────────── */}
      {selectedSession && (
        <div className={styles.modalOverlay} onClick={() => setSelectedSession(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase' }}>
                  {selectedSession.source === 'igot' ? 'iGOT Karmayogi Live Session' : 'NSSTA Training Academy'}
                </span>
                <h3 className={styles.modalTitle} style={{ marginTop: 2 }}>
                  {selectedSession.title}
                </h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setSelectedSession(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>
                    📅 {selectedSession.day} {selectedSession.month} 2026 • ⏰ {selectedSession.time}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>
                    {selectedSession.learners} Officers Enrolled
                  </span>
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                  {selectedSession.agenda}
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: 13.5, fontWeight: 700, margin: '0 0 6px 0', color: '#1e293b' }}>
                  Training Materials &amp; Pre-Readings
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#334155', padding: '6px 10px', background: '#f1f5f9', borderRadius: 6 }}>
                    <span>📄 Session_Deck_v2.pdf</span>
                    <span style={{ color: '#64748b' }}>2.4 MB</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#334155', padding: '6px 10px', background: '#f1f5f9', borderRadius: 6 }}>
                    <span>📊 Sample_Survey_Microdata.csv</span>
                    <span style={{ color: '#64748b' }}>1.1 MB</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setSelectedSession(null)}
              >
                Close
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={() => {
                  window.open(selectedSession.roomLink, '_blank')
                  showToast('Connecting to official secure virtual training room...')
                  setSelectedSession(null)
                }}
              >
                Join Live Session Now →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 3: Calendar Schedule View ───────────────────────────────── */}
      {isCalendarOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsCalendarOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Faculty Training Calendar • June 2026</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsCalendarOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#64748b', paddingBottom: 6 }}>
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, textAlign: 'center', fontSize: 12 }}>
                {[31, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30].map((d, i) => {
                  const isSessionDay = d === 3 || d === 5 || d === 7
                  const isToday = d === 2
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '10px 4px',
                        borderRadius: 8,
                        background: isToday ? '#eff6ff' : isSessionDay ? '#f5f3ff' : '#f8fafc',
                        border: isToday ? '1.5px solid #3b82f6' : isSessionDay ? '1.5px solid #8b5cf6' : '1px solid #f1f5f9',
                        color: isToday ? '#1d4ed8' : isSessionDay ? '#6d28d9' : '#334155',
                        fontWeight: isToday || isSessionDay ? 700 : 500,
                        cursor: isSessionDay ? 'pointer' : 'default',
                      }}
                      onClick={() => {
                        if (isSessionDay) {
                          const sess = UPCOMING_SESSIONS.find((s) => Number(s.day) === d)
                          if (sess) setSelectedSession(sess)
                        }
                      }}
                    >
                      {d}
                      {isSessionDay && (
                        <div style={{ fontSize: 9, color: '#7c3aed', marginTop: 2 }}>Session</div>
                      )}
                      {isToday && (
                        <div style={{ fontSize: 9, color: '#2563eb', marginTop: 2 }}>Today</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={() => setIsCalendarOpen(false)}
              >
                Close Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 4: Recent Activities Drawer/Modal ──────────────────────── */}
      {isActivitiesOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsActivitiesOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Recent Faculty Activity Log</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsActivitiesOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { title: 'Uploaded new material "Probability Basics.pdf"', time: '2 Jun 2026, 10:15 AM', type: 'upload' },
                { title: 'AI generated 25 MCQs for "Data Cleaning Techniques"', time: '2 Jun 2026, 09:40 AM', type: 'ai' },
                { title: 'Assessment "Python Quiz 1" completed by 28 learners', time: '1 Jun 2026, 04:30 PM', type: 'assessment' },
                { title: 'Published updated curriculum for "Official Statistics & Data Quality"', time: '30 May 2026, 02:15 PM', type: 'programme' },
                { title: 'Conducted live evaluation for 35 JSO probationers at NSSTA', time: '28 May 2026, 11:00 AM', type: 'session' },
              ].map((act, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', marginTop: 6 }} />
                  <div>
                    <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{act.title}</div>
                    <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>{act.time}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={() => setIsActivitiesOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ───────────────────────────────────────────── */}
      {toastMessage && (
        <div className={styles.toast}>
          <CheckCircle size={18} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
