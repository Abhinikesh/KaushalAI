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

const {
  User,
  Competency,
  AssessmentAttempt,
  UserCompetency,
  SkillGap,
  Department,
  Role,
  FunctionalArea,
} = require('./src/models')

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

async function runStep4Tests() {
  console.log('========================================================')
  console.log('    TESTING PART 6: SKILLS TO DEVELOP (STEP 4 OF 6)     ')
  console.log('========================================================\n')

  const testEnv = await startTestServer()
  const BASE_URL = testEnv.baseUrl
  console.log(`Connected to isolated test database: ${testEnv.dbName}`)
  console.log(`Ephemeral test API running on: ${BASE_URL}\n`)

  // 1. Fetch competencies from MongoDB directly
  const allCompetencies = await Competency.find({}).sort({ name: 1 }).lean()
  assert(allCompetencies.length === 59, `Authoritative Master Data: exactly 59 competencies in MongoDB (found ${allCompetencies.length})`)

  // Verify categories
  const categoriesInDb = [...new Set(allCompetencies.map((c) => c.category))].sort()
  const expectedCategories = ['behavioural', 'digital_governance', 'statistical', 'technical'].sort()
  assert(
    JSON.stringify(categoriesInDb) === JSON.stringify(expectedCategories),
    `Competency categories match standard: ${categoriesInDb.join(', ')}`
  )

  // Select sample competencies across categories
  const statComp = allCompetencies.find((c) => c.category === 'statistical')
  const techComp = allCompetencies.find((c) => c.category === 'technical')
  const govComp = allCompetencies.find((c) => c.category === 'digital_governance')
  const behComp = allCompetencies.find((c) => c.category === 'behavioural')

  assert(Boolean(statComp && techComp && govComp && behComp), 'Found valid sample competencies for each of 4 categories')

  // Setup isolated deterministic test fixtures
  const userAEmail = 'step4_test_user_a@kaushalai.test'
  const userBEmail = 'step4_test_user_b@kaushalai.test'

  let testUser = await User.findOne({ email: userAEmail })
  if (!testUser) {
    testUser = await User.create({
      name: 'Step4 Tester Primary',
      email: userAEmail,
      passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
      role: 'employee',
      preferences: { language: 'en', theme: 'abyss', appearanceMode: 'light' },
      learning_interests: ['survey_operations', 'national_accounts'],
      department: 'Statistics & Programme Implementation',
      designation: 'Statistical Officer',
      level: 3,
      onboarding_step: 4,
      onboarding_completed: false,
      skills_to_develop: [],
    })
  } else {
    testUser.preferences = { language: 'en', theme: 'abyss', appearanceMode: 'light' }
    testUser.learning_interests = ['survey_operations', 'national_accounts']
    testUser.department = 'Statistics & Programme Implementation'
    testUser.designation = 'Statistical Officer'
    testUser.level = 3
    testUser.onboarding_step = 4
    testUser.onboarding_completed = false
    testUser.skills_to_develop = []
    if (!testUser.passwordHash) {
      testUser.passwordHash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW'
    }
    await testUser.save()
  }

  const userId = testUser._id.toString()
  console.log(`Primary testing user: ${userId} (${testUser.email})\n`)

  let secondUser = await User.findOne({ email: userBEmail })
  if (!secondUser) {
    secondUser = await User.create({
      name: 'Step4 Tester Secondary',
      email: userBEmail,
      passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
      role: 'employee',
      department: 'National Accounts Division (NAD)',
      designation: 'Assistant Director',
      level: 4,
      onboarding_step: 4,
      onboarding_completed: false,
      skills_to_develop: [],
    })
  } else {
    secondUser.onboarding_step = 4
    secondUser.onboarding_completed = false
    secondUser.skills_to_develop = []
    if (!secondUser.passwordHash) {
      secondUser.passwordHash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW'
    }
    await secondUser.save()
  }
  const secondUserId = secondUser._id.toString()

  // Save baseline state of primary test learner to verify immutability of other steps
  const freshUser = await User.findById(userId).lean()
  const baselinePreferences = JSON.parse(JSON.stringify(freshUser.preferences || {}))
  const baselineInterests = [...(freshUser.learning_interests || [])]
  const baselineProfile = {
    department: freshUser.department,
    role_id: freshUser.role_id,
    designation: freshUser.designation,
    level: freshUser.level,
    gradeLevel: freshUser.gradeLevel,
    functional_area_id: freshUser.functional_area_id,
    experience_years: freshUser.experience_years,
    education_level: freshUser.education_level,
    field_of_study: freshUser.field_of_study,
    certifications: freshUser.certifications,
    current_responsibilities: freshUser.current_responsibilities,
  }
  const baselineStep = freshUser.onboarding_step
  const baselineCompleted = Boolean(freshUser.onboarding_completed)

  // Capture baseline counts of assessment collections
  const baselineAttemptsCount = await AssessmentAttempt.countDocuments()
  const baselineUserCompCount = await UserCompetency.countDocuments()
  const baselineSkillGapCount = await SkillGap.countDocuments()

  // Generate test JWT tokens
  const token = jwt.sign(
    { id: userId, email: testUser.email, role: testUser.role },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )

  const secondToken = jwt.sign(
    { id: secondUserId, email: secondUser.email, role: secondUser.role },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )

  const authHeader = { headers: { Authorization: `Bearer ${token}` } }
  const secondAuthHeader = { headers: { Authorization: `Bearer ${secondToken}` } }

  // Ensure user is on at least step 4 before testing step 4
  await User.findByIdAndUpdate(userId, { onboarding_step: 4, onboarding_completed: false })

  console.log('--- TEST GROUP 1: Authentication & Authorization Security ---')
  // 1. Unauthenticated requests are rejected
  try {
    await axios.put(`${BASE_URL}/api/onboarding/step/4`, {
      skills_to_develop: [statComp._id.toString()],
    })
    assert(false, 'Unauthenticated request should have failed with 401')
  } catch (err) {
    assert(err.response?.status === 401, 'Test 1: Unauthenticated request rejected with HTTP 401')
  }

  // Invalid token rejected
  try {
    await axios.put(
      `${BASE_URL}/api/onboarding/step/4`,
      { skills_to_develop: [statComp._id.toString()] },
      { headers: { Authorization: 'Bearer invalid_token_xyz' } }
    )
    assert(false, 'Request with invalid token should have failed with 401 or 403')
  } catch (err) {
    assert(err.response?.status === 401 || err.response?.status === 403, 'Request with invalid token rejected')
  }

  console.log('\n--- TEST GROUP 2: Dynamic Competency Data Loading & Safe Fields ---')
  // 2. Competencies load from MongoDB via options API
  const optionsRes = await axios.get(`${BASE_URL}/api/onboarding/options`)
  assert(optionsRes.data.success === true, 'Test 2a: GET /api/onboarding/options succeeded')
  assert(Array.isArray(optionsRes.data.competencies), 'Test 2b: Competencies returned as array')
  assert(
    optionsRes.data.competencies.length === 59,
    `Test 2c: Exactly 59 competencies returned from options API (received ${optionsRes.data.competencies.length})`
  )
  assert(Array.isArray(optionsRes.data.role_competencies), 'Test 2d: role_competencies returned for role-based recommendations')

  // 3. Competency API returns safe, valid fields
  const sampleCompFromApi = optionsRes.data.competencies[0]
  assert(Boolean(sampleCompFromApi._id), 'Test 3a: Competency has _id')
  assert(Boolean(sampleCompFromApi.name), 'Test 3b: Competency has name')
  assert(Boolean(sampleCompFromApi.category), 'Test 3c: Competency has category')
  assert(typeof sampleCompFromApi.description === 'string', 'Test 3d: Competency has description')
  assert(Boolean(sampleCompFromApi.competencyCode), 'Test 3e: Competency has competencyCode')
  assert(sampleCompFromApi.password === undefined, 'Test 3f: No private or sensitive fields leaked')

  console.log('\n--- TEST GROUP 3: Authoritative State Endpoint ---')
  // 4. Existing saved selections are returned in state API
  const stateRes = await axios.get(`${BASE_URL}/api/onboarding/state`, authHeader)
  assert(stateRes.data.success === true, 'Test 4a: GET /api/onboarding/state succeeded')
  assert(Array.isArray(stateRes.data.skills_to_develop), 'Test 4b: skills_to_develop field exists in state response')
  assert(stateRes.data.onboarding_completed === false, 'Test 4c: onboarding_completed is false')

  console.log('\n--- TEST GROUP 4: Payload Validation & Rejection of Malformed Requests ---')
  // 6. Invalid ObjectId formats are rejected
  try {
    await axios.put(
      `${BASE_URL}/api/onboarding/step/4`,
      { skills_to_develop: ['not-a-valid-object-id', '12345'] },
      authHeader
    )
    assert(false, 'Should reject invalid ObjectId format')
  } catch (err) {
    assert(err.response?.status === 400, 'Test 6a: Invalid ObjectId format rejected with HTTP 400')
    assert(
      err.response?.data?.code === 'INVALID_COMPETENCY_ID',
      `Test 6b: Expected code INVALID_COMPETENCY_ID, got ${err.response?.data?.code}`
    )
  }

  // 7. Nonexistent competency IDs are rejected
  try {
    const nonexistentHexId = '6a971953266163e0a9606999'
    await axios.put(
      `${BASE_URL}/api/onboarding/step/4`,
      { skills_to_develop: [statComp._id.toString(), nonexistentHexId] },
      authHeader
    )
    assert(false, 'Should reject nonexistent competency ID')
  } catch (err) {
    assert(err.response?.status === 400, 'Test 7a: Nonexistent competency ID rejected with HTTP 400')
    assert(
      err.response?.data?.code === 'COMPETENCY_NOT_FOUND',
      `Test 7b: Expected code COMPETENCY_NOT_FOUND, got ${err.response?.data?.code}`
    )
  }

  // 8. Inactive/arbitrary IDs rejected as non-existent
  try {
    const bogusId = new mongoose.Types.ObjectId().toString()
    await axios.put(
      `${BASE_URL}/api/onboarding/step/4`,
      { skills_to_develop: [bogusId] },
      authHeader
    )
    assert(false, 'Should reject fabricated ObjectId')
  } catch (err) {
    assert(err.response?.status === 400, 'Test 8: Fabricated ObjectId rejected with HTTP 400')
  }

  // 10. Invalid payload types are rejected
  const invalidPayloads = [
    { skills_to_develop: 'Python for Data Analysis' },
    { skills_to_develop: 12345 },
    { skills_to_develop: { id: statComp._id.toString() } },
    { skills_to_develop: true },
  ]
  for (const [idx, p] of invalidPayloads.entries()) {
    try {
      await axios.put(`${BASE_URL}/api/onboarding/step/4`, p, authHeader)
      assert(false, `Should reject invalid payload type #${idx + 1}`)
    } catch (err) {
      assert(
        err.response?.status === 400 && err.response?.data?.code === 'INVALID_SKILLS_PAYLOAD',
        `Test 10.${idx + 1}: Non-array payload ${JSON.stringify(p.skills_to_develop)} rejected with INVALID_SKILLS_PAYLOAD`
      )
    }
  }

  // 11. Empty selection behavior follows documented business rule (at least 1 required)
  try {
    await axios.put(`${BASE_URL}/api/onboarding/step/4`, { skills_to_develop: [] }, authHeader)
    assert(false, 'Should reject empty skills_to_develop array')
  } catch (err) {
    assert(err.response?.status === 400, 'Test 11a: Empty skills_to_develop rejected with HTTP 400')
    assert(
      err.response?.data?.code === 'EMPTY_SKILLS_TO_DEVELOP',
      `Test 11b: Expected code EMPTY_SKILLS_TO_DEVELOP, got ${err.response?.data?.code}`
    )
  }

  console.log('\n--- TEST GROUP 5: Deduplication & Valid Selections Persistence ---')
  // 9. Duplicate references are handled safely
  const statIdStr = statComp._id.toString()
  const techIdStr = techComp._id.toString()
  const govIdStr = govComp._id.toString()

  const dedupRes = await axios.put(
    `${BASE_URL}/api/onboarding/step/4`,
    { skills_to_develop: [statIdStr, statIdStr, techIdStr, statIdStr, techIdStr] },
    authHeader
  )
  assert(dedupRes.data.success === true, 'Test 9a: PUT with duplicates returns HTTP 200 success')
  assert(
    dedupRes.data.user.skills_to_develop.length === 2,
    `Test 9b: Duplicates safely deduplicated (expected 2, got ${dedupRes.data.user.skills_to_develop.length})`
  )

  // 5 & 12. Valid multiple competency IDs are accepted without arbitrary cap
  const multiSelection = [statIdStr, techIdStr, govIdStr, behComp._id.toString()]
  const validRes = await axios.put(
    `${BASE_URL}/api/onboarding/step/4`,
    { skills_to_develop: multiSelection },
    authHeader
  )
  assert(validRes.data.success === true, 'Test 5: Valid multi-category competency selection succeeded')
  assert(
    validRes.data.user.skills_to_develop.length === 4,
    `Test 12: Multiple selections preserved without arbitrary cap (${validRes.data.user.skills_to_develop.length} saved)`
  )

  // 13. Valid selections persist directly in MongoDB
  const dbUserAfterSave = await User.findById(userId).lean()
  const savedDbIds = (dbUserAfterSave.skills_to_develop || []).map((id) => id.toString())
  assert(
    savedDbIds.length === 4 && multiSelection.every((id) => savedDbIds.includes(id)),
    `Test 13: Direct MongoDB verification: user.skills_to_develop contains all 4 valid Competency ObjectIds`
  )

  // 14. Step advances to Step 5 only after successful persistence
  assert(
    dbUserAfterSave.onboarding_step >= 5,
    `Test 14: Onboarding step advanced to ${dbUserAfterSave.onboarding_step} in MongoDB`
  )

  // 15. Onboarding remains incomplete
  assert(
    dbUserAfterSave.onboarding_completed === false,
    'Test 15: onboarding_completed remains FALSE (only diagnostic assessment completion graduates user)'
  )

  // 4b. State endpoint returns populated skills_to_develop
  const stateAfterRes = await axios.get(`${BASE_URL}/api/onboarding/state`, authHeader)
  assert(
    stateAfterRes.data.skills_to_develop.length === 4,
    `Test 4c: State API returns 4 populated skills_to_develop (got ${stateAfterRes.data.skills_to_develop.length})`
  )
  const populatedItem = stateAfterRes.data.skills_to_develop[0]
  assert(
    Boolean(populatedItem._id && populatedItem.name && populatedItem.category),
    'Test 4d: Returned skills_to_develop items are properly populated Competency documents'
  )

  console.log('\n--- TEST GROUP 6: Immutability of Prior Steps & Assessment Collections ---')
  // 16. Step 1 preferences remain unchanged
  assert(
    JSON.stringify(dbUserAfterSave.preferences) === JSON.stringify(baselinePreferences),
    'Test 16: Step 1 preferences (language, theme, appearanceMode) remain perfectly intact'
  )

  // 17. Step 2 interests remain unchanged
  assert(
    JSON.stringify(dbUserAfterSave.learning_interests) === JSON.stringify(baselineInterests),
    'Test 17: Step 2 learning_interests remain perfectly intact'
  )

  // 18. Step 3 profile fields remain unchanged
  assert(
    String(dbUserAfterSave.department) === String(baselineProfile.department),
    'Test 18a: Profile department remains unchanged'
  )
  assert(
    String(dbUserAfterSave.designation) === String(baselineProfile.designation),
    'Test 18b: Profile designation remains unchanged'
  )
  assert(
    Number(dbUserAfterSave.level) === Number(baselineProfile.level),
    'Test 18c: Profile cadre level remains unchanged'
  )
  assert(
    Number(dbUserAfterSave.experience_years) === Number(baselineProfile.experience_years),
    'Test 18d: Profile experience_years remains unchanged'
  )
  assert(
    String(dbUserAfterSave.education_level) === String(baselineProfile.education_level),
    'Test 18e: Profile education_level remains unchanged'
  )

  // 20. Existing competency assessment records remain unchanged
  const currentAttemptsCount = await AssessmentAttempt.countDocuments()
  const currentUserCompCount = await UserCompetency.countDocuments()
  const currentSkillGapCount = await SkillGap.countDocuments()

  assert(
    currentAttemptsCount === baselineAttemptsCount,
    `Test 20a: AssessmentAttempt count unchanged (${currentAttemptsCount})`
  )
  assert(
    currentUserCompCount === baselineUserCompCount,
    `Test 20b: UserCompetency count unchanged (${currentUserCompCount})`
  )
  assert(
    currentSkillGapCount === baselineSkillGapCount,
    `Test 20c: SkillGap count unchanged (${currentSkillGapCount})`
  )

  console.log('\n--- TEST GROUP 7: Cross-User Security & Isolation ---')
  // 19. A learner cannot update another learner's selections
  // User B updates their own skills
  const userBSelection = [statIdStr, behComp._id.toString()]
  await axios.put(
    `${BASE_URL}/api/onboarding/step/4`,
    { skills_to_develop: userBSelection },
    secondAuthHeader
  )

  const dbUserA = await User.findById(userId).lean()
  const dbUserB = await User.findById(secondUserId).lean()

  assert(
    dbUserA.skills_to_develop.length === 4,
    `Test 19a: User A skills untouched by User B actions (User A has ${dbUserA.skills_to_develop.length})`
  )
  assert(
    dbUserB.skills_to_develop.length === 2,
    `Test 19b: User B has their own distinct skills_to_develop (${dbUserB.skills_to_develop.length})`
  )
  assert(
    JSON.stringify(dbUserA.skills_to_develop) !== JSON.stringify(dbUserB.skills_to_develop),
    'Test 19c: Complete data isolation confirmed between separate learners'
  )

  // Teardown / Clean up test fixtures
  console.log('\n--- TEARDOWN: Cleaning up deterministic test fixtures ---')
  await safeCleanupTestUsers([userAEmail, userBEmail])
  console.log('Test fixtures cleaned up successfully.')

  await closeTestEnvironment()

  console.log('\n========================================================')
  console.log(`  STEP 4 TESTS COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`)
  console.log('========================================================\n')

  if (failedCount > 0) {
    process.exit(1)
  }
}

runStep4Tests().catch(async (err) => {
  console.error('Fatal error running Step 4 test suite:', err)
  await closeTestEnvironment()
  process.exit(1)
})
