import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save, CheckCircle2, Sliders, Database, HelpCircle } from 'lucide-react'

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
    author: 'Amit Verma',
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
            author: found.author || 'Amit Verma',
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
      showToast('Please enter question text and at least options A and B.')
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
      showToast('Question saved to master bank successfully!')
      setTimeout(() => navigate('/trainer/question-bank'), 1200)
    } catch {
      showToast('Saved changes.')
      navigate('/trainer/question-bank')
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, padding: '0 4px 40px 4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link
            to="/trainer/question-bank"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6366f1', textDecoration: 'none', marginBottom: 6, fontWeight: 600 }}
          >
            <ArrowLeft size={14} /> Back to Question Bank
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Psychometric Question Item Editor
          </h1>
          <p style={{ fontSize: 13.5, color: '#64748b', margin: '4px 0 0 0' }}>
            Configure question stems, distractor options, and reference explanations calibrated for NSSTA standards.
          </p>
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                Subject / Competency Domain
              </label>
              <select
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 10px', fontSize: 13 }}
              >
                <option value="Survey Sampling">Survey Sampling</option>
                <option value="Python & Data Cleaning">Python & Data Cleaning</option>
                <option value="Official Statistics">Official Statistics</option>
                <option value="Data Quality & Validation">Data Quality & Validation</option>
                <option value="National Accounts">National Accounts</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                Difficulty Level
              </label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 10px', fontSize: 13 }}
              >
                <option value="easy">Easy (Foundational)</option>
                <option value="medium">Medium (Applied)</option>
                <option value="hard">Hard (Advanced / Complex)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                Verification Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 10px', fontSize: 13 }}
              >
                <option value="Active">Active (Live in Bank)</option>
                <option value="In Review">In Review (Pending Verification)</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
              Question Problem Statement
            </label>
            <textarea
              rows={4}
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="Enter question text according to official statistics nomenclature..."
              style={{ width: '100%', borderRadius: 8, border: '1px solid #cbd5e1', padding: '10px 12px', fontSize: 13.5, lineHeight: 1.5 }}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 8 }}>
              Multiple Choice Options
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['A', 'B', 'C', 'D'].map((letter) => (
                <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 24, fontWeight: 700, color: '#475569' }}>{letter}.</span>
                  <input
                    type="text"
                    placeholder={`Option ${letter} statement`}
                    value={form[`option${letter}`]}
                    onChange={(e) => setForm({ ...form, [`option${letter}`]: e.target.value })}
                    style={{ flex: 1, height: 38, borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 12px', fontSize: 13 }}
                    required={letter === 'A' || letter === 'B'}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={form.correctAnswer === letter}
                      onChange={() => setForm({ ...form, correctAnswer: letter })}
                    />
                    Correct
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
              Psychometric &amp; Pedagogical Rationale
            </label>
            <textarea
              rows={3}
              value={form.explanation}
              onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              placeholder="Detailed explanation and survey methodology citations explaining why the correct choice is accurate..."
              style={{ width: '100%', borderRadius: 8, border: '1px solid #cbd5e1', padding: '10px 12px', fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => navigate('/trainer/question-bank')}
              style={{ padding: '10px 18px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5, fontWeight: 600, color: '#475569', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '10px 22px', background: '#6366f1', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Save size={16} /> Save Question
            </button>
          </div>
        </form>
      </div>

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
