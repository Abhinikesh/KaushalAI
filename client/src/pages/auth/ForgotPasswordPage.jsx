import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import styles from '../../styles/AuthPage.module.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 1000)
  }

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <div className={styles.emblem}>🏛️</div>
          <h1 className={styles.title}>Account Recovery</h1>
          <p className={styles.subtitle}>
            Enter your official government email to receive password reset instructions
          </p>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ padding: 'var(--space-4)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-lg)', color: '#065f46', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
              ✉️ If an authorized account matches <strong>{email}</strong>, a secure password recovery link has been dispatched via the NIC Government Mail Gateway.
            </div>
            <Link to="/login" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', textDecoration: 'none', fontWeight: 600 }}>
              ← Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>Official Email Address</label>
              <input
                id="email"
                type="email"
                required
                className={styles.input}
                placeholder="officer@mospi.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button type="submit" loading={loading} className={styles.submitBtn}>
              Send Recovery Link
            </Button>

            <div style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
              <Link to="/login" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
                Remember your password? <strong style={{ color: 'var(--color-primary-600)' }}>Sign In</strong>
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
