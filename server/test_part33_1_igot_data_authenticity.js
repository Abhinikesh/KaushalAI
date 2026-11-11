/**
 * test_part33_1_igot_data_authenticity.js
 *
 * KAUSHALAI PHASE 33.1: iGOT DATA AUTHENTICITY & KPI SEMANTICS AUDIT
 *
 * Verifies that:
 * 1. Learning-hours KPI is strictly labeled as estimated course duration completed,
 *    not actual time spent learning or external monitored time.
 * 2. iGOT catalogue claims accurately distinguish local database-backed courses
 *    from live external iGOT platform synchronization.
 * 3. Local refetches are truthfully labeled as "Last refreshed" without manufacturing
 *    external synchronization timestamps.
 * 4. Component loading, error, retry, and empty states remain fully operational.
 * 5. Backend iGOT course queries and enrollment APIs conform to contracts.
 * 6. Development database remains strictly untouched.
 */

const fs = require('fs')
const path = require('path')
const http = require('http')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const app = require('./src/app')
const User = require('./src/models/User')
const Course = require('./src/models/Course')
const Enrollment = require('./src/models/Enrollment')
const { getCourseAdapter } = require('./src/services/adapters/igotAdapter')

const DEV_MONGO_URI = 'mongodb://127.0.0.1:27017/kaushalai'
const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/kaushalai_test'

let passed = 0
let failed = 0

function pass(msg) {
  passed++
  console.log(`  ✓ PASS: ${msg}`)
}

function fail(msg, err) {
  failed++
  console.error(`  ✗ FAIL: ${msg}`)
  if (err) console.error(err)
}

function assert(condition, message) {
  if (!condition) {
    fail(message)
    throw new Error(message)
  }
  pass(message)
}

function makeRequest(baseUrl, endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl)
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
    }

    const req = http.request(url, reqOptions, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(data) } catch (_) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json || data,
        })
      })
    })

    req.on('error', reject)
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
    }
    req.end()
  })
}

