import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Award,
  Flame,
  Target,
  BarChart3,
  Code2,
  Landmark,
  Check,
  Lock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react'
import { getMyAchievements } from '../../api/achievement.api'
import styles from './AchievementsPage.module.css'

const ICON_MAP = {
  Target,
  BarChart3,
  Code2,
  Flame,
  Award,
  Landmark
}

export default function AchievementsPage() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['myAchievements'],
    queryFn: getMyAchievements
  })

  const summary = data?.summary || {
    total_achievements: 6,
    unlocked_count: 0,
    completed_courses: 0,
    passed_assessments: 0,
    verified_competencies: 0,
    active_learning_days: 0
  }

  const achievements = data?.achievements || []

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumb & Header ────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbActive}>Achievements</span>
          </nav>
          <h1 className={styles.title}>Achievements &amp; Badges</h1>
          <p className={styles.subtitle}>
            Verified competency mastery milestones, learning progression, and cadre honours.
          </p>
        </div>
      </div>

      {/* ── Error Banner ───────────────────────────────────── */}
      {isError && (
        <div className={styles.errorBanner} role="alert">
          <div className={styles.errorBannerContent}>
            <AlertCircle size={18} />
            <span>
              Unable to load achievements: {error?.message || 'Database connection error'}.
            </span>
          </div>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => refetch()}
          >
            <RefreshCw size={13} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* ── Top 4 KPI Metrics Cards ────────────────────────── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#EFF6FF', color: '#2563EB' }}>
            <Award size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Badges Unlocked</span>
            <span className={styles.kpiValue}>
              {isLoading ? '—' : `${summary.unlocked_count} of ${summary.total_achievements}`}
            </span>
            <span className={styles.kpiSub}>Official honours</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#ECFDF5', color: '#10B981' }}>
            <BookOpen size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Completed Courses</span>
            <span className={styles.kpiValue}>
              {isLoading ? '—' : summary.completed_courses}
            </span>
            <span className={styles.kpiSub}>Verified completions</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#FAF5FF', color: '#8B5CF6' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Passed Evaluations</span>
            <span className={styles.kpiValue}>
              {isLoading ? '—' : summary.passed_assessments}
            </span>
            <span className={styles.kpiSub}>Official assessments passed</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#FFF7ED', color: '#F97316' }}>
            <Sparkles size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Verified Competencies</span>
            <span className={styles.kpiValue}>
              {isLoading ? '—' : summary.verified_competencies}
            </span>
            <span className={styles.kpiSub}>Assessed framework skills</span>
          </div>
        </div>
      </div>

      {/* ── Badges Grid ────────────────────────────────────── */}
      {isLoading ? (
        <div className={styles.badgesGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={`${styles.badgeCard} ${styles.skeletonPulse}`}
              style={{ minHeight: 240 }}
            />
          ))}
        </div>
      ) : achievements.length === 0 ? (
        <div className={styles.stateContainer}>
          <Award size={48} style={{ color: '#94a3b8', strokeWidth: 1.5 }} />
          <h2 className={styles.stateTitle}>No Achievements Available</h2>
          <p className={styles.stateSubtitle}>
            Complete training modules, pass cadre assessments, and verify competency levels to unlock official honours.
          </p>
        </div>
      ) : (
        <div className={styles.badgesGrid}>
          {achievements.map((badge) => {
            const IconComponent = ICON_MAP[badge.icon] || Award
            const isEarned = Boolean(badge.unlocked)

            return (
              <div key={badge.id} className={styles.badgeCard}>
                <span className={styles.badgeCategory}>{badge.category}</span>

                <div
                  className={styles.badgeIconBig}
                  style={{
                    background: badge.bg,
                    color: badge.color,
                    opacity: isEarned ? 1 : 0.45,
                  }}
                >
                  <IconComponent size={28} />
                </div>

                <h3 className={styles.badgeTitle}>{badge.title}</h3>
                <p className={styles.badgeDesc}>{badge.desc}</p>

                {/* Progress bar */}
                <div className={styles.progressContainer}>
                  <div className={styles.progressText}>
                    <span>Progress</span>
                    <span>{badge.current} / {badge.target}</span>
                  </div>
                  <div className={styles.progressBarWrap}>
                    <div
                      className={styles.progressBarFill}
                      style={{
                        width: `${badge.progress_percent}%`,
                        background: isEarned ? badge.color : '#94a3b8'
                      }}
                    />
                  </div>
                </div>

                {/* Status pill & evidence */}
                {isEarned ? (
                  <>
                    <span className={styles.earnedPill}>
                      <Check size={12} />
                      <span>Unlocked &amp; Verified</span>
                    </span>
                    {badge.evidence && (
                      <span className={styles.badgeEvidence}>{badge.evidence}</span>
                    )}
                    {badge.unlocked_at && (
                      <span className={styles.unlockedAtText}>
                        Unlocked on {new Date(badge.unlocked_at).toLocaleDateString()}
                      </span>
                    )}
                  </>
                ) : (
                  <span className={styles.lockedPill}>
                    <Lock size={12} />
                    <span>Locked ({badge.progress_percent}%)</span>
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
