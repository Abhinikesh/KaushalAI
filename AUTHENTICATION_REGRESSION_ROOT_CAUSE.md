# KaushalAI — Authentication Regression Root Cause Investigation

**Priority:** P0  
**Target Production Frontend:** `https://kaushal-ai-azure.vercel.app` (`/signup` and `/login`)  
**Target Production Backend:** `https://kaushalai-backend.onrender.com`  
**Audit Mode:** Strictly Read-Only Investigation (No source, commit, env, or database modifications performed)

---

## Executive Summary

Signup (`/signup`) and Signin (`/login`) fail in production with **`Network Error`** (or unreachable `http://localhost:5000` connection refusal) because of a **verified code regression introduced in commit `91a9d67`** (`Final Authentication Hardening Closure Report`, `Wed Nov 11 15:58:56 2026 +0530`), compounded by a **backend deployment version mismatch on Render**.

1. **Primary Frontend Regression (`client/src/api/client.js`, line 28, commit `91a9d67`):**  
   To let Node.js test scripts (`server/test_part32_1_14`–`17`) import `client/src/api/client.js` without throwing `TypeError` when `import.meta.env` is `undefined`, commit `91a9d67` changed:
   ```diff
   - baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
   + baseURL: import.meta?.env?.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
   ```
   Optional chaining (`import.meta?.env?.VITE_API_BASE_URL`) breaks Vite's static AST `import.meta.env.*` build-time replacement. Both a real local Vite production build test and the currently deployed Vercel bundle (`/assets/index-Dj_dGGkU.js`) confirm that `baseURL` compiles un-inlined and unconditionally falls back at runtime to **`"http://localhost:5000/api"`** in every user's browser.
2. **Backend & Deployment Drift (`https://kaushalai-backend.onrender.com` & Vercel):**  
   Even after fixing `client/src/api/client.js`, live HTTP probing of `https://kaushalai-backend.onrender.com` proves Render is currently serving an older/different API build (`service: "Kaushal AI API"`, `port: "5002"`, `database: "in-memory-fallback"`) where `POST /api/auth/google`, `POST /api/auth/signup`, and `POST /api/auth/refresh` all return **`HTTP 404 Route not found`**, while `CORS` preflight (`OPTIONS`) succeeds (`HTTP 204`) for `https://kaushal-ai-azure.vercel.app`. Meanwhile, Vercel `vercel.json` rewrites `/(.*)` to `/index.html`, so `VITE_API_BASE_URL` on Vercel must explicitly point to the Render backend URL (`https://kaushalai-backend.onrender.com/api`).

---

## 1. Last-Known-Working Version & Git Timeline

| Commit | Date (IST) | Description | `client/src/api/client.js` L28 | Auth / Deployment Impact |
|---|---|---|---|---|
| `6710350` .. `1c63d00` | Through `2026-11-11 00:55` | Pre-Part 32.1 baseline (`1c63d00`) | `import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api'` | Vite statically replaced `VITE_API_BASE_URL`; password `/signup`, `/login`, `/refresh` worked against compatible backend. |
| `306b353` | `2026-11-11 10:34:11` | `Public Signup Simplification & Legacy Google Onboarding Audit Report` | Still `import.meta.env.VITE_API_BASE_URL` (Working in Vite) | Switched `SignupPage.jsx` to Google-only public signup (`POST /api/auth/google`); hardened `LoginPage.jsx` & `auth.controller.js`; removed `AdminLoginPage.jsx` & `CompleteGoogleSignupPage.jsx`. |
| `9b08277` | `2026-11-11 12:38:48` | `Refresh Token Family Isolation & Grace-Window Security Report` | Still `import.meta.env.VITE_API_BASE_URL` (Working in Vite) | **Last known working `client.js` & `app.js` revision.** Added strict prod CORS allowlist (`https://kaushal-ai-azure.vercel.app`), `NODE_ENV !== 'production'` gate on `/bypass`/`/sso`/`/google/complete`, `TRUST_PROXY`, refresh rate limits. |
| **`91a9d67`** | **`2026-11-11 15:58:56`** | **`Final Authentication Hardening Closure Report`** | **Changed to `import.meta?.env?.VITE_API_BASE_URL`** | **EXACT BREAKING COMMIT.** Added optional chaining in `client.js` L28 so Node auth tests could import `handleAuthChannelMessage`, silently disabling Vite build-time env inlining. |
| `2e2db89` .. `347491b` (HEAD) | `2026-11-11 16:50` – `21:45` | Product audit, Phase 33, Phase 34 | Unchanged (`import.meta?.env?.VITE_API_BASE_URL`) | Rebuilt/deployed Vercel frontend (`index-Dj_dGGkU.js`) still carries the `91a9d67` regression. |

