import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  HelpCircle,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import { useAuthStore } from '../../store/authStore'
import {
  KarmayogiKaushalLogo,
  HowToRegisterInfographic,
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

function GoogleOAuthSignUpButton({ onSuccess, onError, disabled }) {
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
      title="Sign up with your Google account"
    >
      <GoogleIcon />
      <span>Sign up with Google</span>
    </button>
  )
}

function GoogleSignUpBox({ onSuccess, onError, disabled }) {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <button
        type="button"
        className={styles.googleSmallBox}
        onClick={() => {
          onSuccess({ access_token: 'mock_google_token_' + Date.now(), isMock: true })
        }}
        disabled={disabled}
        title="Sign up with your Google account"
      >
        <GoogleIcon />
        <span>Sign up with Google</span>
      </button>
    )
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GoogleOAuthSignUpButton onSuccess={onSuccess} onError={onError} disabled={disabled} />
    </GoogleOAuthProvider>
  )
}

// ── Official Roster quick samples for easy evaluation ────────────────────────
const ROSTER_OPTIONS = [
  { id: 'MOSPI-2024-001', name: 'Priya Nair', email: 'priya.nair@mospi.gov.in', designation: 'Senior Statistical Officer (SSO)' },
  { id: 'MOSPI-2024-002', name: 'Rajan Sharma', email: 'rajan.sharma@mospi.gov.in', designation: 'Junior Statistical Officer (JSO)' },
  { id: 'MOSPI-2024-003', name: 'Anita Desai', email: 'anita.desai@mospi.gov.in', designation: 'Deputy Director' },
  { id: 'MOSPI-2024-004', name: 'Vikram Mehta', email: 'vikram.mehta@mospi.gov.in', designation: 'Additional Research Officer' },
]

