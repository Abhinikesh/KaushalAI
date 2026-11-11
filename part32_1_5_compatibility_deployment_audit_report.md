# PART 32.1.5 — STAGE 2 COMPATIBILITY & DEPLOYMENT SAFETY AUDIT REPORT

**Project:** KaushalAI Main Website  
**Phase:** Part 32.1.5 (Pre-Simplification Safety & Deployment Audit)  
**Mode:** Strictly Read-Only Architecture & Security Audit  
**Status:** COMPLETE & AUDITED  
**Date:** November 11, 2026  

---

## 1. Executive Summary & Verdict Overview

A comprehensive, strictly read-only audit of the completed Part 32.1.4 implementation was conducted across the authentication controllers, User schema, indexing definitions, middleware, government account workflows, and automated test suites.

| Audit Area | Verdict | Summary |
| :--- | :---: | :--- |
| **1. Government Account Compatibility** | **PASS** | Schema default cleanups to `null` do not break legacy officer registration, MoSPI employee-ID checks, or government login. |
| **2. Existing Account Preservation** | **PASS** | Google linking preserves existing User IDs, password hashes, government roles, officer credentials, and all learning history. |
| **3. Identity Resolution & Concurrency** | **PASS** | All 9 core security invariants verified; dual-path admin isolation and duplicate-key retry logic proven robust. |
| **4. Index Deployment Safety** | **PASS** | Partial unique index `{ googleSub: 1 }` excludes `null` and empty strings; idempotent and safe for repeated creation. |
| **5. Route & Middleware Audit** | **PASS** | Admin isolation invariant enforced across all routes; session contracts intact. Minor cookie clearing path quirk noted. |
| **6. Test Suite Quality** | **PASS** | 20/20 Stage 2 tests, 13/13 Stage 1 tests, and 27/27 backend regression suites pass against real MongoDB constraints. |

---

## 2. Section-by-Section Detailed Audit Findings

### 2.1 Government Account Compatibility
**Verdict: PASS**

