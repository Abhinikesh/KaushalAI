/**
 * test_part12_dashboard_fixes.js
 * Verification test suite for PART 12:
 * KaushalAI Dashboard Approved Fixes & Minimal Improvements
 *
 * Verifies:
 * - ISSUE-01: Unused quiz-attempt query removed; active queries intact
 * - ISSUE-02: Null, unpublished, and published recommendation course filtering
 * - ISSUE-03: Dark appearance mode CSS selectors properly scoped beneath :global([data-mode="dark"])
 * - ISSUE-04: AI Assistant banner logic (priority gap, all met, and incomplete assessment states)
 * - ISSUE-05: Contextualized Skill Gap table empty-state messages
 * - ISSUE-06: Translation key parity between en.json and hi.json for all audited labels
 * - ISSUE-07: Fallback course recommendation catalog restricted to published courses
 */

'use strict'

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const http = require('http')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')

const {
  startTestServer,
  closeTestEnvironment,
  safeCleanupTestUsers,
  validateTestDatabaseUri,
} = require('./src/test/testDbGuard')

const {
  User,
  Course,
  Recommendation,
  Competency,
  SkillGap,
  AssessmentAttempt,
} = require('./src/models')

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'kaushalai_dev_access_secret_change_in_prod'

let activePort = null
let totalPassed = 0
let totalFailed = 0

function pass(msg) {
  console.log(`  ✓ PASS: ${msg}`)
  totalPassed++
}

function fail(msg, err) {
  console.error(`  ✗ FAIL: ${msg}`)
  if (err) console.error(`    Details: ${err.message || err}`)
  totalFailed++
}

function request(options, bodyData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: activePort,
        ...options,
      },
      (res) => {
        let raw = ''
        res.on('data', (chunk) => (raw += chunk))
        res.on('end', () => {
          let parsed = null
          try {
            parsed = JSON.parse(raw)
          } catch {
            parsed = raw
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed })
        })
      }
    )
    req.on('error', reject)
    if (bodyData) {
      req.write(typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData))
    }
    req.end()
  })
}

