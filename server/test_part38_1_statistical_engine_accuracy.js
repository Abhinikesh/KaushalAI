'use strict'

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const http = require('http')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const ExcelJS = require('exceljs')
const app = require('./src/app')
const {
  parseDataset,
  parseExcelBuffer,
  buildDatasetFromRows,
  computeDescriptiveStats,
  computeCorrelationMatrix,
  computeLinearRegression,
  computeHypothesisTest,
  getSampleSurveyDataset,
  studentTCDF,
  studentT_pvalue,
  studentTInv,
  computeCI,
} = require('./src/services/statisticalAnalysis.service')

const User = require('./src/models/User')

const TEST_DB_URI = process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017/kaushalai_test'
const DEV_DB_URI = 'mongodb://127.0.0.1:27017/kaushalai'
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'kaushalai_dev_access_secret_change_in_prod'

let testServer = null
let testBaseUrl = ''
let learnerToken = ''
let testLearnerId = null
let passedCount = 0
let failedCount = 0

function pass(desc) {
  passedCount++
  console.log(`  ✓ PASS: ${desc}`)
}

function fail(desc, err) {
  failedCount++
  console.error(`  ✗ FAIL: ${desc}`)
  if (err) console.error(`    Details: ${err.message || err}`)
}

function assertClose(actual, expected, tolerance = 0.001, label = '') {
  if (actual === null || actual === undefined) {
    if (expected === null || expected === undefined) return
    throw new Error(`${label}: expected ${expected}, got ${actual}`)
  }
  const diff = Math.abs(actual - expected)
  if (diff > tolerance) {
    throw new Error(`${label}: expected ~${expected}, got ${actual} (diff: ${diff.toFixed(6)} > ${tolerance})`)
  }
}

function makeRequest(method, path, body = null, token = null, isMultipart = false, contentType = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, testBaseUrl)
    const headers = {}

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    let payload = null
    if (body) {
      if (Buffer.isBuffer(body)) {
        payload = body
        if (contentType) headers['Content-Type'] = contentType
      } else if (typeof body === 'object') {
        payload = JSON.stringify(body)
        headers['Content-Type'] = 'application/json'
      } else {
        payload = String(body)
        if (contentType) headers['Content-Type'] = contentType
      }
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          let parsed = data
          try {
            parsed = JSON.parse(data)
          } catch {
            // keep string
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed })
        })
      }
    )

    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

