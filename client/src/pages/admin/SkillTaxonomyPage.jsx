import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers,
  Search,
  PlusCircle,
  Download,
  BookOpen,
  Award,
  ChevronRight,
  Filter,
  CheckCircle2,
  ListTree
} from 'lucide-react'
import Badge from '../../components/ui/Badge'
import styles from './SkillTaxonomyPage.module.css'

export default function SkillTaxonomyPage() {
  const [search, setSearch] = useState('')
  const [domainFilter, setDomainFilter] = useState('ALL')
  const [cadreFilter, setCadreFilter] = useState('ALL')
  const [showModal, setShowModal] = useState(false)
  const [newSkill, setNewSkill] = useState({
    code: '',
    name: '',
    domain: 'National Accounts (SNA 2008)',
    cadre: 'Both (ISS & SSS)',
    targetLevel: 'Level 3: Competent',
    description: '',
  })

  // Authentic MoSPI Competency Dictionary
  const [skills, setSkills] = useState([
    {
      code: 'MOSPI-CMP-01',
      name: 'System of National Accounts (SNA 2008) Framework',
      domain: 'National Accounts (SNA 2008)',
      cadre: 'ISS',
      targetLevel: 'Level 4: Advanced',
      bloom: 'Analyze & Evaluate',
      indicators: 'Compiles Gross Value Added (GVA), constructs Supply-Use Tables (SUT), applies constant price deflators.',
      coursesCount: 8,
    },
    {
      code: 'MOSPI-CMP-02',
      name: 'Large-Scale Multi-Stage Probability Sampling Design',
      domain: 'Survey Sampling & Design',
      cadre: 'Both (ISS & SSS)',
      targetLevel: 'Level 4: Advanced',
      bloom: 'Apply & Formulate',
      indicators: 'Designs FSU/SSU frame allocation, calculates Horvitz-Thompson estimators, models sampling variance.',
      coursesCount: 12,
    },
    {
      code: 'MOSPI-CMP-03',
      name: 'Consumer Price Index (CPI) Formulation & Aggregation',
      domain: 'Price Statistics & Index Numbers',
      cadre: 'Both (ISS & SSS)',
      targetLevel: 'Level 3: Competent',
      bloom: 'Apply & Calculate',
      indicators: 'Collects rural/urban price quotations, manages item basket substitutions, computes Laspeyres indices.',
      coursesCount: 6,
    },
    {
      code: 'MOSPI-CMP-04',
      name: 'National Quality Assurance Framework (NQAF) Auditing',
      domain: 'Data Quality & Governance',
      cadre: 'ISS',
      targetLevel: 'Level 4: Advanced',
      bloom: 'Evaluate & Audit',
      indicators: 'Evaluates official statistics against UN-NQAF principles, audits metadata integrity and survey provenance.',
      coursesCount: 5,
    },
    {
      code: 'MOSPI-CMP-05',
      name: 'Statistical Computing & Microdata Wrangling in R/Python',
      domain: 'Computational Statistics',
      cadre: 'Both (ISS & SSS)',
      targetLevel: 'Level 3: Competent',
      bloom: 'Apply & Create',
      indicators: 'Writes reproducible scripts for survey data validation, tabular generation, and outlier scrubbing.',
      coursesCount: 9,
    },
    {
      code: 'MOSPI-CMP-06',
      name: 'Field Survey Canvassing & Digital CAPI Administration',
      domain: 'Survey Sampling & Design',
      cadre: 'SSS',
      targetLevel: 'Level 3: Competent',
      bloom: 'Execute & Verify',
      indicators: 'Conducts household field interviews using Computer-Assisted Personal Interviewing (CAPI) tablets.',
      coursesCount: 7,
    },
    {
      code: 'MOSPI-CMP-07',
      name: 'Annual Survey of Industries (ASI) Frame Reconciliation',
      domain: 'Economic Statistics & Industrial Frame',
      cadre: 'Both (ISS & SSS)',
      targetLevel: 'Level 3: Competent',
      bloom: 'Analyze & Reconcile',
      indicators: 'Reconciles factory register frames, calculates gross output, capital depreciation, and industrial inputs.',
      coursesCount: 4,
    },
  ])

  const filtered = skills.filter((s) => {
    const query = search.toLowerCase()
    const matchesSearch =
      s.name.toLowerCase().includes(query) ||
      s.code.toLowerCase().includes(query) ||
      s.domain.toLowerCase().includes(query)

    const matchesDomain = domainFilter === 'ALL' || s.domain === domainFilter
    const matchesCadre = cadreFilter === 'ALL' || s.cadre.includes(cadreFilter)

    return matchesSearch && matchesDomain && matchesCadre
  })

  const handleCreateSkill = (e) => {
    e.preventDefault()
    if (!newSkill.name.trim()) return
    const created = {
      code: newSkill.code || `MOSPI-CMP-0${skills.length + 1}`,
      name: newSkill.name,
      domain: newSkill.domain,
      cadre: newSkill.cadre,
      targetLevel: newSkill.targetLevel,
      bloom: 'Apply & Analyze',
      indicators: newSkill.description || 'Applies established statistical guidelines and protocols.',
      coursesCount: 1,
    }
    setSkills([...skills, created])
    setShowModal(false)
    setNewSkill({
      code: '',
      name: '',
      domain: 'National Accounts (SNA 2008)',
      cadre: 'Both (ISS & SSS)',
      targetLevel: 'Level 3: Competent',
      description: '',
    })
  }

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Skill Code,Competency Name,Domain,Cadre,Target Level,Bloom Level,Behavioral Indicators"].concat(
        skills.map(s => `"${s.code}","${s.name}","${s.domain}","${s.cadre}","${s.targetLevel}","${s.bloom}","${s.indicators}"`)
      ).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `MoSPI_Competency_Skill_Taxonomy.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumb Navigation */}
      <nav className={styles.breadcrumb}>
        <Link to="/dashboard">Dashboard</Link>
        <ChevronRight size={13} />
        <Link to="/admin">Admin Governance</Link>
        <ChevronRight size={13} />
        <span className={styles.breadcrumbActive}>Skill Taxonomy</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>MoSPI Statistical Competency &amp; Skill Taxonomy Dictionary</h1>
          <p className={styles.subtitle}>
            Hierarchical classification of domain, behavioral, and technical statistical competencies across Indian Statistical Service (ISS) &amp; Subordinate Statistical Service (SSS)
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" onClick={handleExportCSV} className={styles.btnSecondary}>
            <Download size={15} /> Export Taxonomy (CSV)
          </button>
          <button type="button" onClick={() => setShowModal(true)} className={styles.btnPrimary}>
            <PlusCircle size={15} /> + Add Competency Skill
          </button>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5' }}>
            <Layers size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Defined Competencies</div>
            <div className={styles.kpiValue}>{skills.length} Skills</div>
            <div className={styles.kpiHelper}>MoSPI Standards Calibrated</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <ListTree size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Competency Domains</div>
            <div className={styles.kpiValue}>5 Core Domains</div>
            <div className={styles.kpiHelper}>SNA, Sampling, CPI, NQAF, Code</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <Award size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Proficiency Ladder</div>
            <div className={styles.kpiValue}>5 Levels</div>
            <div className={styles.kpiHelper}>Level 1 Novice to Level 5 Authority</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9' }}>
            <BookOpen size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Mapped Courses</div>
            <div className={styles.kpiValue}>51 Modules</div>
            <div className={styles.kpiHelper}>NSSTA &amp; iGOT Modules</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search competencies by name, code, or domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
        >
          <option value="ALL">All Competency Domains</option>
          <option value="National Accounts (SNA 2008)">National Accounts (SNA 2008)</option>
          <option value="Survey Sampling & Design">Survey Sampling &amp; Design</option>
          <option value="Price Statistics & Index Numbers">Price Statistics &amp; CPI</option>
          <option value="Data Quality & Governance">Data Quality &amp; NQAF</option>
          <option value="Computational Statistics">Computational Statistics</option>
        </select>

        <select
          className={styles.filterSelect}
          value={cadreFilter}
          onChange={(e) => setCadreFilter(e.target.value)}
        >
          <option value="ALL">All Cadres</option>
          <option value="ISS">Indian Statistical Service (ISS)</option>
          <option value="SSS">Subordinate Statistical Service (SSS)</option>
        </select>
      </div>

      {/* Competency Table */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeaderRow}>
          <div className={styles.tableHeaderTitle}>
            Competency Dictionary Registry
          </div>
          <div className={styles.tableHeaderCount}>
            Showing {filtered.length} of {skills.length} skills
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Skill Code</th>
                <th>Competency Name &amp; Indicators</th>
                <th>Domain</th>
                <th>Target Cadre</th>
                <th>Proficiency Target</th>
                <th>Courses</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.code}>
                  <td style={{ fontWeight: 700, color: 'var(--color-primary-600)' }}>{s.code}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--color-text-secondary)', marginTop: 2, maxWidth: 420 }}>
                      {s.indicators}
                    </div>
                  </td>
                  <td>
                    <Badge variant="igot">{s.domain}</Badge>
                  </td>
                  <td>
                    <Badge variant={s.cadre.includes('ISS') ? 'nssta' : 'neutral'}>
                      {s.cadre}
                    </Badge>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, fontSize: 12.5 }}>{s.targetLevel}</span>
                  </td>
                  <td>
                    <Badge variant="neutral">{s.coursesCount} Courses</Badge>
                  </td>
                  <td>
                    <Link
                      to="/competency-framework"
                      style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary-600)', textDecoration: 'none' }}
                    >
                      View Ladder →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Skill Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: 16,
        }}>
          <div style={{
            background: 'var(--color-surface, #FFFFFF)',
            borderRadius: 16,
            maxWidth: 550,
            width: '100%',
            padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Add New Statistical Competency Skill
            </h3>
            <form onSubmit={handleCreateSkill} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  Competency Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Double Deflation in Supply and Use Tables"
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--color-border)', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                    Domain
                  </label>
                  <select
                    value={newSkill.domain}
                    onChange={(e) => setNewSkill({ ...newSkill, domain: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--color-border)' }}
                  >
                    <option value="National Accounts (SNA 2008)">National Accounts (SNA 2008)</option>
                    <option value="Survey Sampling & Design">Survey Sampling &amp; Design</option>
                    <option value="Price Statistics & Index Numbers">Price Statistics &amp; CPI</option>
                    <option value="Data Quality & Governance">Data Quality &amp; NQAF</option>
                    <option value="Computational Statistics">Computational Statistics</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                    Target Cadre
                  </label>
                  <select
                    value={newSkill.cadre}
                    onChange={(e) => setNewSkill({ ...newSkill, cadre: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--color-border)' }}
                  >
                    <option value="ISS">Indian Statistical Service (ISS)</option>
                    <option value="SSS">Subordinate Statistical Service (SSS)</option>
                    <option value="Both (ISS & SSS)">Both (ISS &amp; SSS)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  Observable Behavioral Indicators
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe observable capability demonstration..."
                  value={newSkill.description}
                  onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--color-border)', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', background: 'var(--color-primary-600)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Competency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
