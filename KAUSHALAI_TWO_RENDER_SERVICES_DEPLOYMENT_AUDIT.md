# KaushalAI — Two Render Services Deployment Audit (Read-Only)

**Priority:** P0  
**Audit Date:** 2026-11-11  
**Mode:** Strictly Read-Only Investigation (Zero source edits, zero Render/Vercel changes, zero deploys/restarts, zero DB mutations)

---

## Executive Summary

1. **`kaushalai-backend` (`https://kaushalai-backend.onrender.com`) is NOT running this repository's backend (`Abhinikesh/KaushalAI`, `main`, `server/`).**  
   Live HTTP probing confirms Render is serving a completely different/legacy prototype (`service: "Kaushal AI API"`, `version: "1.0.0"`, `port: "5002"`, `database: "in-memory-fallback"`) where `POST /api/auth/google`, `POST /api/auth/signup`, `POST /api/auth/refresh`, `/api/courses`, `/api/competencies`, `/api/roles`, `/api/ai/status`, and `/api/assessments/history` all return `404 Route not found`. Those fingerprint strings (`"Kaushal AI API"`, `"5002"`, `"in-memory-fallback"`) do not exist anywhere in `Abhinikesh/KaushalAI`'s current code or full Git history.
2. **`AI Kaushal` (`ai-service/`) has no public URL recorded anywhere in this repository or Git history.**  
   Only split-deployment documentation templates reference placeholder URLs (`https://kaushalai-ai.onrender.com`, `https://kaushalai-api.onrender.com`). Live HTTP probes to `https://kaushalai-ai.onrender.com`, `https://ai-kaushal.onrender.com`, and `https://kaushalai-api.onrender.com` all returned Render's `HTTP 404` (`x-render-routing: no-server`). `AI Kaushal`'s actual live URL, health response, and deployed commit must be read directly from the Render Dashboard.
3. **`AI Kaushal` failure does NOT block backend startup or authentication.**  
   Node (`server/`) handles all authentication, user profiles, courses, quizzes, persistent AI Tutor chat, certificates, and admin analytics directly against MongoDB (and LLM HTTP APIs). `AI Kaushal` (`ai-service/`) is called server-to-server exclusively for gap-analysis/recommendation scoring (both of which have local deterministic fallbacks in Node) and document-based MCQ upload generation (`POST /api/materials/upload`).

---

## 1. Architecture Diagram

```text
+-------------------------------------------------------------------------+
|  Browser Users                                                          |
|  https://kaushal-ai-azure.vercel.app  (React 18 + Vite SPA on Vercel)   |
|  - Calls ONLY VITE_API_BASE_URL (/api) -> Node Backend                  |
|  - NEVER calls AI Kaushal directly in production                        |
|  - Google Identity Services -> obtains Google ID token for /auth/google |
+------------------------------------+------------------------------------+
                                     |
                                     | HTTPS + CORS (credentials: true)
                                     | Origin: https://kaushal-ai-azure.vercel.app
                                     v
+-------------------------------------------------------------------------+
|  Render Service 1: kaushalai-backend                                    |
|  URL: https://kaushalai-backend.onrender.com                            |
|  Intended Repo/Root: Abhinikesh/KaushalAI (main) -> server/ (Node 22)   |
|                                                                         |
|  - Auth & RBAC: Google OAuth (/auth/google), Admin login (/auth/admin-  |
|    login), Legacy/User password login (/auth/login), Refresh Token      |
|    rotation + family isolation (/auth/refresh, /logout, /logout-all)    |
|  - Core Domain: Profiles, Onboarding, Roles/Competencies, Courses,      |
|    Enrollments, Learning Paths, Diagnostic & Topic Quizzes, History,    |
|    Certificates (+ public verify), Achievements, Notifications, Admin   |
|  - AI Tutor: /api/ai/chat, /api/ai/conversations -> calls external      |
|    Groq / xAI Grok / Google Gemini / OpenAI APIs directly from Node     |
|  - Live Topic MCQ: /api/mcq/generate-live -> runs directly in Node      |
+-----------------+-----------------------------------+-------------------+
                  |                                   |
                  | Mongoose (Required)               | Server-to-Server HTTPS
                  | MONGO_URI                         | AI_SERVICE_URL +
                  v                                   | X-Internal-Token
+----------------------------------+   +--------------+-------------------+
|  MongoDB (Atlas / Mongo 7)       |   | Render Service 2: AI Kaushal     |
|  - Users, RefreshTokens          |   | URL: <Verify in Render Dashboard>|
|  - Courses, Enrollments          |   | Intended Repo/Root:              |
|  - Competencies, RoleCompetency  |   | Abhinikesh/KaushalAI ->          |
|  - SkillGap, LearningPath        |   | ai-service/ (Python 3.12 FastAPI)|
|  - Conversations, Messages       |   |                                  |
|  - Quizzes, Attempts, Certs      |   | - POST /gap-analysis (stateless) |
|  (LIVE MISMATCH: Render backend  |   | - POST /recommendations          |
|   currently uses in-memory-      |   | - POST /recommendations/generate |
|   fallback!)                     |   |   (Anthropic Claude)             |
+----------------------------------+   | - POST /internal/mcq/generate    |
                                       |   (ChromaDB + sentence-          |
                                       |    transformers + Anthropic)     |
                                       | - GET /health                    |
                                       | * No MongoDB/Redis code used *   |
                                       +----------------------------------+
```

