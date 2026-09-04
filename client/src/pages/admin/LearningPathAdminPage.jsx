import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Compass,
  ChevronRight,
  PlusCircle,
  Download,
  BookOpen,
  Users,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react'
import Badge from '../../components/ui/Badge'
import styles from './LearningPathAdminPage.module.css'

export default function LearningPathAdminPage() {
  const [activeTab, setActiveTab] = useState('paths')

  // Authentic MoSPI Learning Roadmaps
  const learningRoadmaps = [
    {
      id: 'lp-01',
      title: 'ISS Probationary Officer Foundation & Field Indoctrination',
      role: 'Assistant Director (Junior Time Scale)',
      cadre: 'ISS',
      stages: 4,
      duration: '52 Weeks (Modular)',
      enrolled: 48,
      completionRate: 85,
      status: 'Mandatory Induction',
    },
    {
      id: 'lp-02',
      title: 'National Accounts Statistics & Macroeconomic Aggregates Specialist',
      role: 'Deputy Director (Senior Time Scale)',
      cadre: 'ISS',
      stages: 3,
      duration: '18 Weeks',
      enrolled: 34,
      completionRate: 72,
      status: 'Active Pathway',
    },
    {
      id: 'lp-03',
      title: 'Advanced Survey Sampling & NSS Round Design Specialist',
      role: 'Joint Director / Deputy Director',
      cadre: 'ISS',
      stages: 4,
      duration: '24 Weeks',
      enrolled: 42,
      completionRate: 68,
      status: 'Active Pathway',
    },
    {
      id: 'lp-04',
      title: 'Price Statistics, CPI Compilation & Headline Inflation Analysis',
      role: 'Statistical Officer / Assistant Director',
      cadre: 'Both (ISS & SSS)',
      stages: 3,
      duration: '12 Weeks',
      enrolled: 56,
      completionRate: 78,
      status: 'Active Pathway',
    },
    {
      id: 'lp-05',
      title: 'Field Operations & Electronic CAPI Survey Administration',
      role: 'Junior / Senior Statistical Officer',
      cadre: 'SSS',
      stages: 3,
      duration: '8 Weeks',
      enrolled: 184,
      completionRate: 91,
      status: 'Active Pathway',
    },
    {
      id: 'lp-06',
      title: 'National Quality Assurance Framework (NQAF) Executive Auditor',
      role: 'Director / Joint Director',
      cadre: 'ISS',
      stages: 2,
      duration: '6 Weeks',
      enrolled: 26,
      completionRate: 80,
      status: 'Active Pathway',
    },
  ]

  // Sequence stages for Stage Inspector
  const inspectStages = [
    {
      num: 1,
      title: 'Foundational Concepts & Institutional Mandate',
      courses: ['MoSPI Official Statistics Framework', 'Code of Statistical Ethics'],
      duration: '4 Weeks',
      assessment: 'Diagnostic Pre-test (Pass Mark: 70%)',
    },
    {
      num: 2,
      title: 'Core Methodological Competencies & Laboratory Practice',
      courses: ['System of National Accounts 2008', 'Supply-Use Tables Laboratory'],
      duration: '8 Weeks',
      assessment: 'Mid-term Empirical Problem Solving (Pass Mark: 75%)',
    },
    {
      num: 3,
      title: 'Advanced Domain Application & Industry Deflator Modeling',
      courses: ['Double Deflation Algorithms in R', 'Price Index Deflators'],
      duration: '6 Weeks',
      assessment: 'Peer Reviewed Capstone Synthesis',
    },
    {
      num: 4,
      title: 'National Accreditation & Qualifying Evaluation',
      courses: ['NSSTA Residential Capstone Clinic', 'Comprehensive Viva Voce'],
      duration: '2 Weeks',
      assessment: 'Final Qualifying Evaluation (Certificate of Mastery)',
    },
  ]

  const totalEnrolled = learningRoadmaps.reduce((acc, r) => acc + r.enrolled, 0)
  const avgCompletion = Math.round(learningRoadmaps.reduce((acc, r) => acc + r.completionRate, 0) / learningRoadmaps.length)

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Roadmap Title,Target Role,Cadre,Stages,Duration,Enrolled Officers,Completion Rate (%),Status"].concat(
        learningRoadmaps.map(r => `"${r.title}","${r.role}","${r.cadre}",${r.stages},"${r.duration}",${r.enrolled},${r.completionRate},"${r.status}"`)
      ).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `MoSPI_Learning_Roadmaps_Directory.csv`)
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
        <span className={styles.breadcrumbActive}>Learning Path Management</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Cadre Learning Roadmap &amp; Curriculum Path Administration</h1>
          <p className={styles.subtitle}>
            Configure structured multi-stage learning roadmaps, mandatory pre-requisites, milestone assessments, and iGOT/NSSTA course sequences for MoSPI job roles
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" onClick={handleExportCSV} className={styles.btnSecondary}>
            <Download size={15} /> Export Roadmaps (CSV)
          </button>
          <Link to="/my-learning" className={styles.btnPrimary}>
            <Compass size={15} /> View Learner Roadmap
          </Link>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5' }}>
            <Compass size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Published Roadmaps</div>
            <div className={styles.kpiValue}>{learningRoadmaps.length} Roadmaps</div>
            <div className={styles.kpiHelper}>Calibrated for ISS &amp; SSS</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <Users size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Enrolled Officers</div>
            <div className={styles.kpiValue}>{totalEnrolled} Learners</div>
            <div className={styles.kpiHelper}>Across 6 National Paths</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <Clock size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Mean Completion Rate</div>
            <div className={styles.kpiValue}>{avgCompletion}%</div>
            <div className={styles.kpiHelper}>Progressing on schedule</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9' }}>
            <BookOpen size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Curated Course Modules</div>
            <div className={styles.kpiValue}>36 Modules</div>
            <div className={styles.kpiHelper}>Linked iGOT &amp; NSSTA Units</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'paths' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('paths')}
        >
          <Compass size={16} /> Published Cadre Roadmaps ({learningRoadmaps.length})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'stages' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('stages')}
        >
          <Layers size={16} /> Exemplary Stage Sequence Architecture
        </button>
      </div>

      {/* Panels */}
      {activeTab === 'paths' && (
        <div className={styles.panelCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
              Cadre Role Structured Learning Roadmaps
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Governed under National Training Policy &amp; Mission Karmayogi
            </span>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Roadmap Title</th>
                  <th>Target Role</th>
                  <th>Cadre</th>
                  <th>Stages</th>
                  <th>Duration</th>
                  <th>Enrolled</th>
                  <th>Completion</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {learningRoadmaps.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {r.title}
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>ID: {r.id}</div>
                    </td>
                    <td>{r.role}</td>
                    <td>
                      <Badge variant={r.cadre === 'ISS' ? 'nssta' : r.cadre === 'SSS' ? 'neutral' : 'igot'}>
                        {r.cadre}
                      </Badge>
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.stages} Stages</td>
                    <td style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>{r.duration}</td>
                    <td style={{ fontWeight: 600 }}>{r.enrolled} Officers</td>
                    <td>
                      <span style={{ fontWeight: 700, color: r.completionRate >= 80 ? 'var(--color-success)' : 'var(--color-primary-600)' }}>
                        {r.completionRate}%
                      </span>
                    </td>
                    <td>
                      <Link
                        to="/my-learning"
                        style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary-600)', textDecoration: 'none' }}
                      >
                        Inspect →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'stages' && (
        <div className={styles.panelCard}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
            Curriculum Architectural Template: National Accounts Specialist Roadmap
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {inspectStages.map((s) => (
              <div key={s.num} style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--color-primary-600)', color: 'white', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {s.num}
                    </span>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      Stage {s.num}: {s.title}
                    </h4>
                  </div>
                  <Badge variant="igot">{s.duration}</Badge>
                </div>

                <div style={{ marginLeft: 36, marginTop: 8 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                    <strong>Curated Courses:</strong> {s.courses.join(' • ')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>
                    ✓ Milestone Requirement: {s.assessment}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
