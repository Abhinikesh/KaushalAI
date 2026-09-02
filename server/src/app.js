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
const adminRouter       = require('./routes/admin.routes')
const errorHandler      = require('./middleware/errorHandler')

const app = express()

// ── Security headers ──────────────────────────────────────────────────────────
// This server is a pure JSON API — it never serves HTML, scripts, or stylesheets.
// contentSecurityPolicy is explicitly disabled because it only applies to
// document-level responses; adding it here would add noise without security benefit.
// All other helmet defaults (frameguard, noSniff, hidePoweredBy, hsts, etc.) are active.
app.use(helmet({ contentSecurityPolicy: false }))

// ── CORS ──────────────────────────────────────────────────────────────────────
// Strict whitelist from env. credentials: true is required for the httpOnly
// refresh-token cookie set at /api/auth/login to be accepted by browsers.
app.use(
  cors({
    origin:      process.env.CLIENT_ORIGIN ?? 'http://localhost:3000',
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

app.use('/api/health',  healthRouter)
app.use('/api/auth',    authRouter)
app.use('/api',         competencyRouter)
app.use('/api',         courseRouter)
app.use('/api',         learningPathRouter)
app.use('/api',         mcqRouter)
app.use('/api',         adminRouter)

// Error handler must be registered after all routes
app.use(errorHandler)

module.exports = app
