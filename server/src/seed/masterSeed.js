'use strict'
/**
 * masterSeed.js — Complete, idempotent master database seed for KaushalAI.
 * Populates all real datasets and records into MongoDB:
 *  1. 34 Official Competencies (Statistical, Technical, Governance, Behavioural)
 *  2. 15 Job Roles & Competency Requirements (JSO, SSO, Director, Data Scientist, etc.)
 *  3. 60+ Official Courses from iGOT Karmayogi & NSSTA Training Academy
 *  4. Authorized Officer Roster for government identity verification
 *  5. Ready-to-use Real Users with password123 (Rahul Kumar, Priya Nair, etc.)
 *  6. Baseline Officer Competency Ratings for Gap Analysis & Radar Charts
 *  7. Real Course Enrollments & Progress Tracking
 *  8. Digital Certificates of Completion with Verification IDs
 *  9. Real Quizzes & Question Banks with Multiple Choice Questions
 * 10. Platform Notifications & System Settings
 */

const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')
const importRealData = require('./importRealData')

const User = require('../models/User')
const JobRole = require('../models/JobRole')
const Competency = require('../models/Competency')
const UserCompetency = require('../models/UserCompetency')
const Course = require('../models/Course')
const Enrollment = require('../models/Enrollment')
const Certificate = require('../models/Certificate')
const AuthorizedOfficer = require('../models/AuthorizedOfficer')
const Quiz = require('../models/Quiz')
const Question = require('../models/Question')
const Notification = require('../models/Notification')
const SystemSetting = require('../models/SystemSetting')

const BCRYPT_COST = 10

