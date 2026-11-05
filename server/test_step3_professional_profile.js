'use strict'

const axios = require('axios')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const {
  startTestServer,
  closeTestEnvironment,
  safeCleanupTestUsers,
} = require('./src/test/testDbGuard')

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'kaushalai_dev_access_secret_change_in_prod'
const { User, Department, Role, FunctionalArea } = require('./src/models')

let passedCount = 0
let failedCount = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    passedCount++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failedCount++
  }
}

async function runStep3Tests() {
  console.log('========================================================')
  console.log('  TESTING PART 5: PROFESSIONAL PROFILE (STEP 3 OF 6)    ')
  console.log('========================================================\n')

  const testEnv = await startTestServer()
  const BASE_URL = testEnv.baseUrl
  console.log(`Connected to isolated test database: ${testEnv.dbName}`)
  console.log(`Ephemeral test API running on: ${BASE_URL}\n`)

  // Fetch reference master data from database
  const departments = await Department.find({}).sort({ name: 1 }).lean()
  const roles = await Role.find({}).sort({ level: 1, name: 1 }).lean()
  const functionalAreas = await FunctionalArea.find({}).sort({ name: 1 }).lean()

  assert(departments.length >= 6, `Master data: ${departments.length} departments available`)
  assert(roles.length >= 30, `Master data: ${roles.length} roles available`)
  assert(functionalAreas.length >= 6, `Master data: ${functionalAreas.length} functional areas available`)

  const fodDept = departments.find((d) => d.code === 'FOD') || departments[0]
  const nadDept = departments.find((d) => d.code === 'NAD') || departments[1]

  const fodRoles = roles.filter((r) => String(r.department_ref) === String(fodDept._id))
  const nadRoles = roles.filter((r) => String(r.department_ref) === String(nadDept._id))

  const fodRoleL3 = fodRoles.find((r) => r.level === 3) || fodRoles[0]
  const nadRoleL3 = nadRoles.find((r) => r.level === 3) || nadRoles[0]
  const faRecord = functionalAreas[0]

  // Isolated deterministic test fixture
  const testEmail = 'step3_test_user@kaushalai.test'
  let testUser = await User.findOne({ email: testEmail })
  if (!testUser) {
    testUser = await User.create({
      name: 'Step3 Profile Tester',
      email: testEmail,
      passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
      role: 'employee',
      preferences: {
        language: 'en',
        theme: 'abyss',
        appearanceMode: 'light',
        setupCompleted: true,
      },
      learning_interests: ['survey_operations', 'national_accounts'],
      onboarding_step: 3,
      onboarding_completed: false,
    })
  } else {
    testUser.preferences = {
      language: 'en',
      theme: 'abyss',
      appearanceMode: 'light',
      setupCompleted: true,
    }
    testUser.learning_interests = ['survey_operations', 'national_accounts']
    testUser.onboarding_step = 3
    testUser.onboarding_completed = false
    if (!testUser.passwordHash) {
      testUser.passwordHash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW'
    }
    await testUser.save()
  }

  const userId = testUser._id.toString()
  console.log(`Testing with user ID: ${userId} (${testUser.email})\n`)

  // Save baseline state for teardown
  const baselinePreferences = JSON.parse(JSON.stringify(testUser.preferences || {}))
  const baselineInterests = [...(testUser.learning_interests || [])]
  const baselineProfile = {
    department: testUser.department,
    role_id: testUser.role_id,
    designation: testUser.designation,
    level: testUser.level,
    gradeLevel: testUser.gradeLevel,
    functional_area_id: testUser.functional_area_id,
    experience_years: testUser.experience_years,
    education_level: testUser.education_level,
    field_of_study: testUser.field_of_study,
    certifications: testUser.certifications,
    current_responsibilities: testUser.current_responsibilities,
    areasOfWork: testUser.areasOfWork,
  }
  const baselineStep = testUser.onboarding_step || 1

  // Set up learner in clean Step 3 state with Step 1 & Step 2 completed
  testUser.preferences = {
    language: 'en',
    theme: 'forest',
    appearanceMode: 'dark',
    setupCompleted: true,
  }
  testUser.learning_interests = ['survey_operations', 'data_quality']
  testUser.onboarding_step = 3
  testUser.onboarding_completed = false
  await testUser.save()

  // Generate auth tokens
  const token = jwt.sign(
    { id: userId, email: testUser.email, role: testUser.role || 'learner' },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  // ── TEST 1: Unauthenticated request rejection ──
  console.log('[Scenario 1: Unauthenticated Access Rejection]')
  try {
    await axios.put(`${BASE_URL}/api/onboarding/step/3`, {
      department_id: fodDept._id,
      role_id: fodRoleL3._id,
    })
    assert(false, 'Should have rejected unauthenticated request')
  } catch (err) {
    assert(err.response?.status === 401, 'Unauthenticated user rejected with 401 Unauthorized')
  }

  // ── TEST 2: Load required master-data options ──
  console.log('\n[Scenario 2: Master-Data Options Loading]')
  const optionsRes = await axios.get(`${BASE_URL}/api/onboarding/options`)
  assert(optionsRes.status === 200, 'GET /api/onboarding/options returns 200 OK')
  assert(Array.isArray(optionsRes.data.departments), 'Options contain departments array')
  assert(Array.isArray(optionsRes.data.roles), 'Options contain roles array')
  assert(Array.isArray(optionsRes.data.functional_areas), 'Options contain functional_areas array')
  assert(Array.isArray(optionsRes.data.education_levels), 'Options contain education_levels array')
  assert(Array.isArray(optionsRes.data.responsibilities_options), 'Options contain responsibilities_options array')

  // ── TEST 3: State endpoint returns profile fields & department_id ──
  console.log('\n[Scenario 3: Authoritative State Endpoint Verification]')
  const stateRes = await axios.get(`${BASE_URL}/api/onboarding/state`, { headers: authHeaders })
  assert(stateRes.status === 200, 'GET /api/onboarding/state returns 200 OK')
  assert(stateRes.data.onboarding_step === 3, 'State returns onboarding_step: 3')
  assert(stateRes.data.onboarding_completed === false, 'State confirms onboarding is not completed')
  assert(stateRes.data.profile !== undefined, 'State returns profile object')
  assert(Array.isArray(stateRes.data.learning_interests), 'State retains Step 2 learning_interests')

  // ── TEST 4: Invalid Department ID Rejections ──
  console.log('\n[Scenario 4: Invalid Department ID Rejections]')
  try {
    await axios.put(
      `${BASE_URL}/api/onboarding/step/3`,
      { department_id: 'invalid-id-format' },
      { headers: authHeaders }
    )
    assert(false, 'Should reject malformed department ID')
  } catch (err) {
    assert(err.response?.status === 400, 'Malformed department ID rejected with 400')
    assert(err.response?.data?.code === 'INVALID_DEPARTMENT_ID', 'Returns INVALID_DEPARTMENT_ID code')
  }

  try {
    const fakeId = new mongoose.Types.ObjectId().toString()
    await axios.put(
      `${BASE_URL}/api/onboarding/step/3`,
      { department_id: fakeId },
      { headers: authHeaders }
    )
    assert(false, 'Should reject nonexistent department ID')
  } catch (err) {
    assert(err.response?.status === 400, 'Nonexistent department ID rejected with 400')
    assert(err.response?.data?.code === 'DEPARTMENT_NOT_FOUND', 'Returns DEPARTMENT_NOT_FOUND code')
  }

  // ── TEST 5: Invalid Role ID Rejections ──
  console.log('\n[Scenario 5: Invalid Role ID Rejections]')
  try {
    await axios.put(
      `${BASE_URL}/api/onboarding/step/3`,
      { department_id: fodDept._id, role_id: 'bad-format' },
      { headers: authHeaders }
    )
    assert(false, 'Should reject malformed role ID')
  } catch (err) {
    assert(err.response?.status === 400, 'Malformed role ID rejected with 400')
    assert(err.response?.data?.code === 'INVALID_ROLE_ID', 'Returns INVALID_ROLE_ID code')
  }

  try {
    const fakeId = new mongoose.Types.ObjectId().toString()
    await axios.put(
      `${BASE_URL}/api/onboarding/step/3`,
      { department_id: fodDept._id, role_id: fakeId },
      { headers: authHeaders }
    )
    assert(false, 'Should reject nonexistent role ID')
  } catch (err) {
    assert(err.response?.status === 400, 'Nonexistent role ID rejected with 400')
    assert(err.response?.data?.code === 'ROLE_NOT_FOUND', 'Returns ROLE_NOT_FOUND code')
  }

  // ── TEST 6: Role-Department Hierarchy Mismatch Rejection ──
  console.log('\n[Scenario 6: Role-Department Hierarchy Mismatch Rejection]')
  try {
    // Send NAD role with FOD department
    await axios.put(
      `${BASE_URL}/api/onboarding/step/3`,
      { department_id: fodDept._id, role_id: nadRoleL3._id },
      { headers: authHeaders }
    )
    assert(false, 'Should reject role that does not belong to selected department')
  } catch (err) {
    assert(err.response?.status === 400, 'Role-department mismatch rejected with 400')
    assert(err.response?.data?.code === 'ROLE_DEPARTMENT_MISMATCH', 'Returns ROLE_DEPARTMENT_MISMATCH code')
  }

  // ── TEST 7: Invalid Functional Area Rejection ──
  console.log('\n[Scenario 7: Invalid Functional Area Rejection]')
  try {
    const fakeId = new mongoose.Types.ObjectId().toString()
    await axios.put(
      `${BASE_URL}/api/onboarding/step/3`,
      {
        department_id: fodDept._id,
        role_id: fodRoleL3._id,
        functional_area_id: fakeId,
      },
      { headers: authHeaders }
    )
    assert(false, 'Should reject nonexistent functional area ID')
  } catch (err) {
    assert(err.response?.status === 400, 'Nonexistent functional area rejected with 400')
    assert(err.response?.data?.code === 'FUNCTIONAL_AREA_NOT_FOUND', 'Returns FUNCTIONAL_AREA_NOT_FOUND code')
  }

  // ── TEST 8: Experience Validation (Negative & Excessive) ──
  console.log('\n[Scenario 8: Experience Validation]')
  try {
    await axios.put(
      `${BASE_URL}/api/onboarding/step/3`,
      {
        department_id: fodDept._id,
        role_id: fodRoleL3._id,
        functional_area_id: faRecord._id,
        experience_years: -2,
      },
      { headers: authHeaders }
    )
    assert(false, 'Should reject negative experience years')
  } catch (err) {
    assert(err.response?.status === 400, 'Negative experience rejected with 400')
    assert(err.response?.data?.code === 'INVALID_EXPERIENCE_YEARS', 'Returns INVALID_EXPERIENCE_YEARS code')
  }

  try {
    await axios.put(
      `${BASE_URL}/api/onboarding/step/3`,
      {
        department_id: fodDept._id,
        role_id: fodRoleL3._id,
        functional_area_id: faRecord._id,
        experience_years: 75,
      },
      { headers: authHeaders }
    )
    assert(false, 'Should reject experience exceeding 50 years')
  } catch (err) {
    assert(err.response?.status === 400, 'Experience > 50 rejected with 400')
    assert(err.response?.data?.code === 'EXPERIENCE_EXCEEDS_MAX', 'Returns EXPERIENCE_EXCEEDS_MAX code')
  }

  // ── TEST 9: Empty Responsibilities Rejection ──
  console.log('\n[Scenario 9: Responsibilities Validation]')
  try {
    await axios.put(
      `${BASE_URL}/api/onboarding/step/3`,
      {
        department_id: fodDept._id,
        role_id: fodRoleL3._id,
        functional_area_id: faRecord._id,
        experience_years: 4,
        current_responsibilities: [],
      },
      { headers: authHeaders }
    )
    assert(false, 'Should reject empty responsibilities')
  } catch (err) {
    assert(err.response?.status === 400, 'Empty responsibilities rejected with 400')
    assert(err.response?.data?.code === 'EMPTY_RESPONSIBILITIES', 'Returns EMPTY_RESPONSIBILITIES code')
  }

  // ── TEST 10: Missing Education Level Rejection ──
  console.log('\n[Scenario 10: Education Level Validation]')
  try {
    await axios.put(
      `${BASE_URL}/api/onboarding/step/3`,
      {
        department_id: fodDept._id,
        role_id: fodRoleL3._id,
        functional_area_id: faRecord._id,
        experience_years: 4,
        current_responsibilities: ['Data Collection & Scrutiny'],
        education_level: '',
      },
      { headers: authHeaders }
    )
    assert(false, 'Should reject missing education level')
  } catch (err) {
    assert(err.response?.status === 400, 'Missing education level rejected with 400')
    assert(err.response?.data?.code === 'MISSING_EDUCATION_LEVEL', 'Returns MISSING_EDUCATION_LEVEL code')
  }

  // ── TEST 11: Valid Profile Submission & Persistence ──
  console.log('\n[Scenario 11: Valid Profile Persistence & Step Advancement]')
  const validProfilePayload = {
    department_id: fodDept._id,
    role_id: fodRoleL3._id,
    functional_area_id: faRecord._id,
    experience_years: 5,
    education_level: "Bachelor's Degree",
    field_of_study: 'Mathematical Statistics',
    certifications: ['Google Data Analytics Professional Certificate'],
    current_responsibilities: ['Field Survey Administration', 'Data Collection & Scrutiny'],
  }

  const saveRes = await axios.put(
    `${BASE_URL}/api/onboarding/step/3`,
    validProfilePayload,
    { headers: authHeaders }
  )
  assert(saveRes.status === 200, 'PUT /api/onboarding/step/3 returns 200 OK')
  assert(saveRes.data.onboarding_step === 4, `Onboarding step advanced to Step 4 (Actual: ${saveRes.data.onboarding_step})`)
  assert(saveRes.data.onboarding_completed === false, 'Onboarding remains incomplete')

  // ── TEST 12: Step 1 & Step 2 Data Preservation ──
  console.log('\n[Scenario 12: Step 1 & Step 2 Preservation]')
  const userObj = saveRes.data.user
  assert(userObj.preferences?.language === 'en', 'Step 1 language preserved (en)')
  assert(userObj.preferences?.theme === 'forest', 'Step 1 theme preserved (forest)')
  assert(userObj.preferences?.appearanceMode === 'dark', 'Step 1 appearanceMode preserved (dark)')
  assert(
    Array.isArray(userObj.learning_interests) &&
      userObj.learning_interests.includes('survey_operations') &&
      userObj.learning_interests.includes('data_quality'),
    'Step 2 learning_interests preserved intact'
  )

  // ── TEST 13: Direct MongoDB Document Verification ──
  console.log('\n[Scenario 13: Direct MongoDB Document Verification]')
  const dbUser = await User.findById(userId).lean()
  assert(dbUser.department === fodDept.name, `MongoDB department matches '${fodDept.name}'`)
  assert(String(dbUser.role_id) === String(fodRoleL3._id), 'MongoDB role_id matches')
  assert(dbUser.designation === fodRoleL3.name, `MongoDB designation matches '${fodRoleL3.name}'`)
  assert(dbUser.level === 3, 'MongoDB level matches 3')
  assert(dbUser.gradeLevel === 'Level 3', 'MongoDB gradeLevel matches Level 3')
  assert(String(dbUser.functional_area_id) === String(faRecord._id), 'MongoDB functional_area_id matches')
  assert(dbUser.experience_years === 5, 'MongoDB experience_years matches 5')
  assert(dbUser.education_level === "Bachelor's Degree", 'MongoDB education_level matches')
  assert(dbUser.field_of_study === 'Mathematical Statistics', 'MongoDB field_of_study matches')
  assert(
    Array.isArray(dbUser.current_responsibilities) &&
      dbUser.current_responsibilities.includes('Field Survey Administration'),
    'MongoDB current_responsibilities saved correctly'
  )
  assert(
    Array.isArray(dbUser.areasOfWork) &&
      dbUser.areasOfWork.includes('Field Survey Administration'),
    'MongoDB areasOfWork synchronized with current_responsibilities'
  )
  assert(dbUser.onboarding_step === 4, 'MongoDB onboarding_step is 4')
  assert(dbUser.onboarding_completed === false, 'MongoDB onboarding_completed is false')

  // ── TEST 14: Cross-User Profile Modification Prevention ──
  console.log('\n[Scenario 14: Cross-User Security Verification]')
  const otherUserId = new mongoose.Types.ObjectId().toString()
  const otherToken = jwt.sign(
    { id: otherUserId, email: 'other_user@gmail.com', role: 'learner' },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )
  try {
    await axios.put(
      `${BASE_URL}/api/onboarding/step/3`,
      validProfilePayload,
      { headers: { Authorization: `Bearer ${otherToken}` } }
    )
    assert(false, 'Should reject token for non-existent user')
  } catch (err) {
    assert(err.response?.status === 404, 'Non-existent token user rejected with 404 User Not Found')
  }

  // Teardown: Safe fixture cleanup & environment close
  await safeCleanupTestUsers([testEmail])
  console.log('\n  (Dedicated test user fixture cleaned up)')

  console.log('\n--------------------------------------------------------')
  console.log(`STEP 3 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`)
  console.log('--------------------------------------------------------\n')

  await closeTestEnvironment()

  if (failedCount > 0) {
    process.exit(1)
  }
}

runStep3Tests().catch(async (err) => {
  console.error('Fatal test error:', err)
  await closeTestEnvironment()
  process.exit(1)
})

