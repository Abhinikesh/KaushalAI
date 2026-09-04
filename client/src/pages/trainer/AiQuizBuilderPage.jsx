import { Sparkles } from 'lucide-react'
import RoadmapNotice from '../../components/shared/RoadmapNotice'

export default function AiQuizBuilderPage() {
  return (
    <RoadmapNotice
      title="Automated Multi-Domain Assessment Blueprint Studio"
      subtitle="Competency-weighted question sampling, blueprint matrix generation, and randomized question scrambling"
      icon={Sparkles}
      phase="Phase II Assessment Studio"
      description="In an institutional examination deployment, this studio allows NSSTA examination controllers to configure multi-domain test blueprints (e.g. 40% Sampling, 30% National Accounts, 30% Computing), automatically pulling calibrated questions from the master bank while applying random distractor order permutations."
      prerequisites={[
        'Full question bank item tagging against the national competency framework.',
        'Randomized question and distractor permutation algorithm with anti-cheating seeds.',
        'Official examination blueprint accreditation by the NSSTA Examination Controller.',
      ]}
    />
  )
}
