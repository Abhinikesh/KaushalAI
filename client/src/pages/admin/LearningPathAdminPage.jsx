import { Compass } from 'lucide-react'
import RoadmapNotice from '../../components/shared/RoadmapNotice'

export default function LearningPathAdminPage() {
  return (
    <RoadmapNotice
      title="Dynamic Learning Path &amp; Recommendation Weighting Engine"
      subtitle="Administrative tuning of cosine similarity thresholds, cadre role priorities, and milestone prerequisite gates"
      icon={Compass}
      phase="Phase II Recommendation Engine Tuning"
      description="In an institutional deployment, this module exposes configurable hyper-parameters allowing NSSTA leadership to re-weight recommendation algorithms during specific national initiatives (e.g. inflating weight of CAPI / digital collection modules before a nationwide economic census)."
      prerequisites={[
        'Centralized configuration storage in MongoDB system settings collection.',
        'Real-time cache invalidation across distributed Python recommendation workers.',
        'Formal approval procedure for algorithmic weight modifications by the Training Advisory Committee.',
      ]}
    />
  )
}
