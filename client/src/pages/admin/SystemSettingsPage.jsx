import { useState } from 'react'

export default function SystemSettingsPage() {
  const [allowedDomains, setAllowedDomains] = useState('mospi.gov.in, gov.in, nic.in, gmail.com')
  const [sessionTimeout, setSessionTimeout] = useState(1440)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = (e) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{ maxWidth: 850, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Global Platform System Settings
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Master configuration parameters for email domains, session duration, and platform maintenance
        </p>
      </div>

      {saved && (
        <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-lg)', color: '#065f46', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
          ✓ Master settings saved successfully.
        </div>
      )}

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Authorized Email Domains (Comma-separated)
            </label>
            <input
              type="text"
              value={allowedDomains}
              onChange={(e) => setAllowedDomains(e.target.value)}
              style={{ width: '100%', marginTop: 4, padding: 'var(--space-2) var(--space-3)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-sm)' }}
            />
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              Officers registering with these email domains will be verified against the Officer Roster.
            </span>
          </div>

          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Session Idle Timeout (Minutes)
            </label>
            <input
              type="number"
              min="30"
              max="10080"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(Number(e.target.value))}
              style={{ width: '100%', marginTop: 4, padding: 'var(--space-2) var(--space-3)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-sm)' }}
            />
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Current: 1440 minutes (24 Hours)</span>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                System Maintenance Mode
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                Temporarily restrict officer access for database migration or scheduled maintenance
              </div>
            </div>

            <input
              type="checkbox"
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
              style={{ width: 20, height: 20, accentColor: 'var(--color-primary-600)' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <button
              type="submit"
              style={{
                padding: 'var(--space-2) var(--space-6)',
                background: 'var(--color-primary-600)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Save Master Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
