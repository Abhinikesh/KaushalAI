import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Award,
  ShieldCheck,
  ExternalLink,
  Printer,
  X,
  Clock,
  RotateCw,
  Sparkles,
  BookOpen,
  FileText,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { getMyCertificates, reconcileMyCertificates } from '../../api/userFeatures.api'
import styles from './CertificatesPage.module.css'

export default function CertificatesPage() {
  const queryClient = useQueryClient()
  const [selectedCert, setSelectedCert] = useState(null)
  const [reconcileFeedback, setReconcileFeedback] = useState(null)

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['myCertificates'],
    queryFn: getMyCertificates,
    staleTime: 60 * 1000,
  })

  const reconcileMutation = useMutation({
    mutationFn: reconcileMyCertificates,
    onSuccess: (result) => {
      queryClient.invalidateQueries(['myCertificates'])
      if (result.recoveredCount > 0) {
        setReconcileFeedback({
          type: 'success',
          message: `Successfully recovered and issued ${result.recoveredCount} missing certificate(s)!`,
        })
      } else {
        setReconcileFeedback({
          type: 'info',
          message: `Reconciliation complete. All ${result.totalChecked || 0} completed records are already certified.`,
        })
      }
      setTimeout(() => setReconcileFeedback(null), 6000)
    },
    onError: (err) => {
      setReconcileFeedback({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Reconciliation failed. Please try again.',
      })
      setTimeout(() => setReconcileFeedback(null), 6000)
    },
  })

  const certificates = Array.isArray(data?.certificates) ? data.certificates : []
  const assessmentCerts = certificates.filter((c) => c.type === 'assessment_mastery')
  const courseCerts = certificates.filter((c) => c.type === 'course_completion')

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumbs & Header ───────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbActive}>Certificates</span>
          </nav>
          <h1 className={styles.title}>My Certificates &amp; Credentials</h1>
          <p className={styles.subtitle}>
            Verified credentials earned through assessment evaluations and capacity building milestones.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => reconcileMutation.mutate()}
            disabled={reconcileMutation.isPending}
            title="Checks authoritative completed quiz attempts and course enrollments for unissued certificates"
          >
            <RotateCw size={14} className={reconcileMutation.isPending ? 'spin' : ''} />
            <span>{reconcileMutation.isPending ? 'Reconciling...' : 'Reconcile Records'}</span>
          </button>
        </div>
      </div>

      {/* ── Reconciliation Notice ─────────────────────────── */}
      {reconcileFeedback && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 10,
          fontSize: 13.5,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: reconcileFeedback.type === 'success' ? '#ECFDF5' : reconcileFeedback.type === 'error' ? '#FFF1F2' : '#F8FAFC',
          border: `1px solid ${reconcileFeedback.type === 'success' ? '#A7F3D0' : reconcileFeedback.type === 'error' ? '#FECDD3' : '#E2E8F0'}`,
          color: reconcileFeedback.type === 'success' ? '#065F46' : reconcileFeedback.type === 'error' ? '#9F1239' : '#334155',
        }}>
          {reconcileFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{reconcileFeedback.message}</span>
        </div>
      )}

      {/* ── Error Banner ───────────────────────────────────── */}
      {isError && (
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
            <span>Unable to load certificates: {error?.message || 'Network error'}</span>
          </div>
          <button
            onClick={() => refetch()}
            className={styles.secondaryBtn}
            style={{ fontSize: 12, padding: '5px 10px' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#FFF7ED', color: '#EA580C' }}>
            <Award size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Total Credentials</span>
            <span className={styles.kpiValue}>{certificates.length}</span>
            <span className={styles.kpiSub}>Officially registered certificates</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#EFF6FF', color: '#2563EB' }}>
            <FileText size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Assessment Masteries</span>
            <span className={styles.kpiValue}>{assessmentCerts.length}</span>
            <span className={styles.kpiSub}>Evaluations scored &ge; 70%</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#ECFDF5', color: '#059669' }}>
            <ShieldCheck size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Course Completions</span>
            <span className={styles.kpiValue}>{courseCerts.length}</span>
            <span className={styles.kpiSub}>100% completed modules</span>
          </div>
        </div>
      </div>

      {/* ── Certificate Grid or Empty State ────────────────── */}
      {isLoading ? (
        <div style={{ padding: 64, textAlign: 'center', color: '#64748B' }}>
          <Clock size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 12, color: 'var(--color-primary-600)' }} />
          <div>Loading verified credentials...</div>
        </div>
      ) : certificates.length === 0 ? (
        <div style={{
          background: '#ffffff',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          padding: 56,
          textAlign: 'center',
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#F1F5F9',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748B',
            marginBottom: 16,
          }}>
            <Award size={28} />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
            No certificates earned yet
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: 13.5, color: '#64748B', maxWidth: 460, display: 'inline-block', lineHeight: 1.5 }}>
            Certificates are automatically issued when you pass an official competency assessment with 70% or higher, or complete an accredited course to 100%.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/quizzes" className={styles.viewBtn} style={{ textDecoration: 'none', flex: 'none', padding: '9px 18px' }}>
              <Sparkles size={14} />
              <span>Take Competency Assessments</span>
            </Link>
            <Link to="/courses/igot" className={styles.verifyLink} style={{ flex: 'none', padding: '9px 18px' }}>
              <BookOpen size={14} />
              <span>Browse Courses</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className={styles.certGrid}>
          {certificates.map((cert) => {
            const isCourse = cert.type === 'course_completion'
            const formattedDate = cert.issuedAt
              ? new Date(cert.issuedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Official Record'

            return (
              <div key={cert._id} className={styles.certCard}>
                <div>
                  <div className={styles.certCardTop}>
                    <span className={`${styles.certBadge} ${isCourse ? styles.certBadgeCourse : styles.certBadgeAssessment}`}>
                      {isCourse ? 'Course Completion' : 'Assessment Mastery'}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: cert.status === 'valid' ? '#059669' : '#E11D48' }}>
                      {cert.status === 'valid' ? 'Verified' : 'Revoked'}
                    </span>
                  </div>

                  <h3 className={styles.certTitle}>{cert.title}</h3>
                  <div className={styles.certRecipient}>
                    Recipient: <strong>{cert.recipientName || 'Learner'}</strong>
                  </div>

                  <div className={styles.certMetaGrid}>
                    <div className={styles.certMetaRow}>
                      <span className={styles.certMetaLabel}>Certificate ID</span>
                      <span className={styles.certMetaVal}>{cert.certificateId}</span>
                    </div>
                    <div className={styles.certMetaRow}>
                      <span className={styles.certMetaLabel}>Date Issued</span>
                      <span style={{ color: '#1E293B', fontWeight: 600 }}>{formattedDate}</span>
                    </div>
                    {cert.quizId?.title && (
                      <div className={styles.certMetaRow}>
                        <span className={styles.certMetaLabel}>Assessment</span>
                        <span style={{ color: '#1E293B', fontWeight: 500, maxWidth: 200, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {cert.quizId.title}
                        </span>
                      </div>
                    )}
                    {cert.courseId?.title && (
                      <div className={styles.certMetaRow}>
                        <span className={styles.certMetaLabel}>Course</span>
                        <span style={{ color: '#1E293B', fontWeight: 500, maxWidth: 200, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {cert.courseId.title}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.certCardActions}>
                  <button
                    type="button"
                    className={styles.viewBtn}
                    onClick={() => setSelectedCert(cert)}
                  >
                    <Award size={14} />
                    <span>View Certificate</span>
                  </button>
                  <Link
                    to={`/certificates/verify/${encodeURIComponent(cert.certificateId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.verifyLink}
                    title="Open public verification page"
                  >
                    <ExternalLink size={14} />
                    <span>Verify</span>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Certificate Preview Modal ──────────────────────── */}
      {selectedCert && (
        <div className={styles.modalOverlay} onClick={() => setSelectedCert(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Certificate Preview</h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setSelectedCert(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.certDocument} id="printable-certificate">
                <div className={styles.certEmblem}>
                  <Award size={38} color="#0F172A" />
                  <div className={styles.certOrg}>Ministry of Statistics and Programme Implementation</div>
                  <div className={styles.certSubOrg}>National Statistical Systems Training &bull; KaushalAI Credential</div>
                </div>

                <div className={styles.certMainTitle}>Certificate of Achievement</div>
                <div className={styles.certPresentsTo}>This is proudly presented to</div>
                <div className={styles.certRecipientName}>{selectedCert.recipientName || 'Learner'}</div>

                <div className={styles.certDescription}>
                  For successfully demonstrating professional competency and completing all prescribed requirements for{' '}
                  <strong>{selectedCert.title}</strong> in accordance with official National Statistical Standards.
                </div>

                <div className={styles.certFooterGrid}>
                  <div className={styles.certFooterCol}>
                    <strong>Certificate ID:</strong>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedCert.certificateId}</span>
                    <span>Status: {selectedCert.status === 'valid' ? 'Authoritative & Valid' : 'Revoked'}</span>
                  </div>

                  <div className={styles.certFooterCol} style={{ textAlign: 'right' }}>
                    <strong>Date of Issue:</strong>
                    <span>
                      {selectedCert.issuedAt
                        ? new Date(selectedCert.issuedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'Official Record'}
                    </span>
                    <span>MoSPI Capacity Building Cadre</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => window.print()}
              >
                <Printer size={14} />
                <span>Print Certificate</span>
              </button>
              <Link
                to={`/certificates/verify/${encodeURIComponent(selectedCert.certificateId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.viewBtn}
                style={{ textDecoration: 'none' }}
              >
                <ExternalLink size={14} />
                <span>Open Public Verification</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

