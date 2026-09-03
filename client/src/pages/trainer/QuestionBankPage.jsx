import RoadmapNotice from '../../components/shared/RoadmapNotice'

export default function QuestionBankPage() {
  return (
    <RoadmapNotice
      title="NSSTA Faculty Question Bank &amp; Item Calibration Hub"
      subtitle="Centralized repository of peer-reviewed and AI-generated statistical assessment items"
      icon="🗄️"
      phase="Phase II Faculty Question Bank Suite"
      description="While AI MCQs are automatically generated from uploaded manuals into active quizzes in KaushalAI, master question banking with item tagging, peer-review sign-offs, and discrimination calibration is part of the Phase II examination suite."
      prerequisites={[
        'Item Response Theory (IRT) difficulty and discrimination parameter storage.',
        'Faculty peer review and approval workflow before item activation.',
        'Integration with automated anti-plagiarism and item duplication detection.',
      ]}
    />
  )
}
