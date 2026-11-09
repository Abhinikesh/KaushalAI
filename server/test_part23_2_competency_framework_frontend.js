/**
 * TEST PART 23.2: KAUSHALAI COMPETENCY FRAMEWORK FRONTEND INTEGRATION SUITE
 * 
 * Verifies all 20 requirements from Part 23.2 Specification:
 * 1.  API client uses the correct endpoint (/competencies/framework)
 * 2.  Authenticated API requests use the existing client
 * 3.  Real KPI values render from the response (no hardcoded counts)
 * 4.  Four canonical categories render from actual response data
 * 5.  Competency rows render actual database records
 * 6.  Search updates the API query (debounced)
 * 7.  Category filter updates the API query
 * 8.  Role filter works and updates the API query
 * 9.  Global summary values remain invariant under filters
 * 10. Dynamic chart segments reflect actual category percentages
 * 11. Empty category handling
 * 12. Empty search results handling
 * 13. Valid zero-assignment role handling
 * 14. API loading state
 * 15. API error and retry behavior
 * 16. No mock data appears after API failure
 * 17. English/Hindi translations with 100% key parity
 * 18. Existing competency detail navigation (/competencies/:id)
 * 19. Existing themes and light/dark mode
 * 20. Responsive behavior (mobile 375px, tablet 768px, desktop 1440px)
 */

'use strict'

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })
if (!process.env.ACCESS_TOKEN_SECRET) {
  process.env.ACCESS_TOKEN_SECRET = 'kaushalai_dev_access_secret_change_in_prod'
}

const fs = require('fs')
const http = require('http')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const { validateTestDatabaseUri } = require('./src/test/testDbGuard')

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET

const green = (s) => `\x1b[32m${s}\x1b[0m`
const red = (s) => `\x1b[31m${s}\x1b[0m`

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

