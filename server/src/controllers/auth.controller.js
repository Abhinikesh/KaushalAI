const bcrypt = require('bcryptjs')
const User = require('../models/User')
const RefreshToken = require('../models/RefreshToken')
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  refreshTokenExpiresAt,
} = require('../utils/token')
const { audit } = require('../services/auditLog.service')
const { isCommonPassword } = require('../utils/commonPasswords')

const BCRYPT_COST = 12

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  // maxAge in ms — aligns with RefreshToken TTL (7 days)
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth',
}

async function issueTokenPair(user, res) {
  const accessToken = generateAccessToken(user)
  const rawRefreshToken = generateRefreshToken()

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(rawRefreshToken),
    expiresAt: refreshTokenExpiresAt(),
  })

  res.cookie('refreshToken', rawRefreshToken, COOKIE_OPTIONS)

  return accessToken
}

async function signup(req, res, next) {
  try {
    const { name, email, password, role, designation, department, experienceYears } = req.body

    // Common-password check — after Joi min-length/number rules pass
    if (isCommonPassword(password)) {
      return next({ status: 400, message: 'Password is too common. Choose a more unique password.' })
    }

    const existing = await User.findOne({ email })
    if (existing) {
      return next({ status: 409, message: 'Email already in use' })
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST)

    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      designation,
      department,
      experienceYears,
    })

    const accessToken = await issueTokenPair(user, res)

    res.status(201).json({ user, accessToken })
  } catch (err) {
    next(err)
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    // Constant-time comparison even on "not found" by comparing against a dummy hash
    // prevents user enumeration via timing attacks.
    const isMatch = user ? await user.comparePassword(password) : false

    if (!user || !isMatch) {
      // Audit failed login — do NOT log the attempted password
      await audit({ action: 'LOGIN_FAILED', req, meta: { email } })
      return next({ status: 401, message: 'Invalid credentials' })
    }

    if (!user.isActive) {
      return next({ status: 403, message: 'Account is deactivated' })
    }

    const accessToken = await issueTokenPair(user, res)

    res.json({ user, accessToken })
  } catch (err) {
    next(err)
  }
}

async function refresh(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken
    if (!rawToken) {
      return next({ status: 401, message: 'Refresh token missing' })
    }

    const tokenHash = hashToken(rawToken)
    const stored = await RefreshToken.findOne({ tokenHash })

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      // Clear the stale cookie so clients don't retry with a dead token
      res.clearCookie('refreshToken', { path: '/api/auth' })
      return next({ status: 401, message: 'Invalid or expired refresh token' })
    }

    const user = await User.findById(stored.userId)
    if (!user || !user.isActive) {
      return next({ status: 401, message: 'User not found or inactive' })
    }

    // Rotate: revoke old token and issue a fresh pair
    stored.revoked = true
    await stored.save()

    const accessToken = await issueTokenPair(user, res)

    res.json({ accessToken })
  } catch (err) {
    next(err)
  }
}

async function logout(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken
    if (rawToken) {
      await RefreshToken.updateOne(
        { tokenHash: hashToken(rawToken) },
        { revoked: true }
      )
      res.clearCookie('refreshToken', { path: '/api/auth' })
    }

    res.json({ message: 'Logged out' })
  } catch (err) {
    next(err)
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return next({ status: 404, message: 'User not found' })
    }
    res.json({ user })
  } catch (err) {
    next(err)
  }
}

module.exports = { signup, login, refresh, logout, me }
