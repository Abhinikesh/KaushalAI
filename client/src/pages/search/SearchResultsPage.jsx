import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listCourses } from '../../api/course.api'
import { getCompetencies } from '../../api/competency.api'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''

  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: () => listCourses(),
  })

  const { data: compData } = useQuery({
    queryKey: ['competencies'],
    queryFn: () => getCompetencies(),
  })

  const courses = coursesData?.courses || coursesData || []
  const competencies = compData?.competencies || compData || []

  const matchingCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.description?.toLowerCase().includes(query.toLowerCase())
  )

  const matchingCompetencies = competencies.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.description?.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Search Results: &ldquo;{query}&rdquo;
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Found {matchingCourses.length} matching courses and {matchingCompetencies.length} competency standards
        </p>
      </div>

      {/* Courses Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold' }}>
          Courses &amp; Training Programmes ({matchingCourses.length})
        </h2>
        {matchingCourses.length === 0 ? (
          <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            No courses found matching &ldquo;{query}&rdquo;.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
            {matchingCourses.map((c) => (
              <Card key={c._id} style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Badge variant={c.source === 'igot' ? 'igot' : 'nssta'}>{c.source.toUpperCase()}</Badge>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>⏱ {c.durationHours || 15}h</span>
                </div>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                  {c.title}
                </h3>
                <Link to={`/courses/${c._id}`} style={{ marginTop: 'auto', fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', textDecoration: 'none', fontWeight: 600 }}>
                  View Course Details →
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Competencies Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold' }}>
          Official Competency Standards ({matchingCompetencies.length})
        </h2>
        {matchingCompetencies.length === 0 ? (
          <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            No competencies found matching &ldquo;{query}&rdquo;.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {matchingCompetencies.map((comp) => (
              <div key={comp._id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{comp.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{comp.description || 'Standard framework skill'}</div>
                </div>
                <Link to={`/competencies/${comp._id}`} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', textDecoration: 'none', fontWeight: 600 }}>
                  View Analysis →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
