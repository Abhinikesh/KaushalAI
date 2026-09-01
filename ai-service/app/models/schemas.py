from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, model_validator


class CompetencyScore(BaseModel):
    competency_id: str
    name: str
    category: str
    current_level: int = Field(..., ge=1, le=5)
    required_level: int = Field(..., ge=1, le=5)


class GapAnalysisRequest(BaseModel):
    user_id: str
    job_role_title: str
    competencies: List[CompetencyScore]

    @model_validator(mode="after")
    def competencies_not_none(self) -> "GapAnalysisRequest":
        # Allow empty list — handled gracefully by the engine
        if self.competencies is None:
            self.competencies = []
        return self


class GapItem(BaseModel):
    competency_id: str
    name: str
    category: str
    current_level: int
    required_level: int
    gap: int
    gap_severity: str  # "none" | "low" | "medium" | "high"
    priority_rank: int


class GapAnalysisSummary(BaseModel):
    none: int
    low: int
    medium: int
    high: int


class GapAnalysisResponse(BaseModel):
    user_id: str
    job_role_title: str
    overall_readiness_percent: float
    gaps: List[GapItem]
    summary: GapAnalysisSummary


# ── Stage 5: Recommendation Engine schemas ────────────────────────────────────


class CourseInput(BaseModel):
    course_id: str
    title: str
    description: str = ""
    source: str  # "igot" | "nssta"
    skill_tags: List[str] = Field(default_factory=list)  # competency names
    difficulty: str  # "beginner" | "intermediate" | "advanced"
    duration_hours: float = 0.0


class RecommendationRequest(BaseModel):
    user_id: str
    gaps: List[GapItem]
    completed_course_ids: List[str] = Field(default_factory=list)
    target_job_role_title: Optional[str] = None
    available_courses: List[CourseInput]


class ReasonBreakdown(BaseModel):
    gap_match_score: float = Field(..., ge=0.0, le=100.0)
    role_relevance_score: float = Field(..., ge=0.0, le=100.0)
    difficulty_match_score: float = Field(..., ge=0.0, le=100.0)
    career_relevance_score: float = Field(..., ge=0.0, le=100.0)


class RecommendationItem(BaseModel):
    course_id: str
    title: str
    source: str
    final_score: float = Field(..., ge=0.0, le=100.0)
    reason: ReasonBreakdown
    reason_text: str


class RecommendationResponse(BaseModel):
    user_id: str
    recommendations: List[RecommendationItem]  # sorted desc by final_score, max 10
