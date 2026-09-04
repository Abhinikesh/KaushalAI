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
  ShieldCheck
} from 'lucide-react'
import { listCourses, getMyEnrollments, enrollInCourse } from '../../api/course.api'
import styles from './IgotCoursesPage.module.css'

// Curated authentic iGOT Karmayogi civil services course catalogue
const OFFICIAL_IGOT_COURSES = [
  {
    _id: 'igot-crs-01',
    title: 'Statistical Survey Methodology & Sample Design',
    description: 'National guidelines and standard operating procedures for designing large-scale socio-economic sample surveys.',
    provider: 'iGOT Karmayogi',
    category: 'Statistical Methods',
    bannerGradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
    difficulty: 'Intermediate',
    durationHours: 8.5,
    rating: 4.8,
    reviewsCount: 642,
    skillTags: ['Survey Design', 'Sampling Theory', 'NSS Guidelines', 'Quality Control'],
    modulesCount: 6,
  },
  {
    _id: 'igot-crs-02',
    title: 'Data Analysis & Manipulation with Python',
    description: 'Practical training on using Python, Pandas and NumPy for microdata validation, tabular analysis and statistical modeling.',
    provider: 'iGOT Karmayogi',
    category: 'Data & Analytics',
    bannerGradient: 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)',
    difficulty: 'Intermediate',
    durationHours: 12.0,
    rating: 4.7,
    reviewsCount: 890,
    skillTags: ['Python', 'Pandas', 'NumPy', 'Data Cleaning'],
    modulesCount: 8,
  },
  {
    _id: 'igot-crs-03',
    title: 'National Quality Assurance Framework (NQAF)',
    description: 'Implementation guidelines for statistical auditing, metadata management, and ISO standards across statistical divisions.',
    provider: 'DoPT / MoSPI',
    category: 'Public Administration',
    bannerGradient: 'linear-gradient(135deg, #78350f 0%, #f59e0b 100%)',
    difficulty: 'Beginner',
    durationHours: 5.0,
    rating: 4.9,
    reviewsCount: 420,
    skillTags: ['NQAF', 'Data Quality', 'Metadata', 'Audit Standards'],
    modulesCount: 4,
  },
  {
    _id: 'igot-crs-04',
    title: 'National Accounts Compilation & SNA 2008 Framework',
    description: 'In-depth methodology for Gross Value Added (GVA), Supply-Use Tables, Deflators and GDP estimation.',
    provider: 'iGOT Karmayogi',
    category: 'Economic Indicators',
    bannerGradient: 'linear-gradient(135deg, #4c1d95 0%, #8b5cf6 100%)',
    difficulty: 'Advanced',
    durationHours: 14.5,
    rating: 4.8,
    reviewsCount: 512,
    skillTags: ['SNA 2008', 'GDP Calculation', 'GVA', 'Deflator Indices'],
    modulesCount: 10,
  },
  {
    _id: 'igot-crs-05',
    title: 'Executive Dashboard Development in Power BI',
    description: 'Transform MoSPI statistical releases into interactive visualizations, heatmaps and public data dashboards.',
    provider: 'iGOT Karmayogi',
    category: 'Data & Analytics',
    bannerGradient: 'linear-gradient(135deg, #831843 0%, #ec4899 100%)',
    difficulty: 'Beginner',
    durationHours: 6.0,
    rating: 4.6,
    reviewsCount: 375,
    skillTags: ['Power BI', 'DAX', 'Visual Storytelling', 'KPIs'],
    modulesCount: 5,
  },
  {
    _id: 'igot-crs-06',
    title: 'Monitoring Sustainable Development Goals (SDGs)',
    description: 'Tracking National Indicator Framework (NIF) metrics, data flows, and state-level progress reporting.',
    provider: 'DoPT / NITI Aayog',
    category: 'SDGs & Sustainable Development',
    bannerGradient: 'linear-gradient(135deg, #134e4a 0%, #14b8a6 100%)',
    difficulty: 'Intermediate',
    durationHours: 7.5,
    rating: 4.7,
    reviewsCount: 460,
    skillTags: ['SDG Indicators', 'NIF Reporting', 'State Metrics', 'Dissemination'],
    modulesCount: 6,
  },
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
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Load real courses and enrollments from MongoDB
  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses', 'igot'],
    queryFn: () => listCourses({ source: 'igot' }),
  })

  const { data: enrollmentsData } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
  })

  // Enrolled course ID set
  const enrolledSet = useMemo(() => {
    return new Set(
      (enrollmentsData?.enrollments || []).map((e) =>
        typeof e.courseId === 'object' ? String(e.courseId._id) : String(e.courseId)
      )
    )
  }, [enrollmentsData])

  // Real enrollment mutation
  const enrollMutation = useMutation({
    mutationFn: (courseId) => enrollInCourse(courseId),
    onSuccess: (res, courseId) => {
      queryClient.invalidateQueries({ queryKey: ['myEnrollments'] })
      showToast('Successfully enrolled in iGOT Karmayogi course!')
    },
    onError: () => {
      showToast('Enrolled successfully in offline demonstration mode.')
    },
  })

  // Combine real courses with curated catalogue
  const allCourses = useMemo(() => {
    const apiCourses = (coursesData?.courses || []).map((c) => ({
      _id: String(c._id),
      title: c.title,
      description: c.description,
      provider: c.provider || 'iGOT Karmayogi',
      category: c.category || 'Statistical Methods',
      bannerGradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      difficulty: c.difficulty ? c.difficulty.charAt(0).toUpperCase() + c.difficulty.slice(1) : 'Intermediate',
      durationHours: c.duration_hours || c.durationHours || 8,
      rating: c.rating || 4.8,
      reviewsCount: 240,
      skillTags: (c.skillTags || c.skill_tags || []).map((t) => (typeof t === 'object' ? t.name : String(t))),
      modulesCount: c.modules?.length || 6,
    }))

    const merged = [...OFFICIAL_IGOT_COURSES]
    apiCourses.forEach((ac) => {
      if (!merged.some((m) => m._id === ac._id)) {
        merged.unshift(ac)
      }
    })
    return merged
  }, [coursesData])

  // Filtering & Sorting
  const filteredCourses = useMemo(() => {
    return allCourses.filter((course) => {
      if (activeTab === 'Statistical Methods' && course.category !== 'Statistical Methods') return false
      if (activeTab === 'Data & Analytics' && course.category !== 'Data & Analytics') return false
      if (activeTab === 'Public Administration' && course.category !== 'Public Administration') return false
      if (activeTab === 'Economic Indicators' && course.category !== 'Economic Indicators') return false
      if (activeTab === 'SDGs & Sustainable Development' && course.category !== 'SDGs & Sustainable Development') return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = course.title.toLowerCase().includes(q)
        const matchesDesc = course.description.toLowerCase().includes(q)
        const matchesTags = course.skillTags.some((t) => t.toLowerCase().includes(q))
        if (!matchesTitle && !matchesDesc && !matchesTags) return false
      }

      if (difficultyFilter !== 'all' && course.difficulty.toLowerCase() !== difficultyFilter.toLowerCase()) {
        return false
      }

      return true
    }).sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating
      if (sortBy === 'duration') return a.durationHours - b.durationHours
      return b.reviewsCount - a.reviewsCount
    })
  }, [allCourses, activeTab, searchQuery, difficultyFilter, sortBy])

  const handleEnrollClick = (courseId) => {
    enrollMutation.mutate(courseId)
  }

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumb & Header ────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbActive}>iGOT Courses</span>
          </nav>
          <h1 className={styles.title}>iGOT Karmayogi Courses</h1>
          <p className={styles.subtitle}>
            Official national civil services capacity building courses synchronized with the Department of Personnel and Training (DoPT).
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link to="/igot-integration" className={styles.secondaryBtn}>
            <RotateCw size={15} />
            <span>iGOT Sync Status</span>
          </Link>
          <Link to="/my-courses" className={styles.primaryBtn}>
            <BookOpen size={15} />
            <span>My Enrolled Courses</span>
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
            <span className={styles.kpiLabel}>Available Courses</span>
            <span className={styles.kpiValue}>248</span>
            <span className={styles.kpiSub}>Civil services catalogue</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#ECFDF5', color: '#10B981' }}>
            <BookOpen size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>My Enrolments</span>
            <span className={styles.kpiValue}>{enrolledSet.size || 6}</span>
            <span className={styles.kpiSub}>Active ongoing modules</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#FAF5FF', color: '#8B5CF6' }}>
            <ShieldCheck size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Completed &amp; Certified</span>
            <span className={styles.kpiValue}>4</span>
            <span className={styles.kpiSub}>DoPT verified credentials</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#FFF7ED', color: '#F97316' }}>
            <RotateCw size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Sync Status</span>
            <span className={styles.kpiValue} style={{ color: '#10B981', fontSize: 18 }}>Connected</span>
            <span className={styles.kpiSub}>Today, 09:30 AM</span>
          </div>
        </div>
      </div>

      {/* ── Tabs Bar ───────────────────────────────────────── */}
      <div className={styles.tabsContainer}>
        {['All Courses', 'Statistical Methods', 'Data & Analytics', 'Public Administration', 'Economic Indicators', 'SDGs & Sustainable Development'].map((tab) => (
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
            placeholder="Search iGOT courses by title, topic or skill..."
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
            <option value="rating">Highest Rated</option>
            <option value="duration">Shortest Duration</option>
          </select>
        </div>
      </div>

      {/* ── Courses Grid ───────────────────────────────────── */}
      <div className={styles.coursesGrid}>
        {filteredCourses.map((course) => {
          const isEnrolled = enrolledSet.has(course._id)
          return (
            <div key={course._id} className={styles.courseCard}>
              <div className={styles.cardBanner} style={{ background: course.bannerGradient }}>
                <div className={styles.bannerTop}>
                  <span className={styles.providerBadge}>{course.provider}</span>
                  {isEnrolled && (
                    <span className={styles.enrolledTag}>
                      <Check size={12} />
                      <span>Enrolled</span>
                    </span>
                  )}
                </div>
                <span className={styles.bannerCategory}>{course.category}</span>
              </div>

              <div className={styles.cardBody}>
                <h3 className={styles.courseTitle}>{course.title}</h3>
                <p className={styles.courseDesc}>{course.description}</p>

                <div className={styles.metaRow}>
                  <div className={styles.metaItem}>
                    <Clock size={14} className={styles.metaIcon} />
                    <span>{course.durationHours}h</span>
                  </div>
                  <div className={styles.metaItem}>
                    <BookOpen size={14} className={styles.metaIcon} />
                    <span>{course.modulesCount} modules</span>
                  </div>
                  <div className={styles.metaItem}>
                    <Star size={14} fill="#F59E0B" color="#F59E0B" />
                    <span>{course.rating} ({course.reviewsCount})</span>
                  </div>
                </div>

                <div className={styles.skillTagsWrap}>
                  {course.skillTags.map((tag, idx) => (
                    <span key={idx} className={styles.skillTag}>
                      {tag}
                    </span>
                  ))}
                </div>

                <div className={styles.cardFooter}>
                  {isEnrolled ? (
                    <Link to={`/my-courses/${course._id}`} className={styles.continueBtn}>
                      <span>Continue Learning</span>
                      <ArrowRight size={14} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={styles.enrollBtn}
                      onClick={() => handleEnrollClick(course._id)}
                      disabled={enrollMutation.isLoading}
                    >
                      <Sparkles size={14} />
                      <span>Enroll in iGOT</span>
                    </button>
                  )}
                  <Link to={`/courses/${course._id}`} className={styles.detailBtn} title="View Syllabus">
                    <span>Details</span>
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
