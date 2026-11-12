import React, { useState, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart2,
  ChevronRight,
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  Database,
  Layers,
  Activity,
  TrendingUp,
  Download,
  RefreshCw,
  Sparkles,
  Info,
  CheckCircle2,
  Table,
  Sliders,
  HelpCircle,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ScatterChart,
  Scatter,
  Line,
} from 'recharts'
import {
  uploadDatasetForAnalysis,
  listExcelSheets,
  runRegressionAnalysis,
  runHypothesisTest,
} from '../../api/statisticalAnalysis.api'
import styles from './StatisticalAnalysisPage.module.css'

export default function StatisticalAnalysisPage() {
  const [file, setFile] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisData, setAnalysisData] = useState(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  // Excel sheet selection state
  const [xlsxSheets, setXlsxSheets] = useState(null)      // { sheetNames, defaultSheet }
  const [xlsxPendingFile, setXlsxPendingFile] = useState(null)
  const [selectedSheet, setSelectedSheet] = useState('')
  const [loadingSheets, setLoadingSheets] = useState(false)

  // Descriptive state
  const [selectedColumn, setSelectedColumn] = useState('')

  // Regression state
  const [regXCol, setRegXCol] = useState('')
  const [regYCol, setRegYCol] = useState('')
  const [regressionData, setRegressionData] = useState(null)
  const [runningReg, setRunningReg] = useState(false)

  // Hypothesis test state
  const [hypoType, setHypoType] = useState('one_sample')
  const [hypoCol, setHypoCol] = useState('')
  const [hypoMu0, setHypoMu0] = useState('0')
  const [hypoCol2, setHypoCol2] = useState('')
  const [hypoAlternative, setHypoAlternative] = useState('two-sided')
  const [hypoAlpha, setHypoAlpha] = useState('0.05')
  const [hypoResult, setHypoResult] = useState(null)
  const [runningHypo, setRunningHypo] = useState(false)

  const fileInputRef = useRef(null)

  const isXlsx = (f) => f && (f.name || '').toLowerCase().endsWith('.xlsx')

  // Handle file select
  const handleFileChange = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setError('')
    setXlsxSheets(null)
    setXlsxPendingFile(null)

    if (isXlsx(f)) {
      // For xlsx: first list sheets, then let user pick before full analysis
      setLoadingSheets(true)
      try {
        const sheetsData = await listExcelSheets(f)
        if (sheetsData.sheetNames && sheetsData.sheetNames.length > 1) {
          // Multiple sheets: show selector
          setXlsxSheets(sheetsData)
          setSelectedSheet(sheetsData.defaultSheet)
          setXlsxPendingFile(f)
        } else {
          // Single sheet: proceed directly
          await processDataset(f, false, { sheetName: sheetsData.defaultSheet })
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to read Excel workbook.')
      } finally {
        setLoadingSheets(false)
      }
    } else {
      processDataset(f, null)
    }
  }

  // Handle user confirming sheet selection
  const handleSheetConfirm = async () => {
    if (!xlsxPendingFile || !selectedSheet) return
    setXlsxSheets(null)
    setXlsxPendingFile(null)
    await processDataset(xlsxPendingFile, false, { sheetName: selectedSheet })
  }

  // Process dataset upload or sample
  const processDataset = async (uploadedFile, useSample = false, options = {}) => {
    setAnalyzing(true)
    setError('')
    setRegressionData(null)
    setHypoResult(null)
    try {
      let res
      if (useSample) {
        res = await uploadDatasetForAnalysis(null, { useSample: true })
        setFile({ name: res.filename, size: 1024 })
      } else {
        res = await uploadDatasetForAnalysis(uploadedFile, options)
      }

      setAnalysisData(res)

      const headers = res.metadata?.headers || []
      const numericCols = headers.filter((h) => res.metadata.columnTypes[h] === 'numeric')

      if (headers.length > 0) setSelectedColumn(numericCols[0] || headers[0])
      if (numericCols.length >= 2) {
        setRegXCol(numericCols[0])
        setRegYCol(numericCols[1])
        setHypoCol(numericCols[0])
        setHypoCol2(numericCols[1])
      } else if (numericCols.length === 1) {
        setHypoCol(numericCols[0])
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to analyze dataset.')
    } finally {
      setAnalyzing(false)
    }
  }

  // Build raw CSV from analysisData (using all rows from metadata, only 10 in sampleRows)
  // The backend will re-parse this for regression/hypothesis endpoints
  const buildCsvFromSampleRows = () => {
    if (!analysisData) return ''
    const headers = analysisData.metadata.headers
    const rows = [headers.join(',')]
    for (const row of (analysisData.sampleRows || [])) {
      const vals = headers.map((h) => {
        const val = String(row[h] ?? '')
        return val.includes(',') ? `"${val}"` : val
      })
      rows.push(vals.join(','))
    }
    return rows.join('\n')
  }

  // Handle regression computation
  const handleComputeRegression = async () => {
    if (!analysisData || !regXCol || !regYCol) return
    setRunningReg(true)
    try {
      const rawCsv = buildCsvFromSampleRows()
      const res = await runRegressionAnalysis({ csvText: rawCsv, xCol: regXCol, yCol: regYCol })
      setRegressionData(res.regression)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Regression failed.')
    } finally {
      setRunningReg(false)
    }
  }

  // Handle hypothesis test computation
  const handleComputeHypothesis = async () => {
    if (!analysisData || !hypoCol) return
    setRunningHypo(true)
    try {
      const rawCsv = buildCsvFromSampleRows()
      const alphaNum = parseFloat(hypoAlpha)
      const res = await runHypothesisTest({
        csvText: rawCsv,
        testType: hypoType,
        column: hypoCol,
        hypothesizedMean: hypoType === 'one_sample' ? (parseFloat(hypoMu0) || 0) : undefined,
        column2: hypoType === 'two_sample_columns' ? hypoCol2 : undefined,
        alternative: hypoAlternative,
        alpha: Number.isFinite(alphaNum) && alphaNum > 0 && alphaNum < 1 ? alphaNum : 0.05,
      })
      setHypoResult(res.testResult)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Hypothesis test failed.')
    } finally {
      setRunningHypo(false)
    }
  }

  // Download analysis summary
  const handleExportJson = () => {
    if (!analysisData) return
    const blob = new Blob([JSON.stringify(analysisData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `statistical_analysis_${(analysisData.filename || 'report').replace(/\.[^.]+$/, '')}.json`
    a.click()
  }

  const numericHeaders = useMemo(() => {
    if (!analysisData?.metadata?.headers) return []
    return analysisData.metadata.headers.filter(
      (h) => analysisData.metadata.columnTypes[h] === 'numeric'
    )
  }, [analysisData])

  const currentColStats = useMemo(() => {
    if (!analysisData?.statistics || !selectedColumn) return null
    return analysisData.statistics[selectedColumn]
  }, [analysisData, selectedColumn])

  const formatDelimiter = (d) => {
    if (d === 'xlsx') return 'Excel (.xlsx)'
    if (d === '\t') return 'TSV (Tab)'
    return `CSV (${d})`
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumb Navigation */}
      <nav className={styles.breadcrumb}>
        <Link to="/dashboard">Dashboard</Link>
        <ChevronRight size={13} />
        <Link to="/my-learning">Learning Hub</Link>
        <ChevronRight size={13} />
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>Statistical Analysis</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Statistical Analysis &amp; Data Inspection Hub</h1>
        <p className={styles.subtitle}>
          Upload a CSV, TSV, or Excel (.xlsx) dataset to inspect distributions, evaluate descriptive metrics, compute correlation matrices, and verify hypotheses.
        </p>
      </div>

      {/* Dataset Upload & Sample Loader Card */}
      <div className={styles.uploadSection}>
        <div
          className={`${styles.dropzone} ${file ? styles.dropzoneActive : ''}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,.tsv,.txt,.xlsx"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <FileSpreadsheet size={36} color="var(--color-primary-600)" />
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {loadingSheets ? 'Reading workbook sheets...' : file ? file.name : 'Click to upload dataset (CSV, TSV, or Excel .xlsx — up to 10 MB)'}
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            In-memory processing — datasets are never stored on disk. Automatic delimiter and type detection.
          </p>
        </div>

        {/* Excel sheet selector */}
        {xlsxSheets && (
          <div style={{ marginTop: 12, padding: '14px 16px', background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
              This workbook has multiple sheets. Choose one to analyse:
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className={styles.select}
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
              >
                {xlsxSheets.sheetNames.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button type="button" onClick={handleSheetConfirm} className={styles.btnPrimary}>
                Analyse Sheet
              </button>
              <button
                type="button"
                onClick={() => { setXlsxSheets(null); setXlsxPendingFile(null); setFile(null) }}
                className={styles.btnSecondary}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className={styles.uploadActions}>
          <button
            type="button"
            onClick={() => processDataset(null, true)}
            disabled={analyzing}
            className={styles.btnSecondary}
          >
            <Sparkles size={15} color="var(--color-primary-600)" />
            {analyzing ? 'Loading Sample...' : 'Load MoSPI CPI & Consumption Sample'}
          </button>

          {analysisData && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={handleExportJson}
                className={styles.btnSecondary}
              >
                <Download size={14} /> Export Report (JSON)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAnalysisData(null)
                  setFile(null)
                  setError('')
                  setXlsxSheets(null)
                }}
                className={styles.btnSecondary}
              >
                Clear Dataset
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {analysisData && (
        <>
          {/* Excel sheet indicator */}
          {analysisData.fileType === 'xlsx' && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                <strong>Sheet:</strong> {analysisData.selectedSheet}
                {analysisData.availableSheets?.length > 1 && (
                  <span style={{ marginLeft: 8, color: 'var(--color-text-tertiary)' }}>
                    ({analysisData.availableSheets.length} sheets available)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* KPI Summary Cards */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: 'color-mix(in srgb, var(--color-primary-600) 10%, transparent)', color: 'var(--color-primary-600)' }}>
                <Database size={20} />
              </div>
              <div>
                <div className={styles.kpiLabel}>Observations (Rows)</div>
                <div className={styles.kpiValue}>{analysisData.metadata.rowCount.toLocaleString()}</div>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9' }}>
                <Layers size={20} />
              </div>
              <div>
                <div className={styles.kpiLabel}>Variables (Columns)</div>
                <div className={styles.kpiValue}>{analysisData.metadata.columnCount} ({numericHeaders.length} Numeric)</div>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: analysisData.metadata.totalMissingCells > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: analysisData.metadata.totalMissingCells > 0 ? '#F59E0B' : '#10B981' }}>
                <Activity size={20} />
              </div>
              <div>
                <div className={styles.kpiLabel}>Missing Data</div>
                <div className={styles.kpiValue}>{analysisData.metadata.totalMissingCells} ({analysisData.metadata.missingCellsPercentage}%)</div>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#9333ea' }}>
                <Sliders size={20} />
              </div>
              <div>
                <div className={styles.kpiLabel}>File Format</div>
                <div className={styles.kpiValue}>{formatDelimiter(analysisData.metadata.delimiter)}</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className={styles.tabsContainer}>
            <button type="button" className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('overview')}>
              <Table size={15} /> Dataset Overview &amp; Preview
            </button>
            <button type="button" className={`${styles.tabBtn} ${activeTab === 'descriptive' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('descriptive')}>
              <BarChart2 size={15} /> Descriptive Statistics
            </button>
            <button type="button" className={`${styles.tabBtn} ${activeTab === 'correlation' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('correlation')}>
              <TrendingUp size={15} /> Correlation &amp; Regression
            </button>
            <button type="button" className={`${styles.tabBtn} ${activeTab === 'hypothesis' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('hypothesis')}>
              <HelpCircle size={15} /> Parametric Hypothesis Testing
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className={styles.workspaceCard}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                Variable Schema &amp; Data Types
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Column Index</th>
                      <th>Column Name</th>
                      <th>Inferred Data Type</th>
                      <th>Valid Records</th>
                      <th>Missing Count</th>
                      <th>Missing %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisData.metadata.headers.map((h, idx) => {
                      const type = analysisData.metadata.columnTypes[h]
                      const stats = analysisData.statistics[h]
                      let badgeClass = styles.badgeNumeric
                      if (type === 'categorical') badgeClass = styles.badgeCategorical
                      if (type === 'date') badgeClass = styles.badgeDate
                      if (type === 'boolean') badgeClass = styles.badgeBoolean

                      return (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td style={{ fontWeight: 600 }}>{h}</td>
                          <td>
                            <span className={`${styles.badge} ${badgeClass}`}>
                              {type.toUpperCase()}
                            </span>
                          </td>
                          <td>{stats?.validCount ?? '—'}</td>
                          <td>{stats?.missingCount ?? 0}</td>
                          <td>{stats?.missingPercentage ?? 0}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginTop: 28, marginBottom: 8 }}>
                First 10 Data Rows Preview
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      {analysisData.metadata.headers.map((h, i) => (
                        <th key={i}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analysisData.sampleRows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        <td style={{ color: 'var(--color-text-secondary)', fontSize: 11.5 }}>{rIdx + 1}</td>
                        {analysisData.metadata.headers.map((h, cIdx) => (
                          <td key={cIdx}>{row[h] !== '' && row[h] !== undefined ? String(row[h]) : <span style={{ color: 'var(--color-text-tertiary)' }}>null</span>}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Provenance notice for sample data */}
              {analysisData.provenance && (
                <div className={styles.infoBanner} style={{ marginTop: 20 }}>
                  <Info size={15} style={{ flexShrink: 0 }} />
                  <span>
                    <strong>{analysisData.provenance.label}.</strong>{' '}
                    Source: {analysisData.provenance.source}.
                    Reference period: {analysisData.provenance.referencePeriod}.{' '}
                    {analysisData.provenance.disclaimer}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DESCRIPTIVE STATISTICS */}
          {activeTab === 'descriptive' && (
            <div className={styles.workspaceCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>
                    Univariate Distribution &amp; Summary Measures
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                    Select any variable to inspect central tendency, dispersion, percentiles, and outlier bounds.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label className={styles.label}>Selected Variable:</label>
                  <select
                    className={styles.select}
                    value={selectedColumn}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                  >
                    {analysisData.metadata.headers.map((h) => (
                      <option key={h} value={h}>
                        {h} ({analysisData.metadata.columnTypes[h]})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {currentColStats?.type === 'numeric' && (
                <>
                  <div className={styles.statMetricsGrid}>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>Mean (x̄)</div>
                      <div className={styles.statMetricValue}>{currentColStats.mean}</div>
                    </div>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>Median (P₅₀)</div>
                      <div className={styles.statMetricValue}>{currentColStats.median}</div>
                    </div>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>Std. Deviation (s)</div>
                      <div className={styles.statMetricValue}>{currentColStats.stdDev}</div>
                    </div>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>Variance (s²)</div>
                      <div className={styles.statMetricValue}>{currentColStats.variance}</div>
                    </div>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>Interquartile Range (IQR)</div>
                      <div className={styles.statMetricValue}>{currentColStats.iqr}</div>
                    </div>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>Tukey Outliers</div>
                      <div className={styles.statMetricValue} style={{ color: currentColStats.outliersCount > 0 ? '#EF4444' : 'var(--color-text-primary)' }}>
                        {currentColStats.outliersCount}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Quantiles Table */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>
                    <div className={styles.tableWrapper}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Quantile Metric</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr><td>Minimum</td><td>{currentColStats.min}</td></tr>
                          <tr><td>10th Percentile (P₁₀)</td><td>{currentColStats.p10}</td></tr>
                          <tr><td>25th Percentile (Q₁)</td><td>{currentColStats.q1}</td></tr>
                          <tr><td>Median (50th Percentile)</td><td>{currentColStats.median}</td></tr>
                          <tr><td>75th Percentile (Q₃)</td><td>{currentColStats.q3}</td></tr>
                          <tr><td>90th Percentile (P₉₀)</td><td>{currentColStats.p90}</td></tr>
                          <tr><td>Maximum</td><td>{currentColStats.max}</td></tr>
                          <tr><td>Range</td><td>{currentColStats.range}</td></tr>
                          <tr><td>Fisher-Pearson Skewness</td><td>{currentColStats.skewness ?? 'N/A'}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                        Tukey Outlier Analysis
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                        <div><strong>Lower Fence (Q₁ - 1.5×IQR):</strong> {currentColStats.outlierLowerFence}</div>
                        <div><strong>Upper Fence (Q₃ + 1.5×IQR):</strong> {currentColStats.outlierUpperFence}</div>
                        <div style={{ marginTop: 8 }}>
                          <strong>Detected Outlier Count:</strong> {currentColStats.outliersCount} observations.
                        </div>
                        {currentColStats.outliersCount === 0 ? (
                          <div style={{ color: 'var(--color-success)', marginTop: 6, fontWeight: 600 }}>
                            ✓ No severe outliers detected outside Tukey fences.
                          </div>
                        ) : (
                          <div style={{ color: '#EF4444', marginTop: 6, fontWeight: 600 }}>
                            ⚠ Review extreme values prior to parametric testing.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Histogram Chart */}
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)', marginBottom: 12 }}>
                    Frequency Distribution Histogram
                  </div>
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={currentColStats.histogram} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="binLabel" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="var(--color-primary-600)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {currentColStats?.type !== 'numeric' && (
                <>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)', marginBottom: 12 }}>
                    Category Frequency Breakdown (Top 15)
                  </div>
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Category Name</th>
                          <th>Frequency Count</th>
                          <th>Relative Frequency (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentColStats?.frequencies?.map((f, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{f.category}</td>
                            <td>{f.count.toLocaleString()}</td>
                            <td>{f.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ width: '100%', height: 260, marginTop: 24 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={currentColStats?.frequencies || []} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#9333ea" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: CORRELATION & REGRESSION */}
          {activeTab === 'correlation' && (
            <div className={styles.workspaceCard}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                Pearson Correlation Coefficient Matrix
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                Measures linear association between pairs of numeric variables (-1 to +1). Pairwise complete observations used.
              </div>

              {analysisData.correlation?.matrix?.length > 0 ? (
                <>
                  <div className={styles.tableWrapper} style={{ marginBottom: 24 }}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Variable</th>
                          {analysisData.correlation.numericHeaders.map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analysisData.correlation.matrix.map((row, rIdx) => (
                          <tr key={rIdx}>
                            <td style={{ fontWeight: 700 }}>{row.column}</td>
                            {analysisData.correlation.numericHeaders.map((h, cIdx) => {
                              const val = row[h]
                              let color = 'inherit'
                              if (val > 0.5) color = 'var(--color-success)'
                              if (val < -0.5) color = '#EF4444'
                              return (
                                <td key={cIdx} style={{ color, fontWeight: val === 1 ? 400 : 700 }}>
                                  {val !== null ? val : '—'}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Linear Regression Exploration */}
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20, marginTop: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                      Ordinary Least Squares (OLS) Linear Regression
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                      Fit a trendline y = β₁x + β₀ to predict a dependent variable from an independent variable.
                    </div>

                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
                      <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                        <label className={styles.label}>Independent Variable (X):</label>
                        <select className={styles.select} value={regXCol} onChange={(e) => setRegXCol(e.target.value)}>
                          {numericHeaders.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                        <label className={styles.label}>Dependent Variable (Y):</label>
                        <select className={styles.select} value={regYCol} onChange={(e) => setRegYCol(e.target.value)}>
                          {numericHeaders.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handleComputeRegression}
                        disabled={runningReg || regXCol === regYCol}
                        className={styles.btnPrimary}
                      >
                        {runningReg ? 'Computing OLS...' : 'Calculate Regression'}
                      </button>
                    </div>

                    {regXCol === regYCol && (
                      <div style={{ fontSize: 12, color: 'var(--color-warning)', marginBottom: 12 }}>
                        Please select distinct variables for X and Y.
                      </div>
                    )}

                    {regressionData && (
                      <div style={{ marginTop: 20 }}>
                        <div className={styles.statMetricsGrid}>
                          <div className={styles.statMetricBox}>
                            <div className={styles.statMetricLabel}>Fitted Equation</div>
                            <div className={styles.statMetricValue} style={{ fontSize: 14 }}>{regressionData.equation}</div>
                          </div>
                          <div className={styles.statMetricBox}>
                            <div className={styles.statMetricLabel}>Slope (β₁)</div>
                            <div className={styles.statMetricValue}>{regressionData.slope}</div>
                          </div>
                          <div className={styles.statMetricBox}>
                            <div className={styles.statMetricLabel}>Intercept (β₀)</div>
                            <div className={styles.statMetricValue}>{regressionData.intercept}</div>
                          </div>
                          <div className={styles.statMetricBox}>
                            <div className={styles.statMetricLabel}>R² (Variance Explained)</div>
                            <div className={styles.statMetricValue}>{Math.round(regressionData.rSquared * 1000) / 10}%</div>
                          </div>
                          <div className={styles.statMetricBox}>
                            <div className={styles.statMetricLabel}>Std. Error (Sₑ, df = n−2)</div>
                            <div className={styles.statMetricValue}>{regressionData.stdError}</div>
                          </div>
                          <div className={styles.statMetricBox}>
                            <div className={styles.statMetricLabel}>Paired Observations (n)</div>
                            <div className={styles.statMetricValue}>{regressionData.n}</div>
                          </div>
                        </div>

                        {/* Scatter Plot */}
                        <div style={{ width: '100%', height: 300, marginTop: 16 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                              <XAxis type="number" dataKey="x" name={regXCol} label={{ value: regXCol, position: 'bottom', offset: 0, fontSize: 11 }} />
                              <YAxis type="number" dataKey="y" name={regYCol} label={{ value: regYCol, angle: -90, position: 'insideLeft', fontSize: 11 }} />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                              <Scatter name="Data Points" data={regressionData.scatterPoints} fill="var(--color-primary-600)" />
                            </ScatterChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--color-text-secondary)', padding: '24px 0' }}>
                  At least two numeric columns are required to generate correlation and regression analyses.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PARAMETRIC HYPOTHESIS TESTING */}
          {activeTab === 'hypothesis' && (
            <div className={styles.workspaceCard}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                Parametric Hypothesis Testing Engine
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                Conduct Student's one-sample t-test or Welch's independent two-sample t-test with p-values, confidence intervals, and formal assumption auditing.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Test Procedure:</label>
                  <select className={styles.select} value={hypoType} onChange={(e) => setHypoType(e.target.value)}>
                    <option value="one_sample">One-Sample t-test (vs Benchmark Mean)</option>
                    <option value="two_sample_columns">Welch's Two-Sample t-test (Two Variables)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Alternative Hypothesis (H₁):</label>
                  <select className={styles.select} value={hypoAlternative} onChange={(e) => setHypoAlternative(e.target.value)}>
                    <option value="two-sided">Two-sided (≠)</option>
                    <option value="less">Left-tailed (&lt;)</option>
                    <option value="greater">Right-tailed (&gt;)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Significance Level (α):</label>
                  <select className={styles.select} value={hypoAlpha} onChange={(e) => setHypoAlpha(e.target.value)}>
                    <option value="0.01">0.01 (1%)</option>
                    <option value="0.05">0.05 (5%)</option>
                    <option value="0.10">0.10 (10%)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Target Variable 1:</label>
                  <select className={styles.select} value={hypoCol} onChange={(e) => setHypoCol(e.target.value)}>
                    {numericHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {hypoType === 'one_sample' && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Hypothesized Mean (μ₀):</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={hypoMu0}
                      onChange={(e) => setHypoMu0(e.target.value)}
                    />
                  </div>
                )}

                {hypoType === 'two_sample_columns' && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Target Variable 2:</label>
                    <select className={styles.select} value={hypoCol2} onChange={(e) => setHypoCol2(e.target.value)}>
                      {numericHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleComputeHypothesis}
                disabled={runningHypo || !hypoCol}
                className={styles.btnPrimary}
              >
                {runningHypo ? 'Evaluating...' : 'Run Hypothesis Test'}
              </button>

              {hypoResult && (
                <div style={{ marginTop: 24, borderTop: '1px solid var(--color-border)', paddingTop: 20 }}>
                  {/* Decision banner */}
                  <div
                    className={styles.infoBanner}
                    style={{
                      background: hypoResult.rejectNull
                        ? 'rgba(239, 68, 68, 0.07)'
                        : 'rgba(16, 185, 129, 0.07)',
                      borderColor: hypoResult.rejectNull ? '#EF4444' : '#10B981',
                      marginBottom: 16,
                    }}
                  >
                    <strong>{hypoResult.rejectNull ? '✗ Reject H₀' : '✓ Fail to Reject H₀'}</strong>
                    &nbsp;— {hypoResult.decision}
                  </div>

                  <div className={styles.statMetricsGrid}>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>Test Statistic (t)</div>
                      <div className={styles.statMetricValue}>{hypoResult.tStatistic}</div>
                    </div>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>Degrees of Freedom (df)</div>
                      <div className={styles.statMetricValue}>{hypoResult.degreesOfFreedom}</div>
                    </div>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>p-value ({hypoResult.alternative})</div>
                      <div className={styles.statMetricValue} style={{
                        color: hypoResult.pValue !== null && hypoResult.pValue < hypoResult.significanceLevel
                          ? '#EF4444' : 'var(--color-success)'
                      }}>
                        {hypoResult.pValue !== null ? hypoResult.pValue.toFixed(5) : 'N/A'}
                      </div>
                    </div>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>Significance Level (α)</div>
                      <div className={styles.statMetricValue}>{hypoResult.significanceLevel}</div>
                    </div>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>Mean Difference</div>
                      <div className={styles.statMetricValue}>{hypoResult.meanDifference}</div>
                    </div>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>Standard Error (SE)</div>
                      <div className={styles.statMetricValue}>{hypoResult.standardError}</div>
                    </div>
                  </div>

                  {/* Confidence interval */}
                  {hypoResult.confidenceInterval && (
                    <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 14, marginTop: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                        {hypoResult.confidenceInterval.level}% Confidence Interval
                      </div>
                      <div style={{ fontSize: 13.5, color: 'var(--color-text-secondary)' }}>
                        [{hypoResult.confidenceInterval.lower}, &nbsp;{hypoResult.confidenceInterval.upper}]
                        &emsp; t* = {hypoResult.confidenceInterval.tCritical}
                      </div>
                    </div>
                  )}

                  {/* Assumptions checklist */}
                  <div style={{ background: 'var(--color-surface-alt)', padding: 14, borderRadius: 8, border: '1px solid var(--color-border)', marginTop: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                      Statistical Assumptions &amp; Validity Checklist:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                      {hypoResult.assumptions?.map((asm, i) => (
                        <li key={i}>{asm}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
import { Link } from 'react-router-dom'
import {
  BarChart2,
  ChevronRight,
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  Database,
  Layers,
  Activity,
  TrendingUp,
  Download,
  RefreshCw,
  Sparkles,
  Info,
  CheckCircle2,
  Table,
  Sliders,
  HelpCircle,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ScatterChart,
  Scatter,
  Line,
} from 'recharts'
import {
  uploadDatasetForAnalysis,
  runRegressionAnalysis,
  runHypothesisTest,
} from '../../api/statisticalAnalysis.api'
import styles from './StatisticalAnalysisPage.module.css'

export default function StatisticalAnalysisPage() {
  const [file, setFile] = useState(null)
  const [csvContent, setCsvContent] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisData, setAnalysisData] = useState(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  // Descriptive state
  const [selectedColumn, setSelectedColumn] = useState('')

  // Regression state
  const [regXCol, setRegXCol] = useState('')
  const [regYCol, setRegYCol] = useState('')
  const [regressionData, setRegressionData] = useState(null)
  const [runningReg, setRunningReg] = useState(false)

  // Hypothesis test state
  const [hypoType, setHypoType] = useState('one_sample')
  const [hypoCol, setHypoCol] = useState('')
  const [hypoMu0, setHypoMu0] = useState('0')
  const [hypoCol2, setHypoCol2] = useState('')
  const [hypoResult, setHypoResult] = useState(null)
  const [runningHypo, setRunningHypo] = useState(false)

  const fileInputRef = useRef(null)

  // Handle file select
  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0]
      setFile(f)
      setError('')
      processDataset(f, null)
    }
  }

  // Process dataset upload or sample
  const processDataset = async (uploadedFile, useSample = false) => {
    setAnalyzing(true)
    setError('')
    try {
      let res
      if (useSample) {
        res = await uploadDatasetForAnalysis(null, { useSample: true })
        setFile({ name: res.filename, size: 1024 })
      } else {
        res = await uploadDatasetForAnalysis(uploadedFile)
      }

      setAnalysisData(res)

      // Set default selected columns
      const headers = res.metadata?.headers || []
      const numericCols = headers.filter((h) => res.metadata.columnTypes[h] === 'numeric')

      if (headers.length > 0) {
        setSelectedColumn(numericCols[0] || headers[0])
      }
      if (numericCols.length >= 2) {
        setRegXCol(numericCols[0])
        setRegYCol(numericCols[1])
        setHypoCol(numericCols[0])
        setHypoCol2(numericCols[1])
      } else if (numericCols.length === 1) {
        setHypoCol(numericCols[0])
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to analyze dataset.')
    } finally {
      setAnalyzing(false)
    }
  }

  // Handle regression computation
  const handleComputeRegression = async () => {
    if (!analysisData || !regXCol || !regYCol) return
    setRunningReg(true)
    try {
      // Build raw CSV string from dataset columns
      const headers = analysisData.metadata.headers
      const rowCount = analysisData.metadata.rowCount
      // Extract columns directly from sample rows or build
      const rows = []
      rows.push(headers.join(','))
      // Use sampleRows or re-query
      for (let r = 0; r < rowCount; r++) {
        const rowVals = headers.map((h) => {
          const val = analysisData.sampleRows?.[r]?.[h] ?? ''
          return String(val).includes(',') ? `"${val}"` : val
        })
        rows.push(rowVals.join(','))
      }
      const rawCsv = rows.join('\n')

      const res = await runRegressionAnalysis({
        csvText: rawCsv,
        xCol: regXCol,
        yCol: regYCol,
      })
      setRegressionData(res.regression)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Regression failed.')
    } finally {
      setRunningReg(false)
    }
  }

  // Handle hypothesis test computation
  const handleComputeHypothesis = async () => {
    if (!analysisData || !hypoCol) return
    setRunningHypo(true)
    try {
      const headers = analysisData.metadata.headers
      const rowCount = analysisData.metadata.rowCount
      const rows = []
      rows.push(headers.join(','))
      for (let r = 0; r < rowCount; r++) {
        const rowVals = headers.map((h) => {
          const val = analysisData.sampleRows?.[r]?.[h] ?? ''
          return String(val).includes(',') ? `"${val}"` : val
        })
        rows.push(rowVals.join(','))
      }
      const rawCsv = rows.join('\n')

      const res = await runHypothesisTest({
        csvText: rawCsv,
        testType: hypoType,
        column: hypoCol,
        hypothesizedMean: Number(hypoMu0) || 0,
        column2: hypoType === 'two_sample_columns' ? hypoCol2 : undefined,
      })
      setHypoResult(res.testResult)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Hypothesis test failed.')
    } finally {
      setRunningHypo(false)
    }
  }

  // Download analysis summary
  const handleExportJson = () => {
    if (!analysisData) return
    const blob = new Blob([JSON.stringify(analysisData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `statistical_analysis_${analysisData.filename.replace(/\.csv$/, '')}.json`
    a.click()
  }

  const numericHeaders = useMemo(() => {
    if (!analysisData?.metadata?.headers) return []
    return analysisData.metadata.headers.filter(
      (h) => analysisData.metadata.columnTypes[h] === 'numeric'
    )
  }, [analysisData])

  const currentColStats = useMemo(() => {
    if (!analysisData?.statistics || !selectedColumn) return null
    return analysisData.statistics[selectedColumn]
  }, [analysisData, selectedColumn])

  return (
    <div className={styles.container}>
      {/* Breadcrumb Navigation */}
      <nav className={styles.breadcrumb}>
        <Link to="/dashboard">Dashboard</Link>
        <ChevronRight size={13} />
        <Link to="/my-learning">Learning Hub</Link>
        <ChevronRight size={13} />
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>Statistical Analysis</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Statistical Analysis &amp; Data Inspection Hub</h1>
        <p className={styles.subtitle}>
          Upload official MoSPI microdata or sample survey returns to inspect distributions, evaluate descriptive metrics, compute correlation matrices, and verify hypotheses.
        </p>
      </div>

      {/* Dataset Upload & Sample Loader Card */}
      <div className={styles.uploadSection}>
        <div
          className={`${styles.dropzone} ${file ? styles.dropzoneActive : ''}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,.tsv,.txt"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <FileSpreadsheet size={36} color="var(--color-primary-600)" />
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {file ? file.name : 'Click to upload survey dataset (CSV / TSV up to 10 MB)'}
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            In-memory processing with automatic delimiter and type detection. Datasets are not permanently stored.
          </p>
        </div>

        <div className={styles.uploadActions}>
          <button
            type="button"
            onClick={() => processDataset(null, true)}
            disabled={analyzing}
            className={styles.btnSecondary}
          >
            <Sparkles size={15} color="var(--color-primary-600)" />
            {analyzing ? 'Loading Sample...' : 'Load MoSPI CPI & Consumption Sample'}
          </button>

          {analysisData && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={handleExportJson}
                className={styles.btnSecondary}
              >
                <Download size={14} /> Export Report (JSON)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAnalysisData(null)
                  setFile(null)
                  setError('')
                }}
                className={styles.btnSecondary}
              >
                Clear Dataset
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {analysisData && (
        <>
          {/* KPI Summary Cards */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: 'color-mix(in srgb, var(--color-primary-600) 10%, transparent)', color: 'var(--color-primary-600)' }}>
                <Database size={20} />
              </div>
              <div>
                <div className={styles.kpiLabel}>Observations (Rows)</div>
                <div className={styles.kpiValue}>{analysisData.metadata.rowCount.toLocaleString()}</div>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9' }}>
                <Layers size={20} />
              </div>
              <div>
                <div className={styles.kpiLabel}>Variables (Columns)</div>
                <div className={styles.kpiValue}>{analysisData.metadata.columnCount} ({numericHeaders.length} Numeric)</div>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: analysisData.metadata.totalMissingCells > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: analysisData.metadata.totalMissingCells > 0 ? '#F59E0B' : '#10B981' }}>
                <Activity size={20} />
              </div>
              <div>
                <div className={styles.kpiLabel}>Missing Data</div>
                <div className={styles.kpiValue}>{analysisData.metadata.totalMissingCells} ({analysisData.metadata.missingCellsPercentage}%)</div>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#9333ea' }}>
                <Sliders size={20} />
              </div>
              <div>
                <div className={styles.kpiLabel}>Delimiter &amp; Format</div>
                <div className={styles.kpiValue}>
                  {analysisData.metadata.delimiter === '\t' ? 'TSV (Tab)' : `CSV (${analysisData.metadata.delimiter})`}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className={styles.tabsContainer}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <Table size={15} /> Dataset Overview &amp; Preview
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'descriptive' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('descriptive')}
            >
              <BarChart2 size={15} /> Descriptive Statistics
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'correlation' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('correlation')}
            >
              <TrendingUp size={15} /> Correlation &amp; Regression
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'hypothesis' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('hypothesis')}
            >
              <HelpCircle size={15} /> Parametric Hypothesis Testing
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className={styles.workspaceCard}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                Variable Schema &amp; Data Types
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Column Index</th>
                      <th>Column Name</th>
                      <th>Inferred Data Type</th>
                      <th>Valid Records</th>
                      <th>Missing Count</th>
                      <th>Missing %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisData.metadata.headers.map((h, idx) => {
                      const type = analysisData.metadata.columnTypes[h]
                      const stats = analysisData.statistics[h]
                      let badgeClass = styles.badgeNumeric
                      if (type === 'categorical') badgeClass = styles.badgeCategorical
                      if (type === 'date') badgeClass = styles.badgeDate
                      if (type === 'boolean') badgeClass = styles.badgeBoolean

                      return (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td style={{ fontWeight: 600 }}>{h}</td>
                          <td>
                            <span className={`${styles.badge} ${badgeClass}`}>
                              {type.toUpperCase()}
                            </span>
                          </td>
                          <td>{stats?.validCount ?? '—'}</td>
                          <td>{stats?.missingCount ?? 0}</td>
                          <td>{stats?.missingPercentage ?? 0}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginTop: 28, marginBottom: 8 }}>
                First 10 Data Rows Preview
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      {analysisData.metadata.headers.map((h, i) => (
                        <th key={i}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analysisData.sampleRows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        <td style={{ color: 'var(--color-text-secondary)', fontSize: 11.5 }}>{rIdx + 1}</td>
                        {analysisData.metadata.headers.map((h, cIdx) => (
                          <td key={cIdx}>{row[h] !== '' && row[h] !== undefined ? String(row[h]) : <span style={{ color: 'var(--color-text-tertiary)' }}>null</span>}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: DESCRIPTIVE STATISTICS */}
          {activeTab === 'descriptive' && (
            <div className={styles.workspaceCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>
                    Univariate Distribution &amp; Summary Measures
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                    Select any variable to inspect central tendency, dispersion, percentiles, and outlier bounds.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label className={styles.label}>Selected Variable:</label>
                  <select
                    className={styles.select}
                    value={selectedColumn}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                  >
                    {analysisData.metadata.headers.map((h) => (
                      <option key={h} value={h}>
                        {h} ({analysisData.metadata.columnTypes[h]})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {currentColStats?.type === 'numeric' && (
                <>
                  <div className={styles.statMetricsGrid}>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>Mean (x̄)</div>
                      <div className={styles.statMetricValue}>{currentColStats.mean}</div>
                    </div>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>Median (P₅₀)</div>
                      <div className={styles.statMetricValue}>{currentColStats.median}</div>
                    </div>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>Std. Deviation (s)</div>
                      <div className={styles.statMetricValue}>{currentColStats.stdDev}</div>
                    </div>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>Variance (s²)</div>
                      <div className={styles.statMetricValue}>{currentColStats.variance}</div>
                    </div>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>Interquartile Range (IQR)</div>
                      <div className={styles.statMetricValue}>{currentColStats.iqr}</div>
                    </div>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>Tukey Outliers</div>
                      <div className={styles.statMetricValue} style={{ color: currentColStats.outliersCount > 0 ? '#EF4444' : 'var(--color-text-primary)' }}>
                        {currentColStats.outliersCount}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Quantiles Table */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>
                    <div className={styles.tableWrapper}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Quantile Metric</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr><td>Minimum</td><td>{currentColStats.min}</td></tr>
                          <tr><td>10th Percentile (P₁₀)</td><td>{currentColStats.p10}</td></tr>
                          <tr><td>25th Percentile (Q₁)</td><td>{currentColStats.q1}</td></tr>
                          <tr><td>Median (50th Percentile)</td><td>{currentColStats.median}</td></tr>
                          <tr><td>75th Percentile (Q₃)</td><td>{currentColStats.q3}</td></tr>
                          <tr><td>90th Percentile (P₉₀)</td><td>{currentColStats.p90}</td></tr>
                          <tr><td>Maximum</td><td>{currentColStats.max}</td></tr>
                          <tr><td>Range</td><td>{currentColStats.range}</td></tr>
                          <tr><td>Fisher-Pearson Skewness</td><td>{currentColStats.skewness ?? 'N/A'}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                        Tukey Outlier Analysis
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                        <div><strong>Lower Fence (Q₁ - 1.5×IQR):</strong> {currentColStats.outlierLowerFence}</div>
                        <div><strong>Upper Fence (Q₃ + 1.5×IQR):</strong> {currentColStats.outlierUpperFence}</div>
                        <div style={{ marginTop: 8 }}>
                          <strong>Detected Outlier Count:</strong> {currentColStats.outliersCount} observations.
                        </div>
                        {currentColStats.outliersCount === 0 ? (
                          <div style={{ color: 'var(--color-success)', marginTop: 6, fontWeight: 600 }}>
                            ✓ No severe outliers detected outside Tukey fences.
                          </div>
                        ) : (
                          <div style={{ color: '#EF4444', marginTop: 6, fontWeight: 600 }}>
                            ⚠ Review extreme values prior to parametric testing.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Histogram Chart */}
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)', marginBottom: 12 }}>
                    Frequency Distribution Histogram
                  </div>
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={currentColStats.histogram} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="binLabel" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="var(--color-primary-600)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {currentColStats?.type !== 'numeric' && (
                <>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)', marginBottom: 12 }}>
                    Category Frequency Breakdown (Top 15)
                  </div>
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Category Name</th>
                          <th>Frequency Count</th>
                          <th>Relative Frequency (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentColStats?.frequencies?.map((f, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{f.category}</td>
                            <td>{f.count.toLocaleString()}</td>
                            <td>{f.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ width: '100%', height: 260, marginTop: 24 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={currentColStats?.frequencies || []} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#9333ea" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: CORRELATION & REGRESSION */}
          {activeTab === 'correlation' && (
            <div className={styles.workspaceCard}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                Pearson Correlation Coefficient Matrix
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                Measures linear association between pairs of numeric variables (-1 to +1).
              </div>

              {analysisData.correlation?.matrix?.length > 0 ? (
                <>
                  <div className={styles.tableWrapper} style={{ marginBottom: 24 }}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Variable</th>
                          {analysisData.correlation.numericHeaders.map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analysisData.correlation.matrix.map((row, rIdx) => (
                          <tr key={rIdx}>
                            <td style={{ fontWeight: 700 }}>{row.column}</td>
                            {analysisData.correlation.numericHeaders.map((h, cIdx) => {
                              const val = row[h]
                              let color = 'inherit'
                              if (val > 0.5) color = 'var(--color-success)'
                              if (val < -0.5) color = '#EF4444'
                              return (
                                <td key={cIdx} style={{ color, fontWeight: val === 1 ? 400 : 700 }}>
                                  {val !== null ? val : '—'}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Linear Regression Exploration */}
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20, marginTop: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                      Ordinary Least Squares (OLS) Linear Regression
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                      Fit a trendline $y = \beta_1 x + \beta_0$ to predict a dependent variable from an independent variable.
                    </div>

                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
                      <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                        <label className={styles.label}>Independent Variable (X):</label>
                        <select className={styles.select} value={regXCol} onChange={(e) => setRegXCol(e.target.value)}>
                          {numericHeaders.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                        <label className={styles.label}>Dependent Variable (Y):</label>
                        <select className={styles.select} value={regYCol} onChange={(e) => setRegYCol(e.target.value)}>
                          {numericHeaders.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handleComputeRegression}
                        disabled={runningReg || regXCol === regYCol}
                        className={styles.btnPrimary}
                      >
                        {runningReg ? 'Computing OLS...' : 'Calculate Regression'}
                      </button>
                    </div>

                    {regXCol === regYCol && (
                      <div style={{ fontSize: 12, color: 'var(--color-warning)', marginBottom: 12 }}>
                        Please select distinct variables for X and Y.
                      </div>
                    )}

                    {regressionData && (
                      <div style={{ marginTop: 20 }}>
                        <div className={styles.statMetricsGrid}>
                          <div className={styles.statMetricBox}>
                            <div className={styles.statMetricLabel}>Fitted Equation</div>
                            <div className={styles.statMetricValue} style={{ fontSize: 14 }}>{regressionData.equation}</div>
                          </div>
                          <div className={styles.statMetricBox}>
                            <div className={styles.statMetricLabel}>Slope (β₁)</div>
                            <div className={styles.statMetricValue}>{regressionData.slope}</div>
                          </div>
                          <div className={styles.statMetricBox}>
                            <div className={styles.statMetricLabel}>Intercept (β₀)</div>
                            <div className={styles.statMetricValue}>{regressionData.intercept}</div>
                          </div>
                          <div className={styles.statMetricBox}>
                            <div className={styles.statMetricLabel}>R² (Variance Explained)</div>
                            <div className={styles.statMetricValue}>{Math.round(regressionData.rSquared * 1000) / 10}%</div>
                          </div>
                          <div className={styles.statMetricBox}>
                            <div className={styles.statMetricLabel}>Std. Error (Sₑ)</div>
                            <div className={styles.statMetricValue}>{regressionData.stdError}</div>
                          </div>
                        </div>

                        {/* Scatter Plot */}
                        <div style={{ width: '100%', height: 300, marginTop: 16 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                              <XAxis type="number" dataKey="x" name={regXCol} label={{ value: regXCol, position: 'bottom', offset: 0, fontSize: 11 }} />
                              <YAxis type="number" dataKey="y" name={regYCol} label={{ value: regYCol, angle: -90, position: 'insideLeft', fontSize: 11 }} />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                              <Scatter name="Data Points" data={regressionData.scatterPoints} fill="var(--color-primary-600)" />
                            </ScatterChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--color-text-secondary)', padding: '24px 0' }}>
                  At least two numeric columns are required to generate correlation and regression analyses.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PARAMETRIC HYPOTHESIS TESTING */}
          {activeTab === 'hypothesis' && (
            <div className={styles.workspaceCard}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                Parametric Hypothesis Testing Engine
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                Conduct Student’s one-sample t-test or Welch’s independent two-sample t-test with formal assumption auditing.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Test Procedure:</label>
                  <select className={styles.select} value={hypoType} onChange={(e) => setHypoType(e.target.value)}>
                    <option value="one_sample">One-Sample t-test (vs Benchmark Mean)</option>
                    <option value="two_sample_columns">Welch's Two-Sample t-test (Two Variables)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Target Variable 1:</label>
                  <select className={styles.select} value={hypoCol} onChange={(e) => setHypoCol(e.target.value)}>
                    {numericHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {hypoType === 'one_sample' && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Hypothesized Mean (μ₀):</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={hypoMu0}
                      onChange={(e) => setHypoMu0(e.target.value)}
                    />
                  </div>
                )}

                {hypoType === 'two_sample_columns' && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Target Variable 2:</label>
                    <select className={styles.select} value={hypoCol2} onChange={(e) => setHypoCol2(e.target.value)}>
                      {numericHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleComputeHypothesis}
                disabled={runningHypo || !hypoCol}
                className={styles.btnPrimary}
              >
                {runningHypo ? 'Evaluating...' : 'Run Hypothesis Test'}
              </button>

              {hypoResult && (
                <div style={{ marginTop: 24, borderTop: '1px solid var(--color-border)', paddingTop: 20 }}>
                  <div className={styles.statMetricsGrid}>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>Test Statistic (t)</div>
                      <div className={styles.statMetricValue}>{hypoResult.tStatistic}</div>
                    </div>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>Degrees of Freedom (df)</div>
                      <div className={styles.statMetricValue}>{hypoResult.degreesOfFreedom}</div>
                    </div>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>Mean Difference</div>
                      <div className={styles.statMetricValue}>{hypoResult.meanDifference}</div>
                    </div>
                    <div className={styles.statMetricBox}>
                      <div className={styles.statMetricLabel}>Standard Error (SE)</div>
                      <div className={styles.statMetricValue}>{hypoResult.standardError}</div>
                    </div>
                  </div>

                  <div className={styles.infoBanner}>
                    <strong>Statistical Interpretation:</strong> {hypoResult.interpretation}
                  </div>

                  <div style={{ background: 'var(--color-surface-alt)', padding: 14, borderRadius: 8, border: '1px solid var(--color-border)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                      Statistical Assumptions &amp; Validity Checklist:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                      {hypoResult.assumptions?.map((asm, i) => (
                        <li key={i}>{asm}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