### Why Commit `91a9d67` Made That Change
Auth test suites added during Parts 32.1.14–32.1.17 import `client/src/api/client.js` directly inside Node.js to unit-test `handleAuthChannelMessage`:
- `server/test_part32_1_14_rotation_crash_proxy_crosstab.js` line 470 (`await import('../client/src/api/client.js')`)
- `server/test_part32_1_15_slow_worker_recovery_integrity.js` line 457
- `server/test_part32_1_16_recovery_eligibility_grace_threat_model.js` lines 220, 308
- `server/test_part32_1_17_recovery_cleanup_and_worker_races.js` line 18 (`require('../client/src/api/client')`)

In Node.js ESM evaluation, `import.meta` exists (`typeof import.meta !== 'undefined'`), but `import.meta.env` is `undefined`. Plain `import.meta.env.VITE_API_BASE_URL` threw `TypeError: Cannot read properties of undefined (reading 'VITE_API_BASE_URL')`, so `91a9d67` wrapped it in optional chaining `import.meta?.env?.VITE_API_BASE_URL`.

---

## 2. Live Bundle & Vite Build Verification (Root Cause Proof)

### 2.1 Live Vercel Production Bundle Evidence
Probed `https://kaushal-ai-azure.vercel.app` directly:
- `GET https://kaushal-ai-azure.vercel.app/signup` -> `HTTP 200` (serves SPA shell referencing `/assets/index-Dj_dGGkU.js`)
- `GET https://kaushal-ai-azure.vercel.app/login` -> `HTTP 200` (serves SPA shell referencing `/assets/index-Dj_dGGkU.js`)
- `GET https://kaushal-ai-azure.vercel.app/api/health` -> `HTTP 200` `content-type: text/html; charset=utf-8` (`index.html`, due to root `vercel.json` catch-all rewrite `/(.*) -> /index.html`).

Extracted directly from `https://kaushal-ai-azure.vercel.app/assets/index-Dj_dGGkU.js`:
```javascript
((AP=(NP=import.meta)==null?void 0:NP.env)==null?void 0:AP.VITE_API_BASE_URL)??"http://localhost:5000/api",timeout:3e4,withCredentials:!0
```
In that exact same live bundle, `SignupPage.jsx` line 16 and `LoginPage.jsx` line 23 (`import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''`, **without** optional chaining) **were** statically inlined by Vite as `"53216323962-2l6pkp3uk97m609jrfr1qc1s4e6b2fie.apps.googleusercontent.com"`.

### 2.2 Local Vite Production Build Reproduction
Running Vite 5/6's actual `build()` API in `/tmp` with `process.env.VITE_API_BASE_URL = 'https://kaushalai-backend.onrender.com/api'` proved deterministically:

1. **Current code (`import.meta?.env?.VITE_API_BASE_URL ?? 'http://localhost:5000/api'`):**
   ```javascript
   var _a, _b;
   const base = ((_b = (_a = import.meta) == null ? void 0 : _a.env) == null ? void 0 : _b.VITE_API_BASE_URL) ?? "http://localhost:5000/api";
   ```
   **Result:** Vite ignores `VITE_API_BASE_URL` completely and emits a runtime fallback to `"http://localhost:5000/api"` (verified also in local `client/dist/assets/*.js`, even though `client/.env` defines `VITE_API_BASE_URL=http://localhost:5000/api`).

2. **Pre-`91a9d67` expression (`import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api'`):**
   ```javascript
   const base = "https://kaushalai-backend.onrender.com/api";
   ```
   **Result:** Vite statically replaces the env expression with the configured backend URL.

