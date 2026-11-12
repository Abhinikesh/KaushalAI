'use strict'

const { parse } = require('csv-parse/sync')

/**
 * KaushalAI — Statistical Analysis Engine v2
 *
 * Implements rigorous descriptive statistics, frequency distributions,
 * correlation/covariance matrices, OLS linear regression, and parametric
 * hypothesis testing (t-tests) with p-values, confidence intervals, and
 * directional alternatives.
 *
 * Excel (.xlsx) parsing is handled by parseExcelBuffer() using ExcelJS.
 * All statistical computations are zero-external-math-dependency.
 */

// ── 0. Student-t distribution functions (Lanczos / Continued-Fraction) ───────

/**
 * Natural log of the Gamma function (Lanczos approximation, g=7, n=9).
 * Accurate to ~15 significant digits for z > 0.
 */
function logGamma(z) {
  const p = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.138571095836524,
    9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z)
  z -= 1
  let x = 0.99999999999980993
  for (let i = 0; i < p.length; i++) x += p[i] / (z + i + 1)
  const t = z + 7.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

/**
 * Lentz continued-fraction expansion for the regularised incomplete beta function I_x(a,b).
 */
function betacf(a, b, x) {
  const MAXIT = 300
  const EPS = 3.0e-14
  const FPMIN = 1.0e-30
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1.0
  let d = 1.0 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1.0 / d
  let h = d
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1.0 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1.0 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1.0 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1.0 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1.0 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1.0 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1.0) < EPS) break
  }
  return h
}

/**
 * Regularised incomplete beta function I_x(a, b) ∈ [0, 1].
 */
function ibeta(x, a, b) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) +
    a * Math.log(x) + b * Math.log(1 - x)
  )
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a
  return 1 - (bt * betacf(b, a, 1 - x)) / b
}

/**
 * Cumulative distribution function of Student's t with df degrees of freedom.
 * P(T ≤ t | df).
 */
function studentTCDF(t, df) {
  if (!Number.isFinite(df) || df <= 0) return NaN
  if (!Number.isFinite(t)) return t > 0 ? 1 : 0
  const x = df / (df + t * t)
  const prob = 0.5 * ibeta(x, df / 2, 0.5)
  return t >= 0 ? 1 - prob : prob
}

/**
 * Two-sided, left-tailed or right-tailed p-value from t-statistic and df.
 * @param {number} t  t-statistic
 * @param {number} df degrees of freedom
 * @param {'two-sided'|'less'|'greater'} alternative
 */
function studentT_pvalue(t, df, alternative = 'two-sided') {
  if (!Number.isFinite(t) || !Number.isFinite(df) || df <= 0) return null
  const cdf = studentTCDF(t, df)
  if (alternative === 'less') return cdf
  if (alternative === 'greater') return 1 - cdf
  return 2 * Math.min(cdf, 1 - cdf)
}

/**
 * Inverse Student-t (bisection on CDF).  Returns t* such that P(T ≤ t*) = p.
 */
function studentTInv(p, df) {
  if (p <= 0 || p >= 1 || !Number.isFinite(df) || df <= 0) return NaN
  if (p === 0.5) return 0
  if (p < 0.5) return -studentTInv(1 - p, df)
  let low = 0
  let high = 10
  while (studentTCDF(high, df) < p) high *= 2
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2
    if (studentTCDF(mid, df) < p) low = mid
    else high = mid
  }
  return (low + high) / 2
}

/**
 * Confidence interval for a t-based estimate.
 * @param {number} estimate  point estimate (mean or mean difference)
 * @param {number} se        standard error
 * @param {number} df        degrees of freedom
 * @param {number} alpha     significance level (default 0.05)
 * @returns {{ lower: number, upper: number, level: number }}
 */
function computeCI(estimate, se, df, alpha = 0.05) {
  const tCrit = studentTInv(1 - alpha / 2, df)
  const margin = tCrit * se
  return {
    lower: round(estimate - margin, 4),
    upper: round(estimate + margin, 4),
    level: Math.round((1 - alpha) * 100),
    tCritical: round(tCrit, 4),
  }
}

// ── 1. Dataset Parsing & Type Inference ──────────────────────────────────────

// Lazily loaded so the service starts even without exceljs in minimal installs
let ExcelJS = null
function getExcelJS() {
  if (!ExcelJS) {
    try {
      ExcelJS = require('exceljs')
    } catch {
      throw new Error('ExcelJS is not installed. Run: npm install exceljs')
    }
  }
  return ExcelJS
}

/**
 * Detects delimiter by inspecting frequency in the first 5 lines.
 */
function detectDelimiter(text) {
  const candidates = [',', ';', '\t', '|']
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0).slice(0, 5)
  if (lines.length === 0) return ','

  let bestDelimiter = ','
  let maxScore = -1

  for (const delim of candidates) {
    const counts = lines.map((l) => (l.split(delim).length - 1))
    const firstCount = counts[0]
    if (firstCount > 0 && counts.every((c) => c === firstCount)) {
      // Consistent delimiter count across all sample lines has highest priority
      const score = firstCount * 10
      if (score > maxScore) {
        maxScore = score
        bestDelimiter = delim
      }
    } else {
      const avg = counts.reduce((a, b) => a + b, 0) / counts.length
      if (avg > maxScore) {
        maxScore = avg
        bestDelimiter = delim
      }
    }
  }

  return bestDelimiter
}

/**
 * Parse an .xlsx workbook buffer using ExcelJS.
 *
 * @param {Buffer} buffer  Raw .xlsx bytes (from multer memoryStorage).
 * @param {string|number|null} sheetSelector  Sheet name or 1-based index.
 *   When null/undefined the first visible sheet is used.
 * @returns {{ rows: string[][], sheetNames: string[], selectedSheet: string }}
 */
