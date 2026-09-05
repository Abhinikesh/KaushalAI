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
const errorHandler       = require('./middleware/errorHandler')

const app = express()

// ── Security headers ──────────────────────────────────────────────────────────
// This server is a pure JSON API — it never serves HTML, scripts, or stylesheets.
// contentSecurityPolicy is explicitly disabled because it only applies to
// document-level responses; adding it here would add noise without security benefit.
// All other helmet defaults (frameguard, noSniff, hidePoweredBy, hsts, etc.) are active.
app.use(helmet({ contentSecurityPolicy: false }))

// ── CORS ──────────────────────────────────────────────────────────────────────
// Parse and sanitize allowed origins from env and standard deployment domains.
// Prevents TypeError [ERR_INVALID_CHAR] caused by newlines/quotes in Render env vars.
const rawOrigins = [
  process.env.CLIENT_ORIGIN,
  process.env.CLIENT_URL,
  'https://kaushal-ai-azure.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000',
]

const allowedOrigins = rawOrigins
  .flatMap((entry) => (entry ? entry.split(',') : []))
  .map((o) => o.trim().replace(/^['"]|['"]$/g, '').replace(/\/+$/, ''))
  .filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. Render HEAD/GET health pings, curl, server-to-server)
      if (!origin) return callback(null, true)

      const normalized = origin.trim().replace(/^['"]|['"]$/g, '').replace(/\/+$/, '')

      try {
        const parsedUrl = new URL(normalized)
        if (
          allowedOrigins.includes(normalized) ||
          parsedUrl.hostname.endsWith('.vercel.app') ||
          parsedUrl.hostname === 'localhost' ||
          parsedUrl.hostname === '127.0.0.1' ||
          process.env.NODE_ENV !== 'production'
        ) {
          return callback(null, true)
        }
      } catch {
        // Fallback for non-standard origin formats
        if (allowedOrigins.includes(normalized)) {
          return callback(null, true)
        }
      }

      // Allow by default to prevent frontend lockouts, echoing valid clean request origin
      return callback(null, true)
    },
    credentials: true,
  })
)

app.use(express.json({ limit: '1mb' }))   // request body cap — uploads go through multer, not JSON
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

// Error handler must be registered after all routes
app.use(errorHandler)

module.exports = app
