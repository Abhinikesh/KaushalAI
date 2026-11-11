'use strict'

const crypto = require('crypto')
const mongoose = require('mongoose')
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
let _googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

function _setGoogleClient(client) {
  _googleClient = client
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000,
  path:     '/',
}

// Bounded grace window to absorb multi-tab concurrent refresh requests safely
const REFRESH_ROTATION_GRACE_MS = 10 * 1000
const MAX_GRACE_REQUESTS = 3

// ── Shared helpers ────────────────────────────────────────────────────────────

async function issueTokenPair(user, res, existingFamilyId = null) {
  const accessToken     = generateAccessToken(user)
  const rawRefreshToken = generateRefreshToken()
  const familyId        = existingFamilyId || new mongoose.Types.ObjectId()
  const rotationAttemptId = crypto.randomUUID()
  await RefreshToken.create({
    userId:    user._id,
    familyId,
    tokenHash: hashToken(rawRefreshToken),
    expiresAt: refreshTokenExpiresAt(),
    revoked:   false,
    rotationState: 'committed',
    rotationAttemptId,
    recoveryCount: 0,
    graceCount: 0,
  })
  res.cookie('refreshToken', rawRefreshToken, COOKIE_OPTIONS)
  return accessToken
}

async function verifyGoogleToken(idToken) {
  if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
    throw new Error('Google ID token is required.')
  }

  const expectedAudience = process.env.GOOGLE_CLIENT_ID
  if (!expectedAudience) {
    throw new Error('Google Client ID is not configured on server.')
  }

  const ticket = await _googleClient.verifyIdToken({
    idToken: idToken.trim(),
    audience: expectedAudience,
  })

  const payload = ticket ? ticket.getPayload() : null
  if (!payload) {
    throw new Error('Invalid Google ID token payload.')
  }

  // 1. Audience validation
  if (payload.aud !== expectedAudience) {
    throw new Error(`Google token audience mismatch. Expected ${expectedAudience}, got ${payload.aud}`)
  }

  // 2. Issuer validation
  const validIssuers = ['accounts.google.com', 'https://accounts.google.com']
  if (!payload.iss || !validIssuers.includes(payload.iss)) {
    throw new Error(`Invalid Google token issuer: ${payload.iss}`)
  }

  // 3. Expiration validation
  if (!payload.exp || typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) {
    throw new Error('Google ID token has expired.')
  }

  // 4. Subject identifier (sub) validation
  if (!payload.sub || typeof payload.sub !== 'string' || !payload.sub.trim()) {
    throw new Error('Google ID token missing valid subject (sub) claim.')
  }

  // 5. Email claim validation
  if (!payload.email || typeof payload.email !== 'string' || !payload.email.includes('@')) {
    throw new Error('Google ID token missing valid email claim.')
  }

  // 6. Strict boolean email_verified validation
  if (payload.email_verified !== true) {
    throw new Error('Google account email is not verified.')
  }

  return {
    sub: payload.sub.trim(),
    email: payload.email.trim().toLowerCase(),
    email_verified: true,
    name: payload.name || payload.given_name || 'User',
    picture: payload.picture || null,
  }
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
      role: 'employee',
      employeeId:     officer.employeeId,
      department:     officer.department,
      jobRoleId:      officer.jobRoleId?._id ?? officer.jobRoleId ?? null,
      experienceYears,
    })

    // 5. Claim the roster record atomically; rollback user creation if claim fails
    try {
      await claimOfficerRecord(employeeId, user._id)
    } catch (claimErr) {
      await User.deleteOne({ _id: user._id })
      throw claimErr
    }

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

    const rawId = (email || '').trim()
    const safeRegex = new RegExp(`^${rawId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')

    const user = await User.findOne({
      $or: [
        { email: safeRegex },
        { employeeId: safeRegex },
      ],
    })
    const isMatch = user ? await user.comparePassword(password) : false

    if (!user || !isMatch) {
      await audit({ action: 'LOGIN_FAILED', req, meta: { identifier: rawId } })
      return next({ status: 401, message: 'Invalid credentials. Please verify your email / employee ID and password.' })
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

// ── Admin-only login (same as login but rejects non-admin accounts) ────────────

async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body

    const rawId = (email || '').trim()
    const safeRegex = new RegExp(`^${rawId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')

    const user = await User.findOne({
      $or: [
        { email: safeRegex },
        { employeeId: safeRegex },
      ],
    })
    const isMatch = user ? await user.comparePassword(password) : false

    if (!user || !isMatch) {
      await audit({ action: 'ADMIN_LOGIN_FAILED', req, meta: { identifier: rawId } })
      return next({ status: 401, message: 'Invalid administrator credentials. Please try again.' })
    }

    // Hard gate — only admin-role accounts can use the admin console
    if (user.role !== 'admin') {
      await audit({ action: 'ADMIN_LOGIN_DENIED', req, meta: { identifier: rawId, role: user.role } })
      return next({ status: 403, message: 'Access denied. This login portal is for administrators only. Please use the standard login page.' })
    }

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
    await audit({ action: 'ADMIN_LOGIN_SUCCESS', req, meta: { userId: user._id, email: user.email } })
    res.json({ user, accessToken })
  } catch (err) {
    next(err)
  }
}

// ── Google OAuth — initial check ──────────────────────────────────────────────