async function parseExcelBuffer(buffer, sheetSelector = null) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Excel buffer is empty.')
  }

  // Magic bytes for OOXML / ZIP (xlsx)
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b
  if (!isZip) {
    throw new Error(
      'File does not appear to be a valid .xlsx workbook. ' +
      'Legacy .xls binary format is not supported — please save as .xlsx.'
    )
  }

  const EJS = getExcelJS()
  const wb = new EJS.Workbook()

  try {
    await wb.xlsx.load(buffer)
  } catch (err) {
    throw new Error(`Failed to open workbook: ${err.message}`)
  }

  if (!wb.worksheets || wb.worksheets.length === 0) {
    throw new Error('Workbook contains no worksheets.')
  }

  // Collect visible (non-hidden) sheet names
  const sheetNames = wb.worksheets
    .filter((ws) => ws.state !== 'veryHidden' && ws.state !== 'hidden')
    .map((ws) => ws.name)

  if (sheetNames.length === 0) {
    throw new Error('All worksheets in this workbook are hidden.')
  }

  // Resolve selected sheet
  let sheet = null
  if (sheetSelector !== null && sheetSelector !== undefined) {
    if (typeof sheetSelector === 'number') {
      sheet = wb.getWorksheet(sheetSelector)
    } else {
      sheet = wb.getWorksheet(String(sheetSelector))
    }
    if (!sheet) {
      throw new Error(
        `Worksheet "${sheetSelector}" not found in workbook. ` +
        `Available sheets: ${sheetNames.join(', ')}`
      )
    }
  } else {
    // Use first visible sheet
    sheet = wb.getWorksheet(sheetNames[0])
  }

  const selectedSheet = sheet.name

  // Extract rows as string[][]
  const rows = []
  sheet.eachRow({ includeEmpty: false }, (row) => {
    // row.values is 1-indexed (index 0 is undefined)
    const cells = []
    for (let c = 1; c <= row.cellCount; c++) {
      const cell = row.getCell(c)
      // Never evaluate formulas — use cached result or empty string
      let val = ''
      if (cell.type === 2 /* Number */) {
        val = String(cell.value ?? '')
      } else if (cell.type === 6 /* Formula */ || cell.type === 10 /* SharedFormula */) {
        // Use the cached result value, not the formula itself
        const r = cell.result
        if (r !== null && r !== undefined && typeof r !== 'object') {
          val = String(r)
        }
        // else leave as '' — do not expose formula text
      } else if (cell.type === 4 /* Boolean */) {
        val = String(cell.value)
      } else if (cell.type === 3 /* String */ || cell.type === 1) {
        val = String(cell.text || cell.value || '')
        // Strip formula-injection prefixes from cell content
        val = val.replace(/^[=+\-@\t\r]+/, '')
      } else if (cell.type === 5 /* Error */) {
        val = '' // suppress formula errors silently
      } else {
        const raw = cell.value
        if (raw !== null && raw !== undefined) {
          if (raw instanceof Date) {
            val = raw.toISOString().slice(0, 10)
          } else {
            val = String(raw)
            val = val.replace(/^[=+\-@\t\r]+/, '')
          }
        }
      }
      cells.push(val)
    }
    rows.push(cells)
  })

  if (rows.length === 0) {
    throw new Error(`Worksheet "${selectedSheet}" is empty.`)
  }

  return { rows, sheetNames, selectedSheet }
}

/**
 * Convert ExcelJS row arrays into a structured dataset matching parseDataset output.
 *
 * @param {string[][]} rows         First row is treated as headers.
 * @param {string}     sheetName    For error messages.
 * @param {object}     options      Supports maxRows.
 */
function buildDatasetFromRows(rows, sheetName = 'Sheet', options = {}) {
  if (rows.length < 2) {
    throw new Error(`Worksheet "${sheetName}" contains a header row but no data rows.`)
  }

  const maxRows = options.maxRows || 50000
  if (rows.length - 1 > maxRows) {
    throw new Error(
      `Worksheet "${sheetName}" exceeds the maximum supported row limit of ` +
      `${maxRows.toLocaleString()} rows. Please upload a smaller sample.`
    )
  }

  // Sanitise headers
  const rawHeaders = rows[0]
  const seenHeaders = new Map()
  const headers = rawHeaders.map((h, idx) => {
    let clean = sanitizeColumnName(h, idx)
    const lower = clean.toLowerCase()
    if (seenHeaders.has(lower)) {
      const count = seenHeaders.get(lower) + 1
      seenHeaders.set(lower, count)
      clean = `${clean}_${count}`
    } else {
      seenHeaders.set(lower, 1)
    }
    return clean
  })

  const dataRows = rows.slice(1)
  const columnCount = headers.length
  const rowCount = dataRows.length

  const columns = {}
  for (const h of headers) columns[h] = []

  const rowHashSet = new Set()
  let duplicateRowCount = 0
  let totalMissingCells = 0

  for (const row of dataRows) {
    const rowString = row.join('|||')
    if (rowHashSet.has(rowString)) duplicateRowCount++
    else rowHashSet.add(rowString)

    for (let c = 0; c < columnCount; c++) {
      const h = headers[c]
      const cellVal = (row[c] !== undefined && row[c] !== null) ? String(row[c]).trim() : ''
      columns[h].push(cellVal)
      if (cellVal === '' || ['na', 'null', 'nan'].includes(cellVal.toLowerCase())) {
        totalMissingCells++
      }
    }
  }

  // Type inference
  const columnTypes = inferColumnTypes(headers, columns)

  // Sample rows (first 10)
  const sampleRows = []
  const previewCount = Math.min(10, rowCount)
  for (let r = 0; r < previewCount; r++) {
    const obj = {}
    for (let c = 0; c < columnCount; c++) {
      obj[headers[c]] = dataRows[r][c] ?? ''
    }
    sampleRows.push(obj)
  }

  return {
    rowCount,
    columnCount,
    headers,
    columnTypes,
    totalMissingCells,
    missingCellsPercentage: rowCount * columnCount > 0
      ? Math.round((totalMissingCells / (rowCount * columnCount)) * 1000) / 10
      : 0,
    duplicateRowCount,
    sampleRows,
    columns,
    delimiter: 'xlsx',
  }
}

