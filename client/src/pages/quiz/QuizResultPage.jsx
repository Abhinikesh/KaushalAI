import { useState, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  FileText,
  Download,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check,
  X,
  Compass,
  Rocket,
  AlertCircle,
  BarChart3,
  BookOpen,
} from 'lucide-react'
import styles from './QuizResultPage.module.css'

// Curated authentic quiz result data matching official statistics curriculum
const SECTION_PERFORMANCE = [
  {
    id: 1,
    title: '1. Data Handling & Exploration',
    total: 10,
    correct: 9,
    score: '9 / 10',
    accuracy: 90,
  },
  {
    id: 2,
    title: '2. Data Analysis',
    total: 10,
    correct: 8,
    score: '8 / 10',
    accuracy: 80,
  },
  {
    id: 3,
    title: '3. Data Visualization',
    total: 5,
    correct: 4,
    score: '4 / 5',
    accuracy: 80,
  },
  {
    id: 4,
    title: '4. Interpretation & Insights',
    total: 5,
    correct: 4,
    score: '4 / 5',
    accuracy: 80,
  },
]

const TOPIC_ANALYSIS = [
  {
    name: 'Pandas Basics',
    color: '#10b981',
    total: 10,
    correct: 8,
    incorrect: 1,
    unattempted: 1,
    accuracy: 89,
    pct: 33.3,
  },
  {
    name: 'Data Cleaning',
    color: '#3b82f6',
    total: 8,
    correct: 6,
    incorrect: 2,
    unattempted: 0,
    accuracy: 75,
    pct: 26.7,
  },
  {
    name: 'Data Visualization',
    color: '#f59e0b',
    total: 5,
    correct: 4,
    incorrect: 1,
    unattempted: 0,
    accuracy: 80,
    pct: 16.7,
  },
  {
    name: 'Descriptive Statistics',
    color: '#ef4444',
    total: 8,
    correct: 7,
    incorrect: 1,
    unattempted: 0,
    accuracy: 88,
    pct: 20.0,
  },
  {
    name: 'Data Interpretation',
    color: '#8b5cf6',
    total: 1,
    correct: 0,
    incorrect: 1,
    unattempted: 0,
    accuracy: 0,
    pct: 3.3,
  },
]

