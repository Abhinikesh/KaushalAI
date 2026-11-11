# KaushalAI — Phase 35.1 Report: Safe Competency Reconciliation & Assessment History Backend

**Phase:** 35.1 (Workstreams A & D Backend Foundation)  
**Scope:** Backend & Database Migration/Verification Scripts Only (No Frontend Changes)  
**Status:** Complete & Verified on `kaushalai_test`; `kaushalai` Dev Database Unmodified

---

## 1. Files Modified & Added

### Modified Backend Source Files
1. `server/src/models/AssessmentAttempt.js` — Added compound history index `{ user_id: 1, completed_at: -1, started_at: -1 }`.
2. `server/src/models/QuizAttempt.js` — Added compound history index `{ userId: 1, completedAt: -1, attemptedAt: -1 }`.
3. `server/src/services/competency.service.js` — Added and exported `normalizePopulatedUserCompetency(doc)`.
4. `server/src/controllers/admin.controller.js` — Updated `getComposedOfficerProfile` to query `{ $or: [{ user_id: { $in: userQueryIds } }, { userId: { $in: userQueryIds } }] }`, `.populate('competency_id', 'name category description competencyCode')`, normalize via `normalizePopulatedUserCompetency`, and fix `QuizAttempt` query + sort (`{ completedAt: -1, attemptedAt: -1, startedAt: -1 }`).
5. `server/src/controllers/quizAttempt.controller.js` — Added and exported `getAttemptById` (`GET /api/quizzes/attempts/:attemptId`).
6. `server/src/routes/mcq.routes.js` — Registered `router.get('/quizzes/attempts/:attemptId', authenticate, getAttemptById)` prior to `router.get('/quizzes/:id', authenticate, getQuiz)`.
7. `server/src/controllers/userFeatures.controller.js` — Fixed `.populate('competency_id', ...)` + `normalizePopulatedUserCompetency` in `getMyActivityHistory` (preserving the strict Part 24.2.2.2 `completedAt` rule for quiz attempts), and added/exported `getMyAssessmentHistory`.
8. `server/src/routes/userFeatures.routes.js` — Registered `router.get('/users/me/assessment-history', authenticate, getMyAssessmentHistory)`.

### New Scripts & Verification Suite
9. `server/scripts/reconcile_user_competencies.js` — Standalone guarded competency reconciliation CLI & module (`usercompetencies` -> `user_competencies`).
10. `server/scripts/create_phase35_1_indexes.js` — Explicit non-destructive Phase 35.1 index verification & creation CLI & module (`ensurePhase351Indexes`, `checkUserCompetencyDuplicates`).
11. `server/test_part35_1_reconciliation_and_history.js` — Dedicated Phase 35.1 integration & safety suite executed strictly on `kaushalai_test`.

Unchanged guarantees verified via `git status --short`: Authentication modules (Parts 32.1.1–32.1.18), `skillGap.service.js`, Phase 34 AI Tutor persistence, and all `client/` files were left untouched.

---

## 2. Safe Legacy Competency Reconciliation Design (`reconcile_user_competencies.js`)

- **Standalone & Manual Execution:** Never invoked from `server.js`, `app.js`, or startup seeding (`autoSeed.js`).
- **Default `--dry-run` Mode:** Performs read-only inspection and prints exact counts and per-user actions without writing any database records.
- **Explicit `--apply` Safeguards:**
  - Requires `--target=<dbName>` matching the active connected database name (`TARGET_MISMATCH` otherwise).
  - Requires `--confirm=RECONCILE_USER_COMPETENCIES` (`CONFIRMATION_REQUIRED` otherwise).
  - Refuses protected database names (`kaushalai`, `kaushal_ai`, `kaushalai_prod`, `kaushalai_production`, `production`, `prod`) unless an extra explicit `--allow-protected-db=<dbName>` flag is passed (`PROTECTED_DATABASE_REFUSED` otherwise).
  - Requires a readable JSON backup verified via `verifyLegacyBackupFile()` (exact document count and ID match) before performing any insert (`BACKUP_REQUIRED`, `BACKUP_NOT_FOUND`, `BACKUP_CORRUPT`, `BACKUP_INVALID_FORMAT`). Supports `--create-backup --backup-file=<path>` to generate and immediately verify the backup pre-write.
