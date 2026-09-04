import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Sparkles,
  RefreshCw,
  Star,
  Target,
  BarChart2,
  Clock,
  Check,
  ChevronRight,
  User,
  ListChecks,
  CheckCircle2,
  PlayCircle,
  CircleDot,
  Rocket,
  Info,
  X,
  ExternalLink,
  BookOpen,
  ArrowRight
} from 'lucide-react'
import styles from './MyLearningPathPage.module.css'

const INITIAL_MILESTONES = [
  {
    id: 1,
    num: '01',
    title: 'Python Fundamentals',
    status: 'completed',
    statusLabel: 'COMPLETED',
    description: 'Build foundation in Python programming language.',
    estimatedHours: 6,
    skills: ['Python Basics', 'Variables', 'Data Types'],
    progress: 100,
    actionType: null, // completed
    courseUrl: '/courses/65f001000000000000000001',
  },
  {
    id: 2,
    num: '02',
    title: 'Data Analysis with Python',
    status: 'in_progress',
    statusLabel: 'IN PROGRESS',
    description: 'Learn data manipulation, analysis and visualization using Python.',
    estimatedHours: 12,
    skills: ['Pandas', 'Data Cleaning', 'EDA', 'NumPy'],
    progress: 68,
    actionType: 'continue',
    actionLabel: 'Continue Learning',
    courseUrl: '/courses/65f001000000000000000002',
  },
  {
    id: 3,
    num: '03',
    title: 'Machine Learning Basics',
    status: 'next',
    statusLabel: 'NEXT',
    description: 'Understand basic ML concepts and build simple models.',
    estimatedHours: 8,
    skills: ['Machine Learning', 'Model Training', 'Scikit-learn'],
    progress: 0,
    actionType: 'start',
    actionLabel: 'Start Learning',
    courseUrl: '/courses/65f001000000000000000003',
  },
  {
    id: 4,
    num: '04',
    title: 'Advanced Statistical Modeling',
    status: 'upcoming',
    statusLabel: 'UPCOMING',
    description: 'Learn regression, estimation and advanced statistical models.',
    estimatedHours: 10,
    skills: ['Regression', 'Estimation', 'Hypothesis Testing'],
    progress: 0,
    actionType: 'view',
    actionLabel: 'View Course',
    courseUrl: '/courses/65f001000000000000000004',
  },
  {
    id: 5,
    num: '05',
    title: 'AI for Official Statistics',
    status: 'upcoming',
    statusLabel: 'UPCOMING',
    description: 'Apply AI/ML techniques in official statistics applications.',
    estimatedHours: 12,
    skills: ['AI/ML', 'Time Series', 'Forecasting'],
    progress: 0,
    actionType: 'view',
    actionLabel: 'View Course',
    courseUrl: '/courses/65f001000000000000000005',
  },
  {
    id: 6,
    num: '06',
    title: 'Competency Assessment',
    status: 'final',
    statusLabel: 'FINAL MILESTONE',
    description: 'Final assessment to evaluate your competency improvement.',
    estimatedHours: 2,
    skills: ['Comprehensive Evaluation'],
    progress: 0,
    actionType: 'assessment',
    actionLabel: 'View Assessment',
    courseUrl: '/quizzes/65f005000000000000000001',
  },
]

