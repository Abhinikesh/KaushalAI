import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import {
  startDiagnosticTest,
  submitDiagnosticTest,
  getDiagnosticAttemptResults,
} from '../../api/assessment.api'
import styles from './DiagnosticTestPage.module.css'

const DRAFT_KEY = 'kaushalai_diagnostic_assessment_draft'

export default function DiagnosticTestPage() {
  const { user, setAuth, accessToken } = useAuthStore()
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

  // Current question response tracking
  const [selectedOptionId, setSelectedOptionId] = useState('')
  const [responses, setResponses] = useState([])
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

  // ── Restore Draft on Mount (Case 10: Refresh Recovery) ────────────────────────
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY)
      if (savedDraft) {
        const draft = JSON.parse(savedDraft)
        if (draft && draft.attemptId && Array.isArray(draft.questions) && draft.questions.length > 0) {
          setAttemptId(draft.attemptId)
          setAssessmentMeta(draft.assessmentMeta)
          setProfileMeta(draft.profileMeta)
          setCompetencies(draft.competencies || [])
          setQuestions(draft.questions)
          setResponses(draft.responses || [])
          setCurrentIndex(draft.currentIndex || 0)
          setSelectedOptionId(draft.selectedOptionId || '')
          setStage('in_progress')
        }
      }
    } catch {
      localStorage.removeItem(DRAFT_KEY)
    }
  }, [])

  // Sync draft to localStorage during test
  useEffect(() => {
    if (stage === 'in_progress' && attemptId) {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            attemptId,
            assessmentMeta,
            profileMeta,
            competencies,
            questions,
            responses,
            currentIndex,
            selectedOptionId,
          })
        )
      } catch {
        // ignore storage errors
      }
    }
  }, [stage, attemptId, currentIndex, responses, selectedOptionId, questions, competencies, assessmentMeta, profileMeta])

  // Reset timer & load previous answer if moving between questions
  useEffect(() => {
    questionStartTimeRef.current = Date.now()
    const existing = responses.find((r) => r.question_id === questions[currentIndex]?._id)
    setSelectedOptionId(existing?.selected_option_id || '')
  }, [currentIndex, questions])

  // Submitting stage step animation timer
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

  // ── Handler: Start Assessment ────────────────────────────────────────────────
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
      setCurrentIndex(0)
      setResponses([])
      setSelectedOptionId('')
      setStage('in_progress')
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to initialize diagnostic assessment. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  // ── Handler: Previous Question ───────────────────────────────────────────────
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  // ── Handler: Next or Final Submit ───────────────────────────────────────────
  const handleNextOrSubmit = async () => {
    if (!selectedOptionId) return

    const now = Date.now()
    const secondsTaken = Math.max(1, Math.round((now - questionStartTimeRef.current) / 1000))
    const currentQ = questions[currentIndex]

    const newResponse = {
      question_id: currentQ._id,
      selected_option_id: selectedOptionId,
      time_taken_seconds: secondsTaken,
    }

    // Upsert response in list
    const updatedResponses = responses.filter((r) => r.question_id !== currentQ._id)
    updatedResponses.push(newResponse)
    setResponses(updatedResponses)

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      // Last question: submit immediately
      setStage('submitting')
      setEvalStep(0)
      try {
        const result = await submitDiagnosticTest(attemptId, updatedResponses)
        setResultData(result)

        // Clear local draft upon completion
        localStorage.removeItem(DRAFT_KEY)

        // Update local auth store so user is marked onboarding_completed
        if (user) {
          setAuth(
            {
              ...user,
              onboarding_completed: true,
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
  }

  // ── Handler: Go to Dashboard ────────────────────────────────────────────────
  const handleContinueToDashboard = () => {
    navigate('/dashboard')
  }

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
    const currentQ = questions[currentIndex]
    const totalQ = questions.length || 15
    const progressPercent = Math.round(((currentIndex + 1) / totalQ) * 100)
    const isLast = currentIndex + 1 === totalQ
    const letters = ['A', 'B', 'C', 'D']

    return (
      <div className={styles.container}>
        <div className={styles.quizCard}>
          {/* Header */}
          <div className={styles.testHeader}>
            <div className={styles.testHeaderRow}>
              <span className={styles.competencyBadge}>
                <Award size={14} />
                {currentQ.competency_name || 'Core Competency'}
              </span>
              <div className={styles.testProgressMeta}>
                <span>Question {currentIndex + 1} of {totalQ}</span>
                <span>{progressPercent}%</span>
              </div>
            </div>

            <div className={styles.progressBarTrack}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Question & Options */}
          <div className={styles.questionBody}>
            <div className={styles.scenarioLead}>Scenario-based Question</div>
            <h2 className={styles.questionText}>{currentQ.text}</h2>

            <div className={styles.optionsStack}>
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedOptionId === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.optionCard} ${isSelected ? styles.optionCardSelected : ''}`}
                    onClick={() => setSelectedOptionId(opt.id)}
                  >
                    <div className={styles.optionBadge}>{letters[idx] || (idx + 1)}</div>
                    <span className={styles.optionText}>{opt.text}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div className={styles.actionFooter}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {currentIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className={styles.secondaryActionBtn}
                  style={{ padding: '10px 18px', fontSize: '0.875rem' }}
                >
                  <ArrowLeft size={16} />
                  <span>Previous</span>
                </button>
              )}
              <span className={styles.footerHelper}>
                Select the most sound official procedure to proceed
              </span>
            </div>

            <button
              type="button"
              className={styles.nextBtn}
              onClick={handleNextOrSubmit}
              disabled={!selectedOptionId}
            >
              <span>{isLast ? 'Submit Assessment' : 'Next Question'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
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
