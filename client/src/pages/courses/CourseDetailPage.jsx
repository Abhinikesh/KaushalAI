import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Clock,
  Terminal,
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
import apiClient from '../../api/client'
import styles from './CourseDetailPage.module.css'

const IGOT_YOUTUBE_VIDEOS = {
  'igot-crs-01': 'YZf5q-ICf8Y',
  'igot-crs-02': 'cqRbNpuuzeI',
  'igot-crs-03': 'a7w2s0hiUK8',
  'igot-crs-04': 'qfOgdj4Okdw',
  'igot-crs-05': '20Hbv5Oo_Tg',
  'igot-crs-06': 'RZBAaIsnUbU',
}

const QUICK_IGOT_DETAILS = {
  'igot-crs-01': {
    learningObjectives: [
      'Understand survey design and sampling concepts.',
      'Select suitable sampling methods for official surveys.',
      'Plan sample size and allocation.',
      'Apply weighting and estimation principles.',
      'Use quality checks for survey data.'
    ],
    modules: [
      {
        title: 'Module 1: Survey Methodology Fundamentals',
        duration: '1.5h',
        lessons: ['Survey objectives', 'Target population', 'Sources of survey error']
      },
      {
        title: 'Module 2: Sampling Designs',
        duration: '1.5h',
        lessons: ['Simple sampling', 'Stratified sampling', 'Multistage sampling']
      },
      {
        title: 'Module 3: Sample Size & Allocation',
        duration: '1.25h',
        lessons: ['Sample size', 'Precision', 'Allocation methods']
      },
      {
        title: 'Module 4: Field Survey Design',
        duration: '1.25h',
        lessons: ['Fieldwork planning', 'Non-response', 'Quality controls']
      },
      {
        title: 'Module 5: Weighting & Estimation',
        duration: '1.5h',
        lessons: ['Survey weights', 'Estimation', 'Standard errors']
      },
      {
        title: 'Module 6: Survey Quality Assurance',
        duration: '1.5h',
        lessons: ['Validation', 'Quality indicators', 'Documentation']
      }
    ]
  },

  'igot-crs-02': {
    learningObjectives: [
      'Work with Python for official statistical datasets.',
      'Use Pandas and NumPy for data manipulation.',
      'Clean and validate datasets.',
      'Perform exploratory data analysis.',
      'Create useful statistical visualizations.'
    ],
    modules: [
      {
        title: 'Module 1: Python Fundamentals',
        duration: '1.5h',
        lessons: ['Python setup', 'Variables and functions', 'Jupyter Notebook']
      },
      {
        title: 'Module 2: NumPy',
        duration: '1.5h',
        lessons: ['Arrays', 'Mathematical operations', 'Statistics']
      },
      {
        title: 'Module 3: Pandas',
        duration: '1.5h',
        lessons: ['DataFrames', 'Filtering', 'Import and export']
      },
      {
        title: 'Module 4: Data Cleaning',
        duration: '1.5h',
        lessons: ['Missing values', 'Duplicates', 'Validation']
      },
      {
        title: 'Module 5: Data Transformation',
        duration: '1.5h',
        lessons: ['Merge and join', 'GroupBy', 'Pivot tables']
      },
      {
        title: 'Module 6: Exploratory Analysis',
        duration: '1.5h',
        lessons: ['Descriptive statistics', 'Outliers', 'Cross-tabulation']
      },
      {
        title: 'Module 7: Data Visualization',
        duration: '1.5h',
        lessons: ['Charts', 'Statistical plots', 'Reporting']
      },
      {
        title: 'Module 8: Practical Case Study',
        duration: '1.5h',
        lessons: ['Real dataset', 'Analysis workflow', 'Final report']
      }
    ]
  },

  'igot-crs-03': {
    learningObjectives: [
      'Understand statistical quality dimensions.',
      'Apply NQAF principles.',
      'Manage metadata and documentation.',
      'Perform quality checks.',
      'Identify opportunities for continuous improvement.'
    ],
    modules: [
      {
        title: 'Module 1: Statistical Quality',
        duration: '1.25h',
        lessons: ['Quality dimensions', 'User needs', 'Quality culture']
      },
      {
        title: 'Module 2: NQAF Framework',
        duration: '1.25h',
        lessons: ['NQAF principles', 'Responsibilities', 'Metadata']
      },
      {
        title: 'Module 3: Quality Assurance Process',
        duration: '1.25h',
        lessons: ['Process controls', 'Validation', 'Error management']
      },
      {
        title: 'Module 4: Monitoring & Improvement',
        duration: '1.25h',
        lessons: ['Quality indicators', 'Audit', 'Improvement plans']
      }
    ]
  },

  'igot-crs-04': {
    learningObjectives: [
      'Understand the SNA 2008 framework.',
      'Understand GDP and GVA compilation.',
      'Work with supply-use concepts.',
      'Understand price and volume measures.',
      'Apply national accounts quality checks.'
    ],
    modules: [
      {
        title: 'Module 1: National Accounts Framework',
        duration: '1.5h',
        lessons: ['National accounts', 'Sectors', 'Transactions']
      },
      {
        title: 'Module 2: SNA 2008 Concepts',
        duration: '1.5h',
        lessons: ['Production boundary', 'Valuation', 'Accounting framework']
      },
      {
        title: 'Module 3: GDP & GVA',
        duration: '1.5h',
        lessons: ['Production approach', 'Expenditure approach', 'Income approach']
      },
      {
        title: 'Module 4: Supply & Use Tables',
        duration: '1.5h',
        lessons: ['Supply table', 'Use table', 'Balancing']
      },
      {
        title: 'Module 5: Estimates',
        duration: '1.5h',
        lessons: ['Benchmark estimates', 'Annual estimates', 'Compilation']
      },
      {
        title: 'Module 6: Deflators & Volume Measures',
        duration: '1.5h',
        lessons: ['Price indices', 'Deflation', 'Volume measures']
      }
    ]
  },

  'igot-crs-05': {
    learningObjectives: [
      'Prepare datasets for Power BI.',
      'Build data models and relationships.',
      'Create DAX measures and KPIs.',
      'Design executive dashboards.',
      'Present statistical information clearly.'
    ],
    modules: [
      {
        title: 'Module 1: Power BI Fundamentals',
        duration: '1.25h',
        lessons: ['Power BI interface', 'Data import', 'Power Query']
      },
      {
        title: 'Module 2: Data Modelling',
        duration: '1.25h',
        lessons: ['Relationships', 'Tables', 'Data models']
      },
      {
        title: 'Module 3: DAX & KPIs',
        duration: '1.25h',
        lessons: ['Measures', 'DAX basics', 'KPI creation']
      },
      {
        title: 'Module 4: Dashboard Design',
        duration: '1h',
        lessons: ['Charts', 'Filters', 'Visual storytelling']
      },
      {
        title: 'Module 5: Executive Dashboard',
        duration: '1.25h',
        lessons: ['Dashboard creation', 'Validation', 'Publishing']
      }
    ]
  },

  'igot-crs-06': {
    learningObjectives: [
      'Understand the Sustainable Development Goals.',
      'Understand the National Indicator Framework.',
      'Work with SDG data sources.',
      'Monitor state-level indicators.',
      'Communicate SDG progress effectively.'
    ],
    modules: [
      {
        title: 'Module 1: SDG Framework',
        duration: '1.25h',
        lessons: ['17 SDGs', 'Targets', 'Indicators']
      },
      {
        title: 'Module 2: National Indicator Framework',
        duration: '1.25h',
        lessons: ['NIF structure', 'Indicator definitions', 'Targets']
      },
      {
        title: 'Module 3: Data Sources & Flows',
        duration: '1.25h',
        lessons: ['Administrative data', 'Survey data', 'Reporting flows']
      },
      {
        title: 'Module 4: Indicator Validation',
        duration: '1.25h',
        lessons: ['Validation', 'Disaggregation', 'Missing data']
      },
      {
        title: 'Module 5: State-Level Monitoring',
        duration: '1.25h',
        lessons: ['Progress tracking', 'State comparison', 'Trend analysis']
      },
      {
        title: 'Module 6: Dissemination',
        duration: '1.25h',
        lessons: ['Dashboards', 'Reporting', 'Policy use']
      }
    ]
  }
}

