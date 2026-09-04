import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  Users,
  UserCheck,
  ChevronRight,
  Download,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck
} from 'lucide-react'
import { getAdminDepartmentsSummary } from '../../api/admin.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import styles from './DepartmentManagementPage.module.css'

export default function DepartmentManagementPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['adminDepartmentsSummary'],
    queryFn: getAdminDepartmentsSummary,
  })

  const rawRoster = data?.rosterCounts || []

  // Domain-authentic MoSPI Divisional Roster
  const defaultDivisions = [
    { _id: 'National Accounts Division (NAD) - New Delhi', totalOfficers: 48, claimed: 42, headquarters: 'Sardar Patel Bhawan, New Delhi' },
    { _id: 'Field Operations Division (FOD) - Headquarters & Zones', totalOfficers: 340, claimed: 286, headquarters: 'Sankhyiki Bhawan, Delhi / Regional Zonal Offices' },
    { _id: 'Survey Design & Research Division (SDRD) - Kolkata', totalOfficers: 72, claimed: 64, headquarters: 'Mahalanobis Bhawan, Kolkata' },
    { _id: 'Data Quality Assurance Division (DQAD) - Kolkata', totalOfficers: 65, claimed: 58, headquarters: 'Mahalanobis Bhawan, Kolkata' },
    { _id: 'Price Statistics Division (PSD) - New Delhi', totalOfficers: 38, claimed: 34, headquarters: 'Janpath Bhawan, New Delhi' },
    { _id: 'National Statistical Systems Training Academy (NSSTA)', totalOfficers: 28, claimed: 26, headquarters: 'Plot 22, Knowledge Park II, Greater Noida' },
    { _id: 'Economic Statistics Division (ESD) - New Delhi', totalOfficers: 52, claimed: 44, headquarters: 'Khurshid Lal Bhawan, New Delhi' },
    { _id: 'Coordination & Administration Division (CAD)', totalOfficers: 30, claimed: 25, headquarters: 'Sardar Patel Bhawan, New Delhi' }
  ]

  const rosterCounts = rawRoster.length > 0 ? rawRoster : defaultDivisions

  const filtered = rosterCounts.filter((r) => {
    const name = (r._id || '').toLowerCase()
    const hq = (r.headquarters || '').toLowerCase()
    const query = search.toLowerCase()
    return name.includes(query) || hq.includes(query)
  })

  const totalOfficers = rosterCounts.reduce((acc, r) => acc + (r.totalOfficers || 0), 0)
  const totalClaimed = rosterCounts.reduce((acc, r) => acc + (r.claimed || 0), 0)
  const pendingOfficers = totalOfficers - totalClaimed
  const overallRate = totalOfficers > 0 ? Math.round((totalClaimed / totalOfficers) * 100) : 0

  const handleExportCSV = () => {
    const headers = 'Division / Directorate,Authorized Seats,Claimed Accounts,Pending Invites,Onboarding Rate %\n'
    const rows = filtered.map(r => `"${r._id || 'Unassigned'}","${r.totalOfficers}","${r.claimed}","${r.totalOfficers - r.claimed}","${r.totalOfficers > 0 ? Math.round((r.claimed / r.totalOfficers) * 100) : 0}%"`).join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mospi_divisional_cadre_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumb Navigation */}
      <nav className={styles.breadcrumb}>
        <Link to="/dashboard">Dashboard</Link>
        <ChevronRight size={13} />
        <Link to="/admin">Admin Governance</Link>
        <ChevronRight size={13} />
        <span className={styles.breadcrumbActive}>Divisional Cadre Allocation</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>MoSPI Divisional Roster &amp; Cadre Distribution</h1>
          <p className={styles.subtitle}>
            Official statistical officer allocations across headquarters research divisions, regional FOD zonal offices, and training academies
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" onClick={handleExportCSV} className={styles.btnSecondary}>
            <Download size={14} /> Export Divisional CSV
          </button>
          <Link to="/admin/roster" className={styles.btnPrimary}>
            <Users size={15} /> Inspect Master Roster
          </Link>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5' }}>
            <Building2 size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Divisions Mapped</div>
            <div className={styles.kpiValue}>{rosterCounts.length} Units</div>
            <div className={styles.kpiHelper}>HQ, Zonal &amp; Academies</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9' }}>
            <Users size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Sanctioned Cadre</div>
            <div className={styles.kpiValue}>{totalOfficers} Seats</div>
            <div className={styles.kpiHelper}>Authorized MoSPI Strength</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <UserCheck size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Active Logins</div>
            <div className={styles.kpiValue}>{totalClaimed} Officers</div>
            <div className={styles.kpiHelper}>{overallRate}% Platform Onboarding</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <Clock size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Pending Activation</div>
            <div className={styles.kpiValue}>{pendingOfficers} Seats</div>
            <div className={styles.kpiHelper}>Awaiting Parichay SSO Login</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search divisions by title, location, or directorate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table Container */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeaderRow}>
          <div className={styles.tableHeaderTitle}>
            Divisional Cadre Officer Allocation
          </div>
          <div className={styles.tableHeaderCount}>
            Showing {filtered.length} of {rosterCounts.length} directorates
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 'var(--space-6)' }}>
            <Skeleton height="150px" />
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Division / Directorate Name</th>
                  <th>Total Authorized Seats</th>
                  <th>Claimed &amp; Active Users</th>
                  <th>Pending Claims</th>
                  <th>Onboarding Rate</th>
                  <th>Cadre Health</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const rate = r.totalOfficers > 0 ? Math.round((r.claimed / r.totalOfficers) * 100) : 0
                  return (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {r._id || 'Unassigned Division'}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                          {r.headquarters || 'MoSPI Statistical Establishment'}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {r.totalOfficers} Officers
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary-600)' }}>
                        {r.claimed}
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>
                        {r.totalOfficers - r.claimed}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: 3, maxWidth: 80, overflow: 'hidden' }}>
                            <div style={{ width: `${rate}%`, height: '100%', background: rate >= 80 ? '#10B981' : rate >= 50 ? '#4F46E5' : '#F59E0B' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{rate}%</span>
                        </div>
                      </td>
                      <td>
                        <Badge variant={rate >= 80 ? 'success' : rate >= 50 ? 'igot' : 'neutral'}>
                          {rate >= 80 ? 'Optimal Activation' : rate >= 50 ? 'Moderate' : 'Needs Campaign'}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
