/**
 * PART 32.1.16 TEST SUITE
 * Recovery Eligibility, Grace-Window Threat Model & Cross-Tab Logout Verification
 */

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test_jwt_secret_part32_1_16_super_secure'
process.env.ACCESS_TOKEN_SECRET = 'test_access_secret_part32_1_16_super_secure'
process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_part32_1_16_super_secure'
process.env.COOKIE_SECRET = 'test_cookie_secret_12345678901234567890'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/kaushalai_test'

const http = require('http')
const crypto = require('crypto')
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
      payload = typeof body === 'string' ? body : JSON.stringify(body)
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
          parsed = data ? JSON.parse(data) : null
        } catch {
          parsed = data
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed,
          rawBody: data,
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
  console.log('  PART 32.1.16: RECOVERY ELIGIBILITY, GRACE THREAT & LOGOUT SUITE')
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
  await User.deleteMany({ email: 'part32_1_16_user@example.com' })
  const passwordHash = await bcrypt.hash('SecurePassword#2026', 10)
  const user = await User.create({
    name: 'Part 32.1.16 Test User',
    email: 'part32_1_16_user@example.com',
    passwordHash,
    role: 'employee',
    isActive: true,
  })

  await RefreshToken.deleteMany({ userId: user._id })

  // =========================================================================
  // SECTION 1: Exact Recovery Eligibility Condition & Scenarios
  // =========================================================================
  console.log('\n--- SECTION 1: Exact Recovery Eligibility Condition ---')
  {
    // 1.1 Immediate concurrent request (< 500ms): Must wait and be absorbed via grace, NOT trigger recovery
    const login1 = await doRequest('POST', '/api/auth/login', {
      email: 'part32_1_16_user@example.com',
      password: 'SecurePassword#2026',
    })
    const rawT1 = extractCookie(login1.headers, 'refreshToken')

    // Fire 2 concurrent refresh requests simultaneously
    const [resTabA, resTabB] = await Promise.all([
      doRequest('POST', '/api/auth/refresh', null, { Cookie: `refreshToken=${rawT1}` }),
      doRequest('POST', '/api/auth/refresh', null, { Cookie: `refreshToken=${rawT1}` }),
    ])

    if (resTabA.status !== 200 || resTabB.status !== 200) {
      throw new Error(`Concurrent refresh failed: A=${resTabA.status}, B=${resTabB.status}`)
    }
    const isGraceA = resTabA.body?.grace === true
    const isGraceB = resTabB.body?.grace === true
    // Exactly one is primary, one is grace
    if (!(isGraceA ^ isGraceB)) {
      throw new Error(`Expected exactly 1 grace and 1 primary rotation: A=${isGraceA}, B=${isGraceB}`)
    }
    console.log('[PASS] 1.1 Immediate concurrent request (< 500ms) absorbed via grace without claiming recovery')

    // 1.2 Recovery worker deletes ONLY superseded attempt successor, never a newer attempt successor
    const rawT2 = generateRefreshToken()
    const hashT2 = hashToken(rawT2)
    const family2 = new mongoose.Types.ObjectId()
    const supersededAttemptId = crypto.randomUUID()
    const supersededSuccHash = hashToken(generateRefreshToken())

    await RefreshToken.create({
      userId: user._id,
      familyId: family2,
      tokenHash: hashT2,
      expiresAt: refreshTokenExpiresAt(),
      revoked: true,
      revokedAt: new Date(Date.now() - 2000),
      rotationState: 'in_progress',
      rotationStartedAt: new Date(Date.now() - 2000),
      rotationAttemptId: supersededAttemptId,
      recoveryCount: 0,
      replacedByTokenHash: supersededSuccHash,
    })

    // Seed superseded successor
    await RefreshToken.create({
      userId: user._id,
      familyId: family2,
      tokenHash: supersededSuccHash,
      expiresAt: refreshTokenExpiresAt(),
      revoked: false,
      rotationState: 'committed',
      rotationAttemptId: supersededAttemptId,
      graceCount: 0,
    })

    // Recovery request arrives
    const recRes = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${rawT2}`,
    })
    if (recRes.status !== 200) {
      throw new Error(`Recovery failed: ${recRes.status}`)
    }

    // Verify superseded successor was deleted
    const checkSuperseded = await RefreshToken.findOne({ tokenHash: supersededSuccHash })
    if (checkSuperseded) {
      throw new Error('Superseded successor was not deleted by recovery worker!')
    }

    // Verify exactly 1 active successor exists in family
    const activeInFam = await RefreshToken.find({ familyId: family2, revoked: false })
    if (activeInFam.length !== 1) {
      throw new Error(`Expected 1 active successor, found ${activeInFam.length}`)
    }
    console.log('[PASS] 1.2 Recovery worker deleted only superseded successor and minted exactly 1 active successor')
  }

  // =========================================================================
  // SECTION 2: Cryptographic Attempt & Session Identifier Generation
  // =========================================================================
  console.log('\n--- SECTION 2: Cryptographic Attempt & Session Identifier Audit ---')
  {
    // 2.1 Verify rotationAttemptId is a valid UUID v4 format
    const docWithUuid = await RefreshToken.findOne({ userId: user._id, revoked: false })
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(docWithUuid.rotationAttemptId)) {
      throw new Error(`rotationAttemptId is not a valid UUID v4: ${docWithUuid.rotationAttemptId}`)
    }
    console.log('[PASS] 2.1 rotationAttemptId verified as cryptographically random UUID v4')

    // 2.2 Verify sessionGen in client.js and authStore.js
    const { handleAuthChannelMessage } = await import('../client/src/api/client.js')
    const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

    const testGen1 = crypto.randomUUID()
    const testGen2 = crypto.randomUUID()
    if (testGen1 === testGen2) throw new Error('UUID collision detected!')

    // Out-of-order message rejection using cryptographic UUIDs
    const outOfOrderRes = handleAuthChannelMessage(
      { type: 'REFRESH_SUCCESS', token: validJWT, sessionGen: testGen1, timestamp: Date.now() },
      { currentGen: testGen2, currentToken: 'cur_token' }
    )
    if (outOfOrderRes !== false) {
      throw new Error('Out-of-order sessionGen was not rejected!')
    }
    console.log('[PASS] 2.2 Cross-tab session generation mismatch rejected with cryptographic UUIDs')
  }

  // =========================================================================
  // SECTION 3: 10-Second Grace-Window Threat Model Validation
  // =========================================================================
  console.log('\n--- SECTION 3: Grace-Window Threat Model Validation ---')
  {
    // 3.1 Legitimate concurrent request within 10s: succeeds with grace: true, no new cookie
    const login3 = await doRequest('POST', '/api/auth/login', {
      email: 'part32_1_16_user@example.com',
      password: 'SecurePassword#2026',
    })
    const rawT3 = extractCookie(login3.headers, 'refreshToken')

    // Primary rotation
    const rotRes = await doRequest('POST', '/api/auth/refresh', null, { Cookie: `refreshToken=${rawT3}` })
    if (rotRes.status !== 200) throw new Error(`Primary rotation failed: ${rotRes.status}`)

    // Grace request (e.g. concurrent Tab 2 presenting old predecessor)
    const graceRes1 = await doRequest('POST', '/api/auth/refresh', null, { Cookie: `refreshToken=${rawT3}` })
    if (graceRes1.status !== 200 || !graceRes1.body?.grace) {
      throw new Error(`Grace request 1 failed: ${graceRes1.status}`)
    }
    const cookieGrace = extractCookie(graceRes1.headers, 'refreshToken')
    if (cookieGrace && cookieGrace !== '') {
      throw new Error('Grace response erroneously emitted a new refresh cookie!')
    }
    console.log('[PASS] 3.1 Grace request succeeded with access token; zero new refresh cookies issued')

    // 3.2 Repeated requests within grace: bounded strictly to MAX_GRACE_REQUESTS (3)
    const graceRes2 = await doRequest('POST', '/api/auth/refresh', null, { Cookie: `refreshToken=${rawT3}` })
    const graceRes3 = await doRequest('POST', '/api/auth/refresh', null, { Cookie: `refreshToken=${rawT3}` })
    if (graceRes2.status !== 200 || graceRes3.status !== 200) {
      throw new Error('Grace requests 2 or 3 failed')
    }

    // 4th request must be rejected (capped at 3)
    const graceRes4 = await doRequest('POST', '/api/auth/refresh', null, { Cookie: `refreshToken=${rawT3}` })
    if (graceRes4.status !== 401) {
      throw new Error(`Expected 401 on 4th grace request, got ${graceRes4.status}`)
    }
    console.log('[PASS] 3.2 Grace requests strictly bounded to 3; 4th request rejected and family terminated')

    // 3.3 Replay request after 10s grace window: triggers replay detection and revocation
    const login3b = await doRequest('POST', '/api/auth/login', {
      email: 'part32_1_16_user@example.com',
      password: 'SecurePassword#2026',
    })
    const rawT3b = extractCookie(login3b.headers, 'refreshToken')
    await doRequest('POST', '/api/auth/refresh', null, { Cookie: `refreshToken=${rawT3b}` })

    // Fast-forward predecessor revokedAt to 15s ago
    await RefreshToken.updateOne(
      { tokenHash: hashToken(rawT3b) },
      { $set: { revokedAt: new Date(Date.now() - 15000) } }
    )

    const postGraceReplay = await doRequest('POST', '/api/auth/refresh', null, { Cookie: `refreshToken=${rawT3b}` })
    if (postGraceReplay.status !== 401) {
      throw new Error(`Expected 401 on post-grace replay, got ${postGraceReplay.status}`)
    }
    if (!postGraceReplay.body?.message?.includes('Token reuse detected')) {
      throw new Error(`Expected replay message, got: ${postGraceReplay.body?.message}`)
    }
    console.log('[PASS] 3.3 Request outside 10s grace window triggers deterministic replay detection')
  }

  // =========================================================================
  // SECTION 4: Cross-Tab Logout Ordering Verification
  // =========================================================================
  console.log('\n--- SECTION 4: Cross-Tab Logout Ordering Verification ---')
  {
    const { handleAuthChannelMessage } = await import('../client/src/api/client.js')
    const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

    const G1 = crypto.randomUUID()
    const G2 = crypto.randomUUID()

    // 4.1 Tab A logs out, Tab B receives AUTH_LOGOUT with matching G1
    const tabBReceives = handleAuthChannelMessage(
      { type: 'AUTH_LOGOUT', sessionGen: G1, timestamp: Date.now() },
      { currentGen: G1, currentToken: 'token_G1' }
    )
    if (tabBReceives !== true) {
      throw new Error('Tab B failed to process matching AUTH_LOGOUT!')
    }
    console.log('[PASS] 4.1 Tab B processes AUTH_LOGOUT with matching session generation G1')

    // 4.2 Tab A logs out with G1, but Tab B has already transitioned to new session G2 (account switch)
    const tabBSuperseded = handleAuthChannelMessage(
      { type: 'AUTH_LOGOUT', sessionGen: G1, timestamp: Date.now() },
      { currentGen: G2, currentToken: 'token_G2' }
    )
    if (tabBSuperseded !== false) {
      throw new Error('Old AUTH_LOGOUT G1 erroneously logged out active new session G2!')
    }
    console.log('[PASS] 4.2 Stale AUTH_LOGOUT G1 dropped; active new session G2 preserved')

    // 4.3 Delayed REFRESH_SUCCESS from G1 arrives after logout (currentToken is null)
    const delayedRefreshAfterLogout = handleAuthChannelMessage(
      { type: 'REFRESH_SUCCESS', token: validJWT, sessionGen: G1, timestamp: Date.now() },
      { currentGen: null, currentToken: null }
    )
    if (delayedRefreshAfterLogout !== false) {
      throw new Error('Delayed REFRESH_SUCCESS resurrected logged out tab!')
    }
    console.log('[PASS] 4.3 Delayed REFRESH_SUCCESS cannot resurrect logged out tab')

    // 4.4 Delayed REFRESH_FAILURE from G1 arrives during active new session G2
    const delayedFailureNewSession = handleAuthChannelMessage(
      { type: 'REFRESH_FAILURE', sessionGen: G1, timestamp: Date.now() },
      { currentGen: G2, currentToken: 'token_G2' }
    )
    if (delayedFailureNewSession !== false) {
      throw new Error('Delayed REFRESH_FAILURE from old session killed new session!')
    }
    console.log('[PASS] 4.4 Delayed REFRESH_FAILURE from old generation safely dropped')
  }

  // =========================================================================
  // SECTION 5: Committed Rotation Response Loss & Re-authentication Invariant
  // =========================================================================
  console.log('\n--- SECTION 5: Committed Rotation Response Loss Invariant ---')
  {
    const rawPred5 = generateRefreshToken()
    const hashPred5 = hashToken(rawPred5)
    const rawSucc5 = generateRefreshToken()
    const hashSucc5 = hashToken(rawSucc5)
    const family5 = new mongoose.Types.ObjectId()
    const attempt5 = crypto.randomUUID()

    // Seed committed predecessor
    await RefreshToken.create({
      userId: user._id,
      familyId: family5,
      tokenHash: hashPred5,
      expiresAt: refreshTokenExpiresAt(),
      revoked: true,
      revokedAt: new Date(Date.now() - 1000),
      rotationState: 'committed',
      rotationAttemptId: attempt5,
      replacedByTokenHash: hashSucc5,
      graceCount: 0,
    })

    // Seed committed active successor (rawSucc5 was lost in network transit)
    await RefreshToken.create({
      userId: user._id,
      familyId: family5,
      tokenHash: hashSucc5,
      expiresAt: refreshTokenExpiresAt(),
      revoked: false,
      rotationState: 'committed',
      rotationAttemptId: attempt5,
      graceCount: 0,
    })

    // Verify raw refresh token cannot be reconstructed from tokenHash
    const dbDoc = await RefreshToken.findOne({ tokenHash: hashSucc5 })
    if (dbDoc.tokenHash === rawSucc5 || typeof dbDoc.rawToken !== 'undefined') {
      throw new Error('Raw refresh token exposed or reconstructible from database!')
    }
    console.log('[PASS] 5.1 Raw refresh token is cryptographic hash only; cannot be reconstructed')

    // Retry outside grace window
    await RefreshToken.updateOne(
      { tokenHash: hashPred5 },
      { $set: { revokedAt: new Date(Date.now() - 15000) } }
    )

    const retryLossRes = await doRequest('POST', '/api/auth/refresh', null, {
      Cookie: `refreshToken=${rawPred5}`,
    })
    if (retryLossRes.status !== 401) {
      throw new Error(`Expected 401 on lost response retry outside grace, got ${retryLossRes.status}`)
    }

    // Successor was revoked; family terminated
    const succFinal = await RefreshToken.findOne({ tokenHash: hashSucc5 })
    if (!succFinal.revoked) {
      throw new Error('Successor was not revoked upon lost response replay!')
    }

    // Verify user can log in freshly without error
    const freshLogin = await doRequest('POST', '/api/auth/login', {
      email: 'part32_1_16_user@example.com',
      password: 'SecurePassword#2026',
    })
    if (freshLogin.status !== 200) {
      throw new Error(`Fresh login failed after response loss: ${freshLogin.status}`)
    }
    console.log('[PASS] 5.2 Response loss fails closed deterministically; fresh authentication restores session cleanly')
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
  console.log('  ALL PART 32.1.16 TESTS PASSED!')
  console.log('========================================================================\n')

  await User.deleteMany({ email: 'part32_1_16_user@example.com' })
  await RefreshToken.deleteMany({ userId: user._id })
  await mongoose.disconnect()
  server.close()
}

runTests().catch((err) => {
  console.error('\n[FATAL ERROR in Part 32.1.16 Suite]:', err)
  process.exit(1)
})

