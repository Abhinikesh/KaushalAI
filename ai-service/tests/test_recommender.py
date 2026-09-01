"""
Tests for the recommendation engine.

These tests mock the embedding service so they run fast (<1s) without
loading the 80MB sentence-transformer model during CI or unit test runs.
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from app.models.schemas import CourseInput, GapItem, RecommendationRequest
from app.services.recommender import (
    _build_reason_text,
    _difficulty_match_score,
    _gap_match_score,
    compute_recommendations,
)


# ── Fixtures ──────────────────────────────────────────────────────────────────

def make_gap(
    cid: str,
    name: str,
    category: str,
    current: int,
    required: int,
) -> GapItem:
    gap = max(0, required - current)
    severity = {0: "none", 1: "low", 2: "medium"}.get(gap, "high")
    return GapItem(
        competency_id=cid,
        name=name,
        category=category,
        current_level=current,
        required_level=required,
        gap=gap,
        gap_severity=severity,
        priority_rank=1,
    )


def make_course(
    cid: str,
    title: str,
    skill_tags: list[str],
    difficulty: str = "beginner",
    source: str = "igot",
) -> CourseInput:
    return CourseInput(
        course_id=cid,
        title=title,
        description=f"A course about {title.lower()}.",
        source=source,
        skill_tags=skill_tags,
        difficulty=difficulty,
        duration_hours=20.0,
    )


GAPS = [
    make_gap("g1", "Survey Design", "statistical", 1, 4),       # gap=3 high
    make_gap("g2", "Python for Data Analysis", "technical", 2, 4),  # gap=2 medium
    make_gap("g3", "Leadership", "behavioural", 3, 4),           # gap=1 low
]

COURSES = [
    make_course("c1", "Fundamentals of Survey Sampling", ["Survey Design", "Sampling Theory"], "beginner"),
    make_course("c2", "Advanced Survey Methodology", ["Survey Design", "Data Quality Assurance"], "advanced"),
    make_course("c3", "Python for Statistical Analysis", ["Python for Data Analysis"], "beginner"),
    make_course("c4", "Leadership Development Programme", ["Leadership"], "intermediate"),
    make_course("c5", "Cloud Computing for Government", ["Cloud Computing"], "beginner"),
    make_course("c6", "SQL for Data Professionals", ["SQL & Databases"], "beginner"),
]


def _fake_batch_embed(texts: list[str]) -> np.ndarray:
    """
    Deterministic fake embeddings: each text hashes to a fixed unit vector.
    This lets us test sort order and exclusion logic without the real model.
    """
    rng = np.random.default_rng(42)
    vecs = rng.standard_normal((len(texts), 16)).astype(np.float32)
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    return vecs / norms


def make_request(
    completed: list[str] | None = None,
    courses: list[CourseInput] | None = None,
) -> RecommendationRequest:
    return RecommendationRequest(
        user_id="user-test-001",
        gaps=GAPS,
        completed_course_ids=completed or [],
        target_job_role_title="Statistical Officer",
        available_courses=courses or COURSES,
    )


# ── Tests ─────────────────────────────────────────────────────────────────────

@patch("app.services.recommender.batch_embed", side_effect=_fake_batch_embed)
def test_recommendations_sorted_descending(mock_embed: MagicMock) -> None:
    result = compute_recommendations(make_request())
    scores = [r.final_score for r in result.recommendations]
    assert scores == sorted(scores, reverse=True), "Results must be sorted descending by final_score"


@patch("app.services.recommender.batch_embed", side_effect=_fake_batch_embed)
def test_completed_courses_excluded(mock_embed: MagicMock) -> None:
    completed = ["c1", "c3"]
    result = compute_recommendations(make_request(completed=completed))
    returned_ids = {r.course_id for r in result.recommendations}
    assert "c1" not in returned_ids
    assert "c3" not in returned_ids


@patch("app.services.recommender.batch_embed", side_effect=_fake_batch_embed)
def test_reason_text_populated_for_all(mock_embed: MagicMock) -> None:
    result = compute_recommendations(make_request())
    for rec in result.recommendations:
        assert rec.reason_text, f"reason_text is empty for course {rec.course_id}"
        assert len(rec.reason_text) > 10


@patch("app.services.recommender.batch_embed", side_effect=_fake_batch_embed)
def test_final_score_in_valid_range(mock_embed: MagicMock) -> None:
    result = compute_recommendations(make_request())
    for rec in result.recommendations:
        assert 0.0 <= rec.final_score <= 100.0, (
            f"final_score {rec.final_score} out of range for {rec.course_id}"
        )


@patch("app.services.recommender.batch_embed", side_effect=_fake_batch_embed)
def test_all_completed_returns_empty(mock_embed: MagicMock) -> None:
    all_ids = [c.course_id for c in COURSES]
    result = compute_recommendations(make_request(completed=all_ids))
    assert result.recommendations == []


@patch("app.services.recommender.batch_embed", side_effect=_fake_batch_embed)
def test_max_ten_recommendations(mock_embed: MagicMock) -> None:
    many_courses = [
        make_course(f"cx{i}", f"Course {i}", ["Survey Design"]) for i in range(20)
    ]
    result = compute_recommendations(make_request(courses=many_courses))
    assert len(result.recommendations) <= 10


def test_difficulty_match_beginner_for_low_skill() -> None:
    gap = make_gap("g1", "Survey Design", "statistical", 1, 5)
    course = make_course("c1", "Intro to Surveys", ["Survey Design"], "beginner")
    score, _ = _difficulty_match_score(course, [gap])
    advanced_course = make_course("c2", "Advanced Surveys", ["Survey Design"], "advanced")
    adv_score, _ = _difficulty_match_score(advanced_course, [gap])
    assert score > adv_score, "Beginner course should score higher for a low-skill user"


def test_build_reason_text_non_empty() -> None:
    from app.models.schemas import ReasonBreakdown
    breakdown = ReasonBreakdown(
        gap_match_score=85.0,
        role_relevance_score=60.0,
        difficulty_match_score=70.0,
        career_relevance_score=85.0,
    )
    text = _build_reason_text(breakdown, "Survey Design", "beginner")
    assert "Survey Design" in text
    assert len(text) > 0
