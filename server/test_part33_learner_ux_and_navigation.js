/**
 * Part 33: Learner UX, Navigation & Data Authenticity Test Suite
 *
 * Verifies:
 * 1. AppShell.jsx learner navigation additions (My Certificates, Achievements & Badges)
 * 2. i18n translation parity in en.json and hi.json
 * 3. Route protection and learner accessibility
 * 4. Profile data authenticity (removal of fabricated fallback dates)
 * 5. iGOT learner integration page real API loading and state handling
 * 6. Learning-path API consistency and dual-contract compatibility
 * 7. Development database isolation (zero writes to kaushalai)
 */

'use strict'

const fs = require('fs')
const path = require('path')
const http = require('http')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const {
  validateTestDatabaseUri,
  connectTestDb,
  startTestServer,
  closeTestEnvironment,
  safeCleanupTestUsers,
} = require('./src/test/testDbGuard')

const { User, Course, Enrollment, LearningPath, LearningPathItem, Role, Competency, JobRole } = require('./src/models')

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'kaushalai_dev_access_secret_change_in_prod'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failed++
  }
}

async function request(baseUrl, options) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, baseUrl)
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () => {
          let data = null
          try {
            data = JSON.parse(body)
          } catch {
            data = body
          }
          resolve({ status: res.statusCode, headers: res.headers, data })
        })
      }
    )
    req.on('error', reject)
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
    }
    req.end()
  })
}

