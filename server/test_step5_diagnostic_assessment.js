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
  Assessment,
  AssessmentAttempt,
  AssessmentResponse,
  Question,
  UserCompetency,
  SkillGap,
  Recommendation,
  LearningPath,
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

async function runStep5DiagnosticTests() {
  console.log('========================================================================')
  console.log('    TESTING PART 7: DIAGNOSTIC COMPETENCY ASSESSMENT (STEP 5 OF 6)     ')
  console.log('========================================================================\n')

  const testEnv = await startTestServer()
  const BASE_URL = testEnv.baseUrl
  console.log(`Connected to isolated test database: ${testEnv.dbName}`)
  console.log(`Ephemeral test API running on: ${BASE_URL}\n`)

  // 1. Setup primary test user
  let testUser = await User.findOne({ email: 'step5_learner_test@gov.in' })
  if (!testUser) {
    testUser = await User.create({
      name: 'Step5 Diagnostic Tester',
      email: 'step5_learner_test@gov.in',
      passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
      role: 'employee',
      department: 'Statistics & Programme Implementation',
      level: 3,
      onboarding_step: 4,
      onboarding_completed: false,
      skills_to_develop: [],
    })
  } else {
    if (!testUser.passwordHash) {
      testUser.passwordHash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW'
    }
  }

  // Ensure testUser has some competencies selected in Step 4
  const sampleComps = await Competency.find({}).limit(3).lean()
  const sampleCompIds = sampleComps.map((c) => c._id)

  testUser.onboarding_step = 4
  testUser.onboarding_completed = false
  testUser.skills_to_develop = sampleCompIds
  await testUser.save()

  const userId = testUser._id.toString()
  console.log(`Primary testing user: ${userId} (${testUser.email})`)

  // 2. Setup secondary test user for cross-user security checks
  let secondUser = await User.findOne({ email: 'step5_crossuser_test@gov.in' })
  if (!secondUser) {
    secondUser = await User.create({
      name: 'Step5 Cross-User Tester',
      email: 'step5_crossuser_test@gov.in',
      passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
      role: 'employee',
      department: 'Statistics & Programme Implementation',
      level: 3,
      onboarding_step: 4,
      onboarding_completed: false,
      skills_to_develop: sampleCompIds,
    })
  } else {
    if (!secondUser.passwordHash) {
      secondUser.passwordHash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW'
      await secondUser.save()
    }
  }
  const secondUserId = secondUser._id.toString()

  // Clean up any stale active attempts for our test users before starting
  await AssessmentAttempt.deleteMany({ user_id: { $in: [userId, secondUserId] } })
  await AssessmentResponse.deleteMany({ user_id: { $in: [userId, secondUserId] } })

  // Setup JWT tokens
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

  console.log('\n--- GROUP 1: Authentication and Access Control ---')

  // Test 1: Unauthenticated requests are rejected (401)
  try {
    await axios.post(`${BASE_URL}/api/assessments/diagnostic/start`, {})
    assert(false, 'Test 1: Unauthenticated start should return 401')
  } catch (err) {
    assert(err.response?.status === 401, `Test 1: Unauthenticated request rejected with status 401 (${err.response?.status})`)
  }

  // Test 2: Invalid tokens are rejected (401)
  try {
    await axios.post(
      `${BASE_URL}/api/assessments/diagnostic/start`,
      {},
      { headers: { Authorization: 'Bearer invalid.token.payload' } }
    )
    assert(false, 'Test 2: Invalid token start should return 401')
  } catch (err) {
    assert(err.response?.status === 401, `Test 2: Invalid token rejected with status 401 (${err.response?.status})`)
  }

  // Test 3: Learner cannot access another learner's attempt
  // Setup a dummy attempt for user 1 first to test cross-user access
  const dummyAttempt = await AssessmentAttempt.create({
    user_id: testUser._id,
    assessment_id: new mongoose.Types.ObjectId(),
    status: 'in_progress',
    started_at: new Date(),
    expires_at: new Date(Date.now() + 1200000),
    question_ids: [],
  })

  try {
    await axios.post(
      `${BASE_URL}/api/assessments/diagnostic/${dummyAttempt._id}/save-answer`,
      { question_id: new mongoose.Types.ObjectId().toString(), selected_option_id: 'opt1' },
      secondAuthHeader
    )
    assert(false, 'Test 3: Cross-user attempt save-answer should fail with 403')
  } catch (err) {
    assert(err.response?.status === 403, `Test 3: Cross-user access rejected with 403 FORBIDDEN (${err.response?.data?.code})`)
  }
  await AssessmentAttempt.findByIdAndDelete(dummyAttempt._id)

  // Test 4: Assessment cannot start before Step 4 is complete
  testUser.onboarding_step = 3
  testUser.skills_to_develop = []
  await testUser.save()
  try {
    await axios.post(`${BASE_URL}/api/assessments/diagnostic/start`, {}, authHeader)
    assert(false, 'Test 4: Start before Step 4 complete should fail with 400')
  } catch (err) {
    assert(
      err.response?.status === 400 && err.response?.data?.code === 'STEP_PREREQUISITE_NOT_MET',
      `Test 4: Prerequisite check enforced: rejected with 400 STEP_PREREQUISITE_NOT_MET (${err.response?.data?.message})`
    )
  }

  // Also verify: Step 4 but empty skills_to_develop is rejected
  testUser.onboarding_step = 4
  testUser.skills_to_develop = []
  await testUser.save()
  try {
    await axios.post(`${BASE_URL}/api/assessments/diagnostic/start`, {}, authHeader)
    assert(false, 'Test 4b: Start with 0 skills_to_develop should fail with 400')
  } catch (err) {
    assert(
      err.response?.status === 400 && err.response?.data?.code === 'STEP_PREREQUISITE_NOT_MET',
      `Test 4b: Prerequisite check enforced when skills_to_develop is empty`
    )
  }

  // Test 5: Assessment cannot be started by an unauthorized role or missing user
  const fakeToken = jwt.sign(
    { id: new mongoose.Types.ObjectId().toString(), email: 'ghost@gov.in', role: 'unknown_role' },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )
  try {
    await axios.post(`${BASE_URL}/api/assessments/diagnostic/start`, {}, { headers: { Authorization: `Bearer ${fakeToken}` } })
    assert(false, 'Test 5: Non-existent user should fail')
  } catch (err) {
    assert(err.response?.status === 404, `Test 5: Unauthorized/missing user rejected with 404 (${err.response?.status})`)
  }

  // Restore primary user to valid Step 4 state
  testUser.onboarding_step = 4
  testUser.skills_to_develop = sampleCompIds
  await testUser.save()

  console.log('\n--- GROUP 2: Attempt Creation, Timer & Expiry Enforcement ---')

  // Test 6: New attempt receives a server-generated started_at
  const startBefore = Date.now()
  const startRes = await axios.post(`${BASE_URL}/api/assessments/diagnostic/start`, {}, authHeader)
  const startAfter = Date.now()

  assert(startRes.status === 201 || startRes.status === 200, `Test 6a: Start assessment returns success status (${startRes.status})`)
  const attemptId = startRes.data?.attemptId
  assert(Boolean(attemptId), `Test 6b: Received valid attemptId: ${attemptId}`)

  const attemptDoc = await AssessmentAttempt.findById(attemptId)
  assert(Boolean(attemptDoc), `Test 6c: AssessmentAttempt record persisted in MongoDB`)
  assert(
    attemptDoc.started_at &&
      new Date(attemptDoc.started_at).getTime() >= startBefore - 2000 &&
      new Date(attemptDoc.started_at).getTime() <= startAfter + 2000,
    `Test 6d: Server generated valid started_at timestamp (${attemptDoc.started_at.toISOString()})`
  )

  // Test 7: Expiry is exactly 20 minutes after start
  const startedMs = new Date(attemptDoc.started_at).getTime()
  const expiresMs = new Date(attemptDoc.expires_at).getTime()
  const diffSeconds = Math.round((expiresMs - startedMs) / 1000)
  assert(
    diffSeconds === 1200,
    `Test 7: Expiry is exactly 20 minutes (1200 seconds) after start (actual difference: ${diffSeconds}s)`
  )

  // Test 8: Repeated start requests do not create unintended concurrent attempts
  const repeatStartRes = await axios.post(`${BASE_URL}/api/assessments/diagnostic/start`, {}, authHeader)
  assert(repeatStartRes.status === 200, `Test 8a: Repeated start returns 200 OK`)
  assert(repeatStartRes.data.is_resumed === true, `Test 8b: Response indicates attempt is resumed (is_resumed: true)`)
  assert(
    repeatStartRes.data.attemptId === attemptId,
    `Test 8c: Resumed attemptId matches existing active attempt (${attemptId})`
  )
  const userAttemptCount = await AssessmentAttempt.countDocuments({ user_id: testUser._id })
  assert(userAttemptCount === 1, `Test 8d: Database holds exactly 1 attempt document for user (no duplicate inflation)`)

  // Test 9: Refresh/retrieval returns the original expiry
  assert(
    new Date(repeatStartRes.data.attempt.expires_at).getTime() === expiresMs,
    `Test 9: Retrieval returns the immutable original expiry timestamp (${repeatStartRes.data.attempt.expires_at})`
  )

  // Test 10: Client-provided timer values cannot extend expiry
  const tamperStartRes = await axios.post(
    `${BASE_URL}/api/assessments/diagnostic/start`,
    {
      expires_at: '2099-01-01T00:00:00.000Z',
      duration_seconds: 999999,
      started_at: '2020-01-01T00:00:00.000Z',
    },
    authHeader
  )
  const reloadedAttempt = await AssessmentAttempt.findById(attemptId)
  assert(
    new Date(reloadedAttempt.expires_at).getTime() === expiresMs,
    `Test 10: Client tampering payload ignored; server-authoritative expiry preserved (${reloadedAttempt.expires_at.toISOString()})`
  )

  // Test 11: Expired attempts reject answer modifications
  // Temporarily fast-forward expiry to 10 seconds ago in MongoDB to test server expiry check
  await AssessmentAttempt.findByIdAndUpdate(attemptId, {
    expires_at: new Date(Date.now() - 10000),
  })

  const testQuestionId = attemptDoc.question_ids[0].toString()
  const testQuestion = await Question.findById(testQuestionId)
  const testOptionId = testQuestion.options[0].id || testQuestion.options[0].key || String(testQuestion.options[0])

  try {
    await axios.post(
      `${BASE_URL}/api/assessments/diagnostic/${attemptId}/save-answer`,
      { question_id: testQuestionId, selected_option_id: testOptionId },
      authHeader
    )
    assert(false, 'Test 11: save-answer on expired attempt should fail with 400')
  } catch (err) {
    assert(
      err.response?.status === 400 && err.response?.data?.code === 'ATTEMPT_EXPIRED',
      `Test 11a: Expired attempt rejects answer modification with 400 ATTEMPT_EXPIRED (${err.response?.data?.message})`
    )
    const updatedStatusAttempt = await AssessmentAttempt.findById(attemptId)
    assert(
      updatedStatusAttempt.status === 'expired',
      `Test 11b: Attempt status automatically transitioned to 'expired' in MongoDB`
    )
  }

  // Test 12: Expired attempts reject normal manual submission
  try {
    await axios.post(
      `${BASE_URL}/api/assessments/diagnostic/${attemptId}/submit`,
      { responses: [{ question_id: testQuestionId, selected_option_id: testOptionId }] },
      authHeader
    )
    assert(false, 'Test 12: submit on expired attempt should fail with 400')
  } catch (err) {
    assert(
      err.response?.status === 400 && err.response?.data?.code === 'ATTEMPT_EXPIRED',
      `Test 12: Expired attempt rejects submission with 400 ATTEMPT_EXPIRED (${err.response?.data?.message})`
    )
  }

  // Reset expiry to 20 minutes from now and status to 'in_progress' to continue answer testing
  await AssessmentAttempt.findByIdAndUpdate(attemptId, {
    status: 'in_progress',
    expires_at: new Date(Date.now() + 1200000),
  })

  console.log('\n--- GROUP 3: Answer Persistence, Autosave & Validation ---')

  // Test 14: Valid question responses save correctly via save-answer endpoint
  const saveRes = await axios.post(
    `${BASE_URL}/api/assessments/diagnostic/${attemptId}/save-answer`,
    {
      question_id: testQuestionId,
      selected_option_id: testOptionId,
      time_taken_seconds: 14,
    },
    authHeader
  )
  assert(saveRes.status === 200 && saveRes.data.success === true, `Test 14a: save-answer endpoint returned 200 OK`)
  const savedResponseDoc = await AssessmentResponse.findOne({
    attempt_id: attemptId,
    question_id: testQuestionId,
  })
  assert(Boolean(savedResponseDoc), `Test 14b: AssessmentResponse document created in MongoDB`)
  assert(
    savedResponseDoc.selected_option_id === testOptionId,
    `Test 14c: Saved selected_option_id matches submitted option (${savedResponseDoc.selected_option_id})`
  )
  assert(
    savedResponseDoc.time_taken_seconds === 14,
    `Test 14d: Saved time_taken_seconds persisted accurately (14s)`
  )

  // Test 15: Invalid question IDs are rejected
  try {
    await axios.post(
      `${BASE_URL}/api/assessments/diagnostic/${attemptId}/save-answer`,
      {
        question_id: new mongoose.Types.ObjectId().toString(),
        selected_option_id: testOptionId,
      },
      authHeader
    )
    assert(false, 'Test 15: Non-member question ID should fail')
  } catch (err) {
    assert(
      err.response?.status === 400 && err.response?.data?.code === 'INVALID_QUESTION_ID',
      `Test 15: Question not belonging to attempt rejected with 400 INVALID_QUESTION_ID (${err.response?.data?.message})`
    )
  }

  // Test 16: Invalid options are rejected
  try {
    await axios.post(
      `${BASE_URL}/api/assessments/diagnostic/${attemptId}/save-answer`,
      {
        question_id: testQuestionId,
        selected_option_id: 'non_existent_option_12345',
      },
      authHeader
    )
    assert(false, 'Test 16: Invalid option ID should fail')
  } catch (err) {
    assert(
      err.response?.status === 400 && err.response?.data?.code === 'INVALID_OPTION_ID',
      `Test 16: Invalid option ID rejected with 400 INVALID_OPTION_ID (${err.response?.data?.message})`
    )
  }

  // Test 17: Duplicate answer updates do not inflate question counts
  const secondOptionId = testQuestion.options[1]?.id || testQuestion.options[1]?.key || 'opt2'
  await axios.post(
    `${BASE_URL}/api/assessments/diagnostic/${attemptId}/save-answer`,
    {
      question_id: testQuestionId,
      selected_option_id: secondOptionId,
      time_taken_seconds: 28,
    },
    authHeader
  )
  const responseCountForQ = await AssessmentResponse.countDocuments({
    attempt_id: attemptId,
    question_id: testQuestionId,
  })
  const updatedResponseDoc = await AssessmentResponse.findOne({
    attempt_id: attemptId,
    question_id: testQuestionId,
  })
  assert(
    responseCountForQ === 1,
    `Test 17a: Duplicate answer updates upsert existing record (total docs for question: ${responseCountForQ})`
  )
  assert(
    updatedResponseDoc.selected_option_id === secondOptionId,
    `Test 17b: Record updated with new selected option (${secondOptionId})`
  )

  // Test 18: Answers persist across retrieval
  const resumeRes = await axios.post(`${BASE_URL}/api/assessments/diagnostic/start`, {}, authHeader)
  assert(resumeRes.data.is_resumed === true, `Test 18a: Start request resumes in_progress attempt`)
  const foundSaved = resumeRes.data.saved_responses?.find(
    (r) => r.question_id.toString() === testQuestionId
  )
  assert(
    foundSaved && foundSaved.selected_option_id === secondOptionId,
    `Test 18b: Saved answer returned in resume payload (${foundSaved?.selected_option_id})`
  )

  // Test 20: Cross-user answer modification is rejected
  try {
    await axios.post(
      `${BASE_URL}/api/assessments/diagnostic/${attemptId}/save-answer`,
      {
        question_id: testQuestionId,
        selected_option_id: secondOptionId,
      },
      secondAuthHeader
    )
    assert(false, 'Test 20: Cross-user save-answer should fail with 403')
  } catch (err) {
    assert(
      err.response?.status === 403 && err.response?.data?.code === 'FORBIDDEN',
      `Test 20: Cross-user answer modification rejected with 403 FORBIDDEN`
    )
  }

  console.log('\n--- GROUP 4: Assessment Integrity, Question Sanitation & Scoring ---')

  // Test 21: Correct answers are not exposed before submission
  const deliveredQuestions = resumeRes.data.questions || []
  assert(deliveredQuestions.length === 15, `Test 21a: Exactly 15 diagnostic questions delivered to learner`)
  const hasLeakedCorrect = deliveredQuestions.some(
    (q) => q.correct_option_id !== undefined || q.explanation !== undefined
  )
  assert(!hasLeakedCorrect, `Test 21b: Zero correct_option_id or explanation fields exposed in question payload`)

  // Test 24: Competency mapping remains correct
  const allMappedToComp = deliveredQuestions.every((q) => Boolean(q.competency_id && q.competency_name))
  assert(allMappedToComp, `Test 24: All 15 questions properly mapped to competencies`)

  // Autosave answers for 10 out of 15 questions, leave 5 unanswered
  const questionsList = await Question.find({ _id: { $in: attemptDoc.question_ids } })
  const qMap = new Map(questionsList.map((q) => [q._id.toString(), q]))

  let knownCorrectCount = 0
  for (let i = 0; i < 10; i++) {
    const qId = attemptDoc.question_ids[i].toString()
    const qObj = qMap.get(qId)
    // Alternate: answer half correctly, half with wrong option
    let chosenOptId
    if (i % 2 === 0) {
      chosenOptId = qObj.correct_option_id
      knownCorrectCount++
    } else {
      const wrongOpt = qObj.options.find((opt) => (opt.id || opt.key) !== qObj.correct_option_id)
      chosenOptId = wrongOpt ? (wrongOpt.id || wrongOpt.key) : 'wrong_opt'
    }

    await axios.post(
      `${BASE_URL}/api/assessments/diagnostic/${attemptId}/save-answer`,
      {
        question_id: qId,
        selected_option_id: chosenOptId,
        time_taken_seconds: 20,
      },
      authHeader
    )
  }

  // Pre-submission check of user state
  const preSubmitUser = await User.findById(userId)
  const initialSkillsToDev = JSON.stringify(preSubmitUser.skills_to_develop)

  // Submit assessment (Test 22, 23, 26, 28, 29)
  const submitRes = await axios.post(
    `${BASE_URL}/api/assessments/diagnostic/${attemptId}/submit`,
    {},
    authHeader
  )

  assert(submitRes.status === 200 && submitRes.data.success === true, `Test 23a: Assessment submission succeeded with 200 OK`)

  // Test 22: Unanswered questions evaluated as incorrect
  const allGradedResponses = await AssessmentResponse.find({ attempt_id: attemptId })
  const unansweredResponses = allGradedResponses.filter((r) => r.selected_option_id === null)
  assert(
    unansweredResponses.length === 5,
    `Test 22a: 5 remaining questions recorded as unanswered (count: ${unansweredResponses.length})`
  )
  const allUnansweredFalse = unansweredResponses.every((r) => r.is_correct === false)
  assert(allUnansweredFalse, `Test 22b: All unanswered questions evaluated as is_correct: false`)

  // Test 23: Scoring uses the existing algorithm
  const totalCorrectResponses = allGradedResponses.filter((r) => r.is_correct === true).length
  assert(
    totalCorrectResponses === knownCorrectCount,
    `Test 23b: Graded correct count matches expected: ${totalCorrectResponses} correct out of 15 (expected: ${knownCorrectCount})`
  )
  const expectedPercentage = Math.round((knownCorrectCount / 15) * 100)
  assert(
    submitRes.data.overall_score === expectedPercentage,
    `Test 23c: Overall score matches exact percentage: ${submitRes.data.overall_score}% (expected: ${expectedPercentage}%)`
  )

  // Test 25: Existing skills_to_develop data is unchanged
  const postSubmitUser = await User.findById(userId)
  assert(
    JSON.stringify(postSubmitUser.skills_to_develop) === initialSkillsToDev,
    `Test 25: User skills_to_develop array remains untouched after submission`
  )

  // Test 26: UserCompetency and SkillGap are populated by legitimate assessment pipeline
  const userComps = await UserCompetency.find({ user_id: userId, assessment_attempt_id: attemptId })
  assert(userComps.length > 0, `Test 26a: UserCompetency records created/updated (${userComps.length} competencies)`)
  const skillGaps = await SkillGap.find({ user_id: userId })
  assert(skillGaps.length > 0, `Test 26b: SkillGap records computed by pipeline (${skillGaps.length} gaps identified)`)

  // Test 27: The scoring pipeline executes at most once per attempt
  // Test 13: Duplicate submissions are rejected safely
  try {
    await axios.post(
      `${BASE_URL}/api/assessments/diagnostic/${attemptId}/submit`,
      {},
      authHeader
    )
    assert(false, 'Test 13: Second submission should fail with 409')
  } catch (err) {
    assert(
      err.response?.status === 409 && err.response?.data?.code === 'ATTEMPT_ALREADY_COMPLETED',
      `Test 13 & 27: Duplicate submission rejected with 409 ATTEMPT_ALREADY_COMPLETED (${err.response?.data?.message})`
    )
  }

  // Test 19: Answer changes are rejected after final submission
  try {
    await axios.post(
      `${BASE_URL}/api/assessments/diagnostic/${attemptId}/save-answer`,
      {
        question_id: testQuestionId,
        selected_option_id: testOptionId,
      },
      authHeader
    )
    assert(false, 'Test 19: save-answer on completed attempt should fail with 409')
  } catch (err) {
    assert(
      err.response?.status === 409 && err.response?.data?.code === 'ATTEMPT_ALREADY_COMPLETED',
      `Test 19: Answer changes rejected on completed attempt with 409 ATTEMPT_ALREADY_COMPLETED`
    )
  }

  // Test 28: Successful assessment advances onboarding to Step 6
  assert(
    postSubmitUser.onboarding_step === 6,
    `Test 28: Onboarding step advanced to 6 (actual step: ${postSubmitUser.onboarding_step})`
  )

  // Test 29: Successful assessment does not mark onboarding completed
  assert(
    postSubmitUser.onboarding_completed === false,
    `Test 29: Onboarding is NOT marked completed (onboarding_completed: ${postSubmitUser.onboarding_completed})`
  )

  // Safe fixture teardown
  await safeCleanupTestUsers(['step5_learner_test@gov.in', 'step5_other_user@gov.in'])
  console.log('  (Test fixtures cleaned up successfully)')

  console.log('\n========================================================================')
  console.log(`SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`)
  console.log('========================================================================\n')

  await closeTestEnvironment()
  process.exit(failedCount > 0 ? 1 : 0)
}

runStep5DiagnosticTests().catch(async (err) => {
  console.error('Fatal error running Step 5 Diagnostic Assessment tests:', err)
  await closeTestEnvironment()
  process.exit(1)
})
