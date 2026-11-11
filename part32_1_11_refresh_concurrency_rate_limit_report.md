# PART 32.1.11 — REFRESH TOKEN CONCURRENCY & RATE LIMITER VALIDATION REPORT

**Project:** KaushalAI Main Platform  
**Phase:** Part 32.1.11 — Refresh Concurrency & Rate Limiter Validation  
**Date:** November 11, 2026  
**Status:** IMPLEMENTED, TESTED & VERIFIED  
**Target Environments:** Production, Staging, Local Development (`kaushalai`), Test (`kaushalai_test`)  

---

## 1. Initial Refresh-Token Architecture & Identified Race

### The Multi-Tab Race Condition
Prior to Part 32.1.11, KaushalAI's refresh token rotation logic operated as follows:
1. An incoming refresh request sent a raw token via the `refreshToken` HTTP-only cookie.
2. The controller hashed the token and called `RefreshToken.findOne({ tokenHash })`.
3. If `!stored || stored.revoked || stored.expiresAt < new Date()`, it called `res.clearCookie('refreshToken', { path: '/' })` and returned HTTP 401.
4. If valid, it immediately marked `stored.revoked = true; await stored.save();` and issued a new token pair (`issueTokenPair`).

### Failure Mode in Multi-Tab Sessions
When a user had multiple browser tabs open (e.g., Tab 1 and Tab 2) and their access tokens expired simultaneously:
- Tab 1 sent `POST /api/auth/refresh` with token $T_1$.
- Tab 2 sent `POST /api/auth/refresh` with the same token $T_1$ within a few milliseconds.
- Tab 1 executed first, revoking $T_1$ and creating successor token $T_2$.
- Tab 2 arrived, looked up $T_1$, found `stored.revoked === true`, returned HTTP 401, and executed `res.clearCookie('refreshToken', { path: '/' })`.
- Tab 2's browser cookie jar processed the cookie clearing header, destroying the newly issued $T_2$ session. Both tabs were forcibly and randomly logged out.
- Additionally, if Tab 1 and Tab 2 executed `findOne` concurrently prior to either write completing, both could see `revoked: false`, causing duplicate successor sessions and conflicting cookies.

---

## 2. Rate-Limiter Package API Audit & Implementation

### Package API Inspection
An audit of the installed `express-rate-limit` (v8.7.0) revealed:
- **Root Cause of Part 32.1.10 Warning:** The package exports `ipKeyGenerator(ip, ipv6Subnet = 56)`. The function signature expects a string containing an IP address, **not** an Express `request` object.
- When `keyGenerator: (req) => ipKeyGenerator(req)` was previously passed:
  - `isIPv6(req)` returned `false` because `req` is an object.
  - `ipKeyGenerator` returned `req` as-is.
  - The MemoryStore converted the key to string, yielding `"[object Object]"`.
  - **Critical Flaw:** All client requests collapsed into a single global rate-limit bucket.

### Remediation Applied
In [`server/src/routes/auth.routes.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/routes/auth.routes.js#L13-L35):
```javascript
const getClientIpKey = (req) => {
  const rawIp = req.ip || req.socket?.remoteAddress || '127.0.0.1'
  return ipKeyGenerator(rawIp)
}

const refreshLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            process.env.NODE_ENV === 'production' ? 120 : 5000,
  keyGenerator:   getClientIpKey,
  standardHeaders: true,
  legacyHeaders:  false,
  message: { message: 'Too many refresh requests, please try again later' },
})

router.post('/refresh', refreshLimiter, authController.refresh)
```

Also fixed [`server/src/routes/aiChat.routes.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/routes/aiChat.routes.js#L11-L18) to use `(req) => req.user?.id || ipKeyGenerator(req.ip || req.socket?.remoteAddress || '127.0.0.1')`, fully resolving the `ERR_ERL_KEY_GEN_IPV6` validation warning across the entire backend.

---

## 3. Client-IP & Trusted-Proxy Handling

### Reverse Proxy Configuration
In production environments (such as Render, AWS ALB, Nginx), client requests arrive via reverse proxies. Without configuring `trust proxy`, Express ignores `X-Forwarded-For` and assigns the proxy server's private IP to `req.ip`.

