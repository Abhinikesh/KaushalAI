import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { getMe, updateProfile } from '../../api/auth.api'
import Badge from '../../components/ui/Badge'
import styles from './MyProfilePage.module.css'

export default function MyProfilePage() {
  const { user: authUser, setAuth, accessToken } = useAuthStore()
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
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
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
          jobRoleTitle: u.jobRoleId?.title || 'Not assigned',
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
            jobRoleTitle: authUser.jobRoleId?.title || 'Not assigned',
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

  const setField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    setSuccess('')
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

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
      setSuccess('Profile updated successfully.')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const initials = (form.name || 'User')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Profile</h1>
          <p className={styles.subtitle}>
            Manage your personal details, designation, and official profile
          </p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.profileMeta}>
            <div className={styles.name}>{form.name || 'Loading...'}</div>
            <div className={styles.email}>{form.email}</div>
            <div className={styles.badgeRow}>
              <Badge variant="igot">{form.role}</Badge>
              {form.department && <Badge variant="neutral">{form.department}</Badge>}
            </div>
          </div>
        </div>

        {success && <div className={styles.successAlert}>✓ {success}</div>}
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
              <label className={styles.label}>Email Address (Read Only)</label>
              <input
                type="email"
                className={styles.input}
                value={form.email}
                disabled
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Employee ID (Roster Verified)</label>
              <input
                type="text"
                className={styles.input}
                value={form.employeeId}
                disabled
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Assigned Job Role</label>
              <input
                type="text"
                className={styles.input}
                value={form.jobRoleTitle}
                disabled
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Designation</label>
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
              <label className={styles.label}>Department</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. MOSPI / NSSO"
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
              <label className={styles.label}>Qualifications</label>
              <textarea
                className={styles.textarea}
                placeholder="e.g. M.Sc. Statistics, PG Diploma in Data Analytics (comma-separated)"
                value={form.qualifications}
                onChange={setField('qualifications')}
                disabled={loading}
              />
              <span className={styles.hint}>Separate multiple degrees or certifications with commas</span>
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