async function masterSeed() {
  console.log('\n================================================================')
  console.log('       KAUSHALAI MASTER DATABASE SEEDING ENGINE                 ')
  console.log('================================================================\n')

  // 1. Ingest official CSV datasets (Competencies, Roles, Courses)
  console.log('▶ STEP 1: Ingesting official MoSPI/iGOT/NSSTA datasets...')
  await importRealData()

  // 2. Fetch created roles and competencies for referencing
  const ssoRole = (await JobRole.findOne({ title: /Senior Statistical Officer/i })) || (await JobRole.findOne())
  const adminRole = (await JobRole.findOne({ title: /Director/i })) || ssoRole
  const surveyComp = await Competency.findOne({ competencyCode: 'STAT001' })
  const samplingComp = await Competency.findOne({ competencyCode: 'STAT002' })
  const pythonComp = await Competency.findOne({ competencyCode: 'TECH001' })
  const sqlComp = await Competency.findOne({ competencyCode: 'TECH003' })
  const vizComp = await Competency.findOne({ competencyCode: 'TECH008' })
  const cyberComp = await Competency.findOne({ competencyCode: 'GOV001' })
  const privacyComp = await Competency.findOne({ competencyCode: 'GOV002' })
  const commComp = await Competency.findOne({ competencyCode: 'BEH002' })

  // 3. Authorized Officers Roster
  console.log('▶ STEP 2: Populating Authorized Officer Roster...')
  const rosterData = [
    {
      employeeId: 'ISS-2016-0842',
      fullName: 'Rahul Kumar',
      officialEmail: 'rahul.kumar@iss.gov.in',
      department: 'Field Operations Division (FOD)',
      jobRoleId: ssoRole?._id,
      isClaimed: true,
    },
    {
      employeeId: 'ISS-2010-0112',
      fullName: 'Priya Nair',
      officialEmail: 'priya.nair@mospi.gov.in',
      department: 'Ministry of Statistics & Programme Implementation (MoSPI)',
      jobRoleId: adminRole?._id,
      isClaimed: true,
    },
    {
      employeeId: 'ISS-2018-0491',
      fullName: 'Amit Sharma',
      officialEmail: 'amit.sharma@nssta.gov.in',
      department: 'National Statistical Systems Training Academy (NSSTA)',
      jobRoleId: ssoRole?._id,
      isClaimed: true,
    },
    {
      employeeId: 'ISS-2012-0235',
      fullName: 'Sunita Patel',
      officialEmail: 'sunita.patel@mospi.gov.in',
      department: 'Survey Design and Research Division (SDRD)',
      jobRoleId: adminRole?._id,
      isClaimed: true,
    },
    {
      employeeId: 'DEMO-001',
      fullName: 'Demo User',
      officialEmail: 'demo@example.com',
      department: 'Field Operations Division (FOD)',
      jobRoleId: ssoRole?._id,
      isClaimed: true,
    },
    {
      employeeId: 'DEMO-002',
      fullName: 'Test Admin',
      officialEmail: 'admin@kaushalai.gov.in',
      department: 'National Data Governance Center (NDGC)',
      jobRoleId: adminRole?._id,
      isClaimed: true,
    },
  ]

  for (const officer of rosterData) {
    await AuthorizedOfficer.findOneAndUpdate(
      { employeeId: officer.employeeId },
      officer,
      { upsert: true, new: true }
    )
  }
  console.log(`  ✓ Seeded ${rosterData.length} officer roster records.`)

  // 4. Seed Primary Users with password123
  console.log('▶ STEP 3: Initializing Official User Accounts with password123...')
  const defaultPasswordHash = await bcrypt.hash('password123', BCRYPT_COST)

  const usersData = [
    {
      name: 'Rahul Kumar',
      email: 'rahul.kumar@iss.gov.in',
      passwordHash: defaultPasswordHash,
      role: 'employee',
      employeeId: 'ISS-2016-0842',
      designation: 'Senior Statistical Officer (SSO)',
      department: 'Field Operations Division (FOD)',
      jobRoleId: ssoRole?._id,
      experienceYears: 8,
      avatarUrl: '/avatars/rahul_kumar.jpg',
      phone: '+91 98765 43210',
      workLocation: 'Sardar Patel Bhavan, New Delhi',
      cadre: 'Indian Statistical Service (ISS)',
      batch: '2016',
      gradeLevel: 'Level 10',
      isActive: true,
    },
    {
      name: 'Rahul Kumar',
      email: 'demo@example.com',
      passwordHash: defaultPasswordHash,
      role: 'employee',
      employeeId: 'DEMO-001',
      designation: 'Senior Statistical Officer (SSO)',
      department: 'Field Operations Division (FOD)',
      jobRoleId: ssoRole?._id,
      experienceYears: 8,
      avatarUrl: '/avatars/rahul_kumar.jpg',
      phone: '+91 98765 43210',
      workLocation: 'New Delhi',
      cadre: 'Indian Statistical Service (ISS)',
      batch: '2016',
      gradeLevel: 'Level 10',
      isActive: true,
    },
    {
      name: 'Priya Nair',
      email: 'priya.nair@mospi.gov.in',
      passwordHash: defaultPasswordHash,
      role: 'admin',
      employeeId: 'ISS-2010-0112',
      designation: 'Director General (Capacity Building)',
      department: 'Ministry of Statistics & Programme Implementation (MoSPI)',
      jobRoleId: adminRole?._id,
      experienceYears: 14,
      avatarUrl: '/avatars/priya_nair.jpg',
      phone: '+91 98111 22334',
      workLocation: 'New Delhi, Headquarters',
      cadre: 'Indian Statistical Service (ISS)',
      batch: '2010',
      gradeLevel: 'Level 14',
      isActive: true,
    },
    {
      name: 'System Admin',
      email: 'admin@kaushalai.gov.in',
      passwordHash: defaultPasswordHash,
      role: 'admin',
      employeeId: 'DEMO-002',
      designation: 'Director General (Capacity Building)',
      department: 'Ministry of Statistics & Programme Implementation (MoSPI)',
      jobRoleId: adminRole?._id,
      experienceYears: 15,
      avatarUrl: '/avatars/priya_nair.jpg',
      phone: '+91 98111 22334',
      workLocation: 'MoSPI HQ, New Delhi',
      cadre: 'Indian Statistical Service (ISS)',
      batch: '2010',
      gradeLevel: 'Level 14',
      isActive: true,
    },
    {
      name: 'Amit Sharma',
      email: 'amit.sharma@nssta.gov.in',
      passwordHash: defaultPasswordHash,
      role: 'employee',
      employeeId: 'ISS-2018-0491',
      designation: 'Assistant Director (Statistical Analysis)',
      department: 'National Statistical Systems Training Academy (NSSTA)',
      jobRoleId: ssoRole?._id,
      experienceYears: 6,
      avatarUrl: '/avatars/avatar-rahul.jpg',
      phone: '+91 98765 11223',
      workLocation: 'Greater Noida, Uttar Pradesh',
      cadre: 'Indian Statistical Service (ISS)',
      batch: '2018',
      gradeLevel: 'Level 10',
      isActive: true,
    },
  ]

  const createdUsers = []
  for (const u of usersData) {
    const doc = await User.findOneAndUpdate(
      { email: u.email },
      u,
      { upsert: true, new: true }
    )
    createdUsers.push(doc)
  }
  console.log(`  ✓ Seeded ${createdUsers.length} active officer & admin accounts.`)

  const rahulUser = createdUsers[0] // Primary employee
  const priyaUser = createdUsers[2] // Primary admin

  // 5. Baseline Competency Ratings for Rahul Kumar
  console.log('▶ STEP 4: Initializing baseline competency assessments...')
  const sampleCompetencyScores = [
    { comp: surveyComp, level: 3, source: 'course_completion' },
    { comp: samplingComp, level: 2, source: 'self_assessed' },
    { comp: pythonComp, level: 3, source: 'quiz' },
    { comp: sqlComp, level: 4, source: 'course_completion' },
    { comp: vizComp, level: 2, source: 'self_assessed' },
    { comp: cyberComp, level: 3, source: 'quiz' },
    { comp: privacyComp, level: 3, source: 'course_completion' },
    { comp: commComp, level: 4, source: 'self_assessed' },
  ]

  for (const item of sampleCompetencyScores) {
    if (item.comp && rahulUser) {
      await UserCompetency.findOneAndUpdate(
        { userId: rahulUser._id, competencyId: item.comp._id },
        {
          userId: rahulUser._id,
          competencyId: item.comp._id,
          currentLevel: item.level,
          source: item.source,
          lastUpdated: new Date(),
        },
        { upsert: true }
      )
    }
  }
  console.log('  ✓ Seeded officer competency scores for skill-gap & radar analysis.')

  // 6. Enrollments & Course Progress
  console.log('▶ STEP 5: Creating active course enrollments and progress...')
  const pythonCourse = await Course.findOne({ title: /Python for Government Data Analysis/i })
  const sqlCourse = await Course.findOne({ title: /SQL for Government Databases/i })
  const accountsCourse = await Course.findOne({ title: /National Accounts/i })
  const samplingCourse = await Course.findOne({ title: /Sampling Methods and Techniques/i })

  if (rahulUser && pythonCourse) {
    await Enrollment.findOneAndUpdate(
      { userId: rahulUser._id, courseId: pythonCourse._id },
      {
        userId: rahulUser._id,
        courseId: pythonCourse._id,
        status: 'in_progress',
        progressPercent: 65,
        startedAt: new Date(Date.now() - 14 * 24 * 3600 * 1000),
      },
      { upsert: true }
    )
  }

  if (rahulUser && sqlCourse) {
    await Enrollment.findOneAndUpdate(
      { userId: rahulUser._id, courseId: sqlCourse._id },
      {
        userId: rahulUser._id,
        courseId: sqlCourse._id,
        status: 'completed',
        progressPercent: 100,
        startedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
        completedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      },
      { upsert: true }
    )
  }

  if (rahulUser && accountsCourse) {
    await Enrollment.findOneAndUpdate(
      { userId: rahulUser._id, courseId: accountsCourse._id },
      {
        userId: rahulUser._id,
        courseId: accountsCourse._id,
        status: 'in_progress',
        progressPercent: 25,
        startedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      },
      { upsert: true }
    )
  }

  if (rahulUser && samplingCourse) {
    await Enrollment.findOneAndUpdate(
      { userId: rahulUser._id, courseId: samplingCourse._id },
      {
        userId: rahulUser._id,
        courseId: samplingCourse._id,
        status: 'recommended',
        progressPercent: 0,
      },
      { upsert: true }
    )
  }
  console.log('  ✓ Seeded active and completed course enrollments.')

  // 7. Certificates
  console.log('▶ STEP 6: Generating official digital certificates...')
  if (rahulUser && sqlCourse) {
    await Certificate.findOneAndUpdate(
      { certificateId: 'KAUSHAL-2026-SQL-9821' },
      {
        userId: rahulUser._id,
        courseId: sqlCourse._id,
        title: 'Certification in SQL for Government Databases',
        score: 96,
        certificateId: 'KAUSHAL-2026-SQL-9821',
        issuedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      },
      { upsert: true }
    )
  }
  console.log('  ✓ Seeded verifiable course completion certificates.')

  // 8. Quizzes & Assessments
  console.log('▶ STEP 7: Creating official statistical and technical quizzes...')
  const sampleQuizData = [
    {
      title: 'Statistical Methods & Survey Design Assessment',
      materialId: 'mat-stat-survey-2026',
      tagCompetencies: [surveyComp?._id, samplingComp?._id].filter(Boolean),
      questions: [
        {
          questionText: 'What is stratified random sampling in official surveys?',
          options: [
            'Sampling based purely on geographic convenience',
            'Dividing the population into homogeneous sub-groups (strata) and sampling each independently',
            'Selecting units with unequal probabilities without a known frame',
            'Systematically skipping every nth record in an unorganized roster',
          ],
          correctOptionIndex: 1,
          explanation: 'Stratified sampling ensures representation across critical administrative sub-populations and reduces variance.',
          difficulty: 'medium',
        },
        {
          questionText: 'What is the primary function of a sampling frame in NSSO surveys?',
          options: [
            'To set the budgetary cap of the survey',
            'An exhaustive list of all eligible sampling units from which sample selection takes place',
            'To compute post-hoc multipliers',
            'A questionnaire template used by enumerators',
          ],
          correctOptionIndex: 1,
          explanation: 'A sampling frame (e.g. Urban Frame Survey or Census village directories) enables probability-based sample selection.',
          difficulty: 'easy',
        },
        {
          questionText: 'When is Probability Proportional to Size (PPS) sampling preferred?',
          options: [
            'When all primary sampling units have identical population sizes',
            'When primary sampling units vary substantially in size, to increase sampling efficiency',
            'When no sampling frame exists',
            'Exclusively in agricultural yield experiments',
          ],
          correctOptionIndex: 1,
          explanation: 'PPS gives larger units a proportionally higher chance of selection, minimizing standard errors when sizes vary.',
          difficulty: 'hard',
        },
        {
          questionText: 'Which organisation serves as the primary statistical wing under MoSPI since 2019?',
          options: [
            'National Statistical Office (NSO)',
            'Central Statistical Planning Body',
            'Statistical Oversight Commission',
            'National Sample Survey Committee',
          ],
          correctOptionIndex: 0,
          explanation: 'NSO was established by restructuring and merging NSSO and CSO under MoSPI.',
          difficulty: 'easy',
        },
      ],
    },
    {
      title: 'Python for Official Data Wrangling Quiz',
      materialId: 'mat-python-data-2026',
      tagCompetencies: [pythonComp?._id, sqlComp?._id].filter(Boolean),
      questions: [
        {
          questionText: 'Which Python pandas function is used to aggregate unit-level records by state and district?',
          options: ['df.aggregate_records()', 'df.groupby()', 'df.split_apply()', 'df.pivot_simple()'],
          correctOptionIndex: 1,
          explanation: 'pandas.DataFrame.groupby() splits datasets into subsets for aggregation, mean, or count operations.',
          difficulty: 'easy',
        },
        {
          questionText: 'How are missing values commonly represented and filtered in pandas DataFrames?',
          options: ['NaN and df.isna()', 'NULL and df.is_null()', 'None and df.clean()', 'VOID and df.drop()'],
          correctOptionIndex: 0,
          explanation: 'pandas represents missing values as NaN / NA and uses isna() or notna() to detect them.',
          difficulty: 'easy',
        },
        {
          questionText: 'Which SQL clause is used to filter aggregated group results rather than individual rows?',
          options: ['WHERE', 'GROUP BY', 'HAVING', 'FILTER'],
          correctOptionIndex: 2,
          explanation: 'HAVING filters aggregated grouped results, whereas WHERE filters individual rows prior to grouping.',
          difficulty: 'medium',
        },
      ],
    },
  ]

  for (const qData of sampleQuizData) {
    const existingQuiz = await Quiz.findOne({ materialId: qData.materialId })
    if (existingQuiz) {
      await Question.deleteMany({ quizId: existingQuiz._id })
      await Quiz.deleteOne({ _id: existingQuiz._id })
    }

    const newQuiz = await Quiz.create({
      title: qData.title,
      materialId: qData.materialId,
      createdBy: priyaUser?._id || rahulUser?._id,
      questionCount: qData.questions.length,
      tagCompetencyIds: qData.tagCompetencies,
    })

    const createdQuestions = await Question.insertMany(
      qData.questions.map((q) => ({
        ...q,
        quizId: newQuiz._id,
      }))
    )

    newQuiz.questionIds = createdQuestions.map((q) => q._id)
    await newQuiz.save()
  }
  console.log('  ✓ Seeded realistic statistical assessment quizzes and question banks.')

  // 9. Notifications
  console.log('▶ STEP 8: Populating system and learning notifications...')
  if (rahulUser) {
    await Notification.deleteMany({ userId: rahulUser._id })
    await Notification.insertMany([
      {
        userId: rahulUser._id,
        type: 'recommendation_ready',
        message: 'New personalized learning recommendations are available based on your MoSPI competency matrix.',
        isRead: false,
      },
      {
        userId: rahulUser._id,
        type: 'competency_levelup',
        message: 'Congratulations! Your SQL competency has advanced to Level 4 (Advanced).',
        isRead: false,
      },
      {
        userId: rahulUser._id,
        type: 'system',
        message: 'KaushalAI platform is updated with the latest NSSTA 2026 Training Academy Calendar.',
        isRead: true,
      },
    ])
  }
  console.log('  ✓ Seeded officer notifications.')

  // 10. System Settings
  console.log('▶ STEP 9: Configuring platform system settings...')
  await SystemSetting.findOneAndUpdate(
    { key: 'global_config' },
    {
      key: 'global_config',
      platformName: 'KaushalAI',
      platformTagline: 'AI-Enabled Learning Platform for Official Statistics (MoSPI / NSSTA)',
      timeZone: '(GMT+05:30) Asia/Kolkata',
      defaultLanguage: 'English',
      dateFormat: 'DD MMM YYYY',
      currency: 'INR (₹)',
      maintenanceMode: false,
      updatedBy: priyaUser?._id,
    },
    { upsert: true }
  )
  console.log('  ✓ Configured global platform settings.')

  console.log('\n================================================================')
  console.log('🎉 KAUSHALAI MASTER SEEDING COMPLETED SUCCESSFULLY!')
  console.log('================================================================')
  console.log('Default credentials for testing:')
  console.log('  Officer / Employee : rahul.kumar@iss.gov.in / password123')
  console.log('  Admin / MoSPI DG   : priya.nair@mospi.gov.in  / password123')
  console.log('  Demo Quick Login   : demo@example.com         / password123')
  console.log('  Admin Quick Login  : admin@kaushalai.gov.in   / password123')
  console.log('================================================================\n')
}

module.exports = masterSeed

if (require.main === module) {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kaushalai'
  mongoose
    .connect(mongoUri)
    .then(() => masterSeed())
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Master seed failed:', err)
      process.exit(1)
    })
}
