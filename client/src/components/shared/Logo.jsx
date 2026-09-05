import React, { useState } from 'react'
import styles from './Logo.module.css'

/**
 * Logo — Official branded logo for KaushalAI
 * Features the official emblem mark (open book + rising citizen)
 * paired with the bold "KaushalAI" wordmark and "LEARN | GROW | SERVE INDIA" tagline.
 * Wide horizontal presentation in expanded panel, smoothly transitions to centered icon badge when sidebar is collapsed.
 *
 * @param {boolean} collapsed - True when sidebar is collapsed (72px)
 * @param {string} className - Optional wrapper class
 */
export default function Logo({
  collapsed = false,
  className = '',
  ...props
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <div
      className={[
        styles.logoWrapper,
        collapsed ? styles.collapsed : styles.expanded,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {/* ── Official Emblem Mark Badge ── */}
      <div className={styles.markBadge} title="KaushalAI">
        {!imgError ? (
          <img
            src="/kaushal-logo.jpg"
            alt="KaushalAI Emblem"
            className={styles.markImg}
            onError={() => setImgError(true)}
          />
        ) : (
          <svg
            className={styles.brandMarkSvg}
            width={28}
            height={28}
            viewBox="0 0 40 40"
            fill="none"
          >
            <rect x="5" y="6" width="6.5" height="28" rx="3.25" fill="#1E3A8A" />
            <path d="M17.5 19.5L29.2 7.8C30.2 6.8 31.8 7.5 31.8 8.9V11.2C31.8 12.1 31.4 13 30.7 13.7L22.2 22.2L17.5 19.5Z" fill="#F97316" />
            <path d="M18 20.5L30.5 33C31.5 34 30.8 35.7 29.4 35.7H27.1C26.2 35.7 25.3 35.3 24.7 34.7L15 25L18 20.5Z" fill="#10B981" />
            <circle cx="20" cy="20" r="3" fill="#ffffff" stroke="#1E3A8A" strokeWidth="2" />
          </svg>
        )}
      </div>

      {/* ── Brand Typography Lockup (Expanded State) ── */}
      <div className={styles.brandText}>
        <div className={styles.brandTitle}>
          <span className={styles.brandKaushal}>Kaushal</span>
          <span className={styles.brandAi}>AI</span>
        </div>
        <div className={styles.brandTagline}>
          <span>LEARN</span>
          <span className={styles.taglineSep}>|</span>
          <span>GROW</span>
          <span className={styles.taglineSep}>|</span>
          <span>SERVE INDIA</span>
        </div>
      </div>
    </div>
  )
}

