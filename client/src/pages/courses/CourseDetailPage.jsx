import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Clock,
  BookOpen,
  Star,
  Award,
  CheckCircle2,
  PlayCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  ChevronDown,
  Layers,
  FileText
} from 'lucide-react'
import { getCourse, getMyEnrollments, enrollInCourse } from '../../api/course.api'
import styles from './CourseDetailPage.module.css'

export default function CourseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [enrollment, setEnrollment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  useEffect(() => {
    let mounted = true
    setLoading(true)

    Promise.all([
      getCourse(id).catch(() => null),
      getMyEnrollments().catch(() => ({ enrollments: [] })),
    ])
      .then(([courseRes, enrollRes]) => {
        if (!mounted) return
        const crs = courseRes?.course || courseRes

        // Fallback default course object if specific ID not found in local mock
        const fallbackCourse = {
          _id: id || 'crs-default',
          title: 'Data Analysis & Statistical Computing with Python',
          description: 'A comprehensive capacity building course on applying Python and modern open-source scientific tools to process, clean, and model official statistical microdata.',
          provider: 'iGOT Karmayogi',
          category: 'Statistical Methods',
          difficulty: 'Intermediate',
          durationHours: 12.5,
          rating: 4.8,
          reviewsCount: 780,
          skillTags: ['Python Programming', 'Pandas & NumPy', 'Microdata Cleaning', 'Survey Weighting', 'Data Visualization'],
          modules: [
            {
              title: 'Module 1: Introduction to Scientific Python for Official Statistics',
              duration: '2.5h',
              lessons: ['Python Environment & Jupyter Setup', 'NumPy Arrays & Mathematical Operations', 'Pandas DataFrames Basics'],
            },
            {
              title: 'Module 2: Microdata Ingestion, Cleaning & Imputation',
              duration: '3.0h',
              lessons: ['Importing Fixed-Width & Delimited NSSO Files', 'Handling Missing Values with Hot-Deck Imputation', 'Outlier Detection Methods'],
            },
            {
              title: 'Module 3: Tabular Aggregation & Complex Sampling Weights',
              duration: '4.0h',
              lessons: ['Applying Multiplier Weights', 'Pivot Tables and Crosstab Analysis', 'Variance & Standard Error Calculations'],
            },
            {
              title: 'Module 4: Visualization & Dissemination of Statistical Indicators',
              duration: '3.0h',
              lessons: ['Matplotlib & Seaborn Charting Standards', 'Interactive Plots with Plotly', 'Exporting Standardised MoSPI Release Tables'],
            },
          ],
        }

        setCourse(crs || fallbackCourse)

        const enrollList = enrollRes?.enrollments || []
        const enr = enrollList.find((e) => {
          const cId = typeof e.courseId === 'object' ? e.courseId._id : e.courseId
          return String(cId) === String(id)
        })
        setEnrollment(enr || null)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => { mounted = false }
  }, [id])

  const handleEnroll = async () => {
    try {
      setEnrolling(true)
      const res = await enrollInCourse(id)
      setEnrollment(res?.enrollment || res || { status: 'in_progress', progressPercent: 0 })
      showToast('Enrolled in course successfully!')
    } catch (err) {
      setEnrollment({ status: 'in_progress', progressPercent: 0 })
      showToast('Enrolled successfully in offline demonstration mode.')
    } finally {
      setEnrolling(false)
    }
  }

  if (loading || !course) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          Loading course specifications...
        </div>
      </div>
    )
  }

  const isEnrolled = Boolean(enrollment)

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumbs ────────────────────────────────────── */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
        <span className={styles.breadcrumbSeparator}>›</span>
        <Link to="/courses/igot" className={styles.breadcrumbLink}>iGOT Courses</Link>
        <span className={styles.breadcrumbSeparator}>›</span>
        <span className={styles.breadcrumbActive}>{course.title}</span>
      </nav>

      {/* ── Hero Banner ────────────────────────────────────── */}
      <div className={styles.heroBanner}>
        <div className={styles.heroLeft}>
          <span className={styles.providerBadge}>{course.provider || 'iGOT Karmayogi'}</span>
          <h1 className={styles.heroTitle}>{course.title}</h1>
          <p className={styles.heroDesc}>{course.description}</p>

          <div className={styles.heroMeta}>
            <div className={styles.metaItem}>
              <Clock size={16} />
              <span>{course.durationHours || 10} Hours</span>
            </div>
            <div className={styles.metaItem}>
              <BookOpen size={16} />
              <span>{course.modules?.length || 4} Modules</span>
            </div>
            <div className={styles.metaItem}>
              <Star size={16} fill="#F59E0B" color="#F59E0B" />
              <span>{course.rating || 4.8} ({course.reviewsCount || 420} ratings)</span>
            </div>
            <div className={styles.metaItem}>
              <Award size={16} />
              <span>Official Certificate Included</span>
            </div>
          </div>
        </div>

        {/* Action Card */}
        <div className={styles.heroActionCard}>
          <span className={styles.priceTag}>Free for Civil Services</span>
          {isEnrolled ? (
            <Link to={`/my-courses/${course._id}`} className={styles.successActionBtn}>
              <PlayCircle size={16} />
              <span>Continue Course</span>
            </Link>
          ) : (
            <button
              type="button"
              className={styles.primaryActionBtn}
              onClick={handleEnroll}
              disabled={enrolling}
            >
              <Sparkles size={16} />
              <span>{enrolling ? 'Enrolling...' : 'Enroll in iGOT'}</span>
            </button>
          )}
          <p className={styles.actionSubtext}>
            Synchronized with your official employee learning record
          </p>
        </div>
      </div>

      {/* ── Main Two-Column Layout ─────────────────────────── */}
      <div className={styles.contentLayout}>
        <div className={styles.mainColumn}>
          {/* Syllabus Section */}
          <div className={styles.cardBox}>
            <h2 className={styles.cardHeading}>
              <BookOpen size={18} color="#4F46E5" />
              <span>Course Curriculum &amp; Syllabus</span>
            </h2>

            <div className={styles.modulesList}>
              {(course.modules || []).map((module, idx) => (
                <div key={idx} className={styles.moduleItem}>
                  <div className={styles.moduleHeader}>
                    <span>{module.title}</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{module.duration}</span>
                  </div>
                  {module.lessons && (
                    <div className={styles.moduleLessons}>
                      {module.lessons.map((lesson, lIdx) => (
                        <div key={lIdx} className={styles.lessonItem}>
                          <span>• {lesson}</span>
                          <span style={{ color: '#94a3b8' }}>Video / Practical</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Learning Objectives */}
          <div className={styles.cardBox}>
            <h2 className={styles.cardHeading}>
              <CheckCircle2 size={18} color="#10B981" />
              <span>What You Will Learn</span>
            </h2>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5, color: '#334155' }}>
              <li>Understand the foundational programming concepts required for large official statistical datasets.</li>
              <li>Perform clean microdata ingestion, imputations, and survey error adjustments.</li>
              <li>Compute correct sampling weights, standard errors, and national accounts aggregates.</li>
              <li>Design compliant visual dashboards for dissemination across ministries.</li>
            </ul>
          </div>
        </div>

        <div className={styles.sideColumn}>
          {/* Competency Mapping */}
          <div className={styles.cardBox}>
            <h3 className={styles.cardHeading}>
              <Layers size={18} color="#8B5CF6" />
              <span>Mapped Competencies</span>
            </h3>
            <div className={styles.skillTagsWrap}>
              {(course.skillTags || []).map((skill, idx) => (
                <span key={idx} className={styles.skillPill}>
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Certification Card */}
          <div className={styles.cardBox}>
            <h3 className={styles.cardHeading}>
              <ShieldCheck size={18} color="#059669" />
              <span>Accreditation</span>
            </h3>
            <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.5, margin: 0 }}>
              Upon successful completion of all modules and passing the final evaluation quiz (min. 70%), an authentic MoSPI &amp; iGOT Karmayogi certificate will be issued to your profile.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
