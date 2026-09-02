import os

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health, gap_analysis, recommendations, mcq

# ── Disable interactive API docs in production ────────────────────────────────
# /docs and /redoc expose the full API surface — disable in prod as defence-in-depth.
# The ai-service is an internal service only; it should not be publicly browsable.
_IS_PROD = not settings.debug
_docs_url  = None if _IS_PROD else "/docs"
_redoc_url = None if _IS_PROD else "/redoc"

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    docs_url=_docs_url,
    redoc_url=_redoc_url,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# The ai-service is an INTERNAL service — it should only be called by the Node
# server, not directly from browsers. In Docker Compose, the service is on an
# internal network and not exposed on a public port (see docker-compose.yml).
# The CORS config below is kept for local development convenience only.
# In production, ai-service should NOT be reachable from outside the Docker network.
_allowed_origin = os.environ.get("NODE_SERVER_ORIGIN", "http://localhost:5000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[_allowed_origin],   # Node server only — NOT the browser client
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "X-Internal-Token"],
)

# ── Internal token guard (middleware) ─────────────────────────────────────────
# Adds a lightweight shared-secret check on all /internal/* routes.
# Not a substitute for network-level isolation, but provides defence-in-depth
# in case the port is accidentally exposed.
_INTERNAL_TOKEN = os.environ.get("INTERNAL_SERVICE_TOKEN", "")

@app.middleware("http")
async def internal_token_guard(request: Request, call_next):
    if request.url.path.startswith("/internal"):
        if _INTERNAL_TOKEN:
            provided = request.headers.get("X-Internal-Token", "")
            if provided != _INTERNAL_TOKEN:
                return Response(content="Forbidden", status_code=403)
    return await call_next(request)

app.include_router(health.router)
app.include_router(gap_analysis.router)
app.include_router(recommendations.router)
app.include_router(mcq.router)
