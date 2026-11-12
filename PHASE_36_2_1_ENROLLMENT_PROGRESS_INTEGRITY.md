# KaushalAI — Phase 36.2.1: Enrollment & Learning Progress Integrity

**Phase:** 36.2.1 — Enrollment & Learning Progress Integrity  
**Audit Reference:** [PHASE_36_1_LEARNING_SYSTEM_AUDIT.md](file:///Users/abhinikesh/Documents/Projects/KaushalAI/PHASE_36_1_LEARNING_SYSTEM_AUDIT.md)  
**Target Environment:** Backend + Minimal Frontend Enrollment/Progress Callers (`kaushalai` dev DB strictly preserved read-only; all tests executed against `kaushalai_test`)  
**Status:** Complete — awaiting explicit user approval before Phase 36.2.2

---

## 1. Canonical Data-Source Ownership Model

Phase 36.2.1 establishes explicit collection ownership to eliminate split-brain enrollment and completion states:

| Model / Collection | Authoritative Role | Canonical Keys & Ownership Rules |
| :--- | :--- | :--- |
| [`Enrollment`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/models/Enrollment.js#L4-L53) (`enrollments`) | **Single source of truth** for learner enrollment, course start/completion lifecycle, `progressPercent`, `completedModules`, and completion timestamps | Canonical `ObjectId` references (`userId`, `courseId`) guarded by unique index `{ userId: 1, courseId: 1 }` plus embedded historical `courseSnapshot` |
| [`LearningProgress`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/models/LearningProgress.js#L5-L68) (`learning_progress`) | Virtual Labs activity & completion store (`/api/labs/*`), including standalone `'Independent Practice'` sessions | Optional `enrollmentId` foreign key to `Enrollment`; `course_completed` derives strictly from `Enrollment.status === 'completed'`, never forged by lab webhooks |
| [`LearningPath`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/models/LearningPath.js) & [`LearningPathItem`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/models/LearningPathItem.js) | Personalized sequenced training roadmap | Downstream synchronized mirror (`not_started` / `in_progress` / `completed`) driven by `Enrollment` transitions |
| [`Course`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/models/Course.js#L135-L199) (`courses`) | Catalog metadata, embedded modules, and soft-archive lifecycle (`isDeleted`, `deletedAt`, `deletedBy`, `isPublished`) | Replaces hard deletion so historical enrollments and activity remain intact |

---

## 2. Database Index Verification

Inspected live via `node server/scripts/reconcile_enrollment_learning_progress.js --dry-run --json` on `kaushalai`:

- **`enrollments`:** `_id_`, `userId_1_courseId_1` (`unique: true`) — already active with `0` duplicate pairs.
- **`learning_progress`:** `_id_`, `user_id_1`, `course_id_1`, `user_id_1_course_id_1` (`unique: true`) — already active with `0` duplicate raw pairs.
- **`courses`:** `_id_` currently active in `kaushalai`. Schema declarations added in [`Course.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/models/Course.js#L194-L197) for non-unique query indexes `{ isDeleted: 1, isPublished: 1, source: 1 }` and `{ externalCourseId: 1 }`. `syncIndexes()` was **not** run against `kaushalai` (courses `#1..#60` carry empty string `externalCourseId: ""`, so any future unique index on `externalCourseId` would require a `partialFilterExpression`).

---

## 3. Complete File Inventory

### Backend Modified
1. [Course.js](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/models/Course.js) — added soft-archive fields (`isDeleted`, `deletedAt`, `deletedBy`) and non-unique catalog query indexes.
2. [Enrollment.js](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/models/Enrollment.js) — added `completedModules`, `lastAccessedAt`, and `courseSnapshot`.
3. [LearningProgress.js](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/models/LearningProgress.js) — added optional `enrollmentId` reference (`ObjectId`, indexed).
4. [course.validators.js](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/validators/course.validators.js) — hardened `enrollSchema` (trimmed required `courseId`, `.unknown(false)`) and extended `progressSchema` (`progressPercent` integer `0..100`, optional bounded integer array `completedModules`).
5. [course.controller.js](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/course.controller.js) — passed role-scoped `includeUnpublished`, admin `req.user?.id` into soft-delete, and `completedModules` into [`updateProgress`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/course.controller.js#L71-L82).
6. [course.service.js](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/course.service.js) — implemented [`resolveCourseByIdentifier`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/course.service.js#L31-L52), soft-archive [`deleteCourse`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/course.service.js#L114-L129), orphan/archive-safe [`getUserEnrollments`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/course.service.js#L131-L157), race-safe [`enrollUser`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/course.service.js#L159-L206), and anti-reversion [`updateProgress`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/course.service.js#L261-L355).
7. [labs.controller.js](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/labs.controller.js) — added [`resolveLabIdentifiers`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/labs.controller.js#L94-L139) and updated [`issueLabAccessToken`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/labs.controller.js#L145-L227), [`getLabStatus`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/labs.controller.js#L233-L259), and [`handleLabCompletionWebhook`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/labs.controller.js#L266-L361). `labs.routes.js` left untouched.
8. [skillGap.service.js](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/skillGap.service.js) — fixed completed-course exclusion query (`user_id`/`course_id` -> `userId`/`courseId`) and filtered `isDeleted: { $ne: true }` in recommendation fallbacks.
9. [skillGap.controller.js](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/skillGap.controller.js) — excluded soft-deleted courses from recommendation lookups and learning-path item rendering.
10. [userFeatures.controller.js](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/userFeatures.controller.js) — added `courseSnapshot` fallback for activity timeline titles and excluded soft-deleted/unpublished courses from global search.

### Backend Created
11. [reconcile_enrollment_learning_progress.js](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/scripts/reconcile_enrollment_learning_progress.js) — safe `--dry-run` default reconciliation and conflict auditor.
12. [test_part36_2_1_enrollment_progress_integrity.js](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/test_part36_2_1_enrollment_progress_integrity.js) — 13-group Phase 36.2.1 regression suite against `kaushalai_test`.

### Frontend Modified (Minimal Targeted Error/Reload Integrity Fixes Only)
13. [course.api.js](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/api/course.api.js) — extended `updateProgress(enrollmentId, progressPercent, completedModules)` payload.
14. [CourseProgressPage.jsx](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.jsx) — restored exact `completedModules` across reloads, passed `completedModules` on save, reverted optimistic UI state on API error, and blocked silent un-enrolled progress fake-resolves.
15. [IgotCoursesPage.jsx](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/IgotCoursesPage.jsx) — eliminated fake `'Enrolled in local mode!'` success & blind navigation; `409` navigates cleanly as already enrolled, other errors stay on catalog with API error toast.
16. [RecommendedLearningPage.jsx](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/learning/RecommendedLearningPage.jsx) — eliminated blind `onError` navigation into course player; navigates on `409` only, displays API error toast otherwise.
17. [CourseDetailPage.jsx](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseDetailPage.jsx) — eliminated `'Enrolled successfully in offline demonstration mode.'` fake state; `409` refreshes `getMyEnrollments()`, other errors toast accurately.

---

## 4. Enrollment Integrity Summary

- Authenticated learner identity derives strictly from `req.user.id`; `enrollSchema` rejects extra body fields such as spoofed `userId` (`400`), blank/whitespace `courseId` (`400`), nonexistent `Course` (`404`), archived/soft-deleted `Course` (`404`), and unpublished `Course` (`400`).
- `enrollUser` resolves both canonical `Course._id` and non-empty `Course.externalCourseId`, normalizes `userId` and `courseId` to `ObjectId`, persists `courseSnapshot`, and converts both pre-existing duplicates and Mongo `E11000` race collisions into HTTP `409` (`Already enrolled in this course`).

---

## 5. Learning Progress Integrity & Reload Fidelity Summary

- [`updateProgress`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/course.service.js#L261-L355) enforces strict user ownership (`404` on cross-user access), rejects mutations when the referenced course is missing (`404`) or soft-deleted (`409`), validates/clamps integer `progressPercent` (`0..100`), persists sorted deduplicated `completedModules` indices bounded by `course.modules.length`, preserves original `startedAt` and `completedAt`, prevents post-completion reversion or stale lower progress payloads, and synchronizes `LearningPathItem` and any matching `LearningProgress` document.
- Existing `certificateService.issueCourseCertificate(userId, saved.courseId)` invocation on completion is preserved unchanged (`certificate.service.js` untouched).

---

## 6. Course Archiving & Virtual Labs Integrity

- `DELETE /api/courses/:id` performs a soft-archive (`isDeleted: true, isPublished: false, deletedAt, deletedBy`), hiding archived courses from learner catalog, search, and recommendations while preserving historical `Enrollment` (`courseStatus: 'archived'` / `'missing'`) and `displayCourse` fallback from `courseSnapshot`.
- Virtual Labs endpoints normalize `ObjectId`, string `ObjectId`, and `externalCourseId` lookups, attach optional `enrollmentId`, and no longer fabricate `course_completed: true`, `quiz_passed: true`, or `quiz_score: 100` upon receiving lab completion webhooks.

---

## 7. Dry-Run Reconciliation Results (`kaushalai`)

Command executed: `node server/scripts/reconcile_enrollment_learning_progress.js --dry-run --json`

| Metric | Observed Count | Notes |
| :--- | :---: | :--- |
| `enrollmentsTotal` | 10 | 0 duplicate pairs, 0 orphan user refs |
| `orphanEnrollmentCourseRefs` | 1 | `6a986398a879f61d35c5c6d4` -> missing `courseId: 6a97a9869d49c5d450812353` (preserved read-only) |
| `wouldBackfillSnapshots` | 9 | Legacy enrollments lacking `courseSnapshot` (`backfilledSnapshots: 0` in dry-run) |
| `learningProgressTotal` | 10 | 0 duplicate raw pairs |
| `learningProgressMatchedToEnrollment` | 1 | `6a9d38083ff82d940b781890` vs `Enrollment` `6a9d520e39320d541c8a90db` |
| `conflictsRequiringReview` | 1 | `6a9d38083ff82d940b781890` (`course_completed: true, quiz_passed: true`) vs `Enrollment` (`enrolled`, `0%`) -> flagged `conflict_manual_review`, untouched |
| `learningProgressWithoutEnrollment` | 8 | `6` with string `igot-crs-01`..`06`, `2` with `ObjectId`-hex strings without enrollments |
| `learningProgressStandalonePractice` | 1 | `6aa4471d7204f293578e09f4` (`learner_standalone_myxbq6` / `'Independent Practice'`) |
| `learningPathItemMismatches` | 0 | Out of `104` total `learning_path_items` |

---

## 8. Regression Testing & Build Results

All backend suites ran sequentially against `mongodb://127.0.0.1:27017/kaushalai_test`:

| Verification Suite / Check | Result | Scope |
| :--- | :---: | :--- |
| `node server/test_part36_2_1_enrollment_progress_integrity.js` | **13 Passed, 0 Failed** | All 12 enrollment/progress/concurrency/soft-delete/webhook/cross-user scenarios + dry-run reconciliation check |
| `node server/test_part22_learning_path_progression.js` | **63 Passed, 0 Failed** | Learning path sequencing, enrollment progression, anti-reversion, competency separation |
| `node server/test_part24_2_certificates.js` | **69 Passed, 0 Failed** | Certificate issuance, verification, rate limiter, recovery engine |
| `node server/test_part21_admin_analytics.js` | **38 Passed, 0 Failed** | Admin analytics heatmap, trends, org summary, boundary checks |
| `node server/test_part18_skill_gap_frontend.js` | **79 Passed, 0 Failed** | Skill gap formula, localization, validation, API contracts |
| `node server/test_part33_learner_ux_and_navigation.js` | **54 Passed, 0 Failed** | Learner navigation & dashboard contracts |
| `node server/test_part33_1_igot_data_authenticity.js` | **36 Passed, 0 Failed** | iGOT course metadata & catalog integrity |
| `node server/test_part35_3_assessment_competency_integrity.js` | **9 Passed, 0 Failed** | Diagnostic/quiz competency & SkillGap pipeline integrity |
| `cd client && npm run build` | **Exit 0 (`3.45s`, `2747` modules)** | Production Vite bundle compiled cleanly |

---

## 9. Development Database (`kaushalai`) Preservation Verification

Verified identical document counts before and after implementation and testing across all 17 collections:

- `users: 15`, `courses: 66`, `course_competencies: 164`, `enrollments: 10`, `learning_progress: 10`, `learning_paths: 12`, `learning_path_items: 104`, `recommendations: 62`, `competencies: 59`, `quizzes: 18`, `questions: 432`, `certificates: 0`, `user_competencies: 41`, `usercompetencies: 25`, `skill_gaps: 264`, `assessment_attempts: 7`, `quizattempts: 12`.

---

## 10. Scope Boundaries Preserved

- Did **not** modify authentication, OAuth, login, or token refresh flows (`Parts 32.1.1–32.1.19`).
- Did **not** modify SkillGap formulas, role resolution, `certificate.service.js`, quiz-course mappings, `EmployeeDashboard.jsx`, or `labs.routes.js`.
- Did **not** populate the 59 metadata-only courses or generate placeholder modules/lessons (deferred to Phase 36.2.2 upon explicit approval).
- Did **not** apply destructive writes, migrations, or conflict overwrites to `kaushalai`.

**Recommendation:** Approve Phase 36.2.1 and authorize Phase 36.2.2 (Course Content & Assessment Delivery Integrity) when ready.

