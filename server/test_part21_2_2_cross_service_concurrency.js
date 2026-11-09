/**
 * TEST PART 21.2.2: KAUSHALAI CROSS-SERVICE CONCURRENCY SUITE
 * 
 * Verifies:
 * Scenario A: Quiz Competency Update Concurrent With Admin Role Reassignment
 *   A.1: Simultaneous Promise.all execution between applyCompetencyUpdates() and admin updateUser()
 *   A.2: Controlled concurrency barrier with in-flight lock contention and fresh-state re-read
 *   A.3: Concurrency with deliberate transient failure and truthful deferred recovery
 * 
 * Scenario B: Recovery GET Concurrent With Admin Reassignment
 *   B.1: Simultaneous Promise.all between GET /api/skill-gaps recovery and admin updateUser()
 *   B.2: Controlled concurrency barrier holding recovery lock while admin reassignment enqueues
 *   B.3: Recovery failure handling fails closed without falsely reporting sync
 * 
 * Invariants Verified:
 *   - Shared per-user mutex serialization
 *   - Final authoritative User.role_id integrity
 *   - Active-role SkillGap projection isolation (no cross-role data leakage)
 *   - Quiz competency improvement preservation in UserCompetency
 *   - Non-destructive role-scoped cleanup (historical records preserved)
 *   - Deferred recovery markers lifecycle (needs_skillgap_sync)
 *   - Strict database isolation (kaushalai dev DB remains at 15 users)
 */

'use strict'

const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })
if (!process.env.ACCESS_TOKEN_SECRET) {
  process.env.ACCESS_TOKEN_SECRET = 'kaushalai_dev_access_secret_change_in_prod'
}
const http = require('http')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const { validateTestDatabaseUri } = require('./src/test/testDbGuard')

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET
const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/kaushalai_test'

validateTestDatabaseUri(testDbUri)

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