async function googleAuth(req, res, next) {
  try {
    const { idToken } = req.body
    if (!idToken) return next({ status: 400, message: 'Google token is required.' })

    let payload
    try {
      payload = await verifyGoogleToken(idToken)
    } catch (verifyErr) {
      logger.error('Google token verification failed:', verifyErr.message)
      return next({ status: 401, message: 'Google authentication failed. Please try again.' })
    }

    const { email, name, picture, sub } = payload
    const normalizedEmail = (email || '').trim().toLowerCase()
    const verifiedSub = (sub || '').trim()

    if (!verifiedSub) {
      return next({ status: 400, message: 'Google ID token missing valid subject identifier.' })
    }
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return next({ status: 400, message: 'Google ID token missing valid email address.' })
    }

    // ── Check for duplicate records in DB ──
    const emailMatches = await User.find({ email: normalizedEmail })
    if (emailMatches.length > 1) {
      return res.status(409).json({
        message: 'Multiple accounts exist for this email address. Please contact support.',
        code: 'DUPLICATE_EMAIL_CONFLICT',
      })
    }

    const subMatches = await User.find({ googleSub: verifiedSub })
    if (subMatches.length > 1) {
      return res.status(409).json({
        message: 'Multiple accounts match this Google subject identifier.',
        code: 'DUPLICATE_SUB_CONFLICT',
      })
    }

    // ── A. Search by Google Subject ──
    const subMatch = subMatches.length === 1 ? subMatches[0] : null
    if (subMatch) {
      // A.2 Administrator guard
      if (subMatch.role === 'admin') {
        await audit({
          action: 'ADMIN_GOOGLE_AUTH_BLOCKED',
          req,
          meta: { sub: verifiedSub, email: subMatch.email, role: 'admin', userId: subMatch._id },
        })
        return res.status(403).json({
          message: 'Access denied. Administrator accounts cannot authenticate via Google. Please use the administrative username and password portal.',
          code: 'ADMIN_GOOGLE_AUTH_PROHIBITED',
        })
      }

      // A.3 Inactive guard
      if (!subMatch.isActive) {
        return res.status(403).json({
          message: 'Account is deactivated',
          code: 'ACCOUNT_DEACTIVATED',
        })
      }

      // A.4 & A.5 Check whether verified email belongs to a different account
      const emailMatch = emailMatches.length === 1 ? emailMatches[0] : null
      if (emailMatch) {
        if (emailMatch.role === 'admin') {
          await audit({
            action: 'ADMIN_GOOGLE_AUTH_BLOCKED',
            req,
            meta: { sub: verifiedSub, email: emailMatch.email, role: 'admin', userId: emailMatch._id },
          })
          return res.status(403).json({
            message: 'Access denied. Administrator accounts cannot authenticate via Google. Please use the administrative username and password portal.',
            code: 'ADMIN_GOOGLE_AUTH_PROHIBITED',
          })
        }

        if (String(emailMatch._id) !== String(subMatch._id)) {
          return res.status(409).json({
            message: 'Google account email belongs to another account.',
            code: 'ACCOUNT_COLLISION',
          })
        }
      }

      // A.6 Authenticate the matched account
      let modified = false
      if (picture && subMatch.avatarUrl !== picture) {
        subMatch.avatarUrl = picture
        modified = true
      }
      if (name && (!subMatch.name || subMatch.name === 'User' || subMatch.name === 'Learner' || subMatch.name === 'Officer')) {
        subMatch.name = name
        modified = true
      }
      if (!subMatch.googleLinked) {
        subMatch.googleLinked = true
        modified = true
      }
      if (modified) {
        await subMatch.save()
      }
      const accessToken = await issueTokenPair(subMatch, res)
      return res.json({ user: subMatch, accessToken })
    }

    // ── B. Search by Normalized Email (if no Google subject match exists) ──
    const emailMatch = emailMatches.length === 1 ? emailMatches[0] : null
    if (emailMatch) {
      // B.2 Administrator guard
      if (emailMatch.role === 'admin') {
        await audit({
          action: 'ADMIN_GOOGLE_AUTH_BLOCKED',
          req,
          meta: { sub: verifiedSub, email: emailMatch.email, role: 'admin', userId: emailMatch._id },
        })
        return res.status(403).json({
          message: 'Access denied. Administrator accounts cannot authenticate via Google. Please use the administrative username and password portal.',
          code: 'ADMIN_GOOGLE_AUTH_PROHIBITED',
        })
      }

      // B.3 Inactive guard
      if (!emailMatch.isActive) {
        return res.status(403).json({
          message: 'Account is deactivated',
          code: 'ACCOUNT_DEACTIVATED',
        })
      }

      // B.4 If account already has a different non-empty googleSub
      if (emailMatch.googleSub && emailMatch.googleSub !== verifiedSub) {
        return res.status(409).json({
          message: 'Account is already linked to another Google identity.',
          code: 'GOOGLE_SUB_COLLISION',
        })
      }

      // B.5 - B.8 Safely bind verified sub and authenticate
      try {
        emailMatch.googleSub = verifiedSub
        emailMatch.googleLinked = true
        if (picture && !emailMatch.avatarUrl) {
          emailMatch.avatarUrl = picture
        }
        await emailMatch.save()
        const accessToken = await issueTokenPair(emailMatch, res)
        return res.json({ user: emailMatch, accessToken })
      } catch (saveErr) {
        if (saveErr.code === 11000) {
          return res.status(409).json({
            message: 'This Google identity was concurrently linked to another account.',
            code: 'GOOGLE_SUB_COLLISION',
          })
        }
        throw saveErr
      }
    }

    // ── C. No Subject or Email Match: Create New Ordinary Learner Account ──
    try {
      const newLearner = await User.create({
        name: name || 'Learner',
        email: normalizedEmail,
        googleSub: verifiedSub,
        googleLinked: true,
        role: 'employee',
        avatarUrl: picture || null,
        isActive: true,
        // Strictly NO fabricated government data:
        employeeId: null,
        designation: null,
        department: null,
        cadre: null,
        batch: null,
        dateOfJoining: null,
        reportingTo: null,
        workLocation: null,
        gradeLevel: null,
      })

      const accessToken = await issueTokenPair(newLearner, res)
      return res.json({ user: newLearner, accessToken })
    } catch (createErr) {
      if (createErr.code === 11000) {
        // Concurrency race: Another request created the user or bound the sub simultaneously.
        return await handleGoogleAuthRetry({
          sub: verifiedSub,
          email: normalizedEmail,
          name,
          picture,
          req,
          res,
          next,
        })
      }
      throw createErr
    }
  } catch (err) {
    next(err)
  }
}

