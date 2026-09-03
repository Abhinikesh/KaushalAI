import RoadmapNotice from '../../components/shared/RoadmapNotice'

export default function LearnerPerformancePage() {
  return (
    <RoadmapNotice
      title="Individual Longitudinal Learner Diagnostics &amp; Mentorship Hub"
      subtitle="Officer-level psychometric progression curves, supervisor mentoring notes, and remedial coaching assignment"
      icon="📈"
      phase="Phase II Faculty Mentorship Suite"
      description="In an institutional academy deployment, this faculty module provides deep-dive longitudinal tracking of individual officer learning trajectories, correlating pre-training diagnostic gaps with post-training field assessments, and allowing NSSTA course directors to assign personalized remedial coaching modules."
      prerequisites={[
        'Longitudinal database schema tracking multi-year officer training interventions.',
        'Integration with supervisor 180-day field performance appraisals.',
        'Faculty remedial assignment and 1-on-1 tutoring appointment scheduling workflow.',
      ]}
    />
  )
}
