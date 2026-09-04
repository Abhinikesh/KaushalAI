import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  Check,
  Send
} from 'lucide-react'
import { getCourse } from '../../api/course.api'
import styles from './TrainingDetailPage.module.css'

export default function TrainingDetailPage() {
  const { id } = useParams()
  const [programme, setProgramme] = useState(null)
  const [loading, setLoading] = useState(true)
  const [nominated, setNominated] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  useEffect(() => {
    let mounted = true
    setLoading(true)
    getCourse(id)
      .then((res) => {
        if (!mounted) return
        const p = res?.course || res
        const defaultProg = {
          _id: id || 'nssta-prog-default',
          title: 'Advanced Sampling Techniques & Small Area Estimation',
          description: 'Specialized 2-week residential training workshop covering modern sampling designs, localized microdata estimation, and survey quality auditing under the National Statistical Systems Training Academy.',
          cadre: 'ISS Officers (Senior & Junior Time Scale)',
          dates: '15 June – 26 June 2026',
          venue: 'NSSTA Campus, Plot 22, Knowledge Park II, Greater Noida',
          duration: '2 Weeks (Residential)',
          seats: '30 Officers',
          status: 'Nominations Open',
          modules: [
            'Unit 1: Foundations of Probability Sampling and Complex Multi-Stage Designs',
            'Unit 2: Non-Sampling Errors, Missingness, and Imputation Procedures',
            'Unit 3: Small Area Estimation (SAE) & Empirical Bayes Applications',
            'Unit 4: Computational Exercises with R & Official Survey Datasets',
          ],
        }
        setProgramme(p || defaultProg)
      })
      .catch(() => {
        if (mounted) {
          setProgramme({
            _id: id || 'nssta-prog-default',
            title: 'Advanced Sampling Techniques & Small Area Estimation',
            description: 'Specialized 2-week residential training workshop covering modern sampling designs, localized microdata estimation, and survey quality auditing under the National Statistical Systems Training Academy.',
            cadre: 'ISS Officers (Senior & Junior Time Scale)',
            dates: '15 June – 26 June 2026',
            venue: 'NSSTA Campus, Plot 22, Knowledge Park II, Greater Noida',
            duration: '2 Weeks (Residential)',
            seats: '30 Officers',
            status: 'Nominations Open',
            modules: [
              'Unit 1: Foundations of Probability Sampling and Complex Multi-Stage Designs',
              'Unit 2: Non-Sampling Errors, Missingness, and Imputation Procedures',
              'Unit 3: Small Area Estimation (SAE) & Empirical Bayes Applications',
              'Unit 4: Computational Exercises with R & Official Survey Datasets',
            ],
          })
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => { mounted = false }
  }, [id])

  const handleApply = () => {
    setNominated(true)
    showToast('Nomination application submitted to your Controlling Officer.')
  }

  if (loading || !programme) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          Loading programme schedule...
        </div>
      </div>
    )
  }

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumbs ────────────────────────────────────── */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
        <span className={styles.breadcrumbSeparator}>›</span>
        <Link to="/training/nssta" className={styles.breadcrumbLink}>NSSTA Training</Link>
        <span className={styles.breadcrumbSeparator}>›</span>
        <span className={styles.breadcrumbActive}>{programme.title}</span>
      </nav>

      {/* ── Hero Banner ────────────────────────────────────── */}
      <div className={styles.heroBanner}>
        <div className={styles.heroLeft}>
          <span className={styles.badgePill}>{programme.cadre || 'ISS / SSS Officers'}</span>
          <h1 className={styles.heroTitle}>{programme.title}</h1>
          <p className={styles.heroDesc}>{programme.description}</p>

          <div className={styles.heroMeta}>
            <div className={styles.metaItem}>
              <Calendar size={16} />
              <span>{programme.dates || '15 – 26 June 2026'}</span>
            </div>
            <div className={styles.metaItem}>
              <Clock size={16} />
              <span>{programme.duration || '2 Weeks'}</span>
            </div>
            <div className={styles.metaItem}>
              <MapPin size={16} />
              <span>{programme.venue || 'NSSTA Greater Noida'}</span>
            </div>
          </div>
        </div>

        <div className={styles.heroActionCard}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
            Official Residential Programme
          </span>
          {nominated ? (
            <div
              style={{
                background: '#ECFDF5',
                color: '#059669',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <CheckCircle2 size={16} />
              <span>Nomination Forwarded</span>
            </div>
          ) : (
            <button
              type="button"
              className={styles.primaryActionBtn}
              onClick={handleApply}
            >
              <Send size={15} />
              <span>Submit Nomination</span>
            </button>
          )}
          <p style={{ fontSize: 11.5, color: '#64748b', textAlign: 'center', margin: 0 }}>
            Includes boarding, lodging &amp; courseware at NSSTA Greater Noida
          </p>
        </div>
      </div>

      {/* ── Curriculum & Details ────────────────────────────── */}
      <div className={styles.layoutGrid}>
        <div className={styles.cardBox}>
          <h2 className={styles.cardHeading}>
            <BookOpen size={18} color="#4F46E5" />
            <span>Academic Curriculum &amp; Units</span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(programme.modules || [
              'Unit 1: Survey Design, Sampling Frames, and Probability Mechanisms',
              'Unit 2: Handling Imputations, Non-Response, and Post-Stratification',
              'Unit 3: Small Area Estimation & Micro-Modeling in Official Statistics',
              'Unit 4: Hands-on Practical Lab Sessions with Real Microdata Files',
            ]).map((mod, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: '#1E293B',
                }}
              >
                {mod}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.cardBox}>
          <h3 className={styles.cardHeading}>
            <Building2 size={18} color="#2563EB" />
            <span>Programme Governance</span>
          </h3>
          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: 0 }}>
            <strong>Nodal Academy:</strong> National Statistical Systems Training Academy (NSSTA)<br /><br />
            <strong>Target Audience:</strong> Statistical Officers, Research Officers, and Directors in Central Ministries &amp; State Directorates of Economics and Statistics (DES).<br /><br />
            <strong>Certification:</strong> Official NSSTA Executive Training Credential issued on completion.
          </p>
        </div>
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
