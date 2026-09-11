import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Star,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Layers,
  Award,
  TrendingUp,
  RotateCw,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  PlayCircle,
  X,
} from 'lucide-react'
import {
  listCourses,
  getMyEnrollments,
  enrollInCourse,
} from '../../api/course.api'
import styles from './IgotCoursesPage.module.css'

/*
 * ============================================================
 * iGOT Karmayogi curated catalogue
 * ============================================================
 *
 * IMPORTANT:
 * The course IDs below are intentionally unchanged.
 * CourseDetailPage.jsx uses these same IDs for:
 *   - course-specific titles/content
 *   - YouTube video mapping
 *   - hands-on lab access
 *
 * The current CourseDetailPage supplied with this change defines:
 *
 *   igot-crs-01 -> Data Analysis with Python
 *   igot-crs-02 -> Artificial Intelligence for Public Governance
 *   igot-crs-03 -> Sustainable Development Goals
 *   igot-crs-04 -> Digital Personal Data Protection Act, 2023
 *   igot-crs-05 -> Bharatiya Nyaya Sanhita, 2023: An Introduction
 *   igot-crs-06 -> Personal Finance for Karmayogis
 *
 * Thumbnail URLs use the exact YouTube video IDs from the current
 * CourseDetailPage. This keeps the catalogue card and detail page
 * visually/content-wise tied to the same course.
 */

const IGOT_YOUTUBE_VIDEOS = {
  'igot-crs-01': 'KgCgpCIOkIs',
  'igot-crs-02': 'Vz8zcKawwEo',
  'igot-crs-03': 'hTnnf9AhDLM',
  'igot-crs-04': 'FUQW44EFmQQ',
  'igot-crs-05': 'B_jQ3DlrVs4',
  'igot-crs-06': 'kCthkqPKySw',
}

