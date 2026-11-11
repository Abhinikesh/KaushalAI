/**
 * test_part34_ai_tutor_persistence.js
 *
 * KAUSHALAI PHASE 34: AI TUTOR CONVERSATION PERSISTENCE & ISOLATION TEST SUITE
 *
 * Validates:
 * 1. Conversation creation & lifecycle
 * 2. User & assistant message database persistence
 * 3. History retrieval after simulated application reload
 * 4. Multi-turn conversation continuation
 * 5. Pagination & chronological ordering
 * 6. Individual conversation deletion and cascading message removal
 * 7. Clear-all history behavior with strict user isolation
 * 8. Cross-user isolation (Learner A cannot read, append, or delete Learner B's chats)
 * 9. Unauthenticated access rejection across all endpoints
 * 10. Client idempotency via clientMessageId (duplicate request handling)
 * 11. Message length validation & malformed input handling
 * 12. Provider failure resilience (user message preserved, fallback recorded)
 * 13. Message feedback and bookmark updates with ownership checks
 * 14. Backward compatibility for legacy callers (POST /api/ai/chat with messages array)
 * 15. Concurrent requests serialization
 * 16. Development database isolation (kaushalai strictly untouched)
 */

'use strict'

const path = require('path')
const http = require('http')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const axios = require('axios')
const app = require('./src/app')
const User = require('./src/models/User')
const Conversation = require('./src/models/Conversation')
const Message = require('./src/models/Message')
const LearningPath = require('./src/models/LearningPath')
const aiChatService = require('./src/services/aiChat.service')

const DEV_MONGO_URI = 'mongodb://127.0.0.1:27017/kaushalai'
const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/kaushalai_test'
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'kaushalai_dev_access_secret_change_in_prod'

let passed = 0
let failed = 0

function pass(msg) {
  passed++
  console.log(`  ✓ PASS: ${msg}`)
}

function fail(msg, err) {
  failed++
  console.error(`  ✗ FAIL: ${msg}`)
  if (err) console.error(err)
}

function assert(condition, message) {
  if (!condition) {
    fail(message)
    throw new Error(message)
  }
  pass(message)
}

function makeRequest(baseUrl, endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl)
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
    }

    const req = http.request(url, reqOptions, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(data) } catch (_) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json || data,
        })
      })
    })

    req.on('error', reject)
    if (options.body) {
      const payload = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
      req.setHeader('Content-Type', 'application/json')
      req.setHeader('Content-Length', Buffer.byteLength(payload))
      req.write(payload)
    }
    req.end()
  })
}

