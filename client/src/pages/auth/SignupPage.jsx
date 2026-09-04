import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Mail,
  BadgeCheck,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Info,
  GraduationCap,
  X,
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

function GoogleSignUpButton({ onSuccess, onError, disabled }) {
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

// ── Official Roster Quick-Fill Samples for seamless evaluation ────────────────
const ROSTER_SAMPLES = [
  { id: 'MOSPI-2024-001', name: 'Priya Nair', email: 'priya.nair@mospi.gov.in', role: 'employee' },
  { id: 'MOSPI-2024-002', name: 'Rajan Sharma', email: 'rajan.sharma@mospi.gov.in', role: 'employee' },
  { id: 'MOSPI-2024-003', name: 'Anita Desai', email: 'anita.desai@mospi.gov.in', role: 'trainer' },
]

// ── Signup Form Card ─────────────────────────────────────────────────────────
function SignupForm({ googleEnabled }) {
  const [roleTab, setRoleTab] = useState('employee') // 'employee' | 'trainer'
  const [form, setForm] = useState({
    employeeId: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    experienceYears: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ssoModalOpen, setSsoModalOpen] = useState(false)
  const [ssoProvider, setSsoProvider] = useState('sso')

  const signup     = useAuthStore((s) => s.signup)
  const ssoLogin   = useAuthStore((s) => s.ssoLogin)
  const googleAuth = useAuthStore((s) => s.googleAuth)
  const navigate   = useNavigate()

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleFillSample = (sample) => {
    setForm({
      employeeId: sample.id,
      name: sample.name,
      email: sample.email,
      password: 'Password123',
      confirmPassword: 'Password123',
      experienceYears: '4',
    })
    setRoleTab(sample.role)
    setError('')
  }

  const validate = () => {
    if (!form.employeeId.trim()) return 'Employee ID is required.'
    if (!form.name.trim()) return 'Full name is required.'
    if (!form.email.trim()) return 'Official Email address is required.'
    if (!form.password) return 'Password is required.'
    if (form.password.length < 8) return 'Password must be at least 8 characters.'
    if (!/[0-9]/.test(form.password)) return 'Password must contain at least one number.'
    if (form.password !== form.confirmPassword) return 'Passwords do not match.'
    if (!termsAccepted) return 'Please confirm your authorization under MoSPI or State DES.'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setLoading(true)

    try {
      await signup({
        employeeId: form.employeeId.trim(),
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: roleTab,
        experienceYears: Number(form.experienceYears) || 0,
      })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.details?.[0]?.message ||
        'Registration failed. Please verify that your Employee ID and Name match the official roster.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSsoClick = (provider) => {
    setSsoProvider(provider)
    setSsoModalOpen(true)
  }

  const handleSsoSelect = async (sample) => {
    setLoading(true)
    setError('')
    setSsoModalOpen(false)

    try {
      const user = await ssoLogin({
        provider: ssoProvider,
        employeeId: sample.id,
        email: sample.email,
      })
      navigate(user.role === 'trainer' ? '/trainer' : '/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'SSO registration failed.')
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
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.authCard}>
      {/* Centered Top Badge */}
      <div className={styles.cardHeader}>
        <div className={`${styles.headerIconBadge} ${styles.headerIconBadgePurple}`}>
          <BadgeCheck size={26} />
        </div>
        <h2 className={styles.cardTitle}>Officer Registration</h2>
        <p className={styles.cardSubtitle}>
          Create your official profile on the national learning portal
        </p>
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
          className={`${styles.roleTab} ${roleTab === 'trainer' ? styles.roleTabActive : ''}`}
          onClick={() => setRoleTab('trainer')}
        >
          <GraduationCap size={15} />
          Trainer / Faculty
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Roster Notice & Quick Samples */}
      <div className={styles.rosterHint}>
        <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <span>Registration requires an authorized MoSPI/DES roster entry. </span>
          <span style={{ fontWeight: 600 }}>Quick fill: </span>
          {ROSTER_SAMPLES.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleFillSample(s)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#2563eb',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline',
                marginRight: 6,
              }}
            >
              {s.id} ({s.name}){idx < ROSTER_SAMPLES.length - 1 ? ',' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Form Fields */}
      <form className={styles.form} onSubmit={handleSubmit} noValidate style={{ marginTop: 14 }}>
        <div className={styles.field}>
          <label htmlFor="reg-empid" className={styles.label}>
            Employee ID *
          </label>
          <div className={styles.inputWrap}>
            <span className={styles.inputIcon}>
              <BadgeCheck size={16} />
            </span>
            <input
              id="reg-empid"
              type="text"
              className={styles.input}
              placeholder="e.g. MOSPI-2024-001"
              value={form.employeeId}
              onChange={set('employeeId')}
              required
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="reg-name" className={styles.label}>
            Full Name *
          </label>
          <div className={styles.inputWrap}>
            <span className={styles.inputIcon}>
              <User size={16} />
            </span>
            <input
              id="reg-name"
              type="text"
              className={styles.input}
              placeholder="e.g. Priya Nair"
              value={form.name}
              onChange={set('name')}
              required
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="reg-email" className={styles.label}>
            Official Email ID *
          </label>
          <div className={styles.inputWrap}>
            <span className={styles.inputIcon}>
              <Mail size={16} />
            </span>
            <input
              id="reg-email"
              type="email"
              className={styles.input}
              placeholder="priya.nair@mospi.gov.in"
              value={form.email}
              onChange={set('email')}
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="reg-password" className={styles.label}>
              Password *
            </label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>
                <Lock size={16} />
              </span>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                placeholder="Min 8 chars, 1 num"
                value={form.password}
                onChange={set('password')}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className={styles.passwordToggleBtn}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide' : 'Show'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="reg-confirm-password" className={styles.label}>
              Confirm Password *
            </label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>
                <Lock size={16} />
              </span>
              <input
                id="reg-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                className={styles.input}
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className={styles.passwordToggleBtn}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide' : 'Show'}
              >
                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="reg-exp" className={styles.label}>
            Years of Experience (Optional)
          </label>
          <div className={styles.inputWrap}>
            <span className={styles.inputIcon}>
              <Briefcase size={16} />
            </span>
            <input
              id="reg-exp"
              type="number"
              className={styles.input}
              placeholder="e.g. 5"
              min="0"
              max="50"
              value={form.experienceYears}
              onChange={set('experienceYears')}
            />
          </div>
        </div>

        {/* Declaration Checkbox */}
        <div style={{ marginTop: 2 }}>
          <label className={styles.rememberLabel}>
            <input
              type="checkbox"
              className={styles.rememberCheckbox}
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <span style={{ fontSize: '0.75rem', color: '#475569' }}>
              I confirm that I am an authorized officer under MoSPI or State DES.
            </span>
          </label>
        </div>

        {/* Primary CTA Button */}
        <button type="submit" className={styles.primaryBtn} disabled={loading}>
          {loading ? (
            <>
              <span className={styles.spinner} />
              <span>Registering Profile…</span>
            </>
          ) : (
            <>
              <span>Complete Registration</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span className={styles.dividerText}>or register with</span>
        <span className={styles.dividerLine} />
      </div>

      {/* SSO Quick Registration */}
      <div className={styles.ssoBtnGroup}>
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
            <span>Fast Sign-up with Government SSO</span>
          </div>
          <div className={styles.ssoBtnBadge}>
            <GovtSsoShield size={20} />
          </div>
        </button>

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
            <span>Fast Sign-up with iGOT Karmayogi</span>
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

        {googleEnabled && (
          <GoogleSignUpButton
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-up was cancelled.')}
            disabled={loading}
          />
        )}
      </div>

      {/* Sign in link */}
      <div className={styles.cardFooterText}>
        Already registered?
        <Link to="/login" className={styles.cardLink}>
          Sign in here
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

      {/* SSO Quick Picker Modal */}
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
                      : 'iGOT Karmayogi Sign-up'}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                    Select your official pre-verified identity
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
              {ROSTER_SAMPLES.map((officer) => (
                <div
                  key={officer.id}
                  className={styles.ssoOfficerOption}
                  onClick={() => handleSsoSelect(officer)}
                >
                  <div className={styles.ssoOfficerLeft}>
                    <span className={styles.ssoOfficerName}>{officer.name}</span>
                    <span className={styles.ssoOfficerRole}>
                      {officer.id} · {officer.email}
                    </span>
                  </div>
                  <ArrowRight size={16} color="#2563eb" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Default Export ───────────────────────────────────────────────────────────
export default function SignupPage() {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <AuthLayout>
        <SignupForm googleEnabled={false} />
      </AuthLayout>
    )
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthLayout>
        <SignupForm googleEnabled={true} />
      </AuthLayout>
    </GoogleOAuthProvider>
  )
}