const IGOT_COURSE_CATALOGUE = [
  {
    _id: 'igot-crs-01',
    title: 'Data Analysis with Python',
    description:
      'Practical data analysis using Python, Pandas, NumPy, exploratory analysis, and data visualization.',
    provider: 'Learning Resource',
    category: 'Data Analytics',
    difficulty: 'Intermediate',
    durationHours: 10,
    rating: 4.8,
    reviewsCount: 780,
    skillTags: [
      'Python Programming',
      'Pandas',
      'NumPy',
      'Data Analysis',
      'Data Visualization',
    ],
    modulesCount: 6,
    thumbnail: `https://img.youtube.com/vi/${IGOT_YOUTUBE_VIDEOS['igot-crs-01']}/maxresdefault.jpg`,
  },

  {
    _id: 'igot-crs-02',
    title: 'Artificial Intelligence for Public Governance',
    description:
      'Build foundational AI literacy and understand how AI can support smarter, more efficient, and citizen-centric public governance.',
    provider: 'Karmayogi Bharat',
    category: 'Artificial Intelligence',
    difficulty: 'Intermediate',
    durationHours: 2.7,
    rating: 4.8,
    reviewsCount: 420,
    skillTags: [
      'Artificial Intelligence',
      'Generative AI',
      'Data-Driven Decision Making',
      'AI in Governance',
      'Responsible AI',
    ],
    modulesCount: 4,
    thumbnail: `https://img.youtube.com/vi/${IGOT_YOUTUBE_VIDEOS['igot-crs-02']}/maxresdefault.jpg`,
  },

  {
    _id: 'igot-crs-03',
    title: 'Sustainable Development Goals',
    description:
      'Understand the SDG framework and how inclusive development, gender equality, and public policy contribute to sustainable development.',
    provider: 'Karmayogi Bharat',
    category: 'Sustainable Development',
    difficulty: 'Beginner',
    durationHours: 1,
    rating: 4.7,
    reviewsCount: 360,
    skillTags: [
      'Sustainable Development Goals',
      'SDG 5',
      'Gender Equality',
      'Inclusive Development',
      'Public Policy',
    ],
    modulesCount: 3,
    thumbnail: `https://img.youtube.com/vi/${IGOT_YOUTUBE_VIDEOS['igot-crs-03']}/maxresdefault.jpg`,
  },

  {
    _id: 'igot-crs-04',
    title: 'Digital Personal Data Protection Act, 2023',
    description:
      'Understand the Digital Personal Data Protection Act and the responsibilities and rights involved in personal-data processing.',
    provider: 'Karmayogi Bharat',
    category: 'Digital Governance',
    difficulty: 'Beginner',
    durationHours: 1.2,
    rating: 4.7,
    reviewsCount: 390,
    skillTags: [
      'Data Protection',
      'Digital Governance',
      'Privacy',
      'Cybersecurity',
      'Data Responsibility',
    ],
    modulesCount: 4,
    thumbnail: `https://img.youtube.com/vi/${IGOT_YOUTUBE_VIDEOS['igot-crs-04']}/maxresdefault.jpg`,
  },

  {
    _id: 'igot-crs-05',
    title: 'Bharatiya Nyaya Sanhita, 2023: An Introduction',
    description:
      'Understand the major reforms introduced by the Bharatiya Nyaya Sanhita, 2023 and its key changes to India’s criminal law framework.',
    provider: 'Karmayogi Bharat',
    category: 'Law & Governance',
    difficulty: 'Beginner',
    durationHours: 1,
    rating: 4.7,
    reviewsCount: 400,
    skillTags: [
      'Bharatiya Nyaya Sanhita',
      'Criminal Law',
      'Public Administration',
      'Legal Awareness',
      'Governance',
    ],
    modulesCount: 4,
    thumbnail: `https://img.youtube.com/vi/${IGOT_YOUTUBE_VIDEOS['igot-crs-05']}/maxresdefault.jpg`,
  },

  {
    _id: 'igot-crs-06',
    title: 'Personal Finance for Karmayogis',
    description:
      'Build practical financial literacy around money management, investment basics, and personal financial decision-making.',
    provider: 'Karmayogi Bharat',
    category: 'Financial Management',
    difficulty: 'Beginner',
    durationHours: 1,
    rating: 4.7,
    reviewsCount: 350,
    skillTags: [
      'Financial Literacy',
      'Money Management',
      'Investment Basics',
      'Financial Planning',
      'Personal Finance',
    ],
    modulesCount: 4,
    thumbnail: `https://img.youtube.com/vi/${IGOT_YOUTUBE_VIDEOS['igot-crs-06']}/maxresdefault.jpg`,
  },
]

/*
 * These are the filters shown in the catalogue.
 * They match the categories used by the current CourseDetailPage
 * instead of the old statistical-course categories.
 */
const COURSE_TABS = [
  'All Courses',
  'Data Analytics',
  'Artificial Intelligence',
  'Sustainable Development',
  'Digital Governance',
  'Law & Governance',
  'Financial Management',
]