/**
 * Shared type inference: given headers and column arrays, returns columnTypes map.
 */
function inferColumnTypes(headers, columns) {
  const columnTypes = {}
  for (const h of headers) {
    const values = columns[h]
    const nonEmpties = values.filter(
      (v) => v !== '' && !['na', 'null', 'nan'].includes(v.toLowerCase())
    )

    if (nonEmpties.length === 0) {
      columnTypes[h] = 'text'
      continue
    }

    const numericRegex = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/
    const numericMatches = nonEmpties.filter((v) => numericRegex.test(v.replace(/,/g, '')))
    const numericRatio = numericMatches.length / nonEmpties.length

    const dateRegex = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$|^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/
    const dateMatches = nonEmpties.filter((v) => dateRegex.test(v))
    const dateRatio = dateMatches.length / nonEmpties.length

    const boolRegex = /^(true|false|yes|no|0|1)$/i
    const boolMatches = nonEmpties.filter((v) => boolRegex.test(v))
    const boolRatio = boolMatches.length / nonEmpties.length

    if (numericRatio >= 0.8) columnTypes[h] = 'numeric'
    else if (dateRatio >= 0.8) columnTypes[h] = 'date'
    else if (boolRatio >= 0.9) columnTypes[h] = 'boolean'
    else columnTypes[h] = 'categorical'
  }
  return columnTypes
}

/**
 * Parse a CSV buffer or text into structured rows, types, and column metadata.
 */
function stripBom(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.subarray(3)
  }
  return buffer
}

/**
 * Sanitize column name against CSV injection and whitespace anomalies.
 */
function sanitizeColumnName(rawName, index) {
  let name = String(rawName || '').trim()
  if (!name) name = `column_${index + 1}`
  // Prevent CSV injection characters at start of header
  name = name.replace(/^[=+\-@\t\r]+/, '')
  return name.slice(0, 80) || `column_${index + 1}`
}

/**
 * Parse a CSV buffer or text into structured rows, types, and column metadata.
 */
function parseDataset(bufferOrString, options = {}) {
  let text = ''
  if (Buffer.isBuffer(bufferOrString)) {
    const cleanBuffer = stripBom(bufferOrString)
    text = cleanBuffer.toString('utf8')
  } else if (typeof bufferOrString === 'string') {
    text = bufferOrString.replace(/^\uFEFF/, '')
  } else {
    throw new Error('Invalid input: expected buffer or string.')
  }

  const trimmedText = text.trim()
  if (!trimmedText) {
    throw new Error('Uploaded dataset is empty.')
  }

  const delimiter = options.delimiter || detectDelimiter(trimmedText)

  let rawRecords
  try {
    rawRecords = parse(trimmedText, {
      delimiter,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      skip_records_with_error: false,
    })
  } catch (err) {
    throw new Error(`Failed to parse CSV: ${err.message}`)
  }

  if (!rawRecords || rawRecords.length === 0) {
    throw new Error('Dataset contains no data rows.')
  }

  if (rawRecords.length === 1) {
    throw new Error('Dataset contains a header row but no data rows.')
  }

  // Row limits for protection against memory exhaustion (max 50,000 rows)
  const maxRows = options.maxRows || 50000
  if (rawRecords.length - 1 > maxRows) {
    throw new Error(`Dataset exceeds maximum supported row limit of ${maxRows.toLocaleString()} rows. Please upload a smaller sample.`)
  }

  // Headers
  const rawHeaders = rawRecords[0]
  const seenHeaders = new Map()
  const headers = rawHeaders.map((h, idx) => {
    let clean = sanitizeColumnName(h, idx)
    const lower = clean.toLowerCase()
    if (seenHeaders.has(lower)) {
      const count = seenHeaders.get(lower) + 1
      seenHeaders.set(lower, count)
      clean = `${clean}_${count}`
    } else {
      seenHeaders.set(lower, 1)
    }
    return clean
  })

  // Data rows
  const dataRows = rawRecords.slice(1)
  const columnCount = headers.length
  const rowCount = dataRows.length

  // Build column arrays
  const columns = {}
  for (const h of headers) {
    columns[h] = []
  }

  // Track duplicate rows (hash-based check)
  const rowHashSet = new Set()
  let duplicateRowCount = 0
  let totalMissingCells = 0

  for (let r = 0; r < rowCount; r++) {
    const row = dataRows[r]
    const rowString = row.join('|||')
    if (rowHashSet.has(rowString)) {
      duplicateRowCount++
    } else {
      rowHashSet.add(rowString)
    }

    for (let c = 0; c < columnCount; c++) {
      const h = headers[c]
      const cellVal = row[c] !== undefined && row[c] !== null ? String(row[c]).trim() : ''
      columns[h].push(cellVal)
      if (cellVal === '' || cellVal.toLowerCase() === 'na' || cellVal.toLowerCase() === 'null' || cellVal.toLowerCase() === 'nan') {
        totalMissingCells++
      }
    }
  }

  // Infer column data types
  const columnTypes = {}
  for (const h of headers) {
    const values = columns[h]
    const nonEmpties = values.filter((v) => v !== '' && !['na', 'null', 'nan'].includes(v.toLowerCase()))

    if (nonEmpties.length === 0) {
      columnTypes[h] = 'text'
      continue
    }

    // Numeric check: allows standard integers, decimals, scientific notation, negative numbers
    const numericRegex = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/
    const numericMatches = nonEmpties.filter((v) => numericRegex.test(v.replace(/,/g, '')))
    const numericRatio = numericMatches.length / nonEmpties.length

    // Date check: YYYY-MM-DD or DD/MM/YYYY or YYYY/MM/DD
    const dateRegex = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$|^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/
    const dateMatches = nonEmpties.filter((v) => dateRegex.test(v))
    const dateRatio = dateMatches.length / nonEmpties.length

    // Boolean check: true, false, 0, 1, yes, no
    const boolRegex = /^(true|false|yes|no|0|1)$/i
    const boolMatches = nonEmpties.filter((v) => boolRegex.test(v))
    const boolRatio = boolMatches.length / nonEmpties.length

    if (numericRatio >= 0.8) {
      columnTypes[h] = 'numeric'
    } else if (dateRatio >= 0.8) {
      columnTypes[h] = 'date'
    } else if (boolRatio >= 0.9) {
      columnTypes[h] = 'boolean'
    } else {
      columnTypes[h] = 'categorical'
    }
  }

  // Build row-based sample (first 10 rows for UI preview)
  const sampleRows = []
  const previewCount = Math.min(10, rowCount)
  for (let r = 0; r < previewCount; r++) {
    const obj = {}
    for (let c = 0; c < columnCount; c++) {
      obj[headers[c]] = dataRows[r][c] ?? ''
    }
    sampleRows.push(obj)
  }

  return {
    rowCount,
    columnCount,
    headers,
    columnTypes,
    totalMissingCells,
    missingCellsPercentage: rowCount * columnCount > 0 ? Math.round((totalMissingCells / (rowCount * columnCount)) * 1000) / 10 : 0,
    duplicateRowCount,
    sampleRows,
    columns,
    delimiter,
  }
}

