require('dotenv').config()

// ── Startup secret validation ─────────────────────────────────────────────────
// Fail loudly at boot rather than run with weak/placeholder secrets.
// A government platform handling personnel data must never start with defaults.
const PLACEHOLDER = 'replace_with_a_long_random_secret'

function assertSecret(name, minLen = 32) {
  const val = process.env[name]
  if (!val) {
    console.error(`FATAL: Environment variable ${name} is not set. Refusing to start.`)
    process.exit(1)
  }
  if (val.startsWith(PLACEHOLDER) || val === PLACEHOLDER) {
    console.error(`FATAL: ${name} is still set to the placeholder value from .env.example. Set a real secret.`)
    process.exit(1)
  }
  if (val.length < minLen) {
    console.error(`FATAL: ${name} is too short (${val.length} chars). Minimum is ${minLen} characters.`)
    process.exit(1)
  }
}

// Only enforce in non-test environments to keep the test runner simple
if (process.env.NODE_ENV !== 'test') {
  assertSecret('ACCESS_TOKEN_SECRET',  32)
  assertSecret('REFRESH_TOKEN_SECRET', 32)
  assertSecret('COOKIE_SECRET',        32)
}

const app = require('./src/app')
const { connectDB } = require('./src/config/db')

const PORT = process.env.PORT ?? 5000

async function start() {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
