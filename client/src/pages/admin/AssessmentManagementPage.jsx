import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, Edit2, Trash2, BookOpen, CheckCircle2,
  X, Save, AlertTriangle, ChevronDown, ChevronUp,
  FileQuestion, Link2, Layers, PlusCircle,
  FileText, HelpCircle, Unlink, Folder, Calendar, CheckSquare,
} from 'lucide-react'
import { listQuizzes, createQuiz, updateQuiz, deleteQuiz } from '../../api/quiz.api'
import { listCourses } from '../../api/course.api'

/* ──────────────────────────────────────────────────────────
   HELPERS
   ────────────────────────────────────────────────────────── */
const DIFFICULTY_OPTS = ['easy', 'medium', 'hard']

function emptyQuestion() {
  return {
    questionText: '',
    options: ['', '', '', ''],
    correctOptionIndex: 0,
    explanation: '',
    difficulty: 'medium',
  }
}

function emptyForm() {
  return {
    title: '',
    courseId: '',
    domain: '',
    passPercent: 70,
    questions: [emptyQuestion()],
  }
}

/* ──────────────────────────────────────────────────────────
   QUESTION EDITOR CARD
   ────────────────────────────────────────────────────────── */
function QuestionCard({ q, idx, onChange, onDelete, canDelete }) {
  const [expanded, setExpanded] = useState(true)
  const border = '1px solid #e5e7eb'

  return (
    <div style={{
      border: '1.5px solid #e5e7eb', borderRadius: 12,
      marginBottom: 14, background: '#fff', overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: '#f8fafc', cursor: 'pointer',
          borderBottom: expanded ? border : 'none',
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#374151' }}>
          Q{idx + 1}. {q.questionText?.slice(0, 55) || 'New Question'}
          {q.questionText?.length > 55 ? '…' : ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
            background: q.difficulty === 'hard' ? '#fef2f2' : q.difficulty === 'easy' ? '#f0fdf4' : '#fffbeb',
            color: q.difficulty === 'hard' ? '#dc2626' : q.difficulty === 'easy' ? '#16a34a' : '#d97706',
          }}>{q.difficulty}</span>
          {canDelete && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onDelete() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
              <Trash2 size={15} />
            </button>
          )}
          {expanded ? <ChevronUp size={16} color="#6b7280" /> : <ChevronDown size={16} color="#6b7280" />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '16px' }}>
          {/* Question text */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
              Question Text *
            </label>
            <textarea
              value={q.questionText}
              onChange={(e) => onChange('questionText', e.target.value)}
              rows={2}
              placeholder="Enter the question..."
              style={{
                width: '100%', border, borderRadius: 8, padding: '8px 12px',
                fontSize: 13.5, color: '#111827', resize: 'vertical',
                outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Options */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>
              Options (select correct answer)
            </label>
            {q.options.map((opt, oi) => (
              <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <input
                  type="radio"
                  name={`correct-${idx}`}
                  checked={q.correctOptionIndex === oi}
                  onChange={() => onChange('correctOptionIndex', oi)}
                  style={{ accentColor: 'var(--color-primary-600)', width: 16, height: 16, flexShrink: 0 }}
                />
                <span style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--color-primary-600)', width: 20, flexShrink: 0,
                }}>
                  {String.fromCharCode(65 + oi)}.
                </span>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const next = [...q.options]
                    next[oi] = e.target.value
                    onChange('options', next)
                  }}
                  placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                  style={{
                    flex: 1, border: q.correctOptionIndex === oi
                      ? '1.5px solid #4f46e5' : border,
                    borderRadius: 7, padding: '7px 10px', fontSize: 13,
                    outline: 'none',
                    background: q.correctOptionIndex === oi ? '#eff6ff' : '#fff',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Explanation + Difficulty */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                Explanation (optional)
              </label>
              <input
                type="text"
                value={q.explanation}
                onChange={(e) => onChange('explanation', e.target.value)}
                placeholder="Why is this the correct answer?"
                style={{
                  width: '100%', border, borderRadius: 7, padding: '7px 10px',
                  fontSize: 13, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ width: 130 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                Difficulty
              </label>
              <select
                value={q.difficulty}
                onChange={(e) => onChange('difficulty', e.target.value)}
                style={{
                  width: '100%', border, borderRadius: 7, padding: '7px 10px',
                  fontSize: 13, outline: 'none', background: '#fff',
                }}
              >
                {DIFFICULTY_OPTS.map((d) => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
   QUIZ DRAWER (Create / Edit)
   ────────────────────────────────────────────────────────── */
function QuizDrawer({ open, onClose, editing, courses, onSave, saving }) {
  const [form, setForm] = useState(emptyForm())
  const border = '1px solid #e5e7eb'

  React.useEffect(() => {
    if (editing) {
      const qs = (editing.questionIds || []).map((q) => ({
        questionText: q.questionText || '',
        options: q.options || ['', '', '', ''],
        correctOptionIndex: q.correctOptionIndex ?? 0,
        explanation: q.explanation || '',
        difficulty: q.difficulty || 'medium',
      }))
      setForm({
        title: editing.title || '',
        courseId: editing.courseId || '',
        domain: editing.domain || '',
        passPercent: editing.passPercent ?? 70,
        questions: qs.length > 0 ? qs : [emptyQuestion()],
      })
    } else {
      setForm(emptyForm())
    }
  }, [editing, open])

  const updateQ = (idx, field, val) => {
    setForm((f) => {
      const qs = [...f.questions]
      qs[idx] = { ...qs[idx], [field]: val }
      return { ...f, questions: qs }
    })
  }

  const addQuestion = () =>
    setForm((f) => ({ ...f, questions: [...f.questions, emptyQuestion()] }))

  const deleteQuestion = (idx) =>
    setForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }))

  const handleSave = () => {
    if (!form.title.trim()) return alert('Quiz title is required.')
    if (form.questions.some((q) => !q.questionText.trim())) return alert('All questions need text.')
    if (form.questions.some((q) => q.options.some((o) => !o.trim()))) return alert('Fill in all option fields.')
    onSave(form)
  }

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'stretch',
    }}>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ flex: 1, background: 'rgba(0,0,0,0.35)' }}
      />

      {/* Drawer */}
      <div style={{
        width: 700, maxWidth: '95vw', background: '#fff',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 30px rgba(0,0,0,0.12)',
        overflowY: 'auto',
      }}>
        {/* Drawer header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: border,
          background: 'var(--color-primary-600)', color: '#fff', flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              {editing ? 'Edit Quiz' : 'Create New Quiz'}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, opacity: 0.8 }}>
              {editing ? `Editing: ${editing.title}` : 'Add quiz questions and link to a course'}
            </p>
          </div>
          <button type="button" onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {/* Basic info */}
          <div style={{ background: '#f8fafc', border, borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 7 }}>
              <BookOpen size={16} color="var(--color-primary-600)" /> Quiz Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  Quiz Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g., Stress Management & Resilience — Final Quiz"
                  style={{
                    width: '100%', border, borderRadius: 8, padding: '9px 12px',
                    fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <Link2 size={12} /> Link to Course
                </label>
                <select
                  value={form.courseId}
                  onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))}
                  style={{
                    width: '100%', border, borderRadius: 8, padding: '9px 12px',
                    fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box',
                  }}
                >
                  <option value="">— Not linked to any course —</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>{c.title}</option>
                  ))}
                </select>
                <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#9ca3af' }}>
                  "Take Quiz" button in course player will open this quiz
                </p>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  Domain / Category
                </label>
                <input
                  type="text"
                  value={form.domain}
                  onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
                  placeholder="e.g., Data Management"
                  style={{
                    width: '100%', border, borderRadius: 8, padding: '9px 12px',
                    fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  Pass Percentage
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number"
                    min={0} max={100}
                    value={form.passPercent}
                    onChange={(e) => setForm((f) => ({ ...f, passPercent: Number(e.target.value) }))}
                    style={{
                      flex: 1, border, borderRadius: 8, padding: '9px 12px',
                      fontSize: 13, outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 7 }}>
                <FileQuestion size={16} color="var(--color-primary-600)" />
                Questions ({form.questions.length})
              </h3>
              <button
                type="button"
                onClick={addQuestion}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', background: '#eff6ff',
                  border: '1px solid #bfdbfe', borderRadius: 8,
                  fontSize: 13, fontWeight: 600, color: '#2563eb', cursor: 'pointer',
                }}
              >
                <PlusCircle size={15} /> Add Question
              </button>
            </div>

            {form.questions.map((q, idx) => (
              <QuestionCard
                key={idx}
                q={q}
                idx={idx}
                onChange={(field, val) => updateQ(idx, field, val)}
                onDelete={() => deleteQuestion(idx)}
                canDelete={form.questions.length > 1}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderTop: border, background: '#f8fafc', flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            {form.questions.length} question{form.questions.length !== 1 ? 's' : ''} · Pass: {form.passPercent}%
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{
                padding: '9px 18px', background: '#fff', border: '1px solid #d1d5db',
                borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', color: '#374151',
              }}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '9px 20px', background: 'var(--color-primary-600)', border: 'none',
                borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                color: '#fff', display: 'flex', alignItems: 'center', gap: 7,
                opacity: saving ? 0.7 : 1,
              }}>
              <Save size={15} />
              {saving ? 'Saving…' : editing ? 'Update Quiz' : 'Create Quiz'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
   MAIN PAGE
   ────────────────────────────────────────────────────────── */
export default function AssessmentManagementPage() {
  const queryClient = useQueryClient()
  const border = '1px solid #e5e7eb'

  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingQuiz, setEditingQuiz] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  /* Data */
  const { data: quizzesData, isLoading } = useQuery({
    queryKey: ['admin-quizzes'],
    queryFn: () => listQuizzes(),
    staleTime: 30 * 1000,
  })

  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: listCourses,
    staleTime: 5 * 60 * 1000,
  })

  const quizzes = quizzesData?.quizzes || []
  const courses = useMemo(() => coursesData?.courses || coursesData || [], [coursesData])

  /* course lookup map */
  const courseMap = useMemo(() => {
    const m = {}
    courses.forEach((c) => { m[String(c._id)] = c.title })
    return m
  }, [courses])

  /* Mutations */
  const createMutation = useMutation({
    mutationFn: createQuiz,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quizzes'] })
      queryClient.invalidateQueries({ queryKey: ['quiz-for-course'] })
      setDrawerOpen(false)
      showToast('Quiz created successfully!')
    },
    onError: (e) => showToast(e?.response?.data?.message || 'Failed to create quiz'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateQuiz(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quizzes'] })
      queryClient.invalidateQueries({ queryKey: ['quiz-for-course'] })
      setDrawerOpen(false)
      setEditingQuiz(null)
      showToast('Quiz updated successfully!')
    },
    onError: (e) => showToast(e?.response?.data?.message || 'Failed to update quiz'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteQuiz,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quizzes'] })
      queryClient.invalidateQueries({ queryKey: ['quiz-for-course'] })
      setDeleteTarget(null)
      showToast('Quiz deleted.')
    },
    onError: (e) => showToast(e?.response?.data?.message || 'Failed to delete quiz'),
  })

  const handleSave = (formData) => {
    if (editingQuiz) {
      updateMutation.mutate({ id: editingQuiz._id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const openCreate = () => { setEditingQuiz(null); setDrawerOpen(true) }
  const openEdit = (q) => { setEditingQuiz(q); setDrawerOpen(true) }

  const filtered = useMemo(() => {
    if (!search.trim()) return quizzes
    const q = search.toLowerCase()
    return quizzes.filter((qz) =>
      qz.title?.toLowerCase().includes(q) ||
      qz.domain?.toLowerCase().includes(q) ||
      (qz.courseId && courseMap[qz.courseId]?.toLowerCase().includes(q))
    )
  }, [quizzes, search, courseMap])

  /* Stats */
  const totalQ = quizzes.reduce((s, q) => s + (q.questionCount || 0), 0)
  const linked = quizzes.filter((q) => q.courseId).length

  return (
    <div style={{
      minHeight: '100vh', background: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif', padding: '32px 36px',
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: '#111827', color: '#fff', padding: '12px 20px',
          borderRadius: 10, fontSize: 13.5, fontWeight: 500,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}>{toast}</div>
      )}

      {/* Breadcrumb */}
      <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 6 }}>
        Dashboard › Admin Governance › <span style={{ color: 'var(--color-primary-600)', fontWeight: 600 }}>Assessment Management</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 800, color: '#0f172a' }}>
            Assessment Management
          </h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
            Create and manage quizzes linked to courses. Learners take them directly from the course player.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', background: 'var(--color-primary-600)', color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(79,70,229,0.25)',
          }}
        >
          <Plus size={18} /> Create Quiz
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Quizzes', value: quizzes.length, Icon: FileText, color: 'var(--color-primary-600)', bg: 'var(--color-primary-50)' },
          { label: 'Total Questions', value: totalQ, Icon: HelpCircle, color: '#0ea5e9', bg: '#e0f2fe' },
          { label: 'Linked to Courses', value: linked, Icon: Link2, color: '#10b981', bg: '#dcfce7' },
          { label: 'Unlinked Quizzes', value: quizzes.length - linked, Icon: Unlink, color: '#f59e0b', bg: '#fef9c3' },
        ].map((s) => (
          <div key={s.label} style={{
            background: '#fff', border, borderRadius: 14, padding: '18px 20px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 9, background: s.bg, marginBottom: 8,
            }}>
              <s.Icon size={18} color={s.color} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 14px', background: '#fff', border,
        borderRadius: 10, height: 42, marginBottom: 20, maxWidth: 480,
      }}>
        <Search size={16} color="#94a3b8" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by quiz title, domain, or linked course…"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13.5, color: '#0f172a' }}
        />
        {search && (
          <button type="button" onClick={() => setSearch('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Quiz list */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', fontSize: 14 }}>
          Loading quizzes…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px', background: '#fff',
          borderRadius: 16, border,
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <FileText size={40} color="#d1d5db" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
            {search ? 'No quizzes match your search' : 'No quizzes yet'}
          </div>
          <p style={{ fontSize: 13.5, color: '#6b7280', marginBottom: 20 }}>
            Create your first quiz and link it to a course so learners can take it.
          </p>
          {!search && (
            <button type="button" onClick={openCreate}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', background: 'var(--color-primary-600)', color: '#fff',
                border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>
              <Plus size={16} /> Create First Quiz
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((quiz) => {
            const linkedCourseTitle = quiz.courseId ? courseMap[quiz.courseId] : null
            const qCount = quiz.questionCount || (quiz.questionIds?.length ?? 0)
            return (
              <div key={quiz._id} style={{
                background: '#fff', border, borderRadius: 14,
                padding: '18px 22px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: 16,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                    <h3 style={{
                      margin: 0, fontSize: '1rem', fontWeight: 700,
                      color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{quiz.title}</h3>
                    {linkedCourseTitle && (
                      <span style={{
                        flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11.5, padding: '2px 9px',
                        background: '#eff6ff', color: '#2563eb', borderRadius: 99, fontWeight: 600,
                      }}>
                        <Link2 size={11} /> {linkedCourseTitle}
                      </span>
                    )}
                    {!quiz.courseId && (
                      <span style={{
                        flexShrink: 0, fontSize: 11.5, padding: '2px 9px',
                        background: '#fef9c3', color: '#92400e', borderRadius: 99, fontWeight: 600,
                      }}>
                        Not linked
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12.5, color: '#6b7280' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <HelpCircle size={13} /> {qCount} question{qCount !== 1 ? 's' : ''}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <CheckSquare size={13} color="#10b981" /> Pass: {quiz.passPercent ?? 70}%
                    </span>
                    {quiz.domain && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Folder size={13} /> {quiz.domain}
                      </span>
                    )}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={13} /> {new Date(quiz.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <button type="button" onClick={() => openEdit(quiz)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', background: '#f3f4f6',
                      border, borderRadius: 8, fontSize: 13, fontWeight: 600,
                      color: '#374151', cursor: 'pointer',
                    }}>
                    <Edit2 size={14} /> Edit
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(quiz)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '7px 12px', background: '#fff5f5',
                      border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      color: '#dc2626', cursor: 'pointer',
                    }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 28, maxWidth: 440, width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <AlertTriangle size={22} color="#dc2626" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Delete Quiz?</h3>
            </div>
            <p style={{ fontSize: 13.5, color: '#6b7280', margin: '0 0 20px' }}>
              <strong>"{deleteTarget.title}"</strong> and all its{' '}
              {deleteTarget.questionCount || 0} questions will be permanently deleted.
              This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setDeleteTarget(null)}
                style={{
                  padding: '9px 18px', background: '#f3f4f6', border,
                  borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteTarget._id)}
                disabled={deleteMutation.isPending}
                style={{
                  padding: '9px 18px', background: '#dc2626', border: 'none',
                  borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', color: '#fff',
                }}>
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Drawer */}
      <QuizDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingQuiz(null) }}
        editing={editingQuiz}
        courses={courses}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}
