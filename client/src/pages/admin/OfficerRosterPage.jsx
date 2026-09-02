import { useState, useCallback, useRef } from 'react'
import { listRoster, addOfficer, bulkUploadRoster, deleteRosterEntry } from '../../api/roster.api'
import styles from './OfficerRosterPage.module.css'

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ claimed }) {
  return (
    <span className={claimed ? styles.badgeClaimed : styles.badgeUnclaimed}>
      {claimed ? '✓ Claimed' : '○ Unclaimed'}
    </span>
  )
}

// ── CSV drag-and-drop upload panel ────────────────────────────────────────────
function CsvUploadPanel({ onUploadComplete }) {
  const [dragging, setDragging]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult]       = useState(null)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef(null)

  const doUpload = useCallback(async (file) => {
    if (!file) return
    if (!file.name.endsWith('.csv')) { setUploadError('Only .csv files are accepted.'); return }
    setUploadError(''); setUploading(true); setResult(null)
    try {
      const data = await bulkUploadRoster(file)
      setResult(data)
      onUploadComplete()
    } catch (err) {
      setUploadError(err.response?.data?.message ?? 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }, [onUploadComplete])

  const onDrop = (e) => { e.preventDefault(); setDragging(false); doUpload(e.dataTransfer.files[0]) }

  return (
    <div className={styles.uploadSection}>
      <h3 className={styles.sectionTitle}>Bulk upload via CSV</h3>
      <p className={styles.sectionHint}>
        Columns: <code>employeeId, fullName, officialEmail, department, jobRoleTitle</code>
        <br />Header row required. jobRoleTitle must match an existing job role exactly (case-insensitive).
      </p>

      <div
        className={`${styles.dropZone} ${dragging ? styles.dropZoneActive : ''}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {uploading
          ? <><span className={styles.dropSpinner} /> Uploading…</>
          : <><span className={styles.dropIcon}>📋</span> Drop CSV here or <strong>click to browse</strong></>
        }
      </div>
      <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
        onChange={(e) => doUpload(e.target.files[0])} />

      {uploadError && <div className={styles.errorBox}>{uploadError}</div>}

      {result && (
        <div className={styles.resultBox}>
          <strong>Upload complete:</strong> {result.summary.inserted} inserted,{' '}
          {result.summary.skipped} skipped out of {result.summary.total} rows.
          {result.skipped.length > 0 && (
            <details className={styles.skippedDetails}>
              <summary>Show {result.skipped.length} skipped rows</summary>
              <ul>
                {result.skipped.map((s, i) => (
                  <li key={i}>Row {s.row}: {s.reason} — {JSON.stringify(s.data)}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

// ── Add single officer form ───────────────────────────────────────────────────
function AddOfficerForm({ onAdded }) {
  const [form, setForm] = useState({ employeeId: '', fullName: '', officialEmail: '', department: '', jobRoleTitle: '' })
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.employeeId || !form.fullName || !form.officialEmail || !form.department) {
      setError('employeeId, fullName, officialEmail and department are required.'); return
    }
    setError(''); setSaving(true)
    try {
      await addOfficer(form)
      setForm({ employeeId: '', fullName: '', officialEmail: '', department: '', jobRoleTitle: '' })
      onAdded()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to add officer.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.addSection}>
      <h3 className={styles.sectionTitle}>Add single officer</h3>
      {error && <div className={styles.errorBox}>{error}</div>}
      <form className={styles.addForm} onSubmit={handleSubmit} noValidate>
        <div className={styles.addGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Employee ID *</label>
            <input className={styles.input} placeholder="MOSPI-2024-001" value={form.employeeId} onChange={set('employeeId')} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Full name *</label>
            <input className={styles.input} placeholder="Priya Nair" value={form.fullName} onChange={set('fullName')} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Official email *</label>
            <input className={styles.input} type="email" placeholder="priya@gov.in" value={form.officialEmail} onChange={set('officialEmail')} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Department *</label>
            <input className={styles.input} placeholder="MOSPI" value={form.department} onChange={set('department')} required />
          </div>
          <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
            <label className={styles.label}>Job role title (optional — must match existing role)</label>
            <input className={styles.input} placeholder="Statistical Officer" value={form.jobRoleTitle} onChange={set('jobRoleTitle')} />
          </div>
        </div>
        <button type="submit" className={styles.addBtn} disabled={saving}>
          {saving && <span className={styles.spinner} />}
          {saving ? 'Adding…' : '+ Add officer'}
        </button>
      </form>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function OfficerRosterPage() {
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [page, setPage]           = useState(1)
  const [claimedFilter, setClaimed] = useState('')   // '' | 'true' | 'false'
  const [deleting, setDeleting]   = useState(null)

  const fetchRoster = useCallback(async (p = page, claimed = claimedFilter) => {
    setLoading(true); setError('')
    try {
      const params = { page: p, limit: 20 }
      if (claimed) params.claimed = claimed
      const res = await listRoster(params)
      setData(res)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load roster.')
    } finally {
      setLoading(false)
    }
  }, [page, claimedFilter])

  // Initial load
  useState(() => { fetchRoster() })  // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this unclaimed roster entry?')) return
    setDeleting(id)
    try {
      await deleteRosterEntry(id)
      fetchRoster()
    } catch (err) {
      alert(err.response?.data?.message ?? 'Delete failed.')
    } finally {
      setDeleting(null)
    }
  }

  const handleFilterChange = (val) => {
    setClaimed(val); setPage(1); fetchRoster(1, val)
  }

  const handlePageChange = (p) => {
    setPage(p); fetchRoster(p, claimedFilter)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Officer Roster</h1>
          <p className={styles.subtitle}>
            Pre-registered officer list that gates account creation. Only officers listed here can sign up.
          </p>
        </div>
        <div className={styles.stats}>
          {data && (
            <>
              <span className={styles.stat}><strong>{data.total}</strong> total</span>
              <span className={styles.statDot} />
            </>
          )}
        </div>
      </div>

      {/* Add single + CSV upload */}
      <div className={styles.panels}>
        <AddOfficerForm onAdded={() => fetchRoster(1, claimedFilter)} />
        <CsvUploadPanel onUploadComplete={() => fetchRoster(1, claimedFilter)} />
      </div>

      {/* Table */}
      <div className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Roster entries</h3>
          <div className={styles.filters}>
            <label className={styles.filterLabel}>Filter:</label>
            {[['', 'All'], ['false', 'Unclaimed'], ['true', 'Claimed']].map(([val, label]) => (
              <button
                key={val}
                className={`${styles.filterBtn} ${claimedFilter === val ? styles.filterBtnActive : ''}`}
                onClick={() => handleFilterChange(val)}
              >
                {label}
              </button>
            ))}
            <button className={styles.refreshBtn} onClick={() => fetchRoster()} disabled={loading}>
              {loading ? '…' : '↻'}
            </button>
          </div>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        {loading && !data ? (
          <div className={styles.loadingPlaceholder}>Loading roster…</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Full Name</th>
                    <th>Official Email</th>
                    <th>Department</th>
                    <th>Job Role</th>
                    <th>Status</th>
                    <th>Claimed By</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.officers?.length === 0 && (
                    <tr><td colSpan={8} className={styles.emptyCell}>No entries found.</td></tr>
                  )}
                  {data?.officers?.map((o) => (
                    <tr key={o._id}>
                      <td><code className={styles.code}>{o.employeeId}</code></td>
                      <td>{o.fullName}</td>
                      <td className={styles.email}>{o.officialEmail}</td>
                      <td>{o.department}</td>
                      <td>{o.jobRoleId?.title ?? <span className={styles.dim}>—</span>}</td>
                      <td><Badge claimed={o.isClaimed} /></td>
                      <td className={styles.dim}>
                        {o.claimedByUserId
                          ? `${o.claimedByUserId.name} (${o.claimedByUserId.email})`
                          : '—'}
                      </td>
                      <td>
                        {!o.isClaimed && (
                          <button
                            className={styles.deleteBtn}
                            disabled={deleting === o._id}
                            onClick={() => handleDelete(o._id)}
                          >
                            {deleting === o._id ? '…' : 'Delete'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.pages > 1 && (
              <div className={styles.pagination}>
                {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`${styles.pageBtn} ${p === data.page ? styles.pageBtnActive : ''}`}
                    onClick={() => handlePageChange(p)}
                    disabled={loading}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
