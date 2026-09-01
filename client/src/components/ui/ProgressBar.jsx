import styles from './ProgressBar.module.css'

export default function ProgressBar({
  value,          // current value
  max = 5,        // maximum value (default: 5-level scale)
  label,          // left label text
  sublabel,       // right label text (e.g. "3/5")
  severity,       // 'none'|'low'|'medium'|'high' — controls fill color
  size = 'md',    // 'sm'|'md'|'lg'
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={`${styles.wrap} ${styles[size]} ${severity ? styles[severity] : ''}`}>
      {(label || sublabel) && (
        <div className={styles.labelRow}>
          {label && <span>{label}</span>}
          {sublabel && <span>{sublabel}</span>}
        </div>
      )}
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%` }} role="progressbar" aria-valuenow={value} aria-valuemax={max} />
      </div>
    </div>
  )
}
