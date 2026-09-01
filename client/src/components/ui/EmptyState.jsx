import Button from './Button'
import styles from './EmptyState.module.css'

export default function EmptyState({ icon = '📭', title, description, action, onAction }) {
  return (
    <div className={styles.wrap}>
      <span className={styles.icon}>{icon}</span>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  )
}
