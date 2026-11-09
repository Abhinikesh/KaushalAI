import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  GitFork,
  Layers,
  Target,
  Users,
  Download,
  Plus,
  Info,
  ChevronDown,
  Search,
  ArrowRight,
  Eye,
  Edit2,
  MoreVertical,
  ChevronRight,
  Check,
  CheckCircle2,
  Sliders,
  FolderTree,
  BarChart2,
  Sparkles,
  Database,
  Cpu,
  ShieldCheck,
  BookOpen,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { getCompetencyFramework, getCanonicalRoles } from '../../api/competency.api'
import styles from './CompetencyFrameworkPage.module.css'

// 4 Canonical Competency Category Metadata & Visual Mapping
const CANONICAL_CATEGORIES = [
  {
    key: 'statistical',
    icon: BarChart2,
    color: '#2563EB',
    bg: '#EFF6FF',
    transKey: 'category_statistical',
    descKey: 'category_desc_statistical',
    fallbackName: 'Statistical & Quantitative Analysis',
    fallbackDesc: 'Core statistical concepts, survey methodologies, sampling frameworks and population parameter estimation.'
  },
  {
    key: 'technical',
    icon: Cpu,
    color: '#8B5CF6',
    bg: '#F5F3FF',
    transKey: 'category_technical',
    descKey: 'category_desc_technical',
    fallbackName: 'Technical & Digital Capabilities',
    fallbackDesc: 'Data processing, software computing tools, database architectures and algorithmic pipelines.'
  },
  {
    key: 'digital_governance',
    icon: ShieldCheck,
    color: '#F97316',
    bg: '#FFF7ED',
    transKey: 'category_digital_governance',
    descKey: 'category_desc_digital_governance',
    fallbackName: 'Digital Governance & Ethics',
    fallbackDesc: 'Data protection standards, official secrecy protocols, compliance audits and open dissemination ethics.'
  },
  {
    key: 'behavioural',
    icon: Users,
    color: '#10B981',
    bg: '#ECFDF5',
    transKey: 'category_behavioural',
    descKey: 'category_desc_behavioural',
    fallbackName: 'Behavioural & Leadership',
    fallbackDesc: 'Field team coordination, administrative communication, stakeholder management and institutional leadership.'
  }
]

