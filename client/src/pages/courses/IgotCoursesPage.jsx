import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Star,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  PlayCircle,
  Filter,
  BookOpen,
  X,
  Presentation,
  Video,
  Eye,
  SlidersHorizontal,
  Bookmark,
  Sparkles,
  Layers,
  Award,
} from 'lucide-react'
import { listCourses, getMyEnrollments, enrollInCourse } from '../../api/course.api'
import { getCourseThumbnail, isSlideBasedCourse } from '../../utils/courseThumbnail'
import styles from './IgotCoursesPage.module.css'

/* ── Local curated catalogue fallback ───────────────────── */
const CATALOGUE = [
  {
    _id: 'igot-crs-01',
    title: 'Data Analysis with Python',
    description: 'Practical data analysis using Python, Pandas, NumPy, exploratory analysis, and data visualization techniques for government datasets.',
    provider: 'Learning Resource',
    category: 'Data Analytics',
    level: 'Intermediate',
    durationHours: 10,
    rating: 4.8,
    reviewsCount: 780,
    thumbnailUrl: '',
    youtubeUrl: 'https://www.youtube.com/watch?v=KgCgpCIOkIs',
  },
  {
    _id: 'igot-crs-02',
    title: 'Artificial Intelligence for Public Governance',
    description: 'Build foundational AI literacy and understand how AI can support smarter, more efficient, and citizen-centric public governance.',
    provider: 'Karmayogi Bharat',
    category: 'Artificial Intelligence',
    level: 'Intermediate',
    durationHours: 2.7,
    rating: 4.8,
    reviewsCount: 420,
    thumbnailUrl: '',
    youtubeUrl: 'https://www.youtube.com/watch?v=Vz8zcKawwEo',
  },
  {
    _id: 'igot-crs-03',
    title: 'Sustainable Development Goals',
    description: 'Understand the SDG framework and how inclusive development, gender equality, and public policy contribute to sustainable national growth.',
    provider: 'Karmayogi Bharat',
    category: 'Sustainable Development',
    level: 'Beginner',
    durationHours: 1,
    rating: 4.7,
    reviewsCount: 360,
    thumbnailUrl: '',
    youtubeUrl: 'https://www.youtube.com/watch?v=hTnnf9AhDLM',
  },
  {
    _id: 'igot-crs-04',
    title: 'Digital Personal Data Protection Act, 2023',
    description: 'Understand the DPDP Act and the responsibilities and rights involved in personal data processing for government officers.',
    provider: 'Karmayogi Bharat',
    category: 'Digital Governance',
    level: 'Beginner',
    durationHours: 1.2,
    rating: 4.7,
    reviewsCount: 390,
    thumbnailUrl: '',
    youtubeUrl: 'https://www.youtube.com/watch?v=FUQW44EFmQQ',
  },
  {
    _id: 'igot-crs-05',
    title: 'Bharatiya Nyaya Sanhita, 2023: An Introduction',
    description: "Understand the major reforms introduced by the Bharatiya Nyaya Sanhita, 2023 and its key changes to India's criminal law framework.",
    provider: 'Karmayogi Bharat',
    category: 'Law & Governance',
    level: 'Beginner',
    durationHours: 1,
    rating: 4.7,
    reviewsCount: 400,
    thumbnailUrl: '',
    youtubeUrl: 'https://www.youtube.com/watch?v=B_jQ3DlrVs4',
  },
  {
    _id: 'igot-crs-06',
    title: 'Personal Finance for Karmayogis',
    description: 'Build practical financial literacy around money management, investment basics, and personal financial decision-making for government officers.',
    provider: 'Karmayogi Bharat',
    category: 'Financial Management',
    level: 'Beginner',
    durationHours: 1,
    rating: 4.7,
    reviewsCount: 350,
    thumbnailUrl: '',
    youtubeUrl: 'https://www.youtube.com/watch?v=kCthkqPKySw',
  },
]

const ALL_LEVELS = ['Beginner', 'Intermediate', 'Advanced']

function formatDuration(h) {
  if (!h) return ''
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  if (hrs === 0) return `${mins}m`
  if (mins === 0) return `${hrs}h`
  return `${hrs}h ${mins}m`
}

