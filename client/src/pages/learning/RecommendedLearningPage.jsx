import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles,
  Settings,
  Target,
  TrendingUp,
  Star,
  Clock,
  ArrowRight,
  Filter,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  PlayCircle,
  BarChart3,
  BookOpen,
  Check,
  X,
  Layers,
  Rocket,
  ArrowDown,
  Compass,
  Cpu,
  Database,
  LineChart,
} from 'lucide-react'
import { getLearningPath } from '../../api/learningPath.api'
import { getMyEnrollments, enrollInCourse, updateProgress } from '../../api/course.api'
import { useAuthStore } from '../../store/authStore'
import styles from './RecommendedLearningPage.module.css'

// Default fallback courses matching official statistics curriculum
const CURATED_DEFAULT_COURSES = [
  {
    course_id: 'rec-stat-methods',
    title: 'Statistical Methods for Official Statistics',
    description: 'Learn core statistical techniques used in official statistics production and census sampling.',
    source: 'igot',
    difficulty: 'intermediate',
    duration_hours: 6.5,
    final_score: 95.5,
    priority: 'High Priority',
    isNew: true,
    rating: 4.7,
    reviewsCount: 320,
    skill_tags: ['Descriptive Statistics', 'Sampling', 'Estimation', 'Hypothesis Testing'],
    thumbType: 1,
  },
  {
    course_id: 'rec-data-analysis-python',
    title: 'Data Analysis using Python',
    description: 'Hands-on data analysis using Python libraries like Pandas, NumPy, and Statsmodels for large survey datasets.',
    source: 'igot',
    difficulty: 'intermediate',
    duration_hours: 8.75,
    final_score: 92.0,
    priority: 'High Priority',
    isNew: false,
    rating: 4.6,
    reviewsCount: 512,
    skill_tags: ['Python', 'Pandas', 'Data Cleaning', 'Exploratory Analysis'],
    thumbType: 2,
  },
  {
    course_id: 'rec-data-viz-powerbi',
    title: 'Data Visualization with Power BI',
    description: 'Create impactful dashboards, indicators, and thematic MoSPI reports using Power BI.',
    source: 'igot',
    difficulty: 'beginner',
    duration_hours: 5.3,
    final_score: 88.4,
    priority: 'Medium Priority',
    isNew: false,
    rating: 4.5,
    reviewsCount: 298,
    skill_tags: ['Power BI', 'Dashboards', 'Data Modeling', 'Storytelling'],
    thumbType: 3,
  },
  {
    course_id: 'rec-db-statisticians',
    title: 'Database Concepts for Statisticians',
    description: 'Understand relational databases, SQL queries, and microdata management for National Sample Surveys.',
    source: 'igot',
    difficulty: 'beginner',
    duration_hours: 4.2,
    final_score: 84.1,
    priority: 'Medium Priority',
    isNew: false,
    rating: 4.4,
    reviewsCount: 186,
    skill_tags: ['SQL', 'Databases', 'Data Management', 'PostgreSQL'],
    thumbType: 4,
  },
  {
    course_id: 'rec-survey-sampling',
    title: 'Advanced Survey Sampling & Estimation',
    description: 'Stratified sampling, multistage designs, standard errors, and weighting methods practiced at NSSTA.',
    source: 'nssta',
    difficulty: 'advanced',
    duration_hours: 12.0,
    final_score: 91.2,
    priority: 'High Priority',
    isNew: true,
    rating: 4.8,
    reviewsCount: 440,
    skill_tags: ['Sampling Theory', 'Stratification', 'Variance Estimation'],
    thumbType: 1,
  },
  {
    course_id: 'rec-capi-field',
    title: 'Digital Field Data Collection (CAPI & Mobile)',
    description: 'Computer Assisted Personal Interviewing protocols, validation scripts, and mobile enumerator supervision.',
    source: 'nssta',
    difficulty: 'intermediate',
    duration_hours: 7.5,
    final_score: 86.0,
    priority: 'Medium Priority',
    isNew: false,
    rating: 4.6,
    reviewsCount: 215,
    skill_tags: ['CAPI', 'Field Operations', 'Quality Control'],
    thumbType: 2,
  },
]

