import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Award, Check, Landmark, Printer } from 'lucide-react'
import { getMyCertificates } from '../../api/userFeatures.api'
import { useAuthStore } from '../../store/authStore'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import Skeleton from '../../components/ui/Skeleton'

export default function CertificatesPage() {
  const { user } = useAuthStore()
  const [selectedCert, setSelectedCert] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['myCertificates'],
    queryFn: getMyCertificates,
  })

  const certs = data?.certificates || []

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Official Certificates &amp; Credentials
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Cryptographically verified capacity building certificates issued by NSSTA and MOSPI for completed courses &amp; assessments
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
          <Skeleton height="180px" />
          <Skeleton height="180px" />
        </div>
      ) : certs.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No Certificates Issued Yet"
          description="Pass an official competency evaluation with a score of 70% or higher, or complete an official course module to earn your verified credential."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
          {certs.map((c) => (
            <div
              key={c._id || c.certificateId}
              style={{
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-5)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                boxShadow: 'var(--shadow-sm)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Badge variant="success">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Check size={12} strokeWidth={2.5} /> Verified Official
                  </span>
                </Badge>
                <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                  {c.certificateId}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', margin: 'var(--space-2) 0' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--radius-lg)',
                    background: 'rgba(99, 102, 241, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary-600)',
                  }}
                >
                  <Landmark size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                    {c.title}
                  </h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
                    Issued by: National Statistical Systems Training Academy (NSSTA)
                  </p>
                </div>
              </div>

              <div
                style={{
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: 'var(--space-3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <span>Score: <strong>{c.score}%</strong></span>
                <span>Date: <strong>{new Date(c.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCert(c)}
                style={{
                  marginTop: 'var(--space-2)',
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1.5px solid var(--color-primary-600)',
                  background: 'transparent',
                  color: 'var(--color-primary-600)',
                  fontWeight: 600,
                  fontSize: 'var(--text-xs)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Award size={14} /> View &amp; Print Certificate
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Certificate Modal */}
      {selectedCert && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-4)',
          }}
          onClick={() => setSelectedCert(null)}
        >
          <div
            style={{
              background: 'white',
              color: '#0f172a',
              maxWidth: 750,
              width: '100%',
              borderRadius: 'var(--radius-2xl)',
              padding: 'var(--space-8)',
              border: '8px double #4f46e5',
              position: 'relative',
              textAlign: 'center',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-2)' }}>
              <Landmark size={36} color="#4338ca" />
            </div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', color: '#4338ca' }}>
              Ministry of Statistics &amp; Programme Implementation • Government of India
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: '#64748b', marginTop: 2 }}>
              National Statistical Systems Training Academy (NSSTA)
            </div>

            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', margin: 'var(--space-5) 0 var(--space-2)', fontFamily: 'Georgia, serif' }}>
              Certificate of Statistical Competency
            </h2>

            <p style={{ fontSize: 'var(--text-sm)', color: '#475569', margin: '0 0 var(--space-4)' }}>
              This is to certify that
            </p>

            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: '#1e1b4b', borderBottom: '2px solid #cbd5e1', display: 'inline-block', paddingBottom: 4, minWidth: 320, margin: '0 auto' }}>
              {user?.name || 'Statistical Official'}
            </div>

            <p style={{ fontSize: 'var(--text-xs)', color: '#64748b', marginTop: 6 }}>
              {user?.designation || 'Statistical Officer'} • {user?.department || 'Field Operations Division'}
            </p>

            <p style={{ fontSize: 'var(--text-sm)', color: '#334155', maxWidth: 500, margin: 'var(--space-4) auto', lineHeight: 1.6 }}>
              has successfully achieved official mastery in <strong>{selectedCert.title}</strong> with an evaluated benchmark score of <strong>{selectedCert.score}%</strong>.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'var(--space-8)', borderTop: '1px solid #e2e8f0', paddingTop: 'var(--space-4)' }}>
              <div style={{ textAlign: 'left', fontSize: 11, color: '#64748b' }}>
                <div>Date of Issue: <strong>{new Date(selectedCert.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>
                <div>Verification ID: <strong style={{ fontFamily: 'monospace' }}>{selectedCert.certificateId}</strong></div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    padding: 'var(--space-2) var(--space-4)',
                    background: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Printer size={13} /> Print Certificate
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCert(null)}
                  style={{ padding: 'var(--space-2) var(--space-4)', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
