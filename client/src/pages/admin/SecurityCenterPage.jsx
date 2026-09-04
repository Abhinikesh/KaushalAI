import { ShieldAlert } from 'lucide-react'
import RoadmapNotice from '../../components/shared/RoadmapNotice'

export default function SecurityCenterPage() {
  return (
    <RoadmapNotice
      title="Enterprise Security Information &amp; Event Management (SIEM)"
      subtitle="Institutional threat detection, IP anomaly tracking, and automated security orchestration"
      icon={ShieldAlert}
      phase="Phase II Government Cloud Hardening"
      description="In an active government data center deployment (NIC / MeghRaj Cloud), this module connects directly to institutional Web Application Firewalls (WAF) and SIEM collectors (e.g. Elastic Security or Splunk) to monitor brute-force intrusions, automated scraping of examination questions, and concurrent token anomalies across MOSPI state headquarters."
      prerequisites={[
        'Integration with National Informatics Centre (NIC) CERT-In centralized SIEM syslog forwarder.',
        'Institutional IP geolocation and ASN threat intelligence feed.',
        'Role-based multi-factor authentication (MFA) enforcement through Sandes / eGov mobile OTP gateway.',
      ]}
    />
  )
}
