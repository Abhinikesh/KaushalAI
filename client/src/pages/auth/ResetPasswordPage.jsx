import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Lock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import styles from '../../styles/AuthPage.module.css'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    }, 1000)
  }

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <div className={styles.emblem}>
            <Lock size={28} color="var(--color-primary-600)" />
          </div>
          <h1 className={styles.title}>Set New Password</h1>
          <p className={styles.subtitle}>
            Enter your new secure password conforming to NIC security policies
          </p>
        </div>

        {error && (
          <div style={{ padding: 'var(--space-3)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-lg)', color: 'var(--color-error)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ padding: 'var(--space-4)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-lg)', color: '#065f46', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <CheckCircle2 size={16} color="var(--color-success)" />
              <span>Password successfully updated! Redirecting to login...</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>New Password</label>
              <input
                id="password"
                type="password"
                required
                className={styles.input}
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="confirmPassword" className={styles.label}>Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                required
                className={styles.input}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button type="submit" loading={loading} className={styles.submitBtn}>
              Update Password
            </Button>

            <div style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
              <Link to="/login" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
                Cancel and <strong style={{ color: 'var(--color-primary-600)' }}>Sign In</strong>
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
