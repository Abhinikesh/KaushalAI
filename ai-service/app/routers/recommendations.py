from fastapi import APIRouter, Request

from app.models.schemas import RecommendationRequest, RecommendationResponse
from app.services.recommender import compute_recommendations
from app.services.llm_client import generate_course_recommendations

router = APIRouter()


@router.post("/recommendations", response_model=RecommendationResponse)
async def recommendations(request: RecommendationRequest) -> RecommendationResponse:
    """
    Produce a ranked course recommendation list for a user based on their
    skill gaps and the available course catalogue. Fully stateless — all
    data is supplied in the request body by the Node API server.
    """
    return compute_recommendations(request)


@router.post("/recommendations/generate")
async def generate_recommendations(request: Request):
    """
    Part 4 AI Recommendation Engine:
    Accepts user context, skill gaps, and eligible courses.
    Ranks courses using Anthropic Claude grounded in specific skill gaps,
    falling back defensively to deterministic ranking.
    """
    payload = await request.json()
    return generate_course_recommendations(payload)