async function startTestServer() {
  await mongoose.connect(TEST_MONGO_URI)
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`
  return { server, port, baseUrl }
}

async function runSuite() {
  console.log('='.repeat(72))
  console.log('  TESTING PART 34: AI TUTOR CONVERSATION PERSISTENCE SUITE')
  console.log('='.repeat(72))

  // ── Preflight: Check Dev Database Invariants ─────────────────────────────────
  const devConn = await mongoose.createConnection(DEV_MONGO_URI).asPromise()
  const preDevUserCount = await devConn.collection('users').countDocuments()
  const preDevCertCount = await devConn.collection('certificates').countDocuments()
  await devConn.close()

  assert(preDevUserCount === 15, `G.1: Dev DB (kaushalai) user count strictly 15 (actual: ${preDevUserCount})`)
  assert(preDevCertCount === 0, `G.2: Dev DB (kaushalai) certificate count strictly 0 (actual: ${preDevCertCount})`)

  // --- Connect to Test DB and start server ---
  const { server, port, baseUrl } = await startTestServer()
  console.log(`Ephemeral test API running on: ${baseUrl}\n`)

  // Create two isolated test learners
  const existingTestUsers = await User.find({ email: { $in: ['p34_learner_a@gov.in', 'p34_learner_b@gov.in'] } }).select('_id').lean()
  const existingTestIds = existingTestUsers.map((u) => u._id)
  if (existingTestIds.length > 0) {
    await Conversation.deleteMany({ userId: { $in: existingTestIds } })
    await Message.deleteMany({ userId: { $in: existingTestIds } })
    await LearningPath.deleteMany({ user_id: { $in: existingTestIds } })
    await User.deleteMany({ _id: { $in: existingTestIds } })
  }

  const userAId = new mongoose.Types.ObjectId()
  const userA = await User.create({
    _id: userAId,
    email: 'p34_learner_a@gov.in',
    name: 'Officer Amit Sharma',
    role: 'employee',
    department: 'National Accounts Division',
    designation: 'Senior Statistical Officer',
    level: 3,
    onboarding_completed: true,
    passwordHash: 'dummy_hash',
  })

  const userBId = new mongoose.Types.ObjectId()
  const userB = await User.create({
    _id: userBId,
    email: 'p34_learner_b@gov.in',
    name: 'Officer Sunita Rao',
    role: 'employee',
    department: 'Price Statistics Division',
    designation: 'Assistant Director',
    level: 4,
    onboarding_completed: true,
    passwordHash: 'dummy_hash',
  })

  const tokenA = jwt.sign(
    { id: userAId.toString(), email: userA.email, role: userA.role },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )

  const tokenB = jwt.sign(
    { id: userBId.toString(), email: userB.email, role: userB.role },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 1: Unauthenticated Access Rejection
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- SECTION 1: Unauthenticated Access Rejection ---')

  const unauthChat = await makeRequest(baseUrl, '/api/ai/chat', { method: 'POST', body: { message: 'Hello' } })
  assert(unauthChat.status === 401, '1.1: Unauthenticated POST /api/ai/chat returns HTTP 401')

  const unauthList = await makeRequest(baseUrl, '/api/ai/conversations')
  assert(unauthList.status === 401, '1.2: Unauthenticated GET /api/ai/conversations returns HTTP 401')

  const unauthCreate = await makeRequest(baseUrl, '/api/ai/conversations', { method: 'POST', body: { title: 'Test' } })
  assert(unauthCreate.status === 401, '1.3: Unauthenticated POST /api/ai/conversations returns HTTP 401')

  const unauthMsgs = await makeRequest(baseUrl, `/api/ai/conversations/${new mongoose.Types.ObjectId()}/messages`)
  assert(unauthMsgs.status === 401, '1.4: Unauthenticated GET /api/ai/conversations/:id/messages returns HTTP 401')

  const unauthDel = await makeRequest(baseUrl, `/api/ai/conversations/${new mongoose.Types.ObjectId()}`, { method: 'DELETE' })
  assert(unauthDel.status === 401, '1.5: Unauthenticated DELETE /api/ai/conversations/:id returns HTTP 401')

  const unauthClear = await makeRequest(baseUrl, '/api/ai/history', { method: 'DELETE' })
  assert(unauthClear.status === 401, '1.6: Unauthenticated DELETE /api/ai/history returns HTTP 401')

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 2: Conversation Creation & Message Persistence
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 2: Conversation Creation & Message Persistence ---')

  const chat1 = await makeRequest(baseUrl, '/api/ai/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { message: 'Explain the difference between stratified and cluster sampling.' },
  })

  assert(chat1.status === 200, `2.1: POST /api/ai/chat returns HTTP 200 (actual: ${chat1.status})`)
  assert(typeof chat1.data.reply === 'string' && chat1.data.reply.length > 0, '2.2: Response contains non-empty reply string')
  assert(typeof chat1.data.conversationId === 'string', '2.3: Response returns conversationId')
  assert(chat1.data.provider !== undefined, '2.4: Response specifies AI provider')

  const convId1 = chat1.data.conversationId

  // Verify Conversation document in DB
  const convDoc1 = await Conversation.findById(convId1).lean()
  assert(convDoc1 !== null, '2.5: Conversation document created in MongoDB')
  assert(convDoc1.userId.toString() === userAId.toString(), '2.6: Conversation ownership matches Learner A')
  assert(convDoc1.title.includes('stratified'), '2.7: Conversation title derived automatically from user message')
  assert(convDoc1.messageCount === 2, `2.8: messageCount is 2 (actual: ${convDoc1.messageCount})`)

  // Verify Message documents in DB
  const msgs1 = await Message.find({ conversationId: convId1 }).sort({ createdAt: 1 }).lean()
  assert(msgs1.length === 2, `2.9: Exactly 2 messages persisted in Message collection (actual: ${msgs1.length})`)
  assert(msgs1[0].role === 'user', '2.10: First message role is "user"')
  assert(msgs1[0].content === 'Explain the difference between stratified and cluster sampling.', '2.11: User message content matches prompt')
  assert(msgs1[0].userId.toString() === userAId.toString(), '2.12: User message userId matches Learner A')
  assert(msgs1[1].role === 'assistant', '2.13: Second message role is "assistant"')
  assert(msgs1[1].content === chat1.data.reply, '2.14: Assistant message content matches API reply')
  assert(msgs1[1].provider !== null, '2.15: Assistant message records provider provenance')

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 3: History Retrieval (Simulated Reload) & Ordering
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 3: History Retrieval & Chronological Ordering ---')

  const listRes = await makeRequest(baseUrl, '/api/ai/conversations', {
    headers: { Authorization: `Bearer ${tokenA}` },
  })

  assert(listRes.status === 200, '3.1: GET /api/ai/conversations returns HTTP 200')
  assert(Array.isArray(listRes.data.conversations), '3.2: conversations is an array')
  assert(listRes.data.conversations.length === 1, `3.3: Learner A has 1 conversation (actual: ${listRes.data.conversations.length})`)
  assert(listRes.data.conversations[0]._id.toString() === convId1, '3.4: Listed conversation matches created conversationId')

  const msgsRes = await makeRequest(baseUrl, `/api/ai/conversations/${convId1}/messages`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })

  assert(msgsRes.status === 200, '3.5: GET /api/ai/conversations/:id/messages returns HTTP 200')
  assert(Array.isArray(msgsRes.data.messages), '3.6: messages is an array')
  assert(msgsRes.data.messages.length === 2, '3.7: Retrieved exactly 2 messages after simulated reload')
  assert(
    new Date(msgsRes.data.messages[0].createdAt).getTime() <= new Date(msgsRes.data.messages[1].createdAt).getTime(),
    '3.8: Messages retrieved in strict chronological order'
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 4: Multi-Turn Conversation Continuation
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 4: Multi-Turn Conversation Continuation ---')

  const chat2 = await makeRequest(baseUrl, '/api/ai/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      conversationId: convId1,
      message: 'Which of these two sampling designs minimizes survey costs for rural India?',
    },
  })

  assert(chat2.status === 200, '4.1: Multi-turn POST /api/ai/chat with conversationId returns HTTP 200')
  assert(chat2.data.conversationId === convId1, '4.2: Response preserves same conversationId')

  const convDocUpdated = await Conversation.findById(convId1).lean()
  assert(convDocUpdated.messageCount === 4, `4.3: Conversation messageCount updated to 4 (actual: ${convDocUpdated.messageCount})`)

  const updatedMsgs = await Message.find({ conversationId: convId1 }).sort({ createdAt: 1 }).lean()
  assert(updatedMsgs.length === 4, `4.4: 4 messages in DB (actual: ${updatedMsgs.length})`)
  assert(updatedMsgs[2].role === 'user', '4.5: Third message is turn 2 user message')
  assert(updatedMsgs[3].role === 'assistant', '4.6: Fourth message is turn 2 assistant message')

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 5: Explicit Conversation Creation & Pagination
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 5: Explicit Conversation Creation & Pagination ---')

  const createRes = await makeRequest(baseUrl, '/api/ai/conversations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { title: 'Consumer Price Index Guidelines' },
  })

  assert(createRes.status === 201, '5.1: POST /api/ai/conversations returns HTTP 201')
  assert(createRes.data.conversation.title === 'Consumer Price Index Guidelines', '5.2: Explicit title persisted')
  const convId2 = createRes.data.conversation._id

  // Create a third conversation
  const createRes3 = await makeRequest(baseUrl, '/api/ai/conversations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { title: 'National Accounts SNA 2008' },
  })
  assert(createRes3.status === 201, '5.3: Third conversation created successfully')

  // Test pagination (page=1, limit=2)
  const paginatedRes = await makeRequest(baseUrl, '/api/ai/conversations?page=1&limit=2', {
    headers: { Authorization: `Bearer ${tokenA}` },
  })

  assert(paginatedRes.status === 200, '5.4: GET /api/ai/conversations?limit=2 returns HTTP 200')
  assert(paginatedRes.data.conversations.length === 2, `5.5: Page 1 returns exactly 2 conversations (actual: ${paginatedRes.data.conversations.length})`)
  assert(paginatedRes.data.pagination.total === 3, `5.6: Pagination reports total 3 conversations (actual: ${paginatedRes.data.pagination.total})`)
  assert(paginatedRes.data.pagination.totalPages === 2, '5.7: Pagination reports 2 total pages')

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 6: Cross-User Isolation (Security & Privacy)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 6: Cross-User Isolation (Security & Privacy) ---')

  // Learner B attempts to read Learner A's conversation
  const bReadA = await makeRequest(baseUrl, `/api/ai/conversations/${convId1}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  })
  assert(bReadA.status === 404, `6.1: Learner B reading Learner A conversation rejected with HTTP 404 (actual: ${bReadA.status})`)

  // Learner B attempts to read Learner A's messages
  const bReadAMsgs = await makeRequest(baseUrl, `/api/ai/conversations/${convId1}/messages`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  })
  assert(bReadAMsgs.status === 404, `6.2: Learner B reading Learner A messages rejected with HTTP 404 (actual: ${bReadAMsgs.status})`)

  // Learner B attempts to append a message to Learner A's conversation
  const bAppendA = await makeRequest(baseUrl, '/api/ai/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: { conversationId: convId1, message: 'Attacker injecting prompt into Officer A conversation.' },
  })
  assert(bAppendA.status === 404, `6.3: Learner B appending to Learner A conversation rejected with HTTP 404 (actual: ${bAppendA.status})`)

  // Learner B attempts to delete Learner A's conversation
  const bDeleteA = await makeRequest(baseUrl, `/api/ai/conversations/${convId1}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` },
  })
  assert(bDeleteA.status === 404, `6.4: Learner B deleting Learner A conversation rejected with HTTP 404 (actual: ${bDeleteA.status})`)

  // Verify Learner A's conversation and messages were NOT affected by Learner B's attacks
  const msgsAfterAttack = await Message.find({ conversationId: convId1 })
  assert(msgsAfterAttack.length === 4, '6.5: Learner A messages count unchanged after cross-user attack attempt')

  // Learner B's conversation list is currently empty
  const bList = await makeRequest(baseUrl, '/api/ai/conversations', {
    headers: { Authorization: `Bearer ${tokenB}` },
  })
  assert(bList.data.conversations.length === 0, '6.6: Learner B conversation list contains zero Learner A conversations')

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 7: Idempotency & Duplicate Request Protection
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 7: Idempotency & Duplicate Request Protection ---')

  const clientMsgId = `cm_test_idem_${Date.now()}`

  const origReq = await makeRequest(baseUrl, '/api/ai/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      conversationId: convId2,
      message: 'What is the base year for Consumer Price Index in India?',
      clientMessageId: clientMsgId,
    },
  })

  assert(origReq.status === 200, '7.1: Original chat request with clientMessageId succeeds')
  const initialReply = origReq.data.reply

  // Re-send the exact same request with identical clientMessageId (simulating network retry)
  const dupReq = await makeRequest(baseUrl, '/api/ai/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      conversationId: convId2,
      message: 'What is the base year for Consumer Price Index in India?',
      clientMessageId: clientMsgId,
    },
  })

  assert(dupReq.status === 200, '7.2: Duplicate request returns HTTP 200')
  assert(dupReq.data.isDuplicate === true, '7.3: Response flagged as isDuplicate: true')
  assert(dupReq.data.reply === initialReply, '7.4: Duplicate request returns identical assistant reply')

  // Verify database: exactly 1 user message and 1 assistant message for this turn
  const idempMsgs = await Message.find({ conversationId: convId2 })
  assert(idempMsgs.length === 2, `7.5: Exactly 2 messages persisted in DB (zero duplicates created, actual: ${idempMsgs.length})`)

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 8: Message Validation & Error Handling
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 8: Message Validation & Error Handling ---')

  const emptyMsgRes = await makeRequest(baseUrl, '/api/ai/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { message: '   ' },
  })
  assert(emptyMsgRes.status === 400, '8.1: Whitespace-only message rejected with HTTP 400')

  const oversizedMsgRes = await makeRequest(baseUrl, '/api/ai/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { message: 'a'.repeat(8001) },
  })
  assert(oversizedMsgRes.status === 400, '8.2: Message exceeding 8000 chars rejected with HTTP 400')

  const invalidConvIdRes = await makeRequest(baseUrl, '/api/ai/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { conversationId: 'not-an-objectid', message: 'Valid content' },
  })
  assert(invalidConvIdRes.status === 400, '8.3: Malformed conversationId format rejected with HTTP 400')

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 9: Message Feedback & Bookmark Persistence
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 9: Message Feedback & Bookmark Persistence ---')

  const assistantMsgId = origReq.data.assistantMessage._id

  const patchFb = await makeRequest(baseUrl, `/api/ai/messages/${assistantMsgId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { feedback: 'helpful', isSaved: true },
  })

  assert(patchFb.status === 200, '9.1: PATCH /api/ai/messages/:id returns HTTP 200')
  assert(patchFb.data.message.feedback === 'helpful', '9.2: feedback updated to "helpful"')
  assert(patchFb.data.message.isSaved === true, '9.3: isSaved updated to true')

  // Learner B cannot patch Learner A's message
  const bPatchA = await makeRequest(baseUrl, `/api/ai/messages/${assistantMsgId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: { feedback: 'not-helpful' },
  })
  assert(bPatchA.status === 404, '9.4: Cross-user message feedback update rejected with HTTP 404')

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 10: Individual Conversation Deletion & Cascade Message Cleanup
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 10: Individual Deletion & Cascading Removal ---')

  const delRes = await makeRequest(baseUrl, `/api/ai/conversations/${convId2}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` },
  })

  assert(delRes.status === 200, '10.1: DELETE /api/ai/conversations/:id returns HTTP 200')
  const conv2InDb = await Conversation.findById(convId2)
  assert(conv2InDb === null, '10.2: Conversation document permanently removed')

  const msgs2InDb = await Message.find({ conversationId: convId2 })
  assert(msgs2InDb.length === 0, '10.3: All associated messages permanently removed (cascade cleanup)')

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 11: Clear-All History with User Isolation
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 11: Clear-All History with User Isolation ---')

  // Create a conversation for Learner B first
  const bConv = await makeRequest(baseUrl, '/api/ai/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: { message: 'Officer Sunita query on Price Index weights.' },
  })
  assert(bConv.status === 200, '11.1: Learner B created conversation')
  const bConvId = bConv.data.conversationId

  // Learner A clears all history
  const clearARes = await makeRequest(baseUrl, '/api/ai/history', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` },
  })

  assert(clearARes.status === 200, '11.2: DELETE /api/ai/history returns HTTP 200 for Learner A')

  // Verify Learner A's history is empty
  const aConvsPost = await Conversation.find({ userId: userAId })
  const aMsgsPost = await Message.find({ userId: userAId })
  assert(aConvsPost.length === 0, '11.3: Learner A has 0 conversations in DB')
  assert(aMsgsPost.length === 0, '11.4: Learner A has 0 messages in DB')

  // Verify Learner B's history is completely intact
  const bConvInDb = await Conversation.findById(bConvId)
  const bMsgsInDb = await Message.find({ conversationId: bConvId })
  assert(bConvInDb !== null, '11.5: Learner B conversation was strictly preserved')
  assert(bMsgsInDb.length === 2, '11.6: Learner B messages strictly preserved')

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 12: Legacy Array Format Backward Compatibility
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 12: Legacy Array Format Compatibility ---')

  const legacyChat = await makeRequest(baseUrl, '/api/ai/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: {
      messages: [
        { role: 'user', content: 'What is NQAF in Indian official statistics?' },
      ],
    },
  })

  assert(legacyChat.status === 200, '12.1: Legacy POST /api/ai/chat with { messages: [...] } returns HTTP 200')
  assert(typeof legacyChat.data.reply === 'string' && legacyChat.data.reply.length > 0, '12.2: Returns reply string')
  assert(legacyChat.data.provider !== undefined, '12.3: Returns provider string')

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 13: Concurrent Requests Handling
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 13: Concurrent Requests Handling ---')

  const [req1, req2] = await Promise.all([
    makeRequest(baseUrl, '/api/ai/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: { conversationId: bConvId, message: 'Concurrent question 1: Sampling frame' },
    }),
    makeRequest(baseUrl, '/api/ai/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: { conversationId: bConvId, message: 'Concurrent question 2: Sampling error' },
    }),
  ])

  assert(req1.status === 200 && req2.status === 200, '13.1: Concurrent chat requests to same conversation both succeed')

  const bMsgsConcurrent = await Message.find({ conversationId: bConvId })
  assert(bMsgsConcurrent.length === 6, `13.2: All 4 new messages successfully persisted (total 6 in conv, actual: ${bMsgsConcurrent.length})`)

  const bConvUpdated = await Conversation.findById(bConvId).lean()
  assert(bConvUpdated.messageCount === 6, `13.3: Atomic messageCount updated accurately to 6 under concurrency (actual: ${bConvUpdated.messageCount})`)

  // Verify reverse-chronological window + ascending return for cursor pagination
  const pageLatest = await makeRequest(baseUrl, `/api/ai/conversations/${bConvId}/messages?limit=2`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  })
  assert(pageLatest.status === 200 && pageLatest.data.messages.length === 2, '13.4: Message limit=2 returns 2 latest messages')
  assert(pageLatest.data.hasMore === true, '13.5: hasMore=true when older messages exist')
  const firstWindowIds = pageLatest.data.messages.map((m) => m._id.toString())
  const olderCursor = firstWindowIds[0]
  const pageOlder = await makeRequest(baseUrl, `/api/ai/conversations/${bConvId}/messages?limit=2&before=${olderCursor}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  })
  assert(pageOlder.status === 200 && pageOlder.data.messages.length === 2, '13.6: Cursor pagination (?before=) retrieves older page')
  const olderWindowIds = pageOlder.data.messages.map((m) => m._id.toString())
  assert(!olderWindowIds.some((id) => firstWindowIds.includes(id)), '13.7: Older message window has zero overlap with latest window')

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 14: Unit & Mocked Failure-Injection Tests (No Live External LLM Calls)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 14: Unit & Mocked Failure-Injection Tests ---')

  // 14.1: Learner context injection unit test + route context test
  const samplePrompt = aiChatService.buildSystemPrompt({
    designation: 'Assistant Director',
    department: 'Price Statistics Division',
    targetRole: 'Senior Economist',
    activeCourses: ['CPI Methodology', 'Survey Sampling'],
  })
  assert(
    samplePrompt.includes('Assistant Director') &&
      samplePrompt.includes('Price Statistics Division') &&
      samplePrompt.includes('Senior Economist') &&
      samplePrompt.includes('CPI Methodology'),
    '14.1 (Unit): buildSystemPrompt includes learner role, department, and courses without DB IDs'
  )

  await LearningPath.create({
    user_id: userBId,
    target_role: 'Chief Statistician Track',
    status: 'active',
  })

  const originalChatFn = aiChatService.chat
  const originalAxiosPost = axios.post
  const originalMessageCreate = Message.create.bind(Message)

  let capturedContext = null
  try {
    // 14.2: Mock provider throwing error -> route resiliently records fallback & preserves user message
    aiChatService.chat = async (_msgs, ctx) => {
      capturedContext = ctx
      throw new Error('Simulated upstream LLM gateway timeout')
    }

    const errRes = await makeRequest(baseUrl, '/api/ai/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: { conversationId: bConvId, message: 'Test resilience during provider outage' },
    })
    assert(errRes.status === 200, '14.2 (Mocked Failure): Route returns safe HTTP 200 fallback when provider throws')
    assert(errRes.data.provider === 'fallback', '14.3 (Mocked Failure): Fallback provider recorded')
    assert(
      capturedContext && capturedContext.targetRole === 'Chief Statistician Track',
      '14.4 (Integration + Mock): Route passes active LearningPath context to aiChatService.chat'
    )

    // 14.5: Mock empty/malformed provider response -> never persists empty assistant content
    aiChatService.chat = async () => ({ reply: '   ', provider: 'groq', model: 'llama-test', tokensUsed: null })
    const blankRes = await makeRequest(baseUrl, '/api/ai/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: { conversationId: bConvId, message: 'Test malformed empty provider reply' },
    })
    assert(blankRes.status === 200 && blankRes.data.reply.trim().length > 0, '14.5 (Mocked Malformed): Blank provider reply sanitized to non-empty fallback text')

    // 14.6: Real metadata propagation from mocked axios response (no fabricated tokensUsed)
    aiChatService.chat = originalChatFn
    const prevGroqKey = process.env.GROQ_API_KEY
    process.env.GROQ_API_KEY = 'gsk_mocked_test_key_only'
    axios.post = async () => ({
      data: {
        model: 'llama-3.3-70b-versatile',
        choices: [{ message: { content: 'CPI measures weighted consumer price changes.' } }],
        usage: { total_tokens: 142 },
      },
    })

    const mockMetaRes = await makeRequest(baseUrl, '/api/ai/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: { conversationId: bConvId, message: 'What is CPI?' },
    })
    if (prevGroqKey === undefined) delete process.env.GROQ_API_KEY
    else process.env.GROQ_API_KEY = prevGroqKey
    axios.post = originalAxiosPost

    assert(mockMetaRes.status === 200 && mockMetaRes.data.provider === 'groq', '14.6 (Mocked Provider): Uses mocked Groq provider cleanly')
    assert(
      mockMetaRes.data.assistantMessage?.model === 'llama-3.3-70b-versatile' &&
        mockMetaRes.data.assistantMessage?.tokensUsed === 142,
      '14.7 (Mocked Provider): Persists real model & usage tokens when returned by provider'
    )

    // 14.8: Database write failure on assistant insert + partial-crash idempotent recovery
    let createCount = 0
    Message.create = async function (doc) {
      createCount += 1
      if (doc.role === 'assistant') {
        throw new Error('Simulated DB write failure on assistant message')
      }
      return originalMessageCreate(doc)
    }

    const partialCid = `cm_partial_${Date.now()}`
    const dbFailRes = await makeRequest(baseUrl, '/api/ai/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: {
        conversationId: bConvId,
        message: 'Prompt before simulated assistant DB write failure',
        clientMessageId: partialCid,
      },
    })
    Message.create = originalMessageCreate

    assert(dbFailRes.status === 500, `14.8 (Mocked DB Failure): Assistant DB failure surfaces HTTP 500 instead of false success (actual: ${dbFailRes.status})`)
    const preservedUser = await Message.find({ conversationId: bConvId, clientMessageId: partialCid }).lean()
    assert(preservedUser.length === 1, '14.9 (Mocked DB Failure): User message was persisted prior to assistant failure')

    // Retrying with same clientMessageId recovers without duplicating user message
    const retryAfterFail = await makeRequest(baseUrl, '/api/ai/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: {
        conversationId: bConvId,
        message: 'Prompt before simulated assistant DB write failure',
        clientMessageId: partialCid,
      },
    })
    assert(retryAfterFail.status === 200, '14.10 (Recovery): Retry with same clientMessageId completes successfully')
    const afterRecoveryUserCount = await Message.countDocuments({ conversationId: bConvId, clientMessageId: partialCid })
    assert(afterRecoveryUserCount === 1, `14.11 (Recovery): Retry did not duplicate persisted user message (count: ${afterRecoveryUserCount})`)
  } finally {
    aiChatService.chat = originalChatFn
    axios.post = originalAxiosPost
    Message.create = originalMessageCreate
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 15: Post-Test Database Isolation Verification
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 15: Post-Test Database Isolation Verification ---')

  // Clean up test users & learning path
  await User.deleteMany({ email: { $in: ['p34_learner_a@gov.in', 'p34_learner_b@gov.in'] } })
  await Conversation.deleteMany({ userId: { $in: [userAId, userBId] } })
  await Message.deleteMany({ userId: { $in: [userAId, userBId] } })
  await LearningPath.deleteMany({ user_id: { $in: [userAId, userBId] } })

  const postDevConn = await mongoose.createConnection(DEV_MONGO_URI).asPromise()
  const postDevUserCount = await postDevConn.collection('users').countDocuments()
  const postDevCertCount = await postDevConn.collection('certificates').countDocuments()
  await postDevConn.close()

  assert(postDevUserCount === 15, `15.1: Dev DB (kaushalai) user count remained strictly 15 (actual: ${postDevUserCount})`)
  assert(postDevCertCount === 0, `15.2: Dev DB (kaushalai) certificate count remained strictly 0 (actual: ${postDevCertCount})`)

  // Shut down ephemeral test server
  await new Promise((resolve) => server.close(resolve))
  await mongoose.disconnect()

  console.log('\n' + '='.repeat(72))
  console.log(`PART 34 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('='.repeat(72) + '\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runSuite().catch((err) => {
  console.error('Test suite failed with unexpected error:', err)
  process.exit(1)
})
