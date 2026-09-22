import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Landmark, Globe, Palette, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'

// ─── Language options ────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en', nativeLabel: 'English',  flag: '🇬🇧', desc: 'Platform content in English' },
  { code: 'hi', nativeLabel: 'हिन्दी',    flag: '🇮🇳', desc: 'प्लेटफ़ॉर्म सामग्री हिंदी में' },
]

// ─── Named color themes — mirrors tokens.css ─────────────────────────────────
const COLOR_THEMES = [
  {
    id: 'abyss',
    label: 'Abyss Theme',
    swatches: ['#5b8dee', '#1e2235', '#2d3561'],
  },
  {
    id: 'cobalt',
    label: 'Cobalt Theme',
    swatches: ['#0088ff', '#1b4f72', '#0d1f2d'],
  },
  {
    id: 'classic',
    label: 'Classic Theme',
    swatches: ['#29aaff', '#ffffff', '#e5e9f0'],
  },
  {
    id: 'forest',
    label: 'Forest Theme',
    swatches: ['#1a6b3a', '#ffffff', '#e8f0ec'],
  },
  {
    id: 'onsen',
    label: 'Onsen Blue',
    swatches: ['#2cd3bf', '#0d1f2d', '#e8f4f3'],
  },
]

export default function FirstTimeSetupPage() {
  const navigate  = useNavigate()
  const { user, updateUserPreferences } = useAuthStore()
  const setTheme  = useUiStore((s) => s.setTheme)

  const [language, setLanguage] = useState(user?.preferences?.language || 'en')
  const [colorTheme, setColorTheme] = useState(() => {
    const stored = user?.preferences?.theme
    const valid  = COLOR_THEMES.find((t) => t.id === stored)
    return valid ? stored : 'abyss'
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  // Preview the theme live as the user selects
  const handleThemeSelect = (id) => {
    setColorTheme(id)
    setTheme(id)   // applies immediately to <html data-theme="...">
  }

  const handleContinue = async () => {
    setSaving(true)
    setError('')
    try {
      await updateUserPreferences({ language, theme: colorTheme, setupCompleted: true })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('Failed to save preferences:', err)
      setError('Could not save preferences. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div style={s.page}>
      {/* ── Brand header ── */}
      <header style={s.header}>
        <div style={s.brandRow}>
          <div style={s.brandIcon}>
            <Landmark size={20} color="#fff" />
          </div>
          <span style={s.brandName}>KaushalAI</span>
        </div>
      </header>

      {/* ── Main card ── */}
      <main style={s.main}>
        <div style={s.card}>

          {/* Card header */}
          <div style={s.cardHead}>
            <span style={s.badge}>Quick Setup</span>
            <h1 style={s.title}>Set up your learning preferences</h1>
            <p style={s.sub}>Personalise your KaushalAI experience. You can change these anytime in Settings.</p>
          </div>

          <div style={s.hr} />

          {/* ── Language ── */}
          <section style={s.sec}>
            <div style={s.secLabel}><Globe size={13} style={{ marginRight: 5 }} />Interface Language</div>
            <div style={s.langGrid}>
              {LANGUAGES.map((l) => {
                const sel = language === l.code
                return (
                  <button key={l.code} type="button" onClick={() => setLanguage(l.code)}
                    style={{ ...s.langCard, ...(sel ? s.langSel : {}) }}>
                    <span style={s.flag}>{l.flag}</span>
                    <div>
                      <div style={s.langName}>{l.nativeLabel}</div>
                      <div style={s.langDesc}>{l.desc}</div>
                    </div>
                    {sel && <CheckCircle2 size={16} style={{ marginLeft: 'auto', color: 'var(--color-primary-600)', flexShrink: 0 }} />}
                  </button>
                )
              })}
            </div>
          </section>

          <div style={s.hr} />

          {/* ── Color Theme ── */}
          <section style={s.sec}>
            <div style={s.secLabel}><Palette size={13} style={{ marginRight: 5 }} />Choose your theme</div>
            <div style={s.themeGrid}>
              {COLOR_THEMES.map((t) => {
                const sel = colorTheme === t.id
                return (
                  <button key={t.id} type="button" onClick={() => handleThemeSelect(t.id)}
                    style={{ ...s.themeCard, ...(sel ? s.themeSel : {}) }}>
                    {/* Radio dot */}
                    <div style={s.radioRow}>
                      <div style={{ ...s.radio, ...(sel ? s.radioSel : {}) }}>
                        {sel && <div style={s.radioDot} />}
                      </div>
                      <span style={{ ...s.themeLabel, ...(sel ? { color: 'var(--color-primary-700)' } : {}) }}>
                        {t.label}
                      </span>
                    </div>
                    {/* Swatch row */}
                    <div style={s.swatchRow}>
                      {t.swatches.map((color, i) => (
                        <div key={i} style={{ ...s.swatch, background: color,
                          border: color === '#ffffff' ? '1px solid #d1d5db' : 'none' }} />
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Error */}
          {error && <div style={s.errBox}>{error}</div>}

          <div style={s.hr} />

          {/* Footer */}
          <div style={s.footer}>
            <div style={s.summary}>
              <span style={s.dot} />
              <span style={{ fontSize: 13, color: '#475569' }}>
                {LANGUAGES.find((l) => l.code === language)?.nativeLabel}
                {' · '}
                {COLOR_THEMES.find((t) => t.id === colorTheme)?.label}
              </span>
            </div>
            <button type="button" disabled={saving} onClick={handleContinue}
              style={{ ...s.btn, ...(saving ? s.btnDis : {}) }}>
              {saving
                ? <><Loader2 size={15} style={{ marginRight: 7, animation: 'spin 1s linear infinite' }} />Saving…</>
                : <>Continue to Dashboard <ArrowRight size={15} style={{ marginLeft: 7 }} /></>
              }
            </button>
          </div>
        </div>

        <p style={s.skipNote}>
          You can update these anytime in{' '}
          <button type="button" style={s.skipLink} onClick={handleContinue} disabled={saving}>
            Settings → Preferences
          </button>
        </p>
      </main>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh',
    background: '#f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  header: {
    padding: '16px 28px',
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
  },
  brandRow:  { display: 'flex', alignItems: 'center', gap: 10 },
  brandIcon: {
    width: 32, height: 32, borderRadius: 8,
    background: 'linear-gradient(135deg,var(--color-primary-600) 0%,var(--color-primary-900) 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  brandName: { fontSize: 16, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.2px' },

  main: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '36px 16px 56px',
  },
  card: {
    width: '100%', maxWidth: 620,
    background: '#fff', borderRadius: 14,
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
    overflow: 'hidden',
  },
  cardHead: { padding: '28px 30px 20px' },
  badge: {
    display: 'inline-block',
    fontSize: 10, fontWeight: 700, letterSpacing: '0.9px',
    textTransform: 'uppercase',
    color: 'var(--color-primary-700)',
    background: 'var(--color-primary-50)',
    borderRadius: 20, padding: '3px 10px', marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.3px' },
  sub:   { fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: 0 },
  hr:    { height: 1, background: '#f1f5f9' },

  sec:      { padding: '22px 30px' },
  secLabel: {
    display: 'flex', alignItems: 'center',
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.9px', color: '#94a3b8', marginBottom: 14,
  },

  // Language
  langGrid: { display: 'flex', flexDirection: 'column', gap: 9 },
  langCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px',
    border: '1.5px solid #e2e8f0', borderRadius: 9,
    background: '#fff', cursor: 'pointer', textAlign: 'left', width: '100%',
    transition: 'border-color .15s, background .15s',
  },
  langSel: { borderColor: 'var(--color-primary-600)', background: 'var(--color-primary-50)' },
  flag:    { fontSize: 22, lineHeight: 1, flexShrink: 0 },
  langName: { fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 1 },
  langDesc: { fontSize: 11, color: '#64748b' },

  // Color Theme grid — 2 columns + 1 centred row for 5 items via auto-fit
  themeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(172px, 1fr))',
    gap: 12,
  },
  themeCard: {
    display: 'flex', flexDirection: 'column', gap: 10,
    padding: '14px 14px 12px',
    border: '1.5px solid #e2e8f0', borderRadius: 10,
    background: '#f8fafc', cursor: 'pointer', textAlign: 'left',
    transition: 'border-color .15s, background .15s',
  },
  themeSel: { borderColor: 'var(--color-primary-600)', background: 'var(--color-primary-50)' },
  radioRow: { display: 'flex', alignItems: 'center', gap: 8 },
  radio: {
    width: 16, height: 16, borderRadius: '50%',
    border: '2px solid #cbd5e1',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  radioSel: { border: '2px solid var(--color-primary-600)' },
  radioDot: {
    width: 7, height: 7, borderRadius: '50%',
    background: 'var(--color-primary-600)',
  },
  themeLabel: { fontSize: 12, fontWeight: 600, color: '#334155' },
  swatchRow:  { display: 'flex', gap: 7, marginTop: 2 },
  swatch: {
    width: 28, height: 28, borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
  },

  // Error
  errBox: {
    margin: '0 30px 16px',
    padding: '10px 14px',
    background: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: 8, fontSize: 13, color: '#b91c1c',
  },

  // Footer
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 30px', gap: 12, flexWrap: 'wrap',
  },
  summary: { display: 'flex', alignItems: 'center', gap: 8 },
  dot: {
    width: 8, height: 8, borderRadius: '50%',
    background: '#22c55e', display: 'inline-block', flexShrink: 0,
  },
  btn: {
    display: 'flex', alignItems: 'center',
    padding: '10px 20px',
    background: 'linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-900) 100%)',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    transition: 'opacity .15s', flexShrink: 0,
  },
  btnDis: { opacity: 0.6, cursor: 'not-allowed' },

  skipNote: { marginTop: 18, fontSize: 12, color: '#94a3b8', textAlign: 'center' },
  skipLink: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--color-primary-700)', fontSize: 12,
    padding: 0, textDecoration: 'underline', fontFamily: 'inherit',
  },
}
