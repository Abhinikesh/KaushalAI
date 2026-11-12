# Phase 36.2.3: Quiz-to-Course Relationship Integrity

**Phase:** 36.2.3 — Quiz-to-Course Relationship Integrity  
**Predecessors:** Phase 36.2.1, Phase 36.2.2, Phase 36.2.2.1  
**Status:** Complete (verified on `kaushalai_test`; `kaushalai` dev DB untouched)  
**Test Database:** `mongodb://127.0.0.1:27017/kaushalai_test`

---

## 1. Objective & Scope

Phase 36.2.3 establishes a canonical, server-validated relationship between `Quiz` and `Course` records without modifying quiz grading, the 70% pass threshold, `tagCompetencyIds`, `UserCompetency`, `SkillGap`, `certificate.service.js`, or authentication.

---

## 2. Architecture & Live `kaushalai` Quiz Inventory Audit

Read-only inspection of `kaushalai.quizzes` (`18` documents) and `reconcile_quiz_course_relationships.js --dry-run` confirmed:

- **Total Quizzes:** `18` (`0` linked to a valid `Course._id`)
- **Indexes on `kaushalai.quizzes`:** `_id_`, `createdBy_1`, `courseId_1` (non-unique)
- **Classification Summary:**
  - `ALREADY_VALID`: `0`
  - `VERIFIED_MATCH`: `0`
  - `AMBIGUOUS_MATCH`: `0`
  - `INVALID_REFERENCE`: `6` (`"C01"`–`"C06"` — no matching `externalCourseId` in `kaushalai.courses`, which only uses `igot-crs-01`–`igot-crs-06` for courses `#61–#66`)
  - `NO_MATCH`: `12` (`courseId` is `null`/`undefined` on 6 docs and `""` on 6 docs)

Because title similarity is never used to guess quiz-to-course links, `0/18` existing `kaushalai` quizzes are auto-mapped.

---

## 3. Canonical Data Model (`Quiz.js`)

Updated [`server/src/models/Quiz.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/models/Quiz.js):

- `courseId`: `{ type: Schema.Types.ObjectId, ref: 'Course', default: null, index: true }`
- Partial unique index `quiz_courseId_unique_objectid`:
  - Key: `{ courseId: 1 }`
  - Options: `{ unique: true, partialFilterExpression: { courseId: { $type: 'objectId' } }, name: 'quiz_courseId_unique_objectid' }`
  - Named `quiz_courseId_unique_objectid` to avoid `IndexOptionsConflict` with legacy `courseId_1` and to permit unlimited standalone quizzes (`courseId: null`) while enforcing 1-to-1 uniqueness for linked `Course._id` ObjectIds. `syncIndexes()` is never called.

---

## 4. Quiz-Course Validation Service (`quizCourse.service.js`)

Created [`server/src/services/quizCourse.service.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/quizCourse.service.js) exporting:

- `createHttpError(message, status, code)`
- `resolveCourseForQuiz(rawCourseId, { allowExternalId, allowUnpublished })` — resolves valid `Course` by `ObjectId` or `externalCourseId`, rejecting missing (`404 COURSE_NOT_FOUND`), invalid (`400 INVALID_COURSE_REFERENCE`), archived (`409 COURSE_ARCHIVED` when `isDeleted === true || isArchived === true`), or unpublished (`400 COURSE_UNPUBLISHED`) courses.
- `validateQuizCourseAssignment(rawCourseId, { excludeQuizId, allowUnpublished })` — returns canonical `Course._id` or `null` (standalone) and rejects duplicate course links (`409 DUPLICATE_COURSE_QUIZ`).
- `findCourseLinkedQuizzes(rawCourseId, options)` — resolves course and returns only quizzes matching that canonical `Course._id`.
- `validateQuizCourseContext(quiz, rawCourseId, options)` — enforces `403 QUIZ_COURSE_MISMATCH` whenever a `courseId` context is supplied and does not match `quiz.courseId` (including standalone quizzes with `courseId: null`).

---

## 5. Backend Controller & Error Handler Updates

- [`server/src/controllers/mcq.controller.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/mcq.controller.js):
  - `listQuizzes`: Uses `findCourseLinkedQuizzes` when `req.query.courseId !== undefined` (rejecting empty/invalid/missing/archived `courseId` with no fallback to all quizzes).
  - `getQuiz`: Enforces `validateQuizCourseContext` when `req.query.courseId !== undefined`.
  - `createQuiz` & `updateQuiz`: Uses `validateQuizCourseAssignment`, catches `11000` duplicate-key errors on `courseId` -> `409 DUPLICATE_COURSE_QUIZ`, and rejects updating quizzes that still carry an un-cleared invalid legacy `courseId` (`400 INVALID_LEGACY_COURSE_REFERENCE`) while normalizing `""` to `null`.
- [`server/src/controllers/quizAttempt.controller.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/quizAttempt.controller.js):
  - `startAttempt` & `submitAttempt`: Enforces `validateQuizCourseContext(quiz, req.body?.courseId ?? req.query?.courseId, { isAdmin })`.
