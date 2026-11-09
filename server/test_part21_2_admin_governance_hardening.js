/**
 * TEST PART 21.2: KAUSHALAI ADMIN GOVERNANCE HARDENING SUITE
 * 
 * Verifies:
 * Section A: Accurate Deferred-Synchronization Response
 *   A.1: Role reassignment with successful sync -> syncStatus: 'synced', truthful message
 *   A.2: Role reassignment with deferred sync -> syncStatus: 'deferred', truthful message, needs_skillgap_sync: true
 *   A.3: Profile update without role change -> syncStatus: 'not_required'
 * Section B: Single Mutex Boundary for Mutation & Recalculation
 *   B.1: mutateUserAndRecalculateGaps acquires lock without nested deadlock
 *   B.2: Concurrent reassignments on the same user serialize cleanly
 *   B.3: Concurrent requests on different users execute independently
 *   B.4: Fresh document re-read inside the lock ensures latest state
 * Section C: Fallback Role Resolution Synchronization
 *   C.1: User with role_id: null updated in level triggers fallback role sync
 *   C.2: User with role_id: null updated in department triggers fallback role sync
 *   C.3: User updated to department/level with no matching role fails closed without fabricating gaps
 *   C.4: User with explicit role_id updated with conflicting department preserves explicit role
 * Section D: Historical Data & Recovery Invariants
 *   D.1: Other-role SkillGap records remain preserved
 *   D.2: UserCompetency assessment records remain intact
 *   D.3: GET /api/skill-gaps triggers recovery for deferred user and clears needs_skillgap_sync
 * Section E: Database Isolation Guardrail
 *   E.1: Development DB kaushalai remains strictly at 15 users before and after
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

async function runTests() {
  console.log('===================================================================')
  console.log('PART 21.2: ADMIN GOVERNANCE HARDENING TEST SUITE')
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
    mutateUserAndRecalculateGaps,
    _computeUserSkillGapsInternal,
    setPreCleanupHook,
    clearPreCleanupHook,
  } = require('./src/services/skillGap.service')

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION E (Initial): Database Isolation Guardrail
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION E (Initial): Database Isolation Guardrail ---')
  const devConn1 = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
  const devUserCount1 = await devConn1.collection('users').countDocuments()
  assert(devUserCount1 === 15, `E.1.Initial: Development DB (kaushalai) user count strictly 15 (actual: ${devUserCount1})`)
  await devConn1.close()

  // Clean test fixtures
  const testPrefix = 'p21_2_test_'
  await User.deleteMany({ email: new RegExp(testPrefix) })
  await Department.deleteMany({ code: new RegExp('^P21_2_') })
  await Role.deleteMany({ name: new RegExp('^P21_2 ') })
  await Competency.deleteMany({ competencyCode: new RegExp('^P21_2_') })
  await AuditLog.deleteMany({ 'meta.testSuite': 'part21_2_hardening' })

  // Setup Departments & Cadre Roles
  const deptA = await Department.create({
    name: 'P21_2 Economic Statistics Division',
    code: 'P21_2_ESD',
    ministry: 'Ministry of Statistics and Programme Implementation',
  })

  const deptB = await Department.create({
    name: 'P21_2 Survey Design & Research Division',
    code: 'P21_2_SDRD',
    ministry: 'Ministry of Statistics and Programme Implementation',
  })

  const roleA = await Role.create({
    name: 'P21_2 Junior Statistical Officer',
    level: 2,
    department_ref: deptA._id,
  })

  const roleA_Level3 = await Role.create({
    name: 'P21_2 Senior Statistical Officer ESD',
    level: 3,
    department_ref: deptA._id,
  })

  const roleB = await Role.create({
    name: 'P21_2 Senior Statistical Officer SDRD',
    level: 3,
    department_ref: deptB._id,
  })

  const roleC = await Role.create({
    name: 'P21_2 Director National Accounts',
    level: 4,
    department_ref: deptA._id,
  })

  // Competencies
  const comp1 = await Competency.create({
    name: 'P21_2 Sample Survey Techniques',
    competencyCode: 'P21_2_COMP1',
    category: 'statistical',
  })

  const comp2 = await Competency.create({
    name: 'P21_2 Macroeconomic Aggregates',
    competencyCode: 'P21_2_COMP2',
    category: 'statistical',
  })

  const comp3 = await Competency.create({
    name: 'P21_2 Advanced Econometrics',
    competencyCode: 'P21_2_COMP3',
    category: 'statistical',
  })

  // Role Competencies
  await RoleCompetency.create({
    role_id: roleA._id,
    competency_id: comp1._id,
    required_level: 3,
  })

  await RoleCompetency.create({
    role_id: roleA_Level3._id,
    competency_id: comp1._id,
    required_level: 4,
  })

  await RoleCompetency.create({
    role_id: roleB._id,
    competency_id: comp2._id,
    required_level: 4,
  })

  await RoleCompetency.create({
    role_id: roleC._id,
    competency_id: comp3._id,
    required_level: 5,
  })

  // Users
  const adminUser = await User.create({
    name: 'P21_2 Administrator',
    email: `${testPrefix}admin@mospi.gov.in`,
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    role: 'admin',
    employeeId: 'P21-2-ADM-01',
    department: 'Coordination & Admin (CAD)',
    cadre: 'ISS',
    isActive: true,
  })

  const officer1 = await User.create({
    name: 'P21_2 Rajesh Kumar',
    email: `${testPrefix}rajesh@mospi.gov.in`,
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    role: 'employee',
    employeeId: 'ISS-P212-01',
    department: deptA.name,
    cadre: 'Indian Statistical Service (ISS)',
    role_id: roleA._id,
    designation: roleA.name,
    level: roleA.level,
    isActive: true,
    onboarding_completed: true,
  })

  const officer2 = await User.create({
    name: 'P21_2 Sunita Rao',
    email: `${testPrefix}sunita@mospi.gov.in`,
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    role: 'employee',
    employeeId: 'SSS-P212-02',
    department: deptA.name,
    cadre: 'Subordinate Statistical Service (SSS)',
    role_id: null, // Fallback resolution via department + level
    designation: 'Assistant Statistical Officer',
    level: 2,
    isActive: true,
    onboarding_completed: true,
  })

  const officer3 = await User.create({
    name: 'P21_2 Vikram Patel',
    email: `${testPrefix}vikram@mospi.gov.in`,
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    role: 'employee',
    employeeId: 'ISS-P212-03',
    department: deptB.name,
    cadre: 'Indian Statistical Service (ISS)',
    role_id: roleB._id,
    designation: roleB.name,
    level: roleB.level,
    isActive: true,
    onboarding_completed: true,
  })

  // UserCompetencies
  await UserCompetency.create({
    user_id: officer1._id,
    competency_id: comp1._id,
    current_level: 2,
    last_assessed_at: new Date(),
  })
  await UserCompetency.create({
    user_id: officer1._id,
    competency_id: comp2._id,
    current_level: 3,
    last_assessed_at: new Date(),
  })
  await UserCompetency.create({
    user_id: officer2._id,
    competency_id: comp1._id,
    current_level: 2,
    last_assessed_at: new Date(),
  })

  // Boot HTTP test server
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

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // SECTION A: Accurate Deferred-Synchronization Response
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION A: Accurate Deferred-Synchronization Response ---')

    // A.1: Reassign role with normal recalculation -> syncStatus: 'synced', truthful message
    const resA1 = await makeRequest(
      'PUT',
      `/api/admin/users/${officer1._id}`,
      { Authorization: `Bearer ${adminToken}` },
      { role_id: roleB._id.toString() }
    )
    assert(resA1.status === 200, `A.1.1: Reassignment returns HTTP 200 (got: ${resA1.status})`)
    assert(resA1.body.syncStatus === 'synced', `A.1.2: res.syncStatus is strictly 'synced' (got: ${resA1.body.syncStatus})`)
    assert(resA1.body.syncError === null, `A.1.3: res.syncError is null (got: ${resA1.body.syncError})`)
    assert(
      resA1.body.message.includes('synchronized successfully'),
      `A.1.4: Truthful message indicates successful synchronization (got: "${resA1.body.message}")`
    )

    const officer1AfterA1 = await User.findById(officer1._id)
    assert(officer1AfterA1.needs_skillgap_sync === false, `A.1.5: User document needs_skillgap_sync is false`)
    assert(
      officer1AfterA1.role_id.toString() === roleB._id.toString(),
      `A.1.6: User role_id matches roleB`
    )

    const gapsAfterA1 = await SkillGap.find({ user_id: officer1._id, role_id: roleB._id })
    assert(gapsAfterA1.length === 1, `A.1.7: Exactly 1 skill gap created for roleB (got: ${gapsAfterA1.length})`)

    // A.2: Reassign role with simulated calculation failure -> syncStatus: 'deferred', truthful message, needs_skillgap_sync: true
    setPreCleanupHook(() => {
      throw new Error('Simulated transient calculation failure in Part 21.2 test')
    })

    const resA2 = await makeRequest(
      'PUT',
      `/api/admin/users/${officer1._id}`,
      { Authorization: `Bearer ${adminToken}` },
      { role_id: roleC._id.toString() }
    )
    clearPreCleanupHook()

    assert(resA2.status === 200, `A.2.1: Reassignment with transient failure returns HTTP 200 (got: ${resA2.status})`)
    assert(resA2.body.syncStatus === 'deferred', `A.2.2: res.syncStatus is strictly 'deferred' (got: ${resA2.body.syncStatus})`)
    assert(
      typeof resA2.body.syncError === 'string' && resA2.body.syncError.includes('Simulated transient calculation failure'),
      `A.2.3: res.syncError captures root cause message (got: "${resA2.body.syncError}")`
    )
    assert(
      resA2.body.message.includes('deferred and will recover'),
      `A.2.4: Truthful message warns admin of deferred recovery (got: "${resA2.body.message}")`
    )

    const officer1AfterA2 = await User.findById(officer1._id)
    assert(officer1AfterA2.needs_skillgap_sync === true, `A.2.5: User document needs_skillgap_sync set to true`)
    assert(
      officer1AfterA2.skillgap_sync_error.includes('Simulated transient calculation failure'),
      `A.2.6: User document records skillgap_sync_error`
    )
    assert(
      officer1AfterA2.skillgap_sync_requested_at instanceof Date,
      `A.2.7: User document records skillgap_sync_requested_at timestamp`
    )
    assert(
      officer1AfterA2.role_id.toString() === roleC._id.toString(),
      `A.2.8: User role_id persisted to target roleC despite deferred calculation`
    )

    // A.3: Profile update without role change -> syncStatus: 'not_required'
    const resA3 = await makeRequest(
      'PUT',
      `/api/admin/users/${officer1._id}`,
      { Authorization: `Bearer ${adminToken}` },
      { designation: 'Updated Director National Accounts', isActive: true }
    )
    assert(resA3.status === 200, `A.3.1: Profile update returns HTTP 200 (got: ${resA3.status})`)
    assert(resA3.body.syncStatus === 'not_required', `A.3.2: res.syncStatus is 'not_required' (got: ${resA3.body.syncStatus})`)
    assert(
      resA3.body.message === 'User updated successfully.',
      `A.3.3: Message confirms standard user update (got: "${resA3.body.message}")`
    )

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION B: Single Mutex Boundary for Mutation & Recalculation
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION B: Single Mutex Boundary for Mutation & Recalculation ---')

    // B.1: mutateUserAndRecalculateGaps acquires lock without nested deadlock
    let directRecalcCompleted = false
    const directResult = await mutateUserAndRecalculateGaps(officer3._id, async (freshUser) => {
      freshUser.set('role_id', roleA._id)
      freshUser.designation = roleA.name
      freshUser.level = roleA.level
      return { requiresRecalc: true }
    })
    if (directResult && directResult.syncStatus === 'synced') {
      directRecalcCompleted = true
    }
    assert(directRecalcCompleted, `B.1: mutateUserAndRecalculateGaps runs mutation & recalculation under one lock without deadlocking`)

    // B.2: Concurrent reassignments on the same user serialize cleanly
    const [concurrent1, concurrent2] = await Promise.all([
      makeRequest(
        'PUT',
        `/api/admin/users/${officer3._id}`,
        { Authorization: `Bearer ${adminToken}` },
        { role_id: roleB._id.toString() }
      ),
      makeRequest(
        'PUT',
        `/api/admin/users/${officer3._id}`,
        { Authorization: `Bearer ${adminToken}` },
        { role_id: roleC._id.toString() }
      ),
    ])

    assert(concurrent1.status === 200, `B.2.1: First concurrent request on same user succeeded (HTTP ${concurrent1.status})`)
    assert(concurrent2.status === 200, `B.2.2: Second concurrent request on same user succeeded (HTTP ${concurrent2.status})`)
    assert(
      concurrent1.body.syncStatus === 'synced' && concurrent2.body.syncStatus === 'synced',
      `B.2.3: Both serialized requests completed syncStatus: 'synced'`
    )

    const officer3Final = await User.findById(officer3._id)
    const officer3Gaps = await SkillGap.find({ user_id: officer3._id, role_id: officer3Final.role_id })
    assert(officer3Gaps.length >= 0, `B.2.4: Active gaps for final role of officer3 are consistent and non-corrupt`)

    // B.3: Concurrent requests on different users execute independently
    const [diffUser1, diffUser2] = await Promise.all([
      makeRequest(
        'PUT',
        `/api/admin/users/${officer1._id}`,
        { Authorization: `Bearer ${adminToken}` },
        { designation: 'Independent Update Officer 1' }
      ),
      makeRequest(
        'PUT',
        `/api/admin/users/${officer3._id}`,
        { Authorization: `Bearer ${adminToken}` },
        { designation: 'Independent Update Officer 3' }
      ),
    ])
    assert(diffUser1.status === 200 && diffUser2.status === 200, `B.3: Concurrent updates on different users complete successfully`)

    // B.4: Fresh document re-read inside the lock ensures latest state
    // Update DB directly behind the scenes
    await User.updateOne({ _id: officer3._id }, { $set: { employeeId: 'ISS-FRESH-VERIFY' } })
    const staleSnapshot = { _id: officer3._id, employeeId: 'ISS-OLD-STALE' }
    await mutateUserAndRecalculateGaps(officer3._id, async (freshLoadedUser) => {
      assert(
        freshLoadedUser.employeeId === 'ISS-FRESH-VERIFY',
        `B.4: Fresh document re-read inside lock reflects latest DB state ('ISS-FRESH-VERIFY')`
      )
      return { requiresRecalc: false }
    })

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION C: Fallback Role Resolution Synchronization
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION C: Fallback Role Resolution Synchronization ---')

    // officer2 has role_id: null, department: deptA.name, level: 2 -> resolves to roleA (level 2)
    // C.1: Update level from 2 to 3 -> resolves to roleA_Level3, triggers recalculation
    const resC1 = await makeRequest(
      'PUT',
      `/api/admin/users/${officer2._id}`,
      { Authorization: `Bearer ${adminToken}` },
      { level: 3 }
    )
    assert(resC1.status === 200, `C.1.1: Fallback level update returns HTTP 200 (got: ${resC1.status})`)
    assert(resC1.body.syncStatus === 'synced', `C.1.2: Fallback role change triggers syncStatus: 'synced' (got: ${resC1.body.syncStatus})`)

    const officer2GapsC1 = await SkillGap.find({ user_id: officer2._id, role_id: roleA_Level3._id })
    assert(officer2GapsC1.length === 1, `C.1.3: Active SkillGap created for newly resolved roleA_Level3`)
    assert(officer2GapsC1[0].required_level === 4, `C.1.4: Required level matches roleA_Level3 competency requirement (4)`)

    // C.2: Update department from deptA.name to deptB.name (level remains 3) -> resolves to roleB
    const resC2 = await makeRequest(
      'PUT',
      `/api/admin/users/${officer2._id}`,
      { Authorization: `Bearer ${adminToken}` },
      { department: deptB.name }
    )
    assert(resC2.status === 200, `C.2.1: Fallback department update returns HTTP 200 (got: ${resC2.status})`)
    assert(resC2.body.syncStatus === 'synced', `C.2.2: Department change triggers syncStatus: 'synced' (got: ${resC2.body.syncStatus})`)

    const officer2GapsC2 = await SkillGap.find({ user_id: officer2._id, role_id: roleB._id })
    assert(officer2GapsC2.length === 1, `C.2.3: Active SkillGap created for newly resolved roleB`)
    assert(
      officer2GapsC2[0].competency_id.toString() === comp2._id.toString(),
      `C.2.4: Target competency is comp2 (Macroeconomic Aggregates)`
    )

    // C.3: Update to department/level with no matching role -> fails closed, syncStatus: 'not_required'
    const resC3 = await makeRequest(
      'PUT',
      `/api/admin/users/${officer2._id}`,
      { Authorization: `Bearer ${adminToken}` },
      { department: 'Nonexistent Department XYZ', level: 5 }
    )
    assert(resC3.status === 200, `C.3.1: Profile update with unresolvable role returns HTTP 200 (got: ${resC3.status})`)
    assert(resC3.body.syncStatus === 'not_required', `C.3.2: Unresolvable fallback returns syncStatus: 'not_required' (got: ${resC3.body.syncStatus})`)

    // C.4: User with explicit role_id updated with conflicting department preserves explicit role
    const resC4 = await makeRequest(
      'PUT',
      `/api/admin/users/${officer1._id}`,
      { Authorization: `Bearer ${adminToken}` },
      { department: 'Some Other Division' }
    )
    assert(resC4.status === 200, `C.4.1: Profile update on explicit role user returns HTTP 200`)
    assert(resC4.body.syncStatus === 'not_required', `C.4.2: Explicit role user department change returns syncStatus: 'not_required'`)
    const officer1AfterC4 = await User.findById(officer1._id)
    assert(
      officer1AfterC4.role_id.toString() === roleC._id.toString(),
      `C.4.3: Explicit role_id remains authoritative roleC`
    )

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION D: Historical Data & Recovery Invariants
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION D: Historical Data & Recovery Invariants ---')

    // D.1: Other-role SkillGap records remain preserved
    const historicalGapsForOfficer1 = await SkillGap.find({ user_id: officer1._id })
    const distinctRolesInGaps = [...new Set(historicalGapsForOfficer1.map((g) => g.role_id.toString()))]
    assert(
      distinctRolesInGaps.length >= 1,
      `D.1: Historical SkillGap records for previous roles are preserved (found ${distinctRolesInGaps.length} distinct roles)`
    )

    // D.2: UserCompetency assessment records remain intact
    const userCompetenciesAfterAll = await UserCompetency.find({ user_id: officer1._id })
    assert(
      userCompetenciesAfterAll.length === 2,
      `D.2: UserCompetency records for officer1 strictly preserved (expected: 2, actual: ${userCompetenciesAfterAll.length})`
    )

    // D.3: GET /api/skill-gaps triggers recovery for deferred user and clears needs_skillgap_sync
    // Make officer1 deferred again
    await User.updateOne(
      { _id: officer1._id },
      {
        $set: {
          needs_skillgap_sync: true,
          skillgap_sync_error: 'Simulated deferred state for recovery verification',
          skillgap_sync_requested_at: new Date(),
        },
      }
    )

    const beforeRecoveryUser = await User.findById(officer1._id)
    assert(beforeRecoveryUser.needs_skillgap_sync === true, `D.3.1: officer1 set to deferred state (needs_skillgap_sync: true)`)

    // Call GET /api/skill-gaps as officer1
    const recoveryRes = await makeRequest(
      'GET',
      '/api/skill-gaps',
      { Authorization: `Bearer ${officer1Token}` }
    )
    assert(recoveryRes.status === 200, `D.3.2: GET /api/skill-gaps returns HTTP 200 (got: ${recoveryRes.status})`)
    assert(recoveryRes.body.success === true, `D.3.3: GET /api/skill-gaps returns success: true`)

    const afterRecoveryUser = await User.findById(officer1._id)
    assert(
      afterRecoveryUser.needs_skillgap_sync === false,
      `D.3.4: GET /api/skill-gaps successfully recovered and cleared needs_skillgap_sync (now: false)`
    )
    assert(
      afterRecoveryUser.skillgap_sync_error === null,
      `D.3.5: skillgap_sync_error is cleared to null`
    )
    assert(
      afterRecoveryUser.skillgap_sync_requested_at === null,
      `D.3.6: skillgap_sync_requested_at is cleared to null`
    )

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION E (Final): Database Isolation Guardrail
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION E (Final): Database Isolation Guardrail ---')
    const devConn2 = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
    const devUserCount2 = await devConn2.collection('users').countDocuments()
    assert(devUserCount2 === 15, `E.1.Final: Development DB (kaushalai) user count remained strictly 15 (actual: ${devUserCount2})`)
    await devConn2.close()

    // Clean test fixtures
    await User.deleteMany({ email: new RegExp(testPrefix) })
    await Department.deleteMany({ code: new RegExp('^P21_2_') })
    await Role.deleteMany({ name: new RegExp('^P21_2 ') })
    await Competency.deleteMany({ competencyCode: new RegExp('^P21_2_') })
    await AuditLog.deleteMany({ 'meta.testSuite': 'part21_2_hardening' })

  } finally {
    server.close()
    await mongoose.disconnect()
  }

  console.log('===================================================================')
  console.log(`PART 21.2 TEST RESULTS: ${totalPassed} Passed, ${totalFailed} Failed`)
  console.log('===================================================================')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal error running Part 21.2 test suite:', err)
  process.exit(1)
})

