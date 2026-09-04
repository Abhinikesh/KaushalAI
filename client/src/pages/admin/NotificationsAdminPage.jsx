import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  ChevronRight,
  Send,
  AlertCircle,
  CheckCircle2,
  Users,
  Clock,
  Radio,
  Mail,
  Smartphone
} from 'lucide-react'
import Badge from '../../components/ui/Badge'
import styles from './NotificationsAdminPage.module.css'

export default function NotificationsAdminPage() {
  const [activeTab, setActiveTab] = useState('circulars')
  const [subject, setSubject] = useState('')
  const [audience, setAudience] = useState('ALL')
  const [priority, setPriority] = useState('standard')
  const [body, setBody] = useState('')

  // Official circulars log
  const [circulars, setCirculars] = useState([
    {
      id: 'CIRC-2026-08',
      title: 'Mandatory Completion of NQAF Digital Assessment Module for ISS STS Officers',
      audience: 'ISS Cadre (STS & JAG)',
      channels: ['In-App', 'NIC Email'],
      date: '03 Sep 2026',
      deliveredPct: '99.4%',
      reads: 214,
      priority: 'urgent',
    },
    {
      id: 'CIRC-2026-07',
      title: 'NSSTA Greater Noida Residential Batch-04 Deputation Guidelines & TA Sanction',
      audience: 'Nominated Trainees (Batch-04)',
      channels: ['In-App', 'SMS', 'NIC Email'],
      date: '28 Aug 2026',
      deliveredPct: '100%',
      reads: 32,
      priority: 'standard',
    },
    {
      id: 'CIRC-2026-06',
      title: 'Rollout of Automated AI Tutor Micro-Learning Modules on Supply-Use Tables',
      audience: 'All Registered Officers',
      channels: ['In-App'],
      date: '20 Aug 2026',
      deliveredPct: '98.8%',
      reads: 840,
      priority: 'advisory',
    },
  ])

  const handleBroadcast = (e) => {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) return
    const newCirc = {
      id: `CIRC-2026-0${circulars.length + 9}`,
      title: subject.trim(),
      audience: audience === 'ALL' ? 'All Registered Officers' : audience === 'ISS' ? 'ISS Cadre Officers' : 'SSS Cadre Officers',
      channels: ['In-App', 'NIC Email'],
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      deliveredPct: '100%',
      reads: 1,
      priority,
    }
    setCirculars([newCirc, ...circulars])
    setSubject('')
    setBody('')
    setActiveTab('circulars')
    alert('Official circular dispatched successfully to all targeted officer accounts!')
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumb Navigation */}
      <nav className={styles.breadcrumb}>
        <Link to="/dashboard">Dashboard</Link>
        <ChevronRight size={13} />
        <Link to="/admin">Admin Governance</Link>
        <ChevronRight size={13} />
        <span className={styles.breadcrumbActive}>Notifications Broadcast Console</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Central Circulars &amp; Notifications Broadcast Console</h1>
          <p className={styles.subtitle}>
            Dispatch official MoSPI training circulars, exam schedule announcements, campus hostel notices, and SMS/Email reminders to cadre officers
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link to="/notifications" className={styles.btnSecondary}>
            <Bell size={15} /> View Learner Notifications
          </Link>
          <button type="button" onClick={() => setActiveTab('composer')} className={styles.btnPrimary}>
            <Send size={15} /> + Broadcast New Circular
          </button>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5' }}>
            <Radio size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Official Broadcasts</div>
            <div className={styles.kpiValue}>42 Circulars</div>
            <div className={styles.kpiHelper}>Calendar Year 2026</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Delivery Saturation</div>
            <div className={styles.kpiValue}>99.4%</div>
            <div className={styles.kpiHelper}>Verified officer inbox arrival</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <AlertCircle size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Active System Alerts</div>
            <div className={styles.kpiValue}>3 Priority</div>
            <div className={styles.kpiHelper}>Mandatory Action Required</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9' }}>
            <Users size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Audience Reach</div>
            <div className={styles.kpiValue}>1,180 Officers</div>
            <div className={styles.kpiHelper}>In-Position Cadre Base</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'circulars' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('circulars')}
        >
          <Radio size={16} /> Dispatched Circulars &amp; Broadcasts ({circulars.length})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'composer' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('composer')}
        >
          <Send size={16} /> Broadcast Composer Console
        </button>
      </div>

      {/* Panels */}
      {activeTab === 'circulars' && (
        <div className={styles.panelCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
              Official Circular Transmission Registry
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Dispatched via MoSPI Government Gateway
            </span>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Circular ID &amp; Subject</th>
                  <th>Target Cadre Audience</th>
                  <th>Channels</th>
                  <th>Dispatched Date</th>
                  <th>Delivery Rate</th>
                  <th>Priority</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {circulars.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      <div>{c.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{c.id}</div>
                    </td>
                    <td>
                      <Badge variant="nssta">{c.audience}</Badge>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                        {c.channels.map((ch, idx) => (
                          <span key={idx} style={{ background: 'var(--color-surface-alt)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                            {ch}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{c.date}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>{c.deliveredPct}</span>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{c.reads} read receipts</div>
                    </td>
                    <td>
                      <Badge variant={c.priority === 'urgent' ? 'high' : c.priority === 'standard' ? 'igot' : 'neutral'}>
                        {c.priority.toUpperCase()}
                      </Badge>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => alert(`Showing receipt log for circular: ${c.id}`)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-primary-600)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                      >
                        Receipts →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'composer' && (
        <div className={styles.panelCard}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
            Author &amp; Broadcast Official Circular / Alert
          </div>

          <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                Circular Title &amp; Subject Line
              </label>
              <input
                type="text"
                placeholder="e.g. Schedule of Annual ISS Cadre Competency Re-evaluation Examination 2026..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--color-border)', fontSize: 13.5, boxSizing: 'border-box' }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  Target Audience
                </label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  style={{ width: '100%', height: 40, borderRadius: 8, border: '1.5px solid var(--color-border)', padding: '0 10px', fontSize: 13 }}
                >
                  <option value="ALL">All Registered MoSPI Officers</option>
                  <option value="ISS">Indian Statistical Service (ISS Only)</option>
                  <option value="SSS">Subordinate Statistical Service (SSS Only)</option>
                  <option value="FOD">Field Operations Division (FOD) Personnel</option>
                  <option value="NSSTA">NSSTA Campus Enrolled Batches</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  Broadcast Urgency
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  style={{ width: '100%', height: 40, borderRadius: 8, border: '1.5px solid var(--color-border)', padding: '0 10px', fontSize: 13 }}
                >
                  <option value="standard">Standard Circular (Email + In-App)</option>
                  <option value="urgent">Urgent Official Notice (High Priority Banner + SMS)</option>
                  <option value="advisory">Curriculum Advisory (Informational)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                Circular Statement Body
              </label>
              <textarea
                rows={5}
                placeholder="Enter official ministry notification text, dates, OM references, and instructions for officers..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--color-border)', fontSize: 13, boxSizing: 'border-box' }}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={() => setActiveTab('circulars')}
                className={styles.btnSecondary}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.btnPrimary}
              >
                <Send size={15} /> Dispatch Broadcast Circular
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
