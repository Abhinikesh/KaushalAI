import styles from './Skeleton.module.css'

export default function Skeleton({ width = '100%', height = '1rem', variant = 'rect', style = {} }) {
  return (
    <div
      className={`${styles.skeleton} ${styles[variant]}`}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  )
}

// Pre-built composition for a text block
Skeleton.Text = function SkeletonText({ lines = 3, lastWidth = '60%' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? lastWidth : '100%'}
          height="0.875rem"
        />
      ))}
    </div>
  )
}

Skeleton.Card = function SkeletonCard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.5rem', background: 'white', borderRadius: '0.75rem', border: '1px solid var(--color-border)' }}>
      <Skeleton width="40%" height="1rem" variant="title" />
      <Skeleton.Text lines={3} />
    </div>
  )
}
