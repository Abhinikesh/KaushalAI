import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X,
  Send,
  Bot,
  CheckCircle2,
  Circle,
  ArrowLeft,
  BookOpen,
  FileText,
  Mic,
  ListChecks,
  Globe,
} from 'lucide-react'
import { listCourses, getMyEnrollments, updateProgress } from '../../api/course.api'
import { useAuthStore } from '../../store/authStore'

/* ── YouTube video map (same IDs used in the catalogue) ─── */
const YOUTUBE_MAP = {
  'igot-crs-01': 'KgCgpCIOkIs',
  'igot-crs-02': 'Vz8zcKawwEo',
  'igot-crs-03': 'hTnnf9AhDLM',
  'igot-crs-04': 'FUQW44EFmQQ',
  'igot-crs-05': 'B_jQ3DlrVs4',
  'igot-crs-06': 'kCthkqPKySw',
}

/* ── Module definitions per course ─── */
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

/* ── Course overview info ─── */
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

/* ── Suggested AI questions per course ─── */
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

/* ── Inline AI Chat component ─── */
function AiChatPanel({ courseTitle, courseId }) {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello! I'm KaushalAI, your learning assistant. I can help you understand concepts from **${courseTitle}**, create summaries, or answer any questions about this course.`,
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef(null)

  const suggestions = AI_SUGGESTIONS[courseId] || AI_SUGGESTIONS.default

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    if (!text.trim()) return
    const userMsg = { role: 'user', text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    // Simulate AI response (replace with real API call when available)
    setTimeout(() => {
      const responses = {
        'Summarize this course for me': `This course on **${courseTitle}** covers key concepts and practical skills. It is structured into modules that progress from foundational knowledge to applied practice. By the end, you will be able to apply these skills in your government role.`,
        'What are the key learning objectives?': `The key objectives are:\n• Understand core concepts thoroughly\n• Apply knowledge to real-world government scenarios\n• Develop practical skills relevant to your role\n• Complete a competency assessment`,
        'Create flashcards for this module': `Here are quick flashcards:\n\n**Q:** What is the main focus?\n**A:** Understanding and applying the module concepts\n\n**Q:** Why is this important for govt officials?\n**A:** It builds role-specific competencies aligned to Karmayogi standards`,
      }
      const reply = responses[text] || `Good question about **${courseTitle}**! This topic is covered in your current module. I recommend reviewing the Overview tab below the video for detailed notes. Would you like me to explain any specific concept?`
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }])
      setIsTyping(false)
    }, 1200)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#fff',
      borderLeft: '1px solid #e2e8f0',
    }}>
      {/* Panel header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid #e2e8f0',
        background: '#4f46e5',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 32, height: 32,
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Bot size={17} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>KaushalAI Assistant</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Your learning companion</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '88%',
              padding: '10px 13px',
              borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              background: msg.role === 'user' ? '#4f46e5' : '#f1f5f9',
              color: msg.role === 'user' ? '#fff' : '#1e293b',
              fontSize: 13,
              lineHeight: 1.55,
              whiteSpace: 'pre-line',
            }}>
              {msg.text.replace(/\*\*(.*?)\*\*/g, '$1')}
            </div>
          </div>
        ))}
        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              padding: '10px 14px',
              background: '#f1f5f9',
              borderRadius: '12px 12px 12px 2px',
              fontSize: 13,
              color: '#64748b',
            }}>
              Typing...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{ padding: '0 12px 10px' }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => sendMessage(s)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                marginBottom: 6,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 12.5,
                color: '#4f46e5',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        background: '#fafafa',
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder="Ask anything about this course..."
          style={{
            flex: 1,
            padding: '9px 12px',
            border: '1.5px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 13,
            outline: 'none',
            background: '#fff',
            color: '#0f172a',
          }}
        />
        <button
          type="button"
          onClick={() => sendMessage(input)}
          disabled={!input.trim()}
          style={{
            width: 36, height: 36,
            background: input.trim() ? '#4f46e5' : '#e2e8f0',
            border: 'none',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: input.trim() ? 'pointer' : 'default',
          }}
        >
          <Send size={15} color={input.trim() ? '#fff' : '#94a3b8'} />
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

  const [activeModuleIdx, setActiveModuleIdx] = useState(0)
  const [completedModules, setCompletedModules] = useState([])
  const [activeTab, setActiveTab] = useState('overview') // overview | notes | transcript | resources
  const [showSidebar, setShowSidebar] = useState(true)

  // ── Data ─────────────────────────────────────────────
  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: listCourses,
    staleTime: 5 * 60 * 1000,
  })

  const { data: enrollmentsData } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
    staleTime: 60 * 1000,
  })

  const courses = coursesData?.courses || coursesData || []
  const course = courses.find((c) => String(c._id) === String(id)) || {
    _id: id,
    title: 'iGOT Karmayogi Course',
    description: 'Official capacity building module for government officers.',
    provider: 'iGOT Karmayogi',
    difficulty: 'Intermediate',
    durationHours: 6,
  }

  const enrollments = enrollmentsData?.enrollments || enrollmentsData || []
  const enrollment = enrollments.find((e) => {
    const cId = typeof e.courseId === 'object' ? e.courseId?._id : e.courseId
    return String(cId) === String(id)
  })

  const modulesList = COURSE_MODULES[id] || DEFAULT_MODULES
  const youtubeId = YOUTUBE_MAP[id] || 'dQw4w9WgXcQ'
  const overviewInfo = COURSE_OVERVIEW[id] || {
    objectives: [
      'Understand the core concepts of this course',
      'Apply knowledge to real-world government scenarios',
      'Develop practical skills for your role',
    ],
    prerequisites: 'None',
    level: course.difficulty || 'Intermediate',
    language: 'English',
  }

  // Sync progress from enrollment
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

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BookOpen },
    { key: 'notes', label: 'Notes', icon: FileText },
    { key: 'transcript', label: 'Transcript', icon: ListChecks },
    { key: 'resources', label: 'Resources', icon: Globe },
  ]

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#0f172a',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        height: 52,
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={() => navigate('/my-learning')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', color: '#94a3b8',
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}
          >
            <ArrowLeft size={16} />
            Exit Training
          </button>
          <div style={{ width: 1, height: 18, background: '#334155' }} />
          <span style={{
            fontSize: 14, fontWeight: 600, color: '#e2e8f0',
            maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {course.title}
          </span>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 160, height: 5, background: '#334155', borderRadius: 99 }}>
              <div style={{
                width: `${currentPercent}%`,
                height: '100%',
                background: currentPercent === 100 ? '#10b981' : '#4f46e5',
                borderRadius: 99,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <span style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 600 }}>
              {currentPercent}% complete
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowSidebar((v) => !v)}
            style={{
              padding: '5px 12px',
              background: showSidebar ? '#4f46e5' : '#334155',
              border: 'none', borderRadius: 6,
              color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 500,
            }}
          >
            {showSidebar ? 'Hide' : 'Show'} Contents
          </button>
        </div>
      </div>

      {/* ── Main 3-Column Body ───────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT: Module Sidebar */}
        {showSidebar && (
          <div style={{
            width: 280,
            flexShrink: 0,
            background: '#1a2332',
            borderRight: '1px solid #334155',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid #334155',
              fontSize: 12,
              fontWeight: 700,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              Course Contents
            </div>

            <div style={{ padding: '8px 0' }}>
              {modulesList.map((mod, idx) => {
                const status = getModuleStatus(idx)
                const isActive = idx === activeModuleIdx
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveModuleIdx(idx)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      background: isActive ? 'rgba(79,70,229,0.15)' : 'transparent',
                      borderLeft: isActive ? '3px solid #4f46e5' : '3px solid transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    {/* Status badge */}
                    <div style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      color: status === 'completed' ? '#10b981'
                           : status === 'in_progress' ? '#f59e0b'
                           : '#64748b',
                      marginBottom: 4,
                    }}>
                      {status === 'completed' ? '● COMPLETED'
                      : status === 'in_progress' ? '● IN PROGRESS'
                      : '○ NOT STARTED'}
                    </div>

                    {/* Title */}
                    <div style={{
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#e2e8f0' : '#94a3b8',
                      lineHeight: 1.4,
                      marginBottom: 4,
                    }}>
                      {mod.title}
                    </div>

                    {/* Duration + complete toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11.5, color: '#64748b' }}>{mod.duration}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleComplete(idx) }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center',
                          color: status === 'completed' ? '#10b981' : '#475569',
                        }}
                        title={status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {status === 'completed'
                          ? <CheckCircle2 size={16} />
                          : <Circle size={16} />}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* CENTER: Video Player + Tabs */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0f172a' }}>
          {/* YouTube iframe */}
          <div style={{
            position: 'relative',
            background: '#000',
            aspectRatio: '16/9',
            maxHeight: 'calc(100vh - 52px - 180px)',
          }}>
            <iframe
              key={`${id}-${activeModuleIdx}`}
              src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&start=${activeModuleIdx * 30}`}
              title={modulesList[activeModuleIdx]?.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
              }}
            />
          </div>

          {/* Tab bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            padding: '0 20px',
            background: '#1e293b',
            borderBottom: '1px solid #334155',
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
                    padding: '12px 18px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === tab.key ? '2px solid #4f46e5' : '2px solid transparent',
                    color: activeTab === tab.key ? '#4f46e5' : '#64748b',
                    fontSize: 13.5,
                    fontWeight: activeTab === tab.key ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 28px',
            background: '#fff',
          }}>
            {activeTab === 'overview' && (
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>
                  {modulesList[activeModuleIdx]?.title}
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
                  {[
                    { label: 'Duration', value: `${course.durationHours || 6} Hours` },
                    { label: 'Level', value: overviewInfo.level },
                    { label: 'Language', value: overviewInfo.language },
                  ].map((item) => (
                    <div key={item.label} style={{
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: 10, padding: '14px 16px',
                    }}>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b', marginBottom: 6 }}>Prerequisites</div>
                  <p style={{ color: '#475569', fontSize: 14 }}>{overviewInfo.prerequisites}</p>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b', marginBottom: 12 }}>Objectives</div>
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {overviewInfo.objectives.map((obj, i) => (
                      <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: '#1e293b' }}>
                        <span style={{ color: '#4f46e5', fontWeight: 700, marginTop: 1 }}>•</span>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>My Notes</h3>
                <textarea
                  placeholder="Take notes while watching the video... Your notes are saved locally."
                  defaultValue={localStorage.getItem(`notes-${id}-${activeModuleIdx}`) || ''}
                  onChange={(e) => localStorage.setItem(`notes-${id}-${activeModuleIdx}`, e.target.value)}
                  style={{
                    width: '100%', minHeight: 220,
                    padding: '14px', border: '1.5px solid #e2e8f0',
                    borderRadius: 10, fontSize: 14, lineHeight: 1.6,
                    color: '#1e293b', outline: 'none', resize: 'vertical',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
                <p style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 8 }}>
                  Notes are saved in your browser automatically.
                </p>
              </div>
            )}

            {activeTab === 'transcript' && (
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Transcript</h3>
                <div style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 10, padding: '18px 20px',
                }}>
                  <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.7 }}>
                    Transcript for this module will be available after the video is processed.
                    This feature helps you follow along with the content and search for specific topics discussed in the video.
                  </p>
                  <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>
                    💡 Tip: Use the AI Assistant on the right to ask questions about the content covered in this module.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'resources' && (
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Resources</h3>
                {[
                  { label: `${course.title} — Study Material`, type: 'PDF', size: '2.4 MB' },
                  { label: 'Reference Guide for Government Officers', type: 'PDF', size: '1.1 MB' },
                  { label: 'Practice Exercise Workbook', type: 'PDF', size: '890 KB' },
                ].map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', background: '#f8fafc',
                    border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 10,
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{r.label}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{r.type} · {r.size}</div>
                    </div>
                    <button
                      type="button"
                      style={{
                        padding: '7px 14px', background: '#4f46e5',
                        border: 'none', borderRadius: 7, color: '#fff',
                        fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: AI Chat Panel */}
        <div style={{
          width: 300,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          borderLeft: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}>
          <AiChatPanel courseTitle={course.title} courseId={id} />
        </div>
      </div>
    </div>
  )
}
