import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Edit3,
  User,
  Briefcase,
  GraduationCap,
  Clock,
  Settings,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Camera,
  CheckCircle2,
  BadgeCheck,
  PhoneCall,
  Shield,
  BarChart3,
  Building,
  Award,
  BookOpen,
  Lock,
  X,
  Check,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { getMe, updateProfile } from '../../api/auth.api'
import Skeleton from '../../components/ui/Skeleton'
import styles from './MyProfilePage.module.css'

export default function MyProfilePage() {
  const { user: authUser } = useAuthStore()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('personal') // 'personal' | 'professional' | 'education' | 'experience' | 'preferences'
  
  // Password modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  // Avatar modal state
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [avatarInput, setAvatarInput] = useState('')

  useEffect(() => {
    let mounted = true
    getMe()
      .then((data) => {
        if (!mounted) return
        setProfile(data.user || authUser)
      })
      .catch(() => {
        if (!mounted) return
        setProfile(authUser)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [authUser])

  const user = profile || authUser

  // Fallback data matching official MoSPI Officer Profile reference
  const name           = user?.name || 'Rahul Kumar'
  const designation    = user?.designation || 'Statistical Officer'
  const department     = user?.department || 'National Statistics Office (NSO)'
  const email          = user?.email || 'rahul.kumar@stats.gov.in'
  const personalEmail  = user?.personalEmail || 'rahul.official@gmail.com'
  const phone          = user?.phone || '+91 98765 43210'
  const employeeId     = user?.employeeId || 'MOSPI23456'
  const workLocation   = user?.workLocation || 'New Delhi, India'
  const dateOfBirth    = user?.dateOfBirth || '15 March 1990'
  const gender         = user?.gender || 'Male'
  const nationality    = user?.nationality || 'Indian'
  const aadhaarMasked  = user?.aadhaarMasked || 'XXXX XXXX 5678'
  const address        = user?.address || 'C-123, Sector 15, Rohini, New Delhi - 110085, India'
  const gradeLevel     = user?.gradeLevel || 'Level 10'
  const dateOfJoining  = user?.dateOfJoining || '12 August 2016'
  const reportingTo    = user?.reportingTo || 'Deputy Director (Statistics)'
  const completionPct  = user?.profileCompletion || 85
  const areasOfWork    = Array.isArray(user?.areasOfWork) && user.areasOfWork.length > 0
    ? user.areasOfWork
    : ['Data Collection', 'Statistical Analysis', 'Survey Design', 'Data Quality Assurance', 'Report Preparation', 'Dissemination']
  
  const emergencyContact = user?.emergencyContact || {
    contactPerson: 'Suresh Kumar (Father)',
    relationship: 'Father',
    phone: '+91 98765 43211',
  }

  const accountCreated = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : '10 May 2024'
  
  const lastLogin = '02 June 2026, 09:15 AM'

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    setSavingPassword(true)
    setPasswordError('')
    try {
      await updateProfile({ password: newPassword })
      setPasswordSuccess('Password updated successfully.')
      setTimeout(() => {
        setPasswordModalOpen(false)
        setPasswordSuccess('')
        setNewPassword('')
        setConfirmPassword('')
      }, 1200)
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to update password.')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleAvatarSave = async () => {
    if (!avatarInput.trim()) return
    try {
      const res = await updateProfile({ avatarUrl: avatarInput.trim() })
      setProfile(res.user)
      setAvatarModalOpen(false)
    } catch {
      // fallback
      setAvatarModalOpen(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <Skeleton.Card />
        <Skeleton.Card />
      </div>
    )
  }

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumb ── */}
      <div className={styles.breadcrumb}>
        <Link to="/dashboard" className={styles.breadcrumbLink}>
          Dashboard
        </Link>
        <span>&gt;</span>
        <span className={styles.breadcrumbCurrent}>My Profile</span>
      </div>

      {/* ── Page Header ── */}
      <div className={styles.pageHeaderRow}>
        <div>
          <h1 className={styles.pageTitle}>My Profile</h1>
          <p className={styles.pageSubtitle}>
            View and manage your personal and professional information
          </p>
        </div>

        <Link to="/profile/edit" className={styles.editProfileBtn}>
          <Edit3 size={15} />
          Edit Profile
        </Link>
      </div>

      {/* ── Hero Officer Card ── */}
      <section className={styles.heroCard}>
        <div className={styles.heroLeft}>
          <div className={styles.avatarWrap}>
            <img
              src={user?.avatarUrl || "/avatars/rahul_kumar.jpg"}
              alt={name}
              className={styles.avatarImg}
              onError={(e) => {
                e.target.style.display = 'none'
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'
              }}
            />
            <div className={styles.avatarFallback} style={{ display: 'none' }}>{initials}</div>
            <button
              type="button"
              className={styles.cameraBadge}
              onClick={() => setAvatarModalOpen(true)}
              title="Change profile photo"
              aria-label="Change profile photo"
            >
              <Camera size={14} />
            </button>
          </div>

          <div className={styles.heroDetails}>
            <div className={styles.nameRow}>
              <span className={styles.officerName}>{name}</span>
              <span className={styles.verifiedBadge} title="Verified MoSPI Officer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L14.7 4.9L18.6 4.7L19.4 8.6L23 10.2L21.7 13.9L23.4 17.5L19.7 18.9L18.6 22.7L14.7 22.2L12 24.8L9.3 22.2L5.4 22.7L4.3 18.9L0.6 17.5L2.3 13.9L1 10.2L4.6 8.6L5.4 4.7L9.3 4.9L12 2Z" fill="#2563eb" />
                  <path d="M8.5 12.2L11 14.7L16 9.7" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>

            <div className={styles.officerDesignation}>{designation}</div>
            <div className={styles.officerDept}>{department}</div>
            <div className={styles.officerMinistry}>
              Ministry of Statistics &amp; Programme Implementation (MoSPI)
            </div>

            <div className={styles.heroMetaGrid}>
              <div className={styles.heroMetaItem}>
                <Mail size={15} className={styles.heroMetaIcon} />
                <span>{email}</span>
              </div>
              <div className={styles.heroMetaItem}>
                <Phone size={15} className={styles.heroMetaIcon} />
                <span>{phone}</span>
              </div>
              <div className={styles.heroMetaItem}>
                <MapPin size={15} className={styles.heroMetaIcon} />
                <span>{workLocation}</span>
              </div>
              <div className={styles.heroMetaItem}>
                <CreditCard size={15} className={styles.heroMetaIcon} />
                <span>Employee ID: {employeeId}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Completion Card */}
        <div className={styles.completionCard}>
          <div className={styles.completionTop}>
            <div className={styles.completionGauge}>
              <svg width="60" height="60" viewBox="0 0 40 40">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="#e2e8f0"
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="#4f46e5"
                  strokeWidth="4"
                  strokeDasharray="100.5"
                  strokeDashoffset={100.5 - (100.5 * completionPct) / 100}
                  strokeLinecap="round"
                  fill="none"
                  transform="rotate(-90 20 20)"
                />
              </svg>
              <div className={styles.completionPctText}>{completionPct}%</div>
            </div>

            <div className={styles.completionTextWrap}>
              <div className={styles.completionTitle}>Great! You&apos;re almost there.</div>
              <div className={styles.completionSub}>
                Complete your profile to get better recommendations.
              </div>
            </div>
          </div>

          <Link to="/profile/edit" className={styles.completeNowBtn}>
            Complete Now &rarr;
          </Link>
        </div>
      </section>

      {/* ── Navigation Tab Bar ── */}
      <nav className={styles.tabBar} aria-label="Profile Sections">
        <button
          type="button"
          className={`${styles.tabItem} ${activeTab === 'personal' ? styles.tabItemActive : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          <User size={16} />
          Personal Information
        </button>
        <button
          type="button"
          className={`${styles.tabItem} ${activeTab === 'professional' ? styles.tabItemActive : ''}`}
          onClick={() => setActiveTab('professional')}
        >
          <Briefcase size={16} />
          Professional Details
        </button>
        <button
          type="button"
          className={`${styles.tabItem} ${activeTab === 'education' ? styles.tabItemActive : ''}`}
          onClick={() => setActiveTab('education')}
        >
          <GraduationCap size={16} />
          Education
        </button>
        <button
          type="button"
          className={`${styles.tabItem} ${activeTab === 'experience' ? styles.tabItemActive : ''}`}
          onClick={() => setActiveTab('experience')}
        >
          <Clock size={16} />
          Experience
        </button>
        <button
          type="button"
          className={`${styles.tabItem} ${activeTab === 'preferences' ? styles.tabItemActive : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <Settings size={16} />
          Preferences
        </button>
      </nav>

      {/* ── TAB 1: Personal Information ── */}
      {activeTab === 'personal' && (
        <div className={styles.infoGrid}>
          {/* Left Stack */}
          <div className={styles.colStack}>
            {/* 1. Personal Information Card */}
            <div className={styles.card}>
              <div className={styles.cardHeaderRow}>
                <h2 className={styles.cardHeading}>Personal Information</h2>
              </div>

              <div className={styles.defList}>
                <div className={styles.defRow}>
                  <span className={styles.defLabel}>Full Name</span>
                  <span className={styles.defValue}>{name}</span>
                </div>
                <div className={styles.defRow}>
                  <span className={styles.defLabel}>Date of Birth</span>
                  <span className={styles.defValue}>{dateOfBirth}</span>
                </div>
                <div className={styles.defRow}>
                  <span className={styles.defLabel}>Gender</span>
                  <span className={styles.defValue}>{gender}</span>
                </div>
                <div className={styles.defRow}>
                  <span className={styles.defLabel}>Nationality</span>
                  <span className={styles.defValue}>{nationality}</span>
                </div>
                <div className={styles.defRow}>
                  <span className={styles.defLabel}>Aadhaar Number</span>
                  <span className={styles.defValue}>{aadhaarMasked}</span>
                </div>
                <div className={styles.defRow}>
                  <span className={styles.defLabel}>Official Email ID</span>
                  <span className={styles.defValue}>{email}</span>
                </div>
                <div className={styles.defRow}>
                  <span className={styles.defLabel}>Personal Email</span>
                  <span className={styles.defValue}>{personalEmail}</span>
                </div>
                <div className={styles.defRow}>
                  <span className={styles.defLabel}>Phone Number</span>
                  <span className={styles.defValue}>{phone}</span>
                </div>
                <div className={styles.defRow}>
                  <span className={styles.defLabel}>Address</span>
                  <span className={styles.defValue}>{address}</span>
                </div>
              </div>
            </div>

            {/* 4. Emergency Contact Card */}
            <div className={styles.card}>
              <div className={styles.cardHeaderRow}>
                <h2 className={styles.cardHeading}>Emergency Contact</h2>
                <div className={`${styles.cardBadgeIcon} ${styles.badgeGreen}`}>
                  <PhoneCall size={18} />
                </div>
              </div>

              <div className={styles.defList}>
                <div className={styles.defRow}>
                  <span className={styles.defLabel}>Contact Person</span>
                  <span className={styles.defValue}>{emergencyContact.contactPerson}</span>
                </div>
                <div className={styles.defRow}>
                  <span className={styles.defLabel}>Relationship</span>
                  <span className={styles.defValue}>{emergencyContact.relationship}</span>
                </div>
                <div className={styles.defRow}>
                  <span className={styles.defLabel}>Phone Number</span>
                  <span className={styles.defValue}>{emergencyContact.phone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Stack */}
          <div className={styles.colStack}>
            {/* 2. Current Assignment Card */}
            <div className={styles.card}>
              <div className={styles.cardHeaderRow}>
                <h2 className={styles.cardHeading}>Current Assignment</h2>
                <div className={`${styles.cardBadgeIcon} ${styles.badgePurple}`}>
                  <Briefcase size={18} />
                </div>
              </div>

              <div className={styles.defList}>
                <div className={styles.defRow}>
                  <span className={styles.defLabel}>Department</span>
                  <span className={styles.defValue}>{department}</span>
                </div>
                <div className={styles.defRow}>
                  <span className={styles.defLabel}>Designation</span>
                  <span className={styles.defValue}>{designation}</span>
                </div>
                <div className={styles.defRow}>
                  <span className={styles.defLabel}>Grade / Level</span>
                  <span className={styles.defValue}>{gradeLevel}</span>
                </div>
                <div className={styles.defRow}>
                  <span className={styles.defLabel}>Date of Joining</span>
                  <span className={styles.defValue}>{dateOfJoining}</span>
                </div>
                <div className={styles.defRow}>
                  <span className={styles.defLabel}>Reporting To</span>
                  <span className={styles.defValue}>{reportingTo}</span>
                </div>
                <div className={styles.defRow}>
                  <span className={styles.defLabel}>Work Location</span>
                  <span className={styles.defValue}>{workLocation}</span>
                </div>
              </div>
            </div>

            {/* 3. Areas of Work Card */}
            <div className={styles.card}>
              <div className={styles.cardHeaderRow}>
                <h2 className={styles.cardHeading}>Areas of Work</h2>
                <div className={`${styles.cardBadgeIcon} ${styles.badgeBlue}`}>
                  <BarChart3 size={18} />
                </div>
              </div>

              <div className={styles.pillsWrap}>
                {areasOfWork.map((area, idx) => {
                  const isPurple = idx % 2 === 0
                  return (
                    <span
                      key={area}
                      className={isPurple ? styles.pillPurple : styles.pillGreen}
                    >
                      {area}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* 5. Account Information Card */}
            <div className={styles.card}>
              <div className={styles.cardHeaderRow}>
                <h2 className={styles.cardHeading}>Account Information</h2>
                <div className={`${styles.cardBadgeIcon} ${styles.badgeAmber}`}>
                  <Shield size={18} />
                </div>
              </div>

              <div className={styles.defList}>
                <div className={styles.defRow}>
                  <span className={styles.defLabel}>Account Created</span>
                  <span className={styles.defValue}>{accountCreated}</span>
                </div>
                <div className={styles.defRow}>
                  <span className={styles.defLabel}>Last Login</span>
                  <span className={styles.defValue}>{lastLogin}</span>
                </div>
                <div className={styles.defRow}>
                  <span className={styles.defLabel}>Password</span>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className={styles.defValue}>••••••••</span>
                    <button
                      type="button"
                      className={styles.changePasswordLink}
                      onClick={() => setPasswordModalOpen(true)}
                    >
                      Change Password
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Professional Details ── */}
      {activeTab === 'professional' && (
        <div className={styles.infoGrid}>
          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardHeading}>Cadre &amp; Service Classification</h2>
              <div className={`${styles.cardBadgeIcon} ${styles.badgePurple}`}>
                <Building size={18} />
              </div>
            </div>
            <div className={styles.defList}>
              <div className={styles.defRow}>
                <span className={styles.defLabel}>Service Cadre</span>
                <span className={styles.defValue}>{user?.cadre || 'Indian Statistical Service (ISS)'}</span>
              </div>
              <div className={styles.defRow}>
                <span className={styles.defLabel}>Batch / Allotment Year</span>
                <span className={styles.defValue}>{user?.batch || '2016'}</span>
              </div>
              <div className={styles.defRow}>
                <span className={styles.defLabel}>Job Role Master</span>
                <span className={styles.defValue}>{user?.jobRoleId?.title || 'Statistical Officer (ROLE003)'}</span>
              </div>
              <div className={styles.defRow}>
                <span className={styles.defLabel}>Total Experience</span>
                <span className={styles.defValue}>{user?.experienceYears || 8} Years</span>
              </div>
              <div className={styles.defRow}>
                <span className={styles.defLabel}>Roster Status</span>
                <span className={styles.defValue} style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <BadgeCheck size={16} /> Verified Active Personnel
                </span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardHeading}>Key Official Mandates</h2>
              <div className={`${styles.cardBadgeIcon} ${styles.badgeBlue}`}>
                <Award size={18} />
              </div>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
              Leading field operations coordination, sampling design verification, and automated data pipeline quality assurance for the National Statistics Office.
            </p>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                Assigned Competency Frameworks:
              </div>
              <div className={styles.pillsWrap}>
                <span className={styles.pillBlue}>Sampling Theory (STAT-01)</span>
                <span className={styles.pillBlue}>National Accounts (STAT-03)</span>
                <span className={styles.pillPurple}>Data Quality &amp; Validation</span>
                <span className={styles.pillGreen}>Survey Logistics</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Education ── */}
      {activeTab === 'education' && (
        <div className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardHeading}>Academic &amp; Professional Qualifications</h2>
            <div className={`${styles.cardBadgeIcon} ${styles.badgeGreen}`}>
              <GraduationCap size={18} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>
                  Master of Science (M.Sc.) in Statistics
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '2px 10px', borderRadius: 12 }}>
                  2012 – 2014
                </span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 4 }}>
                University of Delhi · First Class with Distinction
              </div>
              <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: 6 }}>
                Specialization in Advanced Econometrics, Multivariate Analysis, and Sample Survey Methods.
              </div>
            </div>

            <div style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>
                  Bachelor of Science (B.Sc. Hons) in Mathematics
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '2px 10px', borderRadius: 12 }}>
                  2009 – 2012
                </span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 4 }}>
                St. Stephen&apos;s College, Delhi University
              </div>
            </div>

            <div style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>
                  NSSTA Advanced Statistical Certification (TPAC)
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '2px 10px', borderRadius: 12 }}>
                  Certified 2021
                </span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 4 }}>
                National Statistical Systems Training Academy, Greater Noida
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: Experience ── */}
      {activeTab === 'experience' && (
        <div className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardHeading}>Posting &amp; Deputation History</h2>
            <div className={`${styles.cardBadgeIcon} ${styles.badgePurple}`}>
              <Clock size={18} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>
                  Statistical Officer — National Accounts Division
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '2px 10px', borderRadius: 12 }}>
                  2020 – Present
                </span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 2 }}>
                Ministry of Statistics &amp; Programme Implementation, New Delhi
              </div>
              <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: 6 }}>
                Overseeing the compilation of quarterly Gross Domestic Product (GDP) estimates, input-output tables, and statistical cross-validation.
              </div>
            </div>

            <div style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>
                  Junior Statistical Officer — Field Operations Division (NSSO)
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569', background: '#f1f5f9', padding: '2px 10px', borderRadius: 12 }}>
                  2016 – 2020
                </span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 2 }}>
                National Sample Survey Office, Regional Office, Chandigarh
              </div>
              <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: 6 }}>
                Led primary data collection for the Periodic Labour Force Survey (PLFS) and Annual Survey of Industries (ASI).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: Preferences ── */}
      {activeTab === 'preferences' && (
        <div className={styles.infoGrid}>
          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardHeading}>Learning &amp; Training Preferences</h2>
              <div className={`${styles.cardBadgeIcon} ${styles.badgeBlue}`}>
                <BookOpen size={18} />
              </div>
            </div>
            <div className={styles.defList}>
              <div className={styles.defRow}>
                <span className={styles.defLabel}>Preferred Mode</span>
                <span className={styles.defValue}>Blended (Online iGOT + NSSTA In-Person)</span>
              </div>
              <div className={styles.defRow}>
                <span className={styles.defLabel}>Language</span>
                <span className={styles.defValue}>English &amp; Hindi (द्विभाषी)</span>
              </div>
              <div className={styles.defRow}>
                <span className={styles.defLabel}>Weekly Learning Goal</span>
                <span className={styles.defValue}>3.5 Hours / Week</span>
              </div>
              <div className={styles.defRow}>
                <span className={styles.defLabel}>AI Recommendations</span>
                <span className={styles.defValue} style={{ color: '#16a34a', fontWeight: 700 }}>Active</span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardHeading}>Notification Alerts</h2>
              <div className={`${styles.cardBadgeIcon} ${styles.badgePurple}`}>
                <Settings size={18} />
              </div>
            </div>
            <div className={styles.defList}>
              <div className={styles.defRow}>
                <span className={styles.defLabel}>New Assessment Alerts</span>
                <span className={styles.defValue}>Email &amp; In-App Notification</span>
              </div>
              <div className={styles.defRow}>
                <span className={styles.defLabel}>iGOT Progress Sync</span>
                <span className={styles.defValue}>Automatic (Daily at 00:00 IST)</span>
              </div>
              <div className={styles.defRow}>
                <span className={styles.defLabel}>NSSTA Batch Calls</span>
                <span className={styles.defValue}>Enabled</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Password Change Modal ── */}
      {passwordModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setPasswordModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Lock size={20} color="#4f46e5" />
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                  Update Official Password
                </h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setPasswordModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {passwordError && (
              <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, fontSize: '0.8125rem' }}>
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 8, fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={16} /> {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>New Password</label>
                <input
                  type="password"
                  style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                  placeholder="Min 8 chars, 1 number"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Confirm New Password</label>
                <input
                  type="password"
                  style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 8, fontSize: '0.875rem', cursor: 'pointer' }}
                  onClick={() => setPasswordModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  style={{ padding: '8px 18px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  {savingPassword ? 'Updating...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Avatar URL Change Modal ── */}
      {avatarModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setAvatarModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Camera size={20} color="#4f46e5" />
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                  Update Profile Photo
                </h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setAvatarModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
              Provide an official photo URL or public image link for your officer profile.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input
                type="url"
                style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                placeholder="https://example.com/officer-photo.jpg"
                value={avatarInput}
                onChange={(e) => setAvatarInput(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 8, fontSize: '0.875rem', cursor: 'pointer' }}
                onClick={() => setAvatarModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{ padding: '8px 18px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                onClick={handleAvatarSave}
              >
                Update Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
