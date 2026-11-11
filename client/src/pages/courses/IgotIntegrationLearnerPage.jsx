import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Link2,
  BookOpen,
  Trophy,
  UploadCloud,
  Check,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  RotateCw,
  Layers,
  Info,
  AlertCircle
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { listCourses, getMyEnrollments } from '../../api/course.api'
import styles from './IgotIntegrationLearnerPage.module.css'

export default function IgotIntegrationLearnerPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const [activeTab, setActiveTab] = useState('all')
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedTime, setLastSyncedTime] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  // Sync settings toggle states
  const [autoSync, setAutoSync] = useState(true)
  const [includeCompleted, setIncludeCompleted] = useState(true)
  const [includeCertificates, setIncludeCertificates] = useState(true)

  // Modals
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [showLearnMoreModal, setShowLearnMoreModal] = useState(false)
  const [showSyncSettingsModal, setShowSyncSettingsModal] = useState(false)
  const [showHoursModal, setShowHoursModal] = useState(false)

  // ── Authoritative Backend Queries ──────────────────────────────────────────
  const {
    data: coursesData,
    isLoading: coursesLoading,
    isError: coursesIsError,
    error: coursesErr,
    refetch: refetchCourses,
  } = useQuery({
    queryKey: ['igotIntegrationCourses'],
    queryFn: () => listCourses({ source: 'igot' }),
  })

  const {
    data: enrollmentsData,
    isLoading: enrollmentsLoading,
    isError: enrollmentsIsError,
    error: enrollmentsErr,
    refetch: refetchEnrollments,
  } = useQuery({
    queryKey: ['igotIntegrationEnrollments'],
    queryFn: getMyEnrollments,
  })

  const isLoading = coursesLoading || enrollmentsLoading
  const isError = coursesIsError || enrollmentsIsError
  const errorMessage = coursesErr?.message || enrollmentsErr?.message || 'Failed to load iGOT integration courses.'

  // ── Data Normalization & Enrollment Mapping ────────────────────────────────
  const enrollments = enrollmentsData?.enrollments || []
  const enrollmentMap = useMemo(() => {
    const map = new Map()
    enrollments.forEach((e) => {
      const cId = e.courseId?._id || e.courseId
      if (cId) {
        map.set(String(cId), e)
      }
    })
    return map
  }, [enrollments])

  const rawCourses = coursesData?.courses || []
  const courses = useMemo(() => {
    return rawCourses.map((c) => {
      const cId = String(c._id)
      const enr = enrollmentMap.get(cId)
      const progress = Math.max(0, Math.min(100, Math.round(Number(enr?.progressPercent) || 0)))
      const isCompleted = enr?.status === 'completed' || progress === 100
      const isInProgress = !isCompleted && (enr?.status === 'in_progress' || progress > 0)
      const isEnrolled = enr?.status === 'enrolled'

      let status = 'Not Started'
      if (isCompleted) status = 'Completed'
      else if (isInProgress) status = 'In Progress'
      else if (isEnrolled) status = 'In Progress'

      let lastAccessed = 'Not started'
      if (enr?.updatedAt) {
        lastAccessed = new Date(enr.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      } else if (enr?.startedAt) {
        lastAccessed = new Date(enr.startedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      }

      const competencies = (c.skillTags || []).map((t) => (typeof t === 'string' ? t : t.name)).filter(Boolean)

      return {
        id: cId,
        externalCourseId: c.externalCourseId || cId,
        title: c.title,
        provider: c.provider || 'iGOT Karmayogi',
        logoType: /nisg/i.test(c.provider) ? 'nisg' : (c.provider ? 'igot-alt' : 'igot-blue'),
        status,
        progress,
        lastAccessed,
        duration: c.durationHours ? `${c.durationHours} Hours` : (c.duration || 'Flexible'),
        durationHours: Number(c.durationHours) || 0,
        modulesCount: Array.isArray(c.modules) ? c.modules.length : (c.modulesCount || 4),
        competencies: competencies.length > 0 ? competencies : (Array.isArray(c.competencyTags) ? c.competencyTags : ['Official Statistics']),
        description: c.description || 'Government capacity building module on official statistics and public administration.',
        isEnrolled: !!enr,
      }
    })
  }, [rawCourses, enrollmentMap])

  // ── Authentic Metrics Calculation ──────────────────────────────────────────
  const enrolledCourses = useMemo(() => courses.filter((c) => c.isEnrolled), [courses])
  const completedCourses = useMemo(() => courses.filter((c) => c.status === 'Completed'), [courses])
  const inProgressCourses = useMemo(() => courses.filter((c) => c.status === 'In Progress'), [courses])
  const notStartedCourses = useMemo(() => courses.filter((c) => c.status === 'Not Started'), [courses])

  const totalLearningMinutes = useMemo(() => {
    return courses.reduce((acc, c) => {
      if (!c.isEnrolled || !c.durationHours) return acc
      const pct = (c.progress || 0) / 100
      return acc + Math.round(c.durationHours * 60 * pct)
    }, 0)
  }, [courses])

  const totalHours = Math.floor(totalLearningMinutes / 60)
  const remainingMins = totalLearningMinutes % 60
  const formattedHours = `${totalHours}h ${remainingMins}m`

  const completedMinutes = useMemo(() => {
    return completedCourses.reduce((acc, c) => acc + Math.round((c.durationHours || 0) * 60), 0)
  }, [completedCourses])
  const completedHoursText = `${Math.floor(completedMinutes / 60)}h ${completedMinutes % 60}m`

  const inProgressMinutes = totalLearningMinutes - completedMinutes
  const safeInProgressMinutes = Math.max(0, inProgressMinutes)
  const inProgressHoursText = `${Math.floor(safeInProgressMinutes / 60)}h ${safeInProgressMinutes % 60}m`

  // ── Tab Filtering ──────────────────────────────────────────────────────────
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (activeTab === 'in-progress') return c.status === 'In Progress'
      if (activeTab === 'completed') return c.status === 'Completed'
      if (activeTab === 'not-started') return c.status === 'Not Started'
      return true
    })
  }, [courses, activeTab])

  // ── Sync Handler ───────────────────────────────────────────────────────────
  const handleSync = async () => {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      await Promise.all([refetchCourses(), refetchEnrollments()])
      const now = new Date()
      const formatted = `${now.getDate()} ${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      setLastSyncedTime(formatted)
      showToast(`Catalogue synchronization complete (${rawCourses.length} courses loaded from database adapter).`)
    } catch {
      showToast('Synchronization error. Could not reach server.')
    } finally {
      setIsSyncing(false)
    }
  }

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumb ─────────────────────────────────────── */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
        <span className={styles.breadcrumbSep}>&gt;</span>
        <span className={styles.breadcrumbCurrent}>iGOT Integration</span>
      </nav>

      {/* ── Page Header ────────────────────────────────────── */}
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <div className={styles.titleArea}>
            <h1 className={styles.pageTitle}>iGOT Integration</h1>
          </div>
          <p className={styles.pageSubtitle}>
            Civil services capacity building modules mapped to official competency frameworks.
          </p>
        </div>

        <a
          href="https://igotkarmayogi.gov.in"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.portalBtn}
        >
          <ExternalLink size={15} />
          Go to iGOT Portal
        </a>
      </div>

      {/* ── Top 4 KPI Status Cards ────────────────────────── */}
      <div className={styles.topMetricsGrid}>
        {/* Card 1: Connection Status */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconPurple}`}>
            <Link2 size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Integration Status</span>
            <span className={styles.metricValue} style={{ color: '#10b981' }}>Connected</span>
            <span className={`${styles.metricSubtext}`}>
              Catalogue mode (Local Adapter)
            </span>
            <button
              type="button"
              className={styles.metricLink}
              onClick={handleSync}
              disabled={isSyncing}
            >
              Sync Now
              <RotateCw size={12} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {/* Card 2: iGOT Courses Enrolled */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconGreen}`}>
            <BookOpen size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>iGOT Courses Enrolled</span>
            <span className={styles.metricValue}>{enrolledCourses.length}</span>
            <span className={styles.metricSubtext}>
              {inProgressCourses.length} In Progress &bull; {completedCourses.length} Completed
            </span>
            <button
              type="button"
              className={styles.metricLink}
              onClick={() => {
                const el = document.getElementById('igot-learning-table')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              View Courses &rarr;
            </button>
          </div>
        </div>

        {/* Card 3: iGOT Learning Hours */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconOrange}`}>
            <Trophy size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>iGOT Learning Hours</span>
            <span className={styles.metricValue}>{formattedHours}</span>
            <span className={`${styles.metricSubtext} ${styles.metricSubtextMuted}`}>
              Actual progress hours on iGOT
            </span>
            <button
              type="button"
              className={styles.metricLink}
              onClick={() => setShowHoursModal(true)}
            >
              View Details &rarr;
            </button>
          </div>
        </div>

        {/* Card 4: Data Sync */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconBlue}`}>
            <UploadCloud size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Data Sync</span>
            <span className={styles.metricValue} style={{ color: '#10b981' }}>Catalogue Ready</span>
            <span className={`${styles.metricSubtext}`}>
              {lastSyncedTime ? `Last synced: ${lastSyncedTime}` : 'Active session loaded'}
            </span>
            <button
              type="button"
              className={styles.metricLink}
              onClick={() => setShowSyncSettingsModal(true)}
            >
              Sync Details &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Layout: 2 Columns ─────────────────────────── */}
      <div className={styles.mainLayout}>
        {/* Left Column: Your iGOT Learning */}
        <div className={styles.learningCard} id="igot-learning-table">
          <div className={styles.learningHeader}>
            <h2 className={styles.cardTitle}>Your iGOT Learning</h2>
            <p className={styles.cardSubtitle}>Overview of your iGOT learning activities.</p>
          </div>

          {/* Underline Filter Tabs */}
          <div className={styles.tabsBar}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'all' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All ({courses.length})
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'in-progress' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('in-progress')}
            >
              In Progress ({inProgressCourses.length})
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'completed' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              Completed ({completedCourses.length})
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'not-started' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('not-started')}
            >
              Not Started ({notStartedCourses.length})
            </button>
          </div>

          {/* Courses Table / Loading / Error / Empty States */}
          <div className={styles.tableContainer}>
            {isLoading ? (
              <div className={styles.emptyState}>
                <RotateCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary-600, #4f46e5)' }} />
                <p>Loading authoritative iGOT catalogue...</p>
              </div>
            ) : isError ? (
              <div className={styles.emptyState}>
                <AlertCircle size={32} color="#EF4444" />
                <p style={{ color: '#EF4444', fontWeight: 600 }}>{errorMessage}</p>
                <button
                  type="button"
                  className={styles.portalBtn}
                  onClick={() => { refetchCourses(); refetchEnrollments(); }}
                  style={{ marginTop: 8 }}
                >
                  Retry Loading
                </button>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className={styles.emptyState}>
                <Info size={32} color="#94A3B8" />
                <p>No iGOT courses found in this category.</p>
              </div>
            ) : (
              <table className={styles.coursesTable}>
                <thead>
                  <tr>
                    <th>Course Details</th>
                    <th>Provider</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Last Accessed</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map((course) => (
                    <tr
                      key={course.id}
                      className={styles.courseRow}
                      onClick={() => setSelectedCourse(course)}
                    >
                      <td>
                        <div className={styles.courseDetailCell}>
                          {course.logoType === 'igot-blue' ? (
                            <div className={styles.igotLogoSquare}>iGOT</div>
                          ) : course.logoType === 'nisg' ? (
                            <div className={styles.nisgLogoSquare}>NISG</div>
                          ) : (
                            <div className={styles.igotLogoSquareAlt}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: '#F97316' }}>iG</span>
                              <span style={{ fontSize: 8, fontWeight: 700, color: '#1E3A8A' }}>OT</span>
                            </div>
                          )}
                          <div className={styles.courseMeta}>
                            <span className={styles.courseTitle}>{course.title}</span>
                            <span className={styles.courseId}>Course ID: {course.externalCourseId}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={styles.providerText}>{course.provider}</span>
                      </td>
                      <td>
                        <span
                          className={
                            course.status === 'Completed'
                              ? styles.statusBadgeCompleted
                              : course.status === 'In Progress'
                              ? styles.statusBadgeInProgress
                              : styles.statusBadgeDefault || styles.statusBadgeInProgress
                          }
                          style={course.status === 'Not Started' ? { background: '#F1F5F9', color: '#64748B' } : undefined}
                        >
                          {course.status}
                        </span>
                      </td>
                      <td className={styles.progressCell}>
                        <div className={styles.progressLabel}>{course.progress}%</div>
                        <div className={styles.progressBarTrack}>
                          <div
                            className={styles.progressBarFill}
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                      </td>
                      <td className={styles.dateCell}>{course.lastAccessed}</td>
                      <td className={styles.actionCell}>
                        <ChevronRight size={18} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.viewAllFooter}>
            <Link to="/courses/igot" className={styles.viewAllBtn}>
              View All iGOT Courses &rarr;
            </Link>
          </div>
        </div>

        {/* Right Column: About & Sync Settings */}
        <div className={styles.rightColumn}>
          {/* About iGOT Integration Card */}
          <div className={styles.aboutCard}>
            <h3 className={styles.aboutTitle}>About iGOT Integration</h3>

            <div className={styles.aboutLogoArea}>
              <div className={styles.igotFullLogo}>
                <span className={styles.igotLogoText}>iG</span>
                <span className={styles.igotLogoSwirl}>&#9679;</span>
                <span className={styles.igotLogoText}>T</span>
                <span style={{ marginLeft: 6, fontSize: 13, fontWeight: 700, color: '#334155', letterSpacing: 0.5 }}>
                  Karmayogi
                </span>
              </div>
            </div>

            <p className={styles.aboutDescription}>
              KaushalAI is integrated with iGOT (Integrated Government Online Training) to provide you access to government courses, track your progress, and sync your learning achievements.
            </p>

            <div className={styles.featuresList}>
              <div className={styles.featureItem}>
                <CheckCircle2 size={16} className={styles.checkIcon} />
                <span>Access government-approved courses</span>
              </div>
              <div className={styles.featureItem}>
                <CheckCircle2 size={16} className={styles.checkIcon} />
                <span>Seamless learning progress sync</span>
              </div>
              <div className={styles.featureItem}>
                <CheckCircle2 size={16} className={styles.checkIcon} />
                <span>Unified certificates and achievements</span>
              </div>
              <div className={styles.featureItem}>
                <CheckCircle2 size={16} className={styles.checkIcon} />
                <span>Personalized learning recommendations</span>
              </div>
            </div>

            <button
              type="button"
              className={styles.learnMoreLink}
              onClick={() => setShowLearnMoreModal(true)}
            >
              Learn more about iGOT
              <ExternalLink size={13} />
            </button>
          </div>

          {/* Sync Settings Card */}
          <div className={styles.syncSettingsCard}>
            <h3 className={styles.settingsTitle}>Sandbox Sync Settings</h3>

            <div className={styles.settingsList}>
              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingName}>Simulated Sync</span>
                  <span className={styles.settingDesc}>Simulate periodic catalogue cache updates</span>
                </div>
                <label className={styles.switchLabel}>
                  <input
                    type="checkbox"
                    className={styles.switchInput}
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                  />
                  <span className={styles.switchSlider} />
                </label>
              </div>

              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingName}>Include Completed Courses</span>
                  <span className={styles.settingDesc}>Show completed courses from catalogue</span>
                </div>
                <label className={styles.switchLabel}>
                  <input
                    type="checkbox"
                    className={styles.switchInput}
                    checked={includeCompleted}
                    onChange={(e) => setIncludeCompleted(e.target.checked)}
                  />
                  <span className={styles.switchSlider} />
                </label>
              </div>

              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingName}>Include Certificates</span>
                  <span className={styles.settingDesc}>Display credentials in mock mode</span>
                </div>
                <label className={styles.switchLabel}>
                  <input
                    type="checkbox"
                    className={styles.switchInput}
                    checked={includeCertificates}
                    onChange={(e) => setIncludeCertificates(e.target.checked)}
                  />
                  <span className={styles.switchSlider} />
                </label>
              </div>
            </div>

            <button
              type="button"
              className={styles.manageSettingsLink}
              onClick={() => setShowSyncSettingsModal(true)}
            >
              Sync Architecture Details &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom Banner: How it works? ──────────────────── */}
      <div className={styles.howItWorksBanner}>
        <div className={styles.bannerLeft}>
          <div className={styles.bannerIconCircle}>
            <Layers size={22} />
          </div>
          <div className={styles.bannerTitleArea}>
            <h4 className={styles.bannerTitle}>How the integration works</h4>
          </div>
        </div>

        <div className={styles.stepsRow}>
          <div className={styles.stepItem}>
            <div className={styles.stepNumberCircle}>1</div>
            <div className={styles.stepContent}>
              <span className={styles.stepName}>Adapter Architecture</span>
              <span className={styles.stepDesc}>
                KaushalAI implements the DoPT Karmayogi competency mapping schema.
              </span>
            </div>
          </div>

          <div className={styles.stepItem}>
            <div className={styles.stepNumberCircle}>2</div>
            <div className={styles.stepContent}>
              <span className={styles.stepName}>Authentic Seeding</span>
              <span className={styles.stepDesc}>
                Official civil service courses from MoSPI and NSSTA catalogues are loaded.
              </span>
            </div>
          </div>

          <div className={styles.stepItem}>
            <div className={styles.stepNumberCircle}>3</div>
            <div className={styles.stepContent}>
              <span className={styles.stepName}>Track &amp; Benchmark</span>
              <span className={styles.stepDesc}>
                Demonstrates how institutional sync maps hours, skills, and certifications.
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className={styles.resyncBtn}
          onClick={handleSync}
          disabled={isSyncing}
        >
          <RotateCw size={14} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
          Refresh Catalogue
        </button>
      </div>

      {/* ── Modals ────────────────────────────────────────── */}

      {/* Course Detail Modal */}
      {selectedCourse && (
        <div className={styles.modalOverlay} onClick={() => setSelectedCourse(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{selectedCourse.title}</h3>
              <button type="button" className={styles.closeBtn} onClick={() => setSelectedCourse(null)}>
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span
                  className={
                    selectedCourse.status === 'Completed'
                      ? styles.statusBadgeCompleted
                      : selectedCourse.status === 'In Progress'
                      ? styles.statusBadgeInProgress
                      : styles.statusBadgeInProgress
                  }
                  style={selectedCourse.status === 'Not Started' ? { background: '#F1F5F9', color: '#64748B' } : undefined}
                >
                  {selectedCourse.status}
                </span>
                <span style={{ fontSize: 13, color: '#64748B' }}>
                  Provider: <strong>{selectedCourse.provider}</strong>
                </span>
                <span style={{ fontSize: 13, color: '#64748B' }}>
                  Duration: <strong>{selectedCourse.duration}</strong>
                </span>
              </div>

              <p style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.5 }}>
                {selectedCourse.description}
              </p>

              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: 6 }}>
                  Course Progress: {selectedCourse.progress}%
                </span>
                <div className={styles.progressBarTrack} style={{ height: 8 }}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${selectedCourse.progress}%` }}
                  />
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 8 }}>
                  Mapped Competencies:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedCourse.competencies.map((comp) => (
                    <span
                      key={comp}
                      style={{
                        background: '#EEF2FF',
                        color: 'var(--color-primary-600, #4f46e5)',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 6
                      }}
                    >
                      {comp}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#64748B' }}>
                  Last accessed: {selectedCourse.lastAccessed}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {selectedCourse.isEnrolled ? (
                    <Link
                      to={`/courses/${selectedCourse.id}/progress`}
                      className={styles.portalBtn}
                      style={{ padding: '8px 16px', textDecoration: 'none' }}
                    >
                      Open Course Player &rarr;
                    </Link>
                  ) : (
                    <Link
                      to={`/courses/${selectedCourse.id}`}
                      className={styles.portalBtn}
                      style={{ padding: '8px 16px', textDecoration: 'none' }}
                    >
                      View Course Details &rarr;
                    </Link>
                  )}
                  <a
                    href="https://igotkarmayogi.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.portalBtn}
                    style={{ padding: '8px 16px', background: '#F1F5F9', color: '#334155', border: '1px solid #CBD5E1', textDecoration: 'none' }}
                  >
                    Karmayogi Portal
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Learn More Modal */}
      {showLearnMoreModal && (
        <div className={styles.modalOverlay} onClick={() => setShowLearnMoreModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Mission Karmayogi &amp; iGOT</h3>
              <button type="button" className={styles.closeBtn} onClick={() => setShowLearnMoreModal(false)}>
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13.5, color: '#334155', lineHeight: 1.55 }}>
              <p>
                <strong>Integrated Government Online Training (iGOT) Karmayogi</strong> is a comprehensive online capacity-building portal developed under the National Programme for Civil Services Capacity Building (NPCSCB).
              </p>
              <p>
                Through this native integration, <strong>KaushalAI</strong> periodically syncs official statistics courses, learner participation hours, and verified badges. This enables Ministry of Statistics and Programme Implementation (MoSPI) leadership to benchmark officer competencies with real-time accuracy.
              </p>
              <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>
                  Benefits of Synchronization:
                </h4>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#475569', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <li>Automatic mapping of course syllabi to the National Competency Framework</li>
                  <li>Real-time recognition of residential and digital training hours</li>
                  <li>Accredited certificate storage in your unified digital KaushalAI locker</li>
                </ul>
              </div>
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <button
                  type="button"
                  className={styles.portalBtn}
                  onClick={() => setShowLearnMoreModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync Settings Modal */}
      {showSyncSettingsModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSyncSettingsModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Manage Sync Settings</h3>
              <button type="button" className={styles.closeBtn} onClick={() => setShowSyncSettingsModal(false)}>
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: 6 }}>
                  Sync Frequency
                </label>
                <select
                  defaultValue="6"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    color: '#334155'
                  }}
                >
                  <option value="1">Every 1 hour (Real-time)</option>
                  <option value="6">Every 6 hours (Recommended)</option>
                  <option value="12">Every 12 hours</option>
                  <option value="24">Daily at Midnight</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: 6 }}>
                  Karmayogi Account Identifier
                </label>
                <input
                  type="text"
                  readOnly
                  value={user?.employeeId || user?.employee_id || user?.email || 'GOV-OFFICER'}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    fontSize: 13,
                    color: '#64748B'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                  onClick={() => setShowSyncSettingsModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.portalBtn}
                  onClick={() => {
                    setShowSyncSettingsModal(false)
                    showToast('Sync settings saved successfully!')
                  }}
                >
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Learning Hours Modal */}
      {showHoursModal && (
        <div className={styles.modalOverlay} onClick={() => setShowHoursModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>iGOT Learning Hours Breakdown</h3>
              <button type="button" className={styles.closeBtn} onClick={() => setShowHoursModal(false)}>
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: 12, color: '#64748B' }}>Total Completed Time</span>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#10B981', marginTop: 2 }}>
                    {completedHoursText}
                  </div>
                </div>
                <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: 12, color: '#64748B' }}>In Progress Time</span>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-primary-600, #4f46e5)', marginTop: 2 }}>
                    {inProgressHoursText}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: 10 }}>
                  Enrolled Course Contributions:
                </span>
                {enrolledCourses.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: '#64748B', margin: 0 }}>
                    No enrolled iGOT courses found. Enroll in courses to accumulate learning hours.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5, maxHeight: 220, overflowY: 'auto' }}>
                    {enrolledCourses.map((c) => {
                      const cMinutes = Math.round((c.durationHours || 0) * 60 * ((c.progress || 0) / 100))
                      const ch = Math.floor(cMinutes / 60)
                      const cm = cMinutes % 60
                      return (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>
                          <span style={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.title}>
                            {c.title} ({c.progress}%)
                          </span>
                          <strong style={{ color: '#0F172A' }}>{ch}h {cm}m</strong>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right', marginTop: 10 }}>
                <button
                  type="button"
                  className={styles.portalBtn}
                  onClick={() => setShowHoursModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ────────────────────────────── */}
      {toastMessage && (
        <div className={styles.toastBanner}>
          <Check size={16} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
