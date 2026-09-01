# KaushalAI

AI-enabled Skill Intelligence & Learning Platform for officials in India's Official Statistical System, integrating with iGOT Karmayogi.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, Zustand, TanStack Query, Recharts |
| Backend API | Node.js, Express, Mongoose, Helmet, Morgan |
| AI Microservice | Python, FastAPI, Pydantic, Uvicorn |
| Database | MongoDB 7 |
| Cache | Redis 7 |
| Reverse Proxy | Nginx |
| Containerisation | Docker Compose |

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 24 (for Docker path)
- [Node.js](https://nodejs.org/) ≥ 22 (for local path)
- [Python](https://www.python.org/) ≥ 3.12 (for local path)
- [Git](https://git-scm.com/)

## Running with Docker Compose (recommended)

```bash
# 1. Clone and enter the repository
git clone <repo-url>
cd KaushalAI

# 2. Copy environment files for each service
cp client/.env.example client/.env
cp server/.env.example server/.env
cp ai-service/.env.example ai-service/.env

# 3. Update MONGO_URI in server/.env and ai-service/.env to use the Docker service name:
#    MONGO_URI=mongodb://mongo:27017/kaushalai
#    REDIS_URL=redis://redis:6379

# 4. Build and start all services
docker compose up --build

# The stack is ready when you see all services report healthy.
# Access the app at http://localhost (via Nginx)
```

To stop:
```bash
docker compose down
```

To stop and remove volumes (wipes database):
```bash
docker compose down -v
```

## Running Without Docker (local development)

You need MongoDB and Redis running locally first:
```bash
# macOS with Homebrew
brew services start mongodb-community
brew services start redis
```

### 1. Client (React / Vite)
```bash
cd client
cp .env.example .env
npm install
npm run dev
# Runs at http://localhost:3000
```

### 2. Server (Node / Express)
```bash
cd server
cp .env.example .env
npm install
npm run dev
# Runs at http://localhost:5000
```

### 3. AI Service (Python / FastAPI)
```bash
cd ai-service
cp .env.example .env
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# Runs at http://localhost:8000
```

## Verifying Health Endpoints

```bash
# Express API
curl http://localhost:5000/api/health

# FastAPI AI service
curl http://localhost:8000/health

# Via Nginx (Docker only)
curl http://localhost/api/health
curl http://localhost/ai/health
```

Expected response from each:
```json
{"status": "ok"}
```

## Project Structure

```
kaushalai/
├── client/          # React (Vite) frontend
├── server/          # Node.js / Express API
├── ai-service/      # Python FastAPI AI microservice
├── nginx/           # Reverse proxy configuration
└── docker-compose.yml
```
