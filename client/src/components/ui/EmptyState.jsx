import { Inbox } from 'lucide-react'
import Button from './Button'
import styles from './EmptyState.module.css'

export default function EmptyState({ icon: IconComponent = Inbox, title, description, action, onAction }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.icon}>
        {typeof IconComponent === 'function' ? (
          <IconComponent size={36} color="var(--color-text-tertiary)" />
        ) : (
          <Inbox size={36} color="var(--color-text-tertiary)" />
        )}
      </div>
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
