const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '24h'
const REFRESH_TOKEN_BYTES = 40
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function generateAccessToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  )
}

function generateRefreshToken() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex')
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function refreshTokenExpiresAt() {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
}

module.exports = { generateAccessToken, generateRefreshToken, hashToken, refreshTokenExpiresAt }
