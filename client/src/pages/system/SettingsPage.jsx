import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'

export default function SettingsPage() {
  const { user } = useAuthStore()

  const [settings, setSettings] = useState({
    courseAlerts: true,
    quizReminders: true,
    weeklyDigest: false,
    theme: 'light',
    language: 'en',
  })
  const [saved, setSaved] = useState(false)

  const toggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  const handleSave = (e) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Account Preferences &amp; Settings
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Manage your notification channels, regional language preferences, and interface display options
        </p>
      </div>

      {saved && (
        <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-lg)', color: '#065f46', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
          ✓ Preferences saved successfully.
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {/* Notification Preferences */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Notification Channels
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>Course Recommendation Alerts</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Receive notification when new courses match your skill gaps</div>
              </div>
              <input type="checkbox" checked={settings.courseAlerts} onChange={() => toggle('courseAlerts')} style={{ width: 18, height: 18, accentColor: 'var(--color-primary-600)' }} />
            </label>

            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>Assessment &amp; Quiz Reminders</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Get reminder alerts for pending evaluations and level tests</div>
              </div>
              <input type="checkbox" checked={settings.quizReminders} onChange={() => toggle('quizReminders')} style={{ width: 18, height: 18, accentColor: 'var(--color-primary-600)' }} />
            </label>

            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>Weekly Cadre Capacity Digest</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Summary of your weekly learning hours and streak progress</div>
              </div>
              <input type="checkbox" checked={settings.weeklyDigest} onChange={() => toggle('weeklyDigest')} style={{ width: 18, height: 18, accentColor: 'var(--color-primary-600)' }} />
            </label>
          </div>
        </div>

        {/* Regional & Language Preferences */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Language &amp; Region
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Interface Language
              </label>
              <select
                value={settings.language}
                onChange={(e) => setSettings((p) => ({ ...p, language: e.target.value }))}
                style={{ width: '100%', marginTop: 4, padding: 'var(--space-2) var(--space-3)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', fontSize: 'var(--text-sm)' }}
              >
                <option value="en">English (Official Government Standard)</option>
                <option value="hi">हिंदी (Hindi)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Timezone
              </label>
              <input
                type="text"
                value="Asia/Kolkata (IST, UTC+05:30)"
                disabled
                style={{ width: '100%', marginTop: 4, padding: 'var(--space-2) var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-alt)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}
              />
            </div>
          </div>
        </div>

        {/* Security & Password */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Account Security
          </h3>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>Two-Factor &amp; Roster Auth</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                Account protected by Officer Roster Verification ID ({user?.employeeId || 'DEMO-002'})
              </div>
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 'bold' }}>✓ Protected</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            style={{
              padding: 'var(--space-3) var(--space-6)',
              background: 'var(--color-primary-600)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  )
}
