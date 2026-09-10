import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Clock,
  Terminal,
  BookOpen,
  Star,
  Award,
  CheckCircle2,
  PlayCircle,
  Sparkles,
  ShieldCheck,
  Layers,
} from 'lucide-react'
import { getCourse, getMyEnrollments, enrollInCourse } from '../../api/course.api'
import apiClient from '../../api/client'
import styles from './CourseDetailPage.module.css'


/*
 * Course-specific content is deliberately aligned with the embedded video.
 */
/*
 * Video mapping:
 * - crs-01 uses the required Data Analysis / Python video supplied earlier.
 * - crs-02..06 use verified videos published by Karmayogi Bharat.
 *
 * Direct YouTube embeds keep the native player controls available, including
 * fullscreen, captions and any quality options exposed by YouTube.
 */
const IGOT_YOUTUBE_VIDEOS = {
  'igot-crs-01': 'KgCgpCIOkIs',
  'igot-crs-02': 'Vz8zcKawwEo',
  'igot-crs-03': 'hTnnf9AhDLM',
  'igot-crs-04': 'FUQW44EFmQQ',
  'igot-crs-05': 'B_jQ3DlrVs4',
  'igot-crs-06': 'kCthkqPKySw',
}

const QUICK_IGOT_DETAILS = {
  'igot-crs-01': {
    title: 'Data Analysis with Python',
    description:
      'Practical data analysis using Python, Pandas, NumPy, exploratory analysis, and data visualization.',
    provider: 'Learning Resource',
    category: 'Data Analytics',
    difficulty: 'Intermediate',
    durationHours: 10,
    rating: 4.8,
    reviewsCount: 780,
    skillTags: [
      'Python Programming',
      'Pandas',
      'NumPy',
      'Data Analysis',
      'Data Visualization',
    ],
    learningObjectives: [
      'Use Python for practical data analysis.',
      'Work with Pandas DataFrames and NumPy arrays.',
      'Clean, transform, and inspect datasets.',
      'Perform exploratory data analysis.',
      'Create and interpret data visualizations.',
    ],
    modules: [
      {
        title: 'Python Foundations',
        duration: '1.5h',
        lessons: [
          'Python syntax and variables',
          'Data types and collections',
          'Conditions and loops',
          'Functions',
        ],
      },
      {
        title: 'NumPy for Data Analysis',
        duration: '1.5h',
        lessons: [
          'Arrays',
          'Indexing and slicing',
          'Array operations',
          'Reshaping data',
        ],
      },
      {
        title: 'Pandas DataFrames',
        duration: '2.5h',
        lessons: [
          'Create and inspect DataFrames',
          'Load CSV data',
          'Filter and sort records',
          'Group and aggregate data',
        ],
      },
      {
        title: 'Data Cleaning & Preparation',
        duration: '1.5h',
        lessons: [
          'Missing values',
          'Duplicate records',
          'Data type conversion',
          'Preparing analysis-ready data',
        ],
      },
      {
        title: 'Exploratory Analysis & Visualization',
        duration: '2h',
        lessons: [
          'Descriptive analysis',
          'Matplotlib',
          'Seaborn',
          'Patterns and relationships',
        ],
      },
      {
        title: 'Data Analysis Project',
        duration: '1h',
        lessons: [
          'End-to-end analysis',
          'Interpret results',
          'Communicate findings',
          'Project recap',
        ],
      },
    ],
  },

  'igot-crs-02': {
    title: 'Artificial Intelligence for Public Governance',
    description:
      'Build foundational AI literacy and understand how AI can support smarter, more efficient, and citizen-centric public governance.',
    provider: 'Karmayogi Bharat',
    category: 'Artificial Intelligence',
    difficulty: 'Intermediate',
    durationHours: 2.7,
    rating: 4.8,
    reviewsCount: 420,
    skillTags: [
      'Artificial Intelligence',
      'Generative AI',
      'Data-Driven Decision Making',
      'AI in Governance',
      'Responsible AI',
    ],
    learningObjectives: [
      'Understand core artificial intelligence concepts.',
      'Understand how modern AI and generative AI systems work.',
      'Recognize practical AI use cases in public administration.',
      'Use AI concepts to support data-driven governance.',
      'Understand responsible and citizen-centric AI adoption.',
    ],
    modules: [
      {
        title: 'AI Foundations',
        duration: 'Foundational',
        lessons: [
          'What is Artificial Intelligence?',
          'Evolution of intelligent systems',
          'AI capabilities and limitations',
        ],
      },
      {
        title: 'Generative AI & Modern Models',
        duration: 'Concepts',
        lessons: [
          'Generative AI',
          'Model architectures',
          'Large language models',
          'Attention mechanisms',
        ],
      },
      {
        title: 'AI for Public Governance',
        duration: 'Application',
        lessons: [
          'AI in public administration',
          'Data-driven decision making',
          'Automation opportunities',
          'Citizen-centric services',
        ],
      },
      {
        title: 'Responsible AI',
        duration: 'Governance',
        lessons: [
          'Responsible adoption',
          'Human oversight',
          'Ethics and accountability',
          'Practical governance considerations',
        ],
      },
    ],
  },

  'igot-crs-03': {
    title: 'Sustainable Development Goals',
    description:
      'Understand the SDG framework and how inclusive development, gender equality, and public policy contribute to sustainable development.',
    provider: 'Karmayogi Bharat',
    category: 'Sustainable Development',
    difficulty: 'Beginner',
    durationHours: 1,
    rating: 4.7,
    reviewsCount: 360,
    skillTags: [
      'Sustainable Development Goals',
      'SDG 5',
      'Gender Equality',
      'Inclusive Development',
      'Public Policy',
    ],
    learningObjectives: [
      'Understand the purpose of the Sustainable Development Goals.',
      'Explain the importance of SDG 5 and gender equality.',
      'Connect inclusion and development outcomes.',
      'Recognize governance actions that support sustainable development.',
    ],
    modules: [
      {
        title: 'SDG Framework',
        duration: 'Concepts',
        lessons: [
          '17 Sustainable Development Goals',
          'Targets and indicators',
          '2030 Agenda',
        ],
      },
      {
        title: 'SDG 5: Gender Equality',
        duration: 'Core Topic',
        lessons: [
          'Gender equality',
          'Women empowerment',
          'Removing structural barriers',
          'Inclusive development',
        ],
      },
      {
        title: 'Policy & Development',
        duration: 'Application',
        lessons: [
          'Integrating gender in policy',
          'Public institutions',
          'Monitoring progress',
          'Inclusive growth',
        ],
      },
    ],
  },

  'igot-crs-04': {
    title: 'Digital Personal Data Protection Act, 2023',
    description:
      'Understand the Digital Personal Data Protection Act and the responsibilities and rights involved in personal-data processing.',
    provider: 'Karmayogi Bharat',
    category: 'Digital Governance',
    difficulty: 'Beginner',
    durationHours: 1.2,
    rating: 4.7,
    reviewsCount: 390,
    skillTags: [
      'Data Protection',
      'Digital Governance',
      'Privacy',
      'Cybersecurity',
      'Data Responsibility',
    ],
    learningObjectives: [
      'Understand the purpose of the DPDP Act.',
      'Understand important data-protection terms.',
      'Recognize responsibilities of data fiduciaries.',
      'Understand rights and duties of data principals.',
      'Identify practical readiness requirements for organizations.',
    ],
    modules: [
      {
        title: 'DPDP Act Overview',
        duration: 'Overview',
        lessons: [
          'Purpose of the Act',
          'Personal data',
          'Scope and applicability',
        ],
      },
      {
        title: 'Key Definitions & Processing',
        duration: 'Core Concepts',
        lessons: [
          'Data principal',
          'Data fiduciary',
          'Grounds for processing',
          'Consent and lawful processing',
        ],
      },
      {
        title: 'Rights, Duties & Obligations',
        duration: 'Core Provisions',
        lessons: [
          'Rights of data principals',
          'Duties of data principals',
          'Data fiduciary obligations',
          "Children's data",
        ],
      },
      {
        title: 'Readiness & Compliance',
        duration: 'Application',
        lessons: [
          'Exemptions',
          'Organizational readiness',
          'Responsible data handling',
          'Governance controls',
        ],
      },
    ],
  },

  'igot-crs-05': {
    title: 'Bharatiya Nyaya Sanhita, 2023: An Introduction',
    description:
      'Understand the major reforms introduced by the Bharatiya Nyaya Sanhita, 2023 and its key changes to India’s criminal law framework.',
    provider: 'Karmayogi Bharat',
    category: 'Law & Governance',
    difficulty: 'Beginner',
    durationHours: 1,
    rating: 4.7,
    reviewsCount: 400,
    skillTags: [
      'Bharatiya Nyaya Sanhita',
      'Criminal Law',
      'Public Administration',
      'Legal Awareness',
      'Governance',
    ],
    learningObjectives: [
      'Understand the purpose and structure of the Bharatiya Nyaya Sanhita.',
      'Identify major reforms introduced by the new law.',
      'Understand selected provisions relating to women and children.',
      'Understand changes relating to public servants and offences against the State.',
      'Build practical legal awareness for public administration.',
    ],
    modules: [
      {
        title: 'Introduction to BNS 2023',
        duration: 'Overview',
        lessons: [
          'Why the new law was introduced',
          'Relationship with the earlier criminal law framework',
          'Major reforms',
        ],
      },
      {
        title: 'Offences Relating to Women & Children',
        duration: 'Core Topic',
        lessons: [
          'Major provisions',
          'Protection framework',
          'Key changes',
        ],
      },
      {
        title: 'Offences Affecting the State & Public Authority',
        duration: 'Core Topic',
        lessons: [
          'Offences against the State',
          'Public servants',
          'Lawful authority',
        ],
      },
      {
        title: 'Property & Punishment Reforms',
        duration: 'Application',
        lessons: [
          'Offences against property',
          'Punishment-related reforms',
          'Practical legal awareness',
        ],
      },
    ],
  },

  'igot-crs-06': {
    title: 'Personal Finance for Karmayogis',
    description:
      'Build practical financial literacy around money management, investment basics, and personal financial decision-making.',
    provider: 'Karmayogi Bharat',
    category: 'Financial Management',
    difficulty: 'Beginner',
    durationHours: 1,
    rating: 4.7,
    reviewsCount: 350,
    skillTags: [
      'Financial Literacy',
      'Money Management',
      'Investment Basics',
      'Financial Planning',
      'Personal Finance',
    ],
    learningObjectives: [
      'Understand foundational personal-finance concepts.',
      'Build better money-management habits.',
      'Understand basic investment concepts.',
      'Evaluate common financial decisions.',
      'Develop a practical personal financial plan.',
    ],
    modules: [
      {
        title: 'Financial Foundations',
        duration: 'Basics',
        lessons: [
          'Income and expenses',
          'Financial goals',
          'Cash-flow awareness',
        ],
      },
      {
        title: 'Money Management',
        duration: 'Planning',
        lessons: [
          'Budgeting',
          'Emergency planning',
          'Managing financial commitments',
        ],
      },
      {
        title: 'Investment Basics',
        duration: 'Core Concepts',
        lessons: [
          'Investment principles',
          'Risk and return',
          'Long-term planning',
        ],
      },
      {
        title: 'Making Better Financial Decisions',
        duration: 'Application',
        lessons: [
          'Evaluating financial choices',
          'Avoiding common mistakes',
          'Building sustainable financial habits',
        ],
      },
    ],
  },
}
const GENERIC_FALLBACK_COURSE = {
  title: 'iGOT Karmayogi Course',
  description: 'Course information is being loaded from iGOT Karmayogi.',
  provider: 'iGOT Karmayogi',
  category: 'Professional Development',
  difficulty: 'Intermediate',
  durationHours: 10,
  rating: 4.8,
  reviewsCount: 420,
  skillTags: [],
  modules: [],
  learningObjectives: [],
}

