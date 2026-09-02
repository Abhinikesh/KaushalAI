import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import styles from '../profile/MyProfilePage.module.css'

export default function CreateProgrammePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '',
    source: 'nssta',
    durationHours: 24,
    difficulty: 'intermediate',
    mode: 'residential',
    targetCadre: 'SSS & ISS Cadres',
    description: '',
    syllabus: 'Module 1: Foundations\nModule 2: Practical Exercises\nModule 3: Case Studies & Final Assessment',
  })
  const [submitting, setSubmitting] = useState(false)

  const setField = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      navigate('/trainer/programmes')
    }, 800)
  }

  return (
    <div style={{ maxWidth: 850, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link to="/trainer/programmes" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', textDecoration: 'none', fontWeight: 600 }}>
            ← Back to Programmes
          </Link>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 4 }}>
            Create New Training Programme
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Register an official NSSTA workshop or iGOT-aligned training curriculum
          </p>
        </div>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className={styles.field}>
            <label className={styles.label}>Programme Title</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Advanced Survey Sampling and Spatial Data Systems"
              value={form.title}
              onChange={setField('title')}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className={styles.field}>
              <label className={styles.label}>Training Authority / Source</label>
              <select className={styles.input} value={form.source} onChange={setField('source')}>
                <option value="nssta">NSSTA Greater Noida (In-Person / Hybrid)</option>
                <option value="igot">iGOT Karmayogi Portal</option>
                <option value="tpac">TPAC Workshop</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Duration (Hours)</label>
              <input
                type="number"
                min="1"
                max="200"
                className={styles.input}
                value={form.durationHours}
                onChange={setField('durationHours')}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Difficulty Level</label>
              <select className={styles.input} value={form.difficulty} onChange={setField('difficulty')}>
                <option value="beginner">Beginner / Induction</option>
                <option value="intermediate">Intermediate / Mid-Career</option>
                <option value="advanced">Advanced / Specialized</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Delivery Mode</label>
              <select className={styles.input} value={form.mode} onChange={setField('mode')}>
                <option value="residential">Residential (NSSTA Campus)</option>
                <option value="virtual">Virtual / Webinars</option>
                <option value="hybrid">Blended / Hybrid</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Target Cadres &amp; Eligibility</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Statistical Officers, SSS Cadre, DES State Officers"
              value={form.targetCadre}
              onChange={setField('targetCadre')}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Programme Description &amp; Objectives</label>
            <textarea
              className={styles.textarea}
              rows={3}
              placeholder="Detailed objectives of the capacity building programme..."
              value={form.description}
              onChange={setField('description')}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Syllabus Outline (One per line)</label>
            <textarea
              className={styles.textarea}
              rows={4}
              value={form.syllabus}
              onChange={setField('syllabus')}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
            <Link
              to="/trainer/programmes"
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
              disabled={submitting}
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
              {submitting ? 'Creating Programme...' : 'Publish Programme'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
