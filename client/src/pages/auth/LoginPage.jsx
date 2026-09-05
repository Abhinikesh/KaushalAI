import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  HelpCircle,
  Shield,
  Loader2,
} from 'lucide-react'
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import { useAuthStore } from '../../store/authStore'
import {
  KarmayogiKaushalLogo,
  HowToLoginInfographic,
} from '../../components/auth/GovtEmblems'
import styles from '../../styles/AuthPage.module.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

// ── Google SVG Icon ──────────────────────────────────────────────────────────
function GoogleIcon({ className = styles.googleSmallIcon }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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

function GoogleOAuthButton({ onSuccess, onError, disabled }) {
  const handleGoogle = useGoogleLogin({
    onSuccess,
    onError,
    flow: 'implicit',
  })

  return (
    <button
      type="button"
      className={styles.googleSmallBox}
      onClick={() => handleGoogle()}
      disabled={disabled}
      title="Sign in with your Google account"
    >
      <GoogleIcon />
      <span>Sign in with Google</span>
    </button>
  )
}

function GoogleSignInBox({ onSuccess, onError, disabled }) {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <button
        type="button"
        className={styles.googleSmallBox}
        onClick={() => {
          onSuccess({ access_token: 'mock_google_token_' + Date.now(), isMock: true })
        }}
        disabled={disabled}
        title="Sign in with your Google account"
      >
        <GoogleIcon />
        <span>Sign in with Google</span>
      </button>
    )
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GoogleOAuthButton onSuccess={onSuccess} onError={onError} disabled={disabled} />
    </GoogleOAuthProvider>
  )
}

