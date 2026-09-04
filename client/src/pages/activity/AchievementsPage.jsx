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
  CheckCircle2,
  Check,
  Lock,
  Sparkles,
  TrendingUp,
  Layers,
  BookOpen
} from 'lucide-react'
import { getMyQuizAttempts } from '../../api/quiz.api'
import { getMyEnrollments } from '../../api/course.api'
import styles from './AchievementsPage.module.css'

export default function AchievementsPage() {
  const { data: attemptsData } = useQuery({ queryKey: ['myAttempts'], queryFn: getMyQuizAttempts })
  const { data: enrollData } = useQuery({ queryKey: ['myEnrollments'], queryFn: getMyEnrollments })

  const attempts = attemptsData?.attempts || []
  const enrollments = enrollData?.enrollments || []

  const badges = [
    {
      id: 'b-01',
      title: 'First Assessment Ace',
      desc: 'Achieved 70%+ score on an official statistical cadre assessment.',
      icon: Target,
      color: '#2563EB',
      bg: '#EFF6FF',
      earned: true,
      category: 'Excellence',
    },
    {
      id: 'b-02',
      title: 'Survey Methodologist',
      desc: 'Enrolled in and engaged with at least 2 official statistical capacity modules.',
      icon: BarChart3,
      color: '#10B981',
      bg: '#ECFDF5',
      earned: true,
      category: 'Domain Skill',
    },
    {
      id: 'b-03',
      title: 'Statistical Analyst',
      desc: 'Completed at least 3 separate assessment attempts with verified audit logs.',
      icon: Code2,
      color: '#8B5CF6',
      bg: '#FAF5FF',
      earned: true,
      category: 'Technical',
    },
    {
      id: 'b-04',
      title: 'Active Learning Scholar',
      desc: 'Engaged in capacity building across multiple distinct calendar days.',
      icon: Flame,
      color: '#F97316',
      bg: '#FFF7ED',
      earned: true,
      category: 'Consistency',
    },
    {
      id: 'b-05',
      title: 'Distinction Scholar',
      desc: 'Achieved a distinction score of 90%+ on any official evaluation.',
      icon: Award,
      color: '#E11D48',
      bg: '#FFF1F2',
      earned: true,
      category: 'Mastery',
    },
    {
      id: 'b-06',
      title: 'Grandmaster of Statistics',
      desc: 'Achieved Level 5 Expert status across 4 or more core competency domains.',
      icon: Landmark,
      color: '#64748B',
      bg: '#F1F5F9',
      earned: false,
      category: 'Leadership',
    },
  ]

  const earnedCount = badges.filter((b) => b.earned).length

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
            Gamified skill progression, competency mastery milestones, and cadre learning streaks.
          </p>
        </div>
      </div>

      {/* ── Top 4 KPI Metrics Cards ────────────────────────── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#EFF6FF', color: '#2563EB' }}>
            <Award size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Badges Unlocked</span>
            <span className={styles.kpiValue}>{earnedCount} of {badges.length}</span>
            <span className={styles.kpiSub}>Official honours</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#FFF7ED', color: '#F97316' }}>
            <Flame size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Learning Streak</span>
            <span className={styles.kpiValue}>5 Days</span>
            <span className={styles.kpiSub}>Active continuous learning</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#ECFDF5', color: '#10B981' }}>
            <TrendingUp size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Total Points (XP)</span>
            <span className={styles.kpiValue}>2,450 XP</span>
            <span className={styles.kpiSub}>Rank #14 in division</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#FAF5FF', color: '#8B5CF6' }}>
            <Sparkles size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Cadre Standing</span>
            <span className={styles.kpiValue} style={{ fontSize: 18 }}>Distinction</span>
            <span className={styles.kpiSub}>Top 10% benchmark</span>
          </div>
        </div>
      </div>

      {/* ── Badges Grid ────────────────────────────────────── */}
      <div className={styles.badgesGrid}>
        {badges.map((badge) => {
          const IconComponent = badge.icon
          return (
            <div key={badge.id} className={styles.badgeCard}>
              <div
                className={styles.badgeIconBig}
                style={{
                  background: badge.bg,
                  color: badge.color,
                  opacity: badge.earned ? 1 : 0.45,
                }}
              >
                <IconComponent size={28} />
              </div>

              <h3 className={styles.badgeTitle}>{badge.title}</h3>
              <p className={styles.badgeDesc}>{badge.desc}</p>

              {badge.earned ? (
                <span className={styles.earnedPill}>
                  <Check size={12} />
                  <span>Unlocked &amp; Verified</span>
                </span>
              ) : (
                <span className={styles.lockedPill}>
                  <Lock size={12} />
                  <span>Locked Milestone</span>
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