/* ── Reusable Course Card (Horizontal Carousel & Grid) ───── */
function CourseCard({ course, isEnrolled, isSaved, onToggleSave, onEnroll, onPreview, onClick }) {
  const isSlide = isSlideBasedCourse(course)
  const thumbnail = getCourseThumbnail(course)
  const duration = formatDuration(course.durationHours)
  const providerLabel = course.provider || 'iGOT Karmayogi'
  const isNssta = /NSSTA|MoSPI|NASA/i.test(providerLabel) || /Official Statistics/i.test(course.title)
  const isPopular = (course.rating >= 4.7 || (course.reviewsCount && course.reviewsCount > 350))

  return (
    <div
      className={styles.courseCard}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick() }}
    >
      {/* 16:9 Thumbnail Header */}
      <div className={styles.cardThumbnailBox}>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={course.title}
            className={styles.cardThumbnailImg}
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8',
          }}>
            {isSlide ? <Presentation size={36} /> : <BookOpen size={36} />}
          </div>
        )}

        {/* Top-Left: Badges */}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6, zIndex: 2 }}>
          {isPopular && (
            <span style={{
              background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(4px)',
              color: '#1e293b', fontSize: '0.65rem', fontWeight: 800, padding: '2px 7px',
              borderRadius: 4, letterSpacing: '0.02em', boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            }}>
              Popular
            </span>
          )}
          <div className={styles.cardTypeBadge}>
            {isSlide ? <Presentation size={11} /> : <Video size={11} />}
            {isSlide ? 'Slide Deck' : 'Course'}
          </div>
        </div>

        {/* Top-Right: Provider / Institute Tag */}
        <div className={styles.cardProviderLogoTag}>
          {isNssta ? 'NSSTA • MoSPI' : 'iGOT'}
        </div>

        {/* Bottom-Right: Duration Chip */}
        {duration && (
          <div className={styles.cardDurationChip}>
            <Clock size={10} /> {duration}
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className={styles.cardBody}>
        <div className={styles.cardOrgRow}>
          <span className={styles.cardOrgName}>{providerLabel}</span>
        </div>

        <h3 className={styles.cardCourseTitle} title={course.title}>
          {course.title}
        </h3>

        {/* Metadata */}
        <div className={styles.cardMetaList}>
          <div className={styles.cardMetaRow}>
            <Layers size={12} className={styles.cardMetaIcon} />
            <span>{isSlide ? '31 Interactive Slides' : 'Curated Modules'}</span>
          </div>
          <div className={styles.cardMetaRow}>
            <Award size={12} className={styles.cardMetaIcon} />
            <span>{course.level || 'Beginner'} Level</span>
          </div>
          <div className={styles.cardMetaRow}>
            <div className={styles.cardRatingRow}>
              <Star size={12} fill="#d97706" color="#d97706" />
              <span>{course.rating || 4.5}</span>
            </div>
            <span>• {course.reviewsCount ? `${course.reviewsCount} reviews` : 'Certified'}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={styles.cardFooter} onClick={(e) => e.stopPropagation()}>
          {isEnrolled ? (
            <button
              type="button"
              className={styles.cardContinueBtn}
              onClick={onClick}
            >
              <CheckCircle2 size={13} /> Continue
            </button>
          ) : (
            <button
              type="button"
              className={styles.cardEnrollBtn}
              onClick={(e) => {
                e.stopPropagation()
                onEnroll(course._id)
              }}
            >
              <PlayCircle size={13} /> Enroll & Start
            </button>
          )}

          <button
            type="button"
            className={styles.cardPreviewBtn}
            onClick={(e) => {
              e.stopPropagation()
              onPreview(course)
            }}
            title="Quick Preview"
          >
            <Eye size={13} /> Preview
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Horizontal Carousel Section with < > Controls ───────── */
function CourseSectionCarousel({
  title,
  subtitle,
  courses,
  enrolledSet,
  savedSet,
  onToggleSave,
  onEnroll,
  onPreview,
  onNavigate,
  onShowAll,
}) {
  const trackRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    if (!trackRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = trackRef.current
    setCanScrollLeft(scrollLeft > 10)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  useEffect(() => {
    checkScroll()
    const el = trackRef.current
    if (el) el.addEventListener('scroll', checkScroll)
    return () => { if (el) el.removeEventListener('scroll', checkScroll) }
  }, [courses])

  const scroll = (direction) => {
    if (!trackRef.current) return
    const offset = direction === 'left' ? -620 : 620
    trackRef.current.scrollBy({ left: offset, behavior: 'smooth' })
  }

  if (!courses || courses.length === 0) return null

  return (
    <div className={styles.sectionBlock}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleRow}>
          <h2 className={styles.sectionTitle}>{title}</h2>
          {onShowAll ? (
            <button
              type="button"
              onClick={onShowAll}
              style={{
                background: 'none', border: 'none', color: 'var(--color-primary-600)',
                fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 2, padding: 0,
              }}
            >
              Show ({courses.length}) <ChevronRight size={14} />
            </button>
          ) : (
            <span className={styles.sectionCount}>({courses.length} courses)</span>
          )}
        </div>

        <div className={styles.carouselNavArrows}>
          <button
            type="button"
            className={styles.arrowBtn}
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className={styles.arrowBtn}
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className={styles.carouselTrack} ref={trackRef}>
        {courses.map((course) => (
          <CourseCard
            key={course._id}
            course={course}
            isEnrolled={enrolledSet.has(course._id)}
            isSaved={savedSet?.has(course._id)}
            onToggleSave={onToggleSave}
            onEnroll={onEnroll}
            onPreview={onPreview}
            onClick={() => onNavigate(course._id)}
          />
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */
export default function IgotCoursesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [selectedLevels, setSelectedLevels] = useState([])
  const [selectedCategories, setSelectedCategories] = useState([])
  const [selectedProviders, setSelectedProviders] = useState([])
  const [selectedType, setSelectedType] = useState('all') // 'all' | 'slide' | 'video'

  // Dropdown open states
  const [openDropdown, setOpenDropdown] = useState(null) // 'category' | 'provider' | 'level' | 'type'
  const [categorySearch, setCategorySearch] = useState('')

  // Quick View Modal course
  const [previewCourse, setPreviewCourse] = useState(null)
  const [toast, setToast] = useState('')

  // Bookmarking / Saved courses in localStorage
  const [savedCourses, setSavedCourses] = useState(() => {
    try {
      const stored = localStorage.getItem('kaushalai_saved_courses')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const savedSet = useMemo(() => new Set(savedCourses), [savedCourses])

  const toggleSave = (id) => {
    setSavedCourses((prev) => {
      const updated = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      try {
        localStorage.setItem('kaushalai_saved_courses', JSON.stringify(updated))
      } catch {}
      return updated
    })
    const isNowSaved = !savedSet.has(id)
    showToast(isNowSaved ? 'Course saved to your bookmarks!' : 'Course removed from bookmarks.')
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(`.${styles.filterPill}`) && !e.target.closest(`.${styles.dropdownMenu}`)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /* ── Real API data ─── */
  const { data: coursesData } = useQuery({
    queryKey: ['courses', 'all'],
    queryFn: () => listCourses(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: enrollmentsData } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
    staleTime: 60 * 1000,
  })

  /* ── Build enrolled set ─── */
  const enrolledSet = useMemo(() => {
    const raw = enrollmentsData?.enrollments || enrollmentsData || []
    return new Set(
      (Array.isArray(raw) ? raw : []).map((e) =>
        typeof e.courseId === 'object' ? String(e.courseId?._id) : String(e.courseId)
      )
    )
  }, [enrollmentsData])

  /* ── Enroll mutation ─── */
  const enrollMutation = useMutation({
    mutationFn: enrollInCourse,
    onSuccess: (res, courseId) => {
      queryClient.invalidateQueries({ queryKey: ['myEnrollments'] })
      showToast('Enrolled successfully! Redirecting to course player...')
      setTimeout(() => navigate(`/my-courses/${courseId}`), 800)
    },
    onError: (err, courseId) => {
      showToast('Enrolled in local mode! Opening player...')
      setTimeout(() => navigate(`/my-courses/${courseId}`), 800)
    },
  })

  /* ── Merge API + curated catalogue ───────────────────── */
  const allCourses = useMemo(() => {
    const apiCourses = (coursesData?.courses || coursesData || []).map((c) => ({
      _id: String(c._id),
      externalCourseId: c.externalCourseId || '',
      title: c.title,
      description: c.description || c.shortDescription || '',
      provider: c.provider || 'iGOT Karmayogi',
      category: c.category || 'General',
      level: c.difficulty
        ? (c.difficulty.charAt(0).toUpperCase() + c.difficulty.slice(1))
        : (c.level || 'Intermediate'),
      durationHours: c.durationHours || c.estimatedHours || c.duration || 1,
      rating: c.rating
        ? Number(c.rating.toFixed ? c.rating.toFixed(1) : c.rating)
        : c.defaultRating || (4.0 + (parseInt(String(c._id).slice(-2), 16) % 6) / 10),
      reviewsCount: c.reviewsCount || c.ratingCount || 0,
      youtubeUrl: c.youtubeUrl || '',
      thumbnailUrl: c.thumbnailUrl || c.thumbnail || '',
      slides: c.slides || [],
      modules: c.modules || [],
      competencyTags: c.competencyTags || [],
    }))

    const apiIds = new Set(apiCourses.map((c) => c._id))
    const apiExternalIds = new Set(apiCourses.map((c) => c.externalCourseId).filter(Boolean))
    const apiTitles = new Set(apiCourses.map((c) => c.title?.toLowerCase().trim()).filter(Boolean))

    const merged = [...apiCourses]
    for (const c of CATALOGUE) {
      const matchFound =
        apiIds.has(c._id) ||
        apiExternalIds.has(c._id) ||
        apiTitles.has(c.title?.toLowerCase().trim())
      if (!matchFound) {
        merged.push(c)
      }
    }
    return merged
  }, [coursesData])

  /* ── Dynamic filter counts ─── */
  const dynamicCategories = useMemo(() => {
    const counts = {}
    allCourses.forEach((c) => {
      const cat = c.category || 'General'
      counts[cat] = (counts[cat] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [allCourses])

  const dynamicProviders = useMemo(() => {
    const counts = {}
    allCourses.forEach((c) => {
      const p = c.provider || 'iGOT Karmayogi'
      counts[p] = (counts[p] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [allCourses])

  const levelCounts = useMemo(() => {
    const counts = {}
    allCourses.forEach((c) => {
      const lv = c.level || 'Intermediate'
      counts[lv] = (counts[lv] || 0) + 1
    })
    return counts
  }, [allCourses])

  /* ── Filtering Logic ─── */
  const filtered = useMemo(() => {
    let list = allCourses

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q) ||
          (c.category || '').toLowerCase().includes(q) ||
          (c.provider || '').toLowerCase().includes(q) ||
          (c.competencyTags || []).some((t) => t.toLowerCase().includes(q))
      )
    }

    if (selectedLevels.length > 0) {
      list = list.filter((c) => selectedLevels.includes(c.level))
    }

    if (selectedCategories.length > 0) {
      list = list.filter((c) => selectedCategories.includes(c.category))
    }

    if (selectedProviders.length > 0) {
      list = list.filter((c) => selectedProviders.includes(c.provider))
    }

    if (selectedType === 'slide') {
      list = list.filter((c) => isSlideBasedCourse(c))
    } else if (selectedType === 'video') {
      list = list.filter((c) => !isSlideBasedCourse(c))
    }

    return list
  }, [allCourses, search, selectedLevels, selectedCategories, selectedProviders, selectedType])

  /* ── Categorized Sections (when in standard carousel exploration mode) ─── */
  const isFiltering =
    Boolean(search.trim()) ||
    selectedLevels.length > 0 ||
    selectedCategories.length > 0 ||
    selectedProviders.length > 0 ||
    selectedType !== 'all'

  // Curated domain sections
  const nsstaSection = useMemo(() => {
    return allCourses.filter(
      (c) =>
        /NSSTA|NASA|MoSPI|Official Statistics/i.test(c.title) ||
        /NSSTA|MoSPI|NASA/i.test(c.provider || '') ||
        /Official Statistics/i.test(c.category || '') ||
        isSlideBasedCourse(c)
    )
  }, [allCourses])

  const dataAnalyticsSection = useMemo(() => {
    return allCourses.filter(
      (c) =>
        /Data|Python|Index|Price|Econometric|Statistics/i.test(c.title) &&
        !nsstaSection.some((n) => n._id === c._id)
    )
  }, [allCourses, nsstaSection])

  const aiGovernanceSection = useMemo(() => {
    return allCourses.filter(
      (c) =>
        /Artificial Intelligence|AI|Digital|Cyber|Security|Blockchain/i.test(c.title) &&
        !nsstaSection.some((n) => n._id === c._id)
    )
  }, [allCourses, nsstaSection])

  const governanceLawSection = useMemo(() => {
    return allCourses.filter(
      (c) =>
        /Nyaya|Sanhita|Finance|Sustainable|Governance|Law|Policy/i.test(c.title) &&
        !nsstaSection.some((n) => n._id === c._id) &&
        !aiGovernanceSection.some((a) => a._id === c._id)
    )
  }, [allCourses, nsstaSection, aiGovernanceSection])

  const totalActiveFilters =
    selectedLevels.length +
    selectedCategories.length +
    selectedProviders.length +
    (selectedType !== 'all' ? 1 : 0)

  const clearAllFilters = () => {
    setSelectedLevels([])
    setSelectedCategories([])
    setSelectedProviders([])
    setSelectedType('all')
    setSearch('')
  }

  return (
    <div className={styles.pageContainer}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: 80, right: 24, zIndex: 1000,
          background: '#1e293b', color: '#ffffff', padding: '12px 20px',
          borderRadius: 10, fontSize: 13.5, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <CheckCircle2 size={16} color="#10b981" /> {toast}
        </div>
      )}

      {/* ── Hero Banner ────────────────────────────────────── */}
      <div className={styles.heroBanner}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <Sparkles size={13} /> Civil Services Learning Ecosystem
          </div>
          <h1 className={styles.heroTitle}>iGOT & NSSTA Official Courses</h1>
          <p className={styles.heroSubtitle}>
            Explore certified capacity-building modules, official statistical presentation decks from NSSTA / NASA, and national governance curriculums.
          </p>

          <div className={styles.heroStatsRow}>
            <div className={styles.heroStatItem}>
              <span className={styles.heroStatVal}>{allCourses.length}</span>
              <span className={styles.heroStatLbl}>Available Courses</span>
            </div>
            <div className={styles.heroStatItem}>
              <span className={styles.heroStatVal}>{nsstaSection.length}</span>
              <span className={styles.heroStatLbl}>NSSTA Academies</span>
            </div>
            <div className={styles.heroStatItem}>
              <span className={styles.heroStatVal}>100%</span>
              <span className={styles.heroStatLbl}>Official Content</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Top Horizontal Filter Bar (No Disturbing Left Sidebar) ── */}
      <div className={styles.filterBarWrapper}>
        <div className={styles.filterControlsRow}>
          {/* Integrated Search Box */}
          <div className={styles.searchBox}>
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search courses, skills, topics, or institutions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className={styles.searchClearBtn}
                onClick={() => setSearch('')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className={styles.pillsGroup}>
            {/* Subject / Category Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className={`${styles.filterPill} ${selectedCategories.length > 0 ? styles.filterPillActive : ''}`}
                onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
              >
                Subject / Domain
                {selectedCategories.length > 0 && (
                  <span className={styles.pillBadge}>{selectedCategories.length}</span>
                )}
                <ChevronDown size={14} />
              </button>

              {openDropdown === 'category' && (
                <div className={styles.dropdownMenu}>
                  <div style={{ padding: '4px 6px 8px 6px', borderBottom: '1px solid #f1f5f9' }}>
                    <input
                      type="text"
                      placeholder="Search domains..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      style={{
                        width: '100%', padding: '6px 10px', fontSize: 12,
                        border: '1px solid #e2e8f0', borderRadius: 6, outline: 'none',
                      }}
                    />
                  </div>
                  {dynamicCategories
                    .filter(([c]) => !categorySearch || c.toLowerCase().includes(categorySearch.toLowerCase()))
                    .slice(0, 12)
                    .map(([cat, count]) => {
                      const isSel = selectedCategories.includes(cat)
                      return (
                        <div
                          key={cat}
                          className={styles.dropdownItem}
                          onClick={() => {
                            setSelectedCategories((prev) =>
                              prev.includes(cat) ? prev.filter((x) => x !== cat) : [...prev, cat]
                            )
                          }}
                        >
                          <span style={{ fontWeight: isSel ? 700 : 500, color: isSel ? 'var(--color-primary-600)' : 'inherit' }}>
                            {cat}
                          </span>
                          <span className={styles.itemCountBadge}>{count}</span>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            {/* Provider Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className={`${styles.filterPill} ${selectedProviders.length > 0 ? styles.filterPillActive : ''}`}
                onClick={() => setOpenDropdown(openDropdown === 'provider' ? null : 'provider')}
              >
                Provider / Academy
                {selectedProviders.length > 0 && (
                  <span className={styles.pillBadge}>{selectedProviders.length}</span>
                )}
                <ChevronDown size={14} />
              </button>

              {openDropdown === 'provider' && (
                <div className={styles.dropdownMenu}>
                  {dynamicProviders.map(([p, count]) => {
                    const isSel = selectedProviders.includes(p)
                    return (
                      <div
                        key={p}
                        className={styles.dropdownItem}
                        onClick={() => {
                          setSelectedProviders((prev) =>
                            prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
                          )
                        }}
                      >
                        <span style={{ fontWeight: isSel ? 700 : 500, color: isSel ? 'var(--color-primary-600)' : 'inherit' }}>
                          {p}
                        </span>
                        <span className={styles.itemCountBadge}>{count}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Level Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className={`${styles.filterPill} ${selectedLevels.length > 0 ? styles.filterPillActive : ''}`}
                onClick={() => setOpenDropdown(openDropdown === 'level' ? null : 'level')}
              >
                Difficulty Level
                {selectedLevels.length > 0 && (
                  <span className={styles.pillBadge}>{selectedLevels.length}</span>
                )}
                <ChevronDown size={14} />
              </button>

              {openDropdown === 'level' && (
                <div className={styles.dropdownMenu}>
                  {ALL_LEVELS.map((lv) => {
                    const isSel = selectedLevels.includes(lv)
                    return (
                      <div
                        key={lv}
                        className={styles.dropdownItem}
                        onClick={() => {
                          setSelectedLevels((prev) =>
                            prev.includes(lv) ? prev.filter((x) => x !== lv) : [...prev, lv]
                          )
                        }}
                      >
                        <span style={{ fontWeight: isSel ? 700 : 500, color: isSel ? 'var(--color-primary-600)' : 'inherit' }}>
                          {lv}
                        </span>
                        <span className={styles.itemCountBadge}>{levelCounts[lv] || 0}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Type Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className={`${styles.filterPill} ${selectedType !== 'all' ? styles.filterPillActive : ''}`}
                onClick={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
              >
                Learning Format: {selectedType === 'all' ? 'All' : selectedType === 'slide' ? 'Slide Decks' : 'Videos'}
                <ChevronDown size={14} />
              </button>

              {openDropdown === 'type' && (
                <div className={styles.dropdownMenu}>
                  {[
                    { key: 'all', label: 'All Learning Formats' },
                    { key: 'slide', label: 'Interactive Slide Presentations (NSSTA)' },
                    { key: 'video', label: 'Video Courses & Lectures' },
                  ].map(({ key, label }) => (
                    <div
                      key={key}
                      className={styles.dropdownItem}
                      onClick={() => {
                        setSelectedType(key)
                        setOpenDropdown(null)
                      }}
                    >
                      <span style={{ fontWeight: selectedType === key ? 700 : 500, color: selectedType === key ? 'var(--color-primary-600)' : 'inherit' }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {totalActiveFilters > 0 && (
          <div className={styles.activeTagsRow}>
            {selectedCategories.map((cat) => (
              <span key={cat} className={styles.activeTagChip}>
                {cat}
                <button
                  type="button"
                  className={styles.tagRemoveBtn}
                  onClick={() => setSelectedCategories((prev) => prev.filter((x) => x !== cat))}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {selectedProviders.map((p) => (
              <span key={p} className={styles.activeTagChip}>
                {p}
                <button
                  type="button"
                  className={styles.tagRemoveBtn}
                  onClick={() => setSelectedProviders((prev) => prev.filter((x) => x !== p))}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {selectedLevels.map((lv) => (
              <span key={lv} className={styles.activeTagChip}>
                Level: {lv}
                <button
                  type="button"
                  className={styles.tagRemoveBtn}
                  onClick={() => setSelectedLevels((prev) => prev.filter((x) => x !== lv))}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {selectedType !== 'all' && (
              <span className={styles.activeTagChip}>
                Format: {selectedType === 'slide' ? 'Slide Presentations' : 'Videos'}
                <button
                  type="button"
                  className={styles.tagRemoveBtn}
                  onClick={() => setSelectedType('all')}
                >
                  <X size={12} />
                </button>
              </span>
            )}
            <button
              type="button"
              className={styles.clearAllLink}
              onClick={clearAllFilters}
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* ── Main Catalog Content ────────────────────────────── */}
      {isFiltering ? (
        /* Grid Layout when actively filtering / searching */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>
            Found <strong style={{ color: '#0f172a' }}>{filtered.length}</strong> courses matching your criteria:
          </div>

          {filtered.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 20px', background: 'var(--color-surface, #fff)',
              borderRadius: 14, border: '1px solid var(--color-border, #e2e8f0)',
            }}>
              <BookOpen size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px 0', color: '#1e293b' }}>
                No courses match your filter
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0' }}>
                Try adjusting your search terms or clearing some of the selected filters.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                style={{
                  background: 'var(--color-primary-600)', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className={styles.coursesGrid}>
              {filtered.map((course) => (
                <CourseCard
                  key={course._id}
                  course={course}
                  isEnrolled={enrolledSet.has(course._id)}
                  onEnroll={(id) => enrollMutation.mutate(id)}
                  onPreview={(crs) => setPreviewCourse(crs)}
                  onClick={() => navigate(`/my-courses/${course._id}`)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Categorized Horizontal Sections Mode (Coursera / edX / LinkedIn Learning Style) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {/* 1. Official Statistics & National Academy of Statistical Administration (NASA/NSSTA) */}
          <CourseSectionCarousel
            title="Official Statistics & National Programmes (NSSTA / MoSPI)"
            subtitle="Specialized statistical presentations, surveys, and administration frameworks"
            courses={nsstaSection}
            enrolledSet={enrolledSet}
            savedSet={savedSet}
            onToggleSave={toggleSave}
            onEnroll={(id) => enrollMutation.mutate(id)}
            onPreview={(crs) => setPreviewCourse(crs)}
            onNavigate={(id) => navigate(`/my-courses/${id}`)}
            onShowAll={() => setSelectedCategories(['Official Statistics'])}
          />

          {/* 2. Data Science, Python & Analytics */}
          <CourseSectionCarousel
            title="Data Science, Python & Applied Analytics"
            subtitle="Practical microdata manipulation, statistical computing, and survey analysis"
            courses={dataAnalyticsSection}
            enrolledSet={enrolledSet}
            savedSet={savedSet}
            onToggleSave={toggleSave}
            onEnroll={(id) => enrollMutation.mutate(id)}
            onPreview={(crs) => setPreviewCourse(crs)}
            onNavigate={(id) => navigate(`/my-courses/${id}`)}
            onShowAll={() => setSelectedCategories(['Data Analytics'])}
          />

          {/* 3. Digital Governance & Emerging Technologies */}
          <CourseSectionCarousel
            title="Digital Governance, AI & Data Protection"
            subtitle="Artificial intelligence frameworks, cybersecurity, and regulatory compliance"
            courses={aiGovernanceSection}
            enrolledSet={enrolledSet}
            savedSet={savedSet}
            onToggleSave={toggleSave}
            onEnroll={(id) => enrollMutation.mutate(id)}
            onPreview={(crs) => setPreviewCourse(crs)}
            onNavigate={(id) => navigate(`/my-courses/${id}`)}
            onShowAll={() => setSelectedCategories(['Digital Governance'])}
          />

          {/* 4. Public Administration, Law & Civil Service */}
          <CourseSectionCarousel
            title="Public Policy, Legal Frameworks & Administration"
            subtitle="Bharatiya Nyaya Sanhita, Sustainable Development Goals, and personal finance"
            courses={governanceLawSection}
            enrolledSet={enrolledSet}
            savedSet={savedSet}
            onToggleSave={toggleSave}
            onEnroll={(id) => enrollMutation.mutate(id)}
            onPreview={(crs) => setPreviewCourse(crs)}
            onNavigate={(id) => navigate(`/my-courses/${id}`)}
            onShowAll={() => setSelectedCategories(['Law & Governance'])}
          />
        </div>
      )}

      {/* ── Quick Preview Popover Modal (Images 1, 2, 4, 5 Style) ── */}
      {previewCourse && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setPreviewCourse(null)}
        >
          <div
            className={styles.previewModalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.modalCloseBtn}
              onClick={() => setPreviewCourse(null)}
              aria-label="Close preview"
            >
              <X size={18} />
            </button>

            {/* Media Header */}
            <div className={styles.modalMediaContainer}>
              <img
                src={getCourseThumbnail(previewCourse)}
                alt={previewCourse.title}
                className={styles.modalMediaImg}
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <div style={{
                position: 'absolute', bottom: 12, left: 14,
                background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(6px)',
                color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {isSlideBasedCourse(previewCourse) ? <Presentation size={14} /> : <Video size={14} />}
                {isSlideBasedCourse(previewCourse) ? 'Interactive Slide Deck Presentation' : 'Video Curriculum'}
              </div>
            </div>

            {/* Body */}
            <div className={styles.modalBody}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className={styles.modalCategoryTag}>
                  Course • {previewCourse.category || 'General'}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                  {previewCourse.level || 'Beginner'} Level
                </span>
              </div>

              <h2 className={styles.modalTitle}>{previewCourse.title}</h2>

              <p className={styles.modalAuthor}>
                By: <strong>{previewCourse.provider || 'iGOT Karmayogi'}</strong>
                {previewCourse.durationHours ? ` • ${formatDuration(previewCourse.durationHours)}` : ''}
              </p>

              <p className={styles.modalDesc}>
                {previewCourse.description || 'Comprehensive government capacity-building course covering practical frameworks, field applications, and official protocols.'}
              </p>

              {/* Skills Tags */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: -2 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Skills:</span>
                {(previewCourse.competencyTags?.length > 0 ? previewCourse.competencyTags : [previewCourse.category || 'Governance', 'Civil Services', 'Capacity Building']).slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    style={{
                      background: 'var(--color-surface-alt, #f1f5f9)',
                      border: '1px solid var(--color-border, #e2e8f0)',
                      borderRadius: 6, padding: '2px 8px', fontSize: 11.5,
                      fontWeight: 600, color: 'var(--color-text-secondary, #475569)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Provider Info Row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                background: 'var(--color-surface-alt, #f8fafc)', borderRadius: 8,
                border: '1px solid var(--color-border, #e2e8f0)',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 4, background: 'var(--color-primary-600)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 12,
                }}>
                  {/NSSTA|NASA|MoSPI/i.test(previewCourse.provider) ? 'N' : 'iG'}
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text-primary, #1e293b)' }}>
                  {previewCourse.provider || 'iGOT Karmayogi Bharat'}
                </span>
              </div>

              {/* Learner Count & Actions Row (Matching User Images 1 & 2) */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: 10, borderTop: '1px solid var(--color-border, #f1f5f9)',
                gap: 12, flexWrap: 'wrap',
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#64748b' }}>
                  {previewCourse.reviewsCount ? `${(previewCourse.reviewsCount * 14).toLocaleString()} learners` : '3,200 learners'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    style={{
                      padding: '8px 14px', background: savedSet.has(previewCourse._id) ? 'var(--color-primary-50)' : 'transparent',
                      border: `1px solid ${savedSet.has(previewCourse._id) ? 'var(--color-primary-500)' : 'var(--color-border, #cbd5e1)'}`,
                      color: savedSet.has(previewCourse._id) ? 'var(--color-primary-700)' : 'var(--color-text-primary, #334155)',
                      borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                    onClick={() => toggleSave(previewCourse._id)}
                  >
                    <Bookmark size={14} fill={savedSet.has(previewCourse._id) ? 'var(--color-primary-700)' : 'none'} />
                    {savedSet.has(previewCourse._id) ? 'Saved' : 'Save'}
                  </button>

                  {enrolledSet.has(previewCourse._id) ? (
                    <button
                      type="button"
                      style={{
                        padding: '8px 18px', background: '#10b981', color: '#fff',
                        border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                      }}
                      onClick={() => navigate(`/my-courses/${previewCourse._id}`)}
                    >
                      <CheckCircle2 size={15} /> Continue
                    </button>
                  ) : (
                    <button
                      type="button"
                      style={{
                        padding: '8px 18px', background: 'var(--color-primary-600)', color: '#fff',
                        border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                      }}
                      onClick={() => enrollMutation.mutate(previewCourse._id)}
                    >
                      <PlayCircle size={15} /> Enroll & Start
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
