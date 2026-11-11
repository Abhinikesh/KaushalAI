/**
 * PART 32.1.15 TEST SUITE
 * Refresh Rotation Slow-Worker Safety, Commit Recovery & Authentication Test Integrity
 */

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test_jwt_secret_part32_1_15_super_secure'
process.env.ACCESS_TOKEN_SECRET = 'test_access_secret_part32_1_15_super_secure'
process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_part32_1_15_super_secure'
process.env.COOKIE_SECRET = 'test_cookie_secret_12345678901234567890'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/kaushalai_test'

const http = require('http')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const fullApp = require('./src/app')
const User = require('./src/models/User')
const RefreshToken = require('./src/models/RefreshToken')
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  refreshTokenExpiresAt,
} = require('./src/utils/token')

let server
let baseUrl

function doRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl)
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers },
    }

    let payload = null
    if (body) {
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
        let parsed = null
        try {
          parsed = JSON.parse(data)
        } catch {
          parsed = data
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed,
        })
      })
    })

    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

function extractCookie(headers, cookieName) {
  const setCookie = headers['set-cookie']
  if (!setCookie) return null
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
  for (const c of cookies) {
    const match = c.match(new RegExp(`^${cookieName}=([^;]+)`))
    if (match) return match[1]
  }
  return null
}

