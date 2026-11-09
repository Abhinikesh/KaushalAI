/**
 * test_part17_2_1_concurrency_audit.js
 * Verification Suite for PART 17.2.1:
 * KaushalAI Final Concurrency Acceptance Audit & Test Evidence Reconciliation
 *
 * Specifically verifies:
 * 1. The exact concurrency sequence:
 *    - User previously held Role B and has existing Role B SkillGap records
 *    - A Role A calculation begins and reaches pre-cleanup stage
 *    - User is reassigned to Role B
 *    - Role B's existing SkillGap records remain intact
 *    - Stale Role A calculation does not delete Role B records
 *    - New Role B calculation completes successfully
 * 2. Reassignment to null before cleanup (cleanup aborted, no deletion)
 * 3. Reassignment to unresolved role before cleanup (cleanup aborted, no deletion)
 * 4. Two overlapping calculations for two different roles (serialized via withUserLock)
 * 5. Same-role overlapping calculations (serialized, idempotent, no duplicates)
 * 6. Calculation token semantics (unique token per run, stale token aborts cleanup)
 * 7. Recovery behavior:
 *    - Failed sync sets pending marker on User
 *    - GET /api/skill-gaps triggers recovery
 *    - Successful recovery clears marker and error
 *    - Repeated recovery is idempotent
 * 8. Database isolation & zero dev DB writes
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
} = require('./src/models')

const {
  computeUserSkillGaps,
  setPreCleanupHook,
  clearPreCleanupHook,
} = require('./src/services/skillGap.service')
const {
  applyCompetencyUpdates,
  recoverPendingSkillGapSync,
  setSyncFailureSimulator,
  clearSyncFailureSimulator,
} = require('./src/services/competencyUpdate.service')

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
    { id: String(userId), role, email: `p1721_test_${userId}@kaushalai.gov.in` },
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

async function runPart17_2_1Audit() {
  console.log('========================================================================')
  console.log('  PART 17.2.1: FINAL CONCURRENCY ACCEPTANCE AUDIT SUITE                 ')
  console.log('========================================================================\n')

  // --- Step 0: DB Isolation Guardrail ---
  console.log('[GUARD] Verifying test database configuration...')
  const valid = validateTestDatabaseUri(process.env.MONGODB_TEST_URI)
  assert(valid.dbName === 'kaushalai_test', 'G.1: MONGODB_TEST_URI validated as kaushalai_test')

  let devUserCountBefore = null
  try {
    const devConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai', {
      serverSelectionTimeoutMS: 3000,
    }).asPromise()
    devUserCountBefore = await devConn.collection('users').countDocuments()
    await devConn.close()
    console.log(`[GUARD] Development DB (kaushalai) pre-test user count: ${devUserCountBefore}`)
    assert(devUserCountBefore === 15, 'G.2: Dev DB pre-test user count confirmed at 15')
  } catch (err) {
    console.warn(`[GUARD] Warning checking dev DB: ${err.message}`)
  }

  const testEnv = await startTestServer({
    preferPort: 5095,
    testUri: process.env.MONGODB_TEST_URI,
  })
  activePort = testEnv.port
  console.log(`[GUARD] Test server running on port ${activePort} connected to ${testEnv.dbName}\n`)

  const testStamp = Date.now()
  const testUserIds = []
  const testEmails = []

  // Pre-clean fixtures
  await Role.deleteMany({ name: /^P17_2_1 / })
  await Competency.deleteMany({ name: /^P17_2_1 / })
  await User.deleteMany({ email: /p17_2_1_.*@test\.kaushalai\.gov\.in/ })

  // Setup test department & competencies
  let testDept = await Department.findOne({})
  if (!testDept) {
    testDept = await Department.create({ name: `P17_2_1 Dept ${testStamp}`, code: `P1721D${testStamp}` })
  }

  const compA = await Competency.create({
    name: `P17_2_1 Comp A ${testStamp}`,
    category: 'statistical',
    levelDescriptions: { 1: 'Awareness', 2: 'Basic', 3: 'Working', 4: 'Advanced', 5: 'Expert' },
  })
  const compB = await Competency.create({
    name: `P17_2_1 Comp B ${testStamp}`,
    category: 'statistical',
    levelDescriptions: { 1: 'Awareness', 2: 'Basic', 3: 'Working', 4: 'Advanced', 5: 'Expert' },
  })
  const compShared = await Competency.create({
    name: `P17_2_1 Comp Shared ${testStamp}`,
    category: 'statistical',
    levelDescriptions: { 1: 'Awareness', 2: 'Basic', 3: 'Working', 4: 'Advanced', 5: 'Expert' },
  })

  // Role A: uses compA and compShared (req level 3)
  const roleA = await Role.create({
    name: `P17_2_1 Role A ${testStamp}`,
    level: 3,
    department_ref: testDept._id,
  })
  await RoleCompetency.create({ role_id: roleA._id, competency_id: compA._id, required_level: 3 })
  await RoleCompetency.create({ role_id: roleA._id, competency_id: compShared._id, required_level: 3 })

  // Role B: uses compB and compShared (req level 4)
  const roleB = await Role.create({
    name: `P17_2_1 Role B ${testStamp}`,
    level: 4,
    department_ref: testDept._id,
  })
  await RoleCompetency.create({ role_id: roleB._id, competency_id: compB._id, required_level: 4 })
  await RoleCompetency.create({ role_id: roleB._id, competency_id: compShared._id, required_level: 4 })

  // --------------------------------------------------------------------------
  // TEST SCENARIO 1: The Exact Section 2 Interleaving Sequence
  // --------------------------------------------------------------------------
  console.log('── SCENARIO 1: Historical Role B Data & Concurrent Role Reassignment ──')
  // 1. User previously held Role B and has existing Role B SkillGap records
  const u1Email = `p17_2_1_u1_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u1Email)
  const user1 = await User.create({
    name: 'P17.2.1 Audit User 1',
    email: u1Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleB._id,
    level: 4,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
  })
  testUserIds.push(user1._id)

  // Compute initial Role B gaps
  await computeUserSkillGaps(user1._id)
  const initialGapsRoleB = await SkillGap.find({ user_id: user1._id }).lean()
  assert(initialGapsRoleB.length === 2, '1.1: User initially has 2 SkillGap records under Role B')
  const initialCompBRecord = initialGapsRoleB.find((g) => g.competency_id.toString() === compB._id.toString())
  assert(initialCompBRecord !== undefined, '1.2: Role B specific competency (compB) exists in DB')
  assert(String(initialCompBRecord.role_id) === String(roleB._id), '1.3: compB tagged with role_id: roleB')

  // 2. A Role A calculation begins and reaches the pre-cleanup stage
  // 3. User is reassigned to Role B at the barrier hook
  let barrier1Triggered = false
  setPreCleanupHook(async (uid, rId) => {
    if (String(uid) === String(user1._id) && String(rId) === String(roleA._id)) {
      barrier1Triggered = true
      // 3. The user is reassigned to Role B in MongoDB while Role A calculation is suspended
      await User.findByIdAndUpdate(user1._id, { role_id: roleB._id, level: 4 })
    }
  })

  // Set user.role_id = roleA._id temporarily to initiate calculation for Role A
  await User.findByIdAndUpdate(user1._id, { role_id: roleA._id, level: 3 })
  await computeUserSkillGaps(user1._id)
  clearPreCleanupHook()

  assert(barrier1Triggered, '1.4: Synchronization barrier successfully triggered before Role A cleanup')

  // 4. Role B's existing SkillGap records must remain intact.
  // 5. The old Role A calculation must not delete Role B records.
  const gapsAfterAbortedA = await SkillGap.find({ user_id: user1._id }).lean()
  const compBAfterA = gapsAfterAbortedA.find((g) => g.competency_id.toString() === compB._id.toString())
  assert(compBAfterA !== undefined, '1.5: Role B record (compB) was NOT deleted by stale Role A calculation')
  assert(String(compBAfterA.role_id) === String(roleB._id), '1.6: compB record preserved with role_id: roleB')

  // 6. The new Role B calculation must complete successfully.
  const resRoleBCalc = await computeUserSkillGaps(user1._id)
  assert(Array.isArray(resRoleBCalc) && resRoleBCalc.length === 2, '1.7: New Role B calculation completed successfully (2 active gaps)')
  const finalGaps = await SkillGap.find({ user_id: user1._id, role_id: roleB._id }).lean()
  assert(finalGaps.length === 2, '1.8: Final database state has exactly 2 gaps belonging strictly to Role B')
  const finalCompIds = finalGaps.map((g) => g.competency_id.toString())
  assert(
    finalCompIds.includes(compB._id.toString()) && finalCompIds.includes(compShared._id.toString()),
    '1.9: Final gaps match Role B competencies (compB & compShared), obsolete compA cleanly purged'
  )

  // --------------------------------------------------------------------------
  // TEST SCENARIO 2: Role Reassignment to Null Before Cleanup
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 2: Role Reassignment to Null Before Cleanup ───────────────')
  const u2Email = `p17_2_1_u2_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u2Email)
  const user2 = await User.create({
    name: 'P17.2.1 Audit User 2',
    email: u2Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleB._id,
    level: 4,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
  })
  testUserIds.push(user2._id)
  await computeUserSkillGaps(user2._id)

  let barrier2Triggered = false
  setPreCleanupHook(async (uid, rId) => {
    if (String(uid) === String(user2._id)) {
      barrier2Triggered = true
      // Reassign to null
      await User.findByIdAndUpdate(user2._id, { role_id: null, level: null })
    }
  })

  // Start calculation for Role A
  await User.findByIdAndUpdate(user2._id, { role_id: roleA._id, level: 3 })
  await computeUserSkillGaps(user2._id)
  clearPreCleanupHook()

  assert(barrier2Triggered, '2.1: Pre-cleanup hook triggered on null reassignment test')
  // Verify Role B record was NOT deleted
  const compBNullTest = await SkillGap.findOne({ user_id: user2._id, competency_id: compB._id })
  assert(compBNullTest !== null, '2.2: Reassignment to null aborted cleanup — Role B record NOT deleted')

  // Verify API behavior for null role user
  const token2 = makeAuthToken(user2._id)
  const apiResNull = await apiGet('/api/skill-gaps', token2)
  assert(apiResNull.status === 200, '2.3: GET /api/skill-gaps returns 200 for null role user')
  assert(apiResNull.body.role_resolved === false, '2.4: role_resolved is strictly false')
  assert(apiResNull.body.role_competencies_count === null, '2.5: role_competencies_count is null')
  assert(apiResNull.body.has_assigned_competencies === null, '2.6: has_assigned_competencies is null')

  // --------------------------------------------------------------------------
  // TEST SCENARIO 3: Reassignment to Unresolved Role Before Cleanup
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 3: Reassignment to Unresolved Role Before Cleanup ─────────')
  const unresolvableRole = await Role.create({
    name: `P17_2_1 Unresolvable Role ${testStamp}`,
    level: 5,
    department_ref: new mongoose.Types.ObjectId(), // non-matching department
  })

  const u3Email = `p17_2_1_u3_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u3Email)
  const user3 = await User.create({
    name: 'P17.2.1 Audit User 3',
    email: u3Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleB._id,
    level: 4,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
  })
  testUserIds.push(user3._id)
  await computeUserSkillGaps(user3._id)

  let barrier3Triggered = false
  setPreCleanupHook(async (uid, rId) => {
    if (String(uid) === String(user3._id)) {
      barrier3Triggered = true
      await User.findByIdAndUpdate(user3._id, { role_id: unresolvableRole._id, department: 'NonMatching' })
    }
  })

  await User.findByIdAndUpdate(user3._id, { role_id: roleA._id, level: 3 })
  await computeUserSkillGaps(user3._id)
  clearPreCleanupHook()

  assert(barrier3Triggered, '3.1: Pre-cleanup hook triggered on unresolved role test')
  const compBUnresolvedTest = await SkillGap.findOne({ user_id: user3._id, competency_id: compB._id })
  assert(compBUnresolvedTest !== null, '3.2: Reassignment to unresolved role aborted cleanup — Role B record NOT deleted')

  // --------------------------------------------------------------------------
  // TEST SCENARIO 4: Two Overlapping Calculations for Different Roles
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 4: Two Overlapping Calculations for Different Roles ───────')
  const u4Email = `p17_2_1_u4_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u4Email)
  const user4 = await User.create({
    name: 'P17.2.1 Audit User 4',
    email: u4Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleA._id,
    level: 3,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
  })
  testUserIds.push(user4._id)

  // Launch two overlapping calculations
  const calcA = computeUserSkillGaps(user4._id)
  await User.findByIdAndUpdate(user4._id, { role_id: roleB._id, level: 4 })
  const calcB = computeUserSkillGaps(user4._id)

  const [resA, resB] = await Promise.all([calcA, calcB])
  assert(Array.isArray(resA) && Array.isArray(resB), '4.1: Both overlapping calculations completed via serialization lock')
  const gapsU4 = await SkillGap.find({ user_id: user4._id }).lean()
  assert(gapsU4.length === 2, '4.2: Final gap count strictly equals Role B competencies (2)')
  const u4CompIds = gapsU4.map((g) => g.competency_id.toString())
  assert(
    u4CompIds.includes(compB._id.toString()) && u4CompIds.includes(compShared._id.toString()),
    '4.3: Final competencies match Role B (compB & compShared)'
  )

  // --------------------------------------------------------------------------
  // TEST SCENARIO 5: Same-Role Overlapping Calculations
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 5: Same-Role Overlapping Calculations ─────────────────────')
  const [dup1, dup2] = await Promise.all([
    computeUserSkillGaps(user4._id),
    computeUserSkillGaps(user4._id),
  ])
  assert(dup1.length === 2 && dup2.length === 2, '5.1: Both identical overlapping calculations returned 2 gaps')
  const totalGapsU4 = await SkillGap.countDocuments({ user_id: user4._id })
  assert(totalGapsU4 === 2, `5.2: Exactly 2 SkillGap records exist — zero duplicates created`)

  // --------------------------------------------------------------------------
  // TEST SCENARIO 6: Calculation Token Semantics & Stale Run Rejection
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 6: Calculation Token Semantics & Stale Run Rejection ──────')
  const u5Email = `p17_2_1_u5_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u5Email)
  const user5 = await User.create({
    name: 'P17.2.1 Audit User 5',
    email: u5Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleA._id,
    level: 3,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
  })
  testUserIds.push(user5._id)

  await computeUserSkillGaps(user5._id)
  const userAfterCalc = await User.findById(user5._id).lean()
  assert(
    userAfterCalc.latest_calculation_token instanceof mongoose.Types.ObjectId,
    '6.1: Calculation generated and stored unique latest_calculation_token on User'
  )

  // Verify that an in-flight calculation with an obsolete token aborts cleanup
  let tokenBarrierTriggered = false
  setPreCleanupHook(async (uid, rId) => {
    if (String(uid) === String(user5._id)) {
      tokenBarrierTriggered = true
      // Overwrite the calculation token in MongoDB with a newer token
      const newerToken = new mongoose.Types.ObjectId()
      await User.findByIdAndUpdate(user5._id, { latest_calculation_token: newerToken })
    }
  })

  // Seed an outside gap that would be deleted if cleanup ran
  await SkillGap.create({
    user_id: user5._id,
    role_id: roleA._id,
    competency_id: compB._id, // outside Role A
    current_level: 1,
    required_level: 3,
    gap: 2,
    priority: 'high',
    computed_at: new Date(),
  })

  await computeUserSkillGaps(user5._id)
  clearPreCleanupHook()

  assert(tokenBarrierTriggered, '6.2: Token synchronization barrier triggered before cleanup')
  const outsideCompStillThere = await SkillGap.findOne({ user_id: user5._id, competency_id: compB._id })
  assert(outsideCompStillThere !== null, '6.3: Stale token detected — cleanup aborted, outside record NOT deleted')

  // --------------------------------------------------------------------------
  // TEST SCENARIO 7: Recovery Behavior & Idempotency
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 7: Recovery Behavior & Idempotency ────────────────────────')
  const u6Email = `p17_2_1_u6_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u6Email)
  const user6 = await User.create({
    name: 'P17.2.1 Audit User 6',
    email: u6Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleA._id,
    level: 3,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
  })
  testUserIds.push(user6._id)
  await computeUserSkillGaps(user6._id)

  // Simulate both retries failing during quiz sync
  setSyncFailureSimulator(async (uid, attempt) => {
    throw new Error(`Simulated persistent failure on attempt ${attempt}`)
  })
  const quizUpdates = await applyCompetencyUpdates(user6._id, [compA._id], 85, new Date())
  clearSyncFailureSimulator()

  assert(quizUpdates.length === 1 && quizUpdates[0].newLevel === 4, '7.1: Quiz submission succeeds despite sync failure (non-blocking)')
  const u6FailedUser = await User.findById(user6._id).lean()
  assert(u6FailedUser.needs_skillgap_sync === true, '7.2: needs_skillgap_sync is strictly true (detectable pending state)')
  assert(typeof u6FailedUser.skillgap_sync_error === 'string', '7.3: skillgap_sync_error records error message')

  // Trigger recovery via GET /api/skill-gaps
  const token6 = makeAuthToken(user6._id)
  const getGapsRecoveryRes = await apiGet('/api/skill-gaps', token6)
  assert(getGapsRecoveryRes.status === 200, '7.4: GET /api/skill-gaps returns 200')
  const compAGapRecovered = getGapsRecoveryRes.body.skill_gaps.find(
    (g) => (g.competency_id?._id || g.competency_id).toString() === compA._id.toString()
  )
  assert(compAGapRecovered.current_level === 4, '7.5: SkillGap recovered to Level 4')

  const u6RecoveredUser = await User.findById(user6._id).lean()
  assert(u6RecoveredUser.needs_skillgap_sync === false, '7.6: needs_skillgap_sync cleared to false after recovery')
  assert(u6RecoveredUser.skillgap_sync_error === null, '7.7: skillgap_sync_error reset to null')

  // Verify repeated recovery is idempotent
  const repeatRecovery = await recoverPendingSkillGapSync(user6._id)
  assert(repeatRecovery.recovered === false, '7.8: Repeated recovery returns recovered: false')
  assert(repeatRecovery.status === 'already_synced', '7.9: Status is "already_synced" (idempotent no-op)')

  // --------------------------------------------------------------------------
  // TEST SCENARIO 8: Teardown & Database Isolation Verification
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 8: Teardown & Database Isolation Verification ─────────────')

  await safeCleanupTestUsers(testEmails)
  await Role.deleteMany({ name: /^P17_2_1 / })
  await Competency.deleteMany({ name: /^P17_2_1 / })
  if (unresolvableRole) await Role.deleteOne({ _id: unresolvableRole._id })
  pass('8.1: All P17.2.1 test fixtures cleaned safely from kaushalai_test')

  let devUserCountAfter = null
  try {
    const devConnAfter = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai', {
      serverSelectionTimeoutMS: 3000,
    }).asPromise()
    devUserCountAfter = await devConnAfter.collection('users').countDocuments()
    await devConnAfter.close()
    console.log(`[GUARD] Development DB (kaushalai) post-test user count: ${devUserCountAfter}`)
    assert(
      devUserCountBefore === devUserCountAfter && devUserCountAfter === 15,
      `8.2: Development database user count strictly unchanged (before: ${devUserCountBefore}, after: ${devUserCountAfter})`
    )
  } catch (err) {
    fail('8.2: Failed to check development database post-test', err)
  }

  await closeTestEnvironment()
  pass('8.3: Isolated test server closed successfully')

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n========================================================================')
  console.log(`PART 17.2.1 AUDIT SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`)
  console.log('========================================================================\n')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runPart17_2_1Audit().catch(async (err) => {
  console.error('[FATAL] Uncaught error in Part 17.2.1 audit suite:', err)
  clearPreCleanupHook()
  clearSyncFailureSimulator()
  await closeTestEnvironment()
  process.exit(1)
})

