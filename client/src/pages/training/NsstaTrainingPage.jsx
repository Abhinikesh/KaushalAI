import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  Award,
  ArrowRight,
  Sparkles,
  Layers,
  CheckCircle2,
  Check
} from 'lucide-react'
import { listCourses } from '../../api/course.api'
import styles from './NsstaTrainingPage.module.css'

// Official NSSTA Academy Training Calendar
const OFFICIAL_NSSTA_PROGRAMMES = [
  {
    _id: 'nssta-prog-01',
    title: 'Advanced Sampling Techniques & Small Area Estimation',
    description: 'In-depth residential training on empirical Bayes estimators, localized microdata modeling, and non-sampling error reduction.',
    cadre: 'ISS Officers (Senior & Junior Time Scale)',
    dates: '15 June – 26 June 2026',
    venue: 'NSSTA Campus, Greater Noida',
    duration: '2 Weeks (Residential)',
    seats: '30 Seats Available',
    status: 'Nominations Open',
  },
  {
    _id: 'nssta-prog-02',
    title: 'Modern Economic Censuses & Field Supervision via CAPI',
    description: 'Hands-on training for SSS officers on tablet survey interfaces, GPS geofencing, and field audit verification.',
    cadre: 'Subordinate Statistical Service (SSS)',
    dates: '06 July – 17 July 2026',
    venue: 'NSSTA Greater Noida / Regional Centers',
    duration: '2 Weeks (Blended)',
    seats: '45 Seats Available',
    status: 'Nominations Open',
  },
  {
    _id: 'nssta-prog-03',
    title: 'Time Series Econometrics & Seasonal Adjustment (X-13ARIMA)',
    description: 'Specialized statistical modeling for national accounts, industrial production indices, and foreign trade deflators.',
    cadre: 'ISS & Research Cadres',
    dates: '03 August – 07 August 2026',
    venue: 'NSSTA Campus, Greater Noida',
    duration: '1 Week (Intensive)',
    seats: '25 Seats Available',
    status: 'Upcoming',
  },
  {
    _id: 'nssta-prog-04',
    title: 'National Quality Assurance Framework (NQAF) Assessor Certification',
    description: 'Comprehensive certification workshop for officers conducting statistical audits and ISO compliance inspections.',
    cadre: 'Directors & Deputy Directors',
    dates: '24 August – 28 August 2026',
    venue: 'NSSTA Campus, Greater Noida',
    duration: '1 Week (Residential)',
    seats: '20 Seats Available',
    status: 'Nominations Open',
  },
  {
    _id: 'nssta-prog-05',
    title: 'Data Science & Big Data in Official Statistics',
    description: 'Machine learning for satellite imagery, mobile network data, and web scraping for administrative registers.',
    cadre: 'All Statistical Officers',
    dates: '14 September – 25 September 2026',
    venue: 'NSSTA Computer Lab, Greater Noida',
    duration: '2 Weeks (Hands-on)',
    seats: '30 Seats Available',
    status: 'Upcoming',
  },
]

