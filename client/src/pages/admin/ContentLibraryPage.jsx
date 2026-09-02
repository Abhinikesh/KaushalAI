import { useState } from 'react'
import Badge from '../../components/ui/Badge'

export default function ContentLibraryPage() {
  const [search, setSearch] = useState('')

  const docs = [
    { title: 'NSSO 79th Round Instructions to Field Staff (SDRD)', category: 'Manual', division: 'SDRD', size: '14.2 MB', updated: '15 Aug 2026' },
    { title: 'National Quality Assurance Framework (UN NQAF Guidelines)', category: 'Standard', division: 'DQAD', size: '6.8 MB', updated: '02 Jul 2026' },
    { title: 'National Accounts Statistics: Concepts & Sources 2024', category: 'Manual', division: 'NAD', size: '28.5 MB', updated: '10 May 2026' },
    { title: 'CPI Elementary Aggregates Compilation Handbook', category: 'Guide', division: 'ESD', size: '4.1 MB', updated: '20 Jun 2026' },
    { title: 'Periodic Labour Force Survey (PLFS) Sample Design Manual', category: 'Manual', division: 'FOD', size: '9.4 MB', updated: '12 Jul 2026' },
  ]

  const filtered = docs.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()) || d.division.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Digital Statistical Content Library
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Official survey manuals, concepts &amp; definitions handbooks, and instructional curricula
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.location.assign('/trainer/upload')}
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
          + Ingest New Document
        </button>
      </div>

      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-4) var(--space-5)',
        }}
      >
        <input
          type="text"
          placeholder="Search content library by keyword or division code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--color-border)',
            fontSize: 'var(--text-sm)',
          }}
        />
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Document Title</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Type</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Division</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>File Size</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Updated</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  📄 {d.title}
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant="igot">{d.category}</Badge>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 500 }}>{d.division}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 11 }}>{d.size}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 11 }}>{d.updated}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <button
                    type="button"
                    onClick={() => alert(`Downloading: ${d.title}`)}
                    style={{ padding: '3px 8px', background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 11, cursor: 'pointer', fontWeight: 600, color: 'var(--color-primary-600)' }}
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
