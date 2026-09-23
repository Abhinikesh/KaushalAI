import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Send,
  Bot,
  CheckCircle2,
  Circle,
  ArrowLeft,
  BookOpen,
  FileText,
  ListChecks,
  Globe,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  PenLine,
  ChevronRight,
  Lightbulb,
  Star,
} from 'lucide-react'
import { getCourseById, getMyEnrollments, updateProgress, rateCourse } from '../../api/course.api'
import { getQuizByCourse } from '../../api/quiz.api'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import SlideViewer from '../../components/courses/SlideViewer'
import { REAL_NSSTA_SLIDES } from '../../data/nsstaSlides'

/* ── YouTube video map ─────────────────────────────────── */
const YOUTUBE_MAP = {
  'igot-crs-01': 'KgCgpCIOkIs',
  'igot-crs-02': 'Vz8zcKawwEo',
  'igot-crs-03': 'hTnnf9AhDLM',
  'igot-crs-04': 'FUQW44EFmQQ',
  'igot-crs-05': 'B_jQ3DlrVs4',
  'igot-crs-06': 'kCthkqPKySw',
}

/* ── Module definitions ─────────────────────────────────── */
const COURSE_MODULES = {
  'igot-crs-01': [
    { title: 'Introduction to Python & Data Libraries', duration: '45 mins' },
    { title: 'Data Loading, Cleaning & EDA with Pandas', duration: '60 mins' },
    { title: 'Statistical Analysis & NumPy', duration: '55 mins' },
    { title: 'Data Visualization with Matplotlib', duration: '50 mins' },
    { title: 'Real-world Data Analysis Case Study', duration: '40 mins' },
  ],
  'igot-crs-02': [
    { title: 'What is Artificial Intelligence?', duration: '30 mins' },
    { title: 'AI in Public Governance — Use Cases', duration: '35 mins' },
    { title: 'Responsible AI & Ethics', duration: '25 mins' },
    { title: 'Implementing AI in Government Workflows', duration: '30 mins' },
  ],
  'igot-crs-03': [
    { title: 'Overview of the 17 SDGs', duration: '30 mins' },
    { title: 'Gender Equality & Inclusive Development', duration: '25 mins' },
    { title: 'SDG Implementation in Public Policy', duration: '35 mins' },
  ],
  'igot-crs-04': [
    { title: 'Overview of DPDP Act 2023', duration: '25 mins' },
    { title: 'Rights of Data Principals', duration: '20 mins' },
    { title: 'Obligations of Data Fiduciaries', duration: '25 mins' },
    { title: 'Compliance & Penalties', duration: '20 mins' },
  ],
  'igot-crs-05': [
    { title: 'Introduction to BNS 2023', duration: '25 mins' },
    { title: 'Key Changes from IPC', duration: '30 mins' },
    { title: 'Offences & Punishments', duration: '25 mins' },
    { title: 'Procedural Reforms', duration: '20 mins' },
  ],
  'igot-crs-06': [
    { title: 'Personal Finance Basics', duration: '20 mins' },
    { title: 'Budgeting & Savings', duration: '25 mins' },
    { title: 'Investment Fundamentals', duration: '30 mins' },
    { title: 'Financial Planning for Govt Officials', duration: '25 mins' },
  ],
}

const DEFAULT_MODULES = [
  { title: 'Module 1: Introduction & Overview', duration: '30 mins' },
  { title: 'Module 2: Core Concepts & Framework', duration: '45 mins' },
  { title: 'Module 3: Practical Application', duration: '40 mins' },
  { title: 'Module 4: Case Studies', duration: '35 mins' },
  { title: 'Module 5: Assessment & Summary', duration: '30 mins' },
]

const COURSE_OVERVIEW = {
  'igot-crs-01': {
    objectives: [
      'Use Python and Pandas for data analysis',
      'Perform exploratory data analysis (EDA)',
      'Apply statistical methods using NumPy',
      'Create data visualizations using Matplotlib',
      'Solve real-world government data analysis problems',
    ],
    prerequisites: 'Basic computer knowledge',
    level: 'Intermediate',
    language: 'English',
  },
  'igot-crs-02': {
    objectives: [
      'Understand core concepts of Artificial Intelligence',
      'Identify AI use cases in public administration',
      'Apply responsible AI principles in governance',
      'Evaluate AI tools for government workflows',
    ],
    prerequisites: 'None',
    level: 'Intermediate',
    language: 'English',
  },
  'igot-crs-03': {
    objectives: [
      'Describe all 17 Sustainable Development Goals',
      'Explain gender equality and inclusive development',
      'Link SDGs to national policy frameworks',
    ],
    prerequisites: 'None',
    level: 'Beginner',
    language: 'English',
  },
}

