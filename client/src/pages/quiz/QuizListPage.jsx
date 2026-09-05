import React, { useState, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  FileQuestion,
  Award,
  CheckCircle2,
  Clock,
  TrendingUp,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  BookOpen,
  ChevronRight,
  Layers,
  BarChart2,
  Calendar,
  ShieldCheck,
  Check,
  RotateCcw,
  Users,
  Eye,
  X,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { getQuizList } from '../../api/mcq.api'
import { getMyQuizAttempts } from '../../api/quiz.api'
import styles from './QuizListPage.module.css'

// Curated authentic assessments matching official MoSPI curriculum
const OFFICIAL_ASSESSMENTS = [
  {
    _id: 'quiz-stat-methods-01',
    title: 'Survey Design & Sampling Methods Assessment',
    description: 'Evaluate practical knowledge of sample selection, stratification, cluster sampling, and design effect calculations.',
    domain: 'Statistical Methods',
    domainColor: '#2563EB',
    domainBg: '#EFF6FF',
    difficulty: 'Intermediate',
    durationMinutes: 30,
    questionCount: 25,
    passScorePercent: 70,
    totalAttempts: 482,
    skillTags: ['Stratified Sampling', 'Sample Size Estimation', 'Standard Error', 'Cluster Sampling'],
    cadre: 'ISS / SSS',
    isAiGenerated: false,
  },
  {
    _id: 'quiz-data-analysis-02',
    title: 'Data Analysis with Python & Pandas',
    description: 'Test applied skills in data wrangling, handling missing values, statistical modeling, and microdata transformation.',
    domain: 'Data Management',
    domainColor: '#10B981',
    domainBg: '#ECFDF5',
    difficulty: 'Intermediate',
    durationMinutes: 25,
    questionCount: 20,
    passScorePercent: 70,
    totalAttempts: 615,
    skillTags: ['Pandas', 'NumPy', 'Data Cleaning', 'Exploratory Analysis'],
    cadre: 'All Statistical Cadres',
    isAiGenerated: true,
  },
  {
    _id: 'quiz-national-accounts-03',
    title: 'National Accounts & GDP Compilation Examination',
    description: 'Comprehensive evaluation on SNA 2008 standards, GVA estimation, deflator indices, and base year rebasing.',
    domain: 'Statistical Methods',
    domainColor: '#2563EB',
    domainBg: '#EFF6FF',
    difficulty: 'Advanced',
    durationMinutes: 45,
    questionCount: 30,
    passScorePercent: 75,
    totalAttempts: 298,
    skillTags: ['SNA 2008', 'GVA Calculation', 'Input-Output Tables', 'Deflators'],
    cadre: 'NAD / MoSPI HQ',
    isAiGenerated: false,
  },
  {
    _id: 'quiz-powerbi-viz-04',
    title: 'Data Visualization & Dashboarding (Power BI)',
    description: 'Assessment on building executive dashboards, DAX measures, time intelligence, and publishing official statistical releases.',
    domain: 'Analytical & Technical',
    domainColor: '#8B5CF6',
    domainBg: '#F5F3FF',
    difficulty: 'Beginner',
    durationMinutes: 20,
    questionCount: 15,
    passScorePercent: 65,
    totalAttempts: 384,
    skillTags: ['Power BI', 'DAX Measures', 'Visual Storytelling', 'KPI Cards'],
    cadre: 'All Cadres',
    isAiGenerated: false,
  },
  {
    _id: 'quiz-cpi-iip-05',
    title: 'Consumer Price Index (CPI) & IIP Compilation',
    description: 'Diagnostic test on price collection methods, Laspeyres formula, item weighting, and industrial production monitoring.',
    domain: 'Domain Knowledge',
    domainColor: '#06B6D4',
    domainBg: '#ECFEFF',
    difficulty: 'Intermediate',
    durationMinutes: 30,
    questionCount: 20,
    passScorePercent: 70,
    totalAttempts: 341,
    skillTags: ['CPI Compilation', 'Laspeyres Index', 'IIP Weighting', 'Price Relatives'],
    cadre: 'Price Statistics Div',
    isAiGenerated: false,
  },
  {
    _id: 'quiz-data-quality-06',
    title: 'NQAF Data Governance & Quality Standards',
    description: 'Official assessment covering National Quality Assurance Framework (NQAF), metadata standards, and data auditing guidelines.',
    domain: 'Governance & Quality',
    domainColor: '#F97316',
    domainBg: '#FFF7ED',
    difficulty: 'Intermediate',
    durationMinutes: 25,
    questionCount: 20,
    passScorePercent: 70,
    totalAttempts: 412,
    skillTags: ['NQAF Dimensions', 'Microdata Protection', 'Metadata ISO 11179', 'Audit'],
    cadre: 'Quality Assurance Div',
    isAiGenerated: false,
  },
]

export default function QuizListPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'history' ? 'Attempt History' : 'All Quizzes'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [sortBy, setSortBy] = useState('popular')
  const [reviewAttempt, setReviewAttempt] = useState(null)

  // Load quizzes from backend API
  const { data, isLoading } = useQuery({
    queryKey: ['quizList'],
    queryFn: getQuizList,
  })

  // Load attempt records from backend API
  const { data: attemptsData } = useQuery({
    queryKey: ['myAttempts'],
    queryFn: getMyQuizAttempts,
  })

  // Merge backend data with local generated quizzes and official catalogue
  const allQuizzes = useMemo(() => {
    const apiQuizzes = (data?.quizzes || []).map((q) => ({
      _id: q._id,
      title: q.title || 'AI Generated Practice Quiz',
      description: q.description || 'Practice quiz generated from official uploaded learning material.',
      domain: q.domain || 'Data Management',
      domainColor: '#8B5CF6',
      domainBg: '#F5F3FF',
      difficulty: q.difficulty || 'Intermediate',
      durationMinutes: q.durationMinutes || 20,
      questionCount: q.questions?.length || 15,
      passScorePercent: q.passScore || 70,
      totalAttempts: 12,
      skillTags: q.tags || ['Official Statistics', 'Self Practice'],
      cadre: 'All Cadres',
      isAiGenerated: true,
    }))

    let localQuizzes = []
    try {
      localQuizzes = JSON.parse(localStorage.getItem('kai_generated_quizzes') || '[]').map((q) => ({
        _id: q._id,
        title: q.title,
        description: q.description || 'Practice quiz generated from uploaded learning material.',
        domain: q.domain || 'Data Management',
        domainColor: '#8B5CF6',
        domainBg: '#F5F3FF',
        difficulty: q.difficulty || 'Intermediate',
        durationMinutes: q.durationMinutes || 20,
        questionCount: q.questions?.length || 15,
        passScorePercent: q.passScorePercent || 70,
        totalAttempts: 1,
        skillTags: ['AI Generated', 'Targeted Practice'],
        cadre: 'All Cadres',
        isAiGenerated: true,
      }))
    } catch {}

    // Combine local first, then api, then official assessments avoiding duplicate IDs
    const merged = [...localQuizzes, ...apiQuizzes]
    OFFICIAL_ASSESSMENTS.forEach((oa) => {
      if (!merged.some((m) => String(m._id) === String(oa._id))) {
        merged.push(oa)
      }
    })
    return merged
  }, [data])

  // Merge attempts from backend API + localStorage
  const attemptsList = useMemo(() => {
    let localAttempts = []
    try {
      localAttempts = JSON.parse(localStorage.getItem('kai_quiz_attempts') || '[]')
    } catch {}

    const apiAttempts = (attemptsData?.attempts || []).map((a) => ({
      _id: String(a._id),
      quizTitle: a.quizId?.title || 'Statistical Cadre Assessment',
      domain: a.quizId?.domain || 'Statistical Methods',
      date: a.createdAt
        ? new Date(a.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Recently',
      score: a.score || 80,
      maxScore: 100,
      status: (a.score || 0) >= 70 ? 'Passed' : 'Needs Retake',
      passed: (a.score || 0) >= 70,
      quizId: typeof a.quizId === 'object' ? String(a.quizId._id) : String(a.quizId || 'quiz-01'),
      totalQuestions: a.totalQuestions || 20,
      correctCount: a.correctCount,
      answers: a.answers || {},
      questions: a.questions || [],
    }))

    const merged = [...localAttempts, ...apiAttempts]
    OFFICIAL_ASSESSMENTS.forEach((oa) => {
      if (!merged.some((m) => String(m._id) === String(oa._id))) {
        merged.push(oa)
      }
    })
    return merged
  }, [attemptsData])

  // Filter and sort quizzes
  const filteredQuizzes = useMemo(() => {
    return allQuizzes.filter((quiz) => {
      // Tab filter
      if (activeTab === 'AI Generated MCQs' && !quiz.isAiGenerated) return false
      if (activeTab === 'Statistical Methods' && quiz.domain !== 'Statistical Methods') return false
      if (activeTab === 'Data Management' && quiz.domain !== 'Data Management') return false
      if (activeTab === 'Technical & Tools' && quiz.domain !== 'Analytical & Technical' && quiz.domain !== 'Technical & Tools') return false
      if (activeTab === 'Cadre Evaluations' && !quiz.cadre.includes('ISS') && !quiz.cadre.includes('SSS')) return false
      if (activeTab === 'Completed' && quiz.totalAttempts < 400) return false

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = quiz.title.toLowerCase().includes(q)
        const matchesDesc = quiz.description.toLowerCase().includes(q)
        const matchesTags = quiz.skillTags.some((tag) => tag.toLowerCase().includes(q))
        if (!matchesTitle && !matchesDesc && !matchesTags) return false
      }

      // Difficulty filter
      if (difficultyFilter !== 'all' && quiz.difficulty.toLowerCase() !== difficultyFilter.toLowerCase()) {
        return false
      }

      return true
    }).sort((a, b) => {
      if (sortBy === 'duration') return a.durationMinutes - b.durationMinutes
      if (sortBy === 'questions') return b.questionCount - a.questionCount
      return b.totalAttempts - a.totalAttempts
    })
  }, [allQuizzes, activeTab, searchQuery, difficultyFilter, sortBy])

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumb & Header ────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbActive}>Assessments &amp; Quizzes</span>
          </nav>
          <h1 className={styles.title}>Assessments &amp; Quizzes</h1>
          <p className={styles.subtitle}>
            Official competency assessments, practice quizzes and diagnostic skill tests for MoSPI officers.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={`${styles.secondaryBtn} ${activeTab === 'Attempt History' ? styles.primaryBtn : ''}`}
            onClick={() => setActiveTab('Attempt History')}
          >
            <Clock size={15} />
            <span>Assessment History ({attemptsList.length})</span>
          </button>
          <Link to="/mcq-generator" className={styles.primaryBtn}>
            <Sparkles size={15} />
            <span>Generate AI Quiz</span>
          </Link>
        </div>
      </div>

      {/* ── Top 4 KPI Metrics Cards ────────────────────────── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#EFF6FF', color: '#2563EB' }}>
            <Layers size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Total Assessments</span>
            <span className={styles.kpiValue}>{allQuizzes.length}</span>
            <span className={styles.kpiSub}>Across 6 official domains</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#ECFDF5', color: '#10B981' }}>
            <ShieldCheck size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Attempts Recorded</span>
            <span className={styles.kpiValue}>{attemptsList.length}</span>
            <span className={styles.kpiSub}>Saved in assessment history</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#FAF5FF', color: '#8B5CF6' }}>
            <TrendingUp size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Average Score</span>
            <span className={styles.kpiValue}>
              {attemptsList.length > 0
                ? `${Math.round(attemptsList.reduce((acc, a) => acc + (a.score || 0), 0) / attemptsList.length)}%`
                : '82.4%'}
            </span>
            <span className={styles.kpiSub}>+5.2% vs cadre benchmark</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#FFF7ED', color: '#F97316' }}>
            <Award size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Pass Rate</span>
            <span className={styles.kpiValue}>
              {attemptsList.length > 0
                ? `${Math.round((attemptsList.filter((a) => a.passed).length / attemptsList.length) * 100)}%`
                : '86%'}
            </span>
            <span className={styles.kpiSub}>Officially certified standards</span>
          </div>
        </div>
      </div>

      {/* ── Tabs Bar ───────────────────────────────────────── */}
      <div className={styles.tabsContainer}>
        {[
          'All Quizzes',
          'AI Generated MCQs',
          'Statistical Methods',
          'Data Management',
          'Technical & Tools',
          'Cadre Evaluations',
          'Attempt History',
        ].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tabItem} ${activeTab === tab ? styles.tabItemActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === 'Attempt History' && attemptsList.length > 0 && ` (${attemptsList.length})`}
          </button>
        ))}
      </div>

      {/* ── Conditional Content: Attempt History vs Quizzes Catalogue ── */}
      {activeTab === 'Attempt History' ? (
        <div className={styles.historyContainer}>
          <div className={styles.historyTableWrap}>
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>Assessment Title</th>
                  <th>Domain</th>
                  <th>Date Attempted</th>
                  <th>Result Score</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {attemptsList.map((att) => (
                  <tr key={att._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{att.quizTitle}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {att.totalQuestions ? `${att.totalQuestions} Questions` : 'Official Test'}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {att.domain || 'Statistical Methods'}
                      </span>
                    </td>
                    <td style={{ color: '#475569', fontSize: 12.5 }}>{att.date}</td>
                    <td>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                        {att.score}%
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.historyScoreBadge} ${
                          att.passed ? styles.scorePass : styles.scoreFail
                        }`}
                      >
                        {att.passed ? <Check size={12} /> : null}
                        {att.status || (att.passed ? 'Passed' : 'Needs Retake')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        {att.questions && att.questions.length > 0 ? (
                          <button
                            type="button"
                            className={styles.reviewBtn}
                            onClick={() => setReviewAttempt(att)}
                          >
                            <Eye size={13} />
                            <span>Review Filled Answers</span>
                          </button>
                        ) : null}
                        <Link
                          to={`/quizzes/${att.quizId}`}
                          className={styles.takeQuizBtn}
                          style={{ padding: '6px 12px', fontSize: 12 }}
                        >
                          <RotateCcw size={13} />
                          <span>Retake</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          {/* ── Filter Bar ─────────────────────────────────────── */}
          <div className={styles.filterBar}>
            <div className={styles.searchWrap}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search assessments by title, topic or skill tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={styles.filterSelects}>
              <select
                className={styles.selectDropdown}
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
              >
                <option value="all">All Difficulties</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>

              <select
                className={styles.selectDropdown}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="popular">Most Popular</option>
                <option value="duration">Shortest Duration</option>
                <option value="questions">Most Questions</option>
              </select>
            </div>
          </div>

          {/* ── Quizzes Grid ───────────────────────────────────── */}
          <div className={styles.quizzesGrid}>
            {filteredQuizzes.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '48px 16px', textAlign: 'center', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <p style={{ color: '#64748b', fontSize: 14 }}>No assessments match your selected filters.</p>
                <Link to="/mcq-generator" style={{ display: 'inline-block', marginTop: 10, fontSize: 13, fontWeight: 600, color: '#4f46e5' }}>
                  Generate New MCQs with AI →
                </Link>
              </div>
            ) : (
              filteredQuizzes.map((quiz) => (
                <div key={quiz._id} className={styles.quizCard}>
                  <div className={styles.cardTopRow}>
                    <span
                      className={styles.domainBadge}
                      style={{ background: quiz.domainBg, color: quiz.domainColor }}
                    >
                      {quiz.domain}
                    </span>
                    <span
                      className={`${styles.difficultyPill} ${
                        quiz.difficulty === 'Beginner'
                          ? styles.diffBeginner
                          : quiz.difficulty === 'Advanced'
                          ? styles.diffAdvanced
                          : styles.diffIntermediate
                      }`}
                    >
                      {quiz.difficulty}
                    </span>
                  </div>

                  <h3 className={styles.quizTitle}>{quiz.title}</h3>
                  <p className={styles.quizDesc}>{quiz.description}</p>

                  <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                      <Clock size={14} className={styles.metaIcon} />
                      <span>{quiz.durationMinutes} mins</span>
                    </div>
                    <div className={styles.metaItem}>
                      <FileQuestion size={14} className={styles.metaIcon} />
                      <span>{quiz.questionCount} Questions</span>
                    </div>
                    <div className={styles.metaItem}>
                      <Award size={14} className={styles.metaIcon} />
                      <span>Min. {quiz.passScorePercent}% to pass</span>
                    </div>
                    <div className={styles.metaItem}>
                      <Users size={14} className={styles.metaIcon} />
                      <span>{quiz.totalAttempts} attempts</span>
                    </div>
                  </div>

                  <div className={styles.skillTagsWrap}>
                    {quiz.skillTags.map((tag, idx) => (
                      <span key={idx} className={styles.skillTag}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className={styles.cardActions}>
                    <Link to={`/quizzes/${quiz._id}`} className={styles.takeQuizBtn}>
                      <span>Take Quiz</span>
                      <ArrowRight size={14} />
                    </Link>
                    <Link to="/ai-tutor" className={styles.outlineBtn} title="Review with AI Tutor first">
                      <Sparkles size={14} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ── Review Filled Answers Modal ─────────────────────── */}
      {reviewAttempt && (
        <div className={styles.reviewModalOverlay} onClick={() => setReviewAttempt(null)}>
          <div className={styles.reviewModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>{reviewAttempt.quizTitle}</h3>
                <p className={styles.modalSubtitle}>
                  Completed on {reviewAttempt.date} · Score: <strong>{reviewAttempt.score}%</strong> ({reviewAttempt.passed ? 'Passed' : 'Retake Required'})
                </p>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setReviewAttempt(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {reviewAttempt.questions && reviewAttempt.questions.length > 0 ? (
                reviewAttempt.questions.map((q, idx) => {
                  const userAnsIdx = q.userAnswer
                  const isCorrect = userAnsIdx === q.correctOption

                  return (
                    <div key={q.id || idx} className={styles.questionReviewCard}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                          Question {idx + 1}
                        </span>
                        <span
                          className={`${styles.historyScoreBadge} ${
                            isCorrect ? styles.scorePass : styles.scoreFail
                          }`}
                        >
                          {isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>

                      <div className={styles.questionText}>{q.text}</div>

                      <div className={styles.optionsList}>
                        {q.options.map((optText, optIdx) => {
                          const isUserChoice = userAnsIdx === optIdx
                          const isTheCorrectOpt = optIdx === q.correctOption

                          let optClass = styles.optionItem
                          if (isUserChoice && isTheCorrectOpt) {
                            optClass = `${styles.optionItem} ${styles.optionSelectedCorrect}`
                          } else if (isUserChoice && !isTheCorrectOpt) {
                            optClass = `${styles.optionItem} ${styles.optionSelectedWrong}`
                          } else if (isTheCorrectOpt) {
                            optClass = `${styles.optionItem} ${styles.optionCorrectOnly}`
                          }

                          return (
                            <div key={optIdx} className={optClass}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontWeight: 700 }}>
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <span>{optText}</span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {isUserChoice && (
                                  <span className={styles.userBadge}>Your Filled Answer</span>
                                )}
                                {isTheCorrectOpt && (
                                  <CheckCircle2 size={16} color="#10b981" />
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {q.explanation && (
                        <div className={styles.explanationBox}>
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 16px', color: '#64748b' }}>
                  No item-level answer records available for this simulated session.
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setReviewAttempt(null)}
              >
                Close
              </button>
              <Link
                to={`/quizzes/${reviewAttempt.quizId}`}
                className={styles.takeQuizBtn}
                onClick={() => setReviewAttempt(null)}
              >
                <RotateCcw size={14} />
                <span>Retake Assessment</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Practice Encouragement Banner ───────────── */}
      <div className={styles.bottomBanner}>
        <div className={styles.bannerContent}>
          <div className={styles.bannerIconWrap}>
            <Sparkles size={22} />
          </div>
          <div>
            <h4 className={styles.bannerTitle}>Want to practice before your official evaluation?</h4>
            <p className={styles.bannerText}>
              Review syllabus questions with the KaushalAI Tutor or generate personalized mock MCQs from your training manuals.
            </p>
          </div>
        </div>
        <Link to="/mcq-generator" className={styles.bannerBtn}>
          <span>Generate New MCQs →</span>
        </Link>
      </div>
    </div>
  )
}
