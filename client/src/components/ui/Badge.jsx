import styles from './Badge.module.css'

export default function Badge({ children, variant = 'info', className = '' }) {
  return (
    <span className={[styles.badge, styles[variant], className].filter(Boolean).join(' ')}>
      {children}
    </span>
  )
}
