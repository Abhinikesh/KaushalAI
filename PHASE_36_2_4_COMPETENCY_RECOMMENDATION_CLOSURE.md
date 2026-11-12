# Phase 36.2.4: Competency Mapping & Recommendation Integrity Closure

**Phase:** 36.2.4 — Competency Mapping & Recommendation Integrity  
**Predecessors:** Phase 36.2.1, Phase 36.2.2, Phase 36.2.2.1, Phase 36.2.3, Phase 36.2.3.1  
**Status:** Complete & Verified on `kaushalai_test` (`kaushalai` dev DB untouched)  
**Test Database:** `mongodb://127.0.0.1:27017/kaushalai_test`

---

## 1. Initial Audit Findings (Step A)

Read-only inspection of `kaushalai` and the server codebase confirmed every historical finding:

1. **`courseCompetencySync.js` short-circuit & keyword guessing:**
   - `syncCourseCompetencies()` exited early when `existingCount > 20` (`kaushalai.course_competencies` has `164` docs across `55` distinct courses), leaving `11` of `66` courses unmapped (`#11`, `#18`, `#24`, `#33`, `#56`, and `#61–#66` `igot-crs-01`..`igot-crs-06`).
   - It also ran a substring `keywordMap` heuristic against course titles/descriptions and mutated `Course.skillTags` directly.
2. **Quiz competency tags:** `17` of `18` quizzes in `kaushalai.quizzes` have empty `tagCompetencyIds`.
3. **Quiz & `UserCompetency` validation gaps:**
   - `mcq.controller.js` `createQuiz` did not validate `tagCompetencyIds` or question-level `competency_id` values against existing `Competency` documents.
   - `competencyUpdate.service.js` `_applyNormalizedCompetencyScores` validated ObjectId format but did not verify that `Competency` records exist in the database.
4. **Recommendation integrity defects:**
   - `skillGap.service.js` `generateRecommendationsAndLearningPath()` populated `CourseCompetency.course_id` without filtering out archived (`isDeleted === true || isArchived === true`), unpublished (`isPublished !== true`), or already completed courses before AI/fallback ranking or `Recommendation.create()`.
   - When `eligibleCoursesMap.size === 0`, it fell back to arbitrary catalogue courses with placeholder `"Cadre Foundation"` reasons.
   - `skillGap.controller.js` `getRecommendations()` did not project `isDeleted`/`isArchived` and did not exclude already-completed courses.

---

## 2. Files Inspected and Changed

**Inspected:**
- `server/src/models/CourseCompetency.js`, `Competency.js`, `UserCompetency.js`, `Course.js`
- `server/src/services/courseCompetencySync.js`, `competencyUpdate.service.js`, `skillGap.service.js`
- `server/src/controllers/mcq.controller.js`, `quizAttempt.controller.js`, `skillGap.controller.js`
- `server/src/routes/skillGap.routes.js`, `competency.routes.js`
- `server/src/validators/course.validators.js`

**Changed:**
- Modified: [`server/src/services/courseCompetencySync.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/courseCompetencySync.js)
- Modified: [`server/src/services/competencyUpdate.service.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/competencyUpdate.service.js)
- Modified: [`server/src/controllers/mcq.controller.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/mcq.controller.js)
- Modified: [`server/src/services/skillGap.service.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/skillGap.service.js)
- Modified: [`server/src/controllers/skillGap.controller.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/skillGap.controller.js)
- Created: [`server/test_part36_2_4_competency_recommendation_integrity.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/test_part36_2_4_competency_recommendation_integrity.js)
- Created: [`PHASE_36_2_4_COMPETENCY_RECOMMENDATION_CLOSURE.md`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/PHASE_36_2_4_COMPETENCY_RECOMMENDATION_CLOSURE.md)

Frozen files `EmployeeDashboard.jsx` and `SkillGapAnalysisPage.jsx` were not modified.

---

## 3. Root Causes Identified

1. `existingCount > 20` prevented legitimate explicit `Course.skillTags` synchronization after initial seeding, while `keywordMap` risked fabricating unverified mappings.
2. `CourseCompetency` queries and `Recommendation` persistence lacked `isDeleted`/`isArchived`/`isPublished` and `completedCourseIds` guards.
3. Missing `Competency` existence validation on quiz creation and `UserCompetency` upsert risked orphaned references.

---

## 4. Changes Implemented (Step B)

1. **[`courseCompetencySync.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/courseCompetencySync.js):**
   - Removed `existingCount > 20` short-circuit and removed blind `keywordMap` title/description guessing and `course.save()` mutations.
   - `syncCourseCompetencies()` now syncs only verified explicit `Course.skillTags` from active (`isDeleted !== true && isArchived !== true`) courses into `CourseCompetency` without deleting existing valid mappings.
   - Added `validateCompetencyIds(rawIds)` and `upsertCourseCompetency({ courseId, competencyId, relevanceWeight })` to validate `Course` and `Competency` existence, reject archived courses (`409 COURSE_ARCHIVED`), and prevent duplicate mappings.
2. **[`mcq.controller.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/mcq.controller.js):**
   - `createQuiz` now validates and deduplicates `tagCompetencyIds` and validates question-level `competency_id`/`competencyId` values via `validateCompetencyIds()`.
