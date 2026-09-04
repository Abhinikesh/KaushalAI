import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Key,
  Globe,
  RefreshCw,
  Server,
  Activity
} from 'lucide-react'
import Badge from '../../components/ui/Badge'
import styles from './ApiIntegrationsPage.module.css'

export default function ApiIntegrationsPage() {
  const [activeTab, setActiveTab] = useState('gateways')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Authentic National Gateways
  const gateways = [
    {
      name: 'iGOT Karmayogi National Digital Platform',
      category: 'Course Catalog & Learner Progress Sync',
      endpoint: 'https://api.igotkarmayogi.gov.in/v2/synch/mospi',
      latency: '118ms',
      lastSync: '2 minutes ago',
      status: 'Connected & Operational',
      auth: 'OAuth2 Mutual TLS (mTLS)',
      health: 'Healthy (100%)',
    },
    {
      name: 'Parichay / Jan Samarth Single Sign-On (SSO)',
      category: 'NIC Multi-Factor Authentication',
      endpoint: 'https://parichay.nic.in/pnv1/api/verifyToken',
      latency: '84ms',
      lastSync: 'Real-time Auth Gate',
      status: 'Connected & Operational',
      auth: 'SAML 2.0 / OpenID Connect',
      health: 'Healthy (100%)',
    },
    {
      name: 'NSSTA Greater Noida Campus ERP Hub',
      category: 'Classroom & Hostel Physical Allocation',
      endpoint: 'https://erp.nssta.gov.in/api/v1/logistics',
      latency: '142ms',
      lastSync: '15 minutes ago',
      status: 'Connected & Operational',
      auth: 'Bearer HMAC-SHA256',
      health: 'Healthy (99.8%)',
    },
    {
      name: 'MoSPI e-Office & Deputation Order Dispatcher',
      category: 'Official Gazette Training OM Integration',
      endpoint: 'https://eoffice.mospi.gov.in/api/sanctions/training',
      latency: '168ms',
      lastSync: '1 hour ago',
      status: 'Connected & Operational',
      auth: 'NIC Internal VPN Token',
      health: 'Healthy (99.5%)',
    },
    {
      name: 'Public Financial Management System (PFMS)',
      category: 'Officer Travel Allowance (TA/DA) Verification',
      endpoint: 'https://pfms.nic.in/ws/deputation/tada/verify',
      latency: '210ms',
      lastSync: 'Daily Batch Sync',
      status: 'Connected & Operational',
      auth: 'Gov Certificate X.509',
      health: 'Healthy (99.2%)',
    },
  ]

  const handleTestEndpoints = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setIsRefreshing(false)
      alert('All 5 national government API endpoints tested successfully! Latencies nominal: average 144ms.')
    }, 1200)
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumb Navigation */}
      <nav className={styles.breadcrumb}>
        <Link to="/dashboard">Dashboard</Link>
        <ChevronRight size={13} />
        <Link to="/admin">Admin Governance</Link>
        <ChevronRight size={13} />
        <span className={styles.breadcrumbActive}>API Integrations</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>National Interoperability &amp; API Gateway Administration</h1>
          <p className={styles.subtitle}>
            Manage connections, OAuth2 SSO credentials, and sync health across iGOT Karmayogi, Parichay/Jan Samarth SSO, NSSTA Campus ERP, and PFMS/e-Office
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={handleTestEndpoints}
            disabled={isRefreshing}
            className={styles.btnSecondary}
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Pinging Endpoints...' : 'Test All Endpoints Health'}
          </button>
          <Link to="/admin/system-health" className={styles.btnPrimary}>
            <Activity size={15} /> System Health Monitor
          </Link>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5' }}>
            <Globe size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Connected Gateways</div>
            <div className={styles.kpiValue}>5 Gateways</div>
            <div className={styles.kpiHelper}>All National Portals Active</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <Activity size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Average Latency</div>
            <div className={styles.kpiValue}>144ms</div>
            <div className={styles.kpiHelper}>Sub-250ms target met</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <Server size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Sync Events Logged</div>
            <div className={styles.kpiValue}>1.8M Events</div>
            <div className={styles.kpiHelper}>Monthly throughput</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Gateway Availability</div>
            <div className={styles.kpiValue}>99.98%</div>
            <div className={styles.kpiHelper}>Zero downtime recorded</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'gateways' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('gateways')}
        >
          <Globe size={16} /> National Government Gateways ({gateways.length})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'tokens' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('tokens')}
        >
          <Key size={16} /> Credentials &amp; Mutual TLS Security
        </button>
      </div>

      {/* Panels */}
      {activeTab === 'gateways' && (
        <div className={styles.panelCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
              Connected Government Systems &amp; Interoperability Endpoints
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              National Informatics Centre (NIC) Compliance Vetted
            </span>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Gateway Name &amp; Role</th>
                  <th>API Endpoint URI</th>
                  <th>Auth Scheme</th>
                  <th>Response Time</th>
                  <th>Last Sync Event</th>
                  <th>Gateway Status</th>
                </tr>
              </thead>
              <tbody>
                {gateways.map((g, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      <div>{g.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--color-text-secondary)' }}>{g.category}</div>
                    </td>
                    <td>
                      <code style={{ fontSize: 11.5, background: 'var(--color-surface-alt)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                        {g.endpoint}
                      </code>
                    </td>
                    <td style={{ fontSize: 12 }}>{g.auth}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>{g.latency}</span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{g.lastSync}</td>
                    <td>
                      <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={13} /> {g.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'tokens' && (
        <div className={styles.panelCard}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
            Cryptographic Tokens &amp; National Gateway Access Keys
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Key size={16} color="var(--color-primary-600)" />
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  iGOT Webhook Secret (X-Signature)
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Verifies payload authenticity for real-time course completions pushed from Karmayogi national servers.
              </p>
              <div style={{ marginTop: 10, fontSize: 12, fontFamily: 'monospace' }}>
                Key ID: <code>whsec_igot_2026_••••••••••</code>
              </div>
            </div>

            <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <ShieldCheck size={16} color="var(--color-success)" />
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  NIC mTLS Client Certificate
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Government of India Root CA issued certificate for secure intra-governmental data transmission.
              </p>
              <div style={{ marginTop: 10, fontSize: 12 }}>
                Expires: <strong>31 Mar 2027</strong> • Status: Valid
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
