import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { getMe, updateProfile } from '../../api/auth.api'
import styles from './MyProfilePage.module.css'

export default function EditProfilePage() {
  const { user: authUser, setAuth, accessToken } = useAuthStore()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    email: '',
    employeeId: '',
    designation: '',
    department: '',
    role: '',
    jobRoleTitle: '',
    experienceYears: 0,
    qualifications: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    getMe()
      .then((data) => {
        if (!mounted) return
        const u = data.user || authUser
        setForm({
          name: u.name || '',
          email: u.email || '',
          employeeId: u.employeeId || 'Not registered',
          designation: u.designation || '',
          department: u.department || '',
          role: u.role || 'employee',
          jobRoleTitle: u.jobRoleId?.title || 'Statistical Assistant',
          experienceYears: u.experienceYears || 0,
          qualifications: Array.isArray(u.qualifications) ? u.qualifications.join(', ') : '',
        })
      })
      .catch(() => {
        if (!mounted) return
        if (authUser) {
          setForm({
            name: authUser.name || '',
            email: authUser.email || '',
            employeeId: authUser.employeeId || 'Not registered',
            designation: authUser.designation || '',
            department: authUser.department || '',
            role: authUser.role || 'employee',
            jobRoleTitle: authUser.jobRoleId?.title || 'Statistical Assistant',
            experienceYears: authUser.experienceYears || 0,
            qualifications: Array.isArray(authUser.qualifications) ? authUser.qualifications.join(', ') : '',
          })
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [authUser])

  const setField = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        designation: form.designation.trim(),
        department: form.department.trim(),
        experienceYears: Number(form.experienceYears) || 0,
        qualifications: form.qualifications
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }
      const res = await updateProfile(payload)
      if (res?.user) {
        setAuth(res.user, accessToken)
      }
      navigate('/profile')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Edit Profile</h1>
          <p className={styles.subtitle}>
            Update your official designations, experience, and academic qualifications
          </p>
        </div>
        <Link
          to="/profile"
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
          }}
        >
          ← Cancel
        </Link>
      </div>

      <div className={styles.card}>
        {error && <div className={styles.errorAlert}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Full Name</label>
              <input
                type="text"
                className={styles.input}
                value={form.name}
                onChange={setField('name')}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Official Email (Read-only)</label>
              <input type="email" className={styles.input} value={form.email} disabled />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Employee ID (Read-only)</label>
              <input type="text" className={styles.input} value={form.employeeId} disabled />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Assigned Role Title (Read-only)</label>
              <input type="text" className={styles.input} value={form.jobRoleTitle} disabled />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Official Designation</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. Statistical Officer"
                value={form.designation}
                onChange={setField('designation')}
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Department / Division</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. National Statistical Systems Training Academy (NSSTA)"
                value={form.department}
                onChange={setField('department')}
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Years of Experience</label>
              <input
                type="number"
                min="0"
                max="50"
                className={styles.input}
                value={form.experienceYears}
                onChange={setField('experienceYears')}
                disabled={loading}
              />
            </div>

            <div className={styles.fieldFull}>
              <label className={styles.label}>Qualifications (Comma-separated)</label>
              <textarea
                className={styles.textarea}
                placeholder="e.g. M.Sc. Statistics, PG Diploma in Big Data, NSSTA Advanced Certificate"
                value={form.qualifications}
                onChange={setField('qualifications')}
                disabled={loading}
              />
              <span className={styles.hint}>Separate certifications and degrees with commas</span>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.submitBtn} disabled={saving || loading}>
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
