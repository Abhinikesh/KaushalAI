import { useState } from 'react'
import Badge from '../../components/ui/Badge'

export default function NsstaManagementPage() {
  const [batches] = useState([
    { id: 'b1', name: 'Survey Sampling Techniques & Field Auditing', dates: '15 Sep – 19 Sep 2026', campus: 'Greater Noida Campus', seats: '35 / 40 Booked', status: 'Scheduled' },
    { id: 'b2', name: 'National Accounts Statistics Workshop', dates: '06 Oct – 10 Oct 2026', campus: 'Greater Noida Campus', seats: '28 / 35 Booked', status: 'Nominations Open' },
    { id: 'b3', name: 'Price Indices & Base Year Revisions (TPAC)', dates: '20 Oct – 24 Oct 2026', campus: 'Virtual / Online', seats: '65 / 80 Booked', status: 'Nominations Open' },
  ])

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            NSSTA Academy &amp; TPAC Administration
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Greater Noida training academy residential batches, physical logistics, and faculty deployment
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert('New batch scheduling form opens')}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--color-primary-600)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Schedule New Batch
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-5)' }}>
        {batches.map((b) => (
          <div
            key={b.id}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Badge variant="nssta">NSSTA Official</Badge>
              <Badge variant={b.status === 'Scheduled' ? 'success' : 'igot'}>{b.status}</Badge>
            </div>

            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
              {b.name}
            </h3>

            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span>📅 {b.dates}</span>
              <span>🏛️ {b.campus}</span>
              <span>👥 Capacity: <strong>{b.seats}</strong></span>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => alert('Nomination roster downloaded')}
                style={{ padding: '3px 10px', background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
              >
                Download Roster
              </button>
              <button
                type="button"
                onClick={() => alert('Batch settings opened')}
                style={{ padding: '3px 10px', background: 'var(--color-primary-600)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
              >
                Manage Logistics →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
