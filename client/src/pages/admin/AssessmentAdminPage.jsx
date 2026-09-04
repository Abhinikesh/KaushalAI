import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileCheck2,
  ChevronRight,
  ShieldAlert,
  Award,
  Users,
  CheckCircle2,
  Lock,
  Download,
  Sliders,
  Settings
} from 'lucide-react'
import Badge from '../../components/ui/Badge'
import styles from './AssessmentAdminPage.module.css'

export default function AssessmentAdminPage() {
  const [activeTab, setActiveTab] = useState('oversight')

  // Governance assessment configurations
  const examPolicies = [
    {
      title: 'National Accounts Statistics & SNA 2008 Certification Exam',
      items: 25,
      passMark: 70,
      retakePolicy: 'Max 2 Retakes (7-day cooling interval)',
      proctoring: 'Strict (Randomized pool, tab-switch locked)',
      attempts: 84,
      passRate: '88.1%',
      status: 'Active Accreditation',
    },
    {
      title: 'Official Survey Sampling & Multi-stage Selection Exam',
      items: 30,
      passMark: 70,
      retakePolicy: 'Max 3 Retakes',
      proctoring: 'Strict (Randomized distractor orders)',
      attempts: 112,
      passRate: '84.8%',
      status: 'Active Accreditation',
    },
    {
      title: 'Consumer Price Index (CPI) Compilation Qualifying Test',
      items: 20,
      passMark: 70,
      retakePolicy: 'Unlimited during trial period',
      proctoring: 'Standard Monitoring',
      attempts: 65,
      passRate: '81.5%',
      status: 'Active Accreditation',
    },
    {
      title: 'National Quality Assurance Framework (NQAF) Lead Auditor Evaluation',
      items: 25,
      passMark: 75,
      retakePolicy: 'Single attempt with faculty review',
      proctoring: 'Strict (Executive supervised)',
      attempts: 32,
      passRate: '90.6%',
      status: 'Active Accreditation',
    },
  ]

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Examination Title,Question Pool,Passing Benchmark,Retake Policy,Proctoring Mode,Attempts,Pass Rate"].concat(
        examPolicies.map(e => `"${e.title}",${e.items},${e.passMark},"${e.retakePolicy}","${e.proctoring}",${e.attempts},"${e.passRate}"`)
      ).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `MoSPI_Assessment_Governance_Audit.csv`)
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
        <span className={styles.breadcrumbActive}>Assessment Administration</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Examination Administration &amp; Assessment Governance</h1>
          <p className={styles.subtitle}>
            Central oversight of competency evaluations, passing standards, anti-plagiarism proctoring rules, and assessment certification across MoSPI
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" onClick={handleExportCSV} className={styles.btnSecondary}>
            <Download size={15} /> Export Audit (CSV)
          </button>
          <Link to="/trainer/assessments" className={styles.btnPrimary}>
            <FileCheck2 size={15} /> View Active Evaluations
          </Link>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5' }}>
            <FileCheck2 size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Governed Evaluations</div>
            <div className={styles.kpiValue}>18 Registries</div>
            <div className={styles.kpiHelper}>Official MoSPI Curricula</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <Award size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Certified Officers</div>
            <div className={styles.kpiValue}>384 Officers</div>
            <div className={styles.kpiHelper}>Meeting &ge; 70% Cut-off</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <ShieldAlert size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Integrity Verification</div>
            <div className={styles.kpiValue}>99.4%</div>
            <div className={styles.kpiHelper}>Zero proctoring violations</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9' }}>
            <Sliders size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Standard Cut-Off</div>
            <div className={styles.kpiValue}>70% Score</div>
            <div className={styles.kpiHelper}>Uniform National Benchmark</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'oversight' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('oversight')}
        >
          <FileCheck2 size={16} /> Central Assessment Oversight
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'security' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <Lock size={16} /> Anti-Cheat &amp; Integrity Policies
        </button>
      </div>

      {/* Panels */}
      {activeTab === 'oversight' && (
        <div className={styles.panelCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
              Governed National Statistical Examination Catalog
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Accredited under NSSTA Examination Ordinance 2026
            </span>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Examination Title</th>
                  <th>Pool Size</th>
                  <th>Passing Cut-off</th>
                  <th>Retake Policy</th>
                  <th>Proctoring Protocol</th>
                  <th>Attempts</th>
                  <th>Pass Rate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {examPolicies.map((e, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{e.title}</td>
                    <td>{e.items} Items</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary-600)' }}>{e.passMark}%</td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{e.retakePolicy}</td>
                    <td>
                      <Badge variant="nssta">{e.proctoring}</Badge>
                    </td>
                    <td style={{ fontWeight: 600 }}>{e.attempts}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>{e.passRate}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={13} /> Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className={styles.panelCard}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
            Automated Exam Security &amp; Assessment Proctoring Controls
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Lock size={16} color="var(--color-primary-600)" />
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Question &amp; Distractor Randomization
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Questions are dynamically sampled from certified item banks and options A through D are randomized per candidate to prevent answer key sharing.
              </p>
              <div style={{ marginTop: 12 }}>
                <Badge variant="success">Enabled System-Wide</Badge>
              </div>
            </div>

            <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <ShieldAlert size={16} color="#F59E0B" />
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Browser Focus &amp; Tab-Switch Detection
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Limits candidate tab-switching during timed qualifying assessments. Auto-submits assessment after 3 unapproved focus loss warnings.
              </p>
              <div style={{ marginTop: 12 }}>
                <Badge variant="success">Enforced for Qualifying Exams</Badge>
              </div>
            </div>

            <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Award size={16} color="#10B981" />
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Tamper-Evident Digital QR Signatures
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                All generated certificates embed cryptographic SHA-256 hashes verifying officer name, employee ID, score, and issuing authority seal.
              </p>
              <div style={{ marginTop: 12 }}>
                <Badge variant="success">Active on All Certificates</Badge>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
