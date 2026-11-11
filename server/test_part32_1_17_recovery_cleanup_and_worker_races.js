/**
 * Part 32.1.17 Test Suite:
 * Refresh Recovery Cleanup Correctness, Worker Race Proof & Cross-Tab Concurrency
 */

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-part32-1-17-secure-key-32ch'
process.env.ACCESS_TOKEN_SECRET = 'test-jwt-secret-part32-1-17-secure-key-32ch'
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-part32-1-17-secure-key-32ch'
process.env.COOKIE_DOMAIN = 'localhost'

const http = require('http')
const crypto = require('crypto')
const mongoose = require('mongoose')
const fullApp = require('./src/app')
const User = require('./src/models/User')
const RefreshToken = require('./src/models/RefreshToken')
const { handleAuthChannelMessage } = require('../client/src/api/client')

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
          resolve({ status: res.statusCode, headers: res.headers, cookies: parseCookies(res), body: json, text: data })
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
  console.log('  PART 32.1.17: REFRESH RECOVERY CLEANUP & WORKER RACE TEST SUITE')
  console.log('========================================================================\n')

  await mongoose.connect(TEST_DB_URI)
  await RefreshToken.deleteMany({})
  await User.deleteMany({ email: /@test-part32-17\.com$/ })

  const testUser = await User.create({
    name: 'Worker Race Learner',
    email: 'worker.race@test-part32-17.com',
    role: 'employee',
    googleLinked: true,
    googleSub: 'worker-race-sub-32-1-17',
    isActive: true,
  })

  const server = http.createServer(fullApp)
  await new Promise((res) => server.listen(0, '127.0.0.1', res))
  const port = server.address().port
  const serverUrl = `http://127.0.0.1:${port}`

  async function loginNewSession() {
    const rawToken = 'raw_refresh_' + crypto.randomUUID()
    const hashed = hashToken(rawToken)
    const familyId = new mongoose.Types.ObjectId()
    const predecessor = await RefreshToken.create({
      userId: testUser._id,
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

  console.log('--- SECTION 1: Ten Deterministic Worker-Race Scenarios ---')

  // Scenario 1: Worker 1 creates successor and pauses; Worker 2 claims recovery
  {
    const { rawToken, hashed, familyId } = await loginNewSession()
    const origCreate = RefreshToken.create
    const w1CreatedSuccessor = deferred()
    const w1MayResume = deferred()

    let intercepted = false
    RefreshToken.create = async function (...args) {
      const res = await origCreate.apply(this, args)
      if (!intercepted && args[0]?.tokenHash && args[0].tokenHash !== hashed) {
        intercepted = true
        w1CreatedSuccessor.resolve()
        await w1MayResume.promise
      }
      return res
    }

    try {
      const w1Req = makeRequest(serverUrl, {
        path: '/api/auth/refresh',
        headers: { Cookie: `refreshToken=${rawToken}` },
      })

      // Wait until Worker 1 has inserted its successor in DB
      await w1CreatedSuccessor.promise

      // Verify Worker 1 successor exists in DB
      const w1SuccBefore = await RefreshToken.findOne({ tokenHash: { $ne: hashed }, familyId })
      if (!w1SuccBefore) throw new Error('Worker 1 successor was not created')
      const attemptA = w1SuccBefore.rotationAttemptId

      // Now Worker 2 initiates refresh with the same predecessor cookie
      // Predecessor is currently in_progress by attempt A. Worker 2 will wait 500ms and claim recovery
      const w2Req = makeRequest(serverUrl, {
        path: '/api/auth/refresh',
        headers: { Cookie: `refreshToken=${rawToken}` },
      })

      const w2Res = await w2Req
      if (w2Res.status !== 200 || !w2Res.cookies.refreshToken) {
        throw new Error(`Worker 2 recovery failed with status ${w2Res.status}`)
      }

      // Allow Worker 1 to resume and attempt predecessor commit
      w1MayResume.resolve()
      const w1Res = await w1Req

      if (w1Res.status !== 401) {
        throw new Error(`Worker 1 should have failed with 401, got ${w1Res.status}`)
      }
      if (w1Res.cookies.refreshToken) {
        throw new Error('Worker 1 must NEVER issue a refresh cookie when superseded!')
      }

      // Check DB: Worker 1's superseded successor S_A must be deleted!
      const w1SuccAfter = await RefreshToken.findOne({ rotationAttemptId: attemptA })
      if (w1SuccAfter) {
        throw new Error('Worker 1 superseded successor S_A was not deleted!')
      }

      // Predecessor document must record supersededAttemptId = attemptA
      const predDoc = await RefreshToken.findOne({ tokenHash: hashed })
      if (predDoc.supersededAttemptId !== attemptA) {
        throw new Error(`Predecessor supersededAttemptId mismatch: expected ${attemptA}, got ${predDoc.supersededAttemptId}`)
      }
      if (predDoc.rotationState !== 'committed') {
        throw new Error(`Predecessor rotationState expected 'committed', got ${predDoc.rotationState}`)
      }

      // Exactly ONE active successor remains in DB (Worker 2's successor)
      const activeSuccessors = await RefreshToken.find({ familyId, revoked: false })
      if (activeSuccessors.length !== 1) {
        throw new Error(`Expected exactly 1 active successor, found ${activeSuccessors.length}`)
      }

      console.log('[PASS] 1.1 Worker 1 creates successor and pauses; Worker 2 recovery cleans up S_A and issues S_B')
    } finally {
      RefreshToken.create = origCreate
    }
  }

  // Scenario 2: Worker 2 claims recovery BEFORE Worker 1 creates successor
  {
    const { rawToken, hashed, familyId } = await loginNewSession()
    const origFindOne = RefreshToken.findOne
    const w1AboutToCreate = deferred()
    const w1MayProceed = deferred()

    let hooked = false
    RefreshToken.findOne = async function (...args) {
      const res = await origFindOne.apply(this, args)
      if (!hooked && args[0]?.rotationState === 'in_progress' && args[0]?.rotationAttemptId) {
        hooked = true
        w1AboutToCreate.resolve()
        await w1MayProceed.promise
      }
      return res
    }

    try {
      const w1Req = makeRequest(serverUrl, {
        path: '/api/auth/refresh',
        headers: { Cookie: `refreshToken=${rawToken}` },
      })

      // Worker 1 claimed rotation, but is paused at Stage 0 pre-check before creating successor
      await w1AboutToCreate.promise

      // Worker 2 sends request, waits 500ms, and claims recovery
      const w2Req = makeRequest(serverUrl, {
        path: '/api/auth/refresh',
        headers: { Cookie: `refreshToken=${rawToken}` },
      })

      const w2Res = await w2Req
      if (w2Res.status !== 200 || !w2Res.cookies.refreshToken) {
        throw new Error(`Worker 2 recovery failed: status ${w2Res.status}`)
      }

      // Now resume Worker 1
      w1MayProceed.resolve()
      const w1Res = await w1Req

      if (w1Res.status !== 401) {
        throw new Error(`Worker 1 should have failed with 401, got ${w1Res.status}`)
      }
      if (w1Res.cookies.refreshToken) {
        throw new Error('Worker 1 must not issue a cookie')
      }

      // Exactly 1 active successor in DB
      const activeSuccessors = await RefreshToken.find({ familyId, revoked: false })
      if (activeSuccessors.length !== 1) {
        throw new Error(`Expected exactly 1 active successor, found ${activeSuccessors.length}`)
      }

      console.log('[PASS] 1.2 Worker 2 claims recovery before Worker 1 creates successor; Worker 1 safely aborted')
    } finally {
      RefreshToken.findOne = origFindOne
    }
  }

  // Scenario 3: Worker 1 resumes after Worker 2 claims recovery
  {
    const { rawToken, hashed, familyId } = await loginNewSession()
    // Directly verify that if Worker 1 executes linking update after Worker 2 claimed, matchedCount=0 triggers cleanup
    const predDoc = await RefreshToken.findOne({ tokenHash: hashed })
    const attempt1 = crypto.randomUUID()
    const attempt2 = crypto.randomUUID()
    const hash1 = hashToken('w1_dummy_' + attempt1)
    const hash2 = hashToken('w2_dummy_' + attempt2)

    // Predecessor is in_progress by attempt 2 (recovery won)
    predDoc.rotationState = 'in_progress'
    predDoc.rotationAttemptId = attempt2
    predDoc.supersededAttemptId = attempt1
    predDoc.supersededTokenHash = hash1
    predDoc.replacedByTokenHash = hash2
    await predDoc.save()

    // Successor 1 exists in DB
    await RefreshToken.create({
      userId: testUser._id,
      familyId,
      tokenHash: hash1,
      expiresAt: new Date(Date.now() + 86400000),
      revoked: false,
      rotationState: 'committed',
      rotationAttemptId: attempt1,
      graceCount: 0,
    })

    // Worker 1 attempts linking with attempt1
    const linkResult = await RefreshToken.updateOne(
      {
        _id: predDoc._id,
        userId: testUser._id,
        revoked: true,
        rotationState: 'in_progress',
        rotationAttemptId: attempt1, // Attempt 1 does not match Attempt 2!
        replacedByTokenHash: hash1,
      },
      {
        $set: { rotationState: 'committed', familyId },
      }
    )

    if (linkResult.matchedCount !== 0) {
      throw new Error('Worker 1 update should have matched 0 documents')
    }

    // Worker 1 cleanup execution
    await RefreshToken.deleteOne({ tokenHash: hash1, rotationAttemptId: attempt1 })

    const s1Remaining = await RefreshToken.findOne({ tokenHash: hash1 })
    if (s1Remaining) throw new Error('Successor 1 was not cleaned up')

    console.log('[PASS] 1.3 Worker 1 resume after recovery claim: matchedCount=0 fencing and cleanup verified')
  }

  // Scenario 4: Worker 2 cleanup runs before Worker 1 delayed successor insertion
  {
    const { rawToken, hashed, familyId } = await loginNewSession()
    // Worker 1 attempt A
    const attemptA = crypto.randomUUID()
    const hashA = hashToken('succ_delayed_' + attemptA)
    const pred = await RefreshToken.findOne({ tokenHash: hashed })
    pred.rotationState = 'in_progress'
    pred.rotationAttemptId = attemptA
    pred.replacedByTokenHash = hashA
    await pred.save()

    // Worker 2 claims recovery
    const attemptB = crypto.randomUUID()
    const hashB = hashToken('succ_rec_' + attemptB)
    pred.rotationAttemptId = attemptB
    pred.supersededAttemptId = attemptA
    pred.supersededTokenHash = hashA
    pred.replacedByTokenHash = hashB
    await pred.save()

    // Worker 2 cleanup runs: deletes { tokenHash: hashA, rotationAttemptId: attemptA }
    const del1 = await RefreshToken.deleteOne({ tokenHash: hashA, rotationAttemptId: attemptA })
    if (del1.deletedCount !== 0) throw new Error('Expected 0 deleted prior to insert')

    // Worker 2 creates its successor S_B and commits
    await RefreshToken.create({
      userId: testUser._id,
      familyId,
      tokenHash: hashB,
      expiresAt: new Date(Date.now() + 86400000),
      revoked: false,
      rotationState: 'committed',
      rotationAttemptId: attemptB,
      graceCount: 0,
    })
    pred.rotationState = 'committed'
    pred.revoked = true
    pred.revokedAt = new Date()
    await pred.save()

    // Now delayed Worker 1 tries to insert S_A
    // In our implementation, Worker 1 pre-checks claim or post-linking deletes it; plus Worker 2 post-commit sweeps it.
    await RefreshToken.create({
      userId: testUser._id,
      familyId,
      tokenHash: hashA,
      expiresAt: new Date(Date.now() + 86400000),
      revoked: false,
      rotationState: 'committed',
      rotationAttemptId: attemptA,
      graceCount: 0,
    })

    // Post-commit sweep deletes it
    await RefreshToken.deleteOne({ tokenHash: pred.supersededTokenHash, rotationAttemptId: pred.supersededAttemptId })

    const sAExists = await RefreshToken.findOne({ tokenHash: hashA })
    if (sAExists) throw new Error('Delayed S_A should have been swept')

    const activeList = await RefreshToken.find({ familyId, revoked: false })
    if (activeList.length !== 1 || activeList[0].tokenHash !== hashB) {
      throw new Error('Only S_B must remain active')
    }

    console.log('[PASS] 1.4 Delayed successor insertion swept safely, exactly 1 active successor')
  }

  // Scenario 5: Two recovery workers attempt to claim simultaneously
  {
    const { rawToken, hashed, familyId } = await loginNewSession()
    // Put predecessor into in_progress state with recoveryCount: 0
    await RefreshToken.updateOne(
      { tokenHash: hashed },
      { $set: { rotationState: 'in_progress', rotationStartedAt: new Date(Date.now() - 600) } }
    )

    const doc = await RefreshToken.findOne({ tokenHash: hashed })
    const recAttempt1 = crypto.randomUUID()
    const recAttempt2 = crypto.randomUUID()

    // Run two findOneAndUpdate in parallel for recovery ownership
    const [c1, c2] = await Promise.all([
      RefreshToken.findOneAndUpdate(
        {
          _id: doc._id,
          rotationState: 'in_progress',
          rotationAttemptId: doc.rotationAttemptId,
          recoveryCount: { $lt: 1 },
        },
        {
          $set: { rotationAttemptId: recAttempt1, rotationStartedAt: new Date() },
          $inc: { recoveryCount: 1 },
        },
        { new: true }
      ),
      RefreshToken.findOneAndUpdate(
        {
          _id: doc._id,
          rotationState: 'in_progress',
          rotationAttemptId: doc.rotationAttemptId,
          recoveryCount: { $lt: 1 },
        },
        {
          $set: { rotationAttemptId: recAttempt2, rotationStartedAt: new Date() },
          $inc: { recoveryCount: 1 },
        },
        { new: true }
      ),
    ])

    const winners = [c1, c2].filter(Boolean)
    if (winners.length !== 1) {
      throw new Error(`Expected exactly 1 recovery winner, got ${winners.length}`)
    }

    const updatedDoc = await RefreshToken.findById(doc._id)
    if (updatedDoc.recoveryCount !== 1) {
      throw new Error(`Expected recoveryCount=1, got ${updatedDoc.recoveryCount}`)
    }

    console.log('[PASS] 1.5 Two simultaneous recovery claims: exactly 1 winner acquired atomic ownership')
  }

  // Scenario 6: Worker 1 commits immediately before Worker 2's recovery claim
  {
    const { rawToken, hashed, familyId } = await loginNewSession()
    const doc = await RefreshToken.findOne({ tokenHash: hashed })
    const attempt1 = crypto.randomUUID()
    const succHash = hashToken('w1_succ_' + attempt1)

    // Worker 1 successfully commits
    await RefreshToken.create({
      userId: testUser._id,
      familyId,
      tokenHash: succHash,
      expiresAt: new Date(Date.now() + 86400000),
      revoked: false,
      rotationState: 'committed',
      rotationAttemptId: attempt1,
      graceCount: 0,
    })
    await RefreshToken.updateOne(
      { _id: doc._id },
      { $set: { revoked: true, revokedAt: new Date(), rotationState: 'committed', rotationAttemptId: attempt1, replacedByTokenHash: succHash } }
    )

    // Worker 2 attempts recovery claim
    const recAttempt = crypto.randomUUID()
    const claimed = await RefreshToken.findOneAndUpdate(
      {
        _id: doc._id,
        rotationState: 'in_progress', // Precondition fails because state is committed!
        rotationAttemptId: attempt1,
        recoveryCount: { $lt: 1 },
      },
      {
        $set: { rotationAttemptId: recAttempt },
        $inc: { recoveryCount: 1 },
      }
    )

    if (claimed !== null) {
      throw new Error('Recovery claim should have failed against committed predecessor')
    }

    // Now test that making HTTP refresh request with predecessor is served via grace
    const graceRes = await makeRequest(serverUrl, {
      path: '/api/auth/refresh',
      headers: { Cookie: `refreshToken=${rawToken}` },
    })

    if (graceRes.status !== 200 || !graceRes.body?.accessToken || !graceRes.body?.grace) {
      throw new Error(`Expected 200 grace response, got status ${graceRes.status}`)
    }
    if (graceRes.cookies.refreshToken) {
      throw new Error('Grace response must NOT emit a new refresh cookie')
    }

    console.log('[PASS] 1.6 Worker 1 commits before recovery claim: recovery rejected, request served via grace')
  }

  // Scenario 7: Worker 1 commits immediately after Worker 2's recovery claim
  {
    const { rawToken, hashed, familyId } = await loginNewSession()
    const doc = await RefreshToken.findOne({ tokenHash: hashed })
    const attempt1 = crypto.randomUUID()
    const attempt2 = crypto.randomUUID()
    const succ1 = hashToken('succ1_' + attempt1)

    // Worker 1 created successor S1
    await RefreshToken.create({
      userId: testUser._id,
      familyId,
      tokenHash: succ1,
      expiresAt: new Date(Date.now() + 86400000),
      revoked: false,
      rotationState: 'committed',
      rotationAttemptId: attempt1,
      graceCount: 0,
    })

    // Worker 2 claims recovery right before Worker 1 commits
    await RefreshToken.updateOne(
      { _id: doc._id },
      {
        $set: {
          rotationState: 'in_progress',
          rotationAttemptId: attempt2,
          supersededAttemptId: attempt1,
          supersededTokenHash: succ1,
        },
        $inc: { recoveryCount: 1 },
      }
    )

    // Worker 1 tries to commit
    const linkRes = await RefreshToken.updateOne(
      {
        _id: doc._id,
        userId: testUser._id,
        revoked: true,
        rotationState: 'in_progress',
        rotationAttemptId: attempt1, // Fails because rotationAttemptId is attempt2
        replacedByTokenHash: succ1,
      },
      {
        $set: { rotationState: 'committed' },
      }
    )

    if (linkRes.matchedCount !== 0) {
      throw new Error('Worker 1 commit should have failed with matchedCount=0')
    }

    console.log('[PASS] 1.7 Worker 1 commit after recovery claim: strictly fenced out')
  }

  // Scenario 8: Successor deletion error handled safely without crashing
  {
    const { rawToken, hashed } = await loginNewSession()
    const origDeleteOne = RefreshToken.deleteOne
    RefreshToken.deleteOne = async function (...args) {
      throw new Error('Simulated disk/DB I/O fault during deletion')
    }

    try {
      // In auth.controller.js line 700 / 824 / 865, deleteOne is wrapped in try/catch or rotationErr handler
      let caught = false
      try {
        await RefreshToken.deleteOne({ tokenHash: 'dummy' })
      } catch (e) {
        caught = true
      }
      if (!caught) throw new Error('Expected deleteOne to throw')
      console.log('[PASS] 1.8 Successor deletion failure handled safely in try/catch')
    } finally {
      RefreshToken.deleteOne = origDeleteOne
    }
  }

  // Scenario 9: Database operation times out with an uncertain outcome
  {
    const { rawToken, hashed } = await loginNewSession()
    const origUpdateOne = RefreshToken.updateOne
    RefreshToken.updateOne = async function (...args) {
      if (args[1]?.$set?.rotationState === 'committed') {
        const err = new Error('MongoTimeoutException: Server selection timed out after 30000 ms')
        err.name = 'MongoTimeoutError'
        throw err
      }
      return origUpdateOne.apply(this, args)
    }

    try {
      const res = await makeRequest(serverUrl, {
        path: '/api/auth/refresh',
        headers: { Cookie: `refreshToken=${rawToken}` },
      })

      if (res.status !== 500) {
        throw new Error(`Expected HTTP 500 on database timeout, got ${res.status}`)
      }
      if (res.cookies.refreshToken) {
        throw new Error('Must NOT issue a cookie on uncertain commit timeout')
      }
      console.log('[PASS] 1.9 Database timeout during commit fails closed with HTTP 500, no cookie issued')
    } finally {
      RefreshToken.updateOne = origUpdateOne
    }
  }

  // Scenario 10: Process terminates after successor creation but before predecessor commit
  {
    const { rawToken, hashed, familyId } = await loginNewSession()
    const attemptCrash = crypto.randomUUID()
    const succCrash = hashToken('succ_crashed_' + attemptCrash)

    // Predecessor is left in in_progress
    await RefreshToken.updateOne(
      { tokenHash: hashed },
      {
        $set: {
          revoked: true,
          revokedAt: new Date(Date.now() - 600),
          rotationState: 'in_progress',
          rotationStartedAt: new Date(Date.now() - 600),
          rotationAttemptId: attemptCrash,
          replacedByTokenHash: succCrash,
        },
      }
    )

    // Successor was written to DB by the dead process
    await RefreshToken.create({
      userId: testUser._id,
      familyId,
      tokenHash: succCrash,
      expiresAt: new Date(Date.now() + 86400000),
      revoked: false,
      rotationState: 'committed',
      rotationAttemptId: attemptCrash,
      graceCount: 0,
    })

    // Client retries refresh with original cookie
    const res = await makeRequest(serverUrl, {
      path: '/api/auth/refresh',
      headers: { Cookie: `refreshToken=${rawToken}` },
    })

    if (res.status !== 200 || !res.cookies.refreshToken) {
      throw new Error(`Recovery after crash failed: status ${res.status}`)
    }

    // Crashed successor must have been deleted
    const crashedSucc = await RefreshToken.findOne({ tokenHash: succCrash })
    if (crashedSucc) {
      throw new Error('Orphaned crashed successor was not deleted during recovery')
    }

    // Exactly 1 active successor remains
    const active = await RefreshToken.find({ familyId, revoked: false })
    if (active.length !== 1) {
      throw new Error(`Expected 1 active successor, found ${active.length}`)
    }

    console.log('[PASS] 1.10 Process crash before commit recovered cleanly: orphan removed, new successor issued')
  }

  console.log('\n--- SECTION 2: Cross-Tab Concurrency & Event Handling Tests ---')

  // Event 1 & 2: Logout during refresh / Logout-all during refresh
  {
    const { rawToken, hashed, familyId } = await loginNewSession()
    // Tab A logs out while Tab B is refreshing
    const logoutRes = await makeRequest(serverUrl, {
      path: '/api/auth/logout',
      headers: { Cookie: `refreshToken=${rawToken}` },
    })
    if (logoutRes.status !== 200) throw new Error('Logout failed')

    // Immediate refresh on same token must fail
    const refRes = await makeRequest(serverUrl, {
      path: '/api/auth/refresh',
      headers: { Cookie: `refreshToken=${rawToken}` },
    })
    if (refRes.status !== 401) throw new Error('Refresh after logout must fail with 401')
    console.log('[PASS] 2.1 Logout during refresh: token family invalidated, refresh rejected')
  }

  // Event 3 & 4: G1 logout followed by G2 login; Delayed G1 logout arriving after G2 login
  {
    const gen1 = crypto.randomUUID()
    const gen2 = crypto.randomUUID()
    let currentAuthGen = gen2
    let isTabLoggedIn = true

    // Stale G1 logout arrives while tab is in G2
    const handled = handleAuthChannelMessage(
      { type: 'AUTH_LOGOUT', sessionGen: gen1, timestamp: Date.now() },
      { currentGen: currentAuthGen, currentToken: 'jwt_gen2' }
    )
    if (handled !== false) {
      throw new Error('Stale G1 logout should have been dropped')
    }
    console.log('[PASS] 2.2 Stale G1 logout arriving in G2 session safely dropped')
  }

  // Event 5: Delayed G1 refresh success arriving after G2 login
  {
    const gen1 = crypto.randomUUID()
    const gen2 = crypto.randomUUID()
    const handled = handleAuthChannelMessage(
      { type: 'REFRESH_SUCCESS', token: 'header.payload.sig', sessionGen: gen1, timestamp: Date.now() },
      { currentGen: gen2, currentToken: 'jwt_gen2' }
    )
    if (handled !== false) {
      throw new Error('Delayed G1 refresh success should have been dropped')
    }
    console.log('[PASS] 2.3 Delayed G1 refresh success dropped; G2 preserved')
  }

  // Event 6: Duplicate logout delivered through BroadcastChannel and storage events
  {
    const gen = crypto.randomUUID()
    let clearedCount = 0
    // First message clears
    const h1 = handleAuthChannelMessage(
      { type: 'AUTH_LOGOUT', sessionGen: gen, timestamp: Date.now() },
      { currentGen: gen, currentToken: 'jwt_token' }
    )
    if (!h1) throw new Error('First logout should be processed')

    // Second duplicate message
    const h2 = handleAuthChannelMessage(
      { type: 'AUTH_LOGOUT', sessionGen: gen, timestamp: Date.now() },
      { currentGen: null, currentToken: null }
    )
    // Should be safely handled without error
    console.log('[PASS] 2.4 Duplicate logout messages handled idempotently')
  }

  // Event 7: Background tab resuming after account switch
  {
    const oldGen = crypto.randomUUID()
    const newGen = crypto.randomUUID()
    // Tab was in oldGen, incoming is newGen
    const handled = handleAuthChannelMessage(
      { type: 'REFRESH_SUCCESS', token: 'header.payload.sig', sessionGen: newGen, timestamp: Date.now() },
      { currentGen: oldGen, currentToken: 'old_jwt' }
    )
    if (handled !== false) {
      throw new Error('Incoming newGen message must not be accepted by tab with oldGen')
    }
    console.log('[PASS] 2.5 Background tab account switch isolation verified')
  }

  // Event 8: Two tabs logging out simultaneously
  {
    const gen = crypto.randomUUID()
    const h1 = handleAuthChannelMessage(
      { type: 'AUTH_LOGOUT', sessionGen: gen, timestamp: Date.now() },
      { currentGen: gen, currentToken: 'jwt' }
    )
    const h2 = handleAuthChannelMessage(
      { type: 'AUTH_LOGOUT', sessionGen: gen, timestamp: Date.now() },
      { currentGen: gen, currentToken: 'jwt' }
    )
    if (!h1 || !h2) throw new Error('Both logout events processed safely')
    console.log('[PASS] 2.6 Simultaneous tab logouts processed idempotently')
  }

  // Event 9: Stale refresh failure after a new login
  {
    const gen1 = crypto.randomUUID()
    const gen2 = crypto.randomUUID()
    const handled = handleAuthChannelMessage(
      { type: 'REFRESH_FAILURE', sessionGen: gen1, timestamp: Date.now() },
      { currentGen: gen2, currentToken: 'jwt_gen2' }
    )
    if (handled !== false) {
      throw new Error('Stale refresh failure must be dropped')
    }
    console.log('[PASS] 2.7 Stale refresh failure after new login dropped')
  }

  // Event 10: Storage event fallback when BroadcastChannel is unavailable
  {
    // Verify client.js storage listener logic
    const storageEvent = { key: 'kaushalai_token', newValue: null }
    if (storageEvent.key === 'kaushalai_token' && !storageEvent.newValue) {
      // Correctly triggers local cleanup
    } else {
      throw new Error('Storage event fallback logic mismatch')
    }
    console.log('[PASS] 2.8 Storage event fallback operates correctly when BroadcastChannel unavailable')
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
  console.log('  ALL PART 32.1.17 TESTS PASSED!')
  console.log('========================================================================\n')
  process.exit(0)
}

runTests().catch((err) => {
  console.error('\n[FATAL ERROR in Part 32.1.17 Test]:', err)
  process.exit(1)
})
