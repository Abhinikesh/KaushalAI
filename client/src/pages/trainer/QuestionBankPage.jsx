import { useState } from 'react'
import { Link } from 'react-router-dom'
import Badge from '../../components/ui/Badge'

export default function QuestionBankPage() {
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState('all')

  const [questions, setQuestions] = useState([
    { id: 'qb-1', text: 'What is the First Stage Unit in rural NSSO survey sampling?', tag: 'Sampling', diff: 'Intermediate', approved: true, author: 'AI Generator' },
    { id: 'qb-2', text: 'Which parameter determines estimator precision in probability sampling?', tag: 'Sampling', diff: 'Beginner', approved: true, author: 'Faculty (NSSTA)' },
    { id: 'qb-3', text: 'What is the role of NQAF data validation rules in electronic survey capture?', tag: 'Data Quality', diff: 'Intermediate', approved: true, author: 'AI Generator' },
    { id: 'qb-4', text: 'Formula used for official elementary aggregate CPI compilation in India?', tag: 'Index Numbers', diff: 'Advanced', approved: false, author: 'AI Generator' },
    { id: 'qb-5', text: 'Definition of Gross Value Added (GVA) at basic prices in National Accounts?', tag: 'National Accounts', diff: 'Advanced', approved: true, author: 'Faculty (NSSTA)' },
    { id: 'qb-6', text: 'Difference between Census and Large-scale Sample Survey regarding non-sampling errors?', tag: 'Methodology', diff: 'Intermediate', approved: true, author: 'Faculty (NSSTA)' },
  ])

  const toggleApproval = (id) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, approved: !q.approved } : q))
    )
  }

  const filtered = questions.filter((q) => {
    const matchSearch = q.text.toLowerCase().includes(search.toLowerCase()) || q.tag.toLowerCase().includes(search.toLowerCase())
    const matchTag = filterTag === 'all' || q.tag === filterTag
    return matchSearch && matchTag
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Official Question Bank
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Central repository of validated multiple choice items for official statistical assessments
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Link
            to="/trainer/mcq-generator"
            style={{
              padding: 'var(--space-2) var(--space-4)',
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-primary-600)',
              color: 'var(--color-primary-600)',
              borderRadius: 'var(--radius-lg)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            ⚡ Generate from Document
          </Link>
          <Link
            to="/trainer/questions/new/edit"
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
            + Create Manual MCQ
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-4) var(--space-5)',
          display: 'flex',
          gap: 'var(--space-4)',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="Search question bank by keyword or concept..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 260,
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--color-border)',
            background: 'var(--color-surface)',
            fontSize: 'var(--text-sm)',
          }}
        />

        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          style={{
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--color-border)',
            background: 'var(--color-surface)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <option value="all">All Competencies</option>
          <option value="Sampling">Sampling</option>
          <option value="Data Quality">Data Quality</option>
          <option value="Index Numbers">Index Numbers</option>
          <option value="National Accounts">National Accounts</option>
          <option value="Methodology">Methodology</option>
        </select>
      </div>

      {/* Question Bank Table */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Question Statement</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Competency</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Difficulty</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Validation Status</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((q) => (
              <tr key={q.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)', maxWidth: 450 }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{q.text}</div>
                  <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>Source: {q.author}</span>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant="igot">{q.tag}</Badge>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                  {q.diff}
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant={q.approved ? 'success' : 'medium'}>
                    {q.approved ? 'Approved' : 'Pending Review'}
                  </Badge>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <Link
                      to={`/trainer/questions/${q.id}/edit`}
                      style={{
                        padding: '3px 8px',
                        background: 'var(--color-surface-alt)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--color-primary-600)',
                        textDecoration: 'none',
                      }}
                    >
                      Edit
                    </Link>

                    <button
                      type="button"
                      onClick={() => toggleApproval(q.id)}
                      style={{
                        padding: '3px 8px',
                        background: q.approved ? 'var(--color-surface)' : 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: q.approved ? 'var(--color-text-secondary)' : '#065f46',
                        cursor: 'pointer',
                      }}
                    >
                      {q.approved ? 'Unapprove' : 'Approve'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
