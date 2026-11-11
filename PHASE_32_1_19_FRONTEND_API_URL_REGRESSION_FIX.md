# KaushalAI — Phase 32.1.19: Frontend API URL Resolution Fix Report

**Priority:** P0  
**Scope:** Minimal 1-line targeted fix in `client/src/api/client.js` (line 28)  
**Status:** Verified locally; awaiting review before deployment

---

## 1. Exact Git Diff

Only `client/src/api/client.js` was modified in this phase (`1 file changed, 1 insertion(+), 1 deletion(-)`). Unrelated prior Phase 35.1 changes already in the working tree were left untouched.

```diff
diff --git a/client/src/api/client.js b/client/src/api/client.js
index c83fd4f..558faeb 100644
--- a/client/src/api/client.js
+++ b/client/src/api/client.js
@@ -25,7 +25,7 @@ export function configureApiClient({ getToken, clearAuth, setAuth, getSessionGen
 }
 
 const apiClient = axios.create({
-  baseURL: import.meta?.env?.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
+  baseURL: (import.meta.env ? import.meta.env.VITE_API_BASE_URL : undefined) ?? 'http://localhost:5000/api',
   timeout: 30000,
   withCredentials: true,
   headers: { 'Content-Type': 'application/json' },
```

No changes were made to authentication controllers, routes, Google OAuth verification, CORS, refresh-token rotation, session handling, environment files, or database records/indexes.

---

## 2. Vite Production Build Output

### A. Build with Production `VITE_API_BASE_URL`
Command run in `/Users/abhinikesh/Documents/Projects/KaushalAI/client`:
```bash
VITE_API_BASE_URL=https://kaushalai-backend.onrender.com/api npm run build
```

Observed output:
```text
> kaushalai-client@0.1.0 build
> vite build

vite v6.4.3 building for production...
✓ 2746 modules transformed.
dist/index.html                     0.61 kB │ gzip:   0.39 kB
dist/assets/index-B-t37bfK.css    428.99 kB │ gzip:  68.92 kB
dist/assets/index-BW1vw07S.js   1,972.34 kB │ gzip: 517.20 kB
✓ built in 3.31s
```

### B. Standard Client Production Build
Command run in `/Users/abhinikesh/Documents/Projects/KaushalAI/client`:
```bash
npm run build
```

Observed output:
```text
> kaushalai-client@0.1.0 build
> vite build

vite v6.4.3 building for production...
✓ 2746 modules transformed.
dist/index.html                     0.61 kB │ gzip:   0.39 kB
dist/assets/index-B-t37bfK.css    428.99 kB │ gzip:  68.92 kB
dist/assets/index-C14jRGc1.js   1,972.34 kB │ gzip: 517.18 kB
✓ built in 3.32s
```

---

## 3. Generated Bundle Inspection

### A. Production Env Build (`dist/assets/index-BW1vw07S.js`)
Inspecting around the `axios.create` call in `dist/assets/index-BW1vw07S.js` confirms:
```javascript
TW={};let cS=()=>null,Km=()=>{},dS=()=>{},uS=()=>null;function IW({getToken:n,clearAuth:t,setAuth:r,getSessionGen:s}){cS=n,Km=t,dS=r,uS=s||(()=>null)}const ot=mr.create({baseURL:(TW?"https://kaushalai-backend.onrender.com/api":void 0)??"http://localhost:5000/api",timeout:3e4,withCredentials:!0,headers:{"Content-Type":"application/json"}});
```

- **Static inlining confirmed:** `https://kaushalai-backend.onrender.com/api` is statically embedded into the generated asset (1 match).
- **Resolved runtime `baseURL`:** Because `TW = {}` is a non-null object (always truthy), `(TW ? "https://kaushalai-backend.onrender.com/api" : void 0) ?? "http://localhost:5000/api"` deterministically resolves at runtime to **`"https://kaushalai-backend.onrender.com/api"`** and never selects `"http://localhost:5000/api"`.
  *(Exact detail: `"http://localhost:5000/api"` remains present once in the bundle text as the unreachable right-hand nullish-coalescing literal of the ternaried fallback expression because Vite emits `TW={}` as a binding rather than an inline constant, so Rollup preserves the fallback branch syntactically without executing it.)*

