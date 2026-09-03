import { useQuery } from '@tanstack/react-query'
import { getAdminQuestionsSummary } from '../../api/admin.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function QuestionBankAdminPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['adminQuestionsSummary'],
    queryFn: getAdminQuestionsSummary,
  })

  const total = data?.total || 0
  const byDifficulty = data?.byDifficulty || []
  const byCompetency = data?.byCompetency || []
  const questions = data?.sampleQuestions || []

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Master Question Bank &amp; Item Taxonomy
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Live inventory of validated assessment items generated from official survey manuals and curricula
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
          <Skeleton height="100px" />
          <Skeleton height="100px" />
          <Skeleton height="100px" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
            <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Total Questions in Bank</span>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>
                {total} Items
              </div>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Generated &amp; seeded questions</span>
            </div>

            <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Difficulty Distribution</span>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 6, flexWrap: 'wrap' }}>
                {byDifficulty.map((d) => (
                  <Badge key={d._id || 'unknown'} variant={d._id === 'hard' ? 'high' : d._id === 'medium' ? 'medium' : 'igot'}>
                    {(d._id || 'standard').toUpperCase()}: {d.count}
                  </Badge>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Mapped Competencies</span>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 2 }}>
                {byCompetency.length} Domains
              </div>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Categorized in taxonomy</span>
            </div>
          </div>

          {/* Sample Questions Table */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
            <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)', fontWeight: 'bold', fontSize: 'var(--text-sm)' }}>
              Question Bank Items ({questions.length} Displayed)
            </div>

            {questions.length === 0 ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                No questions recorded in database. Ingest documents to generate items.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Item Question Stem</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Mapped Skill</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Difficulty</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Correct Option</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q, idx) => (
                    <tr key={q._id || idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 500, maxWidth: 450 }}>
                        {q.questionText || q.text}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <Badge variant="igot">{q.competencyTag?.name || 'Official Statistics'}</Badge>
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <Badge variant={q.difficulty === 'hard' ? 'high' : 'medium'}>{q.difficulty || 'medium'}</Badge>
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        Option #{(q.correctOptionIndex ?? 0) + 1}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
