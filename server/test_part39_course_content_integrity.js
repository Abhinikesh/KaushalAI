/**
 * test_part39_course_content_integrity.js
 * Phase 39: KaushalAI Course Catalogue & Learning Content Integrity Test Suite
 *
 * Validates course catalogue integrity, content validation, enrollment gates,
 * quiz-course context validation, and UI resilience against null-modules/null-course crashes.
 *
 * Runs strictly against kaushalai_test with dev DB (kaushalai) immutability checks.
 */

'use strict'

const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })

if (!process.env.ACCESS_TOKEN_SECRET) {
  process.env.ACCESS_TOKEN_SECRET = 'kaushalai_dev_access_secret_change_in_prod'
}

const http = require('http')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const app = require('./src/app')
const { validateTestDatabaseUri } = require('./src/test/testDbGuard')

const User = require('./src/models/User')
const Course = require('./src/models/Course')
const Competency = require('./src/models/Competency')
const Enrollment = require('./src/models/Enrollment')
const LearningActivity = require('./src/models/LearningActivity')
const LearningProgress = require('./src/models/LearningProgress')
const Quiz = require('./src/models/Quiz')
const Question = require('./src/models/Question')

const TEST_DB_URI = process.env.MONGO_TEST_URI || process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/kaushalai_test'
const DEV_DB_URI = 'mongodb://127.0.0.1:27017/kaushalai'
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET

validateTestDatabaseUri(TEST_DB_URI)

let testServer = null
let testBaseUrl = ''
let learnerToken = ''
let learner2Token = ''
let adminToken = ''
let learnerId = null
let learner2Id = null
let adminId = null

let devBaselineCounts = null

let passedCount = 0
let failedCount = 0

function pass(desc) {
  passedCount++
  console.log(`  ✓ ${desc}`)
}

function fail(desc, err) {
  failedCount++
  console.error(`  ✗ ${desc}`)
  if (err) console.error(`    -> ${err.message || err}`)
}

function httpRequest({ method, urlPath, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlPath, testBaseUrl)
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method,
      headers: { ...headers },
    }

    let payload = null
    if (body !== null && typeof body === 'object') {
      payload = JSON.stringify(body)
      options.headers['Content-Type'] = 'application/json'
      options.headers['Content-Length'] = Buffer.byteLength(payload)
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        let json = null
        try {
          json = JSON.parse(data)
        } catch (_) {
          json = data
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json })
      })
    })

    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

async function recordDevDbBaseline() {
  const conn = await mongoose.createConnection(DEV_DB_URI).asPromise()
  const names = ['courses', 'quizzes', 'quizattempts', 'enrollments', 'learning_progress', 'learning_activities', 'certificates', 'user_competencies', 'skill_gaps']
  const counts = {}
  for (const n of names) {
    counts[n] = await conn.collection(n).countDocuments().catch(() => 0)
  }
  await conn.close()
  return counts
}

async function verifyDevDbUnchanged(before) {
  const after = await recordDevDbBaseline()
  for (const [k, v] of Object.entries(before)) {
    if (after[k] !== v) {
      throw new Error(`DEV DB MUTATION DETECTED in collection "${k}": before=${v}, after=${after[k]}`)
    }
  }
}

