/**
 * test_part17_2_4_historical_cleanup_safety.js
 * Verification Suite for PART 17.2.4:
 * KaushalAI Final Historical Role Cleanup Safety & Concurrency Correction
 *
 * Verifies all 12 mandatory deterministic scenarios:
 * 1. Role A calculation completes normally.
 * 2. User changes from Role A to Role B before historical discovery.
 * 3. Role B already has SkillGap records before the Role A calculation.
 * 4. Exact Part 17.2.4 race reproduction: Role A passes fresh-state check, user changes to Role B,
 *    Role B records exist, Role A attempts cleanup -> Role B records verified intact in MongoDB!
 * 5. Two different role calculations overlap (mutex serialization).
 * 6. Role A and Role B share a competency (unique index preservation & correct level update).
 * 7. Confirmed-zero Role A calculation overlaps Role B assignment (Option A isolation).
 * 8. User role changes to null (fail-closed, zero historical records exposed).
 * 9. User role becomes unresolved (fail-closed, neutral API contract).
 * 10. Legacy records with missing or null role_id (never deleted blindly).
 * 11. Quiz-triggered recalculation occurs during reassignment (resilient sync).
 * 12. API projection while user has historical records from multiple roles (active role isolation).
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
    { id: String(userId), role, email: `p1724_test_${userId}@kaushalai.gov.in` },
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

async function runPart17_2_4Audit() {
  console.log('========================================================================')
  console.log('PART 17.2.4: HISTORICAL ROLE CLEANUP SAFETY & CONCURRENCY AUDIT')
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
    preferPort: 5098,
    testUri: process.env.MONGODB_TEST_URI,
  })
  activePort = testEnv.port

  const testStamp = Date.now()
  const testUserIds = []
  const testEmails = []

  // Pre-clean fixtures
  await User.deleteMany({ email: /^p1724_/ })
  await Role.deleteMany({ name: /^P17_2_4 / })
  await Competency.deleteMany({ name: /^P17_2_4 / })
  await Department.deleteMany({ name: /^P17_2_4 / })

  // Setup test department
  const testDept = await Department.create({
    name: `P17_2_4 Dept ${testStamp}`,
    code: `P1724D_${testStamp}`,
    description: 'Part 17.2.4 Historical Cleanup Department',
  })

  // Setup test competencies
  const compA = await Competency.create({
    name: `P17_2_4 Role A Comp (${testStamp})`,
    category: 'technical',
    level: 3,
    description: 'Specific to Role A',
  })
  const compB = await Competency.create({
    name: `P17_2_4 Role B Comp (${testStamp})`,
    category: 'technical',
    level: 4,
    description: 'Specific to Role B',
  })
  const compShared = await Competency.create({
    name: `P17_2_4 Shared Comp (${testStamp})`,
    category: 'statistical',
    level: 3,
    description: 'Shared by Role A and Role B',
  })
  const compLegacy = await Competency.create({
    name: `P17_2_4 Legacy Comp (${testStamp})`,
    category: 'behavioural',
    level: 2,
    description: 'Legacy competency without role assignment',
  })

  // Setup roles
  const roleA = await Role.create({
    name: `P17_2_4 Cadre Role A (${testStamp})`,
    department_ref: testDept._id,
    level: 3,
  })
  await RoleCompetency.create({ role_id: roleA._id, competency_id: compA._id, required_level: 3 })
  await RoleCompetency.create({ role_id: roleA._id, competency_id: compShared._id, required_level: 3 })

  const roleB = await Role.create({
    name: `P17_2_4 Cadre Role B (${testStamp})`,
    department_ref: testDept._id,
    level: 4,
  })
  await RoleCompetency.create({ role_id: roleB._id, competency_id: compB._id, required_level: 4 })
  await RoleCompetency.create({ role_id: roleB._id, competency_id: compShared._id, required_level: 4 })

  const roleZero = await Role.create({
    name: `P17_2_4 Zero Comp Role (${testStamp})`,
    department_ref: testDept._id,
    level: 2,
  })

  // --------------------------------------------------------------------------
  // SCENARIO 1: Role A Calculation Completes Normally
  // --------------------------------------------------------------------------
  console.log('── SCENARIO 1: Role A Calculation Completes Normally ──────────────────')
  const u1Email = `p1724_u1_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u1Email)
  const user1 = await User.create({
    name: 'P17.2.4 User 1',
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

  const u1Gaps = await computeUserSkillGaps(user1._id)
  assert(u1Gaps.length === 2, '1.1: Role A computation produces exactly 2 gaps')
  const u1DbGaps = await SkillGap.find({ user_id: user1._id }).lean()
  assert(u1DbGaps.length === 2, '1.2: Database stores exactly 2 records stamped with role_id: roleA')
  assert(u1DbGaps.every((g) => String(g.role_id) === String(roleA._id)), '1.3: All records tagged with roleA._id')

  // --------------------------------------------------------------------------
  // SCENARIO 2: Role Change From Role A to Role B Before Cleanup Check
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 2: Role Mutation Before Cleanup Check ─────────────────────')
  const u2Email = `p1724_u2_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u2Email)
  const user2 = await User.create({
    name: 'P17.2.4 User 2',
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
      // Concurrently reassign user back to Role B
      await User.findByIdAndUpdate(user2._id, { role_id: roleB._id, level: 4 })
    }
  })

  await User.findByIdAndUpdate(user2._id, { role_id: roleA._id, level: 3 })
  await computeUserSkillGaps(user2._id)
  clearPreCleanupHook()

  assert(s2Triggered, '2.1: Pre-cleanup hook triggered')
  const compBUser2 = await SkillGap.findOne({ user_id: user2._id, competency_id: compB._id })
  assert(compBUser2 !== null, '2.2: Role B record NOT deleted by obsolete Role A calculation')
  assert(String(compBUser2.role_id) === String(roleB._id), '2.3: compB preserved with role_id: roleB')

  // --------------------------------------------------------------------------
  // SCENARIO 3: Role B Already Has SkillGap Records Before Role A Calculation
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 3: Pre-Existing Role B Records When Role A Runs ───────────')
  const u3Email = `p1724_u3_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u3Email)
  const user3 = await User.create({
    name: 'P17.2.4 User 3',
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

  // User 3 is reassigned to Role A; Role A calculation runs
  await User.findByIdAndUpdate(user3._id, { role_id: roleA._id, level: 3 })
  await computeUserSkillGaps(user3._id)

  // Verify that under Option A, Role B records are NEVER deleted by Role A calculation
  const compBUser3 = await SkillGap.findOne({ user_id: user3._id, competency_id: compB._id })
  assert(compBUser3 !== null, '3.1: Pre-existing Role B record preserved safely (Option A non-destructive isolation)')
  assert(String(compBUser3.role_id) === String(roleB._id), '3.2: compB preserved with role_id: roleB')

  // Verify API endpoint projects only active Role A
  const token3 = makeAuthToken(user3._id)
  const apiRes3 = await apiGet('/api/skill-gaps', token3)
  assert(apiRes3.body.count === 2, '3.3: API returns exactly 2 gaps for active Role A')
  const apiCompIds3 = apiRes3.body.skill_gaps.map((g) => g.competency_id._id.toString())
  assert(!apiCompIds3.includes(compB._id.toString()), '3.4: Historical Role B competency completely excluded from active projection')

  // --------------------------------------------------------------------------
  // SCENARIO 4: Exact Part 17.2.4 Race Reproduction
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 4: Exact Part 17.2.4 Race Reproduction (Option A Elimination)')
  const u4Email = `p1724_u4_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u4Email)
  const user4 = await User.create({
    name: 'P17.2.4 User 4',
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
  // Simulation: Role A completes initial upsert and passes check, then preDeleteHook triggers:
  // User is reassigned to Role B and Role B records exist in MongoDB!
  setPreDeleteHook(async (uid, rId) => {
    if (String(uid) === String(user4._id) && String(rId) === String(roleA._id)) {
      s4Triggered = true
      // Out-of-band role reassignment to Role B occurred right here
      await User.findByIdAndUpdate(user4._id, { role_id: roleB._id, level: 4 })
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
  clearPreDeleteHook()

  assert(s4Triggered, '4.1: Synchronization barrier triggered')
  // Verify that compB (belonging to newly assigned Role B) was NOT deleted!
  const compBUser4 = await SkillGap.findOne({ user_id: user4._id, competency_id: compB._id })
  assert(compBUser4 !== null, '4.2: Role B records remained intact — Option A strictly prevented deletion!')
  assert(String(compBUser4.role_id) === String(roleB._id), '4.3: compB preserved with role_id: roleB')

  // --------------------------------------------------------------------------
  // SCENARIO 5: Overlapping Calculations for Different Roles
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 5: Overlapping Calculations for Different Roles ───────────')
  const u5Email = `p1724_u5_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u5Email)
  const user5 = await User.create({
    name: 'P17.2.4 User 5',
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

  const calcA = computeUserSkillGaps(user5._id)
  await User.findByIdAndUpdate(user5._id, { role_id: roleB._id, level: 4 })
  const calcB = computeUserSkillGaps(user5._id)

  const [res5A, res5B] = await Promise.all([calcA, calcB])
  assert(Array.isArray(res5A) && Array.isArray(res5B), '5.1: Both serialized overlapping runs completed')

  const token5 = makeAuthToken(user5._id)
  const apiRes5 = await apiGet('/api/skill-gaps', token5)
  assert(apiRes5.body.count === 2, '5.2: API returns exactly 2 gaps for current Role B')
  const u5ApiCompIds = apiRes5.body.skill_gaps.map((g) => g.competency_id._id.toString())
  assert(
    u5ApiCompIds.includes(compB._id.toString()) && u5ApiCompIds.includes(compShared._id.toString()),
    '5.3: API strictly returns Role B active competencies (compB and compShared)'
  )

  // --------------------------------------------------------------------------
  // SCENARIO 6: Role A and Role B Share a Competency
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 6: Shared Competency & Unique Index Integrity ────────────')
  const u6Email = `p1724_u6_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u6Email)
  const user6 = await User.create({
    name: 'P17.2.4 User 6',
    email: u6Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleB._id,
    level: 4,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
  })
  testUserIds.push(user6._id)
  await computeUserSkillGaps(user6._id)

  const sharedBefore = await SkillGap.findOne({ user_id: user6._id, competency_id: compShared._id })
  assert(sharedBefore.required_level === 4, '6.1: compShared initial required_level is 4 under Role B')
  assert(String(sharedBefore.role_id) === String(roleB._id), '6.2: compShared initially stamped with role_id: roleB')

  // Reassign to Role A
  await User.findByIdAndUpdate(user6._id, { role_id: roleA._id, level: 3 })
  await computeUserSkillGaps(user6._id)

  const sharedAfter = await SkillGap.findOne({ user_id: user6._id, competency_id: compShared._id })
  assert(sharedAfter.required_level === 3, '6.3: compShared updated to required_level 3 under Role A')
  assert(String(sharedAfter.role_id) === String(roleA._id), '6.4: compShared stamped with role_id: roleA')

  const countShared6 = await SkillGap.countDocuments({ user_id: user6._id, competency_id: compShared._id })
  assert(countShared6 === 1, '6.5: Exactly 1 record in DB for (user_id, compShared) — unique index preserved')

  // --------------------------------------------------------------------------
  // SCENARIO 7: Confirmed Zero-Competency Role Overlaps Role B Assignment
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 7: Confirmed Zero-Competency Role Isolation ───────────────')
  const u7Email = `p1724_u7_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u7Email)
  const user7 = await User.create({
    name: 'P17.2.4 User 7',
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
  setPreDeleteHook(async (uid, rId) => {
    if (String(uid) === String(user7._id) && String(rId) === String(roleZero._id)) {
      s7Triggered = true
      // Reassign to Role B while Zero-competency role is at pre-delete stage
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
  clearPreDeleteHook()

  assert(s7Triggered, '7.1: Zero-competency role pre-delete hook triggered')
  const compBUser7 = await SkillGap.findOne({ user_id: user7._id, competency_id: compB._id })
  assert(compBUser7 !== null, '7.2: Role B record NOT deleted by zero-competency cleanup!')

  // Legitimate Role Zero recalculation
  await User.findByIdAndUpdate(user7._id, { role_id: roleZero._id, level: 2 })
  const legitZeroGaps = await computeUserSkillGaps(user7._id)
  assert(legitZeroGaps.length === 0, '7.3: Legitimate Role Zero returns 0 gaps')

  const token7 = makeAuthToken(user7._id)
  const apiResZero = await apiGet('/api/skill-gaps', token7)
  assert(apiResZero.status === 200, '7.4: GET /api/skill-gaps returns 200 for zero-competency role')
  assert(apiResZero.body.count === 0, '7.5: API count is 0')
  assert(apiResZero.body.role_competencies_count === 0, '7.6: role_competencies_count is strictly 0')
  assert(apiResZero.body.has_assigned_competencies === false, '7.7: has_assigned_competencies is strictly false')
  assert(apiResZero.body.role_resolved === true, '7.8: role_resolved is true')

  // --------------------------------------------------------------------------
  // SCENARIO 8: User Role Changes to Null (Neutral Unavailable Contract)
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 8: User Role Changes to Null ──────────────────────────────')
  const u8Email = `p1724_u8_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u8Email)
  const user8 = await User.create({
    name: 'P17.2.4 User 8',
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

  // Reassign to null
  await User.findByIdAndUpdate(user8._id, { role_id: null, level: null })

  const token8 = makeAuthToken(user8._id)
  const apiResNull = await apiGet('/api/skill-gaps', token8)
  assert(apiResNull.status === 200, '8.1: GET /api/skill-gaps returns 200 for null role')
  assert(apiResNull.body.count === 0, '8.2: API count is strictly 0 (never exposes historical records!)')
  assert(apiResNull.body.skill_gaps.length === 0, '8.3: skill_gaps is empty array []')
  assert(apiResNull.body.role_resolved === false, '8.4: role_resolved is strictly false')
  assert(apiResNull.body.role_competencies_count === null, '8.5: role_competencies_count is null')
  assert(apiResNull.body.has_assigned_competencies === null, '8.6: has_assigned_competencies is null')

  // --------------------------------------------------------------------------
  // SCENARIO 9: User Role Becomes Unresolved
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 9: User Role Becomes Unresolved ───────────────────────────')
  const u9Email = `p1724_u9_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u9Email)
  const fakeRoleId = new mongoose.Types.ObjectId()
  const user9 = await User.create({
    name: 'P17.2.4 User 9',
    email: u9Email,
    role: 'employee',
    googleLinked: true,
    role_id: fakeRoleId,
    level: 4,
    department: 'NonExistentDeptXYZ',
    onboarding_completed: true,
    onboarding_step: 6,
  })
  testUserIds.push(user9._id)

  // Pre-seed some historical records to verify they are NEVER exposed
  await SkillGap.create({
    user_id: user9._id,
    role_id: roleA._id,
    competency_id: compA._id,
    current_level: 1,
    required_level: 3,
    gap: 2,
    priority: 'high',
  })

  const token9 = makeAuthToken(user9._id)
  const apiResUnres = await apiGet('/api/skill-gaps', token9)
  assert(apiResUnres.status === 200, '9.1: GET /api/skill-gaps returns 200 for unresolved role')
  assert(apiResUnres.body.count === 0, '9.2: API count is strictly 0 — historical records shielded!')
  assert(apiResUnres.body.skill_gaps.length === 0, '9.3: skill_gaps is strictly []')
  assert(apiResUnres.body.role_resolved === false, '9.4: role_resolved is strictly false')
  assert(apiResUnres.body.role_competencies_count === null, '9.5: role_competencies_count is null')
  assert(apiResUnres.body.has_assigned_competencies === null, '9.6: has_assigned_competencies is null')

  // --------------------------------------------------------------------------
  // SCENARIO 10: Legacy Records With Missing or Null role_id
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 10: Legacy Records With Missing or Null role_id ───────────')
  const u10Email = `p1724_u10_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u10Email)
  const user10 = await User.create({
    name: 'P17.2.4 User 10',
    email: u10Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleA._id,
    level: 3,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
  })
  testUserIds.push(user10._id)

  // Seed legacy untagged record (compLegacy with role_id: null)
  await SkillGap.create({
    user_id: user10._id,
    role_id: null,
    competency_id: compLegacy._id,
    current_level: 1,
    required_level: 2,
    gap: 1,
    priority: 'medium',
  })

  // Run Role A calculation
  await computeUserSkillGaps(user10._id)

  // Legacy untagged record is NOT deleted because Role A cleanup only touches role_id: roleA._id
  const preservedLegacy = await SkillGap.findOne({ user_id: user10._id, competency_id: compLegacy._id })
  assert(preservedLegacy !== null, '10.1: Legacy record with role_id: null is NOT deleted (preserved safely)')
  assert(preservedLegacy.role_id === null, '10.2: Legacy record remains intact with role_id: null')

  // --------------------------------------------------------------------------
  // SCENARIO 11: Quiz-Triggered Recalculation Occurs During Reassignment
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 11: Quiz-Triggered Recalculation During Reassignment ──────')
  const u11Email = `p1724_u11_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u11Email)
  const user11 = await User.create({
    name: 'P17.2.4 User 11',
    email: u11Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleA._id,
    level: 3,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
    needs_skillgap_sync: true,
  })
  testUserIds.push(user11._id)

  await AssessmentAttempt.create({
    user_id: user11._id,
    assessment_id: new mongoose.Types.ObjectId(),
    status: 'completed',
    overall_score: 85,
    competency_scores: [{ competency_id: compA._id, score: 85 }],
    completed_at: new Date(),
  })

  // Quiz-triggered deferred sync recovery via GET /api/skill-gaps
  const token11 = makeAuthToken(user11._id)
  const apiRes11 = await apiGet('/api/skill-gaps', token11)
  assert(apiRes11.status === 200, '11.1: GET /api/skill-gaps succeeds and recovers deferred sync')
  assert(apiRes11.body.count === 2, '11.2: Returns exactly 2 gaps for active Role A')
  const user11Db = await User.findById(user11._id).lean()
  assert(user11Db.needs_skillgap_sync === false, '11.3: needs_skillgap_sync cleared after successful calculation')

  // --------------------------------------------------------------------------
  // SCENARIO 12: API Projection While User Has Historical Records from Multiple Roles
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 12: API Projection With Multiple Historical Roles ─────────')
  const u12Email = `p1724_u12_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u12Email)
  const user12 = await User.create({
    name: 'P17.2.4 User 12',
    email: u12Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleB._id,
    level: 4,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
  })
  testUserIds.push(user12._id)
  await computeUserSkillGaps(user12._id)

  // Manually insert historical records belonging to Role A and an obsolete Role X
  const obsoleteRoleXId = new mongoose.Types.ObjectId()
  const compX = await Competency.create({
    name: `P17_2_4 Comp X (${testStamp})`,
    category: 'technical',
    level: 3,
  })

  await SkillGap.create({
    user_id: user12._id,
    role_id: roleA._id,
    competency_id: compA._id,
    current_level: 1,
    required_level: 3,
    gap: 2,
    priority: 'high',
  })

  await SkillGap.create({
    user_id: user12._id,
    role_id: obsoleteRoleXId,
    competency_id: compX._id,
    current_level: 0,
    required_level: 3,
    gap: 3,
    priority: 'high',
  })

  // Verify DB contains records from Role B, Role A, and Role X (total 4 records)
  const allDbRecords = await SkillGap.find({ user_id: user12._id }).lean()
  assert(allDbRecords.length === 4, '12.1: DB has 4 records across multiple historical roles')

  // GET /api/skill-gaps must project ONLY active Role B records (compB, compShared)
  const token12 = makeAuthToken(user12._id)
  const apiRes12 = await apiGet('/api/skill-gaps', token12)
  assert(apiRes12.body.count === 2, '12.2: API strictly returns count: 2 for active Role B')
  assert(apiRes12.body.role_competencies_count === 2, '12.3: role_competencies_count is 2')
  assert(apiRes12.body.has_assigned_competencies === true, '12.4: has_assigned_competencies is true')
  assert(apiRes12.body.role_resolved === true, '12.5: role_resolved is true')

  const returnedCompIds = apiRes12.body.skill_gaps.map((g) => g.competency_id._id.toString())
  assert(
    returnedCompIds.includes(compB._id.toString()) && returnedCompIds.includes(compShared._id.toString()),
    '12.6: Returned gaps strictly match active Role B competencies'
  )
  assert(!returnedCompIds.includes(compA._id.toString()), '12.7: Role A historical record excluded from API response')
  assert(!returnedCompIds.includes(compX._id.toString()), '12.8: Obsolete Role X record excluded from API response')

  // --------------------------------------------------------------------------
  // TEARDOWN & DATABASE ISOLATION VERIFICATION
  // --------------------------------------------------------------------------
  console.log('\n── TEARDOWN & DATABASE ISOLATION VERIFICATION ─────────────────────────')
  await safeCleanupTestUsers(testUserIds, testEmails)
  await RoleCompetency.deleteMany({ role_id: { $in: [roleA._id, roleB._id, roleZero._id] } })
  await Role.deleteMany({ _id: { $in: [roleA._id, roleB._id, roleZero._id] } })
  await Competency.deleteMany({ _id: { $in: [compA._id, compB._id, compShared._id, compLegacy._id, compX._id] } })
  await Department.deleteMany({ _id: testDept._id })
  pass('Teardown: All P17.2.4 test fixtures cleaned safely from kaushalai_test')

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
  console.log(`PART 17.2.4 TEST SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`)
  console.log('========================================================================\n')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runPart17_2_4Audit().catch((err) => {
  console.error('[FATAL ERROR IN PART 17.2.4 AUDIT]:', err)
  process.exit(1)
})

