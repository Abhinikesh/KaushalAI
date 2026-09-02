import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Badge from '../../components/ui/Badge'

export default function AiQuizBuilderPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('Official Survey Sampling Competency Evaluation')
  const [programme, setProgramme] = useState('Foundations of Official Statistics')
  const [durationMins, setDurationMins] = useState(15)
  const [passScore, setPassScore] = useState(60)
  const [randomize, setRandomize] = useState(true)
  const [selectedQuestions, setSelectedQuestions] = useState(['q1', 'q2', 'q3', 'q4'])
  const [publishing, setPublishing] = useState(false)

  const bankQuestions = [
    { id: 'q1', text: 'What is the First Stage Unit in rural NSSO survey sampling?', tag: 'Sampling', diff: 'Intermediate' },
    { id: 'q2', text: 'Which parameter determines estimator precision in probability sampling?', tag: 'Sampling', diff: 'Beginner' },
    { id: 'q3', text: 'What is the role of NQAF data validation rules in electronic survey capture?', tag: 'Data Quality', diff: 'Intermediate' },
    { id: 'q4', text: 'Formula used for official elementary aggregate CPI compilation in India?', tag: 'Indices', diff: 'Advanced' },
    { id: 'q5', text: 'Difference between Census and Large-scale Sample Survey regarding non-sampling errors?', tag: 'Methodology', diff: 'Intermediate' },
    { id: 'q6', text: 'Definition of Gross Value Added (GVA) at basic prices in National Accounts?', tag: 'National Accounts', diff: 'Advanced' },
  ]

  const toggleQuestion = (id) => {
    setSelectedQuestions((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
    )
  }

  const handlePublish = (e) => {
    e.preventDefault()
    setPublishing(true)
    setTimeout(() => {
      setPublishing(false)
      navigate('/trainer/assessments')
    }, 800)
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            AI Quiz Builder Studio
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Assemble and publish timed competency assessment evaluations for training batches
          </p>
        </div>
      </div>

      <form onSubmit={handlePublish} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {/* Settings Card */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Evaluation Configuration
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Assessment Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{ width: '100%', marginTop: 4, padding: 'var(--space-2) var(--space-3)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-sm)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Linked Programme
              </label>
              <select
                value={programme}
                onChange={(e) => setProgramme(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: 'var(--space-2) var(--space-3)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-sm)' }}
              >
                <option value="Foundations of Official Statistics">Foundations of Official Statistics</option>
                <option value="National Quality Assurance Framework (NQAF)">National Quality Assurance Framework (NQAF)</option>
                <option value="National Accounts Statistics">National Accounts Statistics Workshop</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Time Limit (Minutes)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={durationMins}
                onChange={(e) => setDurationMins(Number(e.target.value))}
                style={{ width: '100%', marginTop: 4, padding: 'var(--space-2) var(--space-3)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-sm)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Passing Score (%)
              </label>
              <input
                type="number"
                min="40"
                max="100"
                value={passScore}
                onChange={(e) => setPassScore(Number(e.target.value))}
                style={{ width: '100%', marginTop: 4, padding: 'var(--space-2) var(--space-3)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-sm)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
            <input
              type="checkbox"
              id="randCheck"
              checked={randomize}
              onChange={(e) => setRandomize(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--color-primary-600)' }}
            />
            <label htmlFor="randCheck" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
              Randomize question order and options for each officer attempt
            </label>
          </div>
        </div>

        {/* Question Picker */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <div>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                Select Questions from Bank ({selectedQuestions.length} selected)
              </h3>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                Check items to include in this quiz evaluation
              </span>
            </div>

            <Link to="/trainer/question-bank" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', fontWeight: 600, textDecoration: 'none' }}>
              + Add from Question Bank
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {bankQuestions.map((q) => {
              const isSelected = selectedQuestions.includes(q.id)
              return (
                <label
                  key={q.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    borderRadius: 'var(--radius-lg)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'var(--color-surface-alt)',
                    border: isSelected ? '1.5px solid var(--color-primary-600)' : '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleQuestion(q.id)}
                    style={{ width: 18, height: 18, accentColor: 'var(--color-primary-600)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', fontWeight: isSelected ? 600 : 400 }}>
                      {q.text}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>Tag: {q.tag}</span>
                      <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>•</span>
                      <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>{q.diff}</span>
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
          <button
            type="submit"
            disabled={publishing || selectedQuestions.length === 0}
            style={{
              padding: 'var(--space-3) var(--space-6)',
              background: 'var(--color-primary-600)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {publishing ? 'Publishing Assessment...' : `Publish Quiz (${selectedQuestions.length} Questions)`}
          </button>
        </div>
      </form>
    </div>
  )
}