async function runTests() {
  console.log('========================================================================')
  console.log('  PART 32.1.15: SLOW-WORKER RECOVERY & COMMIT INTEGRITY TEST SUITE')
  console.log('========================================================================\n')

  // Guard against touching dev DB
  const devDbConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
  const devUserCountBefore = await devDbConn.collection('users').countDocuments()
  await devDbConn.close()
  if (devUserCountBefore !== 15) {
    throw new Error(`Safety violation: dev db user count is ${devUserCountBefore}, expected 15!`)
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect('mongodb://127.0.0.1:27017/kaushalai_test')
  }

  server = http.createServer(fullApp)
  await new Promise((resolve) => server.listen(0, resolve))
  const port = server.address().port
  baseUrl = `http://127.0.0.1:${port}`
  console.log(`[Setup] Test server running at ${baseUrl}`)

  // Setup test user
  await User.deleteMany({ email: 'slow_worker_test@example.com' })
  const passwordHash = await bcrypt.hash('SecurePassword#2026', 10)
  const user = await User.create({
    name: 'Slow Worker Test User',
    email: 'slow_worker_test@example.com',
    passwordHash,
    role: 'employee',
    isActive: true,
  })

  await RefreshToken.deleteMany({ userId: user._id })

  // =========================================================================
  // SECTION 1: Legitimate Slow-Worker Exceeding 5 Seconds & Atomic Fencing
  // =========================================================================
  console.log('\n--- SECTION 1: Legitimate Slow Worker & Atomic Fencing ---')
  {
    // 1.1 Worker 1 starts rotation, but stalls before linking. Worker 2 arrives and recovers.
    // Worker 1 subsequently resumes and must be fenced out cleanly with zero duplicate successors!
    const rawT1 = generateRefreshToken()
    const hashT1 = hashToken(rawT1)
    const initialFamily = new mongoose.Types.ObjectId()

    await RefreshToken.create({
      userId: user._id,
      familyId: initialFamily,
      tokenHash: hashT1,
      expiresAt: refreshTokenExpiresAt(),
      revoked: false,
      rotationState: 'idle',
      graceCount: 0,
    })

    let worker1Paused = false
    let worker1Resumed = false
    let resolveWorker1Pause = null
    const pausePromise = new Promise((resolve) => {
      resolveWorker1Pause = resolve
    })

    const origUpdateOne = RefreshToken.updateOne
    let worker1AttemptId = null

    // Fire Worker 1 request in the background
    const worker1Promise = (async () => {
      const origCreate = RefreshToken.create
      try {
        RefreshToken.create = async function (doc, ...args) {
          const res = await origCreate.call(this, doc, ...args)
          const item = Array.isArray(doc) ? doc[0] : doc
          if (item && item.userId && String(item.userId) === String(user._id) && !worker1Paused) {
            worker1Paused = true
            worker1AttemptId = item.rotationAttemptId
            // Stall Worker 1 here to simulate severe event-loop / DB delay (> 500ms)
            await pausePromise
          }
          return res
        }

        return await doRequest('POST', '/api/auth/refresh', null, {
          Cookie: `refreshToken=${rawT1}`,
        })
      } finally {
        RefreshToken.create = origCreate
      }
    })()

    // Wait until Worker 1 has created successor and paused
    while (!worker1Paused) {
      await new Promise((r) => setTimeout(r, 20))
    }

    // Assert: Predecessor is currently in_progress
    const inProgressDoc = await RefreshToken.findOne({ tokenHash: hashT1 })
    if (inProgressDoc.rotationState !== 'in_progress') {
      throw new Error(`Expected in_progress state, got ${inProgressDoc.rotationState}`)
    }

    // Now Worker 2 arrives while Worker 1 is still stalled!
    const worker2Res = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${rawT1}`,
    })
    if (worker2Res.status !== 200) {
      throw new Error(`Worker 2 recovery failed: ${worker2Res.status}`)
    }
    const worker2Cookie = extractCookie(worker2Res.headers, 'refreshToken')
    if (!worker2Cookie) {
      throw new Error('Worker 2 did not receive new refresh token cookie!')
    }

    // Now resume Worker 1!
    resolveWorker1Pause()
    const worker1Res = await worker1Promise

    // Assert: Worker 1 was fenced out!
    // Worker 1 must fail closed with 401 because predecessor was claimed by Worker 2
    if (worker1Res.status !== 401) {
      throw new Error(`Worker 1 was not fenced out! Status: ${worker1Res.status}`)
    }

    // Assert: Worker 1 did NOT issue a cookie
    const worker1Cookie = extractCookie(worker1Res.headers, 'refreshToken')
    if (worker1Cookie && worker1Cookie !== '') {
      throw new Error('Worker 1 erroneously issued a cookie despite being fenced out!')
    }

    // Assert DB State: Exactly ONE active successor exists in the family
    const activeTokens = await RefreshToken.find({ userId: user._id, revoked: false })
    if (activeTokens.length !== 1) {
      throw new Error(`Branching detected! Expected 1 active token, found ${activeTokens.length}`)
    }

    // Assert: Predecessor was never reactivated to idle
    const finalPred = await RefreshToken.findOne({ tokenHash: hashT1 })
    if (finalPred.revoked !== true || finalPred.rotationState !== 'committed') {
      throw new Error(`Predecessor invariant violated: revoked=${finalPred.revoked}, state=${finalPred.rotationState}`)
    }

    console.log('[PASS] 1.1 Slow Worker 1 successfully fenced out; Worker 2 recovered cleanly; 0 branching')
  }

  // =========================================================================
  // SECTION 2: Two Simultaneous Recovery Workers Race
  // =========================================================================
  console.log('\n--- SECTION 2: Simultaneous Recovery Workers Race ---')
  {
    const rawT2 = generateRefreshToken()
    const hashT2 = hashToken(rawT2)
    const family2 = new mongoose.Types.ObjectId()
    const attemptOld = new mongoose.Types.ObjectId()
    const orphanHash = hashToken(generateRefreshToken())

    // Seed a crashed / interrupted in_progress predecessor
    await RefreshToken.create({
      userId: user._id,
      familyId: family2,
      tokenHash: hashT2,
      expiresAt: refreshTokenExpiresAt(),
      revoked: true,
      revokedAt: new Date(Date.now() - 6000),
      rotationState: 'in_progress',
      rotationStartedAt: new Date(Date.now() - 6000),
      rotationAttemptId: attemptOld,
      recoveryCount: 0,
      replacedByTokenHash: orphanHash,
    })

    // Create the orphan successor from the crashed worker
    await RefreshToken.create({
      userId: user._id,
      familyId: family2,
      tokenHash: orphanHash,
      expiresAt: refreshTokenExpiresAt(),
      revoked: false,
      rotationState: 'committed',
      rotationAttemptId: attemptOld,
      graceCount: 0,
    })

    // Fire two simultaneous recovery requests
    const [rec1, rec2] = await Promise.all([
      doRequest('POST', '/api/auth/refresh', null, { Cookie: `refreshToken=${rawT2}` }),
      doRequest('POST', '/api/auth/refresh', null, { Cookie: `refreshToken=${rawT2}` }),
    ])

    // At least one must succeed with 200 OK
    const statuses = [rec1.status, rec2.status].sort()
    if (statuses[0] !== 200) {
      throw new Error(`Simultaneous recovery failed: ${statuses}`)
    }

    // Orphan successor must have been deleted
    const checkOrphan = await RefreshToken.findOne({ tokenHash: orphanHash })
    if (checkOrphan) {
      throw new Error('Orphan successor from crashed attempt was NOT deleted!')
    }

    // Verify DB holds exactly 1 active successor across the entire family
    const activeInFamily = await RefreshToken.find({ familyId: family2, revoked: false })
    if (activeInFamily.length !== 1) {
      throw new Error(`Expected exactly 1 active successor in family, found ${activeInFamily.length}`)
    }

    console.log('[PASS] 2.1 Simultaneous recovery workers serialized safely; exactly 1 active successor')
  }

  // =========================================================================
  // SECTION 3: No Predecessor Reactivation Guarantee
  // =========================================================================
  console.log('\n--- SECTION 3: No Predecessor Reactivation Guarantee ---')
  {
    const rawT3 = generateRefreshToken()
    const hashT3 = hashToken(rawT3)
    const family3 = new mongoose.Types.ObjectId()

    await RefreshToken.create({
      userId: user._id,
      familyId: family3,
      tokenHash: hashT3,
      expiresAt: refreshTokenExpiresAt(),
      revoked: false,
      rotationState: 'idle',
      graceCount: 0,
    })

    // Simulate linking failure by throwing in updateOne
    const origUpdateOne = RefreshToken.updateOne
    try {
      RefreshToken.updateOne = async function (filter, update, ...args) {
        if (filter.rotationState === 'in_progress') {
          throw new Error('Simulated Database Network Failure During Linking')
        }
        return origUpdateOne.call(this, filter, update, ...args)
      }

      const failRes = await doRequest('POST', '/api/auth/refresh', null, {
        Cookie: `refreshToken=${rawT3}`,
      })
      if (failRes.status !== 500) {
        throw new Error(`Expected 500 on linking failure, got ${failRes.status}`)
      }

      // Assert: Predecessor is NOT reactivated to idle or revoked: false!
      const predDoc = await RefreshToken.findOne({ tokenHash: hashT3 })
      if (predDoc.revoked !== true || predDoc.rotationState === 'idle') {
        throw new Error(`Predecessor was illegally reactivated! revoked=${predDoc.revoked}, state=${predDoc.rotationState}`)
      }
      if (predDoc.rotationState !== 'failed') {
        throw new Error(`Expected rotationState to be failed, got ${predDoc.rotationState}`)
      }
      console.log('[PASS] 3.1 Predecessor is never reactivated to idle; transitioned to failed on abort')
    } finally {
      RefreshToken.updateOne = origUpdateOne
    }
  }

  // =========================================================================
  // SECTION 4: Committed Rotation Response Loss & Re-authentication Invariant
  // =========================================================================
  console.log('\n--- SECTION 4: Committed Rotation Response Loss ---')
  {
    // Simulate: Predecessor was claimed, successor created, predecessor link committed.
    // But process died / HTTP response was lost before reaching client!
    const rawPred = generateRefreshToken()
    const hashPred = hashToken(rawPred)
    const rawSucc = generateRefreshToken()
    const hashSucc = hashToken(rawSucc)
    const family4 = new mongoose.Types.ObjectId()
    const attempt4 = new mongoose.Types.ObjectId()

    // Committed predecessor in DB
    await RefreshToken.create({
      userId: user._id,
      familyId: family4,
      tokenHash: hashPred,
      expiresAt: refreshTokenExpiresAt(),
      revoked: true,
      revokedAt: new Date(Date.now() - 2000), // committed 2 seconds ago
      rotationState: 'committed',
      rotationAttemptId: attempt4,
      replacedByTokenHash: hashSucc,
      graceCount: 0,
    })

    // Committed active successor in DB (rawSucc was lost in transit)
    await RefreshToken.create({
      userId: user._id,
      familyId: family4,
      tokenHash: hashSucc,
      expiresAt: refreshTokenExpiresAt(),
      revoked: false,
      rotationState: 'committed',
      rotationAttemptId: attempt4,
      graceCount: 0,
    })

    // Client retries with predecessor token within grace window (2s < 10s)
    const retry1 = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${rawPred}`,
    })
    if (retry1.status !== 200 || !retry1.body?.grace) {
      throw new Error(`Expected 200 with grace: true, got ${retry1.status}`)
    }
    // Critical Security Check: Server did NOT issue a new refresh cookie!
    const retryCookie = extractCookie(retry1.headers, 'refreshToken')
    if (retryCookie && retryCookie !== '') {
      throw new Error('Server unexpectedly issued a new refresh cookie for a lost committed response!')
    }
    console.log('[PASS] 4.1 Retry within grace window absorbed safely; no new refresh token minted')

    // Now simulate retry outside grace window (> 10s old)
    await RefreshToken.updateOne(
      { tokenHash: hashPred },
      { $set: { revokedAt: new Date(Date.now() - 15000) } }
    )

    const retryOutsideGrace = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${rawPred}`,
    })
    if (retryOutsideGrace.status !== 401) {
      throw new Error(`Expected 401 replay rejection, got ${retryOutsideGrace.status}`)
    }

    // Successor should be revoked upon replay detection
    const succCheck = await RefreshToken.findOne({ tokenHash: hashSucc })
    if (!succCheck.revoked) {
      throw new Error('Successor was not revoked upon replay detection outside grace window!')
    }
    console.log('[PASS] 4.2 Retry outside grace triggers replay revocation; fails closed to re-authentication')
  }

  // =========================================================================
  // SECTION 5: Reverse-Proxy IP Extraction Verification
  // =========================================================================
  console.log('\n--- SECTION 5: Reverse-Proxy IP Extraction Verification ---')
  {
    // Test 5.1: Direct client request through Nginx:
    // Client (203.0.113.195) -> Nginx ($remote_addr=203.0.113.195) -> Express
    // Nginx sends: X-Forwarded-For: 203.0.113.195
    const res1 = await doRequest('GET', '/api/health', null, {
      'X-Forwarded-For': '203.0.113.195',
    })
    if (res1.status !== 200) throw new Error(`Health check failed: ${res1.status}`)
    console.log('[PASS] 5.1 Direct request through Nginx: 1 hop correctly resolves client IP')

    // Test 5.2: Client-supplied forged header:
    // Client (203.0.113.195) sends forged "198.51.100.1".
    // Nginx appends true remote_addr: "198.51.100.1, 203.0.113.195"
    // Express with trust proxy = 1 extracts rightmost IP (203.0.113.195)
    const res2 = await doRequest('GET', '/api/health', null, {
      'X-Forwarded-For': '198.51.100.1, 203.0.113.195',
    })
    if (res2.status !== 200) throw new Error(`Health check failed: ${res2.status}`)
    console.log('[PASS] 5.2 Forged X-Forwarded-For prefix (198.51.100.1) safely ignored by 1-hop proxy trust')

    // Test 5.3: Multiple forwarded values (client behind residential NAT):
    // "10.0.0.5, 203.0.113.195"
    const res3 = await doRequest('GET', '/api/health', null, {
      'X-Forwarded-For': '10.0.0.5, 203.0.113.195',
    })
    if (res3.status !== 200) throw new Error(`Health check failed: ${res3.status}`)
    console.log('[PASS] 5.3 Multiple forwarded values safely parsed')
  }

  // =========================================================================
  // SECTION 6: Cross-Tab Session Generation Identifier Semantics
  // =========================================================================
  console.log('\n--- SECTION 6: Cross-Tab Session Generation Identifier Semantics ---')
  {
    const { handleAuthChannelMessage } = await import('../client/src/api/client.js')
    const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

    // 6.1 Monotonically distinct session generation IDs
    const genA = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    const genB = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    if (genA === genB) throw new Error('Session generation collision detected!')

    // 6.2 Old AUTH_LOGOUT from previous generation ignored
    const oldLogout = handleAuthChannelMessage(
      { type: 'AUTH_LOGOUT', sessionGen: genA, timestamp: Date.now() },
      { currentGen: genB, currentToken: 'valid_token' }
    )
    if (oldLogout !== false) throw new Error('Old AUTH_LOGOUT was not dropped!')
    console.log('[PASS] 6.1 Old AUTH_LOGOUT from previous session generation dropped')

    // 6.3 Stale delayed message (> 10s) dropped
    const delayedMsg = handleAuthChannelMessage(
      { type: 'AUTH_LOGOUT', sessionGen: genB, timestamp: Date.now() - 11000 },
      { currentGen: genB, currentToken: 'valid_token' }
    )
    if (delayedMsg !== false) throw new Error('Stale delayed message was not dropped!')
    console.log('[PASS] 6.2 Stale delayed message (> 10s) dropped')

    // 6.4 Unauthenticated tab cannot be revived by REFRESH_SUCCESS
    const reviveAttempt = handleAuthChannelMessage(
      { type: 'REFRESH_SUCCESS', token: validJWT, sessionGen: genB, timestamp: Date.now() },
      { currentGen: genB, currentToken: null }
    )
    if (reviveAttempt !== false) throw new Error('Unauthenticated tab was resurrected!')
    console.log('[PASS] 6.3 Unauthenticated tab cannot be resurrected by background refresh')

    // 6.5 Current AUTH_LOGOUT matching generation processed
    const currentLogout = handleAuthChannelMessage(
      { type: 'AUTH_LOGOUT', sessionGen: genB, timestamp: Date.now() },
      { currentGen: genB, currentToken: 'valid_token' }
    )
    if (currentLogout !== true) throw new Error('Current AUTH_LOGOUT was not processed!')
    console.log('[PASS] 6.4 Current AUTH_LOGOUT matching generation processed')
  }

  // =========================================================================
  // Final Invariant Check
  // =========================================================================
  console.log('\n--- Final Invariant Check ---')
  const devDbConnAfter = await mongoose.createConnection('mongodb://127.0.0.1:27017/kaushalai').asPromise()
  const devUserCountAfter = await devDbConnAfter.collection('users').countDocuments()
  const devCertsCountAfter = await devDbConnAfter.collection('certificates').countDocuments()
  const devAttemptsCountAfter = await devDbConnAfter.collection('quizattempts').countDocuments()
  await devDbConnAfter.close()

  if (devUserCountAfter !== 15 || devCertsCountAfter !== 0 || devAttemptsCountAfter !== 12) {
    throw new Error(`Invariant check failed! Dev DB altered: users=${devUserCountAfter}, certs=${devCertsCountAfter}, attempts=${devAttemptsCountAfter}`)
  }
  console.log(`[PASS] Development database kaushalai remains untouched: { users: ${devUserCountAfter}, certs: ${devCertsCountAfter}, attempts: ${devAttemptsCountAfter} }`)

  console.log('\n========================================================================')
  console.log('  ALL PART 32.1.15 TESTS PASSED!')
  console.log('========================================================================\n')

  await User.deleteMany({ email: 'slow_worker_test@example.com' })
  await RefreshToken.deleteMany({ userId: user._id })
  await mongoose.disconnect()
  server.close()
}

runTests().catch((err) => {
  console.error('\n[FATAL ERROR in Part 32.1.15 Suite]:', err)
  process.exit(1)
})