3. **Node-safe + Vite-safe expression (`(import.meta.env ? import.meta.env.VITE_API_BASE_URL : undefined) ?? 'http://localhost:5000/api'`):**
   ```javascript
   const __vite_import_meta_env__ = {};
   const base = (typeof import.meta !== "undefined" && __vite_import_meta_env__ ? "https://kaushalai-backend.onrender.com/api" : void 0) ?? "http://localhost:5000/api";
   ```
   **Result:** Evaluates to `"https://kaushalai-backend.onrender.com/api"` in Vite production builds AND evaluates cleanly without throwing in Node.js 22 (`'http://localhost:5000/api'`).

---

## 3. Failure Stage & Flow Comparison (`/signup` vs `/login`)

*(Note on local browser tooling: `chrome_devtools` MCP could not attach locally because Chrome remote debugging was not active / `DevToolsActivePort` missing. Request flow is established deterministically from the live compiled Vercel bundle `index-Dj_dGGkU.js`, source React components, and live Render HTTP/CORS responses.)*

1. **Page Initialization (`App.jsx` -> `authStore.js` `hydrate()`):**
   - Dispatches `POST http://localhost:5000/api/auth/refresh` (`apiClient.post('/auth/refresh')`).
   - Browser rejects `localhost:5000` locally (`ERR_CONNECTION_REFUSED` / HTTPS->HTTP Mixed Content / Private Network Access block). `hydrate()` catches and ignores the error silently (`authStore.js` L244–246).

2. **Public Signup (`/signup` -> Google Sign-Up):**
   - `SignupPage.jsx` L112 (`handleGoogleSuccess`) invokes `googleAuth(idToken)` -> `apiClient.post('/auth/google', { idToken })`.
   - **Exact Request URL & Method:** `POST http://localhost:5000/api/auth/google`.
   - **Reaches Backend?** **No.** Never leaves the user's machine for Render; browser cross-origin preflight/POST to `http://localhost:5000` fails at the network layer (`ERR_NETWORK` / `AxiosError { message: "Network Error", response: undefined }`).
   - **UI Output:** `SignupPage.jsx` L119 (`setError(err.response?.data?.message || err.message || ...)`) displays **`Network Error`**.

3. **Signin (`/login` -> Google Sign-In & Password Login):**
   - **Google Sign-In (`LoginPage.jsx` L257 `handleGoogleSuccess`):** Calls `POST http://localhost:5000/api/auth/google`. Fails identically at the browser network layer (`ERR_NETWORK`, `response: undefined`) -> `LoginPage.jsx` L264 displays **`Network Error`**.
   - **Password Sign-In (`LoginPage.jsx` L175 `handlePasswordSubmit`):** Calls `POST http://localhost:5000/api/auth/login`. Also fails at the exact same network layer (`http://localhost:5000/api`, never reaches Render), though L178–181 displays `'Invalid credentials. Please verify your email / employee ID and password.'` whenever `err.response` is absent.
   - **OTP / SSO modes on `LoginPage.jsx` (L218, L238):** Call `/auth/sso`, which fails at `http://localhost:5000/api/auth/sso` AND is intentionally disabled in production (`NODE_ENV !== 'production'` gate in `server/src/routes/auth.routes.js` L38–42).

**Conclusion:** Signup and Signin both fail at the **exact same stage** — client `axios` instance `baseURL` resolution (`http://localhost:5000/api`), before any request or `OPTIONS` preflight ever reaches the deployed backend.

---

## 4. Live Render Backend & CORS Verification (Secondary Deployment Mismatch)

Direct probing of `https://kaushalai-backend.onrender.com` with `Origin: https://kaushal-ai-azure.vercel.app` showed:

