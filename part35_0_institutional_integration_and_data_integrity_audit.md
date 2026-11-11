# KaushalAI — Phase 35.0: Institutional Integration, Data Integrity & Production Readiness Preflight Audit

**Phase:** 35.0 (Read-Only Audit & Prioritization Preflight)  
**Date:** 2026-11-11  
**Mode:** Strictly Read-Only (zero source edits, zero schema/index changes, zero migrations, zero dev database mutations)  
**Scope:** Workstreams A–F across backend, frontend, MongoDB (`kaushalai`), AI service configuration, and runtime operations. Authentication Parts 32.1.1–32.1.18 remain frozen and unmodified.

---

## 1. Executive Summary

This audit evaluates the remaining institutional integration, legacy data consistency, runtime AI administration, assessment/quiz history, course content delivery, and production readiness gaps across **KaushalAI** after Authentication closure (Part 32.1), Learner UX & iGOT honesty fixes (Phases 33 / 33.1), and persistent AI Tutor implementation (Phase 34).

**Key High-Level Conclusions:**

1. **Dual Competency Collections (`user_competencies` vs `usercompetencies`) [Confirmed Data Split / Migration Needed]:**
   All active Mongoose models, controllers, and services read/write exclusively to `user_competencies` (41 docs, snake_case schema). However, an orphaned camelCase legacy collection `usercompetencies` (25 docs) still exists in `kaushalai` containing **24 non-overlapping `(user, competency)` pairs** for real active users (`test.officer@mospi.gov.in` and `rahul.kumar@stats.gov.in`) and **1 conflicting pair** where `user_competencies` holds a newer diagnostic score (`current_level: 5`) versus an older self-assessment (`currentLevel: 4`). Additionally, `.populate('competencyId', ...).lean()` calls in `admin.controller.js` and `userFeatures.controller.js` rely on Mongoose aliases that yield raw `competency_id` keys under `.lean()`.

2. **iGOT & National Portal Integrations [Missing External Dependencies + Admin UI Misrepresentation]:**
   While Phase 33.1 made the learner-facing `IgotIntegrationLearnerPage.jsx` transparent about running in local catalogue mode, **admin-facing APIs and screens still present fabricated live connectivity**: `GET /api/admin/igot-status` (`userFeatures.controller.js`) returns hardcoded `gatewayStatus: 'ONLINE'` and `lastSyncTimestamp: new Date().toISOString()`; `ApiIntegrationsPage.jsx` displays 5 government gateways (`iGOT`, `Parichay SSO`, `NSSTA ERP`, `e-Office`, `PFMS`) as `"Connected & Operational"` with hardcoded webhook secrets (`whsec_igot_2026_••••••••••`) and simulated `setTimeout` health pings; and `SystemSettingsPage.jsx` General & Integrations tabs hardcode `"Operational"` / `"Connected"` status for iGOT and fake health metrics on API error. On the backend, both `igotAdapter.js` and `nsstaAdapter.js` throw `not yet implemented` in `liveAdapter` mode and are only called by `learningPath.service.js`, whereas `course.service.js` bypasses the adapters entirely and queries local MongoDB `Course` documents directly.

3. **Admin AI Provider Settings & Runtime Disconnection [Confirmed Architectural Gap]:**
   Controls in `AiConfigurationPage.jsx` (primary model, temperature, system prompt, RAG chunk viewer) operate solely on React `useState` with a `setTimeout` toast — zero backend API calls are made. `SystemSetting` (`systemsettings` collection, 1 document) has zero AI provider/model/prompt fields. Meanwhile, `aiChat.service.js`, `grokAssessment.service.js`, `aiMcqGenerator.service.js`, and `GET /api/ai/status` read `process.env.*` dynamically per request (`GROQ_API_KEY`, `GROK_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`), and `aiServiceClient.js` caches `AI_SERVICE_URL` / `INTERNAL_SERVICE_TOKEN` in a module-level singleton. Runtime AI configuration therefore requires environment variable updates and process restarts rather than Admin UI changes.

4. **Assessment & Quiz History Integrity [Confirmed Defects & Schema Split]:**
   Learner assessment history is split across two schemas (`assessment_attempts`: 7 completed diagnostic records; `quizattempts`: 12 quiz records). `AssessmentHistoryPage.jsx` only fetches `getMyQuizAttempts()` (`GET /api/users/me/quiz-attempts`), completely omitting diagnostic `AssessmentAttempt` records. Legacy `QuizAttempt` rows lack `completedAt` and render `"Date unavailable"`. Worse, `QuizResultPage.jsx` ignores its `:id` route parameter, reads `localStorage.getItem('kai_last_quiz_result')`, and displays hardcoded `SECTION_PERFORMANCE`, `TOPIC_ANALYSIS`, `INCORRECT_QUESTIONS`, and `"18m 42s"` duration fallbacks. `QuizListPage.jsx` merges `localStorage.getItem('kai_quiz_attempts')` with backend attempts and reads `createdAt` instead of `completedAt`. `AssessmentResultsPage.jsx` (Admin) falls back to hardcoded mock questions/candidates (`Amit Verma`), and `RecentAssessmentsWidget.jsx` uses a `score >= 60` pass threshold compared to `70%` in `quizAttempt.controller.js`.

5. **Course Content Delivery & Course-Player AI Mismatch [Confirmed Coverage Gap + Legacy Mock Panel]:**
   Database inspection of all **66 courses** (`igot`: 42, `nssta`: 24) shows **59 courses (89.4%) have zero `youtubeUrl`, zero `slides`, zero `modules`, zero `resources`, and zero `transcript`**. Only 7 courses contain rich content (1 NSSTA course with 31 slides; 6 iGOT courses with YouTube URLs/modules/external links — where several `type: 'PDF'` resources actually link to portal homepages like `https://igotkarmayogi.gov.in` or `https://meity.gov.in`). Although `CourseProgressPage.jsx` now renders an honest empty state when media/slides are absent and falls back to 5 generic placeholder module titles when `course.modules` is empty, **its embedded right-hand `AiChatPanel` was NOT migrated in Phase 34** — it still returns a fake `setTimeout(..., 1200)` canned response instead of calling `/api/ai/chat`.

6. **Production Readiness & Operational Risks [Mixed Readiness + Confirmed Hardening Gaps]:**
   CORS fail-closed production allowlists, `TRUST_PROXY` validation, `helmet`, `express-mongo-sanitize`, and error stack suppression are solid (`server/src/app.js`, `errorHandler.js`). However, critical production risks remain: `server/server.js` silently generates **ephemeral per-process JWT/cookie secrets** if env vars are missing/placeholders; there is **no `SIGTERM`/`SIGINT` graceful shutdown** handler; `express.json({ limit: '50mb' })` is permissive; `clearCache` (`POST /api/admin/cache/clear`) is a no-op stub; `courses` has **no custom indexes** (only `_id_`); `conversations`/`messages` lack retention TTL or admin purge controls; `admin` account/user deletion and cascading cleanup are unimplemented; and automated backup/restore only exists as static UI buttons (`SystemSettingsPage.jsx`).