*(Note: Nginx / `docker-compose.prod.yml` reverses `/api` -> `server:5000` for single-VM Docker deployments, but production currently uses Vercel + split Render web services.)*

---

## 2. Both Render Service Identities & URLs

| Field | Service 1: `kaushalai-backend` | Service 2: `AI Kaushal` |
|---|---|---|
| **Render Service Name** | `kaushalai-backend` | `AI Kaushal` |
| **Public URL** | `https://kaushalai-backend.onrender.com` | **Unrecorded in repo / git history.** Placeholder doc URLs only (`https://kaushalai-ai.onrender.com`). Must be verified in Render Dashboard. |
| **Runtime** | Node.js (`22-alpine` in `server/Dockerfile`, Node `22` in CI) | Python (`3.12-slim` in `ai-service/Dockerfile`, Python `3.12` in CI) |
| **Application Entry Point** | `server/server.js` -> `server/src/app.js` | `ai-service/app/main.py` (`app = FastAPI(...)`) |
| **Health Endpoint** | Intended: `GET /api/health` (`service: "kaushalai-server"`) and `GET /` (`service: "kaushalai-backend"`) | `GET /health` (`{"status":"ok","service":"kaushalai-ai-service"}`) |
| **Live Probe Result (2026-11-11)** | Awake `GET /api/health` & `/health` -> `HTTP 200` `{"status":"ok","service":"Kaushal AI API","version":"1.0.0","port":"5002","database":"in-memory-fallback"}` ; `GET /` -> `HTTP 404` | Probed doc/candidate hostnames (`kaushalai-ai.onrender.com`, `ai-kaushal.onrender.com`, `kaushalai-api.onrender.com`) -> all `HTTP 404` (`x-render-routing: no-server`) |
| **Current Deployed Version** | **Different / Legacy prototype** (`port: 5002`, `in-memory-fallback`; no Part 32.1–35.1 routes) | **Cannot be verified from local repo** until exact Render URL is read from Render Dashboard |

---

## 3. Actual Responsibilities of Each Service (Source-Verified)

