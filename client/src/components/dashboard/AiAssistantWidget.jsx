import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Send } from 'lucide-react'
import styles from './AiAssistantWidget.module.css'

export default function AiAssistantWidget({ gaps = [] }) {
  const { t } = useTranslation()
  const [response, setResponse] = useState(null)
  const [inputVal, setInputVal] = useState('')

  // Dynamically generate chips from top skill gaps
  const topGaps = gaps.slice(0, 3)
  const chips = [
    topGaps[0] ? `Explain ${topGaps[0].name}` : 'What is stratified sampling?',
    topGaps[1] ? `Explain ${topGaps[1].name} dimensions` : 'Explain data quality dimensions',
    'Generate 10 MCQs on Survey Design',
  ]

  const handleTrigger = (questionText) => {
    setResponse({
      question: questionText || inputVal,
      answer:
        'AI Tutor is coming in a future update — for now, check your Recommended Learning for courses covering this.',
    })
    setInputVal('')
  }

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t('dashboard.ai_assistant')}</h3>
        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Assistant</span>
      </div>

      {response ? (
        <div className={styles.placeholderMsg}>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            "{response.question}"
          </div>
          <div>{response.answer}</div>
        </div>
      ) : (
        <div className={styles.placeholderMsg}>
          {t('dashboard.ai_placeholder')}
        </div>
      )}

      <div className={styles.chipsContainer}>
        <span className={styles.chipsLabel}>{t('dashboard.suggested')}</span>
        {chips.map((chip, i) => (
          <button
            key={i}
            type="button"
            className={styles.chip}
            onClick={() => handleTrigger(chip)}
          >
            {chip}
          </button>
        ))}
      </div>

      <form
        className={styles.inputForm}
        onSubmit={(e) => {
          e.preventDefault()
          if (inputVal.trim()) handleTrigger(inputVal)
        }}
      >
        <input
          type="text"
          className={styles.input}
          placeholder={t('dashboard.type_question')}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
        />
        <button type="submit" className={styles.sendBtn} title="Send" aria-label="Send message">
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}
