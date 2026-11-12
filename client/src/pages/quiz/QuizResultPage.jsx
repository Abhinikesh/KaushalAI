import React, { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  HelpCircle,
  Layers,
  RefreshCw,
  RotateCcw,
  Target,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { getQuizAttemptById } from '../../api/quiz.api'
import { getMyAssessmentHistory } from '../../api/userFeatures.api'
import {
  extractIdString,
  formatAttemptDate,
  formatDurationSeconds,
  getAttemptStatusMeta,
} from '../../utils/assessmentFormatters'
import styles from './QuizResultPage.module.css'

const toneColors = {
  success: { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' },
  danger: { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
  info: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  diagnostic: { bg: '#EEF2FF', color: '#4338CA', border: '#C7D2FE' },
  neutral: { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' },
}

function normalizeQuestionItem(q, index) {
  const options = Array.isArray(q?.options) ? q.options : []
  const selectedIndex = q?.userAnswer ?? q?.selectedOptionIndex ?? null
  const correctIndex = q?.correctOption ?? q?.correctOptionIndex ?? null
  const isCorrect =
    typeof q?.isCorrect === 'boolean'
      ? q.isCorrect
      : selectedIndex !== null && correctIndex !== null && Number(selectedIndex) === Number(correctIndex)

  const getOptionLabel = (idx) => {
    if (idx === null || idx === undefined) return 'Not answered'
    const numIdx = Number(idx)
    if (!Number.isNaN(numIdx) && options[numIdx] !== undefined) {
      const opt = options[numIdx]
      if (typeof opt === 'string') return opt
      return opt?.text || opt?.label || String(opt)
    }
    return `Option ${String(idx)}`
  }

  return {
    id: extractIdString(q?.questionId || q?._id) || `q-${index}`,
    number: index + 1,
    questionText: q?.text || q?.questionText || q?.prompt || `Question ${index + 1}`,
    selectedLabel: getOptionLabel(selectedIndex),
    correctLabel: correctIndex !== null && correctIndex !== undefined ? getOptionLabel(correctIndex) : null,
    isCorrect,
    rationale: q?.explanation || q?.rationale || '',
  }
}

export default function QuizResultPage() {
  const { id: attemptIdParam } = useParams()
  const [questionFilter, setQuestionFilter] = useState('all')

  const hasAttemptParam = Boolean(attemptIdParam)

  const {
    data: latestHistoryData,
    isLoading: latestHistoryLoading,
    isError: latestHistoryError,
    error: latestHistoryErrObj,
    refetch: refetchLatestHistory,
  } = useQuery({
    queryKey: ['latestCompletedQuizAttempt'],
    queryFn: () => getMyAssessmentHistory({ page: 1, limit: 1, type: 'quiz', includeIncomplete: false }),
    enabled: !hasAttemptParam,
    retry: false,
    staleTime: 30 * 1000,
  })

  const latestAttemptId = useMemo(() => {
    const first = latestHistoryData?.items?.[0]
    return first ? extractIdString(first.attemptId) : ''
  }, [latestHistoryData])

  const targetAttemptId = hasAttemptParam ? attemptIdParam : latestAttemptId

  const {
    data: attemptData,
    isLoading: attemptLoading,
    isError: attemptError,
    error: attemptErrObj,
    refetch: refetchAttempt,
  } = useQuery({
    queryKey: ['quizAttemptDetail', targetAttemptId],
    queryFn: () => getQuizAttemptById(targetAttemptId),
    enabled: Boolean(targetAttemptId),
    retry: false,
    staleTime: 30 * 1000,
  })

  const attempt = attemptData?.attempt || null

  const normalizedQuestions = useMemo(() => {
    const raw = Array.isArray(attempt?.detailedResults) ? attempt.detailedResults : []
    return raw.map((q, idx) => normalizeQuestionItem(q, idx))
  }, [attempt])

  const filteredQuestions = useMemo(() => {
    if (questionFilter === 'incorrect') return normalizedQuestions.filter((q) => !q.isCorrect)
    if (questionFilter === 'correct') return normalizedQuestions.filter((q) => q.isCorrect)
    return normalizedQuestions
  }, [normalizedQuestions, questionFilter])

  const isLoading = (!hasAttemptParam && latestHistoryLoading) || (Boolean(targetAttemptId) && attemptLoading)

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.breadcrumb}>
          <Link to="/dashboard">Dashboard</Link>
          <ChevronRight size={14} />
          <Link to="/assessments/history">Assessment History</Link>
          <ChevronRight size={14} />
          <span>Quiz Result</span>
        </div>
        <div className={styles.contentCard} style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#475569', fontSize: 15 }}>Loading assessment result details…</p>
        </div>
      </div>
    )
  }

  if (!hasAttemptParam && latestHistoryError) {
    const msg =
      latestHistoryErrObj?.response?.data?.message ||
      latestHistoryErrObj?.response?.data?.error ||
      latestHistoryErrObj?.message ||
      'Unable to load assessment history.'
    return (
      <div className={styles.page}>
        <div className={styles.breadcrumb}>
          <Link to="/dashboard">Dashboard</Link>
          <ChevronRight size={14} />
          <Link to="/assessments/history">Assessment History</Link>
          <ChevronRight size={14} />
          <span>Quiz Result</span>
        </div>
        <div className={styles.contentCard} style={{ padding: 32 }}>
          <h2 style={{ marginTop: 0, fontSize: 20, color: '#0F172A' }}>Could not load latest quiz result</h2>
          <p style={{ color: '#64748B', marginBottom: 20 }}>{msg}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => refetchLatestHistory()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 8,
                border: 'none',
                background: '#0F172A',
                color: '#FFFFFF',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={15} /> Retry
            </button>
            <Link
              to="/assessments/history"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                color: '#0F172A',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              View Assessment History
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!hasAttemptParam && !targetAttemptId) {
    const incompleteCount =
      (latestHistoryData?.meta?.inProgressCount || 0) + (latestHistoryData?.meta?.expiredCount || 0)

    return (
      <div className={styles.page}>
        <div className={styles.breadcrumb}>
          <Link to="/dashboard">Dashboard</Link>
          <ChevronRight size={14} />
          <Link to="/assessments/history">Assessment History</Link>
          <ChevronRight size={14} />
          <span>Quiz Result</span>
        </div>
        <div className={styles.contentCard} style={{ padding: 36, textAlign: 'center' }}>
          <Award size={36} color="#64748B" style={{ marginBottom: 12 }} />
          <h1 style={{ margin: '0 0 8px', fontSize: 22, color: '#0F172A' }}>No completed quiz results yet</h1>
          <p style={{ margin: '0 auto 20px', maxWidth: 520, color: '#64748B', fontSize: 15 }}>
            Complete a topic quiz to view your score breakdown, question review, and competency updates.
            {incompleteCount > 0
              ? ` You currently have ${incompleteCount} incomplete or expired attempt${incompleteCount === 1 ? '' : 's'} recorded in your history.`
              : ''}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Link
              to="/quizzes"
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                background: '#0F172A',
                color: '#FFFFFF',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Browse Quizzes
            </Link>
            <Link
              to="/assessments/history"
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                color: '#0F172A',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Open Assessment History
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (attemptError || !attempt) {
    const statusCode = attemptErrObj?.response?.status
    const serverMsg =
      attemptErrObj?.response?.data?.message ||
      attemptErrObj?.response?.data?.error ||
      attemptErrObj?.message
    const isMissingOrDenied = statusCode === 400 || statusCode === 404 || statusCode === 403
    const heading = isMissingOrDenied ? 'Assessment attempt unavailable' : 'Unable to load quiz result'
    const description = isMissingOrDenied
      ? serverMsg || 'This assessment attempt does not exist or belongs to another account.'
      : serverMsg || 'A network or server error occurred while loading this quiz result.'

    return (
      <div className={styles.page}>
        <div className={styles.breadcrumb}>
          <Link to="/dashboard">Dashboard</Link>
          <ChevronRight size={14} />
          <Link to="/assessments/history">Assessment History</Link>
          <ChevronRight size={14} />
          <span>Quiz Result</span>
        </div>
        <div className={styles.contentCard} style={{ padding: 32 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 22, color: '#0F172A' }}>{heading}</h1>
          <p style={{ margin: '0 0 20px', color: '#64748B', fontSize: 15 }}>{description}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {!isMissingOrDenied && (
              <button
                type="button"
                onClick={() => refetchAttempt()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#0F172A',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={15} /> Retry
              </button>
            )}
            <Link
              to="/assessments/history"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                color: '#0F172A',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={15} /> Back to Assessment History
            </Link>
            <Link
              to="/quizzes"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                color: '#0F172A',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Browse Quizzes
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const quizId = extractIdString(attempt.quizId)
  const isCompleted = attempt.status === 'completed'
  const isInProgress = attempt.status === 'in_progress'
  const isExpired = attempt.status === 'expired'
  const numericScore = isCompleted && attempt.score != null ? Math.round(Number(attempt.score) * 10) / 10 : null
  const passedFlag =
    typeof attempt.passed === 'boolean'
      ? attempt.passed
      : isCompleted && numericScore !== null
        ? numericScore >= 70
        : null

  const statusMeta = getAttemptStatusMeta({
    status: attempt.status,
    kind: 'quiz',
    score: numericScore,
    passed: passedFlag,
  })
  const badgeStyle = toneColors[statusMeta.tone] || toneColors.neutral

  const dateSource = attempt.completedAt || attempt.attemptedAt || attempt.startedAt
  const formattedDate = formatAttemptDate(dateSource)
  const isLegacyDate = !attempt.completedAt && Boolean(attempt.attemptedAt)
  const formattedDuration = formatDurationSeconds(attempt.durationSeconds) || 'Duration unavailable'
  const totalQuestions = Number(attempt.totalQuestions || normalizedQuestions.length || 0)
  const correctCount = isCompleted ? Number(attempt.correctCount ?? 0) : 0
  const incorrectCount = isCompleted
    ? Number(attempt.incorrectCount ?? Math.max(0, totalQuestions - correctCount))
    : 0

  const competencyUpdates = Array.isArray(attempt.competencyUpdates) ? attempt.competencyUpdates : []

  const clampedGauge = numericScore !== null ? Math.max(0, Math.min(100, numericScore)) : 0
  const gaugeRadius = 54
  const gaugeCircumference = 2 * Math.PI * gaugeRadius
  const gaugeOffset = gaugeCircumference * (1 - clampedGauge / 100)

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to="/dashboard">Dashboard</Link>
        <ChevronRight size={14} />
        <Link to="/assessments/history">Assessment History</Link>
        <ChevronRight size={14} />
        <span>{attempt.quizTitle || 'Quiz Result'}</span>
      </div>

      <div className={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: badgeStyle.bg,
                color: badgeStyle.color,
                border: `1px solid ${badgeStyle.border}`,
              }}
            >
              {passedFlag === true && <CheckCircle2 size={13} />}
              {passedFlag === false && <XCircle size={13} />}
              {statusMeta.label}
            </span>
            {attempt.domain && (
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  background: '#F1F5F9',
                  color: '#334155',
                }}
              >
                {attempt.domain}
              </span>
            )}
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700, color: '#0F172A' }}>
            {attempt.quizTitle || 'Quiz Assessment'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', color: '#64748B', fontSize: 13 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Calendar size={14} />
              {formattedDate}
              {isLegacyDate && (
                <span style={{ marginLeft: 4, fontSize: 11, color: '#94A3B8' }}>(Legacy recorded date)</span>
              )}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Clock size={14} />
              {formattedDuration}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link
            to="/assessments/history"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#0F172A',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={15} /> Assessment History
          </Link>
          {quizId && (
            <Link
              to={`/quizzes/${encodeURIComponent(quizId)}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: 8,
                background: '#0F172A',
                color: '#FFFFFF',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <RotateCcw size={15} /> {isInProgress ? 'Resume Quiz' : 'Retake Quiz'}
            </Link>
          )}
        </div>
      </div>

      {(isInProgress || isExpired) && (
        <div
          className={styles.contentCard}
          style={{
            padding: 20,
            marginBottom: 20,
            background: badgeStyle.bg,
            border: `1px solid ${badgeStyle.border}`,
          }}
        >
          <h2 style={{ margin: '0 0 6px', fontSize: 16, color: badgeStyle.color }}>
            {isInProgress ? 'Attempt In Progress' : 'Attempt Expired'}
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
            {isInProgress
              ? 'This quiz session has not been submitted yet. Score and question evaluation are unavailable until you complete it.'
              : 'This quiz session exceeded its time limit before submission and has not been scored.'}
          </p>
        </div>
      )}

      <div className={styles.statsGrid}>
        <div className={styles.contentCard} style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748B', fontSize: 13, marginBottom: 8 }}>
            <Target size={16} /> Score
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0F172A' }}>
            {numericScore !== null ? `${numericScore}%` : '—'}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
            {isCompleted ? `Pass mark: 70%` : statusMeta.label}
          </div>
        </div>

        <div className={styles.contentCard} style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748B', fontSize: 13, marginBottom: 8 }}>
            <CheckCircle2 size={16} /> Correct Answers
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0F172A' }}>
            {isCompleted && totalQuestions > 0 ? `${correctCount} / ${totalQuestions}` : '—'}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
            {isCompleted ? `${incorrectCount} incorrect` : totalQuestions > 0 ? `${totalQuestions} total questions` : 'Not evaluated'}
          </div>
        </div>

        <div className={styles.contentCard} style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748B', fontSize: 13, marginBottom: 8 }}>
            <Clock size={16} /> Time Taken
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0F172A' }}>
            {formattedDuration}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
            {attempt.quizDurationMinutes > 0 ? `Time limit: ${attempt.quizDurationMinutes}m` : 'Recorded from attempt timestamps'}
          </div>
        </div>

        <div className={styles.contentCard} style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748B', fontSize: 13, marginBottom: 8 }}>
            <BarChart3 size={16} /> Result Status
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: badgeStyle.color }}>{statusMeta.label}</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
            Attempt ID: {extractIdString(attempt._id).slice(-8)}
          </div>
        </div>
      </div>

      <div className={styles.mainLayout}>
        <div className={styles.leftColumn}>
          <div className={styles.contentCard} style={{ padding: 24 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                marginBottom: 16,
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HelpCircle size={18} /> Question Review
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
                  {normalizedQuestions.length > 0
                    ? `Showing ${filteredQuestions.length} of ${normalizedQuestions.length} recorded questions`
                    : 'Recorded question responses for this attempt'}
                </p>
              </div>

              {normalizedQuestions.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { key: 'all', label: `All (${normalizedQuestions.length})` },
                    { key: 'incorrect', label: `Incorrect (${normalizedQuestions.filter((q) => !q.isCorrect).length})` },
                    { key: 'correct', label: `Correct (${normalizedQuestions.filter((q) => q.isCorrect).length})` },
                  ].map((tab) => {
                    const active = questionFilter === tab.key
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setQuestionFilter(tab.key)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 999,
                          border: active ? '1px solid #0F172A' : '1px solid #CBD5E1',
                          background: active ? '#0F172A' : '#FFFFFF',
                          color: active ? '#FFFFFF' : '#334155',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {tab.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {normalizedQuestions.length === 0 ? (
              <div
                style={{
                  padding: 24,
                  borderRadius: 10,
                  background: '#F8FAFC',
                  border: '1px dashed #CBD5E1',
                  textAlign: 'center',
                  color: '#64748B',
                  fontSize: 14,
                }}
              >
                Question-level breakdown is not available for this attempt.
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div
                style={{
                  padding: 24,
                  borderRadius: 10,
                  background: '#F8FAFC',
                  border: '1px dashed #CBD5E1',
                  textAlign: 'center',
                  color: '#64748B',
                  fontSize: 14,
                }}
              >
                No questions match the selected filter.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {filteredQuestions.map((q) => (
                  <div
                    key={q.id}
                    style={{
                      padding: 16,
                      borderRadius: 10,
                      border: q.isCorrect ? '1px solid #A7F3D0' : '1px solid #FECACA',
                      background: q.isCorrect ? '#F0FDF4' : '#FEF2F2',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A' }}>
                        Q{q.number}. {q.questionText}
                      </div>
                      <span
                        style={{
                          flexShrink: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          color: q.isCorrect ? '#047857' : '#B91C1C',
                        }}
                      >
                        {q.isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {q.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, fontSize: 13 }}>
                      <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                        <span style={{ color: '#64748B', display: 'block', fontSize: 11, fontWeight: 600 }}>Your Answer</span>
                        <span style={{ color: '#0F172A', fontWeight: 500 }}>{q.selectedLabel}</span>
                      </div>
                      {q.correctLabel && (
                        <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                          <span style={{ color: '#64748B', display: 'block', fontSize: 11, fontWeight: 600 }}>Correct Answer</span>
                          <span style={{ color: '#047857', fontWeight: 600 }}>{q.correctLabel}</span>
                        </div>
                      )}
                    </div>

                    {q.rationale && (
                      <div style={{ marginTop: 10, fontSize: 13, color: '#334155', background: '#FFFFFF', padding: '8px 12px', borderRadius: 8 }}>
                        <strong>Explanation:</strong> {q.rationale}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {competencyUpdates.length > 0 && (
            <div className={styles.contentCard} style={{ padding: 24, marginTop: 20 }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 18, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={18} /> Competency Updates
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {competencyUpdates.map((upd, idx) => {
                  const name =
                    upd.competencyName || upd.competencyCode || extractIdString(upd.competencyId) || `Competency ${idx + 1}`
                  const prev = upd.previousLevel != null ? Number(upd.previousLevel) : null
                  const next = upd.newLevel != null ? Number(upd.newLevel) : null
                  const delta = prev !== null && next !== null ? Math.round((next - prev) * 10) / 10 : null
                  return (
                    <div
                      key={`${extractIdString(upd.competencyId)}-${idx}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A' }}>{name}</div>
                        {(upd.competencyCategory || upd.competencyCode) && (
                          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                            {[upd.competencyCode, upd.competencyCategory].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                        {prev !== null && next !== null ? (
                          <>
                            <span style={{ color: '#64748B' }}>Level {prev}</span>
                            <ChevronRight size={14} color="#64748B" />
                            <span style={{ color: '#0F172A' }}>Level {next}</span>
                            {delta !== null && delta !== 0 && (
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  background: delta > 0 ? '#ECFDF5' : '#FEF2F2',
                                  color: delta > 0 ? '#047857' : '#B91C1C',
                                  fontSize: 12,
                                }}
                              >
                                {delta > 0 ? `+${delta}` : delta}
                              </span>
                            )}
                          </>
                        ) : (
                          <span style={{ color: '#64748B' }}>Updated</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className={styles.rightSidebar}>
          <div className={styles.sideCard} style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 16, color: '#0F172A' }}>Attempt Summary</h3>

            {numericScore !== null && (
              <div className={styles.gaugeContainer} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
                <svg width="132" height="132" viewBox="0 0 132 132" aria-label={`Score ${numericScore}%`}>
                  <circle cx="66" cy="66" r={gaugeRadius} fill="none" stroke="#E2E8F0" strokeWidth="10" />
                  <circle
                    cx="66"
                    cy="66"
                    r={gaugeRadius}
                    fill="none"
                    stroke={passedFlag === false ? '#DC2626' : '#059669'}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={gaugeCircumference}
                    strokeDashoffset={gaugeOffset}
                    transform="rotate(-90 66 66)"
                  />
                  <text x="66" y="70" textAnchor="middle" fontSize="24" fontWeight="700" fill="#0F172A">
                    {numericScore}%
                  </text>
                </svg>
              </div>
            )}

            <div className={styles.summaryList} style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ color: '#64748B' }}>Status</span>
                <strong style={{ color: badgeStyle.color }}>{statusMeta.label}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ color: '#64748B' }}>Questions</span>
                <strong style={{ color: '#0F172A' }}>{totalQuestions || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ color: '#64748B' }}>Duration</span>
                <strong style={{ color: '#0F172A' }}>{formattedDuration}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ color: '#64748B' }}>Recorded Date</span>
                <strong style={{ color: '#0F172A', textAlign: 'right' }}>{formattedDate}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
              <Link
                to="/assessments/history"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: '#F1F5F9',
                  color: '#0F172A',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <Layers size={15} /> All Assessment History
              </Link>
              <Link
                to="/learning-path"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <BookOpen size={15} /> View Learning Path
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