export default function IgotCoursesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('All Courses')
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [sortBy, setSortBy] = useState('popular')
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)

    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  /*
   * Load API courses so the existing real backend integration remains
   * available. The six curated demo courses below take priority when
   * their IDs match the CourseDetailPage IDs.
   */
  const {
    data: coursesData,
    isLoading: coursesLoading,
    isError: coursesError,
  } = useQuery({
    queryKey: ['courses', 'igot'],
    queryFn: () => listCourses({ source: 'igot' }),
  })

  /*
   * Existing enrollment integration.
   */
  const { data: enrollmentsData } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
  })

  /*
   * Convert enrollment records to a simple ID Set.
   */
  const enrolledSet = useMemo(() => {
    return new Set(
      (enrollmentsData?.enrollments || []).map((e) =>
        typeof e.courseId === 'object'
          ? String(e.courseId._id)
          : String(e.courseId)
      )
    )
  }, [enrollmentsData])

  /*
   * Existing real enrollment mutation.
   */
  const enrollMutation = useMutation({
    mutationFn: (courseId) => enrollInCourse(courseId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['myEnrollments'],
      })

      showToast(
        'Successfully enrolled in iGOT Karmayogi course!'
      )
    },

    onError: () => {
      /*
       * Preserve the existing demo/offline behaviour.
       */
      showToast(
        'Enrolled successfully in offline demonstration mode.'
      )
    },
  })

  /*
   * Convert API records into the shape expected by the catalogue.
   */
  const apiCourses = useMemo(() => {
    return (coursesData?.courses || []).map((c) => ({
      _id: String(c._id),
      title: c.title,
      description: c.description || '',
      provider: c.provider || 'iGOT Karmayogi',
      category: c.category || 'Data Analytics',
      difficulty: c.difficulty
        ? c.difficulty.charAt(0).toUpperCase() +
          c.difficulty.slice(1)
        : 'Intermediate',
      durationHours:
        c.duration_hours ||
        c.durationHours ||
        5,
      rating: c.rating || 4.8,
      reviewsCount: 240,
      skillTags: (
        c.skillTags ||
        c.skill_tags ||
        []
      ).map((tag) =>
        typeof tag === 'object'
          ? tag.name || tag.title || String(tag._id)
          : String(tag)
      ),
      modulesCount: c.modules?.length || 6,
      thumbnail: c.thumbnail || c.image || null,
    }))
  }, [coursesData])

  /*
   * Merge API courses with the six curated cards.
   *
   * If the API contains one of the six IDs, the curated object wins.
   * This is deliberate: CourseDetailPage has the authoritative
   * course-specific presentation for these six IDs.
   */
  const allCourses = useMemo(() => {
    const curatedIds = new Set(
      IGOT_COURSE_CATALOGUE.map((course) => course._id)
    )

    const extraApiCourses = apiCourses.filter(
      (course) => !curatedIds.has(course._id)
    )

    return [
      ...IGOT_COURSE_CATALOGUE,
      ...extraApiCourses,
    ]
  }, [apiCourses])

  /*
   * Filtering and sorting.
   */
  const filteredCourses = useMemo(() => {
    return allCourses
      .filter((course) => {
        if (
          activeTab !== 'All Courses' &&
          course.category !== activeTab
        ) {
          return false
        }

        if (searchQuery.trim()) {
          const q = searchQuery
            .trim()
            .toLowerCase()

          const matchesTitle =
            course.title
              .toLowerCase()
              .includes(q)

          const matchesDescription =
            course.description
              .toLowerCase()
              .includes(q)

          const matchesTags =
            course.skillTags.some((tag) =>
              String(tag)
                .toLowerCase()
                .includes(q)
            )

          const matchesProvider =
            course.provider
              .toLowerCase()
              .includes(q)

          if (
            !matchesTitle &&
            !matchesDescription &&
            !matchesTags &&
            !matchesProvider
          ) {
            return false
          }
        }

        if (
          difficultyFilter !== 'all' &&
          course.difficulty.toLowerCase() !==
            difficultyFilter.toLowerCase()
        ) {
          return false
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'rating') {
          return b.rating - a.rating
        }

        if (sortBy === 'duration') {
          return (
            a.durationHours -
            b.durationHours
          )
        }

        return (
          b.reviewsCount -
          a.reviewsCount
        )
      })
  }, [
    allCourses,
    activeTab,
    searchQuery,
    difficultyFilter,
    sortBy,
  ])

  const handleEnrollClick = (courseId) => {
    enrollMutation.mutate(courseId)
  }

  /*
   * Kept as a separate handler so the card has one clear navigation
   * destination. The visible Link elements below still provide native
   * browser accessibility and open the exact same route.
   */
  const openCourse = (courseId) => {
    navigate(`/courses/${courseId}`)
  }

  const clearFilters = () => {
    setActiveTab('All Courses')
    setSearchQuery('')
    setDifficultyFilter('all')
    setSortBy('popular')
  }

  const enrolledCount = enrolledSet.size || 6

  return (
    <div className={styles.pageContainer}>
      {/* =====================================================
          Breadcrumb & Header
          ===================================================== */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <nav
            className={styles.breadcrumbs}
            aria-label="Breadcrumb"
          >
            <Link
              to="/dashboard"
              className={styles.breadcrumbLink}
            >
              Dashboard
            </Link>

            <span
              className={styles.breadcrumbSeparator}
            >
              ›
            </span>

            <span
              className={styles.breadcrumbActive}
            >
              iGOT Courses
            </span>
          </nav>

          <h1 className={styles.title}>
            iGOT Karmayogi Courses
          </h1>

          <p className={styles.subtitle}>
            Official national civil services capacity
            building courses synchronized with the
            Department of Personnel and Training (DoPT).
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link
            to="/igot-integration"
            className={styles.secondaryBtn}
          >
            <RotateCw size={15} />
            <span>iGOT Integration: Prototype Mode</span>
          </Link>

          <Link
            to="/my-courses"
            className={styles.primaryBtn}
          >
            <BookOpen size={15} />
            <span>My Enrolled Courses</span>
          </Link>
        </div>
      </div>

      {/* =====================================================
          KPI Cards
          ===================================================== */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIconWrap}
            style={{
              background: '#EFF6FF',
              color: '#2563EB',
            }}
          >
            <Layers size={22} />
          </div>

          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>
              Available Courses
            </span>

            <span className={styles.kpiValue}>
              248
            </span>

            <span className={styles.kpiSub}>
              Civil services catalogue
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIconWrap}
            style={{
              background: '#ECFDF5',
              color: '#10B981',
            }}
          >
            <BookOpen size={22} />
          </div>

          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>
              My Enrolments
            </span>

            <span className={styles.kpiValue}>
              {enrolledCount}
            </span>

            <span className={styles.kpiSub}>
              Active ongoing modules
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIconWrap}
            style={{
              background: '#FAF5FF',
              color: '#8B5CF6',
            }}
          >
            <ShieldCheck size={22} />
          </div>

          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>
              Completed &amp; Certified
            </span>

            <span className={styles.kpiValue}>
              4
            </span>

            <span className={styles.kpiSub}>
              DoPT verified credentials
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIconWrap}
            style={{
              background: '#FFF7ED',
              color: '#F97316',
            }}
          >
            <RotateCw size={22} />
          </div>

          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>
              Sync Status
            </span>

            <span
              className={styles.kpiValue}
              style={{
                color: '#10B981',
                fontSize: 18,
              }}
            >
              Connected
            </span>

            <span className={styles.kpiSub}>
              Today, 09:30 AM
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================
          Category Tabs
          ===================================================== */}
      <div className={styles.tabsContainer}>
        {COURSE_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tabItem} ${
              activeTab === tab
                ? styles.tabItemActive
                : ''
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* =====================================================
          Search & Filters
          ===================================================== */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search
            size={16}
            className={styles.searchIcon}
          />

          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search iGOT courses by title, topic or skill..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              style={{
                border: 0,
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: '#64748b',
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className={styles.filterSelects}>
          <select
            className={styles.selectDropdown}
            value={difficultyFilter}
            onChange={(e) =>
              setDifficultyFilter(e.target.value)
            }
            aria-label="Filter by difficulty"
          >
            <option value="all">
              All Difficulties
            </option>

            <option value="beginner">
              Beginner
            </option>

            <option value="intermediate">
              Intermediate
            </option>

            <option value="advanced">
              Advanced
            </option>
          </select>

          <select
            className={styles.selectDropdown}
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value)
            }
            aria-label="Sort courses"
          >
            <option value="popular">
              Most Popular
            </option>

            <option value="rating">
              Highest Rated
            </option>

            <option value="duration">
              Shortest Duration
            </option>
          </select>

          {(activeTab !== 'All Courses' ||
            searchQuery ||
            difficultyFilter !== 'all' ||
            sortBy !== 'popular') && (
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={clearFilters}
              title="Reset filters"
            >
              <RefreshCw size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* =====================================================
          Result Summary
          ===================================================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          margin: '12px 0 16px',
          color: '#64748b',
          fontSize: 12.5,
        }}
      >
        <span>
          Showing{' '}
          <strong style={{ color: '#334155' }}>
            {filteredCourses.length}
          </strong>{' '}
          course
          {filteredCourses.length === 1
            ? ''
            : 's'}
        </span>

        {searchQuery && (
          <span>
            Search results for "
            <strong style={{ color: '#334155' }}>
              {searchQuery}
            </strong>
            "
          </span>
        )}
      </div>

      {/* =====================================================
          Loading State
          ===================================================== */}
      {coursesLoading && (
        <div
          style={{
            padding: 18,
            marginBottom: 16,
            borderRadius: 10,
            background: '#f8fafc',
            color: '#64748b',
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          Syncing additional iGOT course records...
        </div>
      )}

      {/* =====================================================
          API Error Notice
          ===================================================== */}
      {coursesError && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            borderRadius: 10,
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            color: '#9a3412',
            fontSize: 12.5,
          }}
        >
          Showing the curated iGOT catalogue. Additional
          server course records could not be synchronized.
        </div>
      )}

      {/* =====================================================
          Course Grid
          ===================================================== */}
      <div className={styles.coursesGrid}>
        {filteredCourses.map((course) => {
          const isEnrolled =
            enrolledSet.has(course._id)

          const thumbnail =
            course.thumbnail ||
            `https://img.youtube.com/vi/${
              IGOT_YOUTUBE_VIDEOS[course._id] || ''
            }/maxresdefault.jpg`

          return (
            <div
              key={course._id}
              className={styles.courseCard}
            >
              {/* ------------------------------------------------
                  CLICK TARGET #1:
                  Thumbnail / green arrow area.
                  Opens the exact same route as Details.
                  ------------------------------------------------ */}
              <Link
                to={`/courses/${course._id}`}
                className={styles.cardBanner}
                aria-label={`Open ${course.title}`}
                style={{
                  backgroundImage: `url("${thumbnail}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  display: 'block',
                  position: 'relative',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  overflow: 'hidden',
                }}
              >
                {/* Dark image overlay keeps badges readable. */}
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(to bottom, rgba(0,0,0,.18), rgba(0,0,0,.12) 45%, rgba(0,0,0,.45))',
                    pointerEvents: 'none',
                  }}
                />

                <div
                  className={styles.bannerTop}
                  style={{
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  <span
                    className={styles.providerBadge}
                  >
                    {course.provider}
                  </span>

                  {isEnrolled && (
                    <span
                      className={
                        styles.enrolledTag
                      }
                    >
                      <Check size={12} />
                      <span>Enrolled</span>
                    </span>
                  )}
                </div>

                {/* Video play indicator over the thumbnail. */}
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform:
                      'translate(-50%, -50%)',
                    zIndex: 3,
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background:
                      'rgba(255,255,255,.90)',
                    color: '#4F46E5',
                    boxShadow:
                      '0 4px 14px rgba(0,0,0,.22)',
                  }}
                >
                  <PlayCircle size={30} />
                </span>

                <span
                  className={
                    styles.bannerCategory
                  }
                  style={{
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  {course.category}
                </span>
              </Link>

              <div className={styles.cardBody}>
                {/* ------------------------------------------------
                    CLICK TARGET #2:
                    Course title / green arrow area.
                    ------------------------------------------------ */}
                <Link
                  to={`/courses/${course._id}`}
                  className={styles.courseTitle}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    display: 'block',
                  }}
                >
                  {course.title}
                </Link>

                <p
                  className={
                    styles.courseDesc
                  }
                >
                  {course.description}
                </p>

                <div className={styles.metaRow}>
                  <div
                    className={styles.metaItem}
                  >
                    <Clock
                      size={14}
                      className={
                        styles.metaIcon
                      }
                    />

                    <span>
                      {course.durationHours}h
                    </span>
                  </div>

                  <div
                    className={styles.metaItem}
                  >
                    <BookOpen
                      size={14}
                      className={
                        styles.metaIcon
                      }
                    />

                    <span>
                      {course.modulesCount}{' '}
                      modules
                    </span>
                  </div>

                  <div
                    className={styles.metaItem}
                  >
                    <Star
                      size={14}
                      fill="#F59E0B"
                      color="#F59E0B"
                    />

                    <span>
                      {course.rating} (
                      {course.reviewsCount})
                    </span>
                  </div>
                </div>

                <div
                  className={
                    styles.skillTagsWrap
                  }
                >
                  {course.skillTags.map(
                    (tag, idx) => (
                      <span
                        key={idx}
                        className={
                          styles.skillTag
                        }
                      >
                        {tag}
                      </span>
                    )
                  )}
                </div>

                <div
                  className={
                    styles.cardFooter
                  }
                >
                  {isEnrolled ? (
                    <Link
                      to={`/my-courses/${course._id}`}
                      className={
                        styles.continueBtn
                      }
                    >
                      <span>
                        Continue Learning
                      </span>

                      <ArrowRight
                        size={14}
                      />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={
                        styles.enrollBtn
                      }
                      onClick={() =>
                        handleEnrollClick(
                          course._id
                        )
                      }
                      disabled={
                        enrollMutation.isPending
                      }
                    >
                      <Sparkles size={14} />

                      <span>
                        {enrollMutation.isPending
                          ? 'Enrolling...'
                          : 'Enroll in iGOT'}
                      </span>
                    </button>
                  )}

                  {/* ------------------------------------------------
                      CLICK TARGET #3:
                      Existing blue Details button.
                      ------------------------------------------------ */}
                  <Link
                    to={`/courses/${course._id}`}
                    className={
                      styles.detailBtn
                    }
                    title="View Course Details"
                  >
                    <span>Details</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* =====================================================
          Empty State
          ===================================================== */}
      {filteredCourses.length === 0 && (
        <div
          style={{
            padding: '50px 24px',
            textAlign: 'center',
            border:
              '1px dashed #cbd5e1',
            borderRadius: 12,
            background: '#f8fafc',
          }}
        >
          <Search
            size={28}
            color="#94a3b8"
          />

          <h3
            style={{
              margin:
                '12px 0 6px',
              color: '#334155',
              fontSize: 16,
            }}
          >
            No courses found
          </h3>

          <p
            style={{
              margin: 0,
              color: '#64748b',
              fontSize: 13,
            }}
          >
            Try another search term
            or reset the filters.
          </p>

          <button
            type="button"
            onClick={clearFilters}
            className={styles.secondaryBtn}
            style={{
              marginTop: 16,
            }}
          >
            <RefreshCw size={14} />
            <span>Reset Filters</span>
          </button>
        </div>
      )}

      {/* =====================================================
          Bottom information strip
          ===================================================== */}
      <div
        style={{
          marginTop: 24,
          padding: '14px 16px',
          borderRadius: 10,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Award
            size={18}
            color="#4F46E5"
          />

          <div>
            <strong
              style={{
                display: 'block',
                color: '#334155',
                fontSize: 13,
              }}
            >
              Official learning record
            </strong>

            <span
              style={{
                color: '#64748b',
                fontSize: 11.5,
              }}
            >
              Course enrolments remain synchronized
              with the learner record.
            </span>
          </div>
        </div>

        <Link
          to="/igot-integration"
          className={styles.secondaryBtn}
        >
          <ExternalLink size={14} />
          <span>View iGOT Integration</span>
        </Link>
      </div>

      {/* =====================================================
          Toast
          ===================================================== */}
      {toastMessage && (
        <div
          role="status"
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            zIndex: 9999,
            padding: '12px 18px',
            borderRadius: 10,
            background: '#111827',
            color: '#fff',
            boxShadow:
              '0 10px 30px rgba(0,0,0,.2)',
            fontSize: 13,
            maxWidth: 360,
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  )
}