async function handleGoogleAuthRetry({ sub, email, name, picture, req, res, next }) {
  const subMatches = await User.find({ googleSub: sub })
  const emailMatches = await User.find({ email })

  if (subMatches.length > 1 || emailMatches.length > 1) {
    return res.status(409).json({
      message: 'Conflicting account identities detected during concurrent registration.',
      code: 'CONCURRENCY_IDENTITY_CONFLICT',
    })
  }

  const subMatch = subMatches[0] || null
  const emailMatch = emailMatches[0] || null

  // If both exist and point to different accounts, collision!
  if (subMatch && emailMatch && String(subMatch._id) !== String(emailMatch._id)) {
    return res.status(409).json({
      message: 'Google identity conflicts with an existing account.',
      code: 'ACCOUNT_COLLISION',
    })
  }

  const matched = subMatch || emailMatch
  if (matched) {
    if (matched.role === 'admin') {
      await audit({
        action: 'ADMIN_GOOGLE_AUTH_BLOCKED',
        req,
        meta: { sub, email: matched.email, role: 'admin', userId: matched._id },
      })
      return res.status(403).json({
        message: 'Access denied. Administrator accounts cannot authenticate via Google. Please use the administrative username and password portal.',
        code: 'ADMIN_GOOGLE_AUTH_PROHIBITED',
      })
    }
    if (!matched.isActive) {
      return res.status(403).json({ message: 'Account is deactivated', code: 'ACCOUNT_DEACTIVATED' })
    }

    if (!matched.googleSub) {
      try {
        matched.googleSub = sub
        matched.googleLinked = true
        await matched.save()
      } catch (saveErr) {
        if (saveErr.code === 11000) {
          return res.status(409).json({
            message: 'Account collision during concurrent linking.',
            code: 'GOOGLE_SUB_COLLISION',
          })
        }
        throw saveErr
      }
    } else if (matched.googleSub !== sub) {
      return res.status(409).json({
        message: 'Account is already linked to another Google identity.',
        code: 'GOOGLE_SUB_COLLISION',
      })
    }

    const accessToken = await issueTokenPair(matched, res)
    return res.json({ user: matched, accessToken })
  }

  return res.status(409).json({
    message: 'Unable to establish identity due to concurrent registration conflict.',
    code: 'CONCURRENCY_CONFLICT',
  })
}

// ── Google OAuth — complete signup with employeeId (Legacy / Dev Only) ────────

async function googleComplete(req, res, next) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return next({ status: 404, message: 'Endpoint not found.' })
    }

    const { idToken, employeeId, role, experienceYears } = req.body

    // Re-verify the Google token — never trust client-forwarded state
    let payload
    try {
      payload = await verifyGoogleToken(idToken)
    } catch (verifyErr) {
      logger.error('Google token verification failed (complete):', verifyErr.message)
      return next({ status: 401, message: 'Google authentication failed. Please try signing in again.' })
    }

    const { email, name, email_verified, picture, sub } = payload
    if (!email_verified) {
      return next({ status: 400, message: 'Google account email is not verified.' })
    }

    // Check for duplicate or admin
    const existing = await User.findOne({ email })
    if (existing) {
      if (existing.role === 'admin') {
        return res.status(403).json({
          message: 'Access denied. Administrator accounts cannot authenticate via Google. Please use the administrative username and password portal.',
          code: 'ADMIN_GOOGLE_AUTH_PROHIBITED',
        })
      }
      return next({ status: 409, message: 'An account with this email already exists.' })
    }

    // Officer roster verification with graceful fallback
    let officer
    try {
      officer = await verifyOfficerMatch(employeeId, name)
    } catch {
      const defaultRole = (await JobRole.findOne({ title: /Statistical Officer/i })) || (await JobRole.findOne())
      officer = {
        employeeId: employeeId.trim(),
        department: 'Field Operations Division (FOD)',
        jobRoleId: defaultRole?._id ?? null,
      }
    }

    // Create Google-linked account (no password) with synced avatar
    const user = await User.create({
      name,
      email,
      passwordHash:    null,
      googleLinked:    true,
      googleSub:       sub || null,
      avatarUrl:       picture || null,
      role:            'employee',
      employeeId:      officer.employeeId,
      department:      officer.department,
      jobRoleId:       officer.jobRoleId?._id ?? officer.jobRoleId ?? null,
      experienceYears: experienceYears ?? 2,
    })

    try {
      await claimOfficerRecord(employeeId, user._id)
    } catch (claimErr) {
      await User.deleteOne({ _id: user._id })
      throw claimErr
    }

    const accessToken = await issueTokenPair(user, res)
    res.status(201).json({ user, accessToken })
  } catch (err) {
    next(err)
  }
}

/**
 * Durable orphan reconciliation for refresh-token families.
 * Identifies and eliminates any uncommitted, superseded, or orphaned successors
 * belonging to superseded rotation attempts within the family.
 */
async function reconcileFamilyOrphans(familyId, userId) {
  if (!familyId) return 0
  try {
    const supersededPredecessors = await RefreshToken.find({
      familyId,
      supersededAttemptId: { $ne: null },
    })

    let totalCleaned = 0
    for (const pred of supersededPredecessors) {
      if (pred.supersededTokenHash || pred.supersededAttemptId) {
        const query = {
          familyId,
          _id: { $ne: pred._id },
          $or: [
            ...(pred.supersededTokenHash ? [{ tokenHash: pred.supersededTokenHash }] : []),
            ...(pred.supersededAttemptId ? [{ rotationAttemptId: pred.supersededAttemptId }] : []),
          ],
        }
        const delRes = await RefreshToken.deleteMany(query)
        totalCleaned += delRes.deletedCount || 0
      }
    }
    return totalCleaned
  } catch (err) {
    logger.error('Error during reconcileFamilyOrphans:', err.message)
    return 0
  }
}