All **15/15 authentication regression suites**, **11 domain/feature test suites**, and the **client Vite production build** passed cleanly in verification against `kaushalai_test`, while the development database `kaushalai` remained 100% untouched.

---

## 2. Findings by Workstream (Workstreams A–F)

### Workstream A — Legacy Competency Collection Reconciliation (`user_competencies` vs `usercompetencies`)

- **Model & Active Collection Binding:**
  - `server/src/models/UserCompetency.js` explicitly sets `{ collection: 'user_competencies' }`.
  - Schema fields are snake_case: `user_id`, `competency_id`, `current_level` (1–5), `last_assessed_at`, `assessment_attempt_id`, `source` (`'diagnostic_test' | 'quiz' | 'manual_override' | 'course_completion' | 'self_assessed'`), with Mongoose `alias` definitions (`userId`, `competencyId`, `currentLevel`, etc.) and unique index `{ user_id: 1, competency_id: 1 }`.
- **Codebase Grep Verification:**
  - Searching both `server/` and `client/` for `usercompetenc` matches **only** a stale comment in `server/src/services/adminAnalytics.service.js:12` (`db.usercompetencies.createIndex(...)`). Zero models, controllers, or services query or write to `usercompetencies`.
- **Exact MongoDB State (`kaushalai`):**
  - `user_competencies`: **41 documents** across **7 distinct users** and **11 competencies** (all 41 have `source: 'diagnostic_test'`, `createdAt`, `updatedAt`, `assessment_attempt_id`).
  - `usercompetencies`: **25 documents** across **2 distinct users** and **24 competencies** (`source: 'quiz'`: 1 doc; `source: 'self_assessed'`: 24 docs). Unique index: `{ userId: 1, competencyId: 1 }`.
  - **Foreign Key Integrity:** All 2 users (`6a971846e3d3f4e706722e3b` Test Officer `admin` with 1 `quiz` doc; `6a9a6797930c5a24ab88d325` Rahul Kumar `employee` with 24 `self_assessed` docs) and all 24 referenced competencies exist in `users` and `competencies` (0 dangling references).
  - **Overlap & Conflict Analysis:**
    - **24 records** in `usercompetencies` (23 `self_assessed` for Rahul Kumar + 1 `quiz` for Test Officer) do **not** exist in `user_competencies`.
    - **1 `(user, competency)` pair overlaps** (`6a9a6797930c5a24ab88d325` / `6a996d6d266163e0a9606c4e`) and **conflicts**:
      - `user_competencies`: `current_level: 5`, `source: 'diagnostic_test'`, `updatedAt: 2026-09-13T10:58:20.208Z` (newer, verified diagnostic test).
      - `usercompetencies`: `currentLevel: 4`, `source: 'self_assessed'`, `updatedAt: 2026-09-04T07:33:11.668Z` (older self-assessment).
- **Subtle Query / `.lean()` Alias Defect:**
  - `skillGap.service.js:226` and `skillGap.controller.js:390` query `{ user_id: userId }`, and `competency.service.js`, `competencyUpdate.service.js`, and `adminAnalytics.service.js` query `$or: [{ user_id }, { userId }]`.
  - However, `admin.controller.js:335` (`UserCompetency.find({ userId }).populate('competencyId', ...).lean()`) and `userFeatures.controller.js:88` (`getMyActivityHistory`: `UserCompetency.find({ userId }).populate('competencyId', ...).lean()`) rely on Mongoose aliases with `.lean()`, which returns raw MongoDB snake_case keys (`competency_id`, `current_level`) rather than populated camelCase `competencyId` objects if downstream consumers inspect camelCase fields.

---

### Workstream B — iGOT & Institutional Integration Reality

- **Backend Adapter Layer (`igotAdapter.js` & `nsstaAdapter.js`):**
  - `server/src/services/adapters/igotAdapter.js` and `nsstaAdapter.js` switch between `mockAdapter` and `liveAdapter` via `process.env.COURSE_SOURCE_MODE` (`'mock'` by default).
  - Both `liveAdapter` implementations explicitly throw `Error('... liveAdapter ... not yet implemented')` across `fetchCatalogue`, `fetchCourseById`, and `syncEnrollmentStatus`.
  - `mockAdapter.syncEnrollmentStatus` only executes `console.log('[MockAdapter] ...')` and returns `{ synced: false, mode: 'mock', ... }`.
  - **Unused Adapter Surface:** Only `server/src/services/learningPath.service.js` calls `getCourseAdapter().fetchCatalogue()` and `getNsstaAdapter().fetchCatalogue()`. Neither `course.service.js` nor any enrollment handler calls `syncEnrollmentStatus`.
  - `server/src/services/course.service.js` reads local MongoDB `Course` and `Enrollment` documents directly (and contains a hardcoded course ID fallback at line 31 mapping `6a9c7739...` to `/Official Statistics Awareness Programme/i`).
- **Learner UI Honesty vs Fallback (`IgotIntegrationLearnerPage.jsx` & `IgotCoursesPage.jsx`):**
  - `IgotIntegrationLearnerPage.jsx` (updated in Phase 33.1) accurately displays `"Local Catalogue Mode"`, labels learning hours as estimated course duration (`Estimated Duration Completed`), separates `"Last Local Refresh"` from `"Verified External Sync: None"`, and explains that `igotAdapter.js (mock)` has no external connection.
  - `IgotCoursesPage.jsx` merges API courses with a local `CATALOGUE` array fallback (`igot-crs-01..06`), and in `enrollMutation.onError` displays a misleading toast `"Enrolled in local mode! Opening player..."` and navigates to `/my-courses/:courseId` even when backend enrollment failed.
- **Admin Endpoints & Screens Misrepresenting External Connectivity [Confirmed Defect]:**
  - `GET /api/admin/igot-status` (`userFeatures.controller.js:280-302`) returns hardcoded `{ gatewayStatus: 'ONLINE', mode: process.env.COURSE_SOURCE_MODE || 'HYBRID', syncInterval: '24 Hours', lastSyncTimestamp: new Date().toISOString() }` alongside MongoDB `Course` counts without probing any external gateway.
  - `client/src/pages/admin/ApiIntegrationsPage.jsx` is a 100% static client component asserting 5 portals (`iGOT Karmayogi Portal`, `Parichay SSO`, `NSSTA ERP`, `e-Office`, `PFMS`) are `"Connected & Operational"`, rendering fake webhook secret `whsec_igot_2026_••••••••••` and fake `setTimeout` ping latencies.
  - `client/src/pages/admin/SystemSettingsPage.jsx` hardcodes `"Operational"` status badges in the System Status card (and on health API error falls back to fake `'OPERATIONAL'` / `'128MB'` modal values), while its `Integrations` tab hardcodes `https://igot-api.gov.in/v2/cadre-sync` as `"Connected"`.