### `kaushalai-backend` (`server/`)
Verified via `server/src/app.js` and `server/src/routes/`:
- **Google Signup / Signin:** `POST /api/auth/google` (`auth.routes.js`, `auth.controller.js` using `google-auth-library` `OAuth2Client.verifyIdToken`).
- **Admin Username/Password Authentication:** `POST /api/auth/admin-login` and `POST /api/auth/login` (`auth.routes.js`, `auth.controller.js`).
- **Refresh Tokens & Session Rotation:** `POST /api/auth/refresh`, `/logout`, `/logout-all`, `RefreshToken` family isolation, reuse detection, and HTTP-only refresh cookie issuance (`auth.controller.js`).
- **Learner Profiles & Onboarding:** `GET/PUT /api/auth/me`, `/api/onboarding/*`, `/api/users/me/preferences`.
- **Courses & Learning Progress:** `/api/courses`, `/api/users/me/enrollments`, `/api/users/me/enrollments/:id/progress`, `/api/learning-path`, `/api/users/me/learning-path`, iGOT & NSSTA mock/adapter catalogues.
- **Competency Framework & Assessments / Quiz History:** `/api/competencies`, `/api/competency-framework`, `/api/roles`, `/api/job-roles`, `/api/assessments/diagnostic/*`, `/api/quizzes/*`, `/api/users/me/assessment-history`, `/api/users/me/quiz-attempts`.
- **Certificates, Achievements & Notifications:** `/api/users/me/certificates`, `/api/certificates/verify/:certificateId`, `/api/achievements/my`, `/api/users/me/notifications`.
- **AI Tutor & Persistent Conversations:** `/api/ai/chat`, `/api/ai/conversations*`, `/api/ai/messages/:id`, `/api/ai/history`, `/api/ai/status` (`aiChat.routes.js` + `aiChat.service.js` + Mongoose `Conversation`/`Message` models). **Calls Groq / Grok / Gemini / OpenAI directly from Node — does NOT call `AI Kaushal`.**
- **Statistical & Domain Admin Analytics:** `/api/admin/summary`, `/heatmap`, `/top-gaps`, `/skill-trend/:competencyId`, `/training-effectiveness`, `/system-health`, `/audit-logs`, `/users/*`, `/roster/*`.
- **Live Topic MCQ Generator:** `POST /api/mcq/generate-live` (`mcq.controller.js` -> `aiMcqGenerator.service.js`, executes inside Node).

### `AI Kaushal` (`ai-service/`)
Verified via `ai-service/app/main.py`, `ai-service/app/routers/`, and `server/src/services/aiServiceClient.js`:
- **Stateless Deterministic Gap Scoring:** `POST /gap-analysis` (`routers/gap_analysis.py` -> `skill_gap_engine.py`), called by `learningPath.service.js` (`getGapAnalysis`). Node falls back to local JS gap computation if unavailable.
- **Semantic / Embedding Course Ranking:** `POST /recommendations` (`routers/recommendations.py` -> `recommender.py` using `sentence-transformers` + `scikit-learn` cosine similarity), called by `learningPath.service.js` (`getRecommendations`). Node falls back to local scoring if unavailable.
- **Claude-Grounded SkillGap Course Recommendation Ranking:** `POST /recommendations/generate` (`routers/recommendations.py` -> `llm_client.generate_course_recommendations` using Anthropic Claude), called by `skillGap.service.js` (`generateCourseRecommendations`). Node falls back to `buildLocalDeterministicRecommendations` if unavailable.
- **Document Upload RAG MCQ Generation:** `POST /internal/mcq/generate` (`routers/mcq.py` -> `mcq_generator.py` using PyMuPDF/python-docx/python-pptx, `chunker.py`, `embedding_service.py`, `vector_store.py` ChromaDB, and Anthropic Claude), guarded by `X-Internal-Token` middleware and called by `mcq.controller.js` (`uploadMaterial` for `POST /api/materials/upload`).
- **Health Check:** `GET /health` -> `{"status":"ok","service":"kaushalai-ai-service"}`, polled by `GET /api/admin/system-health`.

### Frontend (`client/`) -> Services
Verified across `client/vite.config.js` and all 16 files in `client/src/api/`:
- `client/src/` uses `apiClient` (`VITE_API_BASE_URL`) exclusively to talk to `kaushalai-backend`.
- Although `client/.env` / `.env.example` defines `VITE_AI_SERVICE_URL=http://localhost:8000` and `client/vite.config.js` proxies `/ai` during local Vite dev, **no client runtime API call targets `AI Kaushal` directly.**

