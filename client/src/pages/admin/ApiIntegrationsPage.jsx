import RoadmapNotice from '../../components/shared/RoadmapNotice'

export default function ApiIntegrationsPage() {
  return (
    <RoadmapNotice
      title="Inter-Agency Government API Gateway Integrations"
      subtitle="Federated connectors for Parichay / MeriPehchan SSO, CDAC SMS gateway, and NIC Government Mail"
      icon="🔌"
      phase="Phase II Government Gateway Integration"
      description="In an active Government of India cloud deployment, this module manages mTLS certificates, API rate-limiting quotas, and uptime webhooks for institutional connectors including National Informatics Centre (NIC) email services, CDAC OTP dispatchers, and external civil service databases."
      prerequisites={[
        'Mutual TLS (mTLS) certificate issuance from NIC Certifying Authority.',
        'Institutional API key provisioning and IP whitelisting on official government gateways.',
        'Encrypted credential storage in compliant Government Cloud Key Management Service.',
      ]}
    />
  )
}
