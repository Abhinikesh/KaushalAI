'use strict'

const bcrypt = require('bcryptjs')
const { OAuth2Client } = require('google-auth-library')
const User = require('../models/User')
const RefreshToken = require('../models/RefreshToken')
const { generateAccessToken, generateRefreshToken, hashToken, refreshTokenExpiresAt } = require('../utils/token')
const { audit } = require('../services/auditLog.service')
const { isCommonPassword } = require('../utils/commonPasswords')
const { verifyOfficerMatch, claimOfficerRecord } = require('../services/officerRoster.service')
const logger = require('../utils/logger')

const BCRYPT_COST = 12
const _googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge:   7 * 24 * 60 * 60 * 1000,
  path:     '/api/auth',
}

// ── Shared helpers ────────────────────────────────────────────────────────────

async function issueTokenPair(user, res) {
  const accessToken     = generateAccessToken(user)
  const rawRefreshToken = generateRefreshToken()
  await RefreshToken.create({
    userId:    user._id,
    tokenHash: hashToken(rawRefreshToken),
    expiresAt: refreshTokenExpiresAt(),
  })
  res.cookie('refreshToken', rawRefreshToken, COOKIE_OPTIONS)
  return accessToken
}

async function verifyGoogleToken(idToken) {
  const ticket = await _googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  })
  return ticket.getPayload()
}

// ── Standard signup (email + password + officer roster) ───────────────────────

async function signup(req, res, next) {
  try {
    const { employeeId, name, email, password, role, experienceYears } = req.body

    // 1. Common-password check
    if (isCommonPassword(password)) {
      return next({ status: 400, message: 'Password is too common. Choose a more unique password.' })
    }

    // 2. Officer roster verification (hard gate — server-side only)
    let officer
    try {
      officer = await verifyOfficerMatch(employeeId, name)
    } catch (rosterErr) {
      return next(rosterErr)
    }

    // 3. Duplicate email check
    const existing = await User.findOne({ email })
    if (existing) {
      return next({ status: 409, message: 'An account with this email already exists.' })
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST)

    // 4. Create user — department/jobRoleId come from the roster, not the form
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      employeeId:     officer.employeeId,
      department:     officer.department,
      jobRoleId:      officer.jobRoleId?._id ?? officer.jobRoleId ?? null,
      experienceYears,
    })

    // 5. Claim the roster record so it can't be reused
    await claimOfficerRecord(employeeId, user._id)

    const accessToken = await issueTokenPair(user, res)
    res.status(201).json({ user, accessToken })
  } catch (err) {
    next(err)
  }
}

// ── Standard login ────────────────────────────────────────────────────────────

