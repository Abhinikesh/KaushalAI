import { FileSpreadsheet } from 'lucide-react'
import RoadmapNotice from '../../components/shared/RoadmapNotice'

export default function CustomReportsPage() {
  return (
    <RoadmapNotice
      title="Institutional Custom Report Builder &amp; Data Pipeline"
      subtitle="Dynamic aggregation engine for parliamentary questions, cabinet notes, and annual ministerial reports"
      icon={FileSpreadsheet}
      phase="Phase II Reporting Suite"
      description="In an active ministerial deployment, this module connects to an asynchronous data pipeline generating signed PDF/Excel statistical capacity digests, parliamentary question (PQ) inputs, and CAG training audit annexures directly from official MongoDB historical warehouse records."
      prerequisites={[
        'Headless reporting engine (e.g. Puppeteer/wkhtmltopdf cluster) for cryptographic digital signature sealing.',
        'Scheduled background job worker queue (Redis Bull / Celery) for non-blocking multi-year report generation.',
        'Official MOSPI document templates endorsed by the Administration and Coordination Division.',
      ]}
    />
  )
}
