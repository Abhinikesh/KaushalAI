# KAUSHALAI — PART 32.1.8
## Authentication Security & Deployment Readiness Audit Report

**Project:** KaushalAI Main Website  
**Phase:** Part 32.1.8 — Authentication Security & Deployment Readiness Audit  
**Mode:** STRICTLY READ-ONLY SECURITY AUDIT  
**Audit Date:** November 11, 2026  
**Auditor:** Antigravity (Google DeepMind Agentic Coding System)  
**Overall Verdict:** **CONDITIONALLY READY** *(Deployment Blocked Pending P0/P1 Remediation)*  
**Database Isolation:** Development Database (`kaushalai`: 15 users, 0 certificates, 12 attempts — strictly verified & unmodified) | Test Database (`kaushalai_test`)

---

## 1. Executive Summary

This strictly read-only security audit evaluates the complete authentication and authorization architecture of KaushalAI following the universal Google authentication rollout (Parts 32.1.1 through 32.1.7).

### Positive Security Verifications
1. **Google ID-Token Integrity:** Google ID-token verification is cryptographically rigorous (`google-auth-library` against Google public certs), with strict audience, issuer, expiry, subject, and boolean `email_verified: true` enforcement. No access-token or `userinfo` fallbacks exist.
2. **Administrator Google Isolation:** Administrator accounts cannot authenticate, link, or provision via Google under any circumstance (`ADMIN_GOOGLE_AUTH_PROHIBITED`, HTTP 403) across all lookup stages.
3. **Account-Linking Non-Destructiveness:** Linking existing accounts via verified Google email strictly preserves existing passwords, employee IDs, cadre, departments, and learning history.
4. **Public Signup Simplification:** Public signup is cleanly isolated to Google GIS. Ordinary learners never see ministerial onboarding fields, officer rosters, or whitelist gates.

### Critical Deployment Blockers & Vulnerabilities Identified
Despite the clean implementation of the core Google authentication flow, the audit identified **two P0 Critical Vulnerabilities** and **two P1 High-Risk Deployment Blockers** in legacy and auxiliary endpoints that must be resolved prior to production launch:
1. **[P0] Unrestricted Test Bypass Endpoint (`POST /api/auth/bypass`):** Mounted without environment restrictions (`NODE_ENV === 'production'`) or rate limiting, allowing arbitrary generation of administrative access tokens.
2. **[P0] Mock SSO / OTP Authentication Bypass (`POST /api/auth/sso`):** Allows unauthenticated session issuance for any account (including administrators) given only an email address, without genuine OTP or cryptographic verification.
3. **[P1] Missing Admin Role Guard on System Settings (`/api/admin/system-settings`):** `GET/PUT /admin/system-settings` and `POST /admin/clear-cache` only enforce `authenticate` and lack `authorize('admin')`, allowing any ordinary learner to modify platform configuration.
4. **[P1] Missing Engine-Level MongoDB Index for `googleSub`:** The partial unique index `{ googleSub: 1 }` defined in Mongoose has not been built on the persistent database, creating a race condition vulnerability if multiple concurrent requests bypass application-level checks.

---

## 2. Files and Functions Inspected

- [`server/src/controllers/auth.controller.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/auth.controller.js) — `verifyGoogleToken`, `googleAuth`, `signup`, `login`, `adminLogin`, `googleComplete`, `refresh`, `logout`, `ssoLogin`, `bypassLogin`, `updateMe`.
- [`server/src/routes/auth.routes.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/routes/auth.routes.js) — Route definitions, rate limiting middleware, Joi validation schemas.
- [`server/src/routes/admin.routes.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/routes/admin.routes.js) — Admin route protection, middleware order, system settings endpoints.
- [`server/src/middleware/auth.middleware.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/middleware/auth.middleware.js) — `authenticate` (Bearer JWT verification), `authorize` (RBAC guard).
- [`server/src/validators/auth.validators.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/validators/auth.validators.js) — `signupSchema`, `loginSchema`, `googleCompleteSchema`, `ALLOWED_DOMAINS`.
- [`server/src/models/User.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/models/User.js) — Schema definitions, pre-hooks, partial unique index expressions.
- [`server/src/models/AuthorizedOfficer.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/models/AuthorizedOfficer.js) — Institutional roster validation.
- [`server/src/models/RefreshToken.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/models/RefreshToken.js) — Token hashing and expiry schema.
- [`server/src/utils/token.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/utils/token.js) — JWT signing, refresh token generation, SHA-256 hashing.
- [`server/src/services/officerRoster.service.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/officerRoster.service.js) — `verifyOfficerMatch`, `claimOfficerRecord`.
- [`server/src/app.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/app.js) — CORS configuration, security headers, middleware mounting.
- [`client/src/pages/auth/LoginPage.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/auth/LoginPage.jsx) — Login interface, Google GIS integration.
- [`client/src/pages/auth/SignupPage.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/auth/SignupPage.jsx) — Public signup interface.
- [`client/src/pages/auth/AdminLoginPage.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/auth/AdminLoginPage.jsx) — Admin portal, isolation from Google OAuth.
- [`client/src/store/authStore.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/store/authStore.js) — Client auth state management.
- [`client/src/App.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/App.jsx) — Frontend route guards (`PublicRoute`, `ProtectedRoute`, `AdminRoute`).

