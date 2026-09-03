import RoadmapNotice from '../../components/shared/RoadmapNotice'

export default function NsstaManagementPage() {
  return (
    <RoadmapNotice
      title="NSSTA Campus Batches &amp; Residential Logistics Hub"
      subtitle="Greater Noida campus hostel allocation, classroom scheduling, and official travel allowance (TA/DA) integration"
      icon="🏛️"
      phase="Phase II Physical Campus Automation"
      description="While online course modules from NSSTA are active and fully searchable in KaushalAI, physical on-campus residential training management requires integration with the NSSTA campus hostel ERP, classroom attendance biometric turnstiles, and administrative sanction orders for official outstation officer deputation."
      prerequisites={[
        'Integration with NSSTA Greater Noida campus estate and hostel booking database.',
        'Official deputation order generator compliant with Ministry of Finance travel norms.',
        'Biometric attendance synchronization with central training portal.',
      ]}
    />
  )
}
