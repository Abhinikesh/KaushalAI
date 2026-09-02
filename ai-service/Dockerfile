# syntax=docker/dockerfile:1
# ── Stage 1: install all deps including dev/test tools ────────────────────────
FROM python:3.12-slim AS builder
WORKDIR /app

# Install build tools needed for some native extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install into a prefix dir so we can copy it cleanly to the runtime stage
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: production runtime — no dev tools, no pytest, no gcc ────────────
FROM python:3.12-slim AS runtime
WORKDIR /app

# Non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Copy only the installed packages (not the build toolchain)
COPY --from=builder /install /usr/local

# Copy application source only — no tests/, no conftest.py, no *.md
COPY app/ ./app/

RUN chown -R appuser:appgroup /app

USER appuser
EXPOSE 8000

# Use 1 worker for the hackathon (memory-constrained VMs).
# Scale to --workers 2+ when resources allow.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
