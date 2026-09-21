import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Presentation,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import styles from './SlideViewer.module.css'

export default function SlideViewer({
  slides = [],
  courseTitle = 'Course Presentation',
  moduleTitle = '',
  onComplete,
  isCompleted = false,
}) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef(null)

  const totalSlides = slides.length
  const currentSlide = slides[currentIdx] || { title: 'No Slide Data', bulletPoints: [] }

  // Reset to first slide when slides prop changes
  useEffect(() => {
    setCurrentIdx(0)
  }, [slides])

  const goToPrev = useCallback(() => {
    setCurrentIdx((prev) => Math.max(0, prev - 1))
  }, [])

  const goToNext = useCallback(() => {
    setCurrentIdx((prev) => {
      const next = Math.min(totalSlides - 1, prev + 1)
      if (next === totalSlides - 1 && onComplete && !isCompleted) {
        // Optional completion trigger on reaching the end of the slide deck
      }
      return next
    })
  }, [totalSlides, onComplete, isCompleted])

  // Keyboard navigation: ArrowLeft and ArrowRight
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Avoid clashing when user is typing in inputs or search bars (e.g. ⌘K search)
      const target = e.target
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goToPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goToNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPrev, goToNext])

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  if (!slides || slides.length === 0) {
    return (
      <div className={styles.container} ref={containerRef}>
        <div style={{ margin: 'auto', textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
          <Presentation size={36} color="#6366f1" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
            No Presentation Slides Available
          </div>
          <p style={{ fontSize: '0.8125rem', marginTop: 4 }}>
            Slide content for this module is being prepared.
          </p>
        </div>
      </div>
    )
  }

  const isLastSlide = currentIdx === totalSlides - 1

  return (
    <div className={styles.container} ref={containerRef} tabIndex={0} aria-label="Slide Deck Presentation">
      {/* Top Header Bar */}
      <div className={styles.topBar}>
        <div className={styles.courseBadgeGroup}>
          <div className={styles.deckPill}>
            <Presentation size={13} /> Official Slide Deck
          </div>
          {moduleTitle && (
            <span className={styles.deckModuleTitle} title={moduleTitle}>
              {moduleTitle}
            </span>
          )}
        </div>

        <div className={styles.topRightControls}>
          <div className={styles.keyboardHint} title="Use Left and Right arrow keys on your keyboard">
            <kbd className={styles.kbdKey}>←</kbd>
            <kbd className={styles.kbdKey}>→</kbd>
            <span>Navigate</span>
          </div>

          <div className={styles.slideCounterBadge}>
            Slide {currentIdx + 1} of {totalSlides}
          </div>

          <button
            type="button"
            className={styles.fullScreenBtn}
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Main Slide Content Canvas */}
      <div key={currentIdx} className={styles.slideCanvas}>
        <div className={styles.slideTitleArea}>
          <span className={styles.slideNumberDisplay}>0{currentIdx + 1}</span>
          <h2 className={styles.slideHeading}>{currentSlide.title}</h2>
        </div>

        <ul className={styles.bulletList}>
          {(currentSlide.bulletPoints || []).map((bullet, idx) => (
            <li key={idx} className={styles.bulletItem}>
              <span className={styles.bulletMarker} />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom Controls Bar */}
      <div className={styles.bottomBar}>
        <button
          type="button"
          className={styles.navArrowBtn}
          onClick={goToPrev}
          disabled={currentIdx === 0}
          aria-label="Previous Slide"
        >
          <ChevronLeft size={16} /> Previous
        </button>

        {/* Center Dots Indicator */}
        <div className={styles.dotsContainer}>
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`${styles.dot} ${idx === currentIdx ? styles.dotActive : ''}`}
              onClick={() => setCurrentIdx(idx)}
              title={`Jump to Slide ${idx + 1}`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Right Button: Next or Complete */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isLastSlide ? (
            isCompleted ? (
              <div className={styles.completedBadge}>
                <CheckCircle2 size={14} /> Completed
              </div>
            ) : (
              <button
                type="button"
                className={styles.completeBtn}
                onClick={() => onComplete && onComplete()}
                aria-label="Mark Module Completed"
              >
                <CheckCircle2 size={15} /> Mark Complete
              </button>
            )
          ) : (
            <button
              type="button"
              className={styles.navArrowBtn}
              onClick={goToNext}
              aria-label="Next Slide"
            >
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
