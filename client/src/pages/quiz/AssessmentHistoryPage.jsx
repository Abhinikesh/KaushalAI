import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  FileText,
  Clock,
  Award,
  ArrowRight,
  Sparkles,
  AlertCircle,
  RotateCcw,
  BookOpen,
  Compass,
  PenTool,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { getMyAssessmentHistory, getMyCertificates } from '../../api/userFeatures.api'
import { getDiagnosticAttemptResults } from '../../api/assessment.api'
import {
  extractIdString,
  formatAttemptDate,
  formatDurationSeconds,
  getAttemptStatusMeta,
} from '../../utils/assessmentFormatters'
import styles from './AssessmentHistoryPage.module.css'

const STATUS_STYLE_MAP = {
  success: styles.statusSuccess,
  danger: styles.statusDanger,
  info: styles.statusInfo,
  diagnostic: styles.statusDiagnostic,
  neutral: styles.statusNeutral,
}

export default function AssessmentHistoryPage() {
  const { user } = useAuthStore()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [typeFilter, setTypeFilter] = useState('all')
  const [includeIncomplete, setIncludeIncomplete] = useState(false)
  const [selectedDiagnosticId, setSelectedDiagnosticId] = useState(null)

  const {
    data: historyData,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    error: historyError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['myAssessmentHistory', page, limit, typeFilter, includeIncomplete],
    queryFn: () =>
      getMyAssessmentHistory({
        page,
        limit,
        type: typeFilter,
        includeIncomplete: includeIncomplete ? 'true' : 'false',
      }),
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  })

  const { data: certsData } = useQuery({
    queryKey: ['myCertificates'],
    queryFn: getMyCertificates,
    staleTime: 60 * 1000,
  })

  const {
    data: diagnosticDetail,
    isLoading: isDiagLoading,
    isError: isDiagError,
    error: diagError,
    refetch: refetchDiag,
  } = useQuery({
    queryKey: ['diagnosticAttemptResults', selectedDiagnosticId],
    queryFn: () => getDiagnosticAttemptResults(selectedDiagnosticId),
    enabled: Boolean(selectedDiagnosticId),
    retry: false,
  })

  const items = Array.isArray(historyData?.items) ? historyData.items : []
  const pagination = historyData?.pagination || {
    page,
    limit,
    total: 0,
    totalPages: 0,
  }
  const meta = historyData?.meta || {
    typeFilter,
    includeIncomplete,
    diagnosticCount: 0,
    quizCount: 0,
    inProgressCount: 0,
    expiredCount: 0,
  }

  const certificatesEarned = Array.isArray(certsData?.certificates)
    ? certsData.certificates.length
    : 0
  const hiddenIncompleteTotal = (meta.inProgressCount || 0) + (meta.expiredCount || 0)

  const handleTypeChange = (nextType) => {
    setTypeFilter(nextType)
    setPage(1)
  }

  const handleIncompleteToggle = (checked) => {
    setIncludeIncomplete(checked)
    setPage(1)
  }

  const handleLimitChange = (nextLimit) => {
    setLimit(Number(nextLimit) || 10)
    setPage(1)
  }

  const renderAttemptAction = (item) => {
    const isDiag = item.kind === 'diagnostic'
    const quizIdStr = extractIdString(item.quizId)

    if (item.status === 'in_progress') {
      if (isDiag) {
        if (!user?.onboarding_completed) {
          return (
            <Link to="/diagnostic-test" className={styles.actionLink}>
              <span>Resume Assessment</span>
              <ArrowRight size={13} />
            </Link>
          )
        }
        return <span style={{ fontSize: 12, color: '#64748b' }}>Onboarding incomplete record</span>
      }
      if (quizIdStr) {
        return (
          <Link to={`/quizzes/${quizIdStr}`} className={styles.actionLink}>
            <span>Resume Quiz</span>
            <ArrowRight size={13} />
          </Link>
        )
      }
      return (
        <Link to={`/quiz-result/${item.attemptId}`} className={styles.actionLink}>
          <span>View Status</span>
          <ArrowRight size={13} />
        </Link>
      )
    }

    if (isDiag) {
      if (item.status === 'expired') {
        return (
          <Link to="/skill-gaps" className={styles.actionLink}>
            <span>Skill Gaps</span>
            <ArrowRight size={13} />
          </Link>
        )
      }
      return (
        <button
          type="button"
          className={styles.actionLink}
          onClick={() => setSelectedDiagnosticId(item.attemptId)}
        >
          <span>View Summary</span>
          <ArrowRight size={13} />
        </button>
      )
    }

    return (
      <Link to={`/quiz-result/${item.attemptId}`} className={styles.actionLink}>
        <span>View Result</span>
        <ArrowRight size={13} />
      </Link>
    )
  }

  const renderDateCell = (item) => {
    if (item.status === 'in_progress') {
      const startedStr = formatAttemptDate(item.startedAt)
      return (
        <div>
          <span style={{ color: '#0369a1', fontWeight: 500 }}>
            {startedStr !== 'Date unavailable' ? `Started ${startedStr}` : 'In progress'}
          </span>
        </div>
      )
    }
    if (item.status === 'expired') {
      const startedStr = formatAttemptDate(item.startedAt)
      return (
        <div>
          <span style={{ color: '#64748b' }}>
            {startedStr !== 'Date unavailable' ? `Started ${startedStr}` : 'Date unavailable'}
          </span>
        </div>
      )
    }
    const formatted = formatAttemptDate(item.date || item.completedAt || item.attemptedAt)
    return (
      <div>
        <div style={{ color: '#334155' }}>{formatted}</div>
        {item.dateIsLegacyFallback && formatted !== 'Date unavailable' && (
          <span className={styles.legacyDateNote}>Legacy recorded date</span>
        )}
      </div>
    )
  }

  const renderScoreCell = (item) => {
    const statusMeta = getAttemptStatusMeta(item)
    if (item.status === 'in_progress' || item.status === 'expired') {
      return <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
    }
    if (typeof item.score !== 'number' || !Number.isFinite(item.score)) {
      return <span style={{ color: '#64748b', fontSize: 12 }}>N/A</span>
    }
    const scorePillClass =
      item.kind === 'diagnostic'
        ? styles.scoreDiagnostic
        : statusMeta.tone === 'success'
          ? styles.scorePass
          : styles.scoreRetake

    return <span className={`${styles.scorePill} ${scorePillClass}`}>{Math.round(item.score * 10) / 10}%</span>
  }

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumb & Header ────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
            <span className={styles.breadcrumbSeparator}>›</span>
            <Link to="/quizzes" className={styles.breadcrumbLink}>Assessments &amp; Quizzes</Link>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbActive}>Assessment History</span>
          </nav>
          <h1 className={styles.title}>Assessment History &amp; Score Logs</h1>
          <p className={styles.subtitle}>
            Unified chronological record of your diagnostic evaluations and competency quizzes.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link to="/quizzes" className={styles.primaryBtn}>
            <Sparkles size={15} />
            <span>Take New Quiz</span>
          </Link>
        </div>
      </div>

      {/* ── Error Banner ───────────────────────────────────── */}
      {isHistoryError && (
        <div className={styles.errorBanner} role="alert">
          <div className={styles.errorTextWrap}>
            <AlertCircle size={18} />
            <span>
              Unable to load assessment history:{' '}
              {historyError?.response?.data?.message || historyError?.message || 'Network error'}
            </span>
          </div>
          <button type="button" className={styles.retryBtn} onClick={() => refetchHistory()}>
            <RotateCcw size={13} />
            Retry
          </button>
        </div>
      )}

      {/* ── Top 4 KPI Metrics Cards ────────────────────────── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#EFF6FF', color: '#2563EB' }}>
            <FileText size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Matching Records</span>
            <span className={styles.kpiValue}>{pagination.total}</span>
            <span className={styles.kpiSub}>
              {includeIncomplete ? 'Including incomplete/expired' : 'Completed evaluations'}
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#EEF2FF', color: '#4338CA' }}>
            <Compass size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Diagnostic Assessments</span>
            <span className={styles.kpiValue}>{meta.diagnosticCount}</span>
            <span className={styles.kpiSub}>Cadre baseline evaluations</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#FAF5FF', color: '#7C3AED' }}>
            <PenTool size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Quiz Assessments</span>
            <span className={styles.kpiValue}>{meta.quizCount}</span>
            <span className={styles.kpiSub}>
              {hiddenIncompleteTotal > 0
                ? `${meta.inProgressCount} in progress • ${meta.expiredCount} expired`
                : 'Course & topic quizzes'}
            </span>
          </div>
        </div>

        <Link to="/certificates" className={styles.kpiCard} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className={styles.kpiIconWrap} style={{ background: '#FFF7ED', color: '#F97316' }}>
            <Award size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Certificates Earned</span>
            <span className={styles.kpiValue}>{certificatesEarned}</span>
            <span className={styles.kpiSub}>View verified credentials →</span>
          </div>
        </Link>
      </div>

      {/* ── Filters & Pagination Controls ──────────────────── */}
      <div className={styles.filterToolbar}>
        <div className={styles.typeTabs} role="tablist" aria-label="Assessment type filter">
          {[
            { id: 'all', label: 'All Assessments' },
            { id: 'diagnostic', label: 'Diagnostic' },
            { id: 'quiz', label: 'Quizzes' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={typeFilter === tab.id}
              className={`${styles.typeTabBtn} ${typeFilter === tab.id ? styles.typeTabActive : ''}`}
              onClick={() => handleTypeChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.filterRight}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={includeIncomplete}
              onChange={(e) => handleIncompleteToggle(e.target.checked)}
            />
            <span>Include in-progress &amp; expired</span>
            {hiddenIncompleteTotal > 0 && (
              <span className={styles.incompleteHintPill}>{hiddenIncompleteTotal}</span>
            )}
          </label>

          <select
            aria-label="Records per page"
            className={styles.limitSelect}
            value={limit}
            onChange={(e) => handleLimitChange(e.target.value)}
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>

      {/* ── Attempts Table & Mobile Cards ──────────────────── */}
      <div className={styles.tableCard}>
        {isHistoryLoading && !historyData ? (
          <div className={styles.centerStateBox}>
            <Clock
              size={28}
              style={{ animation: 'spin 1s linear infinite', marginBottom: 10, color: 'var(--color-primary-600)' }}
            />
            <div>Loading unified assessment history...</div>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.centerStateBox}>
            <div className={styles.emptyIconWrap}>
              <BookOpen size={24} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
              {typeFilter !== 'all' || includeIncomplete
                ? 'No matching assessment records'
                : 'No completed assessments recorded yet'}
            </h3>
            <p style={{ margin: '0 auto 18px', fontSize: 13.5, color: '#64748B', maxWidth: 460 }}>
              {hiddenIncompleteTotal > 0 && !includeIncomplete
                ? `You have ${meta.inProgressCount} in-progress and ${meta.expiredCount} expired attempt(s) hidden by the completed-only filter.`
                : 'Your completed diagnostic evaluations and module quizzes will appear here in chronological order.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              {hiddenIncompleteTotal > 0 && !includeIncomplete && (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => handleIncompleteToggle(true)}
                >
                  Show In-Progress &amp; Expired ({hiddenIncompleteTotal})
                </button>
              )}
              {(typeFilter !== 'all' || includeIncomplete) && (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => {
                    setTypeFilter('all')
                    setIncludeIncomplete(false)
                    setPage(1)
                  }}
                >
                  Reset Filters
                </button>
              )}
              <Link to="/quizzes" className={styles.primaryBtn}>
                <Sparkles size={14} />
                <span>Explore Assessments</span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className={styles.desktopTableWrap}>
              <table className={styles.attemptsTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Assessment</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Score</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const rowNumber = (pagination.page - 1) * pagination.limit + idx + 1
                    const statusMeta = getAttemptStatusMeta(item)
                    const durationStr = formatDurationSeconds(item.durationSeconds)
                    const isDiag = item.kind === 'diagnostic'

                    return (
                      <tr key={item.attemptId}>
                        <td style={{ fontWeight: 600, color: '#94a3b8' }}>{rowNumber}</td>
                        <td>
                          <div className={styles.titleCell}>{item.title}</div>
                          <div className={styles.titleSub}>
                            {item.domain || (isDiag ? 'Baseline Cadre Evaluation' : 'Competency Quiz')}
                            {typeof item.totalQuestions === 'number' && ` • ${item.totalQuestions} questions`}
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.kindBadge} ${isDiag ? styles.kindDiagnostic : styles.kindQuiz}`}>
                            {isDiag ? 'Diagnostic' : 'Quiz'}
                          </span>
                        </td>
                        <td>{renderDateCell(item)}</td>
                        <td>{renderScoreCell(item)}</td>
                        <td style={{ color: '#475569', whiteSpace: 'nowrap' }}>
                          {durationStr || '—'}
                        </td>
                        <td>
                          <span className={`${styles.statusPill} ${STATUS_STYLE_MAP[statusMeta.tone]}`}>
                            {statusMeta.label}
                          </span>
                        </td>
                        <td>{renderAttemptAction(item)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className={styles.mobileCardsList}>
              {items.map((item) => {
                const statusMeta = getAttemptStatusMeta(item)
                const durationStr = formatDurationSeconds(item.durationSeconds)
                const isDiag = item.kind === 'diagnostic'

                return (
                  <div key={item.attemptId} className={styles.mobileCard}>
                    <div className={styles.mobileCardTop}>
                      <div style={{ minWidth: 0 }}>
                        <span className={`${styles.kindBadge} ${isDiag ? styles.kindDiagnostic : styles.kindQuiz}`}>
                          {isDiag ? 'Diagnostic' : 'Quiz'}
                        </span>
                        <div className={styles.titleCell} style={{ marginTop: 6 }}>{item.title}</div>
                        <div className={styles.titleSub}>
                          {item.domain || (isDiag ? 'Baseline Cadre Evaluation' : 'Competency Quiz')}
                        </div>
                      </div>
                      <span className={`${styles.statusPill} ${STATUS_STYLE_MAP[statusMeta.tone]}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className={styles.mobileCardMetaGrid}>
                      <div>
                        <span className={styles.mobileMetaLabel}>Date</span>
                        {renderDateCell(item)}
                      </div>
                      <div>
                        <span className={styles.mobileMetaLabel}>Score</span>
                        {renderScoreCell(item)}
                      </div>
                      <div>
                        <span className={styles.mobileMetaLabel}>Duration</span>
                        <span>{durationStr || '—'}</span>
                      </div>
                      <div>
                        <span className={styles.mobileMetaLabel}>Questions</span>
                        <span>{typeof item.totalQuestions === 'number' ? item.totalQuestions : '—'}</span>
                      </div>
                    </div>

                    <div className={styles.mobileCardFooter}>
                      <span style={{ fontSize: 11.5, color: '#64748b' }}>
                        {item.competencyCount > 0
                          ? `${item.competencyCount} competencies tracked`
                          : ''}
                      </span>
                      {renderAttemptAction(item)}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination Controls */}
            <div className={styles.paginationBar}>
              <span>
                Page <strong>{pagination.page}</strong> of <strong>{Math.max(1, pagination.totalPages)}</strong>
                {' '}• Showing {items.length} of {pagination.total} record{pagination.total === 1 ? '' : 's'}
              </span>
              <div className={styles.paginationButtons}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={14} />
                  Previous
                </button>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={pagination.totalPages === 0 || pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Diagnostic Summary Modal ───────────────────────── */}
      {selectedDiagnosticId && (
        <div className={styles.modalOverlay} onClick={() => setSelectedDiagnosticId(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Diagnostic Assessment Summary</h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Verified cadre diagnostic record
                </span>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setSelectedDiagnosticId(null)}
                aria-label="Close summary"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {isDiagLoading ? (
                <div style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>
                  Loading diagnostic summary...
                </div>
              ) : isDiagError ? (
                <div className={styles.errorBanner} role="alert">
                  <div className={styles.errorTextWrap}>
                    <AlertCircle size={18} />
                    <span>
                      {diagError?.response?.data?.message || 'Unable to load diagnostic details.'}
                    </span>
                  </div>
                  <button type="button" className={styles.retryBtn} onClick={() => refetchDiag()}>
                    <RotateCcw size={13} />
                    Retry
                  </button>
                </div>
              ) : diagnosticDetail ? (
                <>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 12,
                  }}>
                    <div style={{ padding: 12, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>OVERALL SCORE</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                        {typeof diagnosticDetail.overall_score === 'number'
                          ? `${diagnosticDetail.overall_score}%`
                          : 'N/A'}
                      </div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>COMPLETED ON</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 4 }}>
                        {formatAttemptDate(diagnosticDetail.completed_at)}
                      </div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>COMPETENCIES</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                        {Array.isArray(diagnosticDetail.per_competency_scores)
                          ? diagnosticDetail.per_competency_scores.length
                          : 0}
                      </div>
                    </div>
                  </div>

                  {diagnosticDetail.ai_analysis?.summary && (
                    <div style={{ padding: 14, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>
                        Evaluation Summary
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: '#1e40af', lineHeight: 1.5 }}>
                        {diagnosticDetail.ai_analysis.summary}
                      </p>
                    </div>
                  )}

                  {Array.isArray(diagnosticDetail.per_competency_scores) &&
                    diagnosticDetail.per_competency_scores.length > 0 && (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                          Competency Baseline Snapshot
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {diagnosticDetail.per_competency_scores.map((cs, idx) => (
                            <div
                              key={cs.competency_id || idx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 10,
                                padding: '9px 12px',
                                borderRadius: 8,
                                border: '1px solid #e2e8f0',
                                background: '#ffffff',
                                fontSize: 12.5,
                              }}
                            >
                              <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                {cs.competency_name || 'Competency'}
                              </span>
                              <span style={{ color: '#475569', whiteSpace: 'nowrap' }}>
                                Level {cs.derived_level ?? '—'} / {cs.required_level ?? '—'}
                                {typeof cs.percentage === 'number' ? ` (${cs.percentage}%)` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </>
              ) : null}
            </div>

            <div className={styles.modalFooter}>
              <Link to="/skill-gaps" className={styles.primaryBtn}>
                <span>Open Skill Gap Analysis</span>
                <ArrowRight size={14} />
              </Link>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setSelectedDiagnosticId(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