async function runPart33Suite() {
  console.log('========================================================================')
  console.log('  TESTING PART 33: LEARNER UX, NAVIGATION & DATA AUTHENTICITY           ')
  console.log('========================================================================\n')

  // --- Pre-test Dev DB Guardrail Check ---
  let preDevUserCount = 0
  let preDevCertCount = 0
  try {
    const devConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
    preDevUserCount = await devConn.collection('users').countDocuments()
    preDevCertCount = await devConn.collection('certificates').countDocuments()
    await devConn.close()
  } catch (err) {
    console.warn('[Guardrail] Could not inspect dev DB pre-check:', err.message)
  }

  assert(preDevUserCount === 15, `G.1: Dev DB (kaushalai) user count strictly 15 (actual: ${preDevUserCount})`)
  assert(preDevCertCount === 0, `G.2: Dev DB (kaushalai) certificate count strictly 0 (actual: ${preDevCertCount})`)

  // --- Connect to Test DB and start server ---
  const { server, port, baseUrl } = await startTestServer()
  console.log(`Ephemeral test API running on: ${baseUrl}\n`)

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 1: Learner Sidebar Navigation & Link Integrity
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- SECTION 1: Learner Sidebar Navigation & Link Integrity ---')
  const appShellPath = path.join(__dirname, '../client/src/components/layout/AppShell.jsx')
  const appShellContent = fs.readFileSync(appShellPath, 'utf8')

  assert(
    appShellContent.includes("{ to: '/certificates'") && appShellContent.includes("nav.my_certificates"),
    '1.1: AppShell.jsx defines /certificates navigation link with nav.my_certificates'
  )
  assert(
    appShellContent.includes("{ to: '/achievements'") && appShellContent.includes("nav.achievements"),
    '1.2: AppShell.jsx defines /achievements navigation link with nav.achievements'
  )
  assert(
    appShellContent.includes("icon: Award") && appShellContent.includes("icon: Trophy"),
    '1.3: AppShell.jsx assigns Award icon to certificates and Trophy icon to achievements'
  )
  assert(
    appShellContent.includes("Award,") && appShellContent.includes("Trophy,") && appShellContent.includes("from 'lucide-react'"),
    '1.4: AppShell.jsx imports Award and Trophy from lucide-react'
  )
  assert(
    appShellContent.includes("item.to === '/certificates' && location.pathname.startsWith('/certificates')"),
    '1.5: AppShell.jsx implements custom active-route check for /certificates'
  )
  assert(
    appShellContent.includes("item.to === '/achievements' && location.pathname.startsWith('/achievements')"),
    '1.6: AppShell.jsx implements custom active-route check for /achievements'
  )

  // Verify useAdminNav does NOT contain learner certificates or achievements
  const adminNavMatch = appShellContent.match(/function useAdminNav\(t\) \{([\s\S]*?)\n\}/)
  assert(adminNavMatch !== null, '1.7: AppShell.jsx defines distinct useAdminNav function')
  if (adminNavMatch) {
    const adminNavBody = adminNavMatch[1]
    assert(!adminNavBody.includes("'/certificates'"), '1.8: useAdminNav strictly excludes /certificates')
    assert(!adminNavBody.includes("'/achievements'"), '1.9: useAdminNav strictly excludes /achievements')
  }

  // Verify App.jsx routes and protections
  const appJsxPath = path.join(__dirname, '../client/src/App.jsx')
  const appJsxContent = fs.readFileSync(appJsxPath, 'utf8')
  assert(
    appJsxContent.includes('<Route path="/certificates" element={<LearnerRoute><CertificatesPage /></LearnerRoute>} />'),
    '1.10: /certificates is guarded by LearnerRoute in App.jsx'
  )
  assert(
    appJsxContent.includes('<Route path="/achievements" element={<LearnerRoute><AchievementsPage /></LearnerRoute>} />'),
    '1.11: /achievements is guarded by LearnerRoute in App.jsx'
  )

  // Verify i18n translation parity
  const enJsonPath = path.join(__dirname, '../client/src/i18n/en.json')
  const hiJsonPath = path.join(__dirname, '../client/src/i18n/hi.json')
  const enJson = JSON.parse(fs.readFileSync(enJsonPath, 'utf8'))
  const hiJson = JSON.parse(fs.readFileSync(hiJsonPath, 'utf8'))

  assert(enJson.nav && enJson.nav.my_certificates === 'My Certificates', '1.12: en.json contains nav.my_certificates = "My Certificates"')
  assert(hiJson.nav && hiJson.nav.my_certificates === 'मेरे प्रमाण पत्र', '1.13: hi.json contains nav.my_certificates = "मेरे प्रमाण पत्र"')
  assert(enJson.nav && enJson.nav.achievements === 'Achievements & Badges', '1.14: en.json contains nav.achievements = "Achievements & Badges"')
  assert(hiJson.nav && hiJson.nav.achievements === 'उपलब्धियां एवं बैज', '1.15: hi.json contains nav.achievements = "उपलब्धियां एवं बैज"')

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 2: Profile Data Authenticity & Fallback Verification
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 2: Profile Data Authenticity ---')
  const profilePagePath = path.join(__dirname, '../client/src/pages/profile/MyProfilePage.jsx')
  const profilePageContent = fs.readFileSync(profilePagePath, 'utf8')

  assert(!profilePageContent.includes("'12 August 2021'"), '2.1: Fabricated date "12 August 2021" completely eliminated')
  assert(!profilePageContent.includes("'02 June 2026, 09:15 AM'"), '2.2: Fabricated date "02 June 2026, 09:15 AM" completely eliminated')
  assert(!profilePageContent.includes("'10 May 2024'"), '2.3: Fabricated fallback "10 May 2024" for accountCreated completely eliminated')

  assert(
    profilePageContent.includes("const dateOfJoining  = user?.dateOfJoining") && profilePageContent.includes("'Not provided'"),
    '2.4: dateOfJoining defaults honestly to "Not provided" when absent'
  )
  assert(
    profilePageContent.includes("const accountCreated = user?.createdAt") && profilePageContent.includes("'Not provided'"),
    '2.5: accountCreated defaults honestly to "Not provided" when absent'
  )
  assert(
    profilePageContent.includes("const lastLogin = rawLastLogin") && profilePageContent.includes("'Not provided'"),
    '2.6: lastLogin defaults honestly to "Not provided" when absent (no derivation from unrelated timestamps)'
  )
  assert(
    profilePageContent.includes("export function calculateProfileCompletion"),
    '2.7: calculateProfileCompletion function preserved and exported'
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 3: iGOT Learner Integration Page Audit
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 3: iGOT Learner Integration Page Audit ---')
  const igotPagePath = path.join(__dirname, '../client/src/pages/courses/IgotIntegrationLearnerPage.jsx')
  const igotPageContent = fs.readFileSync(igotPagePath, 'utf8')

  assert(!igotPageContent.includes("id: '112233'"), '3.1: Hardcoded mock course 112233 eliminated')
  assert(!igotPageContent.includes("id: '334455'"), '3.2: Hardcoded mock course 334455 eliminated')
  assert(!igotPageContent.includes("id: '556677'"), '3.3: Hardcoded mock course 556677 eliminated')
  assert(!igotPageContent.includes("id: '990011'"), '3.4: Hardcoded mock course 990011 eliminated')
  assert(!igotPageContent.includes("id: '443322'"), '3.5: Hardcoded mock course 443322 eliminated')
  assert(!igotPageContent.includes("id: '887766'"), '3.6: Hardcoded mock course 887766 eliminated')

  assert(
    igotPageContent.includes("useQuery") && igotPageContent.includes("listCourses({ source: 'igot' })"),
    '3.7: Queries authentic backend course catalogue via listCourses({ source: "igot" })'
  )
  assert(
    igotPageContent.includes("getMyEnrollments"),
    '3.8: Queries authentic user enrollments via getMyEnrollments()'
  )
  assert(
    igotPageContent.includes("isLoading ?") && (igotPageContent.includes("Loading local iGOT-linked course catalogue") || igotPageContent.includes("Loading iGOT-linked course catalogue")),
    '3.9: Implements explicit loading state with loading message'
  )
  assert(
    igotPageContent.includes("isError ?") && igotPageContent.includes("Retry Loading"),
    '3.10: Implements explicit error state with Retry Loading button'
  )
  assert(
    igotPageContent.includes("filteredCourses.length === 0") && igotPageContent.includes("No iGOT courses found in this category"),
    '3.11: Implements explicit empty state for zero-result categories'
  )
  assert(
    igotPageContent.includes("to={`/courses/${selectedCourse.id}/progress`}") &&
    igotPageContent.includes("to={`/courses/${selectedCourse.id}`}"),
    '3.12: Navigation destinations use authentic /courses/:id routes instead of dead/fabricated URLs'
  )
  assert(
    !igotPageContent.includes("Demo sync simulation completed: 7 courses and 32h 15m"),
    '3.13: Hardcoded demo sync simulation string completely eliminated'
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 4: Live Backend API Tests & Learning-Path Compatibility
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 4: Live Backend API & Learning-Path Compatibility ---')

  // Create isolated test fixtures
  await User.deleteMany({ email: 'part33_learner@gov.in' })
  const testLearnerId = new mongoose.Types.ObjectId()
  const testLearner = await User.create({
    _id: testLearnerId,
    email: 'part33_learner@gov.in',
    name: 'P33 Test Officer',
    role: 'employee',
    department: 'National Accounts Division',
    designation: 'Senior Statistical Officer',
    level: 3,
    onboarding_completed: true,
    passwordHash: 'dummy_hash_for_test',
  })

  const learnerToken = jwt.sign(
    { id: testLearnerId.toString(), email: testLearner.email, role: testLearner.role },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )

  // Test 4.1: Unauthenticated request to /api/users/me/certificates
  const unauthCert = await request(baseUrl, { path: '/api/users/me/certificates' })
  assert(unauthCert.status === 401, '4.1: Unauthenticated /api/users/me/certificates returns HTTP 401')

  // Test 4.2: Authenticated request to /api/users/me/certificates
  const authCert = await request(baseUrl, {
    path: '/api/users/me/certificates',
    headers: { Authorization: `Bearer ${learnerToken}` },
  })
  assert(authCert.status === 200, '4.2: Authenticated learner /api/users/me/certificates returns HTTP 200')
  assert(Array.isArray(authCert.data.certificates), '4.3: Certificates response contains certificates array')

  // Test 4.4: Authenticated request to /api/achievements/my
  const authAch = await request(baseUrl, {
    path: '/api/achievements/my',
    headers: { Authorization: `Bearer ${learnerToken}` },
  })
  assert(authAch.status === 200, '4.4: Authenticated learner /api/achievements/my returns HTTP 200')
  assert(Array.isArray(authAch.data.achievements), '4.5: Achievements response contains achievements array')
  assert(
    authAch.data.achievements && authAch.data.achievements.length === 6,
    '4.6: Exactly 6 standard canonical badges returned in achievements array'
  )
  assert(
    authAch.data.summary && authAch.data.summary.total_achievements === 6,
    '4.6b: Summary reports total_achievements === 6'
  )

  // Test 4.7: Authenticated request to /api/courses with source=igot
  const igotCoursesRes = await request(baseUrl, {
    path: '/api/courses?source=igot',
    headers: { Authorization: `Bearer ${learnerToken}` },
  })
  assert(igotCoursesRes.status === 200, '4.7: GET /api/courses?source=igot returns HTTP 200')
  assert(Array.isArray(igotCoursesRes.data.courses), '4.8: Returns courses array from database')

  // Test 4.9: Authoritative Active Learning Path Endpoint GET /api/learning-path
  const activeLpRes = await request(baseUrl, {
    path: '/api/learning-path',
    headers: { Authorization: `Bearer ${learnerToken}` },
  })
  assert(activeLpRes.status === 200, '4.9: GET /api/learning-path returns HTTP 200')
  assert(activeLpRes.data.success === true, '4.10: Active learning-path response has success: true')
  assert('learning_path' in activeLpRes.data, '4.11: Active learning-path response contains learning_path property')
  assert(Array.isArray(activeLpRes.data.items), '4.12: Active learning-path response contains items array')

  // Test 4.13: Legacy Learning Path Endpoint GET /api/users/me/learning-path
  const legacyLpRes = await request(baseUrl, {
    path: '/api/users/me/learning-path',
    headers: { Authorization: `Bearer ${learnerToken}` },
  })
  // Expect HTTP 400 because testLearner has no legacy jobRoleId configured
  assert(
    legacyLpRes.status === 400,
    `4.13: GET /api/users/me/learning-path preserves requirement for jobRoleId (status: ${legacyLpRes.status})`
  )
  assert(
    legacyLpRes.data.message && legacyLpRes.data.message.includes('No job role set'),
    '4.14: Legacy learning path correctly identifies missing job role prerequisite'
  )

  // Clean up test fixture
  await User.deleteOne({ _id: testLearnerId })
  await closeTestEnvironment()

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 5: Post-Test Database Isolation Verification
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 5: Post-Test Database Isolation Verification ---')
  let postDevUserCount = 0
  let postDevCertCount = 0
  try {
    const devConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
    postDevUserCount = await devConn.collection('users').countDocuments()
    postDevCertCount = await devConn.collection('certificates').countDocuments()
    await devConn.close()
  } catch (err) {
    console.warn('[Guardrail] Could not inspect dev DB post-check:', err.message)
  }

  assert(postDevUserCount === 15, `5.1: Dev DB (kaushalai) user count remained strictly 15 (actual: ${postDevUserCount})`)
  assert(postDevCertCount === 0, `5.2: Dev DB (kaushalai) certificate count remained strictly 0 (actual: ${postDevCertCount})`)

  console.log('\n========================================================================')
  console.log(`PART 33 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('========================================================================\n')

  if (failed > 0) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}

runPart33Suite().catch((err) => {
  console.error('Fatal error in Part 33 test runner:', err)
  process.exit(1)
})
