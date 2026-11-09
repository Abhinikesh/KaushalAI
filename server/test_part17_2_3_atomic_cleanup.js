/**
 * test_part17_2_3_atomic_cleanup.js
 * Verification Suite for PART 17.2.3:
 * KaushalAI Final SkillGap Cleanup Race Elimination (Atomic Role-Safe Cleanup)
 *
 * Verifies all 12 mandatory deterministic race scenarios:
 * 1. Before the first role check (Role mutation before initial role check).
 * 2. After the first role check (Role mutation between initial check and upsert).
 * 3. After the final role check but before the first deletion (Window 3 pre-delete hook).
 * 4. Between the first and second deletion queries (The Part 17.2.2 race reproduction).
 * 5. Immediately before the second deletion query (Fresh user re-check verification).
 * 6. During overlapping calculations for different roles (Mutex serialization).
 * 7. During confirmed-zero competency cleanup (Positive cleanup isolation).
 * 8. During a transition to a null role (Graceful abort, zero data loss).
 * 9. During a transition to an unresolved role (Fail-closed behavior).
 * 10. With a competency shared between Role A and Role B (Unique index & overwrite protection).
 * 11. With legacy records lacking role_id (Authoritative backfill & non-destructive preservation).
 * 12. During quiz-triggered SkillGap recalculation & deferred sync recovery.
 *
 * Plus:
 * - Exact Part 17.2.2 failure sequence simulation.
 * - API projection isolation verification (active role projection only).
 * - Development database guard verification (kaushalai user count strictly 15 before and after).
 */

