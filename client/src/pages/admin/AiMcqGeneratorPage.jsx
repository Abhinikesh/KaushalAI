import { useState, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { createQuiz } from '../../api/quiz.api'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import {
  Sparkles,
  CloudUpload,
  FileText,
  Check,
  Trash2,
  Edit2,
  Copy,
  Eye,
  Download,
  Save,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Bot,
  Lightbulb,
  X,
  CheckCircle2,
  Plus,
  Minus,
  Info,
  AlertCircle,
  PlayCircle,
  Layers,
} from 'lucide-react'
import styles from './AiMcqGeneratorPage.module.css'

const INITIAL_QUESTIONS = [
  {
    id: 1,
    number: 1,
    type: 'MCQ (Single Answer)',
    category: 'single',
    difficulty: 'Easy',
    bloomsLevel: 'Remember',
    source: 'Page 3',
    confidenceScore: 92,
    questionText: 'Which of the following Pandas function is used to read data from a CSV file?',
    options: [
      { id: 'A', text: 'read.csv()' },
      { id: 'B', text: 'load_csv()' },
      { id: 'C', text: 'read_csv()' },
      { id: 'D', text: 'import_csv()' },
    ],
    correctOption: 'C',
    explanation: 'read_csv() is the correct function used to import CSV data into a DataFrame in Pandas.',
  },
  {
    id: 2,
    number: 2,
    type: 'MCQ (Single Answer)',
    category: 'single',
    difficulty: 'Easy',
    bloomsLevel: 'Remember',
    source: 'Page 4',
    confidenceScore: 96,
    questionText: 'Which method is used in Pandas to display the first 5 rows of a DataFrame?',
    options: [
      { id: 'A', text: 'tail()' },
      { id: 'B', text: 'head()' },
      { id: 'C', text: 'preview()' },
      { id: 'D', text: 'first()' },
    ],
    correctOption: 'B',
    explanation: 'head(n=5) returns the top n rows of a DataFrame.',
  },
  {
    id: 3,
    number: 3,
    type: 'MCQ (Single Answer)',
    category: 'single',
    difficulty: 'Medium',
    bloomsLevel: 'Apply',
    source: 'Page 5',
    confidenceScore: 89,
    questionText: 'How do you replace missing NaN values with a zero in a DataFrame named df?',
    options: [
      { id: 'A', text: 'df.dropna(value=0)' },
      { id: 'B', text: 'df.fillna(0)' },
      { id: 'C', text: 'df.replace_null(0)' },
      { id: 'D', text: 'df.impute_zeros()' },
    ],
    correctOption: 'B',
    explanation: 'fillna(value) fills NA/NaN values using the specified fill value.',
  },
  {
    id: 4,
    number: 4,
    type: 'MCQ (Multiple Answer)',
    category: 'multiple',
    difficulty: 'Medium',
    bloomsLevel: 'Analyze',
    source: 'Page 6',
    confidenceScore: 88,
    questionText: 'Which of the following are valid indexing accessors in Pandas? (Select all that apply)',
    options: [
      { id: 'A', text: '.loc[] - label-based indexing' },
      { id: 'B', text: '.iloc[] - integer position-based indexing' },
      { id: 'C', text: '.at[] - fast single scalar access' },
      { id: 'D', text: '.select_col[] - column vector parser' },
    ],
    correctOption: 'A',
    correctOptions: ['A', 'B', 'C'],
    explanation: '.loc[], .iloc[], and .at[] are the official indexing operators in Pandas.',
  },
  {
    id: 5,
    number: 5,
    type: 'MCQ (Single Answer)',
    category: 'single',
    difficulty: 'Hard',
    bloomsLevel: 'Evaluate',
    source: 'Page 8',
    confidenceScore: 85,
    questionText: 'Which Pandas technique provides optimal memory performance when aggregating 100M+ MoSPI survey records?',
    options: [
      { id: 'A', text: 'Python for-loop iteration over iterrows()' },
      { id: 'B', text: 'Category dtypes and vectorized groupby with numba/Cython backend' },
      { id: 'C', text: 'df.apply(axis=1) lambda operations' },
      { id: 'D', text: 'Converting to python nested dictionaries' },
    ],
    correctOption: 'B',
    explanation: 'Converting repetitive strings to category dtypes and using vectorized groupby drastically reduces memory overhead.',
  },
  {
    id: 6,
    number: 6,
    type: 'True / False',
    category: 'boolean',
    difficulty: 'Easy',
    bloomsLevel: 'Understand',
    source: 'Page 2',
    confidenceScore: 98,
    questionText: 'In Pandas, a Series is a one-dimensional labeled array capable of holding any data type.',
    options: [
      { id: 'A', text: 'True' },
      { id: 'B', text: 'False' },
    ],
    correctOption: 'A',
    explanation: 'True: A Series is a 1D labeled array capable of storing integers, floats, strings, and objects.',
  },
  {
    id: 7,
    number: 7,
    type: 'MCQ (Single Answer)',
    category: 'single',
    difficulty: 'Easy',
    bloomsLevel: 'Remember',
    source: 'Page 3',
    confidenceScore: 94,
    questionText: 'Which parameter in read_csv() specifies the character used to separate columns in CSV files?',
    options: [
      { id: 'A', text: 'delimiter or sep' },
      { id: 'B', text: 'split_by' },
      { id: 'C', text: 'col_break' },
      { id: 'D', text: 'divider' },
    ],
    correctOption: 'A',
    explanation: 'sep or delimiter specifies the delimiter token (e.g. comma, tab, pipe).',
  },
  {
    id: 8,
    number: 8,
    type: 'MCQ (Single Answer)',
    category: 'single',
    difficulty: 'Medium',
    bloomsLevel: 'Apply',
    source: 'Page 7',
    confidenceScore: 91,
    questionText: 'How can you compute descriptive summary statistics (mean, std, min, quartiles) for all numeric columns?',
    options: [
      { id: 'A', text: 'df.summarize()' },
      { id: 'B', text: 'df.describe()' },
      { id: 'C', text: 'df.stats()' },
      { id: 'D', text: 'df.info_summary()' },
    ],
    correctOption: 'B',
    explanation: 'df.describe() generates summary statistics of DataFrame columns.',
  },
  {
    id: 9,
    number: 9,
    type: 'MCQ (Multiple Answer)',
    category: 'multiple',
    difficulty: 'Medium',
    bloomsLevel: 'Analyze',
    source: 'Page 7',
    confidenceScore: 87,
    questionText: 'Which methods can be used to filter rows in a DataFrame based on conditions?',
    options: [
      { id: 'A', text: 'Boolean indexing (df[df["age"] > 25])' },
      { id: 'B', text: 'df.query("age > 25")' },
      { id: 'C', text: 'df.filter(like="age")' },
      { id: 'D', text: 'df.loc[df["age"] > 25]' },
    ],
    correctOption: 'A',
    correctOptions: ['A', 'B', 'D'],
    explanation: 'Boolean indexing, query(), and loc[] conditional evaluation filter rows effectively.',
  },
  {
    id: 10,
    number: 10,
    type: 'MCQ (Single Answer)',
    category: 'single',
    difficulty: 'Hard',
    bloomsLevel: 'Analyze',
    source: 'Page 9',
    confidenceScore: 86,
    questionText: 'What is the primary architectural difference between df.merge() and df.concat()?',
    options: [
      { id: 'A', text: 'merge() performs relational joins on key columns; concat() stacks DataFrames along an axis' },
      { id: 'B', text: 'concat() only works on rows while merge() only works on columns' },
      { id: 'C', text: 'There is no difference; they are aliases' },
      { id: 'D', text: 'merge() creates a view whereas concat() always creates a deep copy' },
    ],
    correctOption: 'A',
    explanation: 'merge() provides SQL-like relational database joins, while concat() concatenates arrays along axis 0 or 1.',
  },
  {
    id: 11,
    number: 11,
    type: 'MCQ (Single Answer)',
    category: 'single',
    difficulty: 'Easy',
    bloomsLevel: 'Remember',
    source: 'Page 4',
    confidenceScore: 95,
    questionText: 'Which attribute returns a tuple representing the dimensionality (rows, cols) of a DataFrame?',
    options: [
      { id: 'A', text: 'df.dim' },
      { id: 'B', text: 'df.size' },
      { id: 'C', text: 'df.shape' },
      { id: 'D', text: 'df.dimensions' },
    ],
    correctOption: 'C',
    explanation: 'df.shape returns (n_rows, n_columns).',
  },
  {
    id: 12,
    number: 12,
    type: 'True / False',
    category: 'boolean',
    difficulty: 'Medium',
    bloomsLevel: 'Understand',
    source: 'Page 6',
    confidenceScore: 93,
    questionText: 'In Pandas, calling df.drop("col", axis=1) alters the original DataFrame in place by default.',
    options: [
      { id: 'A', text: 'True' },
      { id: 'B', text: 'False' },
    ],
    correctOption: 'B',
    explanation: 'False: drop() returns a new DataFrame copy unless inplace=True is explicitly passed.',
  },
  {
    id: 13,
    number: 13,
    type: 'MCQ (Multiple Answer)',
    category: 'multiple',
    difficulty: 'Hard',
    bloomsLevel: 'Analyze',
    source: 'Page 10',
    confidenceScore: 84,
    questionText: 'Which parameters prevent SettingWithCopyWarning when updating subsets of DataFrames?',
    options: [
      { id: 'A', text: 'Explicitly calling .copy() on slice assignments' },
      { id: 'B', text: 'Using .loc[row_indexer, col_indexer] for direct assignment' },
      { id: 'C', text: 'Chained indexing df[condition]["col"] = val' },
      { id: 'D', text: 'Setting pd.options.mode.copy_on_write = True' },
    ],
    correctOption: 'A',
    correctOptions: ['A', 'B', 'D'],
    explanation: 'Copy-on-write, .copy(), and single-step .loc assignments eliminate chained assignment ambiguities.',
  },
  {
    id: 14,
    number: 14,
    type: 'MCQ (Single Answer)',
    category: 'single',
    difficulty: 'Medium',
    bloomsLevel: 'Apply',
    source: 'Page 5',
    confidenceScore: 90,
    questionText: 'How do you rename the column "st_id" to "state_id" in a DataFrame df?',
    options: [
      { id: 'A', text: 'df.rename(columns={"st_id": "state_id"})' },
      { id: 'B', text: 'df.change_col("st_id", "state_id")' },
      { id: 'C', text: 'df.columns.replace("st_id", "state_id")' },
      { id: 'D', text: 'df.alter("st_id", "state_id")' },
    ],
    correctOption: 'A',
    explanation: 'rename(columns={...}) accepts a dictionary mapping old column names to new names.',
  },
  {
    id: 15,
    number: 15,
    type: 'MCQ (Single Answer)',
    category: 'single',
    difficulty: 'Easy',
    bloomsLevel: 'Remember',
    source: 'Page 2',
    confidenceScore: 97,
    questionText: 'What is the underlying numerical array library that powers Pandas DataFrame data structures?',
    options: [
      { id: 'A', text: 'Scipy' },
      { id: 'B', text: 'NumPy' },
      { id: 'C', text: 'Matplotlib' },
      { id: 'D', text: 'Torch' },
    ],
    correctOption: 'B',
    explanation: 'Pandas is built directly on top of NumPy ndarrays.',
  },
  {
    id: 16,
    number: 16,
    type: 'True / False',
    category: 'boolean',
    difficulty: 'Easy',
    bloomsLevel: 'Understand',
    source: 'Page 11',
    confidenceScore: 96,
    questionText: 'A groupby object in Pandas is evaluated lazily until an aggregation function like sum() or mean() is called.',
    options: [
      { id: 'A', text: 'True' },
      { id: 'B', text: 'False' },
    ],
    correctOption: 'A',
    explanation: 'True: groupby() creates a DataFrameGroupBy object that executes aggregations lazily.',
  },
  {
    id: 17,
    number: 17,
    type: 'MCQ (Multiple Answer)',
    category: 'multiple',
    difficulty: 'Medium',
    bloomsLevel: 'Apply',
    source: 'Page 9',
    confidenceScore: 89,
    questionText: 'Which join types are supported in the how parameter of pd.merge()?',
    options: [
      { id: 'A', text: '"inner"' },
      { id: 'B', text: '"left"' },
      { id: 'C', text: '"right"' },
      { id: 'D', text: '"outer"' },
    ],
    correctOption: 'A',
    correctOptions: ['A', 'B', 'C', 'D'],
    explanation: 'Pandas merge supports "inner", "left", "right", and "outer" SQL join methods.',
  },
  {
    id: 18,
    number: 18,
    type: 'MCQ (Single Answer)',
    category: 'single',
    difficulty: 'Medium',
    bloomsLevel: 'Apply',
    source: 'Page 8',
    confidenceScore: 90,
    questionText: 'Which function reshapes a DataFrame from long format to wide format in Pandas?',
    options: [
      { id: 'A', text: 'df.melt()' },
      { id: 'B', text: 'df.pivot() or df.pivot_table()' },
      { id: 'C', text: 'df.spread()' },
      { id: 'D', text: 'df.broaden()' },
    ],
    correctOption: 'B',
    explanation: 'pivot() and pivot_table() reshape DataFrames from long to wide format.',
  },
  {
    id: 19,
    number: 19,
    type: 'MCQ (Single Answer)',
    category: 'single',
    difficulty: 'Hard',
    bloomsLevel: 'Evaluate',
    source: 'Page 12',
    confidenceScore: 87,
    questionText: 'Which method writes an aggregated DataFrame to an Apache Parquet columnar file format?',
    options: [
      { id: 'A', text: 'df.to_parquet("output.parquet")' },
      { id: 'B', text: 'df.export_parquet("output.parquet")' },
      { id: 'C', text: 'df.save_as_parquet("output.parquet")' },
      { id: 'D', text: 'df.write_parquet("output.parquet")' },
    ],
    correctOption: 'A',
    explanation: 'to_parquet() writes DataFrame objects to the binary Apache Parquet format.',
  },
  {
    id: 20,
    number: 20,
    type: 'MCQ (Multiple Answer)',
    category: 'multiple',
    difficulty: 'Medium',
    bloomsLevel: 'Analyze',
    source: 'Page 12',
    confidenceScore: 91,
    questionText: 'Which statistical functions can be computed directly across DataFrame axes?',
    options: [
      { id: 'A', text: 'df.corr() - pairwise correlation' },
      { id: 'B', text: 'df.cov() - covariance matrix' },
      { id: 'C', text: 'df.quantile() - sample quantiles' },
      { id: 'D', text: 'df.skew() - unbiased skewness' },
    ],
    correctOption: 'A',
    correctOptions: ['A', 'B', 'C', 'D'],
    explanation: 'corr(), cov(), quantile(), and skew() are built-in statistical methods in Pandas.',
  },
]

export default function AiMcqGeneratorPage() {
  const fileInputRef = useRef(null)

  // Upload state
  const [uploadedFile, setUploadedFile] = useState({
    name: 'Data Analysis with Python - Notes.pdf',
    size: '2.4 MB',
    pages: 12,
  })

  // Configuration state
  const [topic, setTopic] = useState('Data Analysis with Python')
  const [numQuestions, setNumQuestions] = useState(20)
  const [difficulty, setDifficulty] = useState('Mix (Easy, Medium, Hard)')
  const [questionTypes, setQuestionTypes] = useState({
    single: true,
    multiple: true,
    boolean: false,
  })

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'single' | 'multiple' | 'boolean'
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [selectedQuestions, setSelectedQuestions] = useState(new Set([1]))
  const [questions, setQuestions] = useState(INITIAL_QUESTIONS)

  // Modals & Save state
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [savedQuiz, setSavedQuiz] = useState(null)
  const [quizTitleInput, setQuizTitleInput] = useState('')

  const [editModalQ, setEditModalQ] = useState(null)
  const [previewModalQ, setPreviewModalQ] = useState(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Handle Drag & Drop
  const handleDrop = (e) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      setUploadedFile({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        pages: Math.max(1, Math.round(file.size / (150 * 1024))),
      })
      showToast(`Uploaded ${file.name}`)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setUploadedFile({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        pages: Math.max(1, Math.round(file.size / (150 * 1024))),
      })
      showToast(`Selected ${file.name}`)
    }
  }

  // Handle Open Save Modal
  const handleOpenSaveModal = () => {
    setQuizTitleInput(topic ? `${topic} — Assessment Quiz` : 'AI Generated Assessment Quiz')
    setSaveError(null)
    setShowSaveModal(true)
  }

  // Handle Confirm Save
  const handleConfirmSave = async () => {
    setIsSaving(true)
    setSaveError(null)
    try {
      const finalTitle = (quizTitleInput || topic || 'AI Generated Assessment').trim()
      const payload = {
        title: finalTitle,
        materialId: `ai-gen-${Date.now()}`,
        questions: questions.map((q) => ({
          questionText: q.questionText,
          options: q.options,
          correctOption: q.correctOption,
          correctOptionIndex: typeof q.correctOptionIndex === 'number'
            ? q.correctOptionIndex
            : (typeof q.correctOption === 'string'
                ? ['A', 'B', 'C', 'D'].indexOf(q.correctOption.toUpperCase())
                : 0),
          explanation: q.explanation,
          difficulty: q.difficulty || 'medium',
        })),
      }

      const res = await createQuiz(payload)
      const newQuiz = res?.quiz || res
      const quizId = newQuiz?._id || `quiz-gen-${Date.now()}`

      const quizToStore = {
        ...newQuiz,
        _id: quizId,
        title: finalTitle,
        description: `AI-generated practice quiz on ${topic || 'Official Statistics'} with ${questions.length} questions.`,
        domain: 'Data Management',
        difficulty: 'Intermediate',
        durationMinutes: 20,
        passScorePercent: 70,
        questions: payload.questions,
        isAiGenerated: true,
      }

      try {
        const stored = JSON.parse(localStorage.getItem('kai_generated_quizzes') || '[]')
        stored.unshift(quizToStore)
        localStorage.setItem('kai_generated_quizzes', JSON.stringify(stored))
      } catch (e) {}

      // Invalidate queries so Assessments & Quizzes list page updates immediately
      await queryClient.invalidateQueries({ queryKey: ['quizList'] })
      await queryClient.invalidateQueries({ queryKey: ['quizzes'] })

      setSavedQuiz(quizToStore)
      setShowSaveModal(false)
      showToast('🎉 Quiz published and saved to Assessments & Quizzes successfully!')
    } catch (err) {
      console.error('Failed to save quiz:', err)
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to save quiz. Please try again.'
      setSaveError(errMsg)
      showToast(`Save failed: ${errMsg}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle Quick Take Quiz directly
  const handleQuickTakeQuiz = async () => {
    setIsSaving(true)
    try {
      const finalTitle = (quizTitleInput || topic || 'AI Generated Assessment Quiz').trim()
      const payload = {
        title: finalTitle,
        materialId: `ai-gen-${Date.now()}`,
        questions: questions.map((q) => ({
          questionText: q.questionText,
          options: q.options,
          correctOption: q.correctOption,
          correctOptionIndex: typeof q.correctOptionIndex === 'number'
            ? q.correctOptionIndex
            : (typeof q.correctOption === 'string'
                ? ['A', 'B', 'C', 'D'].indexOf(q.correctOption.toUpperCase())
                : 0),
          explanation: q.explanation,
          difficulty: q.difficulty || 'medium',
        })),
      }

      let newQuiz
      try {
        const res = await createQuiz(payload)
        newQuiz = res?.quiz || res
      } catch {
        newQuiz = { _id: `quiz-gen-${Date.now()}` }
      }

      const quizId = newQuiz?._id || `quiz-gen-${Date.now()}`
      const quizToStore = {
        ...newQuiz,
        _id: quizId,
        title: finalTitle,
        description: `AI-generated practice quiz on ${topic || 'Official Statistics'}.`,
        domain: 'Data Management',
        difficulty: 'Intermediate',
        durationMinutes: 20,
        passScorePercent: 70,
        questions: payload.questions,
        isAiGenerated: true,
      }

      try {
        const stored = JSON.parse(localStorage.getItem('kai_generated_quizzes') || '[]')
        stored.unshift(quizToStore)
        localStorage.setItem('kai_generated_quizzes', JSON.stringify(stored))
      } catch (e) {}

      await queryClient.invalidateQueries({ queryKey: ['quizList'] })
      await queryClient.invalidateQueries({ queryKey: ['quizzes'] })

      navigate(`/quizzes/${quizId}`)
    } catch (err) {
      console.error('Failed to quick start quiz:', err)
      navigate('/quizzes')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle Generate MCQs
  const handleGenerate = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
      showToast(`✨ Generated ${numQuestions} calibrated MCQs successfully!`)
    }, 1200)
  }

  // Handle Duplicate Question
  const handleDuplicate = (q) => {
    const newQ = {
      ...q,
      id: Date.now(),
      number: questions.length + 1,
      questionText: `${q.questionText} (Copy)`,
    }
    setQuestions((prev) => [...prev, newQ])
    showToast(`Duplicated Question ${q.number}`)
  }

  // Handle Delete Question
  const handleDelete = (id) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
    showToast('Question removed')
  }

  // Toggle Selection
  const toggleSelect = (id) => {
    setSelectedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Filter questions by active tab
  const filteredQuestions = useMemo(() => {
    if (activeTab === 'single') return questions.filter((q) => q.category === 'single')
    if (activeTab === 'multiple') return questions.filter((q) => q.category === 'multiple')
    if (activeTab === 'boolean') return questions.filter((q) => q.category === 'boolean')
    return questions
  }, [questions, activeTab])

  // Counts for tabs and summary
  const totalCount = questions.length
  const singleCount = questions.filter((q) => q.category === 'single').length
  const multipleCount = questions.filter((q) => q.category === 'multiple').length
  const booleanCount = questions.filter((q) => q.category === 'boolean').length

  const easyCount = questions.filter((q) => q.difficulty === 'Easy').length
  const mediumCount = questions.filter((q) => q.difficulty === 'Medium').length
  const hardCount = questions.filter((q) => q.difficulty === 'Hard').length

  // Pagination
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedQuestions = filteredQuestions.slice(startIndex, startIndex + rowsPerPage)
  const totalPages = Math.ceil(filteredQuestions.length / rowsPerPage) || 1

  return (
    <div className={styles.pageContainer}>
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 500,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <Sparkles size={16} color="#818cf8" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to="/dashboard" className={styles.breadcrumbLink}>
          Dashboard
        </Link>
        <span className={styles.breadcrumbSeparator}>›</span>
        <span className={styles.breadcrumbLink}>AI Tools</span>
        <span className={styles.breadcrumbSeparator}>›</span>
        <span className={styles.breadcrumbCurrent}>AI MCQ Generator</span>
      </nav>

      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <div className={styles.titleArea}>
            <h1 className={styles.pageTitle}>AI MCQ Generator</h1>
            <span className={styles.aiBadge}>
              <Sparkles size={13} />
              AI Powered
            </span>
          </div>
          <p className={styles.pageSubtitle}>
            Generate high-quality MCQs from your content using advanced AI.
          </p>
        </div>
      </div>

      {/* Master 2-Column Grid */}
      <div className={styles.masterGrid}>
        {/* Left Main Column */}
        <div className={styles.mainColumn}>
          {/* Top 2 Cards Row */}
          <div className={styles.topCardsRow}>
            {/* Card 1: Upload Content */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>1. Upload Content</h2>
                <p className={styles.cardSubtitle}>
                  Upload documents or paste content to generate MCQs.
                </p>
              </div>

              {/* Drag & drop dropzone */}
              <div
                className={styles.dropzone}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.pptx,.txt"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <CloudUpload size={38} className={styles.uploadCloudIcon} strokeWidth={1.75} />
                <div className={styles.dropzoneText}>Drag & drop your file here</div>
                <div className={styles.dropzoneOr}>or</div>
                <button
                  type="button"
                  className={styles.browseBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                >
                  Browse Files
                </button>
                <div className={styles.dropzoneFormats}>
                  Supports: PDF, DOCX, PPTX, TXT (Max 20MB)
                </div>
              </div>

              {/* Uploaded File Item */}
              {uploadedFile && (
                <div className={styles.uploadedFileCard}>
                  <div className={styles.fileInfoLeft}>
                    <div className={styles.fileIconBox}>
                      <FileText size={18} />
                    </div>
                    <div className={styles.fileDetails}>
                      <span className={styles.fileName}>{uploadedFile.name}</span>
                      <span className={styles.fileMeta}>
                        PDF • {uploadedFile.size} • {uploadedFile.pages} pages
                      </span>
                    </div>
                  </div>

                  <div className={styles.fileActions}>
                    <Check size={18} className={styles.checkIcon} strokeWidth={2.5} />
                    <button
                      type="button"
                      className={styles.trashBtn}
                      title="Remove uploaded document"
                      onClick={() => setUploadedFile(null)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Configure MCQ Generation */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>2. Configure MCQ Generation</h2>
                <p className={styles.cardSubtitle}>
                  Set your preferences for question generation.
                </p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Subject / Topic <span className={styles.requiredStar}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Data Analysis with Python"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Number of Questions <span className={styles.requiredStar}>*</span>
                </label>
                <div className={styles.stepperContainer}>
                  <button
                    type="button"
                    className={styles.stepperBtn}
                    onClick={() => setNumQuestions((prev) => Math.max(5, prev - 5))}
                  >
                    <Minus size={15} />
                  </button>
                  <input
                    type="text"
                    className={styles.stepperInput}
                    value={numQuestions}
                    readOnly
                  />
                  <button
                    type="button"
                    className={styles.stepperBtn}
                    onClick={() => setNumQuestions((prev) => Math.min(50, prev + 5))}
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Difficulty Level</label>
                <select
                  className={styles.formSelect}
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option>Mix (Easy, Medium, Hard)</option>
                  <option>Easy Focus (60% Easy)</option>
                  <option>Medium Focus (60% Medium)</option>
                  <option>Hard / Advanced Focus (50% Hard)</option>
                </select>
              </div>

              <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                <label className={styles.formLabel}>Question Type</label>
                <div className={styles.checkboxList}>
                  <label className={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      className={styles.checkboxInput}
                      checked={questionTypes.single}
                      onChange={(e) =>
                        setQuestionTypes((prev) => ({ ...prev, single: e.target.checked }))
                      }
                    />
                    <span>Multiple Choice (Single Answer)</span>
                  </label>
                  <label className={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      className={styles.checkboxInput}
                      checked={questionTypes.multiple}
                      onChange={(e) =>
                        setQuestionTypes((prev) => ({ ...prev, multiple: e.target.checked }))
                      }
                    />
                    <span>Multiple Choice (Multiple Answer)</span>
                  </label>
                  <label className={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      className={styles.checkboxInput}
                      checked={questionTypes.boolean}
                      onChange={(e) =>
                        setQuestionTypes((prev) => ({ ...prev, boolean: e.target.checked }))
                      }
                    />
                    <span>True / False</span>
                  </label>
                </div>
              </div>

              <button
                type="button"
                className={styles.generateBtn}
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <Sparkles size={16} />
                <span>{isGenerating ? 'Synthesizing Questions...' : 'Generate MCQs'}</span>
              </button>
            </div>
          </div>

          {/* Section 3: Generated MCQs */}
          <div className={styles.generatedSection}>
            {/* Success Confirmation State Card */}
            {savedQuiz && (
              <Card
                padding="padded"
                style={{
                  marginBottom: 20,
                  border: '1.5px solid #10b981',
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 50%, #ffffff 100%)',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.12)',
                  borderRadius: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: '#d1fae5',
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#065f46' }}>
                          Quiz Published Successfully!
                        </h3>
                        <Badge variant="success">Saved to Assessments</Badge>
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: 13.5, color: '#047857', lineHeight: 1.5 }}>
                        <strong>"{savedQuiz.title}"</strong> ({savedQuiz.questionCount || savedQuiz.questionIds?.length || questions.length} questions) has been published and is immediately available in the <strong>Assessments &amp; Quizzes</strong> catalogue.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => navigate('/quizzes')}
                    >
                      <Layers size={15} style={{ marginRight: 6 }} />
                      Go to Quizzes List
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => navigate(`/quizzes/${savedQuiz._id}`)}
                    >
                      <PlayCircle size={15} style={{ marginRight: 6 }} />
                      View Quiz
                    </Button>
                    <button
                      type="button"
                      onClick={() => setSavedQuiz(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#6b7280',
                        padding: 6,
                        borderRadius: 6,
                      }}
                      title="Dismiss confirmation"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            )}

            {/* Error Notification Banner (if modal was closed after failure) */}
            {saveError && !showSaveModal && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: 10,
                  padding: '12px 16px',
                  color: '#991b1b',
                  fontSize: 13,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Publishing Failed:</strong> {saveError}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Button variant="secondary" size="sm" onClick={handleOpenSaveModal}>
                    Retry Save
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSaveError(null)}
                    style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', padding: 4 }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Persistent Flow Clarification Note */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderLeft: '4px solid #4f46e5',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 18,
                color: '#334155',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <Info size={18} color="#4f46e5" style={{ flexShrink: 0 }} />
              <div>
                Generated MCQs are shown below for review. Click <strong>Review &amp; Save</strong> to publish them as an official quiz you can access from <strong>Assessments &amp; Quizzes</strong>.
              </div>
            </div>

            <div className={styles.generatedHeader}>
              <h2 className={styles.generatedTitle}>3. Generated MCQs ({totalCount})</h2>

              <div className={styles.headerActions}>
                <button
                  type="button"
                  className={styles.outlineBtn}
                  onClick={() => {
                    if (selectedQuestions.size > 0) {
                      const firstId = Array.from(selectedQuestions)[0]
                      const q = questions.find((item) => item.id === firstId)
                      setEditModalQ(q)
                    } else {
                      setEditModalQ(questions[0])
                    }
                  }}
                >
                  <Edit2 size={14} />
                  <span>Edit Selected</span>
                </button>

                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className={styles.outlineBtn}
                    onClick={() => setShowExportMenu((prev) => !prev)}
                  >
                    <Download size={14} />
                    <span>Export</span>
                    <ChevronDown size={13} />
                  </button>

                  {showExportMenu && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: 6,
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                        zIndex: 50,
                        minWidth: 160,
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        type="button"
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 14px',
                          fontSize: 12.5,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          setShowExportMenu(false)
                          showToast('Exported questions to JSON')
                        }}
                      >
                        Export as JSON
                      </button>
                      <button
                        type="button"
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 14px',
                          fontSize: 12.5,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          setShowExportMenu(false)
                          showToast('Exported questions to CSV')
                        }}
                      >
                        Export as CSV
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className={styles.primarySaveBtn}
                  onClick={handleOpenSaveModal}
                >
                  <Save size={14} />
                  <span>Review & Save</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className={styles.tabsRow}>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'all' ? styles.tabActive : ''}`}
                onClick={() => {
                  setActiveTab('all')
                  setCurrentPage(1)
                }}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'single' ? styles.tabActive : ''}`}
                onClick={() => {
                  setActiveTab('single')
                  setCurrentPage(1)
                }}
              >
                MCQ (Single) ({singleCount})
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'multiple' ? styles.tabActive : ''}`}
                onClick={() => {
                  setActiveTab('multiple')
                  setCurrentPage(1)
                }}
              >
                MCQ (Multiple) ({multipleCount})
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'boolean' ? styles.tabActive : ''}`}
                onClick={() => {
                  setActiveTab('boolean')
                  setCurrentPage(1)
                }}
              >
                True / False ({booleanCount})
              </button>
            </div>

            {/* Question Cards List */}
            {paginatedQuestions.map((q) => {
              const isSelected = selectedQuestions.has(q.id)

              return (
                <div key={q.id} className={styles.questionItemCard}>
                  {/* Main Question Content */}
                  <div className={styles.questionMainContent}>
                    {/* Top Bar with Badges */}
                    <div className={styles.questionTopBar}>
                      <input
                        type="checkbox"
                        className={styles.qCheckbox}
                        checked={isSelected}
                        onChange={() => toggleSelect(q.id)}
                      />
                      <div className={styles.qNumBadge}>{q.number}</div>
                      <span className={styles.badgeBlue}>{q.type}</span>
                      <span
                        className={
                          q.difficulty === 'Easy'
                            ? styles.badgeGreen
                            : q.difficulty === 'Medium'
                            ? styles.badgeAmber
                            : styles.badgeRed
                        }
                      >
                        {q.difficulty}
                      </span>
                      <div style={{ flex: 1 }} />
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                        }}
                        onClick={() => setPreviewModalQ(q)}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>

                    {/* Question Text */}
                    <h3 className={styles.qText}>{q.questionText}</h3>

                    {/* Options List */}
                    <div className={styles.optionsGrid}>
                      {q.options.map((opt) => {
                        const isMultiple = q.category === 'multiple'
                        const isCorrect = isMultiple
                          ? (q.correctOptions ? q.correctOptions.includes(opt.id) : opt.id === q.correctOption)
                          : opt.id === q.correctOption

                        return (
                          <div
                            key={opt.id}
                            className={`${styles.optionBox} ${
                              isCorrect ? styles.optionSelected : ''
                            }`}
                          >
                            {isMultiple ? (
                              <div
                                style={{
                                  width: 15,
                                  height: 15,
                                  borderRadius: 4,
                                  border: isCorrect ? '1.5px solid #4f46e5' : '1.5px solid #94a3b8',
                                  background: isCorrect ? '#4f46e5' : '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {isCorrect && <Check size={11} color="#ffffff" strokeWidth={3} />}
                              </div>
                            ) : (
                              <div
                                className={`${styles.radioDot} ${
                                  isCorrect ? styles.radioDotSelected : ''
                                }`}
                              >
                                {isCorrect && <div className={styles.radioInnerDot} />}
                              </div>
                            )}
                            <span>
                              <strong>{opt.id}.</strong> {opt.text}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className={styles.explanationBox}>
                        <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}

                    {/* Action Links */}
                    <div className={styles.questionActionRow}>
                      <button
                        type="button"
                        className={styles.actionLink}
                        onClick={() => setEditModalQ(q)}
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className={styles.actionLink}
                        onClick={() => handleDuplicate(q)}
                      >
                        <Copy size={13} />
                        <span>Duplicate</span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionLink} ${styles.actionLinkDelete}`}
                        onClick={() => handleDelete(q.id)}
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                      <button
                        type="button"
                        className={styles.actionLink}
                        onClick={() => setPreviewModalQ(q)}
                      >
                        <Eye size={13} />
                        <span>Preview</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Metadata Column */}
                  <div className={styles.qMetadataBox}>
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Difficulty</span>
                      <span
                        className={
                          q.difficulty === 'Easy'
                            ? styles.badgeGreen
                            : q.difficulty === 'Medium'
                            ? styles.badgeAmber
                            : styles.badgeRed
                        }
                      >
                        {q.difficulty}
                      </span>
                    </div>

                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Type</span>
                      <span className={styles.metaVal}>{q.type}</span>
                    </div>

                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Bloom's Level</span>
                      <span className={styles.bloomBadge}>{q.bloomsLevel}</span>
                    </div>

                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Source</span>
                      <span className={styles.metaVal}>{q.source}</span>
                    </div>

                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Confidence Score</span>
                      <span className={styles.confidenceBadge}>
                        <ShieldCheck size={12} />
                        <span>{q.confidenceScore}%</span>
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Pagination */}
            <div className={styles.paginationRow}>
              <div>
                Showing {Math.min(filteredQuestions.length, startIndex + 1)} to{' '}
                {Math.min(filteredQuestions.length, startIndex + rowsPerPage)} of{' '}
                {filteredQuestions.length} questions
              </div>

              <div className={styles.paginationRight}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Rows per page:</span>
                  <select
                    className={styles.rowsSelect}
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>

                <div className={styles.pageButtons}>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    ‹
                  </button>

                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i + 1}
                      type="button"
                      className={`${styles.pageBtn} ${
                        currentPage === i + 1 ? styles.pageBtnActive : ''
                      }`}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    ›
                  </button>
                </div>
              </div>

              {/* Bottom Post-Review Action Area ("from down also like your quiz is made now take quiz") */}
              <div
                style={{
                  marginTop: 20,
                  padding: '16px 20px',
                  background: savedQuiz
                    ? 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)'
                    : '#ffffff',
                  border: savedQuiz ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16,
                  boxShadow: savedQuiz
                    ? '0 4px 20px rgba(16, 185, 129, 0.12)'
                    : '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                {savedQuiz ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: '#d1fae5',
                          color: '#059669',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <CheckCircle2 size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#065f46' }}>
                          Your quiz has been made! You can now take it directly.
                        </div>
                        <div style={{ fontSize: 13, color: '#047857' }}>
                          "{savedQuiz.title}" ({savedQuiz.questionCount || savedQuiz.questionIds?.length || questions.length} questions) is live and ready for assessment.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={() => navigate('/quizzes')}
                      >
                        <Layers size={15} style={{ marginRight: 6 }} />
                        Go to Quizzes List
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => navigate(`/quizzes/${savedQuiz._id}`)}
                      >
                        <PlayCircle size={15} style={{ marginRight: 6 }} />
                        Take Quiz Now
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Sparkles size={18} color="#4f46e5" />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                          Finished reviewing your generated MCQs?
                        </div>
                        <div style={{ fontSize: 12.5, color: '#64748b' }}>
                          Take this quiz now, review &amp; publish, or access it anytime from Assessments &amp; Quizzes.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={() => navigate('/quizzes')}
                      >
                        <Layers size={15} style={{ marginRight: 6 }} />
                        Go to Quizzes Page
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        onClick={handleQuickTakeQuiz}
                      >
                        <PlayCircle size={15} style={{ marginRight: 6 }} />
                        Take This Quiz Now
                      </Button>
                      <button
                        type="button"
                        className={styles.primarySaveBtn}
                        onClick={handleOpenSaveModal}
                        style={{ height: 38, padding: '0 14px' }}
                      >
                        <Save size={14} />
                        <span>Review &amp; Save</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar Column */}
        <div className={styles.sideColumn}>
          {/* Card 1: Generation Summary */}
          <div className={styles.card}>
            <h3 className={styles.sideCardTitle}>
              <Sparkles size={16} color="#6366f1" />
              <span>Generation Summary</span>
            </h3>

            <div className={styles.summaryList}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Source</span>
                <span className={styles.summaryValue} title={uploadedFile?.name}>
                  {uploadedFile?.name || 'None'}
                </span>
              </div>

              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Total Pages</span>
                <span className={styles.summaryValue}>{uploadedFile?.pages || 0}</span>
              </div>

              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Estimated MCQs</span>
                <span className={styles.summaryValue}>{numQuestions}</span>
              </div>

              <div className={styles.summaryRow} style={{ alignItems: 'flex-start' }}>
                <span className={styles.summaryLabel} style={{ marginTop: 2 }}>
                  Difficulty Mix
                </span>
                <div className={styles.pillGrid}>
                  <span className={styles.badgeGreen}>Easy {easyCount}</span>
                  <span className={styles.badgeAmber}>Medium {mediumCount}</span>
                  <span className={styles.badgeRed}>Hard {hardCount}</span>
                </div>
              </div>

              <div className={styles.summaryRow} style={{ alignItems: 'flex-start' }}>
                <span className={styles.summaryLabel} style={{ marginTop: 2 }}>
                  Types
                </span>
                <div className={styles.pillGrid}>
                  <span className={styles.badgeBlue}>MCQ (Single) {singleCount}</span>
                  <span className={styles.badgeBlue}>MCQ (Multiple) {multipleCount}</span>
                  <span className={styles.badgeBlue}>True / False {booleanCount}</span>
                </div>
              </div>
            </div>

            {/* Flow Expectation Note inside Summary Card */}
            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: '1px solid #e2e8f0',
                fontSize: 12,
                color: '#64748b',
                lineHeight: 1.45,
                display: 'flex',
                gap: 8,
              }}
            >
              <Info size={15} color="#6366f1" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                Generated MCQs are shown below for review. Click <strong>Review &amp; Save</strong> to publish them as a quiz you can access from Assessments &amp; Quizzes.
              </span>
            </div>
          </div>

          {/* Card 2: AI Configuration */}
          <div className={styles.card}>
            <h3 className={styles.sideCardTitle}>
              <Bot size={16} color="#4f46e5" />
              <span>AI Configuration</span>
            </h3>
            <p className={styles.aiConfigDesc}>
              Our AI analyzes your content and generates MCQs that are:
            </p>

            <div className={styles.aiConfigList}>
              <div className={styles.aiConfigItem}>
                <Check size={16} className={styles.greenCheck} strokeWidth={2.5} />
                <span>Conceptually accurate</span>
              </div>
              <div className={styles.aiConfigItem}>
                <Check size={16} className={styles.greenCheck} strokeWidth={2.5} />
                <span>Contextually relevant</span>
              </div>
              <div className={styles.aiConfigItem}>
                <Check size={16} className={styles.greenCheck} strokeWidth={2.5} />
                <span>Appropriate difficulty</span>
              </div>
              <div className={styles.aiConfigItem}>
                <Check size={16} className={styles.greenCheck} strokeWidth={2.5} />
                <span>Diverse in format</span>
              </div>
              <div className={styles.aiConfigItem}>
                <Check size={16} className={styles.greenCheck} strokeWidth={2.5} />
                <span>Review-ready</span>
              </div>
            </div>
          </div>

          {/* Card 3: Tips for Best Results */}
          <div className={styles.card}>
            <h3 className={styles.sideCardTitle}>
              <Lightbulb size={16} color="#d97706" />
              <span>Tips for Best Results</span>
            </h3>

            <div className={styles.tipsList}>
              <div className={styles.tipItem}>
                <div className={styles.tipDot} style={{ backgroundColor: '#ef4444' }} />
                <span>Upload clear, well-structured documents</span>
              </div>
              <div className={styles.tipItem}>
                <div className={styles.tipDot} style={{ backgroundColor: '#3b82f6' }} />
                <span>Include examples, tables and diagrams</span>
              </div>
              <div className={styles.tipItem}>
                <div className={styles.tipDot} style={{ backgroundColor: '#10b981' }} />
                <span>Specify the topic for better accuracy</span>
              </div>
              <div className={styles.tipItem}>
                <div className={styles.tipDot} style={{ backgroundColor: '#10b981' }} />
                <span>Review and edit before final use</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Question Modal */}
      {editModalQ && (
        <div className={styles.modalOverlay} onClick={() => setEditModalQ(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Edit Question {editModalQ.number}</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setEditModalQ(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>
                  Question Text
                </label>
                <textarea
                  style={{
                    width: '100%',
                    padding: 10,
                    fontSize: 13.5,
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    marginTop: 6,
                  }}
                  rows={3}
                  value={editModalQ.questionText}
                  onChange={(e) =>
                    setEditModalQ((prev) => ({ ...prev, questionText: e.target.value }))
                  }
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>
                  Options & Correct Answer {editModalQ.category === 'multiple' && '(Check all correct answers)'}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                  {editModalQ.options.map((opt, i) => {
                    const isMulti = editModalQ.category === 'multiple'
                    const isSelected = isMulti
                      ? editModalQ.correctOptions?.includes(opt.id)
                      : editModalQ.correctOption === opt.id

                    return (
                      <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isMulti ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setEditModalQ((prev) => {
                                const cur = prev.correctOptions || []
                                const next = checked
                                  ? [...cur, opt.id]
                                  : cur.filter((x) => x !== opt.id)
                                return { ...prev, correctOptions: next }
                              })
                            }}
                          />
                        ) : (
                          <input
                            type="radio"
                            name="editCorrectRadio"
                            checked={isSelected}
                            onChange={() =>
                              setEditModalQ((prev) => ({ ...prev, correctOption: opt.id }))
                            }
                          />
                        )}
                        <span style={{ fontWeight: 600, width: 20 }}>{opt.id}.</span>
                        <input
                          type="text"
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            fontSize: 13,
                          }}
                          value={opt.text}
                          onChange={(e) => {
                            const val = e.target.value
                            setEditModalQ((prev) => {
                              const nextOpts = [...prev.options]
                              nextOpts[i] = { ...nextOpts[i], text: val }
                              return { ...prev, options: nextOpts }
                            })
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>
                  Explanation
                </label>
                <textarea
                  style={{
                    width: '100%',
                    padding: 10,
                    fontSize: 13,
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    marginTop: 6,
                  }}
                  rows={2}
                  value={editModalQ.explanation}
                  onChange={(e) =>
                    setEditModalQ((prev) => ({ ...prev, explanation: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.outlineBtn}
                onClick={() => setEditModalQ(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primarySaveBtn}
                onClick={() => {
                  setQuestions((prev) =>
                    prev.map((item) => (item.id === editModalQ.id ? editModalQ : item))
                  )
                  setEditModalQ(null)
                  showToast(`Saved changes to Question ${editModalQ.number}`)
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewModalQ && (
        <div className={styles.modalOverlay} onClick={() => setPreviewModalQ(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Preview Question {previewModalQ.number}</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setPreviewModalQ(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <span className={styles.badgeBlue}>{previewModalQ.type}</span>
                <span
                  className={
                    previewModalQ.difficulty === 'Easy'
                      ? styles.badgeGreen
                      : previewModalQ.difficulty === 'Medium'
                      ? styles.badgeAmber
                      : styles.badgeRed
                  }
                >
                  {previewModalQ.difficulty}
                </span>
                <span className={styles.bloomBadge}>{previewModalQ.bloomsLevel}</span>
              </div>

              <h4 style={{ fontSize: 16, color: '#0f172a', margin: '0 0 16px' }}>
                {previewModalQ.questionText}
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {previewModalQ.options.map((opt) => {
                  const isMulti = previewModalQ.category === 'multiple'
                  const isCorrect = isMulti
                    ? (previewModalQ.correctOptions ? previewModalQ.correctOptions.includes(opt.id) : opt.id === previewModalQ.correctOption)
                    : opt.id === previewModalQ.correctOption

                  return (
                    <div
                      key={opt.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        background: isCorrect ? '#f0fdf4' : '#ffffff',
                        borderColor: isCorrect ? '#86efac' : '#e2e8f0',
                        fontSize: 13.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <strong>{opt.id}.</strong>
                      <span>{opt.text}</span>
                      {isCorrect && (
                        <span
                          style={{
                            marginLeft: 'auto',
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#16a34a',
                          }}
                        >
                          ✓ CORRECT
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              <div
                style={{
                  marginTop: 18,
                  padding: 12,
                  background: '#f8fafc',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#475569',
                }}
              >
                <strong>Explanation:</strong> {previewModalQ.explanation}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.primarySaveBtn}
                onClick={() => setPreviewModalQ(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review & Save Modal */}
      {showSaveModal && (
        <div className={styles.modalOverlay} onClick={() => !isSaving && setShowSaveModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={20} color="#16a34a" />
                <h3 className={styles.modalTitle}>Review &amp; Save Quiz</h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                disabled={isSaving}
                onClick={() => setShowSaveModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {saveError && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    borderRadius: 8,
                    padding: '10px 14px',
                    color: '#991b1b',
                    fontSize: 12.5,
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                  <div>{saveError}</div>
                </div>
              )}

              <p style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.5, margin: 0 }}>
                Publish <strong>{totalCount} generated questions</strong> directly to the KaushalAI Assessment catalogue.
              </p>

              <div style={{ marginTop: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  Quiz Title
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={quizTitleInput}
                  onChange={(e) => setQuizTitleInput(e.target.value)}
                  placeholder="e.g. Data Analysis with Python — Assessment Quiz"
                  disabled={isSaving}
                  style={{ width: '100%' }}
                />
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 14,
                  margin: '16px 0',
                }}
              >
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                  SUMMARY BREAKDOWN
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 14, fontSize: 13 }}>
                  <div>
                    <strong>{singleCount}</strong> Single Choice
                  </div>
                  <div>
                    <strong>{multipleCount}</strong> Multiple Choice
                  </div>
                  <div>
                    <strong>{booleanCount}</strong> True/False
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={14} color="#6366f1" />
                <span>Once saved, this quiz will immediately appear under <strong>Assessments &amp; Quizzes</strong> for all officers.</span>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.outlineBtn}
                disabled={isSaving}
                onClick={() => setShowSaveModal(false)}
              >
                Cancel
              </button>
              <Button
                variant="primary"
                size="md"
                loading={isSaving}
                onClick={handleConfirmSave}
              >
                <Save size={14} style={{ marginRight: 6 }} />
                Confirm &amp; Publish Quiz
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