#### Workflows Inspected:
- `signup` in [`auth.controller.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/auth.controller.js#L104-L149)
- `verifyOfficerMatch` and `claimOfficerRecord` in [`officerRoster.service.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/officerRoster.service.js#L19-L65)
- `signupSchema` in [`auth.validators.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/validators/auth.validators.js#L41-L51)
- `login` in [`auth.controller.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/auth.controller.js#L153-L200)
- `updateMe` in [`auth.controller.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/auth.controller.js#L646-L730)
- `authenticate` and `authorize` in [`auth.middleware.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/middleware/auth.middleware.js#L3-L31)

#### Findings:
1. **Officer Registration Path:**
   - In `signup()`, the request body requires `employeeId`, `name`, `email`, `password`, and optional `experienceYears`.
   - `verifyOfficerMatch(employeeId, name)` queries the authoritative `AuthorizedOfficer` collection for an unclaimed record.
   - `department` and `jobRoleId` are populated strictly from the verified `AuthorizedOfficer` record server-side, not trusted from client input.
   - Setting schema defaults to `null` for `cadre`, `reportingTo`, `dateOfJoining`, `batch`, `address`, `phone`, and `dateOfBirth` in [`User.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/models/User.js) does not affect officer signup, as none of those fields are required by Mongoose validation or by `signupSchema`.
2. **Officer Login Path:**
   - `login()` performs `$or: [{ email: safeRegex }, { employeeId: safeRegex }]` with `bcrypt.compare`.
   - Government officers can log in using either their official email ID or their registered employee ID.
3. **Profile Updates & Completion:**
   - `updateMe()` dynamically checks `effectiveName`, `effectiveDept`, `effectiveDesignation`, etc., reading persisted document values when fields are not sent in the update payload.
   - Legitimate profile completion calculation functions properly for both government employees and universal learners.

---

### 2.2 Existing Account Preservation
**Verdict: PASS**

#### Invariants Inspected:
- Tier B account linking in `googleAuth()` ([`auth.controller.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/auth.controller.js#L350-L401))
- Profile preservation checks in [`test_part32_1_4_google_identity_provisioning.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/test_part32_1_4_google_identity_provisioning.js#L235-L300)
- Read-only queries against development database `kaushalai`

#### Findings:
1. **Authoritative Field Preservation During Linking:**
   - In Tier B, when an existing government account is matched by verified email:
     - `name` is preserved (not overwritten by Google name).
     - `employeeId`, `department`, `cadre`, `batch`, `experienceYears` are preserved.
     - `jobRoleId` is preserved.
     - `passwordHash` is preserved (verified in Test 8).
     - `role` is preserved (`employee` remains `employee`).
     - `avatarUrl` is only populated if the existing user has no avatar (`if (picture && !emailMatch.avatarUrl)`).
2. **Relational Integrity:**
   - The user document is mutated in-place: the User `_id` does not change.
   - Existing foreign key references across `QuizAttempt`, `UserCompetency`, `Certificate`, `Enrollment`, and `AuditLog` remain pointing to the identical `userId` (verified in Test 7).
3. **Database Integrity:**
   - Direct inspection of development database `kaushalai` confirmed zero mutations:
     - 15 total users (3 admin, 12 employee).
     - 0 certificates.
     - 12 quiz attempts.
     - 0 non-empty `googleSub` records created in dev DB.

---

### 2.3 Google Identity Resolution & Concurrency Invariants
**Verdict: PASS**

#### Invariants Evaluated:
1. **One Google subject per user:** Enforced by MongoDB partial unique index on `{ googleSub: 1 }` and verified by Test 16 (E11000 duplicate key error).
2. **No silent re-linking:** If an existing account has `googleSub` and it does not match the token's `sub`, the request is rejected with `HTTP 409` (`GOOGLE_SUB_COLLISION`) at line 376. Verified by Test 11.
3. **Cross-account collision rejection:** If `googleSub` matches User A, but the token's verified `email` matches User B, the request is rejected with `HTTP 409` (`ACCOUNT_COLLISION`) at line 322 and in retry at line 463. Neither account is mutated. Verified by Test 10.
4. **Dual-path administrator isolation:**
   - Tier A subject lookup: lines 286–296 reject with `HTTP 403` (`ADMIN_GOOGLE_AUTH_PROHIBITED`).
   - Tier A email cross-check: lines 309–319 reject with `HTTP 403` (`ADMIN_GOOGLE_AUTH_PROHIBITED`).
   - Tier B email lookup: lines 354–364 reject with `HTTP 403` (`ADMIN_GOOGLE_AUTH_PROHIBITED`).
   - Retry path: lines 471–481 reject with `HTTP 403` (`ADMIN_GOOGLE_AUTH_PROHIBITED`).
   - In all 4 checkpoints: 0 access tokens issued, 0 refresh tokens issued, 0 cookies set, 0 mutations, and audit log `ADMIN_GOOGLE_AUTH_BLOCKED` recorded. Verified by Tests 12 & 13.
5. **Inactive account rejection:** Lines 299, 367, and 483 reject inactive users with `HTTP 403` (`ACCOUNT_DEACTIVATED`). Verified by Test 14.
6. **No session for ambiguous identities:** Lines 267 and 275 detect multiple records for an email or subject and reject with `HTTP 409` (`DUPLICATE_EMAIL_CONFLICT` or `DUPLICATE_SUB_CONFLICT`). Verified by Test 15.
7. **Complete state re-check on retry:** `handleGoogleAuthRetry()` re-queries both `googleSub` and `email`, re-evaluates duplicate counts, cross-account collision, admin role, and active status before token issuance.
8. **Concurrent first-time provisioning:** Tested with 5 simultaneous HTTP threads in Test 17. The loser threads catch code 11000, trigger retry, and all 5 threads successfully converge on the exact same User `_id` with exactly 1 document in MongoDB.
9. **Concurrent identity linking:** Tested in Test 18. Simultaneous linking requests converge cleanly without race condition crashes.

#### Mechanism Observation:
Identity linking in Tier B sets `emailMatch.googleSub = verifiedSub` and calls `emailMatch.save()`, enclosed in a `try...catch` catching `saveErr.code === 11000`. Because the partial unique index `{ googleSub: 1 }` guarantees that two concurrent threads cannot commit the same `googleSub`, this mechanism is safe.

---

### 2.4 Index Deployment Safety
**Verdict: PASS (with Operational Recommendation)**

#### Index Specification Inspected:
```javascript
userSchema.index(
  { googleSub: 1 },
  {
    unique: true,
    partialFilterExpression: { googleSub: { $type: 'string', $gt: '' } },
  }
)
```

#### Findings:
1. **Partial Filter Validation:**
   - Tested on MongoDB 8.2.7.
   - Excludes `null`, `undefined`, and empty strings `""` from the index.
   - Enforces strict uniqueness across all non-empty strings.
2. **Idempotence:**
   - Repeated index creation calls succeed without error.
3. **Production Index Deployment Recommendation:**
   - Mongoose uses `autoIndex: true` by default in development and production unless explicitly disabled in `mongoose.connect()`.
   - In production environments where databases have millions of records or strict deployment gates, relying on background `autoIndex` can risk silent failures if unhandled index errors occur.
   - **Recommendation:** In the deployment script / entrypoint, invoke an explicit `await User.syncIndexes()` or run a pre-deployment migration step to ensure index creation completes before routing live traffic.

---

### 2.5 Authentication Route & Middleware Audit
**Verdict: PASS (with 1 Minor Observation)**

#### Endpoints Inspected in `auth.routes.js`:
- `POST /api/v1/auth/google` (Google ID-token signup & login)
- `POST /api/v1/auth/login` (Standard username/password login)
- `POST /api/v1/auth/admin-login` (Admin-only username/password login)
- `POST /api/v1/auth/signup` (Officer roster signup)
- `POST /api/v1/auth/refresh` (Token refresh)
- `POST /api/v1/auth/logout` (Logout & token revocation)
- `GET /api/v1/auth/me` (Authenticated profile read)

#### Findings:
1. **Admin Isolation:** No route exists through which a Google authentication request can yield an administrator JWT.
2. **Password Portals:** Both `/admin-login` and `/login` continue to function seamlessly for password-based logins.
3. **Session Contracts:** Responses return `{ user, accessToken }` in the JSON body and set a secure HttpOnly `refreshToken` cookie.
4. **Minor Observation (Legacy Cookie Clear Path):**
   - In `refresh` (line 597) and `logout` (line 623), `res.clearCookie('refreshToken', { path: '/api/auth' })` specifies `path: '/api/auth'`.
   - However, `issueTokenPair` sets the cookie with `path: '/'` (from `COOKIE_OPTIONS`).
   - Consequently, calling logout or expired refresh clears the path `'/api/auth'`, leaving the root cookie to expire naturally or be overwritten.
   - *Impact:* Low (local storage tokens are cleared on the client, and the refresh token is revoked in the database).
   - *Recommendation:* Normalize `clearCookie` to `{ path: '/' }` during the next scheduled cleanup.

---

### 2.6 Test Coverage & Quality Assessment
**Verdict: PASS**

#### Test Quality Analysis:
1. **Realistic Database Constraints:**
   - Tests run against a live local MongoDB instance (`kaushalai_test`).
   - Real unique indexes (`email_1` and `googleSub_1`) are created and enforced by the database engine.
   - Real bcrypt hashing, JWT signing/verifying, and Express routing are exercised over live HTTP sockets.
2. **Mock Scope:**
   - Only Google's third-party ID token verification (`_googleClient.verifyIdToken`) is mocked using controlled ticket fixtures. This is standard and required to test signature failures, expired tokens, wrong issuers, and wrong audiences without external internet latency or Google rate limits.
   - All internal application logic, models, controllers, and indexes run 100% genuine code.
3. **Test Counts:**
   - Stage 1 suite: `13/13 Passed (100%)`.
   - Stage 2 suite: `20/20 Passed (100%)`.
   - Full regression suite: `27/27 Suites Passed (100%)`.
   - Client production build: `Compiled cleanly in 3.26s`.

---

## 3. Confirmed Defects & Severity Table

| Item | Description | Severity | Remediation Strategy |
| :---: | :--- | :---: | :--- |
| **DEF-01** | `clearCookie` in `logout()` and `refresh()` specifies `{ path: '/api/auth' }` while `issueTokenPair()` sets `{ path: '/' }`. | **LOW (Trivial)** | Change `clearCookie` options in `auth.controller.js` to `{ path: '/' }` in Part 32.1.6. |
| **REC-01** | Reliance on Mongoose `autoIndex` in production without an explicit startup `syncIndexes()` step. | **INFORMATIONAL** | Add explicit `await User.syncIndexes()` in server startup or deployment migration script. |

---

## 4. Scope Boundary Verification

- [x] No application source code was modified during this audit.
- [x] No database records were written or modified.
- [x] Development database `kaushalai` remains 100% untouched.
- [x] No index creation or deletion on production/dev databases.
- [x] Frozen modules (certificates, competencies, achievements, learning path) untouched.
- [x] Part 32.1.6 has not been started.

**Conclusion:** Part 32.1.4 is verified safe, backward-compatible, and architecturally ready for Part 32.1.6 (Authentication UX Simplification).

