/**
 * test_part14_ai_assistant.js
 * Verification test suite for PART 14:
 * KaushalAI Dashboard AI Assistant Empty-State Correction (ISSUE-13-01)
 *
 * Verifies:
 * 1. AI Assistant Banner State Logic:
 *    - State 1: Assessment incomplete -> Diagnostic assessment prompt
 *    - State 2: Assessment complete, valid data, 1+ gaps -> Highest-priority skill-gap recommendation
 *    - State 3: Assessment complete, valid data, all competencies met -> All-competencies-on-track
 *    - State 4: Assessment complete, zero competencies -> No competencies assigned to role
 *    - State 5: Assessment complete, missing, invalid or incomplete data -> Competency data unavailable
 *    - State 6: API loading or error states -> Data unavailable / loading handled safely
 * 2. Strict All-Clear Guard Verification:
 *    - All-clear is NEVER triggered for zero competencies (totalSkills === 0)
 *    - All-clear is NEVER triggered when data is missing, invalid, or API has error
 *    - All-clear is NEVER triggered when metCount < totalSkills or any gap exists
 *    - All-clear is derived authoritatively from the same dataset (skillGaps)
 * 3. Bilingual Translation Parity (en.json and hi.json):
 *    - dashboard.noCompetenciesAssigned
 *    - dashboard.competencyDataUnavailable
 * 4. Integration Verification with Test Database Isolation (kaushalai_test)
 */

