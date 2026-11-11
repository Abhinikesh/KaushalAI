import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
  FlaskConical,
  Globe,
  PenLine,
  BarChart2,
  Plus,
  Trash2,
  RotateCw,
  AlertCircle,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import {
  sendChatMessage,
  listConversations,
  getConversationMessages,
  deleteConversation,
  clearAllChatHistory,
  updateMessageFeedback,
} from '../../api/ai.api'
import { getLearningPath } from '../../api/learningPath.api'
import styles from './AiTutorPage.module.css'

const DEFAULT_RESOURCES = [
  { name: 'Sampling Methods', sub: '15 Pages', type: 'PDF', color: '#EF4444', badgeBg: '#FEF2F2', badgeColor: '#16A34A' },
  { name: 'Introduction to Surveys', sub: '22 min', type: 'Video', color: '#EF4444', badgeBg: '#EFF6FF', badgeColor: '#2563EB' },
  { name: 'Survey Design Basics', sub: '12 Pages', type: 'PDF', color: '#3B82F6', badgeBg: '#FEF2F2', badgeColor: '#DC2626' },
  { name: 'Census in India', sub: '8 min read', type: 'Article', color: '#8B5CF6', badgeBg: '#F0FDF4', badgeColor: '#16A34A' },
]

function formatTimeShort(isoOrDate) {
  if (!isoOrDate) return ''
  const d = new Date(isoOrDate)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function generateClientMessageId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `cm_${crypto.randomUUID()}`
  }
  return `cm_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export default function AiTutorPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const displayName = user?.name || 'Officer'
  const firstName = displayName.split(' ')[0] || 'Officer'
  const avatarSrc = user?.avatarUrl || user?.avatar || ''

  // Persistent Conversations State
  const [conversations, setConversations] = useState([])
  const [convPage, setConvPage] = useState(1)
  const [hasMoreConvs, setHasMoreConvs] = useState(false)
  const [convsLoading, setConvsLoading] = useState(true)
  const [convsError, setConvsError] = useState(null)

  // Active Conversation & Messages State
  const [activeConvId, setActiveConvId] = useState(null)
  const activeConvIdRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [msgsLoading, setMsgsLoading] = useState(false)
  const [msgsError, setMsgsError] = useState(null)
  const [hasMoreOlderMsgs, setHasMoreOlderMsgs] = useState(false)

  // Composer & UI Feedback State
  const [inputVal, setInputVal] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const chatEndRef = useRef(null)

  // Sync ref with activeConvId to safely handle concurrent conversation switches
  useEffect(() => {
    activeConvIdRef.current = activeConvId
  }, [activeConvId])

  // Learner context: learning path courses for sidebar resources
  const { data: lpData } = useQuery({
    queryKey: ['learningPath'],
    queryFn: getLearningPath,
    retry: 1,
  })

  const sidebarResources = (() => {
    const items = lpData?.items || []
    if (items.length > 0) {
      return items.slice(0, 4).map((item) => ({
        id: item.courseId?._id || item.courseId || item._id,
        name: item.title || item.courseId?.title || 'Recommended Module',
        sub: item.courseId?.durationHours ? `${item.courseId.durationHours} Hours` : 'Learning Path',
        type: 'Course',
        color: '#4F46E5',
        badgeBg: '#EEF2FF',
        badgeColor: '#4F46E5',
      }))
    }
    return DEFAULT_RESOURCES
  })()

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 2800)
  }

  // Load conversations list from backend
  const fetchConversations = useCallback(async (pageToLoad = 1, autoSelectFirst = false) => {
    if (pageToLoad === 1) setConvsLoading(true)
    setConvsError(null)
    try {
      const res = await listConversations({ page: pageToLoad, limit: 20 })
      const fetched = res?.conversations || []
      if (pageToLoad === 1) {
        setConversations(fetched)
      } else {
        setConversations((prev) => {
          const existingIds = new Set(prev.map((c) => c._id))
          const deduped = fetched.filter((c) => !existingIds.has(c._id))
          return [...prev, ...deduped]
        })
      }
      setConvPage(pageToLoad)
      setHasMoreConvs(pageToLoad < (res?.pagination?.totalPages || 1))

      if (autoSelectFirst && fetched.length > 0 && !activeConvIdRef.current) {
        const firstId = fetched[0]._id
        setActiveConvId(firstId)
        activeConvIdRef.current = firstId
        loadMessages(firstId)
      }
    } catch (err) {
      setConvsError(err?.response?.data?.message || err.message || 'Failed to load conversation history.')
    } finally {
      setConvsLoading(false)
    }
  }, [])

  // Load messages for a specific conversation
  const loadMessages = async (convId, beforeCursor = null) => {
    if (!convId) return
    if (!beforeCursor) {
      setMsgsLoading(true)
      setMsgsError(null)
    }
    try {
      const res = await getConversationMessages(convId, { limit: 50, before: beforeCursor })
      // Check if user already switched conversations before load returned
      if (activeConvIdRef.current !== convId) return

      const loadedMsgs = (res?.messages || []).map((m) => ({
        id: m._id,
        sender: m.role,
        time: formatTimeShort(m.createdAt),
        text: m.content,
        provider: m.provider,
        feedback: m.feedback || null,
        isSaved: !!m.isSaved,
        createdAt: m.createdAt,
      }))

      setHasMoreOlderMsgs(typeof res?.hasMore === 'boolean' ? res.hasMore : loadedMsgs.length === 50)
      if (beforeCursor) {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id))
          const older = loadedMsgs.filter((m) => !seen.has(m.id))
          return [...older, ...prev]
        })
      } else {
        setMessages(loadedMsgs)
      }
    } catch (err) {
      if (activeConvIdRef.current === convId) {
        setMsgsError(err?.response?.data?.message || err.message || 'Failed to load messages.')
      }
    } finally {
      if (activeConvIdRef.current === convId) {
        setMsgsLoading(false)
      }
    }
  }

  // Initial mount: load learner's real conversations
  useEffect(() => {
    fetchConversations(1, true)
  }, [fetchConversations])

  // Start a brand new conversation
  const handleNewChat = () => {
    setActiveConvId(null)
    activeConvIdRef.current = null
    setMessages([])
    setMsgsError(null)
    setHasMoreOlderMsgs(false)
    setInputVal('')
  }

  // Switch to a previous conversation
  const handleSelectConversation = (conv) => {
    if (!conv?._id || conv._id === activeConvId) return
    setActiveConvId(conv._id)
    activeConvIdRef.current = conv._id
    setMessages([])
    setMsgsError(null)
    setHasMoreOlderMsgs(false)
    loadMessages(conv._id)
  }

  // Delete an individual conversation
  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation()
    try {
      await deleteConversation(convId)
      setConversations((prev) => prev.filter((c) => c._id !== convId))
      if (activeConvId === convId) {
        setActiveConvId(null)
        activeConvIdRef.current = null
        setMessages([])
      }
      showToast('Conversation deleted.')
    } catch (err) {
      showToast(err?.response?.data?.message || 'Could not delete conversation.')
    }
  }

  // Clear all history (explicit operation)
  const handleClearAllHistory = async () => {
    if (conversations.length === 0) return
    if (!window.confirm('Are you sure you want to delete all your AI Tutor conversations? This cannot be undone.')) {
      return
    }
    try {
      await clearAllChatHistory()
      setConversations([])
      setActiveConvId(null)
      activeConvIdRef.current = null
      setMessages([])
      showToast('All conversation history cleared.')
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to clear history.')
    }
  }

  // Send a message (creates conversation if activeConvId is null, or appends to activeConvId)
  const handleSend = async (textToSend) => {
    const q = (textToSend || inputVal).trim()
    if (!q || isTyping) return

    const targetConvId = activeConvId
    const clientMessageId = generateClientMessageId()
    const tempUserMsgId = `temp-usr-${clientMessageId}`
    const userTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    const optimisticUserMsg = {
      id: tempUserMsgId,
      sender: 'user',
      time: userTime,
      text: q,
      pending: true,
    }

    setMessages((prev) => [...prev, optimisticUserMsg])
    if (!textToSend) setInputVal('')
    setIsTyping(true)

    try {
      const payload = {
        message: q,
        clientMessageId,
      }
      if (targetConvId) {
        payload.conversationId = targetConvId
      }

      const res = await sendChatMessage(payload)
      const returnedConvId = res.conversationId

      // Refresh conversation list in background so title & timestamp are updated
      fetchConversations(1, false)

      // Only mutate current active stream if user has NOT switched away while pending
      if (activeConvIdRef.current === targetConvId) {
        if (!targetConvId && returnedConvId) {
          setActiveConvId(returnedConvId)
          activeConvIdRef.current = returnedConvId
        }

        const persistedUserMsg = res.message
          ? {
              id: res.message._id,
              sender: 'user',
              time: formatTimeShort(res.message.createdAt),
              text: res.message.content,
            }
          : { ...optimisticUserMsg, pending: false }

        const persistedAiMsg = res.assistantMessage
          ? {
              id: res.assistantMessage._id,
              sender: 'assistant',
              time: formatTimeShort(res.assistantMessage.createdAt),
              text: res.assistantMessage.content,
              provider: res.assistantMessage.provider,
              feedback: res.assistantMessage.feedback || null,
              isSaved: !!res.assistantMessage.isSaved,
            }
          : {
              id: `ai-${Date.now()}`,
              sender: 'assistant',
              time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              text: res.reply,
              provider: res.provider,
              feedback: null,
              isSaved: false,
            }

        setMessages((prev) => {
          const base = prev.filter(
            (m) => m.id !== tempUserMsgId && m.id !== persistedUserMsg.id && m.id !== persistedAiMsg.id
          )
          return [...base, persistedUserMsg, persistedAiMsg]
        })
      } else {
        // User switched to another conversation while waiting
        showToast('Response received in previous conversation.')
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err.message || 'Could not reach AI service.'
      if (activeConvIdRef.current === targetConvId) {
        setMessages((prev) => [
          ...prev.map((m) => (m.id === tempUserMsgId ? { ...m, pending: false } : m)),
          {
            id: `err-${Date.now()}`,
            sender: 'assistant',
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            text: `⚠️ ${errMsg}`,
            isError: true,
          },
        ])
      }
    } finally {
      setIsTyping(false)
    }
  }

  const handleFeedback = async (msgId, type) => {
    const targetMsg = messages.find((m) => m.id === msgId)
    if (!targetMsg || String(msgId).startsWith('temp-') || String(msgId).startsWith('err-')) return

    const nextFeedback = targetMsg.feedback === type ? null : type
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, feedback: nextFeedback } : m))
    )
    try {
      await updateMessageFeedback(msgId, { feedback: nextFeedback })
      showToast(nextFeedback === 'helpful' ? 'Thank you for your feedback!' : 'Feedback updated.')
    } catch {
      // Revert on failure
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, feedback: targetMsg.feedback } : m))
      )
    }
  }

  const handleBookmark = async (msgId) => {
    const targetMsg = messages.find((m) => m.id === msgId)
    if (!targetMsg || String(msgId).startsWith('temp-') || String(msgId).startsWith('err-')) return

    const nextSaved = !targetMsg.isSaved
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isSaved: nextSaved } : m))
    )
    try {
      await updateMessageFeedback(msgId, { isSaved: nextSaved })
      showToast(nextSaved ? 'Answer saved to bookmarks!' : 'Bookmark removed.')
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, isSaved: targetMsg.isSaved } : m))
      )
    }
  }

  const handleShare = (msg) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${msg.text}\n\nSource: KaushalAI Learning Assistant`)
      showToast('Answer copied to clipboard!')
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
            Your persistent AI learning assistant. Continue previous discussions or ask a new question.
          </p>
        </div>
      </div>

      {/* ── 2. Main Two-Column Layout ──────────────────────────────────── */}
      <div className={styles.mainLayout}>
        {/* ── Left Column: Chat Area ────────────────────────────────────── */}
        <div className={styles.chatArea}>
          {/* Welcome Banner Card (shown when starting a fresh conversation or no messages yet) */}
          {(!activeConvId || messages.length === 0) && !msgsLoading && (
            <div className={styles.welcomeCard}>
              <div className={styles.welcomeLeft}>
                <div className={styles.welcomeAvatarWrap}>
                  <Bot size={44} />
                </div>
                <div className={styles.welcomeContent}>
                  <h2 className={styles.welcomeTitle}>Hello {firstName}!</h2>
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
                  disabled={isTyping}
                >
                  <div className={styles.promptCardLeft}>
                    <span className={styles.promptIconWrap} style={{ background: '#EFF6FF', color: '#2563EB' }}>
                      <FlaskConical size={16} />
                    </span>
                    <span>Explain regression analysis in simple terms</span>
                  </div>
                  <ArrowRight size={14} className={styles.promptArrow} />
                </button>

                <button
                  type="button"
                  className={styles.promptCardBtn}
                  onClick={() => handleSend('What are the key concepts in National Accounts?')}
                  disabled={isTyping}
                >
                  <div className={styles.promptCardLeft}>
                    <span className={styles.promptIconWrap} style={{ background: '#EEF2FF', color: '#6366F1' }}>
                      <Globe size={16} />
                    </span>
                    <span>What are the key concepts in National Accounts?</span>
                  </div>
                  <ArrowRight size={14} className={styles.promptArrow} />
                </button>

                <button
                  type="button"
                  className={styles.promptCardBtn}
                  onClick={() => handleSend('Generate 5 MCQs on data visualization')}
                  disabled={isTyping}
                >
                  <div className={styles.promptCardLeft}>
                    <span className={styles.promptIconWrap} style={{ background: '#F0FDF4', color: '#16A34A' }}>
                      <PenLine size={16} />
                    </span>
                    <span>Generate 5 MCQs on data visualization</span>
                  </div>
                  <ArrowRight size={14} className={styles.promptArrow} />
                </button>

                <button
                  type="button"
                  className={styles.promptCardBtn}
                  onClick={() => handleSend('Suggest courses to improve my Excel skills')}
                  disabled={isTyping}
                >
                  <div className={styles.promptCardLeft}>
                    <span className={styles.promptIconWrap} style={{ background: '#ECFDF5', color: '#059669' }}>
                      <BarChart2 size={16} />
                    </span>
                    <span>Suggest courses to improve my Excel skills</span>
                  </div>
                  <ArrowRight size={14} className={styles.promptArrow} />
                </button>
              </div>
            </div>
          )}

          {/* Messages Loading / Error States */}
          {msgsLoading && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
              <RotateCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
              <div style={{ fontSize: 13 }}>Loading conversation history...</div>
            </div>
          )}

          {msgsError && (
            <div style={{ padding: '16px 20px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, color: '#991B1B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <AlertCircle size={16} />
                <span>{msgsError}</span>
              </div>
              <button
                type="button"
                onClick={() => loadMessages(activeConvId)}
                style={{ padding: '4px 12px', background: '#ffffff', border: '1px solid #FCA5A5', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#991B1B', fontWeight: 600 }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Load Older Messages Button */}
          {hasMoreOlderMsgs && !msgsLoading && (
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => loadMessages(activeConvId, messages[0]?.id)}
                style={{ background: '#ffffff', border: '1px solid #CBD5E1', borderRadius: 8, padding: '5px 14px', fontSize: 12, color: '#475569', cursor: 'pointer' }}
              >
                Load older messages
              </button>
            </div>
          )}

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
              return (
                <div key={m.id} className={styles.aiMsgRow}>
                  <span className={styles.msgTimestamp}>
                    {m.time} {m.provider && m.provider !== 'fallback' ? `• ${m.provider}` : ''}
                  </span>
                  <div className={styles.aiMsgContainer}>
                    <div className={styles.aiAvatarWrap}>
                      <Bot size={18} />
                    </div>

                    <div className={styles.aiCardContent} style={m.isError ? { borderColor: '#FCA5A5', background: '#FEF2F2' } : undefined}>
                      <div
                        style={{
                          fontSize: '13.5px',
                          color: m.isError ? '#991B1B' : '#334155',
                          lineHeight: 1.65,
                          whiteSpace: 'pre-line',
                        }}
                      >
                        {m.text}
                      </div>

                      {/* Action Bar */}
                      {!m.isError && (
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
                              <span>Explore Courses</span>
                            </button>
                          </div>
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
                onClick={() => showToast('Document upload is available in Admin Content Engine.')}
              >
                <Paperclip size={18} />
              </button>
              <input
                type="text"
                placeholder={isTyping ? 'Waiting for response...' : 'Ask anything about official statistics or your courses...'}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                disabled={isTyping}
                className={styles.textInput}
              />
              <button
                type="submit"
                className={styles.sendButton}
                disabled={!inputVal.trim() || isTyping}
                title="Send query"
              >
                <Send size={16} />
              </button>
            </form>
            <p className={styles.disclaimerText}>
              KaushalAI can make mistakes. Please verify important statistical regulations and official standards.
            </p>
          </div>
        </div>

        {/* ── Right Column: Sidebar ─────────────────────────────────────── */}
        <div className={styles.sidebarColumn}>
          {/* Card 1: Persistent Chat History */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardHeader}>
              <h3 className={styles.sidebarCardTitle}>Chat History</h3>
              {conversations.length > 0 && (
                <span
                  className={styles.viewAllLink}
                  onClick={handleClearAllHistory}
                  style={{ color: '#EF4444' }}
                >
                  Clear All
                </span>
              )}
            </div>

            <button
              type="button"
              className={styles.newChatBtn}
              onClick={handleNewChat}
            >
              <Plus size={15} />
              <span>New Conversation</span>
            </button>

            {convsLoading && conversations.length === 0 ? (
              <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 12, color: '#64748B' }}>
                Loading conversations...
              </div>
            ) : convsError ? (
              <div style={{ padding: '12px', background: '#FEF2F2', borderRadius: 8, fontSize: 12, color: '#991B1B', textAlign: 'center' }}>
                <div>{convsError}</div>
                <button
                  type="button"
                  onClick={() => fetchConversations(1, false)}
                  style={{ marginTop: 6, background: '#ffffff', border: '1px solid #FCA5A5', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}
                >
                  Retry
                </button>
              </div>
            ) : conversations.length === 0 ? (
              <div className={styles.emptyHistoryBox}>
                No saved conversations yet. Start asking questions to build your study history!
              </div>
            ) : (
              <div className={styles.historyList}>
                {conversations.map((item) => (
                  <div
                    key={item._id}
                    className={`${styles.historyItemBtn} ${activeConvId === item._id ? styles.historyItemActive : ''}`}
                    onClick={() => handleSelectConversation(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleSelectConversation(item)
                      }
                    }}
                  >
                    <div className={styles.historyItemLeft}>
                      <MessageSquare size={14} className={styles.historyItemIcon} />
                      <span className={styles.historyItemText} title={item.title}>
                        {item.title}
                      </span>
                    </div>
                    <div className={styles.historyItemRight}>
                      <span className={styles.historyItemTime}>
                        {formatTimeShort(item.lastMessageAt || item.updatedAt)}
                      </span>
                      <button
                        type="button"
                        className={styles.deleteChatBtn}
                        onClick={(e) => handleDeleteConversation(e, item._id)}
                        title="Delete conversation"
                        aria-label={`Delete conversation ${item.title}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}

                {hasMoreConvs && (
                  <button
                    type="button"
                    onClick={() => fetchConversations(convPage + 1, false)}
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      padding: '6px 10px',
                      fontSize: 11.5,
                      color: '#475569',
                      cursor: 'pointer',
                      marginTop: 4,
                    }}
                  >
                    Load More Conversations
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Learning Resources */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardHeader}>
              <h3 className={styles.sidebarCardTitle}>Learning Resources</h3>
              <span className={styles.viewAllLink} onClick={() => navigate('/learning-path')}>
                View Path
              </span>
            </div>

            <div className={styles.resourceList}>
              {sidebarResources.map((res, i) => (
                <div
                  key={res.id || i}
                  className={styles.resourceItem}
                  onClick={() => navigate(res.id ? `/courses/${res.id}` : '/courses')}
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
