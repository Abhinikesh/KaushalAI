import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import { useAuthStore } from '../../store/authStore'
import styles from '../../styles/AuthPage.module.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

// ── Google SVG icon ───────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg className={styles.googleIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

// ── Google button — only mounted inside GoogleOAuthProvider ───────────────────
// useGoogleLogin hook is isolated here so it NEVER runs outside a provider.
function GoogleSignUpButton({ onSuccess, onError, disabled }) {
  const handleGoogle = useGoogleLogin({ onSuccess, onError, flow: 'implicit' })
  return (
    <button
      type="button"
      className={styles.googleBtn}
      onClick={() => handleGoogle()}
      disabled={disabled}
    >
      <GoogleIcon />
      Continue with Google
    </button>
  )
}

// ── Signup form ───────────────────────────────────────────────────────────────
function SignupForm({ googleEnabled, loading, setLoading, error, setError }) {
  const [form, setForm] = useState({
    employeeId: '', name: '', email: '', password: '',
    role: 'employee', experienceYears: '',
  })

  const signup     = useAuthStore((s) => s.signup)
  const googleAuth = useAuthStore((s) => s.googleAuth)
  const navigate   = useNavigate()

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    if (!form.employeeId.trim()) return 'Employee ID is required.'
    if (!form.name.trim())       return 'Full name is required.'
    if (!form.email.trim())      return 'Email address is required.'
    if (!form.password)          return 'Password is required.'
    if (form.password.length < 8) return 'Password must be at least 8 characters.'
    if (!/[0-9]/.test(form.password)) return 'Password must contain at least one number.'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setError(''); setLoading(true)
    try {
      await signup({ ...form, experienceYears: Number(form.experienceYears) || 0 })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message
        ?? err.response?.data?.details?.[0]?.message
        ?? err.message
        ?? 'Something went wrong. Please contact support.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (tokenResponse) => {
    setError(''); setLoading(true)
    try {
      const result = await googleAuth(tokenResponse.access_token)
      if (result?.requiresCompletion) {
        navigate('/auth/google/complete', {
          state: {
            prefillEmail: result.prefillEmail,
            prefillName:  result.prefillName,
            idToken:      tokenResponse.access_token,
          },
        })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err.response?.data?.message ?? 'Google sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.formWrap} style={{ maxWidth: 480 }}>
      <h2 className={styles.heading}>Create account</h2>
      <p className={styles.subheading}>Join the Skill Intelligence Platform</p>

      {error && <div className={styles.errorBox}>{error}</div>}

      {googleEnabled && (
        <>
          <GoogleSignUpButton
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-in was cancelled. Please try again.')}
            disabled={loading}
          />
          <div className={styles.divider}>
            <span className={styles.dividerLine} />
            <span className={styles.dividerText}>or sign up with email</span>
            <span className={styles.dividerLine} />
          </div>
        </>
      )}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="su-empid" className={styles.label}>Employee ID *</label>
          <input
            id="su-empid" type="text" className={styles.input}
            placeholder="e.g. MOSPI-2024-001 or DEMO-001"
            value={form.employeeId} onChange={set('employeeId')} required
          />
          <div className={styles.infoBox}>
            Must match the pre-registered officer roster. Your department &amp; job role
            are auto-populated — contact your admin if you haven&apos;t been added.
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="su-name" className={styles.label}>Full name *</label>
            <input id="su-name" type="text" className={styles.input}
              placeholder="Priya Nair" value={form.name} onChange={set('name')} required />
          </div>
          <div className={styles.field}>
            <label htmlFor="su-role" className={styles.label}>I am a</label>
            <select id="su-role" className={styles.select} value={form.role} onChange={set('role')}>
              <option value="employee">Employee</option>
              <option value="trainer">Trainer</option>
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="su-email" className={styles.label}>Email address *</label>
          <input id="su-email" type="email" className={styles.input}
            placeholder="you@example.com" value={form.email} onChange={set('email')}
            required autoComplete="email" />
        </div>

        <div className={styles.field}>
          <label htmlFor="su-password" className={styles.label}>Password *</label>
          <input id="su-password" type="password" className={styles.input}
            placeholder="Min 8 chars, must include a number"
            value={form.password} onChange={set('password')}
            required autoComplete="new-password" />
        </div>

        <div className={styles.field}>
          <label htmlFor="su-exp" className={styles.label}>Years of experience</label>
          <input id="su-exp" type="number" className={styles.input} min={0} max={50}
            placeholder="5" value={form.experienceYears} onChange={set('experienceYears')} />
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading && <span className={styles.spinner} />}
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className={styles.footer}>
        Already have an account?{' '}
        <Link to="/login" className={styles.link}>Sign in</Link>
      </p>
    </div>
  )
}

// ── Default export ────────────────────────────────────────────────────────────
export default function SignupPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const formProps = { loading, setLoading, error, setError }

  const layout = (children) => (
    <div className={styles.page}>
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
            Your growth,<br />
            <span className={styles.taglineAccent}>measured and guided.</span>
          </h1>
          <p className={styles.taglineBody}>
            Join government officers building a continuous, data-driven skill profile on the national capacity-building platform.
          </p>
        </div>
      </div>
      <div className={styles.formPanel}>{children}</div>
    </div>
  )

  if (!GOOGLE_CLIENT_ID) {
    return layout(<SignupForm {...formProps} googleEnabled={false} />)
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {layout(<SignupForm {...formProps} googleEnabled={true} />)}
    </GoogleOAuthProvider>
  )
}
