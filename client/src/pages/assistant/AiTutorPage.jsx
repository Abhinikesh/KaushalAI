import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Check,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Bookmark,
  BookOpen,
  Paperclip,
  Send,
  MessageSquare,
  FileText,
  Video,
  Bot,
  User as UserIcon,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import styles from './AiTutorPage.module.css'

// Pre-packaged rich domain responses for official statistics
const DOMAIN_KNOWLEDGE = {
  'explain the difference between sample survey and census': {
    lead: "Great question! Here's a clear comparison between Sample Survey and Census:",
    hasTable: true,
    table: {
      headers: ['Aspect', 'Sample Survey', 'Census'],
      rows: [
        {
          aspect: 'Definition',
          sample: 'Data collected from a subset (sample) of the population.',
          census: 'Data collected from every unit of the population.',
        },
        {
          aspect: 'Coverage',
          sample: 'Partial',
          census: 'Complete',
        },
        {
          aspect: 'Cost',
          sample: 'Lower',
          census: 'Very High',
        },
        {
          aspect: 'Time',
          sample: 'Less time',
          census: 'More time',
        },
        {
          aspect: 'Accuracy',
          sample: 'Subject to sampling error',
          census: 'More accurate (no sampling error)',
        },
        {
          aspect: 'Examples',
          sample: 'NSSO surveys, sample-based estimation',
          census: 'Population Census, Economic Census',
        },
      ],
    },
    conclusion:
      'In short, sample surveys are quicker and cheaper, while censuses are comprehensive and more accurate.',
    relatedTopics: [
      'Sampling Methods',
      'Types of Surveys',
      'Census in India',
      'Data Collection Methods',
    ],
    resources: [
      { name: 'Sampling Methods', sub: '15 Pages', type: 'PDF', color: '#EF4444', badgeBg: '#FEF2F2', badgeColor: '#16A34A' },
      { name: 'Introduction to Surveys', sub: '22 min', type: 'Video', color: '#EF4444', badgeBg: '#EFF6FF', badgeColor: '#2563EB' },
      { name: 'Survey Design Basics', sub: '12 Pages', type: 'PDF', color: '#3B82F6', badgeBg: '#FEF2F2', badgeColor: '#DC2626' },
      { name: 'Census in India', sub: '8 min read', type: 'Article', color: '#8B5CF6', badgeBg: '#F0FDF4', badgeColor: '#16A34A' },
    ],
  },

  'explain regression analysis in simple terms': {
    lead: 'Regression analysis is a statistical technique to estimate relationships among variables—specifically how a dependent outcome changes when one or more independent factors vary.',
    hasTable: true,
    table: {
      headers: ['Key Concept', 'Explanation', 'MoSPI Official Example'],
      rows: [
        {
          aspect: 'Dependent Variable (Y)',
          sample: 'The main outcome you want to predict or explain.',
          census: 'Household Monthly Consumption Expenditure',
        },
        {
          aspect: 'Independent Variable (X)',
          sample: 'The factors hypothesized to influence or cause the outcome.',
          census: 'Household Income, Family Size, Education Level',
        },
        {
          aspect: 'Slope Coefficient (β₁)',
          sample: 'The rate of change in Y for every one-unit increase in X.',
          census: 'Marginal propensity to consume out of additional income',
        },
        {
          aspect: 'R-Squared (R²)',
          sample: 'Proportion of total variation in Y explained by the model.',
          census: 'Statistical goodness-of-fit for economic forecasting',
        },
      ],
    },
    conclusion:
      'In Indian official statistics, regression models are widely utilized in poverty estimation, Consumer Price Index (CPI) projections, and econometric policy impact assessments.',
    relatedTopics: [
      'Simple Linear Regression',
      'Multiple Regression',
      'Econometrics Basics',
      'Ordinary Least Squares',
    ],
    resources: [
      { name: 'Linear Regression Essentials', sub: '24 Pages', type: 'PDF', color: '#3B82F6', badgeBg: '#FEF2F2', badgeColor: '#DC2626' },
      { name: 'Regression Modeling in R & Stata', sub: '45 min', type: 'Video', color: '#EF4444', badgeBg: '#EFF6FF', badgeColor: '#2563EB' },
      { name: 'MoSPI Econometric Guidelines', sub: '10 min read', type: 'Article', color: '#8B5CF6', badgeBg: '#F0FDF4', badgeColor: '#16A34A' },
    ],
  },

  'what are the key concepts in national accounts?': {
    lead: 'National Accounts provide a systematic macroeconomic framework measuring India’s complete economic activity, structured in accordance with the United Nations System of National Accounts (SNA 2008).',
    hasTable: true,
    table: {
      headers: ['Pillar', 'Definition', 'Current MoSPI Methodology'],
      rows: [
        {
          aspect: 'Gross Domestic Product (GDP)',
          sample: 'Total monetary value of final goods & services produced within economic borders.',
          census: 'Calculated via Production, Expenditure & Income approaches.',
        },
        {
          aspect: 'Gross Value Added (GVA)',
          sample: 'Total output value minus intermediate consumption: GVA = GDP - Taxes + Subsidies.',
          census: 'Reported by industry sectors (Agriculture, Industry, Services).',
        },
        {
          aspect: 'Base Year 2011-12',
          sample: 'The benchmark price reference year used for constant price series.',
          census: 'Administered by National Statistical Office (NSO) National Accounts Division.',
        },
        {
          aspect: 'Annual & Quarterly Estimates',
          sample: 'Periodic GDP and GVA releases evaluating sectoral growth rates.',
          census: 'Released within 60 days of quarter end following SDDS standards.',
        },
      ],
    },
    conclusion:
      'The National Accounts Division (NAD) of MoSPI is responsible for compiling and publishing National Accounts Statistics annually.',
    relatedTopics: [
      'GDP vs GVA',
      'SNA 2008 Framework',
      'Input-Output Transactions',
      'Capital Formation & Savings',
    ],
    resources: [
      { name: 'National Accounts Statistics 2026', sub: '180 Pages', type: 'PDF', color: '#3B82F6', badgeBg: '#FEF2F2', badgeColor: '#DC2626' },
      { name: 'Understanding GVA vs GDP', sub: '18 min', type: 'Video', color: '#EF4444', badgeBg: '#EFF6FF', badgeColor: '#2563EB' },
      { name: 'Base Year Revision Guidelines', sub: '12 min read', type: 'Article', color: '#8B5CF6', badgeBg: '#F0FDF4', badgeColor: '#16A34A' },
    ],
  },

  'generate 5 mcqs on data visualization': {
    lead: 'Here are 5 official statistics practice MCQs on Data Visualization for self-assessment:',
    hasTable: false,
    textBody: `1. **Which chart is most appropriate for displaying the distribution of a continuous statistical variable?**
   • A) Pie Chart
   • B) Histogram (Correct ✓)
   • C) Donut Chart
   • D) Radar Chart
   *Explanation: Histograms group continuous data into bins, illustrating skewness and frequency distributions accurately.*

2. **In a Time Series chart of CPI inflation over 5 years, which axis should represent time?**
   • A) Horizontal (X-axis) (Correct ✓)
   • B) Vertical (Y-axis)
   • C) Z-axis
   • D) Secondary Y-axis only
   *Explanation: Standard chronological conventions place continuous time on the horizontal X-axis.*

3. **What is the primary drawback of using a 3D Pie Chart for official reports?**
   • A) Requires too much memory
   • B) Distorts angles and exaggerates foreground slices (Correct ✓)
   • C) Cannot display more than 2 slices
   • D) Only supports integer values
   *Explanation: Perspective distortion prevents readers from judging relative proportions accurately.*

4. **Which visualization is best suited for showing correlations between two continuous variables?**
   • A) Bar Chart
   • B) Scatter Plot (Correct ✓)
   • C) Stacked Area Chart
   • D) Treemap
   *Explanation: Scatter plots map pairs of numeric values across Cartesian coordinates to identify linear and non-linear patterns.*

5. **Under MoSPI Data Visualization Standards, what is essential when publishing official charts?**
   • A) Source attribution, clear axis labels, and unit indicators (Correct ✓)
   • B) Maximum number of vibrant colors
   • C) Omitting the baseline zero whenever possible
   • D) Removing legends to save space
   *Explanation: Official statistical visualizations require transparency, complete labels, and data sources.*`,
    conclusion:
      'Practice quiz completed. Review these visual rules to maintain high data presentation standards in official bulletins.',
    relatedTopics: [
      'Chart Selection Matrix',
      'Accessibility in Dashboards',
      'MoSPI Style Guide',
      'Common Visualization Pitfalls',
    ],
    resources: [
      { name: 'Official Data Visualization Guide', sub: '32 Pages', type: 'PDF', color: '#3B82F6', badgeBg: '#FEF2F2', badgeColor: '#DC2626' },
      { name: 'Interactive Charts with PowerBI', sub: '40 min', type: 'Video', color: '#EF4444', badgeBg: '#EFF6FF', badgeColor: '#2563EB' },
    ],
  },

  'suggest courses to improve my excel skills': {
    lead: 'Based on your Statistical Officer competency profile and MoSPI requirements, here are the top recommended Excel learning modules:',
    hasTable: true,
    table: {
      headers: ['Course Title', 'Provider', 'Skill Level', 'Key Focus Area'],
      rows: [
        {
          aspect: 'Advanced Excel for Statistical Officers',
          sample: 'NSSTA Greater Noida',
          census: 'Intermediate to Advanced',
        },
        {
          aspect: 'Mastering XLOOKUP, INDEX-MATCH & Dynamic Arrays',
          sample: 'iGOT Karmayogi',
          census: 'Intermediate',
        },
        {
          aspect: 'Pivot Tables, Slicers & Executive Dashboards',
          sample: 'iGOT Karmayogi',
          census: 'Advanced',
        },
        {
          aspect: 'Statistical Functions & Data Analysis Toolpak',
          sample: 'MoSPI E-Learning',
          census: 'Core Competency',
        },
      ],
    },
    conclusion:
      'Completing these courses will fulfill your Level 3+ target in IT & Digital Tools and help you automate regular survey tabulations.',
    relatedTopics: [
      'Excel Automation with Macros',
      'Power Query for Data Cleaning',
      'Statistical Analysis Toolpak',
      'iGOT Excel Pathway',
    ],
    resources: [
      { name: 'Excel Formulas Cheat Sheet', sub: '8 Pages', type: 'PDF', color: '#10B981', badgeBg: '#ECFDF5', badgeColor: '#059669' },
      { name: 'Dashboard Design in Excel', sub: '30 min', type: 'Video', color: '#EF4444', badgeBg: '#EFF6FF', badgeColor: '#2563EB' },
    ],
  },
}

