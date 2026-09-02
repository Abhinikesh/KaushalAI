const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')

const healthRouter = require('./routes/health.routes')
const authRouter = require('./routes/auth.routes')
const competencyRouter = require('./routes/competency.routes')
const courseRouter = require('./routes/course.routes')
const learningPathRouter = require('./routes/learningPath.routes')
const mcqRouter   = require('./routes/mcq.routes')
const adminRouter = require('./routes/admin.routes')
const errorHandler = require('./middleware/errorHandler')

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  })
)
app.use(express.json())
app.use(cookieParser(process.env.COOKIE_SECRET))
// 'combined' format in production gives structured logs compatible with log aggregators
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api', competencyRouter)
app.use('/api', courseRouter)
app.use('/api', learningPathRouter)
app.use('/api', mcqRouter)
app.use('/api', adminRouter)

// Error handler must be registered after all routes
app.use(errorHandler)

module.exports = app
