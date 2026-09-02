import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getLearningPath } from '../../api/learningPath.api'
import styles from './AiTutorPage.module.css'

export default function AiTutorPage() {
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'Namaste! I am your KaushalAI Learning Assistant. You can ask me questions about your statistical competencies, curriculum, or role expectations.',
    },
  ])
  const [input, setInput] = useState('')

  const { data: lpData } = useQuery({
    queryKey: ['learningPath'],
    queryFn: getLearningPath,
  })

  const topGaps = lpData?.gapAnalysis?.gaps?.slice(0, 3) || []
  const suggestedChips = [
    topGaps[0] ? `Explain ${topGaps[0].name}` : 'What is stratified sampling?',
    topGaps[1] ? `How do I improve in ${topGaps[1].name}?` : 'Explain data quality dimensions',
    'Generate 10 MCQs on official statistics',
  ]

  const handleSend = (textToSend) => {
    const query = textToSend || input
    if (!query.trim()) return

    setMessages((prev) => [
      ...prev,
      { sender: 'user', text: query },
      {
        sender: 'assistant',
        text: 'AI Tutor is coming in a future update — for now, check your Recommended Learning for courses covering this topic.',
      },
    ])
    setInput('')
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>AI Tutor &amp; Assistant</h1>
          <p className={styles.subtitle}>
            Conversational assistance for statistical methodologies, guidelines, and competency development
          </p>
        </div>
      </div>

      <div className={styles.chatContainer}>
        <div className={styles.chatMessages}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={m.sender === 'user' ? styles.userMsg : styles.assistantMsg}
            >
              {m.sender === 'assistant' && <div className={styles.avatar}>🤖</div>}
              <div className={styles.bubble}>{m.text}</div>
            </div>
          ))}
        </div>

        <div className={styles.suggestionSection}>
          <span className={styles.suggestionLabel}>Suggested Questions:</span>
          <div className={styles.chipRow}>
            {suggestedChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                className={styles.chip}
                onClick={() => handleSend(chip)}
              >
                {chip}
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
            placeholder="Type your question..."
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
