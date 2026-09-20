import React, { useState, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  FileQuestion, Award, CheckCircle2, Clock,
  TrendingUp, Search, ArrowRight, Sparkles,
  BookOpen, BarChart2, ShieldCheck, RotateCcw,
  X, HelpCircle, Link2, Layers,
} from 'lucide-react'
import { listQuizzes, getMyQuizAttempts } from '../../api/quiz.api'
import { listCourses } from '../../api/course.api'
import styles from './QuizListPage.module.css'

/* ──────────────────────────────────────────────────────────
   DOMAIN → colour map (deterministic from domain string)
   ────────────────────────────────────────────────────────── */
const DOMAIN_COLORS = [
  { bg: '#EFF6FF', text: '#2563EB' },
  { bg: '#ECFDF5', text: '#059669' },
  { bg: '#FFF7ED', text: '#D97706' },
  { bg: '#F5F3FF', text: '#7C3AED' },
  { bg: '#ECFEFF', text: '#0891B2' },
  { bg: '#FFF1F2', text: '#BE123C' },
  { bg: '#F0FDF4', text: '#16A34A' },
]

function domainColor(domain = '') {
  let hash = 0
  for (let i = 0; i < domain.length; i++) hash = domain.charCodeAt(i) + ((hash << 5) - hash)
  return DOMAIN_COLORS[Math.abs(hash) % DOMAIN_COLORS.length]
}

