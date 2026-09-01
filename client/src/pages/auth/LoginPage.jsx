import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import styles from '../../styles/AuthPage.module.css'

const BRAND_FEATURES = [
  { icon: '🧠', label: 'AI-powered gap analysis', body: 'Understand exactly where you stand against your role requirements.' },
  { icon: '📖', label: 'Smart recommendations', body: 'Courses from iGOT Karmayogi and NSSTA, ranked by your actual skill gaps.' },
  { icon: '✏️', label: 'MCQ assessments', body: 'Grounded in your training material — not generic trivia.' },
]

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const login    = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setError(''); setLoading(true)
    try {
      const user = await login(email, password)
      navigate(user.jobRoleId ? '/dashboard' : '/onboarding/job-role', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message ?? 'Login failed. Check your credentials and try again.')
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
            Skill Intelligence<br />
            <span className={styles.taglineAccent}>for every officer.</span>
          </h1>
          <p className={styles.taglineBody}>
            Close the gap between where you are and where your role needs you to be — with AI that explains itself.
          </p>
          <div className={styles.features}>
            {BRAND_FEATURES.map((f) => (
              <div key={f.label} className={styles.feature}>
                <span className={styles.featureIcon}>{f.icon}</span>
                <p className={styles.featureText}>
                  <span className={styles.featureLabel}>{f.label} — </span>
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className={styles.formPanel}>
        <div className={styles.formWrap}>
          <h2 className={styles.heading}>Welcome back</h2>
          <p className={styles.subheading}>Sign in to your account to continue</p>

          {error && <div className={styles.errorBox}>{error}</div>}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>Email address</label>
              <input
                id="email" type="email" className={styles.input}
                placeholder="you@gov.in" value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <input
                id="password" type="password" className={styles.input}
                placeholder="••••••••" value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" required
              />
            </div>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading && <span className={styles.spinner} />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className={styles.footer}>
            New to KaushalAI?{' '}
            <Link to="/signup" className={styles.link}>Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
