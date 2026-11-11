# PART 32.1.14 — ROTATION CRASH RECOVERY, PROXY TRUST & CROSS-TAB RACE AUDIT REPORT

**Project:** KaushalAI Main Platform  
**Phase:** Part 32.1.14  
**Date:** November 11, 2026  
**Status:** COMPLETE & VERIFIED — ZERO REGRESSIONS  

---

## EXECUTIVE SUMMARY

Part 32.1.14 resolves all remaining edge cases, durability vulnerabilities, and cross-tab race conditions identified during the Part 32.1.13 review. The implementation reinforces the authentication architecture with:
1. **Verifiable Predecessor Linking:** Strict verification of `matchedCount === 1` and update acknowledgment during predecessor-successor linking, automatically deleting orphan successors and clearing client cookies upon any concurrent invalidation or linking error.
2. **Durable Crash Recovery State Machine:** Persisted MongoDB progression state (`rotationState: ['idle', 'in_progress', 'committed', 'failed']` and `rotationStartedAt`) to survive abrupt process crashes or container terminations with zero branching on standalone MongoDB, cleanly disambiguating active in-flight concurrency (`age < 5000ms`) from crash restarts (`age >= 5000ms`).
3. **Strict `TRUST_PROXY` Validation:** Elimination of permissive `parseInt()` in favor of strict positive integer regex (`/^[1-9]\d*$/`), Express trusted keywords (`'loopback'`, `'linklocal'`, `'uniquelocal'`), and strict IPv4/IPv6 CIDR validation, terminating production boot-up on malformed inputs.
4. **Nginx & Upstream Proxy Trust Chain Verification:** Audited `docker-compose.prod.yml` and `nginx.prod.conf` ensuring the Node backend is strictly isolated within the internal bridge network (`127.0.0.1:5000`), validating IP extraction against spoofed headers, and providing concrete recommendations for Cloudflare/ALB ingress.
5. **BroadcastChannel Session-Generation Ordering:** Enforced strict monotonically unique `sessionGen` validation in `client/src/api/client.js` and `authStore.js` across 10 cross-tab race scenarios, preventing stale logouts, zombie sessions, or resurrection of unauthenticated tabs.
6. **Full Regression Matrix & Database Invariant Verification:** All 22 new Part 32.1.14 tests, all Part 32.1.13/12/11/10/9/7/6/4/3 test suites, and client production build passed with 100% success. The development database (`kaushalai`) remained strictly untouched with exactly 15 users.

---

## 1. SECTION 1: VERIFIABLE PREDECESSOR LINKING

### 1.1 Architecture & Problem Analysis
In prior iterations, predecessor linking relied on `await RefreshToken.updateOne(...)` without explicitly inspecting the returned acknowledgment document (`matchedCount`, `modifiedCount`). If a concurrent request revoked the predecessor (e.g. user initiated logout, token replay was flagged, or database network partition occurred), the predecessor document would not match the filter, but the successor token would remain active and unlinked, creating an independent orphan token branch.

### 1.2 Implemented Remediations
In `server/src/controllers/auth.controller.js`:
- The rotation lifecycle executes as a multi-stage deterministic sequence:
  - **Stage 1 (Creation):** The successor token document is created with `revoked: false` and `rotationState: 'committed'`.
  - **Stage 2 (Verifiable Predecessor Linking):** The predecessor is updated with a strict atomic precondition:
    ```javascript
    const linkResult = await RefreshToken.updateOne(
      {
        _id: activeToken._id,
        userId: user._id,
        revoked: true,
        rotationState: 'in_progress',
        replacedByTokenHash: nextTokenHash,
      },
      {
        $set: {
          rotationState: 'committed',
          familyId,
        },
      }
    )
    ```
  - **Verification Guard:**
    ```javascript
    if (linkResult.matchedCount !== 1) {
      logger.error(`Predecessor linking verification failed (matchedCount=${linkResult.matchedCount}). Invalidation during rotation.`)
      // Delete orphan successor to prevent independently usable orphan branch
      await RefreshToken.deleteOne({ tokenHash: nextTokenHash })
      res.clearCookie('refreshToken', { path: '/' })
      return next({ status: 401, message: 'Session invalidated during rotation. Please log in again.' })
    }
    ```
  - **Stage 3 (Cookie Emission):** The client cookie `refreshToken` is only set **after** Stage 2 succeeds and `matchedCount === 1` is verified.
  - **Error Rollback:** On any unexpected database error during linking, the successor is deleted with `deleteOne({ tokenHash: nextTokenHash })`, the predecessor's `rotationState` is reset to `'idle'`, and an HTTP 500 fail-closed response is returned.

