/**
 * test_part17_backend_integrity.js
 * Comprehensive Verification Test Suite for PART 17:
 * KaushalAI Backend Data Integrity & Skill Gap Synchronization
 *
 * Scenarios Tested:
 * 1. Database Isolation Guardrail (kaushalai_test exclusive, zero writes to kaushalai)
 * 2. Unambiguous Role Resolution (resolveAuthoritativeRole helper, fail-closed behavior)
 * 3. Scenario A: Role Reassignment & Orphan Cleanup (Option A: 0 obsolete gaps, UserCompetency preserved)
 * 4. Scenario B: Role with Zero Competencies (reported as 0, old gaps purged, no auto-seeding)
 * 5. Scenario C: Missing / Ambiguous Role (fails closed, no arbitrary department, no destructive cleanup)
 * 6. Scenario D: Course Quiz Improvement & SkillGap Synchronization (UserCompetency + SkillGap synced)
 * 7. Scenario E: Course Quiz Without Improvement (no downgrade, no duplicate SkillGap)
 * 8. Scenario F: Quiz Competency Outside Role (UserCompetency updated, no artificial SkillGap created)
 * 9. Scenario G: Admin Top Gaps Analytics (modern role_id aggregation, empty array on no gaps, no mock data)
 * 10. Scenario H: Cross-User Isolation (User 1 operations never mutate User 2 data)
 * 11. Profile Role Update Hook (updateMe triggers SkillGap recalculation)
 */

'use strict'

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })
if (!process.env.ACCESS_TOKEN_SECRET) {
  process.env.ACCESS_TOKEN_SECRET = 'kaushalai_dev_access_secret_change_in_prod'
}
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
  Role,
  Department,
  Competency,
  RoleCompetency,
  SkillGap,
  UserCompetency,
  AssessmentAttempt,
} = require('./src/models')

const { resolveAuthoritativeRole } = require('./src/utils/roleResolution')
const { computeUserSkillGaps } = require('./src/services/skillGap.service')
const { applyCompetencyUpdates } = require('./src/services/competencyUpdate.service')
const { getOrgWideTopGaps } = require('./src/services/adminAnalytics.service')

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET

let activePort = null
let totalPassed = 0
let totalFailed = 0

function pass(msg) {
  console.log(`  ✓ PASS: ${msg}`)
  totalPassed++
}

function fail(msg, err) {
  console.error(`  ✗ FAIL: ${msg}`)
  if (err) console.error('   ', err.message || err)
  totalFailed++
}

function assert(cond, msg) {
  if (cond) pass(msg)
  else fail(msg)
}

function makeAuthToken(userId, role = 'employee') {
  return jwt.sign(
    { id: String(userId), role, email: `test_${userId}@kaushalai.gov.in` },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )
}

function apiGet(urlPath, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port: activePort,
      path: urlPath,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
    const req = http.request(opts, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode, body: data })
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

function apiPut(urlPath, payload, token) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(payload)
    const opts = {
      hostname: '127.0.0.1',
      port: activePort,
      path: urlPath,
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    }
    const req = http.request(opts, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode, body: data })
        }
      })
    })
    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

