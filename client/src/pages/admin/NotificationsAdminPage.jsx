import RoadmapNotice from '../../components/shared/RoadmapNotice'

export default function NotificationsAdminPage() {
  return (
    <RoadmapNotice
      title="Cadre Multi-Channel Broadcast &amp; Circulars Dispatcher"
      subtitle="Administrative broadcast hub for ministerial gazettes, NSSTA calendar circulars, and urgent survey mobilization alerts"
      icon="📢"
      phase="Phase II Notification Dispatcher Suite"
      description="In an active ministerial deployment, this dispatcher orchestrates multi-channel notifications across web push, Sandes government instant messenger, SMS, and official @mospi.gov.in email distribution lists with deliverability telemetry and read-receipt auditing."
      prerequisites={[
        'Integration with NIC Sandes Messaging Gateway API.',
        'Official circular authorization digital signing token (e-Sign via Aadhaar/DSC).',
        'Redis/BullMQ scheduled background worker for bulk batch delivery across 10,000+ recipients.',
      ]}
    />
  )
}