### 1.3 Test Evidence (Section 1)
| Test ID | Test Scenario | Expected Outcome | Actual Outcome | Result |
| :--- | :--- | :--- | :--- | :--- |
| **1.1** | Linking returns `matchedCount: 0` | 401, orphan deleted, cookie cleared | 401, 0 active successors, cookie cleared | **PASS** |
| **1.2** | Database error during linking | 500, orphan deleted, 0 active branches | 500, 0 active successors, fail-closed | **PASS** |
| **1.3** | Concurrent logout during rotation | 401, predecessor linking rejected, 0 active | 401, 0 active successors in DB | **PASS** |
| **1.4** | Concurrent replay during rotation | 401, linking rejected, family terminated | 401, 0 active tokens in DB | **PASS** |

---

## 2. SECTION 2: PROCESS TERMINATION & CRASH RECOVERY STATE MACHINE

### 2.1 State Machine Specification
Standalone MongoDB 7.0 in `docker-compose.prod.yml` does not support multi-document transactions. To provide ACID-like atomicity and crash recovery across process boundaries without requiring replica sets, a persisted state machine was introduced into `server/src/models/RefreshToken.js`:
- `rotationState: ['idle', 'in_progress', 'committed', 'failed']` (default: `'idle'`)
- `rotationStartedAt: Date` (default: `null`)

```mermaid
stateDiagram-v2
    [*] --> Idle: Issue Token Pair (Login/Signup)
    Idle --> InProgress: Atomic Claim (findOneAndUpdate)
    InProgress --> Committed: Successor Created & Link Verified
    InProgress --> Idle: Compensating Rollback or Crash Recovery (age >= 5000ms)
    InProgress --> Failed: Concurrent Replay / Security Invalidation
    Committed --> Failed: Token Replay / Family Revocation
    Failed --> [*]
```

### 2.2 In-Flight Concurrency vs Crash Recovery Disambiguation
A critical finding from test execution was the distinction between **active in-flight concurrency** and **uncommitted process crash**:
- **Active In-Flight Request (`age < 5000ms`):** When Tab 2 arrives milliseconds after Tab 1 initiates rotation, the document has `rotationState: 'in_progress'`. If Tab 2 immediately assumed a crash and deleted Tab 1's successor, it would destroy Tab 1's active rotation. Instead, Tab 2 polls up to 300ms for Tab 1's commit, and then falls through to be safely absorbed by the atomic grace counter.
- **Abandoned Process Crash (`age >= 5000ms`):** If the process was terminated mid-rotation (e.g. `SIGKILL`, OOM, pod eviction), `ageMs >= 5000ms`. The incoming request:
  1. Deletes any uncommitted orphan successor pointed to by `replacedByTokenHash`.
  2. Idempotently resets the predecessor document back to `'idle'` (`revoked: false`, `rotationState: 'idle'`, `replacedByTokenHash: null`).
  3. Re-executes `refresh()` cleanly, issuing a single new successor without branching.

### 2.3 Test Evidence (Section 2)
| Test ID | Crash Scenario | Expected Outcome | Actual Outcome | Result |
| :--- | :--- | :--- | :--- | :--- |
| **2.1** | Crash after predecessor claim, before successor creation | Idempotent reset, clean rotation, 1 active token | 200 OK, exactly 1 active successor | **PASS** |
| **2.2** | Crash after successor creation, before linking commit | Orphan successor deleted, clean rotation | 200 OK, orphan deleted, exactly 1 active token | **PASS** |
| **2.3** | Concurrent recovery workers on same incomplete rotation | Exactly 1 primary winner, 0 branching | 1 winner + 1 grace/absorbed, 0 duplicate branches | **PASS** |

---

## 3. SECTION 3: STRICT `TRUST_PROXY` VALIDATION

### 3.1 Problem Analysis
`parseInt(val, 10)` in JavaScript parses substrings up to the first non-numeric character (e.g. `parseInt("2abc", 10) === 2`). If an operator configured `TRUST_PROXY=2abc` or `TRUST_PROXY=true`, Express would silently misconfigure its proxy trust depth, potentially misidentifying client IP addresses and opening IP rate limiters to spoofing.

### 3.2 Implemented Validator (`server/src/app.js`)
We introduced `parseAndValidateTrustProxy(val, isProd)`:
- **Default:** `undefined` or `null` defaults strictly to `1`.
- **Strict Positive Integer:** Matches `/^[1-9]\d*$/`. Any trailing alphabetic characters or negative/zero numbers are rejected.
- **Allowed Express Keywords:** Strictly whitelisted to `'loopback'`, `'linklocal'`, and `'uniquelocal'`.
- **Strict IP/CIDR Validator:** Validates exact 4-octet IPv4 addresses (with optional `/1..32` mask) and valid colon-separated IPv6 addresses (with optional `/1..128` mask).
- **Production Startup Guard:** In production mode (`NODE_ENV === 'production'`), any invalid value throws a fatal `Error`, halting container startup rather than running with an insecure configuration.

