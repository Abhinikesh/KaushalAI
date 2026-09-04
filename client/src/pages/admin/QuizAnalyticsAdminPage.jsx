import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart2,
  ChevronRight,
  Printer,
  Download,
  Award,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileText
} from 'lucide-react'
import Badge from '../../components/ui/Badge'
import styles from './QuizAnalyticsAdminPage.module.css'

export default function QuizAnalyticsAdminPage() {
  const [activeTab, setActiveTab] = useState('items')

  // Classical test theory item metrics
  const itemMetrics = [
    {
      code: 'ITEM-SMP-01',
      stem: 'Stratified Sampling: Allocation of Sample Size via Neyman Formula',
      domain: 'Survey Sampling',
      difficulty: 0.82,
      discrimination: 0.44,
      reliability: 0.86,
      status: 'Optimal Calibration',
    },
    {
      code: 'ITEM-SNA-04',
      stem: 'Supply-Use Tables: Basic Prices to Purchaser Prices Transition',
      domain: 'National Accounts',
      difficulty: 0.65,
      discrimination: 0.52,
      reliability: 0.89,
      status: 'High Discrimination',
    },
    {
      code: 'ITEM-CPI-02',
      stem: 'Laspeyres Index Aggregation: Geometric Mean Weights Formula',
      domain: 'Price Statistics',
      difficulty: 0.74,
      discrimination: 0.41,
      reliability: 0.84,
      status: 'Optimal Calibration',
    },
    {
      code: 'ITEM-NQA-05',
      stem: 'UN-NQAF Principle 4: Statistical Confidentiality & Public Trust',
      domain: 'Data Quality & NQAF',
      difficulty: 0.91,
      discrimination: 0.28,
      reliability: 0.78,
      status: 'Too Easy (Low Discrimination)',
    },
    {
      code: 'ITEM-CMP-03',
      stem: 'Pandas Vectorized Groupby vs Merge for Survey Microdata',
      domain: 'Computational Stats',
      difficulty: 0.58,
      discrimination: 0.49,
      reliability: 0.88,
      status: 'Challenging (Strong Discriminator)',
    },
  ]

  // Distractor analysis
  const distractorData = [
    {
      code: 'ITEM-SNA-04',
      correctKey: 'C',
      topQuartile: { A: '4%', B: '2%', C: '90%', D: '4%' },
      bottomQuartile: { A: '28%', B: '22%', C: '34%', D: '16%' },
      verdict: 'Option A and B are highly functioning distractors pulling from bottom quartile.',
    },
    {
      code: 'ITEM-SMP-01',
      correctKey: 'B',
      topQuartile: { A: '1%', B: '96%', C: '2%', D: '1%' },
      bottomQuartile: { A: '24%', B: '52%', C: '14%', D: '10%' },
      verdict: 'Excellent distractor balance across lower scoring candidates.',
    },
  ]

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Item Code,Question Stem,Domain,Difficulty (p-value),Discrimination (r-pb),Status"].concat(
        itemMetrics.map(i => `"${i.code}","${i.stem}","${i.domain}",${i.difficulty},${i.discrimination},"${i.status}"`)
      ).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `MoSPI_Psychometric_Item_Analytics.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumb Navigation */}
      <nav className={styles.breadcrumb}>
        <Link to="/dashboard">Dashboard</Link>
        <ChevronRight size={13} />
        <Link to="/admin">Admin Governance</Link>
        <ChevronRight size={13} />
        <span className={styles.breadcrumbActive}>Quiz &amp; Psychometric Analytics</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Executive Psychometric &amp; Item Discrimination Analytics</h1>
          <p className={styles.subtitle}>
            Classical test theory metrics, item difficulty distribution (p-values), point-biserial discrimination indices, and distractor efficiency analysis across national exams
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" onClick={handleExportCSV} className={styles.btnSecondary}>
            <Download size={15} /> Export Item Diagnostics (CSV)
          </button>
          <button type="button" onClick={() => window.print()} className={styles.btnPrimary}>
            <Printer size={15} /> Print Psychometric Report
          </button>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5' }}>
            <FileText size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Calibrated Items</div>
            <div className={styles.kpiValue}>142 Items</div>
            <div className={styles.kpiHelper}>In Active Master Bank</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <Sliders size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Mean Discrimination</div>
            <div className={styles.kpiValue}>0.44 r-pb</div>
            <div className={styles.kpiHelper}>Standard threshold &ge; 0.30</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <Award size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Cronbach's Alpha (Reliability)</div>
            <div className={styles.kpiValue}>0.88</div>
            <div className={styles.kpiHelper}>High Internal Consistency</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Distractor Efficiency</div>
            <div className={styles.kpiValue}>94.2%</div>
            <div className={styles.kpiHelper}>Non-defective distractor options</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'items' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('items')}
        >
          <BarChart2 size={16} /> Item Difficulty &amp; Discrimination Registry
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'distractors' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('distractors')}
        >
          <Sliders size={16} /> Distractor Efficiency &amp; Option Breakdown
        </button>
      </div>

      {/* Panels */}
      {activeTab === 'items' && (
        <div className={styles.panelCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
              Classical Test Theory (CTT) Item Parameter Calibration
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              p-value range 0.40 - 0.85 considered optimal
            </span>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Question Concept Stem</th>
                  <th>Domain</th>
                  <th>Difficulty (p-value)</th>
                  <th>Point-Biserial (r-pb)</th>
                  <th>Psychometric Calibration</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {itemMetrics.map((item) => (
                  <tr key={item.code}>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary-600)' }}>{item.code}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.stem}</td>
                    <td>
                      <Badge variant="igot">{item.domain}</Badge>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700 }}>{item.difficulty}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--color-text-secondary)', marginLeft: 4 }}>
                        ({Math.round(item.difficulty * 100)}% correct)
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: item.discrimination >= 0.40 ? 'var(--color-success)' : 'var(--color-primary-600)' }}>
                        {item.discrimination}
                      </span>
                    </td>
                    <td>
                      <Badge variant={item.status.includes('Optimal') ? 'success' : item.status.includes('High') ? 'success' : 'high'}>
                        {item.status}
                      </Badge>
                    </td>
                    <td>
                      <Link
                        to="/trainer/question-bank"
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
        </div>
      )}

      {activeTab === 'distractors' && (
        <div className={styles.panelCard}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
            Distractor Response Patterns: Upper vs Lower Candidate Quartiles
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {distractorData.map((d, i) => (
              <div key={i} style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary-600)' }}>{d.code}</span>
                  <Badge variant="success">Correct Key: Option {d.correctKey}</Badge>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                  <div style={{ background: 'var(--color-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 6 }}>
                      Top Quartile Candidates (&ge; 85% score)
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 13, fontWeight: 600 }}>
                      <span>A: {d.topQuartile.A}</span>
                      <span>B: {d.topQuartile.B}</span>
                      <span style={{ color: 'var(--color-success)' }}>C*: {d.topQuartile.C}</span>
                      <span>D: {d.topQuartile.D}</span>
                    </div>
                  </div>

                  <div style={{ background: 'var(--color-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 6 }}>
                      Bottom Quartile Candidates (&lt; 65% score)
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: '#EF4444' }}>A: {d.bottomQuartile.A}</span>
                      <span style={{ color: '#EF4444' }}>B: {d.bottomQuartile.B}</span>
                      <span style={{ color: 'var(--color-success)' }}>C*: {d.bottomQuartile.C}</span>
                      <span>D: {d.bottomQuartile.D}</span>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                  <strong>Pedagogical Analysis:</strong> {d.verdict}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
