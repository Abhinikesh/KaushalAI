import pytest

from app.models.schemas import CompetencyScore, GapAnalysisRequest
from app.services.skill_gap_engine import compute_gap_analysis, _severity, _readiness


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_score(
    comp_id: str,
    name: str,
    category: str,
    current: int,
    required: int,
) -> CompetencyScore:
    return CompetencyScore(
        competency_id=comp_id,
        name=name,
        category=category,
        current_level=current,
        required_level=required,
    )


def make_request(competencies: list[CompetencyScore]) -> GapAnalysisRequest:
    return GapAnalysisRequest(
        user_id="user-001",
        job_role_title="Statistical Officer",
        competencies=competencies,
    )


# ── _severity unit tests ──────────────────────────────────────────────────────

def test_severity_mapping() -> None:
    assert _severity(0) == "none"
    assert _severity(1) == "low"
    assert _severity(2) == "medium"
    assert _severity(3) == "high"
    assert _severity(4) == "high"


# ── Test 1: No gaps — current level meets or exceeds required everywhere ──────

def test_no_gaps() -> None:
    comps = [
        make_score("c1", "Survey Design", "statistical", 4, 3),
        make_score("c2", "Python for Data Analysis", "technical", 3, 3),
        make_score("c3", "Leadership", "behavioural", 5, 2),
    ]
    result = compute_gap_analysis(make_request(comps))

    assert result.overall_readiness_percent == 100.0
    assert all(item.gap == 0 for item in result.gaps)
    assert all(item.gap_severity == "none" for item in result.gaps)
    assert result.summary.high == 0
    assert result.summary.medium == 0
    assert result.summary.low == 0
    assert result.summary.none == 3


# ── Test 2: All high-severity gaps ────────────────────────────────────────────

def test_all_high_gaps() -> None:
    comps = [
        make_score("c1", "National Accounts", "statistical", 1, 5),
        make_score("c2", "Machine Learning", "technical", 1, 4),
        make_score("c3", "Cloud Computing", "digital_governance", 1, 4),
    ]
    result = compute_gap_analysis(make_request(comps))

    assert all(item.gap_severity == "high" for item in result.gaps)
    assert result.summary.high == 3
    assert result.summary.none == 0
    assert result.overall_readiness_percent < 50.0


# ── Test 3: Mixed severities and correct priority ranking ─────────────────────

def test_mixed_severities_priority_ranking() -> None:
    comps = [
        # gap=3 high, statistical → should be rank 1
        make_score("c1", "Survey Design", "statistical", 1, 4),
        # gap=3 high, behavioural → should be rank 2 (same gap, lower category priority)
        make_score("c2", "Leadership", "behavioural", 1, 4),
        # gap=2 medium
        make_score("c3", "SQL & Databases", "technical", 2, 4),
        # gap=1 low
        make_score("c4", "Cybersecurity", "digital_governance", 3, 4),
        # gap=0 none
        make_score("c5", "Communication", "behavioural", 4, 3),
    ]
    result = compute_gap_analysis(make_request(comps))

    ranked = {item.competency_id: item for item in result.gaps}

    assert ranked["c1"].priority_rank == 1
    assert ranked["c2"].priority_rank == 2
    assert ranked["c3"].priority_rank == 3
    assert ranked["c4"].priority_rank == 4
    assert ranked["c5"].priority_rank == 5

    assert ranked["c1"].gap_severity == "high"
    assert ranked["c3"].gap_severity == "medium"
    assert ranked["c4"].gap_severity == "low"
    assert ranked["c5"].gap_severity == "none"


# ── Test 4: overall_readiness_percent calculation ─────────────────────────────

def test_readiness_percent_calculation() -> None:
    # current=[2,3,4], required=[4,4,4] → capped current=[2,3,4], total_req=12
    # readiness = (2+3+4)/12 * 100 = 9/12 * 100 = 75.0
    comps = [
        make_score("c1", "A", "statistical", 2, 4),
        make_score("c2", "B", "technical", 3, 4),
        make_score("c3", "C", "digital_governance", 4, 4),
    ]
    result = compute_gap_analysis(make_request(comps))
    assert result.overall_readiness_percent == 75.0


def test_readiness_percent_capped_at_100() -> None:
    # current exceeds required everywhere — readiness should be exactly 100, not > 100
    comps = [
        make_score("c1", "A", "statistical", 5, 3),
        make_score("c2", "B", "technical", 5, 2),
    ]
    result = compute_gap_analysis(make_request(comps))
    assert result.overall_readiness_percent == 100.0


# ── Test 5: Empty competencies list — should not crash ────────────────────────
# Decision: empty list means no requirements are defined, so the user is trivially
# "ready" — return 100% readiness and an empty gaps list.

def test_empty_competencies() -> None:
    result = compute_gap_analysis(make_request([]))

    assert result.overall_readiness_percent == 100.0
    assert result.gaps == []
    assert result.summary.none == 0
    assert result.summary.high == 0
