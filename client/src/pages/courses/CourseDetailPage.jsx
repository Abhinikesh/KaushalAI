import React, { useState, useEffect, useRef } from 'react'
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

const VIDEO_MODULES = {
  'igot-crs-02': [
    {
      title: 'Introduction',
      start: 0,
      duration: '00:00',
      lessons: ['Course overview and introduction'],
    },
    {
      title: 'Python Programming Fundamentals',
      start: 102,
      duration: '01:42',
      lessons: [
        'Python programming fundamentals',
        'Course curriculum',
        'Jupyter Notebook setup',
        'Arithmetic operations',
        'Variables and data types',
      ],
    },
    {
      title: 'Branching, Loops & Functions',
      start: 4126,
      duration: '1:08:46',
      lessons: [
        'Conditional statements',
        'Loops',
        'Functions and scope',
        'Writing reusable functions',
      ],
    },
    {
      title: 'Numerical Computing with NumPy',
      start: 8237,
      duration: '2:17:17',
      lessons: [
        'NumPy arrays',
        'Array operations',
        'Multidimensional arrays',
        'Indexing and slicing',
      ],
    },
    {
      title: 'Tabular Data Analysis with Pandas',
      start: 14579,
      duration: '4:02:59',
      lessons: [
        'Pandas DataFrames',
        'Retrieving data',
        'Data analysis',
        'Filtering and sorting',
        'Grouping and aggregation',
      ],
    },
    {
      title: 'Data Visualization',
      start: 21168,
      duration: '5:52:48',
      lessons: [
        'Matplotlib',
        'Seaborn',
        'Line charts',
        'Scatter plots',
        'Histograms',
        'Heatmaps',
      ],
    },
    {
      title: 'Exploratory Data Analysis',
      start: 28196,
      duration: '7:49:56',
      lessons: [
        'Data preparation',
        'Data cleaning',
        'Exploratory analysis',
        'Visualization',
        'Drawing conclusions',
      ],
    },
    {
      title: 'Course Project & Recap',
      start: 34181,
      duration: '9:29:41',
      lessons: [
        'Project setup',
        'Course guidelines',
        'Course recap',
        'Next steps',
      ],
    },
  ],
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
    modules: []
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
  const playerRef = useRef(null)
  const playerContainerRef = useRef(null)

  const [videoStarted, setVideoStarted] = useState(false)
  const [activeModule, setActiveModule] = useState(0)

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
    if (!videoStarted) return

    const createPlayer = () => {
      if (!window.YT || !playerContainerRef.current) return

      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId: IGOT_YOUTUBE_VIDEOS[id],
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          playsinline: 1,
          fs: 1,
        },
        events: {
          onReady: (event) => {
            event.target.playVideo()
          },
        },
      })
    }

    if (window.YT && window.YT.Player) {
      createPlayer()
      return
    }

    const existingScript = document.getElementById('youtube-iframe-api')

    if (!existingScript) {
      const script = document.createElement('script')
      script.id = 'youtube-iframe-api'
      script.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(script)
    }

    const previousReady = window.onYouTubeIframeAPIReady

    window.onYouTubeIframeAPIReady = () => {
      if (previousReady) previousReady()
      createPlayer()
    }

    return () => {
      if (playerRef.current?.destroy) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [videoStarted, id])

  const jumpToModule = (module, index) => {
    setActiveModule(index)

    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(module.start, true)
      playerRef.current.playVideo()
    }
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
              <span>{VIDEO_MODULES[id]?.length || course.modules?.length || 4} Modules</span>
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

              <div className={styles.videoPlayerWrapper}>
                {!videoStarted ? (
                  <button
                    type="button"
                    className={styles.videoStartScreen}
                    onClick={() => setVideoStarted(true)}
                    aria-label="Play course video"
                  >
                    <img
                      src={`https://img.youtube.com/vi/${IGOT_YOUTUBE_VIDEOS[id]}/maxresdefault.jpg`}
                      alt={`${course.title} video`}
                      className={styles.videoThumbnail}
                    />

                    <span className={styles.redPlayButton}>
                      <PlayCircle size={54} fill="white" />
                    </span>
                  </button>
                ) : (
                  <div
                    ref={playerContainerRef}
                    className={styles.youtubePlayer}
                  />
                )}
              </div>
            </div>
          )}
          {/* Syllabus Section */}
          <div className={styles.cardBox}>
            <h2 className={styles.cardHeading}>
              <BookOpen size={18} color="#4F46E5" />
              <span>Course Curriculum &amp; Syllabus</span>
            </h2>

            <div className={styles.videoTimeline}>
              {(VIDEO_MODULES[id] || course.modules || []).map((module, idx) => (
                <button
                  type="button"
                  key={idx}
                  className={`${styles.timelineModule} ${activeModule === idx ? styles.timelineModuleActive : ''
                    }`}
                  onClick={() => jumpToModule(module, idx)}
                >
                  <div className={styles.timelineMarker}>
                    <span>{idx + 1}</span>
                  </div>

                  <div className={styles.timelineContent}>
                    <div className={styles.timelineHeader}>
                      <strong>{module.title}</strong>
                      <span className={styles.timelineTime}>
                        {module.duration}
                      </span>
                    </div>

                    {module.lessons?.map((lesson, lessonIndex) => (
                      <div
                        key={lessonIndex}
                        className={styles.timelineLesson}
                      >
                        <span>•</span>
                        <span>{lesson}</span>
                      </div>
                    ))}
                  </div>
                </button>
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
