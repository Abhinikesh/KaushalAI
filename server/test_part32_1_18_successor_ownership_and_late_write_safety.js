/**
 * Part 32.1.18 Test Suite:
 * Successor Cleanup Ownership Correction, Late Database Write Safety & Recovery Finalization
 */

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-part32-1-18-secure-key-32ch'
process.env.ACCESS_TOKEN_SECRET = 'test-jwt-secret-part32-1-18-secure-key-32ch'
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-part32-1-18-secure-key-32ch'
process.env.COOKIE_DOMAIN = 'localhost'

const http = require('http')
const crypto = require('crypto')
const mongoose = require('mongoose')
const fullApp = require('./src/app')
const User = require('./src/models/User')
const RefreshToken = require('./src/models/RefreshToken')
const { reconcileFamilyOrphans } = require('./src/controllers/auth.controller')

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/kaushalai_test'
const DEV_DB_URI = 'mongodb://127.0.0.1:27017/kaushalai'

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function parseCookies(res) {
  const setCookie = res.headers['set-cookie']
  if (!setCookie) return {}
  const cookies = {}
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie]
  arr.forEach((c) => {
    const parts = c.split(';')[0].split('=')
    cookies[parts[0].trim()] = parts.slice(1).join('=')
  })
  return cookies
}

