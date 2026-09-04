import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { HelpCircle, Check } from 'lucide-react'
import { getQuiz } from '../../api/quiz.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

export default function GeneratedQuizReviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['quiz', id],
    queryFn: () => getQuiz(id),
    enabled: !!id,
  })

  const quiz = data?.quiz || data

  if (isLoading) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <Skeleton.Card />
        <Skeleton.Card />
      </div>
    )
  }

  if (!quiz) {
    return (
      <EmptyState
        icon={HelpCircle}
        title="Quiz not found"
        description="The generated quiz could not be located."
        action="Upload New Material"
        onAction={() => navigate('/upload')}
      />
    )
  }

  const questions = quiz.questionIds || []

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Link to="/upload" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', textDecoration: 'none', fontWeight: 600 }}>
            ← Upload Material
          </Link>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 4 }}>
            {quiz.title || 'AI-Generated Assessment Quiz'}
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Review all AI-generated multiple-choice questions extracted from official document
          </p>
        </div>

        <Link
          to={`/quizzes/${id}`}
          style={{
            padding: 'var(--space-2) var(--space-5)',
            background: 'var(--color-primary-600)',
            color: 'white',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Start Quiz Now →
        </Link>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Status</span>
          <div style={{ marginTop: 2 }}>
            <Badge variant="success">Generated &amp; Grounded</Badge>
          </div>
        </div>
        <div>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Question Count</span>
          <div style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', marginTop: 2 }}>
            {quiz.questionCount || questions.length} Questions
          </div>
        </div>
        <div>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Target Audience</span>
          <div style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', marginTop: 2 }}>All Cadre Officers</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {questions.map((q, idx) => (
          <div
            key={q._id || idx}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                Q{idx + 1}. {q.text}
              </span>
              <Badge variant="igot">{q.difficulty || 'Intermediate'}</Badge>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
              {(q.options || []).map((opt, oIdx) => {
                const isCorrect = q.correctOptionIndex === oIdx
                return (
                  <div
                    key={oIdx}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'var(--color-surface-alt)',
                      border: isCorrect ? '1.5px solid var(--color-success)' : '1px solid var(--color-border)',
                      fontSize: 'var(--text-xs)',
                      color: isCorrect ? '#065f46' : 'var(--color-text-primary)',
                      fontWeight: isCorrect ? 600 : 400,
                    }}
                  >
                    {String.fromCharCode(65 + oIdx)}. {opt} {isCorrect && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 6, fontWeight: 600 }}>
                        <Check size={12} strokeWidth={2.5} /> (Correct Key)
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {q.explanation && (
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', background: 'var(--color-surface-alt)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-primary-500)' }}>
                <strong>Explanation:</strong> {q.explanation}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
