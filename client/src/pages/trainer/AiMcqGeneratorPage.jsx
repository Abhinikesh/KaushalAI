import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import Badge from '../../components/ui/Badge'

export default function AiMcqGeneratorPage() {
  const navigate = useNavigate()
  const [sourceType, setSourceType] = useState('doc')
  const [questionCount, setQuestionCount] = useState(5)
  const [difficulty, setDifficulty] = useState('mixed')
  const [competency, setCompetency] = useState('Survey Sampling Techniques')
  const [textContent, setTextContent] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState(null)

  const handleGenerate = (e) => {
    e.preventDefault()
    setGenerating(true)
    setTimeout(() => {
      setGenerating(false)
      setGeneratedQuestions([
        {
          id: 'gen-1',
          text: 'Under the National Quality Assurance Framework (NQAF), what is the primary role of data validation rules in field surveys?',
          options: [
            'To automatically recalculate sampling weights',
            'To identify logical inconsistencies and outliers during data capture',
            'To format aggregate tables for press releases',
            'To estimate non-response bias post-stratification',
          ],
          correct: 1,
          difficulty: 'Intermediate',
          explanation: 'Data validation rules at the point of capture ensure consistency and integrity of raw microdata before tabulation.',
        },
        {
          id: 'gen-2',
          text: 'In multistage cluster sampling for NSSO socioeconomic rounds, what constitutes the First Stage Unit (FSU) in rural areas?',
          options: [
            'Individual households',
            'Census Villages (or Panchayats)',
            'Enumeration Blocks (EB)',
            'Revenue districts',
          ],
          correct: 1,
          difficulty: 'Intermediate',
          explanation: 'In rural sectors, census villages are defined as the First Stage Units (FSUs) based on the latest decennial census list.',
        },
        {
          id: 'gen-3',
          text: 'Which parameter determines the precision of an estimator in probability sampling?',
          options: [
            'Total population size alone',
            'Standard error of the estimator',
            'Number of enumerators deployed',
            'Length of the survey questionnaire',
          ],
          correct: 1,
          difficulty: 'Beginner',
          explanation: 'Precision is inversely related to standard error; lower standard error indicates higher precision.',
        },
        {
          id: 'gen-4',
          text: 'When calculating the Consumer Price Index (CPI), which index formula is officially utilized for commodity basket aggregation at the elementary level?',
          options: [
            'Jevons Geometric Mean Index',
            'Laspeyres Modified Fixed Base Index',
            'Paasche Current Weighted Index',
            'Fisher Ideal Index',
          ],
          correct: 1,
          difficulty: 'Advanced',
          explanation: 'MOSPI uses the modified Laspeyres formula with base period expenditure weights for official CPI compilation.',
        },
        {
          id: 'gen-5',
          text: 'What does the abbreviation NQAF stand for in official statistical auditing?',
          options: [
            'National Quantitative Assessment Form',
            'National Quality Assurance Framework',
            'National Questionnaire Administration Forum',
            'National Quality Auditing Frequency',
          ],
          correct: 1,
          difficulty: 'Beginner',
          explanation: 'NQAF stands for the National Quality Assurance Framework aligned with UN standards.',
        },
      ])
    }, 1500)
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            AI MCQ Generator Studio
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Extract grounded multiple-choice questions from official statistical manuals and documents
          </p>
        </div>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Source Training Material
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: 'var(--space-2) var(--space-3)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', fontSize: 'var(--text-sm)' }}
              >
                <option value="doc">Uploaded Manual: NSSO 79th Round Instruction to Field Staff.pdf</option>
                <option value="doc2">Uploaded Manual: National Accounts Concepts &amp; Sources 2024.pdf</option>
                <option value="doc3">Uploaded Presentation: Survey Sampling Variance Estimation.pptx</option>
                <option value="raw">Custom Text / Manual Excerpt</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Target Competency Tag
              </label>
              <select
                value={competency}
                onChange={(e) => setCompetency(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: 'var(--space-2) var(--space-3)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', fontSize: 'var(--text-sm)' }}
              >
                <option value="Survey Sampling Techniques">Survey Sampling Techniques</option>
                <option value="National Accounts">National Accounts &amp; Macro Aggregates</option>
                <option value="Data Quality (NQAF)">Data Quality &amp; NQAF Framework</option>
                <option value="Index Numbers">Index Numbers Compilation (CPI / IIP)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Number of Questions: <strong>{questionCount}</strong>
              </label>
              <input
                type="range"
                min="3"
                max="20"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                style={{ width: '100%', marginTop: 8, accentColor: 'var(--color-primary-600)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Difficulty Mix
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: 'var(--space-2) var(--space-3)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', fontSize: 'var(--text-sm)' }}
              >
                <option value="mixed">Mixed (Balanced Foundation to Advanced)</option>
                <option value="beginner">Beginner Focus (Induction Cadre)</option>
                <option value="advanced">Advanced Focus (Senior Officers)</option>
              </select>
            </div>
          </div>

          {sourceType === 'raw' && (
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Paste Manual Excerpt or Text
              </label>
              <textarea
                rows={4}
                className="input"
                placeholder="Paste relevant sections from statistical guidelines..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: 'var(--space-3)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-sm)' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <button
              type="submit"
              disabled={generating}
              style={{
                padding: 'var(--space-2) var(--space-6)',
                background: 'var(--color-primary-600)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {generating ? '⚡ AI Analyzing & Extracting MCQs...' : '⚡ Generate MCQs with AI'}
            </button>
          </div>
        </form>
      </div>

      {/* Generated Questions Preview */}
      {generatedQuestions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
              Generated Questions ({generatedQuestions.length})
            </h3>

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Link
                to="/trainer/question-bank"
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  textDecoration: 'none',
                }}
              >
                Save to Question Bank
              </Link>
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
                Assemble into Quiz →
              </Link>
            </div>
          </div>

          {generatedQuestions.map((q, idx) => (
            <div
              key={q.id}
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
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                  Q{idx + 1}. {q.text}
                </span>
                <Badge variant={q.difficulty === 'Advanced' ? 'high' : 'igot'}>{q.difficulty}</Badge>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                {q.options.map((opt, oIdx) => (
                  <div
                    key={oIdx}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      background: q.correct === oIdx ? 'rgba(16, 185, 129, 0.1)' : 'var(--color-surface-alt)',
                      border: q.correct === oIdx ? '1.5px solid var(--color-success)' : '1px solid var(--color-border)',
                      fontSize: 'var(--text-xs)',
                      color: q.correct === oIdx ? '#065f46' : 'var(--color-text-primary)',
                      fontWeight: q.correct === oIdx ? 600 : 400,
                    }}
                  >
                    {String.fromCharCode(65 + oIdx)}. {opt} {q.correct === oIdx && '✓ (Correct)'}
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', background: 'var(--color-surface-alt)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-primary-500)' }}>
                <strong>Explanation:</strong> {q.explanation}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
