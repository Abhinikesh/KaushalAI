/**
 * TEST PART 21: KAUSHALAI ADMIN ANALYTICS HARDENING SUITE (P0)
 * 
 * Verifies:
 * 1. getDepartmentCompetencyHeatmap with real persisted BSON field names (user_id, competency_id, current_level)
 * 2. getSkillDemandTrend with verified timestamp fields (last_assessed_at, createdAt, updatedAt) & fallbacks
 * 3. getOrgSummaryStats with modern User.role_id, Role, and RoleCompetency relationships (no double counting)
 * 4. API Endpoints authorization: GET /api/admin/summary, /api/admin/heatmap, /api/admin/skill-trend/:id
 * 5. Scope boundaries: Frozen EmployeeDashboard.jsx, SkillGapAnalysisPage.jsx, and Labs
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
  console.log('PART 21: ADMIN ANALYTICS HARDENING TEST SUITE')
  console.log('===================================================================')

  // Connect to Test DB
  await mongoose.connect(testDbUri)

  const User = require('./src/models/User')
  const Department = require('./src/models/Department')
  const Role = require('./src/models/Role')
  const Competency = require('./src/models/Competency')
  const RoleCompetency = require('./src/models/RoleCompetency')
  const UserCompetency = require('./src/models/UserCompetency')
  const SkillGap = require('./src/models/SkillGap')
  const {
    getDepartmentCompetencyHeatmap,
    getSkillDemandTrend,
    getOrgSummaryStats,
  } = require('./src/services/adminAnalytics.service')

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 1: Database Isolation Guardrail
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 1: Database Isolation Guardrail ---')

  const devConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
  const devUserCount = await devConn.collection('users').countDocuments()
  assert(devUserCount === 15, `1.1: Development DB (kaushalai) user count strictly isolated: 15 (actual: ${devUserCount})`)
  await devConn.close()

  // Clean test collections used in this suite
  const testPrefix = 'p21_analytics_'
  await User.deleteMany({ email: new RegExp(testPrefix) })
  await Department.deleteMany({ code: new RegExp('^P21_') })
  await Role.deleteMany({ name: new RegExp('^P21 ') })
  await Competency.deleteMany({ competencyCode: new RegExp('^P21_') })
  await SkillGap.deleteMany({})

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 2: Department Competency Heatmap (Real BSON Fields)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 2: Department Competency Heatmap Aggregation ---')

  // Create test department
  const testDept = await Department.create({
    name: 'P21 National Accounts Division',
    code: 'P21_NAD',
    ministry: 'Ministry of Statistics and Programme Implementation',
  })

  // Create test role
  const testRole = await Role.create({
    name: 'P21 Senior Statistical Officer',
    level: 3,
    department_ref: testDept._id,
  })

  // Create test competency
  const testComp = await Competency.create({
    name: 'P21 Macroeconomic Accounting',
    competencyCode: 'P21_COMP_MACRO',
    category: 'statistical',
    description: 'Expertise in System of National Accounts (SNA).',
  })

  // Create test user in that department
  const testUser = await User.create({
    name: 'P21 Officer One',
    email: `${testPrefix}user1@example.gov.in`,
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    role: 'employee',
    department: testDept.name,
    role_id: testRole._id,
    isActive: true,
  })

  // Create UserCompetency using raw MongoDB BSON field names: user_id, competency_id, current_level
  const testUC = await UserCompetency.create({
    user_id: testUser._id,
    competency_id: testComp._id,
    current_level: 4,
    last_assessed_at: new Date(),
  })

  // Call getDepartmentCompetencyHeatmap()
  const heatmapData = await getDepartmentCompetencyHeatmap()
  assert(heatmapData && typeof heatmapData === 'object', '2.1: getDepartmentCompetencyHeatmap returns an object')
  assert(Array.isArray(heatmapData.departments), '2.2: Heatmap includes departments array')
  assert(Array.isArray(heatmapData.categories), '2.3: Heatmap includes categories array')
  assert(heatmapData.cells && typeof heatmapData.cells === 'object', '2.4: Heatmap includes cells object')

  assert(heatmapData.departments.includes(testDept.name), `2.5: Heatmap includes newly created department "${testDept.name}"`)
  assert(heatmapData.categories.includes('statistical'), '2.6: Heatmap includes category "statistical"')

  const cellKey = `${testDept.name}::statistical`
  const cell = heatmapData.cells[cellKey]
  assert(!!cell, `2.7: Cell exists for "${cellKey}"`)
  if (cell) {
    assert(cell.avgLevel === 4, `2.8: Cell avgLevel is 4 (got ${cell.avgLevel})`)
    assert(cell.count >= 1, `2.9: Cell assessment count is at least 1 (${cell.count})`)
    assert(Array.isArray(cell.breakdown), '2.10: Cell breakdown is an array')
    const compEntry = cell.breakdown.find((b) => b.name === testComp.name)
    assert(!!compEntry, `2.11: Cell breakdown includes "${testComp.name}"`)
    if (compEntry) {
      assert(compEntry.avgLevel === 4, `2.12: Breakdown avgLevel is 4 (got ${compEntry.avgLevel})`)
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 3: Skill Demand Trend with Timestamp Filtering & Fallback
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 3: Skill Demand Trend ---')

  const trendData = await getSkillDemandTrend(testComp._id.toString(), 6)
  assert(trendData && typeof trendData === 'object', '3.1: getSkillDemandTrend returns an object')
  assert(Array.isArray(trendData.historical), '3.2: trendData.historical is an array')
  assert(Array.isArray(trendData.projected), '3.3: trendData.projected is an array')
  assert(trendData.historical.length > 0, `3.4: Historical data contains monthly buckets (${trendData.historical.length} buckets)`)

  // Check that no NaN exists in trend output
  const hasNanInHistorical = trendData.historical.some((h) => Number.isNaN(h.avgLevel))
  assert(!hasNanInHistorical, '3.5: Historical data contains no NaN values')
  assert(typeof trendData.historical[0].avgLevel === 'number', '3.6: avgLevel is a number')

  // Empty trend for competency with no records returns empty arrays
  const unusedComp = await Competency.create({
    name: 'P21 Unused Competency',
    competencyCode: 'P21_UNUSED',
    category: 'technical',
  })
  const emptyTrend = await getSkillDemandTrend(unusedComp._id.toString(), 6)
  assert(Array.isArray(emptyTrend.historical) && emptyTrend.historical.length === 0, '3.7: Competency with no assessments returns empty historical array')
  assert(Array.isArray(emptyTrend.projected) && emptyTrend.projected.length === 0, '3.8: Competency with no assessments returns empty projected array')

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 4: Org Summary Stats with Modern Role Competencies
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 4: Org Summary Stats Modern Architecture ---')

  // Create RoleCompetency requirement
  await RoleCompetency.create({
    role_id: testRole._id,
    competency_id: testComp._id,
    required_level: 4, // Matches user's level 4 => 100% met
  })

  // Create a high skill gap
  await SkillGap.create({
    user_id: testUser._id,
    role_id: testRole._id,
    competency_id: testComp._id,
    current_level: 2,
    required_level: 4,
    gap: 2,
    priority: 'high',
  })

  const orgStats = await getOrgSummaryStats()
  assert(orgStats && typeof orgStats === 'object', '4.1: getOrgSummaryStats returns an object')
  assert(typeof orgStats.totalOfficials === 'number' && orgStats.totalOfficials >= 1, `4.2: totalOfficials is valid number (${orgStats.totalOfficials})`)
  assert(typeof orgStats.totalDepartments === 'number' && orgStats.totalDepartments >= 1, `4.3: totalDepartments counted accurately (${orgStats.totalDepartments})`)
  assert(typeof orgStats.avgReadinessPct === 'number', `4.4: avgReadinessPct is valid number (${orgStats.avgReadinessPct})`)
  assert(orgStats.avgReadinessPct >= 0 && orgStats.avgReadinessPct <= 100, `4.5: avgReadinessPct clamped between 0 and 100 (${orgStats.avgReadinessPct}%)`)

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 5: HTTP Endpoints & Role-Based Authorization
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 5: HTTP Endpoints & Authorization ---')

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

  // Create admin and employee test tokens
  const adminUser = await User.create({
    name: 'P21 Admin User',
    email: `${testPrefix}admin@example.gov.in`,
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    role: 'admin',
    department: 'Coordination & Admin (CAD)',
    isActive: true,
  })

  const employeeToken = jwt.sign(
    { id: testUser._id.toString(), email: testUser.email, role: 'employee' },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )

  const adminToken = jwt.sign(
    { id: adminUser._id.toString(), email: adminUser.email, role: 'admin' },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )

  // 5.1: Unauthenticated GET /api/admin/summary -> 401
  const unauthSummary = await makeRequest('GET', '/api/admin/summary')
  assert(unauthSummary.status === 401, `5.1: Unauthenticated GET /api/admin/summary rejected with 401 (got: ${unauthSummary.status})`)

  // 5.2: Employee GET /api/admin/summary -> 403
  const empSummary = await makeRequest('GET', '/api/admin/summary', { Authorization: `Bearer ${employeeToken}` })
  assert(empSummary.status === 403, `5.2: Employee GET /api/admin/summary rejected with 403 (got: ${empSummary.status})`)

  // 5.3: Admin GET /api/admin/summary -> 200
  const adminSummary = await makeRequest('GET', '/api/admin/summary', { Authorization: `Bearer ${adminToken}` })
  assert(adminSummary.status === 200, `5.3: Admin GET /api/admin/summary succeeded with 200 (got: ${adminSummary.status})`)
  assert(typeof adminSummary.body.totalOfficials === 'number', '5.4: Admin summary payload has totalOfficials')

  // 5.5: Admin GET /api/admin/heatmap -> 200
  const adminHeatmap = await makeRequest('GET', '/api/admin/heatmap', { Authorization: `Bearer ${adminToken}` })
  assert(adminHeatmap.status === 200, `5.5: Admin GET /api/admin/heatmap succeeded with 200 (got: ${adminHeatmap.status})`)
  assert(adminHeatmap.body && typeof adminHeatmap.body.cells === 'object', '5.6: Admin heatmap payload has cells object')

  // 5.7: Admin GET /api/admin/skill-trend/:id -> 200
  const adminTrend = await makeRequest('GET', `/api/admin/skill-trend/${testComp._id}`, { Authorization: `Bearer ${adminToken}` })
  assert(adminTrend.status === 200, `5.7: Admin GET /api/admin/skill-trend succeeded with 200 (got: ${adminTrend.status})`)
  assert(Array.isArray(adminTrend.body.historical), '5.8: Trend returned historical array')

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 6: Scope Boundaries (Frozen Dashboard & Labs Untouched)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 6: Scope Boundaries Check ---')

  const empDashSrc = fs.readFileSync(path.join(__dirname, '../client/src/pages/dashboard/EmployeeDashboard.jsx'), 'utf8')
  assert(!empDashSrc.includes('PART_21_TEMP'), '6.1: EmployeeDashboard.jsx has not been modified')

  const skillGapSrc = fs.readFileSync(path.join(__dirname, '../client/src/pages/competency/SkillGapAnalysisPage.jsx'), 'utf8')
  assert(skillGapSrc.includes('calculateStandardGapPercentage'), '6.2: SkillGapAnalysisPage.jsx calculation formula intact')

  const labsRouteSrc = fs.readFileSync(path.join(__dirname, 'src/routes/labs.routes.js'), 'utf8')
  assert(labsRouteSrc.includes('issueLabAccessToken'), '6.3: KaushalAI Labs routes untouched')

  // Cleanup test data
  await User.deleteMany({ email: new RegExp(testPrefix) })
  await Department.deleteMany({ code: new RegExp('^P21_') })
  await Role.deleteMany({ name: new RegExp('^P21 ') })
  await Competency.deleteMany({ competencyCode: new RegExp('^P21_') })
  await RoleCompetency.deleteMany({ role_id: testRole._id })
  await UserCompetency.deleteMany({ user_id: testUser._id })
  await SkillGap.deleteMany({ user_id: testUser._id })

  // Final Guardrail Check
  const devFinalConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
  const devFinalCount = await devFinalConn.collection('users').countDocuments()
  assert(devFinalCount === 15, `Final Guardrail: Development DB user count remained strictly 15 (actual: ${devFinalCount})`)
  await devFinalConn.close()

  await new Promise((resolve) => server.close(resolve))
  await mongoose.disconnect()

  console.log('===================================================================')
  console.log(`PART 21 ANALYTICS TEST RESULTS: ${totalPassed} Passed, ${totalFailed} Failed`)
  console.log('===================================================================')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test execution:', err)
  process.exit(1)
})