const AI_SUGGESTIONS = {
  'igot-crs-01': [
    'Explain Pandas DataFrames in simple terms',
    'What is EDA and why is it important?',
    'How do I handle missing data in Python?',
  ],
  'igot-crs-02': [
    'What are the main types of AI?',
    'How is AI used in public services?',
    'What are the risks of AI in governance?',
  ],
  default: [
    'Summarize this course for me',
    'What are the key learning objectives?',
    'Create flashcards for this module',
  ],
}

/* ── Inline AI Chat ─────────────────────────────────────── */
function AiChatPanel({ courseTitle, courseId }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello! I'm KaushalAI, your learning assistant. I can help you understand concepts from "${courseTitle}", create summaries, or answer any questions about this course.`,
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef(null)
  const suggestions = AI_SUGGESTIONS[courseId] || AI_SUGGESTIONS.default

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = (text) => {
    if (!text.trim()) return
    setMessages((prev) => [...prev, { role: 'user', text }])
    setInput('')
    setIsTyping(true)
    setTimeout(() => {
      const replies = {
        'Summarize this course for me': `This course on "${courseTitle}" covers essential knowledge for government officers. It progresses from foundational concepts to practical application, with competency-mapped modules aligned to Karmayogi standards.`,
        'What are the key learning objectives?': `Key objectives:\n• Understand core concepts thoroughly\n• Apply knowledge to government scenarios\n• Build role-specific competencies\n• Complete a final assessment`,
        'Create flashcards for this module': `Flashcards:\n\nQ: What is the main focus?\nA: Understanding and applying the module concepts\n\nQ: Why is this important?\nA: It builds competencies aligned to your official role`,
      }
      const reply = replies[text] || `Good question! This is covered in your current module. Review the Overview tab for detailed notes, or ask me to explain any specific concept from "${courseTitle}".`
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }])
      setIsTyping(false)
    }, 1200)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid #e5e7eb',
        background: 'var(--color-primary-600)',
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 30, height: 30, background: 'rgba(255,255,255,0.2)',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Bot size={16} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>KaushalAI Assistant</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Your learning companion</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '88%',
              padding: '9px 12px',
              borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              background: msg.role === 'user' ? 'var(--color-primary-600)' : '#f1f5f9',
              color: msg.role === 'user' ? '#fff' : '#1e293b',
              fontSize: 12.5,
              lineHeight: 1.55,
              whiteSpace: 'pre-line',
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div style={{
            padding: '9px 12px', background: '#f1f5f9',
            borderRadius: '12px 12px 12px 2px', fontSize: 12.5, color: '#64748b',
            alignSelf: 'flex-start',
          }}>
            Typing...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{ padding: '0 12px 10px', flexShrink: 0 }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => sendMessage(s)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '7px 11px', marginBottom: 6,
                background: '#f8fafc', border: '1px solid #e5e7eb',
                borderRadius: 7, fontSize: 12, color: 'var(--color-primary-600)',
                cursor: 'pointer', fontWeight: 500,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '10px 12px', borderTop: '1px solid #e5e7eb',
        display: 'flex', gap: 8, alignItems: 'center',
        background: '#fafafa', flexShrink: 0,
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder="Ask anything about this course..."
          style={{
            flex: 1, padding: '8px 12px',
            border: '1.5px solid #e5e7eb', borderRadius: 8,
            fontSize: 12.5, outline: 'none', background: '#fff', color: '#0f172a',
          }}
        />
        <button
          type="button"
          onClick={() => sendMessage(input)}
          disabled={!input.trim()}
          style={{
            width: 34, height: 34, background: input.trim() ? 'var(--color-primary-600)' : '#e5e7eb',
            border: 'none', borderRadius: 7, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            cursor: input.trim() ? 'pointer' : 'default', flexShrink: 0,
          }}
        >
          <Send size={14} color={input.trim() ? '#fff' : '#9ca3af'} />
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   MAIN COURSE PLAYER PAGE
   ══════════════════════════════════════════════════════════ */