---

## 4. Repository & Branch Mapping

- **Local Git Remote (`origin`):** `https://github.com/Abhinikesh/KaushalAI.git`
- **Canonical Branch:** `main` (`HEAD` at `347491b`, plus local verified P0 fix in `client/src/api/client.js` from Phase 32.1.19 and Phase 35.1 changes awaiting review).
- **Critical Finding on `kaushalai-backend`:** Neither `"Kaushal AI API"`, `"5002"`, nor `"in-memory-fallback"` has ever appeared in any commit in `Abhinikesh/KaushalAI`. Either Render's `kaushalai-backend` service is pointed at a different/older repository, a stale snapshot never pushed/re-synced, or an incorrect root directory/service configuration. Both Render services (`kaushalai-backend` and `AI Kaushal`) must be explicitly verified in Render Settings to confirm:
  - Repository: `Abhinikesh/KaushalAI`
  - Branch: `main`

---

## 5. Root Directory, Build & Start Commands

There is no `render.yaml` Blueprint in the repository; Render settings must be configured manually per service:

| Setting | `kaushalai-backend` (Node/Express) | `AI Kaushal` (Python/FastAPI) |
|---|---|---|
| **Root Directory** | `server` | `ai-service` |
| **Environment / Runtime** | `Node` (Node 22; `server/Dockerfile` uses `node:22-alpine`) or `Docker` (`server/Dockerfile`) | `Python 3` (Python 3.12; `ai-service/Dockerfile` uses `python:3.12-slim`) or `Docker` (`ai-service/Dockerfile`) |
| **Build Command** (Native runtime) | `npm ci` (or `npm ci --omit=dev`) | `pip install -r requirements.txt` |
| **Start Command** (Native runtime) | `npm start` (`node server.js`) | `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1` |
| **Dockerfile CMD** (Docker runtime) | `CMD ["node", "server.js"]` | `CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]` |
| **Health Check Path** | `/api/health` (or `/`) | `/health` |

*Capacity caveat from `scripts/deploy-checklist.md` & `ai-service/requirements.txt`:* `sentence-transformers` + `torch` + `chromadb` pulls large Python wheels (~1.5–3 GB image) and requires substantial RAM (~2 GB recommended). Native Render free-tier (512 MB RAM) builds or runs of `ai-service` may hit memory limits unless upgraded or slimmed (`requirements.txt` comment L8–15).

---

## 6. Current vs. Expected Deployed Versions

### `kaushalai-backend` (`https://kaushalai-backend.onrender.com`)
| Check | Live Deployed Response (Observed) | Expected Repo Behaviour (`server/`) | Match? |
|---|---|---|---|
| `GET /` | `404 {"error":"Route not found: GET /"}` | `200 {"status":"ok","service":"kaushalai-backend",...}` | **Mismatch** |
| `GET /health` | `200 {"status":"ok","service":"Kaushal AI API","version":"1.0.0","port":"5002","database":"in-memory-fallback"}` | Not mounted at `/health` (health is `/api/health` and `/`) | **Mismatch** |
| `GET /api/health` | `200 {"status":"ok","service":"Kaushal AI API","version":"1.0.0","port":"5002","database":"in-memory-fallback"}` | `200 {"status":"ok","service":"kaushalai-server",...}` | **Mismatch** |
| `OPTIONS /api/auth/*` (`Origin: https://kaushal-ai-azure.vercel.app`) | `204` with `Access-Control-Allow-Origin: https://kaushal-ai-azure.vercel.app` | `204` with `Access-Control-Allow-Origin: https://kaushal-ai-azure.vercel.app` | Match |
| `POST /api/auth/google` | `404 {"error":"Route not found: POST /api/auth/google"}` | `400` on missing `idToken` / `200` on valid Google token | **Missing** |
| `POST /api/auth/signup` | `404 {"error":"Route not found: POST /api/auth/signup"}` | `400`/`201` (validated public signup / disabled password route per Part 32.1) | **Missing** |
| `POST /api/auth/refresh` | `404 {"error":"Route not found: POST /api/auth/refresh"}` | `401` on missing cookie / `200` on valid rotation | **Missing** |
| `POST /api/auth/login` | `400 {"error":"Please enter both email and password."}` | `400` validation error (`{ message: ... }` format) | **Legacy Schema** |
| `POST /api/auth/register` | `400` | Route does not exist in `server/src/routes/auth.routes.js` | **Legacy Route** |
| `GET /api/auth/me` | `401 {"error":"Authentication token required. Please log in."}` | `401 {"message":"Authentication required"}` (`auth.middleware.js`) | **Legacy Schema** |
| `GET /api/courses`, `/competencies`, `/roles`, `/job-roles`, `/ai/status`, `/assessments/history` | All `404 Route not found` | Protected (`401` unauthenticated) | **Missing** |

