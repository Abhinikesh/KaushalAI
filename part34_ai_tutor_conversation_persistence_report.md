# KaushalAI — Phase 34: AI Tutor Conversation Persistence & Unified Learner Experience Report

**Phase:** 34  
**Status:** COMPLETE & VERIFIED  
**Database Isolation:** `kaushalai` untouched (`users: 15`, `certificates: 0`, `conversations: 0`, `messages: 0`); all integration tests executed against `kaushalai_test`.

---

## 1. Initial Architecture Findings

Before Phase 34 edits, a codebase audit across client and server established the following:

1. **Routes (`client/src/App.jsx`):**
   - `/ai-tutor` renders `AiTutorPage` (`LearnerRoute`).
   - `/ai-tutor/chat` renders `AiTutorChatPage` (`LearnerRoute`).
   - Sidebar navigation and learner dashboard CTAs point to `/ai-tutor`.
2. **Legacy Frontend State:**
   - `AiTutorPage.jsx` initialized with hardcoded `INITIAL_CHAT_HISTORY` items and hardcoded `init-1`/`init-2` messages. Clicking history items fired new `sendChatMessage` queries rather than loading saved conversations. Feedback/bookmark toggles updated only in-memory React state.
   - `AiTutorChatPage.jsx` provided a secondary chat interface with React-only `useState` messages, suggestion chips, and an ephemeral "Clear Chat" button.
3. **Legacy Backend (`server/src/routes/aiChat.routes.js`, `server/src/services/aiChat.service.js`):**
   - Exposed only stateless `POST /api/ai/chat` (accepting `{ messages }` capped to 20 entries) and `GET /api/ai/status`, behind `authenticate` and `chatLimiter` (`60` requests/minute per user or IP).
   - Zero MongoDB models existed for conversations or messages.
   - `aiChat.service.js` tried providers in priority order (`groq`/`grok` -> `gemini` -> `openai` -> rule-based `fallback`), returned only `{ reply, provider }`, and did not inject learner context or return provider `model` / `tokensUsed` metadata.

---

## 2. Database Schema & Indexes

To prevent unbounded document growth, keep conversation list queries lightweight, and enable indexed pagination and idempotent writes, two separate Mongoose collections were added over embedded message arrays:

### Rationale: Separate Collections vs. Embedded Message Arrays
- Avoids MongoDB's 16 MB BSON document limit on long multi-turn study threads.
- Keeps `GET /api/ai/conversations` responses small (metadata only, no message arrays serialized).
- Enables efficient chronological windowing + reverse-cursor pagination (`before`) via compound indexes.
- Supports direct message-level `feedback`/`isSaved` updates and sparse `clientMessageId` idempotency indexing.

### `Conversation` (`server/src/models/Conversation.js`)
- `userId`: `ObjectId` (ref `'User'`, required, indexed)
- `title`: `String` (required, trimmed, `maxlength: 120`, default `'New Conversation'`)
- `status`: `String` (`enum: ['active', 'archived']`, default `'active'`, indexed)
- `lastMessageAt`: `Date` (default `Date.now`, indexed)
- `messageCount`: `Number` (default `0`, `min: 0`)
- `pinned`: `Boolean` (default `false`)
- `metadata`: `Schema.Types.Mixed` (default `{}`)
- `timestamps: true` (`createdAt`, `updatedAt`)
- **Indexes:**
  - `{ userId: 1, lastMessageAt: -1 }`
  - `{ userId: 1, status: 1, lastMessageAt: -1 }`

### `Message` (`server/src/models/Message.js`)
- `conversationId`: `ObjectId` (ref `'Conversation'`, required, indexed)
- `userId`: `ObjectId` (ref `'User'`, required, indexed)
- `role`: `String` (`enum: ['user', 'assistant']`, required)
- `content`: `String` (required, trimmed, `maxlength: 8000`)
- `provider`: `String` (trimmed, default `null`)
- `model`: `String` (trimmed, default `null`)
- `tokensUsed`: `Number` (default `null`)
- `clientMessageId`: `String` (trimmed, default `null`, indexed)
- `feedback`: `String` (`enum: ['helpful', 'not-helpful', null]`, default `null`)
- `isSaved`: `Boolean` (default `false`)
- `metadata`: `Schema.Types.Mixed` (default `{}`)
- `timestamps: true` (`createdAt`, `updatedAt`)
- **Indexes:**
  - `{ conversationId: 1, createdAt: 1 }`
  - `{ userId: 1, conversationId: 1, clientMessageId: 1 }` (`{ sparse: true }`)

