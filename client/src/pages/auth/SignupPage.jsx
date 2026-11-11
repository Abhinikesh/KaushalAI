import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  X,
  HelpCircle,
  Loader2,
} from 'lucide-react'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { useAuthStore } from '../../store/authStore'
import { HowToRegisterInfographic } from '../../components/auth/GovtEmblems'
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

function GoogleSignUpBox({ onSuccess, onError, disabled, onMissingConfig }) {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <button
        type="button"
        className={styles.googleSmallBox}
        onClick={() => {
          if (onMissingConfig) {
            onMissingConfig()
          } else {
            onError(new Error('Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID.'))
          }
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
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', width: '100%' }}>
        <GoogleLogin
          onSuccess={onSuccess}
          onError={() => onError(new Error('Google sign-up was cancelled or failed.'))}
          theme="outline"
          size="large"
          text="signup_with"
          shape="rectangular"
          width="100%"
        />
      </div>
    </GoogleOAuthProvider>
  )
}

// ── Google-Only Public Signup Page ───────────────────────────────────────────
export default function SignupPage() {
  const [imageError, setImageError] = useState(false)
  const [helpModalOpen, setHelpModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const googleAuth = useAuthStore((s) => s.googleAuth)
  const navigate = useNavigate()

  const redirectUser = (user) => {
    if (user.role === 'admin') {
      navigate('/admin/overview', { replace: true })
    } else if (!user.onboarding_completed) {
      navigate('/onboarding', { replace: true })
    } else {
      navigate('/dashboard', { replace: true })
    }
  }

  // Handle Google Auth for Public Signup
  const handleGoogleSuccess = async (credentialResponse) => {
    setError('')
    setLoading(true)
    try {
      const idToken = credentialResponse?.credential || credentialResponse?.idToken
      if (!idToken) {
        throw new Error('Google did not return a valid credential token. Please try again.')
      }

      const result = await googleAuth(idToken)
      if (result?.user) {
        redirectUser(result.user)
      } else {
        throw new Error('Google registration failed. Please try again.')
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Google registration failed. Please try again.')
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
          {!imageError && (
            <img
              src="/auth/how-to-register.png"
              alt="Welcome to Kaushal AI - How To Register"
              className={styles.authBannerImg}
              onError={() => setImageError(true)}
            />
          )}
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
          {/* Official KaushalAI Logo */}
          <div className={styles.karmayogiLogoWrap}>
            <img
              src="/kaushal-logo.jpg"
              alt="Kaushal AI - Learn | Grow | Serve India"
              className={styles.authLogoImg}
            />
          </div>

          {/* Back Button & Title Header */}
          <div className={styles.registerBackHeader}>
            <button
              type="button"
              className={styles.backArrowBtn}
              onClick={() => navigate('/login')}
              title="Go Back to Login"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className={styles.registerTitle}>Join KaushalAI</h2>
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

          {/* ── Google-Only Universal Learner Registration ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '22px 18px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 6 }}>
                Universal Learner Access
              </div>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                Single-click registration for students, university learners, researchers, data analysts, and lifelong learners.
              </p>

              <GoogleSignUpBox
                onSuccess={handleGoogleSuccess}
                onError={(err) => setError(err?.message || 'Google sign-up was cancelled or failed.')}
                onMissingConfig={() => setError('Google OAuth 2.0 is not configured yet. Please configure VITE_GOOGLE_CLIENT_ID in your environment variables.')}
                disabled={loading}
              />

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  marginTop: 18,
                  textAlign: 'left',
                  fontSize: 12,
                  color: '#475569',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={14} color="#059669" style={{ flexShrink: 0 }} />
                  <span>Instant activation — no institutional approval or whitelist needed</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={14} color="#059669" style={{ flexShrink: 0 }} />
                  <span>Access full curriculum, AI tutor, and interactive practice tests</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={14} color="#059669" style={{ flexShrink: 0 }} />
                  <span>Earn cryptographically verifiable competency certificates</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Link: Already have an account? Sign in here */}
          <div className={styles.bottomAccountLink}>
            <span>Already have an account?</span>
            <Link to="/login">Sign in here</Link>
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
              Need assistance joining Kaushal AI?
            </p>

            <ul style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.6, paddingLeft: 20, margin: '0 0 16px 0' }}>
              <li>Universal learners can sign up directly with any personal or institutional Google account.</li>
              <li>Existing government employees and officers can sign in directly from the login page via Google, password, OTP, or Government Single Sign-On (Parichay).</li>
              <li>For support inquiries, email: <strong>support@kaushalai.gov.in</strong></li>
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
