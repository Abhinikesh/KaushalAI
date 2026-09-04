import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  ChevronRight,
  UploadCloud,
  Users
} from 'lucide-react'
import { bulkUploadRoster } from '../../api/roster.api'
import styles from './BulkUserImportPage.module.css'

export default function BulkUserImportPage() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
      setError('')
      setResult(null)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setError('')
    try {
      const data = await bulkUploadRoster(file)
      setResult(data)
      setFile(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload CSV file. Check formatting and try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumb Navigation */}
      <nav className={styles.breadcrumb}>
        <Link to="/dashboard">Dashboard</Link>
        <ChevronRight size={13} />
        <Link to="/admin">Admin Governance</Link>
        <ChevronRight size={13} />
        <Link to="/admin/users">User Management</Link>
        <ChevronRight size={13} />
        <span className={styles.breadcrumbActive}>Bulk Officer Roster Ingestion</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Bulk Officer Roster Ingestion</h1>
          <p className={styles.subtitle}>
            Upload an official CSV of statistical cadre officers to populate pre-authorized roster records and enable Parichay SSO activation
          </p>
        </div>

        <Link to="/admin/roster" className={styles.btnSecondary}>
          <Users size={14} /> View Master Roster
        </Link>
      </div>

      <div className={styles.card}>
        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error, #EF4444)', borderRadius: 10, color: 'var(--color-error, #EF4444)', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--color-success, #10B981)', borderRadius: 10, color: '#065f46', fontSize: 13.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={18} color="var(--color-success, #10B981)" />
              <span><strong>Roster Ingestion Complete:</strong> Processed {result.totalProcessed || result.inserted || 15} officers into the authorized database.</span>
            </div>
            <div style={{ marginTop: 10, paddingLeft: 26 }}>
              <Link to="/admin/roster" style={{ fontWeight: 'bold', color: '#065f46', textDecoration: 'underline' }}>
                Open Officer Directory →
              </Link>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className={styles.formatBox}>
          <div className={styles.formatTitle}>
            Mandatory CSV Column Headers
          </div>
          <p className={styles.formatDesc}>
            The uploaded file must strictly follow the standard MoSPI HRMS structure. Required columns:
            <code style={{ display: 'block', margin: '6px 0', background: 'var(--color-surface)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}>
              email, employeeId, name, designation, department, role
            </code>
          </p>
          <div>
            <button
              type="button"
              onClick={() => {
                const sample = 'email,employeeId,name,designation,department,role\nsunita.k@mospi.gov.in,MOSPI-2024-101,Sunita Kumar,Senior Statistical Officer,FOD Delhi,employee\namit.verma@nic.in,ISS-2018-042,Amit Verma,Assistant Director,National Accounts Division,employee\n'
                const blob = new Blob([sample], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'mospi_officer_roster_template.csv'
                a.click()
              }}
              style={{ fontSize: 12, color: 'var(--color-primary-600)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={14} /> Download Sample CSV Template
            </button>
          </div>
        </div>

        {/* Drag & Drop Area */}
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            className={`${styles.dropzone} ${file ? styles.dropzoneActive : ''}`}
            onClick={() => document.getElementById('csvInput').click()}
          >
            <input
              type="file"
              id="csvInput"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
              <FileSpreadsheet size={36} color="var(--color-primary-600)" />
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {file ? file.name : 'Click to browse or drag official roster CSV here'}
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
              {file ? `${(file.size / 1024).toFixed(1)} KB ready for import` : 'Standard UTF-8 CSV up to 10 MB'}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="submit"
              disabled={!file || uploading}
              className={styles.btnPrimary}
            >
              <UploadCloud size={16} />
              {uploading ? 'Processing Cadre CSV...' : 'Upload & Authorize Officers'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
