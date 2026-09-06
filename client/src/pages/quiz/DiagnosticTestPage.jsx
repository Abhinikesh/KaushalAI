import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Shield,
  CheckCircle2,
  Clock,
  ArrowRight,
  BarChart3,
  Award,
  AlertCircle,
  HelpCircle,
  FileCheck,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { startDiagnosticTest, submitDiagnosticTest } from '../../api/assessment.api'
import styles from './DiagnosticTestPage.module.css'

export default function DiagnosticTestPage() {
  const { user, setAuth, accessToken } = useAuthStore()
  const navigate = useNavigate()

  // Stages: 'intro' | 'in_progress' | 'submitting' | 'results' | 'error'
  const [stage, setStage] = useState('intro')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Test data
  const [attemptId, setAttemptId] = useState(null)
  const [assessmentMeta, setAssessmentMeta] = useState(null)
  const [competencies, setCompetencies] = useState([])
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)

  // Current question response tracking
  const [selectedOptionId, setSelectedOptionId] = useState('')
  const [responses, setResponses] = useState([])
  const questionStartTimeRef = useRef(Date.now())

  // Final results
  const [resultData, setResultData] = useState(null)

  // Level name helper
  const tierNames = [
    '',
    'Support Staff',
    'Junior Assistant',
    'Section Officer',
    'Senior Officer',
    'Department Head',
  ]
  const userLevel = Number(user?.level) || 3
  const tierTitle = tierNames[userLevel] || 'Section Officer'

  // Default competencies fallback if not yet fetched
  const defaultCompetenciesByLevel = {
    1: ['Digital Literacy', 'Cybersecurity Awareness', 'Email & Communication', 'Government Digital Platforms', 'Basic Document Handling'],
    2: ['MS Office/Productivity', 'Digital Documentation', 'Data Entry & Validation', 'Email/Communication', 'Cybersecurity', 'Basic e-Governance'],
    3: ['Data Interpretation', 'Digital Governance', 'Process Management', 'Information Security', 'Problem Solving', 'Communication'],
    4: ['Data-driven Decision Making', 'Digital Transformation', 'Cybersecurity Governance', 'Project/Process Management', 'Analytical Reasoning', 'Stakeholder Management'],
    5: ['Digital Transformation Strategy', 'Policy Implementation', 'Leadership', 'Risk Management', 'Data-driven Governance', 'Change Management', 'AI/Technology Awareness'],
  }
  const previewCompetencies = defaultCompetenciesByLevel[userLevel] || defaultCompetenciesByLevel[3]

  // Reset timer on index change
  useEffect(() => {
    questionStartTimeRef.current = Date.now()
    setSelectedOptionId('')
  }, [currentIndex])

  // Start assessment handler
  const handleStartTest = async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const data = await startDiagnosticTest()
      setAttemptId(data.attemptId)
      setAssessmentMeta(data.assessment)
      setCompetencies(data.competencies || [])
      setQuestions(data.questions || [])
      setCurrentIndex(0)
      setResponses([])
      setStage('in_progress')
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to initialize diagnostic assessment. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  // Next / Submit handler
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

    const updatedResponses = [...responses, newResponse]
    setResponses(updatedResponses)

    // If there are more questions, proceed to next
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      // Last question: submit immediately
      setStage('submitting')
      try {
        const result = await submitDiagnosticTest(attemptId, updatedResponses)
        setResultData(result)

        // Update local auth state with graduated onboarding status
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

  // Continue to dashboard handler
  const handleContinueToDashboard = () => {
    navigate('/dashboard')
  }

  // ── Render: Intro Screen ──────────────────────────────────────────────────────
  if (stage === 'intro') {
    return (
      <div className={styles.container}>
        <div className={styles.introCard}>
          <div className={styles.iconWrap}>
            <Sparkles size={32} />
          </div>

          <div className={styles.introHeader}>
            <div className={styles.tierPill}>
              <Shield size={14} />
              <span>Assigned Tier: Level {userLevel} — {tierTitle}</span>
            </div>

            <h1 className={styles.title}>Cadre Diagnostic Assessment</h1>
            <p className={styles.subtitle}>
              You're about to take a <strong>15-question diagnostic assessment</strong> to identify your
              current skill levels across{' '}
              <span className={styles.highlightBadge}>
                {previewCompetencies.slice(0, -1).join(', ')} and {previewCompetencies.slice(-1)}
              </span>
              . This takes about <strong>7–10 minutes</strong>.
            </p>
          </div>

          <div className={styles.competencyGrid}>
            {previewCompetencies.map((comp) => (
              <span key={comp} className={styles.compChip}>
                <Award size={15} color="#2563eb" />
                {comp}
              </span>
            ))}
          </div>

          <div className={styles.bulletRules}>
            <div className={styles.ruleItem}>
              <CheckCircle2 size={18} color="#16a34a" />
              <span>15 Scenario-based Questions</span>
            </div>
            <div className={styles.ruleItem}>
              <Clock size={18} color="#2563eb" />
              <span>7–10 Minutes Estimated</span>
            </div>
            <div className={styles.ruleItem}>
              <FileCheck size={18} color="#7c3aed" />
              <span>Deterministic Server Grading</span>
            </div>
            <div className={styles.ruleItem}>
              <HelpCircle size={18} color="#ea580c" />
              <span>One question at a time (no backtracks)</span>
            </div>
          </div>

          {errorMessage && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
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
            {loading ? 'Preparing Questions...' : 'Start Diagnostic Assessment'}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    )
  }

  // ── Render: Active Test Stage ────────────────────────────────────────────────
  if (stage === 'in_progress') {
    const currentQ = questions[currentIndex]
    const totalQ = questions.length
    const progressPercent = Math.round(((currentIndex + 1) / totalQ) * 100)
    const isLast = currentIndex + 1 === totalQ

    const letters = ['A', 'B', 'C', 'D']

    return (
      <div className={styles.container}>
        <div className={styles.quizCard}>
          {/* Top Progress Track */}
          <div className={styles.topBar}>
            <div className={styles.progressHeader}>
              <span className={styles.qCounter}>
                Question {currentIndex + 1} of {totalQ}
              </span>
              <span className={styles.competencyTag}>
                <Award size={14} />
                {currentQ.competency_name || 'Core Competency'}
              </span>
            </div>

            <div className={styles.progressBarTrack}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Question Text */}
          <div className={styles.questionBody}>
            <h2 className={styles.questionText}>{currentQ.text}</h2>

            {/* Options */}
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

          {/* Footer Action */}
          <div className={styles.actionFooter}>
            <span className={styles.helperText}>
              Select the most appropriate professional action to continue
            </span>

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

  // ── Render: Submitting Spinner ───────────────────────────────────────────────
  if (stage === 'submitting') {
    return (
      <div className={styles.container}>
        <div className={styles.quizCard} style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div
            style={{
              display: 'inline-block',
              width: 50,
              height: 50,
              border: '4px solid #e2e8f0',
              borderTopColor: '#2563eb',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: 20,
            }}
          />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
            Evaluating Assessment...
          </h2>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.9375rem' }}>
            Grading responses and determining your baseline competency proficiency levels.
          </p>
        </div>
      </div>
    )
  }

  // ── Render: Error Screen ─────────────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <div className={styles.container}>
        <div className={styles.introCard} style={{ textAlign: 'center' }}>
          <AlertCircle size={48} color="#dc2626" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
            Evaluation Notice
          </h2>
          <p style={{ color: '#64748b', marginBottom: 24, fontSize: '0.9375rem' }}>
            {errorMessage || 'An error occurred while evaluating your assessment.'}
          </p>
          <button
            type="button"
            className={styles.startBtn}
            onClick={() => {
              setStage('intro')
              setErrorMessage('')
            }}
          >
            Retry Assessment
          </button>
        </div>
      </div>
    )
  }

  // ── Render: Results Summary Screen ───────────────────────────────────────────
  if (stage === 'results' && resultData) {
    const overallScore = resultData.overall_score || 0
    const totalCorrect = resultData.total_correct || 0
    const totalQ = resultData.total_questions || 15
    const compScores = resultData.per_competency_scores || []

    const levelColors = {
      1: '#ef4444',
      2: '#f59e0b',
      3: '#6366f1',
      4: '#2563eb',
      5: '#10b981',
    }

    return (
      <div className={styles.container}>
        <div className={styles.resultsCard}>
          {/* Results Hero Header */}
          <div className={styles.resultsHero}>
            <div className={styles.scoreCircle}>
              <span className={styles.scorePercent}>{overallScore}%</span>
              <span className={styles.scoreSub}>Score</span>
            </div>

            <div>
              <div className={styles.tierPill}>
                <CheckCircle2 size={14} />
                <span>Onboarding Stage Complete</span>
              </div>
              <h1 className={styles.resultsHeading}>Diagnostic Test Results</h1>
              <p className={styles.resultsDesc}>
                You answered <strong>{totalCorrect} of {totalQ} questions correctly</strong>. Based on your
                responses, your official baseline competency profile has been established in the system.
              </p>
            </div>
          </div>

          {/* Competency Level Breakdown */}
          <div className={styles.competencyBreakdownTitle}>
            <BarChart3 size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            Assessed Competency Levels
          </div>

          <div className={styles.scoreList}>
            {compScores.map((c) => {
              const lvl = c.derived_level || 1
              const tagClass = styles[`levelTag${lvl}`] || styles.levelTag3
              const barColor = levelColors[lvl] || '#2563eb'

              return (
                <div key={c.competency_id || c.competency_name} className={styles.scoreRow}>
                  <div className={styles.scoreRowHeader}>
                    <span className={styles.compName}>{c.competency_name}</span>
                    <span className={`${styles.levelTag} ${tagClass}`}>
                      Level {lvl} ({lvl === 1 ? 'Novice' : lvl === 2 ? 'Developing' : lvl === 3 ? 'Competent' : lvl === 4 ? 'Advanced' : 'Expert'})
                    </span>
                  </div>

                  <div className={styles.barContainer}>
                    <div
                      className={styles.barFilled}
                      style={{
                        width: `${Math.max(8, c.percentage)}%`,
                        background: barColor,
                      }}
                    />
                  </div>

                  <div className={styles.ratioText}>
                    {c.correct} of {c.total} questions correct ({c.percentage}%)
                  </div>
                </div>
              )
            })}
          </div>

          {/* Finish & Proceed to Dashboard Button */}
          <button
            type="button"
            className={styles.finishBtn}
            onClick={handleContinueToDashboard}
          >
            <span>Continue to Dashboard</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    )
  }

  return null
}
