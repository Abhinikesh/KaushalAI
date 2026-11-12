# Phase 36.2.3.1: Quiz Relationship Cardinality & Access-Control Closure

**Phase:** 36.2.3.1 — Quiz Relationship Cardinality & Access-Control Verification  
**Predecessor:** Phase 36.2.3  
**Status:** Complete & Verified on `kaushalai_test` (`kaushalai` dev DB untouched)  
**Test Database:** `mongodb://127.0.0.1:27017/kaushalai_test`

---

## 1. Relationship Cardinality Decision and Evidence

**Decision:** **Option B — One-to-Many (`Course` 1 → N `Quiz`)**

**Evidence from the KaushalAI codebase and data model:**
1. **Multi-module courses (`Course.js`):** [`server/src/models/Course.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/models/Course.js) defines `modules: [moduleSchema]`, allowing a single course to contain multiple modules (`_id: true, title, durationMins, youtubeUrl, slides`). Supporting module-level quizzes, practice quizzes, and final/comprehensive assessments per course is a legitimate product requirement.
2. **No pre-existing 1:1 requirement:** Codebase search confirmed that `DUPLICATE_COURSE_QUIZ` and `quiz_courseId_unique_objectid` only existed from Phase 36.2.3. No product spec, model, or controller in KaushalAI required restricting a course to a single quiz.
3. **API & frontend readiness:** `GET /api/quizzes?courseId=...` ([`mcq.controller.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/mcq.controller.js), [`quizCourse.service.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/quizCourse.service.js)) already returns an array `quizzes: [...]`, and [`client/src/api/quiz.api.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/api/quiz.api.js) (`getQuizByCourse`) consumes `quizzes[0]` as a UI convenience for [`CourseProgressPage.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.jsx) without requiring database uniqueness.
4. **Live `kaushalai.quizzes` baseline:** Before Phase 36.2.3, `kaushalai.quizzes` used non-unique index `courseId_1` and already contained multiple topic-level quizzes (e.g. multiple Python Data Analysis quizzes alongside a comprehensive assessment).

Accordingly, the 1:1 uniqueness restriction (`quiz_courseId_unique_objectid` and `DUPLICATE_COURSE_QUIZ`) was removed.

---

## 2. Index Analysis & Migration Plan

Inspected indexes on `quizzes` in both `kaushalai` and `kaushalai_test`:

| Environment | Before Phase 36.2.3.1 | After Phase 36.2.3.1 |
|---|---|---|
| `kaushalai` | `_id_`, `createdBy_1`, `courseId_1` (non-unique) | `_id_`, `createdBy_1`, `courseId_1` (non-unique) — untouched |
| `kaushalai_test` | `_id_`, `createdBy_1`, `courseId_1`, `quiz_courseId_unique_objectid` (unique partial) | `_id_`, `createdBy_1`, `courseId_1` (non-unique) |

- **Are both `courseId_1` and `quiz_courseId_unique_objectid` necessary?** No. Under Option B (one-to-many), `quiz_courseId_unique_objectid` is removed; only the non-unique `courseId_1` index (`index: true` on `Quiz.courseId`) is needed for `Quiz.find({ courseId })` queries.
- **Controlled migration:** For any environment where `quiz_courseId_unique_objectid` was created, drop only that index via `Quiz.collection.dropIndex('quiz_courseId_unique_objectid')` (never `syncIndexes()`). `kaushalai` never had `quiz_courseId_unique_objectid`, so no dev DB index change was needed.
- **Legacy string `courseId` readability:** Read-only `Quiz.collection` scans (`reconcile_quiz_course_relationships.js`) and `Quiz.findOne` / `Quiz.find` queries on `kaushalai` remain safe; `updateQuiz` continues rejecting un-cleared invalid legacy strings (`400 INVALID_LEGACY_COURSE_REFERENCE`) until normalized or cleared to `null`.
- **Target environment initialization:** Mongoose schema `courseId: { type: Schema.Types.ObjectId, ref: 'Course', default: null, index: true }` initializes `courseId_1` (non-unique) without creating any unique partial index.

---

## 3. Course-Context Access Policy

Audited all quiz endpoints in [`mcq.routes.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/routes/mcq.routes.js), [`mcq.controller.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/mcq.controller.js), [`quizAttempt.controller.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/quizAttempt.controller.js), and [`quizCourse.service.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/quizCourse.service.js):

- **Explicit `courseId` provided** (`GET /api/quizzes/:id?courseId=...`, `POST /api/quizzes/:id/start-attempt`, `POST /api/quizzes/:id/attempts`):
  - Resolves `courseId` against active `Course`; rejects missing (`404 COURSE_NOT_FOUND`), archived (`409 COURSE_ARCHIVED`), or unpublished non-admin (`400 COURSE_UNPUBLISHED`).
  - Strictly enforces `quiz.courseId === course._id`; rejects mismatches and standalone quizzes called with a `courseId` (`403 QUIZ_COURSE_MISMATCH`).
- **Direct access without `courseId`** (supported for learners opening `/quizzes/:id` from `QuizListPage` or existing integrations):
  - Standalone quizzes (`courseId: null`) work independently.
  - Course-linked quizzes **must still validate the linked course** (never reinterpreted as standalone and never bypassing course availability):
    - Missing linked course → `404 COURSE_NOT_FOUND`
    - Archived (`isDeleted === true || isArchived === true`) → `409 COURSE_ARCHIVED`
    - Unpublished (`isPublished === false` for non-admin) → `400 COURSE_UNPUBLISHED`
- **Attempt ownership & quiz-binding:**
  - `GET /api/quizzes/attempts/:attemptId` enforces `userId` ownership (`404` for other learners).
  - `POST /api/quizzes/:id/attempts` validates that any caller-supplied `attemptId` belongs to the target `quiz` (`403 ATTEMPT_QUIZ_MISMATCH` otherwise).

---

## 4. Direct API Access Test Results (`test_part36_2_3_1_quiz_cardinality_access.js`)

Executed [`server/test_part36_2_3_1_quiz_cardinality_access.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/test_part36_2_3_1_quiz_cardinality_access.js) on `kaushalai_test`: **`12 Passed, 0 Failed`** (exit code `0`):