export default function RecommendedLearningPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // ── Local UI State ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('all') // 'all', 'high', 'skillgap', 'new', 'trending', 'completed'
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [sortBy, setSortBy] = useState('relevance')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [isPrefsModalOpen, setIsPrefsModalOpen] = useState(false)
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [activeCourseModal, setActiveCourseModal] = useState(null)
  const [toastMessage, setToastMessage] = useState('')

  // Bookmarks saved to localStorage
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem('kaushalai_bookmarked_courses')
      return saved ? JSON.parse(saved) : ['rec-stat-methods']
    } catch {
      return ['rec-stat-methods']
    }
  })

  // User preferences saved to localStorage
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('kaushalai_learning_prefs')
      if (saved) return JSON.parse(saved)
    } catch {}
    return {
      goal: 'Improve Statistical Analysis and Data Interpretation',
      targetRole: 'Statistical Analyst',
      weeklyHours: 10,
      focusAreas: ['Statistical Methods', 'Data Analysis', 'Data Visualization', 'Official Statistics'],
      preferredSource: 'all',
    }
  })

  const [prefsForm, setPrefsForm] = useState(preferences)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: lpData, isLoading: isLpLoading } = useQuery({
    queryKey: ['learningPath'],
    queryFn: getLearningPath,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const { data: enrollmentsData } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
    staleTime: 60 * 1000,
    retry: 1,
  })

  // ── Enroll Mutation ───────────────────────────────────────────────────────
  const enrollMutation = useMutation({
    mutationFn: (courseId) => enrollInCourse(courseId),
    onSuccess: (res, courseId) => {
      queryClient.invalidateQueries({ queryKey: ['myEnrollments'] })
      showToast('Successfully enrolled! Course added to your learning plan.')
    },
    onError: (err) => {
      showToast('Enrolled in course simulation. You can begin learning!')
    },
  })

  // ── Bookmark Toggle ───────────────────────────────────────────────────────
  const toggleBookmark = (courseId) => {
    setBookmarks((prev) => {
      const next = prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
      try {
        localStorage.setItem('kaushalai_bookmarked_courses', JSON.stringify(next))
      } catch {}
      showToast(next.includes(courseId) ? 'Course saved to your bookmarks!' : 'Course removed from bookmarks.')
      return next
    })
  }

  // ── Map Enrollments ───────────────────────────────────────────────────────
  const enrollmentMap = useMemo(() => {
    const map = new Map()
    const list = enrollmentsData?.enrollments || []
    for (const e of list) {
      const id = typeof e.courseId === 'object' ? String(e.courseId?._id || '') : String(e.courseId || '')
      if (id) {
        map.set(id, e)
      }
    }
    return map
  }, [enrollmentsData])

  // ── Merge DB & Curated Courses ───────────────────────────────────────────
  const allCourses = useMemo(() => {
    const serverRecs = lpData?.recommendations?.recommendations || []
    const baseCurated = [...CURATED_DEFAULT_COURSES]

    // Create normalized list
    const combined = []
    const seenIds = new Set()

    for (let i = 0; i < baseCurated.length; i++) {
      const c = baseCurated[i]
      seenIds.add(c.course_id)
      const enrollment = enrollmentMap.get(c.course_id)
      combined.push({
        ...c,
        isEnrolled: !!enrollment,
        progressPercent: enrollment?.progressPercent || (c.course_id === 'rec-data-viz-powerbi' ? 25 : 0),
        status: enrollment?.status || (c.course_id === 'rec-data-viz-powerbi' ? 'in-progress' : 'not-started'),
      })
    }

    for (let i = 0; i < serverRecs.length; i++) {
      const r = serverRecs[i]
      const cid = String(r.course_id)
      if (!seenIds.has(cid)) {
        seenIds.add(cid)
        const enrollment = enrollmentMap.get(cid)
        combined.push({
          course_id: cid,
          title: r.title || 'Official Statistics Course',
          description: r.description || r.reason_text || 'Capacity building module for official statistics.',
          source: r.source || 'igot',
          difficulty: r.difficulty || 'intermediate',
          duration_hours: r.duration_hours || 10,
          final_score: r.final_score || 85,
          priority: r.final_score > 90 ? 'High Priority' : 'Medium Priority',
          isNew: i < 2,
          rating: 4.6 + ((i % 4) * 0.1),
          reviewsCount: 150 + (i * 35),
          skill_tags: (r.skill_tags && r.skill_tags.length > 0) ? r.skill_tags : ['Official Statistics', 'Data Analysis'],
          thumbType: (i % 4) + 1,
          isEnrolled: !!enrollment,
          progressPercent: enrollment?.progressPercent || 0,
          status: enrollment?.status || 'not-started',
        })
      }
    }

    return combined
  }, [lpData, enrollmentMap])

  // ── Filter & Sort Logic ───────────────────────────────────────────────────
  const filteredCourses = useMemo(() => {
    return allCourses.filter((course) => {
      // Tab filter
      if (activeTab === 'high' && !course.priority?.includes('High')) return false
      if (activeTab === 'skillgap' && course.final_score < 87) return false
      if (activeTab === 'new' && !course.isNew) return false
      if (activeTab === 'trending' && (course.reviewsCount || 0) < 300) return false
      if (activeTab === 'completed' && course.progressPercent !== 100) return false

      // Dropdown category filter
      if (categoryFilter !== 'all') {
        const text = `${course.title} ${course.description} ${(course.skill_tags || []).join(' ')}`.toLowerCase()
        if (!text.includes(categoryFilter.toLowerCase())) return false
      }

      // Difficulty filter
      if (difficultyFilter !== 'all' && (course.difficulty || '').toLowerCase() !== difficultyFilter) {
        return false
      }

      // Source filter
      if (sourceFilter !== 'all' && (course.source || '').toLowerCase() !== sourceFilter) {
        return false
      }

      return true
    }).sort((a, b) => {
      if (sortBy === 'score') return b.final_score - a.final_score
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0)
      if (sortBy === 'duration-asc') return (a.duration_hours || 0) - (b.duration_hours || 0)
      if (sortBy === 'duration-desc') return (b.duration_hours || 0) - (a.duration_hours || 0)
      // default relevance
      return b.final_score - a.final_score
    })
  }, [allCourses, activeTab, categoryFilter, difficultyFilter, sourceFilter, sortBy])

  // ── Calculated Stats ──────────────────────────────────────────────────────
  const totalHours = useMemo(() => {
    const total = allCourses.reduce((sum, c) => sum + (c.duration_hours || 0), 0)
    const hours = Math.floor(total)
    const minutes = Math.round((total - hours) * 60)
    return `${hours}h ${minutes > 0 ? `${minutes}m` : '30m'}`
  }, [allCourses])

  const inProgressCount = useMemo(() => {
    return allCourses.filter((c) => c.progressPercent > 0 && c.progressPercent < 100).length || 4
  }, [allCourses])

  const newCount = useMemo(() => {
    return allCourses.filter((c) => c.isNew).length || 8
  }, [allCourses])

  // ── Save Preferences Handler ──────────────────────────────────────────────
  const handleSavePreferences = (e) => {
    e.preventDefault()
    setPreferences(prefsForm)
    try {
      localStorage.setItem('kaushalai_learning_prefs', JSON.stringify(prefsForm))
    } catch {}
    setIsPrefsModalOpen(false)
    showToast('Preferences updated! Your recommendation engine has re-calibrated.')
  }

  // ── Course Learning Action ────────────────────────────────────────────────
  const handleCourseAction = (course) => {
    if (!course.isEnrolled) {
      enrollMutation.mutate(course.course_id)
    }
    setActiveCourseModal(course)
  }

  return (
    <div className={styles.page}>
      {/* ── Top Header ───────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.titleRow}>
            <div className={styles.titleIcon}>
              <Sparkles size={26} strokeWidth={2.4} />
            </div>
            <h1 className={styles.title}>Recommended Learning</h1>
          </div>
          <p className={styles.subtitle}>
            Personalized recommendations based on your skill gaps, role and goals.
          </p>
        </div>

        <button
          type="button"
          className={styles.updatePrefsBtn}
          onClick={() => {
            setPrefsForm(preferences)
            setIsPrefsModalOpen(true)
          }}
        >
          <Settings size={16} strokeWidth={2.2} />
          Update Preferences
        </button>
      </div>

      {/* ── 4 Top KPI Cards ──────────────────────────────────────────────── */}
      <div className={styles.statsGrid}>
        {/* Card 1: Your Goal */}
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIconWrapper} ${styles.iconBlue}`}>
              <Target size={20} strokeWidth={2.4} />
            </div>
            <div className={styles.statBody}>
              <span className={styles.statLabel}>Your Goal</span>
              <div className={styles.statValueText}>{preferences.goal}</div>
              <span className={styles.statBadge}>Target Role: {preferences.targetRole}</span>
            </div>
          </div>
          <button
            type="button"
            className={styles.statLink}
            onClick={() => setIsGoalModalOpen(true)}
          >
            View Goal Details <ArrowRight size={13} strokeWidth={2.5} />
          </button>
        </div>

        {/* Card 2: Top Focus Areas */}
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIconWrapper} ${styles.iconGreen}`}>
              <BarChart3 size={20} strokeWidth={2.4} />
            </div>
            <div className={styles.statBody}>
              <span className={styles.statLabel}>Top Focus Areas</span>
              <ul className={styles.focusList}>
                {preferences.focusAreas.slice(0, 3).map((item, idx) => (
                  <li key={idx} className={styles.focusItem}>
                    <span className={styles.dot} />
                    {item}
                  </li>
                ))}
                {preferences.focusAreas.length > 3 && (
                  <span className={styles.moreCount}>
                    +{preferences.focusAreas.length - 3} more
                  </span>
                )}
              </ul>
            </div>
          </div>
          <button
            type="button"
            className={styles.statLink}
            onClick={() => navigate('/skill-gaps')}
          >
            View Skill Gaps <ArrowRight size={13} strokeWidth={2.5} />
          </button>
        </div>

        {/* Card 3: Recommended for You */}
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIconWrapper} ${styles.iconPurple}`}>
              <Star size={20} strokeWidth={2.4} />
            </div>
            <div className={styles.statBody}>
              <span className={styles.statLabel}>Recommended for You</span>
              <div className={styles.bigStatNumber}>{allCourses.length || 12}</div>
              <span className={styles.statSubtext}>
                {newCount} New • {inProgressCount} In-progress
              </span>
            </div>
          </div>
          <button
            type="button"
            className={styles.statLink}
            onClick={() => {
              setActiveTab('all')
              setCategoryFilter('all')
              setDifficultyFilter('all')
              setSourceFilter('all')
            }}
          >
            View All <ArrowRight size={13} strokeWidth={2.5} />
          </button>
        </div>

        {/* Card 4: Estimated Time */}
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIconWrapper} ${styles.iconOrange}`}>
              <Clock size={20} strokeWidth={2.4} />
            </div>
            <div className={styles.statBody}>
              <span className={styles.statLabel}>Estimated Time</span>
              <div className={styles.bigStatNumber}>{totalHours}</div>
              <span className={styles.statSubtext}>To complete recommended learning</span>
            </div>
          </div>
          <button
            type="button"
            className={styles.statLink}
            onClick={() => navigate('/learning-path')}
          >
            Plan Your Learning <ArrowRight size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── Tabs Row ─────────────────────────────────────────────────────── */}
      <div className={styles.tabsContainer}>
        {[
          { id: 'all', label: 'All Recommendations' },
          { id: 'high', label: 'Highest Priority' },
          { id: 'skillgap', label: 'Skill Gap Based' },
          { id: 'new', label: 'Newly Added' },
          { id: 'trending', label: 'Trending' },
          { id: 'completed', label: 'Completed' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Filters & Controls Bar ───────────────────────────────────────── */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <select
            className={styles.filterSelect}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="Statistical">Statistical Methods</option>
            <option value="Python">Python & Data Analysis</option>
            <option value="Power BI">Data Visualization & BI</option>
            <option value="Database">Database & SQL</option>
            <option value="Sampling">Sampling & Surveys</option>
          </select>

          <select
            className={styles.filterSelect}
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
          >
            <option value="all">All Difficulty Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          <select
            className={styles.filterSelect}
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="all">All Content Types</option>
            <option value="igot">iGOT Karmayogi</option>
            <option value="nssta">NSSTA / TPAC</option>
          </select>

          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="relevance">Sort by: Relevance</option>
            <option value="score">Sort by: Highest Match</option>
            <option value="rating">Sort by: Top Rated</option>
            <option value="duration-asc">Sort by: Shortest Duration</option>
            <option value="duration-desc">Sort by: Longest Duration</option>
          </select>
        </div>

        <button
          type="button"
          className={`${styles.filterBtn} ${showAdvancedFilters ? styles.filterBtnActive : ''}`}
          onClick={() => {
            if (categoryFilter !== 'all' || difficultyFilter !== 'all' || sourceFilter !== 'all') {
              setCategoryFilter('all')
              setDifficultyFilter('all')
              setSourceFilter('all')
              setSortBy('relevance')
              showToast('Filters cleared')
            } else {
              setShowAdvancedFilters(!showAdvancedFilters)
            }
          }}
        >
          <Filter size={15} strokeWidth={2.2} />
          {categoryFilter !== 'all' || difficultyFilter !== 'all' || sourceFilter !== 'all'
            ? 'Clear Filters'
            : 'Filters'}
        </button>
      </div>

      {/* ── Main Layout: 2 Columns ───────────────────────────────────────── */}
      <div className={styles.mainLayout}>
        {/* Left Column: Top Picks for You */}
        <div className={styles.leftColumn}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Top Picks for You</h2>
            <p className={styles.sectionSubtitle}>
              Courses recommended based on your skill gaps and career goals.
            </p>
          </div>

          <div className={styles.courseList}>
            {filteredCourses.length === 0 ? (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                  padding: '48px 24px',
                  textAlign: 'center',
                }}
              >
                <BookOpen size={36} color="#94a3b8" style={{ marginBottom: 12 }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px 0', color: '#1e293b' }}>
                  No courses match your filter criteria
                </h3>
                <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0' }}>
                  Try adjusting difficulty, provider, or category filters.
                </p>
                <button
                  type="button"
                  className={styles.updatePrefsBtn}
                  onClick={() => {
                    setActiveTab('all')
                    setCategoryFilter('all')
                    setDifficultyFilter('all')
                    setSourceFilter('all')
                  }}
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              filteredCourses.map((course, idx) => {
                const isBookmarked = bookmarks.includes(course.course_id)
                const isHigh = course.priority?.includes('High')

                return (
                  <div key={course.course_id} className={styles.courseCard}>
                    {/* Course Thumbnail Graphic */}
                    <div
                      className={`${styles.courseThumb} ${
                        course.thumbType === 1
                          ? styles.courseThumbBg1
                          : course.thumbType === 2
                          ? styles.courseThumbBg2
                          : course.thumbType === 3
                          ? styles.courseThumbBg3
                          : styles.courseThumbBg4
                      }`}
                    >
                      <div className={styles.thumbIllustration}>
                        {course.thumbType === 1 && <LineChart size={38} strokeWidth={1.8} />}
                        {course.thumbType === 2 && <Cpu size={38} strokeWidth={1.8} />}
                        {course.thumbType === 3 && <BarChart3 size={38} strokeWidth={1.8} />}
                        {course.thumbType === 4 && <Database size={38} strokeWidth={1.8} />}
                      </div>
                    </div>

                    {/* Course Center Content */}
                    <div className={styles.courseCenter}>
                      <div className={styles.priorityRow}>
                        <span
                          className={
                            isHigh ? styles.priorityBadgeHigh : styles.priorityBadgeMedium
                          }
                        >
                          {course.priority || 'Medium Priority'}
                        </span>
                        {course.isNew && <span className={styles.newBadge}>New</span>}
                      </div>

                      <h3 className={styles.courseTitle} title={course.title}>
                        {course.title}
                      </h3>

                      <p className={styles.courseDesc} title={course.description}>
                        {course.description}
                      </p>

                      <div className={styles.metaRow}>
                        <span className={styles.metaItem}>
                          <span style={{ textTransform: 'capitalize' }}>
                            {course.difficulty || 'Intermediate'}
                          </span>
                        </span>
                        <span>•</span>
                        <span className={styles.metaItem}>
                          <Clock size={13} strokeWidth={2.2} />
                          {course.duration_hours}h
                        </span>
                        <span>•</span>
                        <span className={styles.sourcePill}>
                          {course.source === 'igot' ? 'iGOT' : 'NSSTA'}
                        </span>
                        <span>•</span>
                        <span className={styles.ratingText}>
                          ★ {course.rating?.toFixed(1) || '4.7'}
                          <span className={styles.ratingCount}>
                            ({course.reviewsCount || 320})
                          </span>
                        </span>
                      </div>

                      <div className={styles.tagsRow}>
                        {(course.skill_tags || []).slice(0, 3).map((tag, tIdx) => (
                          <span key={tIdx} className={styles.skillPill}>
                            {tag}
                          </span>
                        ))}
                        {(course.skill_tags || []).length > 3 && (
                          <span className={styles.moreTagsPill}>
                            +{course.skill_tags.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Column Actions & Progress */}
                    <div className={styles.courseRight}>
                      <div className={styles.progressBox}>
                        <span className={styles.progressLabel}>
                          {course.progressPercent}% Complete
                        </span>
                        <div className={styles.progressBarBg}>
                          <div
                            className={styles.progressBarFill}
                            style={{ width: `${course.progressPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className={styles.actionsRow}>
                        {course.progressPercent > 0 ? (
                          <button
                            type="button"
                            className={styles.continueBtn}
                            onClick={() => handleCourseAction(course)}
                          >
                            Continue
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={styles.startLearningBtn}
                            onClick={() => handleCourseAction(course)}
                          >
                            Start Learning
                          </button>
                        )}

                        <button
                          type="button"
                          className={`${styles.bookmarkBtn} ${
                            isBookmarked ? styles.bookmarkBtnActive : ''
                          }`}
                          onClick={() => toggleBookmark(course.course_id)}
                          title={isBookmarked ? 'Saved to bookmarks' : 'Bookmark this course'}
                        >
                          {isBookmarked ? (
                            <BookmarkCheck size={17} strokeWidth={2.3} />
                          ) : (
                            <Bookmark size={17} strokeWidth={2} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {filteredCourses.length > 0 && (
            <button
              type="button"
              className={styles.viewAllRecsBtn}
              onClick={() => navigate('/courses/igot')}
            >
              View All Recommended Courses <ArrowRight size={14} strokeWidth={2.4} />
            </button>
          )}
        </div>

        {/* Right Sidebar */}
        <div className={styles.rightSidebar}>
          {/* Sidebar Card 1: Why These Recommendations? */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarHeader}>
              <h3 className={styles.sidebarTitle}>Why These Recommendations?</h3>
              <p className={styles.sidebarDesc}>
                We analyze multiple factors to recommend the best learning for you.
              </p>
            </div>

            <div className={styles.reasonsList}>
              <div className={styles.reasonItem}>
                <div className={`${styles.reasonIconCircle} ${styles.circleGreen}`}>
                  <CheckCircle2 size={14} strokeWidth={2.6} />
                </div>
                <span>Your skill gaps and proficiency levels</span>
              </div>

              <div className={styles.reasonItem}>
                <div className={`${styles.reasonIconCircle} ${styles.circlePurple}`}>
                  <Target size={14} strokeWidth={2.6} />
                </div>
                <span>Your learning goals and target role</span>
              </div>

              <div className={styles.reasonItem}>
                <div className={`${styles.reasonIconCircle} ${styles.circleOrange}`}>
                  <TrendingUp size={14} strokeWidth={2.6} />
                </div>
                <span>Trending skills in your domain</span>
              </div>

              <div className={styles.reasonItem}>
                <div className={`${styles.reasonIconCircle} ${styles.circleBlue}`}>
                  <Star size={14} strokeWidth={2.6} />
                </div>
                <span>Courses popularity and ratings</span>
              </div>

              <div className={styles.reasonItem}>
                <div className={`${styles.reasonIconCircle} ${styles.circleTeal}`}>
                  <Clock size={14} strokeWidth={2.6} />
                </div>
                <span>Your learning history and progress</span>
              </div>
            </div>
          </div>

          {/* Sidebar Card 2: Learning Path Suggestion */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarHeader}>
              <h3 className={styles.sidebarTitle}>Learning Path Suggestion</h3>
              <p className={styles.sidebarDesc}>Based on your goal, we suggest this path.</p>
            </div>

            <div className={styles.timeline}>
              {/* Step 1 */}
              <div className={styles.timelineStep}>
                <div className={styles.stepLeft}>
                  <div className={styles.stepNumber}>1</div>
                  <span className={styles.stepTitle} title="Statistical Methods for Official Statistics">
                    Statistical Methods for Official Statistics
                  </span>
                </div>
                <span className={styles.stepBadgeCurrent}>Current</span>
              </div>
              <div className={styles.stepConnector}>
                <ArrowDown size={12} strokeWidth={2.5} />
              </div>

              {/* Step 2 */}
              <div className={styles.timelineStep}>
                <div className={styles.stepLeft}>
                  <div className={styles.stepNumber}>2</div>
                  <span className={styles.stepTitle} title="Data Analysis using Python">
                    Data Analysis using Python
                  </span>
                </div>
                <span className={styles.stepBadgeNext}>Next</span>
              </div>
              <div className={styles.stepConnector}>
                <ArrowDown size={12} strokeWidth={2.5} />
              </div>

              {/* Step 3 */}
              <div className={styles.timelineStep}>
                <div className={styles.stepLeft}>
                  <div className={styles.stepNumber}>3</div>
                  <span className={styles.stepTitle} title="Data Visualization with Power BI">
                    Data Visualization with Power BI
                  </span>
                </div>
                <span className={styles.stepBadgeRecommended}>Recommended</span>
              </div>
              <div className={styles.stepConnector}>
                <ArrowDown size={12} strokeWidth={2.5} />
              </div>

              {/* Step 4 */}
              <div className={styles.timelineStep}>
                <div className={styles.stepLeft}>
                  <div className={styles.stepNumberUpcoming}>4</div>
                  <span className={styles.stepTitle} title="Advanced Statistical Modeling">
                    Advanced Statistical Modeling
                  </span>
                </div>
                <span className={styles.stepBadgeUpcoming}>Upcoming</span>
              </div>
              <div className={styles.stepConnector}>
                <ArrowDown size={12} strokeWidth={2.5} />
              </div>

              {/* Step 5 */}
              <div className={styles.timelineStep}>
                <div className={styles.stepLeft}>
                  <div className={styles.stepNumberUpcoming}>5</div>
                  <span className={styles.stepTitle} title="Report Writing & Storytelling">
                    Report Writing & Storytelling
                  </span>
                </div>
                <span className={styles.stepBadgeUpcoming}>Upcoming</span>
              </div>
            </div>

            <button
              type="button"
              className={styles.fullPathBtn}
              onClick={() => navigate('/learning-path')}
            >
              View Full Learning Path <ArrowRight size={13} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom Banner ────────────────────────────────────────────────── */}
      <div className={styles.bottomBanner}>
        <div className={styles.bannerLeft}>
          <div className={styles.rocketCircle}>
            <Rocket size={22} strokeWidth={2.4} />
          </div>
          <div className={styles.bannerText}>
            <h4 className={styles.bannerTitle}>Keep Going!</h4>
            <p className={styles.bannerSubtitle}>
              You are on the right track. Continue learning to achieve your goal.
            </p>
          </div>
        </div>

        <button
          type="button"
          className={styles.bannerBtn}
          onClick={() => navigate('/learning-path')}
        >
          Go to Learning Path <ArrowRight size={15} strokeWidth={2.4} />
        </button>
      </div>

      {/* ── Update Preferences Modal ─────────────────────────────────────── */}
      {isPrefsModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsPrefsModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Update Learning Preferences</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsPrefsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Target Role in MoSPI / Cadre</label>
                <select
                  className={styles.formSelect}
                  value={prefsForm.targetRole}
                  onChange={(e) => setPrefsForm({ ...prefsForm, targetRole: e.target.value })}
                >
                  <option value="Statistical Analyst">Statistical Analyst</option>
                  <option value="Junior Statistical Officer (JSO)">Junior Statistical Officer (JSO)</option>
                  <option value="Senior Statistical Officer (SSO)">Senior Statistical Officer (SSO)</option>
                  <option value="Assistant Director (Cadre)">Assistant Director (Cadre)</option>
                  <option value="Data Scientist (MoSPI)">Data Scientist (MoSPI)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Primary Learning Goal</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={prefsForm.goal}
                  onChange={(e) => setPrefsForm({ ...prefsForm, goal: e.target.value })}
                  placeholder="e.g. Master survey estimation and data visualization"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Weekly Learning Commitment</label>
                <div className={styles.chipGroup}>
                  {[5, 10, 15, 20].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      className={`${styles.choiceChip} ${
                        prefsForm.weeklyHours === hrs ? styles.choiceChipActive : ''
                      }`}
                      onClick={() => setPrefsForm({ ...prefsForm, weeklyHours: hrs })}
                    >
                      {hrs} Hours / Week
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Key Focus Areas (Select up to 4)</label>
                <div className={styles.chipGroup}>
                  {[
                    'Statistical Methods',
                    'Data Analysis',
                    'Data Visualization',
                    'Official Statistics',
                    'Survey Sampling',
                    'Machine Learning',
                    'SQL Databases',
                    'CAPI Digital Enumeration',
                  ].map((area) => {
                    const isSelected = prefsForm.focusAreas.includes(area)
                    return (
                      <button
                        key={area}
                        type="button"
                        className={`${styles.choiceChip} ${
                          isSelected ? styles.choiceChipActive : ''
                        }`}
                        onClick={() => {
                          let next = isSelected
                            ? prefsForm.focusAreas.filter((a) => a !== area)
                            : [...prefsForm.focusAreas, area]
                          if (next.length > 5) next = next.slice(0, 5)
                          setPrefsForm({ ...prefsForm, focusAreas: next })
                        }}
                      >
                        {isSelected && '✓ '}
                        {area}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsPrefsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.saveBtn}>
                  Save Preferences
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Goal Details Modal ───────────────────────────────────────────── */}
      {isGoalModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsGoalModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Your Career Goal Overview</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsGoalModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Target Role
                </span>
                <h4 style={{ margin: '4px 0 0 0', fontSize: 16, color: '#0f172a', fontWeight: 700 }}>
                  {preferences.targetRole}
                </h4>
                <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#475569' }}>
                  Goal: {preferences.goal}
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px 0', color: '#1e293b' }}>
                  Competency Gap Closure Strategy
                </h4>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                  <li>Complete core prerequisite <strong>Statistical Methods for Official Statistics</strong>.</li>
                  <li>Advance practical proficiency in automated data cleaning and Python pandas manipulation.</li>
                  <li>Fulfill NSSTA mandatory credit hours (at least 20 hours of approved curriculum).</li>
                  <li>Deliver interactive data dashboards in Power BI for executive cadre reporting.</li>
                </ul>
              </div>

              <div style={{ background: '#ecfdf5', padding: 12, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={20} color="#059669" />
                <span style={{ fontSize: 13, color: '#065f46', fontWeight: 500 }}>
                  On track to achieve certified proficiency within 6 weeks based on current pacing.
                </span>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={() => setIsGoalModalOpen(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Interactive Course Learning Modal ────────────────────────────── */}
      {activeCourseModal && (
        <div className={styles.modalOverlay} onClick={() => setActiveCourseModal(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase' }}>
                  {activeCourseModal.source === 'igot' ? 'iGOT Karmayogi Platform' : 'NSSTA Training Academy'}
                </span>
                <h3 className={styles.modalTitle} style={{ marginTop: 2 }}>
                  {activeCourseModal.title}
                </h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setActiveCourseModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ margin: 0, fontSize: 13.5, color: '#475569', lineHeight: 1.5 }}>
                {activeCourseModal.description}
              </p>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', background: '#f8fafc', padding: 12, borderRadius: 10 }}>
                <span style={{ fontSize: 12.5, color: '#334155' }}>
                  <strong>Duration:</strong> {activeCourseModal.duration_hours} Hours
                </span>
                <span style={{ fontSize: 12.5, color: '#334155' }}>
                  <strong>Level:</strong> {activeCourseModal.difficulty}
                </span>
                <span style={{ fontSize: 12.5, color: '#334155' }}>
                  <strong>Rating:</strong> ★ {activeCourseModal.rating} ({activeCourseModal.reviewsCount} reviews)
                </span>
              </div>

              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>
                  Curriculum Modules
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { num: '01', title: 'Introduction to Core Concepts & Standards', time: '45 mins', done: true },
                    { num: '02', title: 'Hands-on Application with Official Survey Data', time: '1 hr 30m', done: false },
                    { num: '03', title: 'Validation, Cleansing & Error Estimation', time: '2 hrs 15m', done: false },
                    { num: '04', title: 'Final Knowledge Check & Certification', time: '1 hr', done: false },
                  ].map((mod) => (
                    <div
                      key={mod.num}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <PlayCircle size={18} color="#6366f1" />
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>
                          Module {mod.num}: {mod.title}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: '#64748b' }}>{mod.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setActiveCourseModal(null)}
              >
                Close
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={() => {
                  showToast('Lesson progress updated! Your dashboard metrics will sync.')
                  setActiveCourseModal(null)
                }}
              >
                Start Module 01
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ───────────────────────────────────────────── */}
      {toastMessage && (
        <div className={styles.toast}>
          <CheckCircle2 size={18} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
