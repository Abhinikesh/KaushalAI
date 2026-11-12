'use strict'

/**
 * test_part38_statistical_analysis.js
 * Phase 38 — KaushalAI Statistical Analysis Capability & Integrity Test Suite
 *
 * Validates:
 *  A. Mathematical computation correctness (Descriptive, Outliers, Correlation, OLS Regression, t-tests)
 *  B. Dataset parsing integrity (delimiters, BOM, missing values, empty files, CSV injection defense)
 *  C. HTTP API endpoint functionality & validation (Upload, Regression, Hypothesis, Sample)
 *  D. Security & authorization boundaries (401 unauthenticated, 200 learner/admin)
 *  E. Development database immutability verification (kaushalai untouched)
 *
 * Uses kaushalai_test for database connection; pure in-memory math testing for analysis functions.
 */

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const http = require('http')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const { validateTestDatabaseUri } = require('./src/test/testDbGuard')

const {
  parseDataset,
  computeDescriptiveStats,
  computePercentile,
  computeCorrelationMatrix,
  computeLinearRegression,
  computeHypothesisTest,
  getSampleSurveyDataset,
  detectDelimiter,
  stripBom,
  sanitizeColumnName,
} = require('./src/services/statisticalAnalysis.service')

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET
const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/kaushalai_test'
const devDbUri = 'mongodb://127.0.0.1:27017/kaushalai'

validateTestDatabaseUri(testDbUri)

let totalPassed = 0
let totalFailed = 0
const failDetails = []

function assertOk(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    totalPassed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    totalFailed++
    failDetails.push(message)
  }
}

function assertClose(actual, expected, tolerance = 0.001, message = '') {
  const diff = Math.abs(actual - expected)
  assertOk(diff <= tolerance, `${message} (expected ~${expected}, got ${actual}, diff ${diff.toFixed(5)})`)
}

function makeRequest(port, options, body = null) {
  return new Promise((resolve, reject) => {
    const headers = { ...(options.headers || {}) }
    let payload = null
    if (body !== null && body !== undefined) {
      payload = typeof body === 'string' ? body : JSON.stringify(body)
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'
      headers['Content-Length'] = Buffer.byteLength(payload)
    }
    const req = http.request({ port, host: '127.0.0.1', ...options, headers }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} })
        } catch {
          resolve({ status: res.statusCode, body: data })
        }
      })
    })
    req.on('error', reject)
    if (payload !== null) req.write(payload)
    req.end()
  })
}

