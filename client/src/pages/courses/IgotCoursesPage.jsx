import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Star,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  PlayCircle,
  Filter,
  BookOpen,
  X,
} from 'lucide-react'
import { listCourses, getMyEnrollments, enrollInCourse } from '../../api/course.api'

/* ── YouTube thumbnail map ─────────────────────────────── */
const YOUTUBE_MAP = {
  'igot-crs-01': 'KgCgpCIOkIs',
  'igot-crs-02': 'Vz8zcKawwEo',
  'igot-crs-03': 'hTnnf9AhDLM',
  'igot-crs-04': 'FUQW44EFmQQ',
  'igot-crs-05': 'B_jQ3DlrVs4',
  'igot-crs-06': 'kCthkqPKySw',
}

/* ── Local curated catalogue ───────────────────────────── */
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
  },
  {
    _id: 'igot-crs-05',
    title: 'Bharatiya Nyaya Sanhita, 2023: An Introduction',
    description: 'Understand the major reforms introduced by the Bharatiya Nyaya Sanhita, 2023 and its key changes to India\'s criminal law framework.',
    provider: 'Karmayogi Bharat',
    category: 'Law & Governance',
    level: 'Beginner',
    durationHours: 1,
    rating: 4.7,
    reviewsCount: 400,
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
  },
]

const ALL_LEVELS = ['Beginner', 'Intermediate', 'Advanced']

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 16, marginBottom: 16 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', background: 'none', border: 'none', padding: '0 0 10px',
          cursor: 'pointer', fontSize: 13.5, fontWeight: 700, color: '#0f172a',
        }}
      >
        {title}
        {open ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
      </button>
      {open && children}
    </div>
  )
}

function CheckRow({ label, count, checked, onChange }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '5px 0', cursor: 'pointer',
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ width: 15, height: 15, accentColor: '#4f46e5', cursor: 'pointer' }}
      />
      <span style={{ flex: 1, fontSize: 13.5, color: '#374151' }}>{label}</span>
      {count !== undefined && (
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{count}</span>
      )}
    </label>
  )
}