async function runPart17Suite() {
  console.log('========================================================================')
  console.log('   PART 17 TEST SUITE: BACKEND DATA INTEGRITY & SKILL GAP SYNC         ')
  console.log('========================================================================\n')

  // --- Step 0: DB Isolation Guardrail Pre-Check ---
  console.log('[GUARD] Verifying test database configuration...')
  const valid = validateTestDatabaseUri(process.env.MONGODB_TEST_URI)
  assert(valid.dbName === 'kaushalai_test', '1. MONGODB_TEST_URI validated as kaushalai_test')

  // Check dev DB record count before tests
  let devUserCountBefore = null
  try {
    const devConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai', {
      serverSelectionTimeoutMS: 3000,
    }).asPromise()
    devUserCountBefore = await devConn.collection('users').countDocuments()
    await devConn.close()
    console.log(`[GUARD] Development DB (kaushalai) pre-test user count: ${devUserCountBefore}`)
  } catch (err) {
    console.warn(`[GUARD] Warning checking dev DB: ${err.message}`)
  }

  // Start test server bound to kaushalai_test
  const testEnv = await startTestServer({
    preferPort: 5099,
    testUri: process.env.MONGODB_TEST_URI,
  })
  activePort = testEnv.port
  console.log(`[GUARD] Test server running on port ${activePort} connected to ${testEnv.dbName}\n`)

  // Pre-clean any leftover test fixtures from prior aborted runs
  await Role.deleteMany({ name: /^P17 / })
  await Competency.deleteMany({ name: /^Part 17 / })
  await User.deleteMany({ email: /^p17_/ })

  const testUserIds = []

  try {
    // --- Step 1: Centralized Role Resolution Unit Tests ---
    console.log('[STEP 1] Testing Centralized Role Resolution (resolveAuthoritativeRole)...')
    const sampleDept = await Department.findOne({ code: 'FOD' })
    const sampleRole = await Role.findOne({ department_ref: sampleDept._id, level: 3 })
    assert(sampleRole != null, 'Found existing FOD Level 3 role in test DB')

    // 1. Direct role_id
    const r1 = await resolveAuthoritativeRole({ role_id: sampleRole._id })
    assert(r1.resolved === true && String(r1.role._id) === String(sampleRole._id), '1.1 Direct role_id resolves unambiguously')
    assert(r1.method === 'assigned_role', '1.2 Method is assigned_role')

    // 2. Missing role_id and missing department -> fails closed
    const r2 = await resolveAuthoritativeRole({ level: 3 })
    assert(r2.resolved === false && r2.role === null, '1.3 Missing role_id and department fails closed')
    assert(r2.reason === 'missing_or_unresolved_department', '1.4 Reason is missing_or_unresolved_department')

    // 3. Missing role_id, invalid level -> fails closed
    const r3 = await resolveAuthoritativeRole({ level: 99, department: 'Field Operations Division (FOD)' })
    assert(r3.resolved === false && r3.role === null, '1.5 Invalid level fails closed')
    assert(r3.reason === 'missing_or_invalid_level', '1.6 Reason is missing_or_invalid_level')

    // 4. Missing role_id, valid level 3, unambiguous department string
    const r4 = await resolveAuthoritativeRole({ level: 3, department: 'Field Operations Division (FOD)' })
    assert(r4.resolved === true && String(r4.role._id) === String(sampleRole._id), '1.7 Unambiguous department name + level resolves correct role')
    assert(r4.method === 'department_level_match', '1.8 Method is department_level_match')

    // 5. Missing role_id, valid level 3, department code 'FOD'
    const r5 = await resolveAuthoritativeRole({ level: 3, department: 'FOD' })
    assert(r5.resolved === true && String(r5.role._id) === String(sampleRole._id), '1.9 Unambiguous department code + level resolves correct role')

    // 6. Missing role_id, non-existent department
    const r6 = await resolveAuthoritativeRole({ level: 3, department: 'NonExistentDivisionXYZ' })
    assert(r6.resolved === false && r6.role === null, '1.10 Non-existent department fails closed')

    // --- Create Test Fixtures for Scenarios A-F ---
    console.log('\n[FIXTURES] Setting up test competencies, roles, and users...')
    // Create 10 distinct competencies
    const compDocs = []
    for (let i = 1; i <= 10; i++) {
      let comp = await Competency.findOne({ competencyCode: `COMP_TEST_P17_${i}` })
      if (!comp) {
        comp = await Competency.create({
          competencyCode: `COMP_TEST_P17_${i}`,
          name: `Part 17 Test Competency ${i}`,
          category: i <= 5 ? 'statistical' : 'technical',
          description: `Test competency ${i} for Part 17`,
          level: 3,
        })
      }
      compDocs.push(comp)
    }

    // Role A: uses comps 0..5 (6 competencies)
    const roleADoc = await Role.create({
      name: 'P17 Test Cadre Role A (6 Comps)',
      level: 3,
      department_ref: sampleDept._id,
    })
    for (let i = 0; i < 6; i++) {
      await RoleCompetency.create({
        role_id: roleADoc._id,
        competency_id: compDocs[i]._id,
        required_level: 4,
      })
    }

    // Role B: uses comps 4..7 (4 competencies, 2 overlap: 4 & 5, 2 new: 6 & 7)
    const roleBDoc = await Role.create({
      name: 'P17 Test Cadre Role B (4 Comps)',
      level: 3,
      department_ref: sampleDept._id,
    })
    for (let i = 4; i < 8; i++) {
      await RoleCompetency.create({
        role_id: roleBDoc._id,
        competency_id: compDocs[i]._id,
        required_level: 3,
      })
    }

    // Role C: confirmed zero competencies
    const roleCDoc = await Role.create({
      name: 'P17 Test Cadre Role C (0 Comps)',
      level: 2,
      department_ref: sampleDept._id,
    })

    // User 1: assigned to Role A initially
    const user1 = await User.create({
      name: 'P17 Learner Alpha',
      email: 'p17_learner_alpha@kaushalai.gov.in',
      role: 'employee',
      googleLinked: true,
      role_id: roleADoc._id,
      level: 3,
      department: 'Field Operations Division (FOD)',
      onboarding_completed: true,
      onboarding_step: 6,
    })
    testUserIds.push(user1._id)

    // User 1 initial UserCompetency: assessed at Level 1 for comps 0, 1, 2, 4
    for (const idx of [0, 1, 2, 4]) {
      await UserCompetency.create({
        user_id: user1._id,
        competency_id: compDocs[idx]._id,
        current_level: 1,
        source: 'diagnostic',
      })
    }

    // User 2: Isolation control user assigned to Role A
    const user2 = await User.create({
      name: 'P17 Learner Beta Control',
      email: 'p17_learner_beta@kaushalai.gov.in',
      role: 'employee',
      googleLinked: true,
      role_id: roleADoc._id,
      level: 3,
      department: 'Field Operations Division (FOD)',
      onboarding_completed: true,
      onboarding_step: 6,
    })
    testUserIds.push(user2._id)
    await UserCompetency.create({
      user_id: user2._id,
      competency_id: compDocs[0]._id,
      current_level: 2,
      source: 'diagnostic',
    })

    // --- Scenario A: Role Reassignment & Orphan Cleanup (ISSUE-16-01) ---
    console.log('\n[STEP 2] Testing Scenario A: Role Reassignment & Orphan Cleanup...')
    // Initial computation for User 1 under Role A
    const initialGapsA = await computeUserSkillGaps(user1._id)
    assert(initialGapsA.length === 6, '2.1 Initial Role A computation produces exactly 6 SkillGaps')

    const user1InitialGapsInDb = await SkillGap.find({ user_id: user1._id })
    assert(user1InitialGapsInDb.length === 6, '2.2 Exactly 6 SkillGap records stored in DB for Role A')

    // Also compute User 2 gaps for isolation test later
    const user2InitialGaps = await computeUserSkillGaps(user2._id)
    assert(user2InitialGaps.length === 6, '2.3 User 2 (control) has 6 SkillGap records under Role A')

    // Reassign User 1 from Role A to Role B
    user1.role_id = roleBDoc._id
    await user1.save()

    // Run computeUserSkillGaps for User 1 under new Role B
    const reassignedGapsB = await computeUserSkillGaps(user1._id)
    assert(reassignedGapsB.length === 4, '2.4 Role B recalculation produces exactly 4 SkillGaps')

    const user1GapsAfterB = await SkillGap.find({ user_id: user1._id, role_id: roleBDoc._id })
    assert(user1GapsAfterB.length === 4, '2.5 Exactly 4 SkillGap records in DB after reassignment to Role B')

    const user1CompIdsAfterB = new Set(user1GapsAfterB.map((g) => g.competency_id.toString()))
    assert(user1CompIdsAfterB.has(compDocs[4]._id.toString()), '2.6 Active Role B comp 4 present')
    assert(user1CompIdsAfterB.has(compDocs[5]._id.toString()), '2.7 Active Role B comp 5 present')
    assert(user1CompIdsAfterB.has(compDocs[6]._id.toString()), '2.8 Active Role B comp 6 present')
    assert(user1CompIdsAfterB.has(compDocs[7]._id.toString()), '2.9 Active Role B comp 7 present')

    // Verify obsolete Role A competencies (0, 1, 2, 3) are completely purged
    assert(!user1CompIdsAfterB.has(compDocs[0]._id.toString()), '2.10 Obsolete comp 0 is purged from SkillGap')
    assert(!user1CompIdsAfterB.has(compDocs[1]._id.toString()), '2.11 Obsolete comp 1 is purged from SkillGap')
    assert(!user1CompIdsAfterB.has(compDocs[2]._id.toString()), '2.12 Obsolete comp 2 is purged from SkillGap')
    assert(!user1CompIdsAfterB.has(compDocs[3]._id.toString()), '2.13 Obsolete comp 3 is purged from SkillGap')

    // Verify UserCompetency history was NOT deleted
    const user1UCs = await UserCompetency.find({ user_id: user1._id })
    assert(user1UCs.length === 4, '2.14 UserCompetency records (0, 1, 2, 4) remain completely intact')

    // --- Scenario B: Role with Zero Competencies (ISSUE-16-01 & ISSUE-16-03) ---
    console.log('\n[STEP 3] Testing Scenario B: Confirmed Zero-Competency Role...')
    // Reassign User 1 to Role C (confirmed 0 competencies)
    user1.role_id = roleCDoc._id
    await user1.save()

    const zeroGaps = await computeUserSkillGaps(user1._id)
    assert(zeroGaps.length === 0, '3.1 computeUserSkillGaps returns 0 gaps for zero-competency role')

    const user1GapsAfterC = await SkillGap.find({ user_id: user1._id, role_id: roleCDoc._id })
    assert(user1GapsAfterC.length === 0, '3.2 All previous SkillGap records purged from DB')

    // Verify RoleCompetency was NOT auto-seeded with 59 competencies
    const roleCCount = await RoleCompetency.countDocuments({ role_id: roleCDoc._id })
    assert(roleCCount === 0, '3.3 Role C still has exactly 0 RoleCompetency records (no legacy auto-seeding)')

    // Verify GET /api/skill-gaps controller response
    const token1 = makeAuthToken(user1._id)
    const apiResB = await apiGet('/api/skill-gaps', token1)
    assert(apiResB.status === 200, '3.4 GET /api/skill-gaps returns HTTP 200')
    assert(apiResB.body.count === 0, '3.5 count is 0')
    assert(apiResB.body.role_competencies_count === 0, '3.6 role_competencies_count is strictly 0 (confirmed zero-competency role)')
    assert(apiResB.body.has_assigned_competencies === false, '3.7 has_assigned_competencies is false')
    assert(apiResB.body.role_resolved === true, '3.8 role_resolved is true (role resolved, just has 0 competencies)')

    // --- Scenario C: Missing / Ambiguous Role (ISSUE-16-02) ---
    console.log('\n[STEP 4] Testing Scenario C: Missing / Ambiguous Role...')
    const userNoRole = await User.create({
      name: 'P17 User No Role',
      email: 'p17_no_role@kaushalai.gov.in',
      role: 'employee',
      googleLinked: true,
      role_id: null,
      level: null,
      department: null,
    })
    testUserIds.push(userNoRole._id)

    // Seed one gap to verify no destructive cleanup occurs on failure
    await SkillGap.create({
      user_id: userNoRole._id,
      competency_id: compDocs[0]._id,
      current_level: 1,
      required_level: 3,
      gap: 2,
      priority: 'high',
      computed_at: new Date(),
    })

    let threwAsExpected = false
    try {
      await computeUserSkillGaps(userNoRole._id)
    } catch (err) {
      threwAsExpected = true
      assert(err.message.includes('has no resolvable authoritative role'), '4.1 Throws descriptive error on missing role')
    }
    assert(threwAsExpected, '4.2 computeUserSkillGaps fails closed without resolving arbitrary role')

    // Verify existing gaps were NOT deleted because resolution failed
    const gapsStillThere = await SkillGap.find({ user_id: userNoRole._id })
    assert(gapsStillThere.length === 1, '4.3 Destructive cleanup was NOT run when role resolution failed')

    // Test API response for user with missing role
    const tokenNoRole = makeAuthToken(userNoRole._id)
    const apiResNoRole = await apiGet('/api/skill-gaps', tokenNoRole)
    assert(apiResNoRole.status === 200, '4.4 API returns HTTP 200')
    assert(apiResNoRole.body.role_competencies_count === null, '4.5 role_competencies_count is null (unresolved role, not falsely zero)')
    assert(apiResNoRole.body.has_assigned_competencies === null, '4.6 has_assigned_competencies is null (unresolved — not false, to avoid false ZERO_COMPETENCIES in frozen dashboard)')
    assert(apiResNoRole.body.role_resolved === false, '4.7 role_resolved is false (unresolved role explicitly flagged)')

    // --- Scenario D: Course Quiz Improvement & SkillGap Synchronization (ISSUE-16-05) ---
    console.log('\n[STEP 5] Testing Scenario D: Quiz Improvement & SkillGap Synchronization...')
    // Put User 1 back on Role B
    user1.role_id = roleBDoc._id
    await user1.save()
    await computeUserSkillGaps(user1._id)

    // In Role B, compDocs[4] has required_level 3.
    // User 1 currently has current_level 1 -> gap: 2, priority: 'high'
    const gap4Before = await SkillGap.findOne({ user_id: user1._id, competency_id: compDocs[4]._id })
    assert(gap4Before.gap === 2 && gap4Before.priority === 'high', '5.1 Comp 4 initial gap is 2, priority high')

    // Take quiz with 85% score (implies Level 4)
    const attemptTime = new Date()
    const updates = await applyCompetencyUpdates(user1._id, [compDocs[4]._id], 85, attemptTime)
    assert(updates.length === 1, '5.2 applyCompetencyUpdates reports 1 competency updated')
    assert(updates[0].previousLevel === 1 && updates[0].newLevel === 4, '5.3 Level upgraded from 1 to 4')

    // Verify UserCompetency record updated
    const uc4After = await UserCompetency.findOne({ user_id: user1._id, competency_id: compDocs[4]._id })
    assert(uc4After.current_level === 4, '5.4 UserCompetency current_level is now 4')
    assert(uc4After.source === 'quiz', '5.5 UserCompetency source is quiz')

    // Verify SkillGap was automatically synchronized!
    const gap4After = await SkillGap.findOne({ user_id: user1._id, competency_id: compDocs[4]._id })
    assert(gap4After.current_level === 4, '5.6 SkillGap current_level automatically updated to 4')
    assert(gap4After.gap === -1, '5.7 SkillGap gap recalculated to -1 (3 - 4)')
    assert(gap4After.priority === 'low', '5.8 SkillGap priority recalculated to low')

    // --- Scenario E: Course Quiz Without Improvement (ISSUE-16-05) ---
    console.log('\n[STEP 6] Testing Scenario E: Quiz Without Improvement...')
    // Take quiz with 35% score (implies Level 1, lower than existing Level 4)
    const noUpdates = await applyCompetencyUpdates(user1._id, [compDocs[4]._id], 35, new Date())
    assert(noUpdates.length === 0, '6.1 applyCompetencyUpdates reports 0 updates for lower score')

    const uc4NoChange = await UserCompetency.findOne({ user_id: user1._id, competency_id: compDocs[4]._id })
    assert(uc4NoChange.current_level === 4, '6.2 UserCompetency remains at Level 4 (no downgrade)')

    const gap4NoChange = await SkillGap.findOne({ user_id: user1._id, competency_id: compDocs[4]._id })
    assert(gap4NoChange.current_level === 4 && gap4NoChange.gap === -1, '6.3 SkillGap remains at Level 4 / gap -1 (no downgrade)')

    const allGaps4 = await SkillGap.find({ user_id: user1._id, competency_id: compDocs[4]._id })
    assert(allGaps4.length === 1, '6.4 Exactly 1 SkillGap record exists (no duplicate created)')

    // --- Scenario F: Quiz Competency Outside Current Role (ISSUE-16-05) ---
    console.log('\n[STEP 7] Testing Scenario F: Quiz Competency Outside Role...')
    // compDocs[9] is NOT in Role B (Role B only has comps 4..7)
    const outUpdates = await applyCompetencyUpdates(user1._id, [compDocs[9]._id], 90, new Date())
    assert(outUpdates.length === 1, '7.1 UserCompetency updated for outside competency')

    const uc9 = await UserCompetency.findOne({ user_id: user1._id, competency_id: compDocs[9]._id })
    assert(uc9.current_level === 4, '7.2 UserCompetency recorded at Level 4')

    const gap9 = await SkillGap.findOne({ user_id: user1._id, competency_id: compDocs[9]._id })
    assert(gap9 === null, '7.3 NO artificial SkillGap record created for outside competency')

    // --- Scenario G: Admin Top Gaps Analytics (ISSUE-16-10) ---
    console.log('\n[STEP 8] Testing Scenario G: Admin Top Gaps Analytics...')
    // User 1 is on Role B (comps 4..7, req level 3).
    // Comp 4 has current level 4 -> gap -1 (no deficit)
    // Comps 5, 6, 7 have current level 1 -> gap 2 (deficit of 2)
    // Ensure User 2 meets requirements for comp 4 & 5
    await UserCompetency.findOneAndUpdate(
      { user_id: user2._id, competency_id: compDocs[4]._id },
      { current_level: 4 },
      { upsert: true }
    )
    await UserCompetency.findOneAndUpdate(
      { user_id: user2._id, competency_id: compDocs[5]._id },
      { current_level: 4 },
      { upsert: true }
    )

    const topGaps = await getOrgWideTopGaps(10)
    assert(Array.isArray(topGaps), '8.1 getOrgWideTopGaps returns an array')
    assert(topGaps.length > 0, '8.2 Genuine gaps detected in database')

    const topGapCompIds = topGaps.map((g) => g.competencyId)
    assert(topGapCompIds.includes(compDocs[5]._id.toString()), '8.3 Comp 5 deficit detected in org-wide top gaps')
    assert(!topGapCompIds.includes(compDocs[4]._id.toString()), '8.4 Comp 4 (met standard) is excluded from gaps')

    const sampleGap = topGaps.find((g) => g.competencyId === compDocs[5]._id.toString())
    assert(sampleGap.avgGap === 2, '8.5 avgGap calculated accurately (2.00)')
    assert(sampleGap.affectedUsers >= 1, '8.6 affectedUsers calculated accurately')
    assert(sampleGap.affectedCount === sampleGap.affectedUsers, '8.7 affectedCount matches affectedUsers')

    // Test genuine empty state when no gaps exist
    // Update comps 5, 6, 7 to level 5 for user 1 and user 2
    for (const cid of [compDocs[5]._id, compDocs[6]._id, compDocs[7]._id]) {
      await UserCompetency.findOneAndUpdate(
        { user_id: user1._id, competency_id: cid },
        { current_level: 5 },
        { upsert: true }
      )
    }
    // Also remove or satisfy user 2
    await User.deleteOne({ _id: user2._id })

    const emptyTopGaps = await getOrgWideTopGaps(10)
    assert(Array.isArray(emptyTopGaps) && emptyTopGaps.length === 0, '8.8 Returns genuine empty array [] when all standards met (no mock data)')

    // --- Scenario H: Cross-User Isolation ---
    console.log('\n[STEP 9] Testing Scenario H: Cross-User Isolation...')
    // Create new User Alpha and User Beta
    const uIsoA = await User.create({
      name: 'P17 Iso User A',
      email: 'p17_iso_a@kaushalai.gov.in',
      role: 'employee',
      googleLinked: true,
      role_id: roleADoc._id,
      level: 3,
      department: 'Field Operations Division (FOD)',
    })
    testUserIds.push(uIsoA._id)

    const uIsoB = await User.create({
      name: 'P17 Iso User B',
      email: 'p17_iso_b@kaushalai.gov.in',
      role: 'employee',
      googleLinked: true,
      role_id: roleBDoc._id,
      level: 3,
      department: 'Field Operations Division (FOD)',
    })
    testUserIds.push(uIsoB._id)

    await computeUserSkillGaps(uIsoA._id)
    await computeUserSkillGaps(uIsoB._id)

    const gapsA = await SkillGap.find({ user_id: uIsoA._id })
    const gapsB = await SkillGap.find({ user_id: uIsoB._id })
    assert(gapsA.length === 6, '9.1 User A has 6 gaps for Role A')
    assert(gapsB.length === 4, '9.2 User B has 4 gaps for Role B')

    // Reassign User A to Role B
    uIsoA.role_id = roleBDoc._id
    await uIsoA.save()
    await computeUserSkillGaps(uIsoA._id)

    // Verify User B was completely unaffected
    const gapsBAfter = await SkillGap.find({ user_id: uIsoB._id })
    assert(gapsBAfter.length === 4, '9.3 User B gaps remained completely unchanged after User A reassignment')

    // --- Step 10: Profile Update Role Reassignment API Hook ---
    console.log('\n[STEP 10] Testing Profile Update API Hook (updateMe)...')
    const tokenIsoA = makeAuthToken(uIsoA._id)
    // Change User A back to Role A via PUT /api/auth/me
    const putRes = await apiPut('/api/auth/me', { role_id: roleADoc._id.toString() }, tokenIsoA)
    assert(putRes.status === 200, '10.1 PUT /api/auth/me returns HTTP 200')

    const gapsARecalc = await SkillGap.find({ user_id: uIsoA._id, role_id: roleADoc._id })
    assert(gapsARecalc.length === 6, '10.2 PUT /api/auth/me automatically triggered recalculation back to Role A (6 gaps)')

    // Clean up test documents in test DB
    console.log('\n[CLEANUP] Cleaning up test fixtures in test database...')
    await safeCleanupTestUsers(testUserIds)
    await RoleCompetency.deleteMany({ role_id: { $in: [roleADoc._id, roleBDoc._id, roleCDoc._id] } })
    await Role.deleteMany({ _id: { $in: [roleADoc._id, roleBDoc._id, roleCDoc._id] } })
    await Competency.deleteMany({ $or: [{ name: { $regex: /^Part 17 / } }, { competencyCode: { $regex: /^COMP_TEST_P17_/ } }] })
    pass('Test fixtures cleaned up safely in kaushalai_test')

  } finally {
    await closeTestEnvironment(testEnv)
  }

  // --- Step 11: DB Isolation Post-Check ---
  console.log('\n[GUARD] Post-test verification of development database...')
  if (devUserCountBefore !== null) {
    try {
      const devConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai', {
        serverSelectionTimeoutMS: 3000,
      }).asPromise()
      const devUserCountAfter = await devConn.collection('users').countDocuments()
      await devConn.close()
      console.log(`[GUARD] Development DB user count after tests: ${devUserCountAfter}`)
      assert(devUserCountBefore === devUserCountAfter, `11.1 Development database user count untouched (${devUserCountBefore} === ${devUserCountAfter})`)
    } catch (err) {
      console.warn(`[GUARD] Post-check dev DB check warning: ${err.message}`)
    }
  }

  console.log('\n========================================================================')
  console.log(`PART 17 TEST RESULTS: ${totalPassed} PASSED, ${totalFailed} FAILED`)
  console.log('========================================================================')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runPart17Suite().catch((err) => {
  console.error('Fatal error in Part 17 test suite:', err)
  process.exit(1)
})