// Conversation History list matching the screenshot
const INITIAL_CHAT_HISTORY = [
  { id: '1', title: 'Difference between survey and census', time: '10:30 AM', active: true },
  { id: '2', title: 'What is time series analysis?', time: 'Yesterday', active: false },
  { id: '3', title: 'Explain central limit theorem', time: '2 days ago', active: false },
  { id: '4', title: 'Best practices for data cleaning', time: '3 days ago', active: false },
  { id: '5', title: 'Measures of central tendency', time: '4 days ago', active: false },
]

export default function AiTutorPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const displayName = user?.name || 'Rahul Kumar'
  const firstName = displayName.split(' ')[0] || 'Rahul'
  const avatarSrc = user?.avatar || '/uploads/avatar_rahul.jpg'

  // Chat conversation state
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      sender: 'user',
      time: '10:30 AM',
      text: 'Explain the difference between sample survey and census.',
    },
    {
      id: 'init-2',
      sender: 'assistant',
      time: '10:30 AM',
      data: DOMAIN_KNOWLEDGE['explain the difference between sample survey and census'],
      feedback: null, // 'helpful' | 'not-helpful'
      isSaved: false,
    },
  ])

  const [inputVal, setInputVal] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [activeHistoryId, setActiveHistoryId] = useState('1')
  const [chatHistory, setChatHistory] = useState(INITIAL_CHAT_HISTORY)
  const [activeResources, setActiveResources] = useState(
    DOMAIN_KNOWLEDGE['explain the difference between sample survey and census'].resources
  )

  const chatEndRef = useRef(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 2500)
  }

  const handleSend = (textToSend) => {
    const q = (textToSend || inputVal).trim()
    if (!q) return

    const userTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const userMsg = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      time: userTime,
      text: q,
    }

    setMessages((prev) => [...prev, userMsg])
    setInputVal('')
    setIsTyping(true)

    // Lookup knowledge base or synthesize response
    const key = q.toLowerCase()
    let responseData = null

    for (const [k, v] of Object.entries(DOMAIN_KNOWLEDGE)) {
      if (key.includes(k) || k.includes(key)) {
        responseData = v
        break
      }
    }

    if (!responseData) {
      responseData = {
        lead: `Here is a comprehensive breakdown regarding "${q}":`,
        hasTable: false,
        textBody: `In official statistical operations under MoSPI, **${q}** involves structured methodological standards to ensure high reliability and compliance with national guidelines.\n\n• **Core Principle**: Standardized definitions ensure cross-cadre comparability across state and national reports.\n• **Practical Application**: Utilized by Statistical Officers in field operations, quality controls, and dissemination.\n• **Quality Dimensions**: Adheres to the National Quality Assurance Framework (NQAF) for accuracy, timeliness, and accessibility.`,
        conclusion: `You can explore relevant modules in the Course Catalog or take practice assessments on this competency.`,
        relatedTopics: [
          'MoSPI Methodological Manuals',
          'Statistical Quality Frameworks',
          'Official Registers & Surveys',
          'Curriculum Guidelines',
        ],
        resources: [
          { name: 'Official Reference Manual', sub: '18 Pages', type: 'PDF', color: '#3B82F6', badgeBg: '#FEF2F2', badgeColor: '#DC2626' },
          { name: 'Topic Overview Lecture', sub: '25 min', type: 'Video', color: '#EF4444', badgeBg: '#EFF6FF', badgeColor: '#2563EB' },
        ],
      }
    }

    setTimeout(() => {
      const aiTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        time: aiTime,
        data: responseData,
        feedback: null,
        isSaved: false,
      }
      setMessages((prev) => [...prev, aiMsg])
      if (responseData.resources) {
        setActiveResources(responseData.resources)
      }
      setIsTyping(false)
    }, 600)
  }

  // Handle switching chat history
  const handleSelectHistory = (item) => {
    setActiveHistoryId(item.id)
    setChatHistory((prev) =>
      prev.map((h) => ({ ...h, active: h.id === item.id }))
    )

    if (item.title.toLowerCase().includes('census') || item.title.toLowerCase().includes('survey')) {
      handleSend('Explain the difference between sample survey and census.')
    } else {
      handleSend(item.title)
    }
  }

  const handleFeedback = (msgId, type) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          const current = m.feedback
          return { ...m, feedback: current === type ? null : type }
        }
        return m
      })
    )
    showToast(type === 'helpful' ? 'Thank you for your feedback! 👍' : 'Feedback recorded. 👎')
  }

  const handleBookmark = (msgId) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          const nextSaved = !m.isSaved
          showToast(nextSaved ? 'Answer saved to bookmarks! 🔖' : 'Bookmark removed.')
          return { ...m, isSaved: nextSaved }
        }
        return m
      })
    )
  }

  const handleShare = (msg) => {
    if (navigator.clipboard) {
      const shareText = `${msg.data?.lead || ''}\n\n${msg.data?.conclusion || ''}\n\nSource: KaushalAI Official Statistics Assistant`
      navigator.clipboard.writeText(shareText)
      showToast('Answer copied to clipboard! 🔗')
    } else {
      showToast('Share link created.')
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  return (
    <div className={styles.pageContainer}>
      {/* ── Toast Notification ────────────────────────────────────────── */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#0F172A',
            color: '#FFFFFF',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 500,
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 1. Page Header ──────────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerIconBadge}>
          <Sparkles size={22} />
        </div>
        <div className={styles.headerText}>
          <h1 className={styles.title}>AI Tutor</h1>
          <p className={styles.subtitle}>
            Your personal AI learning assistant. Ask anything, learn anything!
          </p>
        </div>
      </div>

      {/* ── 2. Main Two-Column Layout ──────────────────────────────────── */}
      <div className={styles.mainLayout}>
        {/* ── Left Column: Chat Area ────────────────────────────────────── */}
        <div className={styles.chatArea}>
          {/* Welcome Banner Card */}
          <div className={styles.welcomeCard}>
            <div className={styles.welcomeLeft}>
              <div className={styles.welcomeAvatarWrap}>
                <Bot size={44} />
              </div>
              <div className={styles.welcomeContent}>
                <h2 className={styles.welcomeTitle}>Hello {firstName}! 👋</h2>
                <p className={styles.welcomeSub}>I'm your AI Tutor. I can help you with:</p>
                <div className={styles.welcomeList}>
                  <div className={styles.welcomeListItem}>
                    <Check size={14} className={styles.checkIcon} />
                    <span>Explaining concepts and topics</span>
                  </div>
                  <div className={styles.welcomeListItem}>
                    <Check size={14} className={styles.checkIcon} />
                    <span>Finding the right learning resources</span>
                  </div>
                  <div className={styles.welcomeListItem}>
                    <Check size={14} className={styles.checkIcon} />
                    <span>Generating practice questions</span>
                  </div>
                  <div className={styles.welcomeListItem}>
                    <Check size={14} className={styles.checkIcon} />
                    <span>Clarifying your doubts</span>
                  </div>
                  <div className={styles.welcomeListItem}>
                    <Check size={14} className={styles.checkIcon} />
                    <span>Guiding your learning journey</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.welcomeRight}>
              <h3 className={styles.tryAskingTitle}>Try asking me:</h3>
              <button
                type="button"
                className={styles.promptCardBtn}
                onClick={() => handleSend('Explain regression analysis in simple terms')}
              >
                <div className={styles.promptCardLeft}>
                  <span className={styles.promptIconWrap} style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    🔬
                  </span>
                  <span>Explain regression analysis in simple terms</span>
                </div>
                <ArrowRight size={14} className={styles.promptArrow} />
              </button>

              <button
                type="button"
                className={styles.promptCardBtn}
                onClick={() => handleSend('What are the key concepts in National Accounts?')}
              >
                <div className={styles.promptCardLeft}>
                  <span className={styles.promptIconWrap} style={{ background: '#EEF2FF', color: '#6366F1' }}>
                    🌐
                  </span>
                  <span>What are the key concepts in National Accounts?</span>
                </div>
                <ArrowRight size={14} className={styles.promptArrow} />
              </button>

              <button
                type="button"
                className={styles.promptCardBtn}
                onClick={() => handleSend('Generate 5 MCQs on data visualization')}
              >
                <div className={styles.promptCardLeft}>
                  <span className={styles.promptIconWrap} style={{ background: '#F0FDF4', color: '#16A34A' }}>
                    📝
                  </span>
                  <span>Generate 5 MCQs on data visualization</span>
                </div>
                <ArrowRight size={14} className={styles.promptArrow} />
              </button>

              <button
                type="button"
                className={styles.promptCardBtn}
                onClick={() => handleSend('Suggest courses to improve my Excel skills')}
              >
                <div className={styles.promptCardLeft}>
                  <span className={styles.promptIconWrap} style={{ background: '#ECFDF5', color: '#059669' }}>
                    📊
                  </span>
                  <span>Suggest courses to improve my Excel skills</span>
                </div>
                <ArrowRight size={14} className={styles.promptArrow} />
              </button>
            </div>
          </div>

          {/* Chat Messages Stream */}
          <div className={styles.chatStream}>
            {messages.map((m) => {
              if (m.sender === 'user') {
                return (
                  <div key={m.id} className={styles.userMsgRow}>
                    <span className={styles.msgTimestamp}>{m.time}</span>
                    <div className={styles.userMsgContainer}>
                      <div className={styles.userBubble}>{m.text}</div>
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={displayName}
                          className={styles.userAvatar}
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className={styles.userAvatarFallback}>
                          <UserIcon size={16} />
                        </div>
                      )}
                    </div>
                  </div>
                )
              }

              // Assistant Message
              const d = m.data || {}
              return (
                <div key={m.id} className={styles.aiMsgRow}>
                  <span className={styles.msgTimestamp}>{m.time}</span>
                  <div className={styles.aiMsgContainer}>
                    <div className={styles.aiAvatarWrap}>
                      <Bot size={18} />
                    </div>

                    <div className={styles.aiCardContent}>
                      {d.lead && <p className={styles.aiTextLead}>{d.lead}</p>}

                      {/* Comparison Table if present */}
                      {d.hasTable && d.table && (
                        <div className={styles.comparisonTableWrap}>
                          <table className={styles.comparisonTable}>
                            <thead>
                              <tr>
                                {d.table.headers.map((h, i) => (
                                  <th key={i}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {d.table.rows.map((r, i) => (
                                <tr key={i}>
                                  <td className={styles.aspectCell}>{r.aspect}</td>
                                  <td>{r.sample}</td>
                                  <td>{r.census}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Text Body if no table */}
                      {d.textBody && (
                        <div
                          style={{
                            fontSize: '13px',
                            color: '#334155',
                            lineHeight: 1.6,
                            whiteSpace: 'pre-line',
                          }}
                        >
                          {d.textBody}
                        </div>
                      )}

                      {/* Conclusion text */}
                      {d.conclusion && (
                        <p className={styles.aiConclusionText}>{d.conclusion}</p>
                      )}

                      {/* Action Bar */}
                      <div className={styles.msgActionsBar}>
                        <div className={styles.msgActionsLeft}>
                          <button
                            type="button"
                            className={`${styles.feedbackBtn} ${m.feedback === 'helpful' ? styles.feedbackBtnActive : ''}`}
                            onClick={() => handleFeedback(m.id, 'helpful')}
                          >
                            <ThumbsUp size={13} />
                            <span>Helpful</span>
                          </button>
                          <button
                            type="button"
                            className={`${styles.feedbackBtn} ${m.feedback === 'not-helpful' ? styles.feedbackBtnActive : ''}`}
                            onClick={() => handleFeedback(m.id, 'not-helpful')}
                          >
                            <ThumbsDown size={13} />
                            <span>Not Helpful</span>
                          </button>
                        </div>

                        <div className={styles.msgActionsRight}>
                          <button
                            type="button"
                            className={styles.actionTextBtn}
                            onClick={() => handleShare(m)}
                          >
                            <Share2 size={13} />
                            <span>Share</span>
                          </button>
                          <button
                            type="button"
                            className={`${styles.actionTextBtn} ${m.isSaved ? styles.feedbackBtnActive : ''}`}
                            onClick={() => handleBookmark(m.id)}
                          >
                            <Bookmark size={13} fill={m.isSaved ? '#6366F1' : 'transparent'} />
                            <span>{m.isSaved ? 'Saved' : 'Save'}</span>
                          </button>
                          <button
                            type="button"
                            className={styles.actionTextBtn}
                            onClick={() => navigate('/courses')}
                          >
                            <BookOpen size={13} />
                            <span>Read More</span>
                          </button>
                        </div>
                      </div>

                      {/* Explore Related Topics */}
                      {d.relatedTopics && d.relatedTopics.length > 0 && (
                        <div className={styles.relatedTopicsSection}>
                          <span className={styles.relatedTopicsLabel}>Explore related topics:</span>
                          {d.relatedTopics.map((topic, i) => (
                            <button
                              key={i}
                              type="button"
                              className={styles.topicPillBtn}
                              onClick={() => handleSend(`Tell me more about ${topic}`)}
                            >
                              {topic}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {isTyping && (
              <div className={styles.aiMsgRow}>
                <div className={styles.aiMsgContainer}>
                  <div className={styles.aiAvatarWrap}>
                    <Bot size={18} />
                  </div>
                  <div
                    className={styles.aiCardContent}
                    style={{ padding: '16px 20px', width: 'auto' }}
                  >
                    <div className={styles.typingIndicator}>
                      <span className={styles.typingDot} />
                      <span className={styles.typingDot} />
                      <span className={styles.typingDot} />
                      <span style={{ fontSize: '12px', color: '#64748B', marginLeft: '6px' }}>
                        AI Tutor is thinking...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Section */}
          <div className={styles.inputSection}>
            <form
              className={styles.inputBarWrap}
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
            >
              <button
                type="button"
                className={styles.attachBtn}
                title="Attach Document or Dataset"
                onClick={() => showToast('Attachment capability ready for statistical CSV and PDF manuals.')}
              >
                <Paperclip size={18} />
              </button>
              <input
                type="text"
                placeholder="Ask anything..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className={styles.textInput}
              />
              <button
                type="submit"
                className={styles.sendButton}
                disabled={!inputVal.trim()}
                title="Send query"
              >
                <Send size={16} />
              </button>
            </form>
            <p className={styles.disclaimerText}>
              KaushalAI can make mistakes. Please verify important information.
            </p>
          </div>
        </div>

        {/* ── Right Column: Sidebar ─────────────────────────────────────── */}
        <div className={styles.sidebarColumn}>
          {/* Card 1: Chat History */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardHeader}>
              <h3 className={styles.sidebarCardTitle}>Chat History</h3>
              <span className={styles.viewAllLink} onClick={() => showToast('Showing all recent official queries.')}>
                View All
              </span>
            </div>

            <div className={styles.historyList}>
              {chatHistory.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.historyItemBtn} ${item.active ? styles.historyItemActive : ''}`}
                  onClick={() => handleSelectHistory(item)}
                >
                  <div className={styles.historyItemLeft}>
                    <MessageSquare size={14} className={styles.historyItemIcon} />
                    <span className={styles.historyItemText} title={item.title}>
                      {item.title}
                    </span>
                  </div>
                  <span className={styles.historyItemTime}>{item.time}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Card 2: Learning Resources */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardHeader}>
              <h3 className={styles.sidebarCardTitle}>Learning Resources</h3>
              <span className={styles.viewAllLink} onClick={() => navigate('/courses')}>
                View All
              </span>
            </div>

            <div className={styles.resourceList}>
              {activeResources.map((res, i) => (
                <div
                  key={i}
                  className={styles.resourceItem}
                  onClick={() => navigate('/courses')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.resourceItemLeft}>
                    <div className={styles.resourceIconBox} style={{ background: '#FEF2F2', color: res.color }}>
                      {res.type === 'PDF' ? <FileText size={16} /> : res.type === 'Video' ? <Video size={16} /> : <BookOpen size={16} />}
                    </div>
                    <div className={styles.resourceMeta}>
                      <span className={styles.resourceName}>{res.name}</span>
                      <span className={styles.resourceSub}>{res.sub}</span>
                    </div>
                  </div>
                  <span
                    className={styles.resourceBadge}
                    style={{ background: res.badgeBg, color: res.badgeColor }}
                  >
                    {res.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