export default function CourseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [enrollment, setEnrollment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [labUnlocked, setLabUnlocked] = useState(false)
  const [labCompleted, setLabCompleted] = useState(false)
  const [labScore, setLabScore] = useState(null)
  const [startingLab, setStartingLab] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  const fetchLabStatus = () => {
    if (!id) return
    apiClient.get(`/labs/status/${id}`)
      .then((res) => {
        if (res.data?.lab_unlocked) {
          setLabUnlocked(true)
        }
        if (res.data?.lab_completed) {
          setLabCompleted(true)
          setLabScore(res.data?.lab_score || 100)
        }
      })
      .catch(() => { })
  }

  useEffect(() => {
    fetchLabStatus()

    const handleFocus = () => {
      fetchLabStatus()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [id])

  const handleStartLab = async () => {
    setStartingLab(true)
    const targetCourseId = course?._id || id
    const labId = `lab-${targetCourseId}`
    try {
      const res = await apiClient.post('/labs/access-token', {
        course_id: targetCourseId,
        lab_id: labId,
      })
      const { access_token, labs_app_url } = res.data
      const redirectUrl = `${labs_app_url || 'http://localhost:5174'}/lab/${labId}?token=${access_token}`
      window.location.href = redirectUrl
    } catch (err) {
      const msg = err.response?.data?.message || 'Complete the course quiz to unlock this lab'
      showToast(msg)
    } finally {
      setStartingLab(false)
    }
  }

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

        const quickDetails = QUICK_IGOT_DETAILS[id]

        const finalCourse = quickDetails
          ? {
            ...(crs || fallbackCourse),
            ...quickDetails,
          }
          : (crs || fallbackCourse)

        setCourse(finalCourse)

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
          {labCompleted ? (
            <>
              <div className={styles.labCompletedBadge}>
                <CheckCircle2 size={15} color="#10b981" />
                <span>Hands-on Lab Completed ({labScore || 100}% Score)</span>
              </div>
              <button
                type="button"
                className={styles.labActionBtnCompleted}
                onClick={handleStartLab}
                disabled={startingLab}
                title="Launch interactive lab sandbox to practice or review"
              >
                <Terminal size={16} />
                <span>{startingLab ? 'Launching Sandbox...' : 'Review Hands-on Lab'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className={labUnlocked ? styles.labActionBtn : styles.labActionBtnDisabled}
              onClick={handleStartLab}
              disabled={startingLab}
              title={labUnlocked ? 'Launch interactive lab sandbox' : 'Complete the course quiz to unlock this lab'}
            >
              <Terminal size={16} />
              <span>{startingLab ? 'Launching Sandbox...' : 'Start Hands-on Lab'}</span>
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
          {IGOT_YOUTUBE_VIDEOS[id] && (
            <div className={styles.videoCard}>
              <h2 className={styles.cardHeading}>
                <PlayCircle size={18} />
                <span>Course Video</span>
              </h2>

              <a
                href={`https://www.youtube.com/watch?v=${IGOT_YOUTUBE_VIDEOS[id]}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.videoLink}
              >
                <img
                  src={`https://img.youtube.com/vi/${IGOT_YOUTUBE_VIDEOS[id]}/mqdefault.jpg`}
                  alt={`${course.title} video`}
                  className={styles.videoThumbnail}
                  loading="lazy"
                  decoding="async"
                />

                <div className={styles.videoOverlay}>
                  <PlayCircle size={48} />
                </div>
              </a>

              <a
                href={`https://www.youtube.com/watch?v=${IGOT_YOUTUBE_VIDEOS[id]}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.watchVideoBtn}
              >
                <PlayCircle size={16} />
                <span>Watch Course Video on YouTube</span>
              </a>
            </div>
          )}
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
              {(course.learningObjectives || []).map((objective, idx) => (
                <li key={idx}>{objective}</li>
              ))}
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
                  {typeof skill === "object" && skill !== null ? (skill.name || skill.title || skill._id) : String(skill)}
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
