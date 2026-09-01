import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import styles from '../../styles/AuthPage.module.css'

const DEPARTMENTS = ['MOSPI', 'CSO', 'NSSO', 'RGI', 'NIC', 'DGS&T', 'Other']

export default function SignupPage() {
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    role: 'employee', designation: '', department: 'MOSPI', experienceYears: '',
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const signup   = useAuthStore((s) => s.signup)
  const navigate = useNavigate()

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    if (!form.name.trim())     return 'Full name is required.'
    if (!form.email.trim())    return 'Email is required.'
    if (!form.password)        return 'Password is required.'
    if (form.password.length < 8) return 'Password must be at least 8 characters.'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setError(''); setLoading(true)
    try {
      await signup({ ...form, experienceYears: Number(form.experienceYears) || 0 })
      navigate('/onboarding/job-role', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message ?? 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
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
            Join thousands of government officers building a continuous, data-driven skill profile on the national capacity-building platform.
          </p>
        </div>
      </div>

      <div className={styles.formPanel}>
        <div className={styles.formWrap} style={{ maxWidth: 480 }}>
          <h2 className={styles.heading}>Create account</h2>
          <p className={styles.subheading}>Join the Skill Intelligence Platform</p>

          {error && <div className={styles.errorBox}>{error}</div>}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="name" className={styles.label}>Full name</label>
                <input id="name" type="text" className={styles.input}
                  placeholder="Priya Nair" value={form.name} onChange={set('name')} required />
              </div>
              <div className={styles.field}>
                <label htmlFor="role" className={styles.label}>I am a</label>
                <select id="role" className={styles.select} value={form.role} onChange={set('role')}>
                  <option value="employee">Employee</option>
                  <option value="trainer">Trainer</option>
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="su-email" className={styles.label}>Email address</label>
              <input id="su-email" type="email" className={styles.input}
                placeholder="you@gov.in" value={form.email} onChange={set('email')} required autoComplete="email" />
            </div>

            <div className={styles.field}>
              <label htmlFor="su-password" className={styles.label}>Password</label>
              <input id="su-password" type="password" className={styles.input}
                placeholder="Min 8 characters" value={form.password} onChange={set('password')} required autoComplete="new-password" />
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="designation" className={styles.label}>Designation</label>
                <input id="designation" type="text" className={styles.input}
                  placeholder="Statistical Officer" value={form.designation} onChange={set('designation')} />
              </div>
              <div className={styles.field}>
                <label htmlFor="department" className={styles.label}>Department</label>
                <select id="department" className={styles.select} value={form.department} onChange={set('department')}>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="exp" className={styles.label}>Years of experience</label>
              <input id="exp" type="number" className={styles.input} min={0} max={50}
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
      </div>
    </div>
  )
}