---

### Workstream C — Admin AI Provider Settings & Runtime Behavior

- **Admin UI Disconnect:**
  - `client/src/pages/admin/AiConfigurationPage.jsx` stores model selection (`gemini-2.5-flash`), temperature, max tokens, system prompt, and RAG source stats (`3,552` chunks, `99.8%` reliability, `620ms` latency) solely in React `useState` and simulates saves with `setTimeout` + toast. Zero API requests exist.
  - `SystemSettingsPage.jsx` only persists the `General`, `Security Policy`, `Session Management`, `Content Limits`, and `Maintenance Mode` fields defined in `SystemSetting.js` (`key: 'global_config'`). No other tab persists changes.
- **Backend Model & Endpoints:**
  - `server/src/models/SystemSetting.js` contains zero AI provider, model, prompt, or temperature fields.
  - `admin.controller.js` `getSystemSettings` / `updateSystemSettings` only reads/writes `SystemSetting`. `clearCache` (`admin.controller.js:470-476`) is a stub returning `{ message: 'System cache cleared successfully' }` without clearing any cache or singleton.
- **Actual Runtime Configuration Resolution:**
  - `server/src/services/aiChat.service.js`: Dynamically inspects `process.env.GROQ_API_KEY`, `process.env.GROK_API_KEY`, `process.env.GEMINI_API_KEY`, `process.env.OPENAI_API_KEY`, and `*_MODEL` variables on each request (`getConfiguredProviders()`, `GET /api/ai/status`). Provider order / availability is controlled exclusively by server env vars.
  - `server/src/services/grokAssessment.service.js` & `server/src/services/aiMcqGenerator.service.js`: Independently check `process.env.GEMINI_API_KEY`, `GROK_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` on invocation (in different priority orders: Chat prefers `Groq -> Grok -> Gemini -> OpenAI`; MCQ prefers `Gemini -> Grok -> OpenAI -> Anthropic`).
  - `server/src/services/aiServiceClient.js`: Instantiates a module-level `_client` singleton once on first call using `AI_SERVICE_URL` and `INTERNAL_SERVICE_TOKEN`, so changes to those env vars require a full Node process restart.

---

### Workstream D — Assessment & Quiz History Integrity

- **Two Disconnected Assessment Systems:**
  1. **Diagnostic Onboarding / Competency Assessments (`AssessmentAttempt` / `AssessmentResponse`):** Stored in `assessment_attempts` (**7** completed documents in `kaushalai`, snake_case: `user_id`, `assessment_id`, `overall_score`, `competency_scores`, `ai_analysis`, `started_at`, `completed_at`, `status`). Served via `/api/onboarding/results` and `GET /api/assessments/attempts/:attemptId/results`.
  2. **Course / Module Quizzes (`QuizAttempt` / `Quiz`):** Stored in `quizattempts` (**12** documents in `kaushalai`, camelCase: `userId`, `quizId`, `quizTitle`, `score`, `passed`, `status`, `startedAt`, `completedAt`, `attemptedAt`, `detailedResults`). Served via `GET /api/users/me/quiz-attempts` (`quizAttempt.controller.js`).
- **Confirmed Data & UI Defects:**
  - **Missing Diagnostic Attempts in History & Activity:** Neither `AssessmentHistoryPage.jsx` nor `getMyActivityHistory()` (`userFeatures.controller.js`) nor `achievement.service.js` queries `AssessmentAttempt`. Learners who completed diagnostic assessments see `"No Assessments Completed"` if they haven't taken a standalone course quiz.
  - **Legacy `QuizAttempt` Schema Drift:** In MongoDB `quizattempts`, **7 of 12** documents (`2026-09-01` to `2026-09-13`) predate the `status`/`completedAt`/`startedAt` schema additions and only have `attemptedAt`. `AssessmentHistoryPage.jsx` reads `completedAt` without falling back to `attemptedAt`, displaying `"Date unavailable"`.
  - **Mocked Quiz Results Page (`QuizResultPage.jsx`):** Despite its `/quizzes/:id/result` route parameter, `QuizResultPage.jsx` never calls the backend API. It reads `localStorage.getItem('kai_last_quiz_result')` with a hardcoded fallback (`25 / 30 (83.3%)`, `'18m 42s'`, `'30m 00s'`) and renders static `SECTION_PERFORMANCE`, `TOPIC_ANALYSIS` SVG chart slices, and `INCORRECT_QUESTIONS`.
  - **`localStorage` Merging & Wrong Timestamp (`QuizListPage.jsx`):** Merges `localStorage.getItem('kai_quiz_attempts')` ahead of API results (`[...local, ...api]`) and reads `createdAt` (which does not exist on `QuizAttempt` since `timestamps: false`).
  - **Inconsistent Pass Threshold:** `quizAttempt.controller.js` enforces `score >= 70`, whereas `RecentAssessmentsWidget.jsx` checks `score >= 60`.
  - **Admin Mock Fallbacks (`AssessmentResultsPage.jsx`):** Falls back to hardcoded `questionItems` (5 fake questions), hardcoded `candidateAttempts` (e.g., `Amit Verma`), and `passRate = 80`.

---

### Workstream E — Course Content Delivery & Player Fidelity

- **Database Content Coverage (`courses`: 66 documents — `igot`: 42, `nssta`: 24):**
  - **59 courses (89.4%)** have **zero** `youtubeUrl`, **zero** `slides`, **zero** `modules`, **zero** `resources`, and **zero** `transcript`.
  - **6 iGOT courses** have `youtubeUrl` + 3–6 `modules` with YouTube URLs + 1–2 `resources` (note: resources marked `type: 'PDF'` mostly point to top-level ministry/portal homepages such as `https://igotkarmayogi.gov.in`, `https://niti.gov.in`, `https://meity.gov.in`, `https://mha.gov.in`, not direct downloadable PDF assets).
  - **1 NSSTA course** (`Official Statistics Awareness Programme for University Professors and PG Students`) has 31 `slides` and 5 `modules` (all courses have `transcript: ''`).
- **Course Player (`CourseProgressPage.jsx`) & Slide Viewer (`SlideViewer.jsx`) Behavior:**
  - When DB `course.youtubeUrl` / `modules[].youtubeUrl` / `slides` are absent (59 courses), `CourseProgressPage.jsx` injects **5 generic placeholder module titles** (`Module 1: Introduction & Overview` ... `Module 5: Assessment & Summary`) and renders an honest empty state: `"No Video Content Available for this Module"`.
  - For the 1 NSSTA slide course, `SlideViewer.jsx` provides full keyboard/fullscreen slide navigation, bullet views, and visual fallback.
  - **Phase 34 Persistence Gap (`AiChatPanel` inside `CourseProgressPage.jsx`):** Unlike `AiTutorPage.jsx` and `AiTutorChatPage.jsx`, the embedded right-hand `AiChatPanel` in `CourseProgressPage.jsx` still uses local component state and a hardcoded `setTimeout(..., 1200)` simulated tutor response — it **never calls `/api/ai/chat`** and **never persists** course-side tutor messages.
  - **Overview Rating Fallback:** `CourseProgressPage.jsx:976` falls back to hardcoded `4.3` average rating display when DB `rating`/`defaultRating` is absent, and `Notes` tab writes only to `localStorage` (`notes-${id}-${activeModuleIdx}`).

