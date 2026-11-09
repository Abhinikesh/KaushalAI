import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Search,
  UploadCloud,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserX,
  FileSpreadsheet,
  RefreshCw,
  X,
  ChevronLeft
} from 'lucide-react'
import { getAdminUsers, updateAdminUser, getAdminRoles } from '../../api/admin.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import styles from './UserManagementPage.module.css'

export default function UserManagementPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [cadreFilter, setCadreFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [limit] = useState(15)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, inactiveUsers: 0, issCount: 0 })

  // Cadre roles list for reassignment modal
  const [availableRoles, setAvailableRoles] = useState([])

  // Modal & Action states
  const [reassignModalUser, setReassignModalUser] = useState(null)
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [statusModalUser, setStatusModalUser] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [banner, setBanner] = useState(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset page when filters change
  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value)
    setPage(1)
  }

  const handleCadreFilterChange = (e) => {
    setCadreFilter(e.target.value)
    setPage(1)
  }

  // Load available roles on mount
  useEffect(() => {
    getAdminRoles()
      .then((data) => setAvailableRoles(data.roles || []))
      .catch((err) => console.warn('Failed to fetch cadre roles:', err.message))
  }, [])

  // Load paginated users
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page,
        limit,
      }
      if (debouncedSearch) params.search = debouncedSearch
      if (statusFilter !== 'ALL') params.status = statusFilter
      if (cadreFilter !== 'ALL') params.cadre = cadreFilter

      const data = await getAdminUsers(params)
      setUsers(data.users || [])
      setTotal(data.total || 0)
      setPages(data.pages || 1)
      if (data.stats) {
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Failed to fetch admin users:', err)
      setBanner({ type: 'error', message: err.message || 'Failed to load user directory.' })
    } finally {
      setLoading(false)
    }
  }, [page, limit, debouncedSearch, statusFilter, cadreFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Open Reassign Modal
  const openReassignModal = (user) => {
    setReassignModalUser(user)
    setSelectedRoleId(user.role_id?._id || user.role_id || '')
  }

  // Submit Cadre Role Reassignment
  const handleReassignSubmit = async () => {
    if (!reassignModalUser || !selectedRoleId) return
    setActionLoading(true)
    try {
      const res = await updateAdminUser(reassignModalUser._id, { role_id: selectedRoleId })
      if (res.syncStatus === 'deferred') {
        setBanner({
          type: 'warning',
          message: res.message || `Professional cadre role reassigned for ${reassignModalUser.name}, but skill gap synchronization was deferred. It will automatically recover on next access.`,
        })
      } else {
        setBanner({
          type: 'success',
          message: res.message || `Professional cadre role successfully reassigned for ${reassignModalUser.name}.`,
        })
      }
      setReassignModalUser(null)
      await fetchUsers()
    } catch (err) {
      setBanner({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to reassign role.',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Submit Account Status Toggle (Active/Inactive)
  const handleStatusToggle = async () => {
    if (!statusModalUser) return
    setActionLoading(true)
    const newStatus = !statusModalUser.isActive
    try {
      const res = await updateAdminUser(statusModalUser._id, { isActive: newStatus })
      setBanner({
        type: 'success',
        message: res.message || `Account for ${statusModalUser.name} has been ${newStatus ? 'activated' : 'suspended'}.`,
      })
      setStatusModalUser(null)
      await fetchUsers()
    } catch (err) {
      setBanner({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to update account status.',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Dismiss feedback banner
  const dismissBanner = () => setBanner(null)

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
            Manage registered statistical officers, inspect cadre roles, enforce platform access status, and maintain skill alignment.
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

      {/* Feedback Banner */}
      {banner && (
        <div
          className={`${styles.alertBox} ${
            banner.type === 'success'
              ? styles.alertSuccess
              : banner.type === 'warning'
              ? styles.alertWarning
              : styles.alertError
          }`}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {banner.type === 'success' ? (
              <CheckCircle2 size={16} />
            ) : banner.type === 'warning' ? (
              <Clock size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            <span>{banner.message}</span>
          </div>
          <button onClick={dismissBanner} className={styles.modalCloseBtn} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 4 KPI Metric Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIcon}
            style={{
              background: 'color-mix(in srgb, var(--color-primary-600) 10%, transparent)',
              color: 'var(--color-primary-600)',
            }}
          >
            <Users size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Registered Users</div>
            <div className={styles.kpiValue}>{stats.totalUsers || total} Officers</div>
            <div className={styles.kpiHelper}>Platform Directory Total</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Active Accounts</div>
            <div className={styles.kpiValue}>{stats.activeUsers} Active</div>
            <div className={styles.kpiHelper}>
              {stats.totalUsers ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% Operational
            </div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
            <UserX size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Suspended / Inactive</div>
            <div className={styles.kpiValue}>{stats.inactiveUsers} Inactive</div>
            <div className={styles.kpiHelper}>Access Restricted</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>ISS Cadre Strength</div>
            <div className={styles.kpiValue}>{stats.issCount} Officers</div>
            <div className={styles.kpiHelper}>{(stats.totalUsers || total) - stats.issCount} SSS &amp; Support Posts</div>
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
            placeholder="Search users by name, email, employee ID, designation, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={handleStatusFilterChange}
          aria-label="Filter by account status"
        >
          <option value="ALL">All Account Statuses</option>
          <option value="active">Active Accounts Only</option>
          <option value="inactive">Inactive / Suspended Only</option>
        </select>

        <select
          className={styles.filterSelect}
          value={cadreFilter}
          onChange={handleCadreFilterChange}
          aria-label="Filter by cadre"
        >
          <option value="ALL">All Cadres</option>
          <option value="ISS">Indian Statistical Service (ISS)</option>
          <option value="SSS">Subordinate Statistical Service (SSS)</option>
        </select>

        <button
          onClick={fetchUsers}
          className={styles.btnSecondary}
          title="Refresh User List"
          style={{ padding: '8px 12px' }}
        >
          <RefreshCw size={14} className={loading ? styles.spin : ''} />
        </button>
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeaderRow}>
          <div className={styles.tableHeaderTitle}>Government Statistical Officers</div>
          <div className={styles.tableHeaderCount}>
            Showing {users.length} of {total} registered users
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton height="40px" />
            <Skeleton height="40px" />
            <Skeleton height="40px" />
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <Users size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>
              No statistical officers found
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              Try adjusting your search criteria, clearing active filters, or check back later.
            </div>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Officer Profile</th>
                  <th>Official Email</th>
                  <th>Cadre Role &amp; Level</th>
                  <th>Department / Ministry</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const roleName = u.role_id?.name || u.designation || 'Statistical Officer'
                  const roleLevel = u.role_id?.level || u.level || 1
                  const initials = (u.name || 'OF')
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()

                  return (
                    <tr key={u._id}>
                      <td style={{ fontWeight: 600, color: 'var(--color-primary-600)' }}>
                        {u.employeeId || 'N/A'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className={styles.officerAvatar}>{initials}</div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                              {u.name}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--color-text-secondary)' }}>
                              {u.role === 'admin' ? (
                                <span style={{ color: '#6366F1', fontWeight: 600 }}>System Admin</span>
                              ) : (
                                u.cadre || 'ISS'
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                        {u.email}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 12.5 }}>{roleName}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                          Level {roleLevel} Officer
                        </div>
                      </td>
                      <td style={{ fontSize: 12.5 }}>
                        {u.department || 'Official Statistics'}
                      </td>
                      <td>
                        <Badge variant={u.isActive ? 'success' : 'neutral'}>
                          {u.isActive ? 'Active' : 'Suspended'}
                        </Badge>
                      </td>
                      <td>
                        <div className={styles.actionGroup}>
                          <Link
                            to={`/admin/users/${u._id}`}
                            className={styles.actionBtn}
                            title="Inspect complete officer profile"
                          >
                            Profile →
                          </Link>

                          <button
                            type="button"
                            onClick={() => openReassignModal(u)}
                            className={styles.actionBtn}
                            title="Reassign professional cadre role"
                          >
                            Reassign Role
                          </button>

                          <button
                            type="button"
                            onClick={() => setStatusModalUser(u)}
                            className={`${styles.actionBtn} ${u.isActive ? styles.actionBtnDanger : styles.actionBtnSuccess}`}
                            title={u.isActive ? 'Suspend account access' : 'Activate account access'}
                          >
                            {u.isActive ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && total > 0 && (
          <div className={styles.paginationBar}>
            <div className={styles.paginationInfo}>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} officers
            </div>

            <div className={styles.paginationActions}>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <span className={styles.pageIndicator}>
                Page {page} of {pages}
              </span>

              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cadre Role Reassignment Modal */}
      {reassignModalUser && (
        <div className={styles.modalOverlay} onClick={() => setReassignModalUser(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Reassign Cadre Role</h3>
              <button
                onClick={() => setReassignModalUser(null)}
                className={styles.modalCloseBtn}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  Selected Official:
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>
                  {reassignModalUser.name} ({reassignModalUser.employeeId || reassignModalUser.email})
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  Current Designation: {reassignModalUser.designation || 'None'} (Level {reassignModalUser.level || 1})
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Target Professional Cadre Role:</label>
                <select
                  className={styles.formSelect}
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                >
                  <option value="">-- Select Target Cadre Role --</option>
                  {availableRoles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} (Level {r.level}) — {r.department_ref?.name || 'MoSPI'}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.modalWarningNotice}>
                <strong>Integrity Safeguard Notice:</strong> Changing this official&apos;s cadre role updates their
                required competencies and triggers atomic skill gap recalculation under concurrency lock. Obsolete gaps
                from their former role will be safely purged.
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setReassignModalUser(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleReassignSubmit}
                disabled={actionLoading || !selectedRoleId}
              >
                {actionLoading ? 'Synchronizing...' : 'Confirm Reassignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Status Toggle Confirmation Modal */}
      {statusModalUser && (
        <div className={styles.modalOverlay} onClick={() => setStatusModalUser(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {statusModalUser.isActive ? 'Suspend Officer Account' : 'Reactivate Officer Account'}
              </h3>
              <button
                onClick={() => setStatusModalUser(null)}
                className={styles.modalCloseBtn}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                Are you sure you want to {statusModalUser.isActive ? 'suspend' : 'reactivate'} the official account for{' '}
                <strong>{statusModalUser.name}</strong> ({statusModalUser.email})?
              </p>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 8 }}>
                {statusModalUser.isActive
                  ? 'Suspended accounts cannot log in or participate in diagnostic assessments until reactivated by an administrator.'
                  : 'Reactivating this account restores portal access, learning path progression, and assessment eligibility.'}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setStatusModalUser(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={statusModalUser.isActive ? styles.btnSecondary : styles.btnPrimary}
                style={
                  statusModalUser.isActive
                    ? { background: '#DC2626', color: '#FFFFFF', borderColor: '#DC2626' }
                    : {}
                }
                onClick={handleStatusToggle}
                disabled={actionLoading}
              >
                {actionLoading
                  ? 'Updating...'
                  : statusModalUser.isActive
                  ? 'Confirm Suspension'
                  : 'Confirm Activation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
