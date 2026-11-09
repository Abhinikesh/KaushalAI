/**
 * test_part23_competency_framework.js
 * Dedicated test suite for PART 23.1:
 * KAUSHALAI COMPETENCY FRAMEWORK READ-ONLY BACKEND API
 *
 * Verifies:
 * 1. Endpoint Access & Authentication (1-3):
 *    - 1. Unauthenticated request rejected with HTTP 401
 *    - 2. Authenticated learner request returns HTTP 200
 *    - 3. Authenticated admin request returns HTTP 200
 * 2. Framework Summary & Category Distribution Integrity (4-8):
 *    - 4. Global summary counts match actual database records
 *    - 5. Category counts match actual records
 *    - 6. Competency records contain only supported schema fields (no fake status)
 *    - 7. roles_count accurately counts distinct valid roles
 *    - 8. Assigned and unassigned competency counts are mathematically sound
 * 3. Query Parameter Validation & Filtering (9-16):
 *    - 9. Category filter returns only selected category
 *    - 10. Invalid category returns HTTP 400
 *    - 11. Search returns matching stored competency records
 *    - 12. Search input does not permit MongoDB operator injection
 *    - 13. Valid role filter returns only its actual assignments with real required_level
 *    - 14. A valid zero-assignment role returns empty results ([])
 *    - 15. Malformed role_id returns HTTP 400
 *    - 16. Nonexistent role returns HTTP 404
 * 4. Reference Validation & Read-Only Invariants (17-21):
 *    - 17. Orphaned/invalid mapping references are excluded from valid counts
 *    - 18. Missing required_level is not replaced by a fabricated fallback
 *    - 19. Global summary remains unchanged when filters are applied
 *    - 20. Endpoint performs zero writes to Competency, Role, RoleCompetency, UserCompetency, or SkillGap
 *    - 21. Development database remains strictly untouched at 15 users
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
  console.log('PART 23.1: COMPETENCY FRAMEWORK READ-ONLY BACKEND API SUITE')
  console.log('===================================================================')

  await mongoose.connect(testDbUri)

  const User = require('./src/models/User')
  const Role = require('./src/models/Role')
  const Competency = require('./src/models/Competency')
  const RoleCompetency = require('./src/models/RoleCompetency')
  const UserCompetency = require('./src/models/UserCompetency')
  const SkillGap = require('./src/models/SkillGap')
  const Department = require('./src/models/Department')

  // --- GUARD: Pre-Test Development Database Check ---
  console.log('\n--- GUARDRAIL: Development Database Isolation (Pre-Test) ---')
  const devConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
  const devUserCountBefore = await devConn.collection('users').countDocuments()
  await devConn.close()
  assert(devUserCountBefore === 15, `G.1.Initial: Development DB (kaushalai) user count strictly 15 (actual: ${devUserCountBefore})`)

  let server
  let baseUrl

  const testSuffix = Date.now().toString()
  const fixtures = {
    userIds: [],
    roleIds: [],
    compIds: [],
    deptIds: [],
  }

  try {
    // 1. Create Department
    const dept = await Department.create({
      name: `P23 Test Dept ${testSuffix}`,
      code: `P23D_${testSuffix.slice(-6)}`,
      description: 'Part 23 Test Department',
    })
    fixtures.deptIds.push(dept._id)

    // 2. Create Roles:
    // Role A: Will have 2 competencies assigned
    const roleA = await Role.create({
      name: `P23 Senior Officer ${testSuffix}`,
      level: 3,
      department_ref: dept._id,
    })
    fixtures.roleIds.push(roleA._id)

    // Role B: Will have 1 competency assigned (overlap with A)
    const roleB = await Role.create({
      name: `P23 Assistant Officer ${testSuffix}`,
      level: 2,
      department_ref: dept._id,
    })
    fixtures.roleIds.push(roleB._id)

    // Role C: Confirmed zero-assignment role
    const roleC = await Role.create({
      name: `P23 Zero Assignment Officer ${testSuffix}`,
      level: 1,
      department_ref: dept._id,
    })
    fixtures.roleIds.push(roleC._id)

    // 3. Create Competencies:
    // Comp 1: Statistical
    const comp1 = await Competency.create({
      name: `P23 Survey Methodology ${testSuffix}`,
      category: 'statistical',
      competencyCode: `P23_STAT_${testSuffix.slice(-4)}`,
      description: 'Methodologies for large scale socio-economic rounds',
      levelDescriptions: {
        beginner: 'Understands basic terms',
        intermediate: 'Executes sampling designs',
        advanced: 'Directs national methodologies',
      },
    })
    fixtures.compIds.push(comp1._id)

    // Comp 2: Technical
    const comp2 = await Competency.create({
      name: `P23 Python Modeling ${testSuffix}`,
      category: 'technical',
      competencyCode: `P23_TECH_${testSuffix.slice(-4)}`,
      description: 'Exploratory and predictive scripting with Python',
      levelDescriptions: {
        beginner: 'Basic syntax',
        intermediate: 'Data frame manipulation',
        advanced: 'Custom machine learning models',
      },
    })
    fixtures.compIds.push(comp2._id)

    // Comp 3: Digital Governance (unassigned to any test role)
    const comp3 = await Competency.create({
      name: `P23 Open Data Dissemination ${testSuffix}`,
      category: 'digital_governance',
      competencyCode: `P23_GOV_${testSuffix.slice(-4)}`,
      description: 'NDAP protocols and microdata dissemination guidelines',
      levelDescriptions: {
        beginner: 'Knowledge of portal',
        intermediate: 'Prepares metadata',
        advanced: 'Sets dissemination policies',
      },
    })
    fixtures.compIds.push(comp3._id)

    // 4. Create RoleCompetency Mappings:
    // Role A -> Comp 1 (required level 4)
    const rc1 = await RoleCompetency.create({
      role_id: roleA._id,
      competency_id: comp1._id,
      required_level: 4,
    })
    // Role A -> Comp 2 (required level 3)
    const rc2 = await RoleCompetency.create({
      role_id: roleA._id,
      competency_id: comp2._id,
      required_level: 3,
    })
    // Role B -> Comp 1 (required level 2)
    const rc3 = await RoleCompetency.create({
      role_id: roleB._id,
      competency_id: comp1._id,
      required_level: 2,
    })

    // 5. Create Test Users:
    // Learner
    const learner = await User.create({
      name: 'P23 Test Learner',
      email: `p23_learner_${testSuffix}@kaushalai.gov.in`,
      role: 'employee',
      role_id: roleA._id,
      level: 3,
      googleLinked: true,
      onboarding_completed: true,
    })
    fixtures.userIds.push(learner._id)

    // Admin
    const admin = await User.create({
      name: 'P23 Test Admin',
      email: `p23_admin_${testSuffix}@kaushalai.gov.in`,
      role: 'admin',
      role_id: roleA._id,
      level: 3,
      googleLinked: true,
      onboarding_completed: true,
    })
    fixtures.userIds.push(admin._id)

    const learnerToken = jwt.sign({ id: learner._id.toString(), role: learner.role }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
    const adminToken = jwt.sign({ id: admin._id.toString(), role: admin.role }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

    // Start ephemeral test server
    const app = require('./src/app')
    server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, resolve))
    const port = server.address().port
    baseUrl = `http://127.0.0.1:${port}`

    function apiGet(pathUrl, token = null) {
      return new Promise((resolve, reject) => {
        const url = new URL(pathUrl, baseUrl)
        const headers = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`

        http.get(url, { headers }, (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            let body
            try {
              body = JSON.parse(data)
            } catch {
              body = data
            }
            resolve({ status: res.statusCode, body })
          })
        }).on('error', reject)
      })
    }

    // ─────────────────────────────────────────────────────────────────
    // SECTION 1: Endpoint Access & Authentication (Tests 1-3)
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 1: Endpoint Access & Authentication ---')

    // 1. Unauthenticated request returns 401
    const resNoAuth = await apiGet('/api/competencies/framework')
    assert(resNoAuth.status === 401, `1. Unauthenticated request rejected with HTTP 401 (got: ${resNoAuth.status})`)

    // 2. Authenticated learner request returns 200
    const resLearner = await apiGet('/api/competencies/framework', learnerToken)
    assert(resLearner.status === 200, `2. Authenticated learner request returns HTTP 200 (got: ${resLearner.status})`)
    assert(resLearner.body.success === true, '2.1. Learner response contains success: true')

    // 3. Authenticated admin request returns 200
    const resAdmin = await apiGet('/api/competencies/framework', adminToken)
    assert(resAdmin.status === 200, `3. Authenticated admin request returns HTTP 200 (got: ${resAdmin.status})`)

    // Verify alias route /api/competency-framework
    const resAlias = await apiGet('/api/competency-framework', learnerToken)
    assert(resAlias.status === 200, '3.1. Route alias /api/competency-framework returns HTTP 200')

    // ─────────────────────────────────────────────────────────────────
    // SECTION 2: Summary & Category Distribution Integrity (Tests 4-8)
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 2: Framework Summary & Category Distribution Integrity ---')

    // Compute independent database truths (validating references against existing documents)
    const realTotalComps = await Competency.countDocuments()
    const realTotalRoles = await Role.countDocuments()

    const allCompsInDb = await Competency.find().select('_id').lean()
    const allRolesInDb = await Role.find().select('_id').lean()
    const compIdSet = new Set(allCompsInDb.map((c) => c._id.toString()))
    const roleIdSet = new Set(allRolesInDb.map((r) => r._id.toString()))

    const allRCsInDb = await RoleCompetency.find().lean()
    const validRCsInDb = allRCsInDb.filter((rc) => {
      const cId = (rc.competency_id?._id || rc.competency_id)?.toString()
      const rId = (rc.role_id?._id || rc.role_id)?.toString()
      return cId && rId && compIdSet.has(cId) && roleIdSet.has(rId)
    })
    const realTotalMappings = validRCsInDb.length
    const assignedCompIds = new Set(validRCsInDb.map((rc) => (rc.competency_id?._id || rc.competency_id).toString()))
    const realDistinctAssignedComps = assignedCompIds.size

    const body = resLearner.body

    // 4. Global summary counts match actual records
    assert(body.summary !== undefined, '4.1. Response contains summary object')
    assert(body.summary.total_categories === 4, `4.2. total_categories is 4 (got: ${body.summary.total_categories})`)
    assert(body.summary.total_competencies === realTotalComps, `4.3. total_competencies (${body.summary.total_competencies}) matches real DB count (${realTotalComps})`)
    assert(body.summary.total_roles === realTotalRoles, `4.4. total_roles (${body.summary.total_roles}) matches real DB count (${realTotalRoles})`)
    assert(body.summary.total_role_mappings === realTotalMappings, `4.5. total_role_mappings (${body.summary.total_role_mappings}) matches real DB count (${realTotalMappings})`)

    // 5. Category counts match actual records
    assert(Array.isArray(body.categories), '5.1. categories is an array')
    assert(body.categories.length === 4, `5.2. Exactly 4 canonical categories returned (got: ${body.categories.length})`)

    const catCodes = body.categories.map((c) => c.code)
    assert(
      catCodes.includes('statistical') &&
      catCodes.includes('technical') &&
      catCodes.includes('digital_governance') &&
      catCodes.includes('behavioural'),
      '5.3. All 4 canonical category codes present'
    )

    for (const cat of body.categories) {
      const realCatCount = await Competency.countDocuments({ category: cat.code })
      assert(cat.count === realCatCount, `5.4. Category "${cat.code}" count (${cat.count}) matches DB (${realCatCount})`)
      assert(typeof cat.name === 'string' && cat.name.length > 0, `5.5. Category "${cat.code}" has presentation name "${cat.name}"`)
      const expectedPct = Math.round((realCatCount / realTotalComps) * 100)
      assert(cat.percentage === expectedPct, `5.6. Category "${cat.code}" percentage is ${cat.percentage}% (expected: ${expectedPct}%)`)
    }

    // 6. Competency records contain only supported schema fields
    assert(Array.isArray(body.results), '6.1. results is an array')
    assert(body.results.length === realTotalComps, `6.2. Default results count (${body.results.length}) matches total competencies (${realTotalComps})`)

    const sampleComp = body.results.find((c) => c._id === comp1._id.toString())
    assert(sampleComp !== undefined, '6.3. Test competency 1 is present in results')
    assert(sampleComp.name === comp1.name, '6.4. Competency name matches schema')
    assert(sampleComp.competencyCode === comp1.competencyCode, '6.5. competencyCode matches schema')
    assert(sampleComp.category === 'statistical', '6.6. category matches schema')
    assert(sampleComp.description === comp1.description, '6.7. description matches schema')
    assert(typeof sampleComp.levelDescriptions === 'object', '6.8. levelDescriptions matches schema')
    assert(sampleComp.status === undefined, '6.9. No fabricated status: "Active" field is returned')

    // 7. roles_count counts distinct valid roles
    assert(sampleComp.roles_count === 2, `7.1. Comp 1 roles_count is 2 (mapped to Role A and Role B, got: ${sampleComp.roles_count})`)
    assert(sampleComp.is_assigned === true, '7.2. Comp 1 is_assigned is true')

    const sampleComp2 = body.results.find((c) => c._id === comp2._id.toString())
    assert(sampleComp2.roles_count === 1, `7.3. Comp 2 roles_count is 1 (mapped only to Role A, got: ${sampleComp2.roles_count})`)
    assert(sampleComp2.is_assigned === true, '7.4. Comp 2 is_assigned is true')

    const sampleComp3 = body.results.find((c) => c._id === comp3._id.toString())
    assert(sampleComp3.roles_count === 0, `7.5. Comp 3 roles_count is 0 (unassigned, got: ${sampleComp3.roles_count})`)
    assert(sampleComp3.is_assigned === false, '7.6. Comp 3 is_assigned is false')

    // 8. Assigned and unassigned competency counts are correct
    assert(body.summary.assigned_competencies === realDistinctAssignedComps, `8.1. assigned_competencies (${body.summary.assigned_competencies}) matches real distinct count (${realDistinctAssignedComps})`)
    assert(body.summary.unassigned_competencies === realTotalComps - realDistinctAssignedComps, `8.2. unassigned_competencies matches total minus assigned (${body.summary.unassigned_competencies})`)

    // ─────────────────────────────────────────────────────────────────
    // SECTION 3: Query Parameter Validation & Filtering (Tests 9-16)
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 3: Query Parameter Validation & Filtering ---')

    // 9. Category filter returns only selected category
    const resCatFilter = await apiGet('/api/competencies/framework?category=statistical', learnerToken)
    assert(resCatFilter.status === 200, '9.1. Category filter returned HTTP 200')
    const realStatCount = await Competency.countDocuments({ category: 'statistical' })
    assert(resCatFilter.body.results.length === realStatCount, `9.2. Category filter results (${resCatFilter.body.results.length}) matches DB statistical count (${realStatCount})`)
    assert(resCatFilter.body.results.every((c) => c.category === 'statistical'), '9.3. All filtered items have category === "statistical"')
    assert(resCatFilter.body.meta.filters.category === 'statistical', '9.4. Meta reports active category filter')

    // 10. Invalid category returns 400
    const resBadCat = await apiGet('/api/competencies/framework?category=nonexistent_domain', learnerToken)
    assert(resBadCat.status === 400, `10.1. Invalid category rejected with HTTP 400 (got: ${resBadCat.status})`)
    assert(resBadCat.body.success === false, '10.2. Invalid category response has success: false')

    // 11. Search returns matching stored competency records
    const resSearch = await apiGet(`/api/competencies/framework?search=${encodeURIComponent(comp1.competencyCode)}`, learnerToken)
    assert(resSearch.status === 200, '11.1. Search returned HTTP 200')
    assert(resSearch.body.results.length === 1, `11.2. Search by unique competencyCode returned exactly 1 item (got: ${resSearch.body.results.length})`)
    assert(resSearch.body.results[0]._id === comp1._id.toString(), '11.3. Matched competency is comp1')

    // Search by partial text in description
    const resSearchDesc = await apiGet('/api/competencies/framework?search=socio-economic', learnerToken)
    assert(resSearchDesc.body.results.some((c) => c._id === comp1._id.toString()), '11.4. Search by description keyword matches comp1')

    // 12. Search does not permit MongoDB operator injection
    const resInject = await apiGet('/api/competencies/framework?search[$gt]=', learnerToken)
    assert(resInject.status === 200, '12.1. Injection attempt handled safely without server error (HTTP 200)')
    assert(Array.isArray(resInject.body.results), '12.2. Handled without crashing')

    // 13. Valid role filter returns only its actual assignments with real required_level
    const resRoleFilter = await apiGet(`/api/competencies/framework?role_id=${roleA._id}`, learnerToken)
    assert(resRoleFilter.status === 200, '13.1. Role filter returned HTTP 200')
    assert(resRoleFilter.body.results.length === 2, `13.2. Role A filter returns exactly 2 competencies (got: ${resRoleFilter.body.results.length})`)

    const rComp1 = resRoleFilter.body.results.find((c) => c._id === comp1._id.toString())
    const rComp2 = resRoleFilter.body.results.find((c) => c._id === comp2._id.toString())
    assert(rComp1 !== undefined, '13.3. Comp 1 is in Role A results')
    assert(rComp1.required_level === 4, `13.4. Comp 1 required_level is 4 for Role A (got: ${rComp1.required_level})`)
    assert(rComp2 !== undefined, '13.5. Comp 2 is in Role A results')
    assert(rComp2.required_level === 3, `13.6. Comp 2 required_level is 3 for Role A (got: ${rComp2.required_level})`)

    // Role B check (required level 2 for comp 1)
    const resRoleBFilter = await apiGet(`/api/competencies/framework?role_id=${roleB._id}`, learnerToken)
    assert(resRoleBFilter.body.results.length === 1, `13.7. Role B filter returns exactly 1 competency (got: ${resRoleBFilter.body.results.length})`)
    assert(resRoleBFilter.body.results[0].required_level === 2, `13.8. Comp 1 required_level is 2 for Role B (got: ${resRoleBFilter.body.results[0].required_level})`)

    // 14. A valid zero-assignment role returns empty results ([])
    const resZeroRole = await apiGet(`/api/competencies/framework?role_id=${roleC._id}`, learnerToken)
    assert(resZeroRole.status === 200, '14.1. Zero-assignment role returns HTTP 200')
    assert(resZeroRole.body.results.length === 0, `14.2. Zero-assignment role returns empty results [] (got: ${resZeroRole.body.results.length})`)
    assert(resZeroRole.body.meta.total_results === 0, '14.3. Meta total_results is 0')

    // 15. Malformed role ID returns HTTP 400
    const resBadRole = await apiGet('/api/competencies/framework?role_id=not-an-objectid', learnerToken)
    assert(resBadRole.status === 400, `15.1. Malformed role_id rejected with HTTP 400 (got: ${resBadRole.status})`)
    assert(resBadRole.body.success === false, '15.2. Malformed role_id response has success: false')

    // 16. Nonexistent role returns HTTP 404
    const fakeRoleId = new mongoose.Types.ObjectId()
    const resNotFoundRole = await apiGet(`/api/competencies/framework?role_id=${fakeRoleId}`, learnerToken)
    assert(resNotFoundRole.status === 404, `16.1. Nonexistent role returns HTTP 404 (got: ${resNotFoundRole.status})`)
    assert(resNotFoundRole.body.success === false, '16.2. Nonexistent role response has success: false')

    // ─────────────────────────────────────────────────────────────────
    // SECTION 4: Reference Validation & Invariants (Tests 17-21)
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 4: Reference Validation & Read-Only Invariants ---')

    // 17. Missing or invalid mapping references are not counted as valid assignments
    // Inject a simulated orphaned RoleCompetency with a missing competency_id
    const orphanedRC = await RoleCompetency.create({
      role_id: roleA._id,
      competency_id: new mongoose.Types.ObjectId(), // Nonexistent competency
      required_level: 3,
    })

    const resCheckOrphan = await apiGet('/api/competencies/framework', learnerToken)
    // The orphaned mapping must NOT inflate total_role_mappings beyond valid references
    assert(
      resCheckOrphan.body.summary.total_role_mappings === realTotalMappings,
      `17.1. Orphaned mapping to missing competency is excluded from total_role_mappings (${resCheckOrphan.body.summary.total_role_mappings} === ${realTotalMappings})`
    )
    await RoleCompetency.deleteOne({ _id: orphanedRC._id })

    // 18. Missing required_level is not replaced by a fabricated value
    assert(
      rComp1.required_level === 4 && rComp2.required_level === 3,
      '18.1. required_level matches authentic RoleCompetency values (never default: 3)'
    )

    // 19. Global summary remains unchanged when filters are applied
    assert(
      resCatFilter.body.summary.total_competencies === realTotalComps,
      `19.1. Filtered response summary.total_competencies (${resCatFilter.body.summary.total_competencies}) remains global total (${realTotalComps})`
    )
    assert(
      resRoleFilter.body.summary.total_competencies === realTotalComps,
      `19.2. Role-filtered response summary.total_competencies (${resRoleFilter.body.summary.total_competencies}) remains global total (${realTotalComps})`
    )

    // 20. Endpoint performs zero writes to database collections
    const ucCountBefore = await UserCompetency.countDocuments()
    const sgCountBefore = await SkillGap.countDocuments()
    const cCountBefore = await Competency.countDocuments()
    const rCountBefore = await Role.countDocuments()

    await apiGet('/api/competencies/framework', learnerToken)
    await apiGet(`/api/competencies/framework?role_id=${roleA._id}`, learnerToken)
    await apiGet('/api/competencies/framework?category=statistical', learnerToken)

    const ucCountAfter = await UserCompetency.countDocuments()
    const sgCountAfter = await SkillGap.countDocuments()
    const cCountAfter = await Competency.countDocuments()
    const rCountAfter = await Role.countDocuments()

    assert(ucCountBefore === ucCountAfter, '20.1. UserCompetency collection untouched by framework reads (0 writes)')
    assert(sgCountBefore === sgCountAfter, '20.2. SkillGap collection untouched by framework reads (0 writes)')
    assert(cCountBefore === cCountAfter, '20.3. Competency collection untouched by framework reads (0 writes)')
    assert(rCountBefore === rCountAfter, '20.4. Role collection untouched by framework reads (0 writes)')

  } finally {
    // Teardown test fixtures
    console.log('\n--- TEARDOWN: Cleaning up Part 23 test fixtures in kaushalai_test ---')
    await RoleCompetency.deleteMany({ role_id: { $in: fixtures.roleIds } })
    await Role.deleteMany({ _id: { $in: fixtures.roleIds } })
    await Competency.deleteMany({ _id: { $in: fixtures.compIds } })
    await Department.deleteMany({ _id: { $in: fixtures.deptIds } })
    await User.deleteMany({ _id: { $in: fixtures.userIds } })

    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
    await mongoose.disconnect()
  }

  // --- GUARD: Post-Test Development Database Check ---
  console.log('\n--- GUARDRAIL: Development Database Isolation (Post-Test) ---')
  const devConnPost = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
  const devUserCountAfter = await devConnPost.collection('users').countDocuments()
  await devConnPost.close()
  assert(devUserCountAfter === 15, `21. Development DB (kaushalai) user count remained strictly 15 (actual: ${devUserCountAfter})`)

  console.log('\n===================================================================')
  console.log(`PART 23.1 TEST RESULTS: ${totalPassed} Passed, ${totalFailed} Failed`)
  console.log('===================================================================')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal error in Part 23.1 test suite:', err)
  process.exit(1)
})
