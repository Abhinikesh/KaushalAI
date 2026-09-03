import RoadmapNotice from '../../components/shared/RoadmapNotice'

export default function AssessmentAdminPage() {
  return (
    <RoadmapNotice
      title="Cadre Assessment Governance &amp; Certification Policies"
      subtitle="Mandatory civil service certification cadences, promotional benchmarks, and automated compliance notifications"
      icon="📋"
      phase="Phase II Certification Governance"
      description="In an institutional deployment, this module manages mandatory cadre examination rules (e.g. mandatory annual sampling recertification prior to NSSO survey round deployment), automated test scheduling, and formal integration with DOPT promotion eligibility matrices."
      prerequisites={[
        'Formal mandate and approval by the National Statistical Systems Training Academy Academic Council.',
        'Integration with digital proctoring and verified examination center networks.',
        'Automated non-compliance escalation to divisional heads for overdue mandatory certifications.',
      ]}
    />
  )
}
