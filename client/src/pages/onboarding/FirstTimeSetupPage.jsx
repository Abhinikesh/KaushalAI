import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Landmark, Globe, Sun, Moon, Monitor, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

// ─── Language options ────────────────────────────────────────────────────────
const LANGUAGES = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    flag: '🇬🇧',
    description: 'Platform content in English',
  },
  {
    code: 'hi',
    label: 'Hindi',
    nativeLabel: 'हिन्दी',
    flag: '🇮🇳',
    description: 'प्लेटफ़ॉर्म सामग्री हिंदी में',
  },
]

// ─── Theme options ───────────────────────────────────────────────────────────
const THEMES = [
  {
    value: 'light',
    label: 'Light',
    Icon: Sun,
    description: 'Clean white interface — best for daytime',
    preview: { bg: '#ffffff', accent: '#3b5bdb', text: '#1a1a2e', border: '#e2e8f0' },
  },
  {
    value: 'dark',
    label: 'Dark',
    Icon: Moon,
    description: 'Dark interface — easier on the eyes at night',
    preview: { bg: '#1e1e2e', accent: '#818cf8', text: '#e2e8f0', border: '#374151' },
  },
  {
    value: 'system',
    label: 'System Default',
    Icon: Monitor,
    description: 'Follows your device preference automatically',
    preview: { bg: 'linear-gradient(135deg, #fff 50%, #1e1e2e 50%)', accent: '#3b5bdb', text: '#1a1a2e', border: '#e2e8f0' },
  },
]

