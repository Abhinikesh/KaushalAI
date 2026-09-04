import { Users } from 'lucide-react'
import RoadmapNotice from '../../components/shared/RoadmapNotice'

export default function WorkforceAnalyticsPage() {
  return (
    <RoadmapNotice
      title="Cadre Workforce Capability &amp; Retirement Succession Modeling"
      subtitle="Experience tier progression, institutional memory retention, and automated succession pipeline forecasting"
      icon={Users}
      phase="Phase II HRMS &amp; Cadre Integration"
      description="In an institutional deployment across MOSPI and State Directorates of Economics and Statistics (DES), workforce capacity analysis tracks officer experience cohorts, upcoming superannuation timelines from DOPT service books, and identifies high-potential officers to fill key statistical cadre vacancies before senior retirements occur."
      prerequisites={[
        'Direct synchronization with Ministry of Statistics official HRMS / e-HRMS 2.0 service records.',
        'Authenticated integration with Department of Personnel & Training (DOPT) senior retirement registers.',
        'Enterprise succession planning rules endorsed by the Indian Statistical Service (ISS) Cadre Controlling Authority.',
      ]}
    />
  )
}
