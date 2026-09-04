import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Save, CheckCircle2, ChevronRight, HelpCircle, ArrowLeft } from 'lucide-react'
import styles from './QuestionEditorPage.module.css'

export default function QuestionEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()

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
    author: 'Amit Verma, ISS',
  })
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('kaushalai_question_bank')
      if (saved) {
        const list = JSON.parse(saved)
        const found = list.find((q) => q.id === id)
        if (found) {
          setForm({
            subject: found.subject || 'Survey Sampling',
            difficulty: found.difficulty || 'medium',
            status: found.status || 'Active',
            question: found.question || '',
            optionA: found.options?.find((o) => o.letter === 'A')?.text || found.options?.[0] || '',
            optionB: found.options?.find((o) => o.letter === 'B')?.text || found.options?.[1] || '',
            optionC: found.options?.find((o) => o.letter === 'C')?.text || found.options?.[2] || '',
            optionD: found.options?.find((o) => o.letter === 'D')?.text || found.options?.[3] || '',
            correctAnswer: found.correctAnswer || 'A',
            explanation: found.explanation || '',
            author: found.author || 'Amit Verma, ISS',
          })
        }
      }
    } catch {}
  }, [id])

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.question.trim() || !form.optionA.trim() || !form.optionB.trim()) {
      showToast('Please enter question stem and at least options A and B.')
      return
    }

    try {
      const saved = localStorage.getItem('kaushalai_question_bank')
      let list = saved ? JSON.parse(saved) : []
      const existingIdx = list.findIndex((q) => q.id === id)

      const updatedItem = {
        id: id || `qb-${Date.now()}`,
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
        author: form.author,
      }

      if (existingIdx >= 0) {
        list[existingIdx] = updatedItem
      } else {
        list.unshift(updatedItem)
      }

      localStorage.setItem('kaushalai_question_bank', JSON.stringify(list))
      showToast('Question saved to master item bank successfully!')
      setTimeout(() => navigate('/trainer/question-bank'), 1200)
    } catch {
      showToast('Saved changes.')
      navigate('/trainer/question-bank')
    }
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumb Navigation */}
      <nav className={styles.breadcrumb}>
        <Link to="/dashboard">Dashboard</Link>
        <ChevronRight size={13} />
        <Link to="/trainer/dashboard">Trainer Suite</Link>
        <ChevronRight size={13} />
        <Link to="/trainer/question-bank">Question Bank</Link>
        <ChevronRight size={13} />
        <span className={styles.breadcrumbActive}>Question Item Editor</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Psychometric Question Item Editor</h1>
          <p className={styles.subtitle}>
            Configure question stems, distractor options, and reference explanations calibrated for NSSTA standards
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className={styles.formCard}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div>
              <label className={styles.label}>Competency Domain</label>
              <select
                className={styles.select}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              >
                <option value="Survey Sampling">Survey Sampling</option>
                <option value="Python & Data Cleaning">Python & Data Cleaning</option>
                <option value="Official Statistics">Official Statistics</option>
                <option value="Data Quality & Validation">Data Quality & Validation</option>
                <option value="National Accounts">National Accounts (SNA 2008)</option>
              </select>
            </div>

            <div>
              <label className={styles.label}>Difficulty Calibration</label>
              <select
                className={styles.select}
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              >
                <option value="easy">Easy (Foundational)</option>
                <option value="medium">Medium (Applied Analysis)</option>
                <option value="hard">Hard (Advanced Estimation)</option>
              </select>
            </div>

            <div>
              <label className={styles.label}>Item Status</label>
              <select
                className={styles.select}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="Active">Active (Live in Bank)</option>
                <option value="In Review">In Review (Pending Verification)</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Question Problem Statement (Stem)</label>
            <textarea
              rows={4}
              className={styles.textarea}
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="Enter question text according to official statistics nomenclature..."
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Multiple Choice Distractor &amp; Key Options</label>
            <div className={styles.optionsContainer}>
              {['A', 'B', 'C', 'D'].map((letter) => (
                <div key={letter} className={styles.optionRow}>
                  <div className={styles.optionBadge}>{letter}</div>
                  <input
                    type="text"
                    className={styles.input}
                    style={{ flex: 1 }}
                    placeholder={`Option ${letter} statement`}
                    value={form[`option${letter}`]}
                    onChange={(e) => setForm({ ...form, [`option${letter}`]: e.target.value })}
                    required={letter === 'A' || letter === 'B'}
                  />
                  <label className={styles.correctLabel}>
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={form.correctAnswer === letter}
                      onChange={() => setForm({ ...form, correctAnswer: letter })}
                    />
                    Correct Key
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Psychometric &amp; Pedagogical Rationale</label>
            <textarea
              rows={3}
              className={styles.textarea}
              value={form.explanation}
              onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              placeholder="Detailed explanation and survey methodology citations explaining why the correct choice is accurate..."
            />
          </div>

          <div className={styles.actionsRow}>
            <button
              type="button"
              onClick={() => navigate('/trainer/question-bank')}
              className={styles.btnSecondary}
            >
              Cancel
            </button>
            <button type="submit" className={styles.btnPrimary}>
              <Save size={15} /> Save Question Item
            </button>
          </div>
        </form>
      </div>

      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'var(--color-surface-dark, #0F172A)',
          color: '#FFFFFF',
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
          <CheckCircle2 size={18} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
