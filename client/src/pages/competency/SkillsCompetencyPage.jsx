import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Download,
  RotateCw,
  Search,
  Filter,
  Eye,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Star,
  CheckCircle2,
  TrendingUp,
  Target,
  Award,
  Layers,
  BookOpen,
  X,
  Info,
  HelpCircle,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  getUserCompetencies,
  getSkillGaps,
  getCompetencies,
  updateMyCompetency,
} from '../../api/competency.api'
import Skeleton from '../../components/ui/Skeleton'
import styles from './SkillsCompetencyPage.module.css'

// Domain colors and configuration
const DOMAIN_CONFIG = {
  'Statistical Methods': {
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    textColor: '#6D28D9',
    iconBg: '#EDE9FE',
  },
  'Data Collection': {
    color: '#06B6D4',
    bgColor: '#ECFEFF',
    textColor: '#0E7490',
    iconBg: '#CFFAFE',
  },
  'Data Analysis': {
    color: '#10B981',
    bgColor: '#ECFDF5',
    textColor: '#047857',
    iconBg: '#D1FAE5',
  },
  'Data Visualization': {
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    textColor: '#B45309',
    iconBg: '#FEF3C7',
  },
  'IT & Digital Skills': {
    color: '#EC4899',
    bgColor: '#FDF2F8',
    textColor: '#BE185D',
    iconBg: '#FCE7F3',
  },
  'Behavioral Skills': {
    color: '#6366F1',
    bgColor: '#EEF2FF',
    textColor: '#4338CA',
    iconBg: '#E0E7FF',
  },
}

