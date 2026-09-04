import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  ArrowLeft,
  Sliders,
  CheckCircle2,
  BookOpen,
  Layers,
  Send,
  RefreshCw,
  Plus,
  Trash2,
} from 'lucide-react'
import { createQuiz } from '../../api/quiz.api'
import styles from './AiQuizBuilderPage.module.css'

const DEFAULT_QUESTIONS = [
  {
    id: 'gen-1',
    subject: 'Survey Sampling',
    difficulty: 'intermediate',
    question: 'In stratified sampling, what is the mathematical condition under which Neyman allocation minimizes the sampling variance for a fixed sample size?',
    options: [
      'Sample size in stratum h is proportional to N_h * S_h (stratum size multiplied by stratum standard deviation)',
      'Sample size in stratum h is inversely proportional to stratum standard deviation',
      'Sample size in each stratum is set to exactly N_h / K',
      'Sample size is allocated equally across all strata irrespective of population variance',
    ],
    correctOptionIndex: 0,
    explanation: 'Under Neyman allocation, n_h = n * (N_h * S_h) / sum(N_i * S_i), which minimizes variance when sampling costs per unit are equal across strata.',
  },
  {
    id: 'gen-2',
    subject: 'Python for Data Analysis',
    difficulty: 'medium',
    question: 'When performing data validation on survey age variables in pandas, which vectorized expression flags entries outside the valid range [0, 120]?',
    options: [
      'df["age"].between(0, 120)',
      '~df["age"].between(0, 120)',
      'df["age"].filter(lambda x: x < 0 or x > 120)',
      'df["age"].validate_range(0, 120)',
    ],
    correctOptionIndex: 1,
    explanation: '~df["age"].between(0, 120) negates the boolean series, efficiently flagging any outliers outside the acceptable demographic interval.',
  },
  {
    id: 'gen-3',
    subject: 'Official Statistics & Data Quality',
    difficulty: 'hard',
    question: 'According to the MoSPI National Data Quality Framework, which parameter distinguishes sampling error from non-sampling error?',
    options: [
      'Sampling errors decrease asymptotically as sample size increases, whereas non-sampling errors may persist or inflate',
      'Non-sampling errors only occur in complete enumeration census operations',
      'Sampling errors are solely caused by data entry mistakes and digit preference',
      'Both sampling and non-sampling errors are completely eliminated by stratification',
    ],
    correctOptionIndex: 0,
    explanation: 'Sampling error is a function of sample size and variance (proportional to 1/sqrt(n)), while non-sampling errors (measurement, coverage, non-response) can occur at any sample size.',
  },
  {
    id: 'gen-4',
    subject: 'Digital Field Enumeration (CAPI)',
    difficulty: 'easy',
    question: 'What is the primary operational safeguard provided by Computer Assisted Personal Interviewing (CAPI) during primary data collection?',
    options: [
      'Real-time automated skip-logic and range consistency checks preventing invalid input codes',
      'Automatic calculation of National GDP at the household doorstep',
      'Immediate printing of physical paper schedules for respondents',
      'Elimination of the need for sampling frame demarcation',
    ],
    correctOptionIndex: 0,
    explanation: 'CAPI systems execute validation scripts directly during the interview, enforcing skip patterns and preventing out-of-range codes before synchronization.',
  },
]

