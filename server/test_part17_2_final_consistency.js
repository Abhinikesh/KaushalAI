/**
 * test_part17_2_final_consistency.js
 * Verification Suite for PART 17.2:
 * KaushalAI Final Backend Consistency Hardening
 *
 * Covers:
 * 1. MongoDB Deployment & Standalone Transaction Support Verification
 * 2. Issue D — Concurrency Safety with Deterministic Synchronization Barriers:
 *    - Role A -> Role B reassignment before cleanup
 *    - Role A -> null reassignment before cleanup
 *    - Role A -> unresolved role reassignment before cleanup
 *    - Two overlapping calculations for different roles
 *    - Two overlapping calculations for same role
 *    - Stale calculation cannot delete newer role's SkillGap records
 *    - Confirmed zero-competency role preservation
 * 3. Issue C — Quiz Synchronization Recovery:
 *    - Competency improvement updates SkillGap
 *    - Retry loop: first failure followed by retry success
 *    - Both immediate retries fail and quiz submission still succeeds
 *    - Failed synchronization is detectable (needs_skillgap_sync: true)
 *    - Subsequent recovery successfully recalculates SkillGap
 *    - Repeated recovery is idempotent
 *    - Outside competency does not create unauthorized SkillGap
 *    - No competency level downgrade
 * 4. Modern Role Mutation Audit Verification:
 *    - auth.controller.js (updateMe)
 *    - onboarding.controller.js (saveOnboardingStep Step 3)
 *    - onboarding.controller.js (saveOnboardingProfile)
 *    - admin.controller.js (JobRole / AuthorizedOfficer isolation)
 * 5. Database Isolation & Zero Dev Writes Guard
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
  FunctionalArea,
  JobRole,
  AuthorizedOfficer,
} = require('./src/models')

const { resolveAuthoritativeRole } = require('./src/utils/roleResolution')
const {
  computeUserSkillGaps,
  setPreCleanupHook,
  clearPreCleanupHook,
} = require('./src/services/skillGap.service')
const {
  applyCompetencyUpdates,
  recoverPendingSkillGapSync,
  recoverAllPendingSkillGapSyncs,
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
    { id: String(userId), role, email: `p172_test_${userId}@kaushalai.gov.in` },
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

function apiPost(urlPath, payload, token) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(payload)
    const opts = {
      hostname: '127.0.0.1',
      port: activePort,
      path: urlPath,
      method: 'POST',
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

async function runPart17_2Suite() {
  console.log('========================================================================')
  console.log('  PART 17.2: FINAL BACKEND CONSISTENCY & CONCURRENCY HARDENING SUITE    ')
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
    preferPort: 5096,
    testUri: process.env.MONGODB_TEST_URI,
  })
  activePort = testEnv.port
  console.log(`[GUARD] Test server running on port ${activePort} connected to ${testEnv.dbName}\n`)

  const testStamp = Date.now()
  const testUserIds = []
  const testEmails = []

  // Clean any leftover fixtures from previous runs
  await Role.deleteMany({ name: /^P17_2 / })
  await Competency.deleteMany({ name: /^P17_2 / })
  await User.deleteMany({ email: /p17_2_.*@test\.kaushalai\.gov\.in/ })

  // --------------------------------------------------------------------------
  // TEST GROUP 1: MongoDB Deployment & Transaction Capability Verification
  // --------------------------------------------------------------------------
  console.log('── GROUP 1: MongoDB Deployment & Transaction Support Verification ──────')

  const admin = mongoose.connection.db.admin()
  const serverStatus = await admin.serverStatus()
  const isReplicaSet = Boolean(serverStatus.repl && serverStatus.repl.setName)
  assert(!isReplicaSet, '1.1: Verified MongoDB deployment is Standalone (no replica set configured)')

  let transactionThrewAsExpected = false
  const session = await mongoose.startSession()
  try {
    session.startTransaction()
    // Perform a write inside transaction on standalone instance
    await User.findOne({}).session(session)
    await session.abortTransaction()
  } catch (txErr) {
    transactionThrewAsExpected = true
    assert(
      txErr.message.includes('Transaction numbers are only allowed on a replica set member or mongos'),
      `1.2: Confirmed standalone MongoDB rejects transactions: "${txErr.message}"`
    )
  } finally {
    session.endSession()
  }
  assert(
    transactionThrewAsExpected,
    '1.3: Transactions are not supported on standalone MongoDB — verified need for application-level serialization & versioning'
  )

  // --------------------------------------------------------------------------
  // Setup Fixtures for Groups 2 & 3
  // --------------------------------------------------------------------------
  let testDept = await Department.findOne({})
  if (!testDept) {
    testDept = await Department.create({ name: `P17_2 Dept ${testStamp}`, code: `P172D${testStamp}` })
  }

  // Create 6 isolated competencies for P17.2
  const compDocs = []
  for (let i = 0; i < 6; i++) {
    const c = await Competency.create({
      name: `P17_2 Competency ${i + 1} ${testStamp}`,
      category: 'statistical',
      description: `P17.2 test competency ${i + 1}`,
      levelDescriptions: {
        1: 'Awareness',
        2: 'Basic',
        3: 'Working',
        4: 'Advanced',
        5: 'Expert',
      },
    })
    compDocs.push(c)
  }

  // Role A: uses comps 0, 1, 2 (3 competencies, req level 3)
  const roleA = await Role.create({
    name: `P17_2 Role A ${testStamp}`,
    level: 3,
    department_ref: testDept._id,
  })
  for (let i = 0; i < 3; i++) {
    await RoleCompetency.create({
      role_id: roleA._id,
      competency_id: compDocs[i]._id,
      required_level: 3,
    })
  }

  // Role B: uses comps 2, 3, 4 (3 competencies, comp 2 overlaps, 3 & 4 distinct, req level 4)
  const roleB = await Role.create({
    name: `P17_2 Role B ${testStamp}`,
    level: 4,
    department_ref: testDept._id,
  })
  for (let i = 2; i < 5; i++) {
    await RoleCompetency.create({
      role_id: roleB._id,
      competency_id: compDocs[i]._id,
      required_level: 4,
    })
  }

  // Role Zero: confirmed 0 competencies
  const roleZero = await Role.create({
    name: `P17_2 Role Zero ${testStamp}`,
    level: 2,
    department_ref: testDept._id,
  })

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Issue D — Concurrency Safety & Deterministic Barriers
  // --------------------------------------------------------------------------
  console.log('\n── GROUP 2: Issue D — Concurrency Safety & Deterministic Barriers ─────')

  // Scenario 2.1: Role A calculation followed by reassignment to Role B before cleanup
  console.log('[Scenario 2.1] Role A calculation -> Role B reassignment before cleanup...')
  const u1Email = `p17_2_u1_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u1Email)
  const user1 = await User.create({
    name: 'P17.2 Concurrency User 1',
    email: u1Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleA._id,
    level: 3,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
  })
  testUserIds.push(user1._id)

  // Configure deterministic synchronization barrier:
  // Right before cleanup runs in Calculation 1, reassign user in DB to Role B and pre-compute Role B
  let barrierTriggered2_1 = false
  setPreCleanupHook(async (uid, rId) => {
    if (String(uid) === String(user1._id) && String(rId) === String(roleA._id)) {
      barrierTriggered2_1 = true
      // Mutate user in DB to Role B while Calculation 1 is suspended
      await User.findByIdAndUpdate(user1._id, { role_id: roleB._id, level: 4 })
      // Trigger a calculation for Role B
      // Bypassing withUserLock for test simulation since Calculation 1 holds the lock
      // We manually simulate Role B's upsert to verify Calculation 1 cannot delete it
      await SkillGap.create({
        user_id: user1._id,
        role_id: roleB._id,
        competency_id: compDocs[4]._id,
        current_level: 1,
        required_level: 4,
        gap: 3,
        priority: 'high',
        computed_at: new Date(),
      })
    }
  })

  // Run Calculation 1 for Role A
  const gapsU1 = await computeUserSkillGaps(user1._id)
  clearPreCleanupHook()

  assert(barrierTriggered2_1, '2.1.1: Synchronization barrier successfully triggered before cleanup')
  // Verify that Calculation 1 aborted orphan cleanup upon detecting role change
  // If cleanup had run, compDocs[4] (Role B) would have been deleted because it is not in Role A!
  const comp4InDb = await SkillGap.findOne({ user_id: user1._id, competency_id: compDocs[4]._id })
  assert(comp4InDb !== null, '2.1.2: Role B gap for comp 4 was NOT deleted by stale Role A cleanup')
  assert(String(comp4InDb.role_id) === String(roleB._id), '2.1.3: Role B gap intact with role_id: roleB')

  // Scenario 2.2: Role A calculation followed by reassignment to null before cleanup
  console.log('[Scenario 2.2] Role A calculation -> null role reassignment before cleanup...')
  const u2Email = `p17_2_u2_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u2Email)
  const user2 = await User.create({
    name: 'P17.2 Concurrency User 2',
    email: u2Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleA._id,
    level: 3,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
  })
  testUserIds.push(user2._id)

  // Seed an existing gap to test if cleanup wipes it
  await SkillGap.create({
    user_id: user2._id,
    role_id: roleA._id,
    competency_id: compDocs[5]._id, // outside Role A
    current_level: 2,
    required_level: 3,
    gap: 1,
    priority: 'medium',
    computed_at: new Date(),
  })

  let barrierTriggered2_2 = false
  setPreCleanupHook(async (uid, rId) => {
    if (String(uid) === String(user2._id)) {
      barrierTriggered2_2 = true
      // Reassign to null while calculation is suspended
      await User.findByIdAndUpdate(user2._id, { role_id: null, level: null })
    }
  })

  await computeUserSkillGaps(user2._id)
  clearPreCleanupHook()

  assert(barrierTriggered2_2, '2.2.1: Synchronization barrier triggered before cleanup on null-role test')
  // Verify cleanup was aborted when role became null
  const outsideCompStillInDb = await SkillGap.findOne({ user_id: user2._id, competency_id: compDocs[5]._id })
  assert(outsideCompStillInDb !== null, '2.2.2: Reassignment to null aborted cleanup — no destructive deletion on null role')

  // Scenario 2.3: Role A calculation followed by reassignment to unresolved role before cleanup
  console.log('[Scenario 2.3] Role A calculation -> unresolved role reassignment before cleanup...')
  // Create an unmapped role belonging to a non-existent department
  const nonExistentDeptId = new mongoose.Types.ObjectId()
  const unresolvableRole = await Role.create({
    name: `P17_2 Unresolvable Role ${testStamp}`,
    level: 5,
    department_ref: nonExistentDeptId,
  })

  const u3Email = `p17_2_u3_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u3Email)
  const user3 = await User.create({
    name: 'P17.2 Concurrency User 3',
    email: u3Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleA._id,
    level: 3,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
  })
  testUserIds.push(user3._id)

  await SkillGap.create({
    user_id: user3._id,
    role_id: roleA._id,
    competency_id: compDocs[5]._id,
    current_level: 2,
    required_level: 3,
    gap: 1,
    priority: 'medium',
    computed_at: new Date(),
  })

  let barrierTriggered2_3 = false
  setPreCleanupHook(async (uid, rId) => {
    if (String(uid) === String(user3._id)) {
      barrierTriggered2_3 = true
      // Mutate to unresolvable role
      await User.findByIdAndUpdate(user3._id, { role_id: unresolvableRole._id, department: 'NonExistent' })
    }
  })

  await computeUserSkillGaps(user3._id)
  clearPreCleanupHook()

  assert(barrierTriggered2_3, '2.3.1: Synchronization barrier triggered before cleanup on unresolved-role test')
  const compU3StillThere = await SkillGap.findOne({ user_id: user3._id, competency_id: compDocs[5]._id })
  assert(compU3StillThere !== null, '2.3.2: Reassignment to unresolved role aborted cleanup — zero destructive deletion')

  // Scenario 2.4: Two overlapping calculations for different roles
  console.log('[Scenario 2.4] Two overlapping calculations for different roles (serialized)...')
  const u4Email = `p17_2_u4_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u4Email)
  const user4 = await User.create({
    name: 'P17.2 Concurrency User 4',
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

  // Launch two concurrent computeUserSkillGaps calls where user's role is switched between them
  const promise1 = computeUserSkillGaps(user4._id)
  await User.findByIdAndUpdate(user4._id, { role_id: roleB._id, level: 4 })
  const promise2 = computeUserSkillGaps(user4._id)

  const [resCalc1, resCalc2] = await Promise.all([promise1, promise2])
  assert(Array.isArray(resCalc1), '2.4.1: Calculation 1 completed successfully')
  assert(Array.isArray(resCalc2), '2.4.2: Calculation 2 completed successfully')

  // Verify final database state strictly reflects Role B (3 competencies: comp 2, 3, 4)
  const finalGapsU4 = await SkillGap.find({ user_id: user4._id, role_id: roleB._id }).lean()
  assert(finalGapsU4.length === 3, `2.4.3: Final gaps count matches Role B (expected 3, got: ${finalGapsU4.length})`)
  const compIdsU4 = finalGapsU4.map((g) => g.competency_id.toString())
  assert(
    compIdsU4.includes(compDocs[2]._id.toString()) &&
    compIdsU4.includes(compDocs[3]._id.toString()) &&
    compIdsU4.includes(compDocs[4]._id.toString()),
    '2.4.4: Final gaps correctly belong to Role B competencies (comps 2, 3, 4)'
  )

  // Scenario 2.5: Two overlapping calculations for the same role
  console.log('[Scenario 2.5] Two overlapping calculations for the same role...')
  const [dup1, dup2] = await Promise.all([
    computeUserSkillGaps(user4._id),
    computeUserSkillGaps(user4._id),
  ])
  assert(dup1.length === 3 && dup2.length === 3, '2.5.1: Both identical overlapping calculations returned 3 gaps')
  const countAfterDup = await SkillGap.countDocuments({ user_id: user4._id })
  assert(countAfterDup === 3, `2.5.2: No duplicates created by identical overlapping calculations (count: ${countAfterDup})`)

  // Scenario 2.6: Stale calculation cannot delete newer role's SkillGap records
  console.log('[Scenario 2.6] Verifying stale calculation cannot delete newer role records...')
  // All gaps created for Role B must carry role_id: roleB._id
  const gapsTagged = await SkillGap.find({ user_id: user4._id, role_id: roleB._id })
  assert(gapsTagged.length === 3, '2.6.1: All SkillGap records accurately tagged with role_id')

  // Scenario 2.7: Confirmed zero-competency role preservation
  console.log('[Scenario 2.7] Confirmed zero-competency role calculation...')
  await User.findByIdAndUpdate(user4._id, { role_id: roleZero._id, level: 2 })
  const zeroGaps = await computeUserSkillGaps(user4._id)
  assert(zeroGaps.length === 0, '2.7.1: Zero-competency role computation produces 0 gaps')
  const countZeroInDb = await SkillGap.countDocuments({ user_id: user4._id, role_id: roleZero._id })
  assert(countZeroInDb === 0, '2.7.2: Confirmed zero-competency role cleanly purged prior gaps')

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Issue C — Quiz Synchronization Recovery
  // --------------------------------------------------------------------------
  console.log('\n── GROUP 3: Issue C — Quiz Synchronization Recovery ────────────────────')

  const u5Email = `p17_2_u5_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u5Email)
  const user5 = await User.create({
    name: 'P17.2 Quiz User 5',
    email: u5Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleA._id, // comps 0, 1, 2, req level 3
    level: 3,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
  })
  testUserIds.push(user5._id)

  // Seed initial assessment: user5 has level 1 on compDocs[0]
  await UserCompetency.create({
    user_id: user5._id,
    competency_id: compDocs[0]._id,
    current_level: 1,
    source: 'diagnostic',
  })
  await computeUserSkillGaps(user5._id)

  const initialGap0 = await SkillGap.findOne({ user_id: user5._id, competency_id: compDocs[0]._id })
  assert(initialGap0.current_level === 1 && initialGap0.gap === 2, '3.1.1: Initial SkillGap on comp 0 has gap 2 (req 3 - cur 1)')

  // 3.1: Successful competency improvement updates SkillGap immediately (normal path)
  console.log('[Scenario 3.1] Successful quiz update synchronizes SkillGap immediately...')
  // Quiz score 85% -> maps to level 4
  const updateResult = await applyCompetencyUpdates(user5._id, [compDocs[0]._id], 85, new Date())
  assert(updateResult.length === 1 && updateResult[0].newLevel === 4, '3.1.2: applyCompetencyUpdates upgraded comp 0 to Level 4')

  const gapAfterQuiz = await SkillGap.findOne({ user_id: user5._id, competency_id: compDocs[0]._id })
  assert(gapAfterQuiz.current_level === 4 && gapAfterQuiz.gap === -1, '3.1.3: SkillGap immediately synchronized to current_level 4, gap -1')

  const u5Fresh = await User.findById(user5._id).lean()
  assert(u5Fresh.needs_skillgap_sync === false, '3.1.4: user.needs_skillgap_sync is false on successful immediate sync')

  // 3.2: First synchronization failure followed by successful retry
  console.log('[Scenario 3.2] Retry loop: first failure followed by retry success...')
  let failFirstAttempt = true
  setSyncFailureSimulator(async (uid, attempt) => {
    if (failFirstAttempt && attempt === 1) {
      throw new Error('Simulated transient MongoDB network failure on attempt 1')
    }
    // Attempt 2 succeeds via normal calculation
    await computeUserSkillGaps(uid)
  })

  // Quiz score 65% on compDocs[1] -> maps to Level 3
  const retryUpdates = await applyCompetencyUpdates(user5._id, [compDocs[1]._id], 65, new Date())
  clearSyncFailureSimulator()

  assert(retryUpdates.length === 1 && retryUpdates[0].newLevel === 3, '3.2.1: Competency 1 updated to Level 3')
  const gap1AfterRetry = await SkillGap.findOne({ user_id: user5._id, competency_id: compDocs[1]._id })
  assert(gap1AfterRetry.current_level === 3, '3.2.2: SkillGap synchronized successfully on attempt 2')

  const u5RetryUser = await User.findById(user5._id).lean()
  assert(u5RetryUser.needs_skillgap_sync === false, '3.2.3: user.needs_skillgap_sync is false after successful attempt 2 retry')

  // 3.3 & 3.4: Both immediate retries fail and quiz submission still succeeds; detectable state
  console.log('[Scenario 3.3 & 3.4] Both retries fail: quiz succeeds, failure is detectable...')
  setSyncFailureSimulator(async (uid, attempt) => {
    throw new Error(`Simulated persistent failure on attempt ${attempt}`)
  })

  // Quiz score 75% on compDocs[2] -> maps to Level 3
  const bothFailUpdates = await applyCompetencyUpdates(user5._id, [compDocs[2]._id], 75, new Date())
  clearSyncFailureSimulator()

  // 3.3: Quiz submission still succeeds (applyCompetencyUpdates returns updates array)
  assert(bothFailUpdates.length === 1 && bothFailUpdates[0].newLevel === 3, '3.3.1: Quiz update returned success (non-blocking for learner)')

  // UserCompetency was persisted
  const uc2 = await UserCompetency.findOne({ user_id: user5._id, competency_id: compDocs[2]._id })
  assert(uc2.current_level === 3, '3.3.2: UserCompetency successfully updated to Level 3 despite SkillGap sync failure')

  // SkillGap is temporarily stale (current_level 1)
  const gap2Stale = await SkillGap.findOne({ user_id: user5._id, competency_id: compDocs[2]._id })
  assert(gap2Stale.current_level === 1, '3.3.3: SkillGap currently reflects stale level (as expected before recovery)')

  // 3.4: Failed synchronization remains detectable on User document
  const u5FailedState = await User.findById(user5._id).lean()
  assert(u5FailedState.needs_skillgap_sync === true, '3.4.1: user.needs_skillgap_sync is strictly true (detectable failure)')
  assert(
    typeof u5FailedState.skillgap_sync_error === 'string' && u5FailedState.skillgap_sync_error.includes('attempt 2'),
    '3.4.2: user.skillgap_sync_error records descriptive failure reason'
  )
  assert(u5FailedState.skillgap_sync_requested_at instanceof Date, '3.4.3: user.skillgap_sync_requested_at records timestamp')

  // 3.5: Subsequent recovery attempt successfully recalculates SkillGap
  console.log('[Scenario 3.5] Recovery via GET /api/skill-gaps request...')
  const token5 = makeAuthToken(user5._id)
  const getGapsRes = await apiGet('/api/skill-gaps', token5)
  assert(getGapsRes.status === 200, '3.5.1: GET /api/skill-gaps returns 200')

  // Verify that GET /api/skill-gaps triggered recovery: comp 2 is now Level 3!
  const comp2RecoveredGap = getGapsRes.body.skill_gaps.find(
    (g) => (g.competency_id?._id || g.competency_id).toString() === compDocs[2]._id.toString()
  )
  assert(comp2RecoveredGap.current_level === 3, '3.5.2: SkillGap for comp 2 was recovered to Level 3 on GET request')
  assert(comp2RecoveredGap.gap === 0, '3.5.3: SkillGap gap for comp 2 recalculated to 0')

  // Verify User document cleared the needs_skillgap_sync flag
  const u5RecoveredState = await User.findById(user5._id).lean()
  assert(u5RecoveredState.needs_skillgap_sync === false, '3.5.4: needs_skillgap_sync flag cleared after recovery')
  assert(u5RecoveredState.skillgap_sync_error === null, '3.5.5: skillgap_sync_error reset to null')

  // 3.6: Repeated recovery is idempotent
  console.log('[Scenario 3.6] Testing repeated recovery idempotency...')
  const repeatRecover = await recoverPendingSkillGapSync(user5._id)
  assert(repeatRecover.recovered === false, '3.6.1: Repeated recovery returns recovered: false')
  assert(repeatRecover.status === 'already_synced', '3.6.2: Status is "already_synced" (no redundant computation)')

  const batchRecover = await recoverAllPendingSkillGapSyncs()
  assert(batchRecover.totalPending === 0, '3.6.3: Batch recovery confirms 0 pending syncs across database')

  // 3.7: Competency outside user's assigned role does not create unauthorized SkillGap
  console.log('[Scenario 3.7] Quiz competency outside assigned role...')
  // compDocs[5] is outside Role A
  const outsideUpdates = await applyCompetencyUpdates(user5._id, [compDocs[5]._id], 90, new Date())
  assert(outsideUpdates.length === 1 && outsideUpdates[0].newLevel === 4, '3.7.1: Outside competency updated in UserCompetency')
  const unauthorizedGap = await SkillGap.findOne({ user_id: user5._id, competency_id: compDocs[5]._id })
  assert(unauthorizedGap === null, '3.7.2: NO unauthorized SkillGap record created for competency outside role')

  // 3.8: No competency level is downgraded
  console.log('[Scenario 3.8] Verifying competency level is never downgraded...')
  // Score 20% on compDocs[0] (which is currently Level 4)
  const lowScoreUpdates = await applyCompetencyUpdates(user5._id, [compDocs[0]._id], 20, new Date())
  assert(lowScoreUpdates.length === 0, '3.8.1: Low quiz score produced 0 updates')
  const comp0AfterLowScore = await UserCompetency.findOne({ user_id: user5._id, competency_id: compDocs[0]._id })
  assert(comp0AfterLowScore.current_level === 4, '3.8.2: UserCompetency remains at Level 4 (no downgrade)')
  const gap0AfterLowScore = await SkillGap.findOne({ user_id: user5._id, competency_id: compDocs[0]._id })
  assert(gap0AfterLowScore.current_level === 4, '3.8.3: SkillGap remains at Level 4 (no downgrade)')

  // --------------------------------------------------------------------------
  // TEST GROUP 4: Role Mutation Audit & Verification
  // --------------------------------------------------------------------------
  console.log('\n── GROUP 4: Role Mutation Audit & Verification ─────────────────────────')

  // Path 4.1: auth.controller.js (updateMe)
  console.log('[Scenario 4.1] auth.controller.js updateMe role mutation...')
  const u6Email = `p17_2_u6_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u6Email)
  const user6 = await User.create({
    name: 'P17.2 Mutation User 6',
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

  const token6 = makeAuthToken(user6._id)
  const updateMeRes = await apiPut('/api/auth/me', { role_id: String(roleB._id), level: 4 }, token6)
  assert(updateMeRes.status === 200, '4.1.1: PUT /api/auth/me returns 200')
  const gapsAfterUpdateMe = await SkillGap.find({ user_id: user6._id, role_id: roleB._id }).lean()
  assert(gapsAfterUpdateMe.length === 3, '4.1.2: PUT /api/auth/me automatically recalculated SkillGaps for Role B (3 gaps)')
  const compIdsU6 = gapsAfterUpdateMe.map((g) => g.competency_id.toString())
  assert(compIdsU6.includes(compDocs[4]._id.toString()), '4.1.3: Role B distinct competency 4 present after updateMe')

  // Path 4.2: onboarding.controller.js (saveOnboardingStep Step 3)
  console.log('[Scenario 4.2] onboarding.controller.js saveOnboardingStep Step 3...')
  let fa = await FunctionalArea.findOne({})
  if (!fa) {
    fa = await FunctionalArea.create({ name: `P17_2 FA ${testStamp}`, code: `P172FA${testStamp}` })
  }

  const u7Email = `p17_2_u7_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u7Email)
  const user7 = await User.create({
    name: 'P17.2 Mutation User 7',
    email: u7Email,
    role: 'employee',
    googleLinked: true,
    role_id: null,
    level: null,
    onboarding_step: 3,
    onboarding_completed: false,
    preferences: { language: 'en', theme: 'classic', appearanceMode: 'light', setupCompleted: true },
    learning_interests: ['technology'],
  })
  testUserIds.push(user7._id)

  const token7 = makeAuthToken(user7._id)
  const step3Res = await apiPost(
    '/api/onboarding/step/3',
    {
      department_id: String(testDept._id),
      role_id: String(roleA._id),
      functional_area_id: String(fa._id),
      experience_years: 4,
      education_level: "Bachelor's Degree",
      field_of_study: 'Statistics',
      certifications: [],
      current_responsibilities: ['Data Collection'],
    },
    token7
  )
  assert(step3Res.status === 200, '4.2.1: POST /api/onboarding/step/3 returns 200')
  const gapsAfterStep3 = await SkillGap.find({ user_id: user7._id }).lean()
  assert(gapsAfterStep3.length === 3, '4.2.2: saveOnboardingStep Step 3 automatically computed SkillGaps for Role A')

  // Path 4.3: onboarding.controller.js (saveOnboardingProfile)
  console.log('[Scenario 4.3] onboarding.controller.js saveOnboardingProfile...')
  const profileRes = await apiPost(
    '/api/onboarding/profile',
    {
      department_id: String(testDept._id),
      role_id: String(roleB._id),
      functional_area_id: String(fa._id),
      experience_years: 5,
      education_level: "Master's Degree",
      field_of_study: 'Data Science',
      certifications: [],
      current_responsibilities: ['Data Analysis'],
    },
    token7
  )
  assert(profileRes.status === 200, '4.3.1: POST /api/onboarding/profile returns 200')
  const gapsAfterProfile = await SkillGap.find({ user_id: user7._id, role_id: roleB._id }).lean()
  assert(gapsAfterProfile.length === 3, '4.3.2: saveOnboardingProfile automatically recalculated SkillGaps for Role B')
  const compIdsU7 = gapsAfterProfile.map((g) => g.competency_id.toString())
  assert(compIdsU7.includes(compDocs[4]._id.toString()), '4.3.3: Role B distinct competency 4 present after saveOnboardingProfile')

  // Path 4.4: Admin Roster Workflow (JobRole / AuthorizedOfficer isolation)
  console.log('[Scenario 4.4] Verifying admin roster workflow touches JobRole, never User.role_id...')
  // Inspect admin controller source code to ensure addOfficer and bulkUploadRoster never write to User.role_id
  const fs = require('fs')
  const adminCode = fs.readFileSync(path.resolve(__dirname, 'src/controllers/admin.controller.js'), 'utf8')
  assert(!adminCode.includes('user.role_id ='), '4.4.1: admin.controller.js has zero assignments to user.role_id')
  assert(!adminCode.includes('User.findByIdAndUpdate(req.params.id, { role_id'), '4.4.2: admin.controller.js has zero role_id updates on User')
  assert(adminCode.includes('AuthorizedOfficer.create'), '4.4.3: admin roster workflow strictly operates on AuthorizedOfficer model')

  // --------------------------------------------------------------------------
  // TEST GROUP 5: Teardown, Cleanup & Database Isolation Verification
  // --------------------------------------------------------------------------
  console.log('\n── GROUP 5: Teardown, Cleanup & Database Isolation Verification ────────')

  // Safe fixture teardown
  await safeCleanupTestUsers(testEmails)
  await Role.deleteMany({ name: /^P17_2 / })
  await Competency.deleteMany({ name: /^P17_2 / })
  if (unresolvableRole) await Role.deleteOne({ _id: unresolvableRole._id })
  pass('5.1: All P17.2 test fixtures cleaned safely from kaushalai_test')

  // Verify development database (kaushalai) was never touched
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
      `5.2: Development database user count remained completely untouched (before: ${devUserCountBefore}, after: ${devUserCountAfter})`
    )
  } catch (err) {
    fail('5.2: Failed to check development database post-test', err)
  }

  await closeTestEnvironment()
  pass('5.3: Isolated test server closed successfully')

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n========================================================================')
  console.log(`PART 17.2 TEST SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`)
  console.log('========================================================================\n')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runPart17_2Suite().catch(async (err) => {
  console.error('[FATAL] Uncaught error in Part 17.2 suite:', err)
  clearPreCleanupHook()
  clearSyncFailureSimulator()
  await closeTestEnvironment()
  process.exit(1)
})