export default function CourseProgressPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // ── Auto-collapse the nav sidebar for more video space ──────
  const { sidebarCollapsed, setSidebarCollapsed, theme } = useUiStore()
  const isDark = theme === 'dark'
  useEffect(() => {
    // Save current state, then collapse
    const wasCollapsed = sidebarCollapsed
    setSidebarCollapsed(true)
    // Restore when leaving the player
    return () => setSidebarCollapsed(wasCollapsed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [activeModuleIdx, setActiveModuleIdx] = useState(0)
  const [completedModules, setCompletedModules] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [hoverStar, setHoverStar] = useState(0)
  const [userStar, setUserStar] = useState(() => {
    const saved = localStorage.getItem(`rating-${id}`)
    return saved ? Number(saved) : 0
  })
  const [liveRating, setLiveRating] = useState(null) // updated after submit
  const [showSidebar, setShowSidebar] = useState(true)
  const [showAiPanel, setShowAiPanel] = useState(true)
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false)
  const iframeRef = useRef(null)
  const videoContainerRef = useRef(null)

  /* ── Fetch course directly by ID (live from MongoDB) ──── */
  const { data: courseData, isLoading: courseLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => getCourseById(id),
    staleTime: 30 * 1000,
  })

  const { data: enrollmentsData } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
    staleTime: 60 * 1000,
  })

  /* ── Fetch linked quiz for this course ───────────────── */
  const { data: courseQuiz } = useQuery({
    queryKey: ['quiz-for-course', id],
    queryFn: () => getQuizByCourse(id),
    staleTime: 2 * 60 * 1000,
    retry: false,
  })

  /* Resolve course — from direct fetch or fallback shape */
  const course = courseData || {
    _id: id,
    title: 'iGOT Karmayogi Course',
    description: 'Official capacity building module for government officers.',
    provider: 'iGOT Karmayogi',
    difficulty: 'beginner',
    durationHours: 1,
    modules: [],
    objectives: [],
    prerequisites: 'None',
    language: 'English',
    youtubeUrl: '',
    transcript: '',
    resources: [],
  }

  const enrollments = enrollmentsData?.enrollments || enrollmentsData || []
  const enrollment = (Array.isArray(enrollments) ? enrollments : []).find((e) => {
    const cId = typeof e.courseId === 'object' ? e.courseId?._id : e.courseId
    return String(cId) === String(id)
  })

  /* ── Live data from course document ───────────────────── */
  /* Modules: use DB modules if available, else minimal default */
  const modulesList = (course.modules && course.modules.length > 0)
    ? course.modules
    : [
        { title: 'Module 1: Introduction & Overview',  durationMins: 30, youtubeUrl: course.youtubeUrl || '' },
        { title: 'Module 2: Core Concepts & Framework', durationMins: 45, youtubeUrl: '' },
        { title: 'Module 3: Practical Application',     durationMins: 40, youtubeUrl: '' },
        { title: 'Module 4: Case Studies',              durationMins: 35, youtubeUrl: '' },
        { title: 'Module 5: Assessment & Summary',      durationMins: 30, youtubeUrl: '' },
      ]

  /* Detect if this course is the Official Statistics Awareness Programme */
  const isNsstaCourse =
    id === '6a9c77392153d7505fd447a9' ||
    id === '6a996d6d266163e0a9606c9c' ||
    /Official Statistics Awareness Programme/i.test(course.title || '')

  /* YouTube: check active module URL, course URL, or YOUTUBE_MAP (disabled for NSSTA slide presentation) */
  const activeModuleYtUrl = isNsstaCourse
    ? ''
    : (modulesList[activeModuleIdx]?.youtubeUrl ||
       course.youtubeUrl ||
       YOUTUBE_MAP[course.externalCourseId] ||
       YOUTUBE_MAP[course._id] ||
       '')

  const extractYoutubeId = (url) => {
    if (!url) return null
    try {
      const u = new URL(url)
      return u.searchParams.get('v') || u.pathname.split('/').pop() || null
    } catch (_) {
      // check if raw 11-char ID
      if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url
      return null
    }
  }
  const youtubeId = isNsstaCourse ? null : extractYoutubeId(activeModuleYtUrl)

  /* Slides: check active module slides, then course slides, then authentic NSSTA deck fallback */
  const activeModuleSlides = modulesList[activeModuleIdx]?.slides
  let activeSlides = (activeModuleSlides && activeModuleSlides.length > 0)
    ? activeModuleSlides
    : (course.slides && course.slides.length > 0 ? course.slides : (isNsstaCourse ? REAL_NSSTA_SLIDES : []))

  // For NSSTA course, if active module doesn't have partitioned slides, partition per module
  if (isNsstaCourse && (!activeModuleSlides || activeModuleSlides.length === 0) && REAL_NSSTA_SLIDES.length > 0) {
    const totalMods = Math.max(modulesList.length, 1)
    const chunkSize = Math.ceil(REAL_NSSTA_SLIDES.length / totalMods)
    const start = activeModuleIdx * chunkSize
    const end = start + chunkSize
    const sliced = REAL_NSSTA_SLIDES.slice(start, end)
    activeSlides = sliced.length > 0 ? sliced : REAL_NSSTA_SLIDES
  }

  /* Overview info from course document */
  const overviewInfo = {
    objectives:    course.objectives?.length    ? course.objectives    : ['Understand the core concepts of this course', 'Apply knowledge to real-world government scenarios'],
    prerequisites: course.prerequisites || 'None',
    level:         course.difficulty    || 'Intermediate',
    language:      course.language      || 'English',
  }

  /* ── Sync progress ─────────────────────────────────────── */
  useEffect(() => {
    if (enrollment?.progressPercent != null) {
      const count = Math.round((enrollment.progressPercent / 100) * modulesList.length)
      setCompletedModules(Array.from({ length: count }, (_, i) => i))
    }
  }, [enrollment, modulesList.length])

  const progressMutation = useMutation({
    mutationFn: (pct) => {
      if (!enrollment?._id) return Promise.resolve()
      return updateProgress(enrollment._id, pct)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myEnrollments'] }),
  })

  const toggleComplete = (idx) => {
    const next = completedModules.includes(idx)
      ? completedModules.filter((i) => i !== idx)
      : [...completedModules, idx]
    setCompletedModules(next)
    progressMutation.mutate(Math.round((next.length / modulesList.length) * 100))
  }

  const getModuleStatus = (idx) => {
    if (completedModules.includes(idx)) return 'completed'
    if (activeModuleIdx === idx) return 'in_progress'
    return 'not_started'
  }

  const currentPercent = Math.round((completedModules.length / modulesList.length) * 100)

  /* ── Fullscreen ────────────────────────────────────────── */
  const handleFullscreen = () => {
    const el = videoContainerRef.current
    if (!document.fullscreenElement) {
      el?.requestFullscreen?.()
      setIsVideoFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsVideoFullscreen(false)
    }
  }

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setIsVideoFullscreen(false)
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BookOpen },
    { key: 'notes', label: 'Notes', icon: FileText },
    { key: 'transcript', label: 'Transcript', icon: ListChecks },
    { key: 'resources', label: 'Resources', icon: Globe },
  ]

  // ── Shared style tokens ─────────────────────────────────
  const border = isDark ? '1px solid #334155' : '1px solid #e5e7eb'
  const white = isDark ? '#1e293b' : '#ffffff'
  const headerBg = isDark ? '#0f172a' : '#ffffff'
  const sidebarBg = isDark ? '#0f172a' : '#ffffff'
  const pageBg = isDark ? '#020617' : '#f8fafc'
  const textPrimary = isDark ? '#f8fafc' : '#0f172a'
  const textSecondary = isDark ? '#94a3b8' : '#64748b'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: pageBg,
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>

      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: 56,
        background: headerBg,
        borderBottom: border,
        flexShrink: 0,
        gap: 12,
      }}>
        {/* Left: Exit + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <button
            type="button"
            onClick={() => navigate('/my-learning')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', color: '#6b7280',
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
              padding: '6px 10px', borderRadius: 7,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#111827' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6b7280' }}
          >
            <ArrowLeft size={15} />
            Exit Training
          </button>
          <div style={{ width: 1, height: 20, background: '#e5e7eb', flexShrink: 0 }} />
          <span style={{
            fontSize: 14, fontWeight: 600, color: '#111827',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {course.title}
          </span>
        </div>

        {/* Center: Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 160, height: 6, background: '#e5e7eb', borderRadius: 99 }}>
            <div style={{
              width: `${currentPercent}%`, height: '100%',
              background: currentPercent === 100 ? '#10b981' : 'var(--color-primary-600)',
              borderRadius: 99, transition: 'width 0.4s ease',
            }} />
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: currentPercent === 100 ? '#10b981' : 'var(--color-primary-600)', whiteSpace: 'nowrap' }}>
            {currentPercent}% complete
          </span>
        </div>

        {/* Right: action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Take Quiz */}
          {courseQuiz ? (
            <Link
              to={`/quizzes/${courseQuiz._id}`}
              state={{ quizTitle: courseQuiz.title, courseTitle: course.title, courseId: id }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px',
                background: 'var(--color-primary-600)', color: '#fff',
                border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <PenLine size={14} />
              Take Quiz
            </Link>
          ) : (
            <span
              title="No quiz linked to this course yet. Admin can add one from Assessment Management."
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px',
                background: '#e5e7eb', color: '#9ca3af',
                border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 600,
                whiteSpace: 'nowrap', cursor: 'not-allowed',
              }}
            >
              <PenLine size={14} />
              Take Quiz
            </span>
          )}

          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={handleFullscreen}
            title={isVideoFullscreen ? 'Exit fullscreen' : 'Fullscreen video'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34,
              background: '#f3f4f6', border: border,
              borderRadius: 8, cursor: 'pointer', color: '#374151',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
          >
            {isVideoFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Hide Contents */}
          <button
            type="button"
            onClick={() => setShowSidebar((v) => !v)}
            title={showSidebar ? 'Hide contents' : 'Show contents'}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px',
              background: showSidebar ? '#f3f4f6' : 'var(--color-primary-600)',
              color: showSidebar ? '#374151' : '#fff',
              border: border, borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { if (showSidebar) e.currentTarget.style.background = '#e5e7eb' }}
            onMouseLeave={(e) => { if (showSidebar) e.currentTarget.style.background = '#f3f4f6' }}
          >
            {showSidebar ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            {showSidebar ? 'Hide Contents' : 'Show Contents'}
          </button>

          {/* Hide AI Tutor */}
          <button
            type="button"
            onClick={() => setShowAiPanel((v) => !v)}
            title={showAiPanel ? 'Hide AI tutor' : 'Show AI tutor'}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px',
              background: showAiPanel ? '#f3f4f6' : 'var(--color-primary-600)',
              color: showAiPanel ? '#374151' : '#fff',
              border: border, borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { if (showAiPanel) e.currentTarget.style.background = '#e5e7eb' }}
            onMouseLeave={(e) => { if (showAiPanel) e.currentTarget.style.background = '#f3f4f6' }}
          >
            {showAiPanel ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
            {showAiPanel ? 'Hide AI Tutor' : 'Show AI Tutor'}
          </button>
        </div>
      </div>

      {/* ── MAIN 3-COLUMN BODY ──────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* LEFT: Module Sidebar */}
        {showSidebar && (
          <div style={{
            width: 280,
            flexShrink: 0,
            background: sidebarBg,
            borderRight: border,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Sidebar header */}
            <div style={{
              padding: '14px 18px 12px',
              borderBottom: border,
              background: '#fafafa',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>
                Course Contents
              </div>
              <div style={{ fontSize: 12.5, color: '#374151', fontWeight: 500 }}>
                {completedModules.length} of {modulesList.length} completed
              </div>
              {/* Mini progress bar */}
              <div style={{ height: 4, background: '#e5e7eb', borderRadius: 99, marginTop: 8 }}>
                <div style={{
                  width: `${currentPercent}%`, height: '100%',
                  background: currentPercent === 100 ? '#10b981' : 'var(--color-primary-600)',
                  borderRadius: 99, transition: 'width 0.4s ease',
                }} />
              </div>
            </div>

            {/* Module list */}
            <div>
              {modulesList.map((mod, idx) => {
                const status = getModuleStatus(idx)
                const isActive = idx === activeModuleIdx
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveModuleIdx(idx)}
                    style={{
                      padding: '13px 18px',
                      cursor: 'pointer',
                      background: isActive ? 'var(--color-primary-100)' : 'transparent',
                      borderLeft: `3px solid ${isActive ? 'var(--color-primary-600)' : 'transparent'}`,
                      borderBottom: border,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#f9fafb' }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    {/* Status badge */}
                    <div style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.4,
                      marginBottom: 4,
                      color: status === 'completed' ? '#10b981'
                           : status === 'in_progress' ? '#f59e0b'
                           : '#9ca3af',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      {status === 'completed' && <CheckCircle2 size={12} />}
                      {status === 'in_progress' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />}
                      {status === 'not_started' && <Circle size={12} />}
                      {status === 'completed' ? 'Completed'
                       : status === 'in_progress' ? 'In Progress'
                       : 'Not Started'}
                    </div>

                    {/* Title */}
                    <div style={{
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'var(--color-primary-800)' : '#374151',
                      lineHeight: 1.45,
                      marginBottom: 6,
                    }}>
                      {mod.title}
                    </div>

                    {/* Duration + complete toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11.5, color: '#9ca3af' }}>{mod.duration}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleComplete(idx) }}
                        style={{
                          background: status === 'completed' ? '#ecfdf5' : '#f3f4f6',
                          border: `1px solid ${status === 'completed' ? '#86efac' : '#e5e7eb'}`,
                          borderRadius: 5, padding: '2px 8px',
                          fontSize: 11, fontWeight: 600,
                          color: status === 'completed' ? '#10b981' : '#6b7280',
                          cursor: 'pointer',
                        }}
                      >
                        {status === 'completed' ? 'Done' : 'Mark done'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* CENTER: Video + Tabs */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', background: pageBg, minWidth: 0 }}>

          {/* Video or Slide Viewer or Honest EmptyState */}
          {youtubeId ? (
            <div
              ref={videoContainerRef}
              style={{
                position: 'relative',
                background: '#000',
                lineHeight: 0,
              }}
            >
              <div style={{ position: 'relative', paddingTop: '56.25%' /* 16:9 */ }}>
                <iframe
                  ref={iframeRef}
                  key={`${id}-${activeModuleIdx}`}
                  src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&start=${activeModuleIdx * 30}`}
                  title={modulesList[activeModuleIdx]?.title || 'Course Video'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '100%', height: '100%',
                    border: 'none', display: 'block',
                  }}
                />
              </div>
            </div>
          ) : activeSlides && activeSlides.length > 0 ? (
            <div ref={videoContainerRef} style={{ width: '100%' }}>
              <SlideViewer
                slides={activeSlides}
                courseTitle={course.title}
                moduleTitle={modulesList[activeModuleIdx]?.title}
                onComplete={() => toggleComplete(activeModuleIdx)}
                isCompleted={completedModules.includes(activeModuleIdx)}
              />
            </div>
          ) : (
            <div
              ref={videoContainerRef}
              style={{
                width: '100%',
                aspectRatio: '16 / 9',
                minHeight: 380,
                background: isDark ? '#1e293b' : '#f8fafc',
                borderBottom: border,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 24px',
                textAlign: 'center',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: isDark ? '#334155' : 'var(--color-primary-100)',
                  color: 'var(--color-primary-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <BookOpen size={26} />
              </div>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: textPrimary, margin: '0 0 6px 0' }}>
                No Video Content Available for this Module
              </h3>
              <p style={{ fontSize: '0.8125rem', color: textSecondary, maxWidth: 440, margin: 0 }}>
                Learning materials or slide presentations for "{modulesList[activeModuleIdx]?.title || 'this module'}" have not been uploaded yet.
              </p>
            </div>
          )}

          {/* Tab bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            background: white,
            borderBottom: border,
            borderTop: border,
            flexShrink: 0,
          }}>
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '12px 16px',
                    background: 'none', border: 'none',
                    borderBottom: activeTab === tab.key ? '2px solid #4f46e5' : '2px solid transparent',
                    color: activeTab === tab.key ? 'var(--color-primary-600)' : '#6b7280',
                    fontSize: 13.5,
                    fontWeight: activeTab === tab.key ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, padding: '24px 28px', background: white, overflowY: 'auto' }}>

            {activeTab === 'overview' && (
              <div>
                <h2 style={{ margin: '0 0 20px', fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>
                  {modulesList[activeModuleIdx]?.title}
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
                  {[
                    { label: 'Duration', value: `${course.durationHours || 6} Hours` },
                    { label: 'Level', value: overviewInfo.level },
                    { label: 'Language', value: overviewInfo.language },
                  ].map((item) => (
                    <div key={item.label} style={{
                      background: '#f9fafb', border, borderRadius: 10, padding: '12px 16px',
                    }}>
                      <div style={{ fontSize: 10.5, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#9ca3af', marginBottom: 6 }}>
                    Prerequisites
                  </div>
                  <p style={{ color: '#374151', fontSize: 14, margin: 0 }}>{overviewInfo.prerequisites}</p>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#9ca3af', marginBottom: 12 }}>
                    Objectives
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {overviewInfo.objectives.map((obj, i) => (
                      <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: '#374151' }}>
                        <span style={{ color: 'var(--color-primary-600)', fontWeight: 700, marginTop: 1, flexShrink: 0 }}>•</span>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ── Rate this course ──────────────────────────── */}
                <div style={{
                  marginTop: 28, padding: '18px 20px',
                  background: '#f8fafc', borderRadius: 12,
                  border: '1.5px solid #e5e7eb',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#9ca3af', marginBottom: 10 }}>
                    Rate this course
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[1,2,3,4,5].map((s) => {
                        const filled = s <= (hoverStar || userStar)
                        return (
                          <button
                            key={s}
                            type="button"
                            onMouseEnter={() => setHoverStar(s)}
                            onMouseLeave={() => setHoverStar(0)}
                            onClick={() => {
                              setUserStar(s)
                              localStorage.setItem(`rating-${id}`, s)
                              rateCourse(id, s)
                                .then((res) => setLiveRating(res.rating))
                                .catch(() => {})
                            }}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              padding: '2px 3px', fontSize: 28, lineHeight: 1,
                              color: filled ? '#f59e0b' : '#d1d5db',
                              transition: 'color 0.1s, transform 0.1s',
                              transform: filled ? 'scale(1.18)' : 'scale(1)',
                            }}
                          >
                            ★
                          </button>
                        )
                      })}
                    </div>
                    <div style={{ fontSize: 13.5 }}>
                      {userStar > 0 ? (
                        <span style={{ fontWeight: 600, color: 'var(--color-primary-600)' }}>
                          You rated {userStar} star{userStar > 1 ? 's' : ''}
                          <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
                            · Avg: {liveRating ?? (course.rating || course.defaultRating || 4.3)}
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: '#6b7280' }}>Tap a star to rate this course</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div>
                <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, color: '#111827' }}>My Notes</h3>
                <textarea
                  placeholder="Take notes while watching the video... Your notes are saved automatically."
                  defaultValue={localStorage.getItem(`notes-${id}-${activeModuleIdx}`) || ''}
                  onChange={(e) => localStorage.setItem(`notes-${id}-${activeModuleIdx}`, e.target.value)}
                  style={{
                    width: '100%', minHeight: 200,
                    padding: '14px', border,
                    borderRadius: 10, fontSize: 14, lineHeight: 1.6,
                    color: '#111827', outline: 'none', resize: 'vertical',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                    background: '#fafafa',
                  }}
                />
                <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>Notes are saved locally in your browser.</p>
              </div>
            )}

            {activeTab === 'transcript' && (
              <div>
                <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Transcript</h3>
                <div style={{ background: '#f9fafb', border, borderRadius: 10, padding: '18px 20px' }}>
                  {course.transcript ? (
                    <p style={{ color: '#374151', fontSize: 14, lineHeight: 1.9, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {course.transcript}
                    </p>
                  ) : (
                    <>
                      <p style={{ color: '#374151', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                        No transcript has been added for this course yet.
                      </p>
                      <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 10, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Lightbulb size={13} /> Tip: Use the AI Assistant to ask questions about the content of this module.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'resources' && (
              <div>
                <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Resources</h3>
                {(course.resources && course.resources.length > 0) ? (
                  course.resources.map((r, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px', background: '#f9fafb',
                      border, borderRadius: 10, marginBottom: 10,
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{r.label || 'Resource'}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{r.type}{r.sizeMB ? ` · ${r.sizeMB}` : ''}</div>
                      </div>
                      {r.url ? (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '7px 14px', background: 'var(--color-primary-600)',
                            borderRadius: 7, color: '#fff',
                            fontSize: 12.5, fontWeight: 600, textDecoration: 'none',
                          }}
                        >
                          Download
                        </a>
                      ) : (
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>No link</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ background: '#f9fafb', border, borderRadius: 10, padding: '18px 20px' }}>
                    <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
                      No resources have been added for this course yet. Check back later or ask the AI Tutor for reference materials.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: AI Chat Panel */}
        {showAiPanel && (
          <div style={{
            width: 300,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            background: white,
            borderLeft: border,
            overflow: 'hidden',
          }}>
            <AiChatPanel courseTitle={course.title} courseId={id} />
          </div>
        )}
      </div>
    </div>
  )
}
