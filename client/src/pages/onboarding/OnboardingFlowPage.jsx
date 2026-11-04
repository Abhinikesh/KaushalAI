import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n/index.js'
import {
  Globe,
  Palette,
  Briefcase,
  Award,
  Clock,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Building,
  Target,
  FileCheck,
  BarChart3,
  Shield,
  Loader2,
  Check,
  ExternalLink,
  Sun,
  Moon,
  Info,
  Compass,
  TrendingUp,
  Database,
  ShieldCheck,
  FileText,
  Landmark,
  LineChart,
  Scale,
  Cpu,
  Building2,
  Search,
  X,
  RotateCcw,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useUiStore, COLOR_THEMES as THEME_IDS, APPEARANCE_MODES as MODE_IDS } from '../../store/uiStore'
import {
  getOnboardingState,
  getOnboardingOptions,
  saveOnboardingStep,
  completeOnboarding,
} from '../../api/onboarding.api'
import styles from './OnboardingFlowPage.module.css'

// ── 5 Official KaushalAI Themes ─────────────────────────────────────────────
const THEMES_CONFIG = [
  {
    id: 'abyss',
    label: 'Abyss Theme',
    nativeLabel: 'एबिस (इंडिगो)',
    desc: 'Deep Indigo & Classic Navy',
    swatches: ['#5b8dee', '#1e2235', '#2d3561'],
  },
  {
    id: 'cobalt',
    label: 'Cobalt Theme',
    nativeLabel: 'कोबाल्ट (गहरा नीला)',
    desc: 'High-Contrast Vivid Blue',
    swatches: ['#0088ff', '#1b4f72', '#0d1f2d'],
  },
  {
    id: 'classic',
    label: 'Classic Theme',
    nativeLabel: 'क्लासिक (आसमानी)',
    desc: 'Clean Sky Blue & Silver',
    swatches: ['#29aaff', '#ffffff', '#e5e9f0'],
  },
  {
    id: 'forest',
    label: 'Forest Theme',
    nativeLabel: 'फॉरेस्ट (हरा)',
    desc: 'Deep Forest Green & Nature',
    swatches: ['#1a6b3a', '#ffffff', '#e8f0ec'],
  },
  {
    id: 'onsen',
    label: 'Onsen Blue',
    nativeLabel: 'ऑनसेन (टकसाली टील)',
    desc: 'Mint Teal & Midnight Slate',
    swatches: ['#2cd3bf', '#0d1f2d', '#e8f4f3'],
  },
]

// ── 2 Supported Languages ───────────────────────────────────────────────────
const LANGUAGES_CONFIG = [
  {
    code: 'en',
    title: 'English',
    nativeLabel: 'English',
    flag: '🇬🇧',
    desc: 'Platform interface and training in English',
  },
  {
    code: 'hi',
    title: 'हिन्दी',
    nativeLabel: 'हिन्दी (Hindi)',
    flag: '🇮🇳',
    desc: 'प्लेटफ़ॉर्म इंटरफ़ेस और अध्ययन सामग्री हिंदी में',
  },
]

// ── 2 Appearance Modes ──────────────────────────────────────────────────────
const MODES_CONFIG = [
  {
    id: 'light',
    title: 'Light Mode',
    nativeTitle: 'लाइट मोड',
    desc: 'Clean, high-clarity government portal view',
    nativeDesc: 'मानक उच्च-स्पष्टता सरकारी पोर्टल दृश्य',
    icon: Sun,
  },
  {
    id: 'dark',
    title: 'Dark Mode',
    nativeTitle: 'डार्क मोड',
    desc: 'Reduced glare for comfortable prolonged study',
    nativeDesc: 'लंबे समय तक अध्ययन के लिए आंखों के अनुकूल',
    icon: Moon,
  },
]

// ── Professional Domain Icons Map ───────────────────────────────────────────
const INTEREST_ICONS = {
  Compass,
  TrendingUp,
  Database,
  ShieldCheck,
  BarChart3,
  FileText,
  Landmark,
  LineChart,
  Scale,
  Cpu,
  Globe,
  Building2,
  Target,
}

