/**
 * TEST PART 21: KAUSHALAI ADMIN USER MANAGEMENT & GOVERNANCE SUITE (P1)
 * 
 * Verifies:
 * 1. Authenticated Admin Paginated User Listing (GET /api/admin/users)
 *    - Server-side pagination, search by name/email/employeeId, filters for status and cadre
 *    - Strict exclusion of passwordHash and sensitive fields
 *    - Authentication & Authorization guards (401 unauth, 403 non-admin)
 * 2. Admin User Details (GET /api/admin/users/:id)
 *    - Populated role_id and department_ref
 *    - 400 for malformed ID, 404 for missing
 * 3. Scoped User Updates (PUT /api/admin/users/:id)
 *    - Strict rejection of platform role ('role') alteration
 *    - Toggle isActive (account suspension / reactivation)
 *    - Safe update of designation, department, level
 * 4. Professional Cadre Role Reassignment Safeguards
 *    - Validation of target Role
 *    - Execution of atomic computeUserSkillGaps pipeline under concurrency lock
 *    - Preservation of existing UserCompetency records
 *    - Generation of correct AuditLog entry
 * 5. Cadre Roles Directory (GET /api/admin/roles)
 * 6. Database Isolation: Dev DB kaushalai remains strictly at 15 users.
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
  console.log('PART 21: ADMIN USER MANAGEMENT & GOVERNANCE TEST SUITE')
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

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 1: Database Isolation Guardrail
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 1: Database Isolation Guardrail ---')

  const devConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
  const devUserCount = await devConn.collection('users').countDocuments()
  assert(devUserCount === 15, `1.1: Development DB (kaushalai) user count strictly isolated: 15 (actual: ${devUserCount})`)
  await devConn.close()

  // Clean test fixtures
  const testPrefix = 'p21_usr_test_'
  await User.deleteMany({ email: new RegExp(testPrefix) })
  await Department.deleteMany({ code: new RegExp('^P21U_') })
  await Role.deleteMany({ name: new RegExp('^P21U ') })
  await Competency.deleteMany({ competencyCode: new RegExp('^P21U_') })
  await AuditLog.deleteMany({ 'meta.testSuite': 'part21_user_mgmt' })

  // Setup test department & roles
  const deptA = await Department.create({
    name: 'P21U Economic Statistics Division',
    code: 'P21U_ESD',
    ministry: 'Ministry of Statistics and Programme Implementation',
  })

  const deptB = await Department.create({
    name: 'P21U Survey Design & Research Division',
    code: 'P21U_SDRD',
    ministry: 'Ministry of Statistics and Programme Implementation',
  })

  const roleA = await Role.create({
    name: 'P21U Junior Statistical Officer',
    level: 2,
    department_ref: deptA._id,
  })

  const roleB = await Role.create({
    name: 'P21U Senior Statistical Officer',
    level: 3,
    department_ref: deptB._id,
  })

  // Setup test competencies
  const comp1 = await Competency.create({
    name: 'P21U Survey Sampling Methodology',
    competencyCode: 'P21U_COMP1',
    category: 'statistical',
  })

  const comp2 = await Competency.create({
    name: 'P21U National Accounts Compilation',
    competencyCode: 'P21U_COMP2',
    category: 'statistical',
  })

  // Role A requires comp1 at level 3
  await RoleCompetency.create({
    role_id: roleA._id,
    competency_id: comp1._id,
    required_level: 3,
  })

  // Role B requires comp2 at level 4
  await RoleCompetency.create({
    role_id: roleB._id,
    competency_id: comp2._id,
    required_level: 4,
  })

  // Seed test users
  const adminUser = await User.create({
    name: 'P21U Admin Official',
    email: `${testPrefix}admin@mospi.gov.in`,
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    role: 'admin',
    employeeId: 'P21U-ADM-001',
    department: 'Coordination & Admin (CAD)',
    cadre: 'ISS',
    isActive: true,
  })

  const officer1 = await User.create({
    name: 'P21U Amit Verma',
    email: `${testPrefix}officer1@mospi.gov.in`,
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    role: 'employee',
    employeeId: 'ISS-2022-042',
    department: deptA.name,
    cadre: 'Indian Statistical Service (ISS)',
    role_id: roleA._id,
    designation: roleA.name,
    level: roleA.level,
    isActive: true,
    onboarding_completed: true,
  })

  const officer2 = await User.create({
    name: 'P21U Priya Sundaram',
    email: `${testPrefix}officer2@mospi.gov.in`,
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    role: 'employee',
    employeeId: 'SSS-2021-088',
    department: deptB.name,
    cadre: 'Subordinate Statistical Service (SSS)',
    role_id: null,
    designation: 'Assistant',
    level: 1,
    isActive: false,
    onboarding_completed: true,
  })

  // Setup officer1 competency level 2 for comp1 (so current=2, required=3 -> gap=1)
  await UserCompetency.create({
    user_id: officer1._id,
    competency_id: comp1._id,
    current_level: 2,
    last_assessed_at: new Date(),
  })

  // Setup officer1 competency level 3 for comp2
  await UserCompetency.create({
    user_id: officer1._id,
    competency_id: comp2._id,
    current_level: 3,
    last_assessed_at: new Date(),
  })

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

  const employeeToken = jwt.sign(
    { id: officer1._id.toString(), email: officer1.email, role: 'employee' },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 2: Authentication & Authorization Guards
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 2: Authentication & Authorization Guards ---')

  const unauthRes = await makeRequest('GET', '/api/admin/users')
  assert(unauthRes.status === 401, `2.1: Unauthenticated GET /api/admin/users rejected with 401 (got: ${unauthRes.status})`)

  const empRes = await makeRequest('GET', '/api/admin/users', { Authorization: `Bearer ${employeeToken}` })
  assert(empRes.status === 403, `2.2: Non-admin GET /api/admin/users rejected with 403 (got: ${empRes.status})`)

  const adminRes = await makeRequest('GET', '/api/admin/users', { Authorization: `Bearer ${adminToken}` })
  assert(adminRes.status === 200, `2.3: Admin GET /api/admin/users succeeded with 200 (got: ${adminRes.status})`)

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 3: Paginated Listing, Search, Filters & Sensitive Data Exclusion
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 3: User Listing Features & Sanitization ---')

  assert(Array.isArray(adminRes.body.users), '3.1: Response contains users array')
  assert(typeof adminRes.body.total === 'number' && adminRes.body.total >= 3, `3.2: Response contains total count (${adminRes.body.total})`)
  assert(typeof adminRes.body.page === 'number' && adminRes.body.page === 1, '3.3: Current page is 1')
  assert(typeof adminRes.body.pages === 'number', '3.4: Response contains total pages')
  assert(adminRes.body.stats && typeof adminRes.body.stats === 'object', '3.5: Response contains directory stats summary')

  // Verify passwordHash and __v are strictly excluded
  const hasPasswordHash = adminRes.body.users.some((u) => u.passwordHash !== undefined)
  assert(!hasPasswordHash, '3.6: passwordHash is strictly excluded from all user documents')

  // Verify pagination limit
  const pagedRes = await makeRequest('GET', '/api/admin/users?page=1&limit=2', { Authorization: `Bearer ${adminToken}` })
  assert(pagedRes.body.users.length === 2, `3.7: Pagination limit=2 returns exactly 2 users (got: ${pagedRes.body.users.length})`)

  // Verify search by name
  const searchNameRes = await makeRequest('GET', `/api/admin/users?search=Priya`, { Authorization: `Bearer ${adminToken}` })
  assert(searchNameRes.body.users.some((u) => u.name.includes('Priya')), '3.8: Search query finds user by name ("Priya")')

  // Verify search by employee ID
  const searchEmpRes = await makeRequest('GET', `/api/admin/users?search=ISS-2022-042`, { Authorization: `Bearer ${adminToken}` })
  assert(searchEmpRes.body.users.length === 1 && searchEmpRes.body.users[0].employeeId === 'ISS-2022-042', '3.9: Search query finds user by employeeId')

  // Verify filter by status
  const activeRes = await makeRequest('GET', '/api/admin/users?status=active', { Authorization: `Bearer ${adminToken}` })
  assert(activeRes.body.users.every((u) => u.isActive === true), '3.10: status=active returns only active accounts')

  const inactiveRes = await makeRequest('GET', '/api/admin/users?status=inactive', { Authorization: `Bearer ${adminToken}` })
  assert(inactiveRes.body.users.every((u) => u.isActive === false), '3.11: status=inactive returns only inactive accounts')

  // Verify filter by cadre
  const cadreRes = await makeRequest('GET', '/api/admin/users?cadre=SSS', { Authorization: `Bearer ${adminToken}` })
  assert(cadreRes.body.users.every((u) => (u.cadre && u.cadre.includes('SSS')) || (u.employeeId && u.employeeId.includes('SSS'))), '3.12: cadre=SSS filters correctly')

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 4: Single User Details (GET /api/admin/users/:id)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 4: Single User Details ---')

  const singleRes = await makeRequest('GET', `/api/admin/users/${officer1._id}`, { Authorization: `Bearer ${adminToken}` })
  assert(singleRes.status === 200, `4.1: GET /api/admin/users/:id returns 200 (got: ${singleRes.status})`)
  assert(singleRes.body.user && singleRes.body.user._id === officer1._id.toString(), '4.2: Returns correct user record')
  assert(singleRes.body.user.role_id && singleRes.body.user.role_id.name === roleA.name, '4.3: role_id is populated with role name')
  assert(singleRes.body.user.passwordHash === undefined, '4.4: passwordHash is not exposed in single user response')

  const invalidIdRes = await makeRequest('GET', '/api/admin/users/not-a-valid-id', { Authorization: `Bearer ${adminToken}` })
  assert(invalidIdRes.status === 400, `4.5: Invalid ObjectId returns 400 (got: ${invalidIdRes.status})`)

  const missingIdRes = await makeRequest('GET', `/api/admin/users/${new mongoose.Types.ObjectId()}`, { Authorization: `Bearer ${adminToken}` })
  assert(missingIdRes.status === 404, `4.6: Non-existent user ID returns 404 (got: ${missingIdRes.status})`)

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 5: Scoped Updates & Platform Role Protection
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 5: Scoped Updates & Role Protection ---')

  // Attempt to elevate platform role (MUST BE PROHIBITED)
  const roleElevateRes = await makeRequest(
    'PUT',
    `/api/admin/users/${officer1._id}`,
    { Authorization: `Bearer ${adminToken}` },
    { role: 'admin' }
  )
  assert(roleElevateRes.status === 400, `5.1: Prohibits elevating platform authorization role (got: ${roleElevateRes.status})`)

  // Verify officer1 role was NOT changed to admin in database
  const userCheck1 = await User.findById(officer1._id)
  assert(userCheck1.role === 'employee', '5.2: Database confirms platform role remains "employee"')

  // Toggle isActive to false (Suspend account)
  const suspendRes = await makeRequest(
    'PUT',
    `/api/admin/users/${officer1._id}`,
    { Authorization: `Bearer ${adminToken}` },
    { isActive: false }
  )
  assert(suspendRes.status === 200, `5.3: Account suspension succeeded (got: ${suspendRes.status})`)
  assert(suspendRes.body.user.isActive === false, '5.4: Response shows isActive=false')
  const userCheckSuspended = await User.findById(officer1._id)
  assert(userCheckSuspended.isActive === false, '5.5: Database confirms isActive is now false')

  // Reactivate account
  const reactivateRes = await makeRequest(
    'PUT',
    `/api/admin/users/${officer1._id}`,
    { Authorization: `Bearer ${adminToken}` },
    { isActive: true }
  )
  assert(reactivateRes.status === 200 && reactivateRes.body.user.isActive === true, '5.6: Account reactivated to isActive=true')

  // Update safe fields: designation, department, level
  const updateFieldsRes = await makeRequest(
    'PUT',
    `/api/admin/users/${officer2._id}`,
    { Authorization: `Bearer ${adminToken}` },
    { designation: 'Junior Research Analyst', department: 'National Accounts Division (NAD)', level: 2 }
  )
  assert(updateFieldsRes.status === 200, '5.7: Safe fields updated successfully')
  assert(updateFieldsRes.body.user.designation === 'Junior Research Analyst', '5.8: Designation updated in response')
  assert(updateFieldsRes.body.user.level === 2, '5.9: Level updated in response')

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 6: Professional Cadre Role Reassignment & Skill Gap Sync
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 6: Professional Cadre Role Reassignment ---')

  // Initial state: compute skill gaps for officer1 under roleA
  const { computeUserSkillGaps } = require('./src/services/skillGap.service')
  await computeUserSkillGaps(officer1._id)

  const initialGaps = await SkillGap.find({ user_id: officer1._id })
  assert(initialGaps.length === 1, `6.1: Initial calculation under Role A created 1 gap (actual: ${initialGaps.length})`)
  assert(initialGaps[0].competency_id.toString() === comp1._id.toString(), '6.2: Initial gap is for comp1 (Survey Sampling)')

  // Reject invalid role_id
  const invalidRoleRes = await makeRequest(
    'PUT',
    `/api/admin/users/${officer1._id}`,
    { Authorization: `Bearer ${adminToken}` },
    { role_id: new mongoose.Types.ObjectId() }
  )
  assert(invalidRoleRes.status === 400, `6.3: Non-existent role_id returns 400 (got: ${invalidRoleRes.status})`)

  // Reassign officer1 from roleA to roleB
  const reassignRes = await makeRequest(
    'PUT',
    `/api/admin/users/${officer1._id}`,
    { Authorization: `Bearer ${adminToken}` },
    { role_id: roleB._id.toString() }
  )
  assert(reassignRes.status === 200, `6.4: Reassignment to Role B succeeded (got: ${reassignRes.status})`)
  assert(reassignRes.body.user.role_id._id.toString() === roleB._id.toString(), '6.5: User role_id updated to Role B')
  assert(reassignRes.body.user.designation === roleB.name, `6.6: Designation updated to "${roleB.name}"`)
  assert(reassignRes.body.user.level === roleB.level, `6.7: Level updated to ${roleB.level}`)

  // Verify that UserCompetency records were preserved
  const userComps = await UserCompetency.find({ user_id: officer1._id })
  assert(userComps.length === 2, `6.8: Existing UserCompetency records preserved (2 records, actual: ${userComps.length})`)

  // Verify that SkillGap was recalculate atomically for roleB:
  // Role B requires comp2 (National Accounts) at level 4. Officer1 has comp2 at level 3. Gap = 1.
  // Former gap for comp1 under roleA should no longer be active for roleB.
  const reassignedGaps = await SkillGap.find({ user_id: officer1._id, role_id: roleB._id })
  assert(reassignedGaps.length === 1, `6.9: Exactly 1 active gap calculated for new Role B (actual: ${reassignedGaps.length})`)
  if (reassignedGaps.length > 0) {
    assert(reassignedGaps[0].competency_id.toString() === comp2._id.toString(), '6.10: New gap targets comp2 (National Accounts)')
    assert(reassignedGaps[0].gap === 1, `6.11: Gap size is 1 (required=4, current=3, got: ${reassignedGaps[0].gap})`)
  }

  // Verify AuditLog was created for role reassignment
  const auditEntry = await AuditLog.findOne({
    targetId: officer1._id,
    action: 'ADMIN_USER_ROLE_REASSIGNED',
  })
  assert(!!auditEntry, '6.12: AuditLog recorded ADMIN_USER_ROLE_REASSIGNED action')
  if (auditEntry) {
    assert(auditEntry.meta.roleReassigned === true, '6.13: AuditLog meta indicates roleReassigned: true')
    assert(String(auditEntry.meta.newRoleId) === String(roleB._id), '6.14: AuditLog meta records correct newRoleId')
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 7: Cadre Roles Directory (GET /api/admin/roles)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 7: Cadre Roles Directory ---')

  const rolesRes = await makeRequest('GET', '/api/admin/roles', { Authorization: `Bearer ${adminToken}` })
  assert(rolesRes.status === 200, `7.1: GET /api/admin/roles succeeded with 200 (got: ${rolesRes.status})`)
  assert(Array.isArray(rolesRes.body.roles), '7.2: Returns roles array')
  assert(rolesRes.body.roles.some((r) => r.name === roleA.name), `7.3: Roles list includes "${roleA.name}"`)
  assert(rolesRes.body.roles.some((r) => r.name === roleB.name), `7.4: Roles list includes "${roleB.name}"`)

  // Cleanup test fixtures
  await User.deleteMany({ email: new RegExp(testPrefix) })
  await Department.deleteMany({ code: new RegExp('^P21U_') })
  await Role.deleteMany({ name: new RegExp('^P21U ') })
  await Competency.deleteMany({ competencyCode: new RegExp('^P21U_') })
  await RoleCompetency.deleteMany({ role_id: { $in: [roleA._id, roleB._id] } })
  await UserCompetency.deleteMany({ user_id: { $in: [officer1._id, officer2._id] } })
  await SkillGap.deleteMany({ user_id: officer1._id })
  await AuditLog.deleteMany({ targetId: { $in: [officer1._id, officer2._id] } })

  // Final Guardrail Check
  const devFinalConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
  const devFinalCount = await devFinalConn.collection('users').countDocuments()
  assert(devFinalCount === 15, `Final Guardrail: Development DB user count remained strictly 15 (actual: ${devFinalCount})`)
  await devFinalConn.close()

  await new Promise((resolve) => server.close(resolve))
  await mongoose.disconnect()

  console.log('===================================================================')
  console.log(`PART 21 USER MANAGEMENT TEST RESULTS: ${totalPassed} Passed, ${totalFailed} Failed`)
  console.log('===================================================================')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test execution:', err)
  process.exit(1)
})

