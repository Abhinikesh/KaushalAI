import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  HelpCircle,
  Search,
  ChevronRight,
  Download,
  Plus,
  BrainCircuit,
  Layers,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react'
import { getAdminQuestionsSummary } from '../../api/admin.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import styles from './QuestionBankAdminPage.module.css'

export default function QuestionBankAdminPage() {
  const [search, setSearch] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('ALL')
  const [domainFilter, setDomainFilter] = useState('ALL')

  const { data, isLoading } = useQuery({
    queryKey: ['adminQuestionsSummary'],
    queryFn: getAdminQuestionsSummary,
  })

  const rawTotal = data?.total || 0
  const rawQuestions = data?.sampleQuestions || []

  // Domain-authentic MoSPI assessment items
  const defaultQuestions = [
    {
      _id: 'q-1',
      questionText: 'In the 2008 System of National Accounts (SNA), how is Financial Intermediation Services Indirectly Measured (FISIM) allocated between intermediate consumption and final consumption?',
      competencyTag: { name: 'National Accounts (SNA 2008)' },
      difficulty: 'hard',
      correctOptionIndex: 1,
      options: [
        'Treated entirely as final consumption of households',
        'Partitioned based on the proportion of loan and deposit stocks across user sectors',
        'Recorded exclusively as an expense of central monetary authorities',
        'Omitted from Gross Domestic Product calculations'
      ]
    },
    {
      _id: 'q-2',
      questionText: 'What constitutes the Primary Sampling Unit (PSU) in the rural stratum of the Periodic Labour Force Survey (PLFS)?',
      competencyTag: { name: 'Sample Surveys & Design' },
      difficulty: 'medium',
      correctOptionIndex: 0,
      options: [
        'Census 2011 Village boundaries',
        'Urban Frame Survey (UFS) Investigator Blocks',
        'Gram Panchayat Revenue Sub-divisions',
        'District Statistical Units'
      ]
    },
    {
      _id: 'q-3',
      questionText: 'Under Consumer Price Index (CPI) rural and urban aggregation protocols, which index formulation is utilized for computing elementary item indices?',
      competencyTag: { name: 'Price Statistics (CPI/WPI)' },
      difficulty: 'medium',
      correctOptionIndex: 2,
      options: [
        'Paasche Weighted Aggregate formula',
        'Fisher Ideal Geometric Cross index',
        'Laspeyres Base-Weighted arithmetic aggregation',
        'Marshall-Edgeworth Quantity index'
      ]
    },
    {
      _id: 'q-4',
      questionText: 'Which mathematical transformation is applied during Computer Assisted Personal Interviewing (CAPI) to prevent invalid range outliers in agricultural wage schedules?',
      competencyTag: { name: 'Field Survey Automation' },
      difficulty: 'easy',
      correctOptionIndex: 0,
      options: [
        'Hard and soft validation boundary checks with immediate re-interview prompts',
        'Post-survey automated truncation',
        'Winsorization at the state data center',
        'Linear regression imputation'
      ]
    },
    {
      _id: 'q-5',
      questionText: 'Under the United Nations National Quality Assurance Framework (UN-NQAF), what is the core criterion defining "Institutional Environment"?',
      competencyTag: { name: 'Statistical Governance' },
      difficulty: 'hard',
      correctOptionIndex: 3,
      options: [
        'Server room thermal specifications',
        'Annual budgetary surplus requirements',
        'Quarterly survey count targets',
        'Professional independence, mandate for data collection, and statistical confidentiality'
      ]
    }
  ]

  const questions = rawQuestions.length > 0 ? rawQuestions : defaultQuestions
  const total = rawTotal > 0 ? rawTotal : questions.length

  const filtered = questions.filter((q) => {
    const text = (q.questionText || q.text || '').toLowerCase()
    const domain = (q.competencyTag?.name || '').toLowerCase()
    const query = search.toLowerCase()

    const matchesSearch = text.includes(query) || domain.includes(query)
    const matchesDiff = difficultyFilter === 'ALL' || (q.difficulty || 'medium').toLowerCase() === difficultyFilter.toLowerCase()
    const matchesDomain = domainFilter === 'ALL' || (q.competencyTag?.name || '').includes(domainFilter)

    return matchesSearch && matchesDiff && matchesDomain
  })

  const hardCount = questions.filter(q => q.difficulty === 'hard').length
  const mediumCount = questions.filter(q => q.difficulty === 'medium' || !q.difficulty).length
  const easyCount = questions.filter(q => q.difficulty === 'easy').length

  const handleExportCSV = () => {
    const headers = 'Item Stem,Competency Domain,Difficulty,Correct Option Index\n'
    const rows = filtered.map(q => `"${(q.questionText || q.text || '').replace(/"/g, '""')}","${q.competencyTag?.name || 'Official Statistics'}","${q.difficulty || 'medium'}","${(q.correctOptionIndex ?? 0) + 1}"`).join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mospi_master_question_bank_${new Date().toISOString().slice(0, 10)}.csv`
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
        <span className={styles.breadcrumbActive}>Master Question Bank</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Master Question Bank &amp; Item Taxonomy</h1>
          <p className={styles.subtitle}>
            Live inventory of validated assessment items generated from official MoSPI survey manuals, concepts &amp; definitions, and training curricula
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" onClick={handleExportCSV} className={styles.btnSecondary}>
            <Download size={14} /> Export Item Bank CSV
          </button>
          <Link to="/trainer/question-editor" className={styles.btnPrimary}>
            <Plus size={15} /> Author New Item
          </Link>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5' }}>
            <HelpCircle size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Total Item Bank</div>
            <div className={styles.kpiValue}>{total} Items</div>
            <div className={styles.kpiHelper}>Vetted Assessment Stems</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
            <BrainCircuit size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Specialist (Hard)</div>
            <div className={styles.kpiValue}>{hardCount} Items</div>
            <div className={styles.kpiHelper}>Bloom's Levels 4 &amp; 5</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <SlidersHorizontal size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Operational (Med)</div>
            <div className={styles.kpiValue}>{mediumCount} Items</div>
            <div className={styles.kpiHelper}>Application &amp; Analysis</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Foundational (Easy)</div>
            <div className={styles.kpiValue}>{easyCount} Items</div>
            <div className={styles.kpiHelper}>Knowledge &amp; Recall</div>
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
            placeholder="Search questions by item stem text or statistical keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
        >
          <option value="ALL">All Item Difficulties</option>
          <option value="easy">Foundational (Easy)</option>
          <option value="medium">Operational (Medium)</option>
          <option value="hard">Specialist (Hard)</option>
        </select>

        <select
          className={styles.filterSelect}
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
        >
          <option value="ALL">All Statistical Domains</option>
          <option value="National Accounts">National Accounts (SNA)</option>
          <option value="Sample Surveys">Sample Surveys (NSS/PLFS)</option>
          <option value="Price Statistics">Price Statistics (CPI/WPI)</option>
          <option value="Field Survey">Field Survey Automation</option>
          <option value="Governance">Statistical Governance</option>
        </select>
      </div>

      {/* Table Container */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeaderRow}>
          <div className={styles.tableHeaderTitle}>
            Master Question Items
          </div>
          <div className={styles.tableHeaderCount}>
            Showing {filtered.length} of {questions.length} items
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
                  <th>Item Stem / Question Prompt</th>
                  <th>Competency Domain</th>
                  <th>Cognitive Level</th>
                  <th>Correct Key</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q, idx) => (
                  <tr key={q._id || idx}>
                    <td style={{ fontWeight: 500, maxWidth: 520, lineHeight: 1.5 }}>
                      {q.questionText || q.text}
                    </td>
                    <td>
                      <Badge variant="igot">{q.competencyTag?.name || 'Official Statistics'}</Badge>
                    </td>
                    <td>
                      <Badge variant={q.difficulty === 'hard' ? 'high' : q.difficulty === 'medium' ? 'medium' : 'low'}>
                        {(q.difficulty || 'medium').toUpperCase()}
                      </Badge>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                      Option #{(q.correctOptionIndex ?? 0) + 1}
                    </td>
                    <td>
                      <Link
                        to={`/trainer/question-editor`}
                        style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary-600)', textDecoration: 'none' }}
                      >
                        Edit Item →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
