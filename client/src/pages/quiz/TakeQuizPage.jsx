import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Sparkles,
  Award,
  Calendar,
  Clock,
  ListOrdered,
  Star,
  Check,
  Bookmark,
  Lightbulb,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Shield,
  Lock,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import styles from './TakeQuizPage.module.css'

// 30 Assessment Questions across 3 sections
const ASSESSMENT_QUESTIONS = [
  {
    id: 1,
    number: 1,
    section: 1,
    difficulty: 'Easy',
    marks: 1,
    text: 'Which function in Pandas is primarily used to import tabular data from comma-separated files into a DataFrame?',
    options: ['read_csv()', 'load_csv()', 'import_csv()', 'scan_csv()'],
    correctOption: 0,
    concept: 'Reading CSV Data with Pandas',
    conceptDetail: 'Pandas read_csv() loads tabular data from delimiter-separated files into a 2-dimensional DataFrame structure with automatic type inference.',
  },
  {
    id: 2,
    number: 2,
    section: 1,
    difficulty: 'Easy',
    marks: 1,
    text: 'What attribute returns a tuple containing the number of rows and columns in a DataFrame?',
    options: ['df.dim', 'df.size', 'df.shape', 'df.length'],
    correctOption: 2,
    concept: 'DataFrame Attributes',
    conceptDetail: 'df.shape returns (n_rows, n_columns) reflecting the dimensions of the DataFrame array.',
  },
  {
    id: 3,
    number: 3,
    section: 1,
    difficulty: 'Medium',
    marks: 1,
    text: 'Which method creates a independent deep copy of an existing DataFrame to prevent SettingWithCopyWarning?',
    options: ['df.clone()', 'df.copy(deep=True)', 'df.duplicate()', 'df.replicate()'],
    correctOption: 1,
    concept: 'Defensive Copying in Pandas',
    conceptDetail: 'df.copy(deep=True) duplicates both the data array and indices so modifications do not propagate to the parent slice.',
  },
  {
    id: 4,
    number: 4,
    section: 1,
    difficulty: 'Easy',
    marks: 1,
    text: 'What parameter in df.head() determines the number of initial rows displayed?',
    options: ['n', 'count', 'limit', 'rows'],
    correctOption: 0,
    concept: 'DataFrame Inspection Methods',
    conceptDetail: 'head(n=5) accepts the parameter n which defaults to 5 rows.',
  },
  {
    id: 5,
    number: 5,
    section: 1,
    difficulty: 'Medium',
    marks: 1,
    text: 'How do you rename existing DataFrame columns using a key-value dictionary mapping in Pandas?',
    options: ['df.set_column_names()', 'df.rename(columns={...})', 'df.alter_columns()', 'df.relabel()'],
    correctOption: 1,
    concept: 'Column Transformation and Renaming',
    conceptDetail: 'rename(columns={old_name: new_name}) transforms DataFrame axis labels safely.',
  },
  {
    id: 6,
    number: 6,
    section: 1,
    difficulty: 'Easy',
    marks: 1,
    text: 'Which operator or accessor performs label-based indexing to retrieve rows and columns by their textual labels?',
    options: ['.iloc[]', '.loc[]', '.at_index[]', '.filter_label[]'],
    correctOption: 1,
    concept: 'Label-based Indexing',
    conceptDetail: '.loc[] accesses rows and columns by label strings or boolean vectors.',
  },
  {
    id: 7,
    number: 7,
    section: 1,
    difficulty: 'Intermediate',
    marks: 1,
    text: 'Which Pandas function is used to remove missing values from a DataFrame?',
    options: ['dropna()', 'fillna()', 'null()', 'remove_nulls()'],
    correctOption: 0,
    concept: 'Handling Missing Data in Pandas',
    conceptDetail: 'dropna() filters out missing NA/NaN values along specified axes, allowing dropna(axis=0) for rows or dropna(axis=1) for columns.',
  },
  {
    id: 8,
    number: 8,
    section: 1,
    difficulty: 'Medium',
    marks: 1,
    text: 'Which method substitutes missing NaN values with a replacement value or computed mean/median?',
    options: ['df.impute()', 'df.fillna()', 'df.replace_nan()', 'df.clean_nulls()'],
    correctOption: 1,
    concept: 'Missing Value Imputation',
    conceptDetail: 'fillna() replaces missing entries with scalar constants or interpolated estimates.',
  },
  {
    id: 9,
    number: 9,
    section: 1,
    difficulty: 'Hard',
    marks: 1,
    text: 'What is the effect of passing how="all" into df.dropna()?',
    options: [
      'Drops row if all values are NaN',
      'Drops row if any single value is NaN',
      'Drops columns across all indices',
      'Fills all missing values with zero',
    ],
    correctOption: 0,
    concept: 'dropna Parameterization',
    conceptDetail: 'Passing how="all" drops rows only when every column in that row contains null/NaN values.',
  },
  {
    id: 10,
    number: 10,
    section: 1,
    difficulty: 'Medium',
    marks: 1,
    text: 'Which boolean method returns a DataFrame of identical dimensions indicating whether each element is null?',
    options: ['df.isnull() or df.isna()', 'df.check_empty()', 'df.has_null()', 'df.empty_cells()'],
    correctOption: 0,
    concept: 'Null Value Detection',
    conceptDetail: 'isna() and isnull() return boolean masks highlighting null coordinates.',
  },
  {
    id: 11,
    number: 11,
    section: 2,
    difficulty: 'Medium',
    marks: 1,
    text: 'Which function groups DataFrame records based on categorical keys to perform aggregate calculations?',
    options: ['df.aggregate_by()', 'df.groupby()', 'df.split_apply()', 'df.bucket()'],
    correctOption: 1,
    concept: 'Split-Apply-Combine with Groupby',
    conceptDetail: 'groupby() splits data into groups, applies aggregation functions, and combines results.',
  },
  {
    id: 12,
    number: 12,
    section: 2,
    difficulty: 'Intermediate',
    marks: 1,
    text: 'How can you compute descriptive statistical summaries (mean, std, percentiles) for all numeric series in a DataFrame?',
    options: ['df.summary()', 'df.describe()', 'df.stats()', 'df.metrics()'],
    correctOption: 1,
    concept: 'Descriptive Statistics in Pandas',
    conceptDetail: 'describe() generates rapid central tendency and dispersion metrics.',
  },
  {
    id: 13,
    number: 13,
    section: 2,
    difficulty: 'Hard',
    marks: 1,
    text: 'Which parameter in pd.merge() specifies the join strategy ("inner", "left", "right", "outer")?',
    options: ['join_type', 'on', 'how', 'strategy'],
    correctOption: 2,
    concept: 'Relational Database Joins in Pandas',
    conceptDetail: 'The "how" keyword argument controls join relational semantics.',
  },
  {
    id: 14,
    number: 14,
    section: 2,
    difficulty: 'Intermediate',
    marks: 1,
    text: 'Which function is used to pivot and reshape a DataFrame from long format to a wide spreadsheet table?',
    options: ['df.melt()', 'df.pivot_table()', 'df.transpose()', 'df.reshape()'],
    correctOption: 1,
    concept: 'Data Reshaping and Pivoting',
    conceptDetail: 'pivot_table() aggregates and pivots multidimensional data.',
  },
  {
    id: 15,
    number: 15,
    section: 2,
    difficulty: 'Hard',
    marks: 1,
    text: 'What Pandas method inverse-transforms wide format back into long format suitable for tidy analysis?',
    options: ['df.unstack()', 'df.melt()', 'df.gather()', 'df.flatten()'],
    correctOption: 1,
    concept: 'Tidy Data with Melt',
    conceptDetail: 'melt() massages a DataFrame into a format where one or more columns are identifier variables.',
  },
  {
    id: 16,
    number: 16,
    section: 2,
    difficulty: 'Easy',
    marks: 1,
    text: 'How do you sort a DataFrame named df by column "population" in descending order?',
    options: [
      'df.sort_values(by="population", ascending=False)',
      'df.order_by("population", "DESC")',
      'df.sort("population", reverse=True)',
      'df.rank_by("population")',
    ],
    correctOption: 0,
    concept: 'Sorting DataFrame Series',
    conceptDetail: 'sort_values() sorts along axes with customizable order and na_position.',
  },
  {
    id: 17,
    number: 17,
    section: 2,
    difficulty: 'Medium',
    marks: 1,
    text: 'Which function computes the pairwise correlation of columns excluding NA/null values?',
    options: ['df.covariance()', 'df.corr()', 'df.pearsons()', 'df.r_score()'],
    correctOption: 1,
    concept: 'Correlation Matrices',
    conceptDetail: 'corr() computes Pearson, Spearman, or Kendall rank correlations.',
  },
  {
    id: 18,
    number: 18,
    section: 2,
    difficulty: 'Intermediate',
    marks: 1,
    text: 'How do you convert the data type of a column "survey_id" to string object in Pandas?',
    options: [
      'df["survey_id"] = df["survey_id"].astype(str)',
      'df["survey_id"] = df["survey_id"].to_string()',
      'df["survey_id"] = df["survey_id"].cast("string")',
      'df["survey_id"] = df["survey_id"].convert("text")',
    ],
    correctOption: 0,
    concept: 'Type Casting with astype',
    conceptDetail: 'astype() casts a Pandas object to a specified dtype.',
  },
  {
    id: 19,
    number: 19,
    section: 2,
    difficulty: 'Medium',
    marks: 1,
    text: 'Which method calculates the rolling statistical moving window across time-series rows?',
    options: ['df.expanding()', 'df.rolling(window=7)', 'df.moving_average()', 'df.window()'],
    correctOption: 1,
    concept: 'Window Operations and Rolling Averages',
    conceptDetail: 'rolling(window=k) provides rolling calculations such as moving means.',
  },
  {
    id: 20,
    number: 20,
    section: 2,
    difficulty: 'Hard',
    marks: 1,
    text: 'Which method applies a custom function along an axis of the DataFrame?',
    options: ['df.apply()', 'df.map_axis()', 'df.execute()', 'df.pipe()'],
    correctOption: 0,
    concept: 'Arbitrary Function Application with apply',
    conceptDetail: 'apply() executes functions along axis 0 (columns) or axis 1 (rows).',
  },
  {
    id: 21,
    number: 21,
    section: 3,
    difficulty: 'Easy',
    marks: 1,
    text: 'Which Python library serves as the underlying default plotting engine for df.plot() in Pandas?',
    options: ['Seaborn', 'Matplotlib', 'Plotly', 'Bokeh'],
    correctOption: 1,
    concept: 'Pandas Plotting Integration',
    conceptDetail: 'Pandas uses Matplotlib by default to generate charts from DataFrame Series.',
  },
  {
    id: 22,
    number: 22,
    section: 3,
    difficulty: 'Intermediate',
    marks: 1,
    text: 'How do you produce a histogram chart of column "income" directly using Pandas plotting API?',
    options: [
      'df["income"].plot(kind="hist")',
      'df["income"].render_hist()',
      'df["income"].bar_distribution()',
      'df.hist_chart("income")',
    ],
    correctOption: 0,
    concept: 'Histogram Generation',
    conceptDetail: 'plot(kind="hist") plots frequency distribution bins.',
  },
  {
    id: 23,
    number: 23,
    section: 3,
    difficulty: 'Medium',
    marks: 1,
    text: 'Which parameter in df.plot.scatter(x="gdp", y="literacy") is used to color data points by a third variable?',
    options: ['color_by', 'c', 'tint', 'hue_axis'],
    correctOption: 1,
    concept: 'Multivariate Scatter Plots',
    conceptDetail: 'The "c" argument assigns colors to marker points based on column values.',
  },
  {
    id: 24,
    number: 24,
    section: 3,
    difficulty: 'Easy',
    marks: 1,
    text: 'Which chart type is ideal for detecting statistical outliers across distribution quartiles?',
    options: ['Pie Chart', 'Box Plot (box)', 'Area Chart', 'Radar Chart'],
    correctOption: 1,
    concept: 'Outlier Analysis with Box Plots',
    conceptDetail: 'Box plots display IQR (interquartile range) and fliers as outlier markers.',
  },
  {
    id: 25,
    number: 25,
    section: 3,
    difficulty: 'Medium',
    marks: 1,
    text: 'Which Seaborn function visualizes pairwise bivariate distributions across all numerical DataFrame variables?',
    options: ['sns.heatmap()', 'sns.pairplot()', 'sns.relplot()', 'sns.catplot()'],
    correctOption: 1,
    concept: 'Pairwise Exploratory Data Analysis',
    conceptDetail: 'pairplot() draws a matrix of scatterplots and univariate distributions.',
  },
  {
    id: 26,
    number: 26,
    section: 3,
    difficulty: 'Intermediate',
    marks: 1,
    text: 'How do you save a generated Matplotlib figure to an image file named "chart.png" at 300 DPI?',
    options: [
      'plt.savefig("chart.png", dpi=300)',
      'plt.export_img("chart.png", res=300)',
      'plt.write_image("chart.png")',
      'plt.dump("chart.png")',
    ],
    correctOption: 0,
    concept: 'Figure Export and Resolution',
    conceptDetail: 'savefig() writes the current Matplotlib figure to disk with customizable DPI.',
  },
  {
    id: 27,
    number: 27,
    section: 3,
    difficulty: 'Hard',
    marks: 1,
    text: 'Which chart layout arranges multiple subplots in a synchronized 2D grid matrix in Matplotlib?',
    options: ['plt.multi_grid()', 'plt.subplots(nrows, ncols)', 'plt.split_canvas()', 'plt.draw_cells()'],
    correctOption: 1,
    concept: 'Subplot Grids',
    conceptDetail: 'plt.subplots() returns figure and array of axes for composite multi-panel dashboards.',
  },
  {
    id: 28,
    number: 28,
    section: 3,
    difficulty: 'Medium',
    marks: 1,
    text: 'Which Seaborn visualization displays correlation matrices using gradient color intensities?',
    options: ['sns.heatmap()', 'sns.corr_grid()', 'sns.matrix_plot()', 'sns.spectrum()'],
    correctOption: 0,
    concept: 'Correlation Heatmaps',
    conceptDetail: 'heatmap() draws 2D colored rectangular data grids representing matrices.',
  },
  {
    id: 29,
    number: 29,
    section: 3,
    difficulty: 'Easy',
    marks: 1,
    text: 'What keyword argument sets the title of a plot in Pandas df.plot()?',
    options: ['header', 'title', 'caption', 'heading'],
    correctOption: 1,
    concept: 'Chart Annotation and Labels',
    conceptDetail: 'The title argument provides top-level figure titles.',
  },
  {
    id: 30,
    number: 30,
    section: 3,
    difficulty: 'Intermediate',
    marks: 1,
    text: 'Which function adjusts subplot spacing and margins automatically to prevent label collisions?',
    options: ['plt.clean_layout()', 'plt.tight_layout()', 'plt.auto_pad()', 'plt.fix_overlap()'],
    correctOption: 1,
    concept: 'Layout Optimization',
    conceptDetail: 'plt.tight_layout() automatically pads subplots and titles.',
  },
]

