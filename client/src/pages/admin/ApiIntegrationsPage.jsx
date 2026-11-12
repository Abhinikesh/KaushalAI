import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers,
  ChevronRight,
  ShieldCheck,
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

  // Integration configuration reference — these are the target external systems.
  // Live connectivity status is not checked from this UI; actual integration
  // health is determined by backend configuration and environment variables.
  const gateways = [
    {
      name: 'iGOT Karmayogi National Digital Platform',
      category: 'Course Catalog & Learner Progress Sync',
      endpoint: 'https://api.igotkarmayogi.gov.in/v2/synch/mospi',
      auth: 'OAuth2 Mutual TLS (mTLS)',
      status: 'Not Configured',
      note: 'Requires IGOT_API_KEY and mTLS certificate in server environment.',
    },
    {
      name: 'Parichay / Jan Samarth Single Sign-On (SSO)',
      category: 'NIC Multi-Factor Authentication',
      endpoint: 'https://parichay.nic.in/pnv1/api/verifyToken',
      auth: 'SAML 2.0 / OpenID Connect',
      status: 'Not Configured',
      note: 'Requires NIC SSO credentials and SAML metadata in server environment.',
    },
    {
      name: 'NSSTA Greater Noida Campus ERP Hub',
      category: 'Classroom & Hostel Physical Allocation',
      endpoint: 'https://erp.nssta.gov.in/api/v1/logistics',
      auth: 'Bearer HMAC-SHA256',
      status: 'Not Configured',
      note: 'Requires NSSTA_ERP_TOKEN in server environment.',
    },
    {
      name: 'MoSPI e-Office & Deputation Order Dispatcher',
      category: 'Official Gazette Training OM Integration',
      endpoint: 'https://eoffice.mospi.gov.in/api/sanctions/training',
      auth: 'NIC Internal VPN Token',
      status: 'Not Configured',
      note: 'Requires NIC VPN access and EOFFICE_API_TOKEN in server environment.',
    },
    {
      name: 'Public Financial Management System (PFMS)',
      category: 'Officer Travel Allowance (TA/DA) Verification',
      endpoint: 'https://pfms.nic.in/ws/deputation/tada/verify',
      auth: 'Gov Certificate X.509',
      status: 'Not Configured',
      note: 'Requires PFMS_CERT_PATH and X.509 certificate in server environment.',
    },
  ]

  const handleTestEndpoints = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setIsRefreshing(false)
    }, 800)
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
            title="Endpoint testing is unavailable until integrations are configured and activated."
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Refreshing...' : 'View Integration Guide'}
          </button>
          <Link to="/admin/system-health" className={styles.btnPrimary}>
            <Activity size={15} /> System Health Monitor
          </Link>
        </div>
      </div>

      {/* Summary Banner — integration configuration status */}
      <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Clock size={16} style={{ color: '#B45309', marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
          <strong>Integration Pending Configuration:</strong> The external government gateway integrations listed below have not been activated. Each integration requires the corresponding credentials and certificates to be configured in the backend server environment. Contact the system administrator to provision the required API keys and certificates before these integrations go live.
        </div>
      </div>

      {/* KPI summary: 5 configured targets, 0 currently live */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'color-mix(in srgb, var(--color-primary-600) 10%, transparent)', color: 'var(--color-primary-600)' }}>
            <Globe size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Configured Gateway Targets</div>
            <div className={styles.kpiValue}>{gateways.length} Gateways</div>
            <div className={styles.kpiHelper}>Pending credentials &amp; activation</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <Activity size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Live Connections</div>
            <div className={styles.kpiValue}>0 Active</div>
            <div className={styles.kpiHelper}>No integration currently connected</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <Server size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Sync Events Logged</div>
            <div className={styles.kpiValue}>—</div>
            <div className={styles.kpiHelper}>No sync history yet</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Security Certificates</div>
            <div className={styles.kpiValue}>Not Loaded</div>
            <div className={styles.kpiHelper}>Configure per gateway below</div>
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
              Target Government Systems &amp; Interoperability Endpoints
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Planned National Informatics Centre (NIC) Integrations
            </span>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Gateway Name &amp; Role</th>
                  <th>Target API Endpoint URI</th>
                  <th>Auth Scheme</th>
                  <th>Configuration Required</th>
                  <th>Status</th>
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
                    <td style={{ fontSize: 11.5, color: 'var(--color-text-secondary)' }}>{g.note}</td>
                    <td>
                      <span style={{ color: '#B45309', fontWeight: 600, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={13} /> {g.status}
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
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)', marginBottom: 12 }}>
            Credential &amp; Certificate Configuration
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            No credentials or certificates have been configured yet. Each integration below requires the corresponding environment variable to be set in the backend server before it can be activated. Configure credentials on your deployment platform (e.g. Render environment variables) and redeploy the backend.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Key size={16} color="var(--color-primary-600)" />
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  iGOT Webhook Secret (X-Signature)
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Required to verify payload authenticity for course completion events pushed from Karmayogi servers. Configure <code>IGOT_WEBHOOK_SECRET</code> in server environment.
              </p>
              <div style={{ marginTop: 10, fontSize: 12, color: '#B45309', fontWeight: 600 }}>
                Status: Not configured
              </div>
            </div>

            <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <ShieldCheck size={16} color="var(--color-text-secondary)" />
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  NIC mTLS Client Certificate
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Required for secure intra-governmental data transmission. Obtain a Government of India Root CA certificate from NIC and configure <code>NIC_MTLS_CERT_PATH</code> in server environment.
              </p>
              <div style={{ marginTop: 10, fontSize: 12, color: '#B45309', fontWeight: 600 }}>
                Status: Not loaded
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