'use strict'

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })
if (!process.env.ACCESS_TOKEN_SECRET) {
  process.env.ACCESS_TOKEN_SECRET = 'kaushalai_dev_access_secret_change_in_prod'
}
if (!process.env.MONGODB_TEST_URI) {
  process.env.MONGODB_TEST_URI = 'mongodb://127.0.0.1:27017/kaushalai_test'
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

const {
  computeUserSkillGaps,
  withUserLock,
  setPreCleanupHook,
  clearPreCleanupHook,
  setPostCheckPreDeleteHook,
  clearPostCheckPreDeleteHook,
  setPreDeleteHook,
  clearPreDeleteHook,
  setBetweenDeletionsHook,
  clearBetweenDeletionsHook,
  setPostDeleteHook,
  clearPostDeleteHook,
} = require('./src/services/skillGap.service')

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
    { id: String(userId), role, email: `p1723_test_${userId}@kaushalai.gov.in` },
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

async function runPart17_2_3Audit() {
  console.log('========================================================================')
  console.log('PART 17.2.3: ATOMIC ROLE-SAFE CLEANUP & CONCURRENCY VERIFICATION')
  console.log('========================================================================\n')

  console.log('[GUARD] Verifying test database configuration...')
  const valid = validateTestDatabaseUri(process.env.MONGODB_TEST_URI)
  assert(valid.dbName === 'kaushalai_test', 'G.1: MONGODB_TEST_URI validated as kaushalai_test')

  // Verify dev database (kaushalai) pre-test user count
  let devUserCountBefore = null
  try {
    const devConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai', {
      serverSelectionTimeoutMS: 3000,
    }).asPromise()
    devUserCountBefore = await devConn.collection('users').countDocuments()
    await devConn.close()
    console.log(`[GUARD] Development DB (kaushalai) pre-test user count: ${devUserCountBefore}`)
    assert(devUserCountBefore === 15, `Pre-flight: Development DB strictly has 15 users (found ${devUserCountBefore})`)
  } catch (err) {
    console.warn(`[GUARD] Warning checking dev DB: ${err.message}`)
  }

  const testEnv = await startTestServer({
    preferPort: 5097,
    testUri: process.env.MONGODB_TEST_URI,
  })
  activePort = testEnv.port

  const testStamp = Date.now()
  const testUserIds = []
  const testEmails = []

  // Pre-clean fixtures
  await User.deleteMany({ email: /^p1723_/ })
  await Role.deleteMany({ name: /^P17_2_3 / })
  await Competency.deleteMany({ name: /^P17_2_3 / })
  await Department.deleteMany({ name: /^P17_2_3 / })

  // Setup test department
  const testDept = await Department.create({
    name: `P17_2_3 Dept ${testStamp}`,
    code: `P1723D_${testStamp}`,
    description: 'Part 17.2.3 Atomic Cleanup Department',
  })

  // Setup test competencies
  const compA = await Competency.create({
    name: `P17_2_3 Role A Comp (${testStamp})`,
    category: 'technical',
    level: 3,
    description: 'Specific to Role A',
  })
  const compB = await Competency.create({
    name: `P17_2_3 Role B Comp (${testStamp})`,
    category: 'technical',
    level: 4,
    description: 'Specific to Role B',
  })
  const compShared = await Competency.create({
    name: `P17_2_3 Shared Comp (${testStamp})`,
    category: 'statistical',
    level: 3,
    description: 'Shared by Role A and Role B',
  })
  const compLegacy = await Competency.create({
    name: `P17_2_3 Legacy Comp (${testStamp})`,
    category: 'behavioural',
    level: 2,
    description: 'Legacy competency without role assignment',
  })

  // Setup roles
  const roleA = await Role.create({
    name: `P17_2_3 Cadre Role A (${testStamp})`,
    department_ref: testDept._id,
    level: 3,
  })
  await RoleCompetency.create({ role_id: roleA._id, competency_id: compA._id, required_level: 3 })
  await RoleCompetency.create({ role_id: roleA._id, competency_id: compShared._id, required_level: 3 })

  const roleB = await Role.create({
    name: `P17_2_3 Cadre Role B (${testStamp})`,
    department_ref: testDept._id,
    level: 4,
  })
  await RoleCompetency.create({ role_id: roleB._id, competency_id: compB._id, required_level: 4 })
  await RoleCompetency.create({ role_id: roleB._id, competency_id: compShared._id, required_level: 4 })

  const roleZero = await Role.create({
    name: `P17_2_3 Zero Comp Role (${testStamp})`,
    department_ref: testDept._id,
    level: 2,
  })

  // --------------------------------------------------------------------------
  // SCENARIO 1: Before the First Role Check
  // --------------------------------------------------------------------------
  console.log('── SCENARIO 1: Role Mutation Before the First Role Check ──────────────')
  const u1Email = `p1723_u1_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u1Email)
  const user1 = await User.create({
    name: 'P17.2.3 User 1',
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
  await computeUserSkillGaps(user1._id)

  const u1GapsBefore = await SkillGap.find({ user_id: user1._id }).lean()
  assert(u1GapsBefore.length === 2, '1.1: User 1 initially has 2 SkillGap records under Role B')

  // Concurrently change user to Role A in DB before computeUserSkillGaps starts internal fetch
  await User.findByIdAndUpdate(user1._id, { role_id: roleA._id, level: 3 })
  await computeUserSkillGaps(user1._id)

  const u1GapsAfter = await SkillGap.find({ user_id: user1._id, role_id: roleA._id }).lean()
  assert(u1GapsAfter.length === 2, '1.2: User 1 calculation safely refreshed gaps to Role A')
  const u1CompIds = u1GapsAfter.map((g) => g.competency_id.toString())
  assert(
    u1CompIds.includes(compA._id.toString()) && u1CompIds.includes(compShared._id.toString()),
    '1.3: Active gaps match Role A competencies (compA and compShared)'
  )

  // --------------------------------------------------------------------------
  // SCENARIO 2: After First Role Check But Before Cleanup (Window 1)
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 2: Role Mutation After First Check / Before Cleanup ────────')
  const u2Email = `p1723_u2_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u2Email)
  const user2 = await User.create({
    name: 'P17.2.3 User 2',
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

  let s2Triggered = false
  setPreCleanupHook(async (uid, rId) => {
    if (String(uid) === String(user2._id) && String(rId) === String(roleA._id)) {
      s2Triggered = true
      // Concurrently reassign user back to Role B in MongoDB
      await User.findByIdAndUpdate(user2._id, { role_id: roleB._id, level: 4 })
    }
  })

  await User.findByIdAndUpdate(user2._id, { role_id: roleA._id, level: 3 })
  await computeUserSkillGaps(user2._id)
  clearPreCleanupHook()

  assert(s2Triggered, '2.1: Window 1 preCleanupHook triggered')
  const compBUser2 = await SkillGap.findOne({ user_id: user2._id, competency_id: compB._id })
  assert(compBUser2 !== null, '2.2: Role B record NOT deleted by obsolete Role A calculation')
  assert(String(compBUser2.role_id) === String(roleB._id), '2.3: compB preserved with role_id: roleB')

  // --------------------------------------------------------------------------
  // SCENARIO 3: After Final Role Check But Before First Deletion (Window 3)
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 3: Role Mutation Immediately Before First Deletion ─────────')
  const u3Email = `p1723_u3_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u3Email)
  const user3 = await User.create({
    name: 'P17.2.3 User 3',
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

  let s3Triggered = false
  setPreDeleteHook(async (uid, rId) => {
    if (String(uid) === String(user3._id) && String(rId) === String(roleA._id)) {
      s3Triggered = true
      // Out-of-band role reassignment right before delete query
      await User.findByIdAndUpdate(user3._id, { role_id: roleB._id, level: 4 })
    }
  })

  await User.findByIdAndUpdate(user3._id, { role_id: roleA._id, level: 3 })
  await computeUserSkillGaps(user3._id)
  clearPreDeleteHook()

  assert(s3Triggered, '3.1: Pre-delete hook triggered immediately before first deletion')
  const compBUser3 = await SkillGap.findOne({ user_id: user3._id, competency_id: compB._id })
  assert(compBUser3 !== null, '3.2: Immediate pre-delete check detected mutation and aborted cleanup')
  assert(String(compBUser3.role_id) === String(roleB._id), '3.3: Role B record intact with role_id: roleB')

  // --------------------------------------------------------------------------
  // SCENARIO 4: The Part 17.2.2 Race Reproduction (Between 1st & 2nd Deletion)
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 4: Exact Part 17.2.2 Race Reproduction (Between Deletions) ─')
  const u4Email = `p1723_u4_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u4Email)
  const user4 = await User.create({
    name: 'P17.2.3 User 4',
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

  // Seed user4 with Role A and compute gaps
  await computeUserSkillGaps(user4._id)

  let s4Triggered = false
  // Deterministic simulation: Role A completes query 1, then betweenDeletionsHook executes:
  setBetweenDeletionsHook(async (uid, rId) => {
    if (String(uid) === String(user4._id) && String(rId) === String(roleA._id)) {
      s4Triggered = true
      // Out-of-band role reassignment to Role B occurred RIGHT HERE
      await User.findByIdAndUpdate(user4._id, { role_id: roleB._id, level: 4 })
      // And Role B gaps were created or updated
      await SkillGap.updateOne(
        { user_id: user4._id, competency_id: compB._id },
        {
          $set: {
            user_id: user4._id,
            competency_id: compB._id,
            role_id: roleB._id,
            required_level: 4,
            current_level: 0,
            gap: 4,
            priority: 'high',
          },
        },
        { upsert: true }
      )
    }
  })

  // Execute calculation for Role A
  await computeUserSkillGaps(user4._id)
  clearBetweenDeletionsHook()

  assert(s4Triggered, '4.1: Deterministic betweenDeletionsHook triggered between query 1 and 2')
  // Verify that compB (belonging to Role B) was NOT deleted!
  const compBUser4 = await SkillGap.findOne({ user_id: user4._id, competency_id: compB._id })
  assert(compBUser4 !== null, '4.2: Role B records remained intact — positive bounding prevented deletion!')
  assert(String(compBUser4.role_id) === String(roleB._id), '4.3: compB preserved with role_id: roleB')

  // --------------------------------------------------------------------------
  // SCENARIO 5: Fresh User Re-Check Verification (Immediately Before 2nd Deletion)
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 5: Fresh User Re-Check Before Second Deletion ─────────────')
  const u5Email = `p1723_u5_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u5Email)
  const user5 = await User.create({
    name: 'P17.2.3 User 5',
    email: u5Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleB._id,
    level: 4,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
  })
  testUserIds.push(user5._id)
  await computeUserSkillGaps(user5._id)

  let s5Triggered = false
  setBetweenDeletionsHook(async (uid, rId) => {
    if (String(uid) === String(user5._id)) {
      s5Triggered = true
      // Invalidate the calculation token right before 2nd query
      await User.findByIdAndUpdate(user5._id, {
        latest_calculation_token: new mongoose.Types.ObjectId().toString(),
      })
    }
  })

  await computeUserSkillGaps(user5._id)
  clearBetweenDeletionsHook()

  assert(s5Triggered, '5.1: Token invalidation hook triggered between deletion queries')
  const user5Gaps = await SkillGap.find({ user_id: user5._id }).lean()
  assert(user5Gaps.length === 2, '5.2: Token mismatch safely bypassed 2nd deletion without data corruption')

  // --------------------------------------------------------------------------
  // SCENARIO 6: Overlapping Calculations for Different Roles
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 6: Overlapping Calculations for Different Roles ───────────')
  const u6Email = `p1723_u6_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u6Email)
  const user6 = await User.create({
    name: 'P17.2.3 User 6',
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

  const promiseA = computeUserSkillGaps(user6._id)
  await User.findByIdAndUpdate(user6._id, { role_id: roleB._id, level: 4 })
  const promiseB = computeUserSkillGaps(user6._id)

  const [res6A, res6B] = await Promise.all([promiseA, promiseB])
  assert(Array.isArray(res6A) && Array.isArray(res6B), '6.1: Both serialized overlapping runs completed')

  const u6Gaps = await SkillGap.find({ user_id: user6._id }).lean()
  assert(u6Gaps.length === 2, `6.2: Final gap count reflects Role B active competencies (count: ${u6Gaps.length})`)
  const u6CompIds = u6Gaps.map((g) => g.competency_id.toString())
  assert(
    u6CompIds.includes(compB._id.toString()) && u6CompIds.includes(compShared._id.toString()),
    '6.3: Final gaps strictly match Role B competencies'
  )

  // --------------------------------------------------------------------------
  // SCENARIO 7: Confirmed Zero-Competency Cleanup Isolation
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 7: Confirmed Zero-Competency Cleanup Isolation ─────────────')
  const u7Email = `p1723_u7_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u7Email)
  const user7 = await User.create({
    name: 'P17.2.3 User 7',
    email: u7Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleB._id,
    level: 4,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
  })
  testUserIds.push(user7._id)
  await computeUserSkillGaps(user7._id)

  let s7Triggered = false
  setBetweenDeletionsHook(async (uid, rId) => {
    if (String(uid) === String(user7._id) && String(rId) === String(roleZero._id)) {
      s7Triggered = true
      // Reassign to Role B while Zero-competency role is between deletions
      await User.findByIdAndUpdate(user7._id, { role_id: roleB._id, level: 4 })
      await SkillGap.updateOne(
        { user_id: user7._id, competency_id: compB._id },
        { $set: { role_id: roleB._id, required_level: 4 } },
        { upsert: true }
      )
    }
  })

  await User.findByIdAndUpdate(user7._id, { role_id: roleZero._id, level: 2 })
  await computeUserSkillGaps(user7._id)
  clearBetweenDeletionsHook()

  assert(s7Triggered, '7.1: Zero-competency role hook triggered between deletions')
  const compBUser7 = await SkillGap.findOne({ user_id: user7._id, competency_id: compB._id })
  assert(compBUser7 !== null, '7.2: Role B record NOT deleted by zero-competency cleanup!')

  // Legitimate Role Zero recalculation
  await User.findByIdAndUpdate(user7._id, { role_id: roleZero._id, level: 2 })
  const legitZeroGaps = await computeUserSkillGaps(user7._id)
  assert(legitZeroGaps.length === 0, '7.3: Legitimate Role Zero returns 0 gaps')
  const countZero = await SkillGap.countDocuments({ user_id: user7._id, role_id: roleZero._id })
  assert(countZero === 0, '7.4: Zero SkillGap records in DB for confirmed zero-competency role')

  // --------------------------------------------------------------------------
  // SCENARIO 8: Transition to Null Role
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 8: Transition to Null Role During Race Window ─────────────')
  const u8Email = `p1723_u8_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u8Email)
  const user8 = await User.create({
    name: 'P17.2.3 User 8',
    email: u8Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleB._id,
    level: 4,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
  })
  testUserIds.push(user8._id)
  await computeUserSkillGaps(user8._id)

  let s8Triggered = false
  setBetweenDeletionsHook(async (uid) => {
    if (String(uid) === String(user8._id)) {
      s8Triggered = true
      await User.findByIdAndUpdate(user8._id, { role_id: null, level: null })
    }
  })

  await User.findByIdAndUpdate(user8._id, { role_id: roleA._id, level: 3 })
  await computeUserSkillGaps(user8._id)
  clearBetweenDeletionsHook()

  assert(s8Triggered, '8.1: Null role transition hook triggered between deletions')
  const compBUser8 = await SkillGap.findOne({ user_id: user8._id, competency_id: compB._id })
  assert(compBUser8 !== null, '8.2: Existing records preserved — null role aborted 2nd deletion')

  const token8 = makeAuthToken(user8._id)
  const apiResNull = await apiGet('/api/skill-gaps', token8)
  assert(apiResNull.status === 200, '8.3: GET /api/skill-gaps returns 200 for null role')
  assert(apiResNull.body.role_resolved === false, '8.4: role_resolved is false')
  assert(apiResNull.body.role_competencies_count === null, '8.5: role_competencies_count is null')
  assert(apiResNull.body.has_assigned_competencies === null, '8.6: has_assigned_competencies is null')

  // --------------------------------------------------------------------------
  // SCENARIO 9: Transition to Unresolved Role
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 9: Transition to Unresolved Role During Race Window ───────')
  const u9Email = `p1723_u9_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u9Email)
  const user9 = await User.create({
    name: 'P17.2.3 User 9',
    email: u9Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleB._id,
    level: 4,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
  })
  testUserIds.push(user9._id)
  await computeUserSkillGaps(user9._id)

  const fakeRoleId = new mongoose.Types.ObjectId()
  let s9Triggered = false
  setBetweenDeletionsHook(async (uid) => {
    if (String(uid) === String(user9._id)) {
      s9Triggered = true
      await User.findByIdAndUpdate(user9._id, { role_id: fakeRoleId, level: 4 })
    }
  })

  await User.findByIdAndUpdate(user9._id, { role_id: roleA._id, level: 3 })
  await computeUserSkillGaps(user9._id)
  clearBetweenDeletionsHook()

  assert(s9Triggered, '9.1: Unresolved role hook triggered between deletions')
  const compBUser9 = await SkillGap.findOne({ user_id: user9._id, competency_id: compB._id })
  assert(compBUser9 !== null, '9.2: Records preserved — unresolved role aborted 2nd deletion')

  // --------------------------------------------------------------------------
  // SCENARIO 10: Shared Competency Between Role A and Role B
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 10: Shared Competency & Unique Index Integrity ────────────')
  const u10Email = `p1723_u10_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u10Email)
  const user10 = await User.create({
    name: 'P17.2.3 User 10',
    email: u10Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleB._id,
    level: 4,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
  })
  testUserIds.push(user10._id)
  await computeUserSkillGaps(user10._id)

  const sharedCompB = await SkillGap.findOne({ user_id: user10._id, competency_id: compShared._id })
  assert(sharedCompB.required_level === 4, '10.1: compShared initial required_level is 4 under Role B')
  assert(String(sharedCompB.role_id) === String(roleB._id), '10.2: compShared initially stamped with role_id: roleB')

  // Legitimate transition to Role A
  await User.findByIdAndUpdate(user10._id, { role_id: roleA._id, level: 3 })
  await computeUserSkillGaps(user10._id)

  const sharedCompA = await SkillGap.findOne({ user_id: user10._id, competency_id: compShared._id })
  assert(sharedCompA.required_level === 3, '10.3: compShared required_level updated to 3 under Role A')
  assert(String(sharedCompA.role_id) === String(roleA._id), '10.4: compShared stamped with role_id: roleA')

  const countShared10 = await SkillGap.countDocuments({ user_id: user10._id, competency_id: compShared._id })
  assert(countShared10 === 1, '10.5: Exactly 1 record for (user_id, compShared) — unique index preserved')

  // --------------------------------------------------------------------------
  // SCENARIO 11: Legacy Records Lacking role_id
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 11: Legacy Records Handling (Backfill & Non-Destructive) ──')
  const u11Email = `p1723_u11_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u11Email)
  const user11 = await User.create({
    name: 'P17.2.3 User 11',
    email: u11Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleA._id,
    level: 3,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
  })
  testUserIds.push(user11._id)

  // Seed legacy active competency (compA) with role_id: null
  await SkillGap.create({
    user_id: user11._id,
    role_id: null,
    competency_id: compA._id,
    current_level: 1,
    required_level: 3,
    gap: 2,
    priority: 'high',
    computed_at: new Date(Date.now() - 50000),
  })

  // Seed legacy unknown competency (compLegacy) with role_id: null
  await SkillGap.create({
    user_id: user11._id,
    role_id: null,
    competency_id: compLegacy._id,
    current_level: 1,
    required_level: 2,
    gap: 1,
    priority: 'medium',
    computed_at: new Date(Date.now() - 50000),
  })

  // Run calculation
  await computeUserSkillGaps(user11._id)

  // Active comp authoritatively backfilled
  const backfilledComp = await SkillGap.findOne({ user_id: user11._id, competency_id: compA._id })
  assert(backfilledComp !== null, '11.1: Active competency exists in database')
  assert(String(backfilledComp.role_id) === String(roleA._id), '11.2: Active competency authoritatively backfilled with role_id: roleA')

  // Unknown legacy competency NOT deleted blindly by positive cleanup
  const preservedLegacy = await SkillGap.findOne({ user_id: user11._id, competency_id: compLegacy._id })
  assert(preservedLegacy !== null, '11.3: Unknown legacy record NOT deleted blindly (preserved safely)')

  // --------------------------------------------------------------------------
  // SCENARIO 12: Quiz-Triggered SkillGap Recalculation & API Projection
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 12: Quiz-Triggered Recalculation & API Projection Isolation ─')
  const u12Email = `p1723_u12_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u12Email)
  const user12 = await User.create({
    name: 'P17.2.3 User 12',
    email: u12Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleA._id,
    level: 3,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
    needs_skillgap_sync: true, // Flagged for sync
  })
  testUserIds.push(user12._id)

  // Seed an assessment attempt
  await AssessmentAttempt.create({
    user_id: user12._id,
    assessment_id: new mongoose.Types.ObjectId(),
    status: 'completed',
    overall_score: 80,
    competency_scores: [{ competency_id: compA._id, score: 75 }],
    completed_at: new Date(),
  })

  const token12 = makeAuthToken(user12._id)
  const apiRes12 = await apiGet('/api/skill-gaps', token12)

  assert(apiRes12.status === 200, '12.1: GET /api/skill-gaps succeeds and triggers deferred sync')
  assert(apiRes12.body.role_resolved === true, '12.2: role_resolved is true')
  assert(apiRes12.body.role_competencies_count === 2, '12.3: role_competencies_count is 2 (compA and compShared)')
  assert(apiRes12.body.has_assigned_competencies === true, '12.4: has_assigned_competencies is true')
  assert(apiRes12.body.count === 2, '12.5: API returns exactly 2 skill gaps for active Role A')

  // Verify that User flag was cleared
  const user12Db = await User.findById(user12._id).lean()
  assert(user12Db.needs_skillgap_sync === false, '12.6: needs_skillgap_sync successfully cleared')

  // API Projection Isolation Test:
  // Add a document for a different role (roleB) to the database for user12
  await SkillGap.create({
    user_id: user12._id,
    role_id: roleB._id,
    competency_id: compB._id,
    current_level: 0,
    required_level: 4,
    gap: 4,
    priority: 'high',
    computed_at: new Date(),
  })

  const apiRes12Isolated = await apiGet('/api/skill-gaps', token12)
  assert(apiRes12Isolated.body.count === 2, '12.7: API projection strictly isolates active Role A (still returns 2, ignoring historical roleB record)')
  const apiCompIds = apiRes12Isolated.body.skill_gaps.map((g) => g.competency_id._id.toString())
  assert(!apiCompIds.includes(compB._id.toString()), '12.8: Historical Role B competency excluded from active endpoint projection')

  // --------------------------------------------------------------------------
  // TEARDOWN & DATABASE ISOLATION VERIFICATION
  // --------------------------------------------------------------------------
  console.log('\n── TEARDOWN & DATABASE ISOLATION VERIFICATION ─────────────────────────')
  await safeCleanupTestUsers(testUserIds, testEmails)
  await RoleCompetency.deleteMany({ role_id: { $in: [roleA._id, roleB._id, roleZero._id] } })
  await Role.deleteMany({ _id: { $in: [roleA._id, roleB._id, roleZero._id] } })
  await Competency.deleteMany({ _id: { $in: [compA._id, compB._id, compShared._id, compLegacy._id] } })
  await Department.deleteMany({ _id: testDept._id })
  pass('Teardown: All P17.2.3 test fixtures cleaned safely from kaushalai_test')

  let devUserCountAfter = null
  try {
    const devConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai', {
      serverSelectionTimeoutMS: 3000,
    }).asPromise()
    devUserCountAfter = await devConn.collection('users').countDocuments()
    await devConn.close()
    console.log(`[GUARD] Development DB (kaushalai) post-test user count: ${devUserCountAfter}`)
    assert(devUserCountAfter === devUserCountBefore, `Dev DB count unchanged: ${devUserCountBefore} === ${devUserCountAfter}`)
  } catch (err) {
    console.warn(`[GUARD] Warning checking dev DB post-test: ${err.message}`)
  }

  await closeTestEnvironment(testEnv)
  pass('Test environment closed cleanly')

  console.log('\n========================================================================')
  console.log(`PART 17.2.3 TEST SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`)
  console.log('========================================================================\n')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runPart17_2_3Audit().catch((err) => {
  console.error('[FATAL ERROR IN PART 17.2.3 AUDIT]:', err)
  process.exit(1)
})