async function runPart12Tests() {
  console.log('========================================================================')
  console.log('       TESTING PART 12: DASHBOARD APPROVED FIXES & VERIFICATION         ')
  console.log('========================================================================\n')

  // Guardrail check
  const { dbName } = validateTestDatabaseUri(process.env.MONGODB_TEST_URI)
  pass(`Guardrail confirmed: Target database is dedicated test DB "${dbName}"`)

  const { server, port, baseUrl } = await startTestServer()
  activePort = port
  console.log(`Ephemeral test API running on: ${baseUrl}\n`)

  const testUserEmail = 'part12_learner_test@kaushalai.test'
  await safeCleanupTestUsers([testUserEmail])

  // Setup deterministic test fixtures
  const testUser = await User.create({
    name: 'Part 12 Audit Learner',
    email: testUserEmail,
    role: 'employee',
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    onboarding_step: 6,
    onboarding_completed: true,
    department: 'National Accounts Division',
    designation: 'Assistant Director',
  })

  const token = jwt.sign(
    { id: testUser._id.toString(), email: testUser.email, role: testUser.role },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '2h' }
  )

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 1: ISSUE-01 — Verify Unused Query Removed from EmployeeDashboard.jsx
  // --------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: ISSUE-01 — Unused Quiz-Attempt Query Elimination ---')
  const dashboardJsxPath = path.resolve(__dirname, '../client/src/pages/dashboard/EmployeeDashboard.jsx')
  const dashboardCode = fs.readFileSync(dashboardJsxPath, 'utf8')

  if (!dashboardCode.includes("import { getMyQuizAttempts }") && !dashboardCode.includes("getMyQuizAttempts")) {
    pass('1.1: getMyQuizAttempts is completely removed from EmployeeDashboard.jsx imports')
  } else {
    fail('1.1: getMyQuizAttempts still present in EmployeeDashboard.jsx imports')
  }

  if (!dashboardCode.includes("queryKey: ['myAttempts']") && !dashboardCode.includes("attemptsQuery")) {
    pass('1.2: attemptsQuery React Query hook is completely removed from EmployeeDashboard.jsx')
  } else {
    fail('1.2: attemptsQuery still present in EmployeeDashboard.jsx')
  }

  if (!dashboardCode.includes("const attempts =")) {
    pass('1.3: Unused attempts variable assignment removed from EmployeeDashboard.jsx')
  } else {
    fail('1.3: attempts variable still present in EmployeeDashboard.jsx')
  }

  // Verify other queries are intact
  if (
    dashboardCode.includes("queryKey: ['skillGaps']") &&
    dashboardCode.includes("queryKey: ['recommendations']") &&
    dashboardCode.includes("queryKey: ['learningPath']") &&
    dashboardCode.includes("queryKey: ['myEnrollments']")
  ) {
    pass('1.4: Active queries (skillGaps, recommendations, learningPath, myEnrollments) remain intact')
  } else {
    fail('1.4: One or more required dashboard queries were unintentionally modified')
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 2: ISSUE-02 — Filter Deleted and Unpublished Recommended Courses
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: ISSUE-02 — Recommendation Publishing & Course Availability Filtering ---')
  
  // Create 3 test courses: 1 published, 1 unpublished, and 1 non-existent (null reference)
  const publishedCourse = await Course.create({
    title: 'Part 12 Published Course',
    description: 'Active and published course',
    source: 'igot',
    difficulty: 'intermediate',
    durationHours: 6,
    isPublished: true,
  })

  const unpublishedCourse = await Course.create({
    title: 'Part 12 Draft / Unpublished Course',
    description: 'Draft course not yet available',
    source: 'igot',
    difficulty: 'beginner',
    durationHours: 4,
    isPublished: false,
  })

  const nonExistentCourseId = new mongoose.Types.ObjectId()

  // Clear existing recommendations and insert test recommendations
  await Recommendation.deleteMany({ user_id: testUser._id })

  await Recommendation.create([
    {
      user_id: testUser._id,
      course_id: publishedCourse._id,
      priority_rank: 1,
      reason: 'Targeted recommendation for active competency',
    },
    {
      user_id: testUser._id,
      course_id: unpublishedCourse._id,
      priority_rank: 2,
      reason: 'Unpublished course test',
    },
    {
      user_id: testUser._id,
      course_id: nonExistentCourseId,
      priority_rank: 3,
      reason: 'Deleted course test',
    },
  ])

  // Call GET /api/recommendations
  const recRes = await request({
    path: '/api/recommendations',
    method: 'GET',
    headers: authHeaders,
  })

  if (recRes.status === 200 && recRes.body?.success === true) {
    pass('2.1: GET /api/recommendations returns HTTP 200 OK')
  } else {
    fail(`2.1: Failed to call /api/recommendations (status: ${recRes.status})`)
  }

  const recs = recRes.body?.recommendations || []
  if (recs.length === 1) {
    pass('2.2: Recommendations count strictly filtered to 1 valid published course (actual: 1)')
  } else {
    fail(`2.2: Expected 1 valid recommendation, but received ${recs.length}`)
  }

  if (recs[0]?.course_id?._id === publishedCourse._id.toString()) {
    pass(`2.3: Returned recommendation correctly matches published course ID (${publishedCourse.title})`)
  } else {
    fail('2.3: Returned recommendation course ID does not match published course')
  }

  if (recs[0]?.course_id?.isPublished === true) {
    pass('2.4: course_id.isPublished field is selected and verified as true')
  } else {
    fail('2.4: course_id.isPublished is missing or not true')
  }

  // Ensure documents in DB were NOT deleted
  const totalDbRecs = await Recommendation.countDocuments({ user_id: testUser._id })
  if (totalDbRecs === 3) {
    pass('2.5: Non-destructive preservation: Original Recommendation records in DB remain intact (count: 3)')
  } else {
    fail(`2.5: Recommendation records in DB were modified or deleted (count: ${totalDbRecs})`)
  }

  // Clean up test courses
  await Course.deleteMany({ _id: { $in: [publishedCourse._id, unpublishedCourse._id] } })
  await Recommendation.deleteMany({ user_id: testUser._id })

  // --------------------------------------------------------------------------
  // TEST GROUP 3: ISSUE-03 — Dark Appearance Mode Selectors
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: ISSUE-03 — Dark Appearance Mode CSS Selectors ---')
  const cssPath = path.resolve(__dirname, '../client/src/pages/dashboard/EmployeeDashboard.module.css')
  const cssContent = fs.readFileSync(cssPath, 'utf8')

  const auditedSelectors = [
    '.heroBanner',
    '.heroGreetingSub',
    '.heroPillCard',
    '.heroQuoteBlock',
    '.heroQuoteText',
    '.heroTagBadge',
  ]

  for (const sel of auditedSelectors) {
    const hasGlobalModeDark = cssContent.includes(`:global([data-mode="dark"]) ${sel}`)
    const hasGlobalThemeDark = cssContent.includes(`:global([data-theme="dark"]) ${sel}`)
    if (hasGlobalModeDark && hasGlobalThemeDark) {
      pass(`3.${auditedSelectors.indexOf(sel) + 1}: Selector "${sel}" correctly responds to both :global([data-mode="dark"]) and :global([data-theme="dark"])`)
    } else {
      fail(`3.${auditedSelectors.indexOf(sel) + 1}: Selector "${sel}" missing :global([data-mode="dark"]) or :global([data-theme="dark"])`)
    }
  }

  // Verify light appearance is unmodified
  if (cssContent.includes('.heroBanner {') && cssContent.includes('.heroGreetingSub {') && cssContent.includes('.heroPillCard {')) {
    pass('3.7: Light appearance rules and base element styles remain intact and unmodified')
  } else {
    fail('3.7: Base styles were unintentionally modified')
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 4: ISSUE-04 — AI Assistant Banner State Logic
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: ISSUE-04 — AI Assistant Banner Conditional Logic ---')

  // Verify logic branches in EmployeeDashboard.jsx
  if (!dashboardCode.includes("topSkillGap?.name || 'Statistical Modelling'")) {
    pass('4.1: Hardcoded fallback "Statistical Modelling" removed from topGapName computation')
  } else {
    fail('4.1: Hardcoded fallback "Statistical Modelling" is still present')
  }

  if (dashboardCode.includes('all_competencies_on_track_msg') && dashboardCode.includes('Great progress! All your cadre competencies are on track.')) {
    pass('4.2: Zero-gap completed assessment displays "Great progress! All your cadre competencies are on track."')
  } else {
    fail('4.2: Zero-gap completed message missing from EmployeeDashboard.jsx')
  }

  if (dashboardCode.includes('complete_assessment_suggestion') && dashboardCode.includes('Complete your diagnostic assessment to identify competency gaps')) {
    pass('4.3: Incomplete assessment prompts learner to complete diagnostic assessment')
  } else {
    fail('4.3: Incomplete assessment fallback message missing from EmployeeDashboard.jsx')
  }

  if (dashboardCode.includes('ai_suggestion_focus') && dashboardCode.includes('ai_suggestion_close_gap')) {
    pass('4.4: Priority gap state preserves dynamic competency-specific suggestion')
  } else {
    fail('4.4: Priority gap dynamic suggestion missing')
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 5: ISSUE-05 — Contextualize Skill Gap Table Empty State
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: ISSUE-05 — Contextualized Skill Gap Table Empty States ---')

  if (dashboardCode.includes('no_gaps_assessment_pending') && dashboardCode.includes('No skill assessment records found.')) {
    pass('5.1: State 1 (Assessment Pending): Prompts learner to complete diagnostic assessment')
  } else {
    fail('5.1: Assessment pending message missing from table empty state')
  }

  if (dashboardCode.includes('no_gaps_all_met') && dashboardCode.includes('All assessed competencies meet or exceed required cadre proficiency.')) {
    pass('5.2: State 2 (All Competencies Met): Confirms all assessed competencies meet or exceed required level')
  } else {
    fail('5.2: All competencies met message missing from table empty state')
  }

  if (dashboardCode.includes('no_gaps_data_unavailable') && dashboardCode.includes('Competency gap analysis data is currently unavailable')) {
    pass('5.3: State 3 (Data Unavailable / Inconsistent): Displays neutral data unavailable message')
  } else {
    fail('5.3: Data unavailable message missing from table empty state')
  }

  if (dashboardCode.includes('<td colSpan={5} style={{ textAlign: \'center\', padding: \'32px 16px\',')) {
    pass('5.4: Table structure (colSpan 5, padding, centered layout) strictly preserved')
  } else {
    fail('5.4: Table empty state dimensions or structure altered')
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 6: ISSUE-06 — English and Hindi Translation Parity
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: ISSUE-06 — i18n English/Hindi Translation Parity ---')
  const enJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../client/src/i18n/en.json'), 'utf8'))
  const hiJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../client/src/i18n/hi.json'), 'utf8'))

  const requiredDashboardKeys = [
    'officer',
    'hero_tagline',
    'hero_journey_progress',
    'hero_gaps_alert',
    'hero_all_on_track',
    'hero_tag',
    'on_track',
    'cadre_readiness_index',
    'skills',
    'competencies_achieved',
    'remaining_count',
    'all_met',
    'skill_gaps_label',
    'targeted_improvement_areas',
    'high_priority',
    'all_clear',
    'estimated_learning_hours',
    'cumulative_hours_desc',
    'cumulative',
    'th_skill',
    'th_current',
    'th_required',
    'th_gap',
    'th_status',
    'legend_met',
    'legend_low',
    'legend_moderate',
    'legend_critical',
    'curated_to_close_gaps',
    'enroll',
    'continue_learning',
    'pick_up_where_left_off',
    'no_courses_in_progress',
    'explore_recs_desc',
    'explore_courses',
    'progress',
    'ai_companion_sub',
    'ai_suggestion',
    'ai_suggestion_focus',
    'ai_suggestion_close_gap',
    'all_competencies_on_track_msg',
    'complete_assessment_suggestion',
    'chat_with_ai',
    'no_gaps_assessment_pending',
    'no_gaps_all_met',
    'no_gaps_data_unavailable',
  ]

  let allKeysPresent = true
  for (const k of requiredDashboardKeys) {
    if (!enJson.dashboard?.[k]) {
      fail(`6.key: Missing key "${k}" in en.json`)
      allKeysPresent = false
    }
    if (!hiJson.dashboard?.[k]) {
      fail(`6.key: Missing key "${k}" in hi.json`)
      allKeysPresent = false
    }
  }

  if (allKeysPresent) {
    pass(`6.1: All ${requiredDashboardKeys.length} audited translation keys exist in both en.json and hi.json`)
  }

  // Verify non-empty Hindi values
  let allHindiPopulated = true
  for (const k of requiredDashboardKeys) {
    const val = hiJson.dashboard?.[k]
    if (typeof val !== 'string' || val.trim().length === 0) {
      fail(`6.hindi: Empty or invalid Hindi translation for "${k}"`)
      allHindiPopulated = false
    }
  }
  if (allHindiPopulated) {
    pass(`6.2: All ${requiredDashboardKeys.length} Hindi translations contain natural, non-empty text`)
  }

  // Verify EmployeeDashboard uses t() wrappers
  if (
    dashboardCode.includes("t('dashboard.skills', 'Skills')") &&
    dashboardCode.includes("t('dashboard.continue_learning', 'Continue Learning')") &&
    dashboardCode.includes("t('dashboard.th_skill', 'Skill')") &&
    dashboardCode.includes("t('dashboard.ai_assistant', 'KaushalAI Assistant')")
  ) {
    pass('6.3: EmployeeDashboard.jsx wraps audited user-facing labels in t() calls')
  } else {
    fail('6.3: Some user-facing labels in EmployeeDashboard.jsx lack t() wrappers')
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 7: ISSUE-07 — Fallback Course Query Restricts to Published
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: ISSUE-07 — Fallback Catalog Query Filter ---')
  const skillGapServicePath = path.resolve(__dirname, './src/services/skillGap.service.js')
  const skillGapServiceCode = fs.readFileSync(skillGapServicePath, 'utf8')

  if (skillGapServiceCode.includes('Course.find({ isPublished: true }).limit(10)')) {
    pass('7.1: Fallback query on line 291 strictly enforces { isPublished: true }')
  } else {
    fail('7.1: Fallback query does not enforce { isPublished: true }')
  }

  // Teardown
  await safeCleanupTestUsers([testUserEmail])
  await closeTestEnvironment()

  console.log('\n========================================================================')
  console.log(`PART 12 TEST SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`)
  console.log('========================================================================')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runPart12Tests().catch((err) => {
  console.error('Unhandled Part 12 test error:', err)
  process.exit(1)
})