// ── 2. Pure Statistical Computations ─────────────────────────────────────────

/**
 * Computes standard percentiles with linear interpolation (R-7 / NumPy default).
 */
function computePercentile(sortedArray, p) {
  if (sortedArray.length === 0) return null
  if (sortedArray.length === 1) return sortedArray[0]
  if (p <= 0) return sortedArray[0]
  if (p >= 100) return sortedArray[sortedArray.length - 1]

  const index = (p / 100) * (sortedArray.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index - lower

  if (lower === upper) return sortedArray[lower]
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight
}

/**
 * Computes single-column descriptive statistics.
 */
function computeDescriptiveStats(values, columnType = 'numeric') {
  const totalCount = values.length
  const missingValues = values.filter((v) => v === '' || v === null || v === undefined || ['na', 'null', 'nan'].includes(String(v).toLowerCase()))
  const missingCount = missingValues.length
  const validCount = totalCount - missingCount
  const missingPercentage = totalCount > 0 ? Math.round((missingCount / totalCount) * 1000) / 10 : 0

  if (columnType === 'numeric') {
    // Extract valid numeric values
    const numericValues = []
    for (const v of values) {
      if (v === '' || v === null || v === undefined) continue
      const str = String(v).trim().toLowerCase()
      if (['na', 'null', 'nan'].includes(str)) continue
      const num = Number(str.replace(/,/g, ''))
      if (!Number.isNaN(num) && Number.isFinite(num)) {
        numericValues.push(num)
      }
    }

    if (numericValues.length === 0) {
      return {
        type: 'numeric',
        totalCount,
        validCount: 0,
        missingCount,
        missingPercentage,
        uniqueCount: 0,
        mean: null,
        median: null,
        mode: null,
        stdDev: null,
        variance: null,
        min: null,
        max: null,
        range: null,
        q1: null,
        q3: null,
        iqr: null,
        outliers: [],
        outliersCount: 0,
        skewness: null,
        histogram: [],
      }
    }

    const n = numericValues.length
    numericValues.sort((a, b) => a - b)

    // Sum and Mean
    const sum = numericValues.reduce((acc, x) => acc + x, 0)
    const mean = sum / n

    // Median
    const median = computePercentile(numericValues, 50)

    // Mode
    const freqMap = new Map()
    let maxFreq = 0
    for (const x of numericValues) {
      const f = (freqMap.get(x) || 0) + 1
      freqMap.set(x, f)
      if (f > maxFreq) maxFreq = f
    }
    const modes = []
    for (const [val, f] of freqMap.entries()) {
      if (f === maxFreq && maxFreq > 1) {
        modes.push(val)
      }
    }
    const mode = modes.length > 0 && modes.length <= 5 ? modes : (maxFreq === 1 ? null : modes.slice(0, 5))

    // Variance and Sample Standard Deviation (N - 1 denominator)
    let variance = 0
    let stdDev = 0
    if (n > 1) {
      const sumSqDiff = numericValues.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0)
      variance = sumSqDiff / (n - 1)
      stdDev = Math.sqrt(variance)
    }

    // Min, Max, Range
    const min = numericValues[0]
    const max = numericValues[n - 1]
    const range = max - min

    // Quartiles and Percentiles
    const q1 = computePercentile(numericValues, 25)
    const q3 = computePercentile(numericValues, 75)
    const iqr = q3 - q1
    const p10 = computePercentile(numericValues, 10)
    const p90 = computePercentile(numericValues, 90)

    // Outlier detection (Tukey's Fences)
    const lowerFence = q1 - 1.5 * iqr
    const upperFence = q3 + 1.5 * iqr
    const outliers = numericValues.filter((x) => x < lowerFence || x > upperFence)

    // Skewness: Fisher-Pearson sample skewness
    let skewness = null
    if (n >= 3 && stdDev > 0) {
      const m3 = numericValues.reduce((acc, x) => acc + Math.pow((x - mean) / stdDev, 3), 0)
      skewness = (n / ((n - 1) * (n - 2))) * m3
    }

    // Distribution Histogram Bins (10 equal-width bins)
    const binCount = Math.min(10, Math.max(4, Math.floor(Math.sqrt(n))))
    const histogram = []
    if (range > 0) {
      const binWidth = range / binCount
      for (let i = 0; i < binCount; i++) {
        const binStart = min + i * binWidth
        const binEnd = i === binCount - 1 ? max : min + (i + 1) * binWidth
        const countInBin = numericValues.filter((x) => (i === binCount - 1 ? x >= binStart && x <= binEnd : x >= binStart && x < binEnd)).length
        histogram.push({
          binLabel: `${round(binStart, 2)} - ${round(binEnd, 2)}`,
          binStart: round(binStart, 2),
          binEnd: round(binEnd, 2),
          count: countInBin,
        })
      }
    } else {
      histogram.push({
        binLabel: `${round(min, 2)}`,
        binStart: round(min, 2),
        binEnd: round(max, 2),
        count: n,
      })
    }

    return {
      type: 'numeric',
      totalCount,
      validCount: n,
      missingCount,
      missingPercentage,
      uniqueCount: freqMap.size,
      mean: round(mean, 4),
      median: round(median, 4),
      mode: Array.isArray(mode) ? mode.map((m) => round(m, 4)) : mode,
      stdDev: round(stdDev, 4),
      variance: round(variance, 4),
      min: round(min, 4),
      max: round(max, 4),
      range: round(range, 4),
      q1: round(q1, 4),
      q3: round(q3, 4),
      iqr: round(iqr, 4),
      p10: round(p10, 4),
      p90: round(p90, 4),
      outliersCount: outliers.length,
      outlierLowerFence: round(lowerFence, 4),
      outlierUpperFence: round(upperFence, 4),
      skewness: skewness !== null ? round(skewness, 4) : null,
      histogram,
    }
  }

  // Categorical / Text / Boolean
  const freqMap = new Map()
  for (const v of values) {
    if (v === '' || v === null || v === undefined) continue
    const str = String(v).trim()
    if (['na', 'null', 'nan'].includes(str.toLowerCase())) continue
    freqMap.set(str, (freqMap.get(str) || 0) + 1)
  }

  const sortedCategories = Array.from(freqMap.entries())
    .map(([category, count]) => ({
      category,
      count,
      percentage: validCount > 0 ? round((count / validCount) * 100, 1) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  const topCategories = sortedCategories.slice(0, 15)
  const mode = sortedCategories.length > 0 ? sortedCategories[0].category : null

  return {
    type: columnType,
    totalCount,
    validCount,
    missingCount,
    missingPercentage,
    uniqueCount: freqMap.size,
    mode,
    frequencies: topCategories,
  }
}

/**
 * Computes Pearson correlation and covariance matrix across all numeric columns.
 */
function computeCorrelationMatrix(dataset) {
  const { headers, columnTypes, columns } = dataset
  const numericHeaders = headers.filter((h) => columnTypes[h] === 'numeric')

  if (numericHeaders.length < 2) {
    return {
      numericHeaders,
      matrix: [],
      pairs: [],
      message: 'At least two numeric columns are required to compute correlation.',
    }
  }

  const matrix = []
  const pairs = []

  for (let i = 0; i < numericHeaders.length; i++) {
    const colX = numericHeaders[i]
    const row = { column: colX }

    for (let j = 0; j < numericHeaders.length; j++) {
      const colY = numericHeaders[j]

      if (i === j) {
        row[colY] = 1.0
        continue
      }

      // Pairwise non-null values
      const valsX = columns[colX]
      const valsY = columns[colY]
      const pairedX = []
      const pairedY = []

      for (let k = 0; k < valsX.length; k++) {
        const vx = valsX[k]
        const vy = valsY[k]
        if (vx === '' || vy === '' || ['na', 'null', 'nan'].includes(String(vx).toLowerCase()) || ['na', 'null', 'nan'].includes(String(vy).toLowerCase())) {
          continue
        }
        const nx = Number(String(vx).replace(/,/g, ''))
        const ny = Number(String(vy).replace(/,/g, ''))
        if (!Number.isNaN(nx) && !Number.isNaN(ny)) {
          pairedX.push(nx)
          pairedY.push(ny)
        }
      }

      const n = pairedX.length
      if (n < 2) {
        row[colY] = null
        continue
      }

      const meanX = pairedX.reduce((a, b) => a + b, 0) / n
      const meanY = pairedY.reduce((a, b) => a + b, 0) / n

      let num = 0
      let denomX = 0
      let denomY = 0

      for (let k = 0; k < n; k++) {
        const dx = pairedX[k] - meanX
        const dy = pairedY[k] - meanY
        num += dx * dy
        denomX += dx * dx
        denomY += dy * dy
      }

      const covariance = num / (n - 1)
      const denom = Math.sqrt(denomX * denomY)
      const correlation = denom > 0 ? num / denom : 0

      row[colY] = round(correlation, 4)

      if (i < j) {
        pairs.push({
          colX,
          colY,
          n,
          correlation: round(correlation, 4),
          covariance: round(covariance, 4),
          interpretation: interpretCorrelation(correlation),
        })
      }
    }
    matrix.push(row)
  }

  pairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))

  return {
    numericHeaders,
    matrix,
    pairs,
  }
}

/**
 * Interpret Pearson correlation strength and direction.
 */
function interpretCorrelation(r) {
  if (r === null || Number.isNaN(r)) return 'Undefined (insufficient data or zero variance)'
  const abs = Math.abs(r)
  const dir = r >= 0 ? 'positive' : 'negative'
  if (abs >= 0.8) return `Strong ${dir} linear relationship`
  if (abs >= 0.5) return `Moderate ${dir} linear relationship`
  if (abs >= 0.3) return `Weak ${dir} linear relationship`
  return `Very weak / negligible ${dir} correlation`
}

/**
 * Computes OLS Simple Linear Regression between two numeric columns.
 */
function computeLinearRegression(dataset, xCol, yCol) {
  const { headers, columns } = dataset

  if (!headers.includes(xCol)) throw new Error(`Independent variable "${xCol}" not found in dataset.`)
  if (!headers.includes(yCol)) throw new Error(`Dependent variable "${yCol}" not found in dataset.`)

  const valsX = columns[xCol]
  const valsY = columns[yCol]

  const points = []
  for (let i = 0; i < valsX.length; i++) {
    const vx = valsX[i]
    const vy = valsY[i]
    if (vx === '' || vy === '' || ['na', 'null', 'nan'].includes(String(vx).toLowerCase()) || ['na', 'null', 'nan'].includes(String(vy).toLowerCase())) {
      continue
    }
    const nx = Number(String(vx).replace(/,/g, ''))
    const ny = Number(String(vy).replace(/,/g, ''))
    if (!Number.isNaN(nx) && !Number.isNaN(ny)) {
      points.push({ x: nx, y: ny })
    }
  }

  const n = points.length
  if (n < 2) {
    throw new Error(`Insufficient paired data points for regression (found ${n}, need at least 2).`)
  }

  const sumX = points.reduce((a, p) => a + p.x, 0)
  const sumY = points.reduce((a, p) => a + p.y, 0)
  const meanX = sumX / n
  const meanY = sumY / n

  let sumXY = 0
  let sumX2 = 0
  let sumY2 = 0

  for (const p of points) {
    sumXY += p.x * p.y
    sumX2 += p.x * p.x
    sumY2 += p.y * p.y
  }

  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) {
    throw new Error(`Cannot compute regression: independent variable "${xCol}" has zero variance.`)
  }

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  // R-squared and Standard Error
  let ssTot = 0
  let ssRes = 0

  for (const p of points) {
    const yHat = slope * p.x + intercept
    ssTot += Math.pow(p.y - meanY, 2)
    ssRes += Math.pow(p.y - yHat, 2)
  }

  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0
  const stdError = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0

  // Equation display string
  const sign = intercept >= 0 ? '+' : '-'
  const equation = `y = ${round(slope, 4)}x ${sign} ${round(Math.abs(intercept), 4)}`

  // Sample scatter data (downsampled to max 200 points for smooth charting)
  const sampleStep = Math.max(1, Math.floor(n / 200))
  const scatterPoints = []
  for (let i = 0; i < n; i += sampleStep) {
    scatterPoints.push({
      x: round(points[i].x, 3),
      y: round(points[i].y, 3),
      fittedY: round(slope * points[i].x + intercept, 3),
    })
  }

  // Trendline endpoints
  const sortedX = points.map((p) => p.x).sort((a, b) => a - b)
  const minX = sortedX[0]
  const maxX = sortedX[n - 1]

  const trendline = [
    { x: round(minX, 3), y: round(slope * minX + intercept, 3) },
    { x: round(maxX, 3), y: round(slope * maxX + intercept, 3) },
  ]

  return {
    xCol,
    yCol,
    n,
    slope: round(slope, 6),
    intercept: round(intercept, 6),
    rSquared: round(rSquared, 4),
    stdError: round(stdError, 4),
    equation,
    scatterPoints,
    trendline,
  }
}

