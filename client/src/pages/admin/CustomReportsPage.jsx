import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  ChevronRight,
  Download,
  PlusCircle,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Printer
} from 'lucide-react'
import Badge from '../../components/ui/Badge'
import styles from './CustomReportsPage.module.css'

export default function CustomReportsPage() {
  const [activeTab, setActiveTab] = useState('templates')
  const [dataSource, setDataSource] = useState('roster')
  const [exportFormat, setExportFormat] = useState('CSV')

  // Saved templates
  const templates = [
    {
      id: 'rep-01',
      title: 'Quarterly Cadre Competency Gap & Benchmark Compliance Report',
      category: 'Competency Analysis',
      dataset: 'Officer Roster + Competency Matrix',
      frequency: 'Quarterly',
      lastRun: '01 Sep 2026',
      recipients: 'Secretary MoSPI, DG (Stats)',
      status: 'Scheduled Active',
    },
    {
      id: 'rep-02',
      title: 'NSSTA Residential Campus Training Effectiveness & Pass Rate Digest',
      category: 'Training Logistics',
      dataset: 'Course Enrollments + Quiz Attempts',
      frequency: 'Monthly',
      lastRun: '28 Aug 2026',
      recipients: 'ADG (NSSTA), Training Division',
      status: 'Scheduled Active',
    },
    {
      id: 'rep-03',
      title: 'MoSPI Field Operations Division (FOD) CAPI Certification Saturation',
      category: 'Operational Readiness',
      dataset: 'FOD SSS Officer Directory',
      frequency: 'Bi-Weekly',
      lastRun: '02 Sep 2026',
      recipients: 'ADG (FOD), Zonal DDGs',
      status: 'Scheduled Active',
    },
    {
      id: 'rep-04',
      title: 'Psychometric Item Discrimination & Defective Distractor Flagging Log',
      category: 'Quality Governance',
      dataset: 'Item Bank + Quiz Response Analytics',
      frequency: 'On-Demand',
      lastRun: '15 Aug 2026',
      recipients: 'Examination Board, Item Authors',
      status: 'Manual Trigger',
    },
  ]

  const handleRunQuery = () => {
    alert(`Query executed on dataset '${dataSource}'! Generating and downloading ${exportFormat} export...`)
    const dummyData = "data:text/csv;charset=utf-8," + "Report_ID,Title,Generated_At,Dataset,Format\n"
      + `REP-GEN-${Date.now()},Custom Parameterized Report,${new Date().toISOString()},${dataSource},${exportFormat}\n`
    const encodedUri = encodeURI(dummyData)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `MoSPI_Custom_Report_${dataSource}.${exportFormat.toLowerCase()}`)
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
        <span className={styles.breadcrumbActive}>Custom Reports</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Executive Custom Reports &amp; Data Export Studio</h1>
          <p className={styles.subtitle}>
            Design, filter, and schedule custom parametric reports across officer training progress, competency matrices, departmental analytics, and evaluation scores
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" onClick={() => window.print()} className={styles.btnSecondary}>
            <Printer size={15} /> Print Report
          </button>
          <Link to="/admin/reports" className={styles.btnPrimary}>
            <FileText size={15} /> Standard Reports
          </Link>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5' }}>
            <FileText size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Saved Templates</div>
            <div className={styles.kpiValue}>24 Templates</div>
            <div className={styles.kpiHelper}>Vetted by Cadre Admin</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <Clock size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Automated Dispatches</div>
            <div className={styles.kpiValue}>4 Schedules</div>
            <div className={styles.kpiHelper}>Weekly/Monthly Cron Jobs</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <Download size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Export Formats</div>
            <div className={styles.kpiValue}>4 Standard Types</div>
            <div className={styles.kpiHelper}>CSV, XLSX, PDF, JSON</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9' }}>
            <Layers size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Indexed Data Points</div>
            <div className={styles.kpiValue}>1,420 Officers</div>
            <div className={styles.kpiHelper}>Real-time MongoDB sync</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'templates' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <FileText size={16} /> Saved Executive Report Templates
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'builder' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('builder')}
        >
          <Sparkles size={16} /> Interactive Query Builder
        </button>
      </div>

      {/* Panels */}
      {activeTab === 'templates' && (
        <div className={styles.panelCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
              Institutional Scheduled Report Templates
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Configured for automated ministry distribution
            </span>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Template Name</th>
                  <th>Domain Category</th>
                  <th>Dataset Sources</th>
                  <th>Schedule</th>
                  <th>Last Generated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {t.title}
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Recipients: {t.recipients}</div>
                    </td>
                    <td>
                      <Badge variant="igot">{t.category}</Badge>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>{t.dataset}</td>
                    <td>
                      <Badge variant="neutral">{t.frequency}</Badge>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{t.lastRun}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => alert(`Running & downloading report: ${t.title}`)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-primary-600)', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Download size={13} /> Run Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'builder' && (
        <div className={styles.panelCard}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
            Parametric Query Builder
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                Primary Data Source
              </label>
              <select
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value)}
                style={{ width: '100%', height: 40, borderRadius: 8, border: '1.5px solid var(--color-border)', padding: '0 10px', fontSize: 13 }}
              >
                <option value="roster">MoSPI Officer Cadre Directory (ISS/SSS)</option>
                <option value="assessments">Quiz &amp; Examination Submission Logs</option>
                <option value="competencies">Cadre Competency Gap &amp; Readiness Matrix</option>
                <option value="courses">NSSTA &amp; iGOT Course Enrollment Records</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                Target Cadre Scope
              </label>
              <select style={{ width: '100%', height: 40, borderRadius: 8, border: '1.5px solid var(--color-border)', padding: '0 10px', fontSize: 13 }}>
                <option>All Cadres (ISS &amp; SSS)</option>
                <option>Indian Statistical Service (ISS Only)</option>
                <option>Subordinate Statistical Service (SSS Only)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                Export File Format
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                style={{ width: '100%', height: 40, borderRadius: 8, border: '1.5px solid var(--color-border)', padding: '0 10px', fontSize: 13 }}
              >
                <option value="CSV">Comma-Separated Values (CSV)</option>
                <option value="XLSX">Microsoft Excel (.xlsx)</option>
                <option value="JSON">Structured JSON</option>
                <option value="PDF">Executive Printable PDF</option>
              </select>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
              Included Report Columns (Select Fields):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, fontSize: 12.5 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" defaultChecked /> Employee ID &amp; Name
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" defaultChecked /> Designation &amp; Cadre Grade
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" defaultChecked /> Affiliated Division / Directorate
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" defaultChecked /> Evaluation Score (%)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" defaultChecked /> Target Competency Level vs Current
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" defaultChecked /> NSSTA Attendance Certification
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
            <button
              type="button"
              onClick={handleRunQuery}
              className={styles.btnPrimary}
            >
              <Download size={15} /> Execute Query &amp; Download {exportFormat}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
