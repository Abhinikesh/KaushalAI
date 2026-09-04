import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Briefcase,
  Search,
  ChevronRight,
  ShieldCheck,
  Award,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import { getJobRoles } from '../../api/competency.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import styles from './JobRoleManagementPage.module.css'

export default function JobRoleManagementPage() {
  const [search, setSearch] = useState('')
  const [cadreFilter, setCadreFilter] = useState('ALL')

  const { data, isLoading } = useQuery({
    queryKey: ['adminJobRoles'],
    queryFn: getJobRoles,
  })

  const rawJobRoles = data?.jobRoles || data || []

  // Domain-authentic MoSPI Cadre Job Role hierarchy
  const defaultRoles = [
    {
      _id: 'jr-1',
      code: 'MOSPI-SSS-JSO',
      title: 'Junior Statistical Officer (JSO)',
      cadre: 'SSS',
      department: 'Subordinate Statistical Service (Group B Non-Gazetted)',
      description: 'Primary statistical field investigation, household & enterprise scheduling, CAPI tablet data collection, and basic tabulation in FOD/NAD.',
      requiredCompetencies: ['CAPI Field Automation', 'Primary Sampling Techniques', 'Official Concept Verification', 'Statistical Schedules']
    },
    {
      _id: 'jr-2',
      code: 'MOSPI-SSS-SSO',
      title: 'Senior Statistical Officer (SSO)',
      cadre: 'SSS',
      department: 'Subordinate Statistical Service (Group B Gazetted)',
      description: 'Supervisory field inspection, primary data consistency scrutiny, village/urban block frame validation, and assistant survey reporting.',
      requiredCompetencies: ['Supervisory Audit Protocols', 'Quality Assurance & Non-Sampling Error', 'Survey Scrutiny Rules', 'Data Dissemination']
    },
    {
      _id: 'jr-3',
      code: 'MOSPI-ISS-AD',
      title: 'Assistant Director (AD)',
      cadre: 'ISS',
      department: 'Indian Statistical Service (Junior Time Scale, Group A)',
      description: 'Design of sample surveys, National Accounts sequence compilation, index numbers validation, and research note drafting.',
      requiredCompetencies: ['SNA 2008 Sequence of Accounts', 'Multi-Stage Sampling Design', 'Index Number Theory', 'Econometric Modeling']
    },
    {
      _id: 'jr-4',
      code: 'MOSPI-ISS-DD',
      title: 'Deputy Director (DD)',
      cadre: 'ISS',
      department: 'Indian Statistical Service (Senior Time Scale, Group A)',
      description: 'Division-level survey operations supervision, technical committee liaison, statistical publication authoring, and state DES coordination.',
      requiredCompetencies: ['Supply-Use Framework (SUT)', 'National Quality Assurance (UN-NQAF)', 'Survey Methodology Leadership', 'Inter-Agency Coordination']
    },
    {
      _id: 'jr-5',
      code: 'MOSPI-ISS-JD',
      title: 'Joint Director (JD)',
      cadre: 'ISS',
      department: 'Indian Statistical Service (Junior Administrative Grade)',
      description: 'Head of survey sections, macroeconomic indicator revision, international reporting (UNSD/IMF/WB), and methodology clearance.',
      requiredCompetencies: ['Macroeconomic Statistics Strategy', 'Base Year Revision Leadership', 'SDDS / Data Dissemination Standards', 'Policy Advisory']
    },
    {
      _id: 'jr-6',
      code: 'MOSPI-ISS-DIR',
      title: 'Director / Deputy Director General (DDG)',
      cadre: 'ISS',
      department: 'Indian Statistical Service (Senior Administrative Grade)',
      description: 'Executive divisional leadership, national statistics governance, steering National Statistical Commission (NSC) working groups.',
      requiredCompetencies: ['National Statistical Governance', 'Statistical Legislation & Policy', 'Institutional Capacity Building', 'Executive Decision Making']
    }
  ]

  const jobRoles = rawJobRoles.length > 0 ? rawJobRoles : defaultRoles

  const filtered = jobRoles.filter((r) => {
    const query = search.toLowerCase()
    const title = (r.title || '').toLowerCase()
    const code = (r.code || '').toLowerCase()
    const desc = (r.description || '').toLowerCase()

    const matchesSearch = title.includes(query) || code.includes(query) || desc.includes(query)
    const matchesCadre = cadreFilter === 'ALL' || (r.cadre || (r.code?.includes('ISS') ? 'ISS' : 'SSS')) === cadreFilter

    return matchesSearch && matchesCadre
  })

  const sssCount = jobRoles.filter(r => (r.cadre === 'SSS' || r.code?.includes('SSS'))).length
  const issCount = jobRoles.filter(r => (r.cadre === 'ISS' || r.code?.includes('ISS'))).length
  const totalStandards = jobRoles.reduce((acc, r) => acc + (r.requiredCompetencies?.length || 4), 0)

  return (
    <div className={styles.container}>
      {/* Breadcrumb Navigation */}
      <nav className={styles.breadcrumb}>
        <Link to="/dashboard">Dashboard</Link>
        <ChevronRight size={13} />
        <Link to="/admin">Admin Governance</Link>
        <ChevronRight size={13} />
        <span className={styles.breadcrumbActive}>Cadre Job Role Specifications</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Cadre Job Role Management</h1>
          <p className={styles.subtitle}>
            Official job role specifications, competency bands, and operational mandates across Subordinate Statistical Service (SSS) and Indian Statistical Service (ISS)
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link to="/admin/role-competency-matrix" className={styles.btnPrimary}>
            <Layers size={15} /> View Role–Competency Matrix →
          </Link>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5' }}>
            <Briefcase size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Defined Roles</div>
            <div className={styles.kpiValue}>{jobRoles.length} Ranks</div>
            <div className={styles.kpiHelper}>Gazetted &amp; Non-Gazetted</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>SSS Cadre Posts</div>
            <div className={styles.kpiValue}>{sssCount} Grades</div>
            <div className={styles.kpiHelper}>Field Operations &amp; Primary Scrutiny</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <Award size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>ISS Cadre Posts</div>
            <div className={styles.kpiValue}>{issCount} Grades</div>
            <div className={styles.kpiHelper}>Research, Design &amp; Direction</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Competency Bands</div>
            <div className={styles.kpiValue}>{totalStandards} Mappings</div>
            <div className={styles.kpiHelper}>Linked to Assessment Thresholds</div>
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
            placeholder="Search roles by title, cadre code, or operational mandate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={cadreFilter}
          onChange={(e) => setCadreFilter(e.target.value)}
        >
          <option value="ALL">All Cadres ({jobRoles.length})</option>
          <option value="SSS">Subordinate Statistical Service (SSS)</option>
          <option value="ISS">Indian Statistical Service (ISS)</option>
        </select>
      </div>

      {/* Roles Grid */}
      {isLoading ? (
        <div className={styles.roleGrid}>
          <Skeleton height="180px" />
          <Skeleton height="180px" />
          <Skeleton height="180px" />
        </div>
      ) : (
        <div className={styles.roleGrid}>
          {filtered.map((r) => (
            <div key={r._id} className={styles.roleCard}>
              <div className={styles.roleCardHeader}>
                <Badge variant={r.code?.includes('ISS') ? 'nssta' : 'igot'}>
                  {r.code?.includes('ISS') ? 'ISS CADRE' : 'SSS CADRE'}
                </Badge>
                <span className={styles.roleCode}>{r.code || 'MOSPI-ROLE'}</span>
              </div>

              <div>
                <h3 className={styles.roleTitle}>{r.title}</h3>
                <div style={{ fontSize: 11.5, color: 'var(--color-primary-600)', fontWeight: 600, marginTop: 3 }}>
                  {r.department || 'MoSPI Statistical Cadre'}
                </div>
                <p className={styles.roleDesc} style={{ marginTop: 8 }}>
                  {r.description || 'Core cadre position executing statistical surveys, national accounts, or price index compilation.'}
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {(r.requiredCompetencies || []).map((comp, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: 11,
                      background: 'var(--color-surface-alt)',
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    • {comp}
                  </span>
                ))}
              </div>

              <div className={styles.roleFooter}>
                <span>
                  Mandate: <strong>{(r.requiredCompetencies || []).length} Competency Standards</strong>
                </span>
                <Link
                  to="/admin/role-competency-matrix"
                  style={{ color: 'var(--color-primary-600)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  Inspect Matrix <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
