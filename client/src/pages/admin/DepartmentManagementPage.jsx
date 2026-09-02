import { useState } from 'react'
import Badge from '../../components/ui/Badge'

export default function DepartmentManagementPage() {
  const [departments, setDepartments] = useState([
    { id: '1', name: 'Field Operations Division (FOD)', code: 'FOD', location: 'New Delhi / Regional', officersCount: 84, head: 'Additional Director General' },
    { id: '2', name: 'Survey Design and Research Division (SDRD)', code: 'SDRD', location: 'Kolkata, West Bengal', officersCount: 42, head: 'Deputy Director General' },
    { id: '3', name: 'National Accounts Division (NAD)', code: 'NAD', location: 'New Delhi', officersCount: 38, head: 'Additional Director General' },
    { id: '4', name: 'Economic Statistics Division (ESD)', code: 'ESD', location: 'New Delhi', officersCount: 32, head: 'Deputy Director General' },
    { id: '5', name: 'Data Quality Assurance Division (DQAD)', code: 'DQAD', location: 'Kolkata, West Bengal', officersCount: 26, head: 'Director (DQAD)' },
    { id: '6', name: 'National Statistical Systems Training Academy (NSSTA)', code: 'NSSTA', location: 'Greater Noida, UP', officersCount: 18, head: 'Director General (Training)' },
    { id: '7', name: 'State/UT Directorates of Economics & Statistics', code: 'DES', location: 'Pan-India', officersCount: 65, head: 'State DES Directors' },
  ])

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Department &amp; Directorate Management
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            MOSPI divisional structure, regional directorates, and state DES nodes
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert('New division registration modal opens')}
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
          + Add Department
        </button>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Division / Directorate</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Code</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Location</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Designated Head</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Officers Enrolled</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {d.name}
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant="igot">{d.code}</Badge>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)' }}>
                  {d.location}
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                  {d.head}
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold' }}>
                  {d.officersCount} Officers
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
