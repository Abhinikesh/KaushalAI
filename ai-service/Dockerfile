FROM python:3.12-slim

WORKDIR /app

# sentence-transformers + torch (CPU) increases image size to ~2GB.
# Use --no-cache-dir to avoid doubling that in the layer cache.
# Consider a multi-stage build or torch-cpu wheel in production.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
