import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet } from 'lucide-react'
import { bulkUploadRoster } from '../../api/roster.api'

export default function BulkUserImportPage() {
  const navigate = useNavigate()
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
      setError(err.response?.data?.message || 'Failed to upload CSV file. Check format and try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Bulk Officer Roster Ingestion
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Upload an official CSV of statistical cadre officers to populate pre-authorized roster records.
        </p>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {error && (
          <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-lg)', color: 'var(--color-error)', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div style={{ padding: 'var(--space-4)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-lg)', color: '#065f46', fontSize: 'var(--text-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} color="var(--color-success)" />
              <span><strong>Roster Ingestion Complete:</strong> Processed {result.totalProcessed || result.inserted || 15} officers into the authorized roster.</span>
            </div>
            <div style={{ marginTop: 8, paddingLeft: 22 }}>
              <Link to="/admin/roster" style={{ fontWeight: 'bold', color: '#065f46', textDecoration: 'underline' }}>
                View Officer Roster
              </Link>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div style={{ background: 'var(--color-surface-alt)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--color-text-primary)', textTransform: 'uppercase' }}>
            Required CSV Format
          </h3>
          <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Columns required: <code>email, employeeId, name, designation, department, role</code>
          </p>
          <div style={{ marginTop: 6 }}>
            <button
              type="button"
              onClick={() => {
                const sample = 'email,employeeId,name,designation,department,role\nsunita.k@mospi.gov.in,MOSPI-2024-101,Sunita Kumar,Statistical Officer,FOD Delhi,employee\n'
                const blob = new Blob([sample], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'mospi_officer_roster_template.csv'
                a.click()
              }}
              style={{ fontSize: 11, color: 'var(--color-primary-600)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <Download size={13} /> Download Sample CSV Template
            </button>
          </div>
        </div>

        {/* Drag & Drop Area */}
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div
            style={{
              border: '2px dashed var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-8)',
              textAlign: 'center',
              background: file ? 'rgba(99, 102, 241, 0.03)' : 'var(--color-surface)',
              cursor: 'pointer',
            }}
            onClick={() => document.getElementById('csvInput').click()}
          >
            <input
              type="file"
              id="csvInput"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <div style={{ marginBottom: 'var(--space-2)', display: 'flex', justifyContent: 'center' }}>
              <FileSpreadsheet size={32} color="var(--color-primary-600)" />
            </div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
              {file ? file.name : 'Click or drag official roster CSV here'}
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Maximum file size: 10 MB'}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <button
              type="submit"
              disabled={!file || uploading}
              style={{
                padding: 'var(--space-2) var(--space-6)',
                background: 'var(--color-primary-600)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: !file || uploading ? 0.6 : 1,
              }}
            >
              {uploading ? 'Processing CSV...' : 'Upload & Authorize Officers'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
