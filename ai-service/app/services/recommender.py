from __future__ import annotations

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from app.models.schemas import (
    CourseInput,
    GapItem,
    ReasonBreakdown,
    RecommendationItem,
    RecommendationRequest,
    RecommendationResponse,
)
from app.services.embedding_service import batch_embed

_DIFFICULTY_LEVELS = {"beginner": 1, "intermediate": 3, "advanced": 5}

# Score weights — must sum to 1.0
_W_GAP = 0.45
_W_ROLE = 0.20
_W_DIFFICULTY = 0.15
_W_CAREER = 0.20

_TOP_K = 10


# ── Scoring helpers ────────────────────────────────────────────────────────────


def _gap_match_score(
    course: CourseInput,
    gaps: list[GapItem],
    course_embedding: np.ndarray,
    gap_embeddings: dict[str, np.ndarray],
) -> tuple[float, str]:
    """
    Semantic similarity between the course and each gapped competency,
    weighted by gap size. Returns (score 0–100, name of best-matching competency).
    """
    active_gaps = [g for g in gaps if g.gap > 0]
    if not active_gaps:
        return 50.0, ""

    total_weight = sum(g.gap for g in active_gaps)
    weighted_sum = 0.0
    best_name = active_gaps[0].name
    best_sim = -1.0

    for gap in active_gaps:
        gap_emb = gap_embeddings[gap.competency_id]
        sim = float(
            cosine_similarity(course_embedding.reshape(1, -1), gap_emb.reshape(1, -1))[0][0]
        )
        sim = float(np.clip(sim, 0.0, 1.0))
        weight = gap.gap / total_weight
        weighted_sum += weight * sim
        if sim > best_sim:
            best_sim = sim
            best_name = gap.name

    return round(weighted_sum * 100, 2), best_name


def _difficulty_match_score(
    course: CourseInput,
    gaps: list[GapItem],
) -> tuple[float, str]:
    """
    Scores a course's difficulty against how far the user is from proficiency
    in the tagged competencies. A beginner course scores high when the user's
    current level in those competencies is low; an advanced course scores high
    when the user is nearly meeting requirements.
    """
    course_diff = _DIFFICULTY_LEVELS.get(course.difficulty, 3)

    # Find gaps whose competency name appears in the course's skill tags
    relevant = [g for g in gaps if g.name in course.skill_tags]
    if not relevant:
        # No direct tag overlap — neutral score
        return 60.0, course.difficulty

    avg_current = sum(g.current_level for g in relevant) / len(relevant)
    avg_required = sum(g.required_level for g in relevant) / len(relevant)

    # Ideal difficulty = how far along the user is (1=novice → 5=expert range)
    # A user at current=1, required=4 → ideal difficulty is beginner (1-2 range)
    # A user at current=3, required=4 → ideal difficulty is intermediate-advanced
    ideal_diff = 1 + 4 * (avg_current / max(avg_required, 1))
    distance = abs(course_diff - ideal_diff)
    # Max possible distance is 4 (1 vs 5)
    score = max(0.0, 100.0 - (distance / 4.0) * 100.0)
    return round(score, 2), course.difficulty


def _role_relevance_score(
    course: CourseInput,
    target_job_role_title: str | None,
    gaps: list[GapItem],
) -> float:
    """
    Simple heuristic: if any of the course's skill tags overlap with the user's
    actual gap competencies, grant a boost. The role title is used as a soft signal
    only — we don't have a structured role→competency mapping here (that lives in
    MongoDB on the Node side).

    This is intentionally simple. A proper version would receive the job role's
    requiredCompetencies from the Node server and compute overlap directly.
    """
    if not target_job_role_title:
        return 60.0

    gap_names = {g.name for g in gaps if g.gap > 0}
    overlap = len(gap_names.intersection(set(course.skill_tags)))
    if not gap_names:
        return 60.0

    overlap_ratio = overlap / len(gap_names)
    # Scale: 0 overlap → 50, full overlap → 90 (cap at 90 — not worth overselling)
    return round(50.0 + overlap_ratio * 40.0, 2)


def _career_relevance_score(gap_match: float) -> float:
    """
    Placeholder: returns gap_match_score as a proxy for career relevance.
    A proper implementation would use a career-path graph (e.g. current role →
    target role trajectory) to weight competencies by career progression value,
    not just gap size. Deferred to a later stage.
    """
    return gap_match


def _build_reason_text(
    breakdown: ReasonBreakdown,
    best_gap_competency: str,
    course_difficulty: str,
) -> str:
    """
    Deterministic template-based reason text — picks the single highest-weighted
    contributing factor. No LLM involved.
    """
    scores = {
        "gap": (breakdown.gap_match_score * _W_GAP, best_gap_competency),
        "career": (breakdown.career_relevance_score * _W_CAREER, best_gap_competency),
        "role": (breakdown.role_relevance_score * _W_ROLE, ""),
        "difficulty": (breakdown.difficulty_match_score * _W_DIFFICULTY, course_difficulty),
    }
    top_factor = max(scores, key=lambda k: scores[k][0])

    if top_factor in ("gap", "career") and best_gap_competency:
        return f"Recommended because it directly addresses your skill gap in {best_gap_competency}."
    if top_factor == "role":
        return "Recommended because its topics align well with your target job role."
    return f"Recommended because its {course_difficulty} difficulty matches your current proficiency level."


# ── Main entry point ───────────────────────────────────────────────────────────


def compute_recommendations(request: RecommendationRequest) -> RecommendationResponse:
    completed = set(request.completed_course_ids)
    active_gaps = [g for g in request.gaps if g.gap > 0]

    # Pre-embed all gap competency names once — reused across all course comparisons
    gap_embeddings: dict[str, np.ndarray] = {}
    if active_gaps:
        gap_names = [g.name for g in active_gaps]
        embeddings = batch_embed(gap_names)
        for gap, emb in zip(active_gaps, embeddings):
            gap_embeddings[gap.competency_id] = emb

    # Pre-embed all eligible courses' title+description once
    eligible = [c for c in request.available_courses if c.course_id not in completed]
    if not eligible:
        return RecommendationResponse(user_id=request.user_id, recommendations=[])

    course_texts = [f"{c.title}. {c.description}" for c in eligible]
    course_embeddings = batch_embed(course_texts)

    results: list[RecommendationItem] = []

    for course, course_emb in zip(eligible, course_embeddings):
        gap_score, best_comp = _gap_match_score(
            course, active_gaps, course_emb, gap_embeddings
        )
        diff_score, diff_label = _difficulty_match_score(course, active_gaps)
        role_score = _role_relevance_score(
            course, request.target_job_role_title, active_gaps
        )
        career_score = _career_relevance_score(gap_score)

        final = round(
            _W_GAP * gap_score
            + _W_ROLE * role_score
            + _W_DIFFICULTY * diff_score
            + _W_CAREER * career_score,
            2,
        )
        final = float(np.clip(final, 0.0, 100.0))

        breakdown = ReasonBreakdown(
            gap_match_score=gap_score,
            role_relevance_score=role_score,
            difficulty_match_score=diff_score,
            career_relevance_score=career_score,
        )
        reason_text = _build_reason_text(breakdown, best_comp, course.difficulty)

        results.append(
            RecommendationItem(
                course_id=course.course_id,
                title=course.title,
                source=course.source,
                final_score=final,
                reason=breakdown,
                reason_text=reason_text,
            )
        )

    results.sort(key=lambda r: r.final_score, reverse=True)
    return RecommendationResponse(
        user_id=request.user_id,
        recommendations=results[:_TOP_K],
    )