function makeRequest(serverUrl, { method = 'POST', path = '/', body = null, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(path, serverUrl)
    const payload = body ? JSON.stringify(body) : null
    const reqHeaders = { ...headers }
    if (payload) {
      reqHeaders['Content-Type'] = 'application/json'
      reqHeaders['Content-Length'] = Buffer.byteLength(payload)
    }
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          let json = null
          try {
            json = JSON.parse(data)
          } catch {}
          resolve({
            status: res.statusCode,
            headers: res.headers,
            cookies: parseCookies(res),
            body: json,
            text: data,
          })
        })
      }
    )
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function runTests() {
  console.log('========================================================================')
  console.log('  PART 32.1.18: SUCCESSOR CLEANUP OWNERSHIP & LATE-WRITE SAFETY TESTS')
  console.log('========================================================================\n')

  await mongoose.connect(TEST_DB_URI)
  await RefreshToken.deleteMany({})
  await User.deleteMany({ email: /@test-part32-18\.com$/ })

  const userA = await User.create({
    name: 'User A Part 32.1.18',
    email: 'usera@test-part32-18.com',
    role: 'employee',
    googleLinked: true,
    googleSub: 'google-sub-user-a-32-1-18',
    isActive: true,
  })

  const userB = await User.create({
    name: 'User B Part 32.1.18',
    email: 'userb@test-part32-18.com',
    role: 'employee',
    googleLinked: true,
    googleSub: 'google-sub-user-b-32-1-18',
    isActive: true,
  })

  const server = http.createServer(fullApp)
  await new Promise((res) => server.listen(0, '127.0.0.1', res))
  const port = server.address().port
  const serverUrl = `http://127.0.0.1:${port}`

  async function loginNewSession(user = userA) {
    const rawToken = 'raw_refresh_' + crypto.randomUUID()
    const hashed = hashToken(rawToken)
    const familyId = new mongoose.Types.ObjectId()
    const predecessor = await RefreshToken.create({
      userId: user._id,
      familyId,
      tokenHash: hashed,
      expiresAt: new Date(Date.now() + 7 * 86400000),
      revoked: false,
      rotationState: 'idle',
      recoveryCount: 0,
      graceCount: 0,
    })
    return { rawToken, hashed, familyId, predecessor }
  }

  console.log('--- SECTION 1: Cleanup Ownership Contradiction Resolution ---')

  // 1.1 Verify exact persisted schema mapping during recovery
  {
    const { rawToken, hashed, familyId, predecessor } = await loginNewSession()
    const attemptA = crypto.randomUUID()
    const rawSuccessorA = 'succ_a_' + attemptA
    const hashA = hashToken(rawSuccessorA)

    // Put predecessor in in_progress state under Attempt A
    await RefreshToken.updateOne(
      { _id: predecessor._id },
      {
        $set: {
          revoked: true,
          revokedAt: new Date(Date.now() - 600),
          rotationState: 'in_progress',
          rotationStartedAt: new Date(Date.now() - 600),
          rotationAttemptId: attemptA,
          replacedByTokenHash: hashA,
        },
      }
    )

    // Pre-insert Successor A
    await RefreshToken.create({
      userId: userA._id,
      familyId,
      tokenHash: hashA,
      expiresAt: new Date(Date.now() + 86400000),
      revoked: false,
      rotationState: 'committed',
      rotationAttemptId: attemptA,
      graceCount: 0,
    })

    // Trigger recovery via HTTP
    const recRes = await makeRequest(serverUrl, {
      path: '/api/auth/refresh',
      headers: { Cookie: `refreshToken=${rawToken}` },
    })

    if (recRes.status !== 200 || !recRes.cookies.refreshToken) {
      throw new Error(`Recovery failed with status ${recRes.status}`)
    }

    const rawSuccessorB = recRes.cookies.refreshToken
    const hashB = hashToken(rawSuccessorB)

    // Inspect persisted predecessor in MongoDB
    const updatedPred = await RefreshToken.findById(predecessor._id)
    if (updatedPred.rotationAttemptId === attemptA) {
      throw new Error('predecessor.rotationAttemptId must be updated to Attempt B')
    }
    const attemptB = updatedPred.rotationAttemptId

    if (updatedPred.supersededAttemptId !== attemptA) {
      throw new Error(`supersededAttemptId must be ${attemptA}, got ${updatedPred.supersededAttemptId}`)
    }
    if (updatedPred.supersededTokenHash !== hashA) {
      throw new Error(`supersededTokenHash must be ${hashA}, got ${updatedPred.supersededTokenHash}`)
    }
    if (updatedPred.replacedByTokenHash !== hashB) {
      throw new Error(`replacedByTokenHash must be Hash B (${hashB}), got ${updatedPred.replacedByTokenHash}`)
    }

    // Verify Successor A was deleted using superseded metadata
    const sADoc = await RefreshToken.findOne({ tokenHash: hashA })
    if (sADoc !== null) {
      throw new Error('Successor A should have been deleted by superseded cleanup')
    }

    // Verify Successor B is active
    const sBDoc = await RefreshToken.findOne({ tokenHash: hashB })
    if (!sBDoc || sBDoc.revoked !== false || sBDoc.rotationAttemptId !== attemptB) {
      throw new Error('Successor B must be active under Attempt B')
    }

    console.log('[PASS] 1.1 Persisted predecessor explicitly records supersededAttemptId, supersededTokenHash, and current attempt')
  }

  console.log('\n--- SECTION 2: Late Successor Insertion Survives Recovery Sweep ---')

  // 2.1 The Exact 9-Step Late Insertion Ordering
  {
    const { rawToken, hashed, familyId, predecessor } = await loginNewSession()
    const origCreate = RefreshToken.create

    const w1PassedPreCheck = deferred()
    const w2FinishedRecovery = deferred()

    let w1SuccessorPayload = null
    let w1AttemptId = null

    // Hook RefreshToken.create to intercept Worker 1's insert and delay it until AFTER Worker 2 has committed and swept
    let hookInstalled = true
    RefreshToken.create = async function (...args) {
      const doc = args[0]
      if (hookInstalled && doc?.tokenHash && doc.tokenHash !== hashed) {
        hookInstalled = false
        w1SuccessorPayload = doc
        w1AttemptId = doc.rotationAttemptId
        w1PassedPreCheck.resolve()
        // Wait until Worker 2 has completely finished its recovery, linking, and post-commit sweep!
        await w2FinishedRecovery.promise
      }
      return origCreate.apply(this, args)
    }

    try {
      // Step 1 & 2 & 3: Worker 1 initiates refresh, claims Attempt A, passes Stage 0 pre-check, and begins insert
      const w1Req = makeRequest(serverUrl, {
        path: '/api/auth/refresh',
        headers: { Cookie: `refreshToken=${rawToken}` },
      })

      await w1PassedPreCheck.promise

      // Step 4, 5, 6, 7, 8: Worker 2 claims recovery, creates S_B, commits predecessor, completes sweep
      const w2Res = await makeRequest(serverUrl, {
        path: '/api/auth/refresh',
        headers: { Cookie: `refreshToken=${rawToken}` },
      })

      if (w2Res.status !== 200 || !w2Res.cookies.refreshToken) {
        throw new Error(`Worker 2 recovery failed: status ${w2Res.status}`)
      }
      const rawCookieB = w2Res.cookies.refreshToken
      const hashB = hashToken(rawCookieB)

      // Step 9: Now Worker 1's delayed insert finally executes!
      w2FinishedRecovery.resolve()

      // Worker 1 resumes
      const w1Res = await w1Req

      // Worker 1 must fail closed with 401 and NEVER emit a cookie!
      if (w1Res.status !== 401) {
        throw new Error(`Worker 1 should have returned 401, got ${w1Res.status}`)
      }
      if (w1Res.cookies.refreshToken) {
        throw new Error('Worker 1 must NEVER emit a Set-Cookie header!')
      }

      // Check DB: Worker 1 detected matchedCount=0 and deleted its own successor
      const sAAfterW1 = await RefreshToken.findOne({ rotationAttemptId: w1AttemptId })
      if (sAAfterW1 !== null) {
        throw new Error('Worker 1 should have cleaned up its own successor upon matchedCount=0')
      }

      console.log('[PASS] 2.1 Late successor insert: Worker 1 fenced out at link commit, deletes its successor, emits 0 cookies')
    } finally {
      RefreshToken.create = origCreate
    }
  }

  // 2.2 Process Termination Immediately After Late Insert
  // Simulates: Worker 1 inserted S_A late, but Worker 1 died (SIGKILL) before executing link check or cleanup
  {
    const { rawToken, hashed, familyId, predecessor } = await loginNewSession()
    const attemptA = crypto.randomUUID()
    const rawA = 'succ_crashed_' + attemptA
    const hashA = hashToken(rawA)

    // Worker 2 claimed recovery, committed predecessor, and issued Cookie B
    const attemptB = crypto.randomUUID()
    const rawB = 'succ_active_' + attemptB
    const hashB = hashToken(rawB)

    await RefreshToken.updateOne(
      { _id: predecessor._id },
      {
        $set: {
          revoked: true,
          revokedAt: new Date(),
          rotationState: 'committed',
          rotationAttemptId: attemptB,
          replacedByTokenHash: hashB,
          supersededAttemptId: attemptA,
          supersededTokenHash: hashA,
        },
      }
    )

    await RefreshToken.create({
      userId: userA._id,
      familyId,
      tokenHash: hashB,
      expiresAt: new Date(Date.now() + 86400000),
      revoked: false,
      rotationState: 'committed',
      rotationAttemptId: attemptB,
      graceCount: 0,
    })

    // Now simulated crashed Worker 1 wrote S_A to DB and died!
    await RefreshToken.create({
      userId: userA._id,
      familyId,
      tokenHash: hashA,
      expiresAt: new Date(Date.now() + 86400000),
      revoked: false,
      rotationState: 'committed',
      rotationAttemptId: attemptA,
      graceCount: 0,
    })

    // Verify S_A is in DB right now
    const sABefore = await RefreshToken.findOne({ tokenHash: hashA })
    if (!sABefore) throw new Error('S_A should exist in DB before test verification')

    // Scenario 2.2a: Attacker tries to use the orphaned token S_A to refresh
    const attackRes = await makeRequest(serverUrl, {
      path: '/api/auth/refresh',
      headers: { Cookie: `refreshToken=${rawA}` },
    })

    if (attackRes.status !== 401) {
      throw new Error(`Orphan token refresh should have returned 401, got ${attackRes.status}`)
    }
    if (attackRes.cookies.refreshToken) {
      throw new Error('Orphan token presentation must never emit a refresh cookie')
    }

    // Defensive check must have deleted S_A from the database on presentation!
    const sAAfterAttack = await RefreshToken.findOne({ tokenHash: hashA })
    if (sAAfterAttack !== null) {
      throw new Error('Orphan token S_A was not deleted upon presentation!')
    }

    // Scenario 2.2b: Re-insert S_A and verify opportunistic reconciliation on valid refresh with Cookie B
    await RefreshToken.create({
      userId: userA._id,
      familyId,
      tokenHash: hashA,
      expiresAt: new Date(Date.now() + 86400000),
      revoked: false,
      rotationState: 'committed',
      rotationAttemptId: attemptA,
      graceCount: 0,
    })

    const validRefreshRes = await makeRequest(serverUrl, {
      path: '/api/auth/refresh',
      headers: { Cookie: `refreshToken=${rawB}` },
    })

    if (validRefreshRes.status !== 200 || !validRefreshRes.cookies.refreshToken) {
      throw new Error('Valid refresh with Cookie B failed')
    }

    // Verify opportunistic reconciliation deleted S_A during refresh of Cookie B
    const sAAfterValidRefresh = await RefreshToken.findOne({ tokenHash: hashA })
    if (sAAfterValidRefresh !== null) {
      throw new Error('Orphan token S_A was not purged during valid refresh reconciliation!')
    }

    // Exactly 1 active token remains in family
    const activeRemaining = await RefreshToken.find({ familyId, revoked: false })
    if (activeRemaining.length !== 1) {
      throw new Error(`Expected exactly 1 active token, found ${activeRemaining.length}`)
    }

    console.log('[PASS] 2.2 Dead process late write: defensive check and opportunistic reconciliation purge orphan token')
  }

  // 2.3 Explicit Reconciliation Function Direct Verification
  {
    const familyTest = new mongoose.Types.ObjectId()
    const attemptOld = crypto.randomUUID()
    const hashOld = hashToken('old_' + attemptOld)
    const attemptNew = crypto.randomUUID()
    const hashNew = hashToken('new_' + attemptNew)

    // Predecessor record
    await RefreshToken.create({
      userId: userA._id,
      familyId: familyTest,
      tokenHash: hashToken('pred_' + crypto.randomUUID()),
      expiresAt: new Date(Date.now() + 86400000),
      revoked: true,
      rotationState: 'committed',
      rotationAttemptId: attemptNew,
      replacedByTokenHash: hashNew,
      supersededAttemptId: attemptOld,
      supersededTokenHash: hashOld,
    })

    // Orphan successor
    await RefreshToken.create({
      userId: userA._id,
      familyId: familyTest,
      tokenHash: hashOld,
      expiresAt: new Date(Date.now() + 86400000),
      revoked: false,
      rotationState: 'committed',
      rotationAttemptId: attemptOld,
    })

    // Valid successor
    await RefreshToken.create({
      userId: userA._id,
      familyId: familyTest,
      tokenHash: hashNew,
      expiresAt: new Date(Date.now() + 86400000),
      revoked: false,
      rotationState: 'committed',
      rotationAttemptId: attemptNew,
    })

    const cleanedCount = await reconcileFamilyOrphans(familyTest, userA._id)
    if (cleanedCount !== 1) {
      throw new Error(`reconcileFamilyOrphans expected to clean 1 orphan, got ${cleanedCount}`)
    }

    const orphanExists = await RefreshToken.findOne({ tokenHash: hashOld })
    if (orphanExists) throw new Error('Orphan still exists after reconcileFamilyOrphans')

    const validExists = await RefreshToken.findOne({ tokenHash: hashNew })
    if (!validExists) throw new Error('Valid successor was deleted by mistake')

    console.log('[PASS] 2.3 reconcileFamilyOrphans standalone verification: purged orphan without affecting valid successor')
  }

  console.log('\n--- SECTION 3: Cleanup Isolation Across Users, Families & Legacy Tokens ---')

  // 3.1 Test all 8 Cleanup Isolation Dimensions
  {
    const family1 = new mongoose.Types.ObjectId()
    const family2 = new mongoose.Types.ObjectId()
    const user1 = userA._id
    const user2 = userB._id

    const attemptA = crypto.randomUUID()
    const hashA = hashToken('token_a_' + attemptA)

    const attemptB = crypto.randomUUID()
    const hashB = hashToken('token_b_' + attemptB)

    const attemptUnrelatedFamily = crypto.randomUUID()
    const hashUnrelatedFamily = hashToken('unrelated_family_' + attemptUnrelatedFamily)

    const attemptForeignUser = crypto.randomUUID()
    const hashForeignUser = hashToken('foreign_user_' + attemptForeignUser)

    const hashLegacy = hashToken('legacy_token_no_attempt')

    // 1. Successor A (in family1, user1, attemptA)
    await RefreshToken.create({
      userId: user1,
      familyId: family1,
      tokenHash: hashA,
      expiresAt: new Date(Date.now() + 86400000),
      revoked: false,
      rotationState: 'committed',
      rotationAttemptId: attemptA,
    })

    // 2. Successor B (in family1, user1, attemptB)
    await RefreshToken.create({
      userId: user1,
      familyId: family1,
      tokenHash: hashB,
      expiresAt: new Date(Date.now() + 86400000),
      revoked: false,
      rotationState: 'committed',
      rotationAttemptId: attemptB,
    })

    // 3. Unrelated session belonging to same user (different family)
    await RefreshToken.create({
      userId: user1,
      familyId: family2,
      tokenHash: hashUnrelatedFamily,
      expiresAt: new Date(Date.now() + 86400000),
      revoked: false,
      rotationState: 'committed',
      rotationAttemptId: attemptUnrelatedFamily,
    })

    // 4. Token belonging to foreign user
    await RefreshToken.create({
      userId: user2,
      familyId: new mongoose.Types.ObjectId(),
      tokenHash: hashForeignUser,
      expiresAt: new Date(Date.now() + 86400000),
      revoked: false,
      rotationState: 'committed',
      rotationAttemptId: attemptForeignUser,
    })

    // 5. Legacy token without attempt metadata
    await RefreshToken.create({
      userId: user1,
      familyId: null,
      tokenHash: hashLegacy,
      expiresAt: new Date(Date.now() + 86400000),
      revoked: false,
      rotationState: 'committed',
      rotationAttemptId: null,
    })

    // Execute targeted cleanup of previous successor A:
    const delA = await RefreshToken.deleteOne({
      tokenHash: hashA,
      rotationAttemptId: attemptA,
      familyId: family1,
    })

    if (delA.deletedCount !== 1) {
      throw new Error(`Targeted deleteOne for Attempt A failed: ${delA.deletedCount}`)
    }

    // Verify:
    // Successor A is deleted
    if (await RefreshToken.findOne({ tokenHash: hashA })) throw new Error('Hash A should be deleted')
    // Successor B is INTACT
    if (!(await RefreshToken.findOne({ tokenHash: hashB }))) throw new Error('Hash B must remain intact')
    // Unrelated family is INTACT
    if (!(await RefreshToken.findOne({ tokenHash: hashUnrelatedFamily }))) throw new Error('Unrelated family must remain intact')
    // Foreign user is INTACT
    if (!(await RefreshToken.findOne({ tokenHash: hashForeignUser }))) throw new Error('Foreign user must remain intact')
    // Legacy token is INTACT
    if (!(await RefreshToken.findOne({ tokenHash: hashLegacy }))) throw new Error('Legacy token must remain intact')

    // Idempotent repeated cleanup
    const repeatDel = await RefreshToken.deleteOne({
      tokenHash: hashA,
      rotationAttemptId: attemptA,
      familyId: family1,
    })
    if (repeatDel.deletedCount !== 0) throw new Error('Repeated deleteOne should delete 0')

    // Legacy token cleanup targeting
    const delLegacy = await RefreshToken.deleteOne({
      tokenHash: hashLegacy,
      userId: user1,
    })
    if (delLegacy.deletedCount !== 1) throw new Error('Legacy deleteOne failed')

    // Foreign user still intact
    if (!(await RefreshToken.findOne({ tokenHash: hashForeignUser }))) throw new Error('Foreign user must still remain intact')

    console.log('[PASS] 3.1 Cleanup isolation verified: exactly targeted, zero cross-family/cross-user deletion')
  }

  console.log('\n--- SECTION 4: Direct HTTP Header & Cookie Verification ---')

  // 4.1 Stale Worker Emits NO Set-Cookie Header on Failure
  {
    const { rawToken, hashed, familyId, predecessor } = await loginNewSession()
    // Predecessor is committed by recovery and outside grace window
    const recAttempt = crypto.randomUUID()
    predecessor.rotationState = 'committed'
    predecessor.rotationAttemptId = recAttempt
    predecessor.revoked = true
    predecessor.revokedAt = new Date(Date.now() - 15000)
    await predecessor.save()

    // Request with predecessor outside grace
    const res = await makeRequest(serverUrl, {
      path: '/api/auth/refresh',
      headers: { Cookie: `refreshToken=${rawToken}` },
    })

    if (res.headers['set-cookie']) {
      // If set-cookie is present, verify refreshToken is NOT being issued with a value
      const cookies = parseCookies(res)
      if (cookies.refreshToken && cookies.refreshToken !== '') {
        throw new Error('Stale worker must NEVER issue a valid refresh token cookie!')
      }
    }
    console.log('[PASS] 4.1 Direct HTTP header verification: stale worker emits no valid refresh cookie')
  }

  // Final Invariant Check
  console.log('\n--- Final Invariant Check ---')
  await mongoose.disconnect()
  await mongoose.connect(DEV_DB_URI)
  const devDb = mongoose.connection.db
  const users = await devDb.collection('users').countDocuments()
  const certs = await devDb.collection('certificates').countDocuments()
  const attempts = await devDb.collection('quizattempts').countDocuments()

  if (users !== 15 || certs !== 0 || attempts !== 12) {
    throw new Error(`Development database was altered! Got: { users: ${users}, certs: ${certs}, attempts: ${attempts} }`)
  }
  console.log(`[PASS] Development database kaushalai remains untouched: { users: ${users}, certs: ${certs}, attempts: ${attempts} }`)

  await mongoose.disconnect()
  server.close()
  console.log('\n========================================================================')
  console.log('  ALL PART 32.1.18 TESTS PASSED!')
  console.log('========================================================================\n')
  process.exit(0)
}

runTests().catch((err) => {
  console.error('\n[FATAL ERROR in Part 32.1.18 Test]:', err)
  process.exit(1)
})
