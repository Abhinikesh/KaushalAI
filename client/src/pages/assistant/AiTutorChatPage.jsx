import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bot } from 'lucide-react'
import { getLearningPath } from '../../api/learningPath.api'
import styles from './AiTutorPage.module.css'

export default function AiTutorChatPage() {
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'Hello Officer! I am your KaushalAI AI Learning Tutor. How can I assist you with your statistical competencies, NSSTA curriculum, or survey guidelines today?',
    },
  ])
  const [input, setInput] = useState('')

  const { data: lpData } = useQuery({
    queryKey: ['learningPath'],
    queryFn: getLearningPath,
  })

  const topGaps = lpData?.gapAnalysis?.gaps?.slice(0, 4) || []
  const prompts = [
    topGaps[0] ? `Explain the core principles of ${topGaps[0].name}` : 'What is stratified sampling vs cluster sampling?',
    topGaps[1] ? `What courses address ${topGaps[1].name}?` : 'Explain data quality dimensions under NQAF',
    'How are consumer price index weights calculated?',
    'What are the key statistical registers maintained by MOSPI?',
  ]

  const handleSend = (textToSend) => {
    const q = textToSend || input
    if (!q.trim()) return

    const userMsg = { sender: 'user', text: q }
    const botReply = {
      sender: 'assistant',
      text: `AI Tutor is coming in a future update with live retrieval on MOSPI and iGOT courseware. For now, please explore your Recommended Learning tab for relevant courses covering "${q}".`,
    }

    setMessages((prev) => [...prev, userMsg, botReply])
    setInput('')
  }

  const clearChat = () => {
    setMessages([
      {
        sender: 'assistant',
        text: 'Conversation cleared. How else can I assist your statistical learning journey?',
      },
    ])
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link to="/ai-tutor" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', textDecoration: 'none', fontWeight: 600 }}>
              ← Assistant Overview
            </Link>
          </div>
          <h1 className={styles.title} style={{ marginTop: 4 }}>AI Tutor Conversation</h1>
          <p className={styles.subtitle}>
            Interactive query assistant for official statistical manuals, sampling designs, and competency guidelines
          </p>
        </div>

        <button
          type="button"
          onClick={clearChat}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          Clear Chat
        </button>
      </div>

      <div className={styles.chatContainer} style={{ height: 560 }}>
        <div className={styles.chatMessages}>
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={m.sender === 'user' ? styles.userMsg : styles.assistantMsg}
            >
              {m.sender === 'assistant' && (
                <div className={styles.avatar}>
                  <Bot size={16} />
                </div>
              )}
              <div className={styles.bubble}>{m.text}</div>
            </div>
          ))}
        </div>

        <div className={styles.suggestionSection}>
          <span className={styles.suggestionLabel}>Prompt Library:</span>
          <div className={styles.chipRow}>
            {prompts.map((p, i) => (
              <button
                key={i}
                type="button"
                className={styles.chip}
                onClick={() => handleSend(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <form
          className={styles.inputBar}
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
        >
          <input
            type="text"
            className={styles.chatInput}
            placeholder="Ask a question on official statistics or curriculum..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className={styles.sendBtn}>
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