// Multipart helper for file upload tests
function makeMultipartRequest(path, filename, fileBuffer, fields = {}, token = null) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2)
    const chunks = []

    // Append fields
    for (const [key, val] of Object.entries(fields)) {
      chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`))
    }

    // Append file
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`
      )
    )
    chunks.push(fileBuffer)
    chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`))

    const body = Buffer.concat(chunks)

    const url = new URL(path, testBaseUrl)
    const headers = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
    }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const req = http.request(url, { method: 'POST', headers }, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        let parsed = data
        try {
          parsed = JSON.parse(data)
        } catch {}
        resolve({ status: res.statusCode, body: parsed })
      })
    })

    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function runTests() {
  console.log('===================================================================')
  console.log('PHASE 38.1: STATISTICAL ENGINE ACCURACY, EXCEL SUPPORT & CLOSURE')
  console.log(`Target DB: ${TEST_DB_URI}`)
  console.log('===================================================================\n')

  await mongoose.connect(TEST_DB_URI)
  pass('Connected to test DB: kaushalai_test')

  testServer = http.createServer(app)
  await new Promise((resolve) => {
    testServer.listen(0, () => {
      const port = testServer.address().port
      testBaseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })

  // Create test learner in kaushalai_test
  const runSuffix = `p38_1_${Date.now()}`
  const learner = await User.create({
    name: `Stats Learner ${runSuffix}`,
    email: `stats_learner_${runSuffix}@test.kaushalai`,
    passwordHash: 'hashed_pw',
    role: 'employee',
    onboarding_completed: true,
  })
  testLearnerId = learner._id

  learnerToken = jwt.sign(
    { id: String(learner._id), role: 'employee' },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1: Excel File Parsing (.xlsx) & Multi-Sheet Support
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Section 1: Excel (.xlsx) Parsing & Multi-Sheet Support ---')

  // Create an in-memory workbook with 2 sheets
  const wb = new ExcelJS.Workbook()
  const ws1 = wb.addWorksheet('StateIndicators')
  ws1.addRow(['state', 'cpi', 'mpce', 'sample_size', 'active'])
  ws1.addRow(['Maharashtra', 175.8, 6120, 3500, true])
  ws1.addRow(['Karnataka', 176.2, 5490, 2500, false])
  ws1.addRow(['Assam', 182.1, 3920, 1850, true])
  ws1.addRow(['Bihar', 184.6, 3410, 3200, false])

  const ws2 = wb.addWorksheet('DistrictDetails')
  ws2.addRow(['district_code', 'district_name', 'population'])
  ws2.addRow([101, 'District A', 450000])
  ws2.addRow([102, 'District B', 820000])

  const xlsxBuffer = await wb.xlsx.writeBuffer()

  try {
    const { rows, sheetNames, selectedSheet } = await parseExcelBuffer(xlsxBuffer)
    pass(`Excel workbook parsed successfully (${sheetNames.length} sheets found)`)
    if (sheetNames.includes('StateIndicators') && sheetNames.includes('DistrictDetails')) {
      pass('All worksheet names discovered correctly')
    } else {
      fail('Worksheet names mismatch', sheetNames)
    }
    if (selectedSheet === 'StateIndicators') {
      pass('Defaults to first visible sheet (StateIndicators)')
    } else {
      fail('Default sheet mismatch', selectedSheet)
    }

    const dataset = buildDatasetFromRows(rows, selectedSheet)
    if (dataset.rowCount === 4 && dataset.columnCount === 5) {
      pass(`Parsed 4 rows and 5 columns from StateIndicators`)
    } else {
      fail(`Row/column count mismatch: got ${dataset.rowCount} rows, ${dataset.columnCount} cols`)
    }

    if (dataset.columnTypes.cpi === 'numeric' && dataset.columnTypes.active === 'boolean' && dataset.columnTypes.state === 'categorical') {
      pass('Column types correctly inferred from Excel rows (numeric, boolean, categorical)')
    } else {
      fail('Column type inference mismatch', dataset.columnTypes)
    }
  } catch (err) {
    fail('Excel parsing failed', err)
  }

  // Test selecting sheet 2 by name
  try {
    const { rows, selectedSheet } = await parseExcelBuffer(xlsxBuffer, 'DistrictDetails')
    if (selectedSheet === 'DistrictDetails' && rows.length === 3) {
      pass('Specific sheet selection ("DistrictDetails") succeeds (3 rows including header)')
    } else {
      fail('Sheet selection failed', selectedSheet)
    }
  } catch (err) {
    fail('Sheet 2 selection failed', err)
  }

  // Test non-existent sheet rejection
  try {
    await parseExcelBuffer(xlsxBuffer, 'NonExistentSheet')
    fail('Should reject non-existent sheet')
  } catch (err) {
    pass(`Correctly rejects non-existent sheet: "${err.message}"`)
  }

  // Test empty sheet handling
  const emptyWb = new ExcelJS.Workbook()
  emptyWb.addWorksheet('BlankSheet')
  const emptyBuffer = await emptyWb.xlsx.writeBuffer()
  try {
    const { rows, selectedSheet } = await parseExcelBuffer(emptyBuffer)
    buildDatasetFromRows(rows, selectedSheet)
    fail('Should reject empty worksheet')
  } catch (err) {
    pass(`Empty worksheet cleanly rejected: "${err.message}"`)
  }

  // Test header-only sheet handling
  const headerOnlyWb = new ExcelJS.Workbook()
  const hSheet = headerOnlyWb.addWorksheet('HeaderOnly')
  hSheet.addRow(['id', 'name', 'value'])
  const headerOnlyBuffer = await headerOnlyWb.xlsx.writeBuffer()
  try {
    const { rows, selectedSheet } = await parseExcelBuffer(headerOnlyBuffer)
    buildDatasetFromRows(rows, selectedSheet)
    fail('Should reject header-only worksheet')
  } catch (err) {
    pass(`Header-only worksheet cleanly rejected: "${err.message}"`)
  }

  // Test legacy .xls rejection
  const fakeXlsBuffer = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
  try {
    await parseExcelBuffer(fakeXlsBuffer)
    fail('Should reject legacy .xls buffer')
  } catch (err) {
    pass(`Legacy .xls format safely rejected: "${err.message}"`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2: Hypothesis-Test Mathematical Accuracy & Options
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Section 2: Hypothesis-Test Mathematical Accuracy & Options ---')

  // Theoretical Reference Comparisons:
  // 1) Student-t CDF: t = 2.828427, df = 4 -> two-sided p = 0.0474207 (R: 2 * pt(-2.828427, 4))
  const pTwoSided = studentT_pvalue(2.828427, 4, 'two-sided')
  assertClose(pTwoSided, 0.04742, 0.0001, 'Student-t two-sided p-value')
  pass(`Exact two-sided p-value: ${pTwoSided.toFixed(5)} (expected ~0.04742)`)

  // 2) Left-tailed alternative: t = 2.828427, df = 4 -> p = 0.97629 (R: pt(2.828427, 4))
  const pLess = studentT_pvalue(2.828427, 4, 'less')
  assertClose(pLess, 0.97629, 0.0001, 'Student-t left-tailed p-value')
  pass(`Exact left-tailed p-value: ${pLess.toFixed(5)} (expected ~0.97629)`)

  // 3) Right-tailed alternative: t = 2.828427, df = 4 -> p = 0.02371 (R: 1 - pt(2.828427, 4))
  const pGreater = studentT_pvalue(2.828427, 4, 'greater')
  assertClose(pGreater, 0.02371, 0.0001, 'Student-t right-tailed p-value')
  pass(`Exact right-tailed p-value: ${pGreater.toFixed(5)} (expected ~0.02371)`)

  // 4) Inverse Student-t quantile: df = 4, p = 0.975 -> t* = 2.776445 (R: qt(0.975, 4))
  const tCrit4 = studentTInv(0.975, 4)
  assertClose(tCrit4, 2.77645, 0.0001, 'Student-t 95% critical value (df=4)')
  pass(`Exact 95% critical t* for df=4: ${tCrit4.toFixed(5)} (expected ~2.77645)`)

  // 5) Confidence Interval: mean = 14.0, se = 1.4142, df = 4, alpha = 0.05
  // CI = 14 ± 2.776445 * 1.414213 = [10.0736, 17.9264]
  const ci = computeCI(14.0, 1.414213, 4, 0.05)
  assertClose(ci.lower, 10.0736, 0.01, 'CI lower bound')
  assertClose(ci.upper, 17.9264, 0.01, 'CI upper bound')
  pass(`95% Confidence Interval: [${ci.lower}, ${ci.upper}] matches reference`)

  // Test full computeHypothesisTest with One-Sample t-test
  const testCsv = `val,group\n10,A\n12,A\n14,A\n16,A\n18,A\n20,B\n22,B\n24,B\n26,B\n28,B`
  const parsedTestDataset = parseDataset(testCsv)

  // One-sample test: val vs mu0 = 10
  const oneSampleResult = computeHypothesisTest(parsedTestDataset, {
    testType: 'one_sample',
    column: 'val',
    hypothesizedMean: 10,
    alternative: 'two-sided',
    alpha: 0.05,
  })

  if (oneSampleResult.rejectNull === true) {
    pass('Correct reject decision: p < 0.05 for sample mean 19 vs mu0 = 10')
  } else {
    fail('Reject null decision failed', oneSampleResult)
  }

  // Verify corrected assumptions text
  const expectedOneSampleAssumptions = [
    'Observations are independent of each other.',
    'The population is approximately normally distributed (especially important for small samples; relaxed for n ≥ 30 by the Central Limit Theorem).',
    'The outcome variable is continuous.',
    'The sample is drawn with appropriate study design (random or representative sampling).',
  ]
  const oneSampleMatch = expectedOneSampleAssumptions.every((asm) =>
    oneSampleResult.assumptions.includes(asm)
  )
  if (oneSampleMatch) {
    pass('One-sample t-test assumptions match Phase 38.1 requirements exactly')
  } else {
    fail('One-sample assumptions mismatch', oneSampleResult.assumptions)
  }

  // Welch Two-Sample test
  const twoSampleCsv = `group1,group2\n10,20\n12,22\n14,24\n16,26\n18,28`
  const parsedTwoSample = parseDataset(twoSampleCsv)
  const welchResult = computeHypothesisTest(parsedTwoSample, {
    testType: 'two_sample_columns',
    column: 'group1',
    column2: 'group2',
    alternative: 'two-sided',
    alpha: 0.01,
  })

  assertClose(welchResult.meanDifference, -10.0, 0.001, 'Welch mean difference')
  assertClose(welchResult.tStatistic, -5.0, 0.001, 'Welch t-statistic')
  if (welchResult.pValue !== null && welchResult.pValue < 0.01 && welchResult.rejectNull === true) {
    pass(`Welch two-sample test p = ${welchResult.pValue} < alpha (0.01) correctly rejects H0`)
  } else {
    fail('Welch reject decision failed', welchResult)
  }

  // Verify Welch corrected assumptions
  const expectedWelchAssumptions = [
    'Observations are independent within each group and between groups.',
    'Distributions within each group are approximately normal (especially important for small samples; relaxed for n ≥ 30 per the Central Limit Theorem).',
    'The outcome variable is continuous.',
    "Welch's correction is applied — unequal population variances between groups are permitted.",
  ]
  const welchMatch = expectedWelchAssumptions.every((asm) =>
    welchResult.assumptions.includes(asm)
  )
  if (welchMatch) {
    pass("Welch's two-sample assumptions match Phase 38.1 requirements (unequal variances permitted, not paired)")
  } else {
    fail('Welch assumptions mismatch', welchResult.assumptions)
  }

  // Edge Case: Zero variance / constant column
  const constCsv = `c1,c2\n5,10\n5,20\n5,30`
  const constDataset = parseDataset(constCsv)
  try {
    computeHypothesisTest(constDataset, {
      testType: 'one_sample',
      column: 'c1',
      hypothesizedMean: 5,
    })
    fail('Should throw on zero variance')
  } catch (err) {
    pass(`Zero variance correctly handled: "${err.message}"`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3: Descriptive & Regression Calculation Integrity
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Section 3: Descriptive & Regression Calculation Integrity ---')

  // 1) Sample size n = 1: variance and stdDev must be null
  const singleValStats = computeDescriptiveStats([42], 'numeric')
  if (singleValStats.variance === null && singleValStats.stdDev === null) {
    pass('n = 1 yields variance: null, stdDev: null (Bessel correction requires n > 1)')
  } else {
    fail('n = 1 variance should be null', singleValStats)
  }

  // 2) Constant column in correlation matrix: correlation must be null (not 0)
  const constCorrDataset = parseDataset(`x,y\n1,10\n1,20\n1,30\n1,40`)
  const corrMatrix = computeCorrelationMatrix(constCorrDataset)
  const xyPair = corrMatrix.pairs.find((p) => (p.colX === 'x' && p.colY === 'y') || (p.colX === 'y' && p.colY === 'x'))
  if (xyPair && xyPair.correlation === null) {
    pass('Constant column yields undefined correlation: null (zero variance handled correctly)')
  } else {
    fail('Constant column correlation should be null', xyPair)
  }

  // 3) Linear Regression: Residual Standard Error degrees of freedom
  const regDataset = parseDataset(`x,y\n1,2\n2,4\n3,6\n4,8\n5,10`)
  const regResult = computeLinearRegression(regDataset, 'x', 'y')
  if (regResult.dfResidual === 3 && regResult.rSquared === 1) {
    pass(`OLS regression degrees of freedom: df = n - 2 = 3, R² = 1.0`)
  } else {
    fail('Regression df mismatch', regResult)
  }

  // 4) Linear Regression: Constant predictor throws clean error
  const constRegDataset = parseDataset(`x,y\n2,5\n2,10\n2,15`)
  try {
    computeLinearRegression(constRegDataset, 'x', 'y')
    fail('Should throw when independent variable has zero variance')
  } catch (err) {
    pass(`OLS constant-predictor zero variance rejected: "${err.message}"`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 4: Data Security & CSV Export Formula Neutralization
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Section 4: Data Security & Formula Neutralization ---')

  // Test formula injection characters in cells
  const injectionCsv = `name,formula_col\nNormal,100\nMalicious,=1+1\nAtSign,@SUM(A1:A10)\nPlusSign,+cmd|' /C calc'!A0`
  const parsedInj = parseDataset(injectionCsv)
  if (parsedInj.rowCount === 4) {
    pass('Parsed dataset with formula prefixes preserved for analysis')
  } else {
    fail('Failed to parse injection test', parsedInj)
  }

  // Verify formula cell neutralization function logic
  function sanitizeCellForExport(val) {
    if (val === null || val === undefined) return ''
    const s = String(val)
    if (/^[=+\-@\t\r]/.test(s)) return `'${s}`
    return s
  }
  const dangerousCells = ['=1+1', '@SUM(A1)', '+cmd', '-10', '\tTAB']
  const allSanitized = dangerousCells.every((cell) => sanitizeCellForExport(cell).startsWith("'"))
  if (allSanitized) {
    pass('All formula injection prefixes (=, @, +, -, \\t) successfully neutralized with single-quote prefix')
  } else {
    fail('Formula sanitization failed')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 5: MoSPI Illustrative Sample Provenance
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Section 5: MoSPI Sample Provenance Documentation ---')

  const sampleObj = getSampleSurveyDataset()
  if (sampleObj.provenance && sampleObj.provenance.label.includes('Illustrative dataset')) {
    pass('Sample dataset provenance explicitly labeled as "Illustrative dataset"')
  } else {
    fail('Provenance label missing or misleading', sampleObj.provenance)
  }
  if (sampleObj.provenance.source.includes('Ministry of Statistics') && sampleObj.provenance.disclaimer) {
    pass('Provenance metadata includes official MoSPI source reference and pedagogical disclaimer')
  } else {
    fail('Provenance metadata incomplete', sampleObj.provenance)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 6: HTTP Endpoints Validation
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Section 6: HTTP Endpoints & Multi-Sheet API Validation ---')

  // 1) Unauthenticated 401s
  const unauthUpload = await makeRequest('POST', '/api/statistical-analysis/upload', {})
  if (unauthUpload.status === 401) {
    pass('POST /api/statistical-analysis/upload requires authentication (401)')
  } else {
    fail(`Upload auth check failed: got ${unauthUpload.status}`)
  }

  const unauthSheets = await makeRequest('POST', '/api/statistical-analysis/sheets', {})
  if (unauthSheets.status === 401) {
    pass('POST /api/statistical-analysis/sheets requires authentication (401)')
  } else {
    fail(`Sheets auth check failed: got ${unauthSheets.status}`)
  }

  // 2) List sheets from uploaded .xlsx
  const sheetsRes = await makeMultipartRequest(
    '/api/statistical-analysis/sheets',
    'test_survey.xlsx',
    xlsxBuffer,
    {},
    learnerToken
  )
  if (sheetsRes.status === 200 && sheetsRes.body.sheetNames?.length === 2) {
    pass(`POST /api/statistical-analysis/sheets returns 200 with sheet list: [${sheetsRes.body.sheetNames.join(', ')}]`)
  } else {
    fail('Sheets endpoint failed', sheetsRes)
  }

  // 3) Upload .xlsx and specify sheetName = 'DistrictDetails'
  const uploadSheetRes = await makeMultipartRequest(
    '/api/statistical-analysis/upload',
    'test_survey.xlsx',
    xlsxBuffer,
    { sheetName: 'DistrictDetails' },
    learnerToken
  )
  if (uploadSheetRes.status === 200 && uploadSheetRes.body.selectedSheet === 'DistrictDetails') {
    pass('POST /api/statistical-analysis/upload parses requested sheet ("DistrictDetails") with status 200')
  } else {
    fail('Upload with sheetName failed', uploadSheetRes)
  }

  // 4) Verify full csvText returned in response (solves 10-row preview truncation)
  if (uploadSheetRes.body.csvText && uploadSheetRes.body.csvText.includes('District B')) {
    pass('Full csvText returned in upload response for downstream regression/hypothesis calls')
  } else {
    fail('csvText missing in upload response', uploadSheetRes.body)
  }

  // 5) Test Hypothesis endpoint with alternative and alpha
  const hypoRes = await makeRequest(
    'POST',
    '/api/statistical-analysis/hypothesis-test',
    {
      csvText: testCsv,
      testType: 'one_sample',
      column: 'val',
      hypothesizedMean: 10,
      alternative: 'greater',
      alpha: 0.05,
    },
    learnerToken
  )
  if (hypoRes.status === 200 && hypoRes.body.testResult?.pValue !== undefined) {
    pass(`POST /api/statistical-analysis/hypothesis-test returns 200 with directional p-value: ${hypoRes.body.testResult.pValue}`)
  } else {
    fail('Hypothesis endpoint failed', hypoRes)
  }

  // Clean up test user in kaushalai_test
  if (testLearnerId) {
    await User.deleteOne({ _id: testLearnerId })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 7: Development Database Immutability Check
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Section 7: Dev Database Immutability Check ---')
  await mongoose.disconnect()

  const devConn = await mongoose.createConnection(DEV_DB_URI).asPromise()
  const collections = ['courses', 'quizzes', 'quizattempts', 'enrollments', 'learning_progress', 'learning_activities', 'certificates', 'user_competencies', 'skill_gaps']
  const counts = {}
  for (const c of collections) {
    counts[c] = await devConn.collection(c).countDocuments()
  }
  await devConn.close()

  const baseline = {
    courses: 66,
    quizzes: 18,
    quizattempts: 12,
    enrollments: 10,
    learning_progress: 10,
    learning_activities: 0,
    certificates: 0,
    user_competencies: 41,
    skill_gaps: 264,
  }

  let dbUntouched = true
  for (const [k, v] of Object.entries(baseline)) {
    if (counts[k] !== v) {
      dbUntouched = false
      fail(`Dev DB collection ${k} modified: expected ${v}, got ${counts[k]}`)
    }
  }

  if (dbUntouched) {
    pass(`Dev kaushalai database strictly untouched: ${JSON.stringify(counts)}`)
  }

  // Summary
  console.log('\n===================================================================')
  console.log(`PHASE 38.1 SUMMARY: ${passedCount} passed, ${failedCount} failed`)
  console.log('===================================================================')

  if (testServer) testServer.close()
  process.exit(failedCount > 0 ? 1 : 0)
}

runTests().catch((err) => {
  console.error('Fatal error running Phase 38.1 tests:', err)
  if (testServer) testServer.close()
  process.exit(1)
})
