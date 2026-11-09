import React, { useState, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Download,
  SlidersHorizontal,
  Calendar,
  Info,
  ClipboardCheck,
  ListOrdered,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  BookOpen,
  BarChart2,
  AlertCircle,
  Check,
} from 'lucide-react'
import { getSkillGaps } from '../../api/learningPath.api'
import { getMyEnrollments, enrollInCourse } from '../../api/course.api'
import { useAuthStore } from '../../store/authStore'
import { isValidStrictFiniteNumber, isValidCompetencyItem } from '../dashboard/EmployeeDashboard'
import styles from './SkillGapAnalysisPage.module.css'

// ── Standardized Gap Percentage Calculator (PART 18 FIX 2) ───────────────────
export function calculateStandardGapPercentage(gap) {
  if (!isValidStrictFiniteNumber(gap)) return 0
  const numGap = Number(gap)
  if (numGap <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((numGap / 5) * 100)))
}

export default function SkillGapAnalysisPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { t } = useTranslation()

  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'skills' | 'competencies' | 'role' | 'department' | 'proficiency'
  const [skillSearch, setSkillSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedPriority, setSelectedPriority] = useState('all')
  const [showFiltersModal, setShowFiltersModal] = useState(false)
  const [exportNotice, setExportNotice] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  // Track enrolling course IDs to handle loading states and prevent double-clicks
  const [enrollingCourses, setEnrollingCourses] = useState({})
  const isEnrollingRef = useRef({})

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Real backend query strictly scoped to logged-in user
  const { data: gapData, isLoading, isError } = useQuery({
    queryKey: ['skillGaps'],
    queryFn: getSkillGaps,
    retry: 1,
  })

  // User's active course enrollments from backend
  const { data: enrollData } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
    staleTime: 30 * 1000,
    retry: 1,
  })

  const enrollments = enrollData?.enrollments || []
  const enrolledCourseMap = useMemo(() => {
    const map = new Map()
    enrollments.forEach((e) => {
      const cId = e.courseId?._id ? String(e.courseId._id) : (e.courseId ? String(e.courseId) : null)
      if (cId) {
        map.set(cId, e)
      }
    })
    return map
  }, [enrollments])

  // ── Competency Data Integrity & Validation (PART 18 FIX 5) ───────────────────
  const rawGaps = gapData?.skill_gaps
  const isSkillGapsApiError = Boolean(isError)
  const isSkillGapsDataMissing = !gapData || !Array.isArray(rawGaps)

  // Filter strictly valid competency items; preserves valid records when unrelated records are invalid
  const validatedGaps = useMemo(() => {
    if (!Array.isArray(rawGaps)) return []
    return rawGaps.filter(isValidCompetencyItem)
  }, [rawGaps])

  const latestAssessment = gapData?.latest_assessment || null
  const aiAnalysis = latestAssessment?.ai_analysis || null

  // Authoritative backend metadata
  const roleResolved = gapData?.role_resolved
  const roleCompetenciesCount = gapData?.role_competencies_count
  const hasAssignedCompetenciesFlag = gapData?.has_assigned_competencies

  // Authoritative state classification (Part 18 Requirement 7 & 8)
  const isConfirmedZeroCompetencies =
    !isSkillGapsApiError &&
    roleResolved === true &&
    (roleCompetenciesCount === 0 || hasAssignedCompetenciesFlag === false) &&
    validatedGaps.length === 0

  const isUnresolvedRole =
    !isSkillGapsApiError &&
    roleResolved === false &&
    validatedGaps.length === 0

  const isDataUnavailable =
    isSkillGapsApiError ||
    isSkillGapsDataMissing ||
    isUnresolvedRole ||
    (Array.isArray(rawGaps) && rawGaps.length > 0 && validatedGaps.length === 0)

  // Metrics computation from validated records only
  const totalSkills = validatedGaps.length
  const sumCurrent = validatedGaps.reduce((acc, g) => acc + Number(g.current_level), 0)
  const sumRequired = validatedGaps.reduce((acc, g) => acc + Number(g.required_level), 0)
  const readinessPct = sumRequired > 0 ? Math.round((sumCurrent / sumRequired) * 100) : 0
  const avgGap = totalSkills > 0 ? (validatedGaps.reduce((acc, g) => acc + Number(g.gap), 0) / totalSkills).toFixed(1) : '0.0'

  const highPriorityGaps = validatedGaps.filter((g) => g.priority === 'high' || Number(g.gap) >= 2)
  const medPriorityGaps = validatedGaps.filter((g) => g.priority === 'medium' || (Number(g.gap) === 1 && g.priority !== 'high'))
  const lowPriorityGaps = validatedGaps.filter((g) => g.priority === 'low' && Number(g.gap) > 0)
  const onTrackGaps = validatedGaps.filter((g) => Number(g.gap) <= 0 || Number(g.current_level) >= Number(g.required_level))
  const aheadGaps = validatedGaps.filter((g) => Number(g.current_level) > Number(g.required_level))

  // Top 5 Skills with Highest Gap (Standardized formula)
  const top5Skills = useMemo(() => {
    return [...validatedGaps]
      .filter((g) => Number(g.gap) > 0)
      .sort((a, b) => Number(b.gap) - Number(a.gap))
      .slice(0, 5)
      .map((g) => {
        const name = g.competency_id?.name || g.name || 'Competency'
        const gapPct = calculateStandardGapPercentage(g.gap)
        return {
          name,
          current: Number(g.current_level),
          required: Number(g.required_level),
          gap: Number(g.gap),
          gapPct,
        }
      })
  }, [validatedGaps])

  // Group by Competency Area / Category
  const competencyAreas = useMemo(() => {
    const map = {}
    validatedGaps.forEach((g) => {
      const area = g.competency_id?.category || g.competency_id?.name || g.category || 'Core Competency'
      if (!map[area]) {
        map[area] = { area, currentSum: 0, requiredSum: 0, gapSum: 0, count: 0, maxPriority: 'low' }
      }
      map[area].currentSum += Number(g.current_level)
      map[area].requiredSum += Number(g.required_level)
      map[area].gapSum += Math.max(0, Number(g.gap))
      map[area].count += 1
      if (g.priority === 'high' || Number(g.gap) >= 2) map[area].maxPriority = 'high'
      else if (g.priority === 'medium' && map[area].maxPriority !== 'high') map[area].maxPriority = 'medium'
    })

    return Object.values(map).map((item) => {
      const currentPct = Math.min(100, Math.round(((item.currentSum / item.count) / 5) * 100))
      const requiredPct = Math.min(100, Math.round(((item.requiredSum / item.count) / 5) * 100))
      const gapPct = Math.max(0, Math.min(100, Math.round(((item.gapSum / item.count) / 5) * 100)))
      return {
        area: item.area,
        current: currentPct,
        required: requiredPct,
        gap: gapPct,
        priority: item.maxPriority === 'high' ? 'High' : item.maxPriority === 'medium' ? 'Medium' : 'Low',
        count: item.count,
      }
    })
  }, [validatedGaps])

  // Chart data for Overview Combo Chart (max 7 areas)
  const overviewBars = useMemo(() => {
    if (competencyAreas.length > 1) {
      return competencyAreas.slice(0, 7)
    }
    // If only 1 category exists, map per-competency records
    return validatedGaps.slice(0, 7).map((g) => ({
      area: g.competency_id?.name || g.name || 'Skill',
      current: Math.min(100, Math.round((Number(g.current_level) / 5) * 100)),
      required: Math.min(100, Math.round((Number(g.required_level) / 5) * 100)),
      gap: calculateStandardGapPercentage(g.gap),
      priority: g.priority === 'high' || Number(g.gap) >= 2 ? 'High' : g.priority === 'medium' ? 'Medium' : 'Low',
    }))
  }, [competencyAreas, validatedGaps])

  // Granular active skills list for By Skills tab with standardized gap percentage
  const activeSkillsList = useMemo(() => {
    return validatedGaps.map((g, idx) => {
      const name = g.competency_id?.name || g.name || `Skill ${idx + 1}`
      const category = g.competency_id?.category || g.category || 'Core Competency'
      const cur = Number(g.current_level)
      const req = Number(g.required_level)
      const gap = Number(g.gap)
      const gapPct = calculateStandardGapPercentage(gap)
      const priority = g.priority === 'high' || gap >= 2 ? 'High' : g.priority === 'medium' ? 'Medium' : gap > 0 ? 'Low' : 'None'
      const course = g.course || null
      return {
        id: `SK-${String(idx + 1).padStart(2, '0')}`,
        competencyId: g.competency_id?._id ? String(g.competency_id._id) : (typeof g.competency_id === 'string' ? g.competency_id : null),
        name,
        category,
        current: cur,
        required: req,
        gap: gap > 0 ? `${gapPct}% (${gap} lvl)` : '0%',
        priority,
        course,
      }
    })
  }, [validatedGaps])

  // Handle enrollment in the course mapped to this skill gap
  const handleEnroll = async (skill) => {
    const courseId = skill.course?._id ? String(skill.course._id) : null
    if (!courseId) {
      showToast(t('skillGap.toasts.no_course_mapped', 'No capacity development course is currently mapped for this competency.'))
      return
    }

    // Already enrolled check
    if (enrolledCourseMap.has(courseId)) {
      navigate(`/my-courses/${courseId}`)
      return
    }

    // Prevent repeated clicks / concurrent calls
    if (enrollingCourses[courseId] || isEnrollingRef.current[courseId]) {
      return
    }

    isEnrollingRef.current[courseId] = true
    setEnrollingCourses((prev) => ({ ...prev, [courseId]: true }))

    try {
      await enrollInCourse(courseId)
      await queryClient.invalidateQueries({ queryKey: ['myEnrollments'] })
      showToast(t('skillGap.toasts.enrolled_success', { title: skill.course.title || 'course', defaultValue: `Enrolled in "${skill.course.title || 'course'}" successfully! Opening learning player...` }))
      setTimeout(() => {
        navigate(`/my-courses/${courseId}`)
      }, 700)
    } catch (err) {
      const status = err.response?.status
      if (status === 409) {
        await queryClient.invalidateQueries({ queryKey: ['myEnrollments'] })
        showToast(t('skillGap.toasts.already_enrolled', 'Already enrolled in this course. Opening learning player...'))
        setTimeout(() => {
          navigate(`/my-courses/${courseId}`)
        }, 700)
        return
      }
      if (status === 404) {
        showToast(t('skillGap.toasts.course_unavailable', 'This course is currently unavailable or has been archived.'))
        return
      }
      console.error('Enrollment error:', err)
      showToast(t('skillGap.toasts.enroll_failed', 'Enrollment failed due to connection error. Click Enroll to retry.'))
    } finally {
      delete isEnrollingRef.current[courseId]
      setEnrollingCourses((prev) => {
        const next = { ...prev }
        delete next[courseId]
        return next
      })
    }
  }

  // Available categories for filter dropdown
  const uniqueCategories = useMemo(() => {
    const cats = new Set(activeSkillsList.map((s) => s.category))
    return Array.from(cats)
  }, [activeSkillsList])

  // Filter skills for 'By Skills' tab
  const filteredSkills = activeSkillsList.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(skillSearch.toLowerCase())
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory
    const matchesPri = selectedPriority === 'all' || s.priority === selectedPriority
    return matchesSearch && matchesCat && matchesPri
  })

  // Export report function
  const handleExport = () => {
    if (validatedGaps.length === 0) return
    const csvHeader = 'Skill ID,Skill Title,Category,Current Level,Required Level,Gap,Priority\n'
    const csvRows = validatedGaps.map((g, idx) => {
      const name = `"${(g.competency_id?.name || g.name || '').replace(/"/g, '""')}"`
      const cat = `"${(g.competency_id?.category || g.category || 'Core').replace(/"/g, '""')}"`
      return `SK-${idx + 1},${name},${cat},${Number(g.current_level) || 0},${Number(g.required_level) || 0},${Number(g.gap) || 0},${g.priority || 'normal'}`
    }).join('\n')
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `KaushalAI_Skill_Gap_Analytics_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setExportNotice(true)
    setTimeout(() => setExportNotice(false), 2500)
  }

  // Donut SVG calculations
  const circumference = 2 * Math.PI * 48 // ~301.59
  const highPct = totalSkills > 0 ? highPriorityGaps.length / totalSkills : 0
  const medPct = totalSkills > 0 ? medPriorityGaps.length / totalSkills : 0
  const lowPct = totalSkills > 0 ? lowPriorityGaps.length / totalSkills : 0
  const onTrackPct = totalSkills > 0 ? onTrackGaps.length / totalSkills : 0

  const highStroke = highPct * circumference
  const medStroke = medPct * circumference
  const lowStroke = lowPct * circumference
  const onTrackStroke = onTrackPct * circumference

  const highOffset = 0
  const medOffset = -highStroke
  const lowOffset = -(highStroke + medStroke)
  const onTrackOffset = -(highStroke + medStroke + lowStroke)

  return (
    <div className={styles.page}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 500,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <Sparkles size={16} color="#818cf8" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Breadcrumb ── */}
      <div className={styles.breadcrumb}>
        <Link to="/dashboard" className={styles.breadcrumbLink}>
          {t('skillGap.breadcrumb_dashboard', 'Dashboard')}
        </Link>
        <span>&gt;</span>
        <span className={styles.breadcrumbCurrent}>{t('skillGap.breadcrumb_current', 'Skill Gap Analysis')}</span>
      </div>

      {/* ── Page Header ── */}
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{t('skillGap.title', 'Skill Gap Analytics')}</h1>
            <span
              className={styles.infoIcon}
              title={t('skillGap.role_label', {
                role: user?.role_id?.title || user?.designation || 'Officer',
                department: user?.department || 'Government Organization',
                defaultValue: `Role: ${user?.role_id?.title || 'Officer'} | Department: ${user?.department || 'Government Organization'}`
              })}
            >
              <Info size={17} />
            </span>
          </div>
          <p className={styles.subtitle}>
            {t('skillGap.subtitle', 'Identify the gap between your current proficiency and role requirements. Focus on high-impact areas to accelerate your growth.')}
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.outlineActionBtn}
            onClick={handleExport}
            disabled={totalSkills === 0}
            title={t('skillGap.export_report', 'Download CSV report')}
          >
            <Download size={15} />
            {t('skillGap.export_report', 'Export Report')}
          </button>

          <button
            type="button"
            className={styles.outlineActionBtn}
            onClick={() => setShowFiltersModal(!showFiltersModal)}
            title={t('skillGap.filters', 'Toggle filters')}
          >
            <SlidersHorizontal size={15} />
            {t('skillGap.filters', 'Filters')}
          </button>

          <div className={styles.dateRangePicker}>
            <Calendar size={15} color="var(--color-primary-600)" />
            <span>{t('skillGap.diagnostic_baseline', 'Diagnostic Baseline')}</span>
          </div>
        </div>
      </div>

      {exportNotice && (
        <div
          style={{
            padding: '10px 16px',
            background: '#f0fdf4',
            border: '1px solid #dcfce7',
            borderRadius: 8,
            color: '#15803d',
            fontSize: '0.8125rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
          }}
        >
          <Check size={16} />
          {t('skillGap.export_success', 'Skill Gap Analytics Report exported successfully.')}
        </div>
      )}

      {/* ── Dynamic State Banners (PART 18 FIX 5 & 1) ── */}
      {!isLoading && totalSkills === 0 && (
        <div
          style={{
            padding: '24px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          <AlertCircle size={36} color="var(--color-primary-600)" style={{ margin: '0 auto 12px' }} />
          {isConfirmedZeroCompetencies ? (
            <>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                {t('skillGap.no_competencies_assigned_title', 'No Role Competencies Assigned')}
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: 480, margin: '0 auto 16px' }}>
                {t('skillGap.no_competencies_assigned_desc', 'Your current cadre role does not have assigned benchmark competencies in the competency directory yet. Consult your cadre administrator.')}
              </p>
            </>
          ) : isDataUnavailable ? (
            <>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                {t('skillGap.data_unavailable_title', 'Competency Data Unavailable')}
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: 480, margin: '0 auto 16px' }}>
                {t('skillGap.data_unavailable_desc', 'Competency evaluation data is currently unavailable or unverified for your profile. Please check back later or contact support.')}
              </p>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                {t('skillGap.no_assessment_title', 'No Assessment Results Found')}
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: 480, margin: '0 auto 16px' }}>
                {t('skillGap.no_assessment_desc', 'Complete your diagnostic assessment to calculate real skill gaps, generate your competency matrix, and unlock AI course recommendations.')}
              </p>
              <Link
                to="/diagnostic-test"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  background: 'var(--color-primary-600)',
                  color: '#ffffff',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                }}
              >
                {t('skillGap.take_assessment', 'Take Diagnostic Assessment →')}
              </Link>
            </>
          )}
        </div>
      )}

      {/* ── Secondary Tab Bar ── */}
      <nav className={styles.tabBar} aria-label="Skill Gap Views">
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          {t('skillGap.tab_overview', 'Overview')}
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'skills' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          {t('skillGap.tab_skills', { count: totalSkills, defaultValue: `By Skills (${totalSkills})` })}
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'competencies' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('competencies')}
        >
          {t('skillGap.tab_competencies', { count: competencyAreas.length, defaultValue: `By Competencies (${competencyAreas.length})` })}
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'role' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('role')}
        >
          {t('skillGap.tab_role', 'By Role')}
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'department' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('department')}
        >
          {t('skillGap.tab_department', 'By Department')}
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'proficiency' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('proficiency')}
        >
          {t('skillGap.tab_proficiency', 'By Proficiency Level')}
        </button>
      </nav>

      {/* ──────────────────────────────────────────────────────────────────────
          TAB 1: OVERVIEW (Real Data Driven)
          ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          {aiAnalysis && (
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
              border: '1px solid #bbf7d0',
              borderRadius: 16,
              padding: '20px 24px',
              marginBottom: 24,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: '#166534', color: '#ffffff', borderRadius: 9999, fontSize: '0.8125rem', fontWeight: 700 }}>
                  <Sparkles size={14} />
                  <span>{t('skillGap.grok_badge', 'Grok AI Assessment Diagnostic')}</span>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d' }}>
                  {t('skillGap.model_label', { model: aiAnalysis.model || 'grok-2-latest', defaultValue: `Model: ${aiAnalysis.model || 'grok-2-latest'}` })}
                </span>
              </div>
              <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#14532d', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                "{aiAnalysis.summary}"
              </p>
              {aiAnalysis.learning_focus && (
                <div style={{ fontSize: '0.8125rem', color: '#1e40af', background: '#eff6ff', padding: '10px 14px', borderRadius: 10, border: '1px solid #bfdbfe', fontWeight: 600 }}>
                  <strong>{t('skillGap.strategic_focus', 'Strategic Focus:')}</strong> {aiAnalysis.learning_focus}
                </div>
              )}
            </div>
          )}

          {/* ── 5 Metric Cards in a Row ── */}
          <section className={styles.metricsGrid}>
            {/* Card 1: Overall Skill Readiness */}
            <div className={styles.metricCard}>
              <div className={`${styles.metricIconWrap} ${styles.iconPurple}`}>
                <ClipboardCheck size={20} />
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricLabel}>{t('skillGap.metric_readiness', 'Overall Readiness Score')}</span>
                <div className={styles.metricValueRow}>
                  <span className={styles.metricValue}>{readinessPct}%</span>
                  <span className={styles.metricStatus}>
                    {readinessPct >= 80 ? t('skillGap.status_high', 'High') : readinessPct >= 50 ? t('skillGap.status_moderate', 'Moderate') : t('skillGap.status_low', 'Low')}
                  </span>
                </div>
                <div className={styles.deltaBadge}>
                  <span>{t('skillGap.avg_gap', { gap: avgGap, defaultValue: `Avg gap: ${avgGap} levels` })}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Skills Assessed */}
            <div className={styles.metricCard}>
              <div className={`${styles.metricIconWrap} ${styles.iconBlue}`}>
                <ListOrdered size={20} />
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricLabel}>{t('skillGap.metric_skills_assessed', 'Skills Assessed')}</span>
                <div className={styles.metricValueRow}>
                  <span className={styles.metricValue}>{totalSkills}</span>
                </div>
                <span className={styles.metricSubtext}>
                  {competencyAreas.length === 1
                    ? t('skillGap.skills_assessed_sub_one', { count: 1, defaultValue: 'Across 1 Competency Area' })
                    : t('skillGap.skills_assessed_sub_other', { count: competencyAreas.length, defaultValue: `Across ${competencyAreas.length} Competency Areas` })}
                </span>
              </div>
            </div>

            {/* Card 3: High Priority Gaps */}
            <div className={styles.metricCard}>
              <div className={`${styles.metricIconWrap} ${styles.iconRed}`}>
                <AlertTriangle size={20} />
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricLabel}>{t('skillGap.metric_high_priority', 'High Priority Gaps')}</span>
                <div className={styles.metricValueRow}>
                  <span className={styles.metricValue}>{highPriorityGaps.length}</span>
                </div>
                <span className={`${styles.metricSubtext} ${styles.textRed}`}>
                  {t('skillGap.high_priority_sub', 'Require Immediate Attention')}
                </span>
              </div>
            </div>

            {/* Card 4: Skills On Track */}
            <div className={styles.metricCard}>
              <div className={`${styles.metricIconWrap} ${styles.iconGreen}`}>
                <CheckCircle2 size={20} />
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricLabel}>{t('skillGap.metric_on_track', 'Skills On Track')}</span>
                <div className={styles.metricValueRow}>
                  <span className={styles.metricValue}>{onTrackGaps.length}</span>
                </div>
                <span className={styles.metricSubtext}>{t('skillGap.on_track_sub', 'Meeting Required Level')}</span>
              </div>
            </div>

            {/* Card 5: Skills Ahead */}
            <div className={styles.metricCard}>
              <div className={`${styles.metricIconWrap} ${styles.iconSky}`}>
                <TrendingUp size={20} />
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricLabel}>{t('skillGap.metric_ahead', 'Skills Ahead')}</span>
                <div className={styles.metricValueRow}>
                  <span className={styles.metricValue}>{aheadGaps.length}</span>
                </div>
                <span className={styles.metricSubtext}>{t('skillGap.ahead_sub', 'Exceeding Target Level')}</span>
              </div>
            </div>
          </section>

          {/* ── Middle Row: 2-column Grid ── */}
          <section className={styles.middleGrid}>
            {/* Left: Skill Gap Overview Combo Chart */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{t('skillGap.chart_title', 'Skill Gap Overview')}</h2>
                <div className={styles.chartLegendRow}>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDotCurrent} />
                    <span>{t('skillGap.legend_current', 'Current (%)')}</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDotRequired} />
                    <span>{t('skillGap.legend_required', 'Required (%)')}</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendSquareGap} />
                    <span>{t('skillGap.legend_gap', 'Gap (%)')}</span>
                  </div>
                </div>
              </div>

              {/* Combo Bar + Line Chart SVG */}
              <div className={styles.svgChartContainer}>
                {overviewBars.length === 0 ? (
                  <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                    {t('skillGap.no_competency_data', 'No competency data available yet.')}
                  </div>
                ) : (
                  <svg viewBox="0 0 740 260" className={styles.chartSvg}>
                    {/* Grid Lines */}
                    {[
                      { label: '100', y: 25 },
                      { label: '75', y: 72 },
                      { label: '50', y: 120 },
                      { label: '25', y: 168 },
                      { label: '0', y: 216 },
                    ].map((g) => (
                      <g key={g.label}>
                        <text x="24" y={g.y + 4} fontSize="11" fill="#94a3b8" textAnchor="end">
                          {g.label}
                        </text>
                        <line
                          x1="36"
                          y1={g.y}
                          x2="720"
                          y2={g.y}
                          stroke="#f1f5f9"
                          strokeDasharray={g.label === '0' ? 'none' : '3 3'}
                          strokeWidth="1.2"
                        />
                      </g>
                    ))}

                    {/* Bars for Gap (%) */}
                    {overviewBars.map((b, i) => {
                      const spacing = Math.floor(660 / Math.max(1, overviewBars.length))
                      const cx = 65 + i * spacing + spacing / 2
                      const barH = Math.max(4, (b.gap / 100) * 191)
                      const barY = 216 - barH
                      return (
                        <g key={b.area || i}>
                          {/* Rounded Bar */}
                          <rect
                            x={cx - 18}
                            y={barY}
                            width="36"
                            height={barH}
                            rx="4"
                            fill="var(--color-primary-600)"
                            opacity="0.88"
                          />
                          {/* Top Gap Value inside bar */}
                          <text
                            x={cx}
                            y={Math.max(35, barY + 14)}
                            fontSize="11"
                            fontWeight="700"
                            fill="#ffffff"
                            textAnchor="middle"
                          >
                            {b.gap}%
                          </text>
                          {/* Bottom Current Value inside bar */}
                          <text
                            x={cx}
                            y={208}
                            fontSize="10"
                            fontWeight="600"
                            fill="rgba(255,255,255,0.85)"
                            textAnchor="middle"
                          >
                            {b.current}%
                          </text>
                          {/* Category Name below */}
                          <text
                            x={cx}
                            y="236"
                            fontSize="10"
                            fontWeight="600"
                            fill="#475569"
                            textAnchor="middle"
                          >
                            {(b.area || '').length > 14 ? `${(b.area || '').slice(0, 13)}…` : b.area}
                          </text>
                        </g>
                      )
                    })}

                    {/* Line 1: Required Proficiency (Gray Dashed Line) */}
                    <polyline
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1.8"
                      strokeDasharray="4 4"
                      points={overviewBars.map((b, i) => {
                        const spacing = Math.floor(660 / Math.max(1, overviewBars.length))
                        const cx = 65 + i * spacing + spacing / 2
                        const py = 216 - (b.required / 100) * 191
                        return `${cx},${py}`
                      }).join(' ')}
                    />
                    {overviewBars.map((b, i) => {
                      const spacing = Math.floor(660 / Math.max(1, overviewBars.length))
                      const cx = 65 + i * spacing + spacing / 2
                      const py = 216 - (b.required / 100) * 191
                      return (
                        <g key={'req-' + i}>
                          <circle cx={cx} cy={py} r="4" fill="#ffffff" stroke="#94a3b8" strokeWidth="2" />
                          <text x={cx} y={py - 8} fontSize="9.5" fontWeight="600" fill="#64748b" textAnchor="middle">
                            {b.required}%
                          </text>
                        </g>
                      )
                    })}

                    {/* Line 2: Current Proficiency (Purple Solid Line) */}
                    <polyline
                      fill="none"
                      stroke="var(--color-primary-500)"
                      strokeWidth="2.4"
                      points={overviewBars.map((b, i) => {
                        const spacing = Math.floor(660 / Math.max(1, overviewBars.length))
                        const cx = 65 + i * spacing + spacing / 2
                        const py = 216 - (b.current / 100) * 191
                        return `${cx},${py}`
                      }).join(' ')}
                    />
                    {overviewBars.map((b, i) => {
                      const spacing = Math.floor(660 / Math.max(1, overviewBars.length))
                      const cx = 65 + i * spacing + spacing / 2
                      const py = 216 - (b.current / 100) * 191
                      return (
                        <circle
                          key={'curr-' + i}
                          cx={cx}
                          cy={py}
                          r="4"
                          fill="var(--color-primary-600)"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      )
                    })}
                  </svg>
                )}
              </div>

              <button
                type="button"
                className={styles.cardFooterBtn}
                onClick={() => setActiveTab('skills')}
              >
                {t('skillGap.view_skill_details', 'View Skill-wise Details →')}
              </button>
            </div>

            {/* Right Stack: Donut Chart + Top 5 Skills */}
            <div className={styles.rightStack}>
              {/* Card 1: Gap by Proficiency Level */}
              <div className={styles.card}>
                <div className={styles.cardHeader} style={{ marginBottom: 8 }}>
                  <h3 className={styles.cardTitle}>{t('skillGap.donut_title', 'Gap Distribution')}</h3>
                </div>

                <div className={styles.donutWrapper}>
                  <div className={styles.donutSvgBox}>
                    <svg viewBox="0 0 140 140" className={styles.donutSvg}>
                      {totalSkills > 0 ? (
                        <>
                          {/* High Gap */}
                          <circle
                            cx="70"
                            cy="70"
                            r="48"
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="18"
                            strokeDasharray={`${highStroke} ${circumference}`}
                            strokeDashoffset={highOffset}
                          />
                          {/* Medium Gap */}
                          <circle
                            cx="70"
                            cy="70"
                            r="48"
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="18"
                            strokeDasharray={`${medStroke} ${circumference}`}
                            strokeDashoffset={medOffset}
                          />
                          {/* Low Gap */}
                          <circle
                            cx="70"
                            cy="70"
                            r="48"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="18"
                            strokeDasharray={`${lowStroke} ${circumference}`}
                            strokeDashoffset={lowOffset}
                          />
                          {/* On Track */}
                          <circle
                            cx="70"
                            cy="70"
                            r="48"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="18"
                            strokeDasharray={`${onTrackStroke} ${circumference}`}
                            strokeDashoffset={onTrackOffset}
                          />
                        </>
                      ) : (
                        <circle
                          cx="70"
                          cy="70"
                          r="48"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="18"
                        />
                      )}
                    </svg>

                    <div className={styles.donutCenterLabel}>
                      <span className={styles.donutTotalNum}>{totalSkills}</span>
                      <span className={styles.donutTotalText}>{t('skillGap.total_skills', 'Total Skills')}</span>
                    </div>
                  </div>

                  <div className={styles.donutLegendList}>
                    <div className={styles.donutLegendRow}>
                      <div className={styles.donutLegendLeft}>
                        <span className={styles.donutSquare} style={{ background: '#ef4444' }} />
                        <span>{t('skillGap.priority_high', 'High Priority')}</span>
                      </div>
                      <span className={styles.donutLegendCount}>
                        {highPriorityGaps.length} ({Math.round(highPct * 100)}%)
                      </span>
                    </div>

                    <div className={styles.donutLegendRow}>
                      <div className={styles.donutLegendLeft}>
                        <span className={styles.donutSquare} style={{ background: '#f59e0b' }} />
                        <span>{t('skillGap.priority_medium', 'Medium Priority')}</span>
                      </div>
                      <span className={styles.donutLegendCount}>
                        {medPriorityGaps.length} ({Math.round(medPct * 100)}%)
                      </span>
                    </div>

                    <div className={styles.donutLegendRow}>
                      <div className={styles.donutLegendLeft}>
                        <span className={styles.donutSquare} style={{ background: '#10b981' }} />
                        <span>{t('skillGap.priority_low', 'Low Priority')}</span>
                      </div>
                      <span className={styles.donutLegendCount}>
                        {lowPriorityGaps.length} ({Math.round(lowPct * 100)}%)
                      </span>
                    </div>

                    <div className={styles.donutLegendRow}>
                      <div className={styles.donutLegendLeft}>
                        <span className={styles.donutSquare} style={{ background: '#3b82f6' }} />
                        <span>{t('skillGap.on_track_ahead', 'On Track / Ahead')}</span>
                      </div>
                      <span className={styles.donutLegendCount}>
                        {onTrackGaps.length} ({Math.round(onTrackPct * 100)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Top 5 Skills with Highest Gap */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>
                    {t('skillGap.top_skills_title', { count: top5Skills.length, defaultValue: `Top ${top5Skills.length} Skills with Highest Gap` })}
                  </h3>
                  <button
                    type="button"
                    className={styles.viewAllLink}
                    onClick={() => setActiveTab('skills')}
                  >
                    {t('skillGap.view_all', 'View All')}
                  </button>
                </div>

                <div className={styles.topSkillsList}>
                  {top5Skills.length === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: '0.8125rem' }}>
                      {totalSkills === 0
                        ? t('skillGap.no_competency_data', 'No assessment data.')
                        : t('skillGap.no_active_gaps', 'Great job! No active skill gaps identified.')}
                    </div>
                  ) : (
                    top5Skills.map((skill) => (
                      <div key={skill.name} className={styles.skillProgressItem}>
                        <div className={styles.skillProgressTop}>
                          <span className={styles.skillProgressName}>{skill.name}</span>
                          <span className={styles.skillProgressGap}>
                            {t('skillGap.skill_level_gap', {
                              current: skill.current,
                              required: skill.required,
                              gap: skill.gap,
                              defaultValue: `Lvl ${skill.current} → ${skill.required} (Gap: ${skill.gap})`
                            })}
                          </span>
                        </div>
                        <div className={styles.skillProgressBar}>
                          <div
                            className={styles.skillProgressFill}
                            style={{ width: `${Math.min(100, Math.max(10, skill.gapPct))}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── Bottom Row: 3-column Grid ── */}
          <section className={styles.bottomGrid}>
            {/* Card 1: Diagnostic Assessment Baseline */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{t('skillGap.baseline_title', 'Assessment Baseline')}</h3>
                <div className={styles.legendItem}>
                  <span className={styles.legendDotCurrent} />
                  <span>{t('skillGap.readiness_label', { pct: readinessPct, defaultValue: `Readiness (${readinessPct}%)` })}</span>
                </div>
              </div>

              <div className={styles.trendSvgBox}>
                <svg viewBox="0 0 380 150" style={{ width: '100%', height: '100%' }}>
                  {/* Grid Lines */}
                  {[
                    { label: '100%', y: 25 },
                    { label: '75%', y: 55 },
                    { label: '50%', y: 85 },
                    { label: '25%', y: 115 },
                  ].map((g) => (
                    <g key={g.label}>
                      <text x="32" y={g.y + 4} fontSize="10" fill="#94a3b8" textAnchor="end">
                        {g.label}
                      </text>
                      <line
                        x1="40"
                        y1={g.y}
                        x2="370"
                        y2={g.y}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                    </g>
                  ))}

                  {/* Baseline Target line */}
                  <line
                    x1="40"
                    y1={135 - (readinessPct / 100) * 110}
                    x2="370"
                    y2={135 - (readinessPct / 100) * 110}
                    stroke="#818cf8"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />

                  {/* Single Diagnostic Baseline Point */}
                  <g>
                    <circle
                      cx="205"
                      cy={135 - (readinessPct / 100) * 110}
                      r="6"
                      fill="var(--color-primary-600)"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x="205"
                      y={Math.max(16, 135 - (readinessPct / 100) * 110 - 10)}
                      fontSize="11"
                      fontWeight="700"
                      fill="var(--color-primary-600)"
                      textAnchor="middle"
                    >
                      {readinessPct}%
                    </text>
                    <text
                      x="205"
                      y="142"
                      fontSize="10"
                      fontWeight="600"
                      fill="#64748b"
                      textAnchor="middle"
                    >
                      {t('skillGap.current_diagnostic_baseline', 'Current Diagnostic Baseline')}
                    </text>
                  </g>
                </svg>
              </div>

              <div className={styles.trendBanner}>
                <CheckCircle2 size={16} style={{ flexShrink: 0, color: 'var(--color-primary-600)' }} />
                <span>
                  {t('skillGap.trend_notice', 'Historical trends will appear as you complete future post-course assessments.')}
                </span>
              </div>
            </div>

            {/* Card 2: Gap by Competency Area */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{t('skillGap.competency_area_title', 'Gap by Competency Area')}</h3>
                <button
                  type="button"
                  className={styles.viewAllLink}
                  onClick={() => setActiveTab('competencies')}
                >
                  {t('skillGap.view_all', 'View All')}
                </button>
              </div>

              <table className={styles.competencyTable}>
                <thead>
                  <tr>
                    <th>{t('skillGap.th_competency_area', 'Competency Area')}</th>
                    <th>{t('skillGap.th_current', 'Current')}</th>
                    <th>{t('skillGap.th_required', 'Required')}</th>
                    <th>{t('skillGap.th_gap', 'Gap')}</th>
                    <th>{t('skillGap.th_priority', 'Priority')}</th>
                  </tr>
                </thead>
                <tbody>
                  {competencyAreas.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                        {t('skillGap.no_competency_area_data', 'No competency area data.')}
                      </td>
                    </tr>
                  ) : (
                    competencyAreas.map((row) => {
                      let pillClass = styles.pillMedium
                      if (row.priority === 'High') pillClass = styles.pillHigh
                      if (row.priority === 'Low') pillClass = styles.pillLow
                      return (
                        <tr key={row.area}>
                          <td className={styles.areaNameCell}>{row.area}</td>
                          <td>{row.current}%</td>
                          <td>{row.required}%</td>
                          <td>{row.gap}%</td>
                          <td>
                            <span className={`${styles.priorityPill} ${pillClass}`}>
                              {row.priority === 'High' ? t('skillGap.priority_high', 'High Priority') : row.priority === 'Medium' ? t('skillGap.priority_medium', 'Medium Priority') : t('skillGap.priority_low', 'Low Priority')}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Card 3: Recommendations (PART 18 FIX 4 - CTA TO /recommendations) */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  <Sparkles size={16} color="var(--color-primary-600)" />
                  {t('skillGap.recommendations_title', 'Recommendations')}
                </h3>
              </div>

              <div className={styles.recommendationsList}>
                <div className={styles.recommendationItem}>
                  <div className={`${styles.recIconWrap} ${styles.recIconRed}`}>
                    <AlertCircle size={15} />
                  </div>
                  <span>
                    {highPriorityGaps.length > 0
                      ? t('skillGap.rec_high_priority', { count: highPriorityGaps.length, defaultValue: `Focus on your ${highPriorityGaps.length} high priority gap(s) to close role discrepancies rapidly.` })
                      : t('skillGap.rec_all_good', 'Maintain strong performance across your evaluated competencies.')}
                  </span>
                </div>

                <div className={styles.recommendationItem}>
                  <div className={`${styles.recIconWrap} ${styles.recIconOrange}`}>
                    <BookOpen size={15} />
                  </div>
                  <span>
                    {t('skillGap.rec_personalized', 'Your personalized learning path has prioritized courses mapped directly to these competencies.')}
                  </span>
                </div>

                <div className={styles.recommendationItem}>
                  <div className={`${styles.recIconWrap} ${styles.recIconGreen}`}>
                    <BarChart2 size={15} />
                  </div>
                  <span>
                    {t('skillGap.rec_retake', 'Retaking assessments upon course completion will raise your verified skill levels in real-time.')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className={styles.viewPathBtn}
                onClick={() => navigate('/recommendations')}
              >
                {t('skillGap.view_recommended_learning', 'Explore Recommended Courses →')}
              </button>
            </div>
          </section>
        </>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          TAB 2: BY SKILLS (Granular Skill Registry)
          ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'skills' && (
        <div className={styles.tabContentCard}>
          <div className={styles.filterBar}>
            <input
              type="text"
              className={styles.filterSearchInput}
              placeholder={t('skillGap.search_placeholder', 'Search skill title or keyword...')}
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
            />

            <select
              className={styles.filterSelect}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">{t('skillGap.all_competency_areas', 'All Competency Areas')}</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              className={styles.filterSelect}
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
            >
              <option value="all">{t('skillGap.all_priorities', 'All Priorities')}</option>
              <option value="High">{t('skillGap.priority_high', 'High Priority')}</option>
              <option value="Medium">{t('skillGap.priority_medium', 'Medium Priority')}</option>
              <option value="Low">{t('skillGap.priority_low', 'Low Priority')}</option>
              <option value="None">{t('skillGap.filter_on_track', 'On Track (0% Gap)')}</option>
            </select>
          </div>

          <table className={styles.skillsTable}>
            <thead>
              <tr>
                <th>{t('skillGap.th_skill_id', 'Skill ID')}</th>
                <th>{t('skillGap.th_skill_title', 'Skill Title')}</th>
                <th>{t('skillGap.th_competency_area', 'Competency Area')}</th>
                <th>{t('skillGap.th_current_level', 'Current Level')}</th>
                <th>{t('skillGap.th_required_level', 'Required Level')}</th>
                <th>{t('skillGap.th_calculated_gap', 'Calculated Gap')}</th>
                <th>{t('skillGap.th_priority', 'Priority')}</th>
                <th>{t('skillGap.th_action', 'Action')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSkills.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    {totalSkills === 0
                      ? t('skillGap.no_skills_assessed', 'No skills assessed yet.')
                      : t('skillGap.no_skills_match', 'No skills match the selected filter criteria.')}
                  </td>
                </tr>
              ) : (
                filteredSkills.map((s) => {
                  let pillClass = styles.pillMedium
                  if (s.priority === 'High') pillClass = styles.pillHigh
                  if (s.priority === 'Low') pillClass = styles.pillLow
                  if (s.priority === 'None') pillClass = styles.pillLow
                  return (
                    <tr key={s.id}>
                      <td style={{ color: '#64748b', fontWeight: 600 }}>{s.id}</td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{s.name}</td>
                      <td>{s.category}</td>
                      <td>{t('skillGap.level_display', { level: s.current, defaultValue: `Level ${s.current} / 5` })}</td>
                      <td>{t('skillGap.level_display', { level: s.required, defaultValue: `Level ${s.required} / 5` })}</td>
                      <td style={{ fontWeight: 700, color: s.gap.startsWith('0%') ? '#16a34a' : '#ef4444' }}>
                        {s.gap}
                      </td>
                      <td>
                        <span className={`${styles.priorityPill} ${pillClass}`}>
                          {s.priority === 'High' ? t('skillGap.priority_high', 'High Priority') : s.priority === 'Medium' ? t('skillGap.priority_medium', 'Medium Priority') : s.priority === 'Low' ? t('skillGap.priority_low', 'Low Priority') : t('skillGap.filter_on_track', 'On Track')}
                        </span>
                      </td>
                      <td>
                        {(() => {
                          const courseId = s.course?._id ? String(s.course._id) : null
                          const isEnrolled = courseId ? enrolledCourseMap.has(courseId) : false
                          const isProcessing = courseId ? Boolean(enrollingCourses[courseId]) : false
                          const isUnavailable = !courseId

                          if (isUnavailable) {
                            return (
                              <span
                                className={styles.unavailableBadge}
                                title={t('skillGap.toasts.no_course_mapped', 'No active capacity development course is currently mapped for this competency.')}
                              >
                                {t('skillGap.action_unavailable', 'Unavailable')}
                              </span>
                            )
                          }

                          if (isEnrolled) {
                            return (
                              <div>
                                <button
                                  type="button"
                                  className={styles.enrolledActionBtn}
                                  onClick={() => navigate(`/my-courses/${courseId}`)}
                                  title={`Continue ${s.course?.title || 'course'}`}
                                >
                                  <Check size={13} strokeWidth={2.5} />
                                  <span>{t('skillGap.action_continue', 'Continue →')}</span>
                                </button>
                                {s.course?.title && (
                                  <span className={styles.courseMappedLabel} title={s.course.title}>
                                    {s.course.title}
                                  </span>
                                )}
                              </div>
                            )
                          }

                          if (isProcessing) {
                            return (
                              <button
                                type="button"
                                className={styles.enrollingBtn}
                                disabled
                              >
                                <span className={styles.spinnerSmall} />
                                <span>{t('skillGap.action_enrolling', 'Enrolling...')}</span>
                              </button>
                            )
                          }

                          return (
                            <div>
                              <button
                                type="button"
                                className={styles.enrollActionBtn}
                                onClick={() => handleEnroll(s)}
                                title={`Enroll in ${s.course?.title || 'course'}`}
                              >
                                <span>{t('skillGap.action_enroll', 'Enroll →')}</span>
                              </button>
                              {s.course?.title && (
                                <span className={styles.courseMappedLabel} title={s.course.title}>
                                  {s.course.title}
                                </span>
                              )}
                            </div>
                          )
                        })()}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          TAB 3: BY COMPETENCIES (Domain Deep-Dive)
          ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'competencies' && (
        <div className={styles.tabContentCard}>
          <h2 className={styles.cardTitle} style={{ marginBottom: 16 }}>
            {t('skillGap.matrix_title', { count: competencyAreas.length, defaultValue: `Domain Competency Matrix (${competencyAreas.length} Areas)` })}
          </h2>
          <table className={styles.skillsTable}>
            <thead>
              <tr>
                <th>{t('skillGap.th_competency_area', 'Competency Area')}</th>
                <th>{t('skillGap.th_skills_count', 'Skills Count')}</th>
                <th>{t('skillGap.th_current_pct', 'Current Level (%)')}</th>
                <th>{t('skillGap.th_required_pct', 'Required Level (%)')}</th>
                <th>{t('skillGap.th_net_gap_pct', 'Net Gap (%)')}</th>
                <th>{t('skillGap.th_priority', 'Priority')}</th>
              </tr>
            </thead>
            <tbody>
              {competencyAreas.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    {t('skillGap.no_competency_matrix_data', 'No competency areas available. Take your diagnostic assessment first.')}
                  </td>
                </tr>
              ) : (
                competencyAreas.map((c) => (
                  <tr key={c.area}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{c.area}</td>
                    <td style={{ color: '#64748b' }}>
                      {t('skillGap.skills_count_label', { count: c.count, defaultValue: `${c.count} skills` })}
                    </td>
                    <td style={{ fontWeight: 600 }}>{c.current}%</td>
                    <td style={{ fontWeight: 600 }}>{c.required}%</td>
                    <td style={{ fontWeight: 700, color: c.gap === 0 ? '#16a34a' : '#ef4444' }}>
                      {c.gap}%
                    </td>
                    <td>
                      <span className={`${styles.priorityPill} ${c.priority === 'High' ? styles.pillHigh : c.priority === 'Medium' ? styles.pillMedium : styles.pillLow}`}>
                        {c.priority === 'High' ? t('skillGap.priority_high', 'High Priority') : c.priority === 'Medium' ? t('skillGap.priority_medium', 'Medium Priority') : t('skillGap.priority_low', 'Low Priority')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          TAB 4: BY ROLE (Benchmark against designated role - PART 18 FIX 3)
          ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'role' && (
        <div className={styles.tabContentCard}>
          <h2 className={styles.cardTitle} style={{ marginBottom: 8 }}>
            {t('skillGap.role_benchmark_title', {
              role: user?.role_id?.title || user?.designation || 'Designated Role',
              defaultValue: `Role Benchmark: ${user?.role_id?.title || user?.designation || 'Designated Role'}`
            })}
          </h2>
          <p className={styles.subtitle} style={{ marginBottom: 20 }}>
            {t('skillGap.role_benchmark_subtitle', 'Comparison of your current competency readiness against the role requirements in your department.')}
          </p>

          <table className={styles.skillsTable}>
            <thead>
              <tr>
                <th>{t('skillGap.th_cadre_role', 'Cadre Role')}</th>
                <th>{t('skillGap.th_target_role_level', 'Target Role Level')}</th>
                <th>{t('skillGap.th_required_index', 'Required Competency Index')}</th>
                <th>{t('skillGap.th_readiness_index', 'Your Readiness Index')}</th>
                <th>{t('skillGap.th_readiness_status', 'Readiness Status')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700, color: '#0f172a' }}>
                  {user?.role_id?.title || user?.designation || 'Active Role'} {t('skillGap.current_tag', '(Current)')}
                </td>
                <td>Level {user?.level || 1}</td>
                <td>100%</td>
                <td style={{ fontWeight: 700, color: readinessPct >= 80 ? '#16a34a' : 'var(--color-primary-600)' }}>
                  {readinessPct}%
                </td>
                <td>
                  <span className={`${styles.priorityPill} ${readinessPct >= 80 ? styles.pillLow : styles.pillMedium}`}>
                    {readinessPct >= 100
                      ? t('skillGap.status_surpassed', 'Surpassed')
                      : readinessPct >= 75
                      ? t('skillGap.status_on_track', 'On Track')
                      : t('skillGap.status_in_progress', 'In Progress')}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          TAB 5: BY DEPARTMENT
          ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'department' && (
        <div className={styles.tabContentCard}>
          <h2 className={styles.cardTitle} style={{ marginBottom: 8 }}>
            {t('skillGap.dept_benchmark_title', {
              dept: user?.department || 'Active Department',
              defaultValue: `Departmental Competency Benchmark: ${user?.department || 'Active Department'}`
            })}
          </h2>
          <p className={styles.subtitle} style={{ marginBottom: 20 }}>
            {t('skillGap.dept_benchmark_subtitle', {
              area: user?.functional_area_id?.name || 'Assigned Area',
              defaultValue: `Your skill readiness standing within your functional area: ${user?.functional_area_id?.name || 'Assigned Area'}.`
            })}
          </p>

          <table className={styles.skillsTable}>
            <thead>
              <tr>
                <th>{t('skillGap.th_dept_unit', 'Department / Unit')}</th>
                <th>{t('skillGap.th_functional_area', 'Functional Area')}</th>
                <th>{t('skillGap.th_skills_assessed', 'Skills Assessed')}</th>
                <th>{t('skillGap.th_readiness_score', 'Your Readiness Score')}</th>
                <th>{t('skillGap.th_status', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700, color: '#0f172a' }}>
                  {user?.department || 'Department'}
                </td>
                <td>{user?.functional_area_id?.name || 'General Operations'}</td>
                <td>{totalSkills}</td>
                <td style={{ fontWeight: 700, color: 'var(--color-primary-600)' }}>{readinessPct}%</td>
                <td>
                  <span className={`${styles.priorityPill} ${styles.pillLow}`}>
                    {t('skillGap.status_active', 'Active')}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          TAB 6: BY PROFICIENCY LEVEL
          ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'proficiency' && (
        <div className={styles.tabContentCard}>
          <h2 className={styles.cardTitle} style={{ marginBottom: 16 }}>
            {t('skillGap.proficiency_title', 'Skills Distribution by Gap Severity')}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div style={{ padding: 16, border: '1px solid #fee2e2', borderRadius: 12, background: '#fef2f2' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#dc2626' }}>
                {t('skillGap.card_high_title', 'High Priority Gap (>= 2 levels)')}
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#991b1b', margin: '6px 0' }}>
                {t('skillGap.card_high_skills', { count: highPriorityGaps.length, defaultValue: `${highPriorityGaps.length} Skills` })}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#b91c1c' }}>
                {t('skillGap.card_high_desc', 'Urgent training recommended via learning path modules.')}
              </div>
            </div>
            <div style={{ padding: 16, border: '1px solid #fef3c7', borderRadius: 12, background: '#fffbeb' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#d97706' }}>
                {t('skillGap.card_med_title', 'Medium Priority Gap (1 level)')}
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#92400e', margin: '6px 0' }}>
                {t('skillGap.card_med_skills', { count: medPriorityGaps.length, defaultValue: `${medPriorityGaps.length} Skills` })}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#b45309' }}>
                {t('skillGap.card_med_desc', 'Targeted courses recommended in upcoming weeks.')}
              </div>
            </div>
            <div style={{ padding: 16, border: '1px solid #dcfce7', borderRadius: 12, background: '#f0fdf4' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#16a34a' }}>
                {t('skillGap.card_low_title', 'Low Priority Gap')}
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#166534', margin: '6px 0' }}>
                {t('skillGap.card_low_skills', { count: lowPriorityGaps.length, defaultValue: `${lowPriorityGaps.length} Skills` })}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
                {t('skillGap.card_low_desc', 'Minor refinement or optional micro-learning.')}
              </div>
            </div>
            <div style={{ padding: 16, border: '1px solid #dbeafe', borderRadius: 12, background: '#eff6ff' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#2563eb' }}>
                {t('skillGap.card_on_track_title', 'On Track / Ahead (0 Gap)')}
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e40af', margin: '6px 0' }}>
                {t('skillGap.card_on_track_skills', { count: onTrackGaps.length, defaultValue: `${onTrackGaps.length} Skills` })}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#1d4ed8' }}>
                {t('skillGap.card_on_track_desc', 'Fully meeting or exceeding role competency targets.')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