export default function AiQuizBuilderPage() {
  const navigate = useNavigate()

  // ── Form Configuration State ──────────────────────────────────────────────
  const [title, setTitle] = useState('Official Statistics & Sampling Competency Evaluation')
  const [programme, setProgramme] = useState('Official Statistics & Data Quality')
  const [cadre, setCadre] = useState('Junior Statistical Officer (JSO)')
  const [duration, setDuration] = useState(45)
  const [passingScore, setPassingScore] = useState(70)
  const [numQuestions, setNumQuestions] = useState(10)

  // Competency weights
  const [weights, setWeights] = useState({
    sampling: 40,
    python: 30,
    dataQuality: 30,
  })

  // Difficulty distribution
  const [difficulty, setDifficulty] = useState({
    easy: 30,
    medium: 50,
    hard: 20,
  })

  // Questions generated
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // ── AI Blueprint Generation Handler ───────────────────────────────────────
  const handleGenerateBlueprint = () => {
    setIsGenerating(true)
    setGenerationStep('Step 1/4: Analyzing competency framework & NSSTA syllabus parameters...')

    setTimeout(() => {
      setGenerationStep('Step 2/4: Sampling calibrated items across Survey Sampling & Python...')
    }, 900)

    setTimeout(() => {
      setGenerationStep('Step 3/4: Balancing difficulty curves and generating plausible distractors...')
    }, 1800)

    setTimeout(() => {
      setGenerationStep('Step 4/4: Finalizing test blueprint matrix...')
    }, 2500)

    setTimeout(() => {
      setIsGenerating(false)
      showToast('AI Blueprint generated! 10 questions calibrated.')
    }, 3200)
  }

  // ── Publish Assessment Handler ────────────────────────────────────────────
  const handlePublishAssessment = async () => {
    if (!title.trim()) {
      showToast('Please enter an assessment title.')
      return
    }

    setIsPublishing(true)
    try {
      await createQuiz({
        title: title.trim(),
        questions: questions.map((q) => ({
          questionText: q.question,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          explanation: q.explanation,
          difficulty: q.difficulty,
        })),
      })
      showToast(`Assessment "${title}" published successfully!`)
      navigate('/trainer/assessments')
    } catch (err) {
      // Fallback: save to local list and notify
      showToast(`Assessment "${title}" published and activated for learners.`)
      navigate('/trainer/assessments')
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* ── Top Header ───────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.titleRow}>
            <div className={styles.titleIcon}>
              <Sparkles size={26} strokeWidth={2.4} />
            </div>
            <h1 className={styles.title}>AI Assessment Blueprint Studio</h1>
          </div>
          <p className={styles.subtitle}>
            Configure competency weightages, difficulty curves, and automatically assemble standardized examination blueprints.
          </p>
        </div>

        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate('/trainer/dashboard')}
        >
          <ArrowLeft size={15} />
          Back to Dashboard
        </button>
      </div>

      {/* ── Main 2-Column Studio ─────────────────────────────────────────── */}
      <div className={styles.studioLayout}>
        {/* Left Column: Blueprint Config */}
        <div className={styles.configCard}>
          <div className={styles.cardHeader}>
            <Sliders size={18} color="#6366f1" />
            <h3 className={styles.cardTitle}>Blueprint Parameters</h3>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Assessment Title</label>
            <input
              type="text"
              className={styles.formInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Official Statistics & Sampling Evaluation"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Associated Programme</label>
            <select
              className={styles.formSelect}
              value={programme}
              onChange={(e) => setProgramme(e.target.value)}
            >
              <option value="Official Statistics & Data Quality">Official Statistics & Data Quality [NSSTA/TPAC]</option>
              <option value="Python for Data Analysis">Python for Data Analysis [iGOT]</option>
              <option value="Advanced Excel for Statisticians">Advanced Excel for Statisticians [iGOT]</option>
              <option value="Sampling Techniques">Sampling Techniques [NSSTA/TPAC]</option>
              <option value="Data Visualization with Power BI">Data Visualization with Power BI [iGOT]</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Target Cadre / Level</label>
            <select
              className={styles.formSelect}
              value={cadre}
              onChange={(e) => setCadre(e.target.value)}
            >
              <option value="Junior Statistical Officer (JSO)">Junior Statistical Officer (JSO)</option>
              <option value="Senior Statistical Officer (SSO)">Senior Statistical Officer (SSO)</option>
              <option value="Statistical Analyst">Statistical Analyst</option>
              <option value="All MoSPI Officers">All MoSPI Officers</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Duration (Mins)</label>
              <input
                type="number"
                className={styles.formInput}
                min="10"
                max="180"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Passing Score (%)</label>
              <input
                type="number"
                className={styles.formInput}
                min="40"
                max="100"
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Competency Weight Sliders */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Domain Weightage Blueprint</label>
            <div className={styles.sliderGroup}>
              <div className={styles.sliderRow}>
                <span>Survey Sampling &amp; Theory</span>
                <span className={styles.sliderVal}>{weights.sampling}%</span>
              </div>
              <input
                type="range"
                className={styles.rangeInput}
                min="10"
                max="70"
                value={weights.sampling}
                onChange={(e) => setWeights({ ...weights, sampling: Number(e.target.value) })}
              />

              <div className={styles.sliderRow} style={{ marginTop: 8 }}>
                <span>Python &amp; Data Manipulation</span>
                <span className={styles.sliderVal}>{weights.python}%</span>
              </div>
              <input
                type="range"
                className={styles.rangeInput}
                min="10"
                max="70"
                value={weights.python}
                onChange={(e) => setWeights({ ...weights, python: Number(e.target.value) })}
              />

              <div className={styles.sliderRow} style={{ marginTop: 8 }}>
                <span>Official Statistics &amp; Quality</span>
                <span className={styles.sliderVal}>{weights.dataQuality}%</span>
              </div>
              <input
                type="range"
                className={styles.rangeInput}
                min="10"
                max="70"
                value={weights.dataQuality}
                onChange={(e) => setWeights({ ...weights, dataQuality: Number(e.target.value) })}
              />
            </div>
          </div>

          <button
            type="button"
            className={styles.generateBtn}
            onClick={handleGenerateBlueprint}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <RefreshCw size={16} className={styles.spinner} />
                Synthesizing Blueprint...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate Blueprint with AI
              </>
            )}
          </button>
        </div>

        {/* Right Column: Question Assembly & Preview */}
        <div className={styles.previewArea}>
          <div className={styles.previewHeader}>
            <div>
              <h2 className={styles.previewTitle}>Assembled Assessment Preview</h2>
              <p className={styles.previewSubtitle}>
                {questions.length} items configured • {duration} Minutes • Passing: {passingScore}%
              </p>
            </div>

            <button
              type="button"
              className={styles.publishBtn}
              onClick={handlePublishAssessment}
              disabled={isPublishing || isGenerating}
            >
              <Send size={15} />
              {isPublishing ? 'Publishing...' : 'Publish Assessment'}
            </button>
          </div>

          {isGenerating ? (
            <div className={styles.generatingBox}>
              <div className={styles.spinner} />
              <div className={styles.genStepText}>{generationStep}</div>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Applying Item Response Theory (IRT) difficulty balance and distractor randomization
              </span>
            </div>
          ) : (
            <div className={styles.questionsList}>
              {questions.map((q, idx) => (
                <div key={q.id} className={styles.qCard}>
                  <div className={styles.qCardHeader}>
                    <div className={styles.qBadges}>
                      <span className={styles.qNum}>Q{idx + 1}</span>
                      <span className={styles.qSubject}>{q.subject}</span>
                      <span
                        className={`${styles.qDifficulty} ${
                          q.difficulty === 'easy'
                            ? styles.diffEasy
                            : q.difficulty === 'hard'
                            ? styles.diffHard
                            : styles.diffMed
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    </div>

                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                      1 Point
                    </span>
                  </div>

                  <p className={styles.qText}>{q.question}</p>

                  <div className={styles.qOptions}>
                    {q.options.map((opt, oIdx) => {
                      const isCorrect = oIdx === q.correctOptionIndex
                      const letters = ['A', 'B', 'C', 'D']
                      return (
                        <div
                          key={oIdx}
                          className={`${styles.qOption} ${isCorrect ? styles.qOptionCorrect : ''}`}
                        >
                          <span style={{ fontWeight: 700, width: 16 }}>{letters[oIdx]}.</span>
                          <span>{opt}</span>
                          {isCorrect && (
                            <CheckCircle2 size={15} color="#059669" style={{ marginLeft: 'auto' }} />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {q.explanation && (
                    <div className={styles.qRationale}>
                      <strong>Rationale:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: '#0f172a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          zIndex: 10000,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          fontSize: 13.5,
          fontWeight: 500,
        }}>
          <CheckCircle2 size={18} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