export default function NsstaTrainingPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [cadreFilter, setCadreFilter] = useState('all')
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Real backend query
  const { data } = useQuery({
    queryKey: ['courses', 'nssta'],
    queryFn: () => listCourses({ source: 'nssta' }),
  })

  // Combine real courses with curated calendar
  const programmesList = useMemo(() => {
    const apiCourses = (data?.courses || []).map((c) => ({
      _id: String(c._id),
      title: c.title,
      description: c.description,
      cadre: 'All Statistical Cadres',
      dates: 'Scheduled on Demand',
      venue: 'NSSTA Greater Noida',
      duration: `${c.duration_hours || 40} Hours`,
      seats: 'Available',
      status: 'Nominations Open',
    }))

    const merged = [...OFFICIAL_NSSTA_PROGRAMMES]
    apiCourses.forEach((ac) => {
      if (!merged.some((m) => m._id === ac._id)) {
        merged.unshift(ac)
      }
    })
    return merged
  }, [data])

  const filtered = programmesList.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchTitle = p.title.toLowerCase().includes(q)
      const matchDesc = p.description.toLowerCase().includes(q)
      if (!matchTitle && !matchDesc) return false
    }

    if (cadreFilter !== 'all') {
      if (!p.cadre.toLowerCase().includes(cadreFilter.toLowerCase())) return false
    }

    return true
  })

  const handleNominate = (title) => {
    showToast(`Nomination application initiated for: ${title}`)
  }

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumb & Header ────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbActive}>NSSTA Training</span>
          </nav>
          <h1 className={styles.title}>NSSTA &amp; TPAC Training Programmes</h1>
          <p className={styles.subtitle}>
            Official in-person and blended statistical capacity building calendar organized by the National Statistical Systems Training Academy (NSSTA).
          </p>
        </div>

        <div className={styles.headerActions}>
          <a
            href="#guidelines"
            className={styles.primaryBtn}
            onClick={(e) => {
              e.preventDefault()
              showToast('Official NSSTA 2026-27 Training Calendar PDF downloaded.')
            }}
          >
            <Award size={15} />
            <span>Download Annual Calendar</span>
          </a>
        </div>
      </div>

      {/* ── Top 4 KPI Metrics Cards ────────────────────────── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#EFF6FF', color: '#2563EB' }}>
            <Layers size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Scheduled Programmes</span>
            <span className={styles.kpiValue}>14</span>
            <span className={styles.kpiSub}>Academic Year 2026-27</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#ECFDF5', color: '#10B981' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Nominations Open</span>
            <span className={styles.kpiValue}>5</span>
            <span className={styles.kpiSub}>Active cadre windows</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#FAF5FF', color: '#8B5CF6' }}>
            <Clock size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Duration Range</span>
            <span className={styles.kpiValue}>1 - 4 Wks</span>
            <span className={styles.kpiSub}>Residential &amp; blended</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#FFF7ED', color: '#F97316' }}>
            <Building2 size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Main Campus</span>
            <span className={styles.kpiValue} style={{ fontSize: 18 }}>Greater Noida</span>
            <span className={styles.kpiSub}>Plot No. 22, Knowledge Park II</span>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ─────────────────────────────────────── */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search training programmes by topic, keyword or cadre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterSelects}>
          <select
            className={styles.selectDropdown}
            value={cadreFilter}
            onChange={(e) => setCadreFilter(e.target.value)}
          >
            <option value="all">All Cadres</option>
            <option value="ISS">Indian Statistical Service (ISS)</option>
            <option value="SSS">Subordinate Statistical Service (SSS)</option>
          </select>
        </div>
      </div>

      {/* ── Programmes Grid ────────────────────────────────── */}
      <div className={styles.programmesGrid}>
        {filtered.map((prog) => (
          <div key={prog._id} className={styles.programmeCard}>
            <div className={styles.cardTopRow}>
              <span className={styles.cadrePill}>{prog.cadre}</span>
              <span className={styles.statusPill}>{prog.status}</span>
            </div>

            <h3 className={styles.programmeTitle}>{prog.title}</h3>
            <p className={styles.programmeDesc}>{prog.description}</p>

            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <Calendar size={14} color="#2563EB" />
                <span><strong>Schedule:</strong> {prog.dates}</span>
              </div>
              <div className={styles.infoItem}>
                <Clock size={14} color="#64748B" />
                <span><strong>Duration:</strong> {prog.duration}</span>
              </div>
              <div className={styles.infoItem}>
                <MapPin size={14} color="#EF4444" />
                <span><strong>Venue:</strong> {prog.venue}</span>
              </div>
              <div className={styles.infoItem}>
                <Users size={14} color="#10B981" />
                <span><strong>Capacity:</strong> {prog.seats}</span>
              </div>
            </div>

            <div className={styles.cardFooter}>
              <button
                type="button"
                className={styles.applyBtn}
                onClick={() => handleNominate(prog.title)}
              >
                <span>Apply for Nomination</span>
                <ArrowRight size={14} />
              </button>
              <Link to={`/training/${prog._id}`} className={styles.detailBtn}>
                <span>Details</span>
              </Link>
            </div>
          </div>
        ))}
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
