# KaushalAI — Phase 36.1: Complete Learning System Audit Report

**Audit Date:** 2026-11-12  
**Mode:** Strictly Read-Only Audit & Verification (zero edits to application source code, schemas, indexes, or `kaushalai` dev DB)  
**Target Scope:** Courses, modules/slides/videos, enrollment, progress tracking, completion, certificates, learning paths, recommendations, quizzes/competency links, frontend pages, API routes, and test suites  
**Final Verdict:** **`FAIL`** — End-to-end learning delivery, progress integrity, assessment-backed completion, and course-to-competency progression do not currently operate as one reliable or trustworthy system.

---

## 1. Executive Summary

KaushalAI already has solid foundational authentication (Parts 32.1.1–32.1.18, untouched), Phase 34 AI conversation persistence, and a canonical `UserCompetency` -> `SkillGap` calculation pipeline (verified in Phase 35.3). However, a read-only full-stack inspection of the **learning and course delivery subsystem** reveals a deep architectural split between catalog marketing/UI placeholders and real backend persistence:

1. **Content Starvation (59 of 66 DB Courses Empty):** Out of **66** courses in `kaushalai` (`42` `igot`, `24` `nssta`; all `66` `isPublished: true`), **59 courses (`89.4%`)** have `0` modules, `0` slides, `0` videos, `0` transcripts, `0` objectives, `0` resources, and empty `category`. Only **1** course (`#60`, *Official Statistics Awareness Programme...*, `nssta`) has real slide decks (**31 slides across 5 modules** with verified PNG images on disk), and **6** curated iGOT courses (`#61–#66`) have structured metadata, objectives, resources, and modules—yet every module inside each of those 6 courses repeats the **exact same single YouTube URL** and links to generic portal homepages (`https://igotkarmayogi.gov.in`, `https://niti.gov.in`, etc.). **0 of 66 courses** have transcripts or distinct multi-module videos.
2. **Client-Trusted Progress & Zero Module Persistence:** Backend `Enrollment` stores only a single course-level integer `progressPercent` (`0–100`) directly sent by `PUT /api/users/me/enrollments/:id/progress`. There is **no** module-level or lesson-level completion schema (`completedModuleIds` / lesson progress). When reloading `CourseProgressPage`, the UI fabricates which modules are complete (`Array.from({ length: count }, (_, i) => i)`). Worse, any authenticated user can send `progressPercent: 100` via API (or check placeholder checkboxes without watching any video or reading slides) and trigger `certificateService.issueCourseCertificate`.
3. **Quiz & Competency Disconnect:** **0 of 18** `quizzes` in MongoDB reference an existing `Course._id` (`12` are empty string or missing/undefined; `6` hold string codes `"C01".."C06"`). Because `CourseProgressPage` queries `/api/quizzes/course/:courseId`, the **"Take Quiz"** CTA is permanently disabled across the entire catalog. Meanwhile, `courseCompetencySync.js` short-circuits when `CourseCompetency.countDocuments() > 20`, leaving curated courses `#61–#66` with `0` `course_competencies` entries, and `5` courses (`#11, #18, #24, #33, #56`) have neither `skillTags` nor `CourseCompetency` links.
4. **Silent Failure & Dual-Store Drift:** Several frontend flows (`IgotCoursesPage.jsx`, `RecommendedLearningPage.jsx`, `CourseDetailPage.jsx`, `CourseProgressPage.jsx`) swallow API enrollment failures under misleading "local mode" / "offline demonstration mode" toasts or no-op `progressMutation` calls when un-enrolled. On the backend, `Enrollment` (`userId`/`courseId`), `LearningProgress` (`user_id`/`course_id` `Mixed`), and `LearningPathItem` drift out of sync, and `skillGap.service.js:533-536` queries `Enrollment` using wrong snake_case keys (`user_id`/`course_id`), so completed courses are **never** excluded from regenerated recommendations.

---

## 2. Complete Course Inventory & Content Completeness Audit (All 66 DB Courses)

### 2.1 Aggregate Metrics (`kaushalai.courses`, Directly Verified)

| Metric | Count | % of 66 | Notes |
|---|---:|---:|---|
| Total courses in `kaushalai` | **66** | 100.0% | `igot: 42`, `nssta: 24`; all `66` have `isPublished: true` |
| Courses with `0` modules, `0` slides, `0` videos, `0` resources, `0` objectives | **59** | 89.4% | `#1–#59` (`6a996d6d266163e0a9606c61`..`6a996d6d266163e0a9606c9b`); description only (`104–298` chars) |
| Courses with embedded modules (`modules.length > 0`) | **7** | 10.6% | `#60` (5 modules) and `#61–#66` (3–6 modules each) |
| Courses with slide decks (`slides.length > 0`) | **1** | 1.5% | `#60` only (31 module slides + 31 top-level slides; PNGs verified on disk under `client/public/slides/nasa-nssta/`) |
| Courses with YouTube URL (`youtubeUrl`) | **6** | 9.1% | `#61–#66` only; **0** have distinct per-module videos (`distinctModYt: 1` for all 6) |
| Courses with transcripts | **0** | 0.0% | `0` of `66` courses have non-empty `transcript` |
| Courses with `objectives` / `resources` / `category` | **6** | 9.1% | `#61–#66` only; `#1–#60` lack category, objectives, and resources |
| Courses with `skillTags.length > 0` | **50** | 75.8% | `16` courses have `0` `skillTags` (`#60` and 15 of `#1–#59`) |
| Courses with `course_competencies` entries (`total: 164`) | **55** | 83.3% | `11` courses have `0` (`#61–#66` unsynced + 5 others) |
| Courses with **neither** `skillTags` **nor** `course_competencies` | **5** | 7.6% | `#11` *Introduction to DevOps*, `#18` *Digital Identity and Authentication*, `#24` *Digital Service Design for Citizens*, `#33` *Emotional Intelligence at the Workplace*, `#56` *Current Economic Issues* |
| Courses with a linked published Quiz (`Quiz.courseId` matches `Course._id`) | **0** | 0.0% | `0` of `18` DB quizzes resolve to a valid `Course._id` |

### 2.2 Tier Classification of Existing Courses

