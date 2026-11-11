'use strict'

// Preload all Mongoose models
require('./models')

const express      = require('express')
const helmet       = require('helmet')
const cors         = require('cors')
const morgan       = require('morgan')
const cookieParser = require('cookie-parser')
const mongoSanitize = require('express-mongo-sanitize')

const healthRouter      = require('./routes/health.routes')
const authRouter        = require('./routes/auth.routes')
const competencyRouter  = require('./routes/competency.routes')
const courseRouter      = require('./routes/course.routes')
const learningPathRouter = require('./routes/learningPath.routes')
const mcqRouter         = require('./routes/mcq.routes')
const adminRouter        = require('./routes/admin.routes')
const userFeaturesRouter = require('./routes/userFeatures.routes')
const onboardingRouter   = require('./routes/onboarding.routes')
const assessmentRouter   = require('./routes/assessment.routes')
const skillGapRouter     = require('./routes/skillGap.routes')
const labsRouter         = require('./routes/labs.routes')
const aiChatRouter       = require('./routes/aiChat.routes')
const achievementRouter  = require('./routes/achievement.routes')
const certificateRouter  = require('./routes/certificate.routes')
const errorHandler       = require('./middleware/errorHandler')

const app = express()

// ── Reverse proxy trust ───────────────────────────────────────────────────────
// In production behind reverse proxies (Nginx, Render, AWS ALB), trust 1 hop by default
// (Nginx -> Node). Can be customized via TRUST_PROXY env var for multi-hop architectures (e.g. 2 for Cloudflare + Nginx).
const trustProxyValue = process.env.TRUST_PROXY
  ? (Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY)
  : 1
app.set('trust proxy', trustProxyValue)

// ── Security headers ──────────────────────────────────────────────────────────
// This server is a pure JSON API — it never serves HTML, scripts, or stylesheets.
// contentSecurityPolicy is explicitly disabled because it only applies to
// document-level responses; adding it here would add noise without security benefit.
// All other helmet defaults (frameguard, noSniff, hidePoweredBy, hsts, etc.) are active.
app.use(helmet({ contentSecurityPolicy: false }))

// ── CORS ──────────────────────────────────────────────────────────────────────
// Parse and sanitize allowed origins from env and standard deployment domains.
// Prevents TypeError [ERR_INVALID_CHAR] caused by newlines/quotes in Render env vars.
function normalizeOrigin(val) {
  if (!val || typeof val !== 'string') return null
  const cleaned = val.trim().replace(/^['"]|['"]$/g, '').replace(/\/+$/, '')
  try {
    const u = new URL(cleaned)
    return `${u.protocol}//${u.host}`.toLowerCase()
  } catch {
    return cleaned.toLowerCase()
  }
}

function getAllowedOrigins() {
  const isProd = process.env.NODE_ENV === 'production'
  const productionBaseOrigins = [
    process.env.CLIENT_ORIGIN,
    process.env.CLIENT_URL,
    'https://kaushal-ai-azure.vercel.app',
  ]
  const developmentBaseOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5000',
  ]
  const raw = [
    ...productionBaseOrigins,
    ...(isProd ? [] : developmentBaseOrigins),
  ]
  return raw
    .flatMap((entry) => (entry ? entry.split(',') : []))
    .map(normalizeOrigin)
    .filter(Boolean)
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. Render HEAD/GET health pings, curl, server-to-server)
      if (!origin) return callback(null, true)

      const normalized = normalizeOrigin(origin)

      // In non-production environments (development / test), allow local origins and flexible testing
      if (process.env.NODE_ENV !== 'production') {
        const allowed = getAllowedOrigins()
        try {
          const parsedUrl = new URL(normalized)
          if (
            allowed.includes(normalized) ||
            parsedUrl.hostname === 'localhost' ||
            parsedUrl.hostname === '127.0.0.1' ||
            parsedUrl.hostname.endsWith('.vercel.app')
          ) {
            return callback(null, true)
          }
        } catch {
          if (allowed.includes(normalized)) {
            return callback(null, true)
          }
        }
        return callback(null, true)
      }

      // In production, strictly enforce explicit allowlist (fail closed)
      // No wildcard prefix matching (e.g. startsWith('kaushal-ai')) to prevent attacker subdomains
      const prodAllowed = getAllowedOrigins()
      if (prodAllowed.includes(normalized)) {
        return callback(null, true)
      }

      const corsErr = new Error('CORS blocked: Origin not allowed.')
      corsErr.status = 403
      return callback(corsErr)
    },
    credentials: true,
  })
)

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(cookieParser(process.env.COOKIE_SECRET))

// ── NoSQL injection protection ────────────────────────────────────────────────
// Strips keys starting with '$' or containing '.' from req.body, req.query,
// req.params before they reach any controller. Prevents $where/$gt injection.
app.use(mongoSanitize({ replaceWith: '_', allowDots: false }))

// 'combined' in production gives structured logs compatible with log aggregators
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// Root endpoint for platform health checkers (Render, UptimeRobot, etc.)
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'kaushalai-backend', timestamp: new Date().toISOString() })
})
app.head('/', (req, res) => {
  res.status(200).end()
})

app.use('/api/health',  healthRouter)
app.use('/api/auth',    authRouter)
app.use('/api',         competencyRouter)
app.use('/api',         courseRouter)
app.use('/api',         learningPathRouter)
app.use('/api',         mcqRouter)
app.use('/api',         adminRouter)
app.use('/api',         userFeaturesRouter)
app.use('/api',         skillGapRouter)
app.use('/api/onboarding', onboardingRouter)
app.use('/api/assessments', assessmentRouter)
app.use('/api/labs', labsRouter)
app.use('/api',         aiChatRouter)
app.use('/api',         achievementRouter)
app.use('/api',         certificateRouter)

// Error handler must be registered after all routes
app.use(errorHandler)

module.exports = app
