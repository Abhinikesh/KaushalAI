# KaushalAI

AI-enabled Skill Intelligence & Learning Platform for officials in India's Official Statistical System, integrating with iGOT Karmayogi.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, Zustand, TanStack Query, Recharts |
| Backend API | Node.js, Express, Mongoose, Helmet, Morgan |
| AI Microservice | Python, FastAPI, Pydantic, sentence-transformers |
| Database | MongoDB 7 |
| Cache | Redis 7 |
| Reverse Proxy | Nginx |
| Containerisation | Docker Compose |

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 24 (Docker path)
- [Node.js](https://nodejs.org/) ≥ 22 (local path)
- [Python](https://www.python.org/) ≥ 3.12 (local path)
- [Git](https://git-scm.com/)

---

## Running Locally (development)

### Step 0 — Kill stale processes (run this if you get `EADDRINUSE`)

```bash
lsof -ti :3000 | xargs kill -9 2>/dev/null
lsof -ti :5000 | xargs kill -9 2>/dev/null
lsof -ti :8000 | xargs kill -9 2>/dev/null
echo "All ports cleared."
```

### Step 1 — One-time setup (after cloning)

```bash
# Root dev tooling
npm install

# Client
cd client && npm install && cd ..

# Server
cd server && npm install && cd ..

# AI service
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..

# Env files
cp client/.env.example client/.env
cp server/.env.example server/.env
cp ai-service/.env.example ai-service/.env
```

Edit `server/.env` — fill in at minimum:
```
MONGO_URI=mongodb://localhost:27017/kaushalai
ACCESS_TOKEN_SECRET=<any-long-random-string>
COOKIE_SECRET=<any-long-random-string>
```

### Step 2 — Start everything (from repo root)

```bash
# Kill any stale processes first
lsof -ti :3000 | xargs kill -9 2>/dev/null
lsof -ti :5000 | xargs kill -9 2>/dev/null
lsof -ti :8000 | xargs kill -9 2>/dev/null

# Start all three services
npm run dev
```

Output will look like:
```
[API]    MongoDB connected
[API]    Server running on port 5000
[AI]     Uvicorn running on http://127.0.0.1:8000
[CLIENT] Local: http://localhost:3000/
```

Press `Ctrl+C` once to stop everything.

### Run services individually

```bash
npm run dev:server    # Express API only   → http://localhost:5000
npm run dev:ai        # FastAPI AI service → http://localhost:8000
npm run dev:client    # React frontend     → http://localhost:3000
```

---

## Running with Docker Compose (full stack)

```bash
# Clone
git clone <repo-url> && cd KaushalAI

# Env files
cp client/.env.example client/.env
cp server/.env.example server/.env
cp ai-service/.env.example ai-service/.env

# Update server/.env and ai-service/.env:
# MONGO_URI=mongodb://mongo:27017/kaushalai
# REDIS_URL=redis://redis:6379

# Build and start
docker compose up --build
```

Stop: `docker compose down`  
Stop + wipe DB: `docker compose down -v`

---

## Seed the database

```bash
cd server && node src/seed/seed.js
# → Inserts 20 competencies, 5 job roles, 18 courses (idempotent)
```

## Promote a user to admin

```bash
mongosh kaushalai --eval '
  db.users.updateOne(
    { email: "your@email.com" },
    { $set: { role: "admin" } }
  )
'
# Re-login to get a fresh JWT with role: "admin"
```

## Health Checks

```bash
curl http://localhost:5000/api/health   # Express API  → {"status":"ok"}
curl http://localhost:8000/health       # FastAPI       → {"status":"ok"}
```

## Project Structure

```
KaushalAI/
├── client/               # React (Vite) frontend
├── server/               # Node.js / Express API
│   └── src/
│       ├── models/       # Mongoose schemas
│       ├── controllers/  # Route handlers (thin)
│       ├── services/     # Business logic
│       ├── middleware/   # Auth, validation, errors
│       ├── routes/       # Express routers
│       ├── validators/   # Joi schemas
│       └── seed/         # Idempotent seed script
├── ai-service/           # Python FastAPI AI microservice
│   ├── app/
│   │   ├── models/       # Pydantic schemas
│   │   ├── routers/      # Endpoints: /gap-analysis /recommendations
│   │   └── services/     # Gap engine, recommender, embedding service
│   └── tests/            # pytest unit tests
├── nginx/                # Reverse proxy config
├── package.json          # Root scripts (concurrently)
└── docker-compose.yml
```
