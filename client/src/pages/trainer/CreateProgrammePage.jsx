import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import RoadmapNotice from '../../components/shared/RoadmapNotice'

export default function CreateProgrammePage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <RoadmapNotice
        title="Custom Training Programme Curriculum Authoring Suite"
        subtitle="Multi-stage instructional design studio, SCORM 1.2 / xAPI package export, and NSSTA Academic Board review"
        icon={BookOpen}
        phase="Phase II Curriculum Authoring Hub"
        description="In an institutional deployment, this module manages formal multi-module course curriculum authoring, accreditation review by the NSSTA Syllabus Committee, and automated publishing into both the local KaushalAI index and the national iGOT Karmayogi course repository."
        prerequisites={[
          'Formal curriculum accreditation and syllabus review workflow.',
          'SCORM / xAPI packaging and video streaming CDN integration.',
          'Direct publishing gateway to Karmayogi Bharat national repository.',
        ]}
      />

      <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-primary-600)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', margin: 0, color: 'var(--color-text-primary)' }}>
            Ingest Course Materials &amp; Generate Quizzes
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
            Use the live AI Document Ingest pipeline to upload PDF/DOCX materials and generate official evaluations.
          </p>
        </div>

        <Link
          to="/trainer/upload"
          style={{
            padding: 'var(--space-3) var(--space-5)',
            background: 'var(--color-primary-600)',
            color: 'white',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Go to Document Upload
        </Link>
      </div>
    </div>
  )
}
