import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  Shield,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  BarChart3,
  Award,
  AlertCircle,
  HelpCircle,
  FileCheck,
  TrendingUp,
  Layers,
  BookOpen,
  Target,
  Bot,
  ExternalLink,
  Flag,
  RotateCcw,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import {
  startDiagnosticTest,
  saveDiagnosticAnswer,
  submitDiagnosticTest,
  getDiagnosticAttemptResults,
} from '../../api/assessment.api'
import { completeOnboarding } from '../../api/onboarding.api'
import styles from './DiagnosticTestPage.module.css'

const DRAFT_KEY = 'kaushalai_diagnostic_assessment_draft'

export default function DiagnosticTestPage() {
  const { user, setAuth, accessToken } = useAuthStore()
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Stages: 'intro' | 'in_progress' | 'submitting' | 'results' | 'error'
  const [stage, setStage] = useState('intro')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Active tab on results screen: 'overview' | 'matrix' | 'recommendations' | 'path'
  const [activeTab, setActiveTab] = useState('overview')

  // Diagnostic Test data
  const [attemptId, setAttemptId] = useState(null)
  const [assessmentMeta, setAssessmentMeta] = useState(null)
  const [profileMeta, setProfileMeta] = useState(null)
  const [competencies, setCompetencies] = useState([])
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)

  // Timer states (authoritative server expires_at)
  const [expiresAt, setExpiresAt] = useState(null)
  const [remainingSeconds, setRemainingSeconds] = useState(1200)

  // Question response tracking
  const [selectedOptionId, setSelectedOptionId] = useState('')
  const [responses, setResponses] = useState([])
  const [flaggedIndices, setFlaggedIndices] = useState(new Set())
  const [autosaveStatus, setAutosaveStatus] = useState('saved') // 'saving' | 'saved' | 'error'

  // Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showTimeExpiredModal, setShowTimeExpiredModal] = useState(false)
  const questionStartTimeRef = useRef(Date.now())

  // Final graded results and AI analysis
  const [resultData, setResultData] = useState(null)

  // Evaluation animation step index
  const [evalStep, setEvalStep] = useState(0)

  // Cadre level helper
  const tierNames = [
    '',
    'Support Staff',
    'Junior Assistant',
    'Section Officer',
    'Senior Officer',
    'Department Head',
  ]
  const userLevel = Number(user?.level) || 3
  const userRoleTitle = profileMeta?.role || user?.designation || tierNames[userLevel] || 'Section Officer'

  // ── 1. Check Active In-Progress Attempt on Mount ──────────────────────────────
  useEffect(() => {
    const checkActiveAttempt = async () => {
      try {
        const data = await startDiagnosticTest()
        if (data.is_resumed) {
          setAttemptId(data.attemptId)
          setAssessmentMeta(data.assessment)
          setProfileMeta(data.profile)
          setCompetencies(data.competencies || [])
          setQuestions(data.questions || [])

          if (data.attempt?.expires_at) {
            setExpiresAt(data.attempt.expires_at)
            const initialRem = Math.max(0, Math.round((new Date(data.attempt.expires_at).getTime() - Date.now()) / 1000))
            setRemainingSeconds(initialRem)
          }

          if (Array.isArray(data.saved_responses) && data.saved_responses.length > 0) {
            setResponses(data.saved_responses)
            const currentResp = data.saved_responses.find((r) => r.question_id === data.questions[0]?._id)
            if (currentResp) {
              setSelectedOptionId(currentResp.selected_option_id || '')
            }
          }
          setCurrentIndex(0)
          setStage('in_progress')
        }
      } catch (err) {
        if (err.response?.data?.code === 'STEP_PREREQUISITE_NOT_MET') {
          setErrorMessage(err.response?.data?.message)
        }
      }
    }

    checkActiveAttempt()
  }, [])

  // ── 2. Genuine 20-minute Server Countdown ────────────────────────────────────
  useEffect(() => {
    if (stage !== 'in_progress' || !expiresAt) return

    const updateTimer = () => {
      const now = Date.now()
      const expiry = new Date(expiresAt).getTime()
      const diff = Math.max(0, Math.round((expiry - now) / 1000))
      setRemainingSeconds(diff)

      if (diff <= 0) {
        setShowTimeExpiredModal(true)
      }
    }

    updateTimer()
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [stage, expiresAt])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Sync current question selection when navigating
  useEffect(() => {
    questionStartTimeRef.current = Date.now()
    const qId = questions[currentIndex]?._id
    if (qId) {
      const existing = responses.find((r) => r.question_id === qId)
      setSelectedOptionId(existing?.selected_option_id || '')
    }
  }, [currentIndex, questions])

  // Submitting step animation timer
  useEffect(() => {
    if (stage === 'submitting') {
      const timer1 = setTimeout(() => setEvalStep(1), 700)
      const timer2 = setTimeout(() => setEvalStep(2), 1500)
      const timer3 = setTimeout(() => setEvalStep(3), 2400)
      const timer4 = setTimeout(() => setEvalStep(4), 3200)
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
        clearTimeout(timer3)
        clearTimeout(timer4)
      }
    }
  }, [stage])

  // ── Handler: Start / Initialize Assessment ───────────────────────────────────
  const handleStartTest = async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const data = await startDiagnosticTest()
      setAttemptId(data.attemptId)
      setAssessmentMeta(data.assessment)
      setProfileMeta(data.profile)
      setCompetencies(data.competencies || [])
      setQuestions(data.questions || [])

      if (data.attempt?.expires_at) {
        setExpiresAt(data.attempt.expires_at)
        const initialRem = Math.max(0, Math.round((new Date(data.attempt.expires_at).getTime() - Date.now()) / 1000))
        setRemainingSeconds(initialRem)
      } else {
        setRemainingSeconds(1200)
      }

      if (Array.isArray(data.saved_responses) && data.saved_responses.length > 0) {
        setResponses(data.saved_responses)
        const currentSaved = data.saved_responses.find((r) => r.question_id === data.questions[0]?._id)
        if (currentSaved) {
          setSelectedOptionId(currentSaved.selected_option_id || '')
        }
      } else {
        setResponses([])
        setSelectedOptionId('')
      }

      setCurrentIndex(0)
      setStage('in_progress')
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to initialize diagnostic assessment. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  // ── Handler: Option Selection with Autosave ──────────────────────────────────
  const handleSelectOption = async (optionId) => {
    if (stage !== 'in_progress' || remainingSeconds <= 0) return
    setSelectedOptionId(optionId)

    const currentQ = questions[currentIndex]
    if (!currentQ) return

    const now = Date.now()
    const secondsTaken = Math.max(1, Math.round((now - questionStartTimeRef.current) / 1000))

    const newResponse = {
      question_id: currentQ._id,
      selected_option_id: optionId,
      time_taken_seconds: secondsTaken,
    }

    setResponses((prev) => {
      const filtered = prev.filter((r) => r.question_id !== currentQ._id)
      return [...filtered, newResponse]
    })

    // Autosave to backend
    if (attemptId) {
      setAutosaveStatus('saving')
      try {
        await saveDiagnosticAnswer(attemptId, currentQ._id, optionId, secondsTaken)
        setAutosaveStatus('saved')
      } catch (err) {
        console.warn('Autosave failed:', err)
        if (err.response?.data?.code === 'ATTEMPT_EXPIRED') {
          setShowTimeExpiredModal(true)
        } else {
          setAutosaveStatus('error')
        }
      }
    }
  }

  // ── Handler: Flag for Review Toggle ──────────────────────────────────────────
  const toggleFlag = (idx) => {
    setFlaggedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) {
        next.delete(idx)
      } else {
        next.add(idx)
      }
      return next
    })
  }

  // ── Handler: Question Navigation ─────────────────────────────────────────────
  const handleJumpToQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  // ── Handler: Confirmation Modal & Final Submission ───────────────────────────
  const handleOpenSubmitConfirm = () => {
    setShowConfirmModal(true)
  }

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false)
    setStage('submitting')
    setEvalStep(0)
    try {
      const result = await submitDiagnosticTest(attemptId, responses)
      setResultData(result)
      localStorage.removeItem(DRAFT_KEY)

      if (user) {
        setAuth(
          {
            ...user,
            onboarding_step: 6,
          },
          accessToken
        )
      }

      setStage('results')
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to submit diagnostic assessment. Please contact support.'
      )
      setStage('error')
    }
  }

  const handleTimeoutSubmit = async () => {
    setShowTimeExpiredModal(false)
    setStage('submitting')
    setEvalStep(0)
    try {
      const result = await submitDiagnosticTest(attemptId, responses)
      setResultData(result)
      localStorage.removeItem(DRAFT_KEY)
      if (user) {
        setAuth({ ...user, onboarding_step: 6 }, accessToken)
      }
      setStage('results')
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Assessment window closed.')
      setStage('error')
    }
  }

  // ── Handler: Go to Dashboard (Explicit Final Graduation Action) ─────────────
  const handleContinueToDashboard = async () => {
    try {
      await completeOnboarding()
      if (user) {
        setAuth(
          {
            ...user,
            onboarding_completed: true,
            onboarding_step: 6,
          },
          accessToken
        )
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('Failed to graduate onboarding from diagnostic test:', err)
      navigate('/onboarding', { replace: true })
    }
  }

  // Helper counts
  const answeredCount = questions.filter((q) =>
    responses.some((r) => r.question_id === q._id && r.selected_option_id)
  ).length
  const unansweredCount = (questions.length || 15) - answeredCount
  const flaggedCount = flaggedIndices.size

  // ── RENDER: 1. INTRO SCREEN ──────────────────────────────────────────────────
  if (stage === 'intro') {
    const previewList = competencies.length > 0 ? competencies : [
      { name: 'Digital & Office Productivity', required_level: 4 },
      { name: 'Statistical Data Handling', required_level: 4 },
      { name: 'Official Workflow & Process Management', required_level: 3 },
      { name: 'Cybersecurity & Government Data Protection', required_level: 4 },
      { name: 'Statistical Quality & Governance Standards', required_level: 3 },
    ]

    return (
      <div className={styles.container}>
        <div className={styles.introCard}>
          <div className={styles.introTopHeader}>
            <div className={styles.brandBadge}>
              <Sparkles size={16} />
              <span>KaushalAI Competency Diagnostics</span>
            </div>
            <div className={styles.rolePill}>
              <Shield size={14} />
              <span>Cadre: Level {userLevel} — {userRoleTitle}</span>
            </div>
          </div>

          <h1 className={styles.title}>Skill Assessment</h1>
          <p className={styles.subtitle}>
            Discover your current competency levels, identify role-specific skill gaps, and receive a
            personalized AI-tailored learning path aligned with <strong>MoSPI</strong> &amp; <strong>iGOT Karmayogi</strong> standards.
          </p>

          {/* 3 Quick Features */}
          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureNumber}>15</div>
              <div className={styles.featureTitle}>Scenario Questions</div>
              <div className={styles.featureSub}>Real administrative situations</div>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureNumber}>5</div>
              <div className={styles.featureTitle}>Competency Areas</div>
              <div className={styles.featureSub}>Role-specific standards</div>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureNumber}>AI</div>
              <div className={styles.featureTitle}>Adaptive Diagnostics</div>
              <div className={styles.featureSub}>Deterministic grading + Grok</div>
            </div>
          </div>

          {/* Tested Competencies */}
          <div className={styles.sectionTitle}>
            <Award size={18} color="var(--color-primary-600, #2563eb)" />
            <span>Competencies Evaluated for {userRoleTitle}</span>
          </div>

          <div className={styles.competencyGrid}>
            {previewList.map((comp) => (
              <div key={comp.id || comp.name} className={styles.compChip}>
                <span>{comp.name}</span>
                <span className={styles.targetTag}>Target: L{comp.required_level || 3}</span>
              </div>
            ))}
          </div>

          {/* Evaluation Guidelines */}
          <div className={styles.guidelinesBox}>
            <div className={styles.guidelinesList}>
              <div className={styles.guidelineItem}>
                <CheckCircle2 size={16} color="#16a34a" />
                <span>Deterministic server-side grading (100% objective)</span>
              </div>
              <div className={styles.guidelineItem}>
                <Clock size={16} color="#2563eb" />
                <span>Takes approximately 8–10 minutes</span>
              </div>
              <div className={styles.guidelineItem}>
                <FileCheck size={16} color="#7c3aed" />
                <span>Answers auto-saved to prevent progress loss</span>
              </div>
              <div className={styles.guidelineItem}>
                <HelpCircle size={16} color="#ea580c" />
                <span>Choose the most appropriate professional action</span>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="button"
            className={styles.startBtn}
            onClick={handleStartTest}
            disabled={loading}
          >
            {loading ? 'Preparing Diagnostic Assessment...' : 'Start Assessment →'}
          </button>
        </div>
      </div>
    )
  }

  // ── RENDER: 2. TEST IN-PROGRESS ──────────────────────────────────────────────
  if (stage === 'in_progress') {
    const currentQ = questions[currentIndex] || { text: 'Loading question...', options: [] }
    const totalQ = questions.length || 15
    const progressPercent = Math.round((answeredCount / totalQ) * 100)
    const isLast = currentIndex + 1 === totalQ
    const letters = ['A', 'B', 'C', 'D']
    const isCurrentFlagged = flaggedIndices.has(currentIndex)

    const timerClass =
      remainingSeconds > 300
        ? styles.timerPillNormal
        : remainingSeconds > 60
        ? styles.timerPillWarning
        : remainingSeconds > 0
        ? styles.timerPillCritical
        : styles.timerPillExpired

    return (
      <div style={{ minHeight: '100vh', width: '100%', background: 'var(--color-bg, #f8fafc)', paddingBottom: 60 }}>
        {/* Top Distraction-Free Header Bar */}
        <header className={styles.topNavHeader}>
          <div className={styles.topNavBrand}>
            <div className={styles.topNavBrandIcon}>
              <Shield size={20} />
            </div>
            <div className={styles.topNavBrandText}>
              <span className={styles.topNavBrandTitle}>KaushalAI</span>
              <span className={styles.topNavBrandSub}>Ministry of Statistics &amp; PI</span>
            </div>
            <span className={styles.topNavStepBadge}>
              <FileCheck size={14} />
              {t('onboarding.step5.tag', 'Step 5 of 6')}
            </span>
          </div>

          <div className={styles.topNavRight}>
            {/* Autosave Status Indicator */}
            <div
              className={`${styles.autosavePill} ${
                autosaveStatus === 'saving'
                  ? styles.autosavePillSaving
                  : autosaveStatus === 'saved'
                  ? styles.autosavePillSaved
                  : styles.autosavePillError
              }`}
              title="Progressive backend response synchronization"
            >
              {autosaveStatus === 'saving' ? (
                <>
                  <Loader2 size={13} className={styles.spinner} style={{ width: 13, height: 13, margin: 0 }} />
                  <span>{t('onboarding.step5.saving_answer', 'Saving...')}</span>
                </>
              ) : autosaveStatus === 'saved' ? (
                <>
                  <Check size={13} strokeWidth={3} />
                  <span>{t('onboarding.step5.saved_answer', 'Saved')}</span>
                </>
              ) : (
                <>
                  <AlertCircle size={13} />
                  <span>{t('onboarding.step5.save_error', 'Sync retry')}</span>
                </>
              )}
            </div>

            {/* Authoritative 20-Minute Countdown Timer */}
            <div className={`${styles.timerPill} ${timerClass}`} role="timer" aria-live="polite">
              <Clock size={16} />
              <span>{formatTime(remainingSeconds)}</span>
            </div>
          </div>
        </header>

        {/* Main Content Layout with Split Pane */}
        <main className={styles.container} style={{ maxWidth: 1180, paddingTop: 24 }}>
          <div className={styles.splitLayout}>
            {/* Left Column: Current Question */}
            <div className={styles.questionMainPane}>
              {/* Question Header */}
              <div className={styles.questionTopBar}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={styles.questionNumberTag}>
                    {t('onboarding.step5.question_of', { current: currentIndex + 1, total: totalQ, defaultValue: `Question ${currentIndex + 1} of ${totalQ}` })}
                  </span>
                  <span className={styles.competencyBadge}>
                    <Award size={14} />
                    {currentQ.competency_name || 'Core Competency'}
                  </span>
                </div>

                <button
                  type="button"
                  className={`${styles.flagToggleBtn} ${isCurrentFlagged ? styles.flagToggleBtnActive : ''}`}
                  onClick={() => toggleFlag(currentIndex)}
                  aria-pressed={isCurrentFlagged}
                >
                  <Flag size={14} fill={isCurrentFlagged ? '#f59e0b' : 'none'} color={isCurrentFlagged ? '#f59e0b' : '#64748b'} />
                  <span>{isCurrentFlagged ? t('onboarding.step5.unflag_btn', 'Flagged') : t('onboarding.step5.flag_btn', 'Flag for Review')}</span>
                </button>
              </div>

              {/* Progress Bar */}
              <div className={styles.progressBarTrack} style={{ margin: 0, borderRadius: 0, height: 4 }}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${progressPercent}%`, borderRadius: 0 }}
                />
              </div>

              {/* Question Body */}
              <div className={styles.questionBody}>
                <div className={styles.scenarioLead}>
                  {currentQ.difficulty ? `${currentQ.difficulty.toUpperCase()} • SCENARIO-BASED ASSESSMENT` : 'SCENARIO-BASED ASSESSMENT'}
                </div>
                <h2 className={styles.questionText}>{currentQ.text}</h2>

                <div className={styles.optionsStack}>
                  {(currentQ.options || []).map((opt, idx) => {
                    const isSelected = selectedOptionId === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`${styles.optionCard} ${isSelected ? styles.optionCardSelected : ''}`}
                        onClick={() => handleSelectOption(opt.id)}
                      >
                        <div className={styles.optionBadge}>{letters[idx] || (idx + 1)}</div>
                        <span className={styles.optionText}>{opt.text}</span>
                        {isSelected && (
                          <div style={{ marginLeft: 'auto', color: 'var(--color-primary-600, #2563eb)' }}>
                            <CheckCircle2 size={18} />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Action Footer */}
              <div className={styles.actionFooter}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className={styles.secondaryActionBtn}
                    style={{ padding: '10px 18px', fontSize: '0.875rem' }}
                  >
                    <ArrowLeft size={16} />
                    <span>{t('onboarding.step5.prev_btn', 'Previous')}</span>
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {!isLast ? (
                    <button
                      type="button"
                      className={styles.nextBtn}
                      onClick={handleNext}
                    >
                      <span>{t('onboarding.step5.next_btn', 'Next Question')}</span>
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.nextBtn}
                      style={{ background: '#10b981', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)' }}
                      onClick={handleOpenSubmitConfirm}
                    >
                      <span>{t('onboarding.step5.submit_btn', 'Submit Assessment')}</span>
                      <FileCheck size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Question Navigator Sidebar */}
            <aside className={styles.navigatorSidebarPane} aria-label="Question Navigator">
              <div className={styles.navigatorHeader}>
                <h3 className={styles.navigatorTitle}>
                  <BookOpen size={16} color="var(--color-primary-600, #2563eb)" />
                  <span>{t('onboarding.step5.question_palette', 'Question Navigator')}</span>
                </h3>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                  {answeredCount}/{totalQ}
                </span>
              </div>

              {/* Legend Row */}
              <div className={styles.navigatorLegendRow}>
                <div className={styles.legendItem}>
                  <span className={styles.legendDotAnswered} />
                  <span>{answeredCount} {t('onboarding.step5.answered', 'Answered')}</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendDotUnanswered} />
                  <span>{unansweredCount} {t('onboarding.step5.unanswered', 'Unanswered')}</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendDotFlagged} />
                  <span>{flaggedCount} {t('onboarding.step5.flagged', 'Flagged')}</span>
                </div>
              </div>

              {/* 15 Question Buttons Grid */}
              <div className={styles.navigatorGrid} role="navigation" aria-label="Questions list">
                {questions.map((q, idx) => {
                  const isCurrent = currentIndex === idx
                  const isAnswered = responses.some((r) => r.question_id === q._id && r.selected_option_id)
                  const isFlagged = flaggedIndices.has(idx)

                  let stateClass = styles.navBtnUnanswered
                  if (isAnswered) stateClass = styles.navBtnAnswered
                  if (isCurrent) stateClass += ` ${styles.navBtnCurrent}`
                  if (isFlagged) stateClass += ` ${styles.navBtnFlagged}`

                  return (
                    <button
                      key={q._id || idx}
                      type="button"
                      className={`${styles.navBtn} ${stateClass}`}
                      onClick={() => handleJumpToQuestion(idx)}
                      aria-label={`Question ${idx + 1}: ${isAnswered ? 'Answered' : 'Unanswered'}${isFlagged ? ', Flagged for review' : ''}`}
                      aria-current={isCurrent ? 'true' : undefined}
                    >
                      <span>{idx + 1}</span>
                      {isFlagged && (
                        <div className={styles.navFlagCorner}>
                          <Flag size={9} fill="#ffffff" color="#ffffff" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Sidebar Direct Submit Action */}
              <button
                type="button"
                className={styles.navigatorSubmitBtn}
                onClick={handleOpenSubmitConfirm}
              >
                <FileCheck size={16} />
                <span>{t('onboarding.step5.submit_btn', 'Submit Assessment')}</span>
              </button>
            </aside>
          </div>
        </main>

        {/* ── Confirmation Modal Dialog ── */}
        {showConfirmModal && (
          <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
            <div className={styles.modalCard}>
              <div className={styles.modalIconWrap}>
                <FileCheck size={28} />
              </div>
              <h2 id="confirm-modal-title" className={styles.modalTitle}>
                {t('onboarding.step5.confirm_title', 'Submit Competency Assessment?')}
              </h2>
              <p className={styles.modalDesc}>
                {t('onboarding.step5.confirm_desc', 'Once submitted, your answers will be deterministically graded server-side and your baseline competency levels will be established. This action cannot be undone.')}
              </p>

              <div className={styles.modalStatsGrid}>
                <div className={styles.modalStatCard}>
                  <div className={styles.modalStatVal}>{totalQ}</div>
                  <div className={styles.modalStatLabel}>{t('onboarding.step5.confirm_total', 'Total')}</div>
                </div>
                <div className={styles.modalStatCard} style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                  <div className={styles.modalStatVal} style={{ color: '#065f46' }}>{answeredCount}</div>
                  <div className={styles.modalStatLabel} style={{ color: '#047857' }}>{t('onboarding.step5.confirm_answered', 'Answered')}</div>
                </div>
                <div className={styles.modalStatCard} style={{ background: unansweredCount > 0 ? '#fffbeb' : undefined }}>
                  <div className={styles.modalStatVal} style={{ color: unansweredCount > 0 ? '#b45309' : undefined }}>{unansweredCount}</div>
                  <div className={styles.modalStatLabel}>{t('onboarding.step5.confirm_unanswered', 'Unanswered')}</div>
                </div>
                <div className={styles.modalStatCard}>
                  <div className={styles.modalStatVal} style={{ color: '#d97706' }}>{flaggedCount}</div>
                  <div className={styles.modalStatLabel}>{t('onboarding.step5.confirm_flagged', 'Flagged')}</div>
                </div>
              </div>

              {unansweredCount > 0 && (
                <div className={styles.modalWarningAlert}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>
                    {t('onboarding.step5.confirm_unanswered_warning', { count: unansweredCount, defaultValue: `Notice: You have ${unansweredCount} unanswered question(s). Unanswered questions will receive 0 marks.` })}
                  </span>
                </div>
              )}

              <div className={styles.modalActionsRow}>
                <button
                  type="button"
                  className={styles.modalCancelBtn}
                  onClick={() => setShowConfirmModal(false)}
                >
                  {t('onboarding.step5.return_review_btn', 'Return to Assessment')}
                </button>
                <button
                  type="button"
                  className={styles.modalConfirmBtn}
                  onClick={handleConfirmSubmit}
                >
                  {t('onboarding.step5.confirm_submit_btn', 'Confirm & Submit')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Time Expired Modal Dialog ── */}
        {showTimeExpiredModal && (
          <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
            <div className={styles.modalCard}>
              <div className={styles.modalIconWrap} style={{ background: '#fee2e2', borderColor: '#fca5a5', color: '#dc2626' }}>
                <Clock size={28} />
              </div>
              <h2 className={styles.modalTitle} style={{ color: '#991b1b' }}>
                {t('onboarding.step5.timer_expired', 'Time Expired')}
              </h2>
              <p className={styles.modalDesc}>
                {t('onboarding.step5.timer_expired_msg', 'The 20-minute assessment window has expired. Answers can no longer be modified. Your recorded answers are now being submitted for grading.')}
              </p>

              <button
                type="button"
                className={styles.modalConfirmBtn}
                style={{ width: '100%', background: '#dc2626' }}
                onClick={handleTimeoutSubmit}
              >
                {t('onboarding.step5.submit_btn', 'Submit Assessment Now')}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── RENDER: 3. EVALUATING / PROCESSING SCREEN ────────────────────────────────
  if (stage === 'submitting') {
    const checklist = [
      { text: 'Grading 15 scenario responses server-side', done: evalStep >= 1 },
      { text: 'Calculating competency proficiency & derived levels (1–5)', done: evalStep >= 2 },
      { text: 'Identifying role-aware skill gaps against cadre requirements', done: evalStep >= 3 },
      { text: 'Generating Grok AI diagnostic report & learning strategy', done: evalStep >= 4 },
      { text: 'Curating personalized course recommendations & learning path', done: evalStep >= 4 },
    ]

    return (
      <div className={styles.container}>
        <div className={styles.evaluatingCard}>
          <div className={styles.spinner} />
          <h2 className={styles.evaluatingTitle}>Analyzing Your Assessment...</h2>
          <p className={styles.evaluatingSubtitle}>
            Our deterministic competency engine and Grok AI are establishing your personalized skill profile.
          </p>

          <div className={styles.stepChecklist}>
            {checklist.map((item, idx) => (
              <div key={idx} className={styles.stepItem} style={{ opacity: item.done ? 1 : 0.45 }}>
                {item.done ? (
                  <CheckCircle2 size={18} color="#16a34a" />
                ) : (
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #cbd5e1' }} />
                )}
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── RENDER: ERROR SCREEN ─────────────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <div className={styles.container}>
        <div className={styles.introCard} style={{ textAlign: 'center' }}>
          <AlertCircle size={48} color="#dc2626" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
            Evaluation Error
          </h2>
          <p style={{ color: '#64748b', marginBottom: 24, fontSize: '0.9375rem' }}>
            {errorMessage || 'An error occurred during submission. Your draft has been preserved.'}
          </p>
          <button
            type="button"
            className={styles.startBtn}
            onClick={() => {
              setStage('in_progress')
              setErrorMessage('')
            }}
          >
            Resume Assessment
          </button>
        </div>
      </div>
    )
  }

  // ── RENDER: 4. RESULTS & GAP ANALYSIS SCREEN ─────────────────────────────────
  if (stage === 'results' && resultData) {
    const overallScore = resultData.overall_score || 0
    const totalCorrect = resultData.total_correct || 0
    const totalQ = resultData.total_questions || 15
    const compScores = resultData.per_competency_scores || []
    const gaps = resultData.skill_gaps || []
    const recommendations = resultData.recommendations || []
    const learningPath = resultData.learning_path || null
    const aiAnalysis = resultData.ai_analysis || null

    const highGapsCount = gaps.filter((g) => g.priority === 'high' || g.gap >= 2).length
    const onTrackCount = gaps.filter((g) => (g.gap || 0) <= 0).length

    return (
      <div className={styles.container}>
        <div className={styles.resultsContainer}>
          {/* Results Hero */}
          <div className={styles.resultsHero}>
            <div className={styles.heroLeft}>
              <div className={styles.heroRoleTag}>
                <Shield size={14} />
                <span>Cadre: Level {userLevel} — {userRoleTitle}</span>
              </div>
              <h1 className={styles.heroTitle}>Your Skill Gap Analysis</h1>
              <p className={styles.heroDesc}>
                Based on your latest diagnostic assessment and the official competency requirements for{' '}
                <strong>{userRoleTitle}</strong>.
              </p>
            </div>

            <div className={styles.scoreBadgeContainer}>
              <span className={styles.scoreLarge}>{overallScore}%</span>
              <span className={styles.scoreLabel}>Overall Readiness</span>
              <span style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: 4 }}>
                {totalCorrect}/{totalQ} Correct
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className={styles.navTabs}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <BarChart3 size={16} />
              <span>Diagnostic Overview &amp; AI</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'matrix' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('matrix')}
            >
              <Target size={16} />
              <span>Competency Gap Matrix ({compScores.length})</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'recommendations' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('recommendations')}
            >
              <BookOpen size={16} />
              <span>Personalized Recommendations ({recommendations.length})</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'path' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('path')}
            >
              <Layers size={16} />
              <span>Learning Path Flow</span>
            </button>
          </div>

          {/* ── TAB 1: OVERVIEW & GROK AI ────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div>
              {/* Grok AI Report Card */}
              {aiAnalysis && (
                <div className={styles.aiReportCard}>
                  <div className={styles.aiReportHeader}>
                    <div className={styles.aiBadge}>
                      <Bot size={16} />
                      <span>Grok AI Diagnostic Evaluation</span>
                    </div>
                    <span className={styles.aiModelTag}>Model: {aiAnalysis.model || 'grok-2-latest'}</span>
                  </div>

                  <p className={styles.aiSummaryText}>"{aiAnalysis.summary}"</p>

                  <div className={styles.aiColumns}>
                    <div className={styles.aiColumnBox}>
                      <div className={styles.aiColumnTitle} style={{ color: '#16a34a' }}>
                        <CheckCircle2 size={16} />
                        <span>Observed Strengths</span>
                      </div>
                      <ul className={styles.aiList}>
                        {(aiAnalysis.strengths || []).map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div className={styles.aiColumnBox}>
                      <div className={styles.aiColumnTitle} style={{ color: '#dc2626' }}>
                        <TrendingUp size={16} />
                        <span>Critical Development Areas</span>
                      </div>
                      <ul className={styles.aiList}>
                        {(aiAnalysis.growth_areas || []).map((g, idx) => (
                          <li key={idx}>{g}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {aiAnalysis.learning_focus && (
                    <div className={styles.aiStrategyBox}>
                      <Target size={18} />
                      <span><strong>Strategic Learning Focus:</strong> {aiAnalysis.learning_focus}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Gap Summary Highlights */}
              <div className={styles.featureGrid}>
                <div className={styles.featureCard}>
                  <div className={styles.featureNumber} style={{ color: '#dc2626' }}>
                    {highGapsCount}
                  </div>
                  <div className={styles.featureTitle}>Critical Gaps</div>
                  <div className={styles.featureSub}>Urgent training needed (Gap &ge; 2)</div>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureNumber} style={{ color: '#16a34a' }}>
                    {onTrackCount}
                  </div>
                  <div className={styles.featureTitle}>Proficient Areas</div>
                  <div className={styles.featureSub}>Meeting or exceeding cadre targets</div>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureNumber} style={{ color: '#2563eb' }}>
                    {recommendations.length}
                  </div>
                  <div className={styles.featureTitle}>Recommended Modules</div>
                  <div className={styles.featureSub}>Targeted to your skill gaps</div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: COMPETENCY GAP MATRIX ─────────────────────────────────── */}
          {activeTab === 'matrix' && (
            <div className={styles.gapGrid}>
              {compScores.map((c) => {
                const currentLvl = c.derived_level || 1
                const reqLvl = c.required_level || 3
                const gapVal = reqLvl - currentLvl
                const isCritical = gapVal >= 2
                const isMedium = gapVal === 1
                const isProficient = gapVal <= 0

                const badgeClass = isCritical
                  ? styles.severityCritical
                  : isMedium
                  ? styles.severityMedium
                  : styles.severityProficient

                const barColor = isCritical ? '#dc2626' : isMedium ? '#f59e0b' : '#16a34a'

                return (
                  <div key={c.competency_id || c.competency_name} className={styles.gapCard}>
                    <div className={styles.gapCardHeader}>
                      <span className={styles.gapCompName}>{c.competency_name}</span>
                      <span className={`${styles.severityBadge} ${badgeClass}`}>
                        {isCritical ? 'Critical Gap' : isMedium ? 'Needs Improvement' : 'Proficient'}
                      </span>
                    </div>

                    <div className={styles.levelCompareRow}>
                      <span>Current Level: <strong>L{currentLvl} ({c.percentage}%)</strong></span>
                      <span>Required Level: <strong>L{reqLvl}</strong></span>
                    </div>

                    <div className={styles.dualBarTrack}>
                      <div
                        className={styles.dualBarCurrent}
                        style={{
                          width: `${Math.min(100, Math.max(12, c.percentage))}%`,
                          background: barColor,
                        }}
                      />
                    </div>

                    <div className={styles.gapFooterText}>
                      <span>{c.correct} of {c.total} questions correct</span>
                      <span>
                        {gapVal > 0 ? `Gap: ${gapVal} Level${gapVal > 1 ? 's' : ''}` : 'Target Met'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── TAB 3: PERSONALIZED RECOMMENDATIONS ───────────────────────────── */}
          {activeTab === 'recommendations' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text, #0f172a)', margin: '0 0 6px 0' }}>
                  Your Recommended Learning
                </h3>
                <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary, #475569)', margin: 0 }}>
                  These courses are curated specifically to bridge your largest competency gaps for{' '}
                  <strong>{userRoleTitle}</strong>.
                </p>
              </div>

              <div className={styles.recGrid}>
                {recommendations.map((rec, idx) => {
                  const course = rec.course_id || {}
                  const isHigh = rec.priority_rank <= 2

                  return (
                    <div key={rec._id || idx} className={styles.recCard}>
                      <div className={styles.recThumb}>
                        {course.thumbnailUrl || course.thumbnail ? (
                          <img src={course.thumbnailUrl || course.thumbnail} alt={course.title} />
                        ) : (
                          <BookOpen size={40} opacity={0.6} />
                        )}
                        <span className={styles.recPriorityChip}>
                          {isHigh ? 'High Priority' : 'Targeted'}
                        </span>
                      </div>

                      <div className={styles.recContent}>
                        <div className={styles.recMetaRow}>
                          <span>{course.provider || 'iGOT Karmayogi'}</span>
                          <span>&bull;</span>
                          <span>{course.level || 'Intermediate'}</span>
                          <span>&bull;</span>
                          <span>{course.estimatedHours || 15}h</span>
                        </div>

                        <h4 className={styles.recTitle}>{course.title || 'Competency Enhancement Course'}</h4>
                        <div className={styles.recReason}>
                          {rec.reason || `Targeted module to bridge your high priority skill gap for ${userRoleTitle}.`}
                        </div>

                        <Link
                          to={course._id ? `/my-courses/${course._id}` : '/courses'}
                          className={styles.recActionBtn}
                        >
                          <span>Start Learning</span>
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── TAB 4: SEQUENCED LEARNING PATH ───────────────────────────────── */}
          {activeTab === 'path' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text, #0f172a)', margin: '0 0 6px 0' }}>
                  Personalized Learning Progression
                </h3>
                <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary, #475569)', margin: 0 }}>
                  Follow this sequenced path to systematically eliminate your skill gaps and prepare for targeted reassessment.
                </p>
              </div>

              <div className={styles.pathTimeline}>
                {recommendations.map((rec, idx) => {
                  const course = rec.course_id || {}
                  return (
                    <div key={rec._id || idx} className={styles.pathNode}>
                      <div className={styles.pathDot} />
                      <div className={styles.pathNodeCard}>
                        <div>
                          <div className={styles.pathStepNum}>Step {idx + 1} &bull; Priority {rec.priority_rank || idx + 1}</div>
                          <div className={styles.pathCourseTitle}>{course.title || 'Bridging Course'}</div>
                          <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 4 }}>
                            {rec.reason || 'Addresses priority competency gap.'}
                          </div>
                        </div>

                        <Link
                          to={course._id ? `/my-courses/${course._id}` : '/courses'}
                          className={styles.secondaryActionBtn}
                          style={{ padding: '8px 14px', fontSize: '0.8125rem' }}
                        >
                          <span>View Course</span>
                          <ExternalLink size={14} />
                        </Link>
                      </div>
                    </div>
                  )
                })}

                {/* Final Reassessment Node */}
                <div className={styles.pathNode}>
                  <div className={styles.pathDot} style={{ background: '#16a34a' }} />
                  <div className={styles.pathNodeCard} style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                    <div>
                      <div className={styles.pathStepNum} style={{ color: '#16a34a' }}>Final Milestone</div>
                      <div className={styles.pathCourseTitle} style={{ color: '#14532d' }}>
                        Targeted Competency Reassessment
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#15803d', marginTop: 4 }}>
                        Retake a focused assessment to evaluate gap closure and graduate to the next cadre level.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className={styles.resultsActionFooter}>
            <Link to="/skill-gaps" className={styles.secondaryActionBtn}>
              <BarChart3 size={18} />
              <span>View Full Skill Gap Matrix</span>
            </Link>

            <button
              type="button"
              className={styles.primaryActionBtn}
              onClick={handleContinueToDashboard}
            >
              <span>Continue to Dashboard</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