export default function MyLearningPathPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all') // 'all' | 'in_progress' | 'completed' | 'upcoming'
  const [sortOrder, setSortOrder] = useState('recommended') // 'recommended' | 'duration' | 'priority'
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  const [showWhyModal, setShowWhyModal] = useState(false)
  const [milestones, setMilestones] = useState(INITIAL_MILESTONES)

  // Trigger Toast Notification
  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Handle Regenerate Path
  const handleRegenerate = () => {
    setIsRegenerating(true)
    setTimeout(() => {
      setIsRegenerating(false)
      showToast('✨ Learning path recalculated based on latest competency matrix!')
    }, 1200)
  }

  // Filtered & Sorted Milestones
  const filteredMilestones = milestones
    .filter((m) => {
      if (filter === 'all') return true
      if (filter === 'in_progress') return m.status === 'in_progress'
      if (filter === 'completed') return m.status === 'completed'
      if (filter === 'upcoming') return m.status === 'upcoming' || m.status === 'next' || m.status === 'final'
      return true
    })
    .sort((a, b) => {
      if (sortOrder === 'duration') return a.estimatedHours - b.estimatedHours
      if (sortOrder === 'priority') return a.id - b.id
      return a.id - b.id
    })

  return (
    <div className={styles.pageContainer}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 500,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <Sparkles size={16} color="#818cf8" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to="/dashboard" className={styles.breadcrumbLink}>
          Dashboard
        </Link>
        <span className={styles.breadcrumbSeparator}>›</span>
        <span className={styles.breadcrumbCurrent}>Learning Path</span>
      </nav>

      {/* Page Header */}
      <div className={styles.headerRow}>
        <div>
          <div className={styles.titleArea}>
            <h1 className={styles.pageTitle}>My Learning Path</h1>
            <span className={styles.aiBadge}>
              <Sparkles size={13} />
              AI Generated
            </span>
          </div>
          <p className={styles.pageSubtitle}>
            Your personalized learning journey based on your skills, goals, and competency gaps.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.regenerateBtn}
            onClick={handleRegenerate}
            disabled={isRegenerating}
            title="Recalculate your learning path"
          >
            <RefreshCw
              size={15}
              style={{
                animation: isRegenerating ? 'spin 1s linear infinite' : 'none',
              }}
            />
            {isRegenerating ? 'Recalculating...' : 'Regenerate Path'}
          </button>

          <Link to="/recommendations" className={styles.viewRecsBtn}>
            <Star size={15} fill="currentColor" />
            <span>View Recommendations</span>
            <span style={{ fontSize: 11, marginLeft: 2 }}>▾</span>
          </Link>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className={styles.kpiGrid}>
        {/* KPI 1: Overall Progress */}
        <div className={styles.kpiCard}>
          <div className={styles.radialBox}>
            <svg className={styles.radialSvg} viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="3.2"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#10b981"
                strokeWidth="3.2"
                strokeDasharray="38, 100"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Overall Progress</span>
            <span className={styles.kpiValue}>38%</span>
            <span className={styles.kpiSubtext}>12 of 32 learning activities completed</span>
          </div>
        </div>

        {/* KPI 2: Current Focus */}
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconBox} ${styles.kpiIconPurple}`}>
            <Target size={24} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Current Focus</span>
            <span className={styles.kpiValue} style={{ fontSize: 17 }}>
              Python & Data Analysis
            </span>
            <span className={styles.kpiSubtext}>2 priority skills</span>
          </div>
        </div>

        {/* KPI 3: Skills to Improve */}
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconBox} ${styles.kpiIconBlue}`}>
            <BarChart2 size={24} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Skills to Improve</span>
            <span className={styles.kpiValue}>6</span>
            <span className={styles.kpiSubtext}>High-priority competency gaps</span>
          </div>
        </div>

        {/* KPI 4: Estimated Completion */}
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconBox} ${styles.kpiIconOrange}`}>
            <Clock size={24} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Estimated Completion</span>
            <span className={styles.kpiValue}>48h 30m</span>
            <span className={styles.kpiSubtext}>Remaining learning time</span>
          </div>
        </div>
      </div>

      {/* AI Learning Recommendation Banner */}
      <div className={styles.recommendationBanner}>
        <div className={styles.recLeft}>
          <div className={styles.recSparkleBox}>
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className={styles.recTitle}>AI Learning Recommendation</h2>
            <p className={styles.recDescription}>
              Your learning path prioritizes Python and Data Analysis because your current proficiency is below the level required for your Statistical Analyst role.
            </p>
          </div>
        </div>

        <div className={styles.recRight}>
          <div className={styles.leapPill}>
            <span className={styles.leapLabel}>Python</span>
            <span className={styles.leapStages}>
              <span className={styles.leapFrom}>2 - Basic</span>
              <span style={{ color: '#94a3b8' }}>→</span>
              <span className={styles.leapTo}>4 - Advanced</span>
            </span>
          </div>

          <div className={styles.leapPill}>
            <span className={styles.leapLabel}>Data Analysis</span>
            <span className={styles.leapStages}>
              <span className={styles.leapFrom}>2 - Basic</span>
              <span style={{ color: '#94a3b8' }}>→</span>
              <span className={styles.leapTo}>4 - Advanced</span>
            </span>
          </div>

          <button
            type="button"
            className={styles.whyPathBtn}
            onClick={() => setShowWhyModal(true)}
          >
            <span>Why this path?</span>
            <Info size={14} />
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className={styles.contentLayout}>
        {/* Left Column: Learning Journey */}
        <div className={styles.leftColumn}>
          <div className={styles.journeyHeader}>
            <h2 className={styles.journeyTitle}>Your Learning Journey</h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Filter Tabs */}
              <div className={styles.filterTabs}>
                <button
                  type="button"
                  className={`${styles.filterTab} ${filter === 'all' ? styles.filterTabActive : ''}`}
                  onClick={() => setFilter('all')}
                >
                  All Activities
                </button>
                <button
                  type="button"
                  className={`${styles.filterTab} ${filter === 'in_progress' ? styles.filterTabActive : ''}`}
                  onClick={() => setFilter('in_progress')}
                >
                  In Progress
                </button>
                <button
                  type="button"
                  className={`${styles.filterTab} ${filter === 'completed' ? styles.filterTabActive : ''}`}
                  onClick={() => setFilter('completed')}
                >
                  Completed
                </button>
                <button
                  type="button"
                  className={`${styles.filterTab} ${filter === 'upcoming' ? styles.filterTabActive : ''}`}
                  onClick={() => setFilter('upcoming')}
                >
                  Upcoming
                </button>
              </div>

              {/* Sort Order Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
                <span>Sort by:</span>
                <select
                  className={styles.sortSelect}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <option value="recommended">Recommended Order</option>
                  <option value="duration">Duration: Shortest First</option>
                  <option value="priority">Skill Priority</option>
                </select>
              </div>
            </div>
          </div>

          {/* Timeline Milestones */}
          <div className={styles.timelineList}>
            <div className={styles.timelineConnector} />

            {filteredMilestones.map((m) => {
              const isCompleted = m.status === 'completed'
              const isInProgress = m.status === 'in_progress'
              const isNext = m.status === 'next'
              const isFinal = m.status === 'final'

              return (
                <div key={m.id} className={styles.timelineItem}>
                  {/* Numbered Node Circle */}
                  <div
                    className={`${styles.nodeCircle} ${
                      isCompleted
                        ? styles.nodeCompleted
                        : isInProgress
                        ? styles.nodeInProgress
                        : styles.nodeUpcoming
                    }`}
                  >
                    {isCompleted ? <Check size={20} strokeWidth={2.5} /> : m.num}
                  </div>

                  {/* Milestone Content Card */}
                  <div className={styles.milestoneCard}>
                    <div className={styles.milestoneMain}>
                      <div className={styles.milestoneHeaderRow}>
                        <h3 className={styles.milestoneTitle}>{m.title}</h3>
                        <span
                          className={
                            isCompleted
                              ? styles.badgeCompleted
                              : isInProgress
                              ? styles.badgeInProgress
                              : isNext
                              ? styles.badgeNext
                              : isFinal
                              ? styles.badgeMilestone
                              : styles.badgeUpcoming
                          }
                        >
                          {m.statusLabel}
                        </span>
                      </div>

                      <p className={styles.milestoneDesc}>{m.description}</p>

                      {m.estimatedHours && (
                        <div className={styles.milestoneMetaTime}>
                          <Clock size={13} />
                          <span>Estimated time: {m.estimatedHours} hours</span>
                        </div>
                      )}

                      {/* Skills Gained Pills */}
                      <div className={styles.skillsGainedRow}>
                        <span className={styles.skillsGainedLabel}>Skills Gained</span>
                        {m.skills.map((skill, sIdx) => (
                          <span key={sIdx} className={styles.skillPill}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Milestone Right: Progress or Action */}
                    <div className={styles.milestoneRight}>
                      {isCompleted && (
                        <div className={styles.milestoneProgressBar}>
                          <div className={styles.progressTrack}>
                            <div
                              className={styles.progressFillGreen}
                              style={{ width: '100%' }}
                            />
                          </div>
                          <span className={styles.progressNum}>100%</span>
                        </div>
                      )}

                      {isInProgress && (
                        <>
                          <div className={styles.milestoneProgressBar}>
                            <div className={styles.progressTrack}>
                              <div
                                className={styles.progressFillBlue}
                                style={{ width: `${m.progress}%` }}
                              />
                            </div>
                            <span className={styles.progressNum}>{m.progress}%</span>
                          </div>
                          <button
                            type="button"
                            className={styles.continueBtn}
                            onClick={() => navigate(m.courseUrl)}
                          >
                            {m.actionLabel}
                          </button>
                        </>
                      )}

                      {!isCompleted && !isInProgress && m.actionLabel && (
                        <button
                          type="button"
                          className={styles.outlineActionBtn}
                          onClick={() => navigate(m.courseUrl)}
                        >
                          {m.actionLabel}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Widgets */}
        <div className={styles.rightColumn}>
          {/* Widget 1: Path Overview */}
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>Path Overview</h3>
            <div className={styles.overviewList}>
              <div className={styles.overviewRow}>
                <div className={styles.overviewLabelGroup}>
                  <User size={15} />
                  <span>Target Role</span>
                </div>
                <span className={styles.overviewValue}>Statistical Analyst</span>
              </div>

              <div className={styles.overviewRow}>
                <div className={styles.overviewLabelGroup}>
                  <Target size={15} />
                  <span>Target Competency</span>
                </div>
                <span className={styles.overviewValue}>Advanced</span>
              </div>

              <div className={styles.overviewRow}>
                <div className={styles.overviewLabelGroup}>
                  <ListChecks size={15} />
                  <span>Learning Activities</span>
                </div>
                <span className={styles.overviewValue}>6</span>
              </div>

              <div className={styles.overviewRow}>
                <div className={styles.overviewLabelGroup}>
                  <CheckCircle2 size={15} />
                  <span>Completed</span>
                </div>
                <span className={styles.overviewValue}>1</span>
              </div>

              <div className={styles.overviewRow}>
                <div className={styles.overviewLabelGroup}>
                  <PlayCircle size={15} />
                  <span>In Progress</span>
                </div>
                <span className={styles.overviewValue}>1</span>
              </div>

              <div className={styles.overviewRow}>
                <div className={styles.overviewLabelGroup}>
                  <CircleDot size={15} />
                  <span>Upcoming</span>
                </div>
                <span className={styles.overviewValue}>4</span>
              </div>

              <div className={styles.overviewSeparator} />

              <div className={styles.overviewRow}>
                <div className={styles.overviewLabelGroup}>
                  <Clock size={15} />
                  <span>Estimated Remaining Time</span>
                </div>
                <span className={styles.overviewValue} style={{ color: '#0f172a' }}>
                  48h 30m
                </span>
              </div>
            </div>
          </div>

          {/* Widget 2: AI Path Logic */}
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>AI Path Logic</h3>
            <div className={styles.logicList}>
              <div className={styles.logicItem}>
                <CheckCircle2 size={16} className={styles.logicCheck} />
                <span>Skill gaps</span>
              </div>
              <div className={styles.logicItem}>
                <CheckCircle2 size={16} className={styles.logicCheck} />
                <span>Target role requirements</span>
              </div>
              <div className={styles.logicItem}>
                <CheckCircle2 size={16} className={styles.logicCheck} />
                <span>Previous learning</span>
              </div>
              <div className={styles.logicItem}>
                <CheckCircle2 size={16} className={styles.logicCheck} />
                <span>Course relevance</span>
              </div>
              <div className={styles.logicItem}>
                <CheckCircle2 size={16} className={styles.logicCheck} />
                <span>Learning progress</span>
              </div>
            </div>

            <Link to="/skill-gaps" className={styles.viewGapBtn}>
              <span>View Skill Gap Analysis</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Widget 3: Skills You Will Develop */}
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>Skills You Will Develop</h3>
            <table className={styles.skillsTable}>
              <thead>
                <tr>
                  <th style={{ width: '42%' }}></th>
                  <th>Current</th>
                  <th>Target</th>
                  <th>After Path</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className={styles.skillNameCol}>
                      <span>🐍</span>
                      <span>Python</span>
                    </div>
                  </td>
                  <td>2/5</td>
                  <td>4/5</td>
                  <td className={styles.afterPathScore}>4/5</td>
                </tr>
                <tr>
                  <td>
                    <div className={styles.skillNameCol}>
                      <span>📊</span>
                      <span>Data Analysis</span>
                    </div>
                  </td>
                  <td>2/5</td>
                  <td>4/5</td>
                  <td className={styles.afterPathScore}>4/5</td>
                </tr>
                <tr>
                  <td>
                    <div className={styles.skillNameCol}>
                      <span>📈</span>
                      <span>Data Visualization</span>
                    </div>
                  </td>
                  <td>4/5</td>
                  <td>5/5</td>
                  <td className={styles.afterPathScore}>5/5</td>
                </tr>
                <tr>
                  <td>
                    <div className={styles.skillNameCol}>
                      <span>📉</span>
                      <span>Statistical Modeling</span>
                    </div>
                  </td>
                  <td>2/5</td>
                  <td>4/5</td>
                  <td className={styles.afterPathScore}>4/5</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Encouragement Banner */}
      <div className={styles.bottomBanner}>
        <div className={styles.bannerLeft}>
          <div className={styles.rocketIconBox}>
            <Rocket size={24} />
          </div>
          <div>
            <h3 className={styles.bannerTitle}>You're on the right track! 🎉</h3>
            <p className={styles.bannerSubtext}>
              Completing the next 2 activities will address your highest-priority skill gaps and accelerate your growth.
            </p>
          </div>
        </div>

        <div className={styles.bannerProgressCenter}>
          <div className={styles.bannerProgressTop}>38% Complete</div>
          <div className={styles.bannerProgressTrack}>
            <div className={styles.bannerProgressFill} style={{ width: '38%' }} />
          </div>
          <div className={styles.bannerProgressSub}>
            12 of 32 learning activities completed
          </div>
        </div>

        <div className={styles.bannerActions}>
          <button
            type="button"
            className={styles.bannerContinueBtn}
            onClick={() => navigate('/courses/65f001000000000000000002')}
          >
            Continue Learning
          </button>
          <Link to="/recommendations" className={styles.bannerExploreLink}>
            <span>Explore Recommended Learning</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Explainability Modal: Why This Path? */}
      {showWhyModal && (
        <div className={styles.modalOverlay} onClick={() => setShowWhyModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className={styles.recSparkleBox} style={{ width: 32, height: 32 }}>
                  <Sparkles size={16} />
                </div>
                <h3 className={styles.modalTitle}>AI Learning Path Logic & Rationale</h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowWhyModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.6, margin: 0 }}>
                  KaushalAI's neural recommendation engine synthesized this sequencing by evaluating your current
                  competency matrix against MoSPI's benchmark standards for the <strong>Statistical Analyst</strong> cadre.
                </p>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <h4 style={{ fontSize: 13.5, fontWeight: 700, margin: '0 0 10px', color: '#0f172a' }}>
                  🎯 Sequencing Methodology
                </h4>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                  <li>
                    <strong>Foundational Dependency:</strong> Python Fundamentals (01) and Data Analysis (02) are prerequisites for complex modeling.
                  </li>
                  <li>
                    <strong>Critical Gap Reduction:</strong> Prioritizes Python (2 → 4) and Data Analysis (2 → 4) as high-priority career progression levers.
                  </li>
                  <li>
                    <strong>Domain Integration:</strong> Connects theoretical Machine Learning (03) with Official Statistics workflows (05).
                  </li>
                  <li>
                    <strong>Continuous Verification:</strong> Culminates in a MoSPI verified competency assessment (06).
                  </li>
                </ul>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 12,
                    background: '#ffffff',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>CADRE BENCHMARK</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                    Statistical Analyst
                  </div>
                  <div style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>Target: Advanced (Level 4/5)</div>
                </div>

                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 12,
                    background: '#ffffff',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>ESTIMATED GAIN</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#4f46e5', marginTop: 4 }}>
                    +4 Competencies
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>48.5 hours learning runway</div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <Link
                to="/skill-gaps"
                className={styles.outlineActionBtn}
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => setShowWhyModal(false)}
              >
                <span>Examine Gap Matrix</span>
                <ExternalLink size={13} />
              </Link>
              <button
                type="button"
                className={styles.continueBtn}
                onClick={() => setShowWhyModal(false)}
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
