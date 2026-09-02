import { useState } from 'react'
import { Link } from 'react-router-dom'
import Badge from '../../components/ui/Badge'

export default function JobRoleManagementPage() {
  const [jobRoles] = useState([
    { id: '1', title: 'Statistical Assistant', cadre: 'SSS Junior', compsCount: 6, minLevel: 2, desc: 'Entry cadre executing field schedules, preliminary data cleaning, and questionnaire administration.' },
    { id: '2', title: 'Statistical Officer', cadre: 'SSS Senior', compsCount: 8, minLevel: 3, desc: 'Core supervisory cadre conducting survey sampling supervision, statistical validation, and district coordination.' },
    { id: '3', title: 'Senior Statistical Officer', cadre: 'SSS Gazetted', compsCount: 10, minLevel: 4, desc: 'Senior officer managing regional survey operations, complex tabulation, and quality audit checks.' },
    { id: '4', title: 'Assistant Director (ISS)', cadre: 'ISS Junior Time Scale', compsCount: 12, minLevel: 4, desc: 'Directs divisional statistical projects, national accounts compilation, and survey methodology design.' },
    { id: '5', title: 'Deputy Director (ISS)', cadre: 'ISS Senior Time Scale', compsCount: 14, minLevel: 5, desc: 'Oversees nationwide surveys, inter-ministerial statistical registers, and international data harmonization.' },
    { id: '6', title: 'Director / State DES Head', cadre: 'Higher Administrative', compsCount: 15, minLevel: 5, desc: 'Executive leadership guiding state statistical policies, macro indicator frameworks, and administrative registers.' },
  ])

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Cadre Job Role Management
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Official positions across Subordinate Statistical Service (SSS) and Indian Statistical Service (ISS)
          </p>
        </div>

        <Link
          to="/admin/role-competency-matrix"
          style={{
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--color-primary-600)',
            color: 'white',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          View Role–Competency Matrix →
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
        {jobRoles.map((r) => (
          <div
            key={r.id}
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
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                {r.title}
              </h3>
              <Badge variant="igot">{r.cadre}</Badge>
            </div>

            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5, flex: 1 }}>
              {r.desc}
            </p>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--color-text-secondary)' }}>
              <span>Required Standards: <strong>{r.compsCount} Competencies</strong></span>
              <span>Min Target: <strong>L{r.minLevel}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