### `AI Kaushal`
- **Live URL unknown** (`kaushalai-ai.onrender.com`, `ai-kaushal.onrender.com`, and `kaushalai-api.onrender.com` returned `x-render-routing: no-server`).
- Expected response once URL is verified: `GET <AI_KAUSHAL_URL>/health` -> `200 {"status":"ok","service":"kaushalai-ai-service"}`.

---

## 7. MongoDB & AI Service Dependencies + Required Environment Variables

### MongoDB & `in-memory-fallback` Analysis
- In `server/src/config/db.js`, `connectDB()` strictly requires `MONGO_URI` or `MONGODB_URI` and throws immediately if missing — **this repo has NO `in-memory-fallback` mode.**
- Running production auth on an in-memory store (`database: "in-memory-fallback"` currently reported on Render) breaks persistence across restarts/cold-starts (data wiped on every Render sleep/deploy) and breaks all Mongoose schemas/indexes (`users.googleSub`, `refreshtokens`, `conversations`, `messages`, `assessments`, `certificates`).
- `server/` also executes `autoSeed()` on startup (`server/server.js` L36) after `connectDB()`.
- **Redis (`REDIS_URL`):** Declared in `.env.production.example` and `ioredis` is in `server/package.json`, **but `ioredis` / `REDIS_URL` is not used anywhere in `server/src/` or `ai-service/app/`.** MongoDB is the sole active database required by `server/`.

### `AI Kaushal` Dependencies & Resilience
- **Does `AI Kaushal` use MongoDB or Redis?** No. `ai-service/app/config.py` defines `mongo_uri` and `redis_url` settings fields, but zero files in `ai-service/app/` import or connect to MongoDB or Redis.
- **What `AI Kaushal` uses at runtime:** Local SQLite-backed **ChromaDB** (`CHROMA_DATA_DIR=./chroma_data`, ephemeral on Render unless disk-mounted), **sentence-transformers** (with memory-safe fallback), and **Anthropic** (`ANTHROPIC_API_KEY`) for `/recommendations/generate` and `/internal/mcq/generate`.
- **Does `AI Kaushal` failure affect `kaushalai-backend` startup or auth?** **No.**
  - `server/server.js` never connects to `AI_SERVICE_URL` at startup.
  - `auth.routes.js` / `auth.controller.js` never invoke `aiServiceClient.js`.
  - If `AI Kaushal` is down or `AI_SERVICE_URL` is unset (defaults to `http://localhost:8000`):
    - Auth, profiles, courses, quizzes, certificates, achievements, and AI Tutor chat (`/api/ai/chat`) continue operating normally.
    - `learningPath.service.js` and `skillGap.service.js` automatically catch `aiServiceClient` errors and run local deterministic JS scoring/recommendation fallbacks.
    - `GET /api/admin/system-health` marks `aiVectorService: "DOWN"` and overall `status: "DEGRADED"`.
    - `POST /api/materials/upload` (`mcq.controller.js` -> `generateMCQs`) returns `503 AI service unavailable`. (Note separately: `aiServiceClient.js` L76 `generateMCQs` currently omits `return data`, which should be checked before relying on `POST /api/materials/upload`.)

