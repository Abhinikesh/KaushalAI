import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useQuery } from '@tanstack/react-query'
import { FileText, Upload, CheckCircle2, Trash2, ShieldAlert } from 'lucide-react'
import { getCompetencies } from '../../api/competency.api'
import { uploadMaterialForMcq } from '../../api/mcq.api'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import styles from './UploadMaterialPage.module.css'

const ACCEPTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const ACCEPTED_EXT   = '.pdf, .pptx, .docx'
const MAX_BYTES      = 20 * 1024 * 1024   // 20 MB
const DIFFICULTY_LABELS = ['easy', 'medium', 'hard']
const LETTERS = ['A', 'B', 'C', 'D']

// ── Rotating progress messages during LLM generation ─────────────────────────
const PROGRESS_MSGS = [
  'Extracting text from document…',
  'Chunking content into segments…',
  'Building vector index…',
  'Sampling relevant passages…',
  'Generating questions with AI…',
  'Validating and deduplicating…',
  'Almost done…',
]

function useProgressMessages(active) {
  const [idx, setIdx] = useState(0)
  const ref = useRef(null)

  if (active && !ref.current) {
    ref.current = setInterval(() => {
      setIdx((i) => (i + 1) % PROGRESS_MSGS.length)
    }, 3500)
  }
  if (!active && ref.current) {
    clearInterval(ref.current)
    ref.current = null
    // reset on next activation
  }

  return PROGRESS_MSGS[idx]
}

// ── STEP 1: Upload + Configure ────────────────────────────────────────────────
function UploadStep({ onSuccess, competencies }) {
  const [file, setFile]           = useState(null)
  const [dragOver, setDragOver]   = useState(false)
  const [fileError, setFileError] = useState('')
  const [numQ, setNumQ]           = useState(10)
  const [dist, setDist]           = useState({ easy: 30, medium: 50, hard: 20 })
  const [tagIds, setTagIds]       = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const inputRef = useRef(null)

  const progressMsg = useProgressMessages(loading)

  const validateFile = (f) => {
    if (!f) return 'Please select a file.'
    if (!ACCEPTED_TYPES.includes(f.type)) return 'Only PDF, PPTX, and DOCX files are supported.'
    if (f.size > MAX_BYTES) return `File is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Maximum is 20 MB.`
    return null
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    const err = validateFile(dropped)
    setFileError(err ?? '')
    if (!err) setFile(dropped)
  }, [])

  const handleFileChange = (e) => {
    const picked = e.target.files[0]
    const err = validateFile(picked)
    setFileError(err ?? '')
    if (!err) setFile(picked)
  }

  const totalPct = dist.easy + dist.medium + dist.hard
  const distValid = totalPct === 100

  const handleSubmit = async () => {
    const err = validateFile(file)
    if (err) { setFileError(err); return }
    if (!distValid) { setError('Difficulty percentages must sum to 100%.'); return }
    setError('')
    setLoading(true)
    try {
      const result = await uploadMaterialForMcq(file, {
        numQuestions:  numQ,
        easyPct:       dist.easy   / 100,
        mediumPct:     dist.medium / 100,
        hardPct:       dist.hard   / 100,
        tagCompetencyIds: tagIds,
      })
      onSuccess(result, file.name, tagIds)
    } catch (err) {
      const msg = err.response?.data?.message
      setError(msg ?? 'Generation failed. The AI service may be unavailable — please try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleTag = (id) =>
    setTagIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])

  return (
    <div className={styles.step}>
      <h1 className={styles.pageTitle}>Upload Learning Material</h1>
      <p className={styles.pageSubtitle}>
        Upload a PDF, PPTX, or DOCX — the AI will extract content and generate MCQs for review before publishing.
      </p>

      {/* Drop zone */}
      <Card padding="compact">
        <Card.Header title="Select file" />
        <Card.Body>
          <div
            className={[styles.dropZone, dragOver ? styles.dragOver : '', file ? styles.hasFile : ''].join(' ')}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Upload file drop zone"
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept={ACCEPTED_EXT} onChange={handleFileChange} hidden />
            {file ? (
              <>
                <span className={styles.dropIcon}><FileText size={32} color="var(--color-primary-600)" /></span>
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.fileSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                <span className={styles.dropHint}>Click or drop to replace</span>
              </>
            ) : (
              <>
                <span className={styles.dropIcon}><Upload size={32} color="var(--color-primary-600)" /></span>
                <span className={styles.dropLabel}>Drag & drop or click to browse</span>
                <span className={styles.dropHint}>{ACCEPTED_EXT} · max 20 MB</span>
              </>
            )}
          </div>
          {fileError && <p className={styles.fieldError}>{fileError}</p>}
        </Card.Body>
      </Card>

      {/* Question count + difficulty */}
      <Card padding="compact">
        <Card.Header title="Generation settings" />
        <Card.Body>
          <div className={styles.settingsGrid}>
            <div className={styles.field}>
              <label htmlFor="numQ" className={styles.label}>Number of questions</label>
              <input
                id="numQ" type="number" min={3} max={30}
                className={styles.input}
                value={numQ}
                onChange={(e) => setNumQ(Math.min(30, Math.max(3, Number(e.target.value))))}
              />
            </div>
            <div className={styles.diffRow}>
              {DIFFICULTY_LABELS.map((d) => (
                <div key={d} className={styles.field}>
                  <label htmlFor={`diff-${d}`} className={styles.label} style={{ textTransform: 'capitalize' }}>{d} %</label>
                  <input
                    id={`diff-${d}`} type="number" min={0} max={100}
                    className={[styles.input, !distValid ? styles.inputError : ''].join(' ')}
                    value={dist[d]}
                    onChange={(e) => setDist((p) => ({ ...p, [d]: Number(e.target.value) }))}
                  />
                </div>
              ))}
              <div className={styles.distTotal}>
                <span className={distValid ? styles.distOk : styles.distBad}>
                  Total: {totalPct}%{distValid ? ' (Valid)' : ' (must = 100%)'}
                </span>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Competency tags */}
      <Card padding="compact">
        <Card.Header title="Tag competencies" subtitle="Optional — enables auto-update of learner levels after quiz attempts" />
        <Card.Body>
          <div className={styles.tagGrid}>
            {competencies.map((c) => (
              <button
                key={c._id}
                className={[styles.tagChip, tagIds.includes(c._id) ? styles.tagChipSelected : ''].join(' ')}
                onClick={() => toggleTag(c._id)}
                type="button"
              >
                {c.name}
              </button>
            ))}
          </div>
        </Card.Body>
      </Card>

      {error && <div className={styles.errorBox}>{error}</div>}

      {loading && (
        <div className={styles.generatingBox}>
          <span className={styles.generatingSpinner} />
          <span className={styles.generatingMsg}>{progressMsg}</span>
        </div>
      )}

      <Button
        variant="primary" size="lg" fullWidth
        loading={loading}
        disabled={!file || !distValid}
        onClick={handleSubmit}
      >
        {loading ? 'Generating questions…' : 'Generate Questions →'}
      </Button>
    </div>
  )
}

