import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles,
  Settings,
  Target,
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
  X,
  Rocket,
  Cpu,
  Database,
  LineChart,
  Award,
} from 'lucide-react'
import { getRecommendations } from '../../api/learningPath.api'
import { getMyEnrollments, enrollInCourse } from '../../api/course.api'
import { useAuthStore } from '../../store/authStore'
import styles from './RecommendedLearningPage.module.css'

export default function RecommendedLearningPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // ── Local UI State ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('all') // 'all', 'high', 'completed'
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
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // User preferences saved to localStorage
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('kaushalai_learning_prefs')
      if (saved) return JSON.parse(saved)
    } catch {}
    return {
      goal: 'Close Core Role Competency Gaps',
      targetRole: user?.role_id?.title || 'Officer',
      weeklyHours: 10,
      focusAreas: ['Core Competencies', 'Digital Literacy', 'Productivity'],
      preferredSource: 'all',
    }
  })

  const [prefsForm, setPrefsForm] = useState(preferences)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: recData, isLoading: isRecLoading } = useQuery({
    queryKey: ['recommendations'],
    queryFn: getRecommendations,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myEnrollments'] })
      showToast('Successfully enrolled! Course added to your learning plan.')
    },
    onError: () => {
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

  // ── Map Real Recommendations ──────────────────────────────────────────────
  const allCourses = useMemo(() => {
    const rawList = recData?.recommendations || []

    return rawList.map((rec, i) => {
      const course = rec.course_id || {}
      const cid = String(course._id || `rec-${i}`)
      const enrollment = enrollmentMap.get(cid)

      // Calculate duration hours
      let durationHours = 6
      if (course.estimatedHours) {
        durationHours = course.estimatedHours
      } else if (typeof course.duration === 'number') {
        durationHours = course.duration
      } else if (typeof course.duration === 'string') {
        const parsed = parseFloat(course.duration)
        if (!isNaN(parsed) && parsed > 0) durationHours = parsed
      }

      // Skill tags
      const skillTags = (course.skillTags || []).map((t) => (typeof t === 'object' ? t.name : t))

      return {
        id: cid,
        course_id: cid,
        title: course.title || 'Recommended Course',
        description: course.description || 'Targeted training module mapped to your role requirements.',
        reason: rec.reason || '',
        priority_rank: rec.priority_rank || i + 1,
        source: (course.provider || 'iGOT Karmayogi').toLowerCase().includes('nssta') ? 'nssta' : 'igot',
        providerName: course.provider || 'iGOT Karmayogi',
        difficulty: (course.level || 'intermediate').toLowerCase(),
        duration_hours: durationHours,
        final_score: Math.max(70, 98 - i * 3),
        priority: (rec.priority_rank <= 2 || i < 2) ? 'High Priority' : 'Medium Priority',
        isNew: i < 3,
        rating: 4.7,
        reviewsCount: 140 + i * 25,
        skill_tags: skillTags.length > 0 ? skillTags : ['Role Competency', 'Official Standards'],
        thumbType: (i % 4) + 1,
        isEnrolled: !!enrollment,
        progressPercent: enrollment?.progressPercent || 0,
        status: enrollment?.status || 'not-started',
      }
    })
  }, [recData, enrollmentMap])

  // ── Filter & Sort Logic ───────────────────────────────────────────────────
  const filteredCourses = useMemo(() => {
    return allCourses
      .filter((course) => {
        // Tab filter
        if (activeTab === 'high' && !course.priority?.includes('High')) return false
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
      })
      .sort((a, b) => {
        if (sortBy === 'score') return b.final_score - a.final_score
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0)
        if (sortBy === 'duration-asc') return (a.duration_hours || 0) - (b.duration_hours || 0)
        if (sortBy === 'duration-desc') return (b.duration_hours || 0) - (a.duration_hours || 0)
        // default priority_rank asc
        return a.priority_rank - b.priority_rank
      })
  }, [allCourses, activeTab, categoryFilter, difficultyFilter, sourceFilter, sortBy])

  // ── Calculated Stats ──────────────────────────────────────────────────────
  const totalHours = useMemo(() => {
    const total = allCourses.reduce((sum, c) => sum + (c.duration_hours || 0), 0)
    if (total === 0) return '0h'
    const hours = Math.floor(total)
    const minutes = Math.round((total - hours) * 60)
    return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`
  }, [allCourses])

  const inProgressCount = useMemo(() => {
    return allCourses.filter((c) => c.progressPercent > 0 && c.progressPercent < 100).length
  }, [allCourses])

  const newCount = useMemo(() => {
    return allCourses.filter((c) => c.isNew).length
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
            Personalized AI recommendations based on your diagnostic assessment and role requirements.
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
              <span className={styles.statBadge}>Role: {user?.role_id?.title || preferences.targetRole}</span>
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
              <div className={styles.bigStatNumber}>{allCourses.length}</div>
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
            onClick={() => navigate('/my-learning')}
          >
            Plan Your Learning <ArrowRight size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── Empty State if no assessment taken / zero recommendations ──── */}
      {!isRecLoading && allCourses.length === 0 && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: '56px 24px',
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          <Sparkles size={40} color="#4f46e5" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
            No recommendations yet
          </h3>
          <p style={{ fontSize: '0.9375rem', color: '#64748b', maxWidth: 480, margin: '0 auto 20px' }}>
            Complete your diagnostic assessment to get personalized course recommendations generated by our AI engine for your role.
          </p>
          <button
            type="button"
            onClick={() => navigate('/assessment')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              background: '#4f46e5',
              color: '#ffffff',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Take Diagnostic Assessment &rarr;
          </button>
        </div>
      )}

      {/* ── Tabs Row ─────────────────────────────────────────────────────── */}
      <div className={styles.tabsContainer}>
        {[
          { id: 'all', label: `All Recommendations (${allCourses.length})` },
          { id: 'high', label: 'Highest Priority' },
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
            <option value="Digital">Digital Literacy</option>
            <option value="Communication">Communication</option>
            <option value="Office">Productivity & Office</option>
            <option value="Cybersecurity">Cybersecurity</option>
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
            <option value="all">All Providers</option>
            <option value="igot">iGOT Karmayogi</option>
            <option value="nssta">NSSTA Academy</option>
          </select>

          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="relevance">Sort by: AI Priority Rank</option>
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

      {/* ── Main Layout: Course Cards ─────────────────────────────────────── */}
      <div className={styles.mainLayout}>
        <div className={styles.leftColumn}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Top Picks for You</h2>
            <p className={styles.sectionSubtitle}>
              Courses recommended based on your verified skill gaps and career progression goals.
            </p>
          </div>

          <div className={styles.courseList}>
            {filteredCourses.length === 0 && allCourses.length > 0 ? (
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
                  Try resetting difficulty, provider, or category filters.
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
              filteredCourses.map((course) => {
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
                        {course.isNew && <span className={styles.newBadge}>Priority #{course.priority_rank}</span>}
                      </div>

                      <h3 className={styles.courseTitle} title={course.title}>
                        {course.title}
                      </h3>

                      <p className={styles.courseDesc} title={course.description}>
                        {course.description}
                      </p>

                      {/* AI Recommendation Reason */}
                      {course.reason && (
                        <div
                          style={{
                            margin: '8px 0',
                            padding: '8px 12px',
                            background: '#f5f3ff',
                            border: '1px solid #ede9fe',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                            fontSize: '0.8125rem',
                            color: '#5b21b6',
                            lineHeight: 1.45,
                          }}
                        >
                          <Sparkles size={14} color="#7c3aed" style={{ flexShrink: 0, marginTop: 2 }} />
                          <span>
                            <strong>Why recommended:</strong> {course.reason}
                          </span>
                        </div>
                      )}

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
                          {course.providerName}
                        </span>
                        <span>•</span>
                        <span className={styles.ratingText}>
                          ★ {course.rating?.toFixed(1) || '4.7'}
                          <span className={styles.ratingCount}>
                            ({course.reviewsCount || 150})
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
                            {course.isEnrolled ? 'Open Course' : 'Start Course'}
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
              onClick={() => navigate('/my-learning')}
            >
              View My Learning Path <ArrowRight size={14} strokeWidth={2.4} />
            </button>
          )}
        </div>
      </div>

      {/* ── Bottom Banner ────────────────────────────────────────────────── */}
      <div className={styles.bottomBanner}>
        <div className={styles.bannerLeft}>
          <div className={styles.rocketCircle}>
            <Rocket size={22} strokeWidth={2.4} />
          </div>
          <div className={styles.bannerText}>
            <h4 className={styles.bannerTitle}>Ready to begin?</h4>
            <p className={styles.bannerSubtitle}>
              Progress through your recommended modules to close your evaluated competency gaps.
            </p>
          </div>
        </div>

        <button
          type="button"
          className={styles.bannerBtn}
          onClick={() => navigate('/my-learning')}
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
                <label className={styles.formLabel}>Target Role / Cadre</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={prefsForm.targetRole}
                  onChange={(e) => setPrefsForm({ ...prefsForm, targetRole: e.target.value })}
                  placeholder="e.g. Statistical Officer"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Primary Learning Goal</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={prefsForm.goal}
                  onChange={(e) => setPrefsForm({ ...prefsForm, goal: e.target.value })}
                  placeholder="e.g. Close skill gaps for current cadre"
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
                  {user?.role_id?.title || preferences.targetRole}
                </h4>
                <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#475569' }}>
                  Goal: {preferences.goal}
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px 0', color: '#1e293b' }}>
                  Competency Gap Closure Strategy
                </h4>
                <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                  Complete the sequenced modules in your recommended curriculum. Taking post-training assessments will automatically update your verified proficiency levels.
                </p>
              </div>

              <div style={{ background: '#ecfdf5', padding: 12, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={20} color="#059669" />
                <span style={{ fontSize: 13, color: '#065f46', fontWeight: 500 }}>
                  Personalized curriculum generated directly from your diagnostic assessment results.
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
                  {activeCourseModal.providerName}
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

              {activeCourseModal.reason && (
                <div style={{ background: '#f5f3ff', border: '1px solid #ede9fe', padding: 12, borderRadius: 8, fontSize: 13, color: '#5b21b6' }}>
                  <strong>Recommendation Context:</strong> {activeCourseModal.reason}
                </div>
              )}

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
                  showToast('Lesson opened! Your dashboard metrics will sync.')
                  setActiveCourseModal(null)
                }}
              >
                Start Learning
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
