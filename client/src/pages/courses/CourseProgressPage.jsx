import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  PlayCircle,
  CheckCircle2,
  Check,
  FileQuestion,
  Award,
  ArrowRight,
  BookOpen,
  Download,
  RotateCcw,
  Sparkles
} from 'lucide-react'
import { listCourses, getMyEnrollments, updateProgress } from '../../api/course.api'
import styles from './CourseProgressPage.module.css'

export default function CourseProgressPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeLessonIdx, setActiveLessonIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  // Fetch real course and enrollment data
  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: () => listCourses(),
  })

  const { data: enrollmentsData } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
  })

  const courses = coursesData?.courses || coursesData || []
  const course = courses.find((c) => String(c._id) === String(id)) || {
    _id: id,
    title: 'Data Analysis & Statistical Computing with Python',
    description: 'Pandas data frames, data cleaning, complex survey weighting, and indicator computation.',
    provider: 'iGOT Karmayogi',
  }

  const enrollments = enrollmentsData?.enrollments || []
  const enrollment = enrollments.find((e) => {
    const cId = typeof e.courseId === 'object' ? e.courseId._id : e.courseId
    return String(cId) === String(id)
  })

  const modulesList = [
    { title: 'Module 1: Principles of Official Statistics & National Guidelines', duration: '45 mins' },
    { title: 'Module 2: Practical Data Collection & Sampling Techniques', duration: '60 mins' },
    { title: 'Module 3: Advanced Tabulation & Variance Estimation', duration: '75 mins' },
    { title: 'Module 4: Quality Assessment, Auditing & Dissemination Standards', duration: '50 mins' },
    { title: 'Module 5: Real-World Case Studies with MoSPI Survey Datasets', duration: '90 mins' },
  ]

  const initialCount = enrollment?.progressPercent
    ? Math.round((enrollment.progressPercent / 100) * modulesList.length)
    : 2
  const [completedModules, setCompletedModules] = useState([0, 1])

  useEffect(() => {
    if (enrollment?.progressPercent != null) {
      const count = Math.round((enrollment.progressPercent / 100) * modulesList.length)
      setCompletedModules(Array.from({ length: count }, (_, i) => i))
    }
  }, [enrollment])

  const progressMutation = useMutation({
    mutationFn: (newPercent) => {
      if (!enrollment?._id) return Promise.resolve()
      return updateProgress(enrollment._id, newPercent)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myEnrollments'] })
    },
  })

  const toggleModule = (idx) => {
    let next
    if (completedModules.includes(idx)) {
      next = completedModules.filter((i) => i !== idx)
    } else {
      next = [...completedModules, idx]
    }
    setCompletedModules(next)
    const newPercent = Math.round((next.length / modulesList.length) * 100)
    progressMutation.mutate(newPercent)
  }

  const currentPercent = Math.round((completedModules.length / modulesList.length) * 100)

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumbs ────────────────────────────────────── */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
        <span className={styles.breadcrumbSeparator}>›</span>
        <Link to="/my-courses" className={styles.breadcrumbLink}>My Courses</Link>
        <span className={styles.breadcrumbSeparator}>›</span>
        <span className={styles.breadcrumbActive}>Course Player</span>
      </nav>

      {/* ── Progress Header Card ───────────────────────────── */}
      <div className={styles.progressHeaderCard}>
        <div className={styles.headerLeft}>
          <h1 className={styles.courseTitle}>{course.title}</h1>
          <p className={styles.courseSubtitle}>
            {course.provider || 'iGOT Karmayogi'} • {completedModules.length} of {modulesList.length} modules completed
          </p>
        </div>

        <div className={styles.progressMeterWrap}>
          <div className={styles.progressBarContainer}>
            <div className={styles.progressBarTrack}>
              <div className={styles.progressBarFill} style={{ width: `${currentPercent}%` }} />
            </div>
          </div>
          <span className={styles.progressPercentText}>{currentPercent}%</span>
        </div>
      </div>

      {/* ── Video & Playlist Layout ────────────────────────── */}
      <div className={styles.layoutGrid}>
        {/* Main Video Screen */}
        <div className={styles.playerCard}>
          <div className={styles.videoScreen}>
            <button
              type="button"
              className={styles.playBtnCircle}
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause Video' : 'Play Video'}
            >
              <PlayCircle size={32} />
            </button>
          </div>

          <div className={styles.playerControls}>
            <h2 className={styles.lessonTitle}>
              {modulesList[activeLessonIdx]?.title}
            </h2>
            <button
              type="button"
              style={{
                background: completedModules.includes(activeLessonIdx) ? '#10B981' : '#4F46E5',
                color: '#fff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              onClick={() => toggleModule(activeLessonIdx)}
            >
              <Check size={14} />
              <span>
                {completedModules.includes(activeLessonIdx) ? 'Completed' : 'Mark as Done'}
              </span>
            </button>
          </div>
        </div>

        {/* Sidebar Modules Checklist */}
        <div className={styles.sidebarCard}>
          <h3 className={styles.sidebarHeading}>
            <span>Course Syllabus</span>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
              {modulesList.length} Lessons
            </span>
          </h3>

          <div className={styles.modulesList}>
            {modulesList.map((mod, idx) => {
              const isDone = completedModules.includes(idx)
              const isActive = activeLessonIdx === idx
              return (
                <div
                  key={idx}
                  className={`${styles.moduleCheckItem} ${isActive ? styles.activeLesson : ''}`}
                  onClick={() => setActiveLessonIdx(idx)}
                >
                  <div
                    className={`${styles.checkboxSquare} ${isDone ? styles.checkboxChecked : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleModule(idx)
                    }}
                  >
                    {isDone && <Check size={12} />}
                  </div>

                  <div className={styles.moduleItemInfo}>
                    <span className={styles.moduleName}>{mod.title}</span>
                    <span className={styles.moduleDuration}>{mod.duration}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Assessment CTA */}
          <div className={styles.quizCardCTA}>
            <h4 className={styles.quizCTATitle}>Ready to verify your skills?</h4>
            <Link to="/quizzes" className={styles.quizCTABtn}>
              <FileQuestion size={15} />
              <span>Take Course Quiz</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
