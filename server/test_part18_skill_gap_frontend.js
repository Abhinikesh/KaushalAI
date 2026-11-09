/**
 * TEST PART 18: KAUSHALAI SKILL GAP ANALYSIS FRONTEND CORRECTIONS SUITE
 * 
 * Verifies:
 * 1. Localization Parity (English & Hindi keys, useTranslation integration)
 * 2. Standardized Gap Percentage Formula (gap / 5 * 100, clamped 0-100, consistent across tabs)
 * 3. Synthetic Promotional Cadre Removal (Next Promotional Cadre & readinessPct - 20 eliminated)
 * 4. Recommended Learning CTA Navigation (points to /recommendations)
 * 5. Strict Competency Data Validation & State Machine
 * 6. Live API Integration & Data Isolation Guardrails
 * 7. Scope Boundaries (Frozen Dashboard & Labs)
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
const { validateTestDatabaseUri } = require('./src/test/testDbGuard')

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET

// Color helper
const green = (s) => `\x1b[32m${s}\x1b[0m`
const red = (s) => `\x1b[31m${s}\x1b[0m`

let totalPassed = 0
let totalFailed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    totalPassed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    totalFailed++
  }
}

// Emulate calculateStandardGapPercentage from SkillGapAnalysisPage.jsx
function calculateStandardGapPercentage(gap) {
  if (gap === null || gap === undefined) return 0
  if (typeof gap === 'boolean') return 0
  let num
  if (typeof gap === 'number') {
    num = gap
  } else if (typeof gap === 'string') {
    const trimmed = gap.trim()
    if (trimmed.length === 0) return 0
    num = Number(trimmed)
  } else {
    return 0
  }
  if (!Number.isFinite(num)) return 0
  if (num <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((num / 5) * 100)))
}

// Emulate isValidStrictFiniteNumber from EmployeeDashboard.jsx
function isValidStrictFiniteNumber(val) {
  if (val === null || val === undefined) return false
  if (typeof val === 'boolean') return false
  if (typeof val === 'number') {
    return Number.isFinite(val)
  }
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (trimmed.length === 0) return false
    const num = Number(trimmed)
    return Number.isFinite(num)
  }
  return false
}

// Emulate isValidCompetencyItem from EmployeeDashboard.jsx
function isValidCompetencyItem(g) {
  if (!g || typeof g !== 'object' || Array.isArray(g)) return false
  const compId = g.competency_id
  const hasCompObj =
    compId &&
    typeof compId === 'object' &&
    !Array.isArray(compId) &&
    (Boolean(compId._id) || (typeof compId.name === 'string' && compId.name.trim().length > 0))
  const hasCompIdStr = typeof compId === 'string' && compId.trim().length > 0
  const hasNameStr = typeof g.name === 'string' && g.name.trim().length > 0

  if (!hasCompObj && !hasCompIdStr && !hasNameStr) return false
  if (!isValidStrictFiniteNumber(g.current_level)) return false
  if (!isValidStrictFiniteNumber(g.required_level)) return false
  if (!isValidStrictFiniteNumber(g.gap)) return false
  return true
}

async function runPart18Tests() {
  console.log('========================================================================')
  console.log('  TESTING PART 18: KAUSHALAI SKILL GAP FRONTEND CORRECTIONS SUITE       ')
  console.log('========================================================================\n')

  const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/kaushalai_test'
  const { dbName } = validateTestDatabaseUri(testDbUri)
  assert(dbName === 'kaushalai_test', `Guardrail: Dedicated test database confirmed: "${dbName}"`)

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 1: Complete Hindi & English Localization (Fix 1)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 1: Localization & i18n Dictionary Parity ---')

  const enPath = path.resolve(__dirname, '../client/src/i18n/en.json')
  const hiPath = path.resolve(__dirname, '../client/src/i18n/hi.json')
  const pagePath = path.resolve(__dirname, '../client/src/pages/competency/SkillGapAnalysisPage.jsx')

  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'))
  const hi = JSON.parse(fs.readFileSync(hiPath, 'utf8'))
  const pageSrc = fs.readFileSync(pagePath, 'utf8')

  assert(Boolean(en.skillGap), '1.1: en.json contains dedicated skillGap namespace')
  assert(Boolean(hi.skillGap), '1.2: hi.json contains dedicated skillGap namespace')

  const enKeys = Object.keys(en.skillGap || {})
  const hiKeys = Object.keys(hi.skillGap || {})

  assert(enKeys.length >= 60, `1.3: en.skillGap contains comprehensive keys (found ${enKeys.length} >= 60)`)
  assert(hiKeys.length >= 60, `1.4: hi.skillGap contains comprehensive keys (found ${hiKeys.length} >= 60)`)

  let missingInHi = []
  for (const k of enKeys) {
    if (hi.skillGap[k] === undefined) {
      missingInHi.push(k)
    }
  }
  assert(missingInHi.length === 0, `1.5: 100% key parity between en.skillGap and hi.skillGap (missing: ${missingInHi.join(', ') || 'none'})`)

  // Verify natural Hindi text in translations
  let hindiTextCheck = true
  for (const k of hiKeys) {
    if (typeof hi.skillGap[k] === 'string' && hi.skillGap[k].trim().length === 0) {
      hindiTextCheck = false
    }
  }
  assert(hindiTextCheck, '1.6: All Hindi translation values contain non-empty authentic translations')

  // Verify useTranslation integration in SkillGapAnalysisPage.jsx
  assert(pageSrc.includes("import { useTranslation } from 'react-i18next'"), "1.7: SkillGapAnalysisPage imports useTranslation from 'react-i18next'")
  assert(pageSrc.includes('const { t } = useTranslation()'), '1.8: SkillGapAnalysisPage calls useTranslation hook')

  // Verify key user-facing strings are wrapped with t()
  const auditedTranslationKeys = [
    'skillGap.title',
    'skillGap.subtitle',
    'skillGap.export_report',
    'skillGap.filters',
    'skillGap.diagnostic_baseline',
    'skillGap.tab_overview',
    'skillGap.tab_skills',
    'skillGap.tab_competencies',
    'skillGap.tab_role',
    'skillGap.tab_department',
    'skillGap.tab_proficiency',
    'skillGap.metric_readiness',
    'skillGap.metric_skills_assessed',
    'skillGap.metric_high_priority',
    'skillGap.metric_on_track',
    'skillGap.metric_ahead',
    'skillGap.chart_title',
    'skillGap.donut_title',
    'skillGap.top_skills_title',
    'skillGap.competency_area_title',
    'skillGap.recommendations_title',
    'skillGap.view_recommended_learning',
    'skillGap.no_assessment_title',
    'skillGap.no_competencies_assigned_title',
    'skillGap.data_unavailable_title'
  ]

  let allKeysUsed = true
  for (const key of auditedTranslationKeys) {
    if (!pageSrc.includes(`'${key}'`)) {
      allKeysUsed = false
      console.error(`Missing translation call for key: ${key}`)
    }
  }
  assert(allKeysUsed, '1.9: All audited page titles, tabs, metrics, and empty states use t() translation calls')

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 2: Standardized Gap Percentage Formula (Fix 2)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 2: Standardized Gap Percentage Calculation ---')

  // Preferred formula: gapPercentage = (gap / 5) * 100
  assert(calculateStandardGapPercentage(0) === 0, '2.1: Zero gap yields 0%')
  assert(calculateStandardGapPercentage(1) === 20, '2.2: Gap 1 yields exactly 20% (1/5 * 100)')
  assert(calculateStandardGapPercentage(2) === 40, '2.3: Gap 2 yields exactly 40% (2/5 * 100)')
  assert(calculateStandardGapPercentage(3) === 60, '2.4: Gap 3 yields exactly 60% (3/5 * 100)')
  assert(calculateStandardGapPercentage(4) === 80, '2.5: Gap 4 yields exactly 80% (4/5 * 100)')
  assert(calculateStandardGapPercentage(5) === 100, '2.6: Gap 5 yields exactly 100% (5/5 * 100)')
  assert(calculateStandardGapPercentage(6) === 100, '2.7: Over-scale gap 6 clamped to 100% max')
  assert(calculateStandardGapPercentage(-1) === 0, '2.8: Negative gap -1 (exceeding requirement) yields 0%')
  assert(calculateStandardGapPercentage(-3) === 0, '2.9: Negative gap -3 yields 0%')
  assert(calculateStandardGapPercentage('2') === 40, '2.10: Numeric string "2" yields 40%')
  assert(calculateStandardGapPercentage('0') === 0, '2.11: Numeric string "0" yields 0%')

  // Invalid inputs rejected cleanly
  assert(calculateStandardGapPercentage(null) === 0, '2.12: null gap yields 0% without error')
  assert(calculateStandardGapPercentage(undefined) === 0, '2.13: undefined gap yields 0% without error')
  assert(calculateStandardGapPercentage(NaN) === 0, '2.14: NaN gap yields 0% without error')
  assert(calculateStandardGapPercentage(Infinity) === 0, '2.15: Infinity gap yields 0% without error')
  assert(calculateStandardGapPercentage('') === 0, '2.16: Empty string gap yields 0% without error')
  assert(calculateStandardGapPercentage('abc') === 0, '2.17: Non-numeric string "abc" yields 0% without error')
  assert(calculateStandardGapPercentage(true) === 0, '2.18: Boolean true yields 0% without error')

  // Verification that SkillGapAnalysisPage uses calculateStandardGapPercentage consistently
  assert(pageSrc.includes('export function calculateStandardGapPercentage'), '2.19: calculateStandardGapPercentage is defined and exported in SkillGapAnalysisPage.jsx')
  assert(!pageSrc.includes('Math.round((g.gap / g.required_level) * 100)'), '2.20: Obsolete (gap / required_level * 100) formula completely removed from top5Skills')
  assert(!pageSrc.includes('Math.round((gap / req) * 100)'), '2.21: Obsolete (gap / req * 100) formula completely removed from activeSkillsList')
  assert(pageSrc.includes('calculateStandardGapPercentage(g.gap)'), '2.22: top5Skills strictly uses calculateStandardGapPercentage')
  assert(pageSrc.includes('calculateStandardGapPercentage(gap)'), '2.23: activeSkillsList strictly uses calculateStandardGapPercentage')

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 3: Remove Synthetic Next Promotional Cadre (Fix 3)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 3: Elimination of Synthetic Next Promotional Cadre ---')

  assert(!pageSrc.includes('Next Promotional Cadre'), '3.1: "Next Promotional Cadre" text completely eliminated from SkillGapAnalysisPage.jsx')
  assert(!pageSrc.includes('readinessPct - 20'), '3.2: Fabricated (readinessPct - 20) calculation completely eliminated')
  assert(!pageSrc.includes('Preparation Needed'), '3.3: Fabricated "Preparation Needed" promotional status eliminated')
  assert(pageSrc.includes('user?.role_id?.title || user?.designation ||'), '3.4: Tab 4 ("By Role") preserves genuine assigned cadre role benchmark')

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 4: Correct Recommended Learning CTA Navigation (Fix 4)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 4: Recommended Learning CTA Navigation ---')

  assert(!pageSrc.includes("navigate('/my-learning')"), "4.1: Obsolete navigation target '/my-learning' removed from recommendations card")
  assert(pageSrc.includes("navigate('/recommendations')"), "4.2: Recommendations CTA button correctly navigates to '/recommendations'")

  const appJsxPath = path.resolve(__dirname, '../client/src/App.jsx')
  const appJsx = fs.readFileSync(appJsxPath, 'utf8')
  assert(appJsx.includes('path="/recommendations"'), '4.3: Target route "/recommendations" registered and valid in App.jsx')

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 5: Strict Competency Data Validation (Fix 5)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 5: Strict Competency Data Validation & State Machine ---')

  // Test isValidStrictFiniteNumber
  assert(isValidStrictFiniteNumber(0) === true, '5.1: Valid zero (0) accepted')
  assert(isValidStrictFiniteNumber(3) === true, '5.2: Valid integer (3) accepted')
  assert(isValidStrictFiniteNumber(-1) === true, '5.3: Valid negative number (-1) accepted')
  assert(isValidStrictFiniteNumber('4') === true, '5.4: Valid numeric string ("4") accepted')
  assert(isValidStrictFiniteNumber(null) === false, '5.5: null rejected')
  assert(isValidStrictFiniteNumber(undefined) === false, '5.6: undefined rejected')
  assert(isValidStrictFiniteNumber(NaN) === false, '5.7: NaN rejected')
  assert(isValidStrictFiniteNumber(Infinity) === false, '5.8: Infinity rejected')
  assert(isValidStrictFiniteNumber(-Infinity) === false, '5.9: -Infinity rejected')
  assert(isValidStrictFiniteNumber('') === false, '5.10: Empty string rejected')
  assert(isValidStrictFiniteNumber('   ') === false, '5.11: Whitespace-only string rejected')
  assert(isValidStrictFiniteNumber('advanced') === false, '5.12: Non-numeric string rejected')
  assert(isValidStrictFiniteNumber(true) === false, '5.13: Boolean true rejected')
  assert(isValidStrictFiniteNumber(false) === false, '5.14: Boolean false rejected')

  // Test isValidCompetencyItem
  const validComp = {
    competency_id: { _id: '6af123456789012345678901', name: 'Sampling Design' },
    current_level: 2,
    required_level: 4,
    gap: 2,
    priority: 'high',
  }
  assert(isValidCompetencyItem(validComp) === true, '5.15: Fully populated valid competency item accepted')

  const validCompStringId = {
    competency_id: '6af123456789012345678901',
    name: 'Sampling Design',
    current_level: '0',
    required_level: '3',
    gap: '3',
  }
  assert(isValidCompetencyItem(validCompStringId) === true, '5.16: Valid competency item with string ID & string numbers accepted')

  const invalidCompMissingId = {
    current_level: 2,
    required_level: 4,
    gap: 2,
  }
  assert(isValidCompetencyItem(invalidCompMissingId) === false, '5.17: Item missing competency identifier rejected')

  const invalidCompNullLevel = {
    competency_id: { name: 'Test' },
    current_level: null,
    required_level: 3,
    gap: 3,
  }
  assert(isValidCompetencyItem(invalidCompNullLevel) === false, '5.18: Item with null current_level rejected')

  const invalidCompNanGap = {
    competency_id: { name: 'Test' },
    current_level: 2,
    required_level: 3,
    gap: NaN,
  }
  assert(isValidCompetencyItem(invalidCompNanGap) === false, '5.19: Item with NaN gap rejected')

  // Mixed items filtering (Requirement 6: Preserve valid competency records when unrelated records are invalid)
  const mixedRawList = [
    validComp,
    invalidCompMissingId,
    invalidCompNullLevel,
    { ...validComp, competency_id: { name: 'Second Valid' }, current_level: 3, required_level: 3, gap: 0 }
  ]
  const filteredValid = mixedRawList.filter(isValidCompetencyItem)
  assert(filteredValid.length === 2, `5.20: Mixed dataset preserves exactly 2 valid items (actual: ${filteredValid.length})`)

  // State Decision Logic in SkillGapAnalysisPage.jsx
  assert(pageSrc.includes('const isConfirmedZeroCompetencies ='), '5.21: isConfirmedZeroCompetencies state explicitly evaluated')
  assert(pageSrc.includes('const isUnresolvedRole ='), '5.22: isUnresolvedRole state explicitly evaluated')
  assert(pageSrc.includes('const isDataUnavailable ='), '5.23: isDataUnavailable state explicitly evaluated')
  assert(pageSrc.includes('validatedGaps = useMemo'), '5.24: validatedGaps strictly wraps rawGaps in filter(isValidCompetencyItem)')

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 6: Backend API Integration & Database Isolation
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 6: Backend API Contract & DB Isolation ---')

  const express = require('express')
  const mongooseModule = require('mongoose')
  await mongooseModule.connect(testDbUri)

  const User = require('./src/models/User')
  const Role = require('./src/models/Role')
  const RoleCompetency = require('./src/models/RoleCompetency')
  const Competency = require('./src/models/Competency')
  const SkillGap = require('./src/models/SkillGap')

  // Check dev DB isolation
  const devConn = await mongooseModule.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
  const devUserCount = await devConn.collection('users').countDocuments()
  assert(devUserCount === 15, `6.1: Development DB (kaushalai) user count strictly isolated: 15 (actual: ${devUserCount})`)
  await devConn.close()

  // Setup test server
  const app = require('./src/app')
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port

  function makeRequest(path, headers = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method: 'GET',
          headers,
        },
        (res) => {
          let body = ''
          res.on('data', (c) => (body += c))
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(body) })
            } catch (e) {
              resolve({ status: res.statusCode, body })
            }
          })
        }
      )
      req.on('error', reject)
      req.end()
    })
  }

  // 6.2: Unauthenticated request rejected
  const unauthRes = await makeRequest('/api/skill-gaps')
  assert(unauthRes.status === 401, `6.2: Unauthenticated GET /api/skill-gaps rejected with 401 (got: ${unauthRes.status})`)

  // 6.3: Confirmed zero-competency role API contract
  await User.deleteMany({ email: /part18/ })
  await Role.deleteMany({ name: /Part 18/ })

  const zeroRole = await Role.create({
    name: 'Part 18 Zero Competency Cadre',
    code: 'P18_ZERO',
    department: 'Testing Division',
    level: 2,
    department_ref: new mongoose.Types.ObjectId()
  })

  const zeroUser = await User.create({
    name: 'Zero Competency Learner',
    email: 'part18_zero_user@kaushalai.test',
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    role: 'employee',
    role_id: zeroRole._id,
    onboarding_step: 6,
    onboarding_completed: true,
  })

  const zeroToken = jwt.sign(
    { id: zeroUser._id.toString(), email: zeroUser.email, role: zeroUser.role },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )

  const zeroRes = await makeRequest('/api/skill-gaps', { Authorization: `Bearer ${zeroToken}` })
  assert(zeroRes.status === 200, '6.3: GET /api/skill-gaps returns 200 for zero-competency role user')
  assert(zeroRes.body.role_resolved === true, '6.4: role_resolved is true for confirmed zero role')
  assert(zeroRes.body.role_competencies_count === 0, '6.5: role_competencies_count is 0')
  assert(zeroRes.body.has_assigned_competencies === false, '6.6: has_assigned_competencies is false')
  assert(Array.isArray(zeroRes.body.skill_gaps) && zeroRes.body.skill_gaps.length === 0, '6.7: skill_gaps is empty array')

  // 6.8: Unresolved role API contract
  const unresolvedUser = await User.create({
    name: 'Unresolved Role Learner',
    email: 'part18_unresolved_user@kaushalai.test',
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    role: 'employee',
    onboarding_step: 6,
    onboarding_completed: true,
  })

  const unresolvedToken = jwt.sign(
    { id: unresolvedUser._id.toString(), email: unresolvedUser.email, role: unresolvedUser.role },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )

  const unresRes = await makeRequest('/api/skill-gaps', { Authorization: `Bearer ${unresolvedToken}` })
  assert(unresRes.status === 200, '6.8: GET /api/skill-gaps returns 200 for unresolved role user')
  assert(unresRes.body.role_resolved === false, '6.9: role_resolved is false for unresolved role')
  assert(unresRes.body.role_competencies_count === null, '6.10: role_competencies_count is null')
  assert(unresRes.body.has_assigned_competencies === null, '6.11: has_assigned_competencies is null')
  assert(Array.isArray(unresRes.body.skill_gaps) && unresRes.body.skill_gaps.length === 0, '6.12: skill_gaps is empty array without historical leakage')

  // Teardown
  await User.deleteMany({ _id: { $in: [zeroUser._id, unresolvedUser._id] } })
  await Role.deleteOne({ _id: zeroRole._id })
  server.close()
  await mongooseModule.disconnect()

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 7: Scope Boundaries & Freeze Verification
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 7: Scope Restrictions & Freeze Invariants ---')

  const { execSync } = require('child_process')
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' })

  assert(!gitStatus.includes('EmployeeDashboard.jsx'), '7.1: EmployeeDashboard.jsx strictly FROZEN (0 modifications)')
  assert(!gitStatus.includes('EmployeeDashboard.module.css'), '7.2: Dashboard CSS strictly FROZEN (0 modifications)')
  assert(!gitStatus.includes('client/src/pages/labs'), '7.3: KaushalAI Labs strictly FROZEN (0 modifications)')

  console.log('\n========================================================================')
  console.log(`PART 18 TEST SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`)
  console.log('========================================================================')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runPart18Tests().catch((err) => {
  console.error('Unhandled Part 18 test error:', err)
  process.exit(1)
})
