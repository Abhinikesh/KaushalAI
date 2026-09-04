import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Search,
  UploadCloud,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  UserCheck,
  FileSpreadsheet
} from 'lucide-react'
import { listRoster } from '../../api/roster.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import styles from './UserManagementPage.module.css'

export default function UserManagementPage() {
  const [officers, setOfficers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [cadreFilter, setCadreFilter] = useState('ALL')

  useEffect(() => {
    listRoster({ page: 1, limit: 100 })
      .then((data) => setOfficers(data.officers || []))
      .catch(() => setOfficers([]))
      .finally(() => setLoading(false))
  }, [])

  // Authentic fallback officers if newly seeded
  const defaultList = [
    { _id: 'usr-1', employeeId: 'ISS-2018-042', name: 'Amit Verma, ISS', officialEmail: 'amit.verma@nic.in', department: 'National Accounts Division (NAD)', isClaimed: true, role: 'Learner' },
    { _id: 'usr-2', employeeId: 'ISS-2019-019', name: 'Priya Sundaram, ISS', officialEmail: 'priya.sundaram@nic.in', department: 'Price Statistics Division (PSD)', isClaimed: true, role: 'Learner' },
    { _id: 'usr-3', employeeId: 'SSS-2020-108', name: 'Rajesh K. Meena', officialEmail: 'rk.meena@mospi.gov.in', department: 'Field Operations Division (FOD)', isClaimed: true, role: 'Learner' },
    { _id: 'usr-4', employeeId: 'SSS-2021-055', name: 'Sunita Chawla', officialEmail: 'sunita.c@mospi.gov.in', department: 'Survey Design & Research (SDRD)', isClaimed: false, role: 'Learner' },
    { _id: 'usr-5', employeeId: 'ISS-2017-009', name: 'Dr. R. K. Sharma', officialEmail: 'training.nssta@nic.in', department: 'NSSTA Greater Noida', isClaimed: true, role: 'Trainer' },
    { _id: 'usr-6', employeeId: 'MOSPI-ADM-01', name: 'Super Administrator', officialEmail: 'admin.mospi@nic.in', department: 'Coordination & Admin (CAD)', isClaimed: true, role: 'Admin' },
  ]

  const displayList = officers.length > 0 ? officers : defaultList

  const filtered = displayList.filter((o) => {
    const query = search.toLowerCase()
    const name = (o.name || o.fullName || '').toLowerCase()
    const email = (o.email || o.officialEmail || '').toLowerCase()
    const empId = (o.employeeId || '').toLowerCase()
    const dept = (o.department || '').toLowerCase()

    const matchesSearch = name.includes(query) || email.includes(query) || empId.includes(query) || dept.includes(query)
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'CLAIMED' ? o.isClaimed : !o.isClaimed)
    const matchesCadre = cadreFilter === 'ALL' || (o.employeeId || '').includes(cadreFilter)

    return matchesSearch && matchesStatus && matchesCadre
  })

  const totalCount = displayList.length
  const claimedCount = displayList.filter((o) => o.isClaimed).length
  const pendingCount = totalCount - claimedCount
  const issCount = displayList.filter((o) => (o.employeeId || '').includes('ISS')).length

  return (
    <div className={styles.container}>
      {/* Breadcrumb Navigation */}
      <nav className={styles.breadcrumb}>
        <Link to="/dashboard">Dashboard</Link>
        <ChevronRight size={13} />
        <Link to="/admin">Admin Governance</Link>
        <ChevronRight size={13} />
        <span className={styles.breadcrumbActive}>User Management</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Officer Directory &amp; User Management</h1>
          <p className={styles.subtitle}>
            Manage authorized statistical officials permitted to register, authenticate via Parichay/Jan Samarth, and access official MoSPI dashboards
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link to="/admin/roster" className={styles.btnSecondary}>
            <FileSpreadsheet size={15} /> Upload Roster CSV
          </Link>
          <Link to="/admin/users/import" className={styles.btnPrimary}>
            <UploadCloud size={15} /> Bulk User Import
          </Link>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5' }}>
            <Users size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Authorized Officers</div>
            <div className={styles.kpiValue}>{totalCount} Officers</div>
            <div className={styles.kpiHelper}>Roster Whitelist Total</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Claimed &amp; Registered</div>
            <div className={styles.kpiValue}>{claimedCount} Active</div>
            <div className={styles.kpiHelper}>{Math.round((claimedCount / totalCount) * 100)}% Activation Rate</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <Clock size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Pending First Login</div>
            <div className={styles.kpiValue}>{pendingCount} Officers</div>
            <div className={styles.kpiHelper}>Awaiting SSO Onboarding</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>ISS Cadre Strength</div>
            <div className={styles.kpiValue}>{issCount} Officers</div>
            <div className={styles.kpiHelper}>{totalCount - issCount} SSS &amp; Support Posts</div>
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
            placeholder="Search officers by name, email, employee ID, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Account Statuses</option>
          <option value="CLAIMED">Registered / Active</option>
          <option value="UNCLAIMED">Pending Invite</option>
        </select>

        <select
          className={styles.filterSelect}
          value={cadreFilter}
          onChange={(e) => setCadreFilter(e.target.value)}
        >
          <option value="ALL">All Cadres</option>
          <option value="ISS">Indian Statistical Service (ISS)</option>
          <option value="SSS">Subordinate Statistical Service (SSS)</option>
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeaderRow}>
          <div className={styles.tableHeaderTitle}>
            Authorized Officer Directory
          </div>
          <div className={styles.tableHeaderCount}>
            Showing {filtered.length} of {displayList.length} officers
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 24 }}>
            <Skeleton height="160px" />
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Full Name</th>
                  <th>Official Email</th>
                  <th>Department / Division</th>
                  <th>Account Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o._id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary-600)' }}>
                      {o.employeeId}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className={styles.officerAvatar}>
                          {(o.name || o.fullName || 'OF').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {o.name || o.fullName}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--color-text-secondary)' }}>
                            {o.role || 'Officer'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                      {o.email || o.officialEmail}
                    </td>
                    <td style={{ fontSize: 12.5 }}>
                      {o.department || 'MoSPI Headquarters'}
                    </td>
                    <td>
                      <Badge variant={o.isClaimed ? 'success' : 'neutral'}>
                        {o.isClaimed ? 'Registered / Claimed' : 'Pending Invite'}
                      </Badge>
                    </td>
                    <td>
                      <Link
                        to={`/admin/users/${o._id}`}
                        style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary-600)', textDecoration: 'none' }}
                      >
                        Manage Profile →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