// ── Token refresh ─────────────────────────────────────────────────────────────

async function refresh(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken
    if (!rawToken || typeof rawToken !== 'string') {
      return next({ status: 401, message: 'Refresh token missing' })
    }

    const tokenHash = hashToken(rawToken)
    const now = new Date()

    // Defensive check: reject any token that was previously superseded by a recovery worker
    const supersededCount = await RefreshToken.countDocuments({
      supersededTokenHash: tokenHash,
    })
    if (supersededCount > 0) {
      logger.warn(`Rejected refresh attempt using superseded token hash: ${tokenHash}`)
      await RefreshToken.deleteOne({ tokenHash })
      res.clearCookie('refreshToken', { path: '/' })
      return next({ status: 401, message: 'Refresh token was superseded by a newer session. Please log in again.' })
    }

    // Pre-generate cryptographic successor credentials in application memory
    const rawRefreshToken = generateRefreshToken()
    const nextTokenHash = hashToken(rawRefreshToken)
    const rotationAttemptId = crypto.randomUUID()

    // 1. Attempt atomic rotation: exactly ONE concurrent request can claim this token
    const activeToken = await RefreshToken.findOneAndUpdate(
      {
        tokenHash,
        revoked: false,
        expiresAt: { $gt: now },
      },
      {
        $set: {
          revoked: true,
          revokedAt: now,
          rotationState: 'in_progress',
          rotationStartedAt: now,
          rotationAttemptId,
          recoveryCount: 0,
          replacedByTokenHash: nextTokenHash,
        },
      },
      { new: false }
    )

    if (activeToken) {
      // Primary rotation path: this request won the atomic rotation
      const user = await User.findById(activeToken.userId)
      if (!user || !user.isActive) {
        res.clearCookie('refreshToken', { path: '/' })
        return next({ status: 401, message: 'User not found or inactive' })
      }

      // Legacy token check: if activeToken had no familyId, assign a new familyId now
      const familyId = activeToken.familyId || new mongoose.Types.ObjectId()

      // Opportunistic family reconciliation: clean up any late-inserted or orphaned tokens from prior attempts
      await reconcileFamilyOrphans(familyId, user._id)

      try {
        const accessToken = generateAccessToken(user)

        // Stage 0: Guard against pre-creation supersession / invalidation
        const claimCheck = await RefreshToken.findOne({
          _id: activeToken._id,
          rotationState: 'in_progress',
          rotationAttemptId,
        })
        if (!claimCheck) {
          logger.warn(`Rotation claim ${rotationAttemptId} superseded prior to successor creation.`)
          res.clearCookie('refreshToken', { path: '/' })
          return next({ status: 401, message: 'Session rotation superseded. Please log in again.' })
        }

        // Stage 1: Create durable successor in MongoDB
        await RefreshToken.create({
          userId: user._id,
          familyId,
          tokenHash: nextTokenHash,
          expiresAt: refreshTokenExpiresAt(),
          revoked: false,
          rotationState: 'committed',
          rotationAttemptId,
          graceCount: 0,
        })

        // Stage 2: Verifiable Predecessor Linking & Commit
        const linkResult = await RefreshToken.updateOne(
          {
            _id: activeToken._id,
            userId: user._id,
            revoked: true,
            rotationState: 'in_progress',
            rotationAttemptId,
            replacedByTokenHash: nextTokenHash,
          },
          {
            $set: {
              rotationState: 'committed',
              familyId,
            },
          }
        )

        // Verifiable linking check: matchedCount must be exactly 1
        if (linkResult.matchedCount !== 1) {
          logger.error(`Predecessor linking verification failed (matchedCount=${linkResult.matchedCount}). Invalidation during rotation.`)
          // Delete orphan successor to prevent independently usable orphan branch
          await RefreshToken.deleteOne({ tokenHash: nextTokenHash, rotationAttemptId })
          await RefreshToken.updateOne(
            { _id: activeToken._id, rotationAttemptId },
            { $set: { rotationState: 'failed' } }
          )
          res.clearCookie('refreshToken', { path: '/' })
          return next({ status: 401, message: 'Session invalidated during rotation. Please log in again.' })
        }

        // Stage 3: Only after linking is committed and verified, issue cookie and respond
        res.cookie('refreshToken', rawRefreshToken, COOKIE_OPTIONS)
        return res.json({ accessToken })
      } catch (rotationErr) {
        logger.error('Failed during token rotation lifecycle:', rotationErr.message)

        // Clean up orphan successor if it was created
        try {
          // Check whether successor was physically written to DB before failure
          const succExists = nextTokenHash ? await RefreshToken.findOne({ tokenHash: nextTokenHash }) : null

          if (succExists) {
            // Successor was written: delete orphan successor, do NOT reactivate predecessor
            await RefreshToken.deleteOne({ tokenHash: nextTokenHash, rotationAttemptId })
            await RefreshToken.updateOne(
              { _id: activeToken._id, rotationAttemptId },
              { $set: { rotationState: 'failed' } }
            )
          } else {
            // Pre-creation failure: no successor was ever written or delivered.
            // Safe compensating rollback restores predecessor for retry.
            await RefreshToken.updateOne(
              { _id: activeToken._id, rotationAttemptId, rotationState: 'in_progress' },
              { $set: { revoked: false, revokedAt: null, rotationState: 'idle', rotationAttemptId: null, replacedByTokenHash: null } }
            )
          }
        } catch (delErr) {
          logger.error('Failed to cleanup during rotation error:', delErr.message)
        }

        res.clearCookie('refreshToken', { path: '/' })
        return next({ status: 500, message: 'Token rotation failed. Please log in again.' })
      }
    }

    // 2. Not claimed as activeToken: check if it's an in-progress interrupted rotation or within grace window
    let existing = await RefreshToken.findOne({ tokenHash })

    if (!existing) {
      res.clearCookie('refreshToken', { path: '/' })
      return next({ status: 401, message: 'Invalid or expired refresh token' })
    }

    if (existing.expiresAt <= now) {
      res.clearCookie('refreshToken', { path: '/' })
      return next({ status: 401, message: 'Refresh token expired' })
    }

    // 2A. Incomplete rotation recovery vs Active In-Flight Rotation
    if (existing.rotationState === 'in_progress') {
      // Primary rotation is actively in flight. Poll up to 500ms for it to commit so this request can be served via grace.
      let committedDoc = null
      for (let wait = 0; wait < 10; wait++) {
        await new Promise((resolve) => setTimeout(resolve, 50))
        committedDoc = await RefreshToken.findById(existing._id)
        if (committedDoc && committedDoc.rotationState === 'committed') {
          break
        }
      }

      if (committedDoc && committedDoc.rotationState === 'committed') {
        existing = committedDoc
      } else {
        // Did not commit within polling window. Check if recovery is permissible or if worker crashed/stalled:
        if ((existing.recoveryCount || 0) >= 1) {
          logger.warn(`Recovery limit exceeded for token ${existing._id}. Terminating uncommitted rotation.`)
          await RefreshToken.updateOne(
            { _id: existing._id, rotationState: 'in_progress' },
            { $set: { rotationState: 'failed' } }
          )
          if (existing.replacedByTokenHash) {
            await RefreshToken.deleteOne({ tokenHash: existing.replacedByTokenHash })
          }
          res.clearCookie('refreshToken', { path: '/' })
          return next({ status: 401, message: 'Session rotation interrupted or timed out. Please log in again.' })
        }

        // Attempt atomic recovery ownership claim using fencing token
        const recoveryAttemptId = crypto.randomUUID()
        const rawRecoveryToken = generateRefreshToken()
        const recoveryTokenHash = hashToken(rawRecoveryToken)

        // Capture previous attempt ownership metadata before update
        const prevAttemptId = existing.rotationAttemptId || null
        const prevSuccessorHash = existing.replacedByTokenHash || null

        const claimedRecovery = await RefreshToken.findOneAndUpdate(
          {
            _id: existing._id,
            rotationState: 'in_progress',
            rotationAttemptId: existing.rotationAttemptId,
            recoveryCount: { $lt: 1 },
          },
          {
            $set: {
              rotationAttemptId: recoveryAttemptId,
              supersededAttemptId: prevAttemptId,
              supersededTokenHash: prevSuccessorHash,
              rotationStartedAt: now,
              replacedByTokenHash: recoveryTokenHash,
            },
            $inc: { recoveryCount: 1 },
          },
          { new: true }
        )

        if (claimedRecovery) {
          logger.info(`Acquired atomic recovery ownership for token ${existing._id}`)
          const user = await User.findById(existing.userId)
          if (!user || !user.isActive) {
            res.clearCookie('refreshToken', { path: '/' })
            return next({ status: 401, message: 'User not found or inactive' })
          }

          const familyId = claimedRecovery.familyId || existing.familyId || new mongoose.Types.ObjectId()

          // Stage R.1: Cleanup previous superseded successor using superseded metadata
          if (claimedRecovery.supersededTokenHash) {
            try {
              const previousSuccessorFilter = claimedRecovery.supersededAttemptId
                ? {
                    tokenHash: claimedRecovery.supersededTokenHash,
                    rotationAttemptId: claimedRecovery.supersededAttemptId,
                    familyId,
                  }
                : {
                    tokenHash: claimedRecovery.supersededTokenHash,
                    userId: claimedRecovery.userId,
                  }
              const delRes = await RefreshToken.deleteOne(previousSuccessorFilter)
              if (delRes.deletedCount > 0) {
                logger.info(`Cleaned up superseded successor (deletedCount=${delRes.deletedCount})`)
              }
            } catch (cleanupErr) {
              logger.error('Failed to delete superseded successor:', cleanupErr.message)
            }
          }

          try {
            const accessToken = generateAccessToken(user)

            // Stage R.2: Create recovery successor
            await RefreshToken.create({
              userId: user._id,
              familyId,
              tokenHash: recoveryTokenHash,
              expiresAt: refreshTokenExpiresAt(),
              revoked: false,
              rotationState: 'committed',
              rotationAttemptId: recoveryAttemptId,
              graceCount: 0,
            })

            // Stage R.3: Link predecessor with recoveryAttemptId
            const linkResult = await RefreshToken.updateOne(
              {
                _id: existing._id,
                userId: user._id,
                revoked: true,
                rotationState: 'in_progress',
                rotationAttemptId: recoveryAttemptId,
                replacedByTokenHash: recoveryTokenHash,
              },
              {
                $set: {
                  rotationState: 'committed',
                  familyId,
                },
              }
            )

            if (linkResult.matchedCount !== 1) {
              logger.error(`Recovery predecessor linking failed (matchedCount=${linkResult.matchedCount})`)
              await RefreshToken.deleteOne({
                tokenHash: recoveryTokenHash,
                rotationAttemptId: recoveryAttemptId,
                familyId,
              })
              await RefreshToken.updateOne(
                { _id: existing._id, rotationAttemptId: recoveryAttemptId },
                { $set: { rotationState: 'failed' } }
              )
              res.clearCookie('refreshToken', { path: '/' })
              return next({ status: 401, message: 'Session rotation interrupted. Please log in again.' })
            }

            // Stage R.4: Post-commit durable family reconciliation
            await reconcileFamilyOrphans(familyId, user._id)

            res.cookie('refreshToken', rawRecoveryToken, COOKIE_OPTIONS)
            return res.json({ accessToken })
          } catch (recErr) {
            logger.error('Recovery failed:', recErr.message)
            try {
              // Stage R.Fail: Cleanup current recovery successor using CURRENT attempt metadata
              await RefreshToken.deleteOne({
                tokenHash: recoveryTokenHash,
                rotationAttemptId: recoveryAttemptId,
                familyId,
              })
              await RefreshToken.updateOne(
                { _id: existing._id, rotationAttemptId: recoveryAttemptId },
                { $set: { rotationState: 'failed' } }
              )
            } catch {}
            res.clearCookie('refreshToken', { path: '/' })
            return next({ status: 500, message: 'Session recovery failed. Please log in again.' })
          }
        } else {
          // Another recovery worker claimed ownership simultaneously.
          // Wait briefly for it to commit so this request can be served via grace
          let committedByOther = null
          for (let wait = 0; wait < 6; wait++) {
            await new Promise((resolve) => setTimeout(resolve, 50))
            committedByOther = await RefreshToken.findById(existing._id)
            if (committedByOther && committedByOther.rotationState === 'committed') {
              break
            }
          }
          if (committedByOther && committedByOther.rotationState === 'committed') {
            existing = committedByOther
          } else {
            res.clearCookie('refreshToken', { path: '/' })
            return next({ status: 401, message: 'Concurrent session rotation interrupted. Please log in again.' })
          }
        }
      }
    }

    const minGraceRevokedAt = new Date(now.getTime() - REFRESH_ROTATION_GRACE_MS)

    // 2B. Attempt atomic conditional grace claim:
    // Only succeeds if document is revoked within 10s grace window AND graceCount < MAX_GRACE_REQUESTS (3)
    const claimedGraceDoc = await RefreshToken.findOneAndUpdate(
      {
        _id: existing._id,
        revoked: true,
        revokedAt: { $gte: minGraceRevokedAt },
        graceCount: { $lt: MAX_GRACE_REQUESTS },
      },
      {
        $inc: { graceCount: 1 },
      },
      { new: true }
    )

    if (claimedGraceDoc) {
      // Won one of the max 3 atomic grace slots
      const user = await User.findById(claimedGraceDoc.userId)
      if (!user || !user.isActive) {
        res.clearCookie('refreshToken', { path: '/' })
        return next({ status: 401, message: 'User not found or inactive' })
      }

      // Concurrency grace: issue a fresh access token to allow in-flight tab requests to proceed.
      // Do NOT clear or rewrite the cookie; the primary tab's successor token is preserved in the browser.
      const accessToken = generateAccessToken(user)
      return res.json({ accessToken, grace: true })
    }

    // Atomic grace claim failed! Inspect latest persisted record to determine exact reason:
    const latestDoc = await RefreshToken.findById(existing._id)
    if (!latestDoc || latestDoc.expiresAt <= now) {
      res.clearCookie('refreshToken', { path: '/' })
      return next({ status: 401, message: 'Invalid or expired refresh token' })
    }

    // Did it fail because grace limit (3) was reached while still within the 10s window?
    const isWithinGraceWindow =
      latestDoc.revoked &&
      latestDoc.revokedAt instanceof Date &&
      latestDoc.revokedAt.getTime() >= minGraceRevokedAt.getTime()

    if (isWithinGraceWindow && (latestDoc.graceCount || 0) >= MAX_GRACE_REQUESTS) {
      logger.warn(`Grace request limit (${MAX_GRACE_REQUESTS}) exceeded for token family ${latestDoc.familyId}`)
      if (latestDoc.familyId) {
        await RefreshToken.updateMany(
          { userId: latestDoc.userId, familyId: latestDoc.familyId, revoked: false },
          { $set: { revoked: true, revokedAt: now, rotationState: 'failed' } }
        )
      } else if (latestDoc.replacedByTokenHash) {
        await RefreshToken.updateMany(
          {
            userId: latestDoc.userId,
            $or: [
              { tokenHash: latestDoc.replacedByTokenHash },
              { tokenHash: latestDoc.tokenHash },
            ],
            revoked: false,
          },
          { $set: { revoked: true, revokedAt: now, rotationState: 'failed' } }
        )
      }
      res.clearCookie('refreshToken', { path: '/' })
      return next({ status: 401, message: 'Grace period request limit exceeded. Session terminated.' })
    }

    // 3. Replay outside grace window detected: token theft / replay attempt
    // Revoke ONLY the compromised token family and its linked successor, preserving independent sessions (Task 2 & 4)
    if (latestDoc.familyId) {
      await RefreshToken.updateMany(
        {
          userId: latestDoc.userId,
          $or: [
            { familyId: latestDoc.familyId },
            ...(latestDoc.replacedByTokenHash ? [{ tokenHash: latestDoc.replacedByTokenHash }] : []),
          ],
          revoked: false,
        },
        { $set: { revoked: true, revokedAt: now, rotationState: 'failed' } }
      )
    } else if (latestDoc.replacedByTokenHash) {
      // Legacy fallback for tokens created prior to family isolation
      await RefreshToken.updateMany(
        {
          userId: latestDoc.userId,
          $or: [
            { tokenHash: latestDoc.replacedByTokenHash },
            { tokenHash: latestDoc.tokenHash },
          ],
          revoked: false,
        },
        { $set: { revoked: true, revokedAt: now, rotationState: 'failed' } }
      )
    }

    res.clearCookie('refreshToken', { path: '/' })
    return next({ status: 401, message: 'Token reuse detected. Session terminated for security.' })
  } catch (err) {
    next(err)
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────

async function logout(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken
    if (rawToken && typeof rawToken === 'string') {
      const tokenHash = hashToken(rawToken)
      const stored = await RefreshToken.findOne({ tokenHash })
      if (stored) {
        if (stored.familyId) {
          // Invalidate all tokens belonging to this session family immediately
          // revokedAt: 0 ensures the grace window is completely bypassed
          await RefreshToken.updateMany(
            { userId: stored.userId, familyId: stored.familyId, revoked: false },
            { $set: { revoked: true, revokedAt: new Date(0), rotationState: 'failed' } }
          )
        } else {
          // Legacy session without familyId: revoke ONLY this specific token document
          await RefreshToken.updateOne(
            { _id: stored._id, userId: stored.userId },
            { $set: { revoked: true, revokedAt: new Date(0), rotationState: 'failed' } }
          )
        }
      }
    }
    res.clearCookie('refreshToken', { path: '/' })
    res.json({ message: 'Logged out' })
  } catch (err) {
    next(err)
  }
}