// 1-5 Scale Level configuration
const LEVEL_CONFIG = {
  1: { name: 'Beginner', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' },
  2: { name: 'Basic', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', text: '#D97706' },
  3: { name: 'Intermediate', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB' },
  4: { name: 'Advanced', color: '#10B981', bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A' },
  5: { name: 'Expert', color: '#8B5CF6', bg: '#FAF5FF', border: '#E9D5FF', text: '#9333EA' },
}

// Dynamic helper to map authentic MoSPI competency names to domain & icon symbol
function getCompetencyMeta(name = '', category = '') {
  const n = (name || '').toLowerCase()
  const c = (category || '').toLowerCase()

  if (
    c === 'statistical' ||
    n.includes('statistical') ||
    n.includes('survey') ||
    n.includes('sampling') ||
    n.includes('quality') ||
    n.includes('metadata') ||
    n.includes('sdg') ||
    n.includes('labour') ||
    n.includes('agricultural') ||
    n.includes('industrial') ||
    n.includes('price') ||
    n.includes('spss') ||
    n.includes('sas') ||
    n.includes('stata')
  ) {
    if (n.includes('sampling') || n.includes('survey')) {
      return {
        domain: 'Data Collection',
        icon: '≡',
        secondaryCategory: 'Technical Skills',
      }
    }
    return {
      domain: 'Statistical Methods',
      icon: '∑',
      secondaryCategory: 'Technical Skills',
    }
  }

  if (
    n.includes('visualization') ||
    n.includes('dashboard') ||
    n.includes('chart') ||
    n.includes('presentation')
  ) {
    return {
      domain: 'Data Visualization',
      icon: '◈',
      secondaryCategory: 'Technical Skills',
    }
  }

  if (
    n.includes('account') ||
    n.includes('analysis') ||
    n.includes('interpretation') ||
    n.includes('data-driven') ||
    n.includes('reasoning')
  ) {
    return {
      domain: 'Data Analysis',
      icon: '↗',
      secondaryCategory: 'Functional Skills',
    }
  }

  if (
    c === 'technical' ||
    c === 'digital_governance' ||
    n.includes('sql') ||
    n.includes('python') ||
    n.includes('r ') ||
    n.includes('gis') ||
    n.includes('ai') ||
    n.includes('cyber') ||
    n.includes('cloud') ||
    n.includes('digital') ||
    n.includes('it ') ||
    n.includes('software') ||
    n.includes('api')
  ) {
    return {
      domain: 'IT & Digital Skills',
      icon: '{}',
      secondaryCategory: 'Technical Skills',
    }
  }

  if (
    c === 'behavioural' ||
    n.includes('leadership') ||
    n.includes('communication') ||
    n.includes('decision') ||
    n.includes('management') ||
    n.includes('problem') ||
    n.includes('ethics') ||
    n.includes('stakeholder') ||
    n.includes('team')
  ) {
    return {
      domain: 'Behavioral Skills',
      icon: '✦',
      secondaryCategory: 'Behavioral Skills',
    }
  }

  return {
    domain: 'Statistical Methods',
    icon: '📊',
    secondaryCategory: 'Functional Skills',
  }
}

export default function SkillsCompetencyPage() {
  const navigate = useNavigate()
  const [competencies, setCompetencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [lastUpdated, setLastUpdated] = useState('Evaluating...')
  const [showGuide, setShowGuide] = useState(true)

  // Filtering & Pagination state
  const [activeTab, setActiveTab] = useState('All Skills')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('All Domains')
  const [selectedLevel, setSelectedLevel] = useState('All Levels')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Details Modal state
  const [activeModalComp, setActiveModalComp] = useState(null)

  // Load Authentic Data from Backend APIs
  const loadData = async () => {
    try {
      setLoading(true)
      const [userCompsRes, skillGapsRes, allCompsRes] = await Promise.all([
        getUserCompetencies().catch(() => ({ user_competencies: [] })),
        getSkillGaps().catch(() => ({ skill_gaps: [] })),
        getCompetencies().catch(() => ({ competencies: [] })),
      ])

      const userCompList = userCompsRes.user_competencies || userCompsRes.competencies || []
      const gapsList = skillGapsRes.skill_gaps || []
      const allCompsList = allCompsRes.competencies || []

      // Map of user's genuinely assessed competencies
      const userMap = new Map()
      userCompList.forEach((uc) => {
        const id = uc.competency_id?._id || uc.competency_id || uc.competencyId?._id || uc.competencyId
        if (id) {
          userMap.set(String(id), {
            currentLevel: uc.current_level || uc.currentLevel,
            lastAssessedAt: uc.last_assessed_at || uc.lastAssessedAt,
            source: uc.source || 'diagnostic_test',
          })
        }
      })

      // Determine genuine latest evaluation timestamp from DB records
      let latestTimestamp = null
      if (skillGapsRes.latest_assessment?.completed_at) {
        latestTimestamp = new Date(skillGapsRes.latest_assessment.completed_at)
      }
      userCompList.forEach((uc) => {
        const d = uc.last_assessed_at || uc.lastAssessedAt
        if (d) {
          const dateObj = new Date(d)
          if (!latestTimestamp || dateObj > latestTimestamp) {
            latestTimestamp = dateObj
          }
        }
      })
      if (!latestTimestamp && gapsList.length > 0) {
        gapsList.forEach((g) => {
          if (g.computed_at) {
            const dateObj = new Date(g.computed_at)
            if (!latestTimestamp || dateObj > latestTimestamp) {
              latestTimestamp = dateObj
            }
          }
        })
      }

      if (latestTimestamp && !isNaN(latestTimestamp.getTime())) {
        setLastUpdated(
          latestTimestamp.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }) +
            ', ' +
            latestTimestamp.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
        )
      } else {
        setLastUpdated('Not yet evaluated')
      }

      // Build competencies list based on role framework or all competencies fallback
      let relevantList = []
      const includedIds = new Set()

      if (gapsList.length > 0) {
        relevantList = gapsList.map((g) => {
          const comp = g.competency_id || {}
          const compIdStr = String(comp._id || g.competency_id)
          includedIds.add(compIdStr)
          const assessedRecord = userMap.get(compIdStr)

          // Assessed only if an authentic UserCompetency record exists
          const isAssessed = Boolean(assessedRecord && assessedRecord.currentLevel)
          const currentLevel = isAssessed ? assessedRecord.currentLevel : null
          const targetLevel = g.required_level || 3
          const gap = isAssessed ? Math.max(0, targetLevel - currentLevel) : null

          const meta = getCompetencyMeta(comp.name, comp.category)

          const dateFormatted = isAssessed && assessedRecord?.lastAssessedAt
            ? new Date(assessedRecord.lastAssessedAt).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : 'Not Assessed'

          return {
            _id: compIdStr,
            name: comp.name || 'Competency',
            category: comp.category || 'technical',
            description:
              comp.description ||
              'Official competency defined under the Ministry of Statistics and Programme Implementation framework.',
            levelDescriptions: comp.levelDescriptions || null,
            displayName: comp.name || 'Competency',
            displayDesc:
              comp.description ||
              'Official competency defined under the Ministry of Statistics and Programme Implementation framework.',
            currentLevel,
            targetLevel,
            gap,
            priority: isAssessed
              ? (gap >= 2 ? 'high' : gap === 1 ? 'medium' : 'low')
              : 'unassessed',
            lastAssessed: dateFormatted,
            isAssessed,
            source: assessedRecord?.source || null,
            domain: meta.domain,
            iconSymbol: meta.icon,
            secondaryCategory: meta.secondaryCategory,
          }
        })

        // Also append any assessed competencies evaluated in assessments not in gapsList
        userCompList.forEach((uc) => {
          const comp = uc.competency_id || uc.competencyId || {}
          const compIdStr = String(comp._id || uc.competency_id || uc.competencyId)
          if (compIdStr && !includedIds.has(compIdStr) && (uc.current_level || uc.currentLevel)) {
            includedIds.add(compIdStr)
            const currentLevel = uc.current_level || uc.currentLevel
            const targetLevel = comp.level || 3
            const gap = Math.max(0, targetLevel - currentLevel)
            const meta = getCompetencyMeta(comp.name, comp.category)

            relevantList.push({
              _id: compIdStr,
              name: comp.name || 'Competency',
              category: comp.category || 'technical',
              description:
                comp.description ||
                'Official competency defined under the Ministry of Statistics and Programme Implementation framework.',
              levelDescriptions: comp.levelDescriptions || null,
              displayName: comp.name || 'Competency',
              displayDesc:
                comp.description ||
                'Official competency defined under the Ministry of Statistics and Programme Implementation framework.',
              currentLevel,
              targetLevel,
              gap,
              priority: gap >= 2 ? 'high' : gap === 1 ? 'medium' : 'low',
              lastAssessed: uc.last_assessed_at
                ? new Date(uc.last_assessed_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Assessed',
              isAssessed: true,
              source: uc.source || 'diagnostic_test',
              domain: meta.domain,
              iconSymbol: meta.icon,
              secondaryCategory: meta.secondaryCategory,
            })
          }
        })
      } else if (allCompsList.length > 0) {
        relevantList = allCompsList.map((comp) => {
          const compIdStr = String(comp._id)
          const assessedRecord = userMap.get(compIdStr)
          const isAssessed = Boolean(assessedRecord && assessedRecord.currentLevel)
          const currentLevel = isAssessed ? assessedRecord.currentLevel : null
          const targetLevel = comp.level || 3
          const gap = isAssessed ? Math.max(0, targetLevel - currentLevel) : null
          const meta = getCompetencyMeta(comp.name, comp.category)

          const dateFormatted = isAssessed && assessedRecord?.lastAssessedAt
            ? new Date(assessedRecord.lastAssessedAt).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : 'Not Assessed'

          return {
            _id: compIdStr,
            name: comp.name || 'Competency',
            category: comp.category || 'technical',
            description:
              comp.description ||
              'Official competency defined under the Ministry of Statistics and Programme Implementation framework.',
            levelDescriptions: comp.levelDescriptions || null,
            displayName: comp.name || 'Competency',
            displayDesc:
              comp.description ||
              'Official competency defined under the Ministry of Statistics and Programme Implementation framework.',
            currentLevel,
            targetLevel,
            gap,
            priority: isAssessed
              ? (gap >= 2 ? 'high' : gap === 1 ? 'medium' : 'low')
              : 'unassessed',
            lastAssessed: dateFormatted,
            isAssessed,
            source: assessedRecord?.source || null,
            domain: meta.domain,
            iconSymbol: meta.icon,
            secondaryCategory: meta.secondaryCategory,
          }
        })
      }

      setCompetencies(relevantList)
    } catch (err) {
      console.error('Failed to load competencies:', err)
      setCompetencies([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Handle star rating update with real DB persistence and SkillGap synchronization
  const handleLevelChange = async (competencyId, newLevel) => {
    try {
      setUpdatingId(competencyId)
      // Optimistic update
      setCompetencies((prev) =>
        prev.map((c) => {
          if (c._id === competencyId) {
            const gap = Math.max(0, c.targetLevel - newLevel)
            return {
              ...c,
              isAssessed: true,
              currentLevel: newLevel,
              gap,
              priority: gap >= 2 ? 'high' : gap === 1 ? 'medium' : 'low',
              lastAssessed: 'Today',
              source: 'self_assessed',
            }
          }
          return c
        })
      )
      // Call backend API (persists UserCompetency and updates SkillGap in MongoDB)
      await updateMyCompetency(competencyId, newLevel)
    } catch (err) {
      console.error('Failed to update competency level:', err)
      loadData()
    } finally {
      setUpdatingId(null)
    }
  }

  // Handle CSV Download
  const handleDownloadReport = () => {
    const headers = [
      'Skill Name',
      'Category',
      'Domain',
      'Status',
      'Current Level',
      'Cadre Target',
      'Skill Gap',
      'Last Evaluated',
      'Assessment Source',
    ]
    const rows = competencies.map((c) => [
      `"${c.name}"`,
      `"${c.category}"`,
      `"${c.domain}"`,
      `"${c.isAssessed ? 'Assessed' : 'Not Assessed'}"`,
      c.isAssessed ? c.currentLevel : 'Not Assessed',
      c.targetLevel,
      c.isAssessed ? c.gap : 'Pending Assessment',
      `"${c.lastAssessed}"`,
      `"${c.source || '—'}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `KaushalAI_Skills_Competencies_Report_${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Metric Calculations
  const totalSkills = competencies.length
  const uniqueDomains = Array.from(new Set(competencies.map((c) => c.domain).filter(Boolean)))
  const assessedSkills = competencies.filter((c) => c.isAssessed).length
  const unassessedSkills = totalSkills - assessedSkills
  const assessedPercent = totalSkills > 0 ? Math.round((assessedSkills / totalSkills) * 100) : 0

  // Average Proficiency calculated ONLY across genuinely assessed skills
  const avgProficiency =
    assessedSkills > 0
      ? (
          competencies
            .filter((c) => c.isAssessed)
            .reduce((acc, c) => acc + (c.currentLevel || 0), 0) / assessedSkills
        ).toFixed(1)
      : '—'

  const avgLevelInt =
    assessedSkills > 0 ? Math.max(1, Math.min(5, Math.round(Number(avgProficiency)))) : null
  const avgLevelName = avgLevelInt
    ? LEVEL_CONFIG[avgLevelInt]?.name
    : 'No assessment completed'

  const strongSkills = competencies.filter(
    (c) => c.isAssessed && (c.currentLevel || 0) >= (c.targetLevel || 3)
  ).length
  const skillsToImprove = competencies.filter(
    (c) => c.isAssessed && (c.targetLevel || 3) > (c.currentLevel || 0)
  ).length

  // Proficiency breakdown for assessed skills & unassessed
  const levelCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  competencies.forEach((c) => {
    if (c.isAssessed && c.currentLevel && levelCounts[c.currentLevel] !== undefined) {
      levelCounts[c.currentLevel]++
    }
  })

  // Domain breakdown for Donut Chart
  const domainCounts = {}
  competencies.forEach((c) => {
    const d = c.domain || 'Statistical Methods'
    domainCounts[d] = (domainCounts[d] || 0) + 1
  })

  // Filtered dataset
  const filteredCompetencies = useMemo(() => {
    return competencies.filter((c) => {
      // Secondary Tab filter
      if (activeTab === 'Technical Skills' && c.secondaryCategory !== 'Technical Skills') return false
      if (activeTab === 'Functional Skills' && c.secondaryCategory !== 'Functional Skills') return false
      if (activeTab === 'Behavioral Skills' && c.secondaryCategory !== 'Behavioral Skills') return false

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = (c.displayName || c.name).toLowerCase().includes(q)
        const matchDesc = (c.displayDesc || c.description || '').toLowerCase().includes(q)
        const matchDomain = (c.domain || '').toLowerCase().includes(q)
        if (!matchName && !matchDesc && !matchDomain) return false
      }

      // Domain filter
      if (selectedDomain !== 'All Domains' && c.domain !== selectedDomain) return false

      // Level / Status filter
      if (selectedLevel !== 'All Levels') {
        if (selectedLevel === 'Assessed Only' && !c.isAssessed) return false
        if (selectedLevel === 'Not Assessed' && c.isAssessed) return false
        if (selectedLevel.startsWith('Level ')) {
          const targetLvlNum = parseInt(selectedLevel.replace(/\D/g, ''), 10)
          if (c.currentLevel !== targetLvlNum) return false
        }
      }

      return true
    })
  }, [competencies, activeTab, searchQuery, selectedDomain, selectedLevel])

  // Pagination calculation
  const totalPages = Math.ceil(filteredCompetencies.length / rowsPerPage) || 1
  const paginatedCompetencies = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filteredCompetencies.slice(start, start + rowsPerPage)
  }, [filteredCompetencies, currentPage, rowsPerPage])

  // Donut SVG Calculations
  const donutSegments = useMemo(() => {
    const total = totalSkills || 1
    let cumulativePercent = 0
    return Object.entries(domainCounts).map(([domainName, count]) => {
      const percent = (count / total) * 100
      const strokeDasharray = `${percent * 2.513} ${251.3 - percent * 2.513}`
      const strokeDashoffset = -cumulativePercent * 2.513
      cumulativePercent += percent
      const conf = DOMAIN_CONFIG[domainName] || { color: '#6366F1' }
      return {
        domainName,
        count,
        percent: Math.round(percent),
        color: conf.color,
        strokeDasharray,
        strokeDashoffset,
      }
    })
  }, [domainCounts, totalSkills])

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <Skeleton.Text lines={2} />
        <div className={styles.metricsGrid}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton.Card key={i} />
          ))}
        </div>
        <div className={styles.middleGrid}>
          <Skeleton.Card />
          <Skeleton.Card />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.pageContainer}>
      {/* ── 1. Page Header ──────────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link to="/dashboard" className={styles.breadcrumbLink}>
              Dashboard
            </Link>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbActive}>Skills &amp; Competencies</span>
          </nav>
          <h1 className={styles.title}>Skills &amp; Competencies</h1>
          <p className={styles.subtitle}>
            Official MoSPI Competency Framework &amp; Verified Proficiency Profile
          </p>
        </div>

        <div className={styles.headerRight}>
          <button
            type="button"
            className={styles.downloadBtn}
            onClick={handleDownloadReport}
            title="Export Skills Report as CSV"
          >
            <Download size={16} />
            <span>Download Report</span>
          </button>
          <span className={styles.lastUpdatedText}>
            <RotateCw size={13} />
            <span>Last evaluated: {lastUpdated}</span>
          </span>
        </div>
      </div>

      {/* ── 2. Educational Guide to MoSPI Competency Framework ───────────── */}
      <div className={styles.guideCard}>
        <div className={styles.guideHeader}>
          <div className={styles.guideTitleWrap}>
            <div className={styles.guideHeaderIcon}>
              <Info size={18} />
            </div>
            <div>
              <h3 className={styles.guideTitle}>Understanding the MoSPI Competency Framework</h3>
              <p className={styles.guideSubtitle}>
                How your skills, cadre benchmark levels, and skill gaps are calculated
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.guideToggleBtn}
            onClick={() => setShowGuide(!showGuide)}
            aria-expanded={showGuide}
          >
            <span>{showGuide ? 'Hide Guide' : 'Show Guide'}</span>
            {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {showGuide && (
          <div className={styles.guideGrid}>
            {/* Guide Item 1: Competency */}
            <div className={styles.guideItem}>
              <div className={styles.guideItemHeader}>
                <div
                  className={styles.guideItemIcon}
                  style={{ background: '#EEF2FF', color: '#6366F1' }}
                >
                  <Layers size={14} />
                </div>
                <h4 className={styles.guideItemTitle}>What is a Competency?</h4>
              </div>
              <p className={styles.guideItemDesc}>
                A standard cluster of professional knowledge, analytical methods, and practical skills
                mandated by MoSPI for official statistical and governance responsibilities.
              </p>
            </div>

            {/* Guide Item 2: Current Level */}
            <div className={styles.guideItem}>
              <div className={styles.guideItemHeader}>
                <div
                  className={styles.guideItemIcon}
                  style={{ background: '#EFF6FF', color: '#3B82F6' }}
                >
                  <Award size={14} />
                </div>
                <h4 className={styles.guideItemTitle}>Current Level (1–5)</h4>
              </div>
              <p className={styles.guideItemDesc}>
                Your demonstrated proficiency verified via diagnostic assessments or validated
                evaluations. Competencies marked <strong>Not Assessed</strong> require an evaluation to
                establish a baseline.
              </p>
            </div>

            {/* Guide Item 3: Cadre Target */}
            <div className={styles.guideItem}>
              <div className={styles.guideItemHeader}>
                <div
                  className={styles.guideItemIcon}
                  style={{ background: '#ECFDF5', color: '#10B981' }}
                >
                  <Target size={14} />
                </div>
                <h4 className={styles.guideItemTitle}>Cadre Target Level</h4>
              </div>
              <p className={styles.guideItemDesc}>
                The required proficiency level (1–5) established in the Cadre Competency Dictionary
                for your official role and cadre grade.
              </p>
            </div>

            {/* Guide Item 4: Skill Gap */}
            <div className={styles.guideItem}>
              <div className={styles.guideItemHeader}>
                <div
                  className={styles.guideItemIcon}
                  style={{ background: '#FFFBEB', color: '#D97706' }}
                >
                  <TrendingUp size={14} />
                </div>
                <h4 className={styles.guideItemTitle}>Skill Gap &amp; Next Steps</h4>
              </div>
              <p className={styles.guideItemDesc}>
                Calculated strictly as <code>Target Level - Current Level</code>. When a gap exists,
                enrolling in mapped training courses bridges the deficit to achieve cadre readiness.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Diagnostic Assessment Pending Callout (if unassessed) ─────── */}
      {assessedSkills === 0 && (
        <div className={styles.emptyAlertBanner}>
          <div className={styles.emptyAlertLeft}>
            <div className={styles.emptyAlertIconBox}>
              <AlertCircle size={24} />
            </div>
            <div>
              <h4 className={styles.emptyAlertTitle}>Diagnostic Assessment Pending</h4>
              <p className={styles.emptyAlertText}>
                You have not completed an official competency assessment yet. All competencies are currently
                marked as <strong>Not Assessed</strong>. Take the 20-minute diagnostic test to establish
                your baseline proficiency profile and calculate role-specific skill gaps.
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.emptyAlertBtn}
            onClick={() => navigate('/assessment')}
          >
            <span>Take Diagnostic Assessment</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* ── 4. Top 5 Metric Cards ────────────────────────────────────────── */}
      <div className={styles.metricsGrid}>
        {/* Total Skills */}
        <div className={styles.metricCard}>
          <div className={styles.metricIconWrap} style={{ background: '#EEF2FF', color: '#6366F1' }}>
            <Layers size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Total Cadre Skills</span>
            <span className={styles.metricValue}>{totalSkills}</span>
            <span className={styles.metricSub}>Across {uniqueDomains.length || 6} domains</span>
          </div>
        </div>

        {/* Assessed Skills */}
        <div className={styles.metricCard}>
          <div className={styles.metricIconWrap} style={{ background: '#ECFDF5', color: '#10B981' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Assessed Skills</span>
            <span className={styles.metricValue}>{assessedSkills}</span>
            <span className={styles.metricSub}>
              {assessedSkills > 0
                ? `${assessedPercent}% of role framework`
                : '0% assessed • Test pending'}
            </span>
          </div>
        </div>

        {/* Average Proficiency */}
        <div className={styles.metricCard}>
          <div className={styles.metricIconWrap} style={{ background: '#EFF6FF', color: '#3B82F6' }}>
            <Award size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Average Proficiency</span>
            <span className={styles.metricValue}>
              {assessedSkills > 0 ? `${avgProficiency} / 5` : '—'}
            </span>
            <span className={styles.metricSub}>
              {assessedSkills > 0
                ? `${avgLevelName} (assessed)`
                : 'Pending diagnostic test'}
            </span>
          </div>
        </div>

        {/* Strong Skills */}
        <div className={styles.metricCard}>
          <div className={styles.metricIconWrap} style={{ background: '#FFF7ED', color: '#F97316' }}>
            <TrendingUp size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>On Target</span>
            <span className={styles.metricValue}>{strongSkills}</span>
            <span className={styles.metricSub}>
              {assessedSkills > 0 ? 'At or above cadre target' : '0 evaluated'}
            </span>
          </div>
        </div>

        {/* Skills to Improve */}
        <div className={styles.metricCard}>
          <div className={styles.metricIconWrap} style={{ background: '#FEF2F2', color: '#EF4444' }}>
            <Target size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Skills to Improve</span>
            <span className={styles.metricValue}>{skillsToImprove}</span>
            <span className={styles.metricSub}>
              {unassessedSkills > 0 && assessedSkills > 0
                ? `${skillsToImprove} gaps • ${unassessedSkills} unassessed`
                : assessedSkills > 0
                ? `${skillsToImprove} below target`
                : 'Pending assessment'}
            </span>
          </div>
        </div>
      </div>

      {/* ── 5. Middle Section: Analytics & Domains ──────────────────────── */}
      <div className={styles.middleGrid}>
        {/* Left: Skills by Proficiency Level */}
        <div className={styles.panelCard}>
          <div>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Skills by Proficiency Level</h2>
            </div>

            {/* Segmented Progress Bar */}
            <div className={styles.stackedBarWrap}>
              <div className={styles.stackedBarLabels}>
                {[1, 2, 3, 4, 5].map((lvl) => {
                  const count = levelCounts[lvl] || 0
                  const pct = totalSkills > 0 ? Math.round((count / totalSkills) * 100) : 0
                  return (
                    <div
                      key={lvl}
                      className={styles.barLabelItem}
                      style={{
                        width: `${Math.max(12, (count / (totalSkills || 1)) * 100)}%`,
                        minWidth: '32px',
                      }}
                    >
                      L{lvl}: {count}
                    </div>
                  )
                })}
                {unassessedSkills > 0 && (
                  <div
                    className={styles.barLabelItem}
                    style={{
                      width: `${Math.max(15, (unassessedSkills / (totalSkills || 1)) * 100)}%`,
                      color: '#64748B',
                    }}
                  >
                    Unassessed: {unassessedSkills}
                  </div>
                )}
              </div>

              <div className={styles.stackedBar}>
                {[1, 2, 3, 4, 5].map((lvl) => {
                  const count = levelCounts[lvl] || 0
                  const widthPct = totalSkills > 0 ? (count / totalSkills) * 100 : 0
                  return (
                    <div
                      key={lvl}
                      className={styles.stackedSegment}
                      style={{
                        width: `${widthPct}%`,
                        background: LEVEL_CONFIG[lvl]?.color || '#94A3B8',
                      }}
                      title={`Level ${lvl} ${LEVEL_CONFIG[lvl]?.name}: ${count} skills`}
                    />
                  )
                })}
                {unassessedSkills > 0 && (
                  <div
                    className={styles.stackedSegment}
                    style={{
                      width: `${(unassessedSkills / (totalSkills || 1)) * 100}%`,
                      background: '#CBD5E1',
                    }}
                    title={`Unassessed: ${unassessedSkills} skills pending assessment`}
                  />
                )}
              </div>

              <div className={styles.barLegend}>
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <div key={lvl} className={styles.barLegendItem}>
                    <span
                      className={styles.barLegendDot}
                      style={{ background: LEVEL_CONFIG[lvl]?.color }}
                    />
                    <span>
                      {LEVEL_CONFIG[lvl]?.name} (L{lvl})
                    </span>
                  </div>
                ))}
                {unassessedSkills > 0 && (
                  <div className={styles.barLegendItem}>
                    <span className={styles.barLegendDot} style={{ background: '#CBD5E1' }} />
                    <span style={{ color: '#64748B' }}>Unassessed ({unassessedSkills})</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* About Proficiency Levels Callout */}
          <div className={styles.aboutLevelsBox}>
            <h3 className={styles.aboutLevelsTitle}>MoSPI 5-Tier Proficiency Scale</h3>
            <div className={styles.aboutLevelsGrid}>
              <div className={styles.aboutLevelItem}>
                <div className={styles.aboutLevelHeader}>
                  <span className={styles.aboutLevelBadge} style={{ background: '#EF4444' }}>
                    1
                  </span>
                  <span className={styles.aboutLevelName}>Beginner</span>
                </div>
                <p className={styles.aboutLevelDesc}>Basic awareness, requires guidance</p>
              </div>

              <div className={styles.aboutLevelItem}>
                <div className={styles.aboutLevelHeader}>
                  <span className={styles.aboutLevelBadge} style={{ background: '#F59E0B' }}>
                    2
                  </span>
                  <span className={styles.aboutLevelName}>Basic</span>
                </div>
                <p className={styles.aboutLevelDesc}>Understands basics, works with supervision</p>
              </div>

              <div className={styles.aboutLevelItem}>
                <div className={styles.aboutLevelHeader}>
                  <span className={styles.aboutLevelBadge} style={{ background: '#3B82F6' }}>
                    3
                  </span>
                  <span className={styles.aboutLevelName}>Intermediate</span>
                </div>
                <p className={styles.aboutLevelDesc}>Applies independently in routine duties</p>
              </div>

              <div className={styles.aboutLevelItem}>
                <div className={styles.aboutLevelHeader}>
                  <span className={styles.aboutLevelBadge} style={{ background: '#10B981' }}>
                    4
                  </span>
                  <span className={styles.aboutLevelName}>Advanced</span>
                </div>
                <p className={styles.aboutLevelDesc}>Handles complex operations, mentors peers</p>
              </div>

              <div className={styles.aboutLevelItem}>
                <div className={styles.aboutLevelHeader}>
                  <span className={styles.aboutLevelBadge} style={{ background: '#8B5CF6' }}>
                    5
                  </span>
                  <span className={styles.aboutLevelName}>Expert</span>
                </div>
                <p className={styles.aboutLevelDesc}>Deep strategic expertise, sets standards</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Top Skill Domains */}
        <div className={styles.panelCard}>
          <div>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Cadre Skill Domains</h2>
            </div>

            <div className={styles.donutSection}>
              {/* Donut Chart */}
              <div className={styles.donutChartWrap}>
                <svg viewBox="0 0 100 100" className={styles.donutSvg}>
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#F1F5F9"
                    strokeWidth="14"
                  />
                  {donutSegments.map((seg, idx) => (
                    <circle
                      key={idx}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="14"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                    />
                  ))}
                </svg>
                <div className={styles.donutCenterText}>
                  <span className={styles.donutTotalNum}>{totalSkills}</span>
                  <span className={styles.donutTotalLabel}>Total Skills</span>
                </div>
              </div>

              {/* Legend List */}
              <div className={styles.domainLegendList}>
                {donutSegments.map((seg, idx) => (
                  <div key={idx} className={styles.domainLegendItem}>
                    <div className={styles.domainLegendLeft}>
                      <span className={styles.domainLegendDot} style={{ background: seg.color }} />
                      <span>{seg.domainName}</span>
                    </div>
                    <span className={styles.domainLegendCount}>
                      {seg.count} ({seg.percent}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            className={styles.viewAllDomainsLink}
            onClick={() => {
              setSelectedDomain('All Domains')
              setActiveTab('All Skills')
            }}
          >
            <span>Reset domain filters →</span>
          </button>
        </div>
      </div>

      {/* ── 6. Bottom Table Card ────────────────────────────────────────── */}
      <div className={styles.tableCard}>
        {/* Toolbar: Category Tabs on left, Search & Filters on right */}
        <div className={styles.tableToolbar}>
          <div className={styles.categoryTabs}>
            {['All Skills', 'Technical Skills', 'Functional Skills', 'Behavioral Skills'].map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ''}`}
                  onClick={() => {
                    setActiveTab(tab)
                    setCurrentPage(1)
                  }}
                >
                  {tab}
                </button>
              )
            )}
          </div>

          <div className={styles.toolbarActions}>
            <div className={styles.searchBox}>
              <input
                type="text"
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className={styles.searchInput}
              />
              <Search size={16} className={styles.searchIcon} />
            </div>

            <select
              value={selectedDomain}
              onChange={(e) => {
                setSelectedDomain(e.target.value)
                setCurrentPage(1)
              }}
              className={styles.selectInput}
              aria-label="Filter by Domain"
            >
              <option value="All Domains">All Domains</option>
              {uniqueDomains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={selectedLevel}
              onChange={(e) => {
                setSelectedLevel(e.target.value)
                setCurrentPage(1)
              }}
              className={styles.selectInput}
              aria-label="Filter by Level or Status"
            >
              <option value="All Levels">All Levels &amp; Statuses</option>
              <option value="Assessed Only">Assessed Only</option>
              <option value="Not Assessed">Not Assessed</option>
              <option value="Level 1">Level 1 - Beginner</option>
              <option value="Level 2">Level 2 - Basic</option>
              <option value="Level 3">Level 3 - Intermediate</option>
              <option value="Level 4">Level 4 - Advanced</option>
              <option value="Level 5">Level 5 - Expert</option>
            </select>

            <button
              type="button"
              className={styles.filterBtn}
              onClick={() => {
                setSearchQuery('')
                setSelectedDomain('All Domains')
                setSelectedLevel('All Levels')
                setActiveTab('All Skills')
                setCurrentPage(1)
              }}
              title="Reset all filters"
            >
              <Filter size={15} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className={styles.tableWrap}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Skill / Competency</th>
                <th style={{ width: '16%' }}>Domain</th>
                <th style={{ width: '15%' }}>Proficiency Rating</th>
                <th style={{ width: '13%' }}>Current Level</th>
                <th style={{ width: '13%' }}>Cadre Target</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Skill Gap</th>
                <th style={{ width: '12%' }}>Last Evaluated</th>
                <th style={{ width: '8%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCompetencies.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748B' }}>
                    No competencies found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedCompetencies.map((comp) => {
                  const domConfig = DOMAIN_CONFIG[comp.domain] || {
                    bgColor: '#EEF2FF',
                    textColor: '#4F46E5',
                    iconBg: '#EDE9FE',
                  }
                  const curLvlConfig = comp.isAssessed
                    ? LEVEL_CONFIG[comp.currentLevel] || LEVEL_CONFIG[1]
                    : null
                  const tgtLvlConfig = LEVEL_CONFIG[comp.targetLevel] || LEVEL_CONFIG[3]

                  return (
                    <tr key={comp._id}>
                      {/* Skill Cell */}
                      <td>
                        <div className={styles.skillCell}>
                          <div
                            className={styles.skillIconBox}
                            style={{ background: domConfig.iconBg, color: domConfig.textColor }}
                          >
                            {comp.iconSymbol || '∑'}
                          </div>
                          <div className={styles.skillMeta}>
                            <span className={styles.skillName}>{comp.displayName || comp.name}</span>
                            <span
                              className={styles.skillDesc}
                              title={comp.displayDesc || comp.description}
                            >
                              {comp.displayDesc || comp.description}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Domain Cell */}
                      <td>
                        <span
                          className={styles.domainPill}
                          style={{ background: domConfig.bgColor, color: domConfig.textColor }}
                        >
                          {comp.domain}
                        </span>
                      </td>

                      {/* Interactive 5-Star Rating */}
                      <td>
                        <div className={styles.starRow}>
                          {[1, 2, 3, 4, 5].map((starIdx) => {
                            const isFilled = comp.isAssessed && starIdx <= comp.currentLevel
                            return (
                              <button
                                key={starIdx}
                                type="button"
                                className={`${styles.starBtn} ${
                                  isFilled ? styles.starFilled : styles.starEmpty
                                }`}
                                onClick={() => handleLevelChange(comp._id, starIdx)}
                                title={
                                  comp.isAssessed
                                    ? `Level ${comp.currentLevel} assessed. Click to update to Level ${starIdx} (${LEVEL_CONFIG[starIdx]?.name})`
                                    : `Not assessed. Click to self-assess at Level ${starIdx} (${LEVEL_CONFIG[starIdx]?.name})`
                                }
                                disabled={updatingId === comp._id}
                              >
                                <Star
                                  size={17}
                                  fill={isFilled ? '#F59E0B' : 'transparent'}
                                  stroke={isFilled ? '#F59E0B' : '#CBD5E1'}
                                />
                              </button>
                            )
                          })}
                        </div>
                      </td>

                      {/* Current Level Badge */}
                      <td>
                        {comp.isAssessed && curLvlConfig ? (
                          <span
                            className={styles.levelBadge}
                            style={{
                              background: curLvlConfig.bg,
                              color: curLvlConfig.text,
                              border: `1px solid ${curLvlConfig.border}`,
                            }}
                          >
                            <span className={styles.levelBadgeNumber}>{comp.currentLevel}</span>
                            <span>{curLvlConfig.name}</span>
                          </span>
                        ) : (
                          <span
                            className={styles.unassessedBadge}
                            title="Not assessed. Complete diagnostic assessment or click stars to evaluate."
                          >
                            Not Assessed
                          </span>
                        )}
                      </td>

                      {/* Cadre Target Level Badge */}
                      <td>
                        <span
                          className={styles.levelBadge}
                          style={{
                            background: tgtLvlConfig.bg,
                            color: tgtLvlConfig.text,
                            border: `1px solid ${tgtLvlConfig.border}`,
                          }}
                        >
                          <span className={styles.levelBadgeNumber}>{comp.targetLevel}</span>
                          <span>{tgtLvlConfig.name}</span>
                        </span>
                      </td>

                      {/* Gap Status */}
                      <td style={{ textAlign: 'center' }}>
                        {comp.isAssessed ? (
                          comp.gap > 0 ? (
                            <span
                              className={comp.gap >= 2 ? styles.gapBadgeHigh : styles.gapBadgeMed}
                              title={`Gap: ${comp.gap} level(s) below cadre target`}
                            >
                              +{comp.gap} Level{comp.gap > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span
                              className={styles.gapBadgeZero}
                              title="Cadre benchmark satisfied"
                            >
                              0 (On Track)
                            </span>
                          )
                        ) : (
                          <span
                            className={styles.gapBadgeUnassessed}
                            title="Complete assessment to measure gap against Cadre Target"
                          >
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Last Evaluated Date */}
                      <td>
                        {comp.isAssessed ? (
                          <div>
                            <span className={styles.dateCell}>{comp.lastAssessed}</span>
                            {comp.source && (
                              <div>
                                <span className={styles.sourceTag}>
                                  {comp.source === 'self_assessed'
                                    ? 'Self-Assessed'
                                    : comp.source === 'diagnostic_test'
                                    ? 'Diagnostic Test'
                                    : 'Assessed'}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className={styles.dateCellMuted}>Not Assessed</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className={styles.actionsCell}>
                          <button
                            type="button"
                            className={styles.actionIconBtn}
                            title="View Competency Details"
                            onClick={() => setActiveModalComp(comp)}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            className={styles.actionIconBtn}
                            title="View Skill Gap Analytics"
                            onClick={() => navigate('/skill-gaps')}
                          >
                            <BarChart2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── 7. Table Footer & Pagination ────────────────────────────────── */}
        <div className={styles.tableFooter}>
          <div className={styles.footerLeft}>
            Showing {filteredCompetencies.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} to{' '}
            {Math.min(currentPage * rowsPerPage, filteredCompetencies.length)} of{' '}
            {filteredCompetencies.length} skills
          </div>

          <div className={styles.footerRight}>
            <div className={styles.rowsPerPageWrap}>
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className={styles.rowsSelect}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className={styles.paginationNav}>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(0, 5)
                .map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`${styles.pageBtn} ${
                      currentPage === page ? styles.pageBtnActive : ''
                    }`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}

              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next Page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 8. Skill Details Modal ────────────────────────────────────────── */}
      {activeModalComp && (
        <div className={styles.modalOverlay} onClick={() => setActiveModalComp(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span
                    className={styles.domainPill}
                    style={{
                      background: DOMAIN_CONFIG[activeModalComp.domain]?.bgColor || '#EEF2FF',
                      color: DOMAIN_CONFIG[activeModalComp.domain]?.textColor || '#4F46E5',
                    }}
                  >
                    {activeModalComp.domain}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                    {activeModalComp.category}
                  </span>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  {activeModalComp.displayName || activeModalComp.name}
                </h2>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setActiveModalComp(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#334155', margin: '0 0 6px 0' }}>
                  Competency Description
                </h4>
                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                  {activeModalComp.displayDesc ||
                    activeModalComp.description ||
                    'Official competency defined under the Ministry of Statistics and Programme Implementation competency framework.'}
                </p>
              </div>

              {/* Levels Overview */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#334155', margin: '0 0 10px 0' }}>
                  Proficiency Assessment Status
                </h4>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      background: '#F8FAFC',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                      Current Demonstrated Level
                    </span>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
                      {activeModalComp.isAssessed
                        ? `Level ${activeModalComp.currentLevel} - ${
                            LEVEL_CONFIG[activeModalComp.currentLevel]?.name
                          }`
                        : 'Not Assessed (Pending)'}
                    </div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      background: '#F8FAFC',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                      Cadre Mandated Target
                    </span>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
                      Level {activeModalComp.targetLevel} -{' '}
                      {LEVEL_CONFIG[activeModalComp.targetLevel]?.name}
                    </div>
                  </div>
                </div>
              </div>

              {/* Skill Gap Analysis Box */}
              <div
                style={{
                  padding: '12px 16px',
                  background:
                    activeModalComp.isAssessed && activeModalComp.gap > 0 ? '#FEF2F2' : '#F0FDF4',
                  borderRadius: '10px',
                  border: `1px solid ${
                    activeModalComp.isAssessed && activeModalComp.gap > 0 ? '#FECACA' : '#BBF7D0'
                  }`,
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>
                  Skill Gap Calculation
                </div>
                <div style={{ fontSize: '13px', color: '#334155', marginTop: '4px' }}>
                  {activeModalComp.isAssessed ? (
                    activeModalComp.gap > 0 ? (
                      <span>
                        Deficit of <strong>+{activeModalComp.gap} level(s)</strong> between your
                        demonstrated proficiency (Level {activeModalComp.currentLevel}) and role benchmark
                        (Level {activeModalComp.targetLevel}). Mapped training recommended.
                      </span>
                    ) : (
                      <span>
                        Target satisfied! Your demonstrated proficiency (Level {activeModalComp.currentLevel}
                        ) meets or exceeds your cadre role requirement (Level {activeModalComp.targetLevel}
                        ).
                      </span>
                    )
                  ) : (
                    <span>
                      Evaluation required. Take a diagnostic assessment to verify your demonstrated level
                      against the Cadre Target of Level {activeModalComp.targetLevel}.
                    </span>
                  )}
                </div>
              </div>

              {/* Level Benchmark Descriptors if available */}
              {activeModalComp.levelDescriptions && (
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#334155', margin: '0 0 8px 0' }}>
                    MoSPI Level Benchmarks
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    {activeModalComp.levelDescriptions.beginner && (
                      <div style={{ padding: '8px 12px', background: '#FEF2F2', borderRadius: '6px' }}>
                        <strong>Level 1 (Beginner):</strong> {activeModalComp.levelDescriptions.beginner}
                      </div>
                    )}
                    {activeModalComp.levelDescriptions.intermediate && (
                      <div style={{ padding: '8px 12px', background: '#EFF6FF', borderRadius: '6px' }}>
                        <strong>Level 3 (Intermediate):</strong>{' '}
                        {activeModalComp.levelDescriptions.intermediate}
                      </div>
                    )}
                    {activeModalComp.levelDescriptions.advanced && (
                      <div style={{ padding: '8px 12px', background: '#F0FDF4', borderRadius: '6px' }}>
                        <strong>Level 4 (Advanced):</strong> {activeModalComp.levelDescriptions.advanced}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.secondaryModalBtn}
                onClick={() => setActiveModalComp(null)}
              >
                Close
              </button>
              <button
                type="button"
                className={styles.primaryModalBtn}
                onClick={() => {
                  setActiveModalComp(null)
                  navigate('/skill-gaps')
                }}
              >
                <BarChart2
                  size={14}
                  style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }}
                />
                View Skill Gap Analytics
              </button>
              <button
                type="button"
                className={styles.primaryModalBtn}
                onClick={() => {
                  setActiveModalComp(null)
                  navigate('/courses')
                }}
              >
                <BookOpen
                  size={14}
                  style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }}
                />
                Browse Recommended Courses
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