const INCORRECT_QUESTIONS = [
  {
    id: 'q-7',
    qNum: 'Q7',
    type: 'Multiple Choice (Single Answer)',
    statement: 'Which function is used in Pandas to group data by one or more columns?',
    yourAnswer: 'A. groupby()',
    correctAnswer: 'B. groupby()',
    topic: 'Data Grouping',
    difficulty: 'Intermediate',
    rationale:
      'In Python Pandas, `df.groupby()` is the official method for splitting datasets into groups based on specified criteria, applying aggregation functions (e.g. mean, sum, count), and combining results for survey stratification.',
    options: [
      { key: 'A', text: 'group()', isCorrect: false },
      { key: 'B', text: 'groupby()', isCorrect: true },
      { key: 'C', text: 'aggregate_by()', isCorrect: false },
      { key: 'D', text: 'cluster()', isCorrect: false },
    ],
  },
  {
    id: 'q-12',
    qNum: 'Q12',
    type: 'Multiple Choice (Single Answer)',
    statement: 'When screening survey microdata for outliers, which statistical measure is least affected by extreme values?',
    yourAnswer: 'C. Arithmetic Mean',
    correctAnswer: 'A. Median / Interquartile Range (IQR)',
    topic: 'Data Cleaning',
    difficulty: 'Intermediate',
    rationale:
      'The Median and Interquartile Range (IQR) are robust non-parametric estimators resistant to severe outlier contamination, unlike the arithmetic mean and standard deviation which are sensitive to skewness.',
    options: [
      { key: 'A', text: 'Median / Interquartile Range (IQR)', isCorrect: true },
      { key: 'B', text: 'Standard Deviation', isCorrect: false },
      { key: 'C', text: 'Arithmetic Mean', isCorrect: false },
      { key: 'D', text: 'Variance', isCorrect: false },
    ],
  },
  {
    id: 'q-18',
    qNum: 'Q18',
    type: 'Multiple Choice (Single Answer)',
    statement: 'In two-stage cluster sampling, what is the design effect (DEFF) representing?',
    yourAnswer: 'D. The ratio of sample cost to total census cost',
    correctAnswer: 'B. The ratio of the variance under cluster sampling to that under simple random sampling (SRS)',
    topic: 'Survey Sampling',
    difficulty: 'Hard',
    rationale:
      'DEFF = Var(complex) / Var(SRS). It quantifies the inflation in standard errors resulting from intra-cluster correlation among respondents in the same primary sampling unit.',
    options: [
      { key: 'A', text: 'The percentage of non-response in urban sample clusters', isCorrect: false },
      { key: 'B', text: 'The ratio of the variance under cluster sampling to that under simple random sampling (SRS)', isCorrect: true },
      { key: 'C', text: 'The optimal number of households selected per PSU', isCorrect: false },
      { key: 'D', text: 'The ratio of sample cost to total census cost', isCorrect: false },
    ],
  },
  {
    id: 'q-22',
    qNum: 'Q22',
    type: 'Multiple Choice (Single Answer)',
    statement: 'Which Seaborn visualization technique is best suited to display both the probability density and summary quartiles of household expenditure?',
    yourAnswer: 'B. sns.scatterplot()',
    correctAnswer: 'C. sns.violinplot()',
    topic: 'Data Visualization',
    difficulty: 'Intermediate',
    rationale:
      'A violin plot combines a standard box-and-whisker plot with a rotated kernel density estimate (KDE) on each side, showing multi-modal distribution characteristics and median marks simultaneously.',
    options: [
      { key: 'A', text: 'sns.heatmap()', isCorrect: false },
      { key: 'B', text: 'sns.scatterplot()', isCorrect: false },
      { key: 'C', text: 'sns.violinplot()', isCorrect: true },
      { key: 'D', text: 'sns.lineplot()', isCorrect: false },
    ],
  },
  {
    id: 'q-29',
    qNum: 'Q29',
    type: 'Multiple Choice (Single Answer)',
    statement: 'How is the Consumer Price Index (CPI) inflation rate calculated between two periods?',
    yourAnswer: 'A. (CPI_current + CPI_previous) / 2',
    correctAnswer: 'D. ((CPI_current - CPI_previous) / CPI_previous) * 100',
    topic: 'Data Interpretation',
    difficulty: 'Easy',
    rationale:
      'The headline inflation rate represents the percentage change in the index: ((CPI_t - CPI_t-1) / CPI_t-1) * 100, reflecting the rate of price changes over the designated interval.',
    options: [
      { key: 'A', text: '(CPI_current + CPI_previous) / 2', isCorrect: false },
      { key: 'B', text: 'CPI_current / 100', isCorrect: false },
      { key: 'C', text: 'CPI_current - CPI_previous', isCorrect: false },
      { key: 'D', text: '((CPI_current - CPI_previous) / CPI_previous) * 100', isCorrect: true },
    ],
  },
]

