import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  RotateCcw,
  Camera,
  Check,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  Calendar,
  UserCheck,
  Clock,
  Laptop,
  Download,
  Power,
  Trash2,
  Lock,
  Bell,
  HelpCircle,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  X,
  Smartphone,
  Globe,
  Palette,
  Layers,
  Sparkles,
  Bot,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { getMe, updateProfile } from '../../api/auth.api'
import { updatePreferences } from '../../api/userFeatures.api'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n/index.js'
import styles from './SettingsPage.module.css'

export default function SettingsPage() {
  const { user: authUser, setAuth, accessToken } = useAuthStore()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('account') // 'account' | 'preferences' | 'notifications' | 'privacy' | 'appearance' | 'integrations'

  // Profile fields
  const [profileForm, setProfileForm] = useState({
    name: 'Amit Verma',
    email: 'amit.verma@mospi.gov.in',
    employeeId: 'STAT/2020/05678',
    designation: 'Statistical Officer',
    department: 'National Statistics Office',
    phone: '+91 98765 43210',
    avatarUrl: '',
  })

  // Password fields
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Language & Region fields
  const [regionalForm, setRegionalForm] = useState({
    language: i18n.language || 'en',
    timeZone: '(GMT+05:30) Asia/Kolkata',
    dateFormat: 'DD MMM YYYY (19 May 2026)',
  })

  // Email notification preferences
  const [emailPrefs, setEmailPrefs] = useState({
    courseRecommendations: true,
    assessmentNotifications: true,
    certificatesAchievements: true,
    systemUpdates: true,
    promotionalEmails: false,
  })

  // Appearance & Learning preferences
  const [appearanceForm, setAppearanceForm] = useState({
    theme: 'Light',
    fontSize: 'Default (14px)',
    highContrast: false,
    autoPlayVideo: true,
    downloadQuality: 'High Definition (1080p)',
    aiTutorVoice: 'Friendly & Formal',
  })

  // State flags & feedbacks
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingRegional, setSavingRegional] = useState(false)
  const [savingEmailPrefs, setSavingEmailPrefs] = useState(false)

  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Modals state
  const [twoFactorModal, setTwoFactorModal] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')

  const [sessionsModal, setSessionsModal] = useState(false)
  const [activeSessionsList, setActiveSessionsList] = useState([
    { id: 1, device: 'Chrome on macOS (Current)', location: 'New Delhi, India', ip: '14.139.60.2', current: true },
    { id: 2, device: 'Safari on iPhone 15 Pro', location: 'New Delhi, India', ip: '103.24.188.4', current: false },
  ])

  const [storageModal, setStorageModal] = useState(false)
  const [deactivateModal, setDeactivateModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)

  // Sync auth store
  useEffect(() => {
    let isMounted = true
    getMe()
      .then((data) => {
        if (!isMounted) return
        const u = data.user || authUser
        if (u) {
          setProfileForm({
            name: u.name || 'Amit Verma',
            email: u.email || 'amit.verma@mospi.gov.in',
            employeeId: u.employeeId || 'STAT/2020/05678',
            designation: u.designation || 'Statistical Officer',
            department: u.department || 'National Statistics Office',
            phone: u.phone || '+91 98765 43210',
            avatarUrl: u.avatarUrl || '',
          })

          if (u.preferences) {
            if (u.preferences.regional) {
              setRegionalForm((prev) => ({ ...prev, ...u.preferences.regional }))
            }
            if (u.preferences.email) {
              setEmailPrefs((prev) => ({ ...prev, ...u.preferences.email }))
            }
            if (u.preferences.appearance) {
              setAppearanceForm((prev) => ({ ...prev, ...u.preferences.appearance }))
            }
            if (u.preferences.twoFactorEnabled !== undefined) {
              setTwoFactorEnabled(!!u.preferences.twoFactorEnabled)
            }
          }
        }
      })
      .catch(() => {
        if (authUser) {
          setProfileForm((prev) => ({
            ...prev,
            name: authUser.name || prev.name,
            email: authUser.email || prev.email,
            employeeId: authUser.employeeId || prev.employeeId,
            designation: authUser.designation || prev.designation,
            department: authUser.department || prev.department,
            phone: authUser.phone || prev.phone,
          }))
        }
      })

    return () => {
      isMounted = false
    }
  }, [authUser])

  const showToast = (msg, isErr = false) => {
    if (isErr) {
      setErrorMsg(msg)
      setSuccessMsg('')
    } else {
      setSuccessMsg(msg)
      setErrorMsg('')
    }
    setTimeout(() => {
      setSuccessMsg('')
      setErrorMsg('')
    }, 4000)
  }

  // ── Save Profile Information ──────────────────────────────────────────────
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const res = await updateProfile({
        name: profileForm.name,
        designation: profileForm.designation,
        department: profileForm.department,
        phone: profileForm.phone,
      })
      if (res.user) {
        setAuth(res.user, accessToken)
      }
      showToast('Profile information successfully saved to your official record.')
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update profile information.', true)
    } finally {
      setSavingProfile(false)
    }
  }

  // ── Change Password ───────────────────────────────────────────────────────
  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (!passwordForm.newPassword) {
      showToast('Please enter a new password.', true)
      return
    }
    if (passwordForm.newPassword.length < 8) {
      showToast('New password must be at least 8 characters long.', true)
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('New password and confirm password do not match.', true)
      return
    }

    setSavingPassword(true)
    try {
      await updateProfile({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      showToast('Your official password has been successfully updated.')
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update password. Check your current password.', true)
    } finally {
      setSavingPassword(false)
    }
  }

  // ── Save Regional Preferences ─────────────────────────────────────────────
  const handleSaveRegional = async () => {
    setSavingRegional(true)
    try {
      const updated = {
        ...authUser?.preferences,
        regional: regionalForm,
      }
      const res = await updatePreferences(updated)
      if (res.user) {
        setAuth(res.user, accessToken)
      }
      showToast('Language & regional preferences updated.')
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save regional preferences.', true)
    } finally {
      setSavingRegional(false)
    }
  }

  // ── Save Email Preferences ────────────────────────────────────────────────
  const handleSaveEmailPrefs = async () => {
    setSavingEmailPrefs(true)
    try {
      const updated = {
        ...authUser?.preferences,
        email: emailPrefs,
      }
      const res = await updatePreferences(updated)
      if (res.user) {
        setAuth(res.user, accessToken)
      }
      showToast('Email preferences updated successfully.')
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save email preferences.', true)
    } finally {
      setSavingEmailPrefs(false)
    }
  }

  // ── Reset to Default ──────────────────────────────────────────────────────
  const handleResetToDefault = async () => {
    if (window.confirm('Reset all application preferences to platform defaults?')) {
      const defaultRegional = {
        language: 'English',
        timeZone: '(GMT+05:30) Asia/Kolkata',
        dateFormat: 'DD MMM YYYY (19 May 2026)',
      }
      const defaultEmail = {
        courseRecommendations: true,
        assessmentNotifications: true,
        certificatesAchievements: true,
        systemUpdates: true,
        promotionalEmails: false,
      }
      setRegionalForm(defaultRegional)
      setEmailPrefs(defaultEmail)
      try {
        await updatePreferences({
          regional: defaultRegional,
          email: defaultEmail,
        })
        showToast('All preferences have been restored to platform defaults.')
      } catch {
        showToast('Reset applied locally.')
      }
    }
  }

  // ── Download My Data (Real JSON file export) ───────────────────────────────
  const handleDownloadData = () => {
    const dataObj = {
      exportTimestamp: new Date().toISOString(),
      platform: 'KaushalAI MoSPI Learning System',
      officer: {
        ...profileForm,
        accountRole: authUser?.role || 'Learner',
        memberSince: '15 Jan 2020',
      },
      preferences: {
        regional: regionalForm,
        email: emailPrefs,
        appearance: appearanceForm,
      },
      security: {
        twoFactorActive: twoFactorEnabled,
        lastLogin: '19 May 2026, 09:15 AM',
      },
    }

    const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `KaushalAI_Officer_Data_${profileForm.employeeId.replace(/[^a-zA-Z0-9]/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Your comprehensive account dossier has been downloaded.')
  }

  // ── Revoke Session ────────────────────────────────────────────────────────
  const handleRevokeSession = (sessionId) => {
    setActiveSessionsList((prev) => prev.filter((s) => s.id !== sessionId))
    showToast('Device session terminated.')
  }

  // ── Confirm 2FA ───────────────────────────────────────────────────────────
  const handleVerify2FA = async () => {
    if (twoFactorCode.trim().length !== 6) {
      showToast('Please enter a 6-digit verification code.', true)
      return
    }
    const newStatus = !twoFactorEnabled
    setTwoFactorEnabled(newStatus)
    setTwoFactorModal(false)
    setTwoFactorCode('')
    try {
      await updatePreferences({
        ...authUser?.preferences,
        twoFactorEnabled: newStatus,
      })
      showToast(newStatus ? 'Two-Factor Authentication is now enabled!' : 'Two-Factor Authentication has been disabled.')
    } catch {
      showToast('2FA status updated.')
    }
  }

  const memberSince = authUser?.createdAt
    ? new Date(authUser.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '15 Jan 2020'

  return (
    <div className={styles.container}>
      {/* ── Breadcrumb ── */}
      <div className={styles.breadcrumb}>
        <Link to="/dashboard">{t('settings.breadcrumb_dashboard')}</Link>
        <ChevronRight size={14} />
        <span>{t('settings.page_title')}</span>
      </div>

      {/* ── Header Row ── */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>{t('settings.page_title')}</h1>
          <p className={styles.pageSubtitle}>
            {t('settings.page_subtitle')}
          </p>
        </div>
        <button type="button" className={styles.resetBtn} onClick={handleResetToDefault}>
          <RotateCcw size={14} />
          <span>{t('settings.reset_to_default')}</span>
        </button>
      </div>

      {/* ── Feedback Alerts ── */}
      {successMsg && (
        <div className={styles.alertSuccess}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className={styles.alertError}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Navigation Tabs ── */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'account' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('account')}
        >
          {t('settings.tab_account')}
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'preferences' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          {t('settings.tab_preferences')}
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'notifications' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          {t('settings.tab_notifications')}
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'privacy' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('privacy')}
        >
          {t('settings.tab_privacy')}
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'appearance' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('appearance')}
        >
          {t('settings.tab_appearance')}
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'integrations' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('integrations')}
        >
          {t('settings.tab_integrations')}
        </button>
      </div>

      {/* ── TAB 1: ACCOUNT (MAIN MOCKUP VIEW) ── */}
      {activeTab === 'account' && (
        <div className={styles.mainColumn}>
              {/* Card 1: Profile Information */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{t('settings.profile_info_title')}</h2>
                  <p className={styles.cardSubtitle}>
                    {t('settings.profile_info_subtitle')}
                  </p>
                </div>

                <div className={styles.avatarSection}>
                  <div className={styles.avatarWrapper}>
                    <img
                      src="/avatars/avatar-rahul.jpg"
                      alt={profileForm.name}
                      className={styles.avatarImg}
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          profileForm.name
                        )}&background=4f46e5&color=fff&size=150`
                      }}
                    />
                    <button
                      type="button"
                      className={styles.cameraBadge}
                      title="Change Profile Photo"
                      onClick={() => {
                        const newName = prompt('Enter image URL for avatar:', profileForm.avatarUrl)
                        if (newName !== null) {
                          setProfileForm((p) => ({ ...p, avatarUrl: newName }))
                          showToast('Profile image updated.')
                        }
                      }}
                    >
                      <Camera size={13} />
                    </button>
                  </div>
                  <div>
                    <span className={styles.avatarHint}>.JPG, PNG or GIF. Max size 2MB.</span>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>{t('settings.full_name')}</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>{t('settings.email_address')}</label>
                      <input
                        type="email"
                        className={styles.formInput}
                        value={profileForm.email}
                        disabled
                        title="Official email address is managed via MoSPI directory"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>{t('settings.employee_id')}</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={profileForm.employeeId}
                        disabled
                        title="Employee ID assigned by cadre administration"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>{t('settings.designation')}</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={profileForm.designation}
                        onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>{t('settings.department')}</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={profileForm.department}
                        onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>{t('settings.phone_number')}</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className={styles.cardFooter} style={{ marginTop: 18 }}>
                    <button type="submit" className={styles.saveBtn} disabled={savingProfile}>
                    {savingProfile ? t('settings.saving') : t('settings.save_changes')}
                    </button>
                  </div>
                </form>
              </div>

              {/* Card 2: Change Password */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{t('settings.change_password_title')}</h2>
                  <p className={styles.cardSubtitle}>
                    {t('settings.change_password_subtitle')}
                  </p>
                </div>

                <form onSubmit={handleUpdatePassword}>
                  <div className={styles.passwordRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>{t('settings.current_password')}</label>
                      <div className={styles.passwordInputWrapper}>
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          className={styles.formInput}
                          placeholder="Enter current password"
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        />
                        <button
                          type="button"
                          className={styles.eyeBtn}
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>{t('settings.new_password')}</label>
                      <div className={styles.passwordInputWrapper}>
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          className={styles.formInput}
                          placeholder="Enter new password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        />
                        <button
                          type="button"
                          className={styles.eyeBtn}
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>{t('settings.confirm_new_password')}</label>
                      <div className={styles.passwordInputWrapper}>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          className={styles.formInput}
                          placeholder="Confirm new password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        />
                        <button
                          type="button"
                          className={styles.eyeBtn}
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <button type="submit" className={styles.updatePasswordBtn} disabled={savingPassword}>
                      {savingPassword ? t('settings.updating') : t('settings.update_password')}
                    </button>
                  </div>
                </form>
              </div>

              {/* Card 3: Language & Region */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{t('settings.language_region_title')}</h2>
                  <p className={styles.cardSubtitle}>
                    {t('settings.language_region_subtitle')}
                  </p>
                </div>

                <div className={styles.langGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>{t('settings.language')}</label>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setRegionalForm((prev) => ({ ...prev, language: 'en' }))
                          i18n.changeLanguage('en')
                        }}
                        style={{
                          flex: 1,
                          padding: '7px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          border: '1px solid',
                          borderColor: (i18n.language === 'en' || regionalForm.language === 'en') ? 'var(--color-primary-600, #4f46e5)' : 'var(--color-border, #e2e8f0)',
                          background: (i18n.language === 'en' || regionalForm.language === 'en') ? 'var(--color-primary-50, #EEF2FF)' : 'var(--color-surface, #ffffff)',
                          color: (i18n.language === 'en' || regionalForm.language === 'en') ? 'var(--color-primary-700, #4338ca)' : 'var(--color-text-secondary, #64748b)',
                          fontWeight: (i18n.language === 'en' || regionalForm.language === 'en') ? 600 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRegionalForm((prev) => ({ ...prev, language: 'hi' }))
                          i18n.changeLanguage('hi')
                        }}
                        style={{
                          flex: 1,
                          padding: '7px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          border: '1px solid',
                          borderColor: (i18n.language === 'hi' || regionalForm.language === 'hi') ? 'var(--color-primary-600, #4f46e5)' : 'var(--color-border, #e2e8f0)',
                          background: (i18n.language === 'hi' || regionalForm.language === 'hi') ? 'var(--color-primary-50, #EEF2FF)' : 'var(--color-surface, #ffffff)',
                          color: (i18n.language === 'hi' || regionalForm.language === 'hi') ? 'var(--color-primary-700, #4338ca)' : 'var(--color-text-secondary, #64748b)',
                          fontWeight: (i18n.language === 'hi' || regionalForm.language === 'hi') ? 600 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        हिन्दी (Hindi)
                      </button>
                    </div>
                    <select
                      className={styles.formSelect}
                      value={regionalForm.language}
                      onChange={(e) => {
                        const lang = e.target.value
                        setRegionalForm({ ...regionalForm, language: lang })
                        i18n.changeLanguage(lang)
                      }}
                    >
                      <option value="en">English</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                      <option value="বাংলা">বাংলা (Bengali)</option>
                      <option value="தமிழ்">தமிழ் (Tamil)</option>
                      <option value="मराठी">मराठी (Marathi)</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>{t('settings.time_zone')}</label>
                    <select
                      className={styles.formSelect}
                      value={regionalForm.timeZone}
                      onChange={(e) => setRegionalForm({ ...regionalForm, timeZone: e.target.value })}
                    >
                      <option value="(GMT+05:30) Asia/Kolkata">(GMT+05:30) Asia/Kolkata</option>
                      <option value="(GMT+00:00) UTC">(GMT+00:00) UTC</option>
                      <option value="(GMT+05:00) Asia/Karachi">(GMT+05:00) Asia/Karachi</option>
                      <option value="(GMT+08:00) Asia/Singapore">(GMT+08:00) Asia/Singapore</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>{t('settings.date_format')}</label>
                    <select
                      className={styles.formSelect}
                      value={regionalForm.dateFormat}
                      onChange={(e) => setRegionalForm({ ...regionalForm, dateFormat: e.target.value })}
                    >
                      <option value="DD MMM YYYY (19 May 2026)">DD MMM YYYY (19 May 2026)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (2026-05-19)</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY (19/05/2026)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (05/19/2026)</option>
                    </select>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <button
                    type="button"
                    className={styles.saveBtn}
                    onClick={handleSaveRegional}
                    disabled={savingRegional}
                  >
                    {savingRegional ? t('settings.saving') : t('settings.save_preferences')}
                  </button>
                </div>
              </div>

            </div>
      )}

      {/* ── TAB 2: PREFERENCES ── */}
      {activeTab === 'preferences' && (
        <div className={styles.mainColumn}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Learning Experience &amp; AI Preferences</h2>
              <p className={styles.cardSubtitle}>Configure your adaptive tutoring and curriculum defaults.</p>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Weekly Learning Commitment</label>
                <select className={styles.formSelect} defaultValue="4 Hours / Week">
                  <option>2 Hours / Week (Light)</option>
                  <option>4 Hours / Week (Standard MoSPI Requirement)</option>
                  <option>6 Hours / Week (Intensive Cadre Upskilling)</option>
                  <option>8+ Hours / Week (Exam / Promotion Preparation)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>AI Tutor Explanation Level</label>
                <select className={styles.formSelect} defaultValue="Analytical & Official">
                  <option>Intuitive &amp; Visual (Beginner)</option>
                  <option>Analytical &amp; Official (Standard)</option>
                  <option>Deep Mathematical &amp; Rigorous (Advanced)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Automatic Enrolment in Mandatory Cadre Courses</label>
                <select className={styles.formSelect} defaultValue="Auto-enroll with notifications">
                  <option>Auto-enroll with notifications</option>
                  <option>Prompt for manual confirmation</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Preferred Learning Media</label>
                <select className={styles.formSelect} defaultValue="Interactive Quizzes & Case Studies">
                  <option>Official Documentation &amp; Gazettes</option>
                  <option>Video Lectures &amp; Webinars</option>
                  <option>Interactive Quizzes &amp; Case Studies</option>
                  <option>Audio Summaries &amp; Micro-lessons</option>
                </select>
              </div>
            </div>

            <div className={styles.cardFooter}>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={() => showToast('Learning preferences saved.')}
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: NOTIFICATIONS ── */}
      {activeTab === 'notifications' && (
        <div className={styles.mainColumn}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Communication Channels &amp; Alerts</h2>
              <p className={styles.cardSubtitle}>Set how you receive critical cadre broadcasts and quiz deadlines.</p>
            </div>

            <div className={styles.checkboxList}>
              <label className={styles.checkboxItem}>
                <div className={`${styles.customCheckbox} ${styles.checked}`}>
                  <Check size={13} strokeWidth={3} />
                </div>
                <div>
                  <strong>Official MoSPI In-App Notifications</strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Urgent notifications pinned in your portal topbar</div>
                </div>
              </label>

              <label className={styles.checkboxItem}>
                <div className={`${styles.customCheckbox} ${styles.checked}`}>
                  <Check size={13} strokeWidth={3} />
                </div>
                <div>
                  <strong>Registered Email Alerts</strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Weekly digests and official evaluation call letters</div>
                </div>
              </label>

              <label className={styles.checkboxItem}>
                <div className={`${styles.customCheckbox} ${styles.checked}`}>
                  <Check size={13} strokeWidth={3} />
                </div>
                <div>
                  <strong>Browser Desktop Push Notifications</strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Real-time alerts when new batch seats open</div>
                </div>
              </label>
            </div>

            <div className={styles.cardFooter}>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={() => showToast('Notification channels updated.')}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: PRIVACY & SECURITY ── */}
      {activeTab === 'privacy' && (
        <div className={styles.mainColumn}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Security Controls &amp; Authentication</h2>
              <p className={styles.cardSubtitle}>Two-factor authentication, active login credentials and session control.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f8fafc', borderRadius: 12 }}>
                <div>
                  <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>Two-Factor Authentication (2FA)</strong>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                    {twoFactorEnabled ? 'Active and protecting your account with TOTP authenticator app.' : 'Add an extra layer of security using Google Authenticator or SMS OTP.'}
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.outlineActionBtn}
                  style={{ width: 'auto' }}
                  onClick={() => setTwoFactorModal(true)}
                >
                  {twoFactorEnabled ? 'Manage 2FA' : 'Enable 2FA'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f8fafc', borderRadius: 12 }}>
                <div>
                  <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>Active Login Sessions</strong>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                    Currently logged into {activeSessionsList.length} device(s) across official networks.
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.outlineActionBtn}
                  style={{ width: 'auto' }}
                  onClick={() => setSessionsModal(true)}
                >
                  View Sessions
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f8fafc', borderRadius: 12 }}>
                <div>
                  <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>Data Download &amp; Portability</strong>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                    Export your complete training dossier, competency evaluations, and certificates as compliant JSON.
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={handleDownloadData}
                >
                  Export Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: APPEARANCE ── */}
      {activeTab === 'appearance' && (
        <div className={styles.mainColumn}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Display &amp; Accessibility Themes</h2>
              <p className={styles.cardSubtitle}>Customize contrast, font scaling, and workspace layout.</p>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Interface Theme</label>
                <select
                  className={styles.formSelect}
                  value={appearanceForm.theme}
                  onChange={(e) => setAppearanceForm({ ...appearanceForm, theme: e.target.value })}
                >
                  <option value="Light">Light (Official MoSPI Portal)</option>
                  <option value="Dark">Dark Mode</option>
                  <option value="System">System Default</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Font Scale</label>
                <select
                  className={styles.formSelect}
                  value={appearanceForm.fontSize}
                  onChange={(e) => setAppearanceForm({ ...appearanceForm, fontSize: e.target.value })}
                >
                  <option value="Compact (12px)">Compact (12px)</option>
                  <option value="Default (14px)">Default (14px)</option>
                  <option value="Comfortable (16px)">Comfortable (16px)</option>
                  <option value="Large (18px)">Large Accessibility (18px)</option>
                </select>
              </div>
            </div>

            <div className={styles.cardFooter}>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={() => showToast('Display preferences applied.')}
              >
                Save Appearance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: INTEGRATIONS ── */}
      {activeTab === 'integrations' && (
        <div className={styles.mainColumn}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Government Gateways &amp; Linked Services</h2>
              <p className={styles.cardSubtitle}>Sync credentials with iGOT Karmayogi and national repository backbones.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Globe size={24} color="#4f46e5" />
                  <div>
                    <strong style={{ fontSize: '0.9375rem', color: '#0f172a' }}>iGOT Karmayogi National Gateway</strong>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Connected • Bidirectional course enrollment &amp; credit points sync</div>
                  </div>
                </div>
                <span className={styles.verifiedBadge}>Connected</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Sparkles size={24} color="#10b981" />
                  <div>
                    <strong style={{ fontSize: '0.9375rem', color: '#0f172a' }}>DigiLocker Credential Repository</strong>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Linked • Automatic issuance of digitally signed MoSPI certificates</div>
                  </div>
                </div>
                <span className={styles.verifiedBadge}>Linked</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: 2FA SETUP ── */}
      {twoFactorModal && (
        <div className={styles.modalOverlay} onClick={() => setTwoFactorModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {twoFactorEnabled ? 'Two-Factor Authentication Active' : 'Setup Two-Factor Authentication'}
              </h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setTwoFactorModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {twoFactorEnabled ? (
                <div>
                  <p>
                    Two-Factor Authentication is currently <strong>ENABLED</strong> for your account. Every sign-in requires an official TOTP code.
                  </p>
                  <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                    If you disable 2FA, your account will only be protected by your password.
                  </p>
                </div>
              ) : (
                <>
                  <p>
                    Scan this QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, or Parichay Auth):
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                    <div style={{ width: 160, height: 160, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                      <Smartphone size={36} color="#4f46e5" />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>TOTP: KAUSHAL-AI</span>
                    </div>
                  </div>
                  <div>
                    <label className={styles.formLabel}>Enter 6-digit Code from Authenticator</label>
                    <input
                      type="text"
                      maxLength={6}
                      className={styles.formInput}
                      placeholder="000000"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                      style={{ letterSpacing: '0.25em', textAlign: 'center', fontSize: '1.25rem', fontWeight: 700 }}
                    />
                  </div>
                </>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={() => setTwoFactorModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleVerify2FA}
              >
                {twoFactorEnabled ? 'Disable 2FA' : 'Verify & Enable'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: MANAGE SESSIONS ── */}
      {sessionsModal && (
        <div className={styles.modalOverlay} onClick={() => setSessionsModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Active Device Sessions</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setSessionsModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
                Devices currently authenticated into KaushalAI. You can terminate any unrecognized session immediately.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeSessionsList.map((session) => (
                  <div
                    key={session.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      background: '#f8fafc',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
                        {session.device} {session.current && <span style={{ color: '#059669', fontSize: '0.75rem' }}>(Active Now)</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {session.location} • IP: {session.ip}
                      </div>
                    </div>

                    {!session.current && (
                      <button
                        type="button"
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          color: '#dc2626',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        onClick={() => handleRevokeSession(session.id)}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={() => setSessionsModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: MANAGE STORAGE ── */}
      {storageModal && (
        <div className={styles.modalOverlay} onClick={() => setStorageModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Local &amp; Cloud Storage Breakdown</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setStorageModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span>Downloaded Course Modules &amp; PDFs</span>
                  <strong>72 MB</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span>Offline Assessments &amp; Questions</span>
                  <strong>28 MB</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span>Digitally Signed Certificates</span>
                  <strong>20 MB</strong>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem', fontWeight: 700 }}>
                  <span>Total Allocated Storage</span>
                  <span>120 MB / 1,024 MB (12%)</span>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={() => {
                  showToast('Temporary offline caches cleared.')
                  setStorageModal(false)
                }}
              >
                Clear Offline Cache
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={() => setStorageModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DEACTIVATE ACCOUNT ── */}
      {deactivateModal && (
        <div className={styles.modalOverlay} onClick={() => setDeactivateModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle} style={{ color: '#d97706' }}>Deactivate Account</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setDeactivateModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p>
                Deactivating temporarily suspends your learning profile and pauses automatic assessment invitations. Your training history and certificate records remain securely archived under MoSPI governance.
              </p>
              <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                To reactivate, simply sign back in using your registered government email or SSO credentials.
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={() => setDeactivateModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                style={{ background: '#d97706' }}
                onClick={() => {
                  setDeactivateModal(false)
                  showToast('Account deactivation request logged.')
                }}
              >
                Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE ACCOUNT ── */}
      {deleteModal && (
        <div className={styles.modalOverlay} onClick={() => setDeleteModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle} style={{ color: '#dc2626' }}>Delete Official Account</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setDeleteModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p>
                Permanent account deletion requires cadre officer sign-off. If you proceed, your personalized recommendations, study notes, and bookmarks will be permanently deleted.
              </p>
              <p style={{ fontSize: '0.8125rem', color: '#dc2626', fontWeight: 600 }}>
                Note: Verified training certificates and statutory competency evaluations remain permanently archived in compliance with Ministry audit regulations.
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={() => setDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                style={{ background: '#dc2626' }}
                onClick={() => {
                  setDeleteModal(false)
                  showToast('Deletion request submitted to Cadre Administration for audit clearance.')
                }}
              >
                Request Deletion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