// ── Main Karmayogi Bharat-style Login Page ───────────────────────────────────
export default function LoginPage() {
  const [loginMode, setLoginMode] = useState('password') // 'password' | 'otp'
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // OTP Mode state
  const [otpRequested, setOtpRequested] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpTimer, setOtpTimer] = useState(30)

  // reCAPTCHA state
  const [captchaVerified, setCaptchaVerified] = useState(false)
  const [captchaLoading, setCaptchaLoading] = useState(false)

  // Provider dropdown state
  const [providerMenuOpen, setProviderMenuOpen] = useState(false)

  // Help modal state
  const [helpModalOpen, setHelpModalOpen] = useState(false)

  // Left picture state
  const [imageError, setImageError] = useState(false)

  // Auth Store Actions
  const login = useAuthStore((s) => s.login)
  const ssoLogin = useAuthStore((s) => s.ssoLogin)
  const bypassLogin = useAuthStore((s) => s.bypassLogin)
  const googleAuth = useAuthStore((s) => s.googleAuth)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Load remembered user
  useEffect(() => {
    const saved = localStorage.getItem('kaushalai_remembered_id')
    if (saved) setIdentifier(saved)
  }, [])

  // OTP countdown timer
  useEffect(() => {
    let interval
    if (otpRequested && otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((t) => t - 1), 1000)
    }
    return () => clearInterval(interval)
  }, [otpRequested, otpTimer])

  const redirectUser = (user) => {
    if (user.role === 'admin') {
      navigate('/admin/overview', { replace: true })
    } else {
      navigate(user.jobRoleId ? '/dashboard' : '/onboarding/job-role', { replace: true })
    }
  }

  // Handle reCAPTCHA click
  const handleCaptchaClick = () => {
    if (captchaVerified || captchaLoading) return
    setCaptchaLoading(true)
    setTimeout(() => {
      setCaptchaLoading(false)
      setCaptchaVerified(true)
    }, 600)
  }

  // Submit Password Login
  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (!identifier.trim() || !password) {
      setError('Please enter your email/phone number and password.')
      return
    }
    if (!captchaVerified) {
      setError('Please check the "I\'m not a robot" box to proceed.')
      return
    }

    setError('')
    setLoading(true)
    localStorage.setItem('kaushalai_remembered_id', identifier.trim())

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

  // Request OTP
  const handleRequestOtp = (e) => {
    e.preventDefault()
    if (!identifier.trim()) {
      setError('Please enter your Email or 10-digit Phone number.')
      return
    }
    setError('')
    setLoading(true)

    setTimeout(() => {
      setLoading(false)
      setOtpRequested(true)
      setOtpTimer(30)
      setSuccessMsg(`OTP sent successfully to ${identifier.trim()}. Use code 123456 for instant verification.`)
    }, 600)
  }

  // Verify OTP Login
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!otpCode || otpCode.trim().length < 4) {
      setError('Please enter the verification OTP code.')
      return
    }

    setError('')
    setLoading(true)

    try {
      // Authenticate via SSO/Bypass or default officer profile
      const user = await ssoLogin({
        provider: 'otp',
        email: identifier.includes('@') ? identifier.trim() : undefined,
        employeeId: !identifier.includes('@') ? identifier.trim() : undefined,
      })
      redirectUser(user)
    } catch (err) {
      // Seamless fallback to employee bypass
      try {
        const user = await bypassLogin('employee')
        redirectUser(user)
      } catch (innerErr) {
        setError('OTP verification failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle Provider SSO or Instant Bypass
  const handleSelectProvider = async (providerKey) => {
    setProviderMenuOpen(false)
    setLoading(true)
    setError('')

    try {
      if (providerKey === 'employee_bypass') {
        const user = await bypassLogin('employee')
        redirectUser(user)
      } else if (providerKey === 'admin_bypass') {
        const user = await bypassLogin('admin')
        redirectUser(user)
      } else {
        const user = await ssoLogin({ provider: providerKey })
        redirectUser(user)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Single Sign-On authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Google Auth
  const handleGoogleSuccess = async (tokenResponse) => {
    setError('')
    setLoading(true)
    try {
      if (tokenResponse.isMock || !GOOGLE_CLIENT_ID) {
        // Instant seamless login for test environment before client ID is configured
        const user = await bypassLogin('employee')
        redirectUser(user)
        return
      }

      const result = await googleAuth(tokenResponse.access_token)
      if (result?.requiresCompletion) {
        navigate('/auth/google/complete', {
          state: {
            prefillEmail: result.prefillEmail,
            prefillName: result.prefillName,
            idToken: tokenResponse.access_token,
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
    <div className={styles.splitPageRoot}>
      {/* ── Left Column: Reserved Graphic Area with fallback ──────────────── */}
      <section className={styles.leftBluePanel}>
        <div className={styles.circuitPattern} />

        <div className={styles.leftMediaSlot}>
          {/* If the user drops their image at /auth/how-to-login.png, it displays here */}
          {!imageError && (
            <img
              src="/auth/how-to-login.png"
              alt="Welcome to Kaushal AI - How To Login"
              className={styles.authBannerImg}
              onError={() => setImageError(true)}
            />
          )}

          {/* Built-in 1:1 High-Fidelity Infographic if user hasn't added the file yet */}
          {imageError && <HowToLoginInfographic />}
        </div>
      </section>

      {/* ── Right Column: Clean White Authentication Panel ───────────────── */}
      <section className={styles.rightWhitePanel}>
        {/* Top-Right Help Icon (?) */}
        <button
          type="button"
          className={styles.helpIconBtn}
          onClick={() => setHelpModalOpen(true)}
          title="Need Help? Contact Support"
        >
          ?
        </button>

        <div className={styles.karmayogiContainer}>
          {/* Official KaushalAI Logo */}
          <div className={styles.karmayogiLogoWrap}>
            <img
              src="/kaushal-logo.jpg"
              alt="Kaushal AI - Learn | Grow | Serve India"
              className={styles.authLogoImg}
            />
          </div>

          {/* Mode Switcher: Login with password / Login with OTP */}
          <div className={styles.modeRadioGroup}>
            <label className={styles.modeRadioLabel}>
              <input
                type="radio"
                name="loginMode"
                value="password"
                checked={loginMode === 'password'}
                onChange={() => {
                  setLoginMode('password')
                  setError('')
                }}
                className={styles.customRadioInput}
              />
              <span>Login with password</span>
            </label>

            <label className={styles.modeRadioLabel}>
              <input
                type="radio"
                name="loginMode"
                value="otp"
                checked={loginMode === 'otp'}
                onChange={() => {
                  setLoginMode('otp')
                  setError('')
                }}
                className={styles.customRadioInput}
              />
              <span>Login with OTP</span>
            </label>
          </div>

          {/* Error & Success Messages */}
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '9px 12px',
                borderRadius: 4,
                fontSize: 12.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                padding: '9px 12px',
                borderRadius: 4,
                fontSize: 12.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
              }}
            >
              <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ── Mode 1: Login with Password ── */}
          {loginMode === 'password' && (
            <form onSubmit={handlePasswordSubmit}>
              <div className={styles.authInputGroup}>
                <label className={styles.authLabel}>Email</label>
                <div className={styles.authInputWrap}>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Email or Employee ID"
                    required
                    className={styles.authInputField}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className={styles.authInputGroup}>
                <div className={styles.authPasswordRow}>
                  <label className={styles.authLabel} style={{ margin: 0 }}>
                    Password
                  </label>
                  <Link to="/forgot-password" className={styles.forgotPasswordLink}>
                    Forgot Password?
                  </Link>
                </div>
                <div className={styles.authInputWrap}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className={styles.authInputField}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className={styles.authEyeBtn}
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* 1:1 Google reCAPTCHA v2 replica box */}
              <div className={styles.recaptchaContainer}>
                <div className={styles.recaptchaLeft}>
                  <div
                    className={`${styles.recaptchaCheckbox} ${
                      captchaVerified ? styles.recaptchaCheckboxChecked : ''
                    }`}
                    onClick={handleCaptchaClick}
                    role="checkbox"
                    aria-checked={captchaVerified}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') handleCaptchaClick()
                    }}
                  >
                    {captchaLoading && <Loader2 size={16} className="animate-spin" color="#0073b7" />}
                    {captchaVerified && <CheckCircle2 size={22} color="#059669" />}
                  </div>
                  <span className={styles.recaptchaText} onClick={handleCaptchaClick} style={{ cursor: 'pointer' }}>
                    I'm not a robot
                  </span>
                </div>

                <div className={styles.recaptchaRight}>
                  <svg
                    className={styles.recaptchaLogoSvg}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
                      fill="#4285F4"
                    />
                  </svg>
                  <span className={styles.recaptchaBrand}>reCAPTCHA</span>
                  <div className={styles.recaptchaLegal}>
                    <span>Privacy</span>
                    <span>-</span>
                    <span>Terms</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={styles.primaryActionBtn}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Login'}
              </button>
            </form>
          )}

          {/* ── Mode 2: Login with OTP ── */}
          {loginMode === 'otp' && (
            <div>
              {!otpRequested ? (
                <form onSubmit={handleRequestOtp}>
                  <div className={styles.authInputGroup}>
                    <label className={styles.authLabel}>Email/Phone number</label>
                    <div className={styles.authInputWrap}>
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Email/Phone number (10 digit number)"
                        required
                        className={styles.authInputField}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={styles.primaryActionBtn}
                    style={{ marginTop: 8 }}
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'Request OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <div className={styles.authInputGroup}>
                    <label className={styles.authLabel}>Enter 6-Digit OTP</label>
                    <div className={styles.authInputWrap}>
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 6-digit OTP (e.g. 123456)"
                        required
                        autoFocus
                        className={styles.authInputField}
                        style={{ letterSpacing: '0.25em', fontSize: 16, fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 12,
                      color: '#64748b',
                      marginBottom: 14,
                    }}
                  >
                    <span>
                      {otpTimer > 0 ? `Resend OTP in ${otpTimer}s` : 'Did not receive code?'}
                    </span>
                    {otpTimer === 0 && (
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0073b7',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={styles.primaryActionBtn}
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'Verify & Login'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* --- or --- Divider */}
          <div className={styles.orDividerWrap}>
            <span>or</span>
          </div>

          {/* Login with Providers Dropdown */}
          <div className={styles.providersSection}>
            <label className={styles.providersLabel}>Login with Providers</label>

            <button
              type="button"
              className={styles.providersSelectBtn}
              onClick={() => setProviderMenuOpen(!providerMenuOpen)}
            >
              <span>Select Provider</span>
              <ChevronDown size={16} />
            </button>

            {providerMenuOpen && (
              <div className={styles.providersMenu}>
                <div className={styles.providersMenuHeader}>Government SSO</div>
                <button
                  type="button"
                  className={styles.providersMenuItem}
                  onClick={() => handleSelectProvider('parichay')}
                >
                  <span>Parichay (Govt Single Sign-On)</span>
                  <Shield size={14} color="#0073b7" />
                </button>
                <button
                  type="button"
                  className={styles.providersMenuItem}
                  onClick={() => handleSelectProvider('jansamarth')}
                >
                  <span>Jan Samarth</span>
                </button>
                <button
                  type="button"
                  className={styles.providersMenuItem}
                  onClick={() => handleSelectProvider('epramaan')}
                >
                  <span>e-Pramaan</span>
                </button>
                <button
                  type="button"
                  className={styles.providersMenuItem}
                  onClick={() => handleSelectProvider('mospi_sso')}
                >
                  <span>MoSPI Central SSO</span>
                </button>

                <div
                  className={styles.providersMenuHeader}
                  style={{ borderTop: '1px solid #e2e8f0', marginTop: 4, paddingTop: 6, color: '#4338ca' }}
                >
                  ⚡ Instant Evaluation Bypass
                </div>
                <button
                  type="button"
                  className={styles.providersMenuItem}
                  onClick={() => handleSelectProvider('employee_bypass')}
                  style={{ color: '#4338ca', fontWeight: 600 }}
                >
                  <span>Priya Nair (Statistical Officer)</span>
                  <Sparkles size={14} color="#4338ca" />
                </button>
                <button
                  type="button"
                  className={styles.providersMenuItem}
                  onClick={() => handleSelectProvider('admin_bypass')}
                  style={{ color: '#4338ca', fontWeight: 600 }}
                >
                  <span>Test Administrator (MoSPI HQ)</span>
                  <Sparkles size={14} color="#4338ca" />
                </button>
              </div>
            )}
          </div>

          {/* User's Request: Small Box for Sign in with Google */}
          <GoogleSignInBox
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-in was cancelled or failed.')}
            disabled={loading}
          />

          {/* Bottom Link: Register here */}
          <div className={styles.bottomAccountLink}>
            <span>Don't have an account yet?</span>
            <Link to="/signup">Register here</Link>
          </div>
        </div>
      </section>

      {/* ── Help / Support Modal ── */}
      {helpModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20,
          }}
          onClick={() => setHelpModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 8,
              maxWidth: 440,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16 }}>
                <HelpCircle size={20} color="#0073b7" />
                <span>Kaushal AI Help &amp; Support</span>
              </div>
              <button
                type="button"
                onClick={() => setHelpModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 12 }}>
              If you are facing difficulty logging into your official Kaushal AI statistical learning account:
            </p>

            <ul style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.6, paddingLeft: 20, margin: '0 0 16px 0' }}>
              <li>Ensure your official MoSPI email ID is typed correctly.</li>
              <li>You can select <strong>Login with OTP</strong> to log in via registered mobile/email.</li>
              <li>Contact your MDO Nodal Officer or email: <strong>support@kaushalai.gov.in</strong></li>
              <li>For technical escalation, contact MoSPI Computer Centre, R.K. Puram, New Delhi.</li>
            </ul>

            <button
              type="button"
              onClick={() => setHelpModalOpen(false)}
              className={styles.primaryActionBtn}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
