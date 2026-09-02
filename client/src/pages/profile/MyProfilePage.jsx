import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { getMe } from '../../api/auth.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import styles from './MyProfilePage.module.css'

export default function MyProfilePage() {
  const { user: authUser } = useAuthStore()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    getMe()
      .then((data) => {
        if (!mounted) return
        setProfile(data.user || authUser)
      })
      .catch(() => {
        if (!mounted) return
        setProfile(authUser)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [authUser])

  const user = profile || authUser
  const initials = (user?.name || 'User')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton.Card />
      </div>
    )
  }

  const qualifications = Array.isArray(user?.qualifications)
    ? user.qualifications
    : typeof user?.qualifications === 'string'
    ? user.qualifications.split(',').map((s) => s.trim())
    : []

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Profile</h1>
          <p className={styles.subtitle}>
            Personal credentials and official roster verification
          </p>
        </div>
        <Link
          to="/profile/edit"
          style={{
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--color-primary-600)',
            color: 'white',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ✏️ Edit Profile
        </Link>
      </div>

      <div className={styles.card}>
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.profileMeta}>
            <div className={styles.name}>{user?.name}</div>
            <div className={styles.email}>{user?.email}</div>
            <div className={styles.badgeRow}>
              <Badge variant="igot">{user?.role || 'employee'}</Badge>
              {user?.department && <Badge variant="neutral">{user.department}</Badge>}
              <Badge variant="success">Roster Verified</Badge>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <div style={{ background: 'var(--color-surface-alt)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Employee ID</span>
            <div style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 2 }}>
              {user?.employeeId || 'Not assigned'}
            </div>
          </div>

          <div style={{ background: 'var(--color-surface-alt)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Designation</span>
            <div style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 2 }}>
              {user?.designation || 'Statistical Officer'}
            </div>
          </div>

          <div style={{ background: 'var(--color-surface-alt)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Assigned Job Role</span>
            <div style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 2 }}>
              {user?.jobRoleId?.title || 'Statistical Assistant'}
            </div>
          </div>

          <div style={{ background: 'var(--color-surface-alt)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Experience</span>
            <div style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 2 }}>
              {user?.experienceYears || 5} Years
            </div>
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-6)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-5)' }}>
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-3)' }}>
            Academic &amp; Professional Qualifications
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {qualifications.length > 0 ? (
              qualifications.map((q, i) => (
                <span
                  key={i}
                  style={{
                    background: 'var(--color-surface-alt)',
                    border: '1px solid var(--color-border)',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  🎓 {q}
                </span>
              ))
            ) : (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                No qualifications listed yet. Click "Edit Profile" to add them.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