3. **[`competencyUpdate.service.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/competencyUpdate.service.js):**
   - `_applyNormalizedCompetencyScores()` verifies every target `competencyId` exists in `Competency` before applying non-downgrading `UserCompetency` updates under `withUserLock`.
4. **[`skillGap.service.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/skillGap.service.js):**
   - `generateRecommendationsAndLearningPath()` filters out completed, archived (`isDeleted === true || isArchived === true`), and unpublished (`isPublished !== true`) courses before AI/fallback ranking and before persisting `Recommendation` rows.
   - Removed the unmapped catalogue fallback so missing mappings return `[]` safely without fabricated placeholder recommendations.
5. **[`skillGap.controller.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/skillGap.controller.js):**
   - `getRecommendations()` selects `isDeleted isArchived` and excludes deleted, archived, unpublished, and completed courses.

---

## 5. Verified vs. Unresolved Mappings (`kaushalai` Dev DB)

- **Courses:** `55` of `66` courses have `164` existing `CourseCompetency` rows; `11` courses (`#11`, `#18`, `#24`, `#33`, `#56`, and `#61–#66` `igot-crs-01`..`igot-crs-06`) remain unmapped for manual review (zero guessed or bulk-mutated mappings applied).
- **Quizzes:** `17` of `18` existing quizzes have empty `tagCompetencyIds`, and all `18` quizzes remain unlinked to `Course._id` (`12 NO_MATCH`, `6 INVALID_REFERENCE` `"C01"`–`"C06"`) until manually reviewed.

---

## 6. Test Results & Frontend Build Results

All automated tests executed strictly against `kaushalai_test`:

| Check | Result | Exit Code |
|---|---|---|
| `test_part36_2_4_competency_recommendation_integrity.js` | `14 Passed, 0 Failed` (all 15 scenarios) | `0` |
| `test_part36_2_3_1_quiz_cardinality_access.js` | `12 Passed, 0 Failed` | `0` |
| `test_part36_2_3_quiz_course_relationship_integrity.js` | `24 Passed, 0 Failed` | `0` |
| `test_part36_2_2_server_authoritative_completion.js` | `16 Passed, 0 Failed` | `0` |
| `test_part36_2_1_enrollment_progress_integrity.js` | `13 Passed, 0 Failed` | `0` |
| `test_part35_3_assessment_competency_integrity.js` | `9 Passed, 0 Failed` | `0` |
| `test_part35_2_assessment_frontend.js` | `8 Passed, 0 Failed` | `0` |
| `test_part24_2_certificates.js` | Passed | `0` |
| `test_part33_learner_ux_and_navigation.js` | `54 Passed, 0 Failed` | `0` |
| `cd client && npm run build` (`vite v6.4.3`) | `2747 modules transformed`, built in `3.38s` | `0` |

---

## 7. Development DB (`kaushalai`) Before/After Counts

| Collection | Before | After |
|---|---|---|
| `courses` | `66` | `66` |
| `competencies` | `59` | `59` |
| `course_competencies` | `164` | `164` |
| `quizzes` | `18` | `18` |
| `quizattempts` | `12` | `12` |
| `enrollments` | `10` | `10` |
| `learning_progress` | `10` | `10` |
| `user_competencies` | `41` | `41` |
| `skill_gaps` | `264` | `264` |
| `recommendations` | `62` | `62` |
| `learning_paths` | `12` | `12` |

Zero documents or indexes in `kaushalai` were modified.

---

## 8. Preserved Functionality

- Diagnostic assessment evaluation, quiz grading, and 70% pass threshold unchanged.
- Question-level competency priority and quiz-level `tagCompetencyIds` fallback preserved.
- Non-downgrading `UserCompetency` updates, `withUserLock` concurrency safety, and `SkillGap` sync retry/recovery (`needs_skillgap_sync`) preserved.
- Phase 36.2.2 server-authoritative `LearningActivity` completion and `certificate.service.js` preserved.
- Phase 36.2.3.1 one-to-many `Course`–`Quiz` relationship and course-context access controls preserved.
- Enrollment alone and course completion without verified assessment evidence do not fabricate competency improvements.

---

## 9. Known Limitations

- Completing a course purely via slide/video `LearningActivity` without a linked passed quiz or diagnostic assessment does not update `UserCompetency` (by design, as no defensible competency-level scoring exists from activity completion alone).
- `11` courses and `17` quizzes in `kaushalai` still require curated admin competency tagging before they can participate in automated recommendation matching or quiz-driven competency updates.

---

## 10. Remaining Work for Phase 36.2.5

- Curated admin review/authoring for the `11` unmapped courses (especially `#61–#66` `igot-crs-01`..`igot-crs-06`) and `18` unlinked quizzes, plus end-to-end verification of the complete learner workflow in Phase 36.2.5.

**Stopped prior to Phase 36.2.5.**

