from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health, gap_analysis, recommendations, mcq

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    # Disable default /docs in production via env if needed
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(gap_analysis.router)
app.include_router(recommendations.router)
app.include_router(mcq.router)