---

### Workstream F — Production Readiness & Operational Risks

- **Environment Variables & Secrets (`server/server.js`, `.env.example`, `.env.production.example`):**
  - **Silent Ephemeral Secret Fallback Risk:** `server/server.js:11-23` calls `ensureSecret()` for `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, and `COOKIE_SECRET`; if missing or matching `'replace_with_a_long_random_secret'`, it logs a warning and generates an **ephemeral per-process random hex string** instead of failing fast. A container restart or multi-worker deployment silently invalidates all active tokens/cookies.
  - **CORS & Proxy Configuration:** `server/src/app.js` enforces fail-closed origin allowlist checks (`CLIENT_ORIGIN`, `CLIENT_URL`, `https://kaushal-ai-azure.vercel.app`) in `production` and strict `TRUST_PROXY` validation (`parseAndValidateTrustProxy`).
- **MongoDB Indexes & Migration Hygiene:**
  - `courses` has **zero secondary indexes** (only `_id_`) despite frequent filtering by `source`, `category`, `difficulty`, `isPublished`, `skillTags`, and `externalCourseId`.
  - `conversations` has `userId_1` and compound indexes defined in `Conversation.js` (`userId_1_lastMessageAt_-1`, `userId_1_status_1_lastMessageAt_-1`), though in `kaushalai` (currently 0 docs) only `_id_` and `userId_1` were materialized at query inspect time (compound indexes are built asynchronously by Mongoose upon app boot when `autoIndex` runs). Same for `messages` (`_id_`, `conversationId_1` active in `kaushalai`; compound indexes defined in `Message.js`).
  - `quizattempts` lacks `{ userId: 1, completedAt: -1 }` / `{ userId: 1, attemptedAt: -1 }` compound indexes for sorted learner history.
  - `usercompetencies` orphaned legacy collection still holds stale data and an unused unique index.
- **Process Lifecycle, Body Limits & Auto-Seeding (`server/server.js`, `autoSeed.service.js`):**
  - **No Graceful Shutdown:** `server/server.js` lacks `SIGTERM`/`SIGINT` handlers to drain HTTP connections or close Mongoose/Redis cleanly on rolling restarts (Render/Docker).
  - **Auto-Seeding on Every Startup:** `autoSeed()` runs on `app.listen` (`seedOfficialQuizzes()`, `seedCuratedIgotCourses()`, `seedCourseSlideContent()` execute every boot; non-blocking `try/catch`). Needs idempotency audit before horizontal scaling.
  - **Global Body Limit:** `express.json({ limit: '50mb' })` applies globally across all JSON endpoints (DoS / memory exhaustion vector; file uploads should keep multipart limits separate via `multer`).
- **External Provider Fallbacks & `ai-service` Resilience:**
  - `aiChat.service.js`, `grokAssessment.service.js`, and `aiMcqGenerator.service.js` all implement deterministic non-LLM fallback behavior when API keys are absent or providers fail, and `aiChat.routes.js` preserves the persisted user message before recording fallback state.
  - `ai-service` runs FastAPI + ChromaDB (`ai-service/.env.example`: requires `ANTHROPIC_API_KEY`, `INTERNAL_SERVICE_TOKEN`, `CHROMA_DATA_DIR=./chroma_data` ephemeral local storage unless volume-mounted).
  - `GET /api/admin/system-health` actively checks MongoDB & `AI_SERVICE_URL/health`, while external iGOT/NSSTA portals have no live connectivity.
- **Rate Limits, Retention, Deletion & Backups:**
  - Chat endpoint has per-user `chatLimiter` (`60` requests / `60s`), `Message.content` max length `8000`, `Conversation.title` max length `120`. However, there is **no per-user conversation/message quota cap**, **no TTL / archive retention policy**, and **no user account deletion / GDPR-style cascading purge** endpoint across `Conversation`, `Message`, `AssessmentAttempt`, `QuizAttempt`, `UserCompetency`, `SkillGap`, `Enrollment`, or `Certificate`.
  - **No Backup/Restore Automation:** Backup triggers in `SystemSettingsPage.jsx` are UI-only toasts; `docker-compose.prod.yml` mounts `mongo_data` on a single VM without scheduled `mongodump` or Atlas snapshot verification.
- **Logging & Error Visibility:**
  - `server/src/utils/logger.js` wraps `console.info/warn/error` (unstructured text, no JSON correlation/request IDs). `morgan('combined')` handles HTTP access logs in production, and `errorHandler.js` suppresses stack traces outside `development` and maps Mongoose `ValidationError`/`CastError`/`11000` cleanly.

---

## 3. Exact Files, Models, Routes, Collections & APIs