export default function QuizResultPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  // ── State ─────────────────────────────────────────────────────────────────
  const [expandedQuestionId, setExpandedQuestionId] = useState('q-7')
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [reviewFilter, setReviewFilter] = useState('all') // 'all', 'correct', 'incorrect'

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleExpand = (qId) => {
    setExpandedQuestionId((prev) => (prev === qId ? null : qId))
  }

  const handleDownloadResult = () => {
    window.print()
  }

  return (
    <div className={styles.page}>
      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <div className={styles.breadcrumb}>
        <Link to="/dashboard" className={styles.breadcrumbLink}>
          Dashboard
        </Link>
        <span className={styles.breadcrumbSep}>&gt;</span>
        <Link to="/quizzes" className={styles.breadcrumbLink}>
          Assessments &amp; Quizzes
        </Link>
        <span className={styles.breadcrumbSep}>&gt;</span>
        <span className={styles.breadcrumbCurrent}>Quiz Result</span>
      </div>

      {/* ── Top Header ───────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Quiz Result</h1>
            <span className={styles.completedBadge}>Completed</span>
          </div>
          <p className={styles.subtitle}>
            Great effort! Review your performance and improve your knowledge.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.reviewAnswersBtn}
            onClick={() => setIsReviewModalOpen(true)}
          >
            <FileText size={16} />
            Review Answers
          </button>

          <button
            type="button"
            className={styles.downloadResultBtn}
            onClick={handleDownloadResult}
          >
            <Download size={16} />
            Download Result
          </button>
        </div>
      </div>

      {/* ── 4 Top KPI Cards ──────────────────────────────────────────────── */}
      <div className={styles.statsGrid}>
        {/* Card 1: Your Score */}
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.iconGreen}`}>
            <Trophy size={24} strokeWidth={2.4} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statLabel}>Your Score</span>
            <div className={styles.bigStatNumber}>84%</div>
            <span className={styles.statSubtext}>25 out of 30 Marks</span>
          </div>
        </div>

        {/* Card 2: Passing Marks */}
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.iconBlue}`}>
            <CheckCircle2 size={24} strokeWidth={2.4} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statLabel}>Passing Marks</span>
            <div className={styles.bigStatNumber}>60%</div>
            <span className={styles.statSubtext}>18 out of 30 Marks</span>
          </div>
        </div>

        {/* Card 3: Rank / Percentile */}
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.iconOrange}`}>
            <Target size={24} strokeWidth={2.4} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statLabel}>Rank / Percentile</span>
            <div className={styles.bigStatNumber}>Top 18%</div>
            <span className={styles.statSubtext}>You performed better than 82% of learners</span>
          </div>
        </div>

        {/* Card 4: Time Taken */}
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.iconPurple}`}>
            <Clock size={24} strokeWidth={2.4} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statLabel}>Time Taken</span>
            <div className={styles.bigStatNumber}>18m 42s</div>
            <span className={styles.statSubtext}>Total Time: 30m 00s</span>
          </div>
        </div>
      </div>

      {/* ── Main Layout: 2 Columns ───────────────────────────────────────── */}
      <div className={styles.mainLayout}>
        {/* Left Column: Section, Topic, and Incorrect Reviews */}
        <div className={styles.leftColumn}>
          {/* Card 1: Section-wise Performance */}
          <div className={styles.contentCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Section-wise Performance</h3>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.perfTable}>
                <thead>
                  <tr>
                    <th>Section</th>
                    <th>Total Questions</th>
                    <th>Correct</th>
                    <th>Score</th>
                    <th>Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {SECTION_PERFORMANCE.map((sec) => (
                    <tr key={sec.id}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{sec.title}</td>
                      <td>{sec.total}</td>
                      <td style={{ color: '#16a34a', fontWeight: 600 }}>{sec.correct}</td>
                      <td>{sec.score}</td>
                      <td>
                        <div className={styles.progressBarCell}>
                          <span style={{ fontWeight: 600, width: 34 }}>{sec.accuracy}%</span>
                          <div className={styles.tableProgressBarBg}>
                            <div
                              className={styles.tableProgressBarFill}
                              style={{ width: `${sec.accuracy}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 2: Topic-wise Analysis */}
          <div className={styles.contentCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Topic-wise Analysis</h3>
            </div>

            <div className={styles.topicSplit}>
              {/* Donut Chart */}
              <div className={styles.donutWrapper}>
                <svg viewBox="0 0 100 100" className={styles.donutSvg}>
                  {/* Circumference = 2 * PI * 38 ≈ 238.76 */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth="14"
                  />
                  {/* Pandas Basics (33.3% ≈ 79.5) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#10b981"
                    strokeWidth="14"
                    strokeDasharray="79.5 159.2"
                    strokeDashoffset="0"
                  />
                  {/* Data Cleaning (26.7% ≈ 63.7) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#3b82f6"
                    strokeWidth="14"
                    strokeDasharray="63.7 175"
                    strokeDashoffset="-79.5"
                  />
                  {/* Data Visualization (16.7% ≈ 39.8) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#f59e0b"
                    strokeWidth="14"
                    strokeDasharray="39.8 198.9"
                    strokeDashoffset="-143.2"
                  />
                  {/* Descriptive Statistics (20% ≈ 47.7) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#ef4444"
                    strokeWidth="14"
                    strokeDasharray="47.7 191"
                    strokeDashoffset="-183"
                  />
                  {/* Data Interpretation (3.3% ≈ 7.9) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#8b5cf6"
                    strokeWidth="14"
                    strokeDasharray="7.9 230.8"
                    strokeDashoffset="-230.7"
                  />
                </svg>
                <div className={styles.donutCenter}>
                  <div className={styles.donutNumber}>30</div>
                  <div className={styles.donutLabel}>Total Questions</div>
                </div>
              </div>

              {/* Topics Table */}
              <div className={styles.tableWrapper}>
                <table className={styles.perfTable}>
                  <thead>
                    <tr>
                      <th>Topics</th>
                      <th>Correct</th>
                      <th>Incorrect</th>
                      <th>Unattempted</th>
                      <th>Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TOPIC_ANALYSIS.map((top) => (
                      <tr key={top.name}>
                        <td>
                          <span
                            className={styles.topicDot}
                            style={{ background: top.color }}
                          />
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{top.name}</span>
                        </td>
                        <td>{top.correct}</td>
                        <td>{top.incorrect}</td>
                        <td>{top.unattempted}</td>
                        <td>
                          <div className={styles.progressBarCell}>
                            <span style={{ fontWeight: 600, width: 32 }}>{top.accuracy}%</span>
                            <div className={styles.tableProgressBarBg} style={{ width: 80 }}>
                              <div
                                className={styles.tableProgressBarFill}
                                style={{
                                  width: `${top.accuracy}%`,
                                  background: top.accuracy > 0 ? '#10b981' : '#cbd5e1',
                                }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Card 3: Review Your Incorrect Answers (5) */}
          <div className={styles.contentCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Review Your Incorrect Answers (5)</h3>
              <button
                type="button"
                className={styles.cardHeaderLink}
                onClick={() => setIsReviewModalOpen(true)}
              >
                View All Questions <ArrowRight size={13} strokeWidth={2.4} />
              </button>
            </div>

            <div className={styles.incorrectList}>
              {INCORRECT_QUESTIONS.map((q) => {
                const isExpanded = expandedQuestionId === q.id
                return (
                  <div key={q.id} className={styles.questionItem}>
                    <div className={styles.questionItemTop}>
                      <div className={styles.qBadgeCircle}>{q.qNum}</div>

                      <div className={styles.qMainBody}>
                        <span className={styles.qTypeRed}>{q.type}</span>
                        <p className={styles.qStatement}>{q.statement}</p>

                        <div className={styles.qAnswersRow}>
                          <span>
                            Your Answer:{' '}
                            <span className={styles.yourAnswerWrong}>
                              {q.yourAnswer} <X size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> Incorrect
                            </span>
                          </span>
                          <span>
                            Correct Answer:{' '}
                            <span className={styles.correctAnswerGreen}>
                              {q.correctAnswer}
                            </span>
                          </span>
                          <span className={styles.qMetaPill}>
                            Topic: <strong>{q.topic}</strong>
                          </span>
                          <span className={styles.difficultyBadge}>{q.difficulty}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={styles.reviewItemBtn}
                        onClick={() => toggleExpand(q.id)}
                      >
                        Review
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>

                    {/* Detailed Rationale expansion */}
                    {isExpanded && (
                      <div className={styles.expandedExplanation}>
                        <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>
                          Explanation &amp; Survey Standard:
                        </div>
                        <div>{q.rationale}</div>

                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {q.options.map((opt) => (
                            <div
                              key={opt.key}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 12.5,
                                padding: '4px 8px',
                                borderRadius: 6,
                                background: opt.isCorrect ? '#ecfdf5' : '#ffffff',
                                border: opt.isCorrect ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                                color: opt.isCorrect ? '#065f46' : '#475569',
                                fontWeight: opt.isCorrect ? 600 : 400,
                              }}
                            >
                              <span>{opt.key}.</span>
                              <span>{opt.text}</span>
                              {opt.isCorrect && (
                                <CheckCircle2 size={14} color="#059669" style={{ marginLeft: 'auto' }} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Overall Performance, Summary, Recommendations, Next Steps */}
        <div className={styles.rightSidebar}>
          {/* Card 1: Overall Performance Gauge */}
          <div className={styles.sideCard}>
            <h3 className={styles.sideCardTitle}>Overall Performance</h3>

            <div className={styles.gaugeContainer}>
              <div className={styles.gaugeSvgWrap}>
                <svg viewBox="0 0 100 60" className={styles.gaugeSvg}>
                  {/* Background Arc: radius = 40, cx = 50, cy = 50 */}
                  {/* Arc circumference = PI * 40 ≈ 125.66 */}
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  {/* Filled Arc: 84% of 125.66 ≈ 105.5 */}
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="105.5 125.66"
                    strokeDashoffset="0"
                  />
                </svg>
                <div className={styles.gaugeCenterContent}>
                  <div className={styles.gaugeScoreNumber}>84%</div>
                  <div className={styles.gaugeRatingPill}>Excellent</div>
                </div>
              </div>
              <div className={styles.gaugeBottomText}>
                You have scored 25 out of 30 marks.
                <br />
                <strong>Excellent work! Keep it up!</strong>
              </div>
            </div>
          </div>

          {/* Card 2: Performance Summary */}
          <div className={styles.sideCard}>
            <h3 className={styles.sideCardTitle}>Performance Summary</h3>

            <div className={styles.summaryList}>
              <div className={styles.summaryItem}>
                <div className={styles.summaryLeft}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span>Correct Answers</span>
                </div>
                <span className={styles.summaryVal}>25 (83.3%)</span>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryLeft}>
                  <XCircle size={16} color="#ef4444" />
                  <span>Incorrect Answers</span>
                </div>
                <span className={styles.summaryVal}>5 (16.7%)</span>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryLeft}>
                  <AlertCircle size={16} color="#94a3b8" />
                  <span>Unattempted</span>
                </div>
                <span className={styles.summaryVal}>0 (0%)</span>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryLeft}>
                  <Trophy size={16} color="#f59e0b" />
                  <span>Accuracy</span>
                </div>
                <span className={styles.summaryVal}>83.3%</span>
              </div>
            </div>
          </div>

          {/* Card 3: Recommendations */}
          <div className={styles.sideCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} color="#6366f1" />
              <h3 className={styles.sideCardTitle}>Recommendations</h3>
            </div>
            <p className={styles.recDesc}>
              Strengthen the following areas to improve your performance:
            </p>

            <div className={styles.recList}>
              <Link to="/recommendations" className={styles.recItem}>
                <span>📕 Data Cleaning</span>
                <ArrowRight size={13} />
              </Link>
              <Link to="/recommendations" className={styles.recItem}>
                <span>📊 Descriptive Statistics</span>
                <ArrowRight size={13} />
              </Link>
              <Link to="/recommendations" className={styles.recItem}>
                <span>📈 Data Visualization</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Card 4: Next Steps */}
          <div className={styles.sideCard}>
            <h3 className={styles.sideCardTitle}>Next Steps</h3>
            <p className={styles.recDesc}>Continue your learning journey</p>

            <Link to="/recommendations" className={styles.nextStepsBtn}>
              View Recommended Learning <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Bottom Motivational Banner ───────────────────────────────────── */}
      <div className={styles.bottomBanner}>
        <div className={styles.rocketCircle}>
          <Rocket size={22} strokeWidth={2.4} />
        </div>
        <div>
          <h4 className={styles.bannerTitle}>Keep learning, keep growing!</h4>
          <p className={styles.bannerSubtitle}>
            Consistent practice and review will help you master these skills.
          </p>
        </div>
      </div>

      {/* ── Modal: Review All Answers ────────────────────────────────────── */}
      {isReviewModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsReviewModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Complete Answers Review</h3>
                <span style={{ fontSize: 12.5, color: '#64748b' }}>
                  Total 30 questions • 25 Correct • 5 Incorrect
                </span>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsReviewModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, paddingBottom: 6 }}>
              {[
                { id: 'all', label: 'All Questions (30)' },
                { id: 'correct', label: 'Correct (25)' },
                { id: 'incorrect', label: 'Incorrect (5)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setReviewFilter(tab.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: reviewFilter === tab.id ? '#6366f1' : '#f1f5f9',
                    color: reviewFilter === tab.id ? '#ffffff' : '#475569',
                    border: 'none',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {INCORRECT_QUESTIONS.map((q) => (
                <div key={q.id} style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{q.qNum}</span>
                    <span style={{ fontSize: 11.5, color: '#dc2626', fontWeight: 600 }}>Incorrect</span>
                  </div>
                  <p style={{ margin: '0 0 6px 0', fontSize: 13, color: '#1e293b' }}>{q.statement}</p>
                  <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>
                    Correct Answer: <strong style={{ color: '#059669' }}>{q.correctAnswer}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    <strong>Rationale:</strong> {q.rationale}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={() => setIsReviewModalOpen(false)}
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
