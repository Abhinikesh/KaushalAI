import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  Users,
  Clock,
  Award,
  ArrowRight,
  TrendingUp,
  Search,
  Plus,
  Layers,
  Sparkles,
  Calendar,
  CheckCircle2
} from 'lucide-react'
import { listCourses } from '../../api/course.api'
import styles from './MyProgrammesPage.module.css'

const DEFAULT_TRAINER_PROGRAMMES = [
  {
    _id: 'tr-prog-01',
    title: 'Data Analysis & Manipulation with Python',
    description: 'Pandas data frames, data imputation, filtering, and statistical summaries of sample survey datasets.',
    source: 'iGOT Karmayogi',
    cadre: 'ISS / SSS Officers',
    learners: 64,
    completed: 52,
    completionRate: 81,
    avgScore: 82,
    durationHours: 12.0,
    status: 'Active',
  },
  {
    _id: 'tr-prog-02',
    title: 'Official Statistics & National Quality Assurance (NQAF)',
    description: 'Auditing standards, metadata schemas, and ISO 11179 compliance across MoSPI data divisions.',
    source: 'NSSTA Greater Noida',
    cadre: 'Directors & SSOs',
    learners: 48,
    completed: 38,
    completionRate: 79,
    avgScore: 78,
    durationHours: 10.0,
    status: 'Active',
  },
  {
    _id: 'tr-prog-03',
    title: 'Survey Sampling & Small Area Estimation',
    description: 'Empirical Bayes estimators, localized microdata modeling, and non-sampling error controls.',
    source: 'NSSTA Residential',
    cadre: 'Junior Time Scale ISS',
    learners: 28,
    completed: 20,
    completionRate: 71,
    avgScore: 72,
    durationHours: 14.5,
    status: 'Active',
  },
  {
    _id: 'tr-prog-04',
    title: 'Executive Dashboard Development in Power BI',
    description: 'Transforming MoSPI monthly releases into interactive public dashboards with DAX metrics.',
    source: 'iGOT Karmayogi',
    cadre: 'All Cadres',
    learners: 35,
    completed: 27,
    completionRate: 77,
    avgScore: 75,
    durationHours: 6.0,
    status: 'Active',
  },
]

export default function MyProgrammesPage() {
  const [activeTab, setActiveTab] = useState('All Programmes')
  const [searchQuery, setSearchQuery] = useState('')

  const { data } = useQuery({
    queryKey: ['courses'],
    queryFn: () => listCourses(),
  })

  const programmes = useMemo(() => {
    const apiCourses = (data?.courses || []).map((c) => ({
      _id: String(c._id),
      title: c.title,
      description: c.description,
      source: c.source === 'nssta' ? 'NSSTA Greater Noida' : 'iGOT Karmayogi',
      cadre: 'Official Statistics Cadre',
      learners: 32,
      completed: 26,
      completionRate: 80,
      avgScore: 81,
      durationHours: c.duration_hours || 8,
      status: 'Active',
    }))

    const merged = [...DEFAULT_TRAINER_PROGRAMMES]
    apiCourses.forEach((ac) => {
      if (!merged.some((m) => m._id === ac._id)) {
        merged.unshift(ac)
      }
    })
    return merged
  }, [data])

  const filtered = useMemo(() => {
    return programmes.filter((p) => {
      if (activeTab === 'NSSTA Residential' && !p.source.includes('NSSTA')) return false
      if (activeTab === 'iGOT Karmayogi' && !p.source.includes('iGOT')) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = p.title.toLowerCase().includes(q)
        const matchDesc = p.description.toLowerCase().includes(q)
        if (!matchTitle && !matchDesc) return false
      }

      return true
    })
  }, [programmes, activeTab, searchQuery])

  const totalLearners = programmes.reduce((acc, p) => acc + p.learners, 0)
  const avgCompletion = Math.round(programmes.reduce((acc, p) => acc + p.completionRate, 0) / programmes.length) || 80
  const totalHours = Math.round(programmes.reduce((acc, p) => acc + p.durationHours, 0))

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumb & Header ────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link to="/trainer/dashboard" className={styles.breadcrumbLink}>Trainer Portal</Link>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbActive}>Training Programmes</span>
          </nav>
          <h1 className={styles.title}>My Training Programmes</h1>
          <p className={styles.subtitle}>
            Manage residential workshops, curriculum syllabus, enrolled officer cohorts, and learning effectiveness.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link to="/trainer/programmes/new" className={styles.primaryBtn}>
            <Plus size={15} />
            <span>Create New Programme</span>
          </Link>
        </div>
      </div>

      {/* ── Top 4 KPI Metrics Cards ────────────────────────── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#EFF6FF', color: '#2563EB' }}>
            <BookOpen size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Active Programmes</span>
            <span className={styles.kpiValue}>{programmes.length}</span>
            <span className={styles.kpiSub}>Under supervision</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#ECFDF5', color: '#10B981' }}>
            <Users size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Total Enrolled Learners</span>
            <span className={styles.kpiValue}>{totalLearners}</span>
            <span className={styles.kpiSub}>Statistical officers</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#FAF5FF', color: '#8B5CF6' }}>
            <TrendingUp size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Avg. Completion Rate</span>
            <span className={styles.kpiValue}>{avgCompletion}%</span>
            <span className={styles.kpiSub}>Cohort performance</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: '#FFF7ED', color: '#F97316' }}>
            <Clock size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Total Hours Delivered</span>
            <span className={styles.kpiValue}>{totalHours}h</span>
            <span className={styles.kpiSub}>Logged training credits</span>
          </div>
        </div>
      </div>

      {/* ── Tabs Bar ───────────────────────────────────────── */}
      <div className={styles.tabsContainer}>
        {['All Programmes', 'NSSTA Residential', 'iGOT Karmayogi'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tabItem} ${activeTab === tab ? styles.tabItemActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Programmes Grid ────────────────────────────────── */}
      <div className={styles.programmesGrid}>
        {filtered.map((prog) => (
          <div key={prog._id} className={styles.progCard}>
            <div className={styles.cardTopRow}>
              <span className={styles.sourceBadge}>{prog.source}</span>
              <span className={styles.cadreBadge}>{prog.cadre}</span>
            </div>

            <h3 className={styles.progTitle}>{prog.title}</h3>
            <p className={styles.progDesc}>{prog.description}</p>

            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <Users size={14} color="#2563EB" />
                <span>{prog.learners} Enrolled</span>
              </div>
              <div className={styles.metaItem}>
                <Clock size={14} color="#64748B" />
                <span>{prog.durationHours}h Duration</span>
              </div>
              <div className={styles.metaItem}>
                <CheckCircle2 size={14} color="#10B981" />
                <span>{prog.completionRate}% Completion</span>
              </div>
              <div className={styles.metaItem}>
                <Award size={14} color="#8B5CF6" />
                <span>{prog.avgScore}% Avg Score</span>
              </div>
            </div>

            <div className={styles.cardFooter}>
              <Link to={`/trainer/programmes/${prog._id}`} className={styles.manageBtn}>
                <span>Manage Programme</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