| Domain / Workstream | Backend Files & Models | Routes / API Endpoints | MongoDB Collections | Frontend Files |
|---|---|---|---|---|
| **A. Competency Collections** | `server/src/models/UserCompetency.js`<br>`server/src/services/competency.service.js`<br>`server/src/services/competencyUpdate.service.js`<br>`server/src/services/adminAnalytics.service.js`<br>`server/src/services/skillGap.service.js`<br>`server/src/controllers/skillGap.controller.js`<br>`server/src/controllers/admin.controller.js`<br>`server/src/controllers/userFeatures.controller.js`<br>`server/src/controllers/assessment.controller.js`<br>`server/src/controllers/onboarding.controller.js` | `GET /api/user-competencies`<br>`GET /api/skill-gaps`<br>`GET /api/users/me/activity-history`<br>`GET /api/admin/users/:id/competencies` (via `admin.controller.js`)<br>`GET /api/admin/analytics/*` | Active: `user_competencies` (41 docs)<br>Orphaned: `usercompetencies` (25 docs)<br>Downstream: `skill_gaps` (264 docs) | `SkillsCompetencyPage.jsx`<br>`CompetencyAnalyticsPage.jsx`<br>`EmployeeDashboard.jsx` |
| **B. iGOT / Institutional Integration** | `server/src/services/adapters/igotAdapter.js`<br>`server/src/services/adapters/nsstaAdapter.js`<br>`server/src/services/learningPath.service.js`<br>`server/src/services/course.service.js`<br>`server/src/controllers/course.controller.js`<br>`server/src/controllers/userFeatures.controller.js` (`getIgotStatus`) | `GET /api/courses`<br>`GET /api/courses/:id`<br>`POST /api/courses/:id/enroll`<br>`GET /api/users/me/enrollments`<br>`GET /api/admin/igot-status`<br>`GET /api/admin/system-health` | `courses` (66 docs: `igot` 42, `nssta` 24)<br>`enrollments` (10 docs)<br>`learning_paths` (12)<br>`learning_path_items` (104) | `IgotIntegrationLearnerPage.jsx`<br>`IgotCoursesPage.jsx`<br>`ApiIntegrationsPage.jsx`<br>`SystemSettingsPage.jsx` |
| **C. Admin AI Provider Config** | `server/src/models/SystemSetting.js`<br>`server/src/controllers/admin.controller.js` (`getSystemSettings`, `updateSystemSettings`, `clearCache`)<br>`server/src/services/aiChat.service.js`<br>`server/src/services/grokAssessment.service.js`<br>`server/src/services/aiMcqGenerator.service.js`<br>`server/src/services/aiServiceClient.js` | `GET /api/ai/status`<br>`POST /api/ai/chat`<br>`GET /api/admin/settings`<br>`PUT /api/admin/settings`<br>`POST /api/admin/cache/clear` | `systemsettings` (1 doc: `key: 'global_config'`)<br>`auditlogs` (115 docs) | `AiConfigurationPage.jsx`<br>`SystemSettingsPage.jsx` |
| **D. Assessment & Quiz History** | `server/src/models/AssessmentAttempt.js`<br>`server/src/models/QuizAttempt.js`<br>`server/src/controllers/assessment.controller.js`<br>`server/src/controllers/quizAttempt.controller.js`<br>`server/src/controllers/userFeatures.controller.js`<br>`server/src/services/achievement.service.js` | `GET /api/assessments/attempts/:attemptId/results`<br>`GET /api/onboarding/results`<br>`GET /api/users/me/quiz-attempts`<br>`POST /api/quizzes/:id/start-attempt`<br>`POST /api/quizzes/:id/attempts`<br>`GET /api/quizzes/:id/stats` | `assessment_attempts` (7 docs)<br>`assessment_responses` (105 docs)<br>`quizattempts` (12 docs)<br>`quizzes` (18 docs)<br>`assessments` (5 docs) | `AssessmentHistoryPage.jsx`<br>`QuizListPage.jsx`<br>`QuizResultPage.jsx`<br>`AssessmentResultsPage.jsx`<br>`RecentAssessmentsWidget.jsx` |
| **E. Course Content Delivery** | `server/src/models/Course.js`<br>`server/src/services/course.service.js`<br>`server/src/seed/seedCourseSlideContent.js`<br>`server/src/routes/aiChat.routes.js` | `GET /api/courses/:id`<br>`GET /api/quizzes?courseId=...` (via `getQuizByCourse`)<br>`PUT /api/users/me/enrollments/:id/progress`<br>`POST /api/courses/:id/rate` | `courses` (66 docs)<br>`learning_progress` (10 docs)<br>`enrollments` (10 docs) | `CourseProgressPage.jsx`<br>`SlideViewer.jsx` |
| **F. Operational Readiness** | `server/server.js`<br>`server/src/app.js`<br>`server/src/config/db.js`<br>`server/src/middleware/errorHandler.js`<br>`server/src/utils/logger.js`<br>`server/src/services/autoSeed.service.js`<br>`server/src/models/Conversation.js`<br>`server/src/models/Message.js` | `GET /`, `HEAD /`, `GET /api/health`<br>`POST /api/ai/chat`, `GET/DELETE /api/ai/conversations*`<br>`GET /api/certificates/verify/:certificateId` | All collections in `kaushalai`<br>Auth tokens: `refreshtokens` (2 docs, TTL on `expiresAt`) | `client/vercel.json`<br>`docker-compose.prod.yml` |

---

## 4. Current Behavior vs. Intended Behavior

| Area | Current Verified Behavior | Intended Production Behavior |
|---|---|---|
| **Competency Data Storage** | Active code uses `user_competencies` (41 docs); orphaned `usercompetencies` (25 docs) holds 24 unique historical records + 1 stale conflict unread by any feature. | Single canonical `user_competencies` collection after deterministic, conflict-resolved backfill + archive/drop of `usercompetencies`. Uniform snake_case or DTO serialization without `.lean()` alias mismatch. |
| **Admin Integration Status** | `GET /api/admin/igot-status` returns hardcoded `ONLINE`; `ApiIntegrationsPage.jsx` & `SystemSettingsPage.jsx` show `"Connected & Operational"` for 5 external gov portals. | Truthfully reflect `COURSE_SOURCE_MODE` (`mock` / local catalogue) and actual `not_configured` / `unverified` external gateway states with real backend configuration/health checks. |
| **Course Adapter Layer** | `liveAdapter` throws unimplemented; `igotAdapter`/`nsstaAdapter` only called by `learningPath.service.js`; `IgotCoursesPage` falls back silently on enroll failure. | Explicit mode distinction, real agency client behind feature flag once credentials exist, and authentic error handling on failed enrollments. |
| **Admin AI Settings** | `AiConfigurationPage.jsx` modifies React local state only; backend reads env vars per request (`aiServiceClient.js` caches singleton once). | Either read-only runtime status reflecting active env configuration + `AI_SERVICE_URL` health, or DB-persisted `SystemSetting` overrides dynamically honored by AI services with audit logging. |
| **Assessment & Quiz History** | History page hides diagnostic `AssessmentAttempt`s; legacy `QuizAttempt`s show `"Date unavailable"`; `QuizResultPage` renders `localStorage` + static mock tables/donut chart; Admin `AssessmentResultsPage` falls back to mock candidates. | Unified or tabbed history combining `AssessmentAttempt` & `QuizAttempt`; DB-backed `GET /api/quiz-attempts/:id` for results; `attemptedAt` fallback for legacy dates; 0 mock fallbacks; consistent `70%` pass threshold. |
| **Course Player & AI Sidebar** | 59/66 courses have zero media/slides/modules and render 5 placeholder module titles + empty video state; `AiChatPanel` inside `CourseProgressPage.jsx` fakes replies via `setTimeout`. | Clear module/content metadata from DB; `CourseProgressPage.jsx` `AiChatPanel` wired to `POST /api/ai/chat` (persistent Phase 34 backend) with course-context metadata. |
| **Secrets, Shutdown & Cache** | `server.js` falls back to ephemeral random secrets on missing env vars; no `SIGTERM` drain; `POST /api/admin/cache/clear` is a no-op; 50MB global JSON limit. | Fail-fast in `NODE_ENV=production` on missing secrets; graceful `SIGTERM`/`SIGINT` shutdown; tight default JSON limit (`1mb`–`5mb`); functional or honestly scoped admin maintenance actions. |

---

## 5. Confirmed Defects vs. Documented Limitations vs. Missing External Dependencies

