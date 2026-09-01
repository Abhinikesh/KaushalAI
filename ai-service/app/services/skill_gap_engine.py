from __future__ import annotations

from app.models.schemas import (
    CompetencyScore,
    GapAnalysisRequest,
    GapAnalysisResponse,
    GapAnalysisSummary,
    GapItem,
)

# Category priority for tiebreaking — lower index = higher priority
_CATEGORY_PRIORITY: dict[str, int] = {
    "statistical": 0,
    "technical": 1,
    "digital_governance": 2,
    "behavioural": 3,
}


def _severity(gap: int) -> str:
    if gap == 0:
        return "none"
    if gap == 1:
        return "low"
    if gap == 2:
        return "medium"
    return "high"


def _readiness(competencies: list[CompetencyScore]) -> float:
    # Empty competency list is treated as fully ready — no requirements means no gaps.
    if not competencies:
        return 100.0
    total_required = sum(c.required_level for c in competencies)
    if total_required == 0:
        return 100.0
    total_current = sum(min(c.current_level, c.required_level) for c in competencies)
    return round(min(total_current / total_required * 100, 100.0), 1)


def compute_gap_analysis(request: GapAnalysisRequest) -> GapAnalysisResponse:
    """
    Pure deterministic gap computation — no I/O, no side effects.
    Sort key: primary = gap descending (largest gaps first),
               secondary = category priority ascending (statistical before behavioural).
    """
    gap_items: list[tuple[int, int, CompetencyScore]] = []

    for comp in request.competencies:
        gap = max(0, comp.required_level - comp.current_level)
        cat_rank = _CATEGORY_PRIORITY.get(comp.category, 99)
        gap_items.append((gap, cat_rank, comp))

    # Sort: largest gap first, then by category priority within same gap size
    gap_items.sort(key=lambda x: (-x[0], x[1]))

    gaps: list[GapItem] = []
    for rank, (gap, _, comp) in enumerate(gap_items, start=1):
        gaps.append(
            GapItem(
                competency_id=comp.competency_id,
                name=comp.name,
                category=comp.category,
                current_level=comp.current_level,
                required_level=comp.required_level,
                gap=gap,
                gap_severity=_severity(gap),
                priority_rank=rank,
            )
        )

    severity_counts = {"none": 0, "low": 0, "medium": 0, "high": 0}
    for item in gaps:
        severity_counts[item.gap_severity] += 1

    return GapAnalysisResponse(
        user_id=request.user_id,
        job_role_title=request.job_role_title,
        overall_readiness_percent=_readiness(request.competencies),
        gaps=gaps,
        summary=GapAnalysisSummary(**severity_counts),
    )