// Timeout helper to prevent infinite deadlocks
function withTimeout(promise, ms, operationName) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout of ${ms}ms exceeded for operation: ${operationName}`)), ms)
    ),
  ])
}

async function runTests() {
  console.log('===================================================================')
  console.log('PART 21.2.2: CROSS-SERVICE CONCURRENCY ACCEPTANCE TEST SUITE')
  console.log('===================================================================')

  await mongoose.connect(testDbUri)

  const User = require('./src/models/User')
  const Department = require('./src/models/Department')
  const Role = require('./src/models/Role')
  const Competency = require('./src/models/Competency')
  const RoleCompetency = require('./src/models/RoleCompetency')
  const UserCompetency = require('./src/models/UserCompetency')
  const SkillGap = require('./src/models/SkillGap')
  const AuditLog = require('./src/models/AuditLog')

  const {
    computeUserSkillGaps,
    mutateUserAndRecalculateGaps,
    setPreCleanupHook,
    clearPreCleanupHook,
  } = require('./src/services/skillGap.service')

  const { applyCompetencyUpdates } = require('./src/services/competencyUpdate.service')

  // ──────────────────────────────────────────────────────────────────────────
  // GUARDRAIL: Pre-Test Development Database Check
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GUARDRAIL: Development Database Isolation (Pre-Test) ---')
  const devConn1 = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
  const devUserCount1 = await devConn1.collection('users').countDocuments()
  assert(devUserCount1 === 15, `G.1.Initial: Development DB (kaushalai) user count strictly 15 (actual: ${devUserCount1})`)
  await devConn1.close()

  // Clean test fixtures
  const testPrefix = 'p21_2_2_test_'
  await User.deleteMany({ email: new RegExp(testPrefix) })
  await Department.deleteMany({ code: new RegExp('^P21_2_2_') })
  await Role.deleteMany({ name: new RegExp('^P21_2_2 ') })
  await Competency.deleteMany({ competencyCode: new RegExp('^P21_2_2_') })
  await AuditLog.deleteMany({ 'meta.testSuite': 'part21_2_2_concurrency' })

  // Setup Departments
  const deptA = await Department.create({
    name: 'P21_2_2 Economic Statistics Division',
    code: 'P21_2_2_ESD',
    ministry: 'Ministry of Statistics and Programme Implementation',
  })

  const deptB = await Department.create({
    name: 'P21_2_2 Survey Design & Research Division',
    code: 'P21_2_2_SDRD',
    ministry: 'Ministry of Statistics and Programme Implementation',
  })

  // Setup Roles
  const roleA = await Role.create({
    name: 'P21_2_2 Junior Statistical Officer',
    level: 2,
    department_ref: deptA._id,
  })

  const roleB = await Role.create({
    name: 'P21_2_2 Senior Statistical Officer SDRD',
    level: 3,
    department_ref: deptB._id,
  })

  const roleC = await Role.create({
    name: 'P21_2_2 Director National Accounts',
    level: 4,
    department_ref: deptA._id,
  })

  // Setup Competencies
  const comp1 = await Competency.create({
    name: 'P21_2_2 Survey Sampling Methodology',
    competencyCode: 'P21_2_2_COMP1',
    category: 'statistical',
  })

  const comp2 = await Competency.create({
    name: 'P21_2_2 Macroeconomic Aggregates Compilation',
    competencyCode: 'P21_2_2_COMP2',
    category: 'statistical',
  })

  const comp3 = await Competency.create({
    name: 'P21_2_2 Enterprise Survey Analysis',
    competencyCode: 'P21_2_2_COMP3',
    category: 'statistical',
  })

  const comp4 = await Competency.create({
    name: 'P21_2_2 Econometric Modeling & Forecasting',
    competencyCode: 'P21_2_2_COMP4',
    category: 'statistical',
  })

  // RoleCompetencies
  // Role A requires comp1 (req: 3), comp2 (req: 3)
  await RoleCompetency.create({ role_id: roleA._id, competency_id: comp1._id, required_level: 3 })
  await RoleCompetency.create({ role_id: roleA._id, competency_id: comp2._id, required_level: 3 })

  // Role B requires comp3 (req: 4), comp4 (req: 4)
  await RoleCompetency.create({ role_id: roleB._id, competency_id: comp3._id, required_level: 4 })
  await RoleCompetency.create({ role_id: roleB._id, competency_id: comp4._id, required_level: 4 })

  // Role C requires comp2 (req: 5), comp4 (req: 5)
  await RoleCompetency.create({ role_id: roleC._id, competency_id: comp2._id, required_level: 5 })
  await RoleCompetency.create({ role_id: roleC._id, competency_id: comp4._id, required_level: 5 })

  // Setup Users
  const adminUser = await User.create({
    name: 'P21_2_2 Administrator',
    email: `${testPrefix}admin@mospi.gov.in`,
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    role: 'admin',
    employeeId: 'P21-22-ADM-01',
    department: 'Coordination & Admin (CAD)',
    cadre: 'ISS',
    isActive: true,
  })

  const officer1 = await User.create({
    name: 'P21_2_2 Anand Sharma',
    email: `${testPrefix}anand@mospi.gov.in`,
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    role: 'employee',
    employeeId: 'ISS-2022-701',
    department: deptA.name,
    cadre: 'Indian Statistical Service (ISS)',
    role_id: roleA._id,
    designation: roleA.name,
    level: roleA.level,
    isActive: true,
    onboarding_completed: true,
  })

  const officer2 = await User.create({
    name: 'P21_2_2 Meera Nair',
    email: `${testPrefix}meera@mospi.gov.in`,
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    role: 'employee',
    employeeId: 'SSS-2021-304',
    department: deptA.name,
    cadre: 'Subordinate Statistical Service (SSS)',
    role_id: roleA._id,
    designation: roleA.name,
    level: roleA.level,
    isActive: true,
    onboarding_completed: true,
  })

  // Initial assessed competencies for officer1
  await UserCompetency.create({
    user_id: officer1._id,
    competency_id: comp1._id,
    current_level: 2,
    source: 'assessment',
    last_assessed_at: new Date('2026-10-01'),
  })
  await UserCompetency.create({
    user_id: officer1._id,
    competency_id: comp2._id,
    current_level: 2,
    source: 'assessment',
    last_assessed_at: new Date('2026-10-01'),
  })

  // Initial gaps under Role A for officer1
  await computeUserSkillGaps(officer1._id)
  const initialGaps = await SkillGap.find({ user_id: officer1._id, role_id: roleA._id })
  assert(initialGaps.length === 2, `Setup: officer1 has 2 initial gaps under Role A (got: ${initialGaps.length})`)

  // Initial assessed competencies for officer2
  await UserCompetency.create({
    user_id: officer2._id,
    competency_id: comp1._id,
    current_level: 2,
    source: 'assessment',
    last_assessed_at: new Date('2026-10-01'),
  })
  await computeUserSkillGaps(officer2._id)

  // Setup HTTP test server
  const app = require('./src/app')
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port

  function makeRequest(method, reqPath, headers = {}, bodyData = null) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(reqPath, `http://127.0.0.1:${port}`)
      const options = {
        hostname: '127.0.0.1',
        port,
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers,
      }
      if (bodyData) {
        options.headers['Content-Type'] = 'application/json'
      }
      const req = http.request(options, (res) => {
        let respBody = ''
        res.on('data', (chunk) => (respBody += chunk))
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(respBody) })
          } catch {
            resolve({ status: res.statusCode, body: respBody })
          }
        })
      })
      req.on('error', reject)
      if (bodyData) {
        req.write(JSON.stringify(bodyData))
      }
      req.end()
    })
  }

  const adminToken = jwt.sign(
    { id: adminUser._id.toString(), email: adminUser.email, role: 'admin' },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )

  const officer1Token = jwt.sign(
    { id: officer1._id.toString(), email: officer1.email, role: 'employee' },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )

  const officer2Token = jwt.sign(
    { id: officer2._id.toString(), email: officer2.email, role: 'employee' },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // SCENARIO A: Quiz Competency Update Concurrent With Admin Role Reassignment
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SCENARIO A: Quiz Update Concurrent With Admin Reassignment ---')

    // A.1: Simultaneous Promise.all execution between applyCompetencyUpdates() and admin updateUser()
    console.log('\n>> Test A.1: Simultaneous Promise.all Execution (Real Services)')

    // Concurrently trigger quiz improvement on comp2 (improves from level 2 to 4)
    // AND admin reassignment from Role A to Role B
    const [quizResult, adminResult] = await withTimeout(
      Promise.all([
        applyCompetencyUpdates(officer1._id, [comp2._id], 90, new Date()),
        makeRequest(
          'PUT',
          `/api/admin/users/${officer1._id}`,
          { Authorization: `Bearer ${adminToken}` },
          { role_id: roleB._id.toString() }
        ),
      ]),
      15000,
      'Scenario A.1 Promise.all'
    )

    assert(Array.isArray(quizResult) && quizResult.length === 1, `A.1.1: Quiz update returned 1 update record`)
    assert(quizResult[0].newLevel === 4, `A.1.2: Quiz updated comp2 to Level 4 (got: ${quizResult[0].newLevel})`)
    assert(adminResult.status === 200, `A.1.3: Admin reassignment returned HTTP 200 (got: ${adminResult.status})`)
    assert(adminResult.body.syncStatus === 'synced', `A.1.4: Admin response syncStatus is 'synced'`)

    const userAfterA1 = await User.findById(officer1._id)
    assert(
      userAfterA1.role_id.toString() === roleB._id.toString(),
      `A.1.5: Final authoritative role is Role B (got: ${userAfterA1.role_id})`
    )

    // Verify UserCompetency record: comp2 improved to 4, comp1 intact at 2
    const ucComp2 = await UserCompetency.findOne({ user_id: officer1._id, competency_id: comp2._id })
    assert(ucComp2 && ucComp2.current_level === 4, `A.1.6: comp2 UserCompetency preserved at Level 4 (quiz improvement preserved)`)
    assert(ucComp2.source === 'quiz', `A.1.7: comp2 UserCompetency source stamped as 'quiz'`)

    const ucComp1 = await UserCompetency.findOne({ user_id: officer1._id, competency_id: comp1._id })
    assert(ucComp1 && ucComp1.current_level === 2, `A.1.8: Historical comp1 UserCompetency strictly preserved at Level 2`)

    // Verify SkillGap records in database
    const activeGapsA1 = await SkillGap.find({ user_id: officer1._id, role_id: roleB._id })
    assert(activeGapsA1.length === 2, `A.1.9: Exactly 2 active SkillGap records exist for Role B (comps 3 and 4)`)

    // Historical SkillGap records for Role A remain preserved under role_id: roleA
    const historicalGapsA1 = await SkillGap.find({ user_id: officer1._id, role_id: roleA._id })
    assert(
      historicalGapsA1.length === 2,
      `A.1.10: Historical SkillGap records for Role A preserved in DB without cross-role deletion (got: ${historicalGapsA1.length})`
    )

    // Authoritative API projection (GET /api/skill-gaps) strictly projects active Role B
    const apiResA1 = await makeRequest('GET', '/api/skill-gaps', { Authorization: `Bearer ${officer1Token}` })
    assert(apiResA1.status === 200, `A.1.11: GET /api/skill-gaps returns HTTP 200`)
    assert(
      Array.isArray(apiResA1.body.skill_gaps) &&
      apiResA1.body.skill_gaps.length === 2 &&
      apiResA1.body.skill_gaps.every((g) => g.role_id.toString() === roleB._id.toString()),
      `A.1.12: API projection strictly contains gaps for Role B only`
    )
    assert(apiResA1.body.count === 2, `A.1.13: API projection returns strictly 2 gaps for Role B`)
    assert(userAfterA1.needs_skillgap_sync === false, `A.1.14: user.needs_skillgap_sync is false after clean sync`)

    // A.2: Controlled Concurrency Barrier with in-flight lock contention and fresh-state re-read
    console.log('\n>> Test A.2: Controlled Concurrency Barrier (Lock Contention & Re-Read)')

    let barrierRelease = null
    const barrierPromise = new Promise((resolve) => {
      barrierRelease = resolve
    })

    let preCleanupHookTriggered = false
    setPreCleanupHook(async (userId, roleId) => {
      if (String(userId) === String(officer1._id)) {
        preCleanupHookTriggered = true
        // Pause inside calculation before cleanup, holding withUserLock
        await barrierPromise
      }
    })

    // Start operation 1: Admin reassigns from Role B to Role C (acquires lock, pauses at hook)
    const adminOpA2 = makeRequest(
      'PUT',
      `/api/admin/users/${officer1._id}`,
      { Authorization: `Bearer ${adminToken}` },
      { role_id: roleC._id.toString() }
    )

    // Wait briefly for adminOp to acquire lock and hit barrier
    await new Promise((r) => setTimeout(r, 80))
    assert(preCleanupHookTriggered, `A.2.1: Pre-cleanup barrier reached by admin reassignment (holding lock)`)

    // Start operation 2 while lock is held: Quiz update on comp4 (improves from 1 to 4)
    // This MUST enqueue on withUserLock(officer1._id) and cannot bypass the lock
    let quizOpA2Completed = false
    const quizOpA2 = applyCompetencyUpdates(officer1._id, [comp4._id], 90, new Date()).then((res) => {
      quizOpA2Completed = true
      return res
    })

    // Confirm that quiz update is queued and has NOT completed while lock is held
    await new Promise((r) => setTimeout(r, 60))
    assert(!quizOpA2Completed, `A.2.2: Quiz update operation is blocked waiting on withUserLock`)

    // Release barrier so adminOp finishes
    barrierRelease()
    clearPreCleanupHook()

    // Wait for both operations to resolve
    const [resAdminA2, resQuizA2] = await withTimeout(
      Promise.all([adminOpA2, quizOpA2]),
      15000,
      'Scenario A.2 Barrier'
    )

    assert(resAdminA2.status === 200, `A.2.3: Admin reassignment completed successfully (HTTP 200)`)
    assert(resAdminA2.body.syncStatus === 'synced', `A.2.4: Admin syncStatus is 'synced'`)
    assert(Array.isArray(resQuizA2) && resQuizA2.length === 1, `A.2.5: Enqueued quiz update completed cleanly`)
    assert(quizOpA2Completed, `A.2.6: Quiz update completed after lock was released`)

    const userAfterA2 = await User.findById(officer1._id)
    assert(
      userAfterA2.role_id.toString() === roleC._id.toString(),
      `A.2.7: Final role is Role C after serialized execution (got: ${userAfterA2.role_id})`
    )

    // comp4 UserCompetency was updated to Level 4
    const ucComp4 = await UserCompetency.findOne({ user_id: officer1._id, competency_id: comp4._id })
    assert(ucComp4 && ucComp4.current_level === 4, `A.2.8: comp4 UserCompetency recorded at Level 4`)

    // Active SkillGap for Role C: Role C requires comp2 (req: 5) and comp4 (req: 5)
    // comp2 was Level 4 (from Test A.1), so gap is 5 - 4 = 1
    // comp4 was Level 4 (from Test A.2), so gap is 5 - 4 = 1
    const activeGapsA2 = await SkillGap.find({ user_id: officer1._id, role_id: roleC._id })
    assert(activeGapsA2.length === 2, `A.2.9: Exactly 2 active SkillGaps for Role C`)

    const gapComp4 = activeGapsA2.find((g) => g.competency_id.toString() === comp4._id.toString())
    assert(gapComp4 && gapComp4.current_level === 4, `A.2.10: Active gap for comp4 reflects updated level 4`)
    assert(gapComp4.gap === 1, `A.2.11: Gap for comp4 accurately calculated as 5 - 4 = 1 (got: ${gapComp4.gap})`)

    // A.3: Concurrency with deliberate transient failure and truthful deferred recovery
    console.log('\n>> Test A.3: Concurrency with Deliberate Failure & Truthful Recovery')

    // Inject simulated transient failure during calculation
    setPreCleanupHook((userId) => {
      if (String(userId) === String(officer1._id)) {
        throw new Error('Simulated transient calculation failure in cross-service test A.3')
      }
    })

    const failReassignRes = await makeRequest(
      'PUT',
      `/api/admin/users/${officer1._id}`,
      { Authorization: `Bearer ${adminToken}` },
      { role_id: roleA._id.toString() }
    )
    clearPreCleanupHook()

    assert(failReassignRes.status === 200, `A.3.1: Admin reassignment returned HTTP 200 despite calculation failure`)
    assert(failReassignRes.body.syncStatus === 'deferred', `A.3.2: syncStatus is strictly 'deferred' (got: ${failReassignRes.body.syncStatus})`)
    assert(
      failReassignRes.body.syncError.includes('Simulated transient calculation failure'),
      `A.3.3: syncError accurately captures transient failure message`
    )

    const userDeferredA3 = await User.findById(officer1._id)
    assert(userDeferredA3.needs_skillgap_sync === true, `A.3.4: user.needs_skillgap_sync persisted as true`)
    assert(
      userDeferredA3.role_id.toString() === roleA._id.toString(),
      `A.3.5: User.role_id was safely updated to Role A despite deferred calculation`
    )

    // Recovery access via GET /api/skill-gaps
    const recoveryResA3 = await makeRequest('GET', '/api/skill-gaps', { Authorization: `Bearer ${officer1Token}` })
    assert(recoveryResA3.status === 200, `A.3.6: Recovery GET /api/skill-gaps succeeded with 200`)
    assert(
      Array.isArray(recoveryResA3.body.skill_gaps) &&
      recoveryResA3.body.skill_gaps.every((g) => g.role_id.toString() === roleA._id.toString()),
      `A.3.7: Recovery API returned Role A projection`
    )

    const userRecoveredA3 = await User.findById(officer1._id)
    assert(userRecoveredA3.needs_skillgap_sync === false, `A.3.8: needs_skillgap_sync cleared to false after recovery`)
    assert(userRecoveredA3.skillgap_sync_error === null, `A.3.9: skillgap_sync_error reset to null`)

    // ──────────────────────────────────────────────────────────────────────────
    // SCENARIO B: Recovery GET Concurrent With Admin Role Reassignment
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SCENARIO B: Recovery GET Concurrent With Admin Reassignment ---')

    // B.1: Simultaneous Promise.all between GET /api/skill-gaps recovery and admin updateUser()
    console.log('\n>> Test B.1: Simultaneous Promise.all (Recovery GET + Admin Reassignment)')

    // Establish legitimate deferred recovery state for officer2
    await User.updateOne(
      { _id: officer2._id },
      {
        $set: {
          needs_skillgap_sync: true,
          skillgap_sync_error: 'Simulated deferred state for Scenario B.1',
          skillgap_sync_requested_at: new Date(),
        },
      }
    )

    const officer2BeforeB1 = await User.findById(officer2._id)
    assert(officer2BeforeB1.needs_skillgap_sync === true, `B.1.1: officer2 has legitimate recovery state (needs_skillgap_sync: true)`)

    // Concurrently trigger GET /api/skill-gaps (which triggers computeUserSkillGaps)
    // AND admin reassignment from Role A to Role B
    const [recoveryResB1, adminResB1] = await withTimeout(
      Promise.all([
        makeRequest('GET', '/api/skill-gaps', { Authorization: `Bearer ${officer2Token}` }),
        makeRequest(
          'PUT',
          `/api/admin/users/${officer2._id}`,
          { Authorization: `Bearer ${adminToken}` },
          { role_id: roleB._id.toString() }
        ),
      ]),
      15000,
      'Scenario B.1 Promise.all'
    )

    assert(recoveryResB1.status === 200, `B.1.2: Recovery GET returned HTTP 200 (got: ${recoveryResB1.status})`)
    assert(adminResB1.status === 200, `B.1.3: Admin reassignment returned HTTP 200 (got: ${adminResB1.status})`)
    assert(adminResB1.body.syncStatus === 'synced', `B.1.4: Admin reassignment syncStatus is 'synced'`)

    const officer2AfterB1 = await User.findById(officer2._id)
    assert(
      officer2AfterB1.role_id.toString() === roleB._id.toString(),
      `B.1.5: Final authoritative role is Role B (got: ${officer2AfterB1.role_id})`
    )
    assert(officer2AfterB1.needs_skillgap_sync === false, `B.1.6: needs_skillgap_sync is false after full resolution`)

    // Active gaps in DB must match Role B competencies (comp3, comp4)
    const activeGapsB1 = await SkillGap.find({ user_id: officer2._id, role_id: roleB._id })
    assert(activeGapsB1.length === 2, `B.1.7: Exactly 2 active SkillGap records exist for Role B`)

    // Subsequent GET /api/skill-gaps confirms clean active projection
    const checkApiB1 = await makeRequest('GET', '/api/skill-gaps', { Authorization: `Bearer ${officer2Token}` })
    assert(
      Array.isArray(checkApiB1.body.skill_gaps) &&
      checkApiB1.body.skill_gaps.every((g) => g.role_id.toString() === roleB._id.toString()),
      `B.1.8: API projection reflects active Role B`
    )
    assert(checkApiB1.body.count === 2, `B.1.9: API projection count is 2 (no historical leakage)`)

    // B.2: Controlled Concurrency Barrier holding recovery lock while admin reassignment enqueues
    console.log('\n>> Test B.2: Controlled Concurrency Barrier (Recovery Lock Held, Admin Enqueued)')

    // Put officer2 back in deferred state
    await User.updateOne(
      { _id: officer2._id },
      {
        $set: {
          needs_skillgap_sync: true,
          skillgap_sync_error: 'Deferred sync for barrier test B.2',
          skillgap_sync_requested_at: new Date(),
        },
      }
    )

    let barrierB2Release = null
    const barrierB2Promise = new Promise((resolve) => {
      barrierB2Release = resolve
    })

    let recoveryHookTriggered = false
    setPreCleanupHook(async (userId) => {
      if (String(userId) === String(officer2._id)) {
        recoveryHookTriggered = true
        // Pause recovery calculation inside lock
        await barrierB2Promise
      }
    })

    // Start recovery GET (acquires lock, pauses at hook)
    const recoveryOpB2 = makeRequest('GET', '/api/skill-gaps', { Authorization: `Bearer ${officer2Token}` })

    // Wait for recovery GET to acquire lock and hit hook
    await new Promise((r) => setTimeout(r, 80))
    assert(recoveryHookTriggered, `B.2.1: Recovery calculation reached barrier while holding lock`)

    // Start admin reassignment to Role C while recovery holds lock
    let adminB2Completed = false
    const adminOpB2 = makeRequest(
      'PUT',
      `/api/admin/users/${officer2._id}`,
      { Authorization: `Bearer ${adminToken}` },
      { role_id: roleC._id.toString() }
    ).then((res) => {
      adminB2Completed = true
      return res
    })

    // Verify admin operation is blocked waiting on lock
    await new Promise((r) => setTimeout(r, 60))
    assert(!adminB2Completed, `B.2.2: Admin reassignment is blocked waiting on withUserLock`)

    // Release barrier so recovery completes
    barrierB2Release()
    clearPreCleanupHook()

    // Wait for both operations to resolve
    const [resRecoveryB2, resAdminB2] = await withTimeout(
      Promise.all([recoveryOpB2, adminOpB2]),
      15000,
      'Scenario B.2 Barrier'
    )

    assert(resRecoveryB2.status === 200, `B.2.3: Recovery GET completed successfully (HTTP 200)`)
    assert(resAdminB2.status === 200, `B.2.4: Admin reassignment completed successfully (HTTP 200)`)
    assert(resAdminB2.body.syncStatus === 'synced', `B.2.5: Admin syncStatus is 'synced'`)
    assert(adminB2Completed, `B.2.6: Admin reassignment completed after recovery released lock`)

    const officer2FinalB2 = await User.findById(officer2._id)
    assert(
      officer2FinalB2.role_id.toString() === roleC._id.toString(),
      `B.2.7: Final role is Role C after serialized execution (got: ${officer2FinalB2.role_id})`
    )
    assert(officer2FinalB2.needs_skillgap_sync === false, `B.2.8: needs_skillgap_sync is false after full resolution`)

    // Gaps for Role C
    const activeGapsB2 = await SkillGap.find({ user_id: officer2._id, role_id: roleC._id })
    assert(activeGapsB2.length === 2, `B.2.9: Exactly 2 active SkillGaps for Role C`)

    // B.3: Failure Handling During Recovery fails closed without falsely reporting sync
    console.log('\n>> Test B.3: Recovery Failure Handling')

    // Mark user deferred
    await User.updateOne(
      { _id: officer2._id },
      {
        $set: {
          needs_skillgap_sync: true,
          skillgap_sync_error: 'Simulated failure for B.3',
          skillgap_sync_requested_at: new Date(),
        },
      }
    )

    // Hook throws during recovery calculation
    setPreCleanupHook((userId) => {
      if (String(userId) === String(officer2._id)) {
        throw new Error('Persistent failure during recovery calculation')
      }
    })

    const failRecoveryRes = await makeRequest('GET', '/api/skill-gaps', { Authorization: `Bearer ${officer2Token}` })
    clearPreCleanupHook()

    // GET /api/skill-gaps catches compute error defensive baseline and returns HTTP 200 with existing gaps
    assert(failRecoveryRes.status === 200, `B.3.1: GET /api/skill-gaps fails closed gracefully with HTTP 200`)

    // Verify recovery flag remains true (not falsely cleared!)
    const userStillDeferred = await User.findById(officer2._id)
    assert(
      userStillDeferred.needs_skillgap_sync === true,
      `B.3.2: needs_skillgap_sync remains true when recovery calculation throws (not falsely cleared)`
    )

    // Clean up officer2 deferred state
    await User.updateOne(
      { _id: officer2._id },
      { $set: { needs_skillgap_sync: false, skillgap_sync_error: null, skillgap_sync_requested_at: null } }
    )

    // ──────────────────────────────────────────────────────────────────────────
    // INVARIANTS: Historical Data Permanence & Database Isolation
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- INVARIANTS: Historical Data Permanence & Database Isolation ---')

    // I.1: Historical SkillGap records for previous roles are preserved
    const officer1AllGaps = await SkillGap.find({ user_id: officer1._id })
    const officer1RoleIds = [...new Set(officer1AllGaps.map((g) => g.role_id.toString()))]
    assert(
      officer1RoleIds.length >= 2,
      `I.1: officer1 has historical records across multiple roles preserved (roles found: ${officer1RoleIds.length})`
    )

    // I.2: Assessment Data Permanence
    const officer1AllUC = await UserCompetency.find({ user_id: officer1._id })
    assert(officer1AllUC.length >= 2, `I.2: All UserCompetency records for officer1 strictly preserved (found: ${officer1AllUC.length})`)

    // I.3: Post-test Development Database Guardrail
    const devConn2 = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
    const devUserCount2 = await devConn2.collection('users').countDocuments()
    assert(devUserCount2 === 15, `I.3: Development DB (kaushalai) user count remained strictly 15 (actual: ${devUserCount2})`)
    await devConn2.close()

    // Clean test fixtures
    await User.deleteMany({ email: new RegExp(testPrefix) })
    await Department.deleteMany({ code: new RegExp('^P21_2_2_') })
    await Role.deleteMany({ name: new RegExp('^P21_2_2 ') })
    await Competency.deleteMany({ competencyCode: new RegExp('^P21_2_2_') })
    await AuditLog.deleteMany({ 'meta.testSuite': 'part21_2_2_concurrency' })

  } finally {
    clearPreCleanupHook()
    server.close()
    await mongoose.disconnect()
  }

  console.log('===================================================================')
  console.log(`PART 21.2.2 TEST RESULTS: ${totalPassed} Passed, ${totalFailed} Failed`)
  console.log('===================================================================')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal error running Part 21.2.2 test suite:', err)
  process.exit(1)
})