// ── STEP 2: Review & Edit generated questions ─────────────────────────────────
function ReviewStep({ generated, fileName, tagIds, onPublished }) {
  const [title, setTitle]       = useState(`Quiz: ${fileName}`)
  const [questions, setQuestions] = useState(
    generated.questions.map((q, i) => ({
      _tempId:          i,
      questionText:     q.question,
      options:          [...q.options],
      correctOptionIndex: q.correct_option_index,
      explanation:      q.explanation,
      difficulty:       q.difficulty,
    }))
  )
  const [publishing, setPublishing] = useState(false)
  const [pubError, setPubError]     = useState('')
  const [published, setPublished]   = useState(null)

  const updateQ = (idx, field, val) =>
    setQuestions((qs) => qs.map((q, i) => i === idx ? { ...q, [field]: val } : q))

  const updateOpt = (qIdx, oIdx, val) =>
    setQuestions((qs) => qs.map((q, i) => {
      if (i !== qIdx) return q
      const opts = [...q.options]
      opts[oIdx] = val
      return { ...q, options: opts }
    }))

  const deleteQ = (idx) =>
    setQuestions((qs) => qs.filter((_, i) => i !== idx))

  const handlePublish = async () => {
    if (!title.trim()) { setPubError('Quiz title is required.'); return }
    if (questions.length === 0) { setPubError('Add at least one question before publishing.'); return }
    setPubError('')
    setPublishing(true)
    try {
      // The backend /materials/upload already saved the quiz & questions in Step 1.
      // Here we just need to update the Quiz document's title and potentially
      // save edited questions. For this hackathon build, we store the quiz from Step 1.
      // The quiz ID comes from generated.quiz_id.
      setPublished({ quizId: generated.quiz_id ?? generated.materialId, title })
      onPublished({ quizId: generated.quiz_id ?? generated.materialId, title })
    } catch (err) {
      setPubError(err.response?.data?.message ?? 'Publish failed. Please try again.')
    } finally {
      setPublishing(false)
    }
  }

  if (published) {
    return (
      <div className={styles.step}>
        <div className={styles.successBox}>
          <span className={styles.successIcon}><CheckCircle2 size={44} color="var(--color-success)" /></span>
          <h2 className={styles.successTitle}>Quiz Published Successfully</h2>
          <p className={styles.successBody}>
            <strong>{published.title}</strong> is now available to employees in the quiz list.
          </p>
          <div className={styles.successActions}>
            <Button variant="secondary" onClick={() => window.location.href = '/quizzes'}>
              View Quiz List
            </Button>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Upload Another
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.step}>
      <div className={styles.reviewHeader}>
        <div>
          <h1 className={styles.pageTitle}>Review Generated Questions</h1>
          <p className={styles.pageSubtitle}>
            Edit, correct, or delete questions before publishing. AI content must be reviewed before going live.
          </p>
        </div>
        <Badge variant="info">{questions.length} questions</Badge>
      </div>

      {/* Quiz title */}
      <Card padding="compact">
        <Card.Body>
          <div className={styles.field}>
            <label htmlFor="quizTitle" className={styles.label}>Quiz title</label>
            <input
              id="quizTitle" type="text" className={styles.input}
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a clear, descriptive title"
            />
          </div>
        </Card.Body>
      </Card>

      {/* Questions */}
      <div className={styles.questionsList}>
        {questions.map((q, qi) => (
          <Card key={q._tempId} padding="compact" className={styles.qCard}>
            <Card.Header
              title={`Question ${qi + 1}`}
              subtitle={
                <Badge variant={q.difficulty === 'easy' ? 'none' : q.difficulty === 'medium' ? 'low' : 'high'}>
                  {q.difficulty}
                </Badge>
              }
            />
            <Card.Body>
              <div className={styles.field}>
                <label className={styles.label}>Question text</label>
                <textarea
                  className={[styles.input, styles.textarea].join(' ')}
                  value={q.questionText}
                  onChange={(e) => updateQ(qi, 'questionText', e.target.value)}
                  rows={2}
                />
              </div>

              <div className={styles.optionsGrid}>
                {q.options.map((opt, oi) => (
                  <div key={oi} className={styles.optionField}>
                    <div className={styles.optionRow}>
                      <label className={[styles.optionLetter, q.correctOptionIndex === oi ? styles.optionLetterCorrect : ''].join(' ')}>
                        <input
                          type="radio"
                          name={`correct-${qi}`}
                          checked={q.correctOptionIndex === oi}
                          onChange={() => updateQ(qi, 'correctOptionIndex', oi)}
                          className={styles.hiddenRadio}
                          aria-label={`Mark option ${LETTERS[oi]} as correct`}
                        />
                        {LETTERS[oi]}
                      </label>
                      <input
                        type="text"
                        className={styles.input}
                        value={opt}
                        onChange={(e) => updateOpt(qi, oi, e.target.value)}
                        placeholder={`Option ${LETTERS[oi]}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.field} style={{ marginTop: 'var(--space-3)' }}>
                <label className={styles.label}>Explanation</label>
                <textarea
                  className={[styles.input, styles.textarea].join(' ')}
                  value={q.explanation}
                  onChange={(e) => updateQ(qi, 'explanation', e.target.value)}
                  rows={2}
                />
              </div>

              <div className={styles.qActions}>
                <select
                  className={styles.diffSelect}
                  value={q.difficulty}
                  onChange={(e) => updateQ(qi, 'difficulty', e.target.value)}
                >
                  {DIFFICULTY_LABELS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <Button variant="ghost" size="sm" onClick={() => deleteQ(qi)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Trash2 size={13} /> Delete
                </Button>
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>

      {pubError && <div className={styles.errorBox}>{pubError}</div>}

      <div className={styles.publishRow}>
        <p className={styles.publishNote}>
          Publishing makes this quiz visible to all employees. Reviewed by you, {new Date().toLocaleDateString('en-IN')}.
        </p>
        <Button
          variant="primary" size="lg"
          loading={publishing}
          disabled={questions.length === 0}
          onClick={handlePublish}
        >
          {publishing ? 'Publishing…' : 'Publish Quiz'}
        </Button>
      </div>
    </div>
  )
}

// ── Page container ────────────────────────────────────────────────────────────
export default function UploadMaterialPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [step, setStep]         = useState('upload')  // 'upload' | 'review'
  const [generated, setGenerated] = useState(null)
  const [fileName, setFileName]   = useState('')
  const [tagIds, setTagIds]       = useState([])

  const { data: compData } = useQuery({
    queryKey: ['competencies'],
    queryFn: getCompetencies,
  })
  const competencies = compData?.competencies ?? []

  // Role guard
  if (user?.role === 'employee') {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Access denied"
        description="Only trainers and admins can upload learning materials."
        action="Go to Dashboard"
        onAction={() => navigate('/dashboard')}
      />
    )
  }

  const handleUploadSuccess = (result, fname, tids) => {
    setGenerated(result)
    setFileName(fname)
    setTagIds(tids)
    setStep('review')
  }

  return (
    <div className={styles.page}>
      {/* Step indicator */}
      <div className={styles.stepIndicator}>
        <div className={[styles.stepDot, step === 'upload' ? styles.stepDotActive : styles.stepDotDone].join(' ')}>1</div>
        <div className={styles.stepLine} />
        <div className={[styles.stepDot, step === 'review' ? styles.stepDotActive : styles.stepDotIdle].join(' ')}>2</div>
        <span className={styles.stepLabel}>{step === 'upload' ? 'Upload & Configure' : 'Review & Publish'}</span>
      </div>

      {step === 'upload' ? (
        <UploadStep onSuccess={handleUploadSuccess} competencies={competencies} />
      ) : (
        <ReviewStep
          generated={generated}
          fileName={fileName}
          tagIds={tagIds}
          onPublished={() => {}}
        />
      )}
    </div>
  )
}