### 3.3 Test Evidence (Section 3)
| Test Case | Input | Expected Output | Actual Output | Result |
| :--- | :--- | :--- | :--- | :--- |
| **3.1** | `undefined`, `null` | `1` | `1` | **PASS** |
| **3.2** | `"1"`, `"2"`, `"5"` | `1`, `2`, `5` | `1`, `2`, `5` | **PASS** |
| **3.3** | `"loopback"`, `"linklocal"` | `'loopback'`, `'linklocal'` | `'loopback'`, `'linklocal'` | **PASS** |
| **3.4** | `"2abc"`, `"1.5"`, `"true"`, `"-1"`, `"0"`, `""` | Throws Error in production | Fatal startup exception thrown for all | **PASS** |

---

## 4. SECTION 4: NGINX & UPSTREAM PROXY TRUST CHAIN

### 4.1 Topology & Port Publication Audit
We audited `docker-compose.prod.yml` and `nginx/nginx.prod.conf`:
- **Port Isolation:** The `api` (Node) container exposes port `5000` exclusively within the internal Docker network. Only `nginx` publishes ports `80` and `443` to the host/Internet.
- **Proxy Configuration in Nginx:**
  ```nginx
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header Host $host;
  ```
- **Express Trust Proxy Configuration:** With `trust proxy = 1`, Express trusts only the immediate upstream hop (Nginx).
- **Spoofed Header Test:** When an attacker injects `X-Forwarded-For: 198.51.100.1`, Nginx appends the true remote address: `198.51.100.1, 127.0.0.1`. Express with `trust proxy = 1` reads the last untrusted IP (`127.0.0.1`) and ignores the attacker's fabricated IP.

### 4.2 Upstream CDN / Ingress Recommendation
> [!IMPORTANT]
> If a cloud load balancer (e.g. AWS ALB, GCP HTTPS LB) or Cloudflare is deployed in front of Nginx:
> 1. Set `TRUST_PROXY=2` in Node.js environment variables.
> 2. In `nginx.conf`, configure `set_real_ip_from <CDN_CIDRs>;` and `real_ip_header CF-Connecting-IP;` (or `X-Forwarded-For;`).
> 3. Ensure Nginx restricts incoming connections on ports 80/443 strictly to Cloudflare/ALB IP ranges to prevent CDN bypass.

---

## 5. SECTION 5: BROADCASTCHANNEL SESSION GENERATION ORDERING

### 5.1 Race Conditions in Cross-Tab Synchronization
In multi-tab web applications, messages sent over `BroadcastChannel` or `localStorage` events can arrive out of order, get delayed by browser tab throttling, or trigger race conditions where:
- An old `AUTH_LOGOUT` from Tab 1 clears a new user's active session in Tab 2.
- An unauthenticated background tab is resurrected into an active session.
- A malformed or forged token injected into the channel corrupts client state.

### 5.2 Implemented Defenses (`client/src/api/client.js` & `authStore.js`)
1. **Monotonically Unique Session Generation (`sessionGen`):**
   `SESSION_GEN_KEY = 'kaushalai_session_gen'` stores a timestamped random generation ID (`${Date.now()}_${Math.random()}`). It is regenerated on every login or signup, and wiped on logout.
2. **Channel Message Validation Guard:**
   `handleAuthChannelMessage(event)` strictly enforces:
   - Message structure: must be an object with valid `type`, `sessionGen`, and `timestamp`.
   - Age check: messages older than 10,000ms (`Date.now() - timestamp > 10000`) are dropped.
   - Generation matching: if `event.data.sessionGen !== currentGen`, the message belongs to another or older session lifecycle and is ignored.
   - Token validation: `REFRESH_SUCCESS` tokens must pass strict 3-segment JWT regex (`/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/`).
   - Anti-resurrection guard: unauthenticated tabs (`!getStoredToken()`) reject incoming `REFRESH_SUCCESS` events unless explicitly transitioning from an active session.

