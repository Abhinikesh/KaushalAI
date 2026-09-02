# KaushalAI — Pre-Deployment Checklist

Use this checklist before every production deployment and before SIH judging.
Work through it top-to-bottom. Do not skip items.

---

## 1. Secrets & Environment

- [ ] All three `.env.production` files exist and are filled in:
  - `server/.env.production`
  - `ai-service/.env.production`
  - `client/.env.production` (or set `VITE_API_BASE_URL` build arg in docker-compose)
- [ ] None of the `.env.production` files contain placeholder values (search for `REPLACE`, `GENERATE`, `your_`)
- [ ] `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `COOKIE_SECRET` are each ≥ 32 chars and unique (not reused across each other)
- [ ] `INTERNAL_SERVICE_TOKEN` matches exactly between `server/.env.production` and `ai-service/.env.production`
- [ ] `ANTHROPIC_API_KEY` is a real key with active billing — test it first:
  ```bash
  curl -X POST https://api.anthropic.com/v1/messages \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -H "content-type: application/json" \
    -d '{"model":"claude-haiku-20240307","max_tokens":10,"messages":[{"role":"user","content":"ping"}]}'
  # Expected: 200 OK with content
  ```
- [ ] `.env.production` files are in `.gitignore` — verify with `git status` (they must not appear)
- [ ] Run `git log --all --full-history -- '**/.env.production'` — confirm it returns nothing

---

## 2. Database

- [ ] MongoDB is reachable from the server container. Test:
  ```bash
  # Docker Compose
  docker compose -f docker-compose.prod.yml exec server \
    node -e "require('mongoose').connect(process.env.MONGO_URI).then(()=>console.log('OK')).catch(e=>console.error(e))"
  ```
- [ ] Run the seed script once against the production database (idempotent — safe to re-run):
  ```bash
  # Docker Compose
  docker compose -f docker-compose.prod.yml exec server \
    node src/seed/seed.js
  ```
- [ ] Run the NSSTA reviewed courses (if `nssta_courses_reviewed.json` has been populated):
  ```bash
  docker compose -f docker-compose.prod.yml exec server \
    node src/seed/applyReviewedNsstaCourses.js
  ```
- [ ] Confirm at least 1 admin user exists. If not, promote one:
  ```bash
  docker compose -f docker-compose.prod.yml exec server node -e "
  require('dotenv').config({ path: '.env.production' })
  const mongoose = require('mongoose')
  const User = require('./src/models/User')
  mongoose.connect(process.env.MONGO_URI).then(async () => {
    await User.findOneAndUpdate({ email: 'YOUR_ADMIN_EMAIL' }, { \$set: { role: 'admin' } })
    console.log('Done'); process.exit()
  })"
  ```

---

## 3. Configuration Sanity

- [ ] `CLIENT_ORIGIN` in `server/.env.production` matches the **exact** deployed frontend URL (no trailing slash)
  - Wrong: `https://kaushalai.onrender.com/`
  - Right:  `https://kaushalai.onrender.com`
- [ ] `AI_SERVICE_URL` in `server/.env.production` points to the correct ai-service URL:
  - Docker Compose: `http://ai-service:8000`
  - Render/Railway split: `https://kaushalai-ai.onrender.com`
- [ ] `NODE_ENV=production` is set in server env
- [ ] `DEBUG=false` is set in ai-service env

---

## 4. Smoke-test Health Endpoints

Run these **after** the stack is up. All three must return 200 with a JSON body.

```bash
# Set BASE to your deployed domain or http://localhost for local dry-run
BASE=https://yourdomain.com

# Node server health
curl -sf $BASE/api/health && echo "✅ Node API healthy"

# ai-service health (internal — access via server proxy or directly on VM)
# Via docker exec on the VM:
docker compose -f docker-compose.prod.yml exec ai-service \
  curl -sf http://localhost:8000/health && echo "✅ ai-service healthy"

# Client (nginx serving SPA)
curl -sf -o /dev/null -w "%{http_code}" $BASE/ | grep -q 200 && echo "✅ Client healthy"
```

---

## 5. Full User Journey Smoke-test

Run through this manually in the browser against the production URL **before** judging:

- [ ] **Sign up** — create a new employee account. Confirm welcome screen appears.
- [ ] **Set job role** — navigate to Dashboard → select a job role → confirm readiness % updates.
- [ ] **Browse quizzes** — navigate to Quizzes → confirm the quiz list loads (seeded or published quizzes appear).
- [ ] **Take a quiz** — complete a quiz end-to-end → confirm score + competency level-up notification appears.
- [ ] **Trainer upload** — log in as trainer → Upload Material → upload a PDF → generate questions → review → publish → confirm quiz appears in quiz list.
- [ ] **Admin dashboard** — log in as admin → navigate to Admin Dashboard → confirm summary cards, heatmap, top gaps, and training effectiveness table all have data (not empty states).
- [ ] **Token refresh** — leave the tab open for 5+ minutes → make an API call → confirm it succeeds without forcing re-login (silent refresh working).

---

## 6. Performance & Capacity

- [ ] Anthropic rate limits: Claude Haiku default is 50 req/min. For demo with 5+ judges simultaneously uploading, ensure your tier supports concurrent requests or stagger demo uploads.
- [ ] VM memory: sentence-transformers + ChromaDB requires ~2 GB RAM minimum. Run `free -h` on the VM — if < 2 GB available, the ai-service may OOM.
- [ ] MongoDB disk: ensure at least 2 GB free on the volume for indexes and data.

---

## 7. Final Git Check

```bash
git status           # must be clean (no uncommitted changes)
git log --oneline -5 # confirm latest commit includes all stage changes
git diff HEAD        # must be empty
```

---

**Ready for judging when all checkboxes above are ticked.** 🚀