/**
 * Computes parametric hypothesis tests (One-Sample t-test or Two-Sample t-test).
 */
function computeHypothesisTest(dataset, params) {
  const {
    testType = 'one_sample',
    column,
    hypothesizedMean = 0,
    column2,
    alternative = 'two-sided',  // 'two-sided' | 'less' | 'greater'
    alpha = 0.05,               // significance level
  } = params
  const { headers, columns } = dataset

  if (!headers.includes(column)) throw new Error(`Target column "${column}" not found in dataset.`)

  // Validate alternative hypothesis direction
  const validAlternatives = ['two-sided', 'less', 'greater']
  if (!validAlternatives.includes(alternative)) {
    throw new Error(`Invalid alternative: "${alternative}". Use "two-sided", "less", or "greater".`)
  }
  if (typeof alpha !== 'number' || alpha <= 0 || alpha >= 1) {
    throw new Error('Significance level alpha must be a number between 0 and 1 (exclusive).')
  }

  if (testType === 'one_sample') {
    const vals = columns[column]
    const numericValues = []
    for (const v of vals) {
      if (v === '' || v === null || v === undefined) continue
      const str = String(v).trim().toLowerCase()
      if (['na', 'null', 'nan'].includes(str)) continue
      const num = Number(str.replace(/,/g, ''))
      if (!Number.isNaN(num) && Number.isFinite(num)) numericValues.push(num)
    }

    const n = numericValues.length
    if (n < 2) {
      throw new Error(`One-sample t-test requires at least 2 valid observations (found ${n}).`)
    }

    const mean = numericValues.reduce((a, b) => a + b, 0) / n
    const sumSqDiff = numericValues.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0)
    const variance = sumSqDiff / (n - 1)
    const stdDev = Math.sqrt(variance)

    if (stdDev === 0) {
      throw new Error('Sample standard deviation is zero; t-statistic is undefined for a constant column.')
    }

    const stdError = stdDev / Math.sqrt(n)
    const mu0 = Number(hypothesizedMean)
    if (!Number.isFinite(mu0)) throw new Error('hypothesizedMean must be a finite number.')
    const meanDiff = mean - mu0
    const tStat = meanDiff / stdError
    const df = n - 1

    const pValue = studentT_pvalue(tStat, df, alternative)
    const ci = computeCI(mean, stdError, df, alpha)

    // Reject/fail decision
    const reject = pValue !== null && pValue < alpha
    const altLabel = alternative === 'two-sided'
      ? `μ ≠ ${mu0}`
      : alternative === 'less'
        ? `μ < ${mu0}`
        : `μ > ${mu0}`

    const decision = reject
      ? `Reject H₀: Sufficient evidence that ${altLabel} at α = ${alpha} (p = ${pValue !== null ? pValue.toFixed(4) : 'N/A'}).`
      : `Fail to reject H₀: Insufficient evidence that ${altLabel} at α = ${alpha} (p = ${pValue !== null ? pValue.toFixed(4) : 'N/A'}).`

    return {
      testType: 'One-Sample t-test',
      column,
      n,
      sampleMean: round(mean, 4),
      hypothesizedMean: mu0,
      meanDifference: round(meanDiff, 4),
      sampleStdDev: round(stdDev, 4),
      standardError: round(stdError, 4),
      tStatistic: round(tStat, 4),
      degreesOfFreedom: df,
      alternative,
      pValue: pValue !== null ? round(pValue, 6) : null,
      significanceLevel: alpha,
      rejectNull: reject,
      decision,
      confidenceInterval: ci,
      interpretation: `${decision} The sample mean is ${round(mean, 3)} (95% CI: ${ci.lower} to ${ci.upper}, df = ${df}).`,
      // ── Corrected per Phase 38.1 specification ──
      assumptions: [
        'Observations are independent of each other.',
        'The population is approximately normally distributed (especially important for small samples; relaxed for n ≥ 30 by the Central Limit Theorem).',
        'The outcome variable is continuous.',
        'The sample is drawn with appropriate study design (random or representative sampling).',
      ],
    }
  }

  // ── Welch's Independent Two-Sample t-Test ─────────────────────────────────
  if (testType === 'two_sample_columns') {
    if (!column2 || !headers.includes(column2)) {
      throw new Error(`Second column "${column2}" not found in dataset.`)
    }

    const getCleanNumeric = (colName) => {
      const out = []
      for (const v of columns[colName]) {
        if (v === '' || v === null || v === undefined) continue
        const num = Number(String(v).trim().replace(/,/g, ''))
        if (!Number.isNaN(num) && Number.isFinite(num)) out.push(num)
      }
      return out
    }

    const group1 = getCleanNumeric(column)
    const group2 = getCleanNumeric(column2)

    if (group1.length < 2 || group2.length < 2) {
      throw new Error(
        `Both groups must have at least 2 valid numeric values (Group 1: ${group1.length}, Group 2: ${group2.length}).`
      )
    }

    const n1 = group1.length
    const n2 = group2.length
    const m1 = group1.reduce((a, b) => a + b, 0) / n1
    const m2 = group2.reduce((a, b) => a + b, 0) / n2

    const v1 = group1.reduce((a, x) => a + Math.pow(x - m1, 2), 0) / (n1 - 1)
    const v2 = group2.reduce((a, x) => a + Math.pow(x - m2, 2), 0) / (n2 - 1)

    // Welch's t-test — no equal-variance assumption
    const se1 = v1 / n1
    const se2 = v2 / n2
    const seDiff = Math.sqrt(se1 + se2)

    if (seDiff === 0) {
      throw new Error('Combined standard error is zero; both groups appear to have identical constant values.')
    }

    const meanDiff = m1 - m2
    const tStat = meanDiff / seDiff

    // Welch–Satterthwaite degrees of freedom
    const dfNum = Math.pow(se1 + se2, 2)
    const dfDenom = Math.pow(se1, 2) / (n1 - 1) + Math.pow(se2, 2) / (n2 - 1)
    const df = dfDenom > 0 ? Math.round((dfNum / dfDenom) * 10) / 10 : n1 + n2 - 2

    const pValue = studentT_pvalue(tStat, df, alternative)
    const ci = computeCI(meanDiff, seDiff, df, alpha)

    const reject = pValue !== null && pValue < alpha
    const altLabel = alternative === 'two-sided'
      ? 'μ₁ ≠ μ₂'
      : alternative === 'less'
        ? 'μ₁ < μ₂'
        : 'μ₁ > μ₂'

    const decision = reject
      ? `Reject H₀: Sufficient evidence that ${altLabel} at α = ${alpha} (p = ${pValue !== null ? pValue.toFixed(4) : 'N/A'}).`
      : `Fail to reject H₀: Insufficient evidence that ${altLabel} at α = ${alpha} (p = ${pValue !== null ? pValue.toFixed(4) : 'N/A'}).`

    return {
      testType: "Welch's Two-Sample t-test (Independent Groups)",
      group1Column: column,
      group2Column: column2,
      n1,
      n2,
      mean1: round(m1, 4),
      mean2: round(m2, 4),
      meanDifference: round(meanDiff, 4),
      standardError: round(seDiff, 4),
      tStatistic: round(tStat, 4),
      degreesOfFreedom: df,
      alternative,
      pValue: pValue !== null ? round(pValue, 6) : null,
      significanceLevel: alpha,
      rejectNull: reject,
      decision,
      confidenceInterval: ci,
      interpretation: `${decision} Mean difference = ${round(meanDiff, 3)} (95% CI: ${ci.lower} to ${ci.upper}, df = ${round(df, 1)}).`,
      // ── Corrected per Phase 38.1 specification ──
      assumptions: [
        'Observations are independent within each group and between groups.',
        'Distributions within each group are approximately normal (especially important for small samples; relaxed for n ≥ 30 per the Central Limit Theorem).',
        'The outcome variable is continuous.',
        "Welch's correction is applied — unequal population variances between groups are permitted.",
      ],
    }
  }

  throw new Error(`Unsupported test type "${testType}". Supported: one_sample, two_sample_columns.`)
}

