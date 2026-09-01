import styles from './Card.module.css'

export default function Card({ children, padding = 'padded', hoverable = false, className = '', ...props }) {
  return (
    <div
      className={[styles.card, styles[padding], hoverable ? styles.hoverable : '', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

Card.Header = function CardHeader({ title, subtitle }) {
  return (
    <div className={styles.header}>
      <div className={styles.title}>{title}</div>
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
    </div>
  )
}

Card.Body = function CardBody({ children, className = '' }) {
  return <div className={`${styles.body} ${className}`}>{children}</div>
}

Card.Footer = function CardFooter({ children }) {
  return <div className={styles.footer}>{children}</div>
}