In [`server/src/app.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/app.js#L30-L38):
```javascript
const app = express()

// ── Reverse proxy trust ───────────────────────────────────────────────────────
// In production behind a reverse proxy (Render, AWS ALB, Nginx), trust the first hop
// to extract real client IPs safely for rate limiting and audit logs without trusting arbitrary headers.
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY) {
  const trustValue = process.env.TRUST_PROXY ? (Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY) : 1
  app.set('trust proxy', trustValue)
}
```

### IPv4 & IPv6 Subnet Handling
- **IPv4:** The client IP is preserved as a distinct key (e.g., `'192.168.1.50'`).
- **IPv6:** Using `ipKeyGenerator(rawIp)`, IPv6 addresses within the same `/56` CIDR block are grouped to prevent attackers from rotating across large IPv6 pools to evade rate limits.
- **Independent Buckets:** Verified in test suite: distinct IP addresses receive independent rate-limit quotas.

---

## 4. Final Server-Side Concurrency Strategy

### 1. Atomic Database Claiming
Rather than a non-atomic `findOne` + `save`, token rotation now executes an atomic `findOneAndUpdate`:
```javascript
const now = new Date()
const activeToken = await RefreshToken.findOneAndUpdate(
  {
    tokenHash,
    revoked: false,
    expiresAt: { $gt: now },
  },
  {
    $set: {
      revoked: true,
      revokedAt: now,
    },
  },
  { new: false }
)
```
- MongoDB guarantees that **exactly one** request will match `{ revoked: false }` and update the record.
- Any concurrent request arriving at the same millisecond receives `null` for `activeToken`.

### 2. Primary Rotation Path
The single request that claimed `activeToken`:
- Validates the user (`User.findById(activeToken.userId)` and `user.isActive`).
- Creates a new raw refresh token, hashes it to `nextTokenHash`, and stores the successor record.
- Links the predecessor to the successor:
  `await RefreshToken.updateOne({ _id: activeToken._id }, { $set: { replacedByTokenHash: nextTokenHash } })`
- Sets the new cookie: `res.cookie('refreshToken', rawRefreshToken, COOKIE_OPTIONS)`
- Returns `{ accessToken }`.

### 3. Concurrency Grace Path
Any overlapping request that received `null` from `findOneAndUpdate` queries the token:
```javascript
const existing = await RefreshToken.findOne({ tokenHash })
const isGracePeriod =
  existing &&
  existing.revoked &&
  existing.revokedAt instanceof Date &&
  (now.getTime() - existing.revokedAt.getTime()) <= REFRESH_ROTATION_GRACE_MS
```
If `isGracePeriod` is true (within 20 seconds of the primary rotation):
- Validates the user (`user && user.isActive`).
- Generates a fresh `accessToken` for the calling tab.
- **Crucial Security Guard:** Does **not** clear the cookie jar (`res.clearCookie` is omitted). Does **not** issue a new refresh token (preventing session bifurcation).
- Returns `{ accessToken, grace: true }`.

---

## 5. Client-Side Cross-Tab Coordination

In [`client/src/api/client.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/api/client.js#L40-L105):
A native, zero-dependency `BroadcastChannel` (`kaushalai_auth_sync`) was introduced:
1. When Tab A initiates token refresh:
   `authChannel?.postMessage({ type: 'REFRESH_START', timestamp: Date.now() })`
2. When Tab A receives a new token:
   `authChannel?.postMessage({ type: 'REFRESH_SUCCESS', token: newToken, user: data.user })`
   All other open tabs receive the event, update their local auth store (`_setAuth`), resolve their in-flight request queues, and avoid making redundant HTTP refresh requests.
3. When Tab A encounters an unrecoverable failure:
   `authChannel?.postMessage({ type: 'REFRESH_FAILURE' })`
4. **Security Isolation:** Raw refresh tokens are never transmitted across the channel; only the short-lived access token is shared.
5. **Authoritative Server:** If a tab does not support `BroadcastChannel` or is backgrounded, the server-side atomic rotation and grace window protect the session transparently.

---

## 6. Grace-Window Duration & Security Justification

- **Duration:** Exactly 20,000 ms (20 seconds).
- **Justification:**
  - 20 seconds is sufficient to absorb multi-tab concurrency, slow mobile networks, and retry backoffs.
  - A grace token **cannot** create new refresh tokens; it only receives a short-lived access token.
  - The browser cookie jar retains the successor token issued by the primary tab.
  - An attacker possessing a leaked previous token cannot use the grace window to establish a permanent persistent session because no successor refresh token is issued during grace.

---

## 7. Replay Detection Behavior