### A. Confirmed Implementation Defects (Fixable Internally in Phase 35.1+)
1. **`QuizResultPage.jsx` reads `localStorage` & renders hardcoded charts/questions** instead of loading the attempt by `:id` from backend (`Workstream D`).
2. **`AssessmentHistoryPage.jsx` omits diagnostic `AssessmentAttempt` records** and fails to fall back to `attemptedAt` when `completedAt` is null (`Workstream D`).
3. **`QuizListPage.jsx` reads `createdAt` (undefined on `QuizAttempt`) and injects `kai_quiz_attempts` `localStorage` array** ahead of server attempts (`Workstream D`).
4. **`RecentAssessmentsWidget.jsx` uses `score >= 60` pass threshold** vs backend `score >= 70` (`Workstream D`).
5. **`AssessmentResultsPage.jsx` falls back to mock `Amit Verma` / `questionItems`** instead of empty/error states (`Workstream D`).
6. **`CourseProgressPage.jsx` embedded `AiChatPanel` fakes responses with `setTimeout` instead of calling Phase 34 persistent `/api/ai/chat`** (`Workstream E`).
7. **`GET /api/admin/igot-status` (`userFeatures.controller.js`), `ApiIntegrationsPage.jsx`, and `SystemSettingsPage.jsx` misrepresent unconfigured external integrations (`iGOT`, `Parichay`, `NSSTA ERP`, `e-Office`, `PFMS`) and cache clearing (`admin.controller.js:clearCache`) as live/operational** (`Workstreams B, C, F`).
8. **`AiConfigurationPage.jsx` presents non-functional interactive model/prompt controls** backed only by `useState` and `setTimeout` (`Workstream C`).
9. **`admin.controller.js:335` & `userFeatures.controller.js:88` use `.populate('competencyId').lean()`** on a snake_case schema where MongoDB stores `competency_id` (`Workstream A`).
10. **`IgotCoursesPage.jsx` `enrollMutation.onError` falsely toasts local enrollment success and navigates to the course player** even if enrollment API rejects (`Workstream B`).
11. **`server/server.js` silently generates ephemeral secrets instead of failing fast in production, lacks `SIGTERM` graceful shutdown, and `app.js` uses a global `50mb` JSON limit** (`Workstream F`).
12. **Missing MongoDB indexes on `courses` and `quizattempts` sorted history** (`Workstream F`).

### B. Documented Product / Content Limitations (Expected Without External Provisioning)
1. **59 of 66 seeded courses have metadata only** (no uploaded slides, transcripts, PDFs, or videos). The player honestly states no video/materials are uploaded, though it still displays 5 generic module headings when `course.modules` is empty.
2. **External resource links marked `type: 'PDF'` on the 6 iGOT courses** point to portal landing pages (`https://igotkarmayogi.gov.in`, `https://meity.gov.in`, `https://niti.gov.in`, `https://mha.gov.in`) rather than direct PDF binaries.
3. **Authentication Part 32.1 remains frozen** (documented residual limitations already closed in `part32_1_final_authentication_closure_report.md`).
4. **No time-tracking telemetry in DB** — learning hours remain strictly estimated course-duration-completed (`durationHours * progressPercent / 100`).