- **Tier A — Complete Multi-Module Learning Units (Distinct Media + Objectives + Resources + Competency Link + Linked Quiz):** **0 / 66**
- **Tier B1 — Functional Slide-Deck Course with Partial Metadata (`#60`):** `1 / 66` (*Official Statistics Awareness Programme for University Professors and PG Students*, `nssta`). Has 5 modules totaling 31 slides with verified non-empty `bulletPoints` and `imageUrl`s present on disk (`client/public/slides/nasa-nssta/`), plus `1` `CourseCompetency` link. Lacks `category`, `objectives`, `resources`, `skillTags`, `transcript`, and any linked `Quiz`. Note: `CourseProgressPage.jsx:380-421` and `server/src/services/course.service.js:30-36` contain special-case title/`_id` fallbacks for this specific course.
- **Tier B2 — Metadata-Rich iGOT Courses with Repeated Single Video & Missing Competency Sync (`#61–#66`):** `6 / 66` (`igot-crs-01`..`igot-crs-06`). Have `category`, `objectives` (4–5), `resources` (1–2), `modules` (3–6), `youtubeUrl`, and `skillTags` (2 each). **Defects:** (1) every module within a course uses the identical course-level `youtubeUrl` rather than module-specific lessons; (2) module `slides` = `0`, `transcript` = empty; (3) `CourseCompetency` count = `0` for all 6 because `courseCompetencySync.js:12-16` aborts once total `CourseCompetency > 20`; (4) `0` linked quizzes (`Quiz.courseId` is empty or legacy `"C01".."C06"`).
- **Tier C — Metadata-Only Skeletons (`#1–#59`):** `59 / 66` (`36` `igot`, `23` `nssta`). Contain title, source, difficulty, duration, short `description`, and (for `49` of them) `skillTags` / `CourseCompetency` rows. Have **zero** actual learning material (`modules: 0, slides: 0, youtubeUrl: "", objectives: 0, resources: 0, transcript: ""`). When opened in `CourseProgressPage.jsx`, lines `369-377` silently inject 5 generic hardcoded placeholder modules (`Module 1: Introduction & Overview`, etc.).

### 2.3 Full 66-Course Database Inventory (`kaushalai.courses`, Directly Verified)

Legend: `ExtId` = `externalCourseId`, `Src` = `source`, `Diff` = `difficulty`, `Hrs` = `durationHours`, `Mods` = `modules.length`, `Sld` = `max(moduleSlides, topSlides)`, `YT` = `youtubeUrl` (`Y`/`N`), `Obj` = `objectives.length`, `Res` = `resources.length`, `ST` = `skillTags.length`, `CC` = `course_competencies` count, `Desc` = `description.length`.