1. **Cardinality (Option B):** One course accepts multiple linked quizzes and `GET /api/quizzes?courseId=...` returns all of them (`200`, count `2`).
2. **Scenario 1:** Linked quiz with correct `courseId` context succeeds across `getQuiz`, `start-attempt`, `attempts`, and `attempts/:id`.
3. **Scenario 2:** Linked quiz with incorrect `courseId` context rejected (`403 QUIZ_COURSE_MISMATCH`) across `getQuiz`, `start-attempt`, and `attempts`.
4. **Scenario 3:** Linked quiz with no `courseId` context allowed for active published course and preserves 70% pass threshold (`50% -> passed: false`).
5. **Scenario 4:** Standalone quiz (`courseId: null`) with no `courseId` context works independently.
6. **Scenario 5:** Standalone quiz with unrelated `courseId` context rejected (`403 QUIZ_COURSE_MISMATCH`).
7. **Scenario 6:** Linked quiz whose course is archived blocked both with `?courseId=` and on direct call without `courseId` (`409 COURSE_ARCHIVED`).
8. **Scenario 7:** Linked quiz whose course is unpublished blocked for learners both with `?courseId=` and on direct call without `courseId` (`400 COURSE_UNPUBLISHED`); admin allowed (`200`).
9. **Scenario 8:** Cross-learner `GET /api/quizzes/attempts/:attemptId` blocked (`404`).
10. **Scenario 9:** Submitting `attemptId` belonging to another quiz rejected (`403 ATTEMPT_QUIZ_MISMATCH`) with original `QuizAttempt` untouched.
11. **Scenario 10:** Direct API call on broken course link rejected (`404 COURSE_NOT_FOUND`), never reinterpreted as standalone.
12. **Preservation:** Passing linked quiz does not bypass Phase 36.2.2 `LearningProgress` or auto-issue course `Certificate` documents.

---

## 5. Code & Index Changes Made

Two security/access-control bypasses were discovered during verification and fixed alongside the Option B cardinality update:

1. **[`server/src/controllers/mcq.controller.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/mcq.controller.js):**
   - Fixed `getQuiz` so `validateQuizCourseContext` is **always** executed (previously skipped when `req.query.courseId` was omitted, allowing direct `GET /api/quizzes/:id` on archived/unpublished linked courses).
   - Removed `DUPLICATE_COURSE_QUIZ` (`11000`) handlers from `createQuiz` and `updateQuiz`.
2. **[`server/src/services/quizCourse.service.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/quizCourse.service.js):**
   - Strengthened `validateQuizCourseContext` when `courseId` is omitted: enforces `!linkedCourse` (`404 COURSE_NOT_FOUND`), `isDeleted || isArchived` (`409 COURSE_ARCHIVED`), and `!isAdmin && !isPublished` (`400 COURSE_UNPUBLISHED`).
   - Removed `DUPLICATE_COURSE_QUIZ` uniqueness check from `validateQuizCourseAssignment`.
3. **[`server/src/controllers/quizAttempt.controller.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/quizAttempt.controller.js):**
   - Added `ATTEMPT_QUIZ_MISMATCH` (`403`) guard in `submitAttempt` so an `attemptId` from Quiz A cannot be submitted against Quiz B.
4. **[`server/src/models/Quiz.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/models/Quiz.js):**
   - Removed `quiz_courseId_unique_objectid` unique partial index; retained non-unique `courseId_1`.
5. **[`server/scripts/reconcile_quiz_course_relationships.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/scripts/reconcile_quiz_course_relationships.js):**
   - Removed 1:1 `AMBIGUOUS_MATCH` conflict rejection for multiple quizzes targeting the same `Course._id`; kept `AMBIGUOUS_MATCH` only when multiple active `Course` docs share an `externalCourseId`.
6. **[`server/test_part36_2_3_quiz_course_relationship_integrity.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/test_part36_2_3_quiz_course_relationship_integrity.js):**
   - Updated checks 6–8 and 20 to verify Option B (one-to-many) and controlled drop of `quiz_courseId_unique_objectid` on `kaushalai_test`.

---

## 6. Regression Test & Build Results

| Check | Result | Exit Code |
|---|---|---|
| `test_part36_2_3_1_quiz_cardinality_access.js` | `12 Passed, 0 Failed` | `0` |
| `test_part36_2_3_quiz_course_relationship_integrity.js` | `24 Passed, 0 Failed` | `0` |
| `test_part36_2_2_server_authoritative_completion.js` | Passed | `0` |
| `test_part36_2_1_enrollment_progress_integrity.js` | Passed | `0` |
| `test_part22_learning_path_progression.js` | Passed | `0` |
| `test_part35_3_assessment_competency_integrity.js` | Passed | `0` |
| `test_part24_2_certificates.js` | Passed | `0` |
| `test_part33_learner_ux_and_navigation.js` | `54 Passed, 0 Failed` | `0` |
| `node scripts/reconcile_quiz_course_relationships.js --dry-run` (`kaushalai`) | `totalQuizzes:18, INVALID_REFERENCE:6, NO_MATCH:12, appliedCount:0` | `0` |
| `cd client && npm run build` (`vite v6.4.3`) | `2747 modules transformed`, built in `3.29s` | `0` |

---

## 7. Development DB (`kaushalai`) Before/After Counts

| Collection | Before | After |
|---|---|---|
| `quizzes` | `18` | `18` |
| `courses` | `66` | `66` |
| `quizattempts` | `12` | `12` |
| `enrollments` | `10` | `10` |
| `learning_progress` | `10` | `10` |
| `learning_activities` | `0` | `0` |
| `certificates` | `0` | `0` |
| `user_competencies` | `41` | `41` |
| `skill_gaps` | `264` | `264` |

Zero documents or indexes in `kaushalai` were modified.

---

## 8. Remaining Limitations

- All `18` existing quizzes in `kaushalai` remain unlinked (`12 NO_MATCH`, `6 INVALID_REFERENCE` for `"C01"`–`"C06"`) until manually mapped or seeded with verified `Course._id` links.
- [`CourseProgressPage.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.jsx) currently surfaces the most recent linked quiz (`quizzes[0]` from `getQuizByCourse`); multi-quiz selector UI for courses with multiple quizzes (module vs final) is deferred to future UI work.

---

## 9. Final Verdict

**PASS — Ready for review.** Quiz-to-course cardinality is now cleanly **one-to-many (Option B)** without unnecessary unique index constraints, and all 10 course-context / direct-access / cross-quiz attempt bypass vectors are closed and verified on `kaushalai_test` with zero impact to `kaushalai`. Stopped prior to Phase 36.2.4.