async function runTests() {
  console.log('===================================================================')
  console.log('PHASE 38: STATISTICAL ANALYSIS CAPABILITY & INTEGRITY')
  console.log('Target DB: ' + testDbUri)
  console.log('===================================================================')

  await mongoose.connect(testDbUri)
  const dbName = mongoose.connection.db.databaseName
  assertOk(dbName === 'kaushalai_test', `Connected to test DB: ${dbName}`)

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1: Pure Mathematical Correctness Tests
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Section 1: Mathematical Correctness of Descriptive Statistics ---')

  // Known Dataset 1: Simple linear sequence [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  const seq10 = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  const stats1 = computeDescriptiveStats(seq10, 'numeric')

  assertOk(stats1.validCount === 10, 'Count is 10')
  assertClose(stats1.mean, 55.0, 0.0001, 'Mean is 55.0')
  assertClose(stats1.median, 55.0, 0.0001, 'Median is 55.0')
  assertClose(stats1.min, 10.0, 0.0001, 'Min is 10.0')
  assertClose(stats1.max, 100.0, 0.0001, 'Max is 100.0')
  assertClose(stats1.range, 90.0, 0.0001, 'Range is 90.0')
  // Sample variance = sum((x - 55)^2) / 9 = 8250 / 9 = 916.6667
  assertClose(stats1.variance, 916.6667, 0.01, 'Sample variance is 916.67')
  // Sample std dev = sqrt(916.6667) = 30.2765
  assertClose(stats1.stdDev, 30.2765, 0.01, 'Sample standard deviation is 30.28')
  // Percentiles: Q1 = 32.5, Q3 = 77.5, IQR = 45.0
  assertClose(stats1.q1, 32.5, 0.01, 'Q1 (25th percentile) is 32.5')
  assertClose(stats1.q3, 77.5, 0.01, 'Q3 (75th percentile) is 77.5')
  assertClose(stats1.iqr, 45.0, 0.01, 'IQR is 45.0')
  assertOk(stats1.outliersCount === 0, 'Zero outliers detected in uniform sequence')
  assertClose(stats1.skewness, 0.0, 0.001, 'Skewness is 0 for symmetric distribution')

  // Known Dataset 2: Tukey Outlier Detection
  // [10, 11, 12, 13, 14, 15, 100] -> 100 is an extreme outlier
  const outlierSeq = [10, 11, 12, 13, 14, 15, 100]
  const statsOutlier = computeDescriptiveStats(outlierSeq, 'numeric')
  assertOk(statsOutlier.outliersCount === 1, 'Correctly detected exactly 1 outlier')
  assertOk(statsOutlier.outlierUpperFence < 100, `Upper fence (${statsOutlier.outlierUpperFence}) is below 100`)
  assertOk(statsOutlier.skewness > 1.0, `Positive skewness detected (${statsOutlier.skewness} > 1.0)`)

  // Known Dataset 3: Categorical Frequencies
  const catSeq = ['Urban', 'Rural', 'Rural', 'Rural', 'Urban', 'Semi-Urban']
  const statsCat = computeDescriptiveStats(catSeq, 'categorical')
  assertOk(statsCat.validCount === 6, 'Categorical count is 6')
  assertOk(statsCat.mode === 'Rural', 'Categorical mode is Rural')
  assertOk(statsCat.uniqueCount === 3, 'Unique count is 3')
  const ruralFreq = statsCat.frequencies.find((f) => f.category === 'Rural')
  assertOk(ruralFreq && ruralFreq.count === 3 && ruralFreq.percentage === 50, 'Rural frequency is 3 (50%)')

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2: Correlation & OLS Linear Regression Mathematical Correctness
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Section 2: Correlation and Linear Regression Mathematical Correctness ---')

  // Perfect Positive Linear: y = 2x + 1
  // x = [1, 2, 3, 4, 5], y = [3, 5, 7, 9, 11]
  const mockDataset1 = {
    headers: ['x', 'y'],
    columnTypes: { x: 'numeric', y: 'numeric' },
    columns: {
      x: ['1', '2', '3', '4', '5'],
      y: ['3', '5', '7', '9', '11'],
    },
  }

  const corr1 = computeCorrelationMatrix(mockDataset1)
  assertClose(corr1.pairs[0].correlation, 1.0, 0.0001, 'Perfect positive Pearson correlation r = 1.0')

  const reg1 = computeLinearRegression(mockDataset1, 'x', 'y')
  assertClose(reg1.slope, 2.0, 0.0001, 'Regression slope = 2.0')
  assertClose(reg1.intercept, 1.0, 0.0001, 'Regression intercept = 1.0')
  assertClose(reg1.rSquared, 1.0, 0.0001, 'Coefficient of determination R² = 1.0')
  assertClose(reg1.stdError, 0.0, 0.0001, 'Standard error of regression S_e = 0.0')

  // Perfect Negative Linear: y = -2x + 12
  // x = [1, 2, 3, 4, 5], y = [10, 8, 6, 4, 2]
  const mockDataset2 = {
    headers: ['x', 'y'],
    columnTypes: { x: 'numeric', y: 'numeric' },
    columns: {
      x: ['1', '2', '3', '4', '5'],
      y: ['10', '8', '6', '4', '2'],
    },
  }
  const corr2 = computeCorrelationMatrix(mockDataset2)
  assertClose(corr2.pairs[0].correlation, -1.0, 0.0001, 'Perfect negative Pearson correlation r = -1.0')

  const reg2 = computeLinearRegression(mockDataset2, 'x', 'y')
  assertClose(reg2.slope, -2.0, 0.0001, 'Regression slope = -2.0')
  assertClose(reg2.intercept, 12.0, 0.0001, 'Regression intercept = 12.0')

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3: Parametric Hypothesis Testing Mathematical Correctness
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Section 3: Parametric Hypothesis Testing Mathematical Correctness ---')

  // One-sample t-test:
  // Data: [10, 12, 14, 16, 18], n = 5, mean = 14, sample variance = 10, sample std = sqrt(10) = 3.162277
  // Hypothesized mean mu_0 = 10
  // Standard error = sqrt(10) / sqrt(5) = sqrt(2) = 1.414213
  // t = (14 - 10) / 1.414213 = 4 / 1.414213 = 2.8284
  // df = 4
  const mockHypoDataset = {
    headers: ['score'],
    columns: { score: ['10', '12', '14', '16', '18'] },
  }
  const tTest1 = computeHypothesisTest(mockHypoDataset, {
    testType: 'one_sample',
    column: 'score',
    hypothesizedMean: 10,
  })

  assertOk(tTest1.n === 5, 'Sample size n = 5')
  assertClose(tTest1.sampleMean, 14.0, 0.0001, 'Sample mean is 14.0')
  assertClose(tTest1.meanDifference, 4.0, 0.0001, 'Mean difference is 4.0')
  assertClose(tTest1.standardError, 1.4142, 0.001, 'Standard error is 1.414')
  assertClose(tTest1.tStatistic, 2.8284, 0.001, 't-statistic is 2.8284')
  assertOk(tTest1.degreesOfFreedom === 4, 'Degrees of freedom df = 4')
  assertOk(tTest1.assumptions.length === 3, 'Includes 3 formal statistical assumptions')

  // Two-sample Welch t-test:
  // Group 1: [10, 12, 14, 16, 18] -> n1=5, m1=14, v1=10
  // Group 2: [20, 22, 24, 26, 28] -> n2=5, m2=24, v2=10
  // Difference = 14 - 24 = -10
  // SE = sqrt(10/5 + 10/5) = sqrt(4) = 2.0
  // t = -10 / 2 = -5.0
  const mockTwoSampleDataset = {
    headers: ['g1', 'g2'],
    columns: {
      g1: ['10', '12', '14', '16', '18'],
      g2: ['20', '22', '24', '26', '28'],
    },
  }
  const tTest2 = computeHypothesisTest(mockTwoSampleDataset, {
    testType: 'two_sample_columns',
    column: 'g1',
    column2: 'g2',
  })
  assertClose(tTest2.meanDifference, -10.0, 0.0001, 'Two-sample mean difference is -10.0')
  assertClose(tTest2.standardError, 2.0, 0.0001, 'Combined standard error is 2.0')
  assertClose(tTest2.tStatistic, -5.0, 0.0001, 'Two-sample t-statistic is -5.0')

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4: Dataset Parsing Integrity & Sanitization
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Section 4: Dataset Parsing Integrity & Sanitization ---')

  // Delimiter auto-detection: tab-delimited
  const tsvText = 'id\tname\tscore\n1\tAlice\t85\n2\tBob\t92\n'
  assertOk(detectDelimiter(tsvText) === '\t', 'Auto-detected tab delimiter')

  // Semicolon-delimited
  const semiText = 'id;name;score\n1;Alice;85\n2;Bob;92\n'
  assertOk(detectDelimiter(semiText) === ';', 'Auto-detected semicolon delimiter')

  // UTF-8 BOM Stripping
  const bomBuffer = Buffer.from([0xef, 0xbb, 0xbf, 0x61, 0x2c, 0x62, 0x0a, 0x31, 0x2c, 0x32])
  const stripped = stripBom(bomBuffer)
  assertOk(stripped[0] === 0x61, 'UTF-8 BOM successfully stripped')

  // CSV Injection prevention in header
  const safeHeader = sanitizeColumnName('=cmd|/C calc!A0', 0)
  assertOk(!safeHeader.startsWith('='), 'CSV formula prefix "=" stripped')

  // Missing values and null handling in parseDataset
  const csvWithNulls = `id,measure,category\n1,10.5,A\n2,,B\n3,NA,C\n4,15.2,null\n`
  const parsedNulls = parseDataset(csvWithNulls)
  assertOk(parsedNulls.rowCount === 4, 'Parsed 4 rows')
  assertOk(parsedNulls.columnTypes.measure === 'numeric', 'Identified numeric column despite missing values')
  assertOk(parsedNulls.totalMissingCells >= 2, 'Counted missing/NA cells')

  // Error handling: Empty file
  let caughtEmpty = false
  try {
    parseDataset('')
  } catch (err) {
    caughtEmpty = true
    assertOk(err.message.includes('empty'), 'Empty dataset cleanly rejected with error')
  }
  assertOk(caughtEmpty, 'Rejected empty dataset')

  // Error handling: Header only
  let caughtHeaderOnly = false
  try {
    parseDataset('col1,col2\n')
  } catch (err) {
    caughtHeaderOnly = true
    assertOk(err.message.includes('no data rows'), 'Header-only dataset cleanly rejected with error')
  }
  assertOk(caughtHeaderOnly, 'Rejected header-only dataset')

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 5: HTTP Endpoints & Security Validation
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Section 5: HTTP Endpoints & Security Validation ---')

  const User = require('./src/models/User')
  const app = require('./src/app')

  const server = await new Promise((resolve) => {
    const s = http.createServer(app)
    s.listen(0, '127.0.0.1', () => resolve(s))
  })
  const port = server.address().port

  // Create test user and tokens
  const runSuffix = `p38_${Date.now()}`
  const learner = await User.create({
    name: `Stats Learner ${runSuffix}`,
    email: `stats_learner_${runSuffix}@test.kaushalai`,
    passwordHash: 'hashed_pw',
    role: 'employee',
    onboarding_completed: true,
  })

  const learnerToken = jwt.sign({ id: String(learner._id), role: 'employee' }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
  const noAuth = {}
  const learnerAuth = { Authorization: `Bearer ${learnerToken}` }

  // Security: Unauthenticated access rejected with 401
  let res = await makeRequest(port, { method: 'POST', path: '/api/statistical-analysis/upload', headers: noAuth }, {})
  assertOk(res.status === 401, 'POST /api/statistical-analysis/upload rejected without auth (401)')

  res = await makeRequest(port, { method: 'POST', path: '/api/statistical-analysis/regression', headers: noAuth }, {})
  assertOk(res.status === 401, 'POST /api/statistical-analysis/regression rejected without auth (401)')

  res = await makeRequest(port, { method: 'POST', path: '/api/statistical-analysis/hypothesis-test', headers: noAuth }, {})
  assertOk(res.status === 401, 'POST /api/statistical-analysis/hypothesis-test rejected without auth (401)')

  // Sample survey dataset endpoint
  res = await makeRequest(port, { method: 'GET', path: '/api/statistical-analysis/sample', headers: learnerAuth })
  assertOk(res.status === 200, 'GET /api/statistical-analysis/sample returns 200')
  assertOk(typeof res.body.sample?.content === 'string', 'Returns sample CSV content')

  // End-to-end analysis on sample dataset via useSample flag
  res = await makeRequest(port, { method: 'POST', path: '/api/statistical-analysis/upload', headers: learnerAuth }, { useSample: true })
  assertOk(res.status === 200, 'POST /api/statistical-analysis/upload with useSample=true returns 200')
  assertOk(res.body.success === true, 'Response status success === true')
  assertOk(res.body.metadata.rowCount === 17, `Parsed exactly 17 MoSPI sample survey states (got ${res.body.metadata.rowCount})`)
  assertOk(res.body.metadata.headers.includes('combined_cpi'), 'Headers include combined_cpi')
  assertOk(res.body.statistics.combined_cpi.type === 'numeric', 'combined_cpi is inferred as numeric')
  assertOk(res.body.correlation.pairs.length > 0, 'Computed correlation pairs')

  // End-to-end regression endpoint
  const sampleCsvText = res.body.metadata ? getSampleSurveyDataset().content : ''
  res = await makeRequest(port, { method: 'POST', path: '/api/statistical-analysis/regression', headers: learnerAuth }, {
    csvText: sampleCsvText,
    xCol: 'rural_cpi',
    yCol: 'combined_cpi',
  })
  assertOk(res.status === 200, 'POST /api/statistical-analysis/regression returns 200')
  assertOk(typeof res.body.regression?.slope === 'number', 'Calculated regression slope')
  assertOk(res.body.regression?.rSquared > 0.5, 'Strong R-squared between rural CPI and combined CPI')

  // End-to-end hypothesis test endpoint
  res = await makeRequest(port, { method: 'POST', path: '/api/statistical-analysis/hypothesis-test', headers: learnerAuth }, {
    csvText: sampleCsvText,
    testType: 'one_sample',
    column: 'combined_cpi',
    hypothesizedMean: 175,
  })
  assertOk(res.status === 200, 'POST /api/statistical-analysis/hypothesis-test returns 200')
  assertOk(typeof res.body.testResult?.tStatistic === 'number', 'Calculated one-sample t-statistic')
  assertOk(res.body.testResult?.degreesOfFreedom === 16, '16 degrees of freedom for 17 states')

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 6: Development Database Baseline Verification
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Section 6: Dev Database Immutability Check ---')

  const devConn = await mongoose.createConnection(devDbUri).asPromise()
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
  let devOk = true
  for (const [coll, expected] of Object.entries(baseline)) {
    const actual = await devConn.db.collection(coll).countDocuments()
    if (actual !== expected) {
      console.error(`  ✗ FAIL: dev kaushalai.${coll} = ${actual} (expected ${expected})`)
      devOk = false
      totalFailed++
      failDetails.push(`dev kaushalai.${coll} = ${actual}, expected ${expected}`)
    }
  }
  await devConn.close()
  if (devOk) {
    console.log('  ✓ PASS: Dev kaushalai database strictly untouched')
    totalPassed++
  }

  // Cleanup
  await User.deleteOne({ _id: learner._id })
  server.close()
  await mongoose.disconnect()

  console.log('\n===================================================================')
  console.log(`PHASE 38 SUMMARY: ${totalPassed} passed, ${totalFailed} failed`)
  if (failDetails.length) {
    console.log('\nFailed tests:')
    failDetails.forEach((f) => console.log(`  ✗ ${f}`))
  }
  console.log('===================================================================\n')

  process.exit(totalFailed > 0 ? 1 : 0)
}

runTests().catch((err) => {
  console.error('[FATAL]', err)
  process.exit(1)
})

