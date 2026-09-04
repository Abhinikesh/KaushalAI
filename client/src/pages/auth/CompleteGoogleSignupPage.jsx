import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import styles from '../../styles/AuthPage.module.css'

/**
 * CompleteGoogleSignupPage
 *
 * Shown when a first-time Google user has passed Google verification but
 * still needs to provide their Employee ID for officer roster verification.
 * The email and name are prefilled from the Google token (read-only).
 * The idToken is forwarded to the /google/complete backend endpoint which
 * re-verifies it server-side — the frontend never trusts its own state.
 */
export default function CompleteGoogleSignupPage() {
  const location = useLocation()
  const navigate  = useNavigate()

  const { prefillEmail = '', prefillName = '', idToken = '' } = location.state ?? {}

  const [employeeId, setEmployeeId]   = useState('')
  const [role, setRole]               = useState('employee')
  const [experienceYears, setExpYears] = useState('')
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)

  const googleComplete = useAuthStore((s) => s.googleComplete)

  // If someone lands here without state (direct URL), redirect to signup
  if (!idToken) {
    navigate('/signup', { replace: true })
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!employeeId.trim()) { setError('Employee ID is required.'); return }
    setError(''); setLoading(true)
    try {
      await googleComplete({
        idToken,
        employeeId: employeeId.trim(),
        role,
        experienceYears: Number(experienceYears) || 0,
      })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message
        ?? err.message
        ?? 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* Brand panel */}
      <div className={styles.brand}>
        <div className={styles.brandInner}>
          <div className={styles.logoRow}>
            <div className={styles.logoMark}>K</div>
            <div>
              <div className={styles.logoName}>KaushalAI</div>
              <div className={styles.logoSub}>iGOT Karmayogi · MOSPI</div>
            </div>
          </div>
          <h1 className={styles.tagline}>
            One last step,<br />
            <span className={styles.taglineAccent}>verify your identity.</span>
          </h1>
          <p className={styles.taglineBody}>
            Google verified your email. Now confirm your Employee ID against the
            registered officer roster so your department and role are pulled
            automatically — no manual entry needed.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className={styles.formPanel}>
        <div className={styles.formWrap} style={{ maxWidth: 460 }}>
          <h2 className={styles.heading}>Complete your profile</h2>
          <p className={styles.subheading}>
            Signed in as <strong style={{ color: 'var(--color-text-primary)' }}>{prefillEmail}</strong>
          </p>

          {error && <div className={styles.errorBox}>{error}</div>}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {/* Prefilled — read-only */}
            <div className={styles.field}>
              <label className={styles.label}>Full name (from Google)</label>
              <input
                type="text" className={styles.input}
                value={prefillName} readOnly
                style={{ opacity: 0.65, cursor: 'not-allowed' }}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Email (from Google)</label>
              <input
                type="email" className={styles.input}
                value={prefillEmail} readOnly
                style={{ opacity: 0.65, cursor: 'not-allowed' }}
              />
            </div>

            {/* Employee ID — the roster gate */}
            <div className={styles.field}>
              <label htmlFor="cg-emp" className={styles.label}>Employee ID *</label>
              <input
                id="cg-emp" type="text" className={styles.input}
                placeholder="e.g. MOSPI-2024-001"
                value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
                required autoFocus
              />
              <div className={styles.infoBox}>
                Your Employee ID must exist in the pre-registered officer roster.
                Your <strong>department</strong> and <strong>job role</strong> will be
                auto-populated from the roster — you don&apos;t need to enter them.
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="cg-role" className={styles.label}>I am a</label>
                <select id="cg-role" className={styles.select} value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="employee">Employee</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="cg-exp" className={styles.label}>Years of experience</label>
                <input
                  id="cg-exp" type="number" className={styles.input} min={0} max={50}
                  placeholder="5"
                  value={experienceYears} onChange={(e) => setExpYears(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading && <span className={styles.spinner} />}
              {loading ? 'Verifying & creating account…' : 'Create account'}
            </button>
          </form>

          <p className={styles.footer}>
            Wrong Google account?{' '}
            <button
              type="button"
              onClick={() => navigate('/signup')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary-600)', fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)' }}
            >
              Go back
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
