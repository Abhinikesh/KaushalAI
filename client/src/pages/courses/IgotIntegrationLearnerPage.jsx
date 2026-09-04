import React, { useState } from 'react'
import { Link } from 'react-router-dom'
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
  Clock,
  Shield,
  Award,
  BookMarked,
  Layers,
  Sparkles,
  Info,
  Sliders,
  CheckSquare
} from 'lucide-react'
import styles from './IgotIntegrationLearnerPage.module.css'

export default function IgotIntegrationLearnerPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedTime, setLastSyncedTime] = useState('19 May 2026, 10:30 AM')
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

  // Mock iGOT courses list
  const courses = [
    {
      id: '112233',
      title: 'Official Statistics: Concepts and Principles',
      provider: 'MoSPI',
      logoType: 'igot-blue',
      status: 'In Progress',
      progress: 75,
      lastAccessed: '19 May 2026',
      duration: '10 Hours',
      modulesCount: 6,
      competencies: ['Statistical Systems', 'Data Quality', 'Official Protocols'],
      description: 'Foundational framework of national statistical systems, official classifications, and UN statistical guidelines.'
    },
    {
      id: '334455',
      title: 'Data Visualization for Official Statistics',
      provider: 'MoSPI',
      logoType: 'igot-alt',
      status: 'In Progress',
      progress: 40,
      lastAccessed: '18 May 2026',
      duration: '8 Hours',
      modulesCount: 5,
      competencies: ['Data Visualization', 'Interactive Dashboards', 'Chart Design'],
      description: 'Techniques for presenting complex statistical survey results and macroeconomic indicators effectively.'
    },
    {
      id: '556677',
      title: 'Survey Design and Sampling Methods',
      provider: 'NISG',
      logoType: 'nisg',
      status: 'Completed',
      progress: 100,
      lastAccessed: '15 May 2026',
      duration: '12 Hours',
      modulesCount: 8,
      competencies: ['Sampling Methodology', 'Stratified Sampling', 'Survey Error'],
      description: 'Comprehensive study of multi-stage stratified sampling, sample weight calculation, and survey execution.'
    },
    {
      id: '778899',
      title: 'Data Quality and Validation',
      provider: 'NISG',
      logoType: 'nisg',
      status: 'In Progress',
      progress: 60,
      lastAccessed: '17 May 2026',
      duration: '6 Hours',
      modulesCount: 4,
      competencies: ['Outlier Detection', 'Data Scrubbing', 'Verification Metrics'],
      description: 'Frameworks for validating field reports, census data, and administrative statistics against standard thresholds.'
    },
    {
      id: '990011',
      title: 'Use of R in Official Statistics',
      provider: 'MoSPI',
      logoType: 'igot-alt',
      status: 'In Progress',
      progress: 20,
      lastAccessed: '16 May 2026',
      duration: '14 Hours',
      modulesCount: 9,
      competencies: ['R Programming', 'Reproducible Research', 'Data Automation'],
      description: 'Practical data science with R, tidyverse, and survey packages designed specifically for national statisticians.'
    },
    {
      id: '443322',
      title: 'National Accounts & Macroeconomic Aggregates',
      provider: 'MoSPI',
      logoType: 'igot-blue',
      status: 'Completed',
      progress: 100,
      lastAccessed: '10 May 2026',
      duration: '15 Hours',
      modulesCount: 7,
      competencies: ['SNA 2008 Framework', 'GDP Deflators', 'Gross Value Added'],
      description: 'Understanding System of National Accounts (SNA), supply-use tables, and compilation of quarterly GDP.'
    },
    {
      id: '887766',
      title: 'Consumer Price Index (CPI) & Inflation Indices',
      provider: 'MoSPI',
      logoType: 'igot-blue',
      status: 'In Progress',
      progress: 85,
      lastAccessed: '14 May 2026',
      duration: '9 Hours',
      modulesCount: 5,
      competencies: ['CPI Calculation', 'Laspeyres Index', 'Market Price Monitoring'],
      description: 'Methodology for collecting rural and urban retail prices, basket weights, and headline inflation computation.'
    }
  ]

  // Filtered courses
  const filteredCourses = courses.filter((c) => {
    if (activeTab === 'in-progress') return c.status === 'In Progress'
    if (activeTab === 'completed') return c.status === 'Completed'
    if (activeTab === 'not-started') return c.status === 'Not Started'
    return true
  })

  // Trigger sync handler
  const handleSync = () => {
    if (isSyncing) return
    setIsSyncing(true)
    setTimeout(() => {
      setIsSyncing(false)
      const now = new Date()
      const formatted = `${now.getDate()} ${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      setLastSyncedTime(formatted)
      showToast('iGOT data synchronized successfully! 7 courses and 32h 15m updated.')
    }, 1200)
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
            <span className={styles.connectedBadge}>
              <span className={styles.connectedDot} />
              Connected
            </span>
          </div>
          <p className={styles.pageSubtitle}>
            Access iGOT courses, sync your learning, and track your progress seamlessly.
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
            <span className={styles.metricLabel}>Connection Status</span>
            <span className={styles.metricValue}>Connected</span>
            <span className={`${styles.metricSubtext} ${styles.metricSubtextMuted}`}>
              Last synced: {lastSyncedTime}
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
            <span className={styles.metricValue}>7</span>
            <span className={styles.metricSubtext}>
              5 In Progress &bull; 2 Completed
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
            <span className={styles.metricValue}>32h 15m</span>
            <span className={`${styles.metricSubtext} ${styles.metricSubtextMuted}`}>
              Total learning time on iGOT
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
            <span className={styles.metricValue}>Up to date</span>
            <span className={`${styles.metricSubtext} ${styles.metricSubtextMuted}`}>
              Auto-sync is enabled
            </span>
            <button
              type="button"
              className={styles.metricLink}
              onClick={() => setShowSyncSettingsModal(true)}
            >
              Manage Sync &rarr;
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
              All (7)
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'in-progress' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('in-progress')}
            >
              In Progress (5)
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'completed' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              Completed (2)
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'not-started' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('not-started')}
            >
              Not Started (0)
            </button>
          </div>

          {/* Courses Table */}
          <div className={styles.tableContainer}>
            {filteredCourses.length === 0 ? (
              <div className={styles.emptyState}>
                <Info size={32} color="#94A3B8" />
                <p>No courses found in this category.</p>
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
                            <span className={styles.courseId}>Course ID: {course.id}</span>
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
                              : styles.statusBadgeInProgress
                          }
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
            <h3 className={styles.settingsTitle}>Sync Settings</h3>

            <div className={styles.settingsList}>
              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingName}>Auto Sync</span>
                  <span className={styles.settingDesc}>Automatically sync progress every 6 hours</span>
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
                  <span className={styles.settingDesc}>Show completed courses from iGOT</span>
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
                  <span className={styles.settingDesc}>Sync certificates from iGOT</span>
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
              Manage Sync Settings &rarr;
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
            <h4 className={styles.bannerTitle}>How it works?</h4>
          </div>
        </div>

        <div className={styles.stepsRow}>
          <div className={styles.stepItem}>
            <div className={styles.stepNumberCircle}>1</div>
            <div className={styles.stepContent}>
              <span className={styles.stepName}>Connect</span>
              <span className={styles.stepDesc}>
                Your KaushalAI account is securely connected with iGOT.
              </span>
            </div>
          </div>

          <div className={styles.stepItem}>
            <div className={styles.stepNumberCircle}>2</div>
            <div className={styles.stepContent}>
              <span className={styles.stepName}>Learn</span>
              <span className={styles.stepDesc}>
                Enroll in courses on iGOT and continue your learning.
              </span>
            </div>
          </div>

          <div className={styles.stepItem}>
            <div className={styles.stepNumberCircle}>3</div>
            <div className={styles.stepContent}>
              <span className={styles.stepName}>Sync &amp; Track</span>
              <span className={styles.stepDesc}>
                Your progress, learning hours and certificates are synced to KaushalAI.
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
          Resync Now
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
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span
                  className={
                    selectedCourse.status === 'Completed'
                      ? styles.statusBadgeCompleted
                      : styles.statusBadgeInProgress
                  }
                >
                  {selectedCourse.status}
                </span>
                <span style={{ fontSize: 13, color: '#64748B' }}>
                  Provider: <strong>{selectedCourse.provider}</strong>
                </span>
                <span style={{ fontSize: 13, color: '#64748B' }}>
                  ID: <strong>{selectedCourse.id}</strong>
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
                        color: '#4F46E5',
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <span style={{ fontSize: 12, color: '#64748B' }}>
                  Last accessed on {selectedCourse.lastAccessed}
                </span>
                <a
                  href={`https://igotkarmayogi.gov.in/app/toc/${selectedCourse.id}/overview`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.portalBtn}
                  style={{ padding: '8px 16px' }}
                >
                  Continue on iGOT
                  <ExternalLink size={14} />
                </a>
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
                  value="GOV-MOSPI-2026-AV"
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
                  <span style={{ fontSize: 12, color: '#64748B' }}>Total Completed</span>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#10B981', marginTop: 2 }}>27h 00m</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: 12, color: '#64748B' }}>In Progress Time</span>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#4F46E5', marginTop: 2 }}>5h 15m</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: 10 }}>
                  Recent Module Contributions:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <span>Survey Design and Sampling Methods</span>
                    <strong style={{ color: '#0F172A' }}>12h 00m</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <span>National Accounts Statistics</span>
                    <strong style={{ color: '#0F172A' }}>15h 00m</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <span>Official Statistics: Concepts &amp; Principles</span>
                    <strong style={{ color: '#0F172A' }}>3h 30m</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <span>Data Quality and Validation</span>
                    <strong style={{ color: '#0F172A' }}>1h 45m</strong>
                  </div>
                </div>
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
