import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  FileText,
  Clock,
  Award,
  ArrowRight,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  BookOpen
} from 'lucide-react'
import { getMyQuizAttempts } from '../../api/quiz.api'
import { getMyCertificates } from '../../api/userFeatures.api'
import styles from './AssessmentHistoryPage.module.css'

export default function AssessmentHistoryPage() {
  const {
    data: attemptsData,
    isLoading: isAttemptsLoading,
    isError: isAttemptsError,
    error: attemptsError,
    refetch: refetchAttempts,
  } = useQuery({
    queryKey: ['myAttempts'],
    queryFn: getMyQuizAttempts,
    staleTime: 60 * 1000,
  })

  const {
    data: certsData,
    isLoading: isCertsLoading,
  } = useQuery({
    queryKey: ['myCertificates'],
    queryFn: getMyCertificates,
    staleTime: 60 * 1000,
  })

  const isLoading = isAttemptsLoading || isCertsLoading

  // Map strictly genuine backend attempts (no fabricated fallbacks)
  const attemptsList = useMemo(() => {
    const rawAttempts = attemptsData?.attempts || []
    if (!Array.isArray(rawAttempts)) return []

    return rawAttempts.map((a) => {
      const quizObj = typeof a.quizId === 'object' && a.quizId !== null ? a.quizId : null
      const quizIdStr = quizObj?._id ? String(quizObj._id) : String(a.quizId || '')
      const quizTitle = quizObj?.title || a.quizTitle || 'Statistical Competency Assessment'
      const domain = quizObj?.domain || a.domain || 'Data Management'

      // Authoritative completion timestamp for completed attempts; never assume createdAt or fabricate fallback
      const rawDate = a.status === 'completed'
        ? (a.completedAt || a.attemptedAt || null)
        : (a.startedAt || a.attemptedAt || null)
      let formattedDate = 'Date unavailable'
      if (rawDate) {
        try {
          const parsed = new Date(rawDate)
          if (!isNaN(parsed.getTime())) {
            formattedDate = parsed.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          }
        } catch {
          formattedDate = 'Date unavailable'
        }
      }

      const status = a.status || (a.score != null ? 'completed' : 'in_progress')
      const isPassed = Boolean(a.passed || (typeof a.score === 'number' && a.score >= 70))
      const scoreVal = typeof a.score === 'number' ? Math.round(Number(a.score) * 10) / 10 : null

      return {
        _id: String(a._id),
        quizId: quizIdStr,
        quizTitle,
        domain,
        date: formattedDate,
        score: scoreVal,
        status,
        passed: isPassed,
      }
    })
  }, [attemptsData])

  // Genuine KPI calculations
  const totalAttempts = attemptsList.length
  const completedAttempts = attemptsList.filter((a) => a.status === 'completed')
  const totalCompleted = completedAttempts.length
  const passedCount = completedAttempts.filter((a) => a.passed).length
  const passRate = totalCompleted > 0 ? Math.round((passedCount / totalCompleted) * 100) : 0
  const avgScore = totalCompleted > 0
    ? Math.round(completedAttempts.reduce((acc, a) => acc + (a.score || 0), 0) / totalCompleted)
    : 0
  const certificatesEarned = Array.isArray(certsData?.certificates) ? certsData.certificates.length : 0

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
            <span className={styles.breadcrumbActive}>Assessment History</span>
          </nav>
          <h1 className={styles.title}>Assessment History &amp; Score Logs</h1>
          <p className={styles.subtitle}>
            Authoritative audit trail of genuine competency assessments, evaluations, and earned certificates.
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
      {isAttemptsError && (
        <div style={{
          padding: '14px 18px',
          background: '#FFF1F2',
          border: '1px solid #FECDD3',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#9F1239',
          fontSize: 13.5,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={18} />
            <span>Unable to load assessment records: {attemptsError?.message || 'Network error'}</span>
          </div>
          <button
            onClick={() => refetchAttempts()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: '#fff',
              border: '1px solid #FDA4AF',
              borderRadius: 6,
              color: '#9F1239',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
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
            <span className={styles.kpiLabel}>Total Attempts</span>
            <span className={styles.kpiValue}>{totalAttempts}</span>
            <span className={styles.kpiSub}>Official evaluations taken</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#ECFDF5', color: '#10B981' }}>
            <ShieldCheck size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Pass Rate</span>
            <span className={styles.kpiValue}>{passRate}%</span>
            <span className={styles.kpiSub}>{passedCount} of {totalCompleted} completed</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#FAF5FF', color: '#8B5CF6' }}>
            <TrendingUp size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Average Score</span>
            <span className={styles.kpiValue}>{avgScore}%</span>
            <span className={styles.kpiSub}>Across completed evaluations</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#FFF7ED', color: '#F97316' }}>
            <Award size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Certificates Earned</span>
            <span className={styles.kpiValue}>{certificatesEarned}</span>
            <span className={styles.kpiSub}>Verified credentials</span>
          </div>
        </div>
      </div>

      {/* ── Attempts Table Card ────────────────────────────── */}
      <div className={styles.tableCard}>
        {isLoading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
            <Clock size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 10, color: 'var(--color-primary-600)' }} />
            <div>Loading verified assessment history...</div>
          </div>
        ) : attemptsList.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#F1F5F9',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
              marginBottom: 14,
            }}>
              <BookOpen size={24} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
              No assessment history recorded
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: 13.5, color: '#64748B', maxWidth: 440, display: 'inline-block' }}>
              You have not attempted any competency evaluations yet. Take your first official quiz to benchmark your skills and earn credentials.
            </p>
            <div>
              <Link to="/quizzes" className={styles.primaryBtn}>
                <Sparkles size={14} />
                <span>Explore Assessments</span>
              </Link>
            </div>
          </div>
        ) : (
          <table className={styles.attemptsTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Assessment Name</th>
                <th>Competency Domain</th>
                <th>Completion Date</th>
                <th>Score</th>
                <th>Result</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {attemptsList.map((att, idx) => (
                <tr key={att._id}>
                  <td style={{ fontWeight: 600, color: '#94a3b8' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 600, color: '#0f172a' }}>{att.quizTitle}</td>
                  <td>{att.domain}</td>
                  <td style={{ color: '#64748b' }}>{att.date}</td>
                  <td>
                    {att.status === 'in_progress' ? (
                      <span style={{ color: '#64748b', fontStyle: 'italic', fontSize: 12 }}>In Progress</span>
                    ) : (
                      <span
                        className={`${styles.scorePill} ${
                          att.passed ? styles.scorePass : styles.scoreRetake
                        }`}
                      >
                        {att.score != null ? `${att.score}%` : 'N/A'}
                      </span>
                    )}
                  </td>
                  <td>
                    {att.status === 'in_progress' ? (
                      <span style={{ fontWeight: 600, color: '#0284c7' }}>In Progress</span>
                    ) : att.status === 'expired' ? (
                      <span style={{ fontWeight: 600, color: '#e11d48' }}>Expired</span>
                    ) : (
                      <span style={{ fontWeight: 600, color: att.passed ? '#059669' : '#e11d48' }}>
                        {att.passed ? 'Passed' : 'Needs Retake'}
                      </span>
                    )}
                  </td>
                  <td>
                    {att.status === 'in_progress' ? (
                      <Link
                        to={`/quizzes/${att.quizId}`}
                        className={styles.actionLink}
                      >
                        <span>Resume Quiz</span>
                        <ArrowRight size={13} />
                      </Link>
                    ) : (
                      <Link
                        to={`/quizzes/${att.quizId}/result`}
                        className={styles.actionLink}
                      >
                        <span>View Analysis</span>
                        <ArrowRight size={13} />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
