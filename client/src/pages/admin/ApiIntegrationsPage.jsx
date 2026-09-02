import Badge from '../../components/ui/Badge'

export default function ApiIntegrationsPage() {
  const integrations = [
    { name: 'iGOT Karmayogi Courseware Sync', endpoint: 'https://api.igotkarmayogi.gov.in/v2', status: 'Connected', protocol: 'REST / OAuth 2.0', lastCheck: '2 mins ago' },
    { name: 'Parichay / MeriPehchan SSO Gateway', endpoint: 'https://auth.parichay.nic.in/saml', status: 'Enabled', protocol: 'SAML 2.0 / OpenID', lastCheck: '5 mins ago' },
    { name: 'NIC Government Email Gateway', endpoint: 'mail.gov.in:587 (TLS)', status: 'Connected', protocol: 'SMTP / REST', lastCheck: '10 mins ago' },
    { name: 'CDAC National SMS Gateway', endpoint: 'https://smsgw.sms.gov.in/failsafe', status: 'Active', protocol: 'HTTPS REST', lastCheck: '15 mins ago' },
  ]

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          External API &amp; Government Gateway Integrations
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Manage inter-agency connectors with iGOT Karmayogi, Parichay Single Sign-On, and NIC services
        </p>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Integration Gateway</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Endpoint / Host</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Protocol</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Status</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Last Ping</th>
            </tr>
          </thead>
          <tbody>
            {integrations.map((i, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {i.name}
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 11 }}>
                  <code>{i.endpoint}</code>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant="igot">{i.protocol}</Badge>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant="success">✓ {i.status}</Badge>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 11 }}>
                  {i.lastCheck}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
