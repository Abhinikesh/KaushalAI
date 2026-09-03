import RoadmapNotice from '../../components/shared/RoadmapNotice'

export default function RolesPermissionsPage() {
  return (
    <RoadmapNotice
      title="Fine-Grained Role-Based Access Control (RBAC) Governance"
      subtitle="Custom capability delegation, divisional sub-administrator scoping, and temporary auditing delegations"
      icon="🛡️"
      phase="Phase II IAM &amp; Single Sign-On Suite"
      description="While KaushalAI actively enforces ternary role authorization ('employee', 'trainer', 'admin') with cryptographic JWT claims and server-side route guards, this enterprise module exposes customizable permission sets (e.g. read-only CAG auditors, divisional FOD training leads) without requiring source code modifications."
      prerequisites={[
        'Integration with central Parichay / MeriPehchan National Single Sign-On (SSO) attribute service.',
        'Dynamic permission evaluation engine with policy caching in Redis.',
        'Dual-approval workflow for administrative privilege escalation.',
      ]}
    />
  )
}
