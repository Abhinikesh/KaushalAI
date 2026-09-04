import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  ChevronRight,
  Lock,
  Download,
  CheckCircle2,
  AlertTriangle,
  Key,
  Users,
  Server,
  Activity,
  FileCheck
} from 'lucide-react'
import Badge from '../../components/ui/Badge'
import styles from './SecurityCenterPage.module.css'

export default function SecurityCenterPage() {
  const [activeTab, setActiveTab] = useState('checklist')
  const [isScanning, setIsScanning] = useState(false)

  // CERT-In Controls Checklist
  const controls = [
    { name: 'Multi-Factor Authentication (MFA) via Parichay/Jan Samarth', category: 'Access Control', status: 'Compliant', standard: 'CERT-In Sec 6.1' },
    { name: 'TLS 1.3 Strict In-Transit Cipher Suites & HSTS', category: 'Cryptography', status: 'Compliant', standard: 'CERT-In Sec 4.3' },
    { name: 'Database Encryption At Rest (AES-256 GCM)', category: 'Data Protection', status: 'Compliant', standard: 'MeitY Cloud Norms' },
    { name: 'Granular Role-Based Access Control (RBAC: Admin / Trainer / Learner)', category: 'Authorization', status: 'Compliant', standard: 'MoSPI Policy' },
    { name: 'Rate Limiting & DDoS Prevention (100 req/min per IP)', category: 'Network Defense', status: 'Compliant', standard: 'OWASP Top 10' },
    { name: 'Automated 15-Minute Session Idle Timeout for Unattended Terminals', category: 'Session Security', status: 'Compliant', standard: 'NIC Security V2' },
    { name: 'Immutable Audit Logging of Administrative User Role Grants', category: 'Accountability', status: 'Compliant', standard: 'CERT-In Sec 7.2' },
    { name: 'Cross-Site Scripting (XSS) & Content Security Policy (CSP)', category: 'Application Security', status: 'Compliant', standard: 'OWASP Top 10' },
  ]

  // Active Sessions
  const activeSessions = [
    { empId: 'ISS-2018-042', officer: 'Amit Verma, ISS', ip: '10.24.112.44 (NIC Intranet)', agent: 'Chrome 128 / macOS', duration: '42 mins', role: 'Learner' },
    { empId: 'ISS-2017-009', officer: 'Dr. R. K. Sharma', ip: '10.24.112.18 (NSSTA Campus)', agent: 'Firefox 130 / Windows', duration: '1h 15m', role: 'Trainer' },
    { empId: 'MOSPI-ADM-01', officer: 'Super Administrator', ip: '10.12.4.1 (MoSPI HQ New Delhi)', agent: 'Edge 128 / Windows', duration: '18 mins', role: 'Admin' },
  ]

  const handleScan = () => {
    setIsScanning(true)
    setTimeout(() => {
      setIsScanning(false)
      alert('CERT-In Automated Security Audit complete! All 8 critical control benchmarks verified COMPLIANT.')
    }, 1400)
  }

  const handleExportDossier = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Control Name,Category,Standard,Compliance Status"].concat(
        controls.map(c => `"${c.name}","${c.category}","${c.standard}","${c.status}"`)
      ).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `MoSPI_CERT_In_Compliance_Dossier.csv`)
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
        <span className={styles.breadcrumbActive}>Security &amp; Compliance Center</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>National Cybersecurity &amp; Data Compliance Center</h1>
          <p className={styles.subtitle}>
            CERT-In compliance auditing, role-based access control (RBAC) integrity, session security, encryption standards, and threat prevention across KaushalAI
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" onClick={handleExportDossier} className={styles.btnSecondary}>
            <Download size={15} /> Download CERT-In Dossier
          </button>
          <button type="button" onClick={handleScan} disabled={isScanning} className={styles.btnPrimary}>
            <ShieldCheck size={15} /> {isScanning ? 'Auditing System Controls...' : 'Trigger Security Audit Scan'}
          </button>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>CERT-In Compliance</div>
            <div className={styles.kpiValue}>98.6% Score</div>
            <div className={styles.kpiHelper}>MeitY Guidelines Fully Met</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5' }}>
            <Users size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Active Concurrent Sessions</div>
            <div className={styles.kpiValue}>142 Officers</div>
            <div className={styles.kpiHelper}>NIC Intranet &amp; VPN Verified</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <Lock size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Data Encryption</div>
            <div className={styles.kpiValue}>AES-256 GCM</div>
            <div className={styles.kpiHelper}>At-Rest &amp; TLS 1.3 Transit</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9' }}>
            <Activity size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Threat Prevention</div>
            <div className={styles.kpiValue}>0 Vulnerabilities</div>
            <div className={styles.kpiHelper}>Real-time WAF filtering</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'checklist' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('checklist')}
        >
          <ShieldCheck size={16} /> CERT-In Security Posture Controls ({controls.length})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'sessions' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          <Users size={16} /> Active Authenticated Sessions ({activeSessions.length})
        </button>
      </div>

      {/* Panels */}
      {activeTab === 'checklist' && (
        <div className={styles.panelCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
              CERT-In &amp; MeitY Cybersecurity Directive Compliance Checklist
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Audited under Government of India Cybersecurity Norms
            </span>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Control Benchmark</th>
                  <th>Security Domain</th>
                  <th>Regulatory Standard</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {controls.map((c, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{c.name}</td>
                    <td>{c.category}</td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{c.standard}</td>
                    <td>
                      <Badge variant="success">
                        <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {c.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className={styles.panelCard}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
            Live Authenticated Officer Sessions
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Officer Name</th>
                  <th>Intranet IP Address</th>
                  <th>User Agent</th>
                  <th>Session Active</th>
                  <th>Role</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.map((s, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary-600)' }}>{s.empId}</td>
                    <td style={{ fontWeight: 600 }}>{s.officer}</td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{s.ip}</td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{s.agent}</td>
                    <td>{s.duration}</td>
                    <td>
                      <Badge variant={s.role === 'Admin' ? 'high' : s.role === 'Trainer' ? 'nssta' : 'igot'}>
                        {s.role}
                      </Badge>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => alert(`Terminating session for ${s.empId}`)}
                        style={{ background: 'none', border: 'none', color: '#EF4444', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                      >
                        Revoke Session
                      </button>
                    </td>
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