export default function TakeQuizPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  // Dynamic quiz resolution from localStorage / generated list
  const dynamicQuiz = useMemo(() => {
    if (!id) return null
    try {
      const stored = JSON.parse(localStorage.getItem('kai_generated_quizzes') || '[]')
      return stored.find((q) => String(q._id) === String(id) || String(q.id) === String(id))
    } catch {
      return null
    }
  }, [id])

  const quizQuestions = useMemo(() => {
    if (dynamicQuiz?.questions && dynamicQuiz.questions.length > 0) {
      return dynamicQuiz.questions.map((q, idx) => ({
        id: q.id || idx + 1,
        number: idx + 1,
        section: 1,
        difficulty: q.difficulty || 'Medium',
        marks: 1,
        text: q.questionText || q.text,
        options: Array.isArray(q.options)
          ? q.options.map((opt) => (typeof opt === 'string' ? opt : opt.text || opt.label || ''))
          : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctOption: typeof q.correctOptionIndex === 'number'
          ? q.correctOptionIndex
          : (typeof q.correctOption === 'number'
              ? q.correctOption
              : ['A', 'B', 'C', 'D'].indexOf(String(q.correctOption || 'A').toUpperCase())),
        concept: q.bloomsLevel || 'Core Concept',
        conceptDetail: q.explanation || 'Official statistical methodology and data standard.',
      }))
    }
    return ASSESSMENT_QUESTIONS
  }, [dynamicQuiz])

  // State
  const [currentIdx, setCurrentIdx] = useState(dynamicQuiz ? 0 : 6)
  const [activeSection, setActiveSection] = useState(1)

  // User answers map: { [questionId]: optionIndex }
  const [answers, setAnswers] = useState(() => (dynamicQuiz ? {} : {
    1: 0,
    2: 2,
    6: 1,
    7: 0,
    11: 1,
    14: 1,
    18: 0,
  }))

  // Marked for Review set
  const [markedForReview, setMarkedForReview] = useState(() => (dynamicQuiz ? new Set() : new Set([3, 15])))

  // Real-time Timer (42 min, 15 sec)
  const [secondsRemaining, setSecondsRemaining] = useState(42 * 60 + 15)

  // Modals
  const [showConceptModal, setShowConceptModal] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Format timer as 00:MM:SS
  const formattedTime = useMemo(() => {
    const hrs = Math.floor(secondsRemaining / 3600)
    const mins = Math.floor((secondsRemaining % 3600) / 60)
    const secs = secondsRemaining % 60
    const pad = (n) => String(n).padStart(2, '0')
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`
  }, [secondsRemaining])

  const totalQuestions = quizQuestions.length
  const currentQ = quizQuestions[currentIdx] || quizQuestions[0]

  // Answered count & Marked count
  const answeredCount = Object.keys(answers).length
  const markedCount = markedForReview.size
  const notAnsweredCount = totalQuestions - answeredCount
  const completionPct = Math.round((answeredCount / totalQuestions) * 100)

  // Handle option select
  const handleSelectOption = (optIdx) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optIdx,
    }))
  }

  // Handle Mark for Review Toggle
  const toggleMarkForReview = () => {
    setMarkedForReview((prev) => {
      const next = new Set(prev)
      if (next.has(currentQ.id)) {
        next.delete(currentQ.id)
        showToast(`Unmarked Question ${currentQ.number} from review`)
      } else {
        next.add(currentQ.id)
        showToast(`Marked Question ${currentQ.number} for review`)
      }
      return next
    })
  }

  // Navigation handlers
  const handlePrev = () => {
    if (currentIdx > 0) {
      const nextIdx = currentIdx - 1
      setCurrentIdx(nextIdx)
      setActiveSection(quizQuestions[nextIdx]?.section || 1)
    }
  }

  const handleNext = () => {
    if (currentIdx < totalQuestions - 1) {
      const nextIdx = currentIdx + 1
      setCurrentIdx(nextIdx)
      setActiveSection(quizQuestions[nextIdx]?.section || 1)
    }
  }

  const jumpToQuestion = (qNum) => {
    const idx = qNum - 1
    setCurrentIdx(idx)
    setActiveSection(quizQuestions[idx]?.section || 1)
  }

  // Switch section tab
  const handleSwitchSection = (secNum) => {
    setActiveSection(secNum)
    // Find first question in this section
    const targetQ = quizQuestions.find((q) => q.section === secNum)
    if (targetQ) {
      setCurrentIdx(targetQ.number - 1)
    }
  }

  // Submit and save attempt with filled answers
  const handleSubmitQuiz = () => {
    let correct = 0
    quizQuestions.forEach((q) => {
      if (answers[q.id] === q.correctOption) {
        correct++
      }
    })
    const scorePct = Math.round((correct / quizQuestions.length) * 100)

    const attempt = {
      _id: `att-${Date.now()}`,
      quizId: id || 'quiz-data-analysis-02',
      quizTitle: dynamicQuiz?.title || 'Data Analysis with Python & Pandas Assessment',
      domain: dynamicQuiz?.domain || 'Data Management',
      score: scorePct,
      correctCount: correct,
      totalQuestions: quizQuestions.length,
      passed: scorePct >= 70,
      date: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      timestamp: Date.now(),
      answers: { ...answers },
      questions: quizQuestions.map((q) => ({
        id: q.id,
        number: q.number,
        text: q.text,
        options: q.options,
        correctOption: q.correctOption,
        userAnswer: answers[q.id],
        explanation: q.conceptDetail,
      })),
    }

    try {
      const existing = JSON.parse(localStorage.getItem('kai_quiz_attempts') || '[]')
      existing.unshift(attempt)
      localStorage.setItem('kai_quiz_attempts', JSON.stringify(existing))
      localStorage.setItem('kai_last_quiz_result', JSON.stringify(attempt))
    } catch (e) {
      console.error('Failed to save quiz attempt', e)
    }

    setShowSubmitModal(false)
    navigate('/quizzes?tab=history')
  }

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
        <Link to="/quizzes" className={styles.breadcrumbLink}>
          Assessments & Quizzes
        </Link>
        <span className={styles.breadcrumbSeparator}>›</span>
        <span className={styles.breadcrumbCurrent}>Assessment</span>
      </nav>

      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <div className={styles.titleArea}>
            <h1 className={styles.pageTitle}>Competency Assessment</h1>
            <span className={styles.aiBadge}>
              <Sparkles size={13} />
              AI Enabled
            </span>
          </div>
          <p className={styles.pageSubtitle}>
            This assessment evaluates your knowledge and application of key competencies.
          </p>
        </div>

        <button
          type="button"
          className={styles.submitBtn}
          onClick={() => setShowSubmitModal(true)}
        >
          Submit Assessment
        </button>
      </div>

      {/* Top Meta 5 Cards Bar */}
      <div className={styles.topMetaGrid}>
        {/* Meta 1: Assessment */}
        <div className={styles.metaCard}>
          <div className={`${styles.metaIconBox} ${styles.metaIconPurple}`}>
            <Award size={20} />
          </div>
          <div className={styles.metaInfo}>
            <span className={styles.metaLabel}>Assessment</span>
            <span className={styles.metaValue}>Data Analysis with Python</span>
            <span className={styles.intermediateBadge}>Intermediate</span>
          </div>
        </div>

        {/* Meta 2: Started At */}
        <div className={styles.metaCard}>
          <div className={`${styles.metaIconBox} ${styles.metaIconGreen}`}>
            <Calendar size={20} />
          </div>
          <div className={styles.metaInfo}>
            <span className={styles.metaLabel}>Started At</span>
            <span className={styles.metaValue} style={{ fontSize: 13 }}>
              20 May 2026, 10:00 AM
            </span>
          </div>
        </div>

        {/* Meta 3: Time Left */}
        <div className={styles.metaCard}>
          <div className={`${styles.metaIconBox} ${styles.metaIconBlue}`}>
            <Clock size={20} />
          </div>
          <div className={styles.metaInfo}>
            <span className={styles.metaLabel}>Time Left</span>
            <span className={styles.metaValue} style={{ color: '#0f172a', letterSpacing: 0.5 }}>
              {formattedTime}
            </span>
          </div>
        </div>

        {/* Meta 4: Total Questions */}
        <div className={styles.metaCard}>
          <div className={`${styles.metaIconBox} ${styles.metaIconOrange}`}>
            <ListOrdered size={20} />
          </div>
          <div className={styles.metaInfo}>
            <span className={styles.metaLabel}>Total Questions</span>
            <span className={styles.metaValue}>30 Questions</span>
          </div>
        </div>

        {/* Meta 5: Total Marks */}
        <div className={styles.metaCard}>
          <div className={`${styles.metaIconBox} ${styles.metaIconViolet}`}>
            <Star size={20} fill="currentColor" />
          </div>
          <div className={styles.metaInfo}>
            <span className={styles.metaLabel}>Total Marks</span>
            <span className={styles.metaValue}>30 Marks</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className={styles.contentGrid}>
        {/* Left Column: Current Question */}
        <div className={styles.quizCard}>
          {/* Section Tabs Row */}
          <div className={styles.sectionTabsHeader}>
            <div className={styles.sectionTabs}>
              <button
                type="button"
                className={`${styles.sectionTabBtn} ${
                  activeSection === 1 ? styles.sectionTabActive : ''
                }`}
                onClick={() => handleSwitchSection(1)}
              >
                Section 1: Data Handling & Exploration
              </button>
              <button
                type="button"
                className={`${styles.sectionTabBtn} ${
                  activeSection === 2 ? styles.sectionTabActive : ''
                }`}
                onClick={() => handleSwitchSection(2)}
              >
                Section 2: Data Analysis
              </button>
              <button
                type="button"
                className={`${styles.sectionTabBtn} ${
                  activeSection === 3 ? styles.sectionTabActive : ''
                }`}
                onClick={() => handleSwitchSection(3)}
              >
                Section 3: Visualization
              </button>
            </div>

            <div className={styles.autoSaveIndicator}>
              <span>Auto Save</span>
              <Check size={14} className={styles.saveCheck} strokeWidth={2.5} />
              <span>Saved</span>
            </div>
          </div>

          {/* Question Sub-header */}
          <div className={styles.questionHeaderRow}>
            <div className={styles.qHeaderLeft}>
              <span className={styles.qPill}>Question {currentQ.number} of {totalQuestions}</span>
              <button
                type="button"
                className={`${styles.markReviewBtn} ${
                  markedForReview.has(currentQ.id) ? styles.markReviewBtnActive : ''
                }`}
                onClick={toggleMarkForReview}
              >
                <Bookmark size={13} fill={markedForReview.has(currentQ.id) ? 'currentColor' : 'none'} />
                <span>Mark for Review</span>
              </button>
            </div>

            <div className={styles.qHeaderRight}>
              <span className={styles.qDifficultyBadge}>{currentQ.difficulty}</span>
              <span className={styles.qMarksText}>{currentQ.marks} Mark</span>
            </div>
          </div>

          {/* Question Text */}
          <h2 className={styles.questionTitle}>{currentQ.text}</h2>

          {/* Options List */}
          <div className={styles.optionsList}>
            {currentQ.options.map((opt, oIdx) => {
              const letter = String.fromCharCode(65 + oIdx) // A, B, C, D
              const isSelected = answers[currentQ.id] === oIdx

              return (
                <div
                  key={oIdx}
                  className={`${styles.optionItem} ${
                    isSelected ? styles.optionItemSelected : ''
                  }`}
                  onClick={() => handleSelectOption(oIdx)}
                >
                  <div
                    className={`${styles.radioCircle} ${
                      isSelected ? styles.radioCircleSelected : ''
                    }`}
                  >
                    {isSelected && <div className={styles.radioDotInner} />}
                  </div>
                  <span>
                    <strong>{letter}.</strong> {opt}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Need Help Box */}
          <div className={styles.needHelpBox}>
            <div className={styles.needHelpLeft}>
              <Lightbulb size={20} className={styles.lightbulbIcon} />
              <div>
                <div className={styles.needHelpTitle}>Need Help?</div>
                <div className={styles.needHelpSub}>
                  Review the concept:{' '}
                  <span className={styles.conceptLink}>{currentQ.concept}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className={styles.viewConceptBtn}
              onClick={() => setShowConceptModal(true)}
            >
              <span>View Concept</span>
              <ExternalLink size={13} />
            </button>
          </div>

          {/* Navigation Controls */}
          <div className={styles.navRow}>
            <button
              type="button"
              className={styles.prevBtn}
              disabled={currentIdx === 0}
              onClick={handlePrev}
            >
              <ArrowLeft size={14} />
              <span>Previous</span>
            </button>

            <button
              type="button"
              className={styles.nextBtn}
              onClick={handleNext}
            >
              <span>Next</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Right Sidebar Widgets */}
        <div className={styles.sidebarColumn}>
          {/* Widget 1: Your Progress */}
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>Your Progress</h3>

            <div className={styles.progressWidgetRow}>
              {/* Radial Donut Progress */}
              <div className={styles.radialProgressBox}>
                <svg className={styles.radialSvg} viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="3.2"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3.4"
                    strokeDasharray={`${completionPct}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className={styles.radialCenterText}>
                  <span>{answeredCount}/{totalQuestions}</span>
                  <span className={styles.radialCenterSub}>Questions</span>
                </div>
              </div>

              {/* Progress Legend */}
              <div className={styles.progressLegendList}>
                <div className={styles.progressLegendItem}>
                  <div className={styles.legendDotLabel}>
                    <div className={styles.legendDotPurple} />
                    <span>Answered</span>
                  </div>
                  <span className={styles.legendCount}>{answeredCount}</span>
                </div>

                <div className={styles.progressLegendItem}>
                  <div className={styles.legendDotLabel}>
                    <div className={styles.legendDotGray} />
                    <span>Not Answered</span>
                  </div>
                  <span className={styles.legendCount}>{notAnsweredCount}</span>
                </div>

                <div className={styles.progressLegendItem}>
                  <div className={styles.legendDotLabel}>
                    <div className={styles.legendDotOrange} />
                    <span>Marked</span>
                  </div>
                  <span className={styles.legendCount}>{markedCount}</span>
                </div>
              </div>
            </div>

            <div className={styles.progressCompletedLabel}>{completionPct}% Completed</div>
            <div className={styles.progressBarTrack}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          {/* Widget 2: Question Navigator */}
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>Question Navigator</h3>

            <div className={styles.navMiniLegend}>
              <div className={styles.miniLegendItem}>
                <div className={styles.miniDotGreen} />
                <span>Answered</span>
              </div>
              <div className={styles.miniLegendItem}>
                <div className={styles.miniDotWhite} />
                <span>Not Answered</span>
              </div>
              <div className={styles.miniLegendItem}>
                <div className={styles.miniDotOrange} />
                <span>Marked for Review</span>
              </div>
            </div>

            {/* Question buttons grid */}
            <div className={styles.questionGrid}>
              {quizQuestions.map((q) => {
                const isCurrent = q.number - 1 === currentIdx
                const isAnswered = answers[q.id] !== undefined
                const isMarked = markedForReview.has(q.id)

                return (
                  <button
                    key={q.id}
                    type="button"
                    className={`${styles.gridBtn} ${
                      isCurrent
                        ? styles.gridBtnCurrent
                        : isAnswered
                        ? styles.gridBtnAnswered
                        : isMarked
                        ? styles.gridBtnMarked
                        : ''
                    }`}
                    onClick={() => jumpToQuestion(q.number)}
                  >
                    {q.number}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Widget 3: Assessment Legend */}
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>Assessment Legend</h3>

            <div className={styles.legendList}>
              <div className={styles.legendItem}>
                <div className={`${styles.legendIconBox} ${styles.legendIconGreen}`}>
                  <Check size={9} color="#ffffff" strokeWidth={3} />
                </div>
                <div className={styles.legendText}>
                  <span className={styles.legendTitle}>Answered</span>
                  <span className={styles.legendDesc}>You have answered this question</span>
                </div>
              </div>

              <div className={styles.legendItem}>
                <div className={`${styles.legendIconBox} ${styles.legendIconOrange}`}>
                  <Bookmark size={8} color="#ffffff" fill="currentColor" />
                </div>
                <div className={styles.legendText}>
                  <span className={styles.legendTitle}>Marked for Review</span>
                  <span className={styles.legendDesc}>You have marked this question for review</span>
                </div>
              </div>

              <div className={styles.legendItem}>
                <div className={`${styles.legendIconBox} ${styles.legendIconWhite}`} />
                <div className={styles.legendText}>
                  <span className={styles.legendTitle}>Not Answered</span>
                  <span className={styles.legendDesc}>You have not answered this question</span>
                </div>
              </div>

              <div className={styles.legendItem}>
                <div className={`${styles.legendIconBox} ${styles.legendIconPurple}`} />
                <div className={styles.legendText}>
                  <span className={styles.legendTitle}>Current Question</span>
                  <span className={styles.legendDesc}>This is the current question</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Guidelines Banner */}
      <div className={styles.bottomBanner}>
        <div className={styles.guidelinesLeft}>
          <div className={styles.guidelinesIconBox}>
            <Shield size={20} />
          </div>
          <div>
            <div className={styles.guidelinesTitle}>Assessment Guidelines</div>
            <div className={styles.guidelinesBullets}>
              • Do not refresh or close the browser window during the assessment.<br />
              • All questions are compulsory.<br />
              • You can navigate between questions using the question navigator.
            </div>
          </div>
        </div>

        <div className={styles.guidelinesRight}>
          <div className={styles.lockIconBox}>
            <Lock size={18} />
          </div>
          <div>
            <div className={styles.integrityTitle}>
              This assessment is monitored for academic integrity.
            </div>
            <div className={styles.integritySub}>
              Please ensure a fair and honest attempt.
            </div>
          </div>
        </div>
      </div>

      {/* Concept Explanation Modal */}
      {showConceptModal && (
        <div className={styles.modalOverlay} onClick={() => setShowConceptModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Lightbulb size={20} color="#d97706" />
                <h3 className={styles.modalTitle}>{currentQ.concept}</h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowConceptModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, margin: '0 0 16px' }}>
                {currentQ.conceptDetail}
              </p>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 14,
                  fontSize: 13,
                  color: '#475569',
                }}
              >
                <strong>Key Syntax Reminder:</strong>
                <pre
                  style={{
                    background: '#0f172a',
                    color: '#f8fafc',
                    padding: 10,
                    borderRadius: 6,
                    marginTop: 8,
                    fontSize: 12,
                    fontFamily: 'monospace',
                  }}
                >
                  {`# Drop rows with NA entries
df_clean = df.dropna()

# Drop columns with NA entries
df_clean_cols = df.dropna(axis=1)`}
                </pre>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.nextBtn}
                onClick={() => setShowConceptModal(false)}
              >
                Back to Assessment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Assessment Confirmation Modal */}
      {showSubmitModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSubmitModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertCircle size={20} color="#4f46e5" />
                <h3 className={styles.modalTitle}>Confirm Assessment Submission</h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowSubmitModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.5, margin: '0 0 16px' }}>
                Are you ready to submit your assessment? Once submitted, your answers will be finalized
                and evaluated by KaushalAI.
              </p>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 13,
                }}
              >
                <div>
                  <div style={{ color: '#059669', fontWeight: 700, fontSize: 16 }}>{answeredCount}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>Answered</div>
                </div>

                <div>
                  <div style={{ color: '#ea580c', fontWeight: 700, fontSize: 16 }}>{markedCount}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>Marked for Review</div>
                </div>

                <div>
                  <div style={{ color: '#dc2626', fontWeight: 700, fontSize: 16 }}>{notAnsweredCount}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>Unanswered</div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.prevBtn}
                onClick={() => setShowSubmitModal(false)}
              >
                Keep Reviewing
              </button>
              <button
                type="button"
                className={styles.nextBtn}
                onClick={handleSubmitQuiz}
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