### C. Missing External Dependencies / Credentials (Blocked Outside Codebase)
1. **iGOT Karmayogi Live API (`IGOT_API_BASE_URL`, `IGOT_API_KEY`) & Agency Onboarding/Contracts:** Required before `igotAdapter.js` `liveAdapter` can be implemented (real API endpoints, OAuth/SSO token exchange, webhook signing schema).
2. **NSSTA TPAC Live API (`NSSTA_API_BASE_URL`, `NSSTA_API_KEY`) & Parichay SSO / e-Office / PFMS:** No documented API specs or sandbox credentials exist in the repository.
3. **Production LLM API Quotas & Keys (`GROQ_API_KEY`, `GROK_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) + `ai-service` persistent ChromaDB volume/hosting:** Required for non-fallback AI generation in production.
4. **Managed Database Backup & Monitoring Infrastructure:** Automated MongoDB Atlas snapshots / `mongodump` schedules and centralized log aggregation.

---

## 6. Data-Integrity & Migration Risks

1. **`usercompetencies` -> `user_competencies` Backfill Conflict Risk (Medium-High if done carelessly):**
   - Naive `insertMany` or blind overwrite would either throw E11000 duplicate key on `(user_id: '6a9a6797930c5a24ab88d325', competency_id: '6a996d6d266163e0a9606c4e')` or overwrite the verified `2026-09-13` `diagnostic_test` level `5` with the older `2026-09-04` `self_assessed` level `4`.
   - **Safe Migration Rule:** Merge only non-existing `(user_id, competency_id)` pairs using idempotent `$setOnInsert` (preserving existing `user_competencies` documents), recompute affected users' `SkillGap` projections via `computeUserSkillGaps()` under `withUserLock()`, verify counts match (`41 + 24 = 65` docs), and export `usercompetencies` backup before dropping/archiving it.
2. **Legacy `QuizAttempt` Missing Fields (`status`, `completedAt`, `startedAt`):**
   - 7 of 12 documents in `quizattempts` lack `status` and `completedAt` (only having `attemptedAt`). Any migration or query filtering strictly on `{ status: 'completed' }` or sorting by `completedAt` without coalescing `attemptedAt` will silently drop historical learner quiz records.
3. **In-Progress `QuizAttempt` Artifacts:**
   - Verified in `kaushalai`: 2 test/abandoned `quizattempts` remain in `status: 'in_progress'` from `2026-11-03` (`score: 0`). Expired-attempt sweep or cleanup logic should be checked alongside history filtering.
4. **Course Enrollment / Resource Link Integrity:**
   - Hardcoded fallback ID `6a9c77392153d7505fd447a9` in `course.service.js` and `CourseProgressPage.jsx` creates brittle environment coupling if MongoDB ObjectIds differ across fresh seeds.
5. **Auditability of Migrations & Restores:**
   - Any backfill script must run idempotently (`--dry-run` first), refuse production/dev execution without explicit confirmation/snapshot, and never auto-run blindly inside `server.js` `autoSeed()` in a way that could re-introduce dropped legacy collections.

---

## 7. Test Inventory & Exact Execution Results

All test executions during Phase 35.0 ran **after** auditing source code, exclusively against `kaushalai_test` (guarded by `testDbGuard.js` or explicit `TEST_MONGO_URI`), and verified `kaushalai` untouched before and after.

### Executed & Verified Results (2026-11-11)

| Suite / Command | Scope | Assertions / Suites | Result | DB Target Verified |
|---|---|---|---|---|
| `npm test` (`server/test_runner.js`) | Full Auth Security, Rotation, Recovery & Isolation (Parts 10.2, 32.1.3–32.1.18) | 15 suites | **15/15 PASSED (0 FAILED)** | `kaushalai_test` (`kaushalai` untouched) |
| `node test_part33_1_igot_data_authenticity.js` | Phase 33.1 iGOT KPI & Local Mode Authenticity | 36 assertions | **36 PASSED, 0 FAILED** | `kaushalai_test` (`users: 15`, `certs: 0` untouched) |
| `node test_part33_learner_ux_and_navigation.js` | Phase 33 Sidebar, Routes & Profile Dates | 54 assertions | **54 PASSED, 0 FAILED** | `kaushalai_test` (`kaushalai` untouched) |
| `node test_part34_ai_tutor_persistence.js` | Phase 34 AI Tutor Conversations, Isolation & Fallbacks | 94 assertions | **94 PASSED, 0 FAILED** | `kaushalai_test` (`kaushalai` untouched) |
| `node test_part17_backend_integrity.js` | Role Resolution, SkillGap & UserCompetency Integrity | 71 assertions | **71 PASSED, 0 FAILED** | `kaushalai_test` (`kaushalai` untouched) |
| `node test_part21_2_admin_governance_hardening.js` | Admin Role Reassignment, Mutex & Deferred Sync | 48 assertions | **48 Passed, 0 Failed** | `kaushalai_test` (`kaushalai` untouched) |
| `node test_part21_admin_analytics.js` | Org Heatmap, Top Gaps & Empty-State Analytics | 38 assertions | **38 Passed, 0 Failed** | `kaushalai_test` (`kaushalai` untouched) |
| `node test_part22_learning_path_progression.js` | Sequenced Learning Path, Enrollment & Competency Rules | 63 assertions | **63 Passed, 0 Failed** | `kaushalai_test` (`kaushalai` untouched) |
| `node test_part23_competency_framework.js` | Competency Framework API & Role Mappings | 79 assertions | **79 Passed, 0 Failed** | `kaushalai_test` (`kaushalai` untouched) |
| `node test_part24_2_certificates.js` | Certificate Issuance, Verification & Reconciliation | 69 assertions | **69 Passed, 0 Failed** | `kaushalai_test` (`kaushalai` untouched) |
| `node test_part10_dashboard.js` | Dashboard Isolation Guard, Learning Hours & Queries | 41 assertions | **41 PASSED, 0 FAILED** | `kaushalai_test` (`kaushalai` untouched) |
| `node test_part14_ai_assistant.js` | Dashboard AI Banner State Machine & i18n Parity | 24 assertions | **24 Passed, 0 Failed** | `kaushalai_test` (`kaushalai` untouched) |
| `cd client && npm run build` | Client Vite Production Bundle Build | 2,746 modules | **Built in 3.48s (0 errors)** | Static build only |

### Remaining Existing Repository Tests (Inventoried, Not Re-run Here)
- **Other `kaushalai_test`-guarded suites in `server/`:** `test_part12_dashboard_fixes.js`, `test_part13_verification.js`, `test_part14_1_validation.js`, `test_part17_1_acceptance.js`, `test_part17_2_1_concurrency_audit.js`, `test_part17_2_2_cleanup_isolation.js`, `test_part17_2_3_atomic_cleanup.js`, `test_part17_2_4_historical_cleanup_safety.js`, `test_part17_2_final_consistency.js`, `test_part18_skill_gap_frontend.js`, `test_part21_2_2_cross_service_concurrency.js`, `test_part21_admin_user_management.js`, `test_part23_2_competency_framework_frontend.js`, `test_part24_1_achievements.js`, `test_part24_2_2_1_privacy_and_date_integrity.js`, `test_part24_2_2_2_completion_date_integrity.js`, `test_part24_2_2_frontend_integration.js`, `test_step2_interests.js` through `test_step6_results.js` (`test_step2` and `test_step6` confirmed using `testDbGuard`).
- **Diagnostic unit script (`server/scripts/testDiagnosticAndRecommendationPipeline.js`):** Pure in-memory unit checks on `generateDeterministicFallbackAnalysis` (not executed).
- **Automated coverage gaps (no tests currently exist for):**
  - `usercompetencies` legacy reconciliation / `.lean()` alias output checks.
  - Admin AI Configuration & SystemSettings truthfulness / `getIgotStatus` / `ApiIntegrationsPage`.
  - `QuizResultPage` DB lookup (currently `localStorage` + static mocks), `AssessmentHistoryPage` combined diagnostic + quiz history, and `CourseProgressPage` embedded `AiChatPanel`.

**Post-Audit `kaushalai` Database Verification:**
`users: 15, certificates: 0, conversations: 0, messages: 0, user_competencies: 41, usercompetencies: 25, courses: 66, assessment_attempts: 7, quizattempts: 12, systemsettings: 1` (100% unchanged).

---

## 8. Prioritized Remediation Plan with Dependencies (Proposed Phase 35.1+ Sequence)

| Priority & Suggested Phase | Scope | Concrete Changes Required | Dependencies & Risks |
|---|---|---|---|
| **P0 — Phase 35.1: Data Integrity & Reconciliation** | Workstreams A & D (Backend Data & History API) | 1. Safe dry-run + idempotent migration script merging non-conflicting `usercompetencies` (24 records) into `user_competencies` (`$setOnInsert`), preserving the `2026-09-13` diagnostic `level: 5` conflict, recomputing affected `SkillGap`s, backing up and retiring `usercompetencies`.<br>2. Fix `.populate('competencyId').lean()` -> `.populate('competency_id')` in `admin.controller.js` & `userFeatures.controller.js`.<br>3. Add `GET /api/quizzes/attempts/:attemptId` (owned by learner) returning authoritative `QuizAttempt` details, expose `attemptedAt || completedAt` fallback, and unify diagnostic `AssessmentAttempt` + `QuizAttempt` retrieval for learner history & `getMyActivityHistory` (`userFeatures.controller.js`).<br>4. Add missing MongoDB indexes (`courses`, `quizattempts`). | Must run **before** UI history fixes; requires verified DB snapshot before migration. |
| **P1 — Phase 35.2: Admin Truthfulness & Runtime Config Clarity** | Workstreams B & C (Admin Backend & UI) | 1. Fix `GET /api/admin/igot-status` to report truthful `COURSE_SOURCE_MODE` (`mock` / local catalogue) and `externalSyncConfigured: false` rather than hardcoded `'ONLINE'`.<br>2. Replace hardcoded fake `"Connected & Operational"` portal cards in `ApiIntegrationsPage.jsx` and `SystemSettingsPage.jsx` (`Integrations` & `System Status` cards, removing fake health catch fallback & fake backup toast) with truthful live status from `/api/admin/system-health` and `/api/admin/igot-status`.<br>3. Wire `AiConfigurationPage.jsx` to real `GET /api/ai/status` (displaying actual active env providers/models/AI service reachability) — or implement validated backend `SystemSetting` persistence with `auditLog` if admin runtime model tuning is desired.<br>4. Fix `POST /api/admin/cache/clear` to either clear genuine in-memory caches (e.g., reset `aiServiceClient` / cached queries) or state accurately what was cleared. | Independent of Phase 35.1; eliminates operator/auditor misinformation immediately. |
| **P1 — Phase 35.3: Assessment & Quiz Result Frontend Authenticity** | Workstream D (Frontend) | 1. Refactor `QuizResultPage.jsx` to fetch the attempt by `:id` from backend (`GET /api/quizzes/attempts/:attemptId`), removing hardcoded `SECTION_PERFORMANCE`, `TOPIC_ANALYSIS` SVG values, `INCORRECT_QUESTIONS`, `'18m 42s'` duration, and `localStorage` fallback.<br>2. Update `AssessmentHistoryPage.jsx` to display both diagnostic `AssessmentAttempt` and course `QuizAttempt` records with `completedAt || attemptedAt` fallback.<br>3. Remove `localStorage.getItem('kai_quiz_attempts')` merge and fix `createdAt` -> `completedAt || attemptedAt` in `QuizListPage.jsx`.<br>4. Standardize `RecentAssessmentsWidget.jsx` pass threshold to `70%` and remove fake `Amit Verma` mock fallbacks from `AssessmentResultsPage.jsx`. | Depends on **Phase 35.1** backend attempt-by-ID & unified history endpoints. |
| **P2 — Phase 35.4: Course Player & Content Authenticity** | Workstreams B & E (Frontend + Seed Hygiene) | 1. Wire `AiChatPanel` inside `CourseProgressPage.jsx` to Phase 34's persistent `POST /api/ai/chat` (passing course context), eliminating the fake `setTimeout` reply.<br>2. Remove misleading `IgotCoursesPage.jsx` `onError` `"Enrolled in local mode!"` toast that masks failed enrollment API calls; audit `CATALOGUE` local fallback and hardcoded `6a9c7739...` course IDs.<br>3. Clearly indicate when a course has 0 DB modules instead of showing 5 generic placeholder module titles, and remove hardcoded `4.3` rating fallback when `ratingCount === 0`. | Can execute cleanly after Phase 35.3 (or in parallel). |
| **P2 — Phase 35.5: Production Operations Hardening** | Workstream F (Infra & Runtime Safety) | 1. Require non-placeholder secrets (`ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `COOKIE_SECRET`, `INTERNAL_SERVICE_TOKEN`) to **fail fast** in `NODE_ENV=production` in `server.js`.<br>2. Add graceful `SIGTERM`/`SIGINT` server & Mongo/Redis shutdown.<br>3. Lower global `express.json` limit from `50mb` to `2mb`–`5mb` (keeping `multer` limits on upload routes).<br>4. Implement per-user AI conversation/message quotas, data retention/export/deletion endpoints, structured JSON logging with request IDs, and documented backup/restore runbook. | Should complete prior to public/agency production go-live. |
| **P3 — Phase 36+: Live Institutional Adapters** | Workstream B (External Dependencies) | Implement `igotAdapter.js` & `nsstaAdapter.js` `liveAdapter` methods, webhook verification, and Parichay SSO only after GoI/MoSPI/DoPT API specs and sandbox credentials are provisioned. | **Blocked externally** until agency endpoints & credentials exist. |