/* Format duration in minutes */
function fmtDuration(mins) {
  if (!mins) return '20 mins'
  if (mins < 60) return `${mins} mins`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export default function QuizListPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'history' ? 'Attempt History' : 'All Quizzes'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [reviewAttempt, setReviewAttempt] = useState(null)

  /* ── Data fetching ─────────────────────────────────────── */
  const { data: quizzesData, isLoading } = useQuery({
    queryKey: ['quizList'],
    queryFn: () => listQuizzes(),
    staleTime: 30 * 1000,
  })

  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: listCourses,
    staleTime: 5 * 60 * 1000,
  })

  const { data: attemptsData } = useQuery({
    queryKey: ['myAttempts'],
    queryFn: getMyQuizAttempts,
    staleTime: 30 * 1000,
  })

  /* ── Build a course lookup map: id → title ─────────────── */
  const courseMap = useMemo(() => {
    const courses = coursesData?.courses || coursesData || []
    const m = {}
    courses.forEach((c) => { m[String(c._id)] = c.title })
    return m
  }, [coursesData])

  /* ── Normalise quizzes from DB ─────────────────────────── */
  const allQuizzes = useMemo(() => {
    const raw = quizzesData?.quizzes || []
    return raw.map((q) => {
      const dc = domainColor(q.domain || 'General')
      const qCount = q.questionCount || (q.questionIds?.length ?? 0)
      const linkedCourseTitle = q.courseId ? (courseMap[q.courseId] || null) : null
      return {
        _id: String(q._id),
        title: q.title || 'Untitled Quiz',
        description: linkedCourseTitle
          ? `Quiz for: ${linkedCourseTitle}`
          : (q.description || 'Practice quiz from official curriculum.'),
        domain: q.domain || 'General',
        domainColor: dc.text,
        domainBg: dc.bg,
        difficulty: q.difficulty || 'Intermediate',
        durationMinutes: q.durationMinutes || 20,
        questionCount: qCount,
        passScorePercent: q.passPercent ?? 70,
        totalAttempts: q.totalAttempts || 0,
        skillTags: q.tags || q.skillTags || [],
        courseId: q.courseId || '',
        linkedCourseTitle,
        createdAt: q.createdAt,
      }
    })
  }, [quizzesData, courseMap])

  /* ── Attempt history ───────────────────────────────────── */
  const attemptsList = useMemo(() => {
    let local = []
    try { local = JSON.parse(localStorage.getItem('kai_quiz_attempts') || '[]') } catch {}

    const api = (attemptsData?.attempts || []).map((a) => ({
      _id: String(a._id),
      quizTitle: a.quizId?.title || 'Assessment',
      domain: a.quizId?.domain || '',
      date: a.createdAt
        ? new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Recently',
      score: a.score != null ? Math.round(Number(a.score) * 10) / 10 : 0,
      maxScore: 100,
      passed: (a.score || 0) >= (a.quizId?.passPercent || 70),
      quizId: a.quizId && typeof a.quizId === 'object' ? String(a.quizId._id) : String(a.quizId || ''),
      totalQuestions: a.totalQuestions || 0,
      correctCount: a.correctCount || 0,
      answers: a.answers || {},
    }))
    return [...local, ...api]
  }, [attemptsData])

  /* ── Unique domains for filter tabs ───────────────────── */
  const domainTabs = useMemo(() => {
    const domains = [...new Set(allQuizzes.map((q) => q.domain).filter(Boolean))]
    return domains.slice(0, 5)
  }, [allQuizzes])

  const tabs = ['All Quizzes', ...domainTabs, 'Attempt History']

  /* ── Filter + sort ─────────────────────────────────────── */
  const filteredQuizzes = useMemo(() => {
    return allQuizzes.filter((quiz) => {
      if (activeTab !== 'All Quizzes' && activeTab !== 'Attempt History') {
        if (quiz.domain !== activeTab) return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        if (
          !quiz.title.toLowerCase().includes(q) &&
          !quiz.description.toLowerCase().includes(q) &&
          !(quiz.linkedCourseTitle || '').toLowerCase().includes(q) &&
          !quiz.domain.toLowerCase().includes(q) &&
          !quiz.skillTags.some((t) => t.toLowerCase().includes(q))
        ) return false
      }
      if (difficultyFilter !== 'all' && quiz.difficulty.toLowerCase() !== difficultyFilter) return false
      return true
    }).sort((a, b) => {
      if (sortBy === 'questions') return b.questionCount - a.questionCount
      if (sortBy === 'attempts') return b.totalAttempts - a.totalAttempts
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    })
  }, [allQuizzes, activeTab, searchQuery, difficultyFilter, sortBy])

  /* ── Stats ─────────────────────────────────────────────── */
  const totalQ = allQuizzes.reduce((s, q) => s + q.questionCount, 0)
  const avgScore = attemptsList.length
    ? Math.round(attemptsList.reduce((s, a) => s + (a.score || 0), 0) / attemptsList.length)
    : 0
  const passRate = attemptsList.length
    ? Math.round((attemptsList.filter((a) => a.passed).length / attemptsList.length) * 100)
    : 0
  const linked = allQuizzes.filter((q) => q.courseId).length

  const border = '1px solid #e5e7eb'

  /* ── Empty state ────────────────────────────────────────── */
  if (!isLoading && allQuizzes.length === 0) {
    return (
      <div className={styles.pageContainer} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <h2 style={{ color: '#111827', marginBottom: 8 }}>No Quizzes Yet</h2>
        <p style={{ color: '#6b7280', marginBottom: 24, textAlign: 'center', maxWidth: 360 }}>
          Admins can create quizzes and link them to courses from the Assessment Management page.
        </p>
        <Link to="/quizzes" style={{ color: '#4f46e5', fontWeight: 600 }}>← Back</Link>
      </div>
    )
  }

  return (
    <div className={styles.pageContainer}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <nav className={styles.breadcrumbs}>
            <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbActive}>Assessments &amp; Quizzes</span>
          </nav>
          <h1 className={styles.title}>Assessments &amp; Quizzes</h1>
          <p className={styles.subtitle}>
            Official competency assessments, practice quizzes and diagnostic skill tests.
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
        </div>
      </div>

      {/* ── Stats row ──────────────────────────────────────── */}
      <div className={styles.statsGrid}>
        {[
          { icon: <FileQuestion size={20} color="#4F46E5" />, value: allQuizzes.length, label: `Total Assessments`, sub: `Across ${[...new Set(allQuizzes.map(q=>q.domain))].length} domains` },
          { icon: <CheckCircle2 size={20} color="#10B981" />, value: attemptsList.length, label: 'Attempts Recorded', sub: 'Saved in assessment history' },
          { icon: <TrendingUp size={20} color="#F59E0B" />, value: `${avgScore}%`, label: 'Average Score', sub: `${linked} quizzes linked to courses` },
          { icon: <Award size={20} color="#8B5CF6" />, value: `${passRate}%`, label: 'Pass Rate', sub: 'Officially certified standards' },
        ].map((s, i) => (
          <div key={i} className={styles.statCard}>
            <div className={styles.statIcon}>{s.icon}</div>
            <div className={styles.statValue}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={styles.statSub}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className={styles.tabsRow}>
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
          >
            {tab}
            {tab === 'Attempt History' && attemptsList.length > 0 && (
              <span className={styles.tabBadge}>{attemptsList.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Search + Filters ───────────────────────────────── */}
      {activeTab !== 'Attempt History' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 8,
            background: '#fff', border, borderRadius: 10, padding: '0 14px', height: 42,
          }}>
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, domain, or linked course…"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13.5, color: '#0f172a' }}
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            style={{
              border, borderRadius: 8, padding: '0 14px', height: 42, fontSize: 13,
              background: '#fff', color: '#374151', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              border, borderRadius: 8, padding: '0 14px', height: 42, fontSize: 13,
              background: '#fff', color: '#374151', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="newest">Newest First</option>
            <option value="questions">Most Questions</option>
            <option value="attempts">Most Attempted</option>
          </select>
        </div>
      )}

      {/* ── Attempt History view ───────────────────────────── */}
      {activeTab === 'Attempt History' && (
        <div>
          {attemptsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border }}>
              <BarChart2 size={40} color="#d1d5db" style={{ marginBottom: 14 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>No Attempts Yet</div>
              <p style={{ fontSize: 13.5, color: '#6b7280', marginBottom: 20 }}>
                Take a quiz to see your history and scores here.
              </p>
              <button type="button" onClick={() => setActiveTab('All Quizzes')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '9px 18px', background: '#4f46e5', color: '#fff',
                  border: 'none', borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                }}>
                Browse Quizzes
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {attemptsList.map((a, i) => (
                <div key={a._id || i} style={{
                  background: '#fff', border, borderRadius: 14, padding: '16px 20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: '#111827', marginBottom: 4 }}>{a.quizTitle}</div>
                    <div style={{ fontSize: 12.5, color: '#6b7280' }}>{a.date}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: a.passed ? '#10b981' : '#ef4444' }}>{a.score}%</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>Score</div>
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
                      background: a.passed ? '#d1fae5' : '#fee2e2',
                      color: a.passed ? '#065f46' : '#991b1b',
                    }}>
                      {a.passed ? '✓ Passed' : '✗ Retake'}
                    </span>
                    {a.quizId && (
                      <Link to={`/quizzes/${a.quizId}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 13, fontWeight: 600, color: '#4f46e5', textDecoration: 'none',
                        }}>
                        <RotateCcw size={13} /> Retake
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Quiz Grid ──────────────────────────────────────── */}
      {activeTab !== 'Attempt History' && (
        <>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', fontSize: 14 }}>
              Loading quizzes…
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border }}>
              <HelpCircle size={40} color="#d1d5db" style={{ marginBottom: 14 }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
                No quizzes match your search
              </div>
              <button type="button" onClick={() => { setSearchQuery(''); setDifficultyFilter('all') }}
                style={{
                  fontSize: 13.5, color: '#4f46e5', background: 'none',
                  border: 'none', cursor: 'pointer', fontWeight: 600,
                }}>
                Clear filters
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 18 }}>
              {filteredQuizzes.map((quiz) => (
                <div key={quiz._id} style={{
                  background: '#fff', border, borderRadius: 16,
                  display: 'flex', flexDirection: 'column',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s',
                }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.10)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'}
                >
                  {/* Card top */}
                  <div style={{ padding: '18px 20px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{
                        fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5,
                        textTransform: 'uppercase', padding: '3px 9px', borderRadius: 99,
                        background: quiz.domainBg, color: quiz.domainColor,
                      }}>
                        {quiz.domain}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                        background: quiz.difficulty === 'Advanced' ? '#fef2f2'
                          : quiz.difficulty === 'Easy' ? '#f0fdf4' : '#fffbeb',
                        color: quiz.difficulty === 'Advanced' ? '#dc2626'
                          : quiz.difficulty === 'Easy' ? '#16a34a' : '#d97706',
                      }}>
                        {quiz.difficulty}
                      </span>
                    </div>

                    <h3 style={{
                      margin: '0 0 8px', fontSize: '1rem', fontWeight: 700,
                      color: '#0f172a', lineHeight: 1.4,
                    }}>
                      {quiz.title}
                    </h3>

                    {/* Linked course badge */}
                    {quiz.linkedCourseTitle && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 11.5, padding: '3px 9px', borderRadius: 99,
                        background: '#eff6ff', color: '#2563eb', fontWeight: 600,
                        marginBottom: 8,
                      }}>
                        <Link2 size={10} /> {quiz.linkedCourseTitle}
                      </div>
                    )}

                    <p style={{
                      fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.6,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {quiz.description}
                    </p>
                  </div>

                  {/* Stats row */}
                  <div style={{
                    display: 'flex', gap: 16, padding: '10px 20px',
                    borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9',
                    background: '#fafafa', fontSize: 12.5, color: '#475569',
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} /> {fmtDuration(quiz.durationMinutes)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FileQuestion size={13} /> {quiz.questionCount} Questions
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ShieldCheck size={13} /> Min. {quiz.passScorePercent}% to pass
                    </span>
                  </div>

                  {/* Tags */}
                  {quiz.skillTags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 20px 14px' }}>
                      {quiz.skillTags.slice(0, 4).map((tag) => (
                        <span key={tag} style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 99,
                          background: '#f1f5f9', color: '#475569', fontWeight: 500,
                        }}>{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* Take Quiz button */}
                  <div style={{ marginTop: 'auto', padding: '0 16px 16px' }}>
                    <Link
                      to={`/quizzes/${quiz._id}`}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        width: '100%', padding: '11px 0',
                        background: '#4f46e5', color: '#fff',
                        border: 'none', borderRadius: 10,
                        fontSize: 14, fontWeight: 700, textDecoration: 'none',
                        boxSizing: 'border-box',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#4338ca'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#4f46e5'}
                    >
                      Take Quiz <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