async function startTestServer() {
  await mongoose.connect(TEST_MONGO_URI)
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`
  return { server, port, baseUrl }
}

async function runSuite() {
  console.log('='.repeat(72))
  console.log('  TESTING PART 33.1: iGOT DATA AUTHENTICITY & KPI SEMANTICS')
  console.log('='.repeat(72))

  // ── Preflight: Check Dev Database Invariants ─────────────────────────────────
  const devConn = await mongoose.createConnection(DEV_MONGO_URI).asPromise()
  const preDevUserCount = await devConn.collection('users').countDocuments()
  const preDevCertCount = await devConn.collection('certificates').countDocuments()
  await devConn.close()

  assert(preDevUserCount === 15, `G.1: Dev DB (kaushalai) user count strictly 15 (actual: ${preDevUserCount})`)
  assert(preDevCertCount === 0, `G.2: Dev DB (kaushalai) certificate count strictly 0 (actual: ${preDevCertCount})`)

  // --- Connect to Test DB and start server ---
  const { server, port, baseUrl } = await startTestServer()
  console.log(`Ephemeral test API running on: ${baseUrl}\n`)

  const igotPagePath = path.join(__dirname, '../client/src/pages/courses/IgotIntegrationLearnerPage.jsx')
  const igotPageContent = fs.readFileSync(igotPagePath, 'utf8')

  // ─────────────────────────────────────────────────────────────────────────────
  // GROUP 1: Learning-Hours KPI Semantics & Calculation Audit
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- GROUP 1: Learning-Hours KPI Semantics & Calculation Audit ---')

  assert(
    !igotPageContent.includes("Actual progress hours on iGOT"),
    '1.1: Falsified claim "Actual progress hours on iGOT" completely eliminated'
  )
  assert(
    !igotPageContent.includes("<span className={styles.metricLabel}>iGOT Learning Hours</span>"),
    '1.2: Misleading KPI label "iGOT Learning Hours" replaced'
  )
  assert(
    igotPageContent.includes("Estimated Duration Completed"),
    '1.3: Metric explicitly labeled as "Estimated Duration Completed"'
  )
  assert(
    igotPageContent.includes("Estimated from course duration &amp; progress %") ||
    igotPageContent.includes("Estimated from course duration"),
    '1.4: Metric subtext honestly specifies estimation from duration and progress %'
  )
  assert(
    igotPageContent.includes("Estimation Methodology:") &&
    igotPageContent.includes("not actual monitored time spent learning"),
    '1.5: Breakdown modal explains calculation methodology (duration × progress %) without stopwatch time claims'
  )
  assert(
    igotPageContent.includes("Completed Course Duration") &&
    igotPageContent.includes("In-Progress Course Duration"),
    '1.6: Breakdown stats truthfully labeled as course duration estimates'
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // GROUP 2: iGOT Catalogue Origin & Adapter Architecture Audit
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 2: iGOT Catalogue Origin & Adapter Architecture Audit ---')

  assert(
    !igotPageContent.includes("Loading authoritative iGOT catalogue"),
    '2.1: False claim "authoritative iGOT catalogue" eliminated from loading state'
  )
  assert(
    igotPageContent.includes("Loading local iGOT-linked course catalogue"),
    '2.2: Loading state honestly specifies local iGOT-linked catalogue'
  )
  assert(
    igotPageContent.includes("Local Catalogue Mode") || igotPageContent.includes("Local Adapter"),
    '2.3: Header/Badge displays local catalogue / adapter mode'
  )
  assert(
    igotPageContent.includes("Curated local database (offline)"),
    '2.4: Integration mode subtext clarifies offline curated local database'
  )
  assert(
    igotPageContent.includes("Integration &amp; Storage Architecture") ||
    igotPageContent.includes("Integration Architecture"),
    '2.5: Right panel displays honest integration architecture metadata'
  )
  assert(
    igotPageContent.includes("External Live Sync") && igotPageContent.includes("Not Configured"),
    '2.6: Right panel truthfully reports external live sync as Not Configured'
  )

  // Verify backend adapter architecture integrity
  const adapter = getCourseAdapter()
  assert(typeof adapter.fetchCatalogue === 'function', '2.7: Backend getCourseAdapter() returns object with fetchCatalogue()')
  assert(typeof adapter.syncEnrollmentStatus === 'function', '2.8: Backend getCourseAdapter() returns object with syncEnrollmentStatus()')

  // ─────────────────────────────────────────────────────────────────────────────
  // GROUP 3: Refresh vs. Synchronization Terminology Audit
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 3: Refresh vs. Synchronization Terminology Audit ---')

  assert(
    !igotPageContent.includes("const [isSyncing, setIsSyncing]"),
    '3.1: Renamed isSyncing state to isRefreshing to prevent false synchronization claims'
  )
  assert(
    igotPageContent.includes("const [isRefreshing, setIsRefreshing]"),
    '3.2: Uses isRefreshing state for local backend refetching'
  )
  assert(
    !igotPageContent.includes("const [lastSyncedTime, setLastSyncedTime]"),
    '3.3: Renamed lastSyncedTime state to lastRefreshedTime'
  )
  assert(
    igotPageContent.includes("const [lastRefreshedTime, setLastRefreshedTime]"),
    '3.4: Uses lastRefreshedTime state for local database refresh timestamps'
  )
  assert(
    igotPageContent.includes("Local catalogue refreshed"),
    '3.5: Toast message truthfully describes local catalogue refresh'
  )
  assert(
    !igotPageContent.includes("Catalogue synchronization complete ("),
    '3.6: False claim of "Catalogue synchronization complete" eliminated from toast'
  )
  assert(
    igotPageContent.includes("Refresh Local Catalogue"),
    '3.7: Banner action button labeled "Refresh Local Catalogue"'
  )
  assert(
    igotPageContent.includes("Verified External Sync") && igotPageContent.includes("None (No external sync event)"),
    '3.8: Architecture modal explicitly states no verified external sync event has occurred'
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // GROUP 4: Component States & Navigation Integrity Audit
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 4: Component States & Navigation Integrity Audit ---')

  assert(
    igotPageContent.includes("isLoading ?") && igotPageContent.includes("RotateCw"),
    '4.1: Component implements spinning loading state'
  )
  assert(
    igotPageContent.includes("isError ?") && igotPageContent.includes("Retry Loading"),
    '4.2: Component implements error state with Retry Loading button'
  )
  assert(
    igotPageContent.includes("filteredCourses.length === 0") && igotPageContent.includes("No iGOT courses found in this category"),
    '4.3: Component implements empty state for zero-course categories'
  )
  assert(
    igotPageContent.includes("to={`/courses/${selectedCourse.id}/progress`}"),
    '4.4: Enrolled courses navigate to authentic player route /courses/:id/progress'
  )
  assert(
    igotPageContent.includes("to={`/courses/${selectedCourse.id}`}"),
    '4.5: Unenrolled courses navigate to authentic details route /courses/:id'
  )
  assert(
    igotPageContent.includes("to=\"/courses/igot\""),
    '4.6: Footer links to full catalogue route /courses/igot'
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // GROUP 5: Live API Contract & Course Data Integrity
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 5: Live API Contract & Course Data Integrity ---')

  // Create isolated test user & token
  await User.deleteMany({ email: 'p33_1_learner@gov.in' })
  const testUserId = new mongoose.Types.ObjectId()
  const testUser = await User.create({
    _id: testUserId,
    email: 'p33_1_learner@gov.in',
    name: 'P33.1 Test Learner',
    role: 'employee',
    department: 'Survey Design Division',
    designation: 'Junior Statistical Officer',
    level: 2,
    onboarding_completed: true,
    passwordHash: 'dummy_hash',
  })

  const token = jwt.sign(
    { id: testUserId.toString(), email: testUser.email, role: testUser.role },
    process.env.ACCESS_TOKEN_SECRET || 'test_access_secret_12345_67890_part33'
  )

  // Test live GET /api/courses?source=igot
  const coursesRes = await makeRequest(baseUrl, '/api/courses?source=igot', {
    headers: { Authorization: `Bearer ${token}` },
  })
  assert(coursesRes.status === 200, `5.1: GET /api/courses?source=igot returns HTTP 200 (actual: ${coursesRes.status})`)
  assert(Array.isArray(coursesRes.data.courses), '5.2: Backend returns courses array')

  // Test live GET /api/users/me/enrollments
  const enrollmentsRes = await makeRequest(baseUrl, '/api/users/me/enrollments', {
    headers: { Authorization: `Bearer ${token}` },
  })
  assert(enrollmentsRes.status === 200, `5.3: GET /api/users/me/enrollments returns HTTP 200 (actual: ${enrollmentsRes.status})`)
  assert(Array.isArray(enrollmentsRes.data.enrollments), '5.4: Backend returns enrollments array')

  // Clean up test user
  await User.deleteMany({ email: 'p33_1_learner@gov.in' })

  // ─────────────────────────────────────────────────────────────────────────────
  // GROUP 6: Post-Test Database Isolation Verification
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 6: Post-Test Database Isolation Verification ---')

  const postDevConn = await mongoose.createConnection(DEV_MONGO_URI).asPromise()
  const postDevUserCount = await postDevConn.collection('users').countDocuments()
  const postDevCertCount = await postDevConn.collection('certificates').countDocuments()
  await postDevConn.close()

  assert(postDevUserCount === 15, `6.1: Dev DB (kaushalai) user count remained strictly 15 (actual: ${postDevUserCount})`)
  assert(postDevCertCount === 0, `6.2: Dev DB (kaushalai) certificate count remained strictly 0 (actual: ${postDevCertCount})`)

  // Shut down ephemeral server
  await new Promise((resolve) => server.close(resolve))
  await mongoose.disconnect()

  console.log('\n' + '='.repeat(72))
  console.log(`PART 33.1 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('='.repeat(72) + '\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runSuite().catch((err) => {
  console.error('Test suite failed with unexpected error:', err)
  process.exit(1)
})