| # | `_id` | `ExtId` | Src | Diff | Hrs | Category | Mods | Sld | YT | Obj | Res | ST | CC | Desc | Title |
|---:|---|---|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | `6a996d6d266163e0a9606c61` | - | igot | intermediate | 30 | - | 0 | 0 | N | 0 | 0 | 2 | 4 | 114 | Python for Government Data Analysis |
| 2 | `6a996d6d266163e0a9606c62` | - | igot | intermediate | 30 | - | 0 | 0 | N | 0 | 0 | 1 | 1 | 105 | SQL for Government Databases |
| 3 | `6a996d6d266163e0a9606c63` | - | igot | intermediate | 30 | - | 0 | 0 | N | 0 | 0 | 2 | 2 | 118 | Machine Learning Fundamentals for Public Services |
| 4 | `6a996d6d266163e0a9606c64` | - | igot | intermediate | 18 | - | 0 | 0 | N | 0 | 0 | 1 | 1 | 110 | APIs and System Integration |
| 5 | `6a996d6d266163e0a9606c65` | - | igot | beginner | 30 | - | 0 | 0 | N | 0 | 0 | 1 | 3 | 108 | Cloud Computing Fundamentals for Government |
| 6 | `6a996d6d266163e0a9606c66` | - | igot | intermediate | 30 | - | 0 | 0 | N | 0 | 0 | 0 | 2 | 105 | Data Engineering Fundamentals |
| 7 | `6a996d6d266163e0a9606c67` | - | igot | intermediate | 30 | - | 0 | 0 | N | 0 | 0 | 0 | 5 | 116 | Software Development Practices for Government Applications |
| 8 | `6a996d6d266163e0a9606c68` | - | igot | intermediate | 18 | - | 0 | 0 | N | 0 | 0 | 1 | 4 | 114 | Cybersecurity for Software Developers |
| 9 | `6a996d6d266163e0a9606c69` | - | igot | beginner | 18 | - | 0 | 0 | N | 0 | 0 | 1 | 2 | 118 | Artificial Intelligence Fundamentals |
| 10 | `6a996d6d266163e0a9606c6a` | - | igot | intermediate | 18 | - | 0 | 0 | N | 0 | 0 | 2 | 3 | 122 | Data Visualization with Python |
| 11 | `6a996d6d266163e0a9606c6b` | - | igot | intermediate | 18 | - | 0 | 0 | N | 0 | 0 | 0 | 0 | 115 | Introduction to DevOps |
| 12 | `6a996d6d266163e0a9606c6c` | - | igot | intermediate | 30 | - | 0 | 0 | N | 0 | 0 | 1 | 2 | 104 | Web Application Development Fundamentals |
| 13 | `6a996d6d266163e0a9606c6d` | - | igot | beginner | 6 | - | 0 | 0 | N | 0 | 0 | 1 | 5 | 122 | Cybersecurity Awareness for Officials |
| 14 | `6a996d6d266163e0a9606c6e` | - | igot | intermediate | 12 | - | 0 | 0 | N | 0 | 0 | 1 | 4 | 132 | Data Privacy and Protection in Government |
| 15 | `6a996d6d266163e0a9606c6f` | - | igot | beginner | 12 | - | 0 | 0 | N | 0 | 0 | 1 | 6 | 116 | Digital Signatures and Electronic Records |
| 16 | `6a996d6d266163e0a9606c70` | - | igot | beginner | 18 | - | 0 | 0 | N | 0 | 0 | 1 | 5 | 105 | e-Governance and Digital Public Services |
| 17 | `6a996d6d266163e0a9606c71` | - | igot | intermediate | 30 | - | 0 | 0 | N | 0 | 0 | 1 | 2 | 131 | GIS for Government Applications |
| 18 | `6a996d6d266163e0a9606c72` | - | igot | intermediate | 12 | - | 0 | 0 | N | 0 | 0 | 0 | 0 | 113 | Digital Identity and Authentication |
| 19 | `6a996d6d266163e0a9606c73` | - | igot | intermediate | 18 | - | 0 | 0 | N | 0 | 0 | 3 | 3 | 121 | Open Data and Data Sharing in Government |
| 20 | `6a996d6d266163e0a9606c74` | - | igot | beginner | 12 | - | 0 | 0 | N | 0 | 0 | 2 | 4 | 133 | Responsible Use of Generative AI in Government |
| 21 | `6a996d6d266163e0a9606c75` | - | igot | beginner | 12 | - | 0 | 0 | N | 0 | 0 | 0 | 3 | 120 | Digital Accessibility for Public Services |
| 22 | `6a996d6d266163e0a9606c76` | - | igot | beginner | 12 | - | 0 | 0 | N | 0 | 0 | 0 | 2 | 126 | Blockchain Fundamentals for Public Administration |
| 23 | `6a996d6d266163e0a9606c77` | - | igot | intermediate | 18 | - | 0 | 0 | N | 0 | 0 | 1 | 6 | 117 | Information Security Management Basics |
| 24 | `6a996d6d266163e0a9606c78` | - | igot | intermediate | 18 | - | 0 | 0 | N | 0 | 0 | 0 | 0 | 122 | Digital Service Design for Citizens |
| 25 | `6a996d6d266163e0a9606c79` | - | igot | beginner | 12 | - | 0 | 0 | N | 0 | 0 | 1 | 1 | 118 | Effective Communication in Public Service |
| 26 | `6a996d6d266163e0a9606c7a` | - | igot | intermediate | 18 | - | 0 | 0 | N | 0 | 0 | 2 | 2 | 119 | Effective Leadership in Public Service |
| 27 | `6a996d6d266163e0a9606c7b` | - | igot | intermediate | 12 | - | 0 | 0 | N | 0 | 0 | 1 | 3 | 116 | Problem Solving and Decision Making |
| 28 | `6a996d6d266163e0a9606c7c` | - | igot | beginner | 12 | - | 0 | 0 | N | 0 | 0 | 0 | 1 | 111 | Teamwork and Collaboration |
| 29 | `6a996d6d266163e0a9606c7d` | - | igot | beginner | 12 | - | 0 | 0 | N | 0 | 0 | 1 | 1 | 106 | Ethics and Integrity in Public Service |
| 30 | `6a996d6d266163e0a9606c7e` | - | igot | beginner | 6 | - | 0 | 0 | N | 0 | 0 | 0 | 2 | 116 | Time Management and Workplace Productivity |
| 31 | `6a996d6d266163e0a9606c7f` | - | igot | intermediate | 12 | - | 0 | 0 | N | 0 | 0 | 1 | 3 | 117 | Negotiation and Stakeholder Management |
| 32 | `6a996d6d266163e0a9606c80` | - | igot | beginner | 12 | - | 0 | 0 | N | 0 | 0 | 1 | 4 | 115 | Presentation Skills for Government Officials |
| 33 | `6a996d6d266163e0a9606c81` | - | igot | beginner | 12 | - | 0 | 0 | N | 0 | 0 | 0 | 0 | 119 | Emotional Intelligence at the Workplace |
| 34 | `6a996d6d266163e0a9606c82` | - | igot | intermediate | 18 | - | 0 | 0 | N | 0 | 0 | 2 | 6 | 132 | Change Management in Government |
| 35 | `6a996d6d266163e0a9606c83` | - | igot | intermediate | 12 | - | 0 | 0 | N | 0 | 0 | 1 | 2 | 121 | Critical Thinking for Public Policy and Administration |
| 36 | `6a996d6d266163e0a9606c84` | - | igot | beginner | 6 | - | 0 | 0 | N | 0 | 0 | 0 | 3 | 138 | Stress Management and Resilience at Work |
| 37 | `6a996d6d266163e0a9606c85` | - | nssta | intermediate | 30 | - | 0 | 0 | N | 0 | 0 | 2 | 3 | 206 | Index Numbers and Price Statistics in India |
| 38 | `6a996d6d266163e0a9606c86` | - | nssta | intermediate | 30 | - | 0 | 0 | N | 0 | 0 | 1 | 2 | 238 | Social Statistics |
| 39 | `6a996d6d266163e0a9606c87` | - | nssta | advanced | 30 | - | 0 | 0 | N | 0 | 0 | 1 | 2 | 291 | National Accounts Statistics |
| 40 | `6a996d6d266163e0a9606c88` | - | nssta | intermediate | 30 | - | 0 | 0 | N | 0 | 0 | 2 | 5 | 298 | Sampling Methods and Techniques used in Large Scale Sample Surveys |
| 41 | `6a996d6d266163e0a9606c89` | - | nssta | intermediate | 30 | - | 0 | 0 | N | 0 | 0 | 1 | 3 | 265 | Demography and Population Studies |
| 42 | `6a996d6d266163e0a9606c8a` | - | nssta | advanced | 30 | - | 0 | 0 | N | 0 | 0 | 1 | 4 | 194 | Training of Trainers (TOT) - Index Numbers and Price Statistics |
| 43 | `6a996d6d266163e0a9606c8b` | - | nssta | advanced | 30 | - | 0 | 0 | N | 0 | 0 | 1 | 4 | 201 | Training of Trainers (TOT) - National Accounts Statistics |
| 44 | `6a996d6d266163e0a9606c8c` | - | nssta | advanced | 30 | - | 0 | 0 | N | 0 | 0 | 2 | 5 | 263 | Planning and Designing of Large Scale Sample Surveys |
| 45 | `6a996d6d266163e0a9606c8d` | - | nssta | intermediate | 30 | - | 0 | 0 | N | 0 | 0 | 1 | 2 | 242 | Handling Large Scale Data & Data Analysis using R |
| 46 | `6a996d6d266163e0a9606c8e` | - | nssta | advanced | 30 | - | 0 | 0 | N | 0 | 0 | 0 | 5 | 251 | Big Data Analysis |
| 47 | `6a996d6d266163e0a9606c8f` | - | nssta | advanced | 30 | - | 0 | 0 | N | 0 | 0 | 1 | 1 | 211 | Poverty Analysis and measuring Inequality |
| 48 | `6a996d6d266163e0a9606c90` | - | nssta | intermediate | 30 | - | 0 | 0 | N | 0 | 0 | 1 | 4 | 233 | Labour Force and Employment Statistics |
| 49 | `6a996d6d266163e0a9606c91` | - | nssta | advanced | 30 | - | 0 | 0 | N | 0 | 0 | 1 | 4 | 223 | Artificial Intelligence (AI) and Concept of Block Chain |
| 50 | `6a996d6d266163e0a9606c92` | - | nssta | beginner | 30 | - | 0 | 0 | N | 0 | 0 | 1 | 2 | 239 | Communication Skill Development |
| 51 | `6a996d6d266163e0a9606c93` | - | nssta | intermediate | 30 | - | 0 | 0 | N | 0 | 0 | 1 | 5 | 256 | Python Training for Statisticians |
| 52 | `6a996d6d266163e0a9606c94` | - | nssta | advanced | 30 | - | 0 | 0 | N | 0 | 0 | 1 | 1 | 182 | Data Analysts and Data Ware House |
| 53 | `6a996d6d266163e0a9606c95` | - | nssta | advanced | 30 | - | 0 | 0 | N | 0 | 0 | 1 | 1 | 209 | Advanced Sampling Techniques with practical examples from NSSO surveys, Health surveys etc. |
| 54 | `6a996d6d266163e0a9606c96` | - | nssta | advanced | 60 | - | 0 | 0 | N | 0 | 0 | 1 | 1 | 230 | Data Mining Techniques and Data Analysis |
| 55 | `6a996d6d266163e0a9606c97` | - | nssta | advanced | 60 | - | 0 | 0 | N | 0 | 0 | 1 | 3 | 164 | Training on Artificial Intelligence and Machine Learning |
| 56 | `6a996d6d266163e0a9606c98` | - | nssta | intermediate | 30 | - | 0 | 0 | N | 0 | 0 | 0 | 0 | 222 | Current Economic Issues |
| 57 | `6a996d6d266163e0a9606c99` | - | nssta | beginner | 210 | - | 0 | 0 | N | 0 | 0 | 0 | 5 | 203 | Induction Training Programme for New Recruits - Subordinate Statistical Service (SSS) |
| 58 | `6a996d6d266163e0a9606c9a` | - | nssta | advanced | 240 | - | 0 | 0 | N | 0 | 0 | 0 | 1 | 232 | Sample Survey Methodology & Estimation |
| 59 | `6a996d6d266163e0a9606c9b` | - | nssta | intermediate | 120 | - | 0 | 0 | N | 0 | 0 | 1 | 3 | 274 | Official Statistics & Related Methodology (ISEC) |
| 60 | `6a996d6d266163e0a9606c9c` | - | nssta | beginner | 30 | - | 5 | 31 | N | 0 | 0 | 0 | 1 | 229 | Official Statistics Awareness Programme for University Professors and PG Students |
| 61 | `6ab01da7b465324f4d5c9577` | `igot-crs-01` | igot | intermediate | 10 | Data Analytics | 6 | 0 | Y | 5 | 2 | 2 | 0 | 133 | Data Analysis with Python |
| 62 | `6ab01da7b465324f4d5c9578` | `igot-crs-02` | igot | intermediate | 2.7 | Artificial Intelligence | 4 | 0 | Y | 5 | 1 | 2 | 0 | 128 | Artificial Intelligence for Public Governance |
| 63 | `6ab01da7b465324f4d5c9579` | `igot-crs-03` | igot | beginner | 1 | Sustainable Development | 3 | 0 | Y | 4 | 1 | 2 | 0 | 137 | Sustainable Development Goals |
| 64 | `6ab01da7b465324f4d5c957a` | `igot-crs-04` | igot | beginner | 1.2 | Digital Governance | 4 | 0 | Y | 5 | 1 | 2 | 0 | 121 | Digital Personal Data Protection Act, 2023 |
| 65 | `6ab01da7b465324f4d5c957b` | `igot-crs-05` | igot | beginner | 1 | Law & Governance | 4 | 0 | Y | 5 | 1 | 2 | 0 | 131 | Bharatiya Nyaya Sanhita, 2023: An Introduction |
| 66 | `6ab01da7b465324f4d5c957c` | `igot-crs-06` | igot | beginner | 1 | Financial Management | 4 | 0 | Y | 5 | 1 | 2 | 0 | 142 | Personal Finance for Karmayogis |