Both models are registered and exported from `server/src/models/index.js`.

---

## 3. API Contracts

All endpoints are mounted under `/api` (`app.use('/api', aiChatRouter)`) and require valid JWT authentication (`authenticate`).

| Method & Path | Request | Response | Notes |
|---|---|---|---|
| `POST /api/ai/chat` | `{ message, conversationId?, clientMessageId? }` OR legacy `{ messages: [...] }` | `{ reply, provider, conversationId, message, assistantMessage, isDuplicate? }` (or legacy `{ reply, provider }`) | Protected by `chatLimiter` (`60` req/min/user). Max message length: `8000` chars. Loads last 20 messages + safe learner context (`loadLearnerContext`). |
| `GET /api/ai/conversations` | Query: `page=1`, `limit=20` (max `50`) | `{ success: true, conversations, pagination: { page, limit, total, totalPages } }` | Filters `{ userId, status: 'active' }`, sorted `{ lastMessageAt: -1 }`. |
| `POST /api/ai/conversations` | `{ title? }` | `201 { success: true, conversation }` | Enforces limit of `100` active conversations per learner. |
| `GET /api/ai/conversations/:id` | Param: `id` | `{ success: true, conversation }` | Returns `400` on invalid ObjectId, `404` if missing or not owned by user. |
| `GET /api/ai/conversations/:id/messages` | Param: `id`; Query: `limit=50` (max `100`), `before?` (ObjectId or ISO date) | `{ success: true, conversation, messages, hasMore }` | Queries newest `limit + 1` matching messages (`{ createdAt: -1, _id: -1 }`) and reverses into ascending chronological order. |
| `PATCH /api/ai/conversations/:id` | `{ title?, pinned? }` | `{ success: true, conversation }` | Ownership-scoped metadata updates. |
| `DELETE /api/ai/conversations/:id` | Param: `id` | `{ success: true, message }` | Deletes conversation and cascades `Message.deleteMany({ conversationId: id, userId })`. |
| `DELETE /api/ai/history` | None | `{ success: true, message, deletedConversations, deletedMessages }` | Explicit bulk clear strictly scoped to `userId`. |
| `PATCH /api/ai/messages/:id` | `{ feedback?, isSaved? }` | `{ success: true, message }` | Persists `'helpful'`, `'not-helpful'`, `null`, and bookmark boolean; ownership-scoped. |
| `GET /api/ai/status` | None | `{ providers, activeModel }` | Preserved; exposes provider availability flags only (no keys). |

---

## 4. Ownership, Security, Context Injection & Rate Limiting

- **Strict Ownership Isolation:** Every conversation and message lookup, append, update, cascade delete, and history clear explicitly scopes Mongoose queries by `userId: req.user.id`. Attempting to access or mutate another learner's conversation or message returns `HTTP 404`.
- **Input Validation:** Whitespace-only prompts, messages over `8000` characters, and malformed ObjectIds return `HTTP 400`.
- **Safe Learner Context (`loadLearnerContext` in `aiChat.routes.js`, `buildSystemPrompt` in `aiChat.service.js`):**
  - Reads non-sensitive learner fields (`User.department`, `User.designation`, `User.jobRoleId.title`, active `LearningPath.target_role`, and up to 5 active `LearningPathItem` course titles) inside a non-blocking `try/catch`.
  - Never injects API keys, tokens, emails, or internal database IDs into LLM prompts.
  - Missing profile or learning path records never fail chat requests.
- **Rate Limiting:** Existing `chatLimiter` (`60` requests/min keyed by `req.user?.id` with IP fallback) remains enforced on `POST /api/ai/chat`.

