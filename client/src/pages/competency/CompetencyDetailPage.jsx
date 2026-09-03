import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { getCompetencies, getMyCompetencies, updateMyCompetency } from '../../api/competency.api'
import { listCourses } from '../../api/course.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

export default function CompetencyDetailPage() {
  const { id } = useParams()
  const [competency, setCompetency] = useState(null)
  const [currentLevel, setCurrentLevel] = useState(1)
  const [linkedCourses, setLinkedCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)

    Promise.all([
      getCompetencies().catch(() => ({ competencies: [] })),
      getMyCompetencies().catch(() => ({ competencies: [] })),
      listCourses().catch(() => ({ courses: [] })),
    ])
      .then(([allRes, myRes, coursesRes]) => {
        if (!mounted) return
        const allList = allRes.competencies || allRes || []
        const found = allList.find((c) => String(c._id) === String(id))
        setCompetency(found || null)

        const myList = myRes.competencies || myRes || []
        const userComp = myList.find((uc) => {
          const compId = uc.competencyId?._id || uc.competencyId || uc._id
          return String(compId) === String(id)
        })
        if (userComp) {
          setCurrentLevel(userComp.currentLevel || 1)
        }

        const coursesList = coursesRes.courses || coursesRes || []
        const related = coursesList.filter((crs) => {
          if (!crs.skillTags) return false
          return crs.skillTags.some((tag) => {
            const tagId = typeof tag === 'object' ? tag._id : tag
            return String(tagId) === String(id)
          })
        })
        setLinkedCourses(related)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => { mounted = false }
  }, [id])

  const handleLevelChange = async (lvl) => {
    try {
      setSaving(true)
      await updateMyCompetency(id, lvl)
      setCurrentLevel(lvl)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <Skeleton.Card />
        <Skeleton.Card />
      </div>
    )
  }

  if (!competency) {
    return (
      <EmptyState
        icon="🔍"
        title="Competency not found"
        description="The requested competency could not be found in the official registry."
        action="Back to Competencies"
        onAction={() => window.history.back()}
      />
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <Link
          to="/skills"
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--color-primary-600)',
            textDecoration: 'none',
          }}
        >
          ← Back to Skills &amp; Competencies
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            {competency.name}
          </h1>
          <Badge variant={competency.category === 'domain' ? 'igot' : competency.category === 'technical' ? 'nssta' : 'neutral'}>
            {competency.category}
          </Badge>
        </div>
      </div>

      {/* Main Details Card */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <div>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Description &amp; Official Standard
          </span>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', marginTop: 4, lineHeight: 1.6 }}>
            {competency.description || 'Core official capability required for national statistical survey execution, data collection, and processing standards.'}
          </p>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Current Proficiency Level:
            </span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-primary-600)' }}>
              {saving ? 'Updating...' : `Level ${currentLevel} of 5`}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => handleLevelChange(lvl)}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: 'var(--space-2) 0',
                  borderRadius: 'var(--radius-lg)',
                  border: currentLevel >= lvl ? '1.5px solid var(--color-primary-600)' : '1px solid var(--color-border)',
                  background: currentLevel >= lvl ? 'var(--color-primary-600)' : 'var(--color-surface-alt)',
                  color: currentLevel >= lvl ? 'white' : 'var(--color-text-secondary)',
                  fontWeight: 600,
                  fontSize: 'var(--text-xs)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Level {lvl}
              </button>
            ))}
          </div>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 6 }}>
            Click any level above to immediately update your self-assessment.
          </span>
        </div>
      </div>

      {/* Proficiency Level Rubric (Curriculum Standards) */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <div>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: 0 }}>
            Curriculum Proficiency Rubric &amp; Level Standards
          </h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Official capability descriptors from the National Statistical Systems Training Framework
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)' }}>
          {/* Beginner / Foundational */}
          <div
            style={{
              background: currentLevel === 2 ? 'rgba(99, 102, 241, 0.06)' : 'var(--color-surface-alt)',
              border: currentLevel === 2 ? '1.5px solid var(--color-primary-600)' : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--color-primary-600)' }}>
                Level 2 • Beginner
              </span>
              {currentLevel === 2 && <Badge variant="igot">Current Level</Badge>}
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-primary)', lineHeight: 1.5, margin: 0 }}>
              {competency.levelDescriptions?.beginner || 'Foundational conceptual understanding, terminology recognition, and supervised task participation.'}
            </p>
          </div>

          {/* Intermediate / Operational */}
          <div
            style={{
              background: currentLevel === 3 ? 'rgba(99, 102, 241, 0.06)' : 'var(--color-surface-alt)',
              border: currentLevel === 3 ? '1.5px solid var(--color-primary-600)' : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--color-primary-600)' }}>
                Level 3 • Intermediate
              </span>
              {currentLevel === 3 && <Badge variant="igot">Current Level</Badge>}
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-primary)', lineHeight: 1.5, margin: 0 }}>
              {competency.levelDescriptions?.intermediate || 'Independent routine task execution, analytical interpretation, and practical methodology application.'}
            </p>
          </div>

          {/* Advanced / Mastery */}
          <div
            style={{
              background: currentLevel >= 4 ? 'rgba(99, 102, 241, 0.06)' : 'var(--color-surface-alt)',
              border: currentLevel >= 4 ? '1.5px solid var(--color-primary-600)' : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--color-primary-600)' }}>
                Level 4 • Advanced
              </span>
              {currentLevel >= 4 && <Badge variant="igot">Current Level</Badge>}
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-primary)', lineHeight: 1.5, margin: 0 }}>
              {competency.levelDescriptions?.advanced || 'Methodological leadership, complex problem solving, quality assurance evaluation, and institutional oversight.'}
            </p>
          </div>
        </div>
      </div>

      {/* Linked Courses Section */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
        }}
      >
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)' }}>
          Training Courses Covering This Competency ({linkedCourses.length})
        </h3>

        {linkedCourses.length === 0 ? (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            No specific training course is tagged with this competency yet. You can find related materials on iGOT Karmayogi.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {linkedCourses.map((c) => (
              <div
                key={c._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-surface-alt)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {c.title}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginTop: 2 }}>
                    <Badge variant={c.source === 'igot' ? 'igot' : 'nssta'}>
                      {c.source === 'igot' ? 'iGOT' : 'NSSTA'}
                    </Badge>
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                      ⏱ {c.durationHours || 10} hrs • {c.difficulty || 'Intermediate'}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/courses/${c._id}`}
                  style={{
                    padding: 'var(--space-1) var(--space-3)',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    color: 'var(--color-primary-600)',
                    textDecoration: 'none',
                  }}
                >
                  View Details →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
