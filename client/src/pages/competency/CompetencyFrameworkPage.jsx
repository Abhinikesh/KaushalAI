import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  FileSpreadsheet,
  Settings,
  FolderTree,
  BarChart2,
  Sparkles,
  Database,
  Cpu,
  ShieldCheck,
  Briefcase,
  BookOpen
} from 'lucide-react'
import styles from './CompetencyFrameworkPage.module.css'

export default function CompetencyFrameworkPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Domains')
  const [selectedDomainId, setSelectedDomainId] = useState(1)
  const [domainSearch, setDomainSearch] = useState('')
  const [domainStatusFilter, setDomainStatusFilter] = useState('all')
  const [compSearch, setCompSearch] = useState('')
  const [compLevelFilter, setCompLevelFilter] = useState('all')
  const [compStatusFilter, setCompStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(5)
  const [toastMessage, setToastMessage] = useState(null)
  const [activeModal, setActiveModal] = useState(null)
  const [selectedCompetency, setSelectedCompetency] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  // 6 Competency Domains
  const domains = [
    {
      id: 1,
      name: '1. Statistical Methods',
      count: '12 Competencies',
      competencyCount: 12,
      desc: 'Core statistical concepts, methods and applications',
      icon: BarChart2,
      iconColor: '#2563EB',
      iconBg: '#EFF6FF',
      status: 'Active',
      distribution: '20%'
    },
    {
      id: 2,
      name: '2. Data Management',
      count: '8 Competencies',
      competencyCount: 8,
      desc: 'Data collection, processing, storage and management',
      icon: Database,
      iconColor: '#10B981',
      iconBg: '#ECFDF5',
      status: 'Active',
      distribution: '17%'
    },
    {
      id: 3,
      name: '3. Analytical & Technical',
      count: '10 Competencies',
      competencyCount: 10,
      desc: 'Analytical techniques and technical tools',
      icon: Cpu,
      iconColor: '#8B5CF6',
      iconBg: '#F5F3FF',
      status: 'Active',
      distribution: '21%'
    },
    {
      id: 4,
      name: '4. Governance & Quality',
      count: '6 Competencies',
      competencyCount: 6,
      desc: 'Data governance, quality and compliance',
      icon: ShieldCheck,
      iconColor: '#F97316',
      iconBg: '#FFF7ED',
      status: 'Active',
      distribution: '13%'
    },
    {
      id: 5,
      name: '5. Behavioural & Managerial',
      count: '7 Competencies',
      competencyCount: 7,
      desc: 'Leadership, communication and management skills',
      icon: Users,
      iconColor: '#EF4444',
      iconBg: '#FEF2F2',
      status: 'Active',
      distribution: '15%'
    },
    {
      id: 6,
      name: '6. Domain Knowledge',
      count: '5 Competencies',
      competencyCount: 5,
      desc: 'Subject matter knowledge in official statistics',
      icon: BookOpen,
      iconColor: '#06B6D4',
      iconBg: '#ECFEFF',
      status: 'Active',
      distribution: '14%'
    },
  ]

  // Competencies dictionary grouped by domain id
  const competenciesData = {
    1: [
      { id: 1, name: 'Survey Design', desc: 'Design and plan statistical surveys', skills: 8, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 2, name: 'Sampling Methods', desc: 'Apply sampling techniques', skills: 6, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 3, name: 'Data Estimation', desc: 'Estimate population parameters', skills: 5, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 4, name: 'Hypothesis Testing', desc: 'Conduct statistical hypothesis tests', skills: 7, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 5, name: 'Time Series Analysis', desc: 'Analyze time series data', skills: 6, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 6, name: 'Probability Modeling', desc: 'Formulate discrete and continuous distributions', skills: 7, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 7, name: 'Regression Analysis', desc: 'Fit linear and non-linear regression models', skills: 9, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 8, name: 'Survey Error Evaluation', desc: 'Evaluate non-sampling errors and response bias', skills: 5, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 9, name: 'Demographic Estimation', desc: 'Calculate fertility, mortality, and life tables', skills: 6, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 10, name: 'Index Number Compilation', desc: 'Formulate CPI, IIP and deflator matrices', skills: 8, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 11, name: 'Small Area Estimation', desc: 'Model localized indicators via empirical Bayes', skills: 5, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 12, name: 'Non-Parametric Testing', desc: 'Perform distribution-free inference tests', skills: 4, levels: [1, 2, 3, 4, 5], status: 'Active' },
    ],
    2: [
      { id: 1, name: 'Field Data Capture', desc: 'Manage CAPI and mobile tablet survey intake', skills: 6, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 2, name: 'Data Cleaning & Imputation', desc: 'Scrub microdata and apply hot-deck imputation', skills: 7, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 3, name: 'Relational Database Management', desc: 'Maintain PostgreSQL and SQL data stores', skills: 9, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 4, name: 'ETL Pipeline Architecture', desc: 'Automate schedule ingestion into data lakes', skills: 8, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 5, name: 'Data Anonymization', desc: 'Apply k-anonymity and differential privacy', skills: 5, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 6, name: 'Metadata Standardization', desc: 'Implement SDMX and DDI documentation formats', skills: 6, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 7, name: 'Master Data Governance', desc: 'Manage enterprise business register registries', skills: 7, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 8, name: 'Data Warehousing', desc: 'Optimize star schemas for analytical reporting', skills: 8, levels: [1, 2, 3, 4, 5], status: 'Active' },
    ],
    3: [
      { id: 1, name: 'Statistical Computing in R', desc: 'Execute tidyverse, survey and forecast packages', skills: 9, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 2, name: 'Python for Data Science', desc: 'Manipulate Pandas, NumPy and Scikit-Learn data', skills: 8, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 3, name: 'Interactive Data Visualization', desc: 'Build Power BI and Tableau thematic reports', skills: 7, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 4, name: 'Machine Learning Models', desc: 'Develop predictive classification and clustering', skills: 8, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 5, name: 'GIS & Spatial Analytics', desc: 'Map geo-referenced agricultural and census units', skills: 6, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 6, name: 'Big Data Processing', desc: 'Query Spark and distributed census registries', skills: 5, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 7, name: 'Automated Scripting', desc: 'Write bash and python cron tasks for data checks', skills: 6, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 8, name: 'Cloud Analytics', desc: 'Deploy cloud containers on NIC MeghRaj', skills: 7, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 9, name: 'Natural Language Processing', desc: 'Analyze qualitative survey comments and notes', skills: 5, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 10, name: 'Reproducible Research', desc: 'Author dynamic R Markdown and Quarto papers', skills: 6, levels: [1, 2, 3, 4, 5], status: 'Active' },
    ],
    4: [
      { id: 1, name: 'National Quality Assurance (NQAF)', desc: 'Audit compliance with UN and MoSPI NQAF codes', skills: 8, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 2, name: 'Confidentiality Compliance', desc: 'Enforce Official Secrets Act and Collection of Statistics Act', skills: 6, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 3, name: 'Audit Trail Verification', desc: 'Maintain CAFE field scrutiny logs and revisions', skills: 7, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 4, name: 'Microdata Dissemination Policy', desc: 'Publish open data under NDAP protocols', skills: 5, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 5, name: 'Ethics in Official Statistics', desc: 'Adhere to Fundamental Principles of Official Statistics', skills: 6, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 6, name: 'Risk Management in Fieldwork', desc: 'Mitigate non-response and natural disaster disruptions', skills: 5, levels: [1, 2, 3, 4, 5], status: 'Active' },
    ],
    5: [
      { id: 1, name: 'Field Team Leadership', desc: 'Supervise primary enumerators and investigators', skills: 7, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 2, name: 'Technical Report Writing', desc: 'Draft cabinet notes, press releases, and gazettes', skills: 8, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 3, name: 'Inter-Agency Coordination', desc: 'Coordinate with State DES and central line ministries', skills: 6, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 4, name: 'Conflict Resolution in Fieldwork', desc: 'Address household resistance and local authority hurdles', skills: 5, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 5, name: 'Capacity Building Pedagogy', desc: 'Deliver classroom and blended training workshops', skills: 7, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 6, name: 'Strategic Programme Management', desc: 'Allocate survey budgets and monitor milestone timelines', skills: 8, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 7, name: 'Public Communication of Data', desc: 'Present official findings to media and academic forums', skills: 6, levels: [1, 2, 3, 4, 5], status: 'Active' },
    ],
    6: [
      { id: 1, name: 'National Accounts (SNA 2008)', desc: 'Compile GDP, GVA, and supply-use balance tables', skills: 9, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 2, name: 'Price Statistics (CPI/WPI)', desc: 'Calculate headline inflation and commodity weights', skills: 8, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 3, name: 'Industrial & ASI Statistics', desc: 'Conduct Annual Survey of Industries compilations', skills: 7, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 4, name: 'Labor Force Surveys (PLFS)', desc: 'Measure worker population ratio and unemployment', skills: 8, levels: [1, 2, 3, 4, 5], status: 'Active' },
      { id: 5, name: 'Sustainable Development Goals (SDG)', desc: 'Track National Indicator Framework (NIF) metrics', skills: 7, levels: [1, 2, 3, 4, 5], status: 'Active' },
    ]
  }

  // Active domain object
  const activeDomain = domains.find((d) => d.id === selectedDomainId) || domains[0]
  const currentCompetencies = competenciesData[selectedDomainId] || []

  // Filter competencies
  const filteredCompetencies = currentCompetencies.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(compSearch.toLowerCase()) || c.desc.toLowerCase().includes(compSearch.toLowerCase())
    const matchesStatus = compStatusFilter === 'all' || c.status.toLowerCase() === compStatusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  // Pagination
  const totalItems = filteredCompetencies.length
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedCompetencies = filteredCompetencies.slice(startIndex, startIndex + rowsPerPage)

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumb ─────────────────────────────────────── */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
        <span className={styles.breadcrumbSep}>&gt;</span>
        <span className={styles.breadcrumbCurrent}>Competency Framework</span>
      </nav>

      {/* ── Page Header & Actions ──────────────────────────── */}
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>
            Competency Framework
            <Info size={16} className={styles.infoIcon} onClick={() => setActiveModal('framework-info')} />
          </h1>
          <p className={styles.pageSubtitle}>
            Explore competency domains, competencies and their skill mappings for the Official Statistics workforce.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.importBtn}
            onClick={() => setActiveModal('import')}
          >
            <Download size={14} />
            Import Framework
          </button>

          <button
            type="button"
            className={styles.addCompetencyBtn}
            onClick={() => setActiveModal('add-competency')}
          >
            <Plus size={14} />
            Add Competency
          </button>
        </div>
      </div>

      {/* ── Top 4 KPI Metric Cards ─────────────────────────── */}
      <div className={styles.topMetricsGrid}>
        {/* Card 1: Domains */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconPurple}`}>
            <GitFork size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Domains</span>
            <span className={styles.metricValue}>6</span>
            <span className={styles.metricSubtext}>Core competency domains</span>
          </div>
        </div>

        {/* Card 2: Competencies */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconGreen}`}>
            <Layers size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Competencies</span>
            <span className={styles.metricValue}>48</span>
            <span className={styles.metricSubtext}>Across all domains</span>
          </div>
        </div>

        {/* Card 3: Mapped Skills */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconOrange}`}>
            <Target size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Mapped Skills</span>
            <span className={styles.metricValue}>186</span>
            <span className={styles.metricSubtext}>Skills &amp; sub-skills</span>
          </div>
        </div>

        {/* Card 4: Linked Job Roles */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconCircle} ${styles.iconBlue}`}>
            <Users size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Linked Job Roles</span>
            <span className={styles.metricValue}>27</span>
            <span className={styles.metricSubtext}>Roles using this framework</span>
          </div>
        </div>
      </div>

      {/* ── Underline Tabs ─────────────────────────────────── */}
      <div className={styles.tabsNav}>
        {[
          'Domains',
          'Competencies',
          'Skills & Sub-skills',
          'Job Role Mapping',
          'Framework Analytics',
        ].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tabItem} ${activeTab === tab ? styles.activeTabItem : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Main Two-Column Layout ─────────────────────────── */}
      <div className={styles.mainLayout}>
        {/* Left Column */}
        <div className={styles.leftCol}>
          {/* Section 1: Competency Domains */}
          <div className={styles.domainsSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleArea}>
                <h3 className={styles.sectionTitle}>Competency Domains</h3>
                <p className={styles.sectionSubtitle}>
                  Core domains of the Official Statistics competency framework.
                </p>
              </div>

              <div className={styles.sectionControls}>
                <button
                  type="button"
                  className={styles.hierarchyBtn}
                  onClick={() => setActiveModal('hierarchy')}
                >
                  <FolderTree size={13} />
                  View Hierarchy
                </button>

                <div className={styles.searchWrap}>
                  <input
                    type="text"
                    placeholder="Search domains..."
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
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                  </select>
                  <ChevronDown size={12} className={styles.selectChevron} />
                </div>
              </div>
            </div>

            {/* 6 Domain Cards (2 Rows x 3 Cols) */}
            <div className={styles.domainsGrid}>
              {domains
                .filter((d) => d.name.toLowerCase().includes(domainSearch.toLowerCase()))
                .map((dom) => {
                  const IconComp = dom.icon
                  const isSelected = dom.id === selectedDomainId
                  return (
                    <div
                      key={dom.id}
                      className={`${styles.domainCard} ${isSelected ? styles.activeDomainCard : ''}`}
                      onClick={() => {
                        setSelectedDomainId(dom.id)
                        setCurrentPage(1)
                      }}
                    >
                      <div className={styles.domainCardTop}>
                        <div
                          className={styles.domainIconCircle}
                          style={{ background: dom.iconBg, color: dom.iconColor }}
                        >
                          <IconComp size={18} />
                        </div>
                        <div className={styles.domainMeta}>
                          <h4 className={styles.domainName}>{dom.name}</h4>
                          <span className={styles.domainCount}>{dom.count}</span>
                        </div>
                      </div>

                      <p className={styles.domainDesc}>{dom.desc}</p>

                      <div className={styles.domainCardBottom}>
                        <span className={styles.activeBadge}>{dom.status}</span>
                        <span className={styles.cardArrowBtn}>&rarr;</span>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Section 2: Competencies in [Domain Name] Table */}
          <div className={styles.competenciesSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleArea}>
                <h3 className={styles.sectionTitle}>
                  Competencies in {activeDomain.name.replace(/^\d+\.\s*/, '')}
                </h3>
                <p className={styles.sectionSubtitle}>
                  List of competencies under this domain.
                </p>
              </div>

              <div className={styles.sectionControls}>
                <div className={styles.statusSelectWrap}>
                  <select
                    value={compLevelFilter}
                    onChange={(e) => setCompLevelFilter(e.target.value)}
                    className={styles.statusSelect}
                  >
                    <option value="all">All Levels</option>
                    <option value="1">Level 1 - Beginner</option>
                    <option value="2">Level 2 - Basic</option>
                    <option value="3">Level 3 - Intermediate</option>
                    <option value="4">Level 4 - Advanced</option>
                    <option value="5">Level 5 - Expert</option>
                  </select>
                  <ChevronDown size={12} className={styles.selectChevron} />
                </div>

                <div className={styles.statusSelectWrap}>
                  <select
                    value={compStatusFilter}
                    onChange={(e) => setCompStatusFilter(e.target.value)}
                    className={styles.statusSelect}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                  <ChevronDown size={12} className={styles.selectChevron} />
                </div>

                <div className={styles.searchWrap}>
                  <input
                    type="text"
                    placeholder="Search competencies..."
                    value={compSearch}
                    onChange={(e) => {
                      setCompSearch(e.target.value)
                      setCurrentPage(1)
                    }}
                    className={styles.searchInput}
                  />
                  <Search size={13} className={styles.searchIcon} />
                </div>

                <button
                  type="button"
                  className={styles.filterActionBtn}
                  onClick={() => showToast('Applied dynamic filters')}
                >
                  <Sliders size={12} />
                  Filters
                </button>
              </div>
            </div>

            {/* Competencies Table */}
            <div className={styles.tableWrap}>
              <table className={styles.compTable}>
                <thead>
                  <tr>
                    <th style={{ width: 26 }}>#</th>
                    <th>Competency Name</th>
                    <th>Description</th>
                    <th>Proficiency Levels</th>
                    <th>Mapped Skills</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCompetencies.map((comp, idx) => (
                    <tr key={comp.id} className={styles.compRow}>
                      <td>{startIndex + idx + 1}</td>
                      <td>
                        <span className={styles.compNameStrong}>{comp.name}</span>
                      </td>
                      <td>
                        <span className={styles.compDescCell}>{comp.desc}</span>
                      </td>
                      <td>
                        <div className={styles.levelPills}>
                          <span className={`${styles.levelPill} ${styles.lvl1}`}>1</span>
                          <span className={`${styles.levelPill} ${styles.lvl2}`}>2</span>
                          <span className={`${styles.levelPill} ${styles.lvl3}`}>3</span>
                          <span className={`${styles.levelPill} ${styles.lvl4}`}>4</span>
                          <span className={`${styles.levelPill} ${styles.lvl5}`}>5</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{comp.skills}</span>
                      </td>
                      <td>
                        <span className={styles.activeBadge}>{comp.status}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.actionIconsCell} style={{ justifyContent: 'center' }}>
                          <button
                            type="button"
                            className={styles.actionIconBtn}
                            title="View Details"
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
                            title="Edit Competency"
                            onClick={() => {
                              setSelectedCompetency(comp)
                              setActiveModal('edit-comp')
                            }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className={styles.actionIconBtn}
                            title="More Options"
                            onClick={() => showToast(`Options for ${comp.name}`)}
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className={styles.paginationRow}>
              <span>
                Showing {Math.min(startIndex + 1, totalItems)} to {Math.min(startIndex + rowsPerPage, totalItems)} of {totalItems} competencies
              </span>

              <div className={styles.paginationRight}>
                <span>Rows per page:</span>
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
          </div>
        </div>

        {/* Right Column: Framework Summary, Domain Distribution, Quick Actions */}
        <div className={styles.rightCol}>
          {/* Card 1: Framework Summary */}
          <div className={styles.rightCard}>
            <h3 className={styles.rightCardTitle}>Framework Summary</h3>

            <div className={styles.summaryList}>
              <div className={styles.summaryItem}>
                <div className={styles.summaryItemLeft}>
                  <GitFork size={14} color="#6366F1" />
                  <span>Total Domains</span>
                </div>
                <span className={styles.summaryVal}>6</span>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryItemLeft}>
                  <Layers size={14} color="#10B981" />
                  <span>Total Competencies</span>
                </div>
                <span className={styles.summaryVal}>48</span>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryItemLeft}>
                  <Target size={14} color="#F97316" />
                  <span>Total Skills Mapped</span>
                </div>
                <span className={styles.summaryVal}>186</span>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryItemLeft}>
                  <Users size={14} color="#2563EB" />
                  <span>Total Job Roles</span>
                </div>
                <span className={styles.summaryVal}>27</span>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryItemLeft}>
                  <Info size={14} color="#64748B" />
                  <span>Last Updated</span>
                </div>
                <span style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>19 May 2026, 10:30 AM</span>
              </div>
            </div>

            <div className={styles.cardFooterLink}>
              <button
                type="button"
                className={styles.footerLinkBtn}
                onClick={() => navigate('/admin/competency-analytics')}
              >
                View Framework Analytics &rarr;
              </button>
            </div>
          </div>

          {/* Card 2: Domain Distribution */}
          <div className={styles.rightCard}>
            <h3 className={styles.rightCardTitle}>Domain Distribution</h3>

            <div className={styles.donutWrap}>
              <div className={styles.donutSvgArea}>
                <svg viewBox="0 0 100 100" className={styles.donutSvg}>
                  {/* Total C = 238.7 */}
                  {/* Statistical Methods (20%): 47.7 */}
                  <circle cx="50" cy="50" r="38" fill="transparent" stroke="#2563EB" strokeWidth="15" strokeDasharray="47.7 191.0" strokeDashoffset="0" />
                  {/* Data Management (17%): 40.5 */}
                  <circle cx="50" cy="50" r="38" fill="transparent" stroke="#10B981" strokeWidth="15" strokeDasharray="40.5 198.2" strokeDashoffset="-47.7" />
                  {/* Analytical & Technical (21%): 50.1 */}
                  <circle cx="50" cy="50" r="38" fill="transparent" stroke="#8B5CF6" strokeWidth="15" strokeDasharray="50.1 188.6" strokeDashoffset="-88.2" />
                  {/* Governance & Quality (13%): 31.0 */}
                  <circle cx="50" cy="50" r="38" fill="transparent" stroke="#F97316" strokeWidth="15" strokeDasharray="31.0 207.7" strokeDashoffset="-138.3" />
                  {/* Behavioral & Managerial (15%): 35.8 */}
                  <circle cx="50" cy="50" r="38" fill="transparent" stroke="#EF4444" strokeWidth="15" strokeDasharray="35.8 202.9" strokeDashoffset="-169.3" />
                  {/* Domain Knowledge (14%): 33.4 */}
                  <circle cx="50" cy="50" r="38" fill="transparent" stroke="#06B6D4" strokeWidth="15" strokeDasharray="33.4 205.3" strokeDashoffset="-205.1" />
                </svg>
              </div>

              <div className={styles.distLegend}>
                <div className={styles.distItem}>
                  <div className={styles.distLeft}>
                    <span className={styles.distSquare} style={{ background: '#2563EB' }} />
                    <span>Statistical Methods</span>
                  </div>
                  <span className={styles.distPct}>20%</span>
                </div>
                <div className={styles.distItem}>
                  <div className={styles.distLeft}>
                    <span className={styles.distSquare} style={{ background: '#10B981' }} />
                    <span>Data Management</span>
                  </div>
                  <span className={styles.distPct}>17%</span>
                </div>
                <div className={styles.distItem}>
                  <div className={styles.distLeft}>
                    <span className={styles.distSquare} style={{ background: '#8B5CF6' }} />
                    <span>Analytical &amp; Technical</span>
                  </div>
                  <span className={styles.distPct}>21%</span>
                </div>
                <div className={styles.distItem}>
                  <div className={styles.distLeft}>
                    <span className={styles.distSquare} style={{ background: '#F97316' }} />
                    <span>Governance &amp; Quality</span>
                  </div>
                  <span className={styles.distPct}>13%</span>
                </div>
                <div className={styles.distItem}>
                  <div className={styles.distLeft}>
                    <span className={styles.distSquare} style={{ background: '#EF4444' }} />
                    <span>Behavioral &amp; Managerial</span>
                  </div>
                  <span className={styles.distPct}>15%</span>
                </div>
                <div className={styles.distItem}>
                  <div className={styles.distLeft}>
                    <span className={styles.distSquare} style={{ background: '#06B6D4' }} />
                    <span>Domain Knowledge</span>
                  </div>
                  <span className={styles.distPct}>14%</span>
                </div>
              </div>
            </div>

            <div className={styles.cardFooterLink}>
              <button
                type="button"
                className={styles.footerLinkBtn}
                onClick={() => setActiveModal('full-report')}
              >
                View Full Report &rarr;
              </button>
            </div>
          </div>

          {/* Card 3: Quick Actions */}
          <div className={styles.rightCard}>
            <h3 className={styles.rightCardTitle}>Quick Actions</h3>

            <div className={styles.quickActionsList}>
              <div
                className={styles.quickActionLink}
                onClick={() => setActiveModal('add-domain')}
              >
                <span style={{ color: '#4F46E5', fontWeight: 600 }}>+ Add New Domain</span>
                <ChevronRight size={13} color="#94A3B8" />
              </div>

              <div
                className={styles.quickActionLink}
                onClick={() => setActiveModal('add-competency')}
              >
                <span style={{ color: '#4F46E5', fontWeight: 600 }}>+ Add New Competency</span>
                <ChevronRight size={13} color="#94A3B8" />
              </div>

              <div
                className={styles.quickActionLink}
                onClick={() => setActiveModal('import')}
              >
                <span>Import from Template</span>
                <ChevronRight size={13} color="#94A3B8" />
              </div>

              <div
                className={styles.quickActionLink}
                onClick={() => setActiveModal('manage-levels')}
              >
                <span>Manage Proficiency Levels</span>
                <ChevronRight size={13} color="#94A3B8" />
              </div>

              <div
                className={styles.quickActionLink}
                onClick={() => navigate('/admin/skill-taxonomy')}
              >
                <span>View Skill Taxonomy</span>
                <ChevronRight size={13} color="#94A3B8" />
              </div>

              <div
                className={styles.quickActionLink}
                onClick={() => {
                  showToast('Framework dossier downloaded as JSON & Excel!')
                }}
              >
                <span>Download Framework</span>
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
            <h4 className={styles.bannerTitle}>Build a Future-Ready Workforce</h4>
            <p className={styles.bannerDesc}>
              A well-defined competency framework helps identify skill gaps, plan learning interventions and drive performance for the Official Statistics workforce.
            </p>
          </div>
        </div>

        <button
          type="button"
          className={styles.exploreAnalyticsBtn}
          onClick={() => navigate('/admin/competency-analytics')}
        >
          Explore Analytics &rarr;
        </button>
      </div>

      {/* ── Interactive Modals ─────────────────────────────── */}
      {activeModal && (
        <div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {activeModal === 'add-competency' && 'Add New Competency'}
                {activeModal === 'import' && 'Import Competency Framework'}
                {activeModal === 'hierarchy' && 'Framework Domain Hierarchy'}
                {activeModal === 'comp-detail' && (selectedCompetency?.name || 'Competency Details')}
                {activeModal === 'edit-comp' && `Edit Competency: ${selectedCompetency?.name}`}
                {activeModal === 'add-domain' && 'Add New Competency Domain'}
                {activeModal === 'manage-levels' && '5-Point Proficiency Scale Matrix'}
                {activeModal === 'full-report' && 'Domain Distribution Breakdown'}
                {activeModal === 'framework-info' && 'National Statistical Competency Standards'}
              </h3>
              <button type="button" className={styles.closeBtn} onClick={() => setActiveModal(null)}>
                &times;
              </button>
            </div>

            {/* Modal Body: Add Competency */}
            {activeModal === 'add-competency' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Competency Domain *
                  </label>
                  <select
                    defaultValue={selectedDomainId}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
                  >
                    {domains.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Competency Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Econometric Forecasting"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Official Description *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Outline the core practical ability and methodological expectation..."
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                  <button type="button" className={styles.importBtn} onClick={() => setActiveModal(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.addCompetencyBtn}
                    onClick={() => {
                      setActiveModal(null)
                      showToast('Competency successfully added to registry!')
                    }}
                  >
                    Save Competency
                  </button>
                </div>
              </div>
            )}

            {/* Modal Body: Import Framework */}
            {activeModal === 'import' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
                  Upload a JSON, CSV, or Excel taxonomy formatted according to the MoSPI National Competency Schema.
                </p>
                <div style={{ border: '2px dashed #C7D2FE', borderRadius: 10, padding: 24, textAlign: 'center', background: '#F8FAFC' }}>
                  <Download size={24} color="#6366F1" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                    Drag &amp; drop your competency file here
                  </span>
                  <span style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginTop: 4 }}>
                    Supports .json, .csv, .xlsx up to 10MB
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className={styles.importBtn} onClick={() => setActiveModal(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.addCompetencyBtn}
                    onClick={() => {
                      setActiveModal(null)
                      showToast('Competency framework imported successfully (48 competencies synced)!')
                    }}
                  >
                    Start Import
                  </button>
                </div>
              </div>
            )}

            {/* Modal Body: View Hierarchy */}
            {activeModal === 'hierarchy' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
                {domains.map((dom) => (
                  <div key={dom.id} style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: 13, color: '#0F172A' }}>
                      <span>{dom.name}</span>
                      <span style={{ fontSize: 11.5, color: '#4F46E5' }}>{dom.count}</span>
                    </div>
                    <p style={{ fontSize: 11.5, color: '#64748B', margin: '4px 0 0' }}>{dom.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Body: Competency Detail */}
            {activeModal === 'comp-detail' && selectedCompetency && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.5, margin: 0 }}>
                  {selectedCompetency.desc}
                </p>
                <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: 6 }}>
                    Proficiency Progression (Kirkpatrick Alignment):
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5, color: '#475569' }}>
                    <div><strong>Level 1 (Beginner):</strong> Understands definitions and basic terminologies.</div>
                    <div><strong>Level 2 (Basic):</strong> Applies standard steps under supervision.</div>
                    <div><strong>Level 3 (Intermediate):</strong> Independently executes statistical workflows.</div>
                    <div><strong>Level 4 (Advanced):</strong> Troubleshoots discrepancies and customizes sampling.</div>
                    <div><strong>Level 5 (Expert):</strong> Designs ministerial methodologies and international frameworks.</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginTop: 8 }}>
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
                    Key Architecture Pillars:
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#475569', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <li>6 Core Domains spanning methodological and operational expertise</li>
                    <li>48 Granular Competency Units mapped to role-specific requirements</li>
                    <li>186 Verified Skills directly tagged in assessment and course catalogues</li>
                    <li>Unified synchronization with the iGOT Karmayogi civil services portal</li>
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