- **Idempotency & Conflict Resolution:**
  - Validates ObjectIds, numeric levels (`1–5`), allowed `source` enum values, and existence in `users` & `competencies` (invalid/dangling records are classified under `invalidRecords` and skipped).
  - Uses `canonicalCol.updateOne({ user_id, competency_id }, { $setOnInsert: candidateDoc }, { upsert: true })` backed by unique index `{ user_id: 1, competency_id: 1 }`, with explicit `E11000` race handling (`raceSkipped`).
  - Existing canonical pairs are never overwritten; level/source mismatches (such as canonical Level 5 `diagnostic_test` vs legacy Level 4 `self_assessed`) are preserved intact and itemized under `details.conflicts`.
  - Legacy collection `usercompetencies` is never dropped, cleared, or modified (`legacyCollectionPreserved: true`).

---

## 3. SkillGap Synchronization Behavior

- After inserting missing canonical competencies, `reconcileUserCompetencies()` triggers `computeUserSkillGaps(userId)` (from `server/src/services/skillGap.service.js`, which serializes recalculation inside `withUserLock(userId, ...)` cleanly without nesting locks) **only** for users who received at least one newly inserted canonical competency record AND satisfy eligibility checks:
  - `admin` accounts are explicitly excluded (`skippedAdmins`, reason `admin_account_excluded`).
  - Accounts failing `resolveAuthoritativeRole()` fail closed under `skippedUnresolvedRole`.
  - Eligible non-admin learner accounts with resolvable cadre roles are recalculated without altering the canonical SkillGap formula.
- **Per-User Error Isolation:** A SkillGap failure catches the error, marks `{ needs_skillgap_sync: true, skillgap_sync_error, skillgap_sync_requested_at }` on the user document (`deferredLearners`), and preserves all completed competency inserts.

---

## 4. Dry-Run Output on `kaushalai` Development Database

Command executed (read-only `--dry-run`):

```bash
node scripts/reconcile_user_competencies.js --dry-run --uri=mongodb://127.0.0.1:27017/kaushalai
```

Observed output:

```text
  Database              : kaushalai
  Before Canonical      : 41
  Legacy Source         : 25
  Inserted / WouldInsert: 24
  Skipped Existing      : 0
  Conflicts (Preserved) : 1
  Invalid References    : 0
  Race Skipped          : 0
  After Canonical       : 41
  Legacy Preserved      : true
  SkillGap Sync         : synced=1, deferred=0, skippedAdmin=1
```

Confirmed via `--json`:
- Eligible learner `6a9a6797930c5a24ab88d325` (`roleId: 6a9d22653ff82d940b7813d8`): `action: "would_sync"`.
- Admin account `6a971846e3d3f4e706722e3b`: excluded (`reason: "admin_account_excluded"`).
- `afterCanonicalCount` stayed `41` (zero writes performed).

---

## 5. `.populate()` + `.lean()` Fix

Because `UserCompetency` defines camelCase field names as Mongoose aliases on snake_case schema paths (`competency_id`, `user_id`, `current_level`, `last_assessed_at`, `assessment_attempt_id`), Mongoose `.populate('competencyId').lean()` left `competencyId`, `currentLevel`, and `lastAssessedAt` unpopulated/undefined on leaned objects.

Added `normalizePopulatedUserCompetency(doc)` in `server/src/services/competency.service.js`:
- Preserves canonical snake_case properties (`user_id`, `competency_id`, `current_level`, `last_assessed_at`, `assessment_attempt_id`).
- Explicitly mirrors normalized camelCase compatibility properties (`userId`, `competencyId`, `currentLevel`, `lastAssessedAt`, `assessmentAttemptId`, plus `code: rawComp.code ?? rawComp.competencyCode`).
- Applied in both `admin.controller.js` (`getComposedOfficerProfile`) and `userFeatures.controller.js` (`getMyActivityHistory`) after querying `competency_id`.

---

## 6. Single Quiz Attempt Endpoint (`GET /api/quizzes/attempts/:attemptId`)

Implemented `getAttemptById` in `server/src/controllers/quizAttempt.controller.js` and registered before `/quizzes/:id` in `server/src/routes/mcq.routes.js`.

- **Validation & Privacy:** Malformed `attemptId` returns HTTP `400`. Queries strictly with `{ _id: attemptId, userId: { $in: userQueryIds } }`; both missing records and attempts owned by another user return identical HTTP `404` (`Quiz attempt not found.`).
- **Authoritative Response Fields:** Returns `_id`, `quizId`, `quizTitle`, `domain`, `status`, `score`, `passed` (authoritative boolean or `score >= 70` fallback for completed attempts; `null` for `in_progress`/`expired`), `correctCount`, `incorrectCount`, `totalQuestions`, `startedAt`, `completedAt`, `attemptedAt`, `durationSeconds` (computed strictly when completed and `completedAt >= startedAt`, otherwise `null` — never invented), `quizDurationMinutes`, `detailedResults`, and `competencyUpdates`.

---

## 7. Unified Assessment History Endpoint (`GET /api/users/me/assessment-history`)

