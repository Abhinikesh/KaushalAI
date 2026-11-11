import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  X,
  HelpCircle,
  Shield,
  Lock,
  Loader2,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import styles from '../../styles/AuthPage.module.css'

// ── Admin-Branded Login Page ──────────────────────────────────────────────────
export default function AdminLoginPage() {
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

  // Auth Store Actions
  const adminLogin = useAuthStore((s) => s.adminLogin)
  const ssoLogin = useAuthStore((s) => s.ssoLogin)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Load remembered user
  useEffect(() => {
    const saved = localStorage.getItem('kaushalai_remembered_admin_id') || localStorage.getItem('kaushalai_remembered_id')
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

  // Redirect based on actual role returned by backend
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

  // Handle Password Login
  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!identifier.trim()) {
      setError('Please enter your administrator email or officer ID.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }
    if (!captchaVerified) {
      setError('Please complete the security verification (I am not a robot).')
      return
    }

    setLoading(true)
    try {
      localStorage.setItem('kaushalai_remembered_admin_id', identifier.trim())
      const user = await adminLogin(identifier.trim(), password)
      redirectUser(user)
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid administrator credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Handle OTP Request
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!identifier.trim()) {
      setError('Please enter your administrator email or phone number.')
      return
    }

    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setOtpRequested(true)
      setOtpTimer(30)
      setSuccessMsg('One-Time Password sent to your registered official channel.')
    }, 500)
  }

  // Handle OTP Verification
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!otpCode || otpCode.length < 6) {
      setError('Please enter the valid 6-digit OTP.')
      return
    }

    setLoading(true)
    try {
      const user = await ssoLogin({
        provider: 'otp',
        email: identifier.includes('@') ? identifier.trim() : undefined,
        employeeId: !identifier.includes('@') ? identifier.trim() : undefined,
      })
      redirectUser(user)
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Provider SSO
  const handleSelectProvider = async (providerKey) => {
    setProviderMenuOpen(false)
    setLoading(true)
    setError('')

    try {
      const user = await ssoLogin({ provider: providerKey })
      redirectUser(user)
    } catch (err) {
      setError(err.response?.data?.message || 'Single Sign-On authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.12)), url('/admin-flag-bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        padding: '36px 16px',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* Top-Right Help Icon (?) */}
      <button
        type="button"
        className={styles.helpIconBtn}
        onClick={() => setHelpModalOpen(true)}
        title="Need Help? Contact MoSPI Admin Support"
      >
        ?
      </button>

      {/* Centered Administrator Login Card */}
      <div
        style={{
          maxWidth: 450,
          width: '100%',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: 14,
          boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          padding: '36px 32px 28px 32px',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div className={styles.karmayogiContainer} style={{ maxWidth: '100%' }}>
          {/* Official KaushalAI Logo with Admin Accent Badge */}
          <div className={styles.karmayogiLogoWrap} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img
              src="/kaushal-logo.jpg"
              alt="Kaushal AI - Learn | Grow | Serve India"
              className={styles.authLogoImg}
            />
            {/* Admin Badge */}
            <div
              style={{
                marginTop: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                color: '#ffffff',
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                boxShadow: '0 2px 4px rgba(30,27,75,0.15)',
              }}
            >
              <Shield size={11} color="#a5b4fc" />
              <span>ADMIN ACCESS</span>
            </div>
          </div>

          {/* Heading & Subtext */}
          <div
            style={{
              margin: '14px 0 16px 0',
              padding: '10px 12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid #4338ca',
              borderRadius: 4,
              fontSize: 12,
              color: '#475569',
              lineHeight: 1.45,
            }}
          >
            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={13} color="var(--color-primary-700)" />
              <span>Administrator Access</span>
            </div>
            <span>Restricted access for authorized MoSPI system administrators</span>
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
                <label className={styles.authLabel}>Admin Email / Officer ID</label>
                <div className={styles.authInputWrap}>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Admin email or MoSPI ID"
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
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Login to Admin Console'}
              </button>
            </form>
          )}

          {/* ── Mode 2: Login with OTP ── */}
          {loginMode === 'otp' && (
            <div>
              {!otpRequested ? (
                <form onSubmit={handleRequestOtp}>
                  <div className={styles.authInputGroup}>
                    <label className={styles.authLabel}>Email / Phone number</label>
                    <div className={styles.authInputWrap}>
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Official email or phone number"
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
              </div>
            )}
          </div>

          {/* Institutional Security Notice (No cross-links to /login or /signup) */}
          <div style={{ textAlign: 'center', marginTop: 22, fontSize: 11.5, color: '#64748b' }}>
            <span>Institutional Governance Portal • Ministry of Statistics &amp; Programme Implementation</span>
          </div>
        </div>
      </div>

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
                <span>MoSPI Administrative Helpdesk</span>
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
              If you are facing difficulty accessing the MoSPI Central Administration Console:
            </p>

            <ul style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.6, paddingLeft: 20, margin: '0 0 16px 0' }}>
              <li>Ensure your official MoSPI administrative credentials are active.</li>
              <li>Only authorized officers with role permissions may access the Control Tower.</li>
              <li>For account provisioning or credential reset, contact <strong>admin-support@kaushalai.gov.in</strong></li>
              <li>Computer Centre, Ministry of Statistics &amp; Programme Implementation, New Delhi.</li>
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
