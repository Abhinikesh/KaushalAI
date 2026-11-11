'use strict'

const assert = require('assert')
const fs = require('fs')
const http = require('http')
const path = require('path')
const { execFileSync } = require('child_process')
const express = require('express')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')

require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'kaushalai_dev_access_secret_change_in_prod'
const TEST_DB_URI = 'mongodb://127.0.0.1:27017/kaushalai_test'

const {
  Assessment,
  AssessmentAttempt,
  Competency,
  Department,
  Quiz,
  QuizAttempt,
  Role,
  RoleCompetency,
  SkillGap,
  User,
  UserCompetency,
} = require('./src/models')

const adminRoutes = require('./src/routes/admin.routes')
const mcqRoutes = require('./src/routes/mcq.routes')
const userFeaturesRoutes = require('./src/routes/userFeatures.routes')

const {
  reconcileUserCompetencies,
  writeLegacyBackupFile,
  verifyLegacyBackupFile,
} = require('./scripts/reconcile_user_competencies')

const {
  ensurePhase351Indexes,
  TARGET_INDEXES,
} = require('./scripts/create_phase35_1_indexes')

function makeRequest(port, options, body = null) {
  return new Promise((resolve, reject) => {
    const reqOpts = {
      hostname: '127.0.0.1',
      port,
      path: options.path,
      method: options.method || 'GET',
      headers: { ...(options.headers || {}) },
    }
    let payload = null
    if (body !== null) {
      payload = JSON.stringify(body)
      reqOpts.headers['Content-Type'] = 'application/json'
      reqOpts.headers['Content-Length'] = Buffer.byteLength(payload)
    }

    const req = http.request(reqOpts, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} })
        } catch (err) {
          resolve({ status: res.statusCode, body: { raw: data } })
        }
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

function signToken(user) {
  return jwt.sign(
    { id: String(user._id), role: user.role, email: user.email },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '30m' }
  )
}

async function cleanupP351Fixtures(db) {
  const testUsers = await User.find({ email: /@p351\.test$/i }).select('_id').lean()
  const testUserIds = testUsers.map((u) => u._id)
  const testDepts = await Department.find({ code: /^P351_/ }).select('_id').lean()
  const testDeptIds = testDepts.map((d) => d._id)
  const testRoles = await Role.find({
    $or: [{ department_ref: { $in: testDeptIds } }, { name: /^P351 / }],
  }).select('_id').lean()
  const testRoleIds = testRoles.map((r) => r._id)
  const testComps = await Competency.find({ competencyCode: /^P351-/ }).select('_id').lean()
  const testCompIds = testComps.map((c) => c._id)
  const testAssessments = await Assessment.find({ name: /^P351 / }).select('_id').lean()
  const testAssessmentIds = testAssessments.map((a) => a._id)
  const testQuizzes = await Quiz.find({ title: /^P351 / }).select('_id').lean()
  const testQuizIds = testQuizzes.map((q) => q._id)

  await Promise.all([
    db.collection('usercompetencies').deleteMany({
      $or: [
        { p351Fixture: true },
        { userId: { $in: testUserIds } },
        { competencyId: { $in: testCompIds } },
      ],
    }),
    UserCompetency.deleteMany({
      $or: [{ user_id: { $in: testUserIds } }, { competency_id: { $in: testCompIds } }],
    }),
    SkillGap.deleteMany({ user_id: { $in: testUserIds } }),
    AssessmentAttempt.deleteMany({
      $or: [{ user_id: { $in: testUserIds } }, { assessment_id: { $in: testAssessmentIds } }],
    }),
    QuizAttempt.deleteMany({
      $or: [{ userId: { $in: testUserIds } }, { quizId: { $in: testQuizIds } }],
    }),
    RoleCompetency.deleteMany({
      $or: [{ role_id: { $in: testRoleIds } }, { competency_id: { $in: testCompIds } }],
    }),
    Assessment.deleteMany({ _id: { $in: testAssessmentIds } }),
    Quiz.deleteMany({ _id: { $in: testQuizIds } }),
    Role.deleteMany({ _id: { $in: testRoleIds } }),
    Department.deleteMany({ _id: { $in: testDeptIds } }),
    Competency.deleteMany({ _id: { $in: testCompIds } }),
    User.deleteMany({ _id: { $in: testUserIds } }),
  ])
}