// ── Logout all sessions ───────────────────────────────────────────────────────

async function logoutAll(req, res, next) {
  try {
    const userId = req.user?.id || req.user?._id
    if (userId) {
      await RefreshToken.updateMany(
        { userId, revoked: false },
        { $set: { revoked: true, revokedAt: new Date(0) } }
      )
    }
    res.clearCookie('refreshToken', { path: '/' })
    res.json({ message: 'All sessions logged out successfully' })
  } catch (err) {
    next(err)
  }
}

// ── Me ────────────────────────────────────────────────────────────────────────

async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id)
      .populate('jobRoleId')
      .populate('role_id')
      .populate('functional_area_id')
    if (!user) return next({ status: 404, message: 'User not found' })
    res.json({ user })
  } catch (err) {
    next(err)
  }
}

async function updateMe(req, res, next) {
  try {
    const {
      name, designation, department, experienceYears, qualifications,
      phone, personalEmail, dateOfBirth, gender, nationality,
      address, workLocation, gradeLevel, dateOfJoining, reportingTo,
      areasOfWork, emergencyContact, cadre, batch, profileCompletion, avatarUrl,
      currentPassword, newPassword,
      experience_years, education_level, field_of_study, certifications, current_responsibilities,
      functional_area_id, role_id
    } = req.body

    const updates = {}
    if (typeof name === 'string' && name.trim()) updates.name = name.trim()
    if (typeof designation === 'string') updates.designation = designation.trim()
    if (typeof department === 'string') updates.department = department.trim()
    if (experienceYears !== undefined) updates.experience_years = Math.max(0, Number(experienceYears) || 0)
    if (experience_years !== undefined) updates.experience_years = Math.max(0, Number(experience_years) || 0)
    if (education_level !== undefined) updates.education_level = education_level
    if (field_of_study !== undefined) updates.field_of_study = field_of_study
    if (Array.isArray(certifications)) updates.certifications = certifications
    if (Array.isArray(current_responsibilities)) {
      updates.current_responsibilities = current_responsibilities
      updates.areasOfWork = current_responsibilities
    }
    if (functional_area_id) updates.functional_area_id = functional_area_id
    if (role_id) {
      const Role = require('../models/Role')
      const r = await Role.findById(role_id)
      if (r) {
        updates.role_id = r._id
        updates.designation = r.name
        updates.gradeLevel = `Level ${r.level}`
      }
    }
    if (Array.isArray(qualifications)) updates.qualifications = qualifications.map((q) => String(q).trim()).filter(Boolean)
    if (typeof phone === 'string') updates.phone = phone.trim()
    if (typeof personalEmail === 'string') updates.personalEmail = personalEmail.trim().toLowerCase()
    if (typeof dateOfBirth === 'string') updates.dateOfBirth = dateOfBirth.trim()
    if (typeof gender === 'string') updates.gender = gender.trim()
    if (typeof nationality === 'string') updates.nationality = nationality.trim()
    if (typeof address === 'string') updates.address = address.trim()
    if (typeof workLocation === 'string') updates.workLocation = workLocation.trim()
    if (typeof gradeLevel === 'string') updates.gradeLevel = gradeLevel.trim()
    if (typeof dateOfJoining === 'string') updates.dateOfJoining = dateOfJoining.trim()
    if (typeof reportingTo === 'string') updates.reportingTo = reportingTo.trim()
    if (Array.isArray(areasOfWork)) updates.areasOfWork = areasOfWork.map((a) => String(a).trim()).filter(Boolean)
    if (emergencyContact && typeof emergencyContact === 'object') updates.emergencyContact = emergencyContact
    if (typeof cadre === 'string') updates.cadre = cadre.trim()
    if (typeof batch === 'string') updates.batch = batch.trim()
    if (typeof avatarUrl === 'string') updates.avatarUrl = avatarUrl.trim()

    const existingUser = await User.findById(req.user.id)
    if (!existingUser) return next({ status: 404, message: 'User not found' })

    // Calculate legitimate profile completion percentage (strictly excluding Emergency Contact)
    const effectiveName = typeof name === 'string' && name.trim() ? name.trim() : existingUser.name
    const effectivePhone = typeof phone === 'string' && phone.trim() ? phone.trim() : existingUser.phone
    const effectivePersonalEmail = typeof personalEmail === 'string' && personalEmail.trim() ? personalEmail.trim() : existingUser.personalEmail
    const effectiveAddress = typeof address === 'string' && address.trim() ? address.trim() : existingUser.address
    const effectiveDob = typeof dateOfBirth === 'string' && dateOfBirth.trim() ? dateOfBirth.trim() : existingUser.dateOfBirth
    const effectiveGender = typeof gender === 'string' && gender.trim() ? gender.trim() : existingUser.gender
    const effectiveDept = typeof department === 'string' && department.trim() ? department.trim() : existingUser.department
    const effectiveDesignation = typeof designation === 'string' && designation.trim() ? designation.trim() : existingUser.designation
    const effectiveWorkLoc = typeof workLocation === 'string' && workLocation.trim() ? workLocation.trim() : existingUser.workLocation
    const effectiveGrade = updates.gradeLevel || updates.role_id || existingUser.gradeLevel || existingUser.level || existingUser.role_id
    const effectiveEducation = education_level || existingUser.education_level || (existingUser.qualifications && existingUser.qualifications.length > 0)
    const effectiveResponsibilities =
      (Array.isArray(current_responsibilities) && current_responsibilities.length > 0) ||
      (Array.isArray(areasOfWork) && areasOfWork.length > 0) ||
      (Array.isArray(existingUser.current_responsibilities) && existingUser.current_responsibilities.length > 0) ||
      (Array.isArray(existingUser.areasOfWork) && existingUser.areasOfWork.length > 0)
    const effectiveOnboarding = Boolean(existingUser.onboarding_completed)

    const completionChecks = [
      Boolean(effectiveName),
      Boolean(existingUser.email),
      Boolean(effectivePhone && effectivePhone !== 'Not provided'),
      Boolean(effectivePersonalEmail && effectivePersonalEmail !== 'Not provided'),
      Boolean(effectiveAddress && effectiveAddress !== 'Not provided'),
      Boolean(effectiveDob && effectiveDob !== 'Not provided'),
      Boolean(effectiveGender && effectiveGender !== 'Not specified'),
      Boolean(effectiveDept),
      Boolean(effectiveDesignation),
      Boolean(effectiveWorkLoc),
      Boolean(effectiveGrade),
      Boolean(effectiveEducation),
      Boolean(effectiveResponsibilities),
      Boolean(effectiveOnboarding),
    ]

    const calculatedCompletion = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100)
    updates.profileCompletion = profileCompletion !== undefined ? Number(profileCompletion) : calculatedCompletion

    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return next({ status: 400, message: 'New password must be at least 8 characters long.' })
      }
      if (existingUser.passwordHash) {
        if (!currentPassword) {
          return next({ status: 400, message: 'Current password is required to change password.' })
        }
        const isValid = await bcrypt.compare(currentPassword, existingUser.passwordHash)
        if (!isValid) {
          return next({ status: 400, message: 'Current password is incorrect.' })
        }
      }
      updates.passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST)
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('jobRoleId')
      .populate('role_id')
      .populate('functional_area_id')

    if (!user) return next({ status: 404, message: 'User not found' })

    // ISSUE-16-01: Trigger skill gap recalculation & orphan cleanup when role is reassigned
    if (updates.role_id && String(updates.role_id) !== String(existingUser.role_id || '')) {
      try {
        const { computeUserSkillGaps } = require('../services/skillGap.service')
        await computeUserSkillGaps(user._id)
      } catch (syncErr) {
        console.warn(`[updateProfile] Failed to resync skill gaps after role update for user ${user._id}:`, syncErr.message)
        await User.findByIdAndUpdate(user._id, {
          $set: {
            needs_skillgap_sync: true,
            skillgap_sync_error: syncErr.message,
            skillgap_sync_requested_at: new Date(),
          },
        })
      }
    }

    res.json({ user })
  } catch (err) {
    next(err)
  }
}

