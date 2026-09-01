import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import styles from '../styles/Auth.module.css'

const DEPARTMENTS = ['MOSPI', 'CSO', 'NSSO', 'RGI', 'NIC', 'Other']

export default function Signup() {
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    role: 'employee', designation: '', department: 'MOSPI', experienceYears: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const signup = useAuthStore((s) => s.signup)
  const navigate = useNavigate()

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signup({ ...form, experienceYears: Number(form.experienceYears) || 0 })
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card} style={{ maxWidth: 520 }}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>K</div>
          <div>
            <div className={styles.brandName}>KaushalAI</div>
            <div className={styles.brandSub}>iGOT Karmayogi · OSS Platform</div>
          </div>
        </div>

        <h1 className={styles.heading}>Create account</h1>
        <p className={styles.subheading}>Join the Skill Intelligence Platform</p>

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="name">Full name</label>
              <input id="name" type="text" className={styles.input}
                placeholder="Priya Nair" value={form.name} onChange={set('name')} required />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="role">Role</label>
              <select id="role" className={styles.select} value={form.role} onChange={set('role')}>
                <option value="employee">Employee</option>
                <option value="trainer">Trainer</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="su-email">Email address</label>
            <input id="su-email" type="email" className={styles.input}
              placeholder="you@gov.in" value={form.email} onChange={set('email')} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="su-password">Password</label>
            <input id="su-password" type="password" className={styles.input}
              placeholder="Min 8 characters" value={form.password} onChange={set('password')} required />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="designation">Designation</label>
              <input id="designation" type="text" className={styles.input}
                placeholder="Statistical Officer" value={form.designation} onChange={set('designation')} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="department">Department</label>
              <select id="department" className={styles.select} value={form.department} onChange={set('department')}>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="exp">Years of experience</label>
            <input id="exp" type="number" className={styles.input} min={0} max={50}
              placeholder="5" value={form.experienceYears} onChange={set('experienceYears')} />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" className={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
