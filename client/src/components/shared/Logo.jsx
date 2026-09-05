import React, { useState } from 'react'
import styles from './Logo.module.css'

/**
 * Logo — Official branded logo mark and wordmark for KaushalAI
 * Uses the official KaushalAI emblem (open book + rising citizen mark with Kaushal AI wordmark)
 * Supports full expanded logo and compact icon-only collapsed states.
 * 
 * @param {'sm'|'md'|'lg'} size - Overall display size
 * @param {boolean} collapsed - If true, only the mark is rendered (compact for collapsed sidebar)
 * @param {boolean} showWordmark - Controls visibility of the text wordmark
 * @param {string} className - Optional container styling
 */
export default function Logo({
  size = 'md',
  collapsed = false,
  showWordmark = true,
  className = '',
  ...props
}) {
  const [imgError, setImgError] = useState(false)
  const isCompact = collapsed || !showWordmark

  return (
    <div
      className={[
        styles.logoWrapper,
        styles[size],
        isCompact ? styles.collapsed : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {!imgError ? (
        isCompact ? (
          /* Collapsed state: Cropped focus on the iconic book/figure mark */
          <div className={styles.markCropWrapper}>
            <img
              src="/kaushal-logo.jpg"
              alt="KaushalAI Logo"
              className={styles.markCroppedImg}
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          /* Expanded state: Full official logo */
          <div className={styles.fullLogoWrapper}>
            <img
              src="/kaushal-logo.jpg"
              alt="KaushalAI — Learn | Grow | Serve India"
              className={styles.fullLogoImg}
              onError={() => setImgError(true)}
            />
          </div>
        )
      ) : (
        /* High-fidelity SVG Fallback if image unavailable */
        <div className={styles.svgFallback}>
          <svg
            className={styles.brandMark}
            width={isCompact ? 32 : 36}
            height={isCompact ? 32 : 36}
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="5" y="6" width="6.5" height="28" rx="3.25" fill="#1E3A8A" />
            <path d="M17.5 19.5L29.2 7.8C30.2 6.8 31.8 7.5 31.8 8.9V11.2C31.8 12.1 31.4 13 30.7 13.7L22.2 22.2L17.5 19.5Z" fill="#F97316" />
            <path d="M18 20.5L30.5 33C31.5 34 30.8 35.7 29.4 35.7H27.1C26.2 35.7 25.3 35.3 24.7 34.7L15 25L18 20.5Z" fill="#10B981" />
            <circle cx="20" cy="20" r="3" fill="#ffffff" stroke="#1E3A8A" strokeWidth="2" />
          </svg>
          {!isCompact && (
            <span className={styles.wordmark}>
              <span className={styles.wordmarkMain}>Kaushal</span>
              <span className={styles.wordmarkAi}>AI</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
