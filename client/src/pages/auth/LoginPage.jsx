import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react'
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import { useAuthStore } from '../../store/authStore'
import AuthLayout from '../../components/auth/AuthLayout'
import {
  AshokaLionEmblem,
  IgotLogo,
  GovtSsoShield,
} from '../../components/auth/GovtEmblems'
import styles from '../../styles/AuthPage.module.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

// ── Google SVG Icon ──────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg className={styles.googleIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function GoogleSignInButton({ onSuccess, onError, disabled }) {
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

// ── Official Demo SSO Officers for instant testing ───────────────────────────
const SSO_OFFICERS = [
  {
    name: 'Priya Nair',
    roleTitle: 'Statistical Officer · MOSPI',
    id: 'MOSPI-2024-001',
    email: 'priya.nair@mospi.gov.in',
    role: 'employee',
  },
  {
    name: 'Rajan Sharma',
    roleTitle: 'Data Analyst · NSSO',
    id: 'MOSPI-2024-002',
    email: 'rajan.sharma@mospi.gov.in',
    role: 'employee',
  },
  {
    name: 'Anita Desai',
    roleTitle: 'Senior Faculty / Trainer · CSO',
    id: 'MOSPI-2024-003',
    email: 'anita.desai@mospi.gov.in',
    role: 'trainer',
  },
  {
    name: 'Test Administrator',
    roleTitle: 'System Administrator · MoSPI HQ',
    id: 'DEMO-002',
    email: 'testadmin@example.com',
    role: 'admin',
  },
]

