import RoadmapNotice from '../../components/shared/RoadmapNotice'

export default function ContentLibraryPage() {
  return (
    <RoadmapNotice
      title="Central Digital Statistical Content &amp; Document Repository"
      subtitle="Federated document management system (EDMS) for official survey concepts, field schedules, and methodology manuals"
      icon="📖"
      phase="Phase II Document Management Architecture"
      description="In an enterprise deployment, this module connects to an S3/MinIO compatible government object store indexing official NSSO survey rounds, UN NQAF standards, and National Accounts handbooks with semantic full-text vector embeddings for instant retrieval by AI tutors and trainers."
      prerequisites={[
        'Integration with dedicated secure S3 / MinIO object storage bucket with server-side encryption (SSE-KMS).',
        'Automated OCR and document layout parsing worker pipeline (Docling / Tesseract) for scanned historical manuals.',
        'Official metadata taxonomy and versioning approved by the Coordination and Publication Division.',
      ]}
    />
  )
}
