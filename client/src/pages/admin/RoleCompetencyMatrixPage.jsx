import { Grid } from 'lucide-react'
import RoadmapNotice from '../../components/shared/RoadmapNotice'

export default function RoleCompetencyMatrixPage() {
  return (
    <RoadmapNotice
      title="Cadre Role–Competency Matrix Policy Editor"
      subtitle="Interactive policy configuration suite for setting minimum proficiency thresholds (1–5) per statistical designation"
      icon={Grid}
      phase="Phase II Framework Governance"
      description="While KaushalAI currently evaluates user skill gaps dynamically against the database JobRole requiredCompetencies schema, this module represents an enterprise administrative editor allowing the Cadre Controlling Authority to adjust baseline requirements across all positions with automated impact simulation on cadre readiness scores."
      prerequisites={[
        'Full administrative versioning schema for cadre job role definitions in MongoDB.',
        'Impact simulation sandbox computing how threshold adjustments alter org-wide readiness before committing.',
        'Formal sign-off audit trail by the Indian Statistical Service (ISS) Board.',
      ]}
    />
  )
}
