from fastapi import APIRouter

from app.models.schemas import RecommendationRequest, RecommendationResponse
from app.services.recommender import compute_recommendations

router = APIRouter()


@router.post("/recommendations", response_model=RecommendationResponse)
async def recommendations(request: RecommendationRequest) -> RecommendationResponse:
    """
    Produce a ranked course recommendation list for a user based on their
    skill gaps and the available course catalogue. Fully stateless — all
    data is supplied in the request body by the Node API server.
    """
    return compute_recommendations(request)
