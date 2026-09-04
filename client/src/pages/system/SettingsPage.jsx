import { useState, useEffect } from 'react'
import { Check, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { updatePreferences } from '../../api/userFeatures.api'
import Button from '../../components/ui/Button'

export default function SettingsPage() {
  const { user, setAuth, accessToken } = useAuthStore()

  const [settings, setSettings] = useState({
    courseAlerts: true,
    quizReminders: true,
    weeklyDigest: false,
    theme: 'light',
    language: 'en',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.preferences) {
      setSettings((prev) => ({
        ...prev,
        ...user.preferences,
      }))
    }
  }, [user])

  const toggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
    setError('')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await updatePreferences(settings)
      if (res.user) {
        setAuth(res.user, accessToken)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to persist preferences.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Account Preferences &amp; Settings
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Manage your notification channels, language, and display options with persistent cloud sync
        </p>
      </div>

      {saved && (
        <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-lg)', color: '#065f46', fontSize: 'var(--text-sm)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Check size={14} strokeWidth={2.5} />
          <span>Preferences saved to official profile.</span>
        </div>
      )}

      {error && (
        <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-lg)', color: 'var(--color-error)', fontSize: 'var(--text-sm)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {/* Notification Preferences */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Notification Preferences
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>Course Recommendation Alerts</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Receive notification when new courses match your priority skill gaps</div>
              </div>
              <input type="checkbox" checked={settings.courseAlerts} onChange={() => toggle('courseAlerts')} style={{ width: 18, height: 18, accentColor: 'var(--color-primary-600)' }} />
            </label>

            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>Assessment &amp; Evaluation Reminders</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Remind me when new cadre evaluations or quizzes are scheduled</div>
              </div>
              <input type="checkbox" checked={settings.quizReminders} onChange={() => toggle('quizReminders')} style={{ width: 18, height: 18, accentColor: 'var(--color-primary-600)' }} />
            </label>

            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>Weekly Digest</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Weekly summary of learning progress and hours completed</div>
              </div>
              <input type="checkbox" checked={settings.weeklyDigest} onChange={() => toggle('weeklyDigest')} style={{ width: 18, height: 18, accentColor: 'var(--color-primary-600)' }} />
            </label>
          </div>
        </div>

        {/* Language Preference */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Language Preference
          </h3>

          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
              <input
                type="radio"
                name="language"
                value="en"
                checked={settings.language === 'en'}
                onChange={() => setSettings((p) => ({ ...p, language: 'en' }))}
                style={{ accentColor: 'var(--color-primary-600)' }}
              />
              English (Official)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
              <input
                type="radio"
                name="language"
                value="hi"
                checked={settings.language === 'hi'}
                onChange={() => setSettings((p) => ({ ...p, language: 'hi' }))}
                style={{ accentColor: 'var(--color-primary-600)' }}
              />
              हिन्दी (Hindi)
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" loading={saving}>
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  )
}
