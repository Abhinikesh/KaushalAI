import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Check,
  ArrowLeft,
  Save,
  Layers,
  Sparkles
} from 'lucide-react'

export default function CreateProgrammePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '',
    source: 'NSSTA Greater Noida',
    cadre: 'ISS Officers (Senior & Junior Time Scale)',
    mode: 'Residential',
    durationHours: 20,
    venue: 'NSSTA Campus, Greater Noida',
    description: '',
    competencies: 'Survey Design, Sampling Methods, Data Analysis',
  })
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      showToast('Please enter a programme title.')
      return
    }
    showToast('Training programme created successfully and published to catalogue!')
    setTimeout(() => {
      navigate('/trainer/programmes')
    }, 1200)
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, padding: '0 4px 40px 4px' }}>
      {/* ── Breadcrumb & Header ────────────────────────────── */}
      <div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#64748B', marginBottom: 6 }}>
          <Link to="/trainer/dashboard" style={{ color: '#64748B', textDecoration: 'none' }}>Trainer Portal</Link>
          <span>›</span>
          <Link to="/trainer/programmes" style={{ color: '#64748B', textDecoration: 'none' }}>Training Programmes</Link>
          <span>›</span>
          <span style={{ color: '#1E293B', fontWeight: 600 }}>Create New</span>
        </nav>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Create Training Programme
        </h1>
        <p style={{ fontSize: 13.5, color: '#64748B', margin: '4px 0 0' }}>
          Design new statistical capacity building curricula, select target cadre tiers, and configure session schedules.
        </p>
      </div>

      {/* ── Form Card ──────────────────────────────────────── */}
      <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>Programme Title *</label>
            <input
              type="text"
              placeholder="e.g., Advanced Econometric Modeling & Time Series Estimation"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={{
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13.5,
                outline: 'none',
                color: '#0F172A',
              }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>Sponsoring Organization</label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                style={{
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13.5,
                  outline: 'none',
                  color: '#0F172A',
                  background: '#ffffff',
                }}
              >
                <option value="NSSTA Greater Noida">National Statistical Systems Training Academy (NSSTA)</option>
                <option value="iGOT Karmayogi">iGOT Karmayogi Civil Services</option>
                <option value="MoSPI Training Division">MoSPI HQ Training Division</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>Target Cadre</label>
              <select
                value={form.cadre}
                onChange={(e) => setForm({ ...form, cadre: e.target.value })}
                style={{
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13.5,
                  outline: 'none',
                  color: '#0F172A',
                  background: '#ffffff',
                }}
              >
                <option value="ISS Officers (Senior & Junior Time Scale)">ISS Officers (Senior &amp; Junior Time Scale)</option>
                <option value="Subordinate Statistical Service (SSS)">Subordinate Statistical Service (SSS)</option>
                <option value="State DES Officers">State DES Officers</option>
                <option value="All Cadres">All Statistical Cadres</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>Training Mode</label>
              <select
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}
                style={{
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13.5,
                  outline: 'none',
                  color: '#0F172A',
                  background: '#ffffff',
                }}
              >
                <option value="Residential">Residential (In-Person)</option>
                <option value="Virtual">Virtual (Online Live)</option>
                <option value="Hybrid">Blended / Hybrid</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>Total Hours</label>
              <input
                type="number"
                value={form.durationHours}
                onChange={(e) => setForm({ ...form, durationHours: parseInt(e.target.value) || 20 })}
                style={{
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13.5,
                  outline: 'none',
                  color: '#0F172A',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>Venue</label>
              <input
                type="text"
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                style={{
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13.5,
                  outline: 'none',
                  color: '#0F172A',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>Programme Description &amp; Objectives</label>
            <textarea
              rows={4}
              placeholder="Outline the course objectives, prerequisites, and learning outcomes..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13.5,
                outline: 'none',
                color: '#0F172A',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>Mapped Competencies (Comma Separated)</label>
            <input
              type="text"
              value={form.competencies}
              onChange={(e) => setForm({ ...form, competencies: e.target.value })}
              style={{
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13.5,
                outline: 'none',
                color: '#0F172A',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => navigate('/trainer/programmes')}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                background: '#ffffff',
                border: '1px solid #CBD5E1',
                color: '#475569',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 22px',
                borderRadius: 8,
                background: '#4F46E5',
                border: '1px solid #4338CA',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 1px 3px rgba(79,70,229,0.25)',
              }}
            >
              <Save size={15} />
              <span>Publish Programme</span>
            </button>
          </div>
        </form>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#1e293b',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            zIndex: 9999,
          }}
        >
          <Check size={16} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
