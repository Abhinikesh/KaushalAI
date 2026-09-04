import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Landmark,
  Calendar,
  Users,
  Building,
  FileText,
  ChevronRight,
  Download,
  PlusCircle,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Award
} from 'lucide-react'
import Badge from '../../components/ui/Badge'
import styles from './NsstaManagementPage.module.css'

export default function NsstaManagementPage() {
  const [activeTab, setActiveTab] = useState('batches')

  // Authentic physical campus batches
  const batches = [
    {
      code: 'NSSTA-2026-B04',
      title: 'National Accounts Statistics & Supply-Use Tables (SNA 2008)',
      dates: '15 Sep 2026 - 20 Sep 2026',
      duration: '6 Days Residential',
      venue: 'Auditorium 2 & Lab 4, Greater Noida Campus',
      cadre: 'ISS STS & JAG Officers',
      director: 'Dr. R. K. Sharma (ADG, NSSTA)',
      capacity: 35,
      nominated: 32,
      status: 'In-Session',
    },
    {
      code: 'NSSTA-2026-B05',
      title: 'Foundations of Multi-Stage Probability Sampling for Field Surveys',
      dates: '28 Sep 2026 - 03 Oct 2026',
      duration: '6 Days Residential',
      venue: 'Seminar Hall 1, Greater Noida Campus',
      cadre: 'SSS Junior / Senior Statistical Officers',
      director: 'Smt. Anuradha Sen (Joint Director)',
      capacity: 45,
      nominated: 41,
      status: 'Nominations Closed',
    },
    {
      code: 'NSSTA-2026-B06',
      title: 'Advanced Econometrics & Time Series Modeling using R & Python',
      dates: '12 Oct 2026 - 17 Oct 2026',
      duration: '6 Days Residential',
      venue: 'High Performance Computing Lab, NSSTA',
      cadre: 'ISS Officers (JTS to Director)',
      director: 'Prof. A. Bhattacharya (ISI / Guest Faculty)',
      capacity: 30,
      nominated: 24,
      status: 'Nominations Open',
    },
    {
      code: 'NSSTA-2026-B07',
      title: 'National Quality Assurance Framework (NQAF) Implementation & Data Audit',
      dates: '02 Nov 2026 - 06 Nov 2026',
      duration: '5 Days Residential',
      venue: 'Executive MDP Hall, Greater Noida Campus',
      cadre: 'Director / Joint Director Level',
      director: 'Sh. R. N. Mukherjee (Sr. Consultant)',
      capacity: 25,
      nominated: 15,
      status: 'Nominations Open',
    },
  ]

  // Hostel estate logistics
  const hostelBlocks = [
    { name: 'Executive Hostel Block A', total: 60, occupied: 52, reserved: 6, maintenance: 2, condition: 'Air-Conditioned Single Occupancy (ISS Officers)' },
    { name: 'Hostel Block B (Cadre Residence)', total: 80, occupied: 68, reserved: 8, maintenance: 4, condition: 'Twin Sharing Deluxe (SSS Officers)' },
    { name: 'VIP Faculty Suites (Block C)', total: 12, occupied: 8, reserved: 4, maintenance: 0, condition: 'Guest Faculty & International SIAP Delegates' },
  ]

  // Official Deputation Orders
  const deputationOrders = [
    { orderNo: 'MoSPI/T-14011/2026-Trg-01', date: '04 Sep 2026', batch: 'NSSTA-2026-B04', officers: 32, authority: 'Under Secretary (Training), MoSPI', status: 'Issued & Dispatched' },
    { orderNo: 'MoSPI/T-14011/2026-Trg-02', date: '28 Aug 2026', batch: 'NSSTA-2026-B05', officers: 41, authority: 'Under Secretary (Training), MoSPI', status: 'Issued & Dispatched' },
    { orderNo: 'MoSPI/T-14011/2026-Trg-03', date: '01 Sep 2026', batch: 'NSSTA-2026-B06', officers: 24, authority: 'Director (Cadre Administration), MoSPI', status: 'Draft Sanction' },
  ]

  const totalCapacity = hostelBlocks.reduce((acc, b) => acc + b.total, 0)
  const totalOccupied = hostelBlocks.reduce((acc, b) => acc + b.occupied, 0)
  const occupancyPct = Math.round((totalOccupied / totalCapacity) * 100)

  const handleExportDeputations = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Sanction Order No,Issue Date,Batch Code,Officers Deputed,Sanctioning Authority,Status"].concat(
        deputationOrders.map(d => `"${d.orderNo}","${d.date}","${d.batch}",${d.officers},"${d.authority}","${d.status}"`)
      ).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `NSSTA_Official_Deputation_Sanctions.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumb Navigation */}
      <nav className={styles.breadcrumb}>
        <Link to="/dashboard">Dashboard</Link>
        <ChevronRight size={13} />
        <Link to="/admin">Admin Governance</Link>
        <ChevronRight size={13} />
        <span className={styles.breadcrumbActive}>NSSTA Academy &amp; Campus Batches</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>National Statistical Systems Training Academy (NSSTA) Governance</h1>
          <p className={styles.subtitle}>
            Greater Noida campus logistics, physical residential batches, classroom scheduling, hostel allocation, and official deputation sanctions
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" onClick={handleExportDeputations} className={styles.btnSecondary}>
            <Download size={15} /> Export Deputation Sanctions
          </button>
          <Link to="/trainer/programmes/new" className={styles.btnPrimary}>
            <PlusCircle size={15} /> + Schedule New Campus Batch
          </Link>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5' }}>
            <Landmark size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Active Campus Batches</div>
            <div className={styles.kpiValue}>{batches.length} Batches</div>
            <div className={styles.kpiHelper}>Calendar Year 2026-27</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <Users size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Trainees In-Residence</div>
            <div className={styles.kpiValue}>{totalOccupied} Officers</div>
            <div className={styles.kpiHelper}>ISS &amp; SSS Cadre Trainees</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <Building size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Hostel Occupancy</div>
            <div className={styles.kpiValue}>{occupancyPct}%</div>
            <div className={styles.kpiHelper}>{totalCapacity - totalOccupied} Rooms Available</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9' }}>
            <FileText size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Sanctioned Deputations</div>
            <div className={styles.kpiValue}>114 Orders</div>
            <div className={styles.kpiHelper}>Under MoSPI Training Norms</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'batches' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('batches')}
        >
          <Calendar size={16} /> Campus Training Batches ({batches.length})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'hostel' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('hostel')}
        >
          <Building size={16} /> Hostel &amp; Campus Estate Logistics
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'deputations' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('deputations')}
        >
          <FileText size={16} /> Deputation Sanctions &amp; TA/DA
        </button>
      </div>

      {/* Panels */}
      {activeTab === 'batches' && (
        <div className={styles.panelCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
              Physical Residential Batches at Greater Noida Campus
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Venue: Plot No. 22, Knowledge Park-II, Greater Noida
            </span>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Batch Code</th>
                  <th>Programme Title</th>
                  <th>Dates &amp; Duration</th>
                  <th>Target Cadre</th>
                  <th>Course Director</th>
                  <th>Nominations</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.code}>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary-600)' }}>{b.code}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{b.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--color-text-secondary)' }}>{b.venue}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.dates}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)' }}>{b.duration}</div>
                    </td>
                    <td>
                      <Badge variant="nssta">{b.cadre}</Badge>
                    </td>
                    <td style={{ fontSize: 12.5 }}>{b.director}</td>
                    <td>
                      <span style={{ fontWeight: 700 }}>{b.nominated}</span>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: 11.5 }}> / {b.capacity}</span>
                    </td>
                    <td>
                      <Badge variant={b.status === 'In-Session' ? 'success' : b.status === 'Nominations Open' ? 'igot' : 'neutral'}>
                        {b.status}
                      </Badge>
                    </td>
                    <td>
                      <Link
                        to="/trainer/programmes"
                        style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary-600)', textDecoration: 'none' }}
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'hostel' && (
        <div className={styles.panelCard}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
            Greater Noida Campus Hostel Blocks &amp; Allocation
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {hostelBlocks.map((hb, i) => (
              <div key={i} style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{hb.name}</h4>
                  <Badge variant="nssta">{Math.round((hb.occupied / hb.total) * 100)}% Full</Badge>
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 14px 0' }}>{hb.condition}</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center', background: 'var(--color-surface)', padding: 10, borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>{hb.total}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Occupied</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-success)' }}>{hb.occupied}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Vacant</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-primary-600)' }}>{hb.total - hb.occupied}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'deputations' && (
        <div className={styles.panelCard}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
            Official Ministry Sanctions &amp; Deputation Orders (TA/DA Sanction Register)
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sanction Order Number</th>
                  <th>Issue Date</th>
                  <th>Training Programme Batch</th>
                  <th>Deputed Officers</th>
                  <th>Sanctioning Authority</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {deputationOrders.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary-600)' }}>{d.orderNo}</td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{d.date}</td>
                    <td style={{ fontWeight: 600 }}>{d.batch}</td>
                    <td style={{ fontWeight: 700 }}>{d.officers} Officers</td>
                    <td style={{ fontSize: 12.5 }}>{d.authority}</td>
                    <td>
                      <Badge variant={d.status.includes('Issued') ? 'success' : 'neutral'}>
                        {d.status}
                      </Badge>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => alert(`Downloading Sanction Order: ${d.orderNo}`)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-primary-600)', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Download size={13} /> Download OM
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