| Probe Request | Observed HTTP Status | Observed Response / Headers | Assessment |
|---|---|---|---|
| `GET /api/health` | `HTTP 200` | `{"status":"ok","service":"Kaushal AI API","version":"1.0.0","port":"5002","database":"in-memory-fallback",...}` | **Mismatch vs repo `health.routes.js`** (`service: 'kaushalai-server'`) — Render is running an outdated/different prototype build in memory! |
| `OPTIONS /api/auth/login` | `HTTP 204` | `access-control-allow-origin: https://kaushal-ai-azure.vercel.app`, `access-control-allow-credentials: true`, `access-control-allow-methods: GET,POST,PUT,PATCH,DELETE,OPTIONS`, `access-control-allow-headers: Content-Type,Authorization` | **CORS preflight passes cleanly.** |
| `OPTIONS /api/auth/google`, `/api/auth/signup`, `/api/auth/refresh`, `/api/auth/admin-login` | `HTTP 204` | Same clean CORS headers | **CORS preflight passes cleanly.** |
| `POST /api/auth/login` (empty `{}`) | `HTTP 400` | `{"error":"Please enter both email and password."}` | Old Render backend only exposes legacy `/api/auth/login` and `/api/auth/register` (`HTTP 400`). |
| `POST /api/auth/google` (`{"idToken":"test"}`) | **`HTTP 404`** | `{"error":"Route not found: POST /api/auth/google"}` | **Part 32.1 Google auth route is NOT deployed on Render.** |
| `POST /api/auth/signup` (`{}`) | **`HTTP 404`** | `{"error":"Route not found: POST /api/auth/signup"}` | Current `/api/auth/signup` is NOT deployed on Render. |
| `POST /api/auth/refresh` (`{}`) | **`HTTP 404`** | `{"error":"Route not found: POST /api/auth/refresh"}` | Refresh rotation route is NOT deployed on Render. |

**Classification:** The `Network Error` symptom is a **frontend code regression (`91a9d67`)**, and full end-to-end recovery ALSO requires resolving the **frontend/backend deployment version mismatch** (Vercel env var `VITE_API_BASE_URL` + redeploying current `server/` to Render).

---

## 5. Minimal Proposed Fix (Pending Approval)

### A. Smallest Safe Code Correction (`client/src/api/client.js`, line 28)
Replace optional chaining with a standard truthiness guard on `import.meta.env` so **both** Vite production static replacement and Node.js test imports succeed without modifying auth security behavior:

```javascript
// client/src/api/client.js line 28
const apiClient = axios.create({
  baseURL: (import.meta.env ? import.meta.env.VITE_API_BASE_URL : undefined) ?? 'http://localhost:5000/api',
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})
```

Why this is minimal and safe:
- Restores Vite static build-time inlining of `import.meta.env.VITE_API_BASE_URL` (identical runtime outcome to pre-`91a9d67`).
- Preserves compatibility with all 15 Node.js auth security test suites (`test_part32_1_14`–`18`).
- Touches zero authentication verification, refresh rotation, CORS, rate-limiting, or RBAC protections.

### B. Deployment Synchronization Steps (Required Alongside the 1-Line Code Fix)
1. **Vercel (`kaushal-ai-azure`):** Confirm `VITE_API_BASE_URL=https://kaushalai-backend.onrender.com/api` (and `VITE_GOOGLE_CLIENT_ID`) is configured in Vercel Production Environment Variables, then redeploy frontend and inspect the built asset to confirm `"https://kaushalai-backend.onrender.com/api"` is statically inlined instead of `"http://localhost:5000/api"`.
2. **Render (`kaushalai-backend`):** Deploy current `main` (`server/`) with `NODE_ENV=production`, real MongoDB `MONGO_URI` (replacing `in-memory-fallback`), `CLIENT_ORIGIN=https://kaushal-ai-azure.vercel.app`, `GOOGLE_CLIENT_ID`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `TRUST_PROXY=1`, and run `server/scripts/migrate_google_sub_index.js` per Part 32.1 closure prerequisites so `/api/auth/google`, `/api/auth/login`, `/api/auth/signup`, and `/api/auth/refresh` are live.
3. **Verification Post-Deploy:** Confirm `GET /api/health` returns `service: "kaushalai-server"`, `POST /api/auth/google` returns `400` on missing `idToken` (not `404`), `OPTIONS` returns `204` with `Access-Control-Allow-Origin: https://kaushal-ai-azure.vercel.app`, and both Google `/signup` and Google/Password `/login` succeed end-to-end.

*(Investigation stopped here per strict read-only instructions. Awaiting approval before applying any code changes.)*

