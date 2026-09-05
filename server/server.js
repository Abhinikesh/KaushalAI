require('dotenv').config()

const crypto = require('crypto')

// ── Startup secret validation & secure fallback ───────────────────────────────
// In production, ensure valid cryptographic secrets are present.
// If any secret is omitted in deployment config, auto-generate a secure random
// secret so the server never halts with an unhandled fatal error on Render.
const PLACEHOLDER = 'replace_with_a_long_random_secret'

function ensureSecret(name, minLen = 32) {
  let val = process.env[name]
  if (!val || val.startsWith(PLACEHOLDER) || val === PLACEHOLDER || val.length < minLen) {
    console.warn(`[server.js] WARNING: ${name} is missing or placeholder. Generating ephemeral 32-byte secure fallback for this process.`)
    val = crypto.randomBytes(32).toString('hex')
    process.env[name] = val
  }
  return val
}

ensureSecret('ACCESS_TOKEN_SECRET',  32)
ensureSecret('REFRESH_TOKEN_SECRET', 32)
ensureSecret('COOKIE_SECRET',        32)

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