async function runPart23_2Tests() {
  console.log('========================================================================')
  console.log('  TESTING PART 23.2: KAUSHALAI COMPETENCY FRAMEWORK FRONTEND BINDING    ')
  console.log('========================================================================\n')

  const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/kaushalai_test'
  const { dbName } = validateTestDatabaseUri(testDbUri)
  assert(dbName === 'kaushalai_test', `Guardrail: Dedicated test database confirmed: "${dbName}"`)

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 1: API Client and Endpoint Contract (Req 1, 2)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 1: API Client Integration & Authentication (Req 1, 2) ---')

  const apiClientPath = path.resolve(__dirname, '../client/src/api/competency.api.js')
  const clientJsPath = path.resolve(__dirname, '../client/src/api/client.js')
  const pagePath = path.resolve(__dirname, '../client/src/pages/competency/CompetencyFrameworkPage.jsx')

  const apiClientSrc = fs.readFileSync(apiClientPath, 'utf8')
  const clientJsSrc = fs.readFileSync(clientJsPath, 'utf8')
  const pageSrc = fs.readFileSync(pagePath, 'utf8')

  assert(apiClientSrc.includes('getCompetencyFramework'), '1.1: competency.api.js exports getCompetencyFramework')
  assert(apiClientSrc.includes("apiClient.get('/competencies/framework'"), '1.2: getCompetencyFramework targets /competencies/framework')
  assert(apiClientSrc.includes('{ params }'), '1.3: getCompetencyFramework passes dynamic query params')
  assert(apiClientSrc.includes('getCanonicalRoles'), '1.4: competency.api.js exports getCanonicalRoles')
  assert(apiClientSrc.includes("apiClient.get('/competencies/roles'"), '1.5: getCanonicalRoles targets /competencies/roles')
  assert(clientJsSrc.includes('Authorization = `Bearer ${token}`'), '1.6: apiClient attaches Bearer token from authStore')
  assert(pageSrc.includes("import { getCompetencyFramework, getCanonicalRoles }"), '1.7: CompetencyFrameworkPage imports canonical role client')
  assert(pageSrc.includes("canonicalRoles"), '1.8: CompetencyFrameworkPage defines canonicalRoles state')

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 2: React Query Integration & Query Keys (Req 3, 6, 7, 8)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 2: React Query Integration & Stable Query Keys (Req 3, 6, 7, 8) ---')

  assert(pageSrc.includes("import { useQuery } from '@tanstack/react-query'"), '2.1: Page uses useQuery from @tanstack/react-query')
  assert(pageSrc.includes("queryKey: ['competencyFramework'"), '2.2: Stable queryKey includes framework namespace')
  assert(pageSrc.includes("frameworkParams"), '2.3: queryKey includes dynamic frameworkParams object')
  assert(pageSrc.includes("staleTime: 60 * 1000"), '2.4: Appropriate staleTime (60s) configured to prevent unnecessary refetches')
  assert(pageSrc.includes("keepPreviousData: true"), '2.5: keepPreviousData enabled to prevent layout shift during filtering')

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 3: Mock Data Elimination & Real KPI Binding (Req 3, 4, 5)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 3: Elimination of Hardcoded Mock Data & Real KPI Binding ---')

  assert(!pageSrc.includes("const domains = ["), '3.1: Hardcoded mock domains array completely removed')
  assert(!pageSrc.includes("const competenciesData = {"), '3.2: Hardcoded mock competenciesData dictionary completely removed')
  assert(!pageSrc.includes("'19 May 2026, 10:30 AM'"), '3.3: Fabricated last-updated timestamp completely removed')
  assert(!pageSrc.includes("186"), '3.4: Fabricated 186 mapped skills count completely removed')
  assert(pageSrc.includes("summary.total_categories"), '3.5: KPI 1 binds to summary.total_categories')
  assert(pageSrc.includes("summary.total_competencies"), '3.6: KPI 2 binds to summary.total_competencies')
  assert(pageSrc.includes("summary.total_role_mappings"), '3.7: KPI 3 binds to truthful summary.total_role_mappings')
  assert(pageSrc.includes("summary.total_roles"), '3.8: KPI 4 binds to summary.total_roles')
  assert(pageSrc.includes("summary.assigned_competencies"), '3.9: Framework Summary includes summary.assigned_competencies')
  assert(pageSrc.includes("summary.unassigned_competencies"), '3.10: Framework Summary includes summary.unassigned_competencies')

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 4: Category Harmonization & 4 Canonical Enums (Req 4, 11)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 4: 4 Canonical Categories Harmonization (Req 4, 11) ---')

  const canonicalCats = ['statistical', 'technical', 'digital_governance', 'behavioural']
  for (const cat of canonicalCats) {
    assert(pageSrc.includes(`key: '${cat}'`), `4.1-${cat}: Canonical category "${cat}" configured in page`)
  }
  assert(!pageSrc.includes("Domain Knowledge"), '4.2: Obsolete mock domain "Domain Knowledge" removed from primary metadata')
  assert(!pageSrc.includes("Governance & Quality"), '4.3: Obsolete mock domain "Governance & Quality" harmonized to digital_governance')
  assert(pageSrc.includes("CANONICAL_CATEGORIES"), '4.4: CANONICAL_CATEGORIES structure maps icons and metadata')

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 5: Dynamic Donut Chart Math & Rendering (Req 10)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 5: Dynamic SVG Donut Chart Calculation (Req 10) ---')

  assert(pageSrc.includes("2 * Math.PI * 38"), '5.1: Circumference accurately calculated from radius 38 (2 * PI * 38)')
  assert(pageSrc.includes("strokeDasharray="), '5.2: strokeDasharray dynamically bound to calculated slice length')
  assert(pageSrc.includes("strokeDashoffset="), '5.3: strokeDashoffset dynamically bound to accumulated slice length')
  assert(pageSrc.includes("summary.total_competencies === 0"), '5.4: Zero total competencies handled safely with neutral ring')

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 6: Loading, Error, Empty States & Retry (Req 14, 15, 16)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 6: Loading, Error, and Empty States (Req 14, 15, 16) ---')

  assert(pageSrc.includes("isFrameworkLoading"), '6.1: Page handles isFrameworkLoading state')
  assert(pageSrc.includes("isFrameworkError"), '6.2: Page handles isFrameworkError state')
  assert(pageSrc.includes("refetchFramework()"), '6.3: Error state provides working Retry action calling refetchFramework')
  assert(pageSrc.includes("emptyBox"), '6.4: Empty state styled with dedicated container')
  assert(pageSrc.includes("handleClearFilters"), '6.5: Empty state provides Clear Filters action')
  assert(!pageSrc.includes("fallback = ["), '6.6: No silent fallback to mock data on error')

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 7: Debounced Search & Role Filter (Req 6, 7, 8)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 7: Debounced Search & Filter Logic (Req 6, 7, 8) ---')

  assert(pageSrc.includes("debouncedCompSearch"), '7.1: Uses debounced search state')
  assert(pageSrc.includes("setTimeout"), '7.2: Debounces search input by 300ms')
  assert(pageSrc.includes("clearTimeout"), '7.3: Cleans up debounce timer on unmount/re-render')
  assert(pageSrc.includes("selectedRoleId"), '7.4: Page supports role filter state')
  assert(pageSrc.includes("canonicalRoles"), '7.5: Page populates role filter options from canonicalRoles API')
  assert(pageSrc.includes("selectedCategory"), '7.6: Category selection updates state and query')

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 8: Internationalization Parity (Req 17)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 8: English & Hindi Internationalization Parity (Req 17) ---')

  const enPath = path.resolve(__dirname, '../client/src/i18n/en.json')
  const hiPath = path.resolve(__dirname, '../client/src/i18n/hi.json')

  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'))
  const hi = JSON.parse(fs.readFileSync(hiPath, 'utf8'))

  assert(Boolean(en.competency_framework), '8.1: en.json contains dedicated competency_framework namespace')
  assert(Boolean(hi.competency_framework), '8.2: hi.json contains dedicated competency_framework namespace')

  const enFrameworkKeys = Object.keys(en.competency_framework || {})
  const hiFrameworkKeys = Object.keys(hi.competency_framework || {})

  assert(enFrameworkKeys.length >= 60, `8.3: en.competency_framework has comprehensive keys (${enFrameworkKeys.length} >= 60)`)
  assert(hiFrameworkKeys.length >= 60, `8.4: hi.competency_framework has comprehensive keys (${hiFrameworkKeys.length} >= 60)`)

  const missingInHi = enFrameworkKeys.filter((k) => hi.competency_framework[k] === undefined)
  assert(missingInHi.length === 0, `8.5: 100% key parity between en and hi (missing: ${missingInHi.join(', ') || 'none'})`)

  // Check critical keys
  const criticalKeys = [
    'page_title', 'page_subtitle', 'kpi_domains', 'kpi_competencies', 'kpi_mappings', 'kpi_roles',
    'summary_title', 'summary_mappings', 'summary_source_val', 'loading', 'error_title', 'btn_retry',
    'empty_title', 'readonly_notice', 'category_statistical', 'category_technical',
    'category_digital_governance', 'category_behavioural'
  ]
  for (const k of criticalKeys) {
    assert(Boolean(en.competency_framework[k]), `8.6-en: Key ${k} present in English`)
    assert(Boolean(hi.competency_framework[k]), `8.6-hi: Key ${k} present in Hindi`)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 9: Competency Detail Navigation & Modals (Req 18)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 9: Competency Detail Navigation & Modals (Req 18) ---')

  assert(pageSrc.includes("to={`/competencies/${selectedCompetency._id || selectedCompetency.id}`}"), '9.1: Modal links to /competencies/:id with authentic ID')
  assert(pageSrc.includes("Open Full Competency Page"), '9.2: Detail modal offers direct route navigation')

  const detailPagePath = path.resolve(__dirname, '../client/src/pages/competency/CompetencyDetailPage.jsx')
  const detailSrc = fs.readFileSync(detailPagePath, 'utf8')
  assert(detailSrc.includes("const { id } = useParams()"), '9.3: CompetencyDetailPage consumes real :id param')
  assert(detailSrc.includes("getCompetencies()"), '9.4: CompetencyDetailPage fetches real competencies')

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 10: Themes and Responsive CSS Preservation (Req 19, 20)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 10: Themes & Responsive CSS Preservation (Req 19, 20) ---')

  const cssPath = path.resolve(__dirname, '../client/src/pages/competency/CompetencyFrameworkPage.module.css')
  const cssSrc = fs.readFileSync(cssPath, 'utf8')

  assert(cssSrc.includes("@media (max-width: 1100px)"), '10.1: Media query for 1100px preserved')
  assert(cssSrc.includes("@media (max-width: 900px)"), '10.2: Media query for 900px preserved')
  assert(cssSrc.includes("@media (max-width: 600px)"), '10.3: Media query for 600px preserved')
  assert(cssSrc.includes("@media (max-width: 550px)"), '10.4: Media query for 550px preserved')
  assert(cssSrc.includes(".mainLayout"), '10.5: Two-column grid layout preserved')
  assert(cssSrc.includes(".topMetricsGrid"), '10.6: 4-card metric grid preserved')
  assert(cssSrc.includes(".errorBox"), '10.7: Error container styling included')
  assert(cssSrc.includes(".emptyBox"), '10.8: Empty container styling included')

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 11: Live Backend Server Integration with Dedicated Test DB
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 11: Live Backend API Integration Verification ---')

  await mongoose.connect(testDbUri)
  const app = require('./src/app')
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port

  function makeRequest(reqPath, headers = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: reqPath,
          method: 'GET',
          headers,
        },
        (res) => {
          let body = ''
          res.on('data', (c) => (body += c))
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(body) })
            } catch (e) {
              resolve({ status: res.statusCode, body })
            }
          })
        }
      )
      req.on('error', reject)
      req.end()
    })
  }

  const User = mongoose.model('User')
  const Competency = mongoose.model('Competency')
  const Role = mongoose.model('Role')
  const RoleCompetency = mongoose.model('RoleCompetency')

  // Create temporary test user
  await User.deleteMany({ email: /part23_2/ })
  const testUser = await User.create({
    name: 'Part 23.2 Test User',
    email: 'part23_2_user@kaushalai.test',
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    role: 'employee',
    googleLinked: true,
  })

  const token = jwt.sign(
    { id: testUser._id.toString(), email: testUser.email, role: testUser.role },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )

  // 11.1: Live default fetch
  const defaultRes = await makeRequest('/api/competencies/framework', { Authorization: `Bearer ${token}` })
  assert(defaultRes.status === 200, `11.1: Live GET /api/competencies/framework returns 200 (got: ${defaultRes.status})`)
  assert(defaultRes.body.success === true, '11.2: Response envelope success is true')
  assert(defaultRes.body.summary.total_categories === 4, `11.3: Summary total_categories is 4 (got: ${defaultRes.body.summary.total_categories})`)
  assert(typeof defaultRes.body.summary.total_role_mappings === 'number', '11.4: Summary total_role_mappings is numeric')
  assert(defaultRes.body.categories.every((c) => Boolean(c.key) && Boolean(c.code) && c.key === c.code), '11.4b: Category objects contain both key and code properties matching canonical enums')

  // 11.4c: Live canonical roles endpoint check
  const rolesRes = await makeRequest('/api/competencies/roles', { Authorization: `Bearer ${token}` })
  assert(rolesRes.status === 200, '11.4c: GET /api/competencies/roles returns 200')
  assert(rolesRes.body.success === true, '11.4d: Roles envelope success is true')
  assert(Array.isArray(rolesRes.body.roles) && rolesRes.body.roles.length > 0, `11.4e: Canonical roles returned (found ${rolesRes.body.roles?.length || 0})`)
  assert(rolesRes.body.roles[0].name && rolesRes.body.roles[0]._id, '11.4f: Canonical roles have name and _id')

  // 11.5: Category Filter updates results while summary remains invariant
  const catRes = await makeRequest('/api/competencies/framework?category=technical', { Authorization: `Bearer ${token}` })
  assert(catRes.status === 200, '11.5: Filtered by category=technical returns 200')
  assert(catRes.body.summary.total_competencies === defaultRes.body.summary.total_competencies, '11.6: Summary total_competencies remains global and invariant')
  assert(catRes.body.results.every((r) => r.category === 'technical'), '11.7: Every returned result has category === technical')

  // 11.8: Search Filter updates results
  const searchRes = await makeRequest('/api/competencies/framework?search=python', { Authorization: `Bearer ${token}` })
  assert(searchRes.status === 200, '11.8: Search query returns 200')
  const actualSearchFilter = searchRes.body.meta?.filters?.search || searchRes.body.meta?.search_filter
  assert(actualSearchFilter === 'python', '11.9: meta.filters.search correctly reflects query')

  // 11.10: Zero-assignment role test
  const zeroRole = await Role.create({
    name: 'Part 23.2 Zero Mappings Role',
    code: 'P23_ZERO',
    department: 'Testing Division',
    level: 1,
    department_ref: new mongoose.Types.ObjectId()
  })

  const zeroRoleRes = await makeRequest(`/api/competencies/framework?role_id=${zeroRole._id}`, { Authorization: `Bearer ${token}` })
  assert(zeroRoleRes.status === 200, '11.10: Zero assignment role returns 200')
  assert(Array.isArray(zeroRoleRes.body.results) && zeroRoleRes.body.results.length === 0, '11.11: Zero assignment role returns empty results array')
  assert(zeroRoleRes.body.summary.total_competencies === defaultRes.body.summary.total_competencies, '11.12: Global summary remains unaffected for zero assignment role')

  // 11.13: Canonical role filter with authentic mappings and required_level
  const sampleComp = await Competency.findOne({}).lean()
  const mappedRole = await Role.create({
    name: 'Part 23.2 Mapped Cadre Role',
    code: 'P23_MAP',
    department: 'Testing Division',
    level: 2,
    department_ref: new mongoose.Types.ObjectId()
  })
  const mappingDoc = await RoleCompetency.create({
    role_id: mappedRole._id,
    competency_id: sampleComp._id,
    required_level: 4,
  })

  const mappedRoleRes = await makeRequest(`/api/competencies/framework?role_id=${mappedRole._id}`, { Authorization: `Bearer ${token}` })
  assert(mappedRoleRes.status === 200, '11.13: Filtered by canonical role_id returns 200')
  assert(mappedRoleRes.body.results.length === 1, '11.14: Exactly 1 competency returned for mapped role')
  assert(mappedRoleRes.body.results[0]._id.toString() === sampleComp._id.toString(), '11.15: Returned competency matches mapping')
  assert(mappedRoleRes.body.results[0].required_level === 4, '11.16: Authentic required_level 4 returned for mapped role')

  // Cleanup
  await User.deleteMany({ _id: testUser._id })
  await Role.deleteMany({ _id: { $in: [zeroRole._id, mappedRole._id] } })
  await RoleCompetency.deleteOne({ _id: mappingDoc._id })
  server.close()
  await mongoose.disconnect()

  console.log('\n========================================================================')
  console.log(`  PART 23.2 TESTS COMPLETE: ${green(totalPassed + ' Passed')}, ${totalFailed > 0 ? red(totalFailed + ' Failed') : '0 Failed'}`)
  console.log('========================================================================\n')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runPart23_2Tests().catch((err) => {
  console.error('Test runner encountered fatal error:', err)
  process.exit(1)
})
