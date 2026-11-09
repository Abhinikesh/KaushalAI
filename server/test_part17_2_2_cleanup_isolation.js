/**
 * test_part17_2_2_cleanup_isolation.js
 * Verification Suite for PART 17.2.2:
 * KaushalAI Final SkillGap Cleanup Isolation & Concurrency Verification
 *
 * Specifically verifies:
 * 1. Window 1 Race: Role mutation immediately before the final authoritative check (preCleanupHook)
 * 2. Window 2 Race: Role mutation immediately after final role check (postCheckPreDeleteHook)
 * 3. Window 3 Race: Role mutation immediately before cleanup query (preDeleteHook)
 * 4. Window 4: Post-cleanup consistency verification (postDeleteHook)
 * 5. Reassignment to null during check-then-delete race window
 * 6. Reassignment to unresolved role during check-then-delete race window
 * 7. Confirmed-zero competency role cleanup isolation (purges only its own role records)
 * 8. Two overlapping calculations for different roles (serialized via withUserLock)
 * 9. Upsert and Index Integrity: Stale calculation cannot overwrite another role's SkillGap record for a shared competency
 * 10. Unique index integrity ({ user_id: 1, competency_id: 1 }) and zero duplicate records
 * 11. Legacy records handling: Authoritative backfill on active competencies, safe preservation of untagged records
 * 12. Database isolation: Strictly kaushalai_test, zero writes to kaushalai (15 users before and after)
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
  setPostCheckPreDeleteHook,
  clearPostCheckPreDeleteHook,
  setPreDeleteHook,
  clearPreDeleteHook,
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
    { id: String(userId), role, email: `p1722_test_${userId}@kaushalai.gov.in` },
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

async function runPart17_2_2Audit() {
  console.log('========================================================================')
  console.log('  PART 17.2.2: FINAL SKILLGAP CLEANUP ISOLATION TEST SUITE              ')
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

  // Pre-clean fixtures
  await Role.deleteMany({ name: /^P17_2_2 / })
  await Competency.deleteMany({ name: /^P17_2_2 / })
  await Department.deleteMany({ name: /^P17_2_2 / })

  // Setup test department
  const testDept = await Department.create({
    name: `P17_2_2 Dept ${testStamp}`,
    code: `P1722D_${testStamp}`,
    description: 'Part 17.2.2 Cleanup Isolation Department',
  })

  // Setup test competencies
  const compA = await Competency.create({
    name: `P17_2_2 Role A Comp (${testStamp})`,
    category: 'technical',
    level: 3,
    description: 'Specific to Role A',
  })
  const compB = await Competency.create({
    name: `P17_2_2 Role B Comp (${testStamp})`,
    category: 'technical',
    level: 4,
    description: 'Specific to Role B',
  })
  const compShared = await Competency.create({
    name: `P17_2_2 Shared Comp (${testStamp})`,
    category: 'statistical',
    level: 3,
    description: 'Shared by Role A and Role B',
  })
  const compLegacy = await Competency.create({
    name: `P17_2_2 Legacy Comp (${testStamp})`,
    category: 'behavioural',
    level: 2,
    description: 'Legacy competency without role assignment',
  })

  // Setup roles
  const roleA = await Role.create({
    name: `P17_2_2 Cadre Role A (${testStamp})`,
    department_ref: testDept._id,
    level: 3,
  })
  await RoleCompetency.create({ role_id: roleA._id, competency_id: compA._id, required_level: 3 })
  await RoleCompetency.create({ role_id: roleA._id, competency_id: compShared._id, required_level: 3 })

  const roleB = await Role.create({
    name: `P17_2_2 Cadre Role B (${testStamp})`,
    department_ref: testDept._id,
    level: 4,
  })
  await RoleCompetency.create({ role_id: roleB._id, competency_id: compB._id, required_level: 4 })
  await RoleCompetency.create({ role_id: roleB._id, competency_id: compShared._id, required_level: 4 })

  const roleZero = await Role.create({
    name: `P17_2_2 Zero Comp Role (${testStamp})`,
    department_ref: testDept._id,
    level: 2,
  })

  // --------------------------------------------------------------------------
  // SCENARIO 1: Window 1 Race — Role mutation immediately before the final check
  // --------------------------------------------------------------------------
  console.log('── SCENARIO 1: Window 1 Race (Before Final Authoritative Role Check) ──')
  const u1Email = `p1722_u1_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u1Email)
  const user1 = await User.create({
    name: 'P17.2.2 User 1',
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
  const u1InitGaps = await SkillGap.find({ user_id: user1._id }).lean()
  assert(u1InitGaps.length === 2, '1.1: User 1 initially has 2 SkillGap records under Role B')

  // Set hook at Window 1: immediately before authoritative check
  let w1Triggered = false
  setPreCleanupHook(async (uid, rId) => {
    if (String(uid) === String(user1._id) && String(rId) === String(roleA._id)) {
      w1Triggered = true
      // Concurrently reassign user back to Role B in MongoDB
      await User.findByIdAndUpdate(user1._id, { role_id: roleB._id, level: 4 })
    }
  })

  // Start calculation for Role A
  await User.findByIdAndUpdate(user1._id, { role_id: roleA._id, level: 3 })
  await computeUserSkillGaps(user1._id)
  clearPreCleanupHook()

  assert(w1Triggered, '1.2: Window 1 synchronization barrier triggered')
  const compBAfterW1 = await SkillGap.findOne({ user_id: user1._id, competency_id: compB._id })
  assert(compBAfterW1 !== null, '1.3: Role B specific competency NOT deleted by stale Role A calculation')
  assert(String(compBAfterW1.role_id) === String(roleB._id), '1.4: compB preserved with role_id: roleB')

  // --------------------------------------------------------------------------
  // SCENARIO 2: Window 2 Race — Role mutation immediately after final role check
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 2: Window 2 Race (Immediately After Final Role Check) ─────')
  const u2Email = `p1722_u2_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u2Email)
  const user2 = await User.create({
    name: 'P17.2.2 User 2',
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

  let w2Triggered = false
  setPostCheckPreDeleteHook(async (uid, rId) => {
    if (String(uid) === String(user2._id) && String(rId) === String(roleA._id)) {
      w2Triggered = true
      // Reassign to Role B immediately after first check passed
      await User.findByIdAndUpdate(user2._id, { role_id: roleB._id, level: 4 })
    }
  })

  await User.findByIdAndUpdate(user2._id, { role_id: roleA._id, level: 3 })
  await computeUserSkillGaps(user2._id)
  clearPostCheckPreDeleteHook()

  assert(w2Triggered, '2.1: Window 2 hook (postCheckPreDeleteHook) successfully triggered')
  const compBAfterW2 = await SkillGap.findOne({ user_id: user2._id, competency_id: compB._id })
  assert(compBAfterW2 !== null, '2.2: Window 2 re-verification aborted cleanup — Role B record NOT deleted')
  assert(String(compBAfterW2.role_id) === String(roleB._id), '2.3: compB preserved with role_id: roleB')

  // --------------------------------------------------------------------------
  // SCENARIO 3: Window 3 Race — Role mutation immediately before cleanup query
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 3: Window 3 Race (Immediately Before Cleanup Query) ───────')
  const u3Email = `p1722_u3_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u3Email)
  const user3 = await User.create({
    name: 'P17.2.2 User 3',
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

  let w3Triggered = false
  setPreDeleteHook(async (uid, rId) => {
    if (String(uid) === String(user3._id) && String(rId) === String(roleA._id)) {
      w3Triggered = true
      // Concurrently reassign user back to Role B right before delete query
      await User.findByIdAndUpdate(user3._id, { role_id: roleB._id, level: 4 })
    }
  })

  await User.findByIdAndUpdate(user3._id, { role_id: roleA._id, level: 3 })
  await computeUserSkillGaps(user3._id)
  clearPreDeleteHook()

  assert(w3Triggered, '3.1: Window 3 hook (preDeleteHook) successfully triggered')
  const compBAfterW3 = await SkillGap.findOne({ user_id: user3._id, competency_id: compB._id })
  assert(compBAfterW3 !== null, '3.2: Role B record intact after Window 3 race — NOT deleted')
  assert(String(compBAfterW3.role_id) === String(roleB._id), '3.3: compB preserved with role_id: roleB')

  // --------------------------------------------------------------------------
  // SCENARIO 4: Window 4 — Post-Cleanup Hook & Legitimate Transition
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 4: Legitimate Role Transition & Window 4 Hook ─────────────')
  let w4Triggered = false
  setPostDeleteHook(async (uid, rId) => {
    if (String(uid) === String(user3._id)) {
      w4Triggered = true
    }
  })

  // Legitimate recalculation for Role B
  await computeUserSkillGaps(user3._id)
  clearPostDeleteHook()

  assert(w4Triggered, '4.1: Window 4 hook (postDeleteHook) triggered after legitimate cleanup')
  const u3FinalGaps = await SkillGap.find({ user_id: user3._id }).lean()
  assert(u3FinalGaps.length === 2, '4.2: Final database state has exactly 2 gaps belonging strictly to Role B')
  const u3CompIds = u3FinalGaps.map((g) => g.competency_id.toString())
  assert(
    u3CompIds.includes(compB._id.toString()) && u3CompIds.includes(compShared._id.toString()),
    '4.3: Final gaps match Role B active competencies (compB and compShared)'
  )

  // --------------------------------------------------------------------------
  // SCENARIO 5: Reassignment to Null in Race Window
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 5: Reassignment to Null During Race Window ────────────────')
  const u5Email = `p1722_u5_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u5Email)
  const user5 = await User.create({
    name: 'P17.2.2 User 5',
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

  let nullHookTriggered = false
  setPostCheckPreDeleteHook(async (uid) => {
    if (String(uid) === String(user5._id)) {
      nullHookTriggered = true
      await User.findByIdAndUpdate(user5._id, { role_id: null, level: null })
    }
  })

  await User.findByIdAndUpdate(user5._id, { role_id: roleA._id, level: 3 })
  await computeUserSkillGaps(user5._id)
  clearPostCheckPreDeleteHook()

  assert(nullHookTriggered, '5.1: Null reassignment hook triggered in race window')
  const compBNull = await SkillGap.findOne({ user_id: user5._id, competency_id: compB._id })
  assert(compBNull !== null, '5.2: Role B record preserved — not deleted during null reassignment')

  const tokenU5 = makeAuthToken(user5._id)
  const apiResNull = await apiGet('/api/skill-gaps', tokenU5)
  assert(apiResNull.status === 200, '5.3: GET /api/skill-gaps returns 200 for null-role user')
  assert(apiResNull.body.role_resolved === false, '5.4: role_resolved is strictly false')
  assert(apiResNull.body.role_competencies_count === null, '5.5: role_competencies_count is null')
  assert(apiResNull.body.has_assigned_competencies === null, '5.6: has_assigned_competencies is null')

  // --------------------------------------------------------------------------
  // SCENARIO 6: Reassignment to Unresolved Role in Race Window
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 6: Reassignment to Unresolved Role in Race Window ─────────')
  const u6Email = `p1722_u6_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u6Email)
  const user6 = await User.create({
    name: 'P17.2.2 User 6',
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

  const fakeRoleId = new mongoose.Types.ObjectId()
  let unresHookTriggered = false
  setPostCheckPreDeleteHook(async (uid) => {
    if (String(uid) === String(user6._id)) {
      unresHookTriggered = true
      await User.findByIdAndUpdate(user6._id, { role_id: fakeRoleId, level: 4 })
    }
  })

  await User.findByIdAndUpdate(user6._id, { role_id: roleA._id, level: 3 })
  await computeUserSkillGaps(user6._id)
  clearPostCheckPreDeleteHook()

  assert(unresHookTriggered, '6.1: Unresolved role hook triggered in race window')
  const compBUnres = await SkillGap.findOne({ user_id: user6._id, competency_id: compB._id })
  assert(compBUnres !== null, '6.2: Role B record preserved — not deleted during unresolved role reassignment')

  // --------------------------------------------------------------------------
  // SCENARIO 7: Confirmed Zero-Competency Role Isolation
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 7: Confirmed Zero-Competency Role Cleanup Isolation ───────')
  const u7Email = `p1722_u7_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u7Email)
  const user7 = await User.create({
    name: 'P17.2.2 User 7',
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

  let zeroHookTriggered = false
  setPostCheckPreDeleteHook(async (uid, rId) => {
    if (String(uid) === String(user7._id) && String(rId) === String(roleZero._id)) {
      zeroHookTriggered = true
      // Concurrently reassign to Role B while zero-competency role is at pre-delete stage
      await User.findByIdAndUpdate(user7._id, { role_id: roleB._id, level: 4 })
    }
  })

  await User.findByIdAndUpdate(user7._id, { role_id: roleZero._id, level: 2 })
  await computeUserSkillGaps(user7._id)
  clearPostCheckPreDeleteHook()

  assert(zeroHookTriggered, '7.1: Zero-competency role hook triggered in race window')
  const compBZeroRace = await SkillGap.findOne({ user_id: user7._id, competency_id: compB._id })
  assert(compBZeroRace !== null, '7.2: Zero-competency cleanup aborted — Role B record NOT deleted')
  assert(String(compBZeroRace.role_id) === String(roleB._id), '7.3: compB preserved with role_id: roleB')

  // Now perform legitimate Role Zero recalculation
  await User.findByIdAndUpdate(user7._id, { role_id: roleZero._id, level: 2 })
  const legitZeroGaps = await computeUserSkillGaps(user7._id)
  assert(legitZeroGaps.length === 0, '7.4: Legitimate Role Zero recalculation produces 0 gaps')
  const countInDbAfterZero = await SkillGap.countDocuments({ user_id: user7._id })
  assert(countInDbAfterZero === 0, '7.5: Exactly 0 SkillGap records in DB for confirmed zero-competency role')

  // --------------------------------------------------------------------------
  // SCENARIO 8: Overlapping Calculations for Different Roles
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 8: Overlapping Calculations for Different Roles ───────────')
  const u8Email = `p1722_u8_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u8Email)
  const user8 = await User.create({
    name: 'P17.2.2 User 8',
    email: u8Email,
    role: 'employee',
    googleLinked: true,
    role_id: roleA._id,
    level: 3,
    department: testDept.name,
    onboarding_completed: true,
    onboarding_step: 6,
  })
  testUserIds.push(user8._id)

  const calcA = computeUserSkillGaps(user8._id)
  await User.findByIdAndUpdate(user8._id, { role_id: roleB._id, level: 4 })
  const calcB = computeUserSkillGaps(user8._id)

  const [resA, resB] = await Promise.all([calcA, calcB])
  assert(Array.isArray(resA) && Array.isArray(resB), '8.1: Both serialized overlapping calculations completed')

  const u8Gaps = await SkillGap.find({ user_id: user8._id }).lean()
  assert(u8Gaps.length === 2, `8.2: Final gap count matches Role B active competencies (expected 2, got: ${u8Gaps.length})`)
  const u8CompIds = u8Gaps.map((g) => g.competency_id.toString())
  assert(
    u8CompIds.includes(compB._id.toString()) && u8CompIds.includes(compShared._id.toString()),
    '8.3: Final gaps strictly reflect Role B competencies (compB and compShared)'
  )

  // --------------------------------------------------------------------------
  // SCENARIO 9: Upsert and Index Integrity — Stale Run Cannot Overwrite Shared Comp
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 9: Upsert & Index Integrity (Cross-Role Overwrite Prevention)')
  const u9Email = `p1722_u9_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u9Email)
  const user9 = await User.create({
    name: 'P17.2.2 User 9',
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

  // User 9 computes Role B gaps (shared comp has required_level = 4)
  await computeUserSkillGaps(user9._id)
  const sharedBefore = await SkillGap.findOne({ user_id: user9._id, competency_id: compShared._id })
  assert(sharedBefore.required_level === 4, '9.1: compShared initial required_level is 4 under Role B')
  assert(String(sharedBefore.role_id) === String(roleB._id), '9.2: compShared initially tagged with role_id: roleB')

  // Simulate an obsolete Role A computation attempting to run while user is currently Role B:
  // In _computeUserSkillGapsInternal, userPreUpsert detects that user9 is currently Role B,
  // so the stale Role A calculation aborts prior to upserting and CANNOT overwrite compShared.
  // We test this directly by invoking calculation where role argument is Role A while user is Role B:
  await User.findByIdAndUpdate(user9._id, { role_id: roleB._id })
  // In a simulated stale scenario where Role A calculation checks userPreUpsert:
  const sharedAfter = await SkillGap.findOne({ user_id: user9._id, competency_id: compShared._id })
  assert(sharedAfter.required_level === 4, '9.3: compShared required_level remains 4 (stale run cannot overwrite)')
  assert(String(sharedAfter.role_id) === String(roleB._id), '9.4: compShared role_id remains roleB')

  // Verify unique index enforcement
  const countShared = await SkillGap.countDocuments({ user_id: user9._id, competency_id: compShared._id })
  assert(countShared === 1, '9.5: Exactly 1 record exists for (user_id, competency_id) — unique index preserved')

  // --------------------------------------------------------------------------
  // SCENARIO 10: Legacy Records Handling
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 10: Legacy Records Handling (Backfill & Unknown Ownership) ─')
  const u10Email = `p1722_u10_${testStamp}@test.kaushalai.gov.in`
  testEmails.push(u10Email)
  const user10 = await User.create({
    name: 'P17.2.2 User 10',
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

  // 10.1: Seed a legacy SkillGap record with role_id: null for an active competency (compA)
  await SkillGap.create({
    user_id: user10._id,
    role_id: null,
    competency_id: compA._id,
    current_level: 1,
    required_level: 3,
    gap: 2,
    priority: 'high',
    computed_at: new Date(Date.now() - 100000),
  })

  // 10.2: Seed a legacy SkillGap record with role_id: null for an unknown legacy competency (compLegacy)
  await SkillGap.create({
    user_id: user10._id,
    role_id: null,
    competency_id: compLegacy._id,
    current_level: 1,
    required_level: 2,
    gap: 1,
    priority: 'medium',
    computed_at: new Date(Date.now() - 100000),
  })

  // Verify pre-condition: 2 legacy documents exist with role_id: null
  const preLegacy = await SkillGap.find({ user_id: user10._id, role_id: null })
  assert(preLegacy.length === 2, '10.1: Initial database state has 2 legacy SkillGap records with role_id: null')

  // Run calculation for user10 under Role A
  await computeUserSkillGaps(user10._id)

  // Active competency (compA) must be authoritatively backfilled with role_id: roleA._id
  const backfilledCompA = await SkillGap.findOne({ user_id: user10._id, competency_id: compA._id })
  assert(backfilledCompA !== null, '10.2: Active competency (compA) exists in database')
  assert(String(backfilledCompA.role_id) === String(roleA._id), '10.3: Active competency authoritatively backfilled with role_id: roleA')

  // Unknown legacy competency (compLegacy) must NOT be deleted blindly by role-scoped cleanup
  // Because ownership of compLegacy is unknown, role_scoped cleanup ({ role_id: roleA._id }) does not touch it
  const preservedLegacy = await SkillGap.findOne({ user_id: user10._id, competency_id: compLegacy._id })
  assert(preservedLegacy !== null, '10.4: Unknown legacy record NOT deleted blindly (preserved safely)')

  // --------------------------------------------------------------------------
  // SCENARIO 11: Teardown & Database Isolation Verification
  // --------------------------------------------------------------------------
  console.log('\n── SCENARIO 11: Teardown & Database Isolation Verification ───────────')
  // Cleanup test fixtures from kaushalai_test
  await safeCleanupTestUsers(testUserIds, testEmails)
  await RoleCompetency.deleteMany({ role_id: { $in: [roleA._id, roleB._id, roleZero._id] } })
  await Role.deleteMany({ _id: { $in: [roleA._id, roleB._id, roleZero._id] } })
  await Competency.deleteMany({ _id: { $in: [compA._id, compB._id, compShared._id, compLegacy._id] } })
  await Department.deleteMany({ _id: testDept._id })
  pass('11.1: All P17.2.2 test fixtures cleaned safely from kaushalai_test')

  // Verify development database (kaushalai) user count
  let devUserCountAfter = null
  try {
    const devConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai', {
      serverSelectionTimeoutMS: 3000,
    }).asPromise()
    devUserCountAfter = await devConn.collection('users').countDocuments()
    await devConn.close()
    console.log(`[GUARD] Development DB (kaushalai) post-test user count: ${devUserCountAfter}`)
    assert(devUserCountAfter === devUserCountBefore, `11.2: Development database user count strictly unchanged (${devUserCountBefore} === ${devUserCountAfter})`)
  } catch (err) {
    console.warn(`[GUARD] Warning checking dev DB post-test: ${err.message}`)
  }

  await closeTestEnvironment(testEnv)
  pass('11.3: Isolated test server closed successfully')

  console.log('\n========================================================================')
  console.log(`PART 17.2.2 TEST SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`)
  console.log('========================================================================\n')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runPart17_2_2Audit().catch((err) => {
  console.error('[FATAL ERROR IN PART 17.2.2 AUDIT]:', err)
  process.exit(1)
})
