import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Grid,
  ChevronRight,
  Download,
  Info,
  ShieldCheck,
  CheckCircle2,
  Users,
  Award,
  BookOpen
} from 'lucide-react'
import styles from './RoleCompetencyMatrixPage.module.css'

export default function RoleCompetencyMatrixPage() {
  const [selectedCell, setSelectedCell] = useState(null)

  // 6 Official MoSPI Cadre Job Roles
  const roles = [
    { code: 'JSO', title: 'Junior Statistical Officer (JSO)', cadre: 'Subordinate Statistical Service (SSS)' },
    { code: 'SSO', title: 'Senior Statistical Officer (SSO)', cadre: 'Subordinate Statistical Service (SSS)' },
    { code: 'AD', title: 'Assistant Director (JTS)', cadre: 'Indian Statistical Service (ISS)' },
    { code: 'DD', title: 'Deputy Director (STS)', cadre: 'Indian Statistical Service (ISS)' },
    { code: 'JD', title: 'Joint Director (JAG)', cadre: 'Indian Statistical Service (ISS)' },
    { code: 'DIR', title: 'Director / DDG (SAG)', cadre: 'Indian Statistical Service (ISS)' },
  ]

  // 5 Core Competency Domains with benchmarks per role
  const matrixData = [
    {
      domain: 'System of National Accounts (SNA 2008)',
      category: 'Macroeconomic Statistics',
      benchmarks: {
        JSO: { level: 2, label: 'L2: Working', desc: 'Basic understanding of production boundaries and data inputs.' },
        SSO: { level: 3, label: 'L3: Competent', desc: 'Verifies enterprise survey microdata for input-output estimation.' },
        AD: { level: 4, label: 'L4: Advanced', desc: 'Compiles Gross Value Added (GVA) and Supply-Use Tables (SUT).' },
        DD: { level: 4, label: 'L4: Advanced', desc: 'Applies constant price deflators and oversees institutional balance sheets.' },
        JD: { level: 5, label: 'L5: Authority', desc: 'Formulates national accounts revisions and rebasing methodologies.' },
        DIR: { level: 5, label: 'L5: Authority', desc: 'Directs macroeconomic accounting policy and international compliance.' },
      }
    },
    {
      domain: 'Large-Scale Survey Sampling & Design',
      category: 'Official Survey Methodology',
      benchmarks: {
        JSO: { level: 3, label: 'L3: Competent', desc: 'Executes household selection using circular systematic sampling.' },
        SSO: { level: 3, label: 'L3: Competent', desc: 'Conducts inspection and supervision of field primary sampling units.' },
        AD: { level: 4, label: 'L4: Advanced', desc: 'Calculates Horvitz-Thompson estimators and sampling variance.' },
        DD: { level: 4, label: 'L4: Advanced', desc: 'Designs stratified multi-stage frames and allocates FSU sample sizes.' },
        JD: { level: 5, label: 'L5: Authority', desc: 'Innovates survey methodologies and non-response calibration algorithms.' },
        DIR: { level: 5, label: 'L5: Authority', desc: 'Approves National Sample Survey (NSS) round designs and schedules.' },
      }
    },
    {
      domain: 'Consumer & Wholesale Price Indices (CPI/WPI)',
      category: 'Price Statistics',
      benchmarks: {
        JSO: { level: 3, label: 'L3: Competent', desc: 'Canvasses monthly retail price schedules from selected urban/rural markets.' },
        SSO: { level: 3, label: 'L3: Competent', desc: 'Scrubs outlier price quotations and verifies shop substitutions.' },
        AD: { level: 3, label: 'L3: Competent', desc: 'Computes state and national level index aggregations using Laspeyres.' },
        DD: { level: 4, label: 'L4: Advanced', desc: 'Formulates item weight revisions and chain-linking methodologies.' },
        JD: { level: 5, label: 'L5: Authority', desc: 'Directs headline inflation index analytics and Monetary Policy inputs.' },
        DIR: { level: 5, label: 'L5: Authority', desc: 'MoSPI technical authority on national price index governance.' },
      }
    },
    {
      domain: 'National Quality Assurance Framework (NQAF)',
      category: 'Data Governance & Standards',
      benchmarks: {
        JSO: { level: 2, label: 'L2: Working', desc: 'Complies with standard metadata entry and data validation guidelines.' },
        SSO: { level: 3, label: 'L3: Competent', desc: 'Audits field schedules for completeness, consistency, and fidelity.' },
        AD: { level: 3, label: 'L3: Competent', desc: 'Performs statistical data quality checks prior to preliminary release.' },
        DD: { level: 4, label: 'L4: Advanced', desc: 'Conducts formal NQAF audits on survey microdata and dissemination.' },
        JD: { level: 5, label: 'L5: Authority', desc: 'Aligns national statistical processes with UN-NQAF guidelines.' },
        DIR: { level: 5, label: 'L5: Authority', desc: 'Chief statistical quality ombudsman for central statistical releases.' },
      }
    },
    {
      domain: 'Computational Analytics (Python/R/CAPI)',
      category: 'Statistical Computing',
      benchmarks: {
        JSO: { level: 3, label: 'L3: Competent', desc: 'Operates Computer Assisted Personal Interviewing (CAPI) tablets and apps.' },
        SSO: { level: 3, label: 'L3: Competent', desc: 'Performs electronic transmission, sync, and first-level validation scripts.' },
        AD: { level: 4, label: 'L4: Advanced', desc: 'Writes Python/R data cleaning pipelines, tabulation routines, and visual models.' },
        DD: { level: 4, label: 'L4: Advanced', desc: 'Builds reproducible analytical pipelines and database queries.' },
        JD: { level: 4, label: 'L4: Advanced', desc: 'Oversees IT and cloud data processing infrastructure modernization.' },
        DIR: { level: 3, label: 'L3: Competent', desc: 'Strategic executive oversight of national statistical IT systems.' },
      }
    },
  ]

  const getBadgeClass = (level) => {
    switch (level) {
      case 1: return `${styles.levelBadge} ${styles.level1}`
      case 2: return `${styles.levelBadge} ${styles.level2}`
      case 3: return `${styles.levelBadge} ${styles.level3}`
      case 4: return `${styles.levelBadge} ${styles.level4}`
      case 5: return `${styles.levelBadge} ${styles.level5}`
      default: return styles.levelBadge
    }
  }

  const handleExportCSV = () => {
    const header = ['Competency Domain', ...roles.map(r => r.code)].join(',')
    const rows = matrixData.map(d => {
      return [`"${d.domain}"`, ...roles.map(r => `"${d.benchmarks[r.code].label}"`)].join(',')
    })
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "MoSPI_Role_Competency_Matrix.csv")
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
        <span className={styles.breadcrumbActive}>Role-Competency Matrix</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Cadre Role-Competency Mapping Matrix</h1>
          <p className={styles.subtitle}>
            Institutional mapping of required minimum proficiency benchmarks (Level 1 to Level 5) across MoSPI Cadre Job Roles and core statistical competency domains
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" onClick={handleExportCSV} className={styles.btnSecondary}>
            <Download size={15} /> Export Matrix (CSV)
          </button>
          <Link to="/admin/skill-taxonomy" className={styles.btnPrimary}>
            <BookOpen size={15} /> Skill Taxonomy
          </Link>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5' }}>
            <Users size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Mapped Cadre Roles</div>
            <div className={styles.kpiValue}>6 Designations</div>
            <div className={styles.kpiHelper}>JSO through Director/DDG</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <Grid size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Competency Pillars</div>
            <div className={styles.kpiValue}>5 Disciplines</div>
            <div className={styles.kpiHelper}>SNA, Sampling, CPI, NQAF, Code</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <Award size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Calibrated Norms</div>
            <div className={styles.kpiValue}>30 Cells</div>
            <div className={styles.kpiHelper}>Vetted by Training Advisory Committee</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Governance Status</div>
            <div className={styles.kpiValue}>100% Active</div>
            <div className={styles.kpiHelper}>Official MoSPI Gazette Norms</div>
          </div>
        </div>
      </div>

      {/* Matrix Table Container */}
      <div className={styles.matrixContainer}>
        <div className={styles.tableHeaderRow}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>
              Cadre Proficiency Matrix Table
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 10 }}>
              (Click any cell to inspect behavioral rubric description)
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: 11.5 }}>
            <span className={`${styles.levelBadge} ${styles.level1}`}>L1: Novice</span>
            <span className={`${styles.levelBadge} ${styles.level2}`}>L2: Working</span>
            <span className={`${styles.levelBadge} ${styles.level3}`}>L3: Competent</span>
            <span className={`${styles.levelBadge} ${styles.level4}`}>L4: Advanced</span>
            <span className={`${styles.levelBadge} ${styles.level5}`}>L5: Authority</span>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.matrixTable}>
            <thead>
              <tr>
                <th>Competency Domain</th>
                {roles.map((r) => (
                  <th key={r.code}>
                    <div>{r.code}</div>
                    <div style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'none' }}>
                      {r.title.split('(')[0]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixData.map((row, idx) => (
                <tr key={idx}>
                  <td>
                    <div>{row.domain}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 400 }}>
                      {row.category}
                    </div>
                  </td>
                  {roles.map((r) => {
                    const cell = row.benchmarks[r.code]
                    return (
                      <td key={r.code}>
                        <span
                          className={getBadgeClass(cell.level)}
                          onClick={() => setSelectedCell({ role: r, domain: row.domain, ...cell })}
                          title="Click to view detailed requirement"
                        >
                          {cell.label}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cell Detail Modal */}
      {selectedCell && (
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
            maxWidth: 500,
            width: '100%',
            padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                  Target Role Requirement
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: 17, color: 'var(--color-text-primary)' }}>
                  {selectedCell.role.title}
                </h3>
              </div>
              <span className={getBadgeClass(selectedCell.level)}>
                {selectedCell.label}
              </span>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                Competency Domain:
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 2 }}>
                {selectedCell.domain}
              </div>
            </div>

            <div style={{ background: 'var(--color-surface-alt)', padding: 14, borderRadius: 10, border: '1px solid var(--color-border)', marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>
                Observable Behavioral Demonstration
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                {selectedCell.desc}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                style={{ padding: '8px 20px', background: 'var(--color-primary-600)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