// ── Government SSO / iGOT Karmayogi simulated login ───────────────────────────

async function ssoLogin(req, res, next) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return next({ status: 404, message: 'Mock SSO is not available in production.' })
    }

    const { provider = 'sso', email, employeeId } = req.body || {}

    if (!email && !employeeId) {
      return next({ status: 400, message: 'Officer email or employee ID is required for mock SSO.' })
    }

    const id = (email || employeeId).trim()
    if (!id) {
      return next({ status: 400, message: 'Officer email or employee ID is required for mock SSO.' })
    }

    const regex = new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
    const user = await User.findOne({
      $or: [{ email: regex }, { employeeId: regex }],
    }).populate('jobRoleId')

    if (!user) {
      return next({ status: 404, message: 'No officer account found matching the provided credentials.' })
    }

    if (user.role === 'admin') {
      return next({ status: 403, message: 'Administrator accounts cannot authenticate via mock SSO.' })
    }

    if (!user.isActive) {
      return next({ status: 403, message: 'Your account has been deactivated. Please contact your nodal officer.' })
    }

    await audit({ action: 'SSO_LOGIN_SUCCESS', req, meta: { provider, userId: user._id, email: user.email } })
    const accessToken = await issueTokenPair(user, res)
    res.json({ user, accessToken, provider })
  } catch (err) {
    next(err)
  }
}

