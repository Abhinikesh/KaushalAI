import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bot,
  Send,
  RotateCcw,
  Lightbulb,
  AlertCircle
} from 'lucide-react'
import { getLearningPath } from '../../api/learningPath.api'
import { sendChatMessage } from '../../api/ai.api'
import styles from './AiTutorPage.module.css'

/** Convert basic markdown to HTML for assistant messages */
function renderMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^#{1,3}\s+(.+)$/gm, '<strong>$1</strong>')
    .replace(/^[-•]\s+(.+)$/gm, '&nbsp;&bull;&nbsp;$1')
    .replace(/^\d+\.\s+(.+)$/gm, (_, line) => `&nbsp;${_[0]}.&nbsp;${line}`)
    .replace(/\n/g, '<br/>')
}

export default function AiTutorChatPage() {
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'Hello Officer! I am your KaushalAI AI Learning Tutor powered by Grok. Ask me anything about official statistics, NSSTA curriculum, survey methodology, data governance, or any topic from your iGOT courses.',
      time: 'Just now',
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  const { data: lpData } = useQuery({
    queryKey: ['learningPath'],
    queryFn: getLearningPath,
  })

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const prompts = [
    'What is stratified sampling vs cluster sampling?',
    'Explain data quality dimensions under NQAF',
    'How are consumer price index weights calculated?',
    'Explain GDP compilation under SNA 2008',
  ]

  const handleSend = async (textToSend) => {
    const q = textToSend || input
    if (!q.trim() || isTyping) return

    const userMsg = { sender: 'user', text: q, time: 'Just now' }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setIsTyping(true)
    setError(null)

    try {
      // Build history in {role, content} format for the API
      const history = updatedMessages.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }))

      const { reply } = await sendChatMessage(history)
      setMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: reply, time: 'Just now' },
      ])
    } catch (err) {
      const errMsg = err?.response?.data?.message || err.message || 'Failed to get a response. Please try again.'
      setError(errMsg)
      setMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: '⚠️ ' + errMsg, time: 'Just now', isError: true },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const clearChat = () => {
    setMessages([
      {
        sender: 'assistant',
        text: 'Conversation cleared. How else can I assist your statistical learning journey?',
        time: 'Just now',
      },
    ])
    setError(null)
  }

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumb & Header ────────────────────────────── */}
      <div className={styles.pageHeader} style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className={styles.headerIconBadge}>
            <Bot size={24} />
          </div>
          <div className={styles.headerText}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B', marginBottom: 2 }}>
              <Link to="/dashboard" style={{ color: '#64748B', textDecoration: 'none' }}>Dashboard</Link>
              <span>›</span>
              <Link to="/ai-tutor" style={{ color: '#64748B', textDecoration: 'none' }}>AI Tutor</Link>
              <span>›</span>
              <span style={{ color: '#1E293B', fontWeight: 600 }}>Chat Interface</span>
            </div>
            <h1 className={styles.title}>AI Tutor Conversation</h1>
            <p className={styles.subtitle}>
              Interactive query assistant for official statistical manuals, sampling designs, and competency guidelines.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={clearChat}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            background: '#ffffff',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 600,
            color: '#475569',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={14} />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* ── Chat Window ────────────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #E2E8F0',
          borderRadius: 14,
          display: 'flex',
          flexDirection: 'column',
          height: 600,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {/* Messages Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '78%',
              }}
            >
              {m.sender === 'assistant' && (
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: '#EEF2FF',
                    color: 'var(--color-primary-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Bot size={18} />
                </div>
              )}

              <div
                style={{
                  background: m.sender === 'user' ? 'var(--color-primary-600)' : m.isError ? '#FEF2F2' : '#F8FAFC',
                  color: m.sender === 'user' ? '#ffffff' : m.isError ? '#991B1B' : '#1E293B',
                  border: m.sender === 'user' ? 'none' : m.isError ? '1px solid #FCA5A5' : '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: '12px 16px',
                  fontSize: 13.5,
                  lineHeight: 1.6,
                }}
              >
                {m.sender === 'assistant' && !m.isError
                  ? <span dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
                  : m.text
                }
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748B', fontSize: 12.5 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#EEF2FF',
                  color: 'var(--color-primary-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={16} />
              </div>
              <span>KaushalAI Tutor is thinking...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestion Chips */}
        <div
          style={{
            padding: '10px 20px',
            background: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
          }}
        >
          <Lightbulb size={15} color="#F59E0B" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>
            Suggested Prompts:
          </span>
          {prompts.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(p)}
              style={{
                background: '#ffffff',
                border: '1px solid #CBD5E1',
                borderRadius: 16,
                padding: '4px 12px',
                fontSize: 12,
                color: '#334155',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #E2E8F0',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <input
            type="text"
            placeholder="Ask a question about sampling theory, GDP, CPI, or official guidelines..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              flex: 1,
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13.5,
              outline: 'none',
              color: '#0F172A',
            }}
          />
          <button
            type="submit"
            style={{
              background: 'var(--color-primary-600)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>Send</span>
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  )
}
