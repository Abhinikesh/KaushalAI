from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.models.schemas import GapAnalysisRequest, GapAnalysisResponse
from app.services.skill_gap_engine import compute_gap_analysis

router = APIRouter()


@router.post("/gap-analysis", response_model=GapAnalysisResponse)
async def gap_analysis(request: GapAnalysisRequest) -> GapAnalysisResponse:
    """
    Compute skill gap between a user's current competency levels and their
    job role's requirements. Fully stateless — all data must be supplied
    in the request body by the Node API server.
    """
    return compute_gap_analysis(request)
