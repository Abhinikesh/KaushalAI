import { useState } from 'react'
import Badge from '../../components/ui/Badge'

export default function SkillTaxonomyPage() {
  const [tags] = useState([
    { id: '1', name: 'Survey Sampling', category: 'Domain', coursesCount: 14, synonyms: 'Stratified sampling, PPS sampling, cluster design, multistage', status: 'Embedded' },
    { id: '2', name: 'National Accounts', category: 'Domain', coursesCount: 10, synonyms: 'GVA, GDP, supply-use tables, capital formation', status: 'Embedded' },
    { id: '3', name: 'NQAF Data Quality', category: 'Domain', coursesCount: 8, synonyms: 'UN NQAF, validation rules, field audits, error mitigation', status: 'Embedded' },
    { id: '4', name: 'Index Numbers (CPI/IIP)', category: 'Domain', coursesCount: 7, synonyms: 'Laspeyres, Paasche, elementary aggregates, base year revision', status: 'Embedded' },
    { id: '5', name: 'R & Python for Statistics', category: 'Technical', coursesCount: 12, synonyms: 'tidyverse, pandas, survey package, statistical analysis', status: 'Embedded' },
    { id: '6', name: 'Database Management & SQL', category: 'Technical', coursesCount: 9, synonyms: 'PostgreSQL, relational tables, microdata queries', status: 'Embedded' },
    { id: '7', name: 'Fieldwork Team Leadership', category: 'Behavioral', coursesCount: 5, synonyms: 'Supervisory oversight, investigator motivation, dispute resolution', status: 'Embedded' },
  ])

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            AI Skill Taxonomy &amp; Semantic Tags
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Keyword clusters and semantic vector tags powering AI course recommendations
          </p>
        </div>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Skill Taxonomy Tag</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Classification</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Semantic Synonyms / Keyword Cluster</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Mapped Courses</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>AI Index Status</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((t) => (
              <tr key={t.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {t.name}
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant={t.category === 'Domain' ? 'igot' : t.category === 'Technical' ? 'nssta' : 'neutral'}>
                    {t.category}
                  </Badge>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 11, maxWidth: 360 }}>
                  {t.synonyms}
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold' }}>
                  {t.coursesCount} Courses
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant="success">✓ {t.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