- [`server/src/middleware/errorHandler.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/middleware/errorHandler.js):
  - Forwards string `err.code` values (e.g., `QUIZ_COURSE_MISMATCH`, `COURSE_ARCHIVED`, `INVALID_COURSE_REFERENCE`) in JSON error responses.

---

## 6. Frontend Course-Context Integration

- [`client/src/api/quiz.api.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/api/quiz.api.js): `getQuizByCourse(courseId)` returns `Promise.resolve(null)` cleanly when `courseId` is falsy.
- [`client/src/api/mcq.api.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/api/mcq.api.js): `getQuiz(quizId, params)` and `startQuizAttempt(quizId, body)` forward optional `courseId` parameters.
- [`client/src/pages/courses/CourseProgressPage.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.jsx): Gates `getQuizByCourse` on `enabled: Boolean(effectiveCourseId)` (from loaded `courseData?._id`) and links **Take Quiz** to `/quizzes/${courseQuiz._id}?courseId=${encodeURIComponent(effectiveCourseId)}` with `state.courseId`.
- [`client/src/pages/quiz/TakeQuizPage.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/quiz/TakeQuizPage.jsx): Reads `courseContextId` from `searchParams.get('courseId') || location.state?.courseId`, forwards it to `getQuiz`, `startQuizAttempt`, and `submitQuizAttempt`, and renders an inline `QUIZ_COURSE_MISMATCH` alert banner on mismatch.

---

## 7. Reconciliation Script (`reconcile_quiz_course_relationships.js`)

Created [`server/scripts/reconcile_quiz_course_relationships.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/scripts/reconcile_quiz_course_relationships.js):

- Defaults to `--dry-run` (zero DB writes).
- Classifies every quiz into `ALREADY_VALID`, `VERIFIED_MATCH`, `AMBIGUOUS_MATCH`, `INVALID_REFERENCE`, or `NO_MATCH`.
- Rejects `--apply` on protected databases (`kaushalai`, `prod*`) unless `--allow-protected-db` is passed, and requires `--backup-verified`.
- Updates only `VERIFIED_MATCH` `quiz.courseId` fields on `--apply`, logs `QUIZ_COURSE_RECONCILIATION` to `AuditLog`, and never mutates `QuizAttempt`, `UserCompetency`, `SkillGap`, questions, or `passPercent`.

---

## 8. Reconciliation Dry-Run Output on `kaushalai`

Executed `node scripts/reconcile_quiz_course_relationships.js --dry-run` against `kaushalai`:

```text
[reconcile_quiz_course_relationships] mode=dry-run db=kaushalai
Summary: {"totalQuizzes":18,"ALREADY_VALID":0,"VERIFIED_MATCH":0,"AMBIGUOUS_MATCH":0,"INVALID_REFERENCE":6,"NO_MATCH":12,"appliedCount":0}
```

- `12` quizzes classified `NO_MATCH` (`null` or `""` `courseId`).
- `6` quizzes (`"C01"`–`"C06"`) classified `INVALID_REFERENCE` (no matching `externalCourseId` in `kaushalai.courses`).
- `0` mutations performed.

---

## 9. Phase 36.2.3 Integration Test Suite (`test_part36_2_3_quiz_course_relationship_integrity.js`)