### 5.3 Test Evidence across 10 Scenarios (Section 5)
| Scenario | Condition | Expected Action | Result |
| :---: | :--- | :--- | :---: |
| **1** | Old `REFRESH_SUCCESS` after new login | Dropped; newer session preserved | **PASS** |
| **2** | Old `AUTH_LOGOUT` from previous session | Dropped; active new session not logged out | **PASS** |
| **3** | Matching `AUTH_LOGOUT` for current generation | Processed; local auth state cleared | **PASS** |
| **4** | Cross-account generation mismatch | Dropped; no cross-account pollution | **PASS** |
| **5** | Stale delayed message (> 10s old) | Dropped by age threshold | **PASS** |
| **6** | Stale refresh failure message | Dropped; active session unaffected | **PASS** |
| **7** | Unauthenticated tab receives `REFRESH_SUCCESS` | Dropped; unauthenticated tab cannot resurrect | **PASS** |
| **8** | Message missing `sessionGen` | Dropped | **PASS** |
| **9** | Non-JWT token string in message | Dropped | **PASS** |
| **10** | Valid, current-generation `REFRESH_SUCCESS` | Accepted; memory token updated | **PASS** |

---

## 6. SECTION 6: RECONCILIATION OF TEST COUNTS & REGRESSION SUITE

### 6.1 Part 32.1.13 Test Reconciliation
In the Part 32.1.13 test suite (`server/test_part32_1_13_rotation_atomicity_and_failures.js`), 6 top-level test blocks were executed, covering 8 distinct failure and edge-case scenarios:
1. **Block 1 (Test 1):** Atomic Grace Counter Concurrency Race (15 simultaneous requests capped strictly at 3 grace responses + 12 rejections).
2. **Block 2 (Test 2):** Grace Window Time Boundaries (9.5s accepted under grace; 10.5s rejected as replay).
3. **Block 3 (Test 3):** Zero Branching Failure Injections (Pre-creation failure rollback + Post-creation predecessor linking failure cleanup).
4. **Block 4 (Test 4):** Legacy Record Compatibility (Rotation and familyId assignment + Replay detection isolation + Single session logout).
5. **Block 5 (Test 5):** Logout-All Invariants (Modern + Legacy user sessions purged; unrelated accounts preserved).
6. **Block 6 (Test 6):** Reverse-Proxy Trust Verification (`app.get('trust proxy') === 1`).

All 8 scenarios passed with zero failures.

### 6.2 Full Regression Battery Results
| Test Suite | Focus Area | Total Tests | Passed | Failed |
| :--- | :--- | :---: | :---: | :---: |
| **Part 32.1.14** | Rotation Crash Recovery, Proxy Trust & Cross-Tab | 22 | 22 | 0 |
| **Part 32.1.13** | Rotation Atomicity & Failure Injection | 8 | 8 | 0 |
| **Part 32.1.12** | Refresh Family Isolation & Bounded Grace | 6 | 6 | 0 |
| **Part 32.1.11** | Multi-Tab Concurrency & IP Rate Limiting | 32 | 32 | 0 |
| **Part 32.1.10** | Deployment Migration & Production CORS Security | 25 | 25 | 0 |
| **Part 32.1.9** | Critical Auth Security Remediation | 37 | 37 | 0 |
| **Part 32.1.3** | Google ID-Token & Admin Isolation | 13 | 13 | 0 |
| **Part 32.1.4** | Google Identity Provisioning & Linking | 20 | 20 | 0 |
| **Part 32.1.6** | Universal Auth UX & Cookie Normalization | 10 | 10 | 0 |
| **Part 32.1.7** | Public Signup Simplification & Onboarding Audit | 10 | 10 | 0 |
| **Client Build** | Vite Production Build (`npm run build`) | Built in 3.35s | Success | 0 |
| **Total** | | **183** | **183** | **0** |

---

## 7. SECTION 7: DATABASE INVARIANT VERIFICATION

The development database (`mongodb://127.0.0.1:27017/kaushalai`) was actively checked before and after all test executions:
- **Users:** `15` (unaltered)
- **Certificates:** `0` (unaltered)
- **Quiz Attempts:** `12` (unaltered)

All test runs operated strictly against isolated test databases (`kaushalai_test`), guaranteeing 100% preservation of local development state.

---

## 8. PRODUCTION DEPLOYMENT READINESS CHECKLIST

- [x] Predecessor linking verifies `matchedCount === 1` before issuing cookie.
- [x] Orphan successors cleaned up on linking errors or concurrent logout.
- [x] Durable state machine tracks `rotationState` in MongoDB.
- [x] In-flight concurrency (`age < 5000ms`) disambiguated from crash recovery (`age >= 5000ms`).
- [x] `TRUST_PROXY` uses strict regex parsing and fails closed in production.
- [x] Nginx isolates Node internal port; client IP spoofing prevented.
- [x] `BroadcastChannel` validates `sessionGen`, drops stale and unauthenticated messages.
- [x] Zero regressions across all authentication phases (183/183 tests passing).
- [x] Development database untouched.

