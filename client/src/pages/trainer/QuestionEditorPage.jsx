import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import styles from '../profile/MyProfilePage.module.css'

export default function QuestionEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    text: id === 'new'
      ? ''
      : 'What is the First Stage Unit (FSU) in rural NSSO socioeconomic survey sampling?',
    competency: 'Survey Sampling Techniques',
    difficulty: 'Intermediate',
    options: id === 'new'
      ? ['', '', '', '']
      : [
          'Individual households',
          'Census Villages (or Panchayats)',
          'Enumeration Blocks (EB)',
          'Revenue districts',
        ],
    correctIndex: 1,
    explanation: 'In rural sectors, census villages are defined as the First Stage Units (FSUs) based on the latest decennial census list.',
  })
  const [saving, setSaving] = useState(false)

  const setOption = (idx, val) => {
    const updated = [...form.options]
    updated[idx] = val
    setForm((p) => ({ ...p, options: updated }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      navigate('/trainer/question-bank')
    }, 600)
  }

  return (
    <div style={{ maxWidth: 850, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <Link to="/trainer/question-bank" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Question Bank
        </Link>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 4 }}>
          {id === 'new' ? 'Create New Question' : 'Edit Question & Answers'}
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Modify question text, options, answer key, and grounded explanation
        </p>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className={styles.field}>
            <label className={styles.label}>Question Prompt / Statement</label>
            <textarea
              className={styles.textarea}
              rows={3}
              value={form.text}
              onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))}
              placeholder="Enter official assessment question..."
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className={styles.field}>
              <label className={styles.label}>Competency Tag</label>
              <select
                className={styles.input}
                value={form.competency}
                onChange={(e) => setForm((p) => ({ ...p, competency: e.target.value }))}
              >
                <option value="Survey Sampling Techniques">Survey Sampling Techniques</option>
                <option value="National Accounts">National Accounts</option>
                <option value="Data Quality (NQAF)">Data Quality &amp; NQAF</option>
                <option value="Index Numbers">Index Numbers Compilation</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Difficulty Standard</label>
              <select
                className={styles.input}
                value={form.difficulty}
                onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
              >
                <option value="Beginner">Beginner (Induction)</option>
                <option value="Intermediate">Intermediate (Mid-Cadre)</option>
                <option value="Advanced">Advanced (Senior Officer)</option>
              </select>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
            <label className={styles.label} style={{ marginBottom: 'var(--space-3)', display: 'block' }}>
              Multiple Choice Options (Select radio button for the correct key)
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {form.options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <input
                    type="radio"
                    name="correctIndex"
                    checked={form.correctIndex === i}
                    onChange={() => setForm((p) => ({ ...p, correctIndex: i }))}
                    style={{ width: 18, height: 18, accentColor: 'var(--color-success)', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', width: 24 }}>
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <input
                    type="text"
                    className={styles.input}
                    style={{ flex: 1 }}
                    value={opt}
                    onChange={(e) => setOption(i, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          <div className={styles.field} style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
            <label className={styles.label}>Explanation &amp; Official Reference</label>
            <textarea
              className={styles.textarea}
              rows={3}
              value={form.explanation}
              onChange={(e) => setForm((p) => ({ ...p, explanation: e.target.value }))}
              placeholder="Why this answer is correct according to official guidelines..."
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <Link
              to="/trainer/question-bank"
              style={{
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: 'var(--space-2) var(--space-6)',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--color-primary-600)',
                color: 'white',
                border: 'none',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {saving ? 'Saving Question...' : 'Save to Question Bank'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
