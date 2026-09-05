import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  Search,
  Plus,
  ChevronRight,
  Download,
  GraduationCap,
  Layers,
  Award,
  X
} from 'lucide-react'
import { listCourses } from '../../api/course.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import styles from './CourseManagementPage.module.css'

export default function CourseManagementPage() {
  const [sourceFilter, setSourceFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newCourse, setNewCourse] = useState({
    title: '',
    source: 'igot',
    durationHours: 15,
    difficulty: 'Intermediate',
    category: 'National Accounts'
  })

  const { data, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => listCourses(),
  })

  const rawCourses = data?.courses || data || []

  // Domain-authentic MoSPI default courses
  const defaultCourses = [
    { _id: 'c-1', title: 'System of National Accounts (SNA 2008) & Sequence of Accounts', source: 'igot', durationHours: 24, difficulty: 'advanced', category: 'National Accounts' },
    { _id: 'c-2', title: 'Multistage Stratified Sampling for NSS & PLFS Round Design', source: 'nssta', durationHours: 36, difficulty: 'advanced', category: 'Sample Surveys' },
    { _id: 'c-3', title: 'Consumer Price Index (CPI) Rural/Urban Basket Compilation', source: 'igot', durationHours: 18, difficulty: 'intermediate', category: 'Price Statistics' },
    { _id: 'c-4', title: 'CAPI & Tablet-based Field Survey Validation Protocols', source: 'nssta', durationHours: 20, difficulty: 'beginner', category: 'Field Survey' },
    { _id: 'c-5', title: 'Input-Output Tables & Supply-Use Framework (SUT) Formulation', source: 'nssta', durationHours: 32, difficulty: 'advanced', category: 'National Accounts' },
    { _id: 'c-6', title: 'Index of Industrial Production (IIP) Base Revision & Weighting Schemes', source: 'igot', durationHours: 16, difficulty: 'intermediate', category: 'Economic Statistics' },
    { _id: 'c-7', title: 'United Nations National Quality Assurance Framework (UN-NQAF) Audit', source: 'nssta', durationHours: 28, difficulty: 'advanced', category: 'Statistical Governance' }
  ]

  const courses = rawCourses.length > 0 ? rawCourses : defaultCourses

  const filtered = courses.filter((c) => {
    const matchesSource = sourceFilter === 'all' || c.source === sourceFilter
    const matchesDifficulty = difficultyFilter === 'all' || (c.difficulty || '').toLowerCase() === difficultyFilter.toLowerCase()
    const matchesSearch = (c.title || '').toLowerCase().includes(search.toLowerCase()) ||
                          (c.category || '').toLowerCase().includes(search.toLowerCase())
    return matchesSource && matchesDifficulty && matchesSearch
  })

  const igotCount = courses.filter((c) => c.source === 'igot').length
  const nsstaCount = courses.filter((c) => c.source === 'nssta').length
  const totalHours = courses.reduce((acc, c) => acc + (c.durationHours || 15), 0)

  const handleExportCSV = () => {
    const headers = 'ID,Course Title,Source,Duration (Hours),Difficulty,Category\n'
    const rows = filtered.map(c => `"${c._id}","${c.title}","${c.source}","${c.durationHours || 15}","${c.difficulty || 'Intermediate'}","${c.category || 'Official Statistics'}"`).join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mospi_course_catalogue_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumb Navigation */}
      <nav className={styles.breadcrumb}>
        <Link to="/dashboard">Dashboard</Link>
        <ChevronRight size={13} />
        <Link to="/admin">Admin Governance</Link>
        <ChevronRight size={13} />
        <span className={styles.breadcrumbActive}>Course Management</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Course Catalogue Management</h1>
          <p className={styles.subtitle}>
            Master repository of civil service digital courses (iGOT Karmayogi) and residential statistical workshops (NSSTA Greater Noida)
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" onClick={handleExportCSV} className={styles.btnSecondary}>
            <Download size={14} /> Export Catalogue CSV
          </button>
          <button type="button" onClick={() => setIsAddModalOpen(true)} className={styles.btnPrimary}>
            <Plus size={15} /> Add Course Entry
          </button>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5' }}>
            <BookOpen size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Total Syllabi</div>
            <div className={styles.kpiValue}>{courses.length} Modules</div>
            <div className={styles.kpiHelper}>{totalHours} Cumulative Learning Hrs</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9' }}>
            <Layers size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>iGOT Karmayogi</div>
            <div className={styles.kpiValue}>{igotCount} Courses</div>
            <div className={styles.kpiHelper}>Online Asynchronous Modules</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <GraduationCap size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>NSSTA Academy</div>
            <div className={styles.kpiValue}>{nsstaCount} Workshops</div>
            <div className={styles.kpiHelper}>In-Person &amp; Hybrid Batches</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <Award size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>AI Recommender</div>
            <div className={styles.kpiValue}>100% Active</div>
            <div className={styles.kpiHelper}>Mapped to MoSPI Competency Matrix</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search courses by title, subject domain, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
        >
          <option value="all">All Sources ({courses.length})</option>
          <option value="igot">iGOT Karmayogi Portal ({igotCount})</option>
          <option value="nssta">NSSTA Greater Noida ({nsstaCount})</option>
        </select>

        <select
          className={styles.filterSelect}
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
        >
          <option value="all">All Difficulty Levels</option>
          <option value="beginner">Foundational (Beginner)</option>
          <option value="intermediate">Operational (Intermediate)</option>
          <option value="advanced">Specialist (Advanced)</option>
        </select>
      </div>

      {/* Table Container */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeaderRow}>
          <div className={styles.tableHeaderTitle}>
            Published Course Inventory
          </div>
          <div className={styles.tableHeaderCount}>
            Showing {filtered.length} of {courses.length} courses
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 'var(--space-6)' }}>
            <Skeleton height="150px" />
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Course Title &amp; Domain</th>
                  <th>Delivery Channel</th>
                  <th>Standard Duration</th>
                  <th>Pedagogical Level</th>
                  <th>Recommender Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {c.title}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        {c.category || 'Official Statistics & Data Governance'}
                      </div>
                    </td>
                    <td>
                      <Badge variant={c.source === 'igot' ? 'igot' : 'nssta'}>
                        {c.source.toUpperCase()}
                      </Badge>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>
                      ⏱ {c.durationHours || 15} Hours
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>
                      <Badge variant={c.difficulty === 'advanced' ? 'high' : c.difficulty === 'intermediate' ? 'medium' : 'low'}>
                        {c.difficulty || 'Intermediate'}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant="success">Active in AI Recommender</Badge>
                    </td>
                    <td>
                      <Link
                        to={`/courses/${c._id}`}
                        style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary-600)', textDecoration: 'none' }}
                      >
                        Inspect Syllabus →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Course Modal */}
      {isAddModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAddModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add New Course Entry</h3>
              <button type="button" className={styles.modalClose} onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Course Title</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g., Seasonal Adjustment of Macroeconomic Time Series (X-13ARIMA)"
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Provider Source</label>
                  <select
                    className={styles.formSelect}
                    value={newCourse.source}
                    onChange={(e) => setNewCourse({ ...newCourse, source: e.target.value })}
                  >
                    <option value="igot">iGOT Karmayogi Portal</option>
                    <option value="nssta">NSSTA Greater Noida</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Estimated Duration (Hours)</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={newCourse.durationHours}
                    onChange={(e) => setNewCourse({ ...newCourse, durationHours: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Pedagogical Difficulty</label>
                  <select
                    className={styles.formSelect}
                    value={newCourse.difficulty}
                    onChange={(e) => setNewCourse({ ...newCourse, difficulty: e.target.value })}
                  >
                    <option value="Beginner">Foundational (Beginner)</option>
                    <option value="Intermediate">Operational (Intermediate)</option>
                    <option value="Advanced">Specialist (Advanced)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>MoSPI Competency Domain</label>
                  <select
                    className={styles.formSelect}
                    value={newCourse.category}
                    onChange={(e) => setNewCourse({ ...newCourse, category: e.target.value })}
                  >
                    <option value="National Accounts">National Accounts (SNA)</option>
                    <option value="Sample Surveys">Sample Surveys &amp; Design</option>
                    <option value="Price Statistics">Price Statistics (CPI/WPI)</option>
                    <option value="Economic Statistics">Economic Statistics (IIP/ASI)</option>
                    <option value="Data Governance">Official Data Governance</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => {
                  if (newCourse.title.trim()) {
                    courses.unshift({
                      _id: `c-custom-${Date.now()}`,
                      ...newCourse
                    })
                    setIsAddModalOpen(false)
                    setNewCourse({
                      title: '',
                      source: 'igot',
                      durationHours: 15,
                      difficulty: 'Intermediate',
                      category: 'National Accounts'
                    })
                  }
                }}
              >
                Publish to Catalogue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