async function login(req, res, next) {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    const isMatch = user ? await user.comparePassword(password) : false

    if (!user || !isMatch) {
      await audit({ action: 'LOGIN_FAILED', req, meta: { email } })
      return next({ status: 401, message: 'Invalid credentials' })
    }

    // If user is Google-linked and has no password, direct them to Google sign-in
    if (user.googleLinked && !user.passwordHash) {
      return next({
        status: 400,
        message: 'This account uses Google Sign-In. Please use the "Continue with Google" button to log in.',
      })
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

// ── Google OAuth — initial check ──────────────────────────────────────────────

async function googleAuth(req, res, next) {
  try {
    const { idToken } = req.body
    if (!idToken) return next({ status: 400, message: 'Google ID token is required.' })

    let payload
    try {
      payload = await verifyGoogleToken(idToken)
    } catch (verifyErr) {
      // Log the real error server-side, never expose it to the client
      logger.error('Google token verification failed:', verifyErr.message)
      return next({ status: 401, message: 'Google authentication failed. Please try again.' })
    }

    const { email, name, email_verified } = payload
    if (!email_verified) {
      return next({ status: 400, message: 'Google account email is not verified.' })
    }

    const existing = await User.findOne({ email })
    if (existing) {
      // Existing user — log them in immediately
      if (!existing.isActive) return next({ status: 403, message: 'Account is deactivated' })
      const accessToken = await issueTokenPair(existing, res)
      return res.json({ user: existing, accessToken })
    }

    // New Google user — needs to complete officer roster verification
    return res.status(200).json({
      requiresCompletion: true,
      prefillEmail:       email,
      prefillName:        name,
    })
  } catch (err) {
    next(err)
  }
}

// ── Google OAuth — complete signup with employeeId ────────────────────────────

async function googleComplete(req, res, next) {
  try {
    const { idToken, employeeId, role, experienceYears } = req.body

    // Re-verify the Google token — never trust client-forwarded state
    let payload
    try {
      payload = await verifyGoogleToken(idToken)
    } catch (verifyErr) {
      logger.error('Google token verification failed (complete):', verifyErr.message)
      return next({ status: 401, message: 'Google authentication failed. Please try signing in again.' })
    }

    const { email, name, email_verified } = payload
    if (!email_verified) {
      return next({ status: 400, message: 'Google account email is not verified.' })
    }

    // Check for duplicate
    const existing = await User.findOne({ email })
    if (existing) {
      return next({ status: 409, message: 'An account with this email already exists.' })
    }

    // Officer roster verification
    let officer
    try {
      officer = await verifyOfficerMatch(employeeId, name)
    } catch (rosterErr) {
      return next(rosterErr)
    }

    // Create Google-linked account (no password)
    const user = await User.create({
      name,
      email,
      passwordHash:   null,
      googleLinked:   true,
      role,
      employeeId:     officer.employeeId,
      department:     officer.department,
      jobRoleId:      officer.jobRoleId?._id ?? officer.jobRoleId ?? null,
      experienceYears,
    })

    await claimOfficerRecord(employeeId, user._id)

    const accessToken = await issueTokenPair(user, res)
    res.status(201).json({ user, accessToken })
  } catch (err) {
    next(err)
  }
}

// ── Token refresh ─────────────────────────────────────────────────────────────

async function refresh(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken
    if (!rawToken) return next({ status: 401, message: 'Refresh token missing' })

    const tokenHash = hashToken(rawToken)
    const stored = await RefreshToken.findOne({ tokenHash })

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      res.clearCookie('refreshToken', { path: '/api/auth' })
      return next({ status: 401, message: 'Invalid or expired refresh token' })
    }

    const user = await User.findById(stored.userId)
    if (!user || !user.isActive) {
      return next({ status: 401, message: 'User not found or inactive' })
    }

    stored.revoked = true
    await stored.save()

    const accessToken = await issueTokenPair(user, res)
    res.json({ accessToken })
  } catch (err) {
    next(err)
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────

async function logout(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken
    if (rawToken) {
      await RefreshToken.updateOne({ tokenHash: hashToken(rawToken) }, { revoked: true })
      res.clearCookie('refreshToken', { path: '/api/auth' })
    }
    res.json({ message: 'Logged out' })
  } catch (err) {
    next(err)
  }
}

// ── Me ────────────────────────────────────────────────────────────────────────

async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id).populate('jobRoleId')
    if (!user) return next({ status: 404, message: 'User not found' })
    res.json({ user })
  } catch (err) {
    next(err)
  }
}

async function updateMe(req, res, next) {
  try {
    const { name, designation, department, experienceYears, qualifications } = req.body
    const updates = {}
    if (typeof name === 'string' && name.trim()) updates.name = name.trim()
    if (typeof designation === 'string') updates.designation = designation.trim()
    if (typeof department === 'string') updates.department = department.trim()
    if (experienceYears !== undefined) updates.experienceYears = Math.max(0, Number(experienceYears) || 0)
    if (Array.isArray(qualifications)) updates.qualifications = qualifications.map((q) => String(q).trim()).filter(Boolean)

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('jobRoleId')

    if (!user) return next({ status: 404, message: 'User not found' })
    res.json({ user })
  } catch (err) {
    next(err)
  }
}

module.exports = { signup, login, googleAuth, googleComplete, refresh, logout, me, updateMe }