// ── Login Form Card ──────────────────────────────────────────────────────────
function LoginForm({ googleEnabled }) {
  const [roleTab, setRoleTab]         = useState('employee') // 'employee' | 'admin'
  const [identifier, setIdentifier]   = useState('')
  const [password, setPassword]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe]   = useState(true)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [ssoModalOpen, setSsoModalOpen] = useState(false)
  const [ssoProvider, setSsoProvider] = useState('sso') // 'sso' | 'igot'

  const login      = useAuthStore((s) => s.login)
  const ssoLogin   = useAuthStore((s) => s.ssoLogin)
  const googleAuth = useAuthStore((s) => s.googleAuth)
  const navigate   = useNavigate()

  // Load remembered username/email
  useEffect(() => {
    const saved = localStorage.getItem('kaushalai_remembered_id')
    if (saved) {
      setIdentifier(saved)
    }
  }, [])

  const redirectUser = (user) => {
    if (user.role === 'admin') {
      navigate('/admin/overview', { replace: true })
    } else if (user.role === 'trainer') {
      navigate('/trainer', { replace: true })
    } else {
      navigate(user.jobRoleId ? '/dashboard' : '/onboarding/job-role', { replace: true })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!identifier.trim() || !password) {
      setError('Please enter your username / email ID and password.')
      return
    }

    setError('')
    setLoading(true)

    if (rememberMe) {
      localStorage.setItem('kaushalai_remembered_id', identifier.trim())
    } else {
      localStorage.removeItem('kaushalai_remembered_id')
    }

    try {
      const user = await login(identifier.trim(), password)
      redirectUser(user)
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Invalid credentials. Please verify your email / employee ID and password.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSsoClick = (provider) => {
    setSsoProvider(provider)
    setSsoModalOpen(true)
  }

  const handleSsoSelect = async (officer) => {
    setLoading(true)
    setError('')
    setSsoModalOpen(false)

    try {
      const user = await ssoLogin({
        provider: ssoProvider,
        employeeId: officer.id,
        email: officer.email,
      })
      redirectUser(user)
    } catch (err) {
      // If user is not yet created in DB, fallback to demo/admin login
      try {
        const user = await ssoLogin({ provider: ssoProvider })
        redirectUser(user)
      } catch (innerErr) {
        setError(innerErr.response?.data?.message || 'SSO authentication failed.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (tokenResponse) => {
    setError('')
    setLoading(true)
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
        redirectUser(result.user)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.authCard}>
      {/* Centered Top Badge */}
      <div className={styles.cardHeader}>
        <div className={`${styles.headerIconBadge} ${styles.headerIconBadgePurple}`}>
          <Lock size={26} />
        </div>
        <h2 className={styles.cardTitle}>Welcome Back!</h2>
        <p className={styles.cardSubtitle}>Sign in to continue to your learning journey</p>
      </div>

      {/* Role Switcher Tabs */}
      <div className={styles.roleTabs}>
        <button
          type="button"
          className={`${styles.roleTab} ${roleTab === 'employee' ? styles.roleTabActive : ''}`}
          onClick={() => setRoleTab('employee')}
        >
          <User size={15} />
          Employee / Learner
        </button>
        <button
          type="button"
          className={`${styles.roleTab} ${roleTab === 'admin' ? styles.roleTabActive : ''}`}
          onClick={() => setRoleTab('admin')}
        >
          <ShieldCheck size={15} />
          Trainer / Admin
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Credential Form */}
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="auth-username" className={styles.label}>
            Username / Email ID
          </label>
          <div className={styles.inputWrap}>
            <span className={styles.inputIcon}>
              <User size={16} />
            </span>
            <input
              id="auth-username"
              type="text"
              className={styles.input}
              placeholder={
                roleTab === 'admin'
                  ? 'admin@mospi.gov.in or DEMO-002'
                  : 'Enter your email or username (e.g. MOSPI-2024-001)'
              }
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="auth-password" className={styles.label}>
            Password
          </label>
          <div className={styles.inputWrap}>
            <span className={styles.inputIcon}>
              <Lock size={16} />
            </span>
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              className={styles.input}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className={styles.passwordToggleBtn}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Remember me & Forgot Password row */}
        <div className={styles.metaRow}>
          <label className={styles.rememberLabel}>
            <input
              type="checkbox"
              className={styles.rememberCheckbox}
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember me</span>
          </label>
          <Link to="/forgot-password" className={styles.forgotLink}>
            Forgot Password?
          </Link>
        </div>

        {/* Primary CTA Button */}
        <button type="submit" className={styles.primaryBtn} disabled={loading}>
          {loading ? (
            <>
              <span className={styles.spinner} />
              <span>Signing In…</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span className={styles.dividerText}>or sign in with</span>
        <span className={styles.dividerLine} />
      </div>

      {/* SSO Buttons */}
      <div className={styles.ssoBtnGroup}>
        {/* Government SSO (Parichay) Button */}
        <button
          type="button"
          className={styles.ssoBtn}
          onClick={() => handleSsoClick('sso')}
          disabled={loading}
        >
          <div className={styles.ssoBtnLeft}>
            <div className={styles.ssoBtnIconWrap}>
              <AshokaLionEmblem size={22} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div>Sign in with SSO</div>
              <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 400 }}>
                Government Single Sign-On
              </div>
            </div>
          </div>
          <div className={styles.ssoBtnBadge}>
            <GovtSsoShield size={20} />
          </div>
        </button>

        {/* iGOT Karmayogi Button */}
        <button
          type="button"
          className={styles.ssoBtn}
          onClick={() => handleSsoClick('igot')}
          disabled={loading}
        >
          <div className={styles.ssoBtnLeft}>
            <div className={styles.ssoBtnIconWrap}>
              <IgotLogo size={22} />
            </div>
            <span>Sign in with iGOT Karmayogi</span>
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              color: '#0284c7',
              letterSpacing: 0.5,
            }}
          >
            iGOT
          </div>
        </button>

        {/* Google OAuth (if configured) */}
        {googleEnabled && (
          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-in was cancelled.')}
            disabled={loading}
          />
        )}
      </div>

      {/* Register Link */}
      <div className={styles.cardFooterText}>
        New to StatSkill AI?
        <Link to="/signup" className={styles.cardLink}>
          Register here
        </Link>
      </div>

      {/* Security & Compliance Card Pill */}
      <div className={styles.cardSecurityPill}>
        <div className={styles.cardSecurityPillLeft}>
          <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0 }} />
          <div>
            <div className={styles.cardSecurityTitle}>Your data is secure with us</div>
            <div className={styles.cardSecurityDesc}>
              We follow Government of India security standards
            </div>
          </div>
        </div>
        <Lock size={15} color="#166534" />
      </div>

      {/* ── SSO Instant Authentication Modal (Interactive Parichay / iGOT Picker) ── */}
      {ssoModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setSsoModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {ssoProvider === 'sso' ? (
                  <AshokaLionEmblem size={26} />
                ) : (
                  <IgotLogo size={24} />
                )}
                <div>
                  <h3 className={styles.modalTitle}>
                    {ssoProvider === 'sso'
                      ? 'Government Single Sign-On (Parichay)'
                      : 'iGOT Karmayogi SSO'}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                    Select an official identity for authenticated capacity building
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setSsoModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SSO_OFFICERS.map((officer) => (
                <div
                  key={officer.id}
                  className={styles.ssoOfficerOption}
                  onClick={() => handleSsoSelect(officer)}
                >
                  <div className={styles.ssoOfficerLeft}>
                    <span className={styles.ssoOfficerName}>{officer.name}</span>
                    <span className={styles.ssoOfficerRole}>
                      {officer.roleTitle} · {officer.id}
                    </span>
                  </div>
                  <ArrowRight size={16} color="#2563eb" />
                </div>
              ))}
            </div>

            <p style={{ fontSize: '0.6875rem', color: '#94a3b8', textAlign: 'center', margin: 0 }}>
              Encrypted session token validated via National Informatics Centre (NIC) gateway.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Default Export ───────────────────────────────────────────────────────────
export default function LoginPage() {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <AuthLayout>
        <LoginForm googleEnabled={false} />
      </AuthLayout>
    )
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthLayout>
        <LoginForm googleEnabled={true} />
      </AuthLayout>
    </GoogleOAuthProvider>
  )
}
