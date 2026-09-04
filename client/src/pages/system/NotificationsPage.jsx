import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  CheckCircle2,
  FileQuestion,
  BookOpen,
  Award,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react'
import { getMyNotifications, markNotificationRead, markAllNotificationsRead } from '../../api/userFeatures.api'
import styles from './NotificationsPage.module.css'

const DEFAULT_NOTIFICATIONS = [
  {
    _id: 'notif-01',
    type: 'assessment',
    title: 'New Assessment Assigned: Survey Design & Sampling Methods',
    message: 'A mandatory cadre competency evaluation has been assigned to your profile by the Training Division.',
    time: '2 hours ago',
    isRead: false,
    link: '/quizzes/quiz-stat-methods-01',
    linkText: 'Take Assessment',
  },
  {
    _id: 'notif-02',
    type: 'course',
    title: 'New iGOT Recommendation Available',
    message: 'Based on your recent skill gap evaluation, "Data Analysis with Python" has been added to your learning path.',
    time: 'Yesterday, 10:30 AM',
    isRead: false,
    link: '/my-learning',
    linkText: 'View Learning Path',
  },
  {
    _id: 'notif-03',
    type: 'achievement',
    title: 'Certificate Issued: NQAF Data Quality Standards',
    message: 'Congratulations! Your official compliance certificate has been verified and registered.',
    time: '2 days ago',
    isRead: true,
    link: '/certificates',
    linkText: 'View Certificate',
  },
  {
    _id: 'notif-04',
    type: 'system',
    title: 'NSSTA Annual Training Calendar 2026-27 Released',
    message: 'The National Statistical Systems Training Academy has published the residential workshop schedule.',
    time: '3 days ago',
    isRead: true,
    link: '/training/nssta',
    linkText: 'Explore Calendar',
  },
]

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('All Notifications')
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS)
  const queryClient = useQueryClient()

  // Real backend query
  const { data } = useQuery({
    queryKey: ['myNotifications'],
    queryFn: getMyNotifications,
  })

  // Merge real notifications if available
  const notifList = useMemo(() => {
    const apiNotifs = (data?.notifications || []).map((n) => ({
      _id: String(n._id),
      type: n.type || 'system',
      title: n.title,
      message: n.message,
      time: n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recently',
      isRead: Boolean(n.isRead),
      link: n.link || '/dashboard',
      linkText: 'View Details',
    }))

    const merged = [...notifications]
    apiNotifs.forEach((an) => {
      if (!merged.some((m) => m._id === an._id)) {
        merged.unshift(an)
      }
    })
    return merged
  }, [data, notifications])

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myNotifications'] })
    },
  })

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    markAllMutation.mutate()
  }

  const filteredNotifs = useMemo(() => {
    return notifList.filter((n) => {
      if (activeTab === 'Assessments' && n.type !== 'assessment') return false
      if (activeTab === 'Courses' && n.type !== 'course') return false
      if (activeTab === 'Unread' && n.isRead) return false
      return true
    })
  }, [notifList, activeTab])

  const unreadCount = notifList.filter((n) => !n.isRead).length

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumb & Header ────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbActive}>Notifications</span>
          </nav>
          <h1 className={styles.title}>Notification Center</h1>
          <p className={styles.subtitle}>
            Official alerts for recommendation updates, assessment assignments, and competency progression.
          </p>
        </div>

        {unreadCount > 0 && (
          <button type="button" className={styles.markAllBtn} onClick={handleMarkAllRead}>
            <Check size={14} />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* ── Tabs Bar ───────────────────────────────────────── */}
      <div className={styles.tabsContainer}>
        {['All Notifications', 'Assessments', 'Courses', 'Unread'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tabItem} ${activeTab === tab ? styles.tabItemActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab} {tab === 'Unread' && unreadCount > 0 ? `(${unreadCount})` : ''}
          </button>
        ))}
      </div>

      {/* ── Notifications List ─────────────────────────────── */}
      <div className={styles.notifList}>
        {filteredNotifs.map((notif) => (
          <div
            key={notif._id}
            className={`${styles.notifCard} ${!notif.isRead ? styles.unreadCard : ''}`}
          >
            <div
              className={styles.iconWrap}
              style={{
                background: notif.type === 'assessment' ? '#EFF6FF' : notif.type === 'course' ? '#ECFDF5' : '#FAF5FF',
                color: notif.type === 'assessment' ? '#2563EB' : notif.type === 'course' ? '#10B981' : '#8B5CF6',
              }}
            >
              {notif.type === 'assessment' ? (
                <FileQuestion size={18} />
              ) : notif.type === 'course' ? (
                <BookOpen size={18} />
              ) : (
                <Sparkles size={18} />
              )}
            </div>

            <div className={styles.notifContent}>
              <div className={styles.notifHeader}>
                <span className={styles.notifTitle}>{notif.title}</span>
                <span className={styles.notifTime}>{notif.time}</span>
              </div>
              <p className={styles.notifMessage}>{notif.message}</p>
              {notif.link && (
                <Link to={notif.link} className={styles.notifLink}>
                  <span>{notif.linkText || 'View Details'}</span>
                  <ArrowRight size={12} />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