export default function CourseDetailPage() {
  const { id } = useParams()

  const [course, setCourse] = useState(null)
  const [enrollment, setEnrollment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [labUnlocked, setLabUnlocked] = useState(false)
  const [labCompleted, setLabCompleted] = useState(false)
  const [labScore, setLabScore] = useState(null)
  const [startingLab, setStartingLab] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const fetchLabStatus = () => {
    if (!id) return

    apiClient
      .get(`/labs/status/${id}`)
      .then((res) => {
        if (res.data?.lab_unlocked) {
          setLabUnlocked(true)
        }

        if (res.data?.lab_completed) {
          setLabCompleted(true)
          setLabScore(res.data?.lab_score || 100)
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    fetchLabStatus()

    const handleFocus = () => {
      fetchLabStatus()
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
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

      const redirectUrl = `${
        labs_app_url || 'http://localhost:5174'
      }/lab/${labId}?token=${access_token}`

      window.location.href = redirectUrl
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Complete the course quiz to unlock this lab'

      showToast(msg)
    } finally {
      setStartingLab(false)
    }
  }

  /*
   * Direct iframe instead of the old custom thumbnail/play-button flow.
   *
   * This removes the extra circular button shown in the screenshot and
   * avoids the previous YouTube IFrame API setup.
   */
  const videoId = IGOT_YOUTUBE_VIDEOS[id]
  useEffect(() => {
    let mounted = true

    setLoading(true)

    Promise.all([
      getCourse(id).catch(() => null),
      getMyEnrollments().catch(() => ({ enrollments: [] })),
    ])
      .then(([courseRes, enrollRes]) => {
        if (!mounted) return

        const crs = courseRes?.course || courseRes || {}
        const quickDetails = QUICK_IGOT_DETAILS[id] || {}

        /*
         * Priority:
         * 1. API course data
         * 2. Course-specific local details
         * 3. Generic fallback
         *
         * The old large fallback course has been removed. It was causing
         * unrelated syllabus data to appear when an API course was missing.
         */
        const finalCourse = {
          ...GENERIC_FALLBACK_COURSE,
          ...quickDetails,
          ...crs,
        }

        /*
         * Course-specific UI content should win over stale/incorrect API
         * competency and syllabus data for the demo courses.
         */
        if (Object.keys(quickDetails).length > 0) {
          Object.assign(finalCourse, quickDetails)
        }

        finalCourse._id = crs?._id || id || finalCourse._id

        setCourse(finalCourse)

        const enrollList = enrollRes?.enrollments || []

        const enr = enrollList.find((e) => {
          const cId =
            typeof e.courseId === 'object'
              ? e.courseId?._id
              : e.courseId

          return String(cId) === String(id)
        })

        setEnrollment(enr || null)
      })
      .finally(() => {
        if (mounted) {
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [id])

  const handleEnroll = async () => {
    try {
      setEnrolling(true)

      const res = await enrollInCourse(id)

      setEnrollment(
        res?.enrollment ||
          res || {
            status: 'in_progress',
            progressPercent: 0,
          }
      )

      showToast('Enrolled in course successfully!')
    } catch (err) {
      setEnrollment({
        status: 'in_progress',
        progressPercent: 0,
      })

      showToast('Enrolled successfully in offline demonstration mode.')
    } finally {
      setEnrolling(false)
    }
  }

  if (loading || !course) {
    return (
      <div className={styles.pageContainer}>
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          Loading course specifications...
        </div>
      </div>
    )
  }

  const isEnrolled = Boolean(enrollment)
  const modules = course.modules || []

  return (
    <div className={styles.pageContainer}>
      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link to="/dashboard" className={styles.breadcrumbLink}>
          Dashboard
        </Link>

        <span className={styles.breadcrumbSeparator}>›</span>

        <Link to="/courses/igot" className={styles.breadcrumbLink}>
          iGOT Courses
        </Link>

        <span className={styles.breadcrumbSeparator}>›</span>

        <span className={styles.breadcrumbActive}>
          {course.title}
        </span>
      </nav>

      {/* Hero Banner */}
      <div className={styles.heroBanner}>
        <div className={styles.heroLeft}>
          <span className={styles.providerBadge}>
            {course.provider || 'iGOT Karmayogi'}
          </span>

          <h1 className={styles.heroTitle}>{course.title}</h1>

          <p className={styles.heroDesc}>{course.description}</p>

          <div className={styles.heroMeta}>
            <div className={styles.metaItem}>
              <Clock size={16} />
              <span>
                {course.durationHours || 10} Hours
              </span>
            </div>

            <div className={styles.metaItem}>
              <BookOpen size={16} />
              <span>{modules.length} Modules</span>
            </div>

            <div className={styles.metaItem}>
              <Star
                size={16}
                fill="#F59E0B"
                color="#F59E0B"
              />
              <span>
                {course.rating || 4.8} (
                {course.reviewsCount || 420} ratings)
              </span>
            </div>

            <div className={styles.metaItem}>
              <Award size={16} />
              <span>Official Certificate Included</span>
            </div>
          </div>
        </div>

        {/* Action Card */}
        <div className={styles.heroActionCard}>
          <span className={styles.priceTag}>
            Free for Civil Services
          </span>

          {isEnrolled ? (
            <Link
              to={`/my-courses/${course._id}`}
              className={styles.successActionBtn}
            >
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
              <span>
                {enrolling ? 'Enrolling...' : 'Enroll in iGOT'}
              </span>
            </button>
          )}

          {labCompleted ? (
            <>
              <div className={styles.labCompletedBadge}>
                <CheckCircle2 size={15} color="#10b981" />
                <span>
                  Hands-on Lab Completed (
                  {labScore || 100}% Score)
                </span>
              </div>

              <button
                type="button"
                className={styles.labActionBtnCompleted}
                onClick={handleStartLab}
                disabled={startingLab}
                title="Launch interactive lab sandbox to practice or review"
              >
                <Terminal size={16} />
                <span>
                  {startingLab
                    ? 'Launching Sandbox...'
                    : 'Review Hands-on Lab'}
                </span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className={
                labUnlocked
                  ? styles.labActionBtn
                  : styles.labActionBtnDisabled
              }
              onClick={handleStartLab}
              disabled={startingLab}
              title={
                labUnlocked
                  ? 'Launch interactive lab sandbox'
                  : 'Complete the course quiz to unlock this lab'
              }
            >
              <Terminal size={16} />
              <span>
                {startingLab
                  ? 'Launching Sandbox...'
                  : 'Start Hands-on Lab'}
              </span>
            </button>
          )}

          <p className={styles.actionSubtext}>
            Synchronized with your official employee learning record
          </p>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className={styles.contentLayout}>
        <div className={styles.mainColumn}>
          {/* Course Video */}
          {videoId && (
            <div className={styles.videoCard}>
              <h2 className={styles.cardHeading}>
                <PlayCircle size={18} />
                <span>Course Video</span>
              </h2>

              <div
                className={styles.videoPlayerWrapper}
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 9',
                  overflow: 'hidden',
                  borderRadius: 10,
                  background: '#000',
                }}
              >
                <iframe
                  className={styles.youtubePlayer}
                  src={`https://www.youtube.com/embed/${videoId}?controls=1&cc_load_policy=1&fs=1&iv_load_policy=1&modestbranding=1&playsinline=1&rel=0`}
                  title={`${course.title} - Karmayogi learning video`}
                  style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    border: 0,
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: 11.5,
                  color: '#64748b',
                }}
              >
                Video is embedded from the official/required YouTube source.
                Playback, captions, fullscreen and available quality controls
                are provided by YouTube.
              </p>
            </div>
          )}

          {/* Course Curriculum & Syllabus */}
          <div className={styles.cardBox}>
            <h2 className={styles.cardHeading}>
              <BookOpen size={18} color="#4F46E5" />
              <span>Course Curriculum &amp; Syllabus</span>
            </h2>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {modules.map((module, idx) => (
                <div
                  key={`${module.title}-${idx}`}
                  style={{
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start',
                    padding: '14px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    background: '#fff',
                  }}
                >
                  <div
                    style={{
                      flex: '0 0 30px',
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#eef2ff',
                      color: '#4f46e5',
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    {idx + 1}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'baseline',
                        flexWrap: 'wrap',
                      }}
                    >
                      <strong
                        style={{
                          color: '#1e293b',
                          fontSize: 14,
                        }}
                      >
                        {module.title}
                      </strong>

                      <span
                        style={{
                          color: '#64748b',
                          fontSize: 11.5,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {module.duration}
                      </span>
                    </div>

                    <ul
                      style={{
                        margin: '7px 0 0',
                        paddingLeft: 18,
                        color: '#64748b',
                        fontSize: 12.5,
                        lineHeight: 1.65,
                      }}
                    >
                      {(module.lessons || []).map((lesson, lessonIndex) => (
                        <li key={lessonIndex}>{lesson}</li>
                      ))}
                    </ul>
                  </div>
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

            <ul
              style={{
                margin: 0,
                paddingLeft: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                fontSize: 13.5,
                color: '#334155',
              }}
            >
              {(course.learningObjectives || []).map(
                (objective, idx) => (
                  <li key={idx}>{objective}</li>
                )
              )}
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
                <span
                  key={idx}
                  className={styles.skillPill}
                >
                  {typeof skill === 'object' && skill !== null
                    ? skill.name ||
                      skill.title ||
                      skill._id
                    : String(skill)}
                </span>
              ))}
            </div>
          </div>

          {/* Certification Card */}
          <div className={styles.cardBox}>
            <h3 className={styles.cardHeading}>
              <ShieldCheck
                size={18}
                color="#059669"
              />
              <span>Accreditation</span>
            </h3>

            <p
              style={{
                fontSize: 12.5,
                color: '#64748b',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Upon successful completion of all modules and
              passing the final evaluation quiz (min. 70%), an
              authentic MoSPI &amp; iGOT Karmayogi certificate
              will be issued to your profile.
            </p>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            padding: '12px 18px',
            borderRadius: 8,
            background: '#111827',
            color: '#fff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            fontSize: 13,
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  )
}
