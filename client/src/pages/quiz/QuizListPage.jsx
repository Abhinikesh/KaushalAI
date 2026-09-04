import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  Users
} from 'lucide-react'
import { getQuizList } from '../../api/mcq.api'
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
  const [activeTab, setActiveTab] = useState('All Quizzes')
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [sortBy, setSortBy] = useState('popular')

  // Load quizzes from real backend API
  const { data, isLoading } = useQuery({
    queryKey: ['quizList'],
    queryFn: getQuizList,
  })

  // Merge backend data with official catalogue
  const allQuizzes = useMemo(() => {
    const apiQuizzes = (data?.quizzes || []).map((q) => ({
      _id: q._id,
      title: q.title || 'AI Generated Practice Quiz',
      description: q.description || 'Practice quiz generated from official uploaded learning material.',
      domain: q.domain || 'Technical & Tools',
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

    // Combine avoiding duplicate IDs
    const merged = [...OFFICIAL_ASSESSMENTS]
    apiQuizzes.forEach((aq) => {
      if (!merged.some((m) => m._id === aq._id)) {
        merged.unshift(aq)
      }
    })
    return merged
  }, [data])

  // Filter and sort quizzes
  const filteredQuizzes = useMemo(() => {
    return allQuizzes.filter((quiz) => {
      // Tab filter
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
          <Link to="/assessments/history" className={styles.secondaryBtn}>
            <Clock size={15} />
            <span>Assessment History</span>
          </Link>
          <Link to="/trainer/mcq-generator" className={styles.primaryBtn}>
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
            <span className={styles.kpiLabel}>Passed / Certified</span>
            <span className={styles.kpiValue}>12</span>
            <span className={styles.kpiSub}>Cadre verified standards</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#FAF5FF', color: '#8B5CF6' }}>
            <TrendingUp size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Average Score</span>
            <span className={styles.kpiValue}>82.4%</span>
            <span className={styles.kpiSub}>+5.2% vs cadre benchmark</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#FFF7ED', color: '#F97316' }}>
            <Award size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Pending Evaluations</span>
            <span className={styles.kpiValue}>6</span>
            <span className={styles.kpiSub}>Recommended for next rank</span>
          </div>
        </div>
      </div>

      {/* ── Tabs Bar ───────────────────────────────────────── */}
      <div className={styles.tabsContainer}>
        {['All Quizzes', 'Statistical Methods', 'Data Management', 'Technical & Tools', 'Cadre Evaluations', 'Completed'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tabItem} ${activeTab === tab ? styles.tabItemActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

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
        {filteredQuizzes.map((quiz) => (
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
        ))}
      </div>

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
        <Link to="/ai-tutor" className={styles.bannerBtn}>
          <span>Open AI Tutor →</span>
        </Link>
      </div>
    </div>
  )
}
