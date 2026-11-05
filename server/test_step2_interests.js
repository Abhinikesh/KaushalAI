'use strict'

const axios = require('axios')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const {
  startTestServer,
  closeTestEnvironment,
  safeCleanupTestUsers,
} = require('./src/test/testDbGuard')

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'kaushalai_dev_access_secret_change_in_prod'

const User = require('./src/models/User')

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

async function runStep2Tests() {
  console.log('========================================================')
  console.log('  TESTING PART 4: PROFESSIONAL INTERESTS (STEP 2 OF 6)  ')
  console.log('========================================================\n')

  const testEnv = await startTestServer()
  const BASE_URL = testEnv.baseUrl
  console.log(`Connected to isolated test database: ${testEnv.dbName}`)
  console.log(`Ephemeral test API running on: ${BASE_URL}\n`)

  // Dedicated isolated test fixture
  const testEmail = 'step2_test_user@kaushalai.test'
  let testUser = await User.findOne({ email: testEmail })
  if (!testUser) {
    testUser = await User.create({
      name: 'Step2 Test User',
      email: testEmail,
      passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
      role: 'employee',
      preferences: {
        language: 'en',
        theme: 'abyss',
        appearanceMode: 'light',
        setupCompleted: true,
      },
      onboarding_step: 2,
      onboarding_completed: false,
    })
  } else {
    testUser.preferences = {
      language: 'en',
      theme: 'abyss',
      appearanceMode: 'light',
      setupCompleted: true,
    }
    testUser.onboarding_step = 2
    testUser.onboarding_completed = false
    testUser.learning_interests = []
    if (!testUser.passwordHash) {
      testUser.passwordHash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW'
    }
    await testUser.save()
  }

  const userId = testUser._id.toString()
  console.log(`Testing with user ID: ${userId} (${testUser.email})\n`)

  // Save baseline preferences & interests for teardown
  const baselinePreferences = JSON.parse(JSON.stringify(testUser.preferences || {}))
  const baselineInterests = [...(testUser.learning_interests || [])]
  const baselineStep = testUser.onboarding_step || 1

  // Set initial state: Step 1 completed (preferences set), on Step 2
  testUser.preferences = {
    language: 'en',
    theme: 'abyss',
    appearanceMode: 'light',
    setupCompleted: true,
  }
  testUser.onboarding_step = 2
  testUser.onboarding_completed = false
  await testUser.save()

  // Generate valid auth token
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
  console.log('[Test 1: Unauthenticated Access Rejection]')
  try {
    await axios.put(`${BASE_URL}/api/onboarding/step/2`, {
      learning_interests: ['survey_operations'],
    })
    assert(false, 'Should have rejected unauthenticated request')
  } catch (err) {
    assert(err.response?.status === 401, 'Unauthenticated user rejected with 401 Unauthorized')
  }

  // ── TEST 2: Load available interest options ──
  console.log('\n[Test 2: Load Available Interest Options]')
  const optionsRes = await axios.get(`${BASE_URL}/api/onboarding/options`)
  assert(optionsRes.status === 200, 'GET /api/onboarding/options returns 200 OK')
  const availableInterests = optionsRes.data.available_interests
  assert(Array.isArray(availableInterests), 'available_interests is an array')
  assert(availableInterests.length === 12, `available_interests has 12 authoritative domains (Actual: ${availableInterests.length})`)

  const firstOpt = availableInterests[0]
  assert(
    firstOpt && firstOpt.id && firstOpt.name && firstOpt.description && firstOpt.icon && firstOpt.category,
    'Interest options contain id, name, description, icon, and category fields'
  )

  // ── TEST 3: Load initial state from GET /api/onboarding/state ──
  console.log('\n[Test 3: Authoritative State Endpoint Verification]')
  const stateRes = await axios.get(`${BASE_URL}/api/onboarding/state`, { headers: authHeaders })
  assert(stateRes.status === 200, 'GET /api/onboarding/state returns 200 OK')
  assert(stateRes.data.onboarding_step === 2, `State returns current step 2 (Actual: ${stateRes.data.onboarding_step})`)
  assert(stateRes.data.onboarding_completed === false, 'State confirms onboarding is not completed')
  assert(Array.isArray(stateRes.data.learning_interests), 'State returns learning_interests array')

  // ── TEST 4: Empty selection rejection ──
  console.log('\n[Test 4: Empty Selection Rejection]')
  try {
    await axios.put(
      `${BASE_URL}/api/onboarding/step/2`,
      { learning_interests: [] },
      { headers: authHeaders }
    )
    assert(false, 'Should reject empty selections')
  } catch (err) {
    assert(err.response?.status === 400, 'Empty selection rejected with 400')
    assert(err.response?.data?.code === 'EMPTY_INTERESTS', 'Returns EMPTY_INTERESTS error code')
  }

  // ── TEST 5: Non-array payload rejection ──
  console.log('\n[Test 5: Invalid Payload Format Rejection]')
  try {
    await axios.put(
      `${BASE_URL}/api/onboarding/step/2`,
      { learning_interests: 'not-an-array' },
      { headers: authHeaders }
    )
    assert(false, 'Should reject non-array payload')
  } catch (err) {
    assert(err.response?.status === 400, 'Non-array payload rejected with 400')
    assert(err.response?.data?.code === 'INVALID_INTERESTS_PAYLOAD', 'Returns INVALID_INTERESTS_PAYLOAD error code')
  }

  // ── TEST 6: Unsupported / fabricated domain rejection ──
  console.log('\n[Test 6: Unsupported Selection Rejection]')
  try {
    await axios.put(
      `${BASE_URL}/api/onboarding/step/2`,
      { learning_interests: ['fake_domain_abc', 'survey_operations'] },
      { headers: authHeaders }
    )
    assert(false, 'Should reject unsupported selection')
  } catch (err) {
    assert(err.response?.status === 400, 'Unsupported domain rejected with 400')
    assert(err.response?.data?.code === 'UNSUPPORTED_INTEREST', 'Returns UNSUPPORTED_INTEREST error code')
  }

  // ── TEST 7: Duplicate selection handling ──
  console.log('\n[Test 7: Duplicate Selection Deduplication]')
  const dupPayload = ['survey_operations', 'survey_operations', 'data_quality', 'data_quality']
  const dupRes = await axios.put(
    `${BASE_URL}/api/onboarding/step/2`,
    { learning_interests: dupPayload },
    { headers: authHeaders }
  )
  assert(dupRes.status === 200, 'PUT /api/onboarding/step/2 with duplicates returns 200 OK')
  const savedInterests = dupRes.data.user?.learning_interests || []
  assert(
    savedInterests.length === 2 &&
      savedInterests.includes('survey_operations') &&
      savedInterests.includes('data_quality'),
    'Duplicate selections deduplicated to exactly 2 distinct items'
  )

  // ── TEST 8: Valid multiple selection persistence & Step advancement ──
  console.log('\n[Test 8: Valid Multiple Selection Persistence]')
  const validSelections = ['survey_operations', 'statistical_analysis', 'data_visualization']
  const saveRes = await axios.put(
    `${BASE_URL}/api/onboarding/step/2`,
    { learning_interests: validSelections },
    { headers: authHeaders }
  )
  assert(saveRes.status === 200, 'PUT /api/onboarding/step/2 returns 200 OK')
  assert(
    saveRes.data.onboarding_step >= 3,
    `Onboarding step advanced to Step 3 (Actual: ${saveRes.data.onboarding_step})`
  )
  assert(
    saveRes.data.onboarding_completed === false,
    'Step 2 does NOT mark onboarding completed'
  )

  // ── TEST 9: Preserve Step 1 preferences intact ──
  console.log('\n[Test 9: Step 1 Preferences Preservation]')
  const returnedPrefs = saveRes.data.user?.preferences
  assert(returnedPrefs?.language === 'en', 'Step 1 language preference preserved (en)')
  assert(returnedPrefs?.theme === 'abyss', 'Step 1 theme preference preserved (abyss)')
  assert(returnedPrefs?.appearanceMode === 'light', 'Step 1 appearance mode preserved (light)')

  // ── TEST 10: Backward compatible domain name / alias resolution ──
  console.log('\n[Test 10: Name / Alias Backward Compatibility]')
  const aliasPayload = [
    'Sample Survey Methodology & Sampling Frames',
    'National Accounts & Macroeconomic Aggregates',
  ]
  const aliasRes = await axios.put(
    `${BASE_URL}/api/onboarding/step/2`,
    { learning_interests: aliasPayload },
    { headers: authHeaders }
  )
  assert(aliasRes.status === 200, 'Successfully saved using legacy string names/aliases')
  const aliasSaved = aliasRes.data.user?.learning_interests || []
  assert(
    aliasSaved.includes('survey_operations') && aliasSaved.includes('national_accounts'),
    'Legacy aliases mapped correctly to canonical IDs (survey_operations, national_accounts)'
  )

  // ── TEST 11: Direct MongoDB document verification ──
  console.log('\n[Test 11: Direct MongoDB Document Verification]')
  const dbUser = await User.findById(userId).lean()
  assert(Array.isArray(dbUser.learning_interests), 'MongoDB has learning_interests array')
  assert(
    dbUser.learning_interests.length === 2 &&
      dbUser.learning_interests.includes('survey_operations') &&
      dbUser.learning_interests.includes('national_accounts'),
    'MongoDB document stores canonical IDs accurately'
  )
  assert(
    dbUser.preferences?.language === 'en' &&
      dbUser.preferences?.theme === 'abyss' &&
      dbUser.preferences?.appearanceMode === 'light',
    'MongoDB document preserves preferences intact'
  )
  assert(
    dbUser.onboarding_step >= 3,
    `MongoDB document onboarding_step is ${dbUser.onboarding_step}`
  )

  // Teardown: safe fixture cleanup & environment close
  await safeCleanupTestUsers([testEmail])
  console.log('\n  (Dedicated test user fixture cleaned up)')

  console.log('\n--------------------------------------------------------')
  console.log(`STEP 2 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`)
  console.log('--------------------------------------------------------\n')

  await closeTestEnvironment()

  if (failedCount > 0) {
    process.exit(1)
  }
}

runStep2Tests().catch(async (err) => {
  console.error('Fatal test error:', err)
  await closeTestEnvironment()
  process.exit(1)
})