export default function FirstTimeSetupPage() {
  const navigate = useNavigate()
  const { user, updateUserPreferences } = useAuthStore()

  const [language, setLanguage] = useState(user?.preferences?.language || 'en')
  const [theme, setTheme] = useState(user?.preferences?.theme || 'light')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleContinue = async () => {
    setSaving(true)
    setError('')
    try {
      await updateUserPreferences({
        language,
        theme,
        setupCompleted: true,
      })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('Failed to save preferences:', err)
      setError('Could not save preferences. Please try again.')
      setSaving(false)
    }
  }

  const selectedLang = LANGUAGES.find((l) => l.code === language)
  const selectedTheme = THEMES.find((t) => t.value === theme)

  return (
    <div style={styles.page}>
      {/* Header Brand */}
      <header style={styles.header}>
        <div style={styles.brandRow}>
          <div style={styles.brandIconWrap}>
            <Landmark size={22} color="#fff" />
          </div>
          <span style={styles.brandName}>KaushalAI</span>
        </div>
      </header>

      {/* Card */}
      <main style={styles.main}>
        <div style={styles.card}>
          {/* Card Header */}
          <div style={styles.cardHeader}>
            <div style={styles.stepBadge}>Quick Setup</div>
            <h1 style={styles.title}>Set up your learning preferences</h1>
            <p style={styles.subtitle}>
              Personalise your experience on KaushalAI. You can change these anytime in Settings.
            </p>
          </div>

          {/* Divider */}
          <div style={styles.divider} />

          {/* Section: Language */}
          <section style={styles.section}>
            <div style={styles.sectionLabel}>
              <Globe size={15} style={{ marginRight: 6, opacity: 0.65 }} />
              Interface Language
            </div>
            <div style={styles.langGrid}>
              {LANGUAGES.map((lang) => {
                const selected = language === lang.code
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    style={{
                      ...styles.langCard,
                      ...(selected ? styles.langCardSelected : {}),
                    }}
                  >
                    <span style={styles.flag}>{lang.flag}</span>
                    <div style={styles.langText}>
                      <span style={styles.langLabel}>{lang.nativeLabel}</span>
                      <span style={styles.langSub}>{lang.description}</span>
                    </div>
                    {selected && (
                      <CheckCircle2
                        size={18}
                        style={{ marginLeft: 'auto', color: '#3b5bdb', flexShrink: 0 }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Section: Theme */}
          <section style={styles.section}>
            <div style={styles.sectionLabel}>
              <Sun size={15} style={{ marginRight: 6, opacity: 0.65 }} />
              Appearance
            </div>
            <div style={styles.themeGrid}>
              {THEMES.map((th) => {
                const selected = theme === th.value
                const Icon = th.Icon
                return (
                  <button
                    key={th.value}
                    type="button"
                    onClick={() => setTheme(th.value)}
                    style={{
                      ...styles.themeCard,
                      ...(selected ? styles.themeCardSelected : {}),
                    }}
                  >
                    {/* Mini preview swatch */}
                    <div
                      style={{
                        ...styles.themePreview,
                        background: th.preview.bg,
                        borderColor: selected ? '#3b5bdb' : '#e2e8f0',
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 8,
                          borderRadius: 4,
                          background: th.preview.accent,
                          marginBottom: 4,
                        }}
                      />
                      <div
                        style={{
                          width: 36,
                          height: 4,
                          borderRadius: 2,
                          background: th.preview.text,
                          opacity: 0.25,
                          marginBottom: 3,
                        }}
                      />
                      <div
                        style={{
                          width: 28,
                          height: 4,
                          borderRadius: 2,
                          background: th.preview.text,
                          opacity: 0.15,
                        }}
                      />
                    </div>

                    <div style={styles.themeInfo}>
                      <div style={styles.themeTop}>
                        <Icon size={14} style={{ marginRight: 5, opacity: 0.7 }} />
                        <span style={styles.themeLabel}>{th.label}</span>
                        {selected && (
                          <CheckCircle2
                            size={14}
                            style={{ marginLeft: 'auto', color: '#3b5bdb', flexShrink: 0 }}
                          />
                        )}
                      </div>
                      <span style={styles.themeSub}>{th.description}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}

          {/* Divider */}
          <div style={styles.divider} />

          {/* Footer */}
          <div style={styles.footer}>
            <div style={styles.summary}>
              <span style={styles.summaryDot} />
              <span>
                <strong>{selectedLang?.nativeLabel}</strong>
                {' · '}
                <strong>{selectedTheme?.label}</strong>
              </span>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={handleContinue}
              style={{
                ...styles.continueBtn,
                ...(saving ? styles.continueBtnDisabled : {}),
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} />
                  Saving…
                </>
              ) : (
                <>
                  Continue to Dashboard
                  <ArrowRight size={16} style={{ marginLeft: 8 }} />
                </>
              )}
            </button>
          </div>
        </div>

        <p style={styles.skip}>
          You can update these preferences anytime from{' '}
          <button
            type="button"
            style={styles.skipLink}
            onClick={handleContinue}
            disabled={saving}
          >
            Settings → Preferences
          </button>
        </p>
      </main>

      {/* Spinner keyframe injected inline */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .fts-lang-card:hover { border-color: #3b5bdb !important; background: #f0f4ff !important; }
        .fts-theme-card:hover { border-color: #3b5bdb !important; background: #f0f4ff !important; }
      `}</style>
    </div>
  )
}

// ─── Inline styles ─────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  header: {
    padding: '18px 32px',
    borderBottom: '1px solid #e2e8f0',
    background: '#ffffff',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  brandIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #3b5bdb 0%, #1e3a8a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 17,
    fontWeight: 700,
    color: '#1a1a2e',
    letterSpacing: '-0.3px',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 16px 60px',
  },
  card: {
    width: '100%',
    maxWidth: 580,
    background: '#ffffff',
    borderRadius: 16,
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '32px 32px 24px',
  },
  stepBadge: {
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    color: '#3b5bdb',
    background: '#eff2ff',
    borderRadius: 20,
    padding: '3px 10px',
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 8px',
    lineHeight: 1.3,
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    margin: 0,
    lineHeight: 1.6,
  },
  divider: {
    height: 1,
    background: '#f1f5f9',
  },
  section: {
    padding: '24px 32px',
  },
  sectionLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: '#94a3b8',
    marginBottom: 14,
  },
  // Language cards
  langGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  langCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 16px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    background: '#ffffff',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.15s, background 0.15s',
    width: '100%',
  },
  langCardSelected: {
    borderColor: '#3b5bdb',
    background: '#f0f4ff',
  },
  flag: {
    fontSize: 24,
    lineHeight: 1,
    flexShrink: 0,
  },
  langText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  langLabel: {
    fontSize: 15,
    fontWeight: 600,
    color: '#0f172a',
  },
  langSub: {
    fontSize: 12,
    color: '#64748b',
  },
  // Theme cards
  themeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
  },
  themeCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 14,
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    background: '#ffffff',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.15s, background 0.15s',
  },
  themeCardSelected: {
    borderColor: '#3b5bdb',
    background: '#f0f4ff',
  },
  themePreview: {
    height: 56,
    borderRadius: 8,
    border: '1.5px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '0 10px',
  },
  themeInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  themeTop: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 13,
    fontWeight: 600,
    color: '#0f172a',
  },
  themeLabel: {
    flex: 1,
  },
  themeSub: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 1.4,
  },
  // Error
  errorBox: {
    margin: '0 32px',
    padding: '12px 16px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    fontSize: 13,
    color: '#b91c1c',
  },
  // Footer
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 32px',
    gap: 16,
    flexWrap: 'wrap',
  },
  summary: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: '#475569',
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#22c55e',
    display: 'inline-block',
    flexShrink: 0,
  },
  continueBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '11px 22px',
    background: 'linear-gradient(135deg, #3b5bdb 0%, #1e3a8a 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 9,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    letterSpacing: '-0.1px',
    flexShrink: 0,
  },
  continueBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  skip: {
    marginTop: 20,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  skipLink: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#3b5bdb',
    fontSize: 12,
    padding: 0,
    textDecoration: 'underline',
    fontFamily: 'inherit',
  },
}
