import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Target } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { getJobRoles, setJobRole } from '../../api/competency.api'
import Button from '../../components/ui/Button'
import Skeleton from '../../components/ui/Skeleton'
import styles from './SetJobRolePage.module.css'

export default function SetJobRolePage() {
  const [jobRoles, setJobRoles]       = useState([])
  const [selected, setSelected]       = useState('')
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  const { user, setAuth, accessToken } = useAuthStore()
  const navigate                       = useNavigate()

  useEffect(() => {
    getJobRoles()
      .then((d) => setJobRoles(d.jobRoles ?? []))
      .catch(() => setError('Failed to load job roles. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!selected) { setError('Please select a job role to continue.'); return }
    setError(''); setSaving(true)
    try {
      const result = await setJobRole(selected)
      // Update store with patched user (now has jobRoleId)
      setAuth(result.user, accessToken)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not save job role. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>
          <Target size={32} color="var(--color-primary-600)" />
        </div>
        <h1 className={styles.heading}>Official Cadre Designation</h1>
        <p className={styles.body}>
          Select your official MOSPI or State DES designation to map required competency benchmarks and build your personalized capacity plan.
          You can update this anytime from your profile.
        </p>

        {error && <div className={styles.errorBox}>{error}</div>}

        {loading ? (
          <div className={styles.skeletonList}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height="52px" />
            ))}
          </div>
        ) : (
          <div className={styles.roleList} role="listbox" aria-label="Select your job role">
            {jobRoles.map((role) => (
              <button
                key={role._id}
                role="option"
                aria-selected={selected === role._id}
                className={[styles.roleOption, selected === role._id ? styles.roleSelected : ''].join(' ')}
                onClick={() => setSelected(role._id)}
              >
                <div className={styles.roleTitle}>{role.title}</div>
                {role.department && <div className={styles.roleDept}>{role.department}</div>}
              </button>
            ))}
          </div>
        )}

        <Button
          variant="primary" size="lg" fullWidth
          onClick={handleSave} loading={saving}
          disabled={!selected || loading}
          style={{ marginTop: 'var(--space-6)' }}
        >
          Continue to Dashboard
        </Button>
      </div>
    </div>
  )
}