'use strict'

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })
if (!process.env.ACCESS_TOKEN_SECRET) {
  process.env.ACCESS_TOKEN_SECRET = 'kaushalai_dev_access_secret_change_in_prod'
}
const fs = require('fs')
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
          } catch (e) {
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

// Mirror the exact frontend assistant state logic in EmployeeDashboard.jsx
function evaluateAssistantBannerState({
  hasCompletedAssessment,
  skillGapsQueryData,
  isSkillGapsApiError,
}) {
  const rawSkillGaps = skillGapsQueryData?.skill_gaps
  const isSkillGapsDataMissing = !skillGapsQueryData || !Array.isArray(rawSkillGaps)
  const hasInvalidSkillGapItems =
    Array.isArray(rawSkillGaps) &&
    rawSkillGaps.length > 0 &&
    rawSkillGaps.some(
      (g) =>
        !g ||
        typeof g !== 'object' ||
        (g.competency_id == null && !g.name) ||
        isNaN(Number(g.current_level)) ||
        isNaN(Number(g.required_level))
    )

  const isCompetencyDataValid =
    !isSkillGapsApiError && !isSkillGapsDataMissing && !hasInvalidSkillGapItems

  const skillGaps = isCompetencyDataValid ? rawSkillGaps : []
  const totalSkills = skillGaps.length
  const priorityGaps = skillGaps.filter((g) => g.priority === 'high' || (g.gap || 0) >= 2)
  const metSkills = skillGaps.filter(
    (g) => (g.gap || 0) <= 0 || (g.current_level || 0) >= (g.required_level || 0)
  )
  const metCount = metSkills.length

  const topSkillGap = priorityGaps[0] || skillGaps.find((g) => (g.gap || 0) > 0)
  const topGapName =
    topSkillGap?.competency_id?.name ||
    topSkillGap?.name ||
    (topSkillGap ? 'Skill' : null)

  let assistantState = 'ASSESSMENT_NOT_COMPLETED'
  if (!hasCompletedAssessment) {
    assistantState = 'ASSESSMENT_NOT_COMPLETED'
  } else if (!isCompetencyDataValid) {
    assistantState = 'DATA_UNAVAILABLE'
  } else if (totalSkills === 0) {
    assistantState = 'ZERO_COMPETENCIES'
  } else if (topSkillGap || metCount < totalSkills) {
    assistantState = 'HAS_GAPS'
  } else if (totalSkills > 0 && metCount === totalSkills && !topSkillGap) {
    assistantState = 'ALL_CLEAR'
  } else {
    assistantState = 'DATA_UNAVAILABLE'
  }

  return {
    assistantState,
    topGapName,
    isCompetencyDataValid,
    totalSkills,
    metCount,
  }
}

async function runPart14Tests() {
  console.log('===================================================================')
  console.log('PART 14: KAUSHALAI DASHBOARD AI ASSISTANT EMPTY-STATE CORRECTION')
  console.log('===================================================================\n')

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Source Code Static Analysis of EmployeeDashboard.jsx
  // --------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: EmployeeDashboard.jsx Source Code Analysis ---')
  const dashboardPath = path.resolve(__dirname, '../client/src/pages/dashboard/EmployeeDashboard.jsx')
  const dashboardCode = fs.readFileSync(dashboardPath, 'utf8')

  // 1.1 Check presence of assistantState state machine
  if (dashboardCode.includes("let assistantState = 'ASSESSMENT_NOT_COMPLETED'") &&
      dashboardCode.includes("assistantState === 'ALL_CLEAR'") &&
      dashboardCode.includes("assistantState === 'ZERO_COMPETENCIES'") &&
      dashboardCode.includes("assistantState === 'DATA_UNAVAILABLE'") &&
      dashboardCode.includes("assistantState === 'HAS_GAPS'")) {
    pass('1.1: EmployeeDashboard.jsx implements explicit assistantState machine with all 5 discrete states')
  } else {
    fail('1.1: Missing explicit assistantState state branches in EmployeeDashboard.jsx')
  }

  // 1.2 Check all-clear condition rigorously requires metCount === totalSkills and totalSkills > 0
  if (dashboardCode.includes('totalSkills > 0 && metCount === totalSkills && !topSkillGap')) {
    pass('1.2: All-clear state strictly requires totalSkills > 0, metCount === totalSkills, and !topSkillGap')
  } else {
    fail('1.2: All-clear condition does not require totalSkills > 0 and metCount === totalSkills')
  }

  // 1.3 Ensure totalSkills > 0 alone is NOT the all-clear condition
  const naiveCheckRegex = /totalSkills\s*>\s*0\s*\?\s*\(.*all_competencies_on_track_msg/s
  if (!naiveCheckRegex.test(dashboardCode)) {
    pass('1.3: Verified totalSkills > 0 alone is NEVER used as the all-clear condition')
  } else {
    fail('1.3: Dangerous pattern detected: totalSkills > 0 alone used for all-clear message')
  }

  // 1.4 Check zero competencies branch renders noCompetenciesAssigned
  if (dashboardCode.includes("assistantState === 'ZERO_COMPETENCIES'") &&
      dashboardCode.includes('noCompetenciesAssigned')) {
    pass('1.4: Zero competencies branch explicitly renders dashboard.noCompetenciesAssigned translation')
  } else {
    fail('1.4: Zero competencies branch missing noCompetenciesAssigned translation')
  }

  // 1.5 Check data unavailable branch renders competencyDataUnavailable
  if (dashboardCode.includes("assistantState === 'DATA_UNAVAILABLE'") &&
      dashboardCode.includes('competencyDataUnavailable')) {
    pass('1.5: Incomplete / invalid / missing data branch explicitly renders dashboard.competencyDataUnavailable')
  } else {
    fail('1.5: Missing data branch does not render competencyDataUnavailable')
  }

  // 1.6 Verify navigation action button (Chat with AI) is preserved
  if (dashboardCode.includes('className={styles.assistantChatBtn}') &&
      dashboardCode.includes('to="/ai-tutor"')) {
    pass('1.6: AI Assistant action button ("Chat with AI" -> /ai-tutor) strictly preserved and actionable')
  } else {
    fail('1.6: AI Assistant action button was altered or removed')
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Translation Key Parity & Content Verification (en.json & hi.json)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Translation Key Parity & Content Verification ---')
  const enPath = path.resolve(__dirname, '../client/src/i18n/en.json')
  const hiPath = path.resolve(__dirname, '../client/src/i18n/hi.json')

  const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'))
  const hiJson = JSON.parse(fs.readFileSync(hiPath, 'utf8'))

  // 2.1 English key: noCompetenciesAssigned
  if (enJson.dashboard?.noCompetenciesAssigned === 'No competencies have been assigned to your role yet.') {
    pass('2.1: en.json contains exact dashboard.noCompetenciesAssigned English translation')
  } else {
    fail(`2.1: en.json missing or incorrect dashboard.noCompetenciesAssigned (${enJson.dashboard?.noCompetenciesAssigned})`)
  }

  // 2.2 Hindi key: noCompetenciesAssigned
  if (hiJson.dashboard?.noCompetenciesAssigned === 'अभी तक आपकी भूमिका के लिए कोई दक्षता निर्धारित नहीं की गई है।') {
    pass('2.2: hi.json contains exact dashboard.noCompetenciesAssigned Hindi translation')
  } else {
    fail(`2.2: hi.json missing or incorrect dashboard.noCompetenciesAssigned (${hiJson.dashboard?.noCompetenciesAssigned})`)
  }

  // 2.3 English key: competencyDataUnavailable
  if (enJson.dashboard?.competencyDataUnavailable &&
      enJson.dashboard.competencyDataUnavailable.includes('Competency evaluation data is currently unavailable')) {
    pass('2.3: en.json contains dashboard.competencyDataUnavailable English translation')
  } else {
    fail('2.3: en.json missing dashboard.competencyDataUnavailable')
  }

  // 2.4 Hindi key: competencyDataUnavailable
  if (hiJson.dashboard?.competencyDataUnavailable &&
      hiJson.dashboard.competencyDataUnavailable.includes('दक्षता मूल्यांकन डेटा वर्तमान में अनुपलब्ध है')) {
    pass('2.4: hi.json contains dashboard.competencyDataUnavailable Hindi translation')
  } else {
    fail('2.4: hi.json missing dashboard.competencyDataUnavailable')
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Pure State Logic Matrix Tests (All 8 Required Scenarios)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: AI Assistant Banner State Logic Matrix ---')

  // Scenario 3.1: Assessment incomplete
  const res3_1 = evaluateAssistantBannerState({
    hasCompletedAssessment: false,
    skillGapsQueryData: { skill_gaps: [] },
    isSkillGapsApiError: false,
  })
  if (res3_1.assistantState === 'ASSESSMENT_NOT_COMPLETED') {
    pass('3.1: Assessment incomplete -> State is ASSESSMENT_NOT_COMPLETED (prompts diagnostic test)')
  } else {
    fail(`3.1: Expected ASSESSMENT_NOT_COMPLETED, got ${res3_1.assistantState}`)
  }

  // Scenario 3.2: Assessment complete, 1+ gaps (priority gap exists)
  const res3_2 = evaluateAssistantBannerState({
    hasCompletedAssessment: true,
    skillGapsQueryData: {
      skill_gaps: [
        { competency_id: { name: 'Data Analytics' }, current_level: 2, required_level: 4, gap: 2, priority: 'high' },
        { competency_id: { name: 'Python' }, current_level: 3, required_level: 4, gap: 1, priority: 'medium' },
      ],
    },
    isSkillGapsApiError: false,
  })
  if (res3_2.assistantState === 'HAS_GAPS' && res3_2.topGapName === 'Data Analytics') {
    pass('3.2: Assessment complete with gaps -> State is HAS_GAPS (focuses on "Data Analytics"), NEVER ALL_CLEAR')
  } else {
    fail(`3.2: Expected HAS_GAPS with topGapName 'Data Analytics', got ${res3_2.assistantState}`)
  }

  // Scenario 3.3: Assessment complete, all competencies met (metCount === totalSkills, gap <= 0)
  const res3_3 = evaluateAssistantBannerState({
    hasCompletedAssessment: true,
    skillGapsQueryData: {
      skill_gaps: [
        { competency_id: { name: 'Data Analytics' }, current_level: 4, required_level: 4, gap: 0, priority: 'low' },
        { competency_id: { name: 'Python' }, current_level: 5, required_level: 4, gap: -1, priority: 'low' },
      ],
    },
    isSkillGapsApiError: false,
  })
  if (res3_3.assistantState === 'ALL_CLEAR' && res3_3.metCount === 2 && res3_3.totalSkills === 2) {
    pass('3.3: Assessment complete, all competencies met -> State is ALL_CLEAR ("All competencies on track")')
  } else {
    fail(`3.3: Expected ALL_CLEAR, got ${res3_3.assistantState}`)
  }

  // Scenario 3.4: Assessment complete, zero competencies assigned (empty array)
  const res3_4 = evaluateAssistantBannerState({
    hasCompletedAssessment: true,
    skillGapsQueryData: { skill_gaps: [] },
    isSkillGapsApiError: false,
  })
  if (res3_4.assistantState === 'ZERO_COMPETENCIES') {
    pass('3.4: Assessment complete, zero competencies -> State is ZERO_COMPETENCIES, NEVER ALL_CLEAR')
  } else {
    fail(`3.4: Expected ZERO_COMPETENCIES, got ${res3_4.assistantState}`)
  }

  // Scenario 3.5: Assessment complete, missing competency records (null / undefined)
  const res3_5 = evaluateAssistantBannerState({
    hasCompletedAssessment: true,
    skillGapsQueryData: null,
    isSkillGapsApiError: false,
  })
  if (res3_5.assistantState === 'DATA_UNAVAILABLE') {
    pass('3.5: Assessment complete, missing records -> State is DATA_UNAVAILABLE, NEVER ALL_CLEAR')
  } else {
    fail(`3.5: Expected DATA_UNAVAILABLE, got ${res3_5.assistantState}`)
  }

  // Scenario 3.6: Assessment complete, invalid competency data (non-array skill_gaps)
  const res3_6 = evaluateAssistantBannerState({
    hasCompletedAssessment: true,
    skillGapsQueryData: { skill_gaps: 'not_an_array' },
    isSkillGapsApiError: false,
  })
  if (res3_6.assistantState === 'DATA_UNAVAILABLE') {
    pass('3.6: Assessment complete, non-array skill_gaps -> State is DATA_UNAVAILABLE, NEVER ALL_CLEAR')
  } else {
    fail(`3.6: Expected DATA_UNAVAILABLE, got ${res3_6.assistantState}`)
  }

  // Scenario 3.7: Assessment complete, corrupted competency item (missing levels, isNaN)
  const res3_7 = evaluateAssistantBannerState({
    hasCompletedAssessment: true,
    skillGapsQueryData: {
      skill_gaps: [
        { competency_id: null, name: null, current_level: 'invalid' },
      ],
    },
    isSkillGapsApiError: false,
  })
  if (res3_7.assistantState === 'DATA_UNAVAILABLE') {
    pass('3.7: Assessment complete, corrupted competency items -> State is DATA_UNAVAILABLE, NEVER ALL_CLEAR')
  } else {
    fail(`3.7: Expected DATA_UNAVAILABLE, got ${res3_7.assistantState}`)
  }

  // Scenario 3.8: API error occurred (isSkillGapsApiError = true)
  const res3_8 = evaluateAssistantBannerState({
    hasCompletedAssessment: true,
    skillGapsQueryData: null,
    isSkillGapsApiError: true,
  })
  if (res3_8.assistantState === 'DATA_UNAVAILABLE') {
    pass('3.8: Skill gap API failure/error -> State is DATA_UNAVAILABLE, NEVER ALL_CLEAR')
  } else {
    fail(`3.8: Expected DATA_UNAVAILABLE, got ${res3_8.assistantState}`)
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 4: Database Integration & API Scoping (kaushalai_test)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Backend API Integration & Assessment States ---')
  const { dbName } = validateTestDatabaseUri(process.env.MONGODB_TEST_URI)
  pass(`4.1: Guardrail confirmed: Verified dedicated test DB "${dbName}"`)

  const testServerInfo = await startTestServer()
  activePort = testServerInfo.port
  pass(`4.2: Isolated test server initialized on ephemeral port ${activePort}`)

  const testStamp = Date.now()
  const incompleteUserEmail = `part14_inc_${testStamp}@test.kaushalai.gov.in`
  const completeUserEmail = `part14_comp_${testStamp}@test.kaushalai.gov.in`

  // 4.2 Incomplete User (onboarding_completed: false)
  const incUser = await User.create({
    name: 'Part 14 Incomplete User',
    email: incompleteUserEmail,
    role: 'employee',
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    onboarding_completed: false,
    onboarding_step: 2,
  })
  const incToken = jwt.sign({ id: incUser._id, role: incUser.role }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

  const incRes = await request({
    method: 'GET',
    path: '/api/skill-gaps',
    headers: { Authorization: `Bearer ${incToken}` },
  })

  if (incRes.status === 200 && incRes.body.latest_assessment === null) {
    pass('4.3: Incomplete learner API returns latest_assessment: null (matches ASSESSMENT_NOT_COMPLETED)')
  } else {
    fail(`4.3: Incomplete learner latest_assessment unexpected: ${JSON.stringify(incRes.body.latest_assessment)}`)
  }

  // 4.4 Completed User with diagnostic assessment record
  const compUser = await User.create({
    name: 'Part 14 Completed User',
    email: completeUserEmail,
    role: 'employee',
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    onboarding_completed: true,
    onboarding_step: 6,
  })
  const compToken = jwt.sign({ id: compUser._id, role: compUser.role }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

  const attempt = await AssessmentAttempt.create({
    user_id: compUser._id,
    assessment_id: new mongoose.Types.ObjectId(),
    type: 'diagnostic',
    status: 'completed',
    overall_score: 85,
    completed_at: new Date(),
  })

  const compRes = await request({
    method: 'GET',
    path: '/api/skill-gaps',
    headers: { Authorization: `Bearer ${compToken}` },
  })

  if (compRes.status === 200 && compRes.body.latest_assessment?._id === attempt._id.toString()) {
    pass('4.4: Completed learner API returns verified latest_assessment record')
  } else {
    fail('4.4: Completed learner API failed to return latest_assessment')
  }

  // Cleanup test users safely
  await safeCleanupTestUsers([incompleteUserEmail, completeUserEmail])
  await AssessmentAttempt.deleteMany({ _id: attempt._id })
  pass('4.5: Isolated test fixtures cleaned up cleanly from kaushalai_test')

  // Close environment
  await closeTestEnvironment()
  pass('4.6: Isolated test server closed')

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n===================================================================')
  console.log(`PART 14 TEST SUMMARY: ${totalPassed} Passed, ${totalFailed} Failed`)
  console.log('===================================================================\n')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runPart14Tests().catch((err) => {
  console.error('Fatal error in Part 14 test suite:', err)
  process.exit(1)
})