Created and ran [`server/test_part36_2_3_quiz_course_relationship_integrity.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/test_part36_2_3_quiz_course_relationship_integrity.js) against `kaushalai_test`:

- **Result:** `24 Passed, 0 Failed` (exit code `0`)
- Covered scenarios:
  1. Valid `Course._id` create (`201`, BSON `ObjectId` persisted)
  2. Valid `externalCourseId` create (`201`, resolved to `Course._id`)
  3. Invalid string `courseId` (`"C01"`) rejected (`400 INVALID_COURSE_REFERENCE`)
  4. Missing `Course._id` rejected (`404 COURSE_NOT_FOUND`)
  5. Archived `Course._id` rejected (`409 COURSE_ARCHIVED`)
  6. Duplicate quiz for same course rejected (`409 DUPLICATE_COURSE_QUIZ`)
  7. Partial unique index blocks duplicate `ObjectId` (`E11000`) while allowing multiple `courseId: null` standalone quizzes
  8. `PUT /api/quizzes/:id` validates target `courseId` and rejects duplicate/archived targets
  9. `PUT /api/quizzes/:id` rejects un-cleared legacy invalid `courseId` (`400`) and normalizes `""` to `null` (`200`)
  10. `GET /api/quizzes?courseId=<ObjectId>` returns only linked quiz
  11. `GET /api/quizzes?courseId=<externalCourseId>` resolves and returns linked quiz
  12. `GET /api/quizzes?courseId=` empty/invalid/missing/archived rejects cleanly without fallback
  13. `GET /api/quizzes/:id?courseId=...` succeeds on match and rejects mismatch (`403 QUIZ_COURSE_MISMATCH`)
  14. `POST /api/quizzes/:id/start-attempt` enforces `courseId` match (`403` on mismatch, `201` on match)
  15. `POST /api/quizzes/:id/attempts` rejects mismatch (`403`) and grades matching attempt (`100% -> passed: true`)
  16. Failing score (`50%`) evaluates `passed: false` (70% threshold preserved)
  17. Standalone quiz (`courseId: null`) succeeds end-to-end without course context
  18. Historical `QuizAttempt` accessible to owner (`200`) and blocked for other learners (`404`)
  19. Concurrent `submitAttempt` on same `attemptId` is atomic (`201` + `400 ATTEMPT_ALREADY_COMPLETED`)
  20. `reconcileQuizCourseRelationships` `--dry-run` classifies all 5 states with zero writes
  21. `reconcileQuizCourseRelationships` `--apply` enforces protected-DB & `--backup-verified` guards, updates `VERIFIED_MATCH` only, writes `AuditLog`
  22. Frontend `CourseProgressPage.jsx` & `TakeQuizPage.jsx` courseId context wiring verified
  23. Passing linked quiz does not bypass Phase 36.2.2 `LearningActivity`/`Enrollment` completion rules
  24. Passing linked quiz does not auto-issue course `Certificate` documents

---

## 10. Regression Suites Executed (`kaushalai_test`)

| Suite | Result | Exit Code |
|---|---|---|
| `test_part36_2_3_quiz_course_relationship_integrity.js` | `24 Passed, 0 Failed` | `0` |
| `test_part36_2_2_server_authoritative_completion.js` | Passed | `0` |
| `test_part36_2_1_enrollment_progress_integrity.js` | Passed | `0` |
| `test_part22_learning_path_progression.js` | Passed | `0` |
| `test_part35_3_assessment_competency_integrity.js` | `9 Passed, 0 Failed` | `0` |
| `test_part35_2_assessment_frontend.js` | `8 Passed, 0 Failed` | `0` |
| `test_part24_2_certificates.js` | Passed (`0` dev DB mutations) | `0` |
| `test_part33_learner_ux_and_navigation.js` | `54 Passed, 0 Failed` | `0` |

---

## 11. Client Production Build Verification

Executed `cd client && npm run build`:

- `vite v6.4.3 building for production...`
- `2747 modules transformed`
- `dist/index.html` (`0.61 kB`), `dist/assets/index-BnPWGyM_.css` (`435.32 kB`), `dist/assets/index-DpPneRvW.js` (`1,986.28 kB`)
- `built in 3.37s`, exit code `0`.

---

## 12. `kaushalai` Dev Database Integrity Verification

Collection counts in `kaushalai` after all verification steps:

`{"quizzes":18,"courses":66,"quizattempts":12,"enrollments":10,"learning_progress":10,"learning_activities":0,"certificates":0,"user_competencies":41,"skill_gaps":264}`

Zero documents were modified, inserted, or deleted in `kaushalai`.

---

## 13. Non-Goals & Preserved Boundaries

- Quiz grading logic and `passPercent` (`70%`) unchanged.
- `tagCompetencyIds`, `UserCompetency`, `SkillGap`, `certificate.service.js`, and auth unchanged.
- Phase 36.2.4 not started.

---

## 14. Modified & Created Files

- Modified: [`server/src/models/Quiz.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/models/Quiz.js)
- Created: [`server/src/services/quizCourse.service.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/quizCourse.service.js)
- Modified: [`server/src/controllers/mcq.controller.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/mcq.controller.js)
- Modified: [`server/src/controllers/quizAttempt.controller.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/quizAttempt.controller.js)
- Modified: [`server/src/middleware/errorHandler.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/middleware/errorHandler.js)
- Modified: [`client/src/api/quiz.api.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/api/quiz.api.js)
- Modified: [`client/src/api/mcq.api.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/api/mcq.api.js)
- Modified: [`client/src/pages/courses/CourseProgressPage.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.jsx)
- Modified: [`client/src/pages/quiz/TakeQuizPage.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/quiz/TakeQuizPage.jsx)
- Created: [`server/scripts/reconcile_quiz_course_relationships.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/scripts/reconcile_quiz_course_relationships.js)
- Created: [`server/test_part36_2_3_quiz_course_relationship_integrity.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/test_part36_2_3_quiz_course_relationship_integrity.js)
- Created: [`PHASE_36_2_3_QUIZ_COURSE_RELATIONSHIP_INTEGRITY.md`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/PHASE_36_2_3_QUIZ_COURSE_RELATIONSHIP_INTEGRITY.md)

---

## 15. Next Phase Readiness

Phase 36.2.3 is complete and closed. Stopped prior to Phase 36.2.4.