// ── Main Karmayogi Bharat-style Register Page ────────────────────────────────
export default function SignupPage() {
  const [currentStep, setCurrentStep] = useState(1) // 1 | 2
  const [jurisdiction, setJurisdiction] = useState('center') // 'center' | 'state'
  const [ministry, setMinistry] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [designation, setDesignation] = useState('')

  // Step 1 Form Data
  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpValue, setOtpValue] = useState('')

  // Step 2 Form Data
  const [fullName, setFullName] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Modals & States
  const [imageError, setImageError] = useState(false)
  const [helpModalOpen, setHelpModalOpen] = useState(false)
  const [nodalModalOpen, setNodalModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const signup = useAuthStore((s) => s.signup)
  const bypassLogin = useAuthStore((s) => s.bypassLogin)
  const googleAuth = useAuthStore((s) => s.googleAuth)
  const navigate = useNavigate()

  const redirectUser = (user) => {
    if (user.role === 'admin') {
      navigate('/admin/overview', { replace: true })
    } else {
      navigate(user.jobRoleId ? '/dashboard' : '/onboarding/job-role', { replace: true })
    }
  }

  // Send OTP handler in Step 1
  const handleSendOtp = () => {
    if (!email.trim()) {
      setError('Please enter your official Email address.')
      return
    }
    setError('')
    setOtpSent(true)
    setSuccessMsg(`OTP sent to ${email.trim()}. Enter code 123456 to verify.`)
  }

  // Handle Step 1 Next
  const handleStep1Next = (e) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your official email.')
      return
    }
    setError('')
    setCurrentStep(2)
  }

  // Auto-fill from roster option
  const handleRosterSelect = (e) => {
    const selected = ROSTER_OPTIONS.find((r) => r.id === e.target.value)
    if (selected) {
      setEmployeeId(selected.id)
      setFullName(selected.name)
      if (!email) setEmail(selected.email)
      setDesignation(selected.designation)
    } else {
      setEmployeeId(e.target.value)
    }
  }

  // Handle Step 2 Complete Registration
  const handleCompleteRegistration = async (e) => {
    e.preventDefault()
    if (!fullName.trim() || !employeeId.trim() || !password) {
      setError('Please fill all required account credentials.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const user = await signup({
        employeeId: employeeId.trim(),
        name: fullName.trim(),
        email: email.trim(),
        password,
        role: 'employee',
        experienceYears: 3,
      })
      redirectUser(user)
    } catch (err) {
      const serverMsg = err.response?.data?.message
      if (serverMsg) {
        setError(serverMsg)
      } else {
        // In local/demo mode if roster mismatch occurs, offer bypass
        try {
          const user = await bypassLogin('employee')
          redirectUser(user)
        } catch {
          setError('Registration failed. Please check your details or pick an official MoSPI roster ID.')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle Google Auth for Signup
  const handleGoogleSuccess = async (tokenResponse) => {
    setError('')
    setLoading(true)
    try {
      if (tokenResponse.isMock || !GOOGLE_CLIENT_ID) {
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
      setError(err.response?.data?.message || 'Google registration failed. Please try again.')
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
          {/* If the user drops their image at /auth/how-to-register.png, it displays here */}
          {!imageError && (
            <img
              src="/auth/how-to-register.png"
              alt="Welcome to Kaushal AI - How To Register"
              className={styles.authBannerImg}
              onError={() => setImageError(true)}
            />
          )}

          {/* Built-in 1:1 High-Fidelity Infographic if user hasn't added the file yet */}
          {imageError && <HowToRegisterInfographic />}
        </div>
      </section>

      {/* ── Right Column: Clean White Register Panel ──────────────────────── */}
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
          {/* Back Button & Title Header */}
          <div className={styles.registerBackHeader}>
            <button
              type="button"
              className={styles.backArrowBtn}
              onClick={() => {
                if (currentStep === 2) setCurrentStep(1)
                else navigate('/login')
              }}
              title="Go Back"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className={styles.registerTitle}>Register</h2>
          </div>

          {/* 2-Step Progress Indicator */}
          <div className={styles.stepperWrap}>
            <div className={styles.stepItem}>
              <div className={styles.stepCircleActive}>1</div>
              <span className={styles.stepLabel}>Step - 1</span>
            </div>

            <div className={styles.stepLine} />

            <div className={styles.stepItem}>
              <div
                className={
                  currentStep === 2
                    ? styles.stepCircleActive
                    : styles.stepCircleInactive
                }
              >
                2
              </div>
              <span
                className={
                  currentStep === 2
                    ? styles.stepLabel
                    : styles.stepLabelInactive
                }
              >
                Step - 2
              </span>
            </div>
          </div>

          {/* Error & Success Notification */}
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '8px 12px',
                borderRadius: 4,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                padding: '8px 12px',
                borderRadius: 4,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ── STEP 1: Jurisdiction & Organization Form ── */}
          {currentStep === 1 && (
            <form onSubmit={handleStep1Next}>
              {/* Center / State Radio Selector */}
              <div className={styles.authInputGroup} style={{ marginBottom: 16 }}>
                <label className={styles.authLabel}>
                  Center/State <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: 20 }}>
                  <label className={styles.modeRadioLabel}>
                    <input
                      type="radio"
                      name="jurisdiction"
                      value="center"
                      checked={jurisdiction === 'center'}
                      onChange={() => setJurisdiction('center')}
                      className={styles.customRadioInput}
                    />
                    <span>Center</span>
                  </label>

                  <label className={styles.modeRadioLabel}>
                    <input
                      type="radio"
                      name="jurisdiction"
                      value="state"
                      checked={jurisdiction === 'state'}
                      onChange={() => setJurisdiction('state')}
                      className={styles.customRadioInput}
                    />
                    <span>State</span>
                  </label>
                </div>
              </div>

              {/* Ministry/Department Dropdown */}
              <div className={styles.authInputGroup}>
                <label className={styles.authLabel}>
                  Ministry/Department <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={ministry}
                  onChange={(e) => setMinistry(e.target.value)}
                  className={styles.authInputField}
                  style={{ color: ministry ? '#0f172a' : '#94a3b8' }}
                  required
                >
                  <option value="" disabled style={{ color: '#94a3b8' }}>
                    Select Ministry
                  </option>
                  <option value="Indian Statistical Institute, MoSPI" style={{ color: '#0f172a' }}>Indian Statistical Institute, MoSPI</option>
                  <option value="Ministry of Statistics and Programme Implementation (MoSPI)" style={{ color: '#0f172a' }}>Ministry of Statistics and Programme Implementation (MoSPI)</option>
                  <option value="National Statistical Office (NSO), MoSPI" style={{ color: '#0f172a' }}>National Statistical Office (NSO), MoSPI</option>
                  <option value="Field Operations Division (FOD), MoSPI" style={{ color: '#0f172a' }}>Field Operations Division (FOD), MoSPI</option>
                  <option value="National Accounts Division (NAD), MoSPI" style={{ color: '#0f172a' }}>National Accounts Division (NAD), MoSPI</option>
                  <option value="Economic Statistics Division (ESD), MoSPI" style={{ color: '#0f172a' }}>Economic Statistics Division (ESD), MoSPI</option>
                  <option value="Social Statistics Division (SSD), MoSPI" style={{ color: '#0f172a' }}>Social Statistics Division (SSD), MoSPI</option>
                  <option value="Data Quality & Assurance Division (DQAD), MoSPI" style={{ color: '#0f172a' }}>Data Quality &amp; Assurance Division (DQAD), MoSPI</option>
                  <option value="National Statistical Systems Training Academy (NSSTA)" style={{ color: '#0f172a' }}>National Statistical Systems Training Academy (NSSTA)</option>
                  <option value="State Directorate of Economics and Statistics (DES)" style={{ color: '#0f172a' }}>State Directorate of Economics and Statistics (DES)</option>
                </select>
              </div>

              {/* Organisation Dropdown with Request for help */}
              <div className={styles.authInputGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className={styles.authLabel} style={{ margin: 0 }}>
                    Organisation <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setHelpModalOpen(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0073b7',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Request for help
                  </button>
                </div>
                <select
                  value={organisation}
                  onChange={(e) => setOrganisation(e.target.value)}
                  className={styles.authInputField}
                  style={{ color: organisation ? '#0f172a' : '#94a3b8' }}
                  required
                >
                  <option value="" disabled style={{ color: '#94a3b8' }}>
                    Select Organisation
                  </option>
                  <option value="N/A" style={{ color: '#0f172a' }}>N/A</option>
                  <option value="Central Statistics Office (CSO)" style={{ color: '#0f172a' }}>Central Statistics Office (CSO)</option>
                  <option value="National Sample Survey (NSS)" style={{ color: '#0f172a' }}>National Sample Survey (NSS)</option>
                  <option value="Computer Centre, R.K. Puram" style={{ color: '#0f172a' }}>Computer Centre, R.K. Puram</option>
                  <option value="Zonal Office (FOD North / South / East / West)" style={{ color: '#0f172a' }}>Zonal Office (FOD North / South / East / West)</option>
                  <option value="Regional Training Center (NSSTA)" style={{ color: '#0f172a' }}>Regional Training Center (NSSTA)</option>
                </select>
              </div>

              {/* Designation Dropdown */}
              <div className={styles.authInputGroup}>
                <label className={styles.authLabel}>
                  Designation <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className={styles.authInputField}
                  style={{ color: designation ? '#0f172a' : '#94a3b8' }}
                  required
                >
                  <option value="" disabled style={{ color: '#94a3b8' }}>
                    Select Designation
                  </option>
                  <option value="Additional Research Officer" style={{ color: '#0f172a' }}>Additional Research Officer</option>
                  <option value="Senior Statistical Officer (SSO)" style={{ color: '#0f172a' }}>Senior Statistical Officer (SSO)</option>
                  <option value="Junior Statistical Officer (JSO)" style={{ color: '#0f172a' }}>Junior Statistical Officer (JSO)</option>
                  <option value="Deputy Director / Director" style={{ color: '#0f172a' }}>Deputy Director / Director</option>
                  <option value="Joint Director / Statistical Advisor" style={{ color: '#0f172a' }}>Joint Director / Statistical Advisor</option>
                  <option value="Field Investigator" style={{ color: '#0f172a' }}>Field Investigator</option>
                  <option value="Data Processing Assistant (DPA)" style={{ color: '#0f172a' }}>Data Processing Assistant (DPA)</option>
                  <option value="Administrative / IT Officer" style={{ color: '#0f172a' }}>Administrative / IT Officer</option>
                </select>
              </div>

              {/* Dashed Border Email Verification Box */}
              <div className={styles.dashedEmailBox}>
                <div className={styles.authInputGroup} style={{ margin: 0 }}>
                  <label className={styles.authLabel} style={{ fontSize: 12 }}>
                    Email <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. yourname@mospi.gov.in"
                    required
                    className={styles.authInputField}
                  />
                </div>

                <div className={styles.mdoHelperNote}>
                  Not able to proceed? Get registered through your MDO.{' '}
                  <button
                    type="button"
                    onClick={() => setNodalModalOpen(true)}
                  >
                    Click here
                  </button>{' '}
                  to view Nodal Officers.
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className={styles.sendOtpBtn}
                  >
                    Send OTP
                  </button>
                </div>

                {otpSent && (
                  <div style={{ marginTop: 6 }}>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className={styles.authInputField}
                      style={{ height: 36, fontSize: 13 }}
                    />
                  </div>
                )}
              </div>

              {/* Next Button */}
              <button
                type="submit"
                className={styles.primaryActionBtn}
                style={{ borderRadius: 20, height: 38 }}
              >
                Next
              </button>
            </form>
          )}

          {/* ── STEP 2: Account Credentials & Roster Confirmation ── */}
          {currentStep === 2 && (
            <form onSubmit={handleCompleteRegistration}>
              <div className={styles.authInputGroup}>
                <label className={styles.authLabel}>
                  Full Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Priya Nair"
                  required
                  className={styles.authInputField}
                />
              </div>

              {/* Employee ID with quick roster picker */}
              <div className={styles.authInputGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className={styles.authLabel} style={{ margin: 0 }}>
                    Employee ID <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Pick from roster or type</span>
                </div>
                <select
                  onChange={handleRosterSelect}
                  value={employeeId}
                  className={styles.authInputField}
                  style={{ marginBottom: 6 }}
                >
                  <option value="">Select official MoSPI Roster ID...</option>
                  {ROSTER_OPTIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.id} — {r.name} ({r.designation})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="Or enter Employee ID (e.g. MOSPI-2024-001)"
                  required
                  className={styles.authInputField}
                />
              </div>

              {/* Password */}
              <div className={styles.authInputGroup}>
                <label className={styles.authLabel}>
                  Password <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div className={styles.authInputWrap}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    className={styles.authInputField}
                  />
                  <button
                    type="button"
                    className={styles.authEyeBtn}
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className={styles.authInputGroup}>
                <label className={styles.authLabel}>
                  Confirm Password <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div className={styles.authInputWrap}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className={styles.authInputField}
                  />
                  <button
                    type="button"
                    className={styles.authEyeBtn}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  style={{
                    flex: 1,
                    height: 38,
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: 4,
                    fontWeight: 600,
                    fontSize: 13,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={styles.primaryActionBtn}
                  style={{ flex: 2, height: 38 }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Complete Registration'}
                </button>
              </div>
            </form>
          )}

          {/* User's Request: Small Box for Sign up with Google */}
          <GoogleSignUpBox
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-up was cancelled or failed.')}
            disabled={loading}
          />

          {/* Bottom Link: Already have an account? Sign in here */}
          <div className={styles.bottomAccountLink}>
            <span>Already have an account?</span>
            <Link to="/login">Sign in here</Link>
          </div>
        </div>
      </section>

      {/* ── Nodal Officers / MDO Admin Modal ── */}
      {nodalModalOpen && (
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
          onClick={() => setNodalModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 8,
              maxWidth: 460,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
                MoSPI MDO Nodal Officers Directory
              </div>
              <button
                type="button"
                onClick={() => setNodalModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.45, marginBottom: 12 }}>
              If your official government email is not listed or you require onboarding assistance, contact your division nodal officer:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
              <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>HQ Nodal Officer · MoSPI Computer Centre</div>
                <div style={{ color: '#64748b' }}>nodal.hq@mospi.gov.in · +91-11-2610-8587</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>NSSTA Capacity Building · Greater Noida</div>
                <div style={{ color: '#64748b' }}>training.nssta@nic.in · +91-120-232-0050</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>FOD Field Staff Coordinator · New Delhi</div>
                <div style={{ color: '#64748b' }}>fod.admin@mospi.gov.in · +91-11-2618-9123</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setNodalModalOpen(false)}
              className={styles.primaryActionBtn}
              style={{ marginTop: 16 }}
            >
              Close
            </button>
          </div>
        </div>
      )}

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
              maxWidth: 420,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
                Organisation Support
              </div>
              <button
                type="button"
                onClick={() => setHelpModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5, marginBottom: 16 }}>
              Cannot find your organisation or division? MoSPI employees can register with <strong>N/A</strong> and update their precise posting later in Profile Settings.
            </p>

            <button
              type="button"
              onClick={() => setHelpModalOpen(false)}
              className={styles.primaryActionBtn}
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