---

## 3. Detailed Audit Findings

### 3.1 Google Authentication Security (Audit 1)
**Verdict: SECURE / PASS**

1. **Token Acceptance:** Only authentic Google ID tokens signed by Google certificates are accepted.
2. **Audience & Issuer:** Audience is strictly validated against `process.env.GOOGLE_CLIENT_ID` (`auth.controller.js:63`). Issuers are restricted to `accounts.google.com` and `https://accounts.google.com` (`auth.controller.js:68`).
3. **Claim Validation:** Expiration (`exp * 1000 > Date.now()`), non-empty `sub`, valid email syntax, and strict boolean `email_verified === true` are validated.
4. **Fallback Elimination:** All legacy access-token / `userinfo` fallbacks have been completely removed.
5. **Account Switching & Identity Swapping:** `googleSub` is immutable. If an incoming Google token's `sub` matches account A, but its email matches account B, the controller detects cross-account conflict and rejects with HTTP 409 `ACCOUNT_COLLISION` (`auth.controller.js:322`).
6. **Concurrent Signups:** Race conditions (MongoDB error code 11000) are caught and handled by `handleGoogleAuthRetry`, which re-queries the database and converges safely.
7. **Inactive Accounts:** Inactive accounts (`isActive: false`) are rejected across all stages with HTTP 403 `ACCOUNT_DEACTIVATED`.
8. **Learner Role Enforcement:** New users provisioned via Google are unconditionally assigned `role: 'employee'` with null government fields (`auth.controller.js:405-423`). Client-injected role parameters are completely ignored.
9. **Administrator Protection:** Any Google login attempt matching an admin account (by `sub` or `email`) is blocked with HTTP 403 `ADMIN_GOOGLE_AUTH_PROHIBITED`, issuing zero tokens, writing zero cookies, and recording an audit log entry.

---

### 3.2 Legacy Endpoint Security (Audit 2)
**Verdict: ACTION REQUIRED (Critical & High Risks Identified)**

#### A. `POST /api/auth/signup` (Institutional Officer Registration)
- **Roster Validation:** Mandatory server-side validation against `AuthorizedOfficer`. If employee ID is not found, throws HTTP 403.
- **Trusted Attribution:** Department, designation, and job role are populated directly from server-side roster records, never trusted from client inputs.
- **Privilege Escalation:** Joi schema strictly enforces `role: Joi.string().valid('employee').default('employee')`. Admin role cannot be self-assigned.
- **Concurrency Issue (P2):** In `officerRoster.service.js:58`, `claimOfficerRecord` updates `{ isClaimed: true }` without an atomic condition `{ employeeId, isClaimed: false }`. In high-concurrency races with two different emails, two user accounts could theoretically claim the same employee ID before the first claim finishes.
- **Public Exposure:** The endpoint remains publicly accessible at `POST /api/auth/signup`. While protected by the officer roster, it is no longer exposed on the frontend UI.

#### B. `POST /api/auth/google/complete` (Legacy Onboarding Endpoint)
- **Frontend Reachability:** Not reachable from any frontend flow (route `/auth/google/complete` redirects to `/signup`, and `CompleteGoogleSignupPage.jsx` was deleted in Part 32.1.7).
- **Security Assessment:**
  - Validates Google ID token via `verifyGoogleToken()`.
  - Rejects admin accounts with HTTP 403 `ADMIN_GOOGLE_AUTH_PROHIBITED`.
  - **Vulnerability / Attack Surface (P2):** If `verifyOfficerMatch` fails, lines 553-560 contain a graceful fallback:
    ```javascript
    officer = {
      employeeId: employeeId.trim(),
      department: 'Field Operations Division (FOD)',
      jobRoleId: defaultRole?._id ?? null,
    }
    ```
    This fallback allows an external caller with a valid Google token to fabricate a government officer identity (`FOD` department) with an arbitrary employee ID.
  - **Recommendation:** Deprecate and remove or disable this endpoint in production.

