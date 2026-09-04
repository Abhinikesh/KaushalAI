import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Layers,
  Award,
  CheckCircle2,
  BookOpen,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Star,
  Check,
  TrendingUp,
  FileQuestion
} from 'lucide-react'
import { getCompetencies, getMyCompetencies, updateMyCompetency } from '../../api/competency.api'
import { listCourses } from '../../api/course.api'
import styles from './CompetencyDetailPage.module.css'

const DEFAULT_LEVEL_RUBRICS = [
  { level: 1, name: 'Beginner', desc: 'Understands basic definitions, terminology, and foundational concepts under close supervision.' },
  { level: 2, name: 'Basic', desc: 'Can execute routine standard procedures independently and identify common data irregularities.' },
  { level: 3, name: 'Intermediate', desc: 'Applies methodological tools to complex survey designs and interprets analytical outputs with confidence.' },
  { level: 4, name: 'Advanced', desc: 'Guides junior officers, customizes estimation models, and resolves edge cases in sampling frames.' },
  { level: 5, name: 'Expert', desc: 'Formulates national guidelines, leads advisory committees, and represents MoSPI on international panels.' },
]

export default function CompetencyDetailPage() {
  const { id } = useParams()
  const [competency, setCompetency] = useState(null)
  const [currentLevel, setCurrentLevel] = useState(2)
  const [targetLevel, setTargetLevel] = useState(4)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  useEffect(() => {
    let mounted = true
    setLoading(true)

    Promise.all([
      getCompetencies().catch(() => ({ competencies: [] })),
      getMyCompetencies().catch(() => ({ competencies: [] })),
    ])
      .then(([allRes, myRes]) => {
        if (!mounted) return
        const allList = allRes.competencies || allRes || []
        const found = allList.find((c) => String(c._id) === String(id) || String(c.id) === String(id))

        const fallback = {
          _id: id || 'comp-01',
          name: 'Survey Design & Sampling Methods',
          category: 'Statistical Methods',
          description: 'Design and implementation of multi-stage stratified sample surveys, probability weights, and sampling variance calculations for national socio-economic rounds.',
        }

        setCompetency(found || fallback)

        const myList = myRes.competencies || myRes || []
        const userComp = myList.find((uc) => {
          const compId = uc.competencyId?._id || uc.competencyId || uc._id
          return String(compId) === String(id)
        })
        if (userComp) {
          setCurrentLevel(userComp.currentLevel || 2)
          setTargetLevel(userComp.targetLevel || 4)
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => { mounted = false }
  }, [id])

  const handleUpdateLevel = async (newLevel) => {
    try {
      setSaving(true)
      await updateMyCompetency(id, newLevel).catch(() => null)
      setCurrentLevel(newLevel)
      showToast(`Competency level updated to Level ${newLevel}!`)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !competency) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          Loading competency details...
        </div>
      </div>
    )
  }

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumb ─────────────────────────────────────── */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
        <span className={styles.breadcrumbSeparator}>›</span>
        <Link to="/skills" className={styles.breadcrumbLink}>Skills &amp; Competencies</Link>
        <span className={styles.breadcrumbSeparator}>›</span>
        <span className={styles.breadcrumbActive}>{competency.name}</span>
      </nav>

      {/* ── Header Card ────────────────────────────────────── */}
      <div className={styles.headerCard}>
        <div className={styles.headerLeft}>
          <span className={styles.domainPill}>{competency.category || 'Statistical Methods'}</span>
          <h1 className={styles.title}>{competency.name}</h1>
          <p className={styles.desc}>{competency.description}</p>
        </div>

        <div className={styles.levelStatusWrap}>
          <span className={styles.statusLabel}>My Current Level</span>
          <div className={styles.currentLevelBadge}>
            <Award size={22} color="#4F46E5" />
            <span>Level {currentLevel} • {DEFAULT_LEVEL_RUBRICS[currentLevel - 1]?.name}</span>
          </div>
          <span style={{ fontSize: 11.5, color: '#64748b' }}>
            Cadre Target: <strong>Level {targetLevel}</strong> (Gap: {Math.max(0, targetLevel - currentLevel)} levels)
          </span>
        </div>
      </div>

      {/* ── Layout Grid ────────────────────────────────────── */}
      <div className={styles.layoutGrid}>
        {/* Left: 5-Level Rubric */}
        <div className={styles.cardBox}>
          <h2 className={styles.cardHeading}>
            <Layers size={18} color="#4F46E5" />
            <span>Official 5-Level Proficiency Progression</span>
          </h2>

          <div className={styles.levelsLadder}>
            {DEFAULT_LEVEL_RUBRICS.map((rubric) => {
              const isCurrent = rubric.level === currentLevel
              return (
                <div
                  key={rubric.level}
                  className={`${styles.levelItem} ${isCurrent ? styles.activeLevelItem : ''}`}
                >
                  <div className={`${styles.levelBadgeNum} ${isCurrent ? styles.activeLevelNum : ''}`}>
                    {rubric.level}
                  </div>

                  <div className={styles.levelItemContent}>
                    <div className={styles.levelItemHeader}>
                      <span className={styles.levelName}>
                        Level {rubric.level} — {rubric.name}
                      </span>
                      {isCurrent && (
                        <span className={styles.currentIndicator}>Current Verified Level</span>
                      )}
                    </div>
                    <p className={styles.levelDescription}>{rubric.desc}</p>
                  </div>

                  {!isCurrent && (
                    <button
                      type="button"
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#475569',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      onClick={() => handleUpdateLevel(rubric.level)}
                      disabled={saving}
                    >
                      Set Level
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Actions & Linked Resources */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Practice Card */}
          <div className={styles.cardBox}>
            <h3 className={styles.cardHeading}>
              <Sparkles size={18} color="#8B5CF6" />
              <span>Bridge This Skill Gap</span>
            </h3>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: '0 0 16px' }}>
              Enhance your proficiency to meet Cadre Benchmark Level {targetLevel} through tailored learning.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link
                to="/recommendations"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: '#4F46E5',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <BookOpen size={15} />
                <span>Explore Recommended Courses</span>
              </Link>
              <Link
                to="/quizzes"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: '#ffffff',
                  border: '1px solid #E2E8F0',
                  color: '#334155',
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <FileQuestion size={15} />
                <span>Take Diagnostic Assessment</span>
              </Link>
            </div>
          </div>

          {/* Standards Info */}
          <div className={styles.cardBox}>
            <h3 className={styles.cardHeading}>
              <ShieldCheck size={18} color="#10B981" />
              <span>MoSPI Cadre Alignment</span>
            </h3>
            <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.5, margin: 0 }}>
              Evaluated under the National Statistical Competency Framework codified for ISS and SSS officers by the Ministry of Statistics and Programme Implementation.
            </p>
          </div>
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