### B. Standard Build (`dist/assets/index-C14jRGc1.js`)
Inspecting `dist/assets/index-C14jRGc1.js` confirms that even without passing `VITE_API_BASE_URL` on the command line, Vite statically replaces `import.meta.env.VITE_API_BASE_URL` using the local environment setting rather than leaving `import.meta?.env?.VITE_API_BASE_URL` un-replaced:
```javascript
const ot=mr.create({baseURL:(TW?"http://localhost:5000/api":void 0)??"http://localhost:5000/api",timeout:3e4,withCredentials:!0,headers:{"Content-Type":"application/json"}});
```

### C. Direct Node.js ESM Import Check
```bash
node --input-type=module -e 'import("./client/src/api/client.js").then(m => console.log("Node ESM import ok:", Object.keys(m), "baseURL:", m.default.defaults.baseURL))'
```
Observed output:
```text
Node ESM import ok: [
  'broadcastAuthEvent',
  'configureApiClient',
  'default',
  'handleAuthChannelMessage'
] baseURL: http://localhost:5000/api
```

---

## 4. Node.js Authentication Regression Suite Results (Parts 32.1.14–32.1.18)

Executed in `/Users/abhinikesh/Documents/Projects/KaushalAI/server`:

| Test Suite | Result | Verified Coverage |
|---|---|---|
| `test_part32_1_14_rotation_crash_proxy_crosstab.js` | **PASS** (exit `0`, `ALL PART 32.1.14 TESTS PASSED!`) | Predecessor linking 1.1–1.4, crash recovery 2.1–2.3, `TRUST_PROXY` & Nginx proxy chain, 10 BroadcastChannel cross-tab scenarios importing `client/src/api/client.js` |
| `test_part32_1_15_slow_worker_recovery_integrity.js` | **PASS** (exit `0`, `ALL PART 32.1.15 TESTS PASSED!`) | Slow-worker atomic fencing, simultaneous recovery race, no predecessor reactivation, grace retry bounds, proxy IP extraction, cross-tab `sessionGen` 6.1–6.4 importing `client/src/api/client.js` |
| `test_part32_1_16_recovery_eligibility_grace_threat_model.js` | **PASS** (exit `0`, `ALL PART 32.1.16 TESTS PASSED!`) | Recovery eligibility `< 500ms` vs orphan cleanup, UUID v4 attempt/session IDs, grace-window 3-request cap & 10s expiry, cross-tab logout ordering importing `client/src/api/client.js` |
| `test_part32_1_17_recovery_cleanup_and_worker_races.js` | **PASS** (exit `0`, `ALL PART 32.1.17 TESTS PASSED!`) | Deterministic worker-race scenarios 1.1–1.10, cross-tab concurrency & storage fallback 2.1–2.8 requiring `client/src/api/client` |
| `test_part32_1_18_successor_ownership_and_late_write_safety.js` | **PASS** (exit `0`, `ALL PART 32.1.18 TESTS PASSED!`) | `supersededAttemptId` / `supersededTokenHash` cleanup ownership, late successor insertion & `reconcileFamilyOrphans`, family/user cleanup isolation, HTTP cookie verification |

Development database `kaushalai` remained untouched across all runs (`{ users: 15, certs: 0, attempts: 12 }`).

---

## 5. Remaining Issues Requiring Attention Before Production Verification

1. **Deployment Synchronization Required (Not Executed Here):**
   - **Render (`https://kaushalai-backend.onrender.com`):** As verified in `AUTHENTICATION_REGRESSION_ROOT_CAUSE.md`, Render is currently serving an outdated/different in-memory API build (`service: "Kaushal AI API"`, `database: "in-memory-fallback"`) where `POST /api/auth/google`, `POST /api/auth/signup`, and `POST /api/auth/refresh` return `HTTP 404 Route not found`. Current `server/` must be deployed with production env vars (`NODE_ENV=production`, `MONGO_URI`, `CLIENT_ORIGIN=https://kaushal-ai-azure.vercel.app`, `GOOGLE_CLIENT_ID`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `TRUST_PROXY=1`) and `server/scripts/migrate_google_sub_index.js`.
   - **Vercel (`https://kaushal-ai-azure.vercel.app`):** Confirm `VITE_API_BASE_URL=https://kaushalai-backend.onrender.com/api` and `VITE_GOOGLE_CLIENT_ID` are configured in Vercel Production Environment Variables before redeploying the frontend with this fix.
2. **Pre-existing Uncommitted Workspace Changes:** Prior Phase 35.1 files remain uncommitted in the local working tree (`git status -s` shows those prior changes alongside `client/src/api/client.js` and report deliverables). Deploy/commit only the reviewed scope intended for production.

---

*Stopped here per instructions. Ready for review before deployment.*

