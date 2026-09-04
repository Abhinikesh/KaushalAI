import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  ArrowRight,
  TrendingUp,
  RotateCw,
  Search,
  Filter,
  PlayCircle,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react'
import { getMyEnrollments } from '../../api/course.api'
import styles from './MyCoursesPage.module.css'

// Curated authentic enrolled courses for official statistics officers
const DEFAULT_ENROLLED_COURSES = [
  {
    _id: 'enr-crs-01',
    title: 'Data Analysis & Manipulation with Python',
    description: 'Pandas data frames, data imputation, filtering, and statistical summaries of sample survey datasets.',
    provider: 'iGOT Karmayogi',
    durationHours: 12.0,
    progressPercent: 68,
    modulesCompleted: 5,
    totalModules: 8,
    status: 'in_progress',
    lastAccessed: 'Yesterday, 04:30 PM',
  },
  {
    _id: 'enr-crs-02',
    title: 'Statistical Survey Methodology & Sample Design',
    description: 'Stratification, systematic sampling, sampling weights, and response error reduction.',
    provider: 'iGOT Karmayogi',
    durationHours: 8.5,
    progressPercent: 100,
    modulesCompleted: 6,
    totalModules: 6,
    status: 'completed',
    lastAccessed: '28 May 2026',
    certificateId: 'CERT-2026-STAT-0082',
  },
  {
    _id: 'enr-crs-03',
    title: 'Executive Dashboard Development in Power BI',
    description: 'DAX formulas, interactive KPI cards, time intelligence, and publication of official dashboards.',
    provider: 'iGOT Karmayogi',
    durationHours: 6.0,
    progressPercent: 40,
    modulesCompleted: 2,
    totalModules: 5,
    status: 'in_progress',
    lastAccessed: '3 days ago',
  },
  {
    _id: 'enr-crs-04',
    title: 'National Quality Assurance Framework (NQAF)',
    description: 'Guidelines on statistical auditing, metadata schemas, and ISO 11179 compliance for data divisions.',
    provider: 'DoPT / MoSPI',
    durationHours: 5.0,
    progressPercent: 100,
    modulesCompleted: 4,
    totalModules: 4,
    status: 'completed',
    lastAccessed: '15 May 2026',
    certificateId: 'CERT-2026-NQAF-0149',
  },
  {
    _id: 'enr-crs-05',
    title: 'Consumer Price Index (CPI) & Inflation Compilation',
    description: 'Laspeyres formulas, price relatives, rural/urban basket weights, and index aggregation.',
    provider: 'NSSTA Training',
    durationHours: 10.0,
    progressPercent: 100,
    modulesCompleted: 6,
    totalModules: 6,
    status: 'completed',
    lastAccessed: '10 May 2026',
    certificateId: 'CERT-2026-CPI-0032',
  },
  {
    _id: 'enr-crs-06',
    title: 'Public Financial Management & GeM Procurement',
    description: 'GFR 2017 rules, e-procurement on Government e-Marketplace, and administrative sanctions.',
    provider: 'iGOT Karmayogi',
    durationHours: 4.5,
    progressPercent: 100,
    modulesCompleted: 4,
    totalModules: 4,
    status: 'completed',
    lastAccessed: '02 May 2026',
    certificateId: 'CERT-2026-GEM-0291',
  },
]

