import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  ChevronRight,
  Download,
  Printer,
  TrendingUp,
  Award,
  ShieldCheck,
  AlertTriangle,
  Building2,
  Calendar,
  Layers
} from 'lucide-react'
import Badge from '../../components/ui/Badge'
import styles from './WorkforceAnalyticsPage.module.css'

export default function WorkforceAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('strength')

  // Cadre deployment & strength
  const cadreTiers = [
    { grade: 'Director General / ADG (HAG/Apex)', sanctioned: 18, inPosition: 16, vacancy: 2, readiness: '94%', primaryNeed: 'International Statistical Governance (UNSC/SIAP)' },
    { grade: 'Deputy Director General (SAG)', sanctioned: 64, inPosition: 58, vacancy: 6, readiness: '90%', primaryNeed: 'National Quality Assurance Auditing (NQAF)' },
    { grade: 'Director / Joint Director (JAG)', sanctioned: 140, inPosition: 122, vacancy: 18, readiness: '86%', primaryNeed: 'National Accounts Modernization (SNA 2008 / SUT)' },
    { grade: 'Deputy Director (Senior Time Scale)', sanctioned: 210, inPosition: 188, vacancy: 22, readiness: '84%', primaryNeed: 'Multi-stage Probability Sampling & Variance' },
    { grade: 'Assistant Director (Junior Time Scale)', sanctioned: 280, inPosition: 242, vacancy: 38, readiness: '81%', primaryNeed: 'Survey Data Cleaning & Tabulation in Python/R' },
    { grade: 'Senior Statistical Officer (SSO)', sanctioned: 480, inPosition: 410, vacancy: 70, readiness: '88%', primaryNeed: 'Field Inspection & Electronic CAPI Validation' },
    { grade: 'Junior Statistical Officer (JSO)', sanctioned: 620, inPosition: 510, vacancy: 110, readiness: '82%', primaryNeed: 'NSS Schedule Canvassing & Consumer Price Inquiry' },
  ]

  // Retirement attrition projection
  const retirements = [
    { year: '2026-27', seniorLeadership: 12, midManagement: 28, juniorCadre: 44, total: 84, benchReadiness: 'High (1.4x Pipeline)' },
    { year: '2027-28', seniorLeadership: 16, midManagement: 32, juniorCadre: 52, total: 100, benchReadiness: 'Adequate (1.2x Pipeline)' },
    { year: '2028-29', seniorLeadership: 14, midManagement: 36, juniorCadre: 60, total: 110, benchReadiness: 'Moderate (1.0x Pipeline)' },
    { year: '2029-30', seniorLeadership: 20, midManagement: 40, juniorCadre: 68, total: 128, benchReadiness: 'Attention Needed (0.85x)' },
  ]

  // Division readiness scores
  const divisions = [
    { name: 'Field Operations Division (FOD)', strength: 820, readiness: 88, capiSaturation: '96%', certifiedPct: '91%' },
    { name: 'National Accounts Division (NAD)', strength: 160, readiness: 92, capiSaturation: 'N/A (Office)', certifiedPct: '95%' },
    { name: 'Economic Statistics Division (ESD)', strength: 140, readiness: 85, capiSaturation: '92%', certifiedPct: '89%' },
    { name: 'Price Statistics Division (PSD)', strength: 110, readiness: 89, capiSaturation: '94%', certifiedPct: '92%' },
    { name: 'Data Quality & Assurance Division (DQAD)', strength: 95, readiness: 86, capiSaturation: 'N/A (Quality)', certifiedPct: '87%' },
    { name: 'Survey Design & Research Division (SDRD)', strength: 125, readiness: 94, capiSaturation: '100%', certifiedPct: '96%' },
  ]

  const totalSanctioned = cadreTiers.reduce((acc, c) => acc + c.sanctioned, 0)
  const totalInPosition = cadreTiers.reduce((acc, c) => acc + c.inPosition, 0)
  const fillRate = Math.round((totalInPosition / totalSanctioned) * 100)

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Cadre Grade,Sanctioned Posts,In-Position,Vacancies,Readiness Index,Primary Training Need"].concat(
        cadreTiers.map(c => `"${c.grade}",${c.sanctioned},${c.inPosition},${c.vacancy},"${c.readiness}","${c.primaryNeed}"`)
      ).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `MoSPI_Workforce_Cadre_Capacity_Report.csv`)
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
        <span className={styles.breadcrumbActive}>Workforce Analytics</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Statistical Workforce Capacity &amp; Cadre Readiness Analytics</h1>
          <p className={styles.subtitle}>
            Macro workforce capacity planning, retirement attrition projections, cadre readiness indices, and technical skill gaps across MoSPI
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" onClick={handleExportCSV} className={styles.btnSecondary}>
            <Download size={15} /> Export Cadre Roster (CSV)
          </button>
          <button type="button" onClick={() => window.print()} className={styles.btnPrimary}>
            <Printer size={15} /> Print Workforce Report
          </button>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5' }}>
            <Users size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Sanctioned Cadre Strength</div>
            <div className={styles.kpiValue}>{totalSanctioned.toLocaleString()} Posts</div>
            <div className={styles.kpiHelper}>ISS &amp; SSS Gazette Strength</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>In-Position Officers</div>
            <div className={styles.kpiValue}>{totalInPosition.toLocaleString()} ({fillRate}%)</div>
            <div className={styles.kpiHelper}>{totalSanctioned - totalInPosition} Current Vacancies</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Overall Readiness Index</div>
            <div className={styles.kpiValue}>85.6%</div>
            <div className={styles.kpiHelper}>Meeting role competency norms</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9' }}>
            <Award size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Succession Pipeline</div>
            <div className={styles.kpiValue}>91.4%</div>
            <div className={styles.kpiHelper}>Benchmark ready for next grade</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'strength' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('strength')}
        >
          <Users size={16} /> Cadre Deployment &amp; Strength
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'attrition' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('attrition')}
        >
          <Calendar size={16} /> Retirement Attrition Projections (2026-2030)
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'divisions' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('divisions')}
        >
          <Building2 size={16} /> Division Operational Readiness
        </button>
      </div>

      {/* Panels */}
      {activeTab === 'strength' && (
        <div className={styles.panelCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
              Grade-Wise Sanctioned vs In-Position Deployment
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Source: MoSPI Cadre Administration Directorate
            </span>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cadre Rank &amp; Grade</th>
                  <th>Sanctioned</th>
                  <th>In-Position</th>
                  <th>Vacancies</th>
                  <th>Readiness Index</th>
                  <th>Priority Capacity Need</th>
                </tr>
              </thead>
              <tbody>
                {cadreTiers.map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{c.grade}</td>
                    <td>{c.sanctioned}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-success)' }}>{c.inPosition}</td>
                    <td style={{ color: c.vacancy > 20 ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
                      {c.vacancy} ({Math.round((c.vacancy / c.sanctioned) * 100)}%)
                    </td>
                    <td>
                      <Badge variant={parseInt(c.readiness) >= 85 ? 'success' : 'neutral'}>
                        {c.readiness}
                      </Badge>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                      {c.primaryNeed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'attrition' && (
        <div className={styles.panelCard}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
            Four-Year Superannuation &amp; Succession Pipeline Forecast
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fiscal Year</th>
                  <th>Senior Leadership (SAG+)</th>
                  <th>Middle Management (STS/JAG)</th>
                  <th>Junior Officers (JTS/SSS)</th>
                  <th>Total Superannuations</th>
                  <th>Bench Succession Status</th>
                </tr>
              </thead>
              <tbody>
                {retirements.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary-600)' }}>{r.year}</td>
                    <td>{r.seniorLeadership} Officers</td>
                    <td>{r.midManagement} Officers</td>
                    <td>{r.juniorCadre} Officers</td>
                    <td style={{ fontWeight: 700 }}>{r.total} Officers</td>
                    <td>
                      <Badge variant={r.benchReadiness.includes('High') ? 'success' : r.benchReadiness.includes('Adequate') ? 'igot' : 'high'}>
                        {r.benchReadiness}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'divisions' && (
        <div className={styles.panelCard}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
            MoSPI Operational Divisions Readiness &amp; Certification Saturation
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Division / Directorate</th>
                  <th>Total Officers</th>
                  <th>Readiness Index</th>
                  <th>Field CAPI Saturation</th>
                  <th>Assessment Certified (%)</th>
                </tr>
              </thead>
              <tbody>
                {divisions.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{d.name}</td>
                    <td>{d.strength}</td>
                    <td>
                      <Badge variant={d.readiness >= 90 ? 'success' : 'neutral'}>
                        {d.readiness}%
                      </Badge>
                    </td>
                    <td style={{ fontSize: 12.5 }}>{d.capiSaturation}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary-600)' }}>{d.certifiedPct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