If a revoked refresh token is presented **outside** the 20-second grace window:
1. The server identifies this as an unambiguous token theft or replay attempt.
2. The successor token (and any tokens in the active chain) is immediately revoked:
   ```javascript
   if (existing.replacedByTokenHash) {
     await RefreshToken.updateMany(
       {
         $or: [
           { tokenHash: existing.replacedByTokenHash },
           { userId: existing.userId, createdAt: { $gte: existing.createdAt } },
         ],
       },
       { $set: { revoked: true, revokedAt: now } }
     )
   }
   ```
3. The cookie jar is cleared with `Path=/`: `res.clearCookie('refreshToken', { path: '/' })`.
4. The endpoint rejects the request with HTTP 401 `Token reuse detected. Session terminated for security.`.

---

## 8. Logout & Session-Revocation Behavior

In [`server/src/controllers/auth.controller.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/auth.controller.js#L685-L705):
When `logout(req, res)` is called:
```javascript
await RefreshToken.updateOne(
  { tokenHash },
  { $set: { revoked: true, revokedAt: new Date(0) } }
)
res.clearCookie('refreshToken', { path: '/' })
```
- Setting `revokedAt: new Date(0)` (January 1, 1970) ensures that `now - revokedAt` is years in the past.
- **Zero Grace Window:** A logged-out token has zero grace duration and cannot be used by any concurrent tab. Any refresh attempt following logout is rejected immediately with HTTP 401.

---

## 9. Access-Token Lifetime Decision & Recommendation

### Analysis
With the implementation of:
1. Atomic rotation via `findOneAndUpdate`,
2. 20-second multi-tab rotation grace window,
3. Strict successor revocation on replay, and
4. Client-side cross-tab `BroadcastChannel` synchronization,

the multi-tab session invalidation risk has been resolved.

### Recommendation
- **Current Default:** Retain `process.env.ACCESS_TOKEN_EXPIRY || '24h'` during current development to ensure maximum stability across local debugging sessions.
- **Production Recommendation:** For production deployments, configure `ACCESS_TOKEN_EXPIRY=1h` (or `ACCESS_TOKEN_EXPIRY=15m` for high-compliance government environments). The platform's silent refresh queue and multi-tab grace window will seamlessly refresh tokens in the background without user disruption.

---

## 10. Changed Files

| File | Changes Made |
| :--- | :--- |
| `server/src/models/RefreshToken.js` | Added `revokedAt` (`Date`) and `replacedByTokenHash` (`String`) fields; indexed `revoked`. |
| `server/src/routes/auth.routes.js` | Corrected `getClientIpKey` to pass string IP to `ipKeyGenerator`; applied to `authLimiter` and `refreshLimiter`. |
| `server/src/routes/aiChat.routes.js` | Fixed `chatLimiter` keyGenerator to use `ipKeyGenerator`, resolving IPv6 validation warning. |
| `server/src/app.js` | Added `app.set('trust proxy', 1)` in production to ensure accurate client IP extraction behind reverse proxies. |
| `server/src/controllers/auth.controller.js` | Implemented atomic `findOneAndUpdate` rotation, 20-second multi-tab grace window, successor revocation on replay, and instant zero-grace logout. |
| `client/src/api/client.js` | Implemented cross-tab `BroadcastChannel` synchronization for silent refresh events. |
| `server/test_part32_1_11_refresh_concurrency_rate_limit.js` | Comprehensive test suite covering rate limiting, IP key generation, multi-tab concurrency, replay detection, and session state. |
| `server/test_part32_1_10_deployment_migration_security.js` | Updated replay test assertion to test outside the 20-second grace window. |

---

## 11. Test Results & Database-State Assertions

### Dedicated Part 32.1.11 Test Suite
File: `server/test_part32_1_11_refresh_concurrency_rate_limit.js`  
Database: `mongodb://127.0.0.1:27017/kaushalai_test`  
Result: **32 / 32 PASSED** (0 failures).

```
============================================================
PART 32.1.11 REFRESH CONCURRENCY & RATE LIMITER SUITE
============================================================

[Setup] Confirmed dev database kaushalai has exactly 15 users.
[Setup] Test server listening on http://127.0.0.1:58528

--- TASK 1: REFRESH RATE LIMITER & IP KEY GENERATOR ---
  ✓ PASS: IPv4 key remains intact: 192.168.1.50
  ✓ PASS: IPv6 addresses in same /56 share key: 2001:db8:85a3::/56
  ✓ PASS: IPv6 addresses in different subnets produce distinct keys: 2001:db8:85a3::/56 vs 2001:db8:9999::/56
  ✓ PASS: Requests 1..3 below limit return 200
  ✓ PASS: Request 4 exceeding limit returns 429 (Status: 429)
  ✓ PASS: Includes RFC standard RateLimit header
  ✓ PASS: Independent IP receives separate bucket (Status: 200)
  ✓ PASS: Normal login flow unaffected by refresh limiter (Status: 401)

--- TASK 2 & 4: MULTI-TAB REFRESH CONCURRENCY & REPLAY SECURITY ---
  ✓ PASS: Tab 1 refresh succeeds with 200 (Status: 200)
  ✓ PASS: Tab 2 concurrent refresh succeeds with 200 (Status: 200)
  ✓ PASS: Both tabs receive valid access tokens
  ✓ PASS: Exactly one request is the primary rotation winner
  ✓ PASS: The overlapping concurrent request was served via concurrency grace
  ✓ PASS: Primary tab received updated refreshToken cookie
  ✓ PASS: Grace tab response did NOT clear the cookie jar
  ✓ PASS: Zero session duplication: exactly 1 active successor session exists in DB (Found: 1)
  ✓ PASS: Extracted new raw refresh token for subsequent verification
  ✓ PASS: Subsequent refresh with new token succeeds (Status: 200)
  ✓ PASS: All 5 concurrent tab requests succeeded with 200 OK
  ✓ PASS: Exactly 1 request performed the primary rotation (Found: 1)
  ✓ PASS: All other 4 requests absorbed safely via grace (Found: 4)
  ✓ PASS: Database holds exactly 1 active token after 5 concurrent requests (Found: 1)
  ✓ PASS: Replay outside grace window rejected with 401 (Status: 401)
  ✓ PASS: Rejection message indicates replay detection: "Token reuse detected. Session terminated for security."
  ✓ PASS: Cookie cleared with Path=/ upon replay detection
  ✓ PASS: Successor session revoked automatically upon token replay detection
  ✓ PASS: Expired token returns 401 (Status: 401)
  ✓ PASS: Logout returns 200 OK (Status: 200)
  ✓ PASS: Post-logout refresh rejected immediately with 401 (Status: 401)
  ✓ PASS: Inactive user refresh rejected with 401 (Status: 401)
  ✓ PASS: Raw token string is NOT stored as tokenHash
  ✓ PASS: Token is stored exclusively as SHA-256 digest in database

============================================================
SUMMARY: 32 PASSED, 0 FAILED
============================================================
```

---

## 12. Full Regression & Compatibility Results

| Test Suite | Assertions | Status |
| :--- | :--- | :--- |
| `server/test_part32_1_11_refresh_concurrency_rate_limit.js` | 32 / 32 | **PASSED** |
| `server/test_part32_1_10_deployment_migration_security.js` | 25 / 25 | **PASSED** |
| `server/test_part32_1_9_security_remediation.js` | 37 / 37 | **PASSED** |
| `server/test_part32_1_3_google_id_token_admin_isolation.js` | 13 / 13 | **PASSED** |
| `server/test_part32_1_4_google_identity_provisioning.js` | 20 / 20 | **PASSED** |
| `server/test_part32_1_6_auth_ux_simplification.js` | 10 / 10 | **PASSED** |
| `server/test_part32_1_7_public_signup_simplification.js` | 10 / 10 | **PASSED** |
| Backend Regression Loop (Parts 14 to 32) | 27 suites | **PASSED** (0 regressions) |
| Historical Legacy Tests (Parts 10, 12, 13) | 3 suites | **INCOMPATIBLE** (Pre-Part 17 unauthenticated routes) |
| Frontend Production Build (`npm run build`) | Vite v6.4.3 | **PASSED** (Built in 3.23s, 0 errors) |
| Baseline Database (`kaushalai`) Count | 15 users, 0 certs, 12 attempts | **UNMUTATED** (100% preserved) |

---

## 13. Remaining Risks & Deployment Status

- **Code & Architecture:** Complete and verified. Concurrency races, multi-tab logouts, and rate limiter bucket sharing are resolved.
- **Production Google Subject Index Migration:** As mandated by project constraints, the physical `{ googleSub: 1 }` index migration was verified via dry-run and executed against `kaushalai_test`. It has **not** been applied to the production database and must be executed in accordance with the Section 11 Migration Runbook during the scheduled production maintenance window.