### Required Environment Variable Names (No Secret Values Printed)

1. **`kaushalai-backend` (Render):**
   - Core/DB: `NODE_ENV=production`, `MONGO_URI` (MongoDB Atlas URI), `TRUST_PROXY=1`, `PORT` (provided by Render; defaults to `5000`)
   - CORS & URLs: `CLIENT_ORIGIN=https://kaushal-ai-azure.vercel.app`, `AI_SERVICE_URL=<exact AI Kaushal https://...onrender.com URL>`
   - Auth/Security: `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `COOKIE_SECRET` (each >= 32 chars, unique — critical so restarts don't trigger `server.js` ephemeral key regeneration and invalidate sessions), `GOOGLE_CLIENT_ID` (must match Vercel `VITE_GOOGLE_CLIENT_ID` exactly), `INTERNAL_SERVICE_TOKEN` (must match `AI Kaushal`), optional `ALLOWED_EMAIL_DOMAINS`
   - AI Tutor LLM keys (for `/api/ai/chat` & `/api/mcq/generate-live` in Node): at least one of `GROQ_API_KEY`, `GROK_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY`
   - Adapters: `COURSE_SOURCE_MODE=mock`

2. **`AI Kaushal` (Render):**
   - `APP_NAME=KaushalAI AI Service`, `DEBUG=false`
   - `ANTHROPIC_API_KEY`
   - `INTERNAL_SERVICE_TOKEN` (must match `kaushalai-backend`)
   - `NODE_SERVER_ORIGIN=https://kaushalai-backend.onrender.com`
   - `CHROMA_DATA_DIR=./chroma_data` (or persistent mount path)

3. **Vercel Frontend (`https://kaushal-ai-azure.vercel.app`):**
   - `VITE_API_BASE_URL=https://kaushalai-backend.onrender.com/api`
   - `VITE_GOOGLE_CLIENT_ID` (exact match with Render `GOOGLE_CLIENT_ID`)

---

## 8. Missing Routes & Configuration Mismatches Summary

| Area | Current State | Impact |
|---|---|---|
| **Vercel compiled JS (`index-Dj_dGGkU.js`)** | Un-inlined `import.meta?.env?.VITE_API_BASE_URL ?? "http://localhost:5000/api"` (fixed locally in Phase 32.1.19, not yet pushed/deployed) | Browsers hit `http://localhost:5000/api` -> immediate `Network Error` on `/signup` & `/login`. |
| **Render `kaushalai-backend` codebase** | Running unrelated `"Kaushal AI API"` v1.0.0 on port `5002` with `in-memory-fallback` | Even once Vercel sends requests to `kaushalai-backend.onrender.com/api`, `/auth/google`, `/auth/signup`, `/auth/refresh`, `/courses`, `/competencies`, `/ai/chat`, etc. all `404`, and no MongoDB persistence exists. |
| **`AI Kaushal` URL & `AI_SERVICE_URL`** | No live URL in repository; `kaushalai-backend` needs `AI_SERVICE_URL` set to the real `AI Kaushal` Render URL | Without it, `server/` defaults to `http://localhost:8000` (`aiVectorService: DOWN`). |
| **Root Directory risk** | Repo root `package.json` only defines `concurrently` dev scripts (`dev:server`, `dev:ai`, `dev:client`), NOT production start | If Render Root Directory is left blank (`.`), `npm start` fails or runs the wrong app. Must be `server` and `ai-service` respectively. |

---

## 9. Recommended Safe Deployment Sequence (For Review Only)