async function runTests() {
  console.log('=== Phase 35.1 Tests: Competency Reconciliation & Assessment History ===\n')

  await mongoose.connect(TEST_DB_URI)
  const db = mongoose.connection.db
  assert.strictEqual(db.databaseName, 'kaushalai_test', 'Tests must strictly run on kaushalai_test')

  // Clean only P351-scoped fixtures (preserving seeded kaushalai_test master data)
  await cleanupP351Fixtures(db)
  const baselineCanonicalCount = await UserCompetency.countDocuments()
  const baselineLegacyCount = await db.collection('usercompetencies').countDocuments()
  assert.strictEqual(baselineLegacyCount, 0, 'Expected clean usercompetencies collection in kaushalai_test')

  const app = express()
  app.use(express.json())
  app.use('/api', adminRoutes)
  app.use('/api', mcqRoutes)
  app.use('/api', userFeaturesRoutes)
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ message: err.message })
  })

  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port

  const backupTmpDir = path.join(__dirname, '.tmp_phase35_1_test')
  fs.mkdirSync(backupTmpDir, { recursive: true })

  try {
    // ── Seed realistic fixtures ────────────────────────────────────────────────
    const dept = await Department.create({
      name: 'P351 Sample Surveys Division',
      code: 'P351_SSD',
      description: 'Test division',
    })
    const role = await Role.create({
      name: 'P351 Statistical Officer',
      level: 4,
      department_ref: dept._id,
    })

    const comp1 = await Competency.create({
      name: 'P351 Sampling Frame Design',
      category: 'statistical',
      competencyCode: 'P351-STAT-01',
      description: 'Design stratified sample frames',
    })
    const comp2 = await Competency.create({
      name: 'P351 Official Metadata Standards',
      category: 'technical',
      competencyCode: 'P351-TECH-01',
      description: 'SDMX and DDI metadata governance',
    })
    const comp3 = await Competency.create({
      name: 'P351 Ethical Data Stewardship',
      category: 'digital_governance',
      competencyCode: 'P351-GOV-01',
      description: 'Privacy and microdata anonymization',
    })
    const extraComps = []
    for (let i = 0; i < 40; i++) {
      extraComps.push(await Competency.create({
        name: `P351 Test Competency ${i + 1}`,
        category: i % 2 === 0 ? 'statistical' : 'technical',
        competencyCode: `P351-TC-${String(i + 1).padStart(2, '0')}`,
      }))
    }

    await RoleCompetency.create([
      { role_id: role._id, competency_id: comp1._id, required_level: 5 },
      { role_id: role._id, competency_id: comp2._id, required_level: 4 },
      { role_id: role._id, competency_id: comp3._id, required_level: 4 },
    ])

    const adminUser = await User.create({
      name: 'Admin Officer',
      email: 'admin.test@p351.test',
      passwordHash: 'hash',
      role: 'admin',
      isActive: true,
    })
    const learnerA = await User.create({
      name: 'Rahul Kumar',
      email: 'rahul.test@p351.test',
      passwordHash: 'hash',
      role: 'employee',
      department: 'P351 Sample Surveys Division',
      department_id: dept._id,
      role_id: role._id,
      isActive: true,
    })
    const learnerB = await User.create({
      name: 'Priya Sharma',
      email: 'priya.test@p351.test',
      passwordHash: 'hash',
      role: 'employee',
      department: 'P351 Sample Surveys Division',
      department_id: dept._id,
      role_id: role._id,
      isActive: true,
    })

    // 41 canonical user_competencies initially (1 conflict pair on comp1 + 40 on extraComps for learnerB)
    await UserCompetency.create({
      user_id: learnerA._id,
      competency_id: comp1._id,
      current_level: 5,
      source: 'diagnostic_test',
      last_assessed_at: new Date('2026-09-13T10:58:20.208Z'),
    })
    for (const ec of extraComps) {
      await UserCompetency.create({
        user_id: learnerB._id,
        competency_id: ec._id,
        current_level: 3,
        source: 'self_assessed',
        last_assessed_at: new Date('2026-09-01T00:00:00.000Z'),
      })
    }

    // Legacy usercompetencies docs matching dev structure (25 docs: 1 admin quiz, 1 conflict, 23 non-conflicting learnerA + invalid test docs checked separately)
    const legacyDocs = [
      // Conflict pair on learnerA + comp1 (level 4 self_assessed vs canonical level 5 diagnostic_test)
      {
        _id: new mongoose.Types.ObjectId(),
        userId: learnerA._id,
        competencyId: comp1._id,
        currentLevel: 4,
        lastUpdated: new Date('2026-09-04T07:33:11.668Z'),
        source: 'self_assessed',
        createdAt: new Date('2026-09-04T07:33:11.668Z'),
        updatedAt: new Date('2026-09-04T07:33:11.668Z'),
      },
      // Admin doc in legacy collection (should insert into user_competencies, but MUST skip skill gap recalc)
      {
        _id: new mongoose.Types.ObjectId(),
        userId: adminUser._id,
        competencyId: comp2._id,
        currentLevel: 4,
        lastUpdated: new Date('2026-09-05T10:00:00.000Z'),
        source: 'quiz',
      },
      // LearnerA non-conflicting legacy doc for comp2 (mapped in RoleCompetency required 4, legacy current 2 -> gap 2)
      {
        _id: new mongoose.Types.ObjectId(),
        userId: learnerA._id,
        competencyId: comp2._id,
        currentLevel: 2,
        lastUpdated: new Date('2026-09-04T08:00:00.000Z'),
        source: 'self_assessed',
      },
      // LearnerA non-conflicting legacy doc for comp3 (mapped in RoleCompetency required 4, legacy current 1 -> gap 3)
      {
        _id: new mongoose.Types.ObjectId(),
        userId: learnerA._id,
        competencyId: comp3._id,
        currentLevel: 1,
        lastUpdated: new Date('2026-09-04T08:05:00.000Z'),
        source: 'self_assessed',
      },
    ]
    // Plus 21 extra non-conflicting legacy docs for learnerA (using first 21 extraComps)
    for (let i = 0; i < 21; i++) {
      legacyDocs.push({
        _id: new mongoose.Types.ObjectId(),
        userId: learnerA._id,
        competencyId: extraComps[i]._id,
        currentLevel: 3,
        lastUpdated: new Date('2026-09-04T08:10:00.000Z'),
        source: 'self_assessed',
      })
    }
    await db.collection('usercompetencies').insertMany(legacyDocs)

    // ── Test A1: Safety Refusals ──────────────────────────────────────────────
    const backupFile = path.join(backupTmpDir, 'legacy_backup.json')
    writeLegacyBackupFile(backupFile, 'kaushalai_test', await db.collection('usercompetencies').find({}).toArray())

    await assert.rejects(
      () => reconcileUserCompetencies(db, {
        apply: true,
        targetDb: '',
        confirmToken: 'RECONCILE_USER_COMPETENCIES',
        backupFile: backupFile,
      }),
      /TARGET_MISMATCH/
    )

    await assert.rejects(
      () => reconcileUserCompetencies(db, {
        apply: true,
        targetDb: 'kaushalai_test',
        confirmToken: 'WRONG_TOKEN',
        backupFile: backupFile,
      }),
      /CONFIRMATION_REQUIRED/
    )

    await assert.rejects(
      () => reconcileUserCompetencies(db, {
        apply: true,
        targetDb: 'kaushalai_test',
        confirmToken: 'RECONCILE_USER_COMPETENCIES',
        backupFile: path.join(backupTmpDir, 'does_not_exist.json'),
      }),
      /BACKUP_NOT_FOUND/
    )

    const corruptBackup = path.join(backupTmpDir, 'corrupt.json')
    fs.writeFileSync(corruptBackup, '{bad json', 'utf8')
    assert.throws(
      () => verifyLegacyBackupFile(corruptBackup, legacyDocs),
      /BACKUP_CORRUPT/
    )

    // Protected DB refusal simulation (mock db with databaseName: 'kaushalai' without --allow-protected-db)
    await assert.rejects(
      () => reconcileUserCompetencies({ databaseName: 'kaushalai' }, {
        apply: true,
        targetDb: 'kaushalai',
        confirmToken: 'RECONCILE_USER_COMPETENCIES',
        backupFile: backupFile,
      }),
      /PROTECTED_DATABASE_REFUSED/
    )
    console.log('✓ A1. Migration safety refusals verified (missing/wrong flags, missing/corrupt backup, protected DB)')

    // ── Test A2: Dry-run Fidelity (41 canonical + 25 legacy -> would_insert 24, conflict 1) ──
    const dryRunReport = await reconcileUserCompetencies(db, { apply: false })
    assert.strictEqual(dryRunReport.mode, 'dry_run')
    assert.strictEqual(dryRunReport.counts.beforeCanonicalCount, baselineCanonicalCount + 41)
    assert.strictEqual(dryRunReport.counts.legacySourceCount, 25)
    assert.strictEqual(dryRunReport.counts.insertedCount, 24)
    assert.strictEqual(dryRunReport.counts.skippedExistingCount, 0)
    assert.strictEqual(dryRunReport.counts.conflictCount, 1)
    assert.strictEqual(dryRunReport.counts.afterCanonicalCount, baselineCanonicalCount + 41)
    assert.strictEqual(dryRunReport.details.conflicts[0].canonical.current_level, 5)
    assert.strictEqual(dryRunReport.details.conflicts[0].canonical.source, 'diagnostic_test')
    assert.strictEqual(dryRunReport.details.conflicts[0].legacy.currentLevel, 4)
    assert.strictEqual(dryRunReport.details.conflicts[0].legacy.source, 'self_assessed')
    assert.strictEqual(dryRunReport.skillGapSync.skippedAdmins.length, 1)
    assert.strictEqual(dryRunReport.skillGapSync.syncedLearners.length, 1)
    assert.strictEqual(dryRunReport.skillGapSync.syncedLearners[0].userId, String(learnerA._id))
    console.log('✓ A2. Dry-run verified (zero writes, +24 would insert, 1 conflict, admin excluded from sync)')

    // ── Test A3: CLI defaults strictly to dry-run on kaushalai_test ───────────
    const cliStdout = execFileSync(
      'node',
      ['scripts/reconcile_user_competencies.js', '--json'],
      { cwd: __dirname, env: { ...process.env, MONGO_URI: TEST_DB_URI }, encoding: 'utf8' }
    )
    const cliJson = JSON.parse(cliStdout)
    assert.strictEqual(cliJson.mode, 'dry_run')
    assert.strictEqual(cliJson.counts.afterCanonicalCount, baselineCanonicalCount + 41)
    console.log('✓ A3. CLI default dry-run verified')

    // ── Test A4: First --apply (+24 -> +65) + conflict preserved + SkillGap sync ─
    const applyReport = await reconcileUserCompetencies(db, {
      apply: true,
      targetDb: 'kaushalai_test',
      confirmToken: 'RECONCILE_USER_COMPETENCIES',
      backupFile: backupFile,
    })
    assert.strictEqual(applyReport.mode, 'apply')
    assert.strictEqual(applyReport.counts.beforeCanonicalCount, baselineCanonicalCount + 41)
    assert.strictEqual(applyReport.counts.insertedCount, 24)
    assert.strictEqual(applyReport.counts.conflictCount, 1)
    assert.strictEqual(applyReport.counts.afterCanonicalCount, baselineCanonicalCount + 65)
    assert.strictEqual(applyReport.counts.afterLegacyCount, 25, 'Legacy usercompetencies must NEVER be dropped or deleted')

    // Verify canonical conflict record preserved untouched at level 5 / diagnostic_test
    const preserved = await UserCompetency.findOne({ user_id: learnerA._id, competency_id: comp1._id }).lean()
    assert.strictEqual(preserved.current_level, 5)
    assert.strictEqual(preserved.source, 'diagnostic_test')

    // Verify SkillGaps computed ONLY for learnerA, NEVER for adminUser
    const adminGaps = await SkillGap.countDocuments({ user_id: adminUser._id })
    const learnerAGaps = await SkillGap.find({ user_id: learnerA._id }).lean()
    assert.strictEqual(adminGaps, 0, 'Admin account must NOT receive computed skill_gaps')
    const gapComp2 = learnerAGaps.find((g) => String(g.competency_id) === String(comp2._id))
    assert.ok(gapComp2, 'Learner A must have recomputed skill gap for comp2')
    assert.strictEqual(gapComp2.current_level, 2)
    assert.strictEqual(gapComp2.required_level, 4)
    assert.strictEqual(gapComp2.gap, 2)
    console.log('✓ A4. First apply verified (41 -> 65, conflict preserved, learner SkillGaps synced, admin untouched)')

    // ── Test A5: Repeated --apply Idempotency ──────────────────────────────────
    const repeatReport = await reconcileUserCompetencies(db, {
      apply: true,
      targetDb: 'kaushalai_test',
      confirmToken: 'RECONCILE_USER_COMPETENCIES',
      backupFile: backupFile,
    })
    assert.strictEqual(repeatReport.counts.insertedCount, 0)
    assert.strictEqual(repeatReport.counts.skippedExistingCount, 24)
    assert.strictEqual(repeatReport.counts.conflictCount, 1)
    assert.strictEqual(repeatReport.counts.afterCanonicalCount, baselineCanonicalCount + 65)
    assert.strictEqual(repeatReport.skillGapSync.evaluatedUsers.length, 0)
    console.log('✓ A5. Second apply verified idempotent (0 inserts, 24 skippedExisting, 1 conflict)')

    // ── Test A6: Invalid/dangling refs + race E11000 + SkillGap failure isolation ─
    const extraLegacyInvalid = await Competency.create({
      name: 'P351 Race Comp',
      category: 'statistical',
      competencyCode: 'P351-RACE-01',
    })
    const danglingId = new mongoose.Types.ObjectId()
    const invalidDocs = [
      { _id: new mongoose.Types.ObjectId(), p351Fixture: true, userId: new mongoose.Types.ObjectId(), competencyId: comp2._id, currentLevel: 2, source: 'self_assessed' },
      { _id: new mongoose.Types.ObjectId(), p351Fixture: true, userId: learnerB._id, competencyId: danglingId, currentLevel: 2, source: 'self_assessed' },
      { _id: new mongoose.Types.ObjectId(), p351Fixture: true, userId: learnerB._id, competencyId: comp1._id, currentLevel: 99, source: 'self_assessed' },
      { _id: new mongoose.Types.ObjectId(), p351Fixture: true, userId: learnerB._id, competencyId: extraLegacyInvalid._id, currentLevel: 3, source: 'self_assessed' },
    ]
    await db.collection('usercompetencies').insertMany(invalidDocs)
    const updatedLegacyAll = await db.collection('usercompetencies').find({}).toArray()
    const backupFile2 = path.join(backupTmpDir, 'legacy_backup_2.json')
    writeLegacyBackupFile(backupFile2, 'kaushalai_test', updatedLegacyAll)

    let injectedRace = false
    const raceAndFailureReport = await reconcileUserCompetencies(db, {
      apply: true,
      targetDb: 'kaushalai_test',
      confirmToken: 'RECONCILE_USER_COMPETENCIES',
      backupFile: backupFile2,
      beforeInsertHook: async ({ competency_id }) => {
        if (!injectedRace && String(competency_id) === String(extraLegacyInvalid._id)) {
          injectedRace = true
          // Concurrent canonical insert before migration upserts
          await UserCompetency.create({
            user_id: learnerB._id,
            competency_id: extraLegacyInvalid._id,
            current_level: 5,
            source: 'diagnostic_test',
            last_assessed_at: new Date(),
          })
        }
      },
    })
    assert.strictEqual(raceAndFailureReport.counts.invalidCount, 3)
    assert.strictEqual(raceAndFailureReport.counts.raceSkippedCount, 1)
    const winner = await UserCompetency.findOne({ user_id: learnerB._id, competency_id: extraLegacyInvalid._id }).lean()
    assert.strictEqual(winner.current_level, 5)
    assert.strictEqual(winner.source, 'diagnostic_test')

    // Now test SkillGap failure isolation with a fresh valid legacy doc
    const isoComp = await Competency.create({ name: 'P351 Isolation Comp', category: 'technical', competencyCode: 'P351-ISO-01' })
    await db.collection('usercompetencies').insertOne({
      _id: new mongoose.Types.ObjectId(),
      userId: learnerB._id,
      competencyId: isoComp._id,
      currentLevel: 2,
      source: 'self_assessed',
    })
    const backupFile3 = path.join(backupTmpDir, 'legacy_backup_3.json')
    writeLegacyBackupFile(backupFile3, 'kaushalai_test', await db.collection('usercompetencies').find({}).toArray())
    const errIsoReport = await reconcileUserCompetencies(db, {
      apply: true,
      targetDb: 'kaushalai_test',
      confirmToken: 'RECONCILE_USER_COMPETENCIES',
      backupFile: backupFile3,
      skillGapSyncSimulator: async () => {
        throw new Error('Simulated SkillGap failure')
      },
    })
    assert.strictEqual(errIsoReport.counts.insertedCount, 1)
    assert.strictEqual(errIsoReport.skillGapSync.deferredLearners.length, 1)
    const freshLearnerB = await User.findById(learnerB._id).lean()
    assert.strictEqual(freshLearnerB.needs_skillgap_sync, true)
    assert.match(freshLearnerB.skillgap_sync_error, /Simulated SkillGap failure/)
    console.log('✓ A6. Invalid/dangling refs, concurrent E11000 race, and SkillGap error isolation verified')
    assert.ok(updatedLegacyAll.length === 29)

    // ── Test B: .populate() + .lean() compatibility in admin & activity-history ─
    const adminToken = signToken(adminUser)
    const learnerAToken = signToken(learnerA)
    const learnerBToken = signToken(learnerB)

    const officerRes = await makeRequest(port, {
      path: `/api/admin/officers/${learnerA._id}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    assert.strictEqual(officerRes.status, 200)
    assert.ok(Array.isArray(officerRes.body.competencies) && officerRes.body.competencies.length >= 24)
    const populatedSample = officerRes.body.competencies.find(
      (c) => c.competencyId?.name === 'P351 Sampling Frame Design'
    )
    assert.ok(populatedSample, 'Admin officer profile must populate competencyId under .lean()')
    assert.strictEqual(populatedSample.competency_id.name, 'P351 Sampling Frame Design')
    assert.strictEqual(populatedSample.competencyId.category, 'statistical')
    assert.strictEqual(populatedSample.currentLevel, 5)
    assert.strictEqual(populatedSample.current_level, 5)

    const activityRes = await makeRequest(port, {
      path: '/api/users/me/activity-history',
      headers: { Authorization: `Bearer ${learnerAToken}` },
    })
    assert.strictEqual(activityRes.status, 200)
    const compEvents = (activityRes.body.timeline || []).filter((e) => e.type === 'competency_level')
    assert.ok(compEvents.length >= 24)
    assert.ok(compEvents.some((e) => e.title.includes('P351 Sampling Frame Design')))
    assert.ok(compEvents.every((e) => !e.badge.includes('undefined')))
    console.log('✓ B. .populate() + .lean() normalization verified in admin profile and learner activity-history')

    // ── Test C: GET /api/quizzes/attempts/:attemptId ──────────────────────────
    const quiz1 = await Quiz.create({
      title: 'P351 NSS Stratified Sampling Quiz',
      domain: 'statistical',
      durationMinutes: 25,
      materialId: new mongoose.Types.ObjectId(),
      createdBy: adminUser._id,
      questions: [],
    })
    const qaCompleted = await QuizAttempt.create({
      userId: learnerA._id,
      quizId: quiz1._id,
      quizTitle: quiz1.title,
      domain: 'statistical',
      score: 80,
      correctCount: 4,
      totalQuestions: 5,
      passed: true,
      durationMinutes: 25,
      startedAt: new Date('2026-10-01T10:00:00.000Z'),
      completedAt: new Date('2026-10-01T10:12:30.000Z'),
      status: 'completed',
      detailedResults: [
        {
          questionId: new mongoose.Types.ObjectId(),
          questionText: 'Sample Q1',
          selectedOptionIndex: 1,
          correctOptionIndex: 1,
          isCorrect: true,
          explanation: 'Correct explanation',
        },
      ],
    })
    const qaNoWindow = await QuizAttempt.create({
      userId: learnerA._id,
      quizId: quiz1._id,
      quizTitle: quiz1.title,
      score: 40,
      correctCount: 2,
      totalQuestions: 5,
      passed: false,
      attemptedAt: new Date('2026-09-10T09:00:00.000Z'),
      status: 'completed',
    })

    // C1: Owner 200 with valid computed durationSeconds = 750
    const detailOwner = await makeRequest(port, {
      path: `/api/quizzes/attempts/${qaCompleted._id}`,
      headers: { Authorization: `Bearer ${learnerAToken}` },
    })
    assert.strictEqual(detailOwner.status, 200)
    assert.strictEqual(detailOwner.body.attempt.score, 80)
    assert.strictEqual(detailOwner.body.attempt.passed, true)
    assert.strictEqual(detailOwner.body.attempt.correctCount, 4)
    assert.strictEqual(detailOwner.body.attempt.incorrectCount, 1)
    assert.strictEqual(detailOwner.body.attempt.durationSeconds, 750)
    assert.strictEqual(detailOwner.body.attempt.detailedResults.length, 1)

    // C2: Uncomputable duration -> durationSeconds strictly null
    const detailNoWindow = await makeRequest(port, {
      path: `/api/quizzes/attempts/${qaNoWindow._id}`,
      headers: { Authorization: `Bearer ${learnerAToken}` },
    })
    assert.strictEqual(detailNoWindow.status, 200)
    assert.strictEqual(detailNoWindow.body.attempt.durationSeconds, null)
    assert.strictEqual(detailNoWindow.body.attempt.passed, false)

    // C3: Cross-user -> 404 (no 403 existence leak)
    const detailCross = await makeRequest(port, {
      path: `/api/quizzes/attempts/${qaCompleted._id}`,
      headers: { Authorization: `Bearer ${learnerBToken}` },
    })
    assert.strictEqual(detailCross.status, 404)

    // C4: Missing ObjectId -> 404; Malformed ObjectId -> 400
    const detailMissing = await makeRequest(port, {
      path: `/api/quizzes/attempts/${new mongoose.Types.ObjectId()}`,
      headers: { Authorization: `Bearer ${learnerAToken}` },
    })
    assert.strictEqual(detailMissing.status, 404)
    const detailMalformed = await makeRequest(port, {
      path: '/api/quizzes/attempts/not-a-valid-id',
      headers: { Authorization: `Bearer ${learnerAToken}` },
    })
    assert.strictEqual(detailMalformed.status, 400)
    console.log('✓ C. GET /api/quizzes/attempts/:attemptId verified (200 owner, null duration guard, 404 cross-user/missing, 400 malformed)')

    // ── Test D: GET /api/users/me/assessment-history ──────────────────────────
    const diagAssessment = await Assessment.create({
      name: 'P351 Comprehensive Cadre Diagnostic',
      type: 'diagnostic',
      level: 3,
      total_questions: 15,
    })
    await AssessmentAttempt.create({
      user_id: learnerA._id,
      assessment_id: diagAssessment._id,
      started_at: new Date('2026-10-05T08:00:00.000Z'),
      completed_at: new Date('2026-10-05T08:20:00.000Z'),
      status: 'completed',
      overall_score: 76,
      competency_scores: [{ competency_id: comp1._id, score: 80, derived_level: 5 }],
    })
    await AssessmentAttempt.create({
      user_id: learnerA._id,
      assessment_id: diagAssessment._id,
      started_at: new Date('2026-10-06T08:00:00.000Z'),
      expires_at: new Date('2026-10-06T09:00:00.000Z'),
      status: 'in_progress',
    })
    await QuizAttempt.create({
      userId: learnerA._id,
      quizId: quiz1._id,
      quizTitle: 'Expired Attempt',
      score: 0,
      correctCount: 0,
      totalQuestions: 5,
      status: 'expired',
      startedAt: new Date('2026-10-04T08:00:00.000Z'),
    })
    await QuizAttempt.collection.insertOne({
      _id: new mongoose.Types.ObjectId(),
      userId: learnerA._id,
      quizId: quiz1._id,
      quizTitle: 'Undated Legacy Quiz',
      score: 65,
      totalQuestions: 5,
      correctCount: 3,
      passed: false,
      status: 'completed',
      attemptedAt: null,
      completedAt: null,
    })

    // D1: Merged newest-first completed only
    const histAll = await makeRequest(port, {
      path: '/api/users/me/assessment-history?limit=10&page=1',
      headers: { Authorization: `Bearer ${learnerAToken}` },
    })
    assert.strictEqual(histAll.status, 200)
    assert.strictEqual(histAll.body.items.length, 4) // diag + qaCompleted + qaNoWindow + Undated Legacy Quiz
    assert.strictEqual(histAll.body.meta.inProgressCount, 1)
    assert.strictEqual(histAll.body.meta.expiredCount, 1)
    assert.strictEqual(histAll.body.items[0].kind, 'diagnostic')
    assert.strictEqual(histAll.body.items[0].score, 76)
    assert.strictEqual(histAll.body.items[1].attemptId, String(qaCompleted._id))
    assert.strictEqual(histAll.body.items[2].attemptId, String(qaNoWindow._id))
    assert.strictEqual(histAll.body.items[2].dateIsLegacyFallback, true)
    assert.strictEqual(histAll.body.items[2].completedAt, null)
    assert.ok(histAll.body.items[2].date !== null)
    assert.strictEqual(histAll.body.items[3].title, 'Undated Legacy Quiz')
    assert.strictEqual(histAll.body.items[3].date, null)

    // D2: Empty history on learnerB (isolation check)
    const histB = await makeRequest(port, {
      path: '/api/users/me/assessment-history',
      headers: { Authorization: `Bearer ${learnerBToken}` },
    })
    assert.strictEqual(histB.status, 200)
    assert.deepStrictEqual(histB.body.items, [])
    assert.strictEqual(histB.body.pagination.total, 0)

    // D3: Type filter + pagination + includeIncomplete=true
    const histDiag = await makeRequest(port, {
      path: '/api/users/me/assessment-history?type=diagnostic&includeIncomplete=true',
      headers: { Authorization: `Bearer ${learnerAToken}` },
    })
    assert.strictEqual(histDiag.status, 200)
    assert.strictEqual(histDiag.body.items.length, 2)
    const inProgRow = histDiag.body.items.find((i) => i.status === 'in_progress')
    assert.ok(inProgRow)
    assert.strictEqual(inProgRow.isCompleted, false)
    assert.strictEqual(inProgRow.score, null)
    assert.strictEqual(inProgRow.passed, null)
    assert.strictEqual(inProgRow.completedAt, null)

    // D4: Preserve backward-compatible /api/users/me/quiz-attempts
    const legacyEndpoint = await makeRequest(port, {
      path: '/api/users/me/quiz-attempts',
      headers: { Authorization: `Bearer ${learnerAToken}` },
    })
    assert.strictEqual(legacyEndpoint.status, 200)
    assert.ok(Array.isArray(legacyEndpoint.body.attempts))
    console.log('✓ D. Unified GET /api/users/me/assessment-history & backward-compatible /quiz-attempts verified')

    // ── Test E: Index creation & verification script on kaushalai_test ─────────
    const idxDry = await ensurePhase351Indexes(db, { apply: false })
    assert.strictEqual(idxDry.mode, 'dry_run')
    assert.strictEqual(idxDry.status, 'DRY_RUN_READY')

    const idxApply = await ensurePhase351Indexes(db, {
      apply: true,
      targetDb: 'kaushalai_test',
      confirmToken: 'CREATE_PHASE35_1_INDEXES',
    })
    assert.strictEqual(idxApply.mode, 'apply')
    assert.strictEqual(idxApply.status, 'APPLIED')

    const idxSecond = await ensurePhase351Indexes(db, {
      apply: true,
      targetDb: 'kaushalai_test',
      confirmToken: 'CREATE_PHASE35_1_INDEXES',
    })
    assert.ok(idxSecond.results.every((r) => r.status === 'ALREADY_EXISTS'))

    // Confirm index keys actually exist in kaushalai_test
    const qaIdxs = await db.collection('quizattempts').indexes()
    assert.ok(qaIdxs.some((i) => i.name === TARGET_INDEXES[0].name))
    const aaIdxs = await db.collection('assessment_attempts').indexes()
    assert.ok(aaIdxs.some((i) => i.name === TARGET_INDEXES[1].name))
    const ucIdxs = await db.collection('user_competencies').indexes()
    assert.ok(ucIdxs.some((i) => i.name === 'user_id_1_competency_id_1' && i.unique === true))
    console.log('✓ E. Explicit non-destructive Phase 35.1 index script verified on kaushalai_test')

    console.log('\n🎉 ALL PHASE 35.1 TESTS PASSED SUCCESSFULLY!')
  } finally {
    await cleanupP351Fixtures(db).catch(() => {})
    fs.rmSync(backupTmpDir, { recursive: true, force: true })
    await new Promise((resolve) => server.close(resolve))
    await mongoose.disconnect()
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