export default function OnboardingFlowPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, updateUser, accessToken, setAuth } = useAuthStore()
  const currentTheme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const currentMode = useUiStore((s) => s.appearanceMode)
  const setAppearanceMode = useUiStore((s) => s.setAppearanceMode)

  // ── 6 Onboarding Step Definitions ─────────────────────────────────────────
  const ONBOARDING_STEPS = [
    { number: 1, key: 'preferences', label: t('onboarding.steps.preferences', 'Preferences'), title: t('onboarding.step1.title', 'Learning Preferences'), icon: Globe },
    { number: 2, key: 'interests', label: t('onboarding.steps.interests', 'Interests'), title: 'Professional Interests', icon: Target },
    { number: 3, key: 'profile', label: t('onboarding.steps.profile', 'Profile'), title: 'Professional Profile', icon: Briefcase },
    { number: 4, key: 'skills', label: t('onboarding.steps.skills', 'Skills'), title: 'Skills to Develop', icon: Award },
    { number: 5, key: 'assessment', label: t('onboarding.steps.assessment', 'Assessment'), title: 'Competency Assessment', icon: FileCheck },
    { number: 6, key: 'results', label: t('onboarding.steps.results', 'Results'), title: 'Assessment Results', icon: BarChart3 },
  ]

  // Navigation & Step Control
  const [currentStep, setCurrentStep] = useState(1)
  const [maxAllowedStep, setMaxAllowedStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Reference Options from Backend
  const [options, setOptions] = useState({
    departments: [],
    roles: [],
    functional_areas: [],
    competencies: [],
    education_levels: [],
    common_certifications: [],
    responsibilities_options: [],
    available_interests: [],
    themes: THEMES_CONFIG,
    languages: LANGUAGES_CONFIG,
    appearance_modes: MODES_CONFIG,
  })

  // ── Step 1 Form States ────────────────────────────────────────────────────
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en')
  const [selectedTheme, setSelectedTheme] = useState(currentTheme || 'abyss')
  const [selectedAppearanceMode, setSelectedAppearanceMode] = useState(currentMode || 'light')

  // Step 2: Professional Interests
  const [selectedInterests, setSelectedInterests] = useState([])

  // Step 3: Professional Profile
  const [profileForm, setProfileForm] = useState({
    department_id: '',
    role_id: '',
    functional_area_id: '',
    experience_years: 2,
    education_level: "Bachelor's Degree",
    field_of_study: '',
    certifications: [],
    current_responsibilities: [],
  })

  const [derivedLevelInfo, setDerivedLevelInfo] = useState({
    level: 1,
    title: 'Support Staff (Level 1)',
    roleName: '',
    departmentName: '',
  })

  // Step 4: Skills to Develop
  const [selectedSkills, setSelectedSkills] = useState([])
  const [skillSearchQuery, setSkillSearchQuery] = useState('')
  const [skillCategoryFilter, setSkillCategoryFilter] = useState('all')

  // Step 5 & 6: Assessment metadata and attempt info
  const [latestAttempt, setLatestAttempt] = useState(null)

  // ── 1. Fetch Authoritative State on Mount ──────────────────────────────────
  const fetchStateAndOptions = async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const [stateRes, optionsRes] = await Promise.all([
        getOnboardingState(),
        getOnboardingOptions(),
      ])

      // If learner has already graduated, divert to dashboard immediately
      if (stateRes.onboarding_completed) {
        navigate('/dashboard', { replace: true })
        return
      }

      setOptions((prev) => ({
        ...prev,
        ...optionsRes,
        themes: optionsRes.themes?.length > 0 ? optionsRes.themes : THEMES_CONFIG,
        languages: optionsRes.languages?.length > 0 ? optionsRes.languages : LANGUAGES_CONFIG,
        appearance_modes: optionsRes.appearance_modes?.length > 0 ? optionsRes.appearance_modes : MODES_CONFIG,
      }))

      const backendStep = Math.min(6, Math.max(1, stateRes.onboarding_step || 1))
      setMaxAllowedStep(backendStep)
      setCurrentStep(backendStep)

      // Hydrate Step 1 Preferences from backend
      if (stateRes.preferences) {
        const lang = stateRes.preferences.language || 'en'
        const th = stateRes.preferences.theme || 'abyss'
        const mode = stateRes.preferences.appearanceMode || 'light'

        setSelectedLanguage(lang)
        setSelectedTheme(th)
        setSelectedAppearanceMode(mode)

        // Apply immediately
        i18n.changeLanguage(lang)
        setTheme(th)
        setAppearanceMode(mode)
      }

      // Hydrate Step 2
      if (Array.isArray(stateRes.learning_interests)) {
        setSelectedInterests(stateRes.learning_interests)
      }

      // Hydrate Step 3
      if (stateRes.profile) {
        const savedDeptId =
          stateRes.profile.department_id ||
          optionsRes.departments?.find((d) => d.name === stateRes.profile.department)?._id ||
          (optionsRes.departments?.[0]?._id || '')

        const defaultRoleId =
          optionsRes.roles?.find((r) => String(r.department_ref) === String(savedDeptId))?._id ||
          (optionsRes.roles?.[0]?._id || '')

        setProfileForm({
          department_id: savedDeptId,
          role_id: stateRes.profile.role_id || defaultRoleId,
          functional_area_id: stateRes.profile.functional_area_id || (optionsRes.functional_areas?.[0]?._id || ''),
          experience_years: stateRes.profile.experience_years ?? 2,
          education_level: stateRes.profile.education_level || (optionsRes.education_levels?.[3] || "Bachelor's Degree"),
          field_of_study: stateRes.profile.field_of_study || '',
          certifications: stateRes.profile.certifications || [],
          current_responsibilities: stateRes.profile.current_responsibilities || [],
        })
      }

      // Hydrate Step 4
      if (Array.isArray(stateRes.skills_to_develop)) {
        setSelectedSkills(stateRes.skills_to_develop.map((s) => String(s._id || s)))
      }

      // Hydrate Step 5 & 6
      if (stateRes.latest_attempt) {
        setLatestAttempt(stateRes.latest_attempt)
      }
    } catch (err) {
      console.error('Failed to load onboarding foundation:', err)
      setErrorMessage(
        err.response?.data?.message || 'Failed to connect to KaushalAI onboarding services. Please retry.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStateAndOptions()
  }, [])

  // ── 2. Derive Level Preview when Role Changes ──────────────────────────────
  useEffect(() => {
    if (profileForm.role_id && options.roles?.length > 0) {
      const selectedRole = options.roles.find((r) => r._id === profileForm.role_id)
      const selectedDept = options.departments.find((d) => d._id === profileForm.department_id)
      if (selectedRole) {
        const levelTitles = {
          1: 'Support Staff (Level 1)',
          2: 'Junior Assistant (Level 2)',
          3: 'Section Officer (Level 3)',
          4: 'Senior Officer (Level 4)',
          5: 'Department Head (Level 5)',
        }
        setDerivedLevelInfo({
          level: selectedRole.level,
          title: levelTitles[selectedRole.level] || `Level ${selectedRole.level}`,
          roleName: selectedRole.name,
          departmentName: selectedDept?.name || '',
        })
      }
    }
  }, [profileForm.role_id, profileForm.department_id, options.roles, options.departments])

  // ── Step 4 Recommendations and Filtering Mappings ─────────────────────────
  const recommendedSkillIds = React.useMemo(() => {
    if (!profileForm.role_id || !Array.isArray(options.role_competencies)) return new Set()
    const recs = options.role_competencies
      .filter((rc) => String(rc.role_id) === String(profileForm.role_id))
      .map((rc) => String(rc.competency_id))
    return new Set(recs)
  }, [profileForm.role_id, options.role_competencies])

  const interestAlignedSkillIds = React.useMemo(() => {
    if (!Array.isArray(selectedInterests) || selectedInterests.length === 0 || !Array.isArray(options.competencies)) {
      return new Set()
    }
    const matchingCategories = new Set()
    ;(options.available_interests || []).forEach((item) => {
      if (typeof item === 'object') {
        const isSelected = selectedInterests.some(
          (s) => s === item.id || s === item.name || (item.aliases && item.aliases.includes(s))
        )
        if (isSelected && item.category) {
          matchingCategories.add(item.category.toLowerCase())
        }
      }
    })

    const aligned = new Set()
    options.competencies.forEach((comp) => {
      if (comp.category && matchingCategories.has(comp.category.toLowerCase())) {
        aligned.add(String(comp._id))
      }
    })
    return aligned
  }, [selectedInterests, options.available_interests, options.competencies])

  const categoryCounts = React.useMemo(() => {
    const counts = {
      all: options.competencies?.length || 0,
      statistical: 0,
      technical: 0,
      digital_governance: 0,
      behavioural: 0,
    }
    ;(options.competencies || []).forEach((c) => {
      const cat = c.category?.toLowerCase()
      if (counts[cat] !== undefined) {
        counts[cat]++
      }
    })
    return counts
  }, [options.competencies])

  const filteredCompetencies = React.useMemo(() => {
    let list = (options.competencies || []).filter((comp) => {
      if (skillCategoryFilter !== 'all') {
        if (comp.category?.toLowerCase() !== skillCategoryFilter.toLowerCase()) {
          return false
        }
      }
      if (skillSearchQuery.trim()) {
        const q = skillSearchQuery.trim().toLowerCase()
        const nameMatch = comp.name?.toLowerCase().includes(q)
        const codeMatch = comp.competencyCode?.toLowerCase().includes(q)
        const descMatch = comp.description?.toLowerCase().includes(q)
        if (!nameMatch && !codeMatch && !descMatch) {
          return false
        }
      }
      return true
    })

    return list.sort((a, b) => {
      const aRec = recommendedSkillIds.has(String(a._id)) ? 1 : 0
      const bRec = recommendedSkillIds.has(String(b._id)) ? 1 : 0
      if (bRec !== aRec) return bRec - aRec

      const aAlign = interestAlignedSkillIds.has(String(a._id)) ? 1 : 0
      const bAlign = interestAlignedSkillIds.has(String(b._id)) ? 1 : 0
      if (bAlign !== aAlign) return bAlign - aAlign

      return (a.name || '').localeCompare(b.name || '')
    })
  }, [options.competencies, skillCategoryFilter, skillSearchQuery, recommendedSkillIds, interestAlignedSkillIds])

  // ── Step 3 Dependent Selector Handlers ────────────────────────────────────
  const handleDepartmentChange = (deptId) => {
    const deptRoles = (options.roles || []).filter((r) => String(r.department_ref) === String(deptId))
    const currentRole = (options.roles || []).find((r) => r._id === profileForm.role_id)
    const currentLevel = currentRole?.level || 1
    const matchingRole = deptRoles.find((r) => r.level === currentLevel) || deptRoles[0]

    setProfileForm((prev) => ({
      ...prev,
      department_id: deptId,
      role_id: matchingRole?._id || '',
    }))
  }

  // ── Step 1 Interactive Previews ───────────────────────────────────────────
  const handleLanguageSelect = (langCode) => {
    setSelectedLanguage(langCode)
    i18n.changeLanguage(langCode)
  }

  const handleThemeSelect = (themeId) => {
    setSelectedTheme(themeId)
    setTheme(themeId)
  }

  const handleAppearanceModeSelect = (modeId) => {
    setSelectedAppearanceMode(modeId)
    setAppearanceMode(modeId)
  }

  // ── Handler: Step Change with Boundary Validation ─────────────────────────
  const handleStepClick = (targetStep) => {
    if (targetStep <= maxAllowedStep) {
      setCurrentStep(targetStep)
      setErrorMessage('')
    }
  }

  // ── Handler: Step Navigation & Backend Persistence ────────────────────────
  const handleSaveAndContinue = async () => {
    if (saving) return
    setSaving(true)
    setErrorMessage('')
    try {
      let payload = {}

      if (currentStep === 1) {
        payload = {
          language: selectedLanguage,
          theme: selectedTheme,
          appearanceMode: selectedAppearanceMode,
        }
      } else if (currentStep === 2) {
        payload = { learning_interests: selectedInterests }
      } else if (currentStep === 3) {
        if (!profileForm.department_id) {
          setErrorMessage(t('onboarding.step3.errors.department_required', 'Please select your ministry department.'))
          setSaving(false)
          return
        }
        if (!profileForm.role_id) {
          setErrorMessage(t('onboarding.step3.errors.role_required', 'Please select your official job role.'))
          setSaving(false)
          return
        }
        if (!profileForm.functional_area_id) {
          setErrorMessage(t('onboarding.step3.errors.functional_area_required', 'Please select your functional area.'))
          setSaving(false)
          return
        }
        if (
          profileForm.experience_years === '' ||
          Number(profileForm.experience_years) < 0 ||
          Number(profileForm.experience_years) > 50
        ) {
          setErrorMessage(
            t('onboarding.step3.errors.experience_invalid', 'Please enter a valid experience between 0 and 50 years.')
          )
          setSaving(false)
          return
        }
        if (profileForm.current_responsibilities.length === 0) {
          setErrorMessage(
            t('onboarding.step3.errors.responsibilities_required', 'Please select at least one key responsibility.')
          )
          setSaving(false)
          return
        }
        if (!profileForm.education_level) {
          setErrorMessage(
            t('onboarding.step3.errors.education_required', 'Please select your highest educational qualification.')
          )
          setSaving(false)
          return
        }

        payload = {
          department_id: profileForm.department_id,
          role_id: profileForm.role_id,
          functional_area_id: profileForm.functional_area_id,
          experience_years: Number(profileForm.experience_years),
          education_level: profileForm.education_level,
          field_of_study: profileForm.field_of_study ? profileForm.field_of_study.trim() : '',
          certifications: profileForm.certifications,
          current_responsibilities: profileForm.current_responsibilities,
        }
      } else if (currentStep === 4) {
        if (selectedSkills.length === 0) {
          setErrorMessage(
            t('onboarding.step4.errors.min_required', 'Please select at least one competency to develop before continuing.')
          )
          setSaving(false)
          return
        }
        payload = { skills_to_develop: selectedSkills }
      } else if (currentStep === 5) {
        if (!latestAttempt || latestAttempt.status !== 'completed') {
          navigate('/diagnostic-test')
          return
        }
        payload = {}
      } else if (currentStep === 6) {
        await handleGraduateOnboarding()
        return
      }

      const res = await saveOnboardingStep(currentStep, payload)

      if (res.user) {
        updateUser(res.user)
      }

      const nextStep = Math.min(6, Math.max(res.onboarding_step || currentStep + 1, currentStep + 1))
      setMaxAllowedStep((prev) => Math.max(prev, nextStep))
      setCurrentStep(nextStep)
    } catch (err) {
      console.error(`Error saving Step ${currentStep}:`, err)
      setErrorMessage(
        err.response?.data?.message || `Failed to save Step ${currentStep}. Please check inputs and retry.`
      )
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
      setErrorMessage('')
    }
  }

  // ── Handler: Final Graduation from Step 6 ──────────────────────────────────
  const handleGraduateOnboarding = async () => {
    setSaving(true)
    setErrorMessage('')
    try {
      const res = await completeOnboarding()
      if (res.user) {
        updateUser(res.user)
        setAuth({ ...user, onboarding_completed: true }, accessToken)
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('Failed to complete onboarding:', err)
      setErrorMessage(
        err.response?.data?.message || 'Failed to finalize onboarding. Please ensure the assessment is completed.'
      )
    } finally {
      setSaving(false)
    }
  }

  // Helper Toggles for Steps 2, 3, 4
  const toggleInterest = (interestId) => {
    setSelectedInterests((prev) => {
      // Find matching item in options to check aliases/names
      const targetOpt = (options.available_interests || []).find(
        (opt) =>
          (typeof opt === 'object' && (opt.id === interestId || opt.name === interestId)) ||
          opt === interestId
      )

      const isAlreadySelected = prev.some((s) => {
        if (s === interestId) return true
        if (targetOpt && typeof targetOpt === 'object') {
          if (targetOpt.name === s) return true
          if (targetOpt.aliases && targetOpt.aliases.includes(s)) return true
        }
        return false
      })

      if (isAlreadySelected) {
        return prev.filter((s) => {
          if (s === interestId) return false
          if (targetOpt && typeof targetOpt === 'object') {
            if (targetOpt.name === s) return false
            if (targetOpt.aliases && targetOpt.aliases.includes(s)) return false
          }
          return true
        })
      } else {
        return [...prev, interestId]
      }
    })
  }

  const toggleSkill = (skillId) => {
    const idStr = String(skillId)
    setSelectedSkills((prev) =>
      prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr]
    )
  }

  const toggleResponsibility = (item) => {
    setProfileForm((prev) => {
      const exists = prev.current_responsibilities.includes(item)
      const updated = exists
        ? prev.current_responsibilities.filter((i) => i !== item)
        : [...prev.current_responsibilities, item]
      return { ...prev, current_responsibilities: updated }
    })
  }

  const toggleCertification = (cert) => {
    setProfileForm((prev) => {
      const exists = prev.certifications.includes(cert)
      const updated = exists
        ? prev.certifications.filter((c) => c !== cert)
        : [...prev.certifications, cert]
      return { ...prev, certifications: updated }
    })
  }

  // Calculate overall progress percentage
  const progressPercent = Math.round(((currentStep - 1) / (ONBOARDING_STEPS.length - 1)) * 100)

  // Current theme object for live info
  const activeThemeObj = THEMES_CONFIG.find((t) => t.id === selectedTheme) || THEMES_CONFIG[0]

  // ── Loading Screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.pageRoot}>
        <header className={styles.topHeader}>
          <div className={styles.topHeaderBrand}>
            <div className={styles.brandIcon}><Sparkles size={20} /></div>
            <div className={styles.brandText}>
              <span className={styles.brandTitle}>KaushalAI</span>
              <span className={styles.brandSub}>MoSPI Competency Framework</span>
            </div>
          </div>
        </header>
        <div className={styles.container}>
          <div className={styles.formCard}>
            <div className={styles.loadingSkeleton}>
              <div className={styles.spinner} />
              <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                {t('common.loading', 'Loading Onboarding Preferences...')}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                Synchronizing your authoritative preferences from the server
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.pageRoot}>
      {/* ── Top Header ── */}
      <header className={styles.topHeader}>
        <div className={styles.topHeaderBrand}>
          <div className={styles.brandIcon}><Sparkles size={20} /></div>
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>KaushalAI</span>
            <span className={styles.brandSub}>
              {t('onboarding.portal_subtitle', 'Ministry of Statistics & Programme Implementation • Government of India')}
            </span>
          </div>
        </div>

        <div className={styles.topHeaderBadge}>
          <Shield size={14} />
          <span>
            {t('onboarding.cadre_badge', { level: derivedLevelInfo.level, defaultValue: `Cadre Level ${derivedLevelInfo.level} Onboarding` })}
          </span>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className={styles.container}>
        {/* ── 6-Step Stepper Bar ── */}
        <div className={styles.stepperWrap}>
          <ol className={styles.stepperList}>
            <div className={styles.stepperLine} />
            <div
              className={styles.stepperLineActive}
              style={{
                width: `${Math.max(0, ((Math.min(currentStep, maxAllowedStep) - 1) / (ONBOARDING_STEPS.length - 1)) * 100)}%`,
              }}
            />

            {ONBOARDING_STEPS.map((step) => {
              const isCompleted = step.number < currentStep || (step.number < maxAllowedStep && step.number !== currentStep)
              const isActive = step.number === currentStep
              const isAccessible = step.number <= maxAllowedStep

              return (
                <li key={step.number} style={{ display: 'flex' }}>
                  <button
                    type="button"
                    className={styles.stepItem}
                    onClick={() => handleStepClick(step.number)}
                    disabled={!isAccessible}
                    title={isAccessible ? `Go to ${step.title}` : `Complete preceding steps to unlock`}
                  >
                    <div
                      className={`${styles.stepCircle} ${
                        isActive
                          ? styles.stepCircleActive
                          : isCompleted
                          ? styles.stepCircleCompleted
                          : ''
                      }`}
                    >
                      {isCompleted ? <Check size={18} strokeWidth={2.5} /> : step.number}
                    </div>
                    <span
                      className={`${styles.stepLabel} ${
                        isActive ? styles.stepLabelActive : ''
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          <div className={styles.overallProgressBar}>
            <div className={styles.overallProgressFill} style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* ── Error Banner ── */}
        {errorMessage && (
          <div className={styles.errorBanner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
            <button type="button" className={styles.retryBtn} onClick={fetchStateAndOptions}>
              Retry
            </button>
          </div>
        )}

        {/* ── Step Card Container ── */}
        <div className={styles.formCard}>
          {/* ══════════════════════════════════════════════════════════════════
              STEP 1: LEARNING PREFERENCES (Active in Part 3)
              ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div>
              {/* Card Header */}
              <div className={styles.cardHeader}>
                <span className={styles.cardStepTag}>
                  {t('onboarding.step1.tag', 'Step 1 of 6')}
                </span>
                <h1 className={styles.cardTitle}>
                  <Globe size={24} color="var(--color-primary-600)" />
                  {t('onboarding.step1.title', 'Learning Preferences')}
                </h1>
                <p className={styles.cardSubtitle}>
                  {t('onboarding.step1.subtitle', 'Personalize your KaushalAI experience. Configure your preferred language, color theme, and appearance mode before proceeding.')}
                </p>
              </div>

              {/* Welcome Banner */}
              <div className={styles.welcomeBanner}>
                <div className={styles.welcomeIconBox}>
                  <Sparkles size={22} />
                </div>
                <div className={styles.welcomeContent}>
                  <div className={styles.welcomeHeading}>
                    {t('onboarding.welcome_title', 'Welcome to KaushalAI Learning Platform')}
                  </div>
                  <div className={styles.welcomeDesc}>
                    {t('onboarding.welcome_desc', 'Personalize your learning environment before beginning. You can change these preferences anytime in Settings.')}
                  </div>
                  <div className={styles.settingsNoticePill}>
                    <Info size={13} />
                    <span>{t('onboarding.step1.settings_notice', 'You can modify these preferences anytime later in Settings.')}</span>
                  </div>
                </div>
              </div>

              {/* 1. Language Selection */}
              <section className={styles.prefSection}>
                <div className={styles.prefSectionHeader}>
                  <div className={styles.prefSectionTitle}>
                    <Globe size={18} color="var(--color-primary-600)" />
                    <span>{t('onboarding.step1.language_heading', '1. Preferred Language')}</span>
                  </div>
                  <p className={styles.prefSectionSub}>
                    {t('onboarding.step1.language_sub', 'Select the language for portal navigation and learning material')}
                  </p>
                </div>

                <div className={styles.langGrid}>
                  {LANGUAGES_CONFIG.map((lang) => {
                    const isSelected = selectedLanguage === lang.code
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        className={`${styles.langCard} ${isSelected ? styles.langCardSelected : ''}`}
                        onClick={() => handleLanguageSelect(lang.code)}
                      >
                        <span className={styles.langFlag}>{lang.flag}</span>
                        <div className={styles.langTextWrap}>
                          <div className={styles.langTitle}>
                            {lang.nativeLabel}
                          </div>
                          <div className={styles.langDesc}>
                            {lang.desc}
                          </div>
                        </div>
                        <div
                          className={`${styles.radioIndicator} ${
                            isSelected ? styles.radioIndicatorSelected : ''
                          }`}
                        >
                          {isSelected && <div className={styles.radioIndicatorDot} />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* 2. Theme Selection */}
              <section className={styles.prefSection}>
                <div className={styles.prefSectionHeader}>
                  <div className={styles.prefSectionTitle}>
                    <Palette size={18} color="var(--color-primary-600)" />
                    <span>{t('onboarding.step1.theme_heading', '2. Official Portal Theme')}</span>
                  </div>
                  <p className={styles.prefSectionSub}>
                    {t('onboarding.step1.theme_sub', 'Select your portal color palette for buttons, navigation, and accents')}
                  </p>
                </div>

                <div className={styles.themeGrid}>
                  {THEMES_CONFIG.map((th) => {
                    const isSelected = selectedTheme === th.id
                    return (
                      <button
                        key={th.id}
                        type="button"
                        className={`${styles.themeCard} ${isSelected ? styles.themeCardSelected : ''}`}
                        onClick={() => handleThemeSelect(th.id)}
                      >
                        <div className={styles.swatchRow}>
                          {th.swatches.map((color, idx) => (
                            <span
                              key={idx}
                              className={styles.swatchDot}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className={styles.themeLabel}>
                          {selectedLanguage === 'hi' ? th.nativeLabel : th.label}
                        </div>
                        {isSelected ? (
                          <span className={styles.themeActivePill}>Active</span>
                        ) : (
                          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                            {th.desc.split('&')[0].trim()}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* 3. Appearance Mode (Light / Dark) */}
              <section className={styles.prefSection}>
                <div className={styles.prefSectionHeader}>
                  <div className={styles.prefSectionTitle}>
                    {selectedAppearanceMode === 'dark' ? (
                      <Moon size={18} color="var(--color-primary-600)" />
                    ) : (
                      <Sun size={18} color="var(--color-primary-600)" />
                    )}
                    <span>{t('onboarding.step1.appearance_heading', '3. Appearance Mode')}</span>
                  </div>
                  <p className={styles.prefSectionSub}>
                    {t('onboarding.step1.appearance_sub', 'Switch between standard high-clarity Light mode and comfortable Dark mode')}
                  </p>
                </div>

                <div className={styles.modeGrid}>
                  {MODES_CONFIG.map((mode) => {
                    const isSelected = selectedAppearanceMode === mode.id
                    const IconComp = mode.icon
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        className={`${styles.modeCard} ${isSelected ? styles.modeCardSelected : ''}`}
                        onClick={() => handleAppearanceModeSelect(mode.id)}
                      >
                        <div className={styles.modeIconBox}>
                          <IconComp size={20} />
                        </div>
                        <div className={styles.modeTextWrap}>
                          <div className={styles.modeTitle}>
                            {selectedLanguage === 'hi' ? mode.nativeTitle : mode.title}
                          </div>
                          <div className={styles.modeDesc}>
                            {selectedLanguage === 'hi' ? mode.nativeDesc : mode.desc}
                          </div>
                        </div>
                        <div
                          className={`${styles.radioIndicator} ${
                            isSelected ? styles.radioIndicatorSelected : ''
                          }`}
                        >
                          {isSelected && <div className={styles.radioIndicatorDot} />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Live Preview Status Strip */}
              <div className={styles.livePreviewStrip}>
                <div className={styles.livePreviewPill}>
                  <Sparkles size={16} color="var(--color-primary-600)" />
                  <span>
                    {t('onboarding.step1.live_preview_badge', 'Live Preview Active')}:{' '}
                    <strong>{selectedLanguage === 'hi' ? activeThemeObj.nativeLabel : activeThemeObj.label}</strong> •{' '}
                    <strong>{selectedAppearanceMode === 'dark' ? 'Dark Mode' : 'Light Mode'}</strong> •{' '}
                    <strong>{selectedLanguage === 'hi' ? 'हिन्दी' : 'English'}</strong>
                  </span>
                </div>
                <div className={styles.liveBadge}>
                  <CheckCircle2 size={13} color="#166534" />
                  <span>Real-time CSS Active</span>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 2: PROFESSIONAL INTERESTS
              ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div>
              <div className={styles.cardHeader}>
                <span className={styles.cardStepTag}>
                  {t('onboarding.step2.tag', 'Step 2 of 6')}
                </span>
                <h1 className={styles.cardTitle}>
                  <Target size={24} color="var(--color-primary-600)" />
                  {t('onboarding.step2.heading', 'What areas of work interest you?')}
                </h1>
                <p className={styles.cardSubtitle}>
                  {t(
                    'onboarding.step2.description',
                    'Select the professional domains you are interested in. Your selections will help us personalize your learning experience.'
                  )}
                </p>
              </div>

              {/* Selection Counter & Guidance Bar */}
              <div className={styles.interestsStatusBar}>
                <div className={styles.selectedCountPill}>
                  <CheckCircle2 size={16} color="var(--color-primary-600)" />
                  <span>
                    <strong>{selectedInterests.length}</strong>{' '}
                    {selectedInterests.length === 1
                      ? t('onboarding.step2.selected_badge_singular', 'domain selected')
                      : t('onboarding.step2.selected_badge', '{{count}} domains selected', { count: selectedInterests.length })}
                  </span>
                </div>

                <div
                  className={
                    selectedInterests.length === 0
                      ? styles.minRequirementWarning
                      : styles.minRequirementSuccess
                  }
                >
                  {selectedInterests.length === 0 ? (
                    <>
                      <AlertCircle size={15} />
                      <span>{t('onboarding.step2.min_requirement_notice', 'Select at least 1 domain to continue')}</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>{t('onboarding.step2.ready_notice', 'Ready to continue. You can choose additional domains if desired.')}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Responsive Cards Grid */}
              <div className={styles.interestsGrid} role="group" aria-label={t('onboarding.step2.heading', 'What areas of work interest you?')}>
                {(options.available_interests || []).map((interest) => {
                  const interestId = typeof interest === 'string' ? interest : interest.id
                  const rawName = typeof interest === 'string' ? interest : interest.name
                  const iconName = typeof interest === 'object' && interest.icon ? interest.icon : 'Target'
                  const IconComp = INTEREST_ICONS[iconName] || Target
                  const categoryKey = typeof interest === 'object' && interest.category ? interest.category : 'statistical'

                  // Check if selected by id, name, or alias
                  const isSelected = selectedInterests.some((s) => {
                    if (s === interestId || s === rawName) return true
                    if (typeof interest === 'object' && interest.aliases && interest.aliases.includes(s)) return true
                    return false
                  })

                  // Localized name & description
                  const itemKey = `onboarding.step2.items.${interestId}`
                  const localizedName = t(`${itemKey}.name`, rawName)
                  const localizedDesc = t(
                    `${itemKey}.desc`,
                    typeof interest === 'object' && interest.description
                      ? interest.description
                      : 'Statistical, technical, and administrative competencies relevant to your MoSPI cadre.'
                  )
                  const categoryLabel = t(`onboarding.step2.categories.${categoryKey}`, categoryKey)

                  return (
                    <div
                      key={interestId}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={0}
                      className={`${styles.interestCard} ${isSelected ? styles.interestCardSelected : ''}`}
                      onClick={() => toggleInterest(interestId)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault()
                          toggleInterest(interestId)
                        }
                      }}
                    >
                      <div className={styles.interestCardTop}>
                        <div className={`${styles.interestIconWrap} ${isSelected ? styles.interestIconWrapSelected : ''}`}>
                          <IconComp size={20} />
                        </div>
                        <span className={styles.interestCategoryPill}>{categoryLabel}</span>
                        <div className={`${styles.interestCheckIndicator} ${isSelected ? styles.interestCheckIndicatorSelected : ''}`}>
                          {isSelected && <Check size={13} strokeWidth={3} />}
                        </div>
                      </div>

                      <div className={styles.interestCardBody}>
                        <h3 className={styles.interestCardTitle}>{localizedName}</h3>
                        <p className={styles.interestCardDesc}>{localizedDesc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 3: PROFESSIONAL PROFILE
              ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div>
              <div className={styles.cardHeader}>
                <span className={styles.cardStepTag}>
                  {t('onboarding.step3.tag', 'Step 3 of 6')}
                </span>
                <h1 className={styles.cardTitle}>
                  <Briefcase size={24} color="var(--color-primary-600)" />
                  {t('onboarding.step3.heading', 'Tell us about your professional background')}
                </h1>
                <p className={styles.cardSubtitle}>
                  {t(
                    'onboarding.step3.description',
                    'Help us understand your current role, experience, and educational background so we can personalize your competency assessment and learning journey.'
                  )}
                </p>
              </div>

              {/* ── Section A: Official Employment Details ── */}
              <div className={styles.profileSection}>
                <div className={styles.profileSectionHeader}>
                  <div className={styles.profileSectionTitle}>
                    <Building size={18} color="var(--color-primary-600)" />
                    <span>{t('onboarding.step3.section_a_title', 'Section A: Official Employment Details')}</span>
                  </div>
                  <p className={styles.profileSectionDesc}>
                    {t(
                      'onboarding.step3.section_a_desc',
                      'Your administrative division, official designation, cadre level, and functional domain in MoSPI.'
                    )}
                  </p>
                </div>

                <div className={styles.formRow}>
                  {/* Department Selector */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      <span>{t('onboarding.step3.department_label', 'Ministry Department / Division')}</span>
                      <span className={styles.requiredStar}>*</span>
                    </label>
                    <select
                      className={styles.select}
                      value={profileForm.department_id}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                    >
                      <option value="">{t('onboarding.step3.department_placeholder', 'Select your division')}</option>
                      {options.departments?.map((d) => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                    <span className={styles.helpText}>
                      {t('onboarding.step3.department_help', 'Official administrative division or survey directorate')}
                    </span>
                  </div>

                  {/* Dependent Role Selector */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      <span>{t('onboarding.step3.role_label', 'Official Job Role / Designation')}</span>
                      <span className={styles.requiredStar}>*</span>
                    </label>
                    <select
                      className={styles.select}
                      value={profileForm.role_id}
                      onChange={(e) => setProfileForm({ ...profileForm, role_id: e.target.value })}
                      disabled={!profileForm.department_id}
                    >
                      <option value="">{t('onboarding.step3.role_placeholder', 'Select your official role')}</option>
                      {(options.roles || [])
                        .filter(
                          (r) =>
                            !profileForm.department_id ||
                            String(r.department_ref) === String(profileForm.department_id)
                        )
                        .map((r) => (
                          <option key={r._id} value={r._id}>
                            {r.name}
                          </option>
                        ))}
                    </select>
                    <span className={styles.helpText}>
                      {t('onboarding.step3.role_help', 'Governs your MoSPI cadre grade (Levels 1–5)')}
                    </span>
                  </div>
                </div>

                {/* Derived Cadre Level Card */}
                <div className={styles.cadreCard}>
                  <div className={styles.cadreCardTop}>
                    <div className={styles.cadreTitleWrap}>
                      <Shield size={18} />
                      <span>{derivedLevelInfo.title}</span>
                    </div>
                    <span className={styles.cadreBadge}>
                      {t('onboarding.step3.cadre_badge_label', 'Assigned Cadre Grade')}: Level {derivedLevelInfo.level}
                    </span>
                  </div>
                  <p className={styles.cadreCardDesc}>
                    {t('onboarding.step3.cadre_level_desc', {
                      level: derivedLevelInfo.level,
                      defaultValue: `Evaluates competency benchmark targets against Cadre Level ${derivedLevelInfo.level}`,
                    })}
                  </p>
                </div>

                <div className={styles.formRow}>
                  {/* Functional Area Selector */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.label}>
                      <span>{t('onboarding.step3.functional_area_label', 'Functional Area / Domain')}</span>
                      <span className={styles.requiredStar}>*</span>
                    </label>
                    <select
                      className={styles.select}
                      value={profileForm.functional_area_id}
                      onChange={(e) => setProfileForm({ ...profileForm, functional_area_id: e.target.value })}
                    >
                      <option value="">{t('onboarding.step3.functional_area_placeholder', 'Select your functional domain')}</option>
                      {options.functional_areas?.map((fa) => (
                        <option key={fa._id} value={fa._id}>{fa.name}</option>
                      ))}
                    </select>
                    <span className={styles.helpText}>
                      {t('onboarding.step3.functional_area_help', 'Primary operational stream under the Indian Statistical System')}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Section B: Professional Experience & Responsibilities ── */}
              <div className={styles.profileSection}>
                <div className={styles.profileSectionHeader}>
                  <div className={styles.profileSectionTitle}>
                    <Clock size={18} color="var(--color-primary-600)" />
                    <span>{t('onboarding.step3.section_b_title', 'Section B: Professional Experience & Responsibilities')}</span>
                  </div>
                  <p className={styles.profileSectionDesc}>
                    {t(
                      'onboarding.step3.section_b_desc',
                      'Your statistical or administrative track record and daily core operations.'
                    )}
                  </p>
                </div>

                <div className={styles.formRow}>
                  {/* Experience Years */}
                  <div className={styles.formGroup} style={{ maxWidth: 320 }}>
                    <label className={styles.label}>
                      <span>{t('onboarding.step3.experience_label', 'Years of Professional Experience')}</span>
                      <span className={styles.requiredStar}>*</span>
                    </label>
                    <div className={styles.experienceInputWrap}>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        step="1"
                        className={styles.input}
                        placeholder={t('onboarding.step3.experience_placeholder', 'e.g. 5')}
                        value={profileForm.experience_years}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            experience_years:
                              e.target.value === ''
                                ? ''
                                : Math.max(0, Math.min(50, Number(e.target.value))),
                          })
                        }
                      />
                      <span className={styles.experienceSuffix}>
                        {t('onboarding.step3.experience_unit', 'years')}
                      </span>
                    </div>
                    <span className={styles.helpText}>
                      {t('onboarding.step3.experience_help', 'Total years of government or statistical service (0–50)')}
                    </span>
                  </div>
                </div>

                {/* Key Responsibilities */}
                <div className={styles.formGroup}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className={styles.label}>
                      <span>{t('onboarding.step3.responsibilities_label', 'Current Key Responsibilities')}</span>
                      <span className={styles.requiredStar}>*</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary-600)' }}>
                      {t('onboarding.step3.responsibilities_count', '{{count}} selected', {
                        count: profileForm.current_responsibilities.length,
                      })}
                    </span>
                  </div>
                  <span className={styles.helpText}>
                    {t(
                      'onboarding.step3.responsibilities_help',
                      'Select all operational tasks you routinely perform (at least 1 required)'
                    )}
                  </span>
                  <div className={styles.chipsWrap}>
                    {(options.responsibilities_options || []).map((resp) => {
                      const isSelected = profileForm.current_responsibilities.includes(resp)
                      return (
                        <button
                          key={resp}
                          type="button"
                          className={`${styles.chip} ${isSelected ? styles.chipSelected : ''}`}
                          onClick={() => toggleResponsibility(resp)}
                        >
                          {isSelected && <Check size={13} strokeWidth={2.5} />}
                          <span>{resp}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* ── Section C: Educational Background & Qualifications ── */}
              <div className={styles.profileSection}>
                <div className={styles.profileSectionHeader}>
                  <div className={styles.profileSectionTitle}>
                    <Award size={18} color="var(--color-primary-600)" />
                    <span>{t('onboarding.step3.section_c_title', 'Section C: Educational Background & Qualifications')}</span>
                  </div>
                  <p className={styles.profileSectionDesc}>
                    {t(
                      'onboarding.step3.section_c_desc',
                      'Your academic specialization and recognized professional certifications.'
                    )}
                  </p>
                </div>

                <div className={styles.formRow}>
                  {/* Highest Qualification */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      <span>{t('onboarding.step3.education_label', 'Highest Educational Qualification')}</span>
                      <span className={styles.requiredStar}>*</span>
                    </label>
                    <select
                      className={styles.select}
                      value={profileForm.education_level}
                      onChange={(e) => setProfileForm({ ...profileForm, education_level: e.target.value })}
                    >
                      <option value="">
                        {t('onboarding.step3.education_placeholder', 'Select highest qualification')}
                      </option>
                      {(options.education_levels || []).map((edu) => (
                        <option key={edu} value={edu}>
                          {edu}
                        </option>
                      ))}
                    </select>
                    <span className={styles.helpText}>
                      {t('onboarding.step3.education_help', 'Recognized academic degree or diploma')}
                    </span>
                  </div>

                  {/* Field of Study */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      <span>{t('onboarding.step3.field_label', 'Field of Study / Academic Discipline')}</span>
                      <span className={styles.optionalTag}>{t('onboarding.step3.optional_badge', 'Optional')}</span>
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      className={styles.input}
                      placeholder={t(
                        'onboarding.step3.field_placeholder',
                        'e.g. Statistics, Economics, Mathematics, Computer Science'
                      )}
                      value={profileForm.field_of_study}
                      onChange={(e) => setProfileForm({ ...profileForm, field_of_study: e.target.value })}
                    />
                    <span className={styles.helpText}>
                      {t('onboarding.step3.field_help', 'Major academic discipline or specialization')}
                    </span>
                  </div>
                </div>

                {/* Professional Certifications */}
                <div className={styles.formGroup}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className={styles.label}>
                      <span>{t('onboarding.step3.certifications_label', 'Professional Certifications')}</span>
                      <span className={styles.optionalTag}>{t('onboarding.step3.optional_badge', 'Optional')}</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary-600)' }}>
                      {profileForm.certifications.length > 0 && `${profileForm.certifications.length} selected`}
                    </span>
                  </div>
                  <span className={styles.helpText}>
                    {t(
                      'onboarding.step3.certifications_help',
                      'Select any completed technical, statistical, or administrative credentials'
                    )}
                  </span>
                  <div className={styles.chipsWrap}>
                    {(options.common_certifications || []).map((cert) => {
                      const isSelected = profileForm.certifications.includes(cert)
                      return (
                        <button
                          key={cert}
                          type="button"
                          className={`${styles.chip} ${isSelected ? styles.chipSelected : ''}`}
                          onClick={() => toggleCertification(cert)}
                        >
                          {isSelected && <Check size={13} strokeWidth={2.5} />}
                          <span>{cert}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 4: SKILLS TO DEVELOP
              ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 4 && (
            <div>
              <div className={styles.cardHeader}>
                <span className={styles.cardStepTag}>
                  <Award size={14} />
                  {t('onboarding.step4.tag', 'Step 4 of 6')}
                </span>
                <h1 className={styles.cardTitle}>
                  <Award size={24} color="var(--color-primary-600)" />
                  {t('onboarding.step4.heading', 'Which skills would you like to develop?')}
                </h1>
                <p className={styles.cardSubtitle}>
                  {t(
                    'onboarding.step4.description',
                    'Choose the competencies you want to strengthen. We will use your interests to personalize your learning journey and combine them with your assessment results.'
                  )}
                </p>
              </div>

              {/* Explanatory Note */}
              <div className={styles.skillsNoticeBox}>
                <Info size={18} className={styles.skillsNoticeIcon} />
                <p className={styles.skillsNoticeText}>
                  <strong>{t('onboarding.step4.explanatory_note', 'Your selections represent your learning goals. Your actual competency levels will be evaluated separately through the diagnostic assessment.')}</strong>
                </p>
              </div>

              {/* Controls: Search and Category Tabs */}
              <div className={styles.skillsControls}>
                <div className={styles.skillsSearchRow}>
                  <div className={styles.skillsSearchWrap}>
                    <Search size={16} className={styles.skillsSearchIcon} />
                    <input
                      type="text"
                      className={styles.skillsSearchInput}
                      placeholder={t('onboarding.step4.search_placeholder', 'Search competencies by name, code, or description...')}
                      value={skillSearchQuery}
                      onChange={(e) => setSkillSearchQuery(e.target.value)}
                      aria-label="Search competencies"
                    />
                    {skillSearchQuery && (
                      <button
                        type="button"
                        className={styles.skillsSearchClear}
                        onClick={() => setSkillSearchQuery('')}
                        aria-label={t('onboarding.step4.clear_search', 'Clear search')}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.skillsCategoryTabs} role="tablist" aria-label="Competency categories">
                  {[
                    { id: 'all', label: t('onboarding.step4.categories.all', 'All') },
                    { id: 'statistical', label: t('onboarding.step4.categories.statistical', 'Statistical') },
                    { id: 'technical', label: t('onboarding.step4.categories.technical', 'Technical') },
                    { id: 'digital_governance', label: t('onboarding.step4.categories.digital_governance', 'Digital Governance') },
                    { id: 'behavioural', label: t('onboarding.step4.categories.behavioural', 'Behavioural') },
                  ].map((tab) => {
                    const isActive = skillCategoryFilter === tab.id
                    const count = categoryCounts[tab.id] || 0
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={`${styles.skillsCategoryTab} ${isActive ? styles.skillsCategoryTabActive : ''}`}
                        onClick={() => setSkillCategoryFilter(tab.id)}
                      >
                        <span>{tab.label}</span>
                        <span className={styles.skillsCategoryCount}>{count}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Status and Selected Counter Bar */}
              <div className={styles.skillsStatusBar}>
                <div className={styles.skillsStatusLeft}>
                  <div
                    className={`${styles.skillsStatusPill} ${
                      selectedSkills.length > 0 ? styles.skillsStatusPillReady : styles.skillsStatusPillEmpty
                    }`}
                  >
                    {selectedSkills.length > 0 ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <AlertCircle size={13} />
                    )}
                    <span>
                      {selectedSkills.length === 1
                        ? t('onboarding.step4.selected_count_singular', 'Selected: 1 competency')
                        : t('onboarding.step4.selected_count', { count: selectedSkills.length, defaultValue: `Selected: ${selectedSkills.length} competencies` })}
                    </span>
                  </div>
                  <span className={styles.skillsStatusDesc}>
                    {selectedSkills.length === 0
                      ? t('onboarding.step4.no_selection_notice', 'Please select at least 1 competency to continue.')
                      : t('onboarding.step4.min_selected_notice', { count: selectedSkills.length, defaultValue: `${selectedSkills.length} competencies selected. Ready to proceed to assessment.` })}
                  </span>
                </div>

                {(skillCategoryFilter !== 'all' || skillSearchQuery.trim() !== '') && (
                  <button
                    type="button"
                    className={styles.skillsClearFiltersBtn}
                    onClick={() => {
                      setSkillCategoryFilter('all')
                      setSkillSearchQuery('')
                    }}
                  >
                    <RotateCcw size={13} />
                    <span>{t('onboarding.step4.clear_filters', 'Clear Filters')}</span>
                  </button>
                )}
              </div>

              {/* Competencies Cards Grid */}
              {filteredCompetencies.length > 0 ? (
                <div className={styles.skillsCardsGrid} role="group" aria-label="Competencies selection grid">
                  {filteredCompetencies.map((comp) => {
                    const compId = String(comp._id)
                    const isSelected = selectedSkills.includes(compId)
                    const isRoleRec = recommendedSkillIds.has(compId)
                    const isInterestAligned = !isRoleRec && interestAlignedSkillIds.has(compId)

                    const categoryClassMap = {
                      statistical: styles.categoryStatistical,
                      technical: styles.categoryTechnical,
                      digital_governance: styles.categoryGovernance,
                      behavioural: styles.categoryBehavioural,
                    }
                    const categoryClass = categoryClassMap[comp.category?.toLowerCase()] || styles.categoryStatistical
                    const categoryLabel =
                      t(`onboarding.step4.categories.${comp.category?.toLowerCase()}`, comp.category)

                    return (
                      <div
                        key={compId}
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={0}
                        className={`${styles.competencyCard} ${isSelected ? styles.competencyCardSelected : ''}`}
                        onClick={() => toggleSkill(compId)}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault()
                            toggleSkill(compId)
                          }
                        }}
                      >
                        <div className={styles.competencyCardTop}>
                          <div className={styles.competencyBadgesWrap}>
                            <span className={`${styles.competencyCategoryBadge} ${categoryClass}`}>
                              {categoryLabel}
                            </span>
                            {isRoleRec && (
                              <span className={styles.roleRecPill} title="Recommended benchmark competency for your Cadre role">
                                <Sparkles size={11} />
                                {t('onboarding.step4.recommended_badge', 'Recommended for your role')}
                              </span>
                            )}
                            {isInterestAligned && (
                              <span className={styles.interestAlignPill} title="Aligns with your selected professional interests">
                                <Target size={11} />
                                {t('onboarding.step4.aligned_badge', 'Matches your interests')}
                              </span>
                            )}
                          </div>

                          <div
                            className={`${styles.competencyCheckbox} ${
                              isSelected ? styles.competencyCheckboxChecked : ''
                            }`}
                            aria-hidden="true"
                          >
                            {isSelected && <Check size={14} strokeWidth={3} />}
                          </div>
                        </div>

                        <div>
                          <div className={styles.competencyHeaderRow}>
                            {comp.competencyCode && (
                              <span className={styles.competencyCodeTag}>
                                {comp.competencyCode}
                              </span>
                            )}
                            <h3 className={styles.competencyName}>{comp.name}</h3>
                          </div>

                          <p className={styles.competencyDesc} title={comp.description}>
                            {comp.description || 'Official Ministry competency standard.'}
                          </p>
                        </div>

                        {comp.levelDescriptions && (
                          <div className={styles.competencyLevelsRow}>
                            {comp.levelDescriptions.beginner && (
                              <span className={styles.competencyLevelDot} title={comp.levelDescriptions.beginner}>
                                • {t('onboarding.step4.level_beginner', 'Beginner')}
                              </span>
                            )}
                            {comp.levelDescriptions.intermediate && (
                              <span className={styles.competencyLevelDot} title={comp.levelDescriptions.intermediate}>
                                • {t('onboarding.step4.level_intermediate', 'Intermediate')}
                              </span>
                            )}
                            {comp.levelDescriptions.advanced && (
                              <span className={styles.competencyLevelDot} title={comp.levelDescriptions.advanced}>
                                • {t('onboarding.step4.level_advanced', 'Advanced')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className={styles.skillsEmptyWrap}>
                  <div className={styles.skillsEmptyIcon}>
                    <Search size={22} />
                  </div>
                  <h3 className={styles.skillsEmptyTitle}>
                    {t('onboarding.step4.no_results_title', 'No competencies found')}
                  </h3>
                  <p className={styles.skillsEmptyDesc}>
                    {skillSearchQuery
                      ? `No competencies matched '${skillSearchQuery}'. Try refining your search keywords or switching category filters.`
                      : t('onboarding.step4.no_results_desc', 'No competencies match your current filter criteria.')}
                  </p>
                  <button
                    type="button"
                    className={styles.skillsEmptyResetBtn}
                    onClick={() => {
                      setSkillCategoryFilter('all')
                      setSkillSearchQuery('')
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>{t('onboarding.step4.reset_filters_btn', 'Reset Search & Filters')}</span>
                  </button>
                  {selectedSkills.length > 0 && (
                    <p style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--color-primary-600)', fontWeight: 600 }}>
                      {t('onboarding.step4.selections_preserved_notice', { count: selectedSkills.length, defaultValue: `${selectedSkills.length} previously selected competencies remain safely preserved.` })}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 5: COMPETENCY ASSESSMENT INTRO (Foundation Container)
              ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 5 && (
            <div>
              <div className={styles.cardHeader}>
                <span className={styles.cardStepTag}>Step 5 of 6</span>
                <h1 className={styles.cardTitle}>
                  <FileCheck size={22} color="var(--color-primary-600)" />
                  Role-Aligned Competency Assessment
                </h1>
                <p className={styles.cardSubtitle}>
                  Take an objective 15-question scenario assessment calibrated to your Cadre Level ({derivedLevelInfo.level}) to establish your baseline proficiency.
                </p>
              </div>

              <div className={styles.assessmentBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Clock size={20} color="var(--color-primary-600)" />
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-text)' }}>
                    Assessment Guidelines (20 Minutes Duration)
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                  Questions reflect real administrative and statistical scenarios encountered in the Ministry. Your responses are graded deterministically server-side.
                </p>

                <div className={styles.assessmentGrid}>
                  <div className={styles.assessmentStat}>
                    <div className={styles.assessmentStatVal}>15</div>
                    <div className={styles.assessmentStatLbl}>Questions</div>
                  </div>
                  <div className={styles.assessmentStat}>
                    <div className={styles.assessmentStatVal}>20:00</div>
                    <div className={styles.assessmentStatLbl}>Exact Duration</div>
                  </div>
                  <div className={styles.assessmentStat}>
                    <div className={styles.assessmentStatVal}>L{derivedLevelInfo.level}</div>
                    <div className={styles.assessmentStatLbl}>Cadre Standard</div>
                  </div>
                </div>

                {latestAttempt && latestAttempt.status === 'completed' ? (
                  <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, color: '#065f46', fontWeight: 600, fontSize: '0.875rem' }}>
                    ✓ You have already completed this diagnostic assessment (Score: {latestAttempt.overall_score}%). Proceed to Step 6 to review results and graduate to your dashboard.
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.nextBtn}
                    style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
                    onClick={() => navigate('/diagnostic-test')}
                  >
                    <span>Launch Diagnostic Assessment →</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 6: RESULTS & GRADUATION (Foundation Container)
              ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 6 && (
            <div>
              <div className={styles.cardHeader}>
                <span className={styles.cardStepTag}>Step 6 of 6</span>
                <h1 className={styles.cardTitle}>
                  <BarChart3 size={22} color="var(--color-primary-600)" />
                  Assessment Results &amp; Graduation
                </h1>
                <p className={styles.cardSubtitle}>
                  Review your baseline competency analysis and finalize onboarding to activate your personalized learner dashboard.
                </p>
              </div>

              {latestAttempt ? (
                <div className={styles.resultsSummaryBox}>
                  <div className={styles.scoreBanner}>
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                        OVERALL DIAGNOSTIC SCORE
                      </div>
                      <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text)' }}>
                        Cadre Level {derivedLevelInfo.level} Baseline Established
                      </div>
                    </div>
                    <div className={styles.scoreVal}>{latestAttempt.overall_score}%</div>
                  </div>

                  {latestAttempt.ai_analysis?.role_verdict && (
                    <div style={{ padding: 14, background: 'var(--color-surface, #ffffff)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: 12, marginBottom: 16 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--color-primary-700)', marginBottom: 4 }}>
                        AI Diagnostic Verdict
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', margin: 0, lineHeight: 1.5 }}>
                        {latestAttempt.ai_analysis.role_verdict}
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                    <button
                      type="button"
                      className={styles.backBtn}
                      onClick={() => navigate('/diagnostic-test')}
                      style={{ fontSize: '0.8125rem' }}
                    >
                      <ExternalLink size={14} />
                      <span>View Full Matrix &amp; Gaps</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 24, textAlign: 'center', background: 'var(--color-bg-secondary, #f8fafc)', borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', marginBottom: 20 }}>
                  <FileCheck size={36} color="var(--color-primary-600)" style={{ margin: '0 auto 8px auto' }} />
                  <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>No Assessment Completed Yet</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                    Please return to Step 5 to complete your cadre diagnostic assessment.
                  </div>
                  <button
                    type="button"
                    className={styles.nextBtn}
                    onClick={() => setCurrentStep(5)}
                    style={{ marginTop: 16 }}
                  >
                    Go to Step 5 (Assessment)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Footer Navigation Actions ── */}
          <div className={styles.cardFooter}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={handleBack}
              disabled={currentStep === 1 || saving}
              style={{ visibility: currentStep === 1 ? 'hidden' : 'visible' }}
            >
              <ArrowLeft size={16} />
              <span>
                {currentStep === 2
                  ? t('onboarding.step2.back_btn', 'Back to Preferences')
                  : currentStep === 3
                  ? t('onboarding.step3.back_btn', 'Back to Interests')
                  : currentStep === 4
                  ? t('onboarding.step4.back_btn', 'Back to Profile')
                  : t('common.back', 'Previous')}
              </span>
            </button>

            {currentStep < 6 ? (
              <button
                type="button"
                className={styles.nextBtn}
                onClick={handleSaveAndContinue}
                disabled={
                  saving ||
                  (currentStep === 2 && selectedInterests.length === 0) ||
                  (currentStep === 3 &&
                    (!profileForm.department_id ||
                      !profileForm.role_id ||
                      !profileForm.functional_area_id ||
                      profileForm.experience_years === '' ||
                      Number(profileForm.experience_years) < 0 ||
                      Number(profileForm.experience_years) > 50 ||
                      profileForm.current_responsibilities.length === 0 ||
                      !profileForm.education_level)) ||
                  (currentStep === 4 && selectedSkills.length === 0)
                }
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} style={{ width: 16, height: 16, margin: 0 }} />
                    <span>
                      {currentStep === 1
                        ? t('onboarding.step1.saving_btn', 'Saving Preferences...')
                        : currentStep === 2
                        ? t('onboarding.step2.saving_btn', 'Saving Interests...')
                        : currentStep === 3
                        ? t('onboarding.step3.saving_btn', 'Saving Profile...')
                        : currentStep === 4
                        ? t('onboarding.step4.saving_btn', 'Saving Skills...')
                        : 'Saving...'}
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      {currentStep === 1
                        ? t('onboarding.step1.continue_btn', 'Save & Continue to Interests')
                        : currentStep === 2
                        ? t('onboarding.step2.continue_btn', 'Save & Continue to Profile')
                        : currentStep === 3
                        ? t('onboarding.step3.continue_btn', 'Save & Continue to Skills')
                        : currentStep === 4
                        ? t('onboarding.step4.continue_btn', 'Save & Continue to Assessment')
                        : `Continue to Step ${currentStep + 1}`}
                    </span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                className={`${styles.nextBtn} ${styles.completeBtn}`}
                onClick={handleGraduateOnboarding}
                disabled={saving || (!latestAttempt && user?.role !== 'admin')}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} style={{ width: 16, height: 16, margin: 0 }} />
                    <span>Graduating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Complete Setup &amp; Enter Dashboard</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