1. **Inspect Render Dashboard (Read-Only Check First):**
   - Open `AI Kaushal` on Render: note its exact `https://*.onrender.com` URL, verify Repo = `Abhinikesh/KaushalAI`, Branch = `main`, Root Directory = `ai-service`, Runtime = Python 3.12 / Docker, Start Command = `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1`.
   - Open `kaushalai-backend` on Render: check why it is currently serving `"Kaushal AI API"` on port `5002` (verify connected Git repo, branch, and Root Directory before changing anything).
2. **Prepare MongoDB & Run Schema Index Migration Safely:**
   - Ensure MongoDB Atlas URI (`MONGO_URI`) is provisioned with network access allowed from Render.
   - Run `server/scripts/migrate_google_sub_index.js` against the target MongoDB before exposing Part 32.1 Google auth.
3. **Sync & Deploy `AI Kaushal` First (Independent Service):**
   - Set `DEBUG=false`, `ANTHROPIC_API_KEY`, `INTERNAL_SERVICE_TOKEN`, `NODE_SERVER_ORIGIN=https://kaushalai-backend.onrender.com`, `CHROMA_DATA_DIR=./chroma_data`.
   - Verify `GET <AI_KAUSHAL_URL>/health` returns `{"status":"ok","service":"kaushalai-ai-service"}`.
4. **Configure Env Vars & Deploy `kaushalai-backend` (`Abhinikesh/KaushalAI`, `main`, Root Directory `server`):**
   - Set all required env vars (`NODE_ENV=production`, `MONGO_URI`, `TRUST_PROXY=1`, `CLIENT_ORIGIN=https://kaushal-ai-azure.vercel.app`, `GOOGLE_CLIENT_ID`, distinct 32+ char `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET` / `COOKIE_SECRET`, `INTERNAL_SERVICE_TOKEN`, `AI_SERVICE_URL=<AI_KAUSHAL_URL>`, LLM keys).
   - Verify `GET https://kaushalai-backend.onrender.com/api/health` returns `service: "kaushalai-server"` (not `"in-memory-fallback"`), `POST /api/auth/google` returns `400` on missing token (not `404`), and `OPTIONS` preflight passes for `https://kaushal-ai-azure.vercel.app`.
5. **Commit/Deploy Phase 32.1.19 Client Fix to Vercel (`kaushal-ai-azure`):**
   - Confirm Vercel env vars `VITE_API_BASE_URL=https://kaushalai-backend.onrender.com/api` and matching `VITE_GOOGLE_CLIENT_ID`.
   - Deploy updated `client/` (with `client/src/api/client.js` line 28 fix) and inspect built asset to verify `https://kaushalai-backend.onrender.com/api` is inlined.
   - Smoke-test Google `/signup`, Google/Password `/login`, `/api/auth/refresh`, `/api/admin/system-health`, and `/api/ai/chat` end-to-end.

---

## 10. Remaining Blockers

1. **Unknown live URL / Render config for `AI Kaushal`:** Cannot be retrieved locally because no Render URL or `render.yaml` exists in the repository; requires Render Dashboard inspection.
2. **Identity of the prototype currently on `kaushalai-backend.onrender.com`:** Why Render is running `"Kaushal AI API"` (`port: 5002`, `in-memory-fallback`) cannot be confirmed without checking Render's repo/branch/root-dir configuration in the dashboard.
3. **Production MongoDB (`MONGO_URI`) & Google Cloud OAuth Client consistency:** Production Atlas credentials and Google OAuth Authorized Origins (`https://kaushal-ai-azure.vercel.app`) cannot be inspected from the local workspace.
4. **`ai-service` memory footprint on Render:** `sentence-transformers` + `torch` + `chromadb` may exceed 512 MB free-tier Render instance memory during build or runtime (verify Render plan before deploying `AI Kaushal`).
5. **Git Working Tree State:** Phase 32.1.19 (`client/src/api/client.js`) and prior Phase 35.1 edits are currently uncommitted locally and not pushed to `origin/main` yet.

---

*Audit completed strictly read-only. Stopping here for your review before any configuration changes or deployments.*

