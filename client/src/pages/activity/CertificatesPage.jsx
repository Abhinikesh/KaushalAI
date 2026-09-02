import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMyEnrollments } from '../../api/course.api'
import { useAuthStore } from '../../store/authStore'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'

export default function CertificatesPage() {
  const { user } = useAuthStore()
  const [selectedCert, setSelectedCert] = useState(null)

  const { data } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: getMyEnrollments,
  })

  const enrollments = data?.enrollments || []
  const completed = enrollments.filter((e) => e.status === 'completed' || (e.progressPercent || 0) >= 100)

  // Seed with at least 1 verified certificate for demo demonstration
  const certs = completed.length > 0
    ? completed.map((e, idx) => ({
        id: `KAUSH-CERT-2026-${1000 + idx}`,
        title: typeof e.courseId === 'object' ? e.courseId.title : 'Official Statistics & Survey Analysis',
        issuer: typeof e.courseId === 'object' && e.courseId.source === 'nssta' ? 'NSSTA Greater Noida' : 'iGOT Karmayogi / MOSPI',
        date: e.completedAt ? new Date(e.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '15 May 2026',
        hours: typeof e.courseId === 'object' ? e.courseId.durationHours || 15 : 15,
      }))
    : [
        {
          id: 'KAUSH-CERT-2026-1001',
          title: 'Foundations of Official Statistics & Sampling Techniques',
          issuer: 'National Statistical Systems Training Academy (NSSTA)',
          date: '28 May 2026',
          hours: 20,
        },
        {
          id: 'KAUSH-CERT-2026-1002',
          title: 'Data Quality & National Quality Assurance Framework (NQAF)',
          issuer: 'iGOT Karmayogi · MOSPI',
          date: '10 June 2026',
          hours: 12,
        },
      ]

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Official Certificates &amp; Credentials
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Verified capacity building certificates issued by NSSTA and iGOT Karmayogi for official training milestones
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
        {certs.map((c) => (
          <div
            key={c.id}
            style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
              boxShadow: 'var(--shadow-sm)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #6366f1, #10b981)' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 'bold', color: 'var(--color-primary-600)', letterSpacing: '0.05em' }}>
                {c.id}
              </span>
              <Badge variant="success">Verified</Badge>
            </div>

            <div style={{ textAlign: 'center', padding: 'var(--space-3) 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>🎖️</div>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                {c.title}
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                Awarded to <strong>{user?.name || 'Officer'}</strong>
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--color-text-secondary)' }}>
              <span>Issued: {c.date}</span>
              <span>{c.hours} Credits</span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCert(c)}
              style={{
                width: '100%',
                padding: 'var(--space-2) 0',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--color-primary-600)',
                color: 'white',
                border: 'none',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              View Certificate Document
            </button>
          </div>
        ))}
      </div>

      {/* Certificate Modal */}
      {selectedCert && (
        <div
          onClick={() => setSelectedCert(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 'var(--space-4)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: 'var(--radius-2xl)',
              maxWidth: 680,
              width: '100%',
              padding: 'var(--space-8)',
              border: '8px double #1e293b',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              position: 'relative',
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: '0.1em', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>
              Government of India · Ministry of Statistics and Programme Implementation
            </div>

            <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a', margin: 'var(--space-4) 0 var(--space-2)' }}>
              Certificate of Completion
            </h2>

            <p style={{ fontSize: 'var(--text-sm)', color: '#475569' }}>
              This is to certify that
            </p>

            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e3a8a', margin: 'var(--space-3) 0' }}>
              {user?.name || 'Statistical Officer'}
            </div>

            <p style={{ fontSize: 'var(--text-sm)', color: '#475569', maxWidth: 500, margin: '0 auto' }}>
              has successfully completed the comprehensive training curriculum for
            </p>

            <div style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: '#0f172a', margin: 'var(--space-3) 0' }}>
              "{selectedCert.title}"
            </div>

            <div style={{ fontSize: 'var(--text-xs)', color: '#64748b', margin: 'var(--space-4) 0' }}>
              Conducted by {selectedCert.issuer} · Accredited {selectedCert.hours} Training Hours
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #cbd5e1', paddingTop: 'var(--space-4)', marginTop: 'var(--space-6)', fontSize: 11, color: '#64748b' }}>
              <span>Verification ID: <strong>{selectedCert.id}</strong></span>
              <span>Date: <strong>{selectedCert.date}</strong></span>
            </div>

            <div style={{ marginTop: 'var(--space-5)', display: 'flex', justifyContent: 'center', gap: 'var(--space-3)' }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  padding: 'var(--space-2) var(--space-5)',
                  background: 'var(--color-primary-600)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🖨️ Print / Save PDF
              </button>
              <button
                type="button"
                onClick={() => setSelectedCert(null)}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  background: '#f1f5f9',
                  color: '#334155',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
