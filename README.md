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
├── scripts/              # Deployment checklist
├── package.json          # Root scripts (concurrently)
├── docker-compose.yml    # Local development stack
└── docker-compose.prod.yml  # Production stack
```

---

## Deployment

### Trade-off: VM/Docker Compose vs Render/Railway split

| | Docker Compose on VM | Render/Railway split |
|---|---|---|
| **Setup complexity** | Medium — SSH to VM, copy files | Lower — push to GitHub, click deploy |
| **Public URL** | Requires domain + nginx TLS setup | Automatic HTTPS URL from platform |
| **Cost** | ~₹500-800/month for a 2 GB VM | Free tier (cold starts on free plan) |
| **Control** | Full — matches local dev exactly | Limited — can't SSH into container |
| **Recommended for** | Demo on a controlled VM | Quick public URL for judging panel |

---

### Path A — Docker Compose on a VM (primary path)

**Prerequisites:** A Linux VM (DigitalOcean, AWS EC2, or any VPS) with Docker installed, 2+ GB RAM, and a public IP.

#### 1. Clone and prepare env files

```bash
git clone https://github.com/Abhinikesh/KaushalAI.git
cd KaushalAI

# Copy production env examples and fill them in
cp server/.env.production.example  server/.env.production
cp ai-service/.env.production.example ai-service/.env.production
```

Edit both files and replace all placeholder values. Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# Run 3 times — one value each for ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, COOKIE_SECRET
```

#### 2. Build and start the stack

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

First build takes ~8-12 minutes (sentence-transformers + chromadb are large). Subsequent builds are cached.

#### 3. Seed the database

```bash
docker compose -f docker-compose.prod.yml exec server node src/seed/seed.js
# → Inserts competencies, job roles, courses (idempotent — safe to re-run)
```

#### 4. Promote an admin user

Sign up through the app, then:
```bash
docker compose -f docker-compose.prod.yml exec server node -e "
require('dotenv').config({ path: '.env.production' })
const m = require('mongoose')
const U = require('./src/models/User')
m.connect(process.env.MONGO_URI).then(async () => {
  await U.findOneAndUpdate({ email: 'YOUR_EMAIL' }, { \$set: { role: 'admin' } })
  console.log('Done'); process.exit()
})"
```

#### 5. View logs

```bash
docker compose -f docker-compose.prod.yml logs -f server      # Node API
docker compose -f docker-compose.prod.yml logs -f ai-service  # Python AI
docker compose -f docker-compose.prod.yml logs -f nginx       # Proxy
```

#### 6. Update after a code push

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

#### 7. TLS (HTTPS) with Let's Encrypt

```bash
# On the VM, before starting the stack:
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com

# Then in nginx/nginx.prod.conf uncomment the ssl_certificate lines
# and mount /etc/letsencrypt in docker-compose.prod.yml
```

---

### Path B — Render / Railway split deployment

#### 1. Deploy ai-service (Python web service)

1. In Render: **New → Web Service** → connect GitHub repo
2. Root directory: `ai-service`
3. Runtime: **Python 3.12**
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add env vars from `ai-service/.env.production.example` in the Render dashboard
   - Set `NODE_SERVER_ORIGIN` to the Render URL of your server service (add after step 2)
7. Copy the deployed URL (e.g. `https://kaushalai-ai.onrender.com`)

#### 2. Deploy server (Node web service)

1. **New → Web Service** → same repo
2. Root directory: `server`
3. Runtime: **Node 22**
4. Build command: `npm ci --omit=dev`
5. Start command: `node server.js`
6. Add env vars from `server/.env.production.example`:
   - `MONGO_URI` → your MongoDB Atlas connection string
   - `REDIS_URL` → your Upstash Redis URL
   - `AI_SERVICE_URL` → the ai-service URL from step 1
   - `CLIENT_ORIGIN` → the client URL from step 3 (add after deploying client)
7. Copy the deployed URL (e.g. `https://kaushalai-api.onrender.com`)

#### 3. Deploy client (static site)

1. **New → Static Site** → same repo
2. Root directory: `client`
3. Build command: `npm ci && npm run build`
4. Publish directory: `dist`
5. Add env var: `VITE_API_BASE_URL=https://kaushalai-api.onrender.com/api`
6. Copy the deployed URL

#### 4. Wire CLIENT_ORIGIN

Go back to the **server** service settings → Environment → update:
```
CLIENT_ORIGIN=https://your-client-url.onrender.com
```
Trigger a redeploy.

#### 5. MongoDB Atlas (free tier)

1. Create account at [cloud.mongodb.com](https://cloud.mongodb.com)
2. **Create cluster** → M0 Free tier → Region: Mumbai (ap-south-1)
3. **Database Access** → Add user with readWrite on `kaushalai`
4. **Network Access** → Allow access from anywhere (0.0.0.0/0) for Render IPs
5. **Connect** → Drivers → Node.js → copy the connection string
6. Use as `MONGO_URI` in the server service

#### 6. Upstash Redis (free tier)

1. Create account at [upstash.com](https://upstash.com)
2. **Create Database** → Region: Mumbai → copy the Redis URL
3. Use as `REDIS_URL` in the server service

#### 7. Run seed against production

```bash
# Temporarily, with the production MONGO_URI in your local server/.env:
cd server
MONGO_URI="your_atlas_connection_string" node src/seed/seed.js
```

---

### Health check commands (after deployment)

```bash
# Replace BASE with your actual deployed URL
BASE=https://yourdomain.com

curl -sf $BASE/api/health && echo "✅ Node API"
curl -sf -o /dev/null -w "%{http_code}" $BASE/ | grep -q 200 && echo "✅ Client"

# ai-service health (VM only — not publicly routed on Render path):
docker compose -f docker-compose.prod.yml exec ai-service \
  curl -sf http://localhost:8000/health && echo "✅ ai-service"
```

See [`scripts/deploy-checklist.md`](scripts/deploy-checklist.md) for the full pre-judging checklist.