#### C. `POST /api/auth/sso` (Mock Government SSO / OTP Login)
- **CRITICAL VULNERABILITY (P0):**
  Lines 792-820 in `auth.controller.js`:
  ```javascript
  async function ssoLogin(req, res, next) {
    const { provider = 'sso', email, employeeId } = req.body
    let user
    if (email || employeeId) {
      user = await User.findOne({ $or: [{ email: regex }, { employeeId: regex }] })
    }
    if (!user) user = await User.findOne({ isActive: true })
    const accessToken = await issueTokenPair(user, res)
    res.json({ user, accessToken, provider })
  }
  ```
  - **Exploit Scenario:** Any unauthenticated caller can send `POST /api/auth/sso` with `{ "email": "admin.mospi@nic.in" }`. The server returns an administrative JWT access token and sets an admin refresh token cookie without password or OTP verification.
  - Furthermore, sending an empty body logs into the first active user in the database.
  - **Impact:** Complete authentication bypass and administrative privilege escalation.
  - **Remediation:** Remove `ssoLogin` or restrict it strictly to local non-production testing (`process.env.NODE_ENV !== 'production'`), and explicitly disallow admin role resolution.

#### D. `POST /api/auth/bypass` (Test Bypass Login)
- **CRITICAL VULNERABILITY (P0):**
  Mounted directly in `server/src/routes/auth.routes.js:22` and implemented in `server/src/controllers/auth.controller.js:824-874`:
  ```javascript
  async function bypassLogin(req, res, next) {
    const { role = 'employee', email } = req.body || {}
    let user = await User.findOne({ role, isActive: true })
    const accessToken = await issueTokenPair(user, res)
    res.json({ user, accessToken, bypass: true })
  }
  ```
  - **Exploit Scenario:** Any attacker can issue `POST /api/auth/bypass` with `{ "role": "admin" }` to instantly obtain administrative credentials.
  - Has zero rate limiting and zero environment guards.
  - **Impact:** Instant remote administrative takeover.
  - **Remediation:** Strictly gate `bypassLogin` behind `if (process.env.NODE_ENV === 'production') return next({ status: 404 })` or remove the route entirely from production builds.

---

### 3.3 Admin Authorization (Audit 3)
**Verdict: ACTION REQUIRED (System Settings Route Guard Defect)**

1. **Admin Password Login:** `POST /api/auth/admin-login` requires valid username/password matching an account with `role: 'admin'`. Ordinary learner credentials return HTTP 403 `ADMIN_LOGIN_DENIED`.
2. **Google Admin Prohibition:** Verified across 4 independent checkpoints. Google OAuth never grants admin privileges.
3. **Privilege Modification via Profile Update:** `PUT /api/auth/me` does not accept or update `role`. `PUT /api/admin/users/:id` explicitly blocks changing `user.role` (lines 655-658).
4. **Admin Route Protection Defect (P1):**
   In `server/src/routes/admin.routes.js`:
   ```javascript
   // Lines 29-31:
   router.get('/admin/system-settings', authenticate, getSystemSettings)
   router.put('/admin/system-settings', authenticate, updateSystemSettings)
   router.post('/admin/clear-cache', authenticate, clearCache)

   // Line 34:
   router.use('/admin', authenticate, authorize(['admin']))
   ```
   - **Vulnerability:** Lines 29-31 are mounted *before* line 34 and omit `authorize('admin')`.
   - **Impact:** Any authenticated learner with `role: 'employee'` can read and overwrite global platform system settings (`PUT /api/admin/system-settings`) and trigger cache flushes.
   - **Remediation:** Move lines 29-31 below line 34 or add `authorize('admin')`.

---

### 3.4 JWT, Refresh Token & Cookie Security (Audit 4)
**Verdict: CONDITIONALLY SECURE**

