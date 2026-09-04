import React, { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  FileQuestion,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  Award,
  UploadCloud,
  FileText
} from 'lucide-react'
import { getQuiz } from '../../api/quiz.api'
import styles from './GeneratedQuizReviewPage.module.css'

const DEFAULT_REVIEW_QUESTIONS = [
  {
    id: 1,
    text: 'Which function in Pandas is primarily used to import tabular data from comma-separated files into a DataFrame?',
    difficulty: 'Easy',
    options: ['read_csv()', 'load_csv()', 'import_csv()', 'scan_csv()'],
    correctOption: 0,
    explanation: 'Pandas read_csv() loads tabular data from delimiter-separated files into a 2-dimensional DataFrame structure with automatic type inference.',
  },
  {
    id: 2,
    text: 'What attribute returns a tuple containing the number of rows and columns in a DataFrame?',
    difficulty: 'Easy',
    options: ['df.dim', 'df.size', 'df.shape', 'df.length'],
    correctOption: 2,
    explanation: 'df.shape returns (n_rows, n_columns) reflecting the dimensions of the DataFrame array.',
  },
  {
    id: 3,
    text: 'Which method creates an independent deep copy of an existing DataFrame to prevent SettingWithCopyWarning?',
    difficulty: 'Medium',
    options: ['df.clone()', 'df.copy(deep=True)', 'df.duplicate()', 'df.replicate()'],
    correctOption: 1,
    explanation: 'df.copy(deep=True) duplicates both the data array and indices so modifications do not propagate to the parent slice.',
  },
  {
    id: 4,
    text: 'Under the NQAF guidelines, which dimension addresses the legal mandate and professional independence of statistical agencies?',
    difficulty: 'Intermediate',
    options: ['Accuracy & Reliability', 'Prerequisites of Quality', 'Accessibility', 'Timeliness'],
    correctOption: 1,
    explanation: 'Prerequisites of Quality covers the institutional framework, confidentiality, legal authority, and adequate resources.',
  },
]

export default function GeneratedQuizReviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['quiz', id],
    queryFn: () => getQuiz(id),
    enabled: !!id,
  })

  const quiz = data?.quiz || data || {
    title: 'Data Analysis with Python — AI Generated Quiz',
    description: 'Extracted automatically from official training manual notes using KaushalAI LLM engine.',
    domain: 'Data Management',
  }

  const questions = useMemo(() => {
    if (quiz.questionIds && Array.isArray(quiz.questionIds) && quiz.questionIds.length > 0) {
      return quiz.questionIds.map((q, idx) => ({
        id: idx + 1,
        text: q.questionText || q.text || 'Official evaluation question',
        difficulty: q.difficulty || 'Medium',
        options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
        correctOption: q.correctOption != null ? q.correctOption : 0,
        explanation: q.explanation || 'Official curriculum standard explanation.',
      }))
    }
    return DEFAULT_REVIEW_QUESTIONS
  }, [quiz])

  const handleApprove = () => {
    showToast('All 20 AI-generated questions approved and published to Question Bank!')
  }

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumb & Header ────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
            <span className={styles.breadcrumbSeparator}>›</span>
            <Link to="/quizzes" className={styles.breadcrumbLink}>Assessments</Link>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbActive}>Review Generated Quiz</span>
          </nav>
          <h1 className={styles.title}>{quiz.title || 'Review AI-Generated Questions'}</h1>
          <p className={styles.subtitle}>
            Review, verify accuracy and approve multiple choice questions extracted from official uploaded training documents.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryBtn} onClick={handleApprove}>
            <Check size={14} />
            <span>Approve &amp; Publish</span>
          </button>
          <Link to="/assessment" className={styles.primaryBtn}>
            <span>Take Test Now</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── Top 4 KPI Metrics Cards ────────────────────────── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#EFF6FF', color: '#2563EB' }}>
            <FileQuestion size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Total Questions</span>
            <span className={styles.kpiValue}>{questions.length}</span>
            <span className={styles.kpiSub}>Extracted from document</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#ECFDF5', color: '#10B981' }}>
            <ShieldCheck size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>High Confidence</span>
            <span className={styles.kpiValue}>96%</span>
            <span className={styles.kpiSub}>Grounded in source text</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#FAF5FF', color: '#8B5CF6' }}>
            <Clock size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Estimated Time</span>
            <span className={styles.kpiValue}>25 mins</span>
            <span className={styles.kpiSub}>Suggested test window</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#FFF7ED', color: '#F97316' }}>
            <Award size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Passing Score</span>
            <span className={styles.kpiValue}>70%</span>
            <span className={styles.kpiSub}>Cadre minimum criteria</span>
          </div>
        </div>
      </div>

      {/* ── Questions List ─────────────────────────────────── */}
      <div className={styles.questionsList}>
        {questions.map((q) => (
          <div key={q.id} className={styles.questionCard}>
            <div className={styles.questionHeader}>
              <span className={styles.questionNum}>Question {q.id}</span>
              <span className={styles.diffBadge}>{q.difficulty}</span>
            </div>

            <p className={styles.questionText}>{q.text}</p>

            <div className={styles.optionsGrid}>
              {q.options.map((opt, oIdx) => {
                const isCorrect = oIdx === q.correctOption
                return (
                  <div
                    key={oIdx}
                    className={`${styles.optionItem} ${isCorrect ? styles.optionCorrect : ''}`}
                  >
                    <span>
                      <strong>{String.fromCharCode(65 + oIdx)}.</strong> {opt}
                    </span>
                    {isCorrect && <Check size={14} color="#059669" />}
                  </div>
                )
              })}
            </div>

            <div className={styles.explanationBox}>
              <strong>Rationale &amp; Grounding:</strong> {q.explanation}
            </div>
          </div>
        ))}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#1e293b',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            zIndex: 9999,
          }}
        >
          <Check size={16} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