---

## 3. Backend Models, Schemas & Relationship Audit

### 3.1 Model & Schema Inventory (Directly Verified)

- **`Course`** ([Course.js](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/models/Course.js#L1-L181)):
  - Embedded `modules` ([`moduleSchema`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/models/Course.js#L14-L22)) holds `{ title, durationMins, youtubeUrl, slides }` where each slide has `{ slideNumber, title, bulletPoints, imageUrl, notes }`.
  - Schema field naming uses `difficulty` (`'beginner'|'intermediate'|'advanced'`) and `durationHours` ([Course.js](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/models/Course.js#L101-L116)), whereas several backend services and frontend components expect `level`, `estimatedHours`, or `duration_hours` (e.g., [`skillGap.service.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/skillGap.service.js#L569-L570), [`NsstaTrainingPage.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/training/NsstaTrainingPage.jsx#L105), [`MyLearningPathPage.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/learning/MyLearningPathPage.jsx#L461)).
  - **Missing indexes:** `kaushalai.courses` has only the default `_id_` index (no index on `externalCourseId`, `source`, `isPublished`, `skillTags`, or `category`).
- **`Enrollment`** (`server/src/models/Enrollment.js`):
  - Fields: `userId` (`ObjectId`), `courseId` (`ObjectId`), `status` (`recommended | enrolled | in_progress | completed`, default `enrolled`), `progressPercent` (`0..100`, default `0`), `startedAt`, `completedAt`; unique compound index `{ userId: 1, courseId: 1 }`.
  - **No granular completion tracking:** Zero fields for completed module IDs, completed slide/video milestones, quiz pass requirement, or activity timestamps per module.
  - **Live DB orphan (`1` of `10` enrollments):** `6a986398a879f61d35c5c6d4` (`userId: 6a9856ef0b4eb7ab91d426dc`) points to missing `courseId: 6a97a9869d49c5d450812353` (`courseExists: false`).
- **`LearningProgress`** (`server/src/models/LearningProgress.js`):
  - Separate collection `learning_progress` using snake_case `Mixed` types (`user_id`, `course_id`) plus `course_completed`, `quiz_passed`, `quiz_score`, `lab_unlocked`, `lab_completed`, `lab_score`, `lab_completed_at`, `lab_id`; unique index `{ user_id: 1, course_id: 1 }`.
  - Used primarily by [`labs.controller.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/labs.controller.js#L109-L230), never updated or read by `course.service.js`.
  - **Live DB drift & invalid references (`kaushalai.learning_progress`, `10` docs):**
    - **7 of 10** documents reference legacy non-ObjectId string `course_id` values (`'igot-crs-01'..'igot-crs-06'` and `'Independent Practice'`) that do not match `Course._id`.
    - Doc `6a9d38083ff82d940b781890` (`user_id: 6a9716b23a22a65916c92285`, `course_id: 6a996d6d266163e0a9606c61`) marks `course_completed: true, quiz_passed: true`, whereas the matching `Enrollment` `6a9d520e39320d541c8a90db` for the exact same user & course shows `status: 'enrolled', progressPercent: 0, completedAt: null`.
- **`LearningPath` & `LearningPathItem`** (`learning_paths: 12`, `learning_path_items: 104`):
  - `0` orphan `LearningPathItem.course_id` references in `kaushalai` right now; `62` `recommendations` also have `0` orphan course IDs right now.
- **`CourseCompetency`** (`course_competencies: 164`):
  - Unique `{ course_id: 1, competency_id: 1 }`. Maps `55` of `66` courses; all `6` curated courses `#61–#66` have `0` entries here despite having `2` `skillTags` each.

---

## 4. Enrollment, Module Delivery & Learning Dataflow Audit

1. **Enrollment (`POST /api/users/me/enrollments`):** Handled by [`course.controller.js:61-68`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/course.controller.js#L61-L68) and [`course.service.js:81-108`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/course.service.js#L81-L95). Looks up `Course` by `_id`, then falls back to `externalCourseId` (allowing `'igot-crs-01'`). Throws `409` if already enrolled.
2. **Broken Course-Get vs Enroll Asymmetry:** `getCourseById` in `course.service.js:22-39` only checks `_id` plus two hardcoded ObjectIds for *Official Statistics Awareness Programme*; calling `GET /api/courses/igot-crs-01` fails `_id` cast and returns `404` even though `POST /api/users/me/enrollments` accepts `externalCourseId: 'igot-crs-01'`.
3. **Destructive Course Deletion Leaves Orphans:** [`deleteCourse`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/course.service.js#L66-L68) runs `Course.findByIdAndDelete(id)` with **zero** cleanup of `Enrollment`, `LearningPathItem`, `Recommendation`, `CourseCompetency`, `LearningProgress`, or `Quiz.courseId` — directly explaining orphan enrollment `6a986398a879f61d35c5c6d4`.
4. **Two Conflicting Learning Path Engines:**
   - **Canonical path (`GET /api/learning-path`):** Routed via [`skillGap.routes.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/routes/skillGap.routes.js#L20) -> [`skillGap.controller.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/skillGap.controller.js#L340-L375), merging active `LearningPathItem` rows with `Enrollment` progress and filtering `isPublished === false` on the controller.
   - **Dead legacy path (`GET /api/users/me/learning-path`):** `learningPath.service.js:18-42` still queries deprecated camelCase fields (`user.jobRoleId`, `UserCompetency.find({ userId })`, `uc.currentLevel`, `rc.competencyId`, `rc.requiredLevel`), returning `400` (`jobRoleId` missing) for canonical users (confirmed by Part 33 test assertion `4.13`).
5. **Completed Courses Not Excluded from Recommendations:** [`skillGap.service.js:532-541`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/skillGap.service.js#L532-L541) queries:
   ```js
   const completedEnrollments = await Enrollment.find({
     user_id: userId,
     status: 'completed',
   }).select('course_id')
   ```
   Because `Enrollment.js` defines `userId` and `courseId` (camelCase), this query **always returns `[]`** and `e.course_id` is always `undefined`. Completed courses therefore remain eligible for recommendation and learning-path regeneration.

---

## 5. Progress Calculation, Completion Integrity & Certificate Trustworthiness Audit

Tracing [`CourseProgressPage.jsx:308-462`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.jsx#L308-L462) and `course.service.js:112-178`:

1. **Client-Supplied Completion Without Evidence:** `toggleComplete(idx)` ([`CourseProgressPage.jsx:447-453`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.jsx#L447-L453)) computes `Math.round((next.length / modulesList.length) * 100)` client-side and sends that integer to [`updateProgress`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/course.controller.js#L70-L81). Backend `updateProgress` clamps `0..100`, sets `status = 'completed'` and `completedAt` when `progressPercent === 100`, syncs `LearningPathItem.status`, and calls `certificateService.issueCourseCertificate(userId, saved.courseId)`.
   - **No** video watch verification, slide view tracking, module existence check (`59` courses use synthetic frontend modules!), or quiz pass verification is performed before marking complete and issuing a certificate.
2. **State Loss / Fabricated Module Indices on Reload:** [`CourseProgressPage.jsx:432-437`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.jsx#L432-L437) derives `completedModules` from `count = Math.round((enrollment.progressPercent / 100) * modulesList.length)` as `[0, 1, ..., count - 1]`. Checking Module 4 (index 3) saves `20%`, which after reload displays **Module 1 (index 0)** as completed instead.
3. **Silent Persistence Failure When Un-Enrolled:** If a learner reaches `/my-courses/:id` without a valid DB `Enrollment` (e.g., via `<CourseToPlayerRedirect />` on `/courses/:id`, or after an enrollment error swallowed in [`IgotCoursesPage.jsx:449-452`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/IgotCoursesPage.jsx#L449-L452) or [`RecommendedLearningPage.jsx:256-259`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/learning/RecommendedLearningPage.jsx#L256-L259)), `enrollment?._id` is `undefined`. [`CourseProgressPage.jsx:441`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.jsx#L441) returns `Promise.resolve()`, letting the progress bar reach `100%` visually with **zero DB persistence** and zero error message.
4. **Placeholder Notes & Fake Course AI Assistant:**
   - Course notes use browser-only `localStorage.getItem('notes-' + id + '-' + activeModuleIdx)` ([`CourseProgressPage.jsx:993-994`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.jsx#L993-L994)), lost across devices/browsers.
   - Embedded [`AiChatPanel`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.jsx#L145-L176) is a **hardcoded `setTimeout(..., 1200)` mock** returning 3 canned strings regardless of user questions—completely bypassing Phase 34 backend AI chat APIs.

---

## 6. Competency & SkillGap Integration Audit

- **Positive Guardrail Preserved:** Completing a course (`progressPercent = 100`) does **not** directly mutate `UserCompetency.current_level` or `SkillGap` (verified both by reading `course.service.js:127-175` and running `test_part22_learning_path_progression.js` assertion `3.1.2`).
- **Broken Assessment-to-Course Bridge:**
  - In `kaushalai.quizzes` (**18** quizzes), `courseId` is empty (`""`) on `6` official quizzes, `undefined` on `6` quizzes, and legacy codes `"C01".."C06"` on `6` seeded comprehensive quizzes — **0 / 18** match any real `Course._id`.
  - Furthermore, **17 of 18** quizzes have `tagCompetencyIds.length === 0` (only *Statistical Methods Assessment* has `2`). Thus even if a learner located a quiz manually under `/quizzes`, completing course-linked assessments is broken from the course player ([`CourseProgressPage.jsx:564-595`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.jsx#L564-L595) renders `"Take Quiz"` disabled across all 66 courses) and wouldn't map back to competencies for 17/18 quizzes.
- **Course-to-Competency Gaps in Recommendations:**
  - `courseCompetencySync.js:11-16` short-circuits whenever `CourseCompetency.countDocuments() > 20`, so adding `#61–#66` left all 6 curated courses with `0` `course_competencies` entries.
  - Although [`skillGap.service.js:581-585`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/skillGap.service.js#L581-L585) falls back to `Course.find({ skillTags: { $in: gapCompIds } })`, it omits `{ isPublished: true }` and reads `cc.course_id.level` / `estimatedHours` instead of `difficulty` / `durationHours`.
  - **5 courses** (`#11, #18, #24, #33, #56`) have zero `skillTags` and zero `CourseCompetency` links, making them unreachable by gap-based recommendations.

---

## 7. Frontend Page-by-Page & Routing Audit

| Page / Route | Status | Verified Defects & Findings |
|---|---|---|
| [`App.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/App.jsx#L249-L264) | Partial / Conflicted | Redirects `/courses/:id` straight to `/my-courses/:id` (`CourseProgressPage`), bypassing `CourseDetailPage.jsx`. Redirects `/igot-integration`, `/courses/igot-integration`, `/my-courses` to `/my-learning`. Does **not** define `/courses/:id/progress`. |
| [`CourseProgressPage.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.jsx) (`/my-courses/:id`) | Broken / Mocked | Injects 5 fake modules for `59/66` courses (`L369-377`); renders `{mod.duration}` (`undefined` for DB schema `durationMins`, `L745`); silent no-op if un-enrolled (`L441`); reconstructs wrong module checkboxes from `%` (`L433-436`); hardcoded `setTimeout` `AiChatPanel` (`L166-175`); `localStorage`-only notes (`L993-994`); disabled `"Take Quiz"` (`L564-595`); fixed inline `width: 280` sidebar (`L662`) ignoring [`CourseProgressPage.module.css`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.module.css). |
| [`CourseDetailPage.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseDetailPage.jsx) (unrouted) | Dead / Unsafe | Unreachable via router (`App.jsx:257`); still referenced in [`IgotIntegrationLearnerPage.jsx:695`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/IgotIntegrationLearnerPage.jsx#L695). Fabricates fake enrollment on catch with `"Enrolled successfully in offline demonstration mode."` (`L671-677`). |
| [`MyCoursesPage.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/MyCoursesPage.jsx) (unrouted) | Dead / Mocked | Unreachable (`/my-courses` redirects to `/my-learning`, `App.jsx:258`). Merges 6 hardcoded mock courses (`enr-crs-01..06`), defaults missing progress to `45%`, hardcodes `totalModules: 6`. |
| [`IgotIntegrationLearnerPage.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/IgotIntegrationLearnerPage.jsx) (unrouted) | Dead / Broken Link | Redirected by `App.jsx:254-255`, yet its detail modal ([`L687`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/IgotIntegrationLearnerPage.jsx#L687), [`L695`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/IgotIntegrationLearnerPage.jsx#L695)) links to `/courses/:id/progress` — a **non-existent route** hitting `*` (`NotFoundPage`)! |
| [`IgotCoursesPage.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/IgotCoursesPage.jsx) (`/courses/igot`) | Functional with Bugs | Merges `CATALOGUE` fallback (`L483-493`) and swallows `enrollInCourse` errors (`L449-452`) with `"Enrolled in local mode! Opening player..."` before redirecting to `/my-courses/:id`. |
| [`MyLearningPathPage.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/learning/MyLearningPathPage.jsx) (`/my-learning`) | Mostly Sound | Reads `/api/learning-path` & reconciles `/api/users/me/enrollments` ([`L44-L122`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/learning/MyLearningPathPage.jsx#L44-L122)). Reads `course.estimatedHours \|\| course.durationHours \|\| course.duration` (`L461`); does not auto-create enrollment on click, instead navigates straight to `/my-courses/:id` (`L466, L489, L606`) where `progressMutation` silently no-ops if un-enrolled! |
| [`RecommendedLearningPage.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/learning/RecommendedLearningPage.jsx) (`/recommendations`) | Partial Bug | [`handleCourseAction`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/learning/RecommendedLearningPage.jsx#L252-L266) ignores `enrollMutation` failures (`onError: () => navigate(...)`), risking un-enrolled player entry. |
| [`NsstaTrainingPage.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/training/NsstaTrainingPage.jsx) (`/training/nssta`) | Mocked / Drift | Mixes static `OFFICIAL_NSSTA_PROGRAMMES` (`L22-78`) with DB `nssta` courses; reads `c.duration_hours \|\| 40` (`L105`, always `40 Hours` because DB has `durationHours`); hardcodes KPIs `14` & `5` (`L177, L188`); `handleNominate` (`L134-136`) and PDF link (`L159-160`) are toast-only stubs. |
| [`TrainingDetailPage.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/training/TrainingDetailPage.jsx) (`/training/:id`) | Broken / Crash Risk | `handleApply` (`L84-87`) only toggles local `nominated` boolean; `L198` renders `{mod}` directly inside JSX—if a DB course with `modules: [{ title, ... }]` is opened via `/training/:mongoId`, React throws an object-child render error! |
| [`EmployeeDashboard.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/dashboard/EmployeeDashboard.jsx#L966) (`/dashboard`) | Sound | Links in-progress enrollments to `/my-courses/${cId}`. Empty state directs to `/courses/igot`. |
| [`CourseManagementPage.jsx`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/admin/CourseManagementPage.jsx#L151-L250) (`/admin/courses`) | Functional with Caveat | Allows admin CRUD on courses, modules, slides, and resources, but course deletion leaves orphan enrollments/paths (`course.service.js:66-68`) and updates don't refresh `CourseCompetency` once count > 20. |

---

## 8. API Endpoints, Validation & Authorization Audit

Verified routes in [`server/src/app.js:199-213`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/app.js#L199-L213) and [`course.routes.js`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/routes/course.routes.js#L1-L55):

1. `GET /api/courses` (`authenticate`): Calls `courseService.listCourses`, which **does not** filter `{ isPublished: true }` — unpublished draft courses are exposed to learners.
2. `GET /api/courses/:id` (`authenticate`): **Does not** enforce `isPublished: true` for learners; fails with `404` on `externalCourseId` strings like `igot-crs-01` (except two hardcoded *Official Statistics* IDs).
3. `POST /api/courses`, `PUT /api/courses/:id`, `DELETE /api/courses/:id` (`authenticate, authorize('admin')`): Properly restricted to `admin`, but `DELETE` lacks cascade cleanup.
4. `GET /api/users/me/enrollments` & `POST /api/users/me/enrollments` (`authenticate`): Properly scoped to `req.user.id`; `POST` checks duplicate (`409`).
5. `PUT /api/users/me/enrollments/:id/progress` (`authenticate, validate(progressSchema)`): Verifies enrollment ownership (`userId`), clamps `0..100`, enforces monotonic non-reversion from `completed`. **Critical flaw:** Accepts arbitrary client integer `progressPercent` without verifying any content consumption, module completion, or quiz pass, and directly issues a `Certificate` on `100`.
6. `POST /api/courses/:id/rate` (`authenticate`): [`rateCourse`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/course.controller.js#L83-L118) validates `1 <= Number(star) <= 5` (no integer check, allowing `4.3` etc.), does **not** require enrollment, and passes `req.params.id` raw into `Course.findById` (throws CastError on string `externalCourseId`).
7. `GET /api/learning-path` vs `GET /api/users/me/learning-path`: Canonical endpoint (`skillGap.controller.js`) works cleanly and scopes to `req.user.id`; legacy endpoint (`learningPath.controller.js`) relies on dead camelCase schemas.
8. `/api/labs/*` (`labs.controller.js`): Persists into `LearningProgress` (`learning_progress`) independently from `Enrollment`.

---

## 9. Existing Test Coverage Audit & Live Test Results (`kaushalai_test`)

Executed sequentially on **`kaushalai_test`** with pre/post read-only count verification on **`kaushalai`**:

| Suite | Command Run | Outcome | Critical Blind Spots / Test Limitations |
|---|---|---|---|
| `server/test_part22_learning_path_progression.js` | `node server/test_part22_learning_path_progression.js` | **63 Passed, 0 Failed** | Explicitly validates `PUT .../progress` with raw `100` setting `status: 'completed'` and `LearningPathItem: 'completed'` without any module or quiz check; tests `skillGap.service` via `computeUserSkillGaps`, missing the `user_id`/`course_id` bug in `generateRecommendationsAndLearningPath`. |
| `server/test_part33_learner_ux_and_navigation.js` | `node server/test_part33_learner_ux_and_navigation.js` | **54 PASSED, 0 FAILED** | Mixes static regex checks with live API hits (`kaushalai_test`); treats `GET /api/users/me/learning-path` returning `400` (`jobRoleId` missing) as expected "compatibility"; does not test actual video/module playback. |
| `server/test_part33_1_igot_data_authenticity.js` | `node server/test_part33_1_igot_data_authenticity.js` | **36 PASSED, 0 FAILED** | **False-positive assertion (`4.4`):** Asserts `IgotIntegrationLearnerPage.jsx` links to `"authentic player route /courses/:id/progress"`, even though `/courses/:id/progress` does not exist in `App.jsx` and renders `NotFoundPage`. |

*(Other suites such as `test_part24_2_certificates.js` and `test_part24_2_2_2_completion_date_integrity.js` were inspected or noted from repository inventory; not executed in this pass.)*

**Post-Test `kaushalai` Dev DB Verification (Immutable):**  
`users: 15, courses: 66, course_competencies: 164, enrollments: 10, learning_progress: 10, learning_paths: 12, learning_path_items: 104, recommendations: 62, competencies: 59, quizzes: 18, questions: 432, certificates: 0, user_competencies: 41, usercompetencies: 25, skill_gaps: 264, assessment_attempts: 7, quizattempts: 12`.

---

## 10. Catalog of Verified Defects

| ID | File Path & Line Ref | Verified Defect Description |
|---|---|---|
| **DEF-01** | `kaushalai.courses` (`#1–#59`), [`CourseProgressPage.jsx:369-377`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.jsx#L369-L377) | **59/66 courses (`89.4%`) have zero modules, slides, videos, transcripts, objectives, or resources**; player silently injects 5 hardcoded placeholder modules. |
| **DEF-02** | `kaushalai.courses` (`#61–#66`), [`seedCuratedIgotCourses.js:35-42`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/seed/seedCuratedIgotCourses.js#L35-L42) | Curated iGOT courses repeat the exact same single YouTube URL across every module, have 0 transcripts, and use generic root domain URLs for resources. |
| **DEF-03** | `server/src/models/Enrollment.js`, `course.service.js:127-166`, [`CourseProgressPage.jsx:447-453`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.jsx#L447-L453) | Progress & course completion trust a single client-supplied `progressPercent` integer (`0..100`); zero backend module tracking, video/slide tracking, or quiz gating before issuing `Certificate`. |
| **DEF-04** | [`CourseProgressPage.jsx:432-437`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.jsx#L432-L437) | On page reload, `completedModules` is synthesized sequentially (`0..count-1`), erasing which specific modules the learner completed. |
| **DEF-05** | [`CourseProgressPage.jsx:441`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.jsx#L441), [`IgotCoursesPage.jsx:449-452`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/IgotCoursesPage.jsx#L449-L452), [`RecommendedLearningPage.jsx:256-259`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/learning/RecommendedLearningPage.jsx#L256-L259), [`MyLearningPathPage.jsx:466`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/learning/MyLearningPathPage.jsx#L466) | Enrollment errors are swallowed with fake "local mode" toasts or users enter player un-enrolled via `/my-learning` / `/courses/:id`, making `progressMutation` a silent `Promise.resolve()` no-op. |
| **DEF-06** | `kaushalai.quizzes` (`0/18`), [`CourseProgressPage.jsx:564-595`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.jsx#L564-L595) | Zero quizzes link to a valid `Course._id` (`""`, `undefined`, or `"C01".."C06"`), and `17/18` have `tagCompetencyIds: []`; `"Take Quiz"` is disabled on every course. |
| **DEF-07** | [`skillGap.service.js:532-541`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/skillGap.service.js#L532-L541) | Queries `Enrollment.find({ user_id: userId, status: 'completed' }).select('course_id')` with wrong field names (`userId`/`courseId` in schema), failing to filter out completed courses from recommendations. |
| **DEF-08** | `courseCompetencySync.js:11-16`, `kaushalai.courses` (`#11, #18, #24, #33, #56`, `#61–#66`) | Competency sync aborts when `existingCount > 20`, leaving curated `#61–#66` at `0` `CourseCompetency` rows; 5 other courses have zero `skillTags` and zero `CourseCompetency`. |
| **DEF-09** | [`course.service.js:66-68`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/course.service.js#L66-L68), `kaushalai.enrollments` (`6a986398a879f61d35c5c6d4`) | `deleteCourse` performs no cascade cleanup, leaving orphan `Enrollment` pointing to missing course `6a97a9869d49c5d450812353`. |
| **DEF-10** | `learning_progress` (`10` docs), [`labs.controller.js:109-230`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/labs.controller.js#L109-L230) | Split progress store: 7/10 docs store unresolvable string `course_id`s (`igot-crs-01..06`, `Independent Practice`), and doc `6a9d38083ff82d940b781890` contradicts `Enrollment` (`completed:true` vs `enrolled:0%`). |
| **DEF-11** | [`CourseProgressPage.jsx:145-176`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.jsx#L145-L176) | Embedded course `AiChatPanel` uses a static `setTimeout` mock instead of calling the Phase 34 AI tutor backend. |
| **DEF-12** | [`CourseProgressPage.jsx:993-994`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.jsx#L993-L994) | Learner course notes persist solely in browser `localStorage`. |
| **DEF-13** | [`IgotIntegrationLearnerPage.jsx:687`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/IgotIntegrationLearnerPage.jsx#L687), [`App.jsx:254-259`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/App.jsx#L254-L259), `test_part33_1_igot_data_authenticity.js` | Dead route `/courses/:id/progress` linked by `IgotIntegrationLearnerPage` and falsely verified by Part 33.1 test `4.4`; unrouted `CourseDetailPage.jsx` (`L671-677`) and `MyCoursesPage.jsx` (`L23-137`) retain mock/offline stubs. |
| **DEF-14** | [`TrainingDetailPage.jsx:84-87,198`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/training/TrainingDetailPage.jsx#L84-L87), [`NsstaTrainingPage.jsx:105,134,177-188`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/training/NsstaTrainingPage.jsx#L105) | NSSTA training uses fake nominations/KPIs, reads wrong `duration_hours` property (displays `40 Hours`), and crashes in `TrainingDetailPage` if `modules` contains objects instead of strings. |
| **DEF-15** | [`course.service.js:4-39`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/course.service.js#L4-L39), [`course.controller.js:83-118`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/controllers/course.controller.js#L83-L118), [`skillGap.service.js:569-594`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/server/src/services/skillGap.service.js#L569-L594) | Missing `isPublished: true` filter on course list/detail & gap-query, schema field mismatches (`level`/`estimatedHours` vs `difficulty`/`durationHours`), `{mod.duration}` blank label (`CourseProgressPage.jsx:745`), unvalidated fractional ratings without enrollment check, and `learningPath.service.js:18-42` dead camelCase path logic. |
| **DEF-16** | [`CourseProgressPage.jsx:661-669`](file:///Users/abhinikesh/Documents/Projects/KaushalAI/client/src/pages/courses/CourseProgressPage.jsx#L661-L669) | Fixed `280px` inline sidebar & AI panel widths on mobile/tablet without responsive breakpoints (`CourseProgressPage.module.css` unused). |

---

## 11. Severity Classification Matrix

| Severity | Defects | Justification |
|---|---|---|
| **Critical** | `DEF-01`, `DEF-03`, `DEF-06`, `DEF-07` | System cannot deliver real structured lessons for `89.4%` of catalog, accepts unverified self-attested `100%` completion triggering real certificates, has `0` working course-linked quizzes, and fails to exclude completed courses from recommendations due to wrong DB field names. |
| **High** | `DEF-02`, `DEF-04`, `DEF-05`, `DEF-08`, `DEF-09`, `DEF-10`, `DEF-11`, `DEF-13` | Repeated module videos across curated courses, wrong module state reconstruction on reload, silent no-op progress when entering player un-enrolled, curated courses excluded from `CourseCompetency`, orphan DB records from non-cascading deletes, contradicted dual progress stores, fake `setTimeout` course AI panel, and broken `/courses/:id/progress` link covered by a false-positive test. |
| **Medium** | `DEF-12`, `DEF-14`, `DEF-15` | `localStorage`-only learner notes, NSSTA mock nomination & object-child crash risk, schema naming mismatches (`duration_hours`/`estimatedHours`/`level` vs `durationHours`/`difficulty`), unpublished-course exposure, un-enrolled/fractional course ratings, and legacy `/api/users/me/learning-path` code debt. |
| **Low** | `DEF-16` | Mobile/tablet layout overflow risk from fixed inline widths in `CourseProgressPage.jsx` plus missing non-`_id` indexes on `courses` (`66` docs currently small). |

---

## 12. Recommended Phase 36.2 Remediation Sequence

Execute incrementally without modifying frozen Auth (Parts 32.1.1–32.1.18), Phase 34 AI conversation persistence schema, or the canonical `SkillGap` (`gap = required_level - current_level`) formula:

1. **Step 1 — Data Model & Referential Integrity Hardening (`Enrollment`, `Course`, `Quiz`, `CourseCompetency`):**
   - Extend `Enrollment` schema with granular server-persisted `completedModuleIds: [String]` / `moduleProgress` map, `quizPassed`, and server-computed `progressPercent` (derived from verified completed modules + required assessment gate when a linked quiz exists).
   - Remove the `existingCount > 20` short-circuit in `courseCompetencySync.js` so `#61–#66` and newly created/updated courses sync idempotently into `course_competencies`.
   - Add cascading/soft-archive protection in `deleteCourse` and add indexes on `Course` (`source`, `isPublished`, `externalCourseId`, `skillTags`).
   - Standardize schema field access on canonical `difficulty` and `durationHours` (and module `durationMins`), fixing `skillGap.service.js:533-536` (`userId` / `courseId`), `isPublished: true` filters, and `GET /api/courses/:id` `externalCourseId` resolution.
2. **Step 2 — Curated Content & Quiz Linkage Backfill (Non-Destructive Migration Scripts):**
   - Link the existing `18` `Quiz` records (especially the `6` `"C01".."C06"` comprehensive assessments and official domain quizzes) to real `Course._id` ObjectIds and populate `tagCompetencyIds` via explicit admin-reviewable idempotent mapping scripts (`--dry-run` first, `--apply` on `kaushalai_test` -> dev `kaushalai`).
   - Decide catalog honesty policy for the `59` metadata-only courses (`#1–#59`): either author authentic module/slide/video lessons for priority courses or explicitly mark/label `"External / Syllabus Only"` courses (`contentStatus: 'complete' | 'syllabus_only'`, gating self-progress & certificates until real modules/quizzes exist) and fix the `5` zero-competency courses (`#11, #18, #24, #33, #56`).
3. **Step 3 — Backend Progress, Quiz Gate & Certificate Authority:**
   - Replace client-supplied `progressPercent: 100` trust in `PUT /api/users/me/enrollments/:id/progress` with module-level endpoint (e.g. `POST /api/users/me/enrollments/:id/modules/:moduleId/complete`) or server-recomputed progress; gate `status: 'completed'` and `issueCourseCertificate` behind completed modules **and** linked quiz pass (when linked quiz exists), while unifying `LearningProgress` status writes.
4. **Step 4 — Frontend Player, Catalog & Navigation Cleanup:**
   - Remove synthetic 5-module fallback injection (`CourseProgressPage.jsx:369-377`), remove `AiChatPanel` mock (wire to Phase 34 `aiChat` API with `courseId` context), fix un-enrolled player entry (auto-enroll explicitly via UI with visible error banner, never silent `Promise.resolve()` or `"local mode"` lies), fix `{mod.duration}` -> `{mod.durationMins} mins`, and restore/persist learner notes cleanly if in scope.
   - Reconcile or retire orphaned pages (`CourseDetailPage.jsx`, `MyCoursesPage.jsx`, `IgotIntegrationLearnerPage.jsx` dead `/courses/:id/progress` link) and fix `NsstaTrainingPage` / `TrainingDetailPage` schema & crash bugs.
5. **Step 5 — Truthful Test Suite Overhaul (`kaushalai_test`):**
   - Fix `test_part33_1` assertion `4.4` (`/courses/:id/progress` false positive), update `test_part22` for server-derived module/quiz completion integrity, and add end-to-end integration tests covering: module completion reload persistence, blocked certificate issuance before quiz pass, completed course exclusion in recommendations, and un-enrolled error handling.

---

## 13. Data Migration & Backfill Risks

- **Legacy Orphan Enrollment (`6a986398a879f61d35c5c6d4`):** Re-pointing or deleting must preserve user audit trail; recommend flagging/cleaning in dry-run reconciliation script rather than silent deletion.
- **String `course_id` in `learning_progress` (`7` docs):** `'igot-crs-01'..'06'` correspond to `externalCourseId` on `#61–#66` (`6ab01da7b465324f4d5c9577..7c`), whereas `'Independent Practice'` has no `Course` record. Doc `6a9d38083ff82d940b781890` conflicts directly with `Enrollment` `6a9d520e39320d541c8a90db`; reconciliation must choose a clear source-of-truth rule before backfilling.
- **Re-seeding Curated Courses / Quizzes:** Seed scripts must match idempotently on `externalCourseId` / `title` / `materialId` rather than generating duplicate ObjectIds.

---

## 14. Verification Methodology, Evidence Tiers & Unverified Limitations

- **Directly Verified (Observed in Code, DB Queries, or Live Test Runs):**
  - All 66 `kaushalai.courses` documents, `164` `course_competencies`, `10` `enrollments`, `10` `learning_progress`, `18` `quizzes`, `104` `learning_path_items`, `62` `recommendations`, and `47` asset files in `client/public/slides/nasa-nssta/`.
  - All file paths, line references, schemas, routes, controllers, services, frontend React components, and live `kaushalai_test` runs (`Part 22: 63/0`, `Part 33: 54/0`, `Part 33.1: 36/0`) plus `kaushalai` pre/post invariants.
- **Inferred (Strongly Supported by Inspected Code, Not Live-Triggered in Browser):**
  - React crash risk in `TrainingDetailPage.jsx:198` when opening a DB course containing `{ title }` module objects (inferred from reading JSX child expression `{mod}` alongside `Course.js` `moduleSchema`).
  - Client-side navigation hitting `NotFoundPage` when following `IgotIntegrationLearnerPage.jsx:687` (`/courses/:id/progress`) (inferred by comparing `<Link>` target against `App.jsx:234-331`).
- **Unverified / Out-of-Scope in Read-Only Audit:**
  - Production MongoDB Atlas & deployed Render/Vercel database contents (audit inspected local `kaushalai` dev DB only).
  - External YouTube video embed availability/age-restrictions for the 6 video IDs in live user browsers.
  - Other test scripts not executed in this pass (`test_part24_2_certificates.js`, `test_part24_2_2_2_completion_date_integrity.js`, `test_part17_backend_integrity.js`).

---

## 15. Final Audit Verdict & Sign-Off Readiness

**Verdict: `FAIL`**

Although individual endpoints return `200`/`201` and existing legacy test suites pass, the KaushalAI learning system **does not function as one reliable, verifiable end-to-end learning platform**: `89.4%` of the course catalog lacks real curriculum content, `0` courses have working linked quizzes, progress & certificate issuance trust unverified client percentages, completed courses are never excluded by the recommendation query bug, and the player masks backend gaps with synthetic modules, `localStorage` state, "local mode" error swallowing, and a hardcoded `setTimeout` AI chatbot. Remediation under **Phase 36.2** is required before production sign-off.