1. **Secrets:** Configured via environment variables (`ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `COOKIE_SECRET`).
   - *Risk:* In `server/.env`, default development secrets are present. If deployed to production without overriding these environment variables, tokens could be forged.
2. **Token Expiry:**
   - Access token defaults to `24h` (`token.js:4`).
   - Refresh token lifetime is 7 days.
   - *Observation:* A 24-hour lifetime for access tokens is long; revoked permissions or deactivated accounts remain active until token expiration. Standard recommendation is 15-60 minutes.
3. **Token Rotation & Revocation:** Refresh tokens are single-use (`stored.revoked = true`). A new token pair is issued on refresh. Expired or revoked tokens clear cookies with `Path=/`.
4. **Cookie Security:**
   - Production flags: `httpOnly: true`, `secure: true`, `sameSite: 'strict'`, `path: '/'`.
   - Development flags: `httpOnly: true`, `secure: false`, `sameSite: 'lax'`, `path: '/'`.
5. **Refresh Endpoint Rate Limiting (P2):** `POST /api/auth/refresh` lacks rate limiting in `auth.routes.js:29`.

---

### 3.5 Account Linking & Data Integrity (Audit 5)
**Verdict: ACTION REQUIRED (Missing Production Database Index)**

1. **Schema Definition:** `User.js` defines a partial unique index on `{ googleSub: 1 }` with `partialFilterExpression: { googleSub: { $type: 'string', $gt: '' } }`.
2. **Null & Empty Strings:** Pre-validate hook normalizes empty strings to `null`. Null values are excluded from the partial index, preventing null-collision conflicts.
3. **Database Inspection Finding (P1 Deployment Blocker):**
   Direct inspection of indexes on the development database `kaushalai` revealed that `googleSub_1` **does NOT exist in the database engine**:
   ```json
   [
     { "key": { "_id": 1 }, "name": "_id_" },
     { "key": { "email": 1 }, "name": "email_1", "unique": true },
     { "key": { "employeeId": 1 }, "name": "employeeId_1" },
     { "key": { "functional_area_id": 1 }, "name": "functional_area_id_1" },
     { "key": { "role_id": 1 }, "name": "role_id_1" },
     { "key": { "onboarding_completed": 1 }, "name": "onboarding_completed_1" },
     { "key": { "onboarding_step": 1 }, "name": "onboarding_step_1" },
     { "key": { "needs_skillgap_sync": 1 }, "name": "needs_skillgap_sync_1" }
   ]
   ```
   - *Cause:* Mongoose `schema.index()` creates indexes automatically only when `autoIndex` runs during initial collection creation. Existing databases require explicit index synchronization.
   - *Impact:* Without the database index, uniqueness is not enforced by MongoDB at the engine level.
   - *Deployment Requirement:* An explicit startup index migration (`await User.syncIndexes()`) must be executed upon deployment.

---

### 3.6 Security Controls & Network Policy (Audit 6)
**Verdict: ACTION REQUIRED (Permissive CORS Configuration)**

1. **Overly Permissive CORS (P1):**
   In `server/src/app.js:56-87`:
   ```javascript
   // Line 83:
   return callback(null, true)
   ```
   Combined with `credentials: true` (line 85).
   - *Vulnerability:* The CORS callback allows any origin by default. Malicious websites can make cross-origin requests with user credentials.
   - *Remediation:* Enforce explicit origin allowlisting: `callback(new Error('Not allowed by CORS'))` when origin is not in `allowedOrigins`.
2. **Account Enumeration (P3):**
   - In `login()`: Differentiates between non-existent accounts (HTTP 401) and Google-only accounts (HTTP 400 "This account uses Google Sign-In").
   - Recommended remediation: Standardize to generic credential error.

---

## 4. Test Execution & Build Verification (Audit 7)

### 4.1 Automated Test Execution
All tests executed against isolated test database `kaushalai_test`:

| Test Suite File | Tests Run | Passed | Failed | Status |
| :--- | :---: | :---: | :---: | :---: |
| `test_part32_1_3_google_id_token_admin_isolation.js` | 13 | 13 | 0 | **100% PASS** |
| `test_part32_1_4_google_identity_provisioning.js` | 20 | 20 | 0 | **100% PASS** |
| `test_part32_1_6_auth_ux_simplification.js` | 10 | 10 | 0 | **100% PASS** |
| `test_part32_1_7_public_signup_simplification.js` | 10 | 10 | 0 | **100% PASS** |
| **All Other Backend Regression Suites (`test_part*.js`)** | 25 suites | 25 | 0 | **100% PASS** |
| **Total Test Suites Executed** | **29 suites** | **29** | **0** | **100% PASS** |

### 4.2 Production Client Build
- Command: `cd client && npm run build`
- Result: **0 errors, built in 3.18s**.

### 4.3 Development Database Verification
Database `kaushalai` verified untouched before and after test executions:
- `users`: **15** (unmodified)
- `certificates`: **0** (unmodified)
- `quizattempts`: **12** (unmodified)

---

## 5. Summary of Findings & Vulnerability Matrix

| ID | Severity | Category | File & Location | Description |
| :--- | :---: | :--- | :--- | :--- |
| **VULN-01** | **P0** | Auth Bypass | `auth.routes.js:22`, `auth.controller.js:824` | `POST /api/auth/bypass` allows unauthenticated creation of admin tokens with zero credentials in any environment. |
| **VULN-02** | **P0** | Auth Bypass | `auth.routes.js:26`, `auth.controller.js:792` | `POST /api/auth/sso` allows unauthenticated login into any account (including admins) via email without OTP or SSO proof. |
| **VULN-03** | **P1** | Authorization | `admin.routes.js:29-31` | `GET/PUT /admin/system-settings` and `POST /admin/clear-cache` lack `authorize('admin')`, accessible by ordinary learners. |
| **VULN-04** | **P1** | Deployment | `kaushalai` MongoDB Database | Index `{ googleSub: 1 }` does not exist on the database engine. |
| **VULN-05** | **P1** | Network / CORS | `server/src/app.js:83` | CORS handler returns `callback(null, true)` for any origin while `credentials: true` is enabled. |
| **VULN-06** | **P2** | Attack Surface | `auth.controller.js:519` | `POST /api/auth/google/complete` contains fallback creating synthetic FOD officers with arbitrary employee IDs. |
| **VULN-07** | **P2** | Token Lifetime | `utils/token.js:4` | Access token lifetime of 24h is excessive; deactivations and role changes take up to 24h to propagate. |
| **VULN-08** | **P2** | Concurrency | `officerRoster.service.js:58` | `claimOfficerRecord` lacks atomic `{ isClaimed: false }` check during officer signup. |
| **VULN-09** | **P3** | Enumeration | `auth.controller.js:174` | Login error message reveals whether an account exists and is Google-linked. |

---

## 6. Deployment Blockers

Before production deployment, the following four items are **mandatory blockers**:

1. **BLOCKER 1 (VULN-01 & VULN-02):** Eliminate or strictly gate `POST /api/auth/bypass` and `POST /api/auth/sso` so they cannot be accessed in production or issue admin tokens without credentials.
2. **BLOCKER 2 (VULN-03):** Add `authorize('admin')` to `/admin/system-settings` and `/admin/clear-cache` in `admin.routes.js`.
3. **BLOCKER 3 (VULN-04):** Execute an explicit startup migration script (`await User.syncIndexes()`) during production deployment to create the `googleSub_1` unique partial index.
4. **BLOCKER 4 (VULN-05):** Restrict CORS origins in `app.js` to reject unknown origins when `NODE_ENV === 'production'`.

---

## 7. Prioritized Remediation Plan

### Phase 1: Critical Security Fixes (Pre-Deployment Mandatory)
- [ ] **Step 1:** In `server/src/routes/auth.routes.js`, disable `/bypass` in production:
  ```javascript
  if (process.env.NODE_ENV !== 'production') {
    router.post('/bypass', authController.bypassLogin)
  }
  ```
- [ ] **Step 2:** In `server/src/controllers/auth.controller.js`, secure or disable `ssoLogin` in production, and explicitly prohibit it from authenticating admin accounts:
  ```javascript
  if (user.role === 'admin') return next({ status: 403, message: 'SSO not permitted for admin accounts' })
  ```
- [ ] **Step 3:** In `server/src/routes/admin.routes.js`, move `/admin/system-settings` and `/admin/clear-cache` below `router.use('/admin', authenticate, authorize(['admin']))`.
- [ ] **Step 4:** In `server/src/app.js`, update CORS origin callback to reject unauthorized origins in production instead of returning `callback(null, true)`.
- [ ] **Step 5:** Add `await User.syncIndexes()` in `server/src/server.js` on database connection.

### Phase 2: Defense-in-Depth Hardening (Post-Deployment / Fast-Follow)
- [ ] **Step 6:** Remove or disable `POST /api/auth/google/complete` since all Google provisioning now occurs through `POST /api/auth/google`.
- [ ] **Step 7:** Shorten `ACCESS_TOKEN_EXPIRY` from `24h` to `15m` or `1h`, relying on silent refresh.
- [ ] **Step 8:** Add `authLimiter` to `POST /api/auth/refresh`.
- [ ] **Step 9:** Add atomic condition `{ employeeId: employeeId.trim(), isClaimed: false }` to `claimOfficerRecord`.

---

## 8. Final Audit Verdict

# **CONDITIONALLY READY**

The universal Google authentication and administrator isolation architecture is well-designed, robustly tested, and resilient against identity collision. However, **deployment to production must not proceed** until the P0/P1 legacy endpoint bypasses (`/bypass`, `/sso`), the admin route guard omission on system settings, the permissive CORS wildcard, and the database index deployment are remediated according to Phase 1 of the remediation plan.
