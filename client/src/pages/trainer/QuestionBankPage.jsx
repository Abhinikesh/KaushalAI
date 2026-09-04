import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Database,
  Search,
  Plus,
  Filter,
  Download,
  CheckCircle2,
  Trash2,
  Edit2,
  BookOpen,
  Layers,
  Sparkles,
  X,
  HelpCircle,
} from 'lucide-react'
import styles from './QuestionBankPage.module.css'

const INITIAL_QUESTIONS = [
  {
    id: 'qb-1',
    subject: 'Survey Sampling',
    difficulty: 'intermediate',
    status: 'Active',
    question: 'In stratified sampling, what is the primary objective of proportional allocation?',
    options: [
      { letter: 'A', text: 'To minimize the cost of data collection' },
      { letter: 'B', text: 'To ensure sample size in each stratum is proportional to stratum population size' },
      { letter: 'C', text: 'To maximize variance across different primary sampling units' },
      { letter: 'D', text: 'To equalize sampling variance regardless of stratum size' },
    ],
    correctAnswer: 'B',
    explanation: 'Proportional allocation distributes the total sample size across strata proportional to their respective stratum population sizes (N_h / N).',
    author: 'Faculty NSSTA',
  },
  {
    id: 'qb-2',
    subject: 'Python & Data Cleaning',
    difficulty: 'medium',
    status: 'Active',
    question: 'Which pandas function is specifically optimized to identify duplicate rows in survey microdata?',
    options: [
      { letter: 'A', text: 'df.is_unique()' },
      { letter: 'B', text: 'df.duplicated()' },
      { letter: 'C', text: 'df.drop_repeats()' },
      { letter: 'D', text: 'df.filter_twins()' },
    ],
    correctAnswer: 'B',
    explanation: 'df.duplicated() returns a boolean series denoting duplicate rows based on subset columns or all attributes.',
    author: 'Amit Verma',
  },
  {
    id: 'qb-3',
    subject: 'Official Statistics',
    difficulty: 'easy',
    status: 'Active',
    question: 'Which apex statistical organization under MoSPI is responsible for conducting large-scale sample surveys in India?',
    options: [
      { letter: 'A', text: 'Central Statistics Office (CSO)' },
      { letter: 'B', text: 'National Sample Survey Office (NSSO)' },
      { letter: 'C', text: 'Planning Commission' },
      { letter: 'D', text: 'Reserve Bank of India (RBI)' },
    ],
    correctAnswer: 'B',
    explanation: 'The National Sample Survey Office (NSSO) under MoSPI is responsible for conducting multi-subject socio-economic sample surveys across India.',
    author: 'NSSTA Curriculum Directorate',
  },
  {
    id: 'qb-4',
    subject: 'Data Quality & Validation',
    difficulty: 'hard',
    status: 'Active',
    question: 'What is the primary indicator used to measure non-sampling error in household consumption surveys?',
    options: [
      { letter: 'A', text: 'Standard Error of Mean' },
      { letter: 'B', text: 'Non-response rate and item imputation bias' },
      { letter: 'C', text: 'Chi-Square Goodness of Fit' },
      { letter: 'D', text: 'Sampling design effect (DEFF)' },
    ],
    correctAnswer: 'B',
    explanation: 'Non-sampling errors encompass non-response rates, coverage discrepancies, and imputation bias which cannot be reduced solely by increasing sample size.',
    author: 'Faculty NSSTA',
  },
  {
    id: 'qb-5',
    subject: 'National Accounts',
    difficulty: 'hard',
    status: 'Active',
    question: 'In Gross Domestic Product (GDP) estimation, Gross Value Added (GVA) at basic prices is calculated as:',
    options: [
      { letter: 'A', text: 'GVA at factor cost + (Product Taxes - Product Subsidies)' },
      { letter: 'B', text: 'GVA at factor cost + (Production Taxes - Production Subsidies)' },
      { letter: 'C', text: 'GDP at market prices - Net Indirect Taxes' },
      { letter: 'D', text: 'Final Consumption Expenditure + Gross Capital Formation' },
    ],
    correctAnswer: 'B',
    explanation: 'Under SNA 2008 and Indian National Accounts revision, GVA at basic prices equals GVA at factor cost plus production taxes less production subsidies.',
    author: 'NAD / MoSPI',
  },
]

