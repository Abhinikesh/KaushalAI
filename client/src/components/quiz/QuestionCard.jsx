import { BookOpen } from 'lucide-react'
import Badge from '../ui/Badge'
import styles from './QuestionCard.module.css'

const LETTERS = ['A', 'B', 'C', 'D']

/**
 * QuestionCard — renders one question with 4 selectable option cards.
 *
 * @param {Object}   question          - Question document
 * @param {number}   selectedIndex     - Currently selected option index (null = none)
 * @param {Function} onChange          - Called with the selected option index
 * @param {boolean}  revealMode        - After submission: shows correct/wrong state + explanation
 * @param {number}   correctIndex      - Correct option index (only used in revealMode)
 * @param {number}   questionNumber    - 1-based question number for display
 */
export default function QuestionCard({
  question,
  selectedIndex,
  onChange,
  revealMode = false,
  correctIndex,
  questionNumber,
}) {
  return (
    <div className={styles.card}>
      {questionNumber && (
        <div className={styles.questionMeta}>Question {questionNumber}</div>
      )}
      <p className={styles.questionText}>{question.questionText}</p>

      <div className={styles.options} role="listbox" aria-label="Answer options">
        {question.options.map((opt, i) => {
          const isSelected = selectedIndex === i
          const isCorrect  = revealMode && i === correctIndex
          const isWrong    = revealMode && isSelected && i !== correctIndex

          const cls = [
            styles.option,
            isSelected && !revealMode ? styles.optionSelected : '',
            revealMode && isCorrect   ? styles.optionCorrect  : '',
            revealMode && isWrong     ? styles.optionWrong    : '',
            revealMode                ? styles.disabled        : '',
          ].filter(Boolean).join(' ')

          return (
            <button
              key={i}
              role="option"
              aria-selected={isSelected}
              className={cls}
              onClick={() => !revealMode && onChange(i)}
            >
              <span className={styles.optionLetter}>{LETTERS[i]}</span>
              <span className={styles.optionText}>{opt}</span>
            </button>
          )
        })}
      </div>

      {revealMode && question.explanation && (
        <div className={styles.explanation}>
          <span className={styles.explanationLabel}>
            <BookOpen size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Official Explanation
          </span>
          {question.explanation}
        </div>
      )}
    </div>
  )
}