/**
 * Returns an illustrative sample dataset based on publicly available MoSPI survey data.
 *
 * PROVENANCE NOTE: These values are derived from MoSPI Consumer Price Index and
 * Household Consumption Expenditure Survey (HCES) 2022-23 published data.
 * Source: Ministry of Statistics and Programme Implementation (MoSPI), Government of India.
 * Reference URL: https://mospi.gov.in/consumer-price-index
 * Reference Period: Base Year 2012 = 100; approximate 2023 reference period.
 * Coverage: 17 States and Union Territories (illustrative, not exhaustive).
 * Units: CPI indices are index numbers (base 2012=100); MPCE in Indian Rupees (Rs.);
 *        inflation rate in percentage per annum.
 * Transformations: State-level figures are illustrative approximations derived from
 *   published MoSPI CPI and HCES tabulations. Treat as a sample for learning purposes,
 *   not as citable primary data. Consult the official MoSPI website for authoritative figures.
 * LABEL: Illustrative dataset based on MoSPI CPI & HCES 2022-23 (approximate values).
 */
function getSampleSurveyDataset() {
  const sampleCsv = `state_ut,zone,rural_cpi,urban_cpi,combined_cpi,monthly_per_capita_expenditure_rs,survey_sample_size,food_inflation_rate
Andhra Pradesh,South,178.4,175.2,176.8,4850,2400,5.8
Assam,North East,182.1,179.6,180.9,3920,1850,6.2
Bihar,East,184.6,181.2,182.9,3410,3200,6.5
Delhi,North,171.2,173.8,172.5,7680,1200,4.9
Gujarat,West,174.5,176.9,175.7,5620,2600,5.4
Haryana,North,179.8,177.4,178.6,6340,1650,5.7
Karnataka,South,176.2,177.9,177.1,5490,2500,5.3
Kerala,South,180.5,182.1,181.3,6950,1900,5.9
Madhya Pradesh,Central,181.9,178.7,180.3,3780,2850,6.1
Maharashtra,West,175.8,178.2,177.0,6120,3500,5.2
Odisha,East,183.2,179.8,181.5,3640,2100,6.3
Punjab,North,177.6,176.4,177.0,5980,1800,5.5
Rajasthan,North,180.2,178.5,179.4,4520,2700,6.0
Tamil Nadu,South,179.1,177.8,178.5,5830,2900,5.6
Telangana,South,177.9,176.8,177.4,5340,2250,5.5
Uttar Pradesh,Central,183.8,180.5,182.2,3580,4800,6.4
West Bengal,East,181.4,179.1,180.3,4210,3100,6.1`

  return {
    filename: 'mospi_state_cpi_consumption_sample.csv',
    content: sampleCsv,
    provenance: {
      label: 'Illustrative dataset based on MoSPI CPI & HCES 2022-23 (approximate values)',
      source: 'Ministry of Statistics and Programme Implementation (MoSPI), Government of India',
      url: 'https://mospi.gov.in/consumer-price-index',
      referencePeriod: 'Base Year 2012 = 100; approximate 2022-23 reference period',
      coverage: '17 Indian States and Union Territories (illustrative, not exhaustive)',
      units: {
        rural_cpi: 'Index number (base year 2012 = 100)',
        urban_cpi: 'Index number (base year 2012 = 100)',
        combined_cpi: 'Index number (base year 2012 = 100)',
        monthly_per_capita_expenditure_rs: 'Indian Rupees (Rs.) per month per person',
        survey_sample_size: 'Number of households surveyed (approximate)',
        food_inflation_rate: 'Percentage per annum (%)',
      },
      disclaimer:
        'These figures are illustrative approximations derived from published MoSPI tabulations. ' +
        'They are provided for learning purposes only. For authoritative data, consult the official MoSPI website.',
    },
  }
}

function round(val, decimals = 4) {
  if (val === null || val === undefined || Number.isNaN(val)) return null
  const factor = Math.pow(10, decimals)
  return Math.round(val * factor) / factor
}

module.exports = {
  detectDelimiter,
  stripBom,
  sanitizeColumnName,
  inferColumnTypes,
  parseDataset,
  parseExcelBuffer,
  buildDatasetFromRows,
  computeDescriptiveStats,
  computePercentile,
  computeCorrelationMatrix,
  computeLinearRegression,
  computeHypothesisTest,
  getSampleSurveyDataset,
  // Exposed for testing
  logGamma,
  ibeta,
  studentTCDF,
  studentT_pvalue,
  studentTInv,
  computeCI,
}