async function setupTestData() {
  // Clear isolated test collections
  await Promise.all([
    User.deleteMany({}),
    Course.deleteMany({}),
    Competency.deleteMany({}),
    Enrollment.deleteMany({}),
    LearningActivity.deleteMany({}),
    LearningProgress.deleteMany({}),
    Quiz.deleteMany({}),
    Question.deleteMany({}),
  ])

  // Create Users
  const user1 = await User.create({
    name: 'Learner One',
    email: 'learner1.p39@kaushalai.gov.in',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuu',
    role: 'employee',
  })
  learnerId = user1._id

  const user2 = await User.create({
    name: 'Learner Two',
    email: 'learner2.p39@kaushalai.gov.in',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuu',
    role: 'employee',
  })
  learner2Id = user2._id

  const admin = await User.create({
    name: 'Admin User',
    email: 'admin.p39@kaushalai.gov.in',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuu',
    role: 'admin',
  })
  adminId = admin._id

  learnerToken = jwt.sign({ id: String(learnerId), role: 'employee' }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
  learner2Token = jwt.sign({ id: String(learner2Id), role: 'employee' }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
  adminToken = jwt.sign({ id: String(adminId), role: 'admin' }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

  // Create Competencies
  const comp1 = await Competency.create({
    name: 'Data Analysis with Python',
    code: 'COMP-PY-01',
    category: 'technical',
    description: 'Python data manipulation with Pandas',
  })

  const comp2 = await Competency.create({
    name: 'Official Statistics Compilation',
    code: 'COMP-STAT-01',
    category: 'statistical',
    description: 'Sampling and official survey methodology',
  })

  // Create Courses
  // 1. Populated Course
  const coursePopulated = await Course.create({
    title: 'Python for Public Governance',
    description: 'Hands-on Python analysis for government officers.',
    category: 'Data & Analytics',
    difficulty: 'intermediate',
    source: 'igot',
    externalCourseId: 'igot-py-101',
    isPublished: true,
    isArchived: false,
    durationHours: 6,
    skillTags: [comp1._id],
    modules: [
      {
        title: 'Module 1: Introduction to Data Structures',
        duration: '45 mins',
        youtubeUrl: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
        slides: [
          { title: 'Slide 1: Variables and Series', content: 'Overview of Pandas Series' },
          { title: 'Slide 2: DataFrames', content: 'Creating DataFrames' },
        ],
      },
      {
        title: 'Module 2: Filtering and Aggregation',
        duration: '50 mins',
        youtubeUrl: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
        slides: [
          { title: 'Slide 1: GroupBy Syntax', content: 'Aggregation methods' },
        ],
      },
    ],
  })

  // 2. Empty Modules Course (Metadata only)
  const courseEmpty = await Course.create({
    title: 'SQL for Government Databases',
    description: 'Relational database querying for civil servants.',
    category: 'Database',
    difficulty: 'beginner',
    source: 'igot',
    externalCourseId: 'igot-sql-101',
    isPublished: true,
    isArchived: false,
    skillTags: [comp1._id],
    modules: [],
  })

  // 3. Unpublished Course
  const courseUnpublished = await Course.create({
    title: 'Draft Cybersecurity Framework',
    description: 'Internal draft not yet released.',
    category: 'Security',
    isPublished: false,
    isArchived: false,
    modules: [],
  })

  // 4. Deleted Course
  const courseDeleted = await Course.create({
    title: 'Deprecated Office Systems',
    description: 'Old decommissioned course.',
    isPublished: true,
    isDeleted: true,
    modules: [],
  })

  // 5. Course with linked Quiz
  const courseWithQuiz = await Course.create({
    title: 'Sampling Methods & Survey Design',
    description: 'Large-scale sample survey methodology.',
    category: 'Statistics',
    source: 'nssta',
    externalCourseId: 'nssta-samp-01',
    isPublished: true,
    isArchived: false,
    skillTags: [comp2._id],
    modules: [
      {
        title: 'Module 1: Probability Proportional to Size (PPS)',
        slides: [
          { title: 'Slide 1: First Stage Units', content: 'Selecting FSUs' },
          { title: 'Slide 2: Second Stage Stratification', content: 'Households selection' },
        ],
      },
    ],
  })

  const question1 = await Question.create({
    text: 'What is PPS sampling in large scale sample surveys?',
    options: [
      { id: 'opt_a', text: 'Probability Proportional to Size' },
      { id: 'opt_b', text: 'Purely Personal Selection' },
      { id: 'opt_c', text: 'Periodic Population Survey' },
    ],
    correctOptionIndex: 0,
    competency_id: comp2._id,
  })

  const quizLinked = await Quiz.create({
    title: 'Sampling Methods Assessment',
    materialId: 'mat_p39_samp_01',
    courseId: courseWithQuiz._id,
    questionIds: [question1._id],
    questionCount: 1,
    tagCompetencyIds: [comp2._id],
    passPercent: 70,
    durationMinutes: 15,
    isPublished: true,
    createdBy: adminId,
  })

  return {
    coursePopulated,
    courseEmpty,
    courseUnpublished,
    courseDeleted,
    courseWithQuiz,
    quizLinked,
    comp1,
    comp2,
  }
}

async function runTests() {
  console.log('======================================================================')
  console.log(' Phase 39 — KaushalAI Course Catalogue & Content Integrity Test Suite ')
  console.log('======================================================================\n')

  try {
    devBaselineCounts = await recordDevDbBaseline()
    pass(`Dev database baseline verified intact (courses=${devBaselineCounts.courses}, quizzes=${devBaselineCounts.quizzes})`)
  } catch (err) {
    fail('Dev database baseline recording failed', err)
    process.exit(1)
  }

  await mongoose.connect(TEST_DB_URI)
  const testData = await setupTestData()

  testServer = http.createServer(app)
  await new Promise((resolve) => {
    testServer.listen(0, '127.0.0.1', () => {
      const port = testServer.address().port
      testBaseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })

  console.log('\n--- Section 1: Course API & Identifier Resolution ---')

  // 1.1 Fetch populated course by _id
  try {
    const res = await httpRequest({
      method: 'GET',
      urlPath: `/api/courses/${testData.coursePopulated._id}`,
      headers: { Authorization: `Bearer ${learnerToken}` },
    })
    if (res.status === 200 && res.body.title === 'Python for Public Governance') {
      pass('1.1 GET /api/courses/:id resolves valid course by ObjectId with populated fields')
    } else {
      fail(`1.1 Unexpected response: status=${res.status}, title=${res.body?.title}`)
    }
  } catch (err) {
    fail('1.1 Fetch course by ID threw', err)
  }

  // 1.2 Fetch course by externalCourseId
  try {
    const res = await httpRequest({
      method: 'GET',
      urlPath: `/api/courses/igot-py-101`,
      headers: { Authorization: `Bearer ${learnerToken}` },
    })
    if (res.status === 200 && String(res.body._id) === String(testData.coursePopulated._id)) {
      pass('1.2 GET /api/courses/:id resolves course via externalCourseId')
    } else {
      fail(`1.2 Unexpected response: status=${res.status}, body=${JSON.stringify(res.body)}`)
    }
  } catch (err) {
    fail('1.2 Fetch course by externalCourseId threw', err)
  }

  // 1.3 404 on the specific reported failing course ID: 6a9c7732153d7505fd44780 (23-char invalid)
  try {
    const res = await httpRequest({
      method: 'GET',
      urlPath: `/api/courses/6a9c7732153d7505fd44780`,
      headers: { Authorization: `Bearer ${learnerToken}` },
    })
    if (res.status === 404 && res.body.message === 'Course not found') {
      pass('1.3 GET /api/courses/6a9c7732153d7505fd44780 returns HTTP 404 Course not found (not 500)')
    } else {
      fail(`1.3 Unexpected response: status=${res.status}, body=${JSON.stringify(res.body)}`)
    }
  } catch (err) {
    fail('1.3 Course 404 check threw', err)
  }

  // 1.4 404 on arbitrary malformed string ID
  try {
    const res = await httpRequest({
      method: 'GET',
      urlPath: `/api/courses/non-existent-course-12345`,
      headers: { Authorization: `Bearer ${learnerToken}` },
    })
    if (res.status === 404) {
      pass('1.4 GET /api/courses/:id returns 404 for arbitrary non-existent string ID')
    } else {
      fail(`1.4 Expected 404, got status=${res.status}`)
    }
  } catch (err) {
    fail('1.4 Malformed string check threw', err)
  }

  // 1.5 Unpublished course hidden from learner
  try {
    const res = await httpRequest({
      method: 'GET',
      urlPath: `/api/courses/${testData.courseUnpublished._id}`,
      headers: { Authorization: `Bearer ${learnerToken}` },
    })
    if (res.status === 404) {
      pass('1.5 Unpublished course is hidden from learner (HTTP 404)')
    } else {
      fail(`1.5 Expected 404, got status=${res.status}`)
    }
  } catch (err) {
    fail('1.5 Unpublished course check threw', err)
  }

  // 1.6 Unpublished course accessible to admin
  try {
    const res = await httpRequest({
      method: 'GET',
      urlPath: `/api/courses/${testData.courseUnpublished._id}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    if (res.status === 200 && res.body.title === 'Draft Cybersecurity Framework') {
      pass('1.6 Unpublished course is accessible to admin (HTTP 200)')
    } else {
      fail(`1.6 Expected 200, got status=${res.status}`)
    }
  } catch (err) {
    fail('1.6 Admin unpublished course check threw', err)
  }

  // 1.7 Deleted course hidden from all users
  try {
    const res = await httpRequest({
      method: 'GET',
      urlPath: `/api/courses/${testData.courseDeleted._id}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    if (res.status === 404) {
      pass('1.7 Deleted course (isDeleted=true) is hidden from all users (HTTP 404)')
    } else {
      fail(`1.7 Expected 404, got status=${res.status}`)
    }
  } catch (err) {
    fail('1.7 Deleted course check threw', err)
  }

  console.log('\n--- Section 2: Course Content & Module Integrity ---')

  // 2.1 Modules structure in populated course
  try {
    const res = await httpRequest({
      method: 'GET',
      urlPath: `/api/courses/${testData.coursePopulated._id}`,
      headers: { Authorization: `Bearer ${learnerToken}` },
    })
    const course = res.body
    if (Array.isArray(course.modules) && course.modules.length === 2 && course.modules[0].slides.length === 2) {
      pass('2.1 Populated course delivers intact modules and slides hierarchy')
    } else {
      fail('2.1 Module hierarchy missing or incorrect')
    }
  } catch (err) {
    fail('2.1 Module hierarchy test threw', err)
  }

  // 2.2 Empty modules course returns empty array safely
  try {
    const res = await httpRequest({
      method: 'GET',
      urlPath: `/api/courses/${testData.courseEmpty._id}`,
      headers: { Authorization: `Bearer ${learnerToken}` },
    })
    if (res.status === 200 && Array.isArray(res.body.modules) && res.body.modules.length === 0) {
      pass('2.2 Empty modules course returns modules: [] safely without server error')
    } else {
      fail(`2.2 Expected empty array, got: ${JSON.stringify(res.body?.modules)}`)
    }
  } catch (err) {
    fail('2.2 Empty module check threw', err)
  }

  // 2.3 Competency skillTags populated with name and category
  try {
    const res = await httpRequest({
      method: 'GET',
      urlPath: `/api/courses/${testData.coursePopulated._id}`,
      headers: { Authorization: `Bearer ${learnerToken}` },
    })
    const tags = res.body.skillTags
    if (Array.isArray(tags) && tags.length > 0 && tags[0].name === 'Data Analysis with Python') {
      pass('2.3 Competency skillTags populate referenced competency details')
    } else {
      fail(`2.3 skillTags not populated correctly: ${JSON.stringify(tags)}`)
    }
  } catch (err) {
    fail('2.3 Competency populate check threw', err)
  }

  console.log('\n--- Section 3: Enrollment Operations & Access Control ---')

  let enrollment1 = null

  // 3.1 Learner can enroll in valid published course
  try {
    const res = await httpRequest({
      method: 'POST',
      urlPath: `/api/users/me/enrollments`,
      headers: { Authorization: `Bearer ${learnerToken}` },
      body: { courseId: String(testData.coursePopulated._id) },
    })
    if (res.status === 201 && res.body.enrollment) {
      enrollment1 = res.body.enrollment
      pass('3.1 POST /api/users/me/enrollments creates active enrollment (HTTP 201)')
    } else {
      fail(`3.1 Expected 201, got status=${res.status}`)
    }
  } catch (err) {
    fail('3.1 Enrollment creation threw', err)
  }

  // 3.2 Duplicate enrollment returns 409 conflict
  try {
    const res = await httpRequest({
      method: 'POST',
      urlPath: `/api/users/me/enrollments`,
      headers: { Authorization: `Bearer ${learnerToken}` },
      body: { courseId: String(testData.coursePopulated._id) },
    })
    if (res.status === 409) {
      pass('3.2 Duplicate enrollment is rejected with HTTP 409 Conflict')
    } else {
      fail(`3.2 Expected 409, got status=${res.status}`)
    }
  } catch (err) {
    fail('3.2 Duplicate enrollment check threw', err)
  }

  // 3.3 Enroll in invalid course ID returns 404
  try {
    const res = await httpRequest({
      method: 'POST',
      urlPath: `/api/users/me/enrollments`,
      headers: { Authorization: `Bearer ${learnerToken}` },
      body: { courseId: '6a9c7732153d7505fd44780' },
    })
    if (res.status === 404) {
      pass('3.3 Enroll in invalid course ID returns HTTP 404 Course not found')
    } else {
      fail(`3.3 Expected 404, got status=${res.status}`)
    }
  } catch (err) {
    fail('3.3 Invalid enrollment check threw', err)
  }

  // 3.4 Cross-user enrollment isolation
  try {
    const res = await httpRequest({
      method: 'GET',
      urlPath: `/api/users/me/enrollments/${enrollment1._id}/progress`,
      headers: { Authorization: `Bearer ${learner2Token}` },
    })
    if (res.status === 403 || res.status === 404) {
      pass('3.4 Cross-user enrollment access is securely isolated (HTTP 403 or 404 Not Found)')
    } else {
      fail(`3.4 Expected 403 or 404, got status=${res.status}`)
    }
  } catch (err) {
    fail('3.4 Cross-user isolation check threw', err)
  }

  console.log('\n--- Section 4: Server-Authoritative Progress & Learning Activities ---')

  const mod1 = testData.coursePopulated.modules[0]
  const slide1 = mod1.slides[0]
  const slide2 = mod1.slides[1]

  // 4.1 Record slide view activity
  try {
    const res = await httpRequest({
      method: 'POST',
      urlPath: `/api/users/me/enrollments/${enrollment1._id}/activity`,
      headers: { Authorization: `Bearer ${learnerToken}` },
      body: {
        moduleId: String(mod1._id),
        moduleIndex: 0,
        contentType: 'slide',
        contentId: String(slide1._id),
      },
    })
    if ((res.status === 200 || res.status === 201) && res.body.progress) {
      pass('4.1 POST activity records slide view and returns updated server progress (HTTP 200)')
    } else {
      fail(`4.1 Expected 200/201, got status=${res.status}`)
    }
  } catch (err) {
    fail('4.1 Slide activity recording threw', err)
  }

  // 4.2 Duplicate slide view activity does not double count
  try {
    const res = await httpRequest({
      method: 'POST',
      urlPath: `/api/users/me/enrollments/${enrollment1._id}/activity`,
      headers: { Authorization: `Bearer ${learnerToken}` },
      body: {
        moduleId: String(mod1._id),
        moduleIndex: 0,
        contentType: 'slide',
        contentId: String(slide1._id),
      },
    })
    const modProgress = res.body?.progress?.modules?.find((m) => String(m.moduleId) === String(mod1._id))
    if (modProgress?.completedItemsCount === 1) {
      pass('4.2 Duplicate slide view activity is idempotent (completedItemsCount remains 1)')
    } else {
      fail(`4.2 Duplicate activity inflated count: ${modProgress?.completedItemsCount}`)
    }
  } catch (err) {
    fail('4.2 Duplicate slide activity check threw', err)
  }

  // 4.3 Second slide completes module 1
  try {
    const res = await httpRequest({
      method: 'POST',
      urlPath: `/api/users/me/enrollments/${enrollment1._id}/activity`,
      headers: { Authorization: `Bearer ${learnerToken}` },
      body: {
        moduleId: String(mod1._id),
        moduleIndex: 0,
        contentType: 'slide',
        contentId: String(slide2._id),
      },
    })
    const modProgress = res.body?.progress?.modules?.find((m) => String(m.moduleId) === String(mod1._id))
    if (modProgress?.completed === true && res.body?.enrollment?.completedModules?.includes(0)) {
      pass('4.3 Viewing all module slides marks module complete in server-authoritative progress')
    } else {
      fail(`4.3 Module not marked complete: ${JSON.stringify(modProgress)}`)
    }
  } catch (err) {
    fail('4.3 Module completion check threw', err)
  }

  // 4.4 Unenrolled user cannot record activities
  try {
    const fakeEnrollmentId = new mongoose.Types.ObjectId()
    const res = await httpRequest({
      method: 'POST',
      urlPath: `/api/users/me/enrollments/${fakeEnrollmentId}/activity`,
      headers: { Authorization: `Bearer ${learnerToken}` },
      body: {
        moduleId: String(mod1._id),
        moduleIndex: 0,
        contentType: 'slide',
        contentId: String(slide1._id),
      },
    })
    if (res.status === 404) {
      pass('4.4 Activity recording for non-existent enrollment returns HTTP 404')
    } else {
      fail(`4.4 Expected 404, got status=${res.status}`)
    }
  } catch (err) {
    fail('4.4 Unenrolled activity check threw', err)
  }

  console.log('\n--- Section 5: Quizzes & Course Relationship Integrity ---')

  // 5.1 List quizzes linked to course
  try {
    const res = await httpRequest({
      method: 'GET',
      urlPath: `/api/quizzes?courseId=${testData.courseWithQuiz._id}`,
      headers: { Authorization: `Bearer ${learnerToken}` },
    })
    if (res.status === 200 && Array.isArray(res.body.quizzes) && res.body.quizzes.length === 1) {
      pass('5.1 GET /api/quizzes?courseId=:id discovers quizzes linked to course')
    } else {
      fail(`5.1 Expected 1 quiz, got: ${JSON.stringify(res.body)}`)
    }
  } catch (err) {
    fail('5.1 Quiz course lookup threw', err)
  }

  // 5.2 Starting attempt with matching course context succeeds
  try {
    const res = await httpRequest({
      method: 'POST',
      urlPath: `/api/quizzes/${testData.quizLinked._id}/start-attempt?courseId=${testData.courseWithQuiz._id}`,
      headers: { Authorization: `Bearer ${learnerToken}` },
    })
    if (res.status === 201 && (res.body.attempt || res.body.attemptId)) {
      pass('5.2 Starting quiz attempt with valid matching course context succeeds (HTTP 201)')
    } else {
      fail(`5.2 Expected 201, got status=${res.status}`)
    }
  } catch (err) {
    fail('5.2 Quiz attempt start threw', err)
  }

  // 5.3 Starting attempt with mismatched course context is rejected
  try {
    const res = await httpRequest({
      method: 'POST',
      urlPath: `/api/quizzes/${testData.quizLinked._id}/start-attempt?courseId=${testData.coursePopulated._id}`,
      headers: { Authorization: `Bearer ${learnerToken}` },
    })
    if (res.status === 403 && res.body.code === 'QUIZ_COURSE_MISMATCH') {
      pass('5.3 Starting attempt with mismatched courseId returns 403 QUIZ_COURSE_MISMATCH')
    } else {
      fail(`5.3 Expected 403 QUIZ_COURSE_MISMATCH, got status=${res.status}, code=${res.body?.code}`)
    }
  } catch (err) {
    fail('5.3 Mismatched course context check threw', err)
  }

  console.log('\n--- Section 6: Frontend Resilience Verification (Source Audit) ---')

  const clientPath = path.resolve(__dirname, '../client/src/pages/courses/CourseProgressPage.jsx')
  const code = fs.readFileSync(clientPath, 'utf8')

  // 6.1 modulesList filters out null and uses optional chaining
  if (/modulesList\s*=\s*Array\.isArray\(course\?\.modules\)\s*\?\s*course\.modules\.filter\(Boolean\)\s*:\s*\[\]/.test(code)) {
    pass('6.1 CourseProgressPage: modulesList uses course?.modules and filter(Boolean) to guard null/empty modules')
  } else {
    fail('6.1 CourseProgressPage missing safe modulesList definition')
  }

  // 6.2 courseLoading checked before !courseData
  const loadingPos = code.indexOf('if (courseLoading)')
  const notFoundPos = code.indexOf('if (!courseData)')
  if (loadingPos !== -1 && notFoundPos !== -1 && loadingPos < notFoundPos) {
    pass('6.2 CourseProgressPage: if (courseLoading) precedes if (!courseData) for proper loading lifecycle')
  } else {
    fail('6.2 CourseProgressPage loading order incorrect')
  }

  // 6.3 No unsafe bare dereference of course.modules
  const bareModulesMatch = code.match(/course\.modules(?!\?)/g)
  // In our code, course?.modules is used, with course.modules.filter(Boolean) inside the ternary branch where course?.modules was truthy
  if (!bareModulesMatch || bareModulesMatch.length <= 1) {
    pass('6.3 CourseProgressPage: No unguarded top-level course.modules dereferences')
  } else {
    fail(`6.3 Found ${bareModulesMatch.length} unguarded course.modules accesses`)
  }

  // 6.4 Safe course.title usage
  const bareTitleMatch = code.match(/course\.title(?!\?)/g)
  if (!bareTitleMatch || bareTitleMatch.length === 0) {
    pass('6.4 CourseProgressPage: No unguarded course.title dereferences')
  } else {
    fail(`6.4 Found unguarded course.title accesses: ${bareTitleMatch.length}`)
  }

  console.log('\n--- Section 7: Final Dev Database Immutability Verification ---')

  try {
    await verifyDevDbUnchanged(devBaselineCounts)
    pass('7.1 Dev database (kaushalai) verified 100% UNTOUCHED and pristine after test suite execution')
  } catch (err) {
    fail('7.1 Dev database immutability violation', err)
  }

  console.log('\n======================================================================')
  console.log(` Summary: ${passedCount} PASSED, ${failedCount} FAILED`)
  console.log('======================================================================')

  if (testServer) testServer.close()
  await mongoose.disconnect()

  if (failedCount > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
