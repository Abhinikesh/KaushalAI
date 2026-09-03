import RoadmapNotice from '../../components/shared/RoadmapNotice'

export default function DepartmentManagementPage() {
  return (
    <RoadmapNotice
      title="MOSPI Divisional Hierarchy &amp; State DES Org-Chart Governance"
      subtitle="Federated structural management for FOD regional offices, research divisions (SDRD, NAD, DQAD), and State DES nodes"
      icon="🏛️"
      phase="Phase II Organization Hierarchy Integration"
      description="In an active ministerial deployment, this module manages the formal hierarchy of statistical divisions, regional FOD sub-offices across all 36 States/UTs, and synchronizes official divisional reporting structures with Government of India directory standards."
      prerequisites={[
        'Integration with Government of India Organization Directory (goidirectory.gov.in).',
        'Multi-tenancy isolation for State/UT Directorates of Economics and Statistics (DES).',
        'Official divisional administrative codes mapped to Public Financial Management System (PFMS).',
      ]}
    />
  )
}
