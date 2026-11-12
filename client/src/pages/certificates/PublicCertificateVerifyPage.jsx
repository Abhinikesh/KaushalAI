import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowLeft,
  RotateCcw,
  Award
} from 'lucide-react'
import { verifyCertificatePublic } from '../../api/userFeatures.api'
import styles from './PublicCertificateVerifyPage.module.css'

export default function PublicCertificateVerifyPage() {
  const { certificateId: routeCertId } = useParams()
  const [certIdInput, setCertIdInput] = useState(routeCertId || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [networkError, setNetworkError] = useState(null)

  const handleVerify = async (idToVerify) => {
    const cleanId = (idToVerify || certIdInput || '').trim()
    if (!cleanId) return

    setLoading(true)
    setNetworkError(null)

    try {
      const data = await verifyCertificatePublic(cleanId)
      setResult(data)
    } catch (err) {
      setNetworkError(err?.message || 'Unable to connect to verification authority. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (routeCertId && routeCertId.trim()) {
      handleVerify(routeCertId.trim())
    }
  }, [routeCertId])

  const handleSubmit = (e) => {
    e.preventDefault()
    handleVerify(certIdInput)
  }

  return (
    <div className={styles.verifyPage}>
      {/* ── Top Portal Navigation Bar ──────────────────────── */}
      <header className={styles.topBar}>
        <div className={styles.logoWrap}>
          <Award size={26} color="var(--color-primary-600)" />
          <div>
            <div className={styles.portalTitle}>KaushalAI Credential Registry</div>
            <div className={styles.portalSub}>Public Verification Service</div>
          </div>
        </div>

        <Link
          to="/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-primary-600)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={14} />
          <span>Learner Portal</span>
        </Link>
      </header>

      {/* ── Main Verification Card ─────────────────────────── */}
      <main className={styles.mainContent}>
        <div className={styles.verifyCard}>
          <div className={styles.cardHeader}>
            <div className={styles.headerIcon}>
              <ShieldCheck size={28} />
            </div>
            <h1 className={styles.cardTitle}>Credential Verification Service</h1>
            <p className={styles.cardSubtitle}>
              Authenticate and verify capacity building certificates and competency credentials issued by KaushalAI.
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.searchForm}>
            <input
              type="text"
              className={styles.inputField}
              placeholder="e.g. KAUSHAL-CERT-2026-CA4610EF8D2F3B1A"
              value={certIdInput}
              onChange={(e) => setCertIdInput(e.target.value)}
              aria-label="Certificate ID"
              disabled={loading}
            />
            <button
              type="submit"
              className={styles.verifyBtn}
              disabled={loading || !certIdInput.trim()}
            >
              {loading ? <Clock size={15} className="spin" /> : <Search size={15} />}
              <span>{loading ? 'Verifying...' : 'Verify'}</span>
            </button>
          </form>

          {/* ── Network Error ─────────────────────────────────── */}
          {networkError && (
            <div className={`${styles.resultCard} ${styles.resultRevoked}`}>
              <div className={styles.resultHeader}>
                <XCircle size={22} color="#DC2626" />
                <div className={`${styles.resultStatusText} ${styles.revokedText}`}>
                  Connection Failure
                </div>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 13.5, color: '#334155' }}>
                {networkError}
              </p>
              <button
                type="button"
                onClick={() => handleVerify(certIdInput)}
                className={styles.verifyBtn}
                style={{ padding: '6px 14px', fontSize: 12.5 }}
              >
                <RotateCcw size={13} />
                <span>Retry Verification</span>
              </button>
            </div>
          )}

          {/* ── Result Presentation ───────────────────────────── */}
          {result && !loading && (
            <>
              {result.valid ? (
                <div className={`${styles.resultCard} ${styles.resultValid}`}>
                  <div className={styles.resultHeader}>
                    <CheckCircle2 size={24} color="#16A34A" />
                    <div>
                      <div className={`${styles.resultStatusText} ${styles.validText}`}>
                        Verified &bull; Authentic Credential
                      </div>
                      <div style={{ fontSize: 12.5, color: '#15803D' }}>
                        Active and verified record in the KaushalAI digital credential registry.
                      </div>
                    </div>
                  </div>

                  <div className={styles.detailGrid}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Certificate Title</span>
                      <span className={styles.detailValue}>{result.title}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Recipient Name</span>
                      <span className={styles.detailValue}>{result.recipientName}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Credential Type</span>
                      <span className={styles.detailValue}>
                        {result.type === 'course_completion' ? 'Course Completion' : 'Assessment Mastery'}
                      </span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Certificate ID</span>
                      <span className={styles.detailValue} style={{ fontFamily: 'monospace' }}>
                        {result.certificateId}
                      </span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Issue Date</span>
                      <span className={styles.detailValue}>
                        {result.issuedAt
                          ? new Date(result.issuedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : 'Recorded Date'}
                      </span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Status</span>
                      <span style={{ fontWeight: 700, color: '#16A34A' }}>Active &bull; Valid</span>
                    </div>
                  </div>
                </div>
              ) : result.status === 'revoked' ? (
                <div className={`${styles.resultCard} ${styles.resultRevoked}`}>
                  <div className={styles.resultHeader}>
                    <AlertTriangle size={24} color="#DC2626" />
                    <div>
                      <div className={`${styles.resultStatusText} ${styles.revokedText}`}>
                        Credential Revoked
                      </div>
                      <div style={{ fontSize: 12.5, color: '#991B1B' }}>
                        This certificate was revoked in accordance with administrative audits.
                      </div>
                    </div>
                  </div>

                  <div className={styles.detailGrid}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Certificate Title</span>
                      <span className={styles.detailValue}>{result.title || 'Competency Credential'}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Certificate ID</span>
                      <span className={styles.detailValue} style={{ fontFamily: 'monospace' }}>
                        {result.certificateId}
                      </span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Status</span>
                      <span style={{ fontWeight: 700, color: '#DC2626' }}>Revoked &bull; Non-Valid</span>
                    </div>
                  </div>
                </div>
              ) : result.status === 'not_found' ? (
                <div className={`${styles.resultCard} ${styles.resultNotFound}`}>
                  <div className={styles.resultHeader}>
                    <XCircle size={24} color="#D97706" />
                    <div>
                      <div className={`${styles.resultStatusText} ${styles.notFoundText}`}>
                        Certificate Not Found
                      </div>
                      <div style={{ fontSize: 12.5, color: '#92400E' }}>
                        No record exists in the KaushalAI credential registry matching ID &ldquo;{certIdInput}&rdquo;.
                      </div>
                    </div>
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#78350F' }}>
                    Please verify the Certificate ID printed on your document and re-enter without spaces or special characters.
                  </p>
                </div>
              ) : result.status === 'rate_limited' ? (
                <div className={`${styles.resultCard} ${styles.resultNotFound}`}>
                  <div className={styles.resultHeader}>
                    <Clock size={24} color="#D97706" />
                    <div>
                      <div className={`${styles.resultStatusText} ${styles.notFoundText}`}>
                        Rate Limit Exceeded
                      </div>
                      <div style={{ fontSize: 12.5, color: '#92400E' }}>
                        Too many verification requests submitted from your IP address.
                      </div>
                    </div>
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#78350F' }}>
                    Please wait one minute before submitting another verification request.
                  </p>
                </div>
              ) : (
                <div className={`${styles.resultCard} ${styles.resultInvalid}`}>
                  <div className={styles.resultHeader}>
                    <AlertTriangle size={24} color="#64748B" />
                    <div>
                      <div className={`${styles.resultStatusText} ${styles.invalidText}`}>
                        Invalid Certificate ID Format
                      </div>
                      <div style={{ fontSize: 12.5, color: '#475569' }}>
                        {result.message || 'The entered certificate ID does not conform to the expected format.'}
                      </div>
                    </div>
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#475569' }}>
                    KaushalAI certificate IDs follow the standard: <code>KAUSHAL-CERT-YYYY-XXXXXXXXXXXXXXXX</code>.
                  </p>
                </div>
              )}
            </>
          )}

          <div className={styles.footerNote}>
            All issued credentials are independently verifiable through the KaushalAI digital credential registry.
            Records strictly adhere to learner data privacy and protection standards.
          </div>
        </div>
      </main>
    </div>
  )
}