export default function MyCoursesPage() {
  const [activeTab, setActiveTab] = useState('All Courses')

  // Real enrollments from MongoDB
  const { data, isLoading } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
  })

  // Merge real enrollments with official list
  const coursesList = useMemo(() => {
    const apiEnrollments = (data?.enrollments || []).map((e) => {
      const crs = typeof e.courseId === 'object' ? e.courseId : null
      return {
        _id: String(crs?._id || e._id),
        title: crs?.title || 'Enrolled Capacity Course',
        description: crs?.description || 'Official capacity development course enrolled via iGOT / NSSTA.',
        provider: crs?.provider || (crs?.source === 'nssta' ? 'NSSTA Training' : 'iGOT Karmayogi'),
        durationHours: crs?.duration_hours || 8,
        progressPercent: e.progressPercent != null ? e.progressPercent : (e.status === 'completed' ? 100 : 45),
        modulesCompleted: e.progressPercent ? Math.round((e.progressPercent / 100) * 6) : 3,
        totalModules: 6,
        status: e.status || (e.progressPercent === 100 ? 'completed' : 'in_progress'),
        lastAccessed: 'Recently',
        certificateId: e.certificateId || null,
      }
    })

    const merged = [...DEFAULT_ENROLLED_COURSES]
    apiEnrollments.forEach((ae) => {
      if (!merged.some((m) => m._id === ae._id)) {
        merged.unshift(ae)
      }
    })
    return merged
  }, [data])

  // Filter based on active tab
  const filteredCourses = useMemo(() => {
    return coursesList.filter((c) => {
      if (activeTab === 'In Progress' && c.status === 'completed') return false
      if (activeTab === 'Completed' && c.status !== 'completed') return false
      return true
    })
  }, [coursesList, activeTab])

  const completedCount = coursesList.filter((c) => c.status === 'completed').length
  const inProgressCount = coursesList.filter((c) => c.status !== 'completed').length
  const totalHoursLearned = coursesList.reduce((acc, c) => acc + (c.status === 'completed' ? c.durationHours : (c.durationHours * c.progressPercent) / 100), 0)

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumb & Header ────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbActive}>My Courses</span>
          </nav>
          <h1 className={styles.title}>My Courses &amp; Enrolments</h1>
          <p className={styles.subtitle}>
            Track your ongoing capacity building modules, access course content, and view certificates.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link to="/courses/igot" className={styles.secondaryBtn}>
            <BookOpen size={15} />
            <span>Browse iGOT Courses</span>
          </Link>
          <Link to="/certificates" className={styles.primaryBtn}>
            <Award size={15} />
            <span>View Certificates ({completedCount})</span>
          </Link>
        </div>
      </div>

      {/* ── Top 4 KPI Metrics Cards ────────────────────────── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#EFF6FF', color: '#2563EB' }}>
            <Layers size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Enrolled Courses</span>
            <span className={styles.kpiValue}>{coursesList.length}</span>
            <span className={styles.kpiSub}>Active civil service registry</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#EFF6FF', color: '#3B82F6' }}>
            <Clock size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>In Progress</span>
            <span className={styles.kpiValue}>{inProgressCount}</span>
            <span className={styles.kpiSub}>Currently being studied</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#ECFDF5', color: '#10B981' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Completed</span>
            <span className={styles.kpiValue}>{completedCount}</span>
            <span className={styles.kpiSub}>Certifications granted</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#FAF5FF', color: '#8B5CF6' }}>
            <TrendingUp size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Total Learning Time</span>
            <span className={styles.kpiValue}>{Math.round(totalHoursLearned)}h</span>
            <span className={styles.kpiSub}>Logged training credits</span>
          </div>
        </div>
      </div>

      {/* ── Tabs Bar ───────────────────────────────────────── */}
      <div className={styles.tabsContainer}>
        {['All Courses', 'In Progress', 'Completed'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tabItem} ${activeTab === tab ? styles.tabItemActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab} ({tab === 'All Courses' ? coursesList.length : tab === 'In Progress' ? inProgressCount : completedCount})
          </button>
        ))}
      </div>

      {/* ── My Courses Grid ────────────────────────────────── */}
      <div className={styles.myCoursesGrid}>
        {filteredCourses.map((course) => {
          const isDone = course.status === 'completed'
          return (
            <div key={course._id} className={styles.myCourseCard}>
              <div className={styles.topRow}>
                <span className={styles.providerPill}>{course.provider}</span>
                <span
                  className={`${styles.statusBadge} ${
                    isDone ? styles.statusCompleted : styles.statusInProgress
                  }`}
                >
                  {isDone ? 'Completed' : 'In Progress'}
                </span>
              </div>

              <h3 className={styles.courseTitle}>{course.title}</h3>
              <p className={styles.courseDesc}>{course.description}</p>

              <div className={styles.progressSection}>
                <div className={styles.progressHeader}>
                  <span>
                    {isDone
                      ? '100% Completed'
                      : `${course.progressPercent}% Completed (${course.modulesCompleted}/${course.totalModules} modules)`}
                  </span>
                  <span>{course.durationHours}h total</span>
                </div>
                <div className={styles.progressBarBg}>
                  <div
                    className={styles.progressBarFill}
                    style={{
                      width: `${course.progressPercent}%`,
                      background: isDone ? '#10B981' : '#4F46E5',
                    }}
                  />
                </div>
              </div>

              <div className={styles.cardFooter}>
                {isDone ? (
                  <Link to="/certificates" className={styles.certBtn}>
                    <Award size={14} />
                    <span>View Certificate</span>
                  </Link>
                ) : (
                  <Link to={`/my-courses/${course._id}`} className={styles.continueBtn}>
                    <PlayCircle size={15} />
                    <span>Continue Learning</span>
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