---

## 5. Persistence, Idempotency & Failure Behavior

1. **Pre-LLM User Write:** `POST /api/ai/chat` persists the user `Message` document *before* calling `aiChatService.chat(...)`, ensuring prompts are not silently lost if downstream generation or writes fail.
2. **Client Idempotency (`clientMessageId`):**
   - If a request arrives with an already-seen `(userId, conversationId, clientMessageId)` and a subsequent `assistant` message exists, the route immediately returns `{ ..., isDuplicate: true }` with zero duplicate writes and no redundant LLM call.
   - If a previous request crashed after saving the user message but before persisting the assistant reply, retrying with the same `clientMessageId` reuses `existingUserMsg` rather than inserting a duplicate user message.
3. **Atomic Conversation Metadata Update:** `Conversation.updateOne` uses `$set: { lastMessageAt }` and `$inc: { messageCount: addedMessagesCount }` to remain accurate under concurrent turns.
4. **Provider Resilience & Non-Fabricated Metadata:**
   - `aiChat.service.js` validates that provider text is a non-empty string, propagates `model` and `tokensUsed` only when genuinely returned by the provider response (`null` otherwise), and falls through to rule-based fallback (`provider: 'fallback', model: null, tokensUsed: null`) on provider outage or blank replies.
   - If database insertion of the assistant message fails, the route propagates `HTTP 500` via `next(err)` instead of returning a false success response.

---

## 6. Frontend Changes & Route Compatibility

- Both `/ai-tutor` (`AiTutorPage.jsx`) and `/ai-tutor/chat` (`AiTutorChatPage.jsx`) remain intact and accessible to learners.
- **`client/src/api/ai.api.js`:** Extended `sendChatMessage` to accept `{ conversationId, message, clientMessageId }` while retaining legacy array compatibility, and added `listConversations`, `createConversation`, `getConversation`, `getConversationMessages`, `updateConversation`, `deleteConversation`, `clearAllChatHistory`, and `updateMessageFeedback`.
- **`client/src/pages/assistant/AiTutorPage.jsx` & `AiTutorPage.module.css`:**
  - Eliminated hardcoded `INITIAL_CHAT_HISTORY` and mock initial conversation messages.
  - Loads real persisted conversations on mount (`listConversations`) and auto-selects the most recent conversation when present.
  - Supports `+ New Conversation`, switching saved conversations, deleting individual conversations, clearing all history (with confirmation), `Load More Conversations` pagination, and `Load older messages` cursor pagination.
  - Includes `activeConvIdRef` guard + message ID deduplication so switching threads while an AI reply is in flight never bleeds responses into another conversation, plus `isTyping` submit locking and generated `clientMessageId` per send.
  - Persists Helpful / Not Helpful feedback and Save bookmarks via `PATCH /api/ai/messages/:id`.
  - Backs the Learning Resources sidebar card with real `getLearningPath()` items when available (default static reference cards shown only if user has no path items yet).
- **`client/src/pages/assistant/AiTutorChatPage.jsx`:** Updated to pass `{ conversationId, message, clientMessageId }` so `/ai-tutor/chat` persists multi-turn threads in MongoDB, includes an in-flight session token guard on "New Chat", and links directly to `/ai-tutor` ("Full AI Tutor & History").

---

## 7. Exact Files Created / Modified in Phase 34

### Created
- `server/src/models/Conversation.js`
- `server/src/models/Message.js`
- `server/test_part34_ai_tutor_persistence.js`

### Modified
- `server/src/models/index.js`
- `server/src/services/aiChat.service.js`
- `server/src/routes/aiChat.routes.js`
- `client/src/api/ai.api.js`
- `client/src/pages/assistant/AiTutorPage.jsx`
- `client/src/pages/assistant/AiTutorPage.module.css`
- `client/src/pages/assistant/AiTutorChatPage.jsx`

---

## 8. Complete Verification & Test Inventory