export default function QuestionBankPage() {
  const navigate = useNavigate()

  // ── State ─────────────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState(() => {
    try {
      const saved = localStorage.getItem('kaushalai_question_bank')
      return saved ? JSON.parse(saved) : INITIAL_QUESTIONS
    } catch {
      return INITIAL_QUESTIONS
    }
  })

  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [toastMessage, setToastMessage] = useState('')

  // Form state
  const [form, setForm] = useState({
    subject: 'Survey Sampling',
    difficulty: 'medium',
    status: 'Active',
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A',
    explanation: '',
  })

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  const saveQuestions = (newList) => {
    setQuestions(newList)
    try {
      localStorage.setItem('kaushalai_question_bank', JSON.stringify(newList))
    } catch {}
  }

  // ── Filter Questions ──────────────────────────────────────────────────────
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchSubject = subjectFilter === 'all' || q.subject === subjectFilter
      const matchDiff = difficultyFilter === 'all' || q.difficulty.toLowerCase() === difficultyFilter.toLowerCase()
      const matchText =
        q.question.toLowerCase().includes(search.toLowerCase()) ||
        q.subject.toLowerCase().includes(search.toLowerCase()) ||
        (q.explanation || '').toLowerCase().includes(search.toLowerCase())
      return matchSubject && matchDiff && matchText
    })
  }, [questions, subjectFilter, difficultyFilter, search])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSaveQuestion = (e) => {
    e.preventDefault()
    if (!form.question.trim() || !form.optionA.trim() || !form.optionB.trim()) {
      showToast('Please fill in the question and at least options A and B.')
      return
    }

    if (editingQuestion) {
      const updated = questions.map((q) =>
        q.id === editingQuestion.id
          ? {
              ...q,
              subject: form.subject,
              difficulty: form.difficulty,
              status: form.status,
              question: form.question,
              options: [
                { letter: 'A', text: form.optionA },
                { letter: 'B', text: form.optionB },
                { letter: 'C', text: form.optionC },
                { letter: 'D', text: form.optionD },
              ],
              correctAnswer: form.correctAnswer,
              explanation: form.explanation,
            }
          : q
      )
      saveQuestions(updated)
      showToast('Question updated successfully!')
      setEditingQuestion(null)
    } else {
      const newQ = {
        id: `qb-${Date.now()}`,
        subject: form.subject,
        difficulty: form.difficulty,
        status: form.status,
        question: form.question,
        options: [
          { letter: 'A', text: form.optionA },
          { letter: 'B', text: form.optionB },
          { letter: 'C', text: form.optionC },
          { letter: 'D', text: form.optionD },
        ],
        correctAnswer: form.correctAnswer,
        explanation: form.explanation,
        author: 'Amit Verma',
      }
      saveQuestions([newQ, ...questions])
      showToast('New question added to Question Bank!')
    }

    setIsAddModalOpen(false)
  }

  const handleDeleteQuestion = (id) => {
    if (window.confirm('Are you sure you want to remove this question from the Question Bank?')) {
      const remaining = questions.filter((q) => q.id !== id)
      saveQuestions(remaining)
      showToast('Question removed.')
    }
  }

  const handleOpenEdit = (q) => {
    setEditingQuestion(q)
    setForm({
      subject: q.subject,
      difficulty: q.difficulty,
      status: q.status,
      question: q.question,
      optionA: q.options.find((o) => o.letter === 'A')?.text || '',
      optionB: q.options.find((o) => o.letter === 'B')?.text || '',
      optionC: q.options.find((o) => o.letter === 'C')?.text || '',
      optionD: q.options.find((o) => o.letter === 'D')?.text || '',
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
    })
    setIsAddModalOpen(true)
  }

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(questions, null, 2))
    const dlAnchor = document.createElement('a')
    dlAnchor.setAttribute('href', dataStr)
    dlAnchor.setAttribute('download', 'NSSTA_Question_Bank_Export.json')
    dlAnchor.click()
    showToast('Question bank exported to JSON.')
  }

  return (
    <div className={styles.page}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Faculty Question Bank</h1>
          <p className={styles.subtitle}>
            Centralized repository of calibrated assessment items mapped to Official Statistics competencies.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.exportBtn} onClick={handleExportJSON}>
            <Download size={15} />
            Export Bank
          </button>
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => {
              setEditingQuestion(null)
              setForm({
                subject: 'Survey Sampling',
                difficulty: 'medium',
                status: 'Active',
                question: '',
                optionA: '',
                optionB: '',
                optionC: '',
                optionD: '',
                correctAnswer: 'A',
                explanation: '',
              })
              setIsAddModalOpen(true)
            }}
          >
            <Plus size={16} />
            Add New Question
          </button>
        </div>
      </div>

      {/* ── Quick Stats Row ──────────────────────────────────────────────── */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#f5f3ff', color: '#6366f1' }}>
            <Database size={20} />
          </div>
          <div>
            <div className={styles.statNum}>{questions.length}</div>
            <div className={styles.statLabel}>Total Bank Items</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#eff6ff', color: '#3b82f6' }}>
            <Layers size={20} />
          </div>
          <div>
            <div className={styles.statNum}>5</div>
            <div className={styles.statLabel}>Competency Domains</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#f0fdf4', color: '#10b981' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className={styles.statNum}>100%</div>
            <div className={styles.statLabel}>Faculty Verified</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fff7ed', color: '#f97316' }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div className={styles.statNum}>24</div>
            <div className={styles.statLabel}>Active in Quizzes</div>
          </div>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className={styles.filterBar}>
        <div className={styles.filterLeft}>
          <div className={styles.searchInputWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search question text, keywords, or topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className={styles.filterSelect}
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="all">All Subjects / Domains</option>
            <option value="Survey Sampling">Survey Sampling</option>
            <option value="Python & Data Cleaning">Python & Data Cleaning</option>
            <option value="Official Statistics">Official Statistics</option>
            <option value="Data Quality & Validation">Data Quality & Validation</option>
            <option value="National Accounts">National Accounts</option>
          </select>

          <select
            className={styles.filterSelect}
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <button
          type="button"
          className={styles.exportBtn}
          onClick={() => navigate('/trainer/quiz-builder')}
        >
          <Sparkles size={15} color="#6366f1" />
          Assemble in Quiz Builder →
        </button>
      </div>

      {/* ── Question List ────────────────────────────────────────────────── */}
      <div className={styles.questionList}>
        {filteredQuestions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, background: '#ffffff', borderRadius: 16 }}>
            <BookOpen size={36} color="#94a3b8" />
            <h3 style={{ marginTop: 12, fontSize: 16, color: '#1e293b' }}>No questions match your criteria</h3>
            <p style={{ color: '#64748b', fontSize: 13 }}>Try resetting your search query or subject filters.</p>
          </div>
        ) : (
          filteredQuestions.map((q, idx) => (
            <div key={q.id} className={styles.questionCard}>
              <div className={styles.cardTop}>
                <div className={styles.badgesRow}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>#{idx + 1}</span>
                  <span className={styles.badgeSubject}>{q.subject}</span>
                  <span
                    className={`${styles.badgeDifficulty} ${
                      q.difficulty === 'easy'
                        ? styles.diffEasy
                        : q.difficulty === 'hard'
                        ? styles.diffHard
                        : styles.diffMedium
                    }`}
                  >
                    {q.difficulty}
                  </span>
                  <span className={styles.badgeStatus}>{q.status}</span>
                </div>

                <div className={styles.actionsRow}>
                  <button
                    type="button"
                    className={styles.actionIconBtn}
                    onClick={() => handleOpenEdit(q)}
                    title="Edit Question"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionIconBtn} ${styles.actionDelete}`}
                    onClick={() => handleDeleteQuestion(q.id)}
                    title="Delete Question"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <p className={styles.questionText}>{q.question}</p>

              <div className={styles.optionsGrid}>
                {q.options.map((opt) => {
                  const isCorrect = opt.letter === q.correctAnswer
                  return (
                    <div
                      key={opt.letter}
                      className={`${styles.optionItem} ${isCorrect ? styles.optionCorrect : ''}`}
                    >
                      <span className={styles.optionLetter}>{opt.letter}.</span>
                      <span>{opt.text}</span>
                      {isCorrect && (
                        <CheckCircle2 size={15} color="#059669" style={{ marginLeft: 'auto' }} />
                      )}
                    </div>
                  )
                })}
              </div>

              {q.explanation && (
                <div className={styles.explanationBox}>
                  <strong>Rationale:</strong> {q.explanation}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Add / Edit Question Modal ─────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAddModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editingQuestion ? 'Edit Question Item' : 'Add New Question to Bank'}
              </h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsAddModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Subject / Domain
                  </label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 13 }}
                  >
                    <option value="Survey Sampling">Survey Sampling</option>
                    <option value="Python & Data Cleaning">Python & Data Cleaning</option>
                    <option value="Official Statistics">Official Statistics</option>
                    <option value="Data Quality & Validation">Data Quality & Validation</option>
                    <option value="National Accounts">National Accounts</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Difficulty Level
                  </label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                    style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 13 }}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 13 }}
                  >
                    <option value="Active">Active</option>
                    <option value="In Review">In Review</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Question Statement
                </label>
                <textarea
                  rows={3}
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  placeholder="Enter the official statistical problem or statement..."
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #cbd5e1', padding: '8px 12px', fontSize: 13 }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Options &amp; Choices
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['A', 'B', 'C', 'D'].map((letter) => (
                    <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, width: 20, color: '#475569' }}>{letter}.</span>
                      <input
                        type="text"
                        placeholder={`Option ${letter} text`}
                        value={form[`option${letter}`]}
                        onChange={(e) => setForm({ ...form, [`option${letter}`]: e.target.value })}
                        style={{ flex: 1, height: 36, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 10px', fontSize: 13 }}
                        required={letter === 'A' || letter === 'B'}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Correct Answer
                  </label>
                  <select
                    value={form.correctAnswer}
                    onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}
                    style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 13 }}
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Explanation / Rationale
                  </label>
                  <input
                    type="text"
                    placeholder="Brief rationale for the correct answer"
                    value={form.explanation}
                    onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                    style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 10px', fontSize: 13 }}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.saveBtn}>
                  {editingQuestion ? 'Update Question' : 'Save to Bank'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: '#0f172a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          zIndex: 10000,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          fontSize: 13.5,
          fontWeight: 500,
        }}>
          <CheckCircle2 size={18} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
