import React from 'react'
import { Link } from 'react-router-dom'
import { Shield, Sparkles, FileText, ArrowRight, ArrowLeft, CheckCircle2, Clock } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

export default function DiagnosticTestPlaceholderPage() {
  const { user } = useAuthStore()

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
        padding: '32px 20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: 680,
          width: '100%',
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          padding: '40px 36px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            color: '#2563eb',
            marginBottom: 20,
          }}
        >
          <Sparkles size={32} />
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            padding: '4px 12px',
            borderRadius: 20,
            fontSize: '0.8125rem',
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          <CheckCircle2 size={14} />
          <span>Part 1 &amp; Part 2 Completed Successfully</span>
        </div>

        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 12px 0',
            letterSpacing: '-0.02em',
          }}
        >
          MoSPI Cadre Diagnostic Assessment Engine
        </h1>

        <p
          style={{
            fontSize: '0.9375rem',
            color: '#475569',
            lineHeight: 1.6,
            maxWidth: 540,
            margin: '0 auto 28px auto',
          }}
        >
          Welcome, <strong>{user?.name || 'Officer'}</strong>. Your professional profile has been saved.
          Based on your designation as <strong>{user?.designation || 'Statistical Officer'}</strong>,
          your benchmark is mapped to <strong>{user?.gradeLevel || 'Level 3'}</strong> of the 5-tier competency framework.
        </p>

        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '20px',
            textAlign: 'left',
            marginBottom: 28,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={18} color="#2563eb" />
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
              Part 3 Diagnostic Test Engine
            </span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
            The adaptive diagnostic test with question banks, real-time timer, score computation, and initial skill-gap generation will be executed in <strong>Part 3</strong>.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>
            <Clock size={14} />
            <span>Ready for Part 3 implementation.</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <Link
            to="/onboarding"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '11px 20px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} />
            Review Onboarding Profile
          </Link>
        </div>
      </div>
    </div>
  )
}