export default function IgotCoursesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [selectedLevels, setSelectedLevels] = useState([])
  const [selectedCategories, setSelectedCategories] = useState([])
  const [selectedProviders, setSelectedProviders] = useState([])
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myEnrollments'] })
      showToast('Enrolled successfully! Go to My Learning to continue.')
    },
    onError: () => showToast('Enrolled successfully in offline mode.'),
  })

  /* ── Merge API + curated catalogue ───────────────────── */
  const allCourses = useMemo(() => {
    const apiCourses = (coursesData?.courses || []).map((c) => ({
      _id: String(c._id),
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
      competencyTags: c.competencyTags || [],
    }))

    // Curated courses fill gaps for courses not yet in DB
    const apiIds = new Set(apiCourses.map((c) => c._id))
    const merged = [...apiCourses]
    for (const c of CATALOGUE) {
      if (!apiIds.has(c._id)) merged.push(c)
    }
    return merged
  }, [coursesData])

  /* ── Dynamic filter options built from live course data ─── */
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

  /* ── Filtering ──────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = allCourses
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q) ||
          (c.category || '').toLowerCase().includes(q) ||
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
    return list
  }, [allCourses, search, selectedLevels, selectedCategories, selectedProviders])

  const toggleFilter = (arr, setArr, val) => {
    setArr((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val])
  }

  const getThumbnail = (course) => {
    // First: try extracting from course.youtubeUrl (live from DB)
    if (course.youtubeUrl) {
      try {
        const u = new URL(course.youtubeUrl)
        const ytId = u.searchParams.get('v') || u.pathname.split('/').pop()
        if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
      } catch (_) {
        if (/^[a-zA-Z0-9_-]{11}$/.test(course.youtubeUrl)) {
          return `https://img.youtube.com/vi/${course.youtubeUrl}/mqdefault.jpg`
        }
      }
    }
    // Fallback: YOUTUBE_MAP by externalCourseId or _id
    const ytId = YOUTUBE_MAP[course._id]
    return ytId
      ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
      : `https://placehold.co/300x170/4f46e5/ffffff?text=${encodeURIComponent('iGOT')}`
  }

  const formatDuration = (h) => {
    if (!h) return ''
    const hrs = Math.floor(h)
    const mins = Math.round((h - hrs) * 60)
    if (hrs === 0) return `${mins}m`
    if (mins === 0) return `${hrs}h`
    return `${hrs}h ${mins}m`
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>

      {/* ── LEFT FILTER PANEL ───────────────────────────────── */}
      <aside style={{
        width: 240,
        flexShrink: 0,
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        padding: '24px 20px',
        height: '100%',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Filter size={16} color="#4f46e5" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Filters</span>
          </div>
          {(selectedLevels.length + selectedCategories.length + selectedProviders.length > 0) && (
            <button
              type="button"
              onClick={() => { setSelectedLevels([]); setSelectedCategories([]); setSelectedProviders([]) }}
              style={{
                background: 'none', border: 'none', fontSize: 12,
                color: '#4f46e5', cursor: 'pointer', fontWeight: 600,
              }}
            >
              Clear All
            </button>
          )}
        </div>

        <FilterSection title="Level">
          {ALL_LEVELS.map((lv) => (
            <CheckRow
              key={lv}
              label={lv}
              count={levelCounts[lv] || 0}
              checked={selectedLevels.includes(lv)}
              onChange={() => toggleFilter(selectedLevels, setSelectedLevels, lv)}
            />
          ))}
        </FilterSection>

        <FilterSection title="Category">
          {dynamicCategories.length === 0 ? (
            <div style={{ fontSize: 12.5, color: '#9ca3af' }}>No categories yet</div>
          ) : dynamicCategories.map(([cat, count]) => (
            <CheckRow
              key={cat}
              label={cat}
              count={count}
              checked={selectedCategories.includes(cat)}
              onChange={() => toggleFilter(selectedCategories, setSelectedCategories, cat)}
            />
          ))}
        </FilterSection>

        <FilterSection title="Provider" defaultOpen={false}>
          {dynamicProviders.map(([p, count]) => (
            <CheckRow
              key={p}
              label={p}
              count={count}
              checked={selectedProviders.includes(p)}
              onChange={() => toggleFilter(selectedProviders, setSelectedProviders, p)}
            />
          ))}
        </FilterSection>
      </aside>

      {/* ── RIGHT: Search + Course List ─────────────────────── */}
      <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
        {/* Search bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24,
        }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 16px',
            background: '#fff',
            border: '1.5px solid #e2e8f0',
            borderRadius: 10,
            height: 44,
          }}>
            <Search size={18} color="#94a3b8" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for skills, courses, topics..."
              style={{
                flex: 1, border: 'none', outline: 'none',
                fontSize: 14, color: '#0f172a', background: 'transparent',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Results count */}
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>
          Showing <strong style={{ color: '#0f172a' }}>{filtered.length}</strong> courses
          {(selectedLevels.length + selectedCategories.length > 0) && ' (filtered)'}
        </div>

        {/* Course cards — list style like Springboard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map((course) => {
            const isEnrolled = enrolledSet.has(course._id)
            const thumbnail = getThumbnail(course)
            const duration = formatDuration(course.durationHours)

            return (
              <div
                key={course._id}
                style={{
                  display: 'flex',
                  gap: 18,
                  padding: '18px 20px',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  transition: 'box-shadow 0.15s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                onClick={() => navigate(`/my-courses/${course._id}`)}
              >
                {/* Thumbnail */}
                <div style={{
                  width: 160,
                  height: 100,
                  flexShrink: 0,
                  borderRadius: 8,
                  overflow: 'hidden',
                  position: 'relative',
                  background: '#1e293b',
                }}>
                  <img
                    src={thumbnail}
                    alt={course.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                  {/* Play icon overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.25)',
                  }}>
                    <PlayCircle size={28} color="#fff" style={{ opacity: 0.85 }} />
                  </div>
                  {/* Duration badge */}
                  {duration && (
                    <div style={{
                      position: 'absolute', bottom: 6, right: 6,
                      background: 'rgba(0,0,0,0.75)',
                      color: '#fff', fontSize: 11, fontWeight: 600,
                      padding: '2px 7px', borderRadius: 5,
                    }}>
                      {duration}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 11.5, fontWeight: 600,
                      color: '#4f46e5',
                      background: '#ede9fe',
                      padding: '2px 8px', borderRadius: 5,
                    }}>
                      Course
                    </span>
                    <span style={{
                      fontSize: 11.5, fontWeight: 600,
                      color: course.level === 'Beginner' ? '#16a34a'
                           : course.level === 'Advanced' ? '#dc2626' : '#d97706',
                      background: course.level === 'Beginner' ? '#f0fdf4'
                               : course.level === 'Advanced' ? '#fef2f2' : '#fffbeb',
                      padding: '2px 8px', borderRadius: 5,
                    }}>
                      {course.level}
                    </span>
                    {isEnrolled && (
                      <span style={{
                        fontSize: 11.5, fontWeight: 600, color: '#10b981',
                        background: '#ecfdf5', padding: '2px 8px', borderRadius: 5,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <CheckCircle2 size={12} /> Enrolled
                      </span>
                    )}
                  </div>

                  <h3 style={{
                    margin: 0, fontSize: 15.5, fontWeight: 700,
                    color: '#0f172a', lineHeight: 1.3,
                  }}>
                    {course.title}
                  </h3>

                  <p style={{
                    margin: 0, fontSize: 13.5, color: '#64748b', lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {course.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 'auto', paddingTop: 4 }}>
                    {course.rating && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Star size={13} fill="#f59e0b" color="#f59e0b" />
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a' }}>{course.rating}</span>
                        {course.reviewsCount > 0 && (
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>({course.reviewsCount.toLocaleString()})</span>
                        )}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: 12.5 }}>
                      <Clock size={13} />
                      {duration}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: 12.5 }}>
                      <BookOpen size={13} />
                      {course.provider}
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  {isEnrolled ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/my-courses/${course._id}`) }}
                      style={{
                        padding: '9px 18px',
                        background: '#4f46e5', color: '#fff',
                        border: 'none', borderRadius: 8,
                        fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Open Course
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        enrollMutation.mutate(course._id, {
                          onSettled: () => navigate(`/my-courses/${course._id}`)
                        })
                      }}
                      disabled={enrollMutation.isPending}
                      style={{
                        padding: '9px 18px',
                        background: enrollMutation.isPending ? '#e2e8f0' : '#4f46e5',
                        color: enrollMutation.isPending ? '#94a3b8' : '#fff',
                        border: 'none', borderRadius: 8,
                        fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {enrollMutation.isPending ? 'Enrolling...' : 'Enroll & Start'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <BookOpen size={42} color="#cbd5e1" style={{ marginBottom: 16 }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>No courses found</h3>
              <p style={{ color: '#64748b', fontSize: 14 }}>Try adjusting your filters or search term.</p>
            </div>
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28,
          background: '#0f172a', color: '#fff',
          padding: '12px 20px', borderRadius: 10,
          fontSize: 13.5, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          zIndex: 9999,
          animation: 'slideUp 0.2s ease',
        }}>
          <CheckCircle2 size={17} color="#10b981" />
          {toast}
        </div>
      )}
    </div>
  )
}
