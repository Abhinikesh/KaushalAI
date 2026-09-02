import { useState } from 'react'
import Badge from '../../components/ui/Badge'

export default function IgotIntegrationPage() {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState('Today at 06:00 AM IST')

  const handleSync = () => {
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      setLastSync('Just now (12 new courses updated)')
    }, 1500)
  }

  const logs = [
    { timestamp: '02 Sep 2026, 06:00 AM', event: 'Daily Automated Sync', status: 'Success', items: '42 courses checked, 0 errors' },
    { timestamp: '01 Sep 2026, 06:00 AM', event: 'Daily Automated Sync', status: 'Success', items: '42 courses checked, 0 errors' },
    { timestamp: '31 Aug 2026, 02:15 PM', event: 'Manual Course Ingestion', status: 'Success', items: '3 new NSSTA-tagged modules added' },
  ]

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            iGOT Karmayogi API Integration
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            National Civil Services Portal live sync gateway and courseware ingest pipeline
          </p>
        </div>

        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          style={{
            padding: 'var(--space-2) var(--space-5)',
            background: 'var(--color-primary-600)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {syncing ? '🔄 Syncing iGOT Gateway...' : '🔄 Run Sync Now'}
        </button>
      </div>

      {/* Integration Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Gateway Connection</span>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--color-success)', marginTop: 2 }}>Connected (Online)</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>api.igotkarmayogi.gov.in</span>
        </div>

        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Last Ingestion Sync</span>
          <div style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 2 }}>{lastSync}</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Cadence: Every 24 Hours</span>
        </div>

        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Synced Course Count</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>42 Modules</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>All mapped to MOSPI competencies</span>
        </div>
      </div>

      {/* Sync Logs Table */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold' }}>Recent Gateway Sync Logs</h3>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Timestamp</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Operation</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Status</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Sync Summary</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 11 }}>{l.timestamp}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>{l.event}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant="success">{l.status}</Badge>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 11 }}>{l.items}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