export default function CompetencyFrameworkPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Navigation & Filtering States
  const [activeTab, setActiveTab] = useState('Domains')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedRoleId, setSelectedRoleId] = useState('all')
  const [domainSearch, setDomainSearch] = useState('')
  const [domainStatusFilter, setDomainStatusFilter] = useState('all')

  const [compSearch, setCompSearch] = useState('')
  const [debouncedCompSearch, setDebouncedCompSearch] = useState('')
  const [compLevelFilter, setCompLevelFilter] = useState('all')
  const [compStatusFilter, setCompStatusFilter] = useState('all')

  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(5)
  const [toastMessage, setToastMessage] = useState(null)
  const [activeModal, setActiveModal] = useState(null)
  const [selectedCompetency, setSelectedCompetency] = useState(null)

  // Debounce search input (300ms) to prevent unnecessary backend requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCompSearch(compSearch)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [compSearch])

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  // 1. Fetch Authoritative Competency Framework Data via React Query
  const frameworkParams = useMemo(() => {
    const params = {}
    if (selectedCategory && selectedCategory !== 'all') {
      params.category = selectedCategory
    }
    if (selectedRoleId && selectedRoleId !== 'all') {
      params.role_id = selectedRoleId
    }
    if (debouncedCompSearch && debouncedCompSearch.trim()) {
      params.search = debouncedCompSearch.trim()
    }
    return params
  }, [selectedCategory, selectedRoleId, debouncedCompSearch])

  const {
    data: frameworkData,
    isLoading: isFrameworkLoading,
    isError: isFrameworkError,
    error: frameworkError,
    refetch: refetchFramework,
    isFetching: isFrameworkFetching,
  } = useQuery({
    queryKey: ['competencyFramework', frameworkParams],
    queryFn: () => getCompetencyFramework(frameworkParams),
    staleTime: 60 * 1000,
    keepPreviousData: true,
  })

  // 2. Fetch Canonical Roles for optional Role Filter Dropdown
  const { data: rolesData } = useQuery({
    queryKey: ['canonicalRolesList'],
    queryFn: getCanonicalRoles,
    staleTime: 5 * 60 * 1000,
  })

  const canonicalRoles = useMemo(() => {
    if (Array.isArray(rolesData)) return rolesData
    if (rolesData?.roles && Array.isArray(rolesData.roles)) return rolesData.roles
    return []
  }, [rolesData])

  // Extract Authoritative Database Summary & Metrics
  const summary = frameworkData?.summary || {
    total_categories: 0,
    total_competencies: 0,
    assigned_competencies: 0,
    unassigned_competencies: 0,
    total_roles: 0,
    total_role_mappings: 0,
  }

  // Harmonize Categories: merge backend category totals with canonical UI metadata
  const categoriesList = useMemo(() => {
    const backendCategories = frameworkData?.categories || []
    const backendCatMap = new Map(backendCategories.map((c) => [c.key || c.code, c]))

    return CANONICAL_CATEGORIES.map((catMeta) => {
      const dbCat = backendCatMap.get(catMeta.key)
      const count = dbCat?.count ?? 0
      const percentage = dbCat?.percentage ?? 0
      const name = t(`competency_framework.${catMeta.transKey}`, dbCat?.name || catMeta.fallbackName)
      const desc = t(`competency_framework.${catMeta.descKey}`, catMeta.fallbackDesc)

      return {
        ...catMeta,
        name,
        desc,
        count,
        percentage,
        isAssigned: count > 0,
      }
    })
  }, [frameworkData?.categories, t])

  // Current active domain object for table title
  const activeCategoryObj = useMemo(() => {
    if (selectedCategory === 'all') return null
    return categoriesList.find((c) => c.key === selectedCategory) || null
  }, [selectedCategory, categoriesList])

  // Filter Domain Cards in Left Section by domainSearch and status
  const visibleCategories = useMemo(() => {
    return categoriesList.filter((cat) => {
      const matchesSearch = cat.name.toLowerCase().includes(domainSearch.toLowerCase()) ||
        cat.desc.toLowerCase().includes(domainSearch.toLowerCase())
      const matchesStatus = domainStatusFilter === 'all' ||
        (domainStatusFilter === 'active' && cat.count > 0) ||
        (domainStatusFilter === 'draft' && cat.count === 0)
      return matchesSearch && matchesStatus
    })
  }, [categoriesList, domainSearch, domainStatusFilter])

  // Extract & Apply Client-Side Filters to results (Level & Assignment Status)
  const rawResults = frameworkData?.results || []

  const filteredCompetencies = useMemo(() => {
    return rawResults.filter((comp) => {
      // Status filter
      if (compStatusFilter === 'assigned' && !comp.is_assigned) return false
      if (compStatusFilter === 'unassigned' && comp.is_assigned) return false

      // Level filter
      if (compLevelFilter !== 'all') {
        const targetLvl = Number(compLevelFilter)
        if (comp.required_level !== undefined) {
          if (comp.required_level !== targetLvl) return false
        } else if (Array.isArray(comp.levels) && comp.levels.length > 0) {
          const hasLevel = comp.levels.some((l) => (typeof l === 'object' ? l.level === targetLvl : l === targetLvl))
          if (!hasLevel) return false
        }
      }

      return true
    })
  }, [rawResults, compStatusFilter, compLevelFilter])

  // Pagination Math
  const totalItems = filteredCompetencies.length
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedCompetencies = filteredCompetencies.slice(startIndex, startIndex + rowsPerPage)

  // Dynamic Donut Chart Segments derived from API Categories
  const circumference = 2 * Math.PI * 38 // ~238.761
  let accumulatedLength = 0
  const donutSlices = useMemo(() => {
    let acc = 0
    return categoriesList.map((cat) => {
      const pct = Math.max(0, cat.percentage || 0)
      const sliceLength = (pct / 100) * circumference
      const strokeDasharray = `${sliceLength.toFixed(1)} ${(circumference - sliceLength).toFixed(1)}`
      const strokeDashoffset = (-acc).toFixed(1)
      acc += sliceLength
      return {
        ...cat,
        sliceLength,
        strokeDasharray,
        strokeDashoffset,
      }
    })
  }, [categoriesList, circumference])

  // Download Framework dossier as JSON
  const handleDownloadFramework = () => {
    try {
      const exportData = {
        framework: 'National Statistical Competency Framework (MoSPI)',
        timestamp: new Date().toISOString(),
        summary,
        categories: categoriesList.map((c) => ({
          key: c.key,
          name: c.name,
          count: c.count,
          percentage: c.percentage,
        })),
        competencies: rawResults,
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `KaushalAI_Competency_Framework_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast(t('competency_framework.qa_download') + ' initiated successfully!')
    } catch {
      showToast('Download failed. Please retry.')
    }
  }

  // Handle Category Card Click: toggles between category and 'all'
  const handleCategoryCardClick = (catKey) => {
    if (selectedCategory === catKey) {
      setSelectedCategory('all')
    } else {
      setSelectedCategory(catKey)
    }
    setCurrentPage(1)
  }

  // Reset all filters
  const handleClearFilters = () => {
    setSelectedCategory('all')
    setSelectedRoleId('all')
    setCompSearch('')
    setCompLevelFilter('all')
    setCompStatusFilter('all')
    setDomainSearch('')
    setDomainStatusFilter('all')
    setCurrentPage(1)
  }

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumb ─────────────────────────────────────── */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to="/dashboard" className={styles.breadcrumbLink}>
          {t('competency_framework.breadcrumb_dashboard', 'Dashboard')}
        </Link>
        <span className={styles.breadcrumbSep}>&gt;</span>
        <span className={styles.breadcrumbCurrent}>
          {t('competency_framework.breadcrumb_framework', 'Competency Framework')}
        </span>
      </nav>

      {/* ── Page Header & Actions ──────────────────────────── */}
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>
            {t('competency_framework.page_title', 'Competency Framework')}
            <Info
              size={16}
              className={styles.infoIcon}
              onClick={() => setActiveModal('framework-info')}
              title="About National Framework"
            />
          </h1>
          <p className={styles.pageSubtitle}>
            {t('competency_framework.page_subtitle', 'Explore competency domains, competencies and their skill mappings for the Official Statistics workforce.')}
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.importBtn}
            onClick={() => setActiveModal('import')}
            title="Read-Only Framework"
          >
            <Download size={14} />
            {t('competency_framework.import_btn', 'Import Framework')}
          </button>

          <button
            type="button"
            className={styles.addCompetencyBtn}
            onClick={() => setActiveModal('add-competency')}
            title="Read-Only Framework"
          >
            <Plus size={14} />
            {t('competency_framework.add_btn', 'Add Competency')}
          </button>
        </div>
      </div>

      {/* ── Top 4 KPI Metric Cards ─────────────────────────── */}
      <div className={styles.topMetricsGrid}>
        {/* Card 1: Domains / Categories */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconPurple}`}>
            <GitFork size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>
              {t('competency_framework.kpi_domains', 'Domains')}
            </span>
            <span className={styles.metricValue}>
              {isFrameworkLoading ? '—' : summary.total_categories}
            </span>
            <span className={styles.metricSubtext}>
              {t('competency_framework.kpi_domains_sub', 'Core competency domains')}
            </span>
          </div>
        </div>

        {/* Card 2: Competencies */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconGreen}`}>
            <Layers size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>
              {t('competency_framework.kpi_competencies', 'Competencies')}
            </span>
            <span className={styles.metricValue}>
              {isFrameworkLoading ? '—' : summary.total_competencies}
            </span>
            <span className={styles.metricSubtext}>
              {t('competency_framework.kpi_competencies_sub', 'Across all domains')}
            </span>
          </div>
        </div>

        {/* Card 3: Truthful Role Mappings (replacing fabricated skill count) */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconOrange}`}>
            <Target size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>
              {t('competency_framework.kpi_mappings', 'Role Mappings')}
            </span>
            <span className={styles.metricValue}>
              {isFrameworkLoading ? '—' : summary.total_role_mappings}
            </span>
            <span className={styles.metricSubtext}>
              {t('competency_framework.kpi_mappings_sub', 'Active role-competency links')}
            </span>
          </div>
        </div>

        {/* Card 4: Linked Job Roles */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconBlue}`}>
            <Users size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>
              {t('competency_framework.kpi_roles', 'Linked Job Roles')}
            </span>
            <span className={styles.metricValue}>
              {isFrameworkLoading ? '—' : summary.total_roles}
            </span>
            <span className={styles.metricSubtext}>
              {t('competency_framework.kpi_roles_sub', 'Roles using this framework')}
            </span>
          </div>
        </div>
      </div>

      {/* ── Underline Tabs ─────────────────────────────────── */}
      <div className={styles.tabsNav}>
        {[
          { key: 'Domains', label: t('competency_framework.tab_domains', 'Domains') },
          { key: 'Competencies', label: t('competency_framework.tab_competencies', 'Competencies') },
          { key: 'Skills & Sub-skills', label: t('competency_framework.tab_skills', 'Skills & Sub-skills') },
          { key: 'Job Role Mapping', label: t('competency_framework.tab_roles', 'Job Role Mapping') },
          { key: 'Framework Analytics', label: t('competency_framework.tab_analytics', 'Framework Analytics') },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tabItem} ${activeTab === tab.key ? styles.activeTabItem : ''}`}
            onClick={() => {
              setActiveTab(tab.key)
              if (tab.key === 'Competencies') {
                setSelectedCategory('all')
              } else if (tab.key === 'Framework Analytics') {
                navigate('/admin/competency-analytics')
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Error Banner State ──────────────────────────────── */}
      {isFrameworkError && (
        <div className={styles.errorBox}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={22} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              {t('competency_framework.error_title', 'Unable to load competency framework')}
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: 13, maxWidth: 600 }}>
            {frameworkError?.response?.data?.message ||
              t('competency_framework.error_desc', 'A problem occurred while retrieving framework records from the server. Please check your connection or retry.')}
          </p>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => refetchFramework()}
          >
            <RefreshCw size={13} style={{ marginRight: 6, display: 'inline-block', verticalAlign: '-2px' }} />
            {t('competency_framework.btn_retry', 'Retry')}
          </button>
        </div>
      )}

      {/* ── Main Two-Column Layout ─────────────────────────── */}
      <div className={styles.mainLayout}>
        {/* Left Column */}
        <div className={styles.leftCol}>
          {/* Section 1: Canonical Competency Domains */}
          <div className={styles.domainsSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleArea}>
                <h3 className={styles.sectionTitle}>
                  {t('competency_framework.section_domains_title', 'Competency Domains')}
                </h3>
                <p className={styles.sectionSubtitle}>
                  {t('competency_framework.section_domains_sub', 'Core domains of the Official Statistics competency framework.')}
                </p>
              </div>

              <div className={styles.sectionControls}>
                <button
                  type="button"
                  className={styles.hierarchyBtn}
                  onClick={() => setActiveModal('hierarchy')}
                >
                  <FolderTree size={13} />
                  {t('competency_framework.view_hierarchy', 'View Hierarchy')}
                </button>

                <div className={styles.searchWrap}>
                  <input
                    type="text"
                    placeholder={t('competency_framework.search_domains', 'Search domains...')}
                    value={domainSearch}
                    onChange={(e) => setDomainSearch(e.target.value)}
                    className={styles.searchInput}
                  />
                  <Search size={13} className={styles.searchIcon} />
                </div>

                <div className={styles.statusSelectWrap}>
                  <select
                    value={domainStatusFilter}
                    onChange={(e) => setDomainStatusFilter(e.target.value)}
                    className={styles.statusSelect}
                  >
                    <option value="all">{t('competency_framework.status_all', 'All Status')}</option>
                    <option value="active">{t('competency_framework.status_active', 'Active')}</option>
                    <option value="draft">{t('competency_framework.status_draft', 'Draft')}</option>
                  </select>
                  <ChevronDown size={12} className={styles.selectChevron} />
                </div>
              </div>
            </div>

            {/* 4 Canonical Domain Cards (2x2 Grid) */}
            <div className={styles.domainsGrid}>
              {visibleCategories.map((dom) => {
                const IconComp = dom.icon
                const isSelected = selectedCategory === dom.key
                return (
                  <div
                    key={dom.key}
                    className={`${styles.domainCard} ${isSelected ? styles.activeDomainCard : ''}`}
                    onClick={() => handleCategoryCardClick(dom.key)}
                  >
                    <div className={styles.domainCardTop}>
                      <div
                        className={styles.domainIconCircle}
                        style={{ background: dom.bg, color: dom.color }}
                      >
                        <IconComp size={18} />
                      </div>
                      <div className={styles.domainMeta}>
                        <h4 className={styles.domainName}>{dom.name}</h4>
                        <span className={styles.domainCount}>
                          {t('competency_framework.competencies_count', '{{count}} Competencies', { count: dom.count })}
                        </span>
                      </div>
                    </div>

                    <p className={styles.domainDesc}>{dom.desc}</p>

                    <div className={styles.domainCardBottom}>
                      <span className={dom.count > 0 ? styles.activeBadge : styles.unassignedBadge}>
                        {dom.count > 0 ? t('competency_framework.status_active', 'Active') : t('competency_framework.status_draft', 'Draft')}
                      </span>
                      <span className={styles.cardArrowBtn} style={{ color: dom.color }}>
                        {isSelected ? '✓ Selected' : '→'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Section 2: Competencies Table */}
          <div className={styles.competenciesSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleArea}>
                <h3 className={styles.sectionTitle}>
                  {activeCategoryObj
                    ? t('competency_framework.section_comp_title', 'Competencies in {{domain}}', { domain: activeCategoryObj.name })
                    : t('competency_framework.section_comp_all', 'All Framework Competencies')}
                </h3>
                <p className={styles.sectionSubtitle}>
                  {t('competency_framework.section_comp_sub', 'Authoritative list of competencies from the national database.')}
                </p>
              </div>

              <div className={styles.sectionControls}>
                {/* Canonical Role Filter Dropdown */}
                {canonicalRoles.length > 0 && (
                  <div className={styles.statusSelectWrap}>
                    <select
                      value={selectedRoleId}
                      onChange={(e) => {
                        setSelectedRoleId(e.target.value)
                        setCurrentPage(1)
                      }}
                      className={styles.statusSelect}
                    >
                      <option value="all">{t('competency_framework.filter_all_roles', 'All Job Roles')}</option>
                      {canonicalRoles.map((role) => (
                        <option key={role._id || role.id} value={role._id || role.id}>
                          {role.name || role.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} className={styles.selectChevron} />
                  </div>
                )}

                {/* Level Filter Dropdown */}
                <div className={styles.statusSelectWrap}>
                  <select
                    value={compLevelFilter}
                    onChange={(e) => {
                      setCompLevelFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className={styles.statusSelect}
                  >
                    <option value="all">{t('competency_framework.filter_all_levels', 'All Levels')}</option>
                    <option value="1">Level 1 - Beginner</option>
                    <option value="2">Level 2 - Basic</option>
                    <option value="3">Level 3 - Intermediate</option>
                    <option value="4">Level 4 - Advanced</option>
                    <option value="5">Level 5 - Expert</option>
                  </select>
                  <ChevronDown size={12} className={styles.selectChevron} />
                </div>

                {/* Status Filter Dropdown */}
                <div className={styles.statusSelectWrap}>
                  <select
                    value={compStatusFilter}
                    onChange={(e) => {
                      setCompStatusFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className={styles.statusSelect}
                  >
                    <option value="all">{t('competency_framework.status_all', 'All Status')}</option>
                    <option value="assigned">{t('competency_framework.assigned', 'Assigned')}</option>
                    <option value="unassigned">{t('competency_framework.unassigned', 'Unassigned')}</option>
                  </select>
                  <ChevronDown size={12} className={styles.selectChevron} />
                </div>

                {/* Competency Search Input */}
                <div className={styles.searchWrap}>
                  <input
                    type="text"
                    placeholder={t('competency_framework.search_comp_placeholder', 'Search competencies by name or code...')}
                    value={compSearch}
                    onChange={(e) => setCompSearch(e.target.value)}
                    className={styles.searchInput}
                  />
                  <Search size={13} className={styles.searchIcon} />
                </div>

                {/* Clear / Reset Filters Action Button */}
                <button
                  type="button"
                  className={styles.filterActionBtn}
                  onClick={handleClearFilters}
                  title="Reset all search & category filters"
                >
                  <Sliders size={12} />
                  {t('competency_framework.btn_clear_filters', 'Clear Filters')}
                </button>
              </div>
            </div>

            {/* Competencies Table or Empty State */}
            {isFrameworkLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 12px', display: 'block' }} />
                <span>{t('competency_framework.loading', 'Loading competency framework...')}</span>
              </div>
            ) : paginatedCompetencies.length === 0 ? (
              <div className={styles.emptyBox}>
                <AlertCircle size={32} color="#94A3B8" />
                <h4 className={styles.emptyTitle}>
                  {t('competency_framework.empty_title', 'No Competencies Found')}
                </h4>
                <p className={styles.emptyDesc}>
                  {selectedRoleId !== 'all' && rawResults.length === 0
                    ? t('competency_framework.empty_role_desc', 'This job role currently has no assigned competencies in the framework.')
                    : t('competency_framework.empty_desc', 'No competencies match your current search, category, or role criteria.')}
                </p>
                <button
                  type="button"
                  className={styles.clearFiltersBtn}
                  onClick={handleClearFilters}
                >
                  {t('competency_framework.btn_clear_filters', 'Clear Filters')}
                </button>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.compTable}>
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>{t('competency_framework.th_num', '#')}</th>
                      <th>{t('competency_framework.th_name', 'Competency Name')}</th>
                      <th>{t('competency_framework.th_desc', 'Description')}</th>
                      <th>{t('competency_framework.th_levels', 'Proficiency Levels')}</th>
                      <th>{t('competency_framework.th_roles', 'Assigned Roles')}</th>
                      <th>{t('competency_framework.th_status', 'Status')}</th>
                      <th style={{ textAlign: 'center' }}>{t('competency_framework.th_actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCompetencies.map((comp, idx) => {
                      const catMeta = CANONICAL_CATEGORIES.find((c) => c.key === comp.category)
                      const isRoleFiltered = selectedRoleId && selectedRoleId !== 'all' && comp.required_level !== undefined

                      return (
                        <tr key={comp._id || comp.id || idx} className={styles.compRow}>
                          <td>{startIndex + idx + 1}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                {(comp.competencyCode || comp.code) && (
                                  <span className={styles.compCodeBadge}>{comp.competencyCode || comp.code}</span>
                                )}
                                <span className={styles.compNameStrong}>{comp.name}</span>
                              </div>
                              {catMeta && (
                                <span
                                  className={styles.categoryPill}
                                  style={{ background: catMeta.bg, color: catMeta.color }}
                                >
                                  {t(`competency_framework.${catMeta.transKey}`, catMeta.fallbackName)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={styles.compDescCell}>
                              {comp.description || '—'}
                            </span>
                          </td>
                          <td>
                            <div className={styles.levelPills}>
                              {[1, 2, 3, 4, 5].map((lvl) => {
                                const isReq = isRoleFiltered && comp.required_level === lvl
                                return (
                                  <span
                                    key={lvl}
                                    className={`${styles.levelPill} ${styles[`lvl${lvl}`]} ${isReq ? styles.levelReqHighlight : ''}`}
                                    title={isReq ? `Required: Level ${lvl}` : `Level ${lvl}`}
                                  >
                                    {lvl}
                                  </span>
                                )
                              })}
                            </div>
                            {isRoleFiltered && (
                              <span style={{ fontSize: 10.5, color: '#4F46E5', fontWeight: 600, display: 'block', marginTop: 4 }}>
                                {t('competency_framework.req_level', 'Req: L{{level}}', { level: comp.required_level })}
                              </span>
                            )}
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: '#1E293B' }}>
                              {t('competency_framework.roles_count', '{{count}} Roles', { count: comp.roles_count || 0 })}
                            </span>
                          </td>
                          <td>
                            <span className={comp.is_assigned ? styles.activeBadge : styles.unassignedBadge}>
                              {comp.is_assigned
                                ? t('competency_framework.assigned', 'Assigned')
                                : t('competency_framework.unassigned', 'Unassigned')}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div className={styles.actionIconsCell} style={{ justifyContent: 'center' }}>
                              <button
                                type="button"
                                className={styles.actionIconBtn}
                                title={t('competency_framework.action_view', 'View Details')}
                                onClick={() => {
                                  setSelectedCompetency(comp)
                                  setActiveModal('comp-detail')
                                }}
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                className={styles.actionIconBtn}
                                title={t('competency_framework.action_edit', 'Edit Competency')}
                                onClick={() => {
                                  showToast(t('competency_framework.readonly_notice', 'Read-only mode: Framework authoring and mutations are restricted to administrative governance.'))
                                }}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                className={styles.actionIconBtn}
                                title={t('competency_framework.action_more', 'More Options')}
                                onClick={() => {
                                  showToast(`Competency Code: ${comp.code || 'N/A'}`)
                                }}
                              >
                                <MoreVertical size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {!isFrameworkLoading && totalItems > 0 && (
              <div className={styles.paginationRow}>
                <span>
                  {t('competency_framework.showing_results', 'Showing {{start}} to {{end}} of {{total}} competencies', {
                    start: Math.min(startIndex + 1, totalItems),
                    end: Math.min(startIndex + rowsPerPage, totalItems),
                    total: totalItems,
                  })}
                </span>

                <div className={styles.paginationRight}>
                  <span>{t('competency_framework.rows_per_page', 'Rows per page:')}</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className={styles.statusSelect}
                    style={{ padding: '3px 20px 3px 6px' }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>

                  <div className={styles.pageButtons}>
                    <button
                      type="button"
                      className={styles.pageBtn}
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      &lsaquo;
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`${styles.pageBtn} ${currentPage === p ? styles.activePageBtn : ''}`}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={styles.pageBtn}
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      &rsaquo;
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Framework Summary, Domain Distribution, Quick Actions */}
        <div className={styles.rightCol}>
          {/* Card 1: Authoritative Framework Summary */}
          <div className={styles.rightCard}>
            <h3 className={styles.rightCardTitle}>
              {t('competency_framework.summary_title', 'Framework Summary')}
            </h3>

            <div className={styles.summaryList}>
              <div className={styles.summaryItem}>
                <div className={styles.summaryItemLeft}>
                  <GitFork size={14} color="#6366F1" />
                  <span>{t('competency_framework.summary_domains', 'Total Domains')}</span>
                </div>
                <span className={styles.summaryVal}>
                  {isFrameworkLoading ? '—' : summary.total_categories}
                </span>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryItemLeft}>
                  <Layers size={14} color="#10B981" />
                  <span>{t('competency_framework.summary_competencies', 'Total Competencies')}</span>
                </div>
                <span className={styles.summaryVal}>
                  {isFrameworkLoading ? '—' : summary.total_competencies}
                </span>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryItemLeft}>
                  <Target size={14} color="#F97316" />
                  <span>{t('competency_framework.summary_mappings', 'Total Role Mappings')}</span>
                </div>
                <span className={styles.summaryVal}>
                  {isFrameworkLoading ? '—' : summary.total_role_mappings}
                </span>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryItemLeft}>
                  <Users size={14} color="#2563EB" />
                  <span>{t('competency_framework.summary_roles', 'Total Job Roles')}</span>
                </div>
                <span className={styles.summaryVal}>
                  {isFrameworkLoading ? '—' : summary.total_roles}
                </span>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryItemLeft}>
                  <CheckCircle2 size={14} color="#059669" />
                  <span>{t('competency_framework.summary_assigned', 'Assigned Competencies')}</span>
                </div>
                <span className={styles.summaryVal}>
                  {isFrameworkLoading ? '—' : summary.assigned_competencies}
                </span>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryItemLeft}>
                  <AlertCircle size={14} color="#64748B" />
                  <span>{t('competency_framework.summary_unassigned', 'Unassigned Competencies')}</span>
                </div>
                <span className={styles.summaryVal}>
                  {isFrameworkLoading ? '—' : summary.unassigned_competencies}
                </span>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryItemLeft}>
                  <Database size={14} color="#64748B" />
                  <span>{t('competency_framework.summary_source', 'Data Source')}</span>
                </div>
                <span style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>
                  {t('competency_framework.summary_source_val', 'Authoritative MongoDB Catalog')}
                </span>
              </div>
            </div>

            <div className={styles.cardFooterLink}>
              <button
                type="button"
                className={styles.footerLinkBtn}
                onClick={() => navigate('/admin/competency-analytics')}
              >
                {t('competency_framework.view_analytics', 'View Framework Analytics →')}
              </button>
            </div>
          </div>

          {/* Card 2: Dynamic Domain Distribution & Donut Chart */}
          <div className={styles.rightCard}>
            <h3 className={styles.rightCardTitle}>
              {t('competency_framework.dist_title', 'Domain Distribution')}
            </h3>

            <div className={styles.donutWrap}>
              <div className={styles.donutSvgArea}>
                <svg viewBox="0 0 100 100" className={styles.donutSvg}>
                  {summary.total_competencies === 0 ? (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#E2E8F0"
                      strokeWidth="15"
                    />
                  ) : (
                    donutSlices.map((slice) => (
                      <circle
                        key={slice.key}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke={slice.color}
                        strokeWidth="15"
                        strokeDasharray={slice.strokeDasharray}
                        strokeDashoffset={slice.strokeDashoffset}
                      />
                    ))
                  )}
                </svg>
              </div>

              <div className={styles.distLegend}>
                {categoriesList.map((cat) => (
                  <div
                    key={cat.key}
                    className={styles.distItem}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleCategoryCardClick(cat.key)}
                    title={`Click to filter by ${cat.name}`}
                  >
                    <div className={styles.distLeft}>
                      <span className={styles.distSquare} style={{ background: cat.color }} />
                      <span style={{ fontWeight: selectedCategory === cat.key ? 700 : 500 }}>
                        {cat.name}
                      </span>
                    </div>
                    <span className={styles.distPct}>{cat.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.cardFooterLink}>
              <button
                type="button"
                className={styles.footerLinkBtn}
                onClick={() => setActiveModal('full-report')}
              >
                {t('competency_framework.view_full_report', 'View Full Report →')}
              </button>
            </div>
          </div>

          {/* Card 3: Quick Actions */}
          <div className={styles.rightCard}>
            <h3 className={styles.rightCardTitle}>
              {t('competency_framework.quick_actions_title', 'Quick Actions')}
            </h3>

            <div className={styles.quickActionsList}>
              <div
                className={styles.quickActionLink}
                onClick={() => setActiveModal('add-competency')}
              >
                <span style={{ color: 'var(--color-primary-600)', fontWeight: 600 }}>
                  {t('competency_framework.qa_add_competency', '+ Add New Competency')}
                </span>
                <ChevronRight size={13} color="#94A3B8" />
              </div>

              <div
                className={styles.quickActionLink}
                onClick={() => setActiveModal('import')}
              >
                <span>{t('competency_framework.qa_import', 'Import from Template')}</span>
                <ChevronRight size={13} color="#94A3B8" />
              </div>

              <div
                className={styles.quickActionLink}
                onClick={() => setActiveModal('manage-levels')}
              >
                <span>{t('competency_framework.qa_manage_levels', 'Manage Proficiency Levels')}</span>
                <ChevronRight size={13} color="#94A3B8" />
              </div>

              <div
                className={styles.quickActionLink}
                onClick={() => navigate('/admin/skill-taxonomy')}
              >
                <span>{t('competency_framework.qa_view_taxonomy', 'View Skill Taxonomy')}</span>
                <ChevronRight size={13} color="#94A3B8" />
              </div>

              <div
                className={styles.quickActionLink}
                onClick={handleDownloadFramework}
              >
                <span>{t('competency_framework.qa_download', 'Download Framework')}</span>
                <ChevronRight size={13} color="#94A3B8" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Banner: Build a Future-Ready Workforce ── */}
      <div className={styles.bottomBanner}>
        <div className={styles.bannerLeft}>
          <div className={styles.bannerIconCircle}>
            <Sparkles size={20} />
          </div>
          <div className={styles.bannerText}>
            <h4 className={styles.bannerTitle}>
              {t('competency_framework.banner_title', 'Build a Future-Ready Workforce')}
            </h4>
            <p className={styles.bannerDesc}>
              {t('competency_framework.banner_desc', 'A well-defined competency framework helps identify skill gaps, plan learning interventions and drive performance for the Official Statistics workforce.')}
            </p>
          </div>
        </div>

        <button
          type="button"
          className={styles.exploreAnalyticsBtn}
          onClick={() => navigate('/admin/competency-analytics')}
        >
          {t('competency_framework.btn_explore_analytics', 'Explore Analytics →')}
        </button>
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}
      {activeModal && (
        <div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {activeModal === 'add-competency' && t('competency_framework.add_btn', 'Add New Competency')}
                {activeModal === 'import' && t('competency_framework.import_btn', 'Import Competency Framework')}
                {activeModal === 'hierarchy' && t('competency_framework.view_hierarchy', 'Framework Domain Hierarchy')}
                {activeModal === 'comp-detail' && (selectedCompetency?.name || 'Competency Details')}
                {activeModal === 'manage-levels' && t('competency_framework.qa_manage_levels', '5-Point Proficiency Scale Matrix')}
                {activeModal === 'full-report' && t('competency_framework.dist_title', 'Domain Distribution Breakdown')}
                {activeModal === 'framework-info' && 'National Statistical Competency Standards'}
              </h3>
              <button type="button" className={styles.closeBtn} onClick={() => setActiveModal(null)}>
                &times;
              </button>
            </div>

            {/* Modal Body: Add Competency (Read-Only Governance Explanation) */}
            {activeModal === 'add-competency' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className={styles.readonlyNotice}>
                  <Info size={18} style={{ flexShrink: 0 }} />
                  <span>
                    {t('competency_framework.readonly_notice', 'Read-only mode: Framework authoring and mutations are restricted to administrative governance.')}
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Competency Domain
                  </label>
                  <select
                    disabled
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#F8FAFC' }}
                  >
                    {categoriesList.map((d) => (
                      <option key={d.key} value={d.key}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Competency Name
                  </label>
                  <input
                    type="text"
                    disabled
                    placeholder="e.g. Econometric Forecasting"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#F8FAFC' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Official Description
                  </label>
                  <textarea
                    rows={3}
                    disabled
                    placeholder="Methodological abilities and performance standards are maintained in the database..."
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#F8FAFC' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                  <button type="button" className={styles.importBtn} onClick={() => setActiveModal(null)}>
                    Close
                  </button>
                  <button
                    type="button"
                    className={`${styles.addCompetencyBtn} ${styles.disabledBtn}`}
                    disabled
                    title="Administrative privileges required"
                  >
                    Save Competency (Disabled)
                  </button>
                </div>
              </div>
            )}

            {/* Modal Body: Import Framework (Read-Only Notice) */}
            {activeModal === 'import' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className={styles.readonlyNotice}>
                  <Info size={18} style={{ flexShrink: 0 }} />
                  <span>
                    {t('competency_framework.readonly_notice', 'Read-only mode: Framework authoring and mutations are restricted to administrative governance.')}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
                  Framework imports and taxonomy synchronizations are performed directly via official MoSPI database pipelines.
                </p>
                <div style={{ border: '2px dashed #C7D2FE', borderRadius: 10, padding: 24, textAlign: 'center', background: '#F8FAFC' }}>
                  <Download size={24} color="#6366F1" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                    National Competency Schema v2.4 Active
                  </span>
                  <span style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginTop: 4 }}>
                    Database contains {summary.total_competencies} competencies across {summary.total_categories} canonical domains.
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className={styles.importBtn} onClick={() => setActiveModal(null)}>
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Modal Body: View Hierarchy */}
            {activeModal === 'hierarchy' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
                {categoriesList.map((dom) => (
                  <div key={dom.key} style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: 13, color: '#0F172A' }}>
                      <span style={{ color: dom.color }}>{dom.name}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--color-primary-600)' }}>
                        {t('competency_framework.competencies_count', '{{count}} Competencies', { count: dom.count })} ({dom.percentage}%)
                      </span>
                    </div>
                    <p style={{ fontSize: 11.5, color: '#64748B', margin: '4px 0 0' }}>{dom.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Body: Competency Detail */}
            {activeModal === 'comp-detail' && selectedCompetency && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {(selectedCompetency.competencyCode || selectedCompetency.code) && (
                    <span className={styles.compCodeBadge}>{selectedCompetency.competencyCode || selectedCompetency.code}</span>
                  )}
                  <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600, textTransform: 'capitalize' }}>
                    {selectedCompetency.category}
                  </span>
                </div>

                <p style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.5, margin: 0 }}>
                  {selectedCompetency.description || 'No detailed description available in database.'}
                </p>

                <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: 6 }}>
                    Proficiency Progression Matrix:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, color: '#475569' }}>
                    {Array.isArray(selectedCompetency.levels) && selectedCompetency.levels.length > 0 ? (
                      selectedCompetency.levels.map((lvl) => (
                        <div key={lvl.level || lvl}>
                          <strong>Level {lvl.level || lvl}:</strong> {lvl.description || `Proficiency Level ${lvl.level || lvl}`}
                        </div>
                      ))
                    ) : (
                      <>
                        <div><strong>Level 1 (Beginner):</strong> Understands definitions and basic terminologies.</div>
                        <div><strong>Level 2 (Basic):</strong> Applies standard steps under supervision.</div>
                        <div><strong>Level 3 (Intermediate):</strong> Independently executes statistical workflows.</div>
                        <div><strong>Level 4 (Advanced):</strong> Troubleshoots discrepancies and customizes sampling.</div>
                        <div><strong>Level 5 (Expert):</strong> Designs ministerial methodologies and international frameworks.</div>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <Link
                    to={`/competencies/${selectedCompetency._id || selectedCompetency.id}`}
                    className={styles.footerLinkBtn}
                    style={{ textDecoration: 'none' }}
                  >
                    {t('competency_framework.open_full_detail', 'Open Full Competency Page →')}
                  </Link>
                  <button type="button" className={styles.importBtn} onClick={() => setActiveModal(null)}>
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Modal Body: Manage Levels */}
            {activeModal === 'manage-levels' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5, color: '#334155' }}>
                <div style={{ padding: 10, background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE' }}>
                  Standardized 5-Level Proficiency Scale aligned with Kirkpatrick Level 4 evaluation standards.
                </div>
                <ul style={{ margin: '6px 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <li><strong>Level 1 - Beginner:</strong> Foundational awareness of concepts.</li>
                  <li><strong>Level 2 - Basic:</strong> Routine task execution under supervision.</li>
                  <li><strong>Level 3 - Intermediate:</strong> Autonomous execution in field surveys.</li>
                  <li><strong>Level 4 - Advanced:</strong> Problem-solving and junior officer mentoring.</li>
                  <li><strong>Level 5 - Expert:</strong> Strategic policy design and ministerial representation.</li>
                </ul>
                <div style={{ textAlign: 'right', marginTop: 8 }}>
                  <button type="button" className={styles.importBtn} onClick={() => setActiveModal(null)}>
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Modal Body: Full Distribution Report */}
            {activeModal === 'full-report' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>Domain</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Competencies</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Share (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoriesList.map((cat) => (
                      <tr key={cat.key} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 2, background: cat.color }} />
                          <strong>{cat.name}</strong>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{cat.count}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{cat.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ textAlign: 'right', marginTop: 10 }}>
                  <button type="button" className={styles.importBtn} onClick={() => setActiveModal(null)}>
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Default info modal */}
            {activeModal === 'framework-info' && (
              <div style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.55 }}>
                <p>
                  The <strong>National Statistical Competency Framework</strong> codifies the knowledge, practical skills, and behavioral attributes required across all cadres of the Indian Statistical Service (ISS) and Subordinate Statistical Service (SSS).
                </p>
                <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0', marginTop: 12 }}>
                  <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                    Authoritative Database Pillars:
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#475569', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <li>4 Canonical Domains spanning methodological, digital, governance, and leadership capabilities</li>
                    <li>Live synchronization with the official MongoDB database</li>
                    <li>Authentic role-to-competency requirement mappings</li>
                    <li>Zero synthetic or mock records</li>
                  </ul>
                </div>
                <div style={{ textAlign: 'right', marginTop: 14 }}>
                  <button type="button" className={styles.importBtn} onClick={() => setActiveModal(null)}>
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Toast Feedback ─────────────────────────────────── */}
      {toastMessage && (
        <div className={styles.toastBanner}>
          <Check size={16} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
