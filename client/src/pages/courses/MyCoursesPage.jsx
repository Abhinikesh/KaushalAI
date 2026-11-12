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

export default function MyCoursesPage() {
  const [activeTab, setActiveTab] = useState('All Courses')

  // Real enrollments from MongoDB
  const { data, isLoading } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
  })

  const coursesList = useMemo(() => {
    return (data?.enrollments || []).map((e) => {
      const crs = typeof e.courseId === 'object' ? e.courseId : null
      const progressPct = e.progressPercent != null ? e.progressPercent : (e.status === 'completed' ? 100 : 0)
      const totalMods = e.contentProgressSummary?.eligibleModulesCount || crs?.modules?.length || 0
      const completedMods = e.contentProgressSummary?.completedModulesCount ?? (Array.isArray(e.completedModules) ? e.completedModules.length : 0)
      return {
        _id: String(crs?._id || e.courseId || e._id),
        title: crs?.title || e.courseSnapshot?.title || 'Enrolled Capacity Course',
        description: crs?.description || 'Official capacity development course enrolled via iGOT / NSSTA.',
        provider: crs?.provider || (crs?.source === 'nssta' ? 'NSSTA Training' : 'iGOT Karmayogi'),
        durationHours: crs?.duration_hours || crs?.durationHours || e.courseSnapshot?.duration_hours || 8,
        progressPercent: progressPct,
        modulesCompleted: completedMods,
        totalModules: totalMods,
        status: e.status || (progressPct === 100 ? 'completed' : 'in_progress'),
        lastAccessed: e.lastAccessedAt ? new Date(e.lastAccessedAt).toLocaleDateString() : 'Recently',
      }
    })
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
          <Link to="/achievements" className={styles.primaryBtn}>
            <Award size={15} />
            <span>View Achievements ({completedCount})</span>
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
      {isLoading ? (
        <div className={styles.myCoursesGrid}>
          <div className={styles.myCourseCard}>
            <p className={styles.courseDesc}>Loading your enrolled courses...</p>
          </div>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className={styles.myCoursesGrid}>
          <div className={styles.myCourseCard}>
            <h3 className={styles.courseTitle}>
              {activeTab === 'All Courses'
                ? 'No enrolled courses yet'
                : `No ${activeTab.toLowerCase()} courses`}
            </h3>
            <p className={styles.courseDesc}>
              Browse the iGOT / NSSTA course catalog to enroll in capacity building modules and track your progress.
            </p>
            <div className={styles.cardFooter}>
              <Link to="/courses/igot" className={styles.continueBtn}>
                <BookOpen size={15} />
                <span>Browse Courses</span>
              </Link>
            </div>
          </div>
        </div>
      ) : (
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
                      background: isDone ? '#10B981' : 'var(--color-primary-600)',
                    }}
                  />
                </div>
              </div>

              <div className={styles.cardFooter}>
                {isDone ? (
                  <Link to="/achievements" className={styles.certBtn}>
                    <Award size={14} />
                    <span>View Achievements</span>
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
      )}
    </div>
  )
}
