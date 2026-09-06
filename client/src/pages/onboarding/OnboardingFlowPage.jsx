import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase,
  GraduationCap,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Shield,
  Award,
  AlertCircle,
  Plus,
  X,
  Building,
  Layers,
  Sparkles,
  Edit3,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { getOnboardingOptions, saveOnboardingProfile } from '../../api/onboarding.api'
import styles from './OnboardingFlowPage.module.css'

const STORAGE_KEY = 'kaushalai_onboarding_draft'

export default function OnboardingFlowPage() {
  const navigate = useNavigate()
  const { user, setAuth, accessToken } = useAuthStore()

  const [currentStep, setCurrentStep] = useState(1)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Dropdown options from backend
  const [options, setOptions] = useState({
    departments: [],
    roles: [],
    functional_areas: [],
    education_levels: [],
    common_certifications: [],
    responsibilities_options: [],
  })

  // Form State with localStorage persistence
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return {
      department_id: '',
      role_id: '',
      functional_area_id: '',
      experience_years: user?.experience_years || 2,
      current_responsibilities: Array.isArray(user?.current_responsibilities)
        ? user.current_responsibilities
        : [],
      education_level: user?.education_level || "Bachelor's Degree",
      field_of_study: user?.field_of_study || '',
      certifications: Array.isArray(user?.certifications) ? user.certifications : [],
    }
  })

  const [customCertInput, setCustomCertInput] = useState('')
  const [derivedLevelInfo, setDerivedLevelInfo] = useState({
    level: 1,
    title: 'Support Staff (Level 1)',
    roleName: '',
    departmentName: '',
  })

  // 1. Fetch options on mount
  useEffect(() => {
    let mounted = true
    getOnboardingOptions()
      .then((data) => {
        if (!mounted) return
        setOptions(data)

        // If user already has department/role matching or defaults
        setForm((prev) => {
          const next = { ...prev }
          if (!next.department_id && data.departments?.length > 0) {
            next.department_id = data.departments[0]._id
          }
          if (!next.role_id && data.roles?.length > 0) {
            next.role_id = data.roles[0]._id
          }
          if (!next.functional_area_id && data.functional_areas?.length > 0) {
            next.functional_area_id = data.functional_areas[0]._id
          }
          return next
        })
      })
      .catch((err) => {
        if (!mounted) return
        setError(err.response?.data?.message || 'Failed to load options. Please refresh.')
      })
      .finally(() => {
        if (mounted) setLoadingOptions(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  // 2. Persist form to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
    } catch {
      // ignore
    }
  }, [form])

  // 3. Update derived level preview whenever role_id changes
  useEffect(() => {
    if (form.role_id && options.roles?.length > 0) {
      const selectedRole = options.roles.find((r) => r._id === form.role_id)
      const selectedDept = options.departments.find((d) => d._id === form.department_id)
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
  }, [form.role_id, form.department_id, options.roles, options.departments])

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  const toggleResponsibility = (item) => {
    setForm((prev) => {
      const exists = prev.current_responsibilities.includes(item)
      const updated = exists
        ? prev.current_responsibilities.filter((r) => r !== item)
        : [...prev.current_responsibilities, item]
      return { ...prev, current_responsibilities: updated }
    })
  }

  const addCustomCert = (e) => {
    e?.preventDefault()
    const trimmed = customCertInput.trim()
    if (!trimmed) return
    if (!form.certifications.includes(trimmed)) {
      setForm((prev) => ({ ...prev, certifications: [...prev.certifications, trimmed] }))
    }
    setCustomCertInput('')
  }

  const removeCert = (certToRemove) => {
    setForm((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((c) => c !== certToRemove),
    }))
  }

  // Next step handler with incremental server save
  const handleNext = async () => {
    setError('')

    // Validation for Step 1
    if (currentStep === 1) {
      if (!form.role_id) {
        setError('Please select your official Job Role / Designation.')
        return
      }
      if (!form.department_id) {
        setError('Please select your assigned Department.')
        return
      }
      if (form.experience_years < 0) {
        setError('Please enter a valid number of experience years.')
        return
      }
    }

    // Validation for Step 2
    if (currentStep === 2) {
      if (!form.education_level) {
        setError('Please select your highest academic qualification.')
        return
      }
    }

    // Save partial progress to server
    setSaving(true)
    try {
      const res = await saveOnboardingProfile(form)
      if (res.user) {
        setAuth({ ...user, ...res.user }, accessToken)
      }
      if (currentStep < 3) {
        setCurrentStep((s) => s + 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save progress. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    setError('')
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Final Action: Continue to Diagnostic Test (Part 3)
  const handleProceedToDiagnostic = async () => {
    setSaving(true)
    try {
      const res = await saveOnboardingProfile(form)
      if (res.user) {
        setAuth({ ...user, ...res.user }, accessToken)
      }
      localStorage.removeItem(STORAGE_KEY)
      // Navigate to Part 3 Diagnostic Assessment flow
      navigate('/diagnostic-test', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to finalize profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.pageRoot}>
      {/* ── Official Government Header ── */}
      <header className={styles.topHeader}>
        <div className={styles.topHeaderBrand}>
          <img
            src="/kaushal-logo.jpg"
            alt="KaushalAI Logo"
            className={styles.logoImg}
          />
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>
              Ministry of Statistics &amp; Programme Implementation
            </span>
            <span className={styles.brandSub}>
              KaushalAI • Officer Competency &amp; Learning Framework
            </span>
          </div>
        </div>

        <div className={styles.topHeaderBadge}>
          <Shield size={16} />
          <span>Cadre Onboarding Protocol</span>
        </div>
      </header>

      {/* ── Main Step Flow ── */}
      <main className={styles.container}>
        {/* Stepper Progress */}
        <div className={styles.stepperWrap}>
          <ol className={styles.stepperList}>
            <div className={styles.stepperLine} />
            <div
              className={styles.stepperLineActive}
              style={{
                width:
                  currentStep === 1
                    ? '0%'
                    : currentStep === 2
                    ? '50%'
                    : '90%',
              }}
            />

            {/* Step 1 */}
            <li className={styles.stepItem}>
              <div
                className={`${styles.stepCircle} ${
                  currentStep === 1
                    ? styles.stepCircleActive
                    : currentStep > 1
                    ? styles.stepCircleCompleted
                    : ''
                }`}
              >
                {currentStep > 1 ? <CheckCircle2 size={20} /> : '1'}
              </div>
              <span
                className={`${styles.stepLabel} ${
                  currentStep === 1 ? styles.stepLabelActive : ''
                }`}
              >
                Professional Profile
              </span>
            </li>

            {/* Step 2 */}
            <li className={styles.stepItem}>
              <div
                className={`${styles.stepCircle} ${
                  currentStep === 2
                    ? styles.stepCircleActive
                    : currentStep > 2
                    ? styles.stepCircleCompleted
                    : ''
                }`}
              >
                {currentStep > 2 ? <CheckCircle2 size={20} /> : '2'}
              </div>
              <span
                className={`${styles.stepLabel} ${
                  currentStep === 2 ? styles.stepLabelActive : ''
                }`}
              >
                Education &amp; Experience
              </span>
            </li>

            {/* Step 3 */}
            <li className={styles.stepItem}>
              <div
                className={`${styles.stepCircle} ${
                  currentStep === 3 ? styles.stepCircleActive : ''
                }`}
              >
                3
              </div>
              <span
                className={`${styles.stepLabel} ${
                  currentStep === 3 ? styles.stepLabelActive : ''
                }`}
              >
                Framework Confirmation
              </span>
            </li>
          </ol>
        </div>

        {/* Error Alert */}
        {error && (
          <div className={styles.errorBanner}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* ── STEP 1: Professional Profile ── */}
        {currentStep === 1 && (
          <div className={styles.formCard}>
            <div className={styles.cardHeader}>
              <h1 className={styles.cardTitle}>
                <Briefcase size={22} color="#2563eb" />
                Step 1: Professional Profile
              </h1>
              <p className={styles.cardSubtitle}>
                Tell us about your current administrative deployment and core operational responsibilities.
              </p>
            </div>

            <div className={styles.formGrid}>
              {/* Department */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <Building size={15} color="#475569" />
                  Assigned Department / Division *
                </label>
                <select
                  className={styles.selectInput}
                  value={form.department_id}
                  onChange={(e) => handleInputChange('department_id', e.target.value)}
                  disabled={loadingOptions}
                >
                  <option value="">Select Division / Department...</option>
                  {options.departments?.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
                <span className={styles.formHelper}>Official wing under MoSPI</span>
              </div>

              {/* Designation / Role */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <Shield size={15} color="#475569" />
                  Designation / Cadre Role *
                </label>
                <select
                  className={styles.selectInput}
                  value={form.role_id}
                  onChange={(e) => handleInputChange('role_id', e.target.value)}
                  disabled={loadingOptions}
                >
                  <option value="">Select Job Role...</option>
                  {options.roles?.map((role) => (
                    <option key={role._id} value={role._id}>
                      {role.name} — Tier {role.level}
                    </option>
                  ))}
                </select>
                <span className={styles.formHelper}>Maps to the 5-Tier Competency Framework</span>
              </div>

              {/* Functional Area */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <Layers size={15} color="#475569" />
                  Primary Functional Area
                </label>
                <select
                  className={styles.selectInput}
                  value={form.functional_area_id}
                  onChange={(e) => handleInputChange('functional_area_id', e.target.value)}
                  disabled={loadingOptions}
                >
                  <option value="">Select Functional Area...</option>
                  {options.functional_areas?.map((fa) => (
                    <option key={fa._id} value={fa._id}>
                      {fa.name}
                    </option>
                  ))}
                </select>
                <span className={styles.formHelper}>Your core domain of statistical or governance work</span>
              </div>

              {/* Years of Experience */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Years of Professional Experience *
                </label>
                <input
                  type="number"
                  min="0"
                  max="45"
                  className={styles.numberInput}
                  value={form.experience_years}
                  onChange={(e) => handleInputChange('experience_years', e.target.value)}
                  placeholder="e.g. 5"
                />
                <span className={styles.formHelper}>Total service in government or statistical systems</span>
              </div>

              {/* Current Responsibilities Multi-select */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label className={styles.formLabel}>
                  Current Core Responsibilities (Select all that apply)
                </label>
                <div className={styles.checkboxGrid}>
                  {options.responsibilities_options?.map((resp) => {
                    const isChecked = form.current_responsibilities.includes(resp)
                    return (
                      <div
                        key={resp}
                        className={`${styles.checkboxCard} ${
                          isChecked ? styles.checkboxCardActive : ''
                        }`}
                        onClick={() => toggleResponsibility(resp)}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by card click
                          style={{ accentColor: '#2563eb' }}
                        />
                        <span className={styles.checkboxLabel}>{resp}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className={styles.actionsRow}>
              <div />
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleNext}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save & Continue'}
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Education ── */}
        {currentStep === 2 && (
          <div className={styles.formCard}>
            <div className={styles.cardHeader}>
              <h1 className={styles.cardTitle}>
                <GraduationCap size={22} color="#2563eb" />
                Step 2: Academic &amp; Professional Education
              </h1>
              <p className={styles.cardSubtitle}>
                Add your formal academic background and relevant certifications for targeted course matching.
              </p>
            </div>

            <div className={styles.formGrid}>
              {/* Highest Qualification */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label className={styles.formLabel}>
                  Highest Qualification *
                </label>
                <div className={styles.radioGrid}>
                  {options.education_levels?.map((lvl) => {
                    const isSelected = form.education_level === lvl
                    return (
                      <div
                        key={lvl}
                        className={`${styles.radioCard} ${
                          isSelected ? styles.radioCardActive : ''
                        }`}
                        onClick={() => handleInputChange('education_level', lvl)}
                      >
                        <div
                          className={`${styles.radioCircle} ${
                            isSelected ? styles.radioCircleActive : ''
                          }`}
                        >
                          {isSelected && <div className={styles.radioDot} />}
                        </div>
                        <span className={styles.radioLabel}>{lvl}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Field of Study */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label className={styles.formLabel}>
                  Major Field of Study / Specialization
                </label>
                <input
                  type="text"
                  className={styles.textInput}
                  value={form.field_of_study}
                  onChange={(e) => handleInputChange('field_of_study', e.target.value)}
                  placeholder="e.g. Statistics, Mathematics, Econometrics, Computer Science"
                />
                <span className={styles.formHelper}>Primary academic discipline of your highest degree</span>
              </div>

              {/* Additional Certifications */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label className={styles.formLabel}>
                  <Award size={15} color="#475569" />
                  Additional Certifications (Select or Add Tags)
                </label>

                {/* Common options tag bank */}
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 8 }}>
                  Recommended Government &amp; Industry Credentials:
                </div>
                <div className={styles.tagList}>
                  {options.common_certifications?.map((cert) => {
                    const hasCert = form.certifications.includes(cert)
                    return (
                      <button
                        key={cert}
                        type="button"
                        onClick={() => {
                          if (hasCert) removeCert(cert)
                          else setForm((p) => ({ ...p, certifications: [...p.certifications, cert] }))
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          borderRadius: 20,
                          fontSize: '0.78125rem',
                          fontWeight: 600,
                          border: hasCert ? '1px solid #4338ca' : '1px solid #e2e8f0',
                          background: hasCert ? '#312e81' : '#ffffff',
                          color: hasCert ? '#ffffff' : '#334155',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {hasCert ? <CheckCircle2 size={13} /> : <Plus size={13} />}
                        <span>{cert}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Custom tags added */}
                {form.certifications.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                      Your Selected Certifications:
                    </div>
                    <div className={styles.tagList}>
                      {form.certifications.map((cert) => (
                        <span key={cert} className={styles.tagPill}>
                          <span>{cert}</span>
                          <button
                            type="button"
                            className={styles.tagRemoveBtn}
                            onClick={() => removeCert(cert)}
                            title="Remove"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom certification add input */}
                <div className={styles.customTagRow} style={{ marginTop: 10 }}>
                  <input
                    type="text"
                    className={styles.textInput}
                    value={customCertInput}
                    onChange={(e) => setCustomCertInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCustomCert()
                      }
                    }}
                    placeholder="Type other certification name and click Add..."
                  />
                  <button
                    type="button"
                    className={styles.addTagBtn}
                    onClick={addCustomCert}
                  >
                    Add Certificate
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.actionsRow}>
              <button
                type="button"
                className={styles.backBtn}
                onClick={handleBack}
                disabled={saving}
              >
                <ArrowLeft size={16} />
                Back to Professional Profile
              </button>

              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleNext}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Review & Confirm'}
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Confirmation ── */}
        {currentStep === 3 && (
          <div className={styles.formCard}>
            <div className={styles.cardHeader}>
              <h1 className={styles.cardTitle}>
                <Sparkles size={22} color="#f59e0b" />
                Step 3: Framework Confirmation
              </h1>
              <p className={styles.cardSubtitle}>
                Review your profile mapping before proceeding to your baseline diagnostic assessment.
              </p>
            </div>

            {/* Derived Level Card */}
            <div className={styles.derivedLevelCard}>
              <div className={styles.derivedLevelHeader}>
                <Shield size={16} color="#a5b4fc" />
                <span>Auto-Derived Competency Benchmark Tier</span>
              </div>
              <h2 className={styles.derivedLevelTitle}>
                {derivedLevelInfo.title}
              </h2>
              <p className={styles.derivedLevelDesc}>
                Based on your designation as <strong>{derivedLevelInfo.roleName}</strong> in{' '}
                <strong>{derivedLevelInfo.departmentName}</strong>, the platform has configured your required
                competency benchmarks at <strong>Level {derivedLevelInfo.level} of 5</strong> across MoSPI's 34
                official statistical and governance indicators.
              </p>
            </div>

            {/* Profile Summary Card */}
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Cadre Role</span>
                <span className={styles.summaryValue}>{derivedLevelInfo.roleName || 'Not Selected'}</span>
              </div>

              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Department</span>
                <span className={styles.summaryValue}>{derivedLevelInfo.departmentName || 'Not Selected'}</span>
              </div>

              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Experience</span>
                <span className={styles.summaryValue}>{form.experience_years} Years</span>
              </div>

              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Highest Degree</span>
                <span className={styles.summaryValue}>
                  {form.education_level}
                  {form.field_of_study ? ` (${form.field_of_study})` : ''}
                </span>
              </div>

              <div className={`${styles.summaryItem} ${styles.fullWidth}`}>
                <span className={styles.summaryLabel}>Core Responsibilities</span>
                <span className={styles.summaryValue} style={{ fontSize: '0.84rem', fontWeight: 500, color: '#334155' }}>
                  {form.current_responsibilities.length > 0
                    ? form.current_responsibilities.join(' • ')
                    : 'None specified'}
                </span>
              </div>

              {form.certifications.length > 0 && (
                <div className={`${styles.summaryItem} ${styles.fullWidth}`}>
                  <span className={styles.summaryLabel}>Certifications</span>
                  <span className={styles.summaryValue} style={{ fontSize: '0.84rem', fontWeight: 500, color: '#334155' }}>
                    {form.certifications.join(', ')}
                  </span>
                </div>
              )}
            </div>

            <div className={styles.actionsRow}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setCurrentStep(1)}
              >
                <Edit3 size={15} />
                Let Me Adjust Information
              </button>

              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleProceedToDiagnostic}
                disabled={saving}
                style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}
              >
                {saving ? 'Finalizing Profile...' : 'This Looks Right — Continue to Diagnostic Test'}
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
