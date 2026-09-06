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
RUN pip install --no-cache-dir --default-timeout=1000 --retries=10 --prefix=/install -r requirements.txt

# ── Stage 2: production runtime — no dev tools, no pytest, no gcc ────────────
FROM python:3.12-slim AS runtime
WORKDIR /app

# Non-root user with home directory
RUN groupadd -r appgroup && useradd -m -r -g appgroup appuser

# Copy only the installed packages (not the build toolchain)
COPY --from=builder /install /usr/local

# Copy application source only — no tests/, no conftest.py, no *.md
COPY app/ ./app/

# Create dedicated cache and data directories owned by appuser BEFORE switching user
RUN mkdir -p /app/.cache/huggingface /app/chroma_data && \
    chown -R appuser:appgroup /app /home/appuser

# Cache and data directory environment variables (set before USER so they apply at container startup)
ENV HF_HOME=/app/.cache/huggingface \
    TRANSFORMERS_CACHE=/app/.cache/huggingface \
    CHROMA_DATA_DIR=/app/chroma_data \
    PYTHONUNBUFFERED=1 \
    OMP_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    TOKENIZERS_PARALLELISM=false

USER appuser
EXPOSE 8000

# Use 1 worker for the hackathon (memory-constrained VMs).
# Listen on $PORT provided by Render (or default to 8000)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
