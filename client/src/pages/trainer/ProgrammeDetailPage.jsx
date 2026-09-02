import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listCourses } from '../../api/course.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

export default function ProgrammeDetailPage() {
  const { id } = useParams()
  const [tab, setTab] = useState('learners')

  const { data, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => listCourses(),
  })

  const courses = data?.courses || data || []
  const programme = courses.find((c) => String(c._id) === String(id)) || {
    _id: id,
    title: 'National Statistical Quality Assurance and Audit Framework',
    source: 'nssta',
    durationHours: 30,
    difficulty: 'intermediate',
    description: 'Comprehensive capacity building on MOSPI data quality guidelines, audit checklists, and fieldwork oversight standards.',
  }

  const sampleLearners = [
    { id: '1', name: 'Rajesh Sharma', email: 'rajesh.sharma@mospi.gov.in', dept: 'FOD Delhi', progress: 85, score: '88%' },
    { id: '2', name: 'Sunita Verma', email: 'sunita.verma@mospi.gov.in', dept: 'SDRD Kolkata', progress: 100, score: '92%' },
    { id: '3', name: 'Amitabh Sen', email: 'amitabh.sen@mospi.gov.in', dept: 'DES West Bengal', progress: 60, score: '74%' },
    { id: '4', name: 'Kavita Patel', email: 'kavita.patel@mospi.gov.in', dept: 'NAD New Delhi', progress: 40, score: 'Pending' },
  ]

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <Skeleton.Card />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <Link to="/trainer/programmes" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Programmes
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            {programme.title}
          </h1>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Badge variant={programme.source === 'nssta' ? 'nssta' : 'igot'}>
              {programme.source === 'nssta' ? 'NSSTA' : 'iGOT'}
            </Badge>
            <Badge variant="success">Active Batch</Badge>
          </div>
        </div>
      </div>

      {/* Programme Metadata Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Enrolled Officers</span>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>{sampleLearners.length} Officers</div>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Duration</span>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 2 }}>{programme.durationHours || 30} Hours</div>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Avg. Attendance</span>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--color-success)', marginTop: 2 }}>94.2%</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button
          type="button"
          onClick={() => setTab('learners')}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-full)',
            border: tab === 'learners' ? '1px solid var(--color-primary-600)' : '1px solid var(--color-border)',
            background: tab === 'learners' ? 'var(--color-primary-600)' : 'var(--color-surface)',
            color: tab === 'learners' ? 'white' : 'var(--color-text-secondary)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Enrolled Learners ({sampleLearners.length})
        </button>

        <button
          type="button"
          onClick={() => setTab('syllabus')}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-full)',
            border: tab === 'syllabus' ? '1px solid var(--color-primary-600)' : '1px solid var(--color-border)',
            background: tab === 'syllabus' ? 'var(--color-primary-600)' : 'var(--color-surface)',
            color: tab === 'syllabus' ? 'white' : 'var(--color-text-secondary)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Curriculum &amp; Modules
        </button>
      </div>

      {tab === 'learners' ? (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Officer</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Division</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Progress</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Assessment Score</th>
              </tr>
            </thead>
            <tbody>
              {sampleLearners.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{l.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{l.email}</div>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)' }}>
                    {l.dept}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 6, background: 'var(--color-gray-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div style={{ width: `${l.progress}%`, height: '100%', background: l.progress === 100 ? 'var(--color-success)' : 'var(--color-primary-600)' }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{l.progress}%</span>
                    </div>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'bold' }}>
                    {l.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold' }}>Curriculum Structure</h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            {programme.description}
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <Link
              to="/trainer/quiz-builder"
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
              🛠️ Build Assessment Quiz for this Programme
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