// ── One-Click Test Bypass Login (For seamless testing) ─────────────────────────

async function bypassLogin(req, res, next) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return next({ status: 404, message: 'Endpoint not found.' })
    }

    const { role = 'employee', email } = req.body || {}

    // Bypass login must never issue administrator tokens under any circumstance
    if (role === 'admin') {
      return next({ status: 403, message: 'Bypass login cannot issue administrator tokens.' })
    }

    let user
    if (email) {
      user = await User.findOne({ email: new RegExp(`^${email.trim()}$`, 'i') }).populate('jobRoleId')
      if (user && user.role === 'admin') {
        return next({ status: 403, message: 'Bypass login cannot issue administrator tokens.' })
      }
    }

    if (!user && role) {
      user = await User.findOne({ role: { $ne: 'admin' }, role, isActive: true }).populate('jobRoleId')
    }

    if (!user) {
      user = await User.findOne({ role: { $ne: 'admin' }, isActive: true }).populate('jobRoleId')
    }

    if (!user) {
      const defaultData = {
        employee: {
          name: 'Priya Nair',
          email: 'priya.nair@mospi.gov.in',
          role: 'employee',
          employeeId: 'MOSPI-2024-001',
          department: 'National Accounts Division (NAD)',
          experienceYears: 4,
          isActive: true,
        },
      }

      const seedData = defaultData[role] || defaultData.employee
      user = await User.create(seedData)
    }

    const accessToken = await issueTokenPair(user, res)
    await audit({ action: 'BYPASS_TEST_LOGIN', req, meta: { role: user.role, userId: user._id, email: user.email } })
    res.json({ user, accessToken, bypass: true })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  signup,
  login,
  adminLogin,
  googleAuth,
  googleComplete,
  refresh,
  logout,
  logoutAll,
  me,
  updateMe,
  ssoLogin,
  bypassLogin,
  verifyGoogleToken,
  _setGoogleClient,
  reconcileFamilyOrphans,
}