---

## 9. Items That Remain Unchanged

To preserve platform stability and prior verified guarantees, the following subsystems **MUST NOT** be altered during Phase 35 remediation:

1. **Authentication & Session Security (Parts 32.1.1–32.1.18):** FROZEN. Refresh rotation, recovery eligibility, successor ownership cleanup, cross-tab logout, Google ID-token verification, admin password isolation, and CORS origin rules remain intact.
2. **Core SkillGap & Competency Pipeline (`computeUserSkillGaps`, `applyCompetencyUpdates`, `withUserLock`):** The canonical formula, role resolution fail-closed behavior (`resolveAuthoritativeRole`), and `needs_skillgap_sync` deferred recovery remain unchanged.
3. **Phase 33 & 33.1 Learner UX & iGOT Learner Page:** Sidebar navigation (`/certificates`, `/achievements`), authentic profile dates (`Not provided`), and `IgotIntegrationLearnerPage.jsx` estimated duration labels & local-mode disclosures remain unchanged.
4. **Phase 34 AI Tutor Persistence Backend & Dedicated Chat Pages:** `Conversation` / `Message` models, `/api/ai/chat`, `/api/ai/conversations*`, `AiTutorPage.jsx`, and `AiTutorChatPage.jsx` contracts remain unchanged (`CourseProgressPage.jsx` should consume them, not alter them).
5. **KaushalAI Branding, Routing Architecture, and Existing Role Permissions.**

---

## 10. Production Blockers & Required External Evidence

Before any production rollout to MoSPI / government learners, the following **hard blockers** must be resolved with verifiable evidence:

1. **Production Environment Secrets & Fail-Fast Boot:** Proof that `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `COOKIE_SECRET`, `INTERNAL_SERVICE_TOKEN`, `MONGO_URI`, and `CLIENT_ORIGIN` are set to persistent cryptographic/managed values in deployment settings, with `ensureSecret()` failing fast in production rather than generating per-process ephemeral keys.
2. **Legacy Competency & Assessment Data Cleanup:** Execution log + post-migration verification on staging/production confirming `usercompetencies` has been safely reconciled into `user_competencies` without overwriting newer `diagnostic_test` assessments, and legacy `QuizAttempt` dates are preserved.
3. **Elimination of False Institutional/AI Status Claims:** Screenshots/API responses from staging verifying no admin or learner page claims `ONLINE` / `Connected & Operational` for unconfigured external portals (`iGOT`, `Parichay`, `NSSTA ERP`, `e-Office`, `PFMS`) or pretends `AiConfigurationPage.jsx` mutates server models when inactive.
4. **Authentic Quiz Results & Course AI Persistence:** Passing end-to-end tests proving `QuizResultPage.jsx` renders DB-backed attempt metrics without `localStorage`/static mock fallbacks, and `CourseProgressPage.jsx` AI chat persists via `/api/ai/chat`.
5. **External Agency Integration Credentials (only if Live Sync is in Scope):** Written API documentation, sandbox test responses, and issued credentials for iGOT Karmayogi (`IGOT_API_BASE_URL`, `IGOT_API_KEY`) and NSSTA TPAC (`NSSTA_API_BASE_URL`, `NSSTA_API_KEY`). Until provided, deployment documentation must explicitly state **Local Catalogue Mode** (`COURSE_SOURCE_MODE=mock`).
6. **Managed Persistence, Backups & AI Hosting:** Verified MongoDB Atlas (or managed replica set) automated snapshot schedule + restore drill evidence, persistent storage mount for `ai-service` `CHROMA_DATA_DIR`, and active production LLM API keys (`GROQ_API_KEY` / `GEMINI_API_KEY` / `GROK_API_KEY`).