### Initial Failure Caught & Fixed During Phase 34 Testing
- **Initial Failure:** First run of `node server/test_part34_ai_tutor_persistence.js` failed at assertion `1.4` (`GET /api/ai/conversations/:id/messages` returned `404` instead of `401`).
- **Root Cause:** Five newly added routes in `server/src/routes/aiChat.routes.js` (`GET /ai/conversations/:id/messages`, `PATCH /ai/conversations/:id`, `DELETE /ai/conversations/:id`, `DELETE /ai/history`, `PATCH /ai/messages/:id`) accidentally had `/api/ai/...` paths while `aiChatRouter` was already mounted at `/api` in `server/src/app.js`, producing `/api/api/ai/...`.
- **Fix & Rerun:** Normalized all five paths to `/ai/...` and reran `test_part34_ai_tutor_persistence.js`; all `94/94` assertions passed.

### Final Executed Test Results

| Command / Suite | Scope & Test Classification | Result |
|---|---|---|
| `node server/test_part34_ai_tutor_persistence.js` | **Real MongoDB (`kaushalai_test`) integration tests (Sections 1–13, 15):** unauth `401` across all endpoints, conversation & message persistence, reload retrieval, multi-turn continuation, pagination (`limit` & `before` cursor with `hasMore`), individual cascade delete, isolated clear-all, cross-user isolation (`404`), `clientMessageId` idempotency, validation (`400`), feedback/bookmark persistence, legacy `{ messages }` compatibility, concurrency + atomic `$inc`, dev DB (`kaushalai`) invariant checks.<br>**Unit & Mocked Failure-Injection tests (Section 14):** `buildSystemPrompt` unit test, mocked `aiChatService.chat` error fallback & blank-reply sanitization, mocked `axios.post` usage token / model propagation (`llama-3.3-70b-versatile`, `142` tokens), mocked `Message.create` failure on assistant insert (`500` + preserved user row + idempotent retry recovery), and `LearningPath` context forwarding check. | **94 PASSED, 0 FAILED** |
| `node server/test_part14_ai_assistant.js` | Dashboard AI Assistant 5-state machine analysis, en/hi translations, & real `kaushalai_test` integration API check. | **24 Passed, 0 Failed** |
| `node server/test_part22_learning_path_progression.js` | Sequenced Learning Path API, enrollments, progress monotonic rules, competency boundaries, & `kaushalai` DB invariants. | **63 Passed, 0 Failed** |
| `node server/test_runner.js` | Complete backend authentication regression runner (all 15 auth/isolation/concurrency/recovery suites: Parts 10.2, 32.1.3–32.1.18). | **15/15 suites PASSED (0 failed)** |
| `npm --prefix client run build` | Production Vite bundle verification (`vite v6.4.3`). | **PASSED** (`2746` modules transformed, built in `3.39s`) |
| `npx --prefix client eslint ...` | Client lint check attempt. | Not configured (`ESLint 9.39.5` exited with code 2: no `eslint.config.*` in repository). |

### Development Database Invariants (`mongodb://127.0.0.1:27017/kaushalai`)
- **Before Phase 34:** `users: 15`, `certificates: 0`, `conversations: 0`, `messages: 0`
- **After Phase 34 & All Test Suites:** `users: 15`, `certificates: 0`, `conversations: 0`, `messages: 0` (verified untouched)

---

## 9. Remaining Limitations & Deployment Requirements

1. **Production Index Creation:** Ensure MongoDB Atlas / production Mongoose connection allows `autoIndex` (or run index sync) on deploy so sparse idempotency (`{ userId, conversationId, clientMessageId }`) and sort indexes are created on `conversations` and `messages`.
2. **Secondary Chat Route Scope (`/ai-tutor/chat`):** `/ai-tutor/chat` persists turns in MongoDB during the active page session and links directly to `/ai-tutor` ("Full AI Tutor & History") rather than duplicating the sidebar history list or supporting `?conversationId=` deep-linking.
3. **Upstream LLM Rate Limits:** During rapid consecutive prompts in testing, Groq free/on-demand TPM limits triggered fallback between candidate models inside `aiChat.service.js`; model fallback handled this transparently, though high production burst volume would benefit from higher provider tier limits.

