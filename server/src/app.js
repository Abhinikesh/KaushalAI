const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const morgan = require('morgan')

const healthRouter = require('./routes/health.routes')

const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000' }))
app.use(express.json())
// 'combined' format in production gives structured logs compatible with log aggregators
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

app.use('/api/health', healthRouter)

module.exports = app