Implemented `getMyAssessmentHistory` in `server/src/controllers/userFeatures.controller.js` and registered in `server/src/routes/userFeatures.routes.js`.

- **Unified Sources:** Merges `AssessmentAttempt` (`kind: 'diagnostic'`) and `QuizAttempt` (`kind: 'quiz'`) scoped strictly to the authenticated learner (`user_id` / `userId`).
- **Query Options:** Supports `?page=<n>`, `?limit=<n>` (capped at 100), `?type=all|diagnostic|quiz`, and `?includeIncomplete=true` (defaults to `false`).
- **Timestamp & Incomplete Semantics:**
  - By default, `in_progress` and `expired` records are excluded from completed `items` and counted transparently in `meta.inProgressCount` and `meta.expiredCount` (`?includeIncomplete=true` includes them with `isCompleted: false, score: null, passed: null, completedAt: null`).
  - Legacy completed `QuizAttempt` rows without `completedAt` fall back to `attemptedAt` for timeline ordering (`date`) while keeping `completedAt: null` and explicitly flagging `dateIsLegacyFallback: true`. Rows missing all dates keep `date: null`.
- **Backward Compatibility:** `GET /api/users/me/quiz-attempts` (`{ attempts }`) and `GET /api/users/me/activity-history` (Part 24.2.2.2 strict `completedAt` rule returning `date: null` when missing) remain untouched for existing callers.

---

## 8. Database Indexes & Verification Script (`create_phase35_1_indexes.js`)

- **Model Schema Additions:**
  - `QuizAttempt`: `{ userId: 1, completedAt: -1, attemptedAt: -1 }` (`userId_1_completedAt_-1_attemptedAt_-1`).
  - `AssessmentAttempt`: `{ user_id: 1, completed_at: -1, started_at: -1 }` (`user_id_1_completed_at_-1_started_at_-1`).
  - `UserCompetency`: verified unique `{ user_id: 1, competency_id: 1 }` (`user_id_1_competency_id_1`).
- **Explicit Index Script (`scripts/create_phase35_1_indexes.js`):** Defaults strictly to `--dry-run`, never calls `syncIndexes()`, checks `user_competencies` duplicates first (`ABORTED_DUPLICATES_FOUND` if any duplicate pair exists), and requires `--apply --target=<dbName> --confirm=CREATE_PHASE35_1_INDEXES` to build indexes.
- **Dry-Run Check on `kaushalai`:** Verified zero duplicates in `user_competencies`; all 3 target indexes returned `ALREADY_EXISTS` with `status: DRY_RUN_READY`. On `kaushalai_test`, `--apply` created and verified all indexes and subsequent runs returned `ALREADY_EXISTS`.

---

## 9. Verification & Regression Results (`kaushalai_test`)

All test suites ran exclusively against `kaushalai_test`:

| Suite | Result |
| --- | --- |
| `node test_part35_1_reconciliation_and_history.js` | Passed (`A1`–`A6`, `B`, `C`, `D`, `E`, exit `0`) |
| `node test_part17_backend_integrity.js` | `71 PASSED, 0 FAILED` |
| `node test_part22_learning_path_progression.js` | `63 Passed, 0 Failed` |
| `node test_part23_competency_framework.js` | `79 Passed, 0 Failed` |
| `node test_part24_2_certificates.js` | `69 Passed, 0 Failed` |
| `node test_part24_2_2_2_completion_date_integrity.js` | `20 PASSED, 0 FAILED` |
| `npm test` (`test_runner.js` auth suites) | `TOTAL SUITES: 15 \| PASSED: 15 \| FAILED: 0` |

### Development Database (`kaushalai`) Pre/Post Integrity Check

| Collection | Pre-Test Count | Post-Test Count |
| --- | --- | --- |
| `users` | `15` | `15` |
| `user_competencies` | `41` | `41` |
| `usercompetencies` | `25` | `25` |
| `skill_gaps` | `264` | `264` |
| `assessment_attempts` | `7` | `7` |
| `quizattempts` | `12` | `12` |
| `certificates` | `0` | `0` |

Confirmed `0` document mutations in `kaushalai`.

---

## 10. Readiness for Phase 35.2

Phase 35.1 backend foundations for Workstreams A and D are complete, isolated, and regression-verified on `kaushalai_test`. Frontend integration work in Phase 35.2 can now safely consume:
- Populated competency profiles in `GET /api/admin/officers/:id` and `GET /api/users/me/activity-history`.
- Single quiz attempt review data via `GET /api/quizzes/attempts/:attemptId`.
- Unified paginated assessment and quiz history via `GET /api/users/me/assessment-history`.

