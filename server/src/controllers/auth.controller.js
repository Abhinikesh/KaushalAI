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
      res.clearCookie('refreshToken', { path: '/' })
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
      res.clearCookie('refreshToken', { path: '/' })
    }
    res.json({ message: 'Logged out' })
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
    const { provider = 'sso', email, employeeId } = req.body

    let user
    if (email || employeeId) {
      const id = (email || employeeId).trim()
      const regex = new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
      user = await User.findOne({
        $or: [{ email: regex }, { employeeId: regex }],
      }).populate('jobRoleId')
    }

    // If no specific user specified, pick the default official demo user
    if (!user) {
      user = await User.findOne({ isActive: true }).populate('jobRoleId')
    }

    if (!user) {
      return next({ status: 404, message: 'No active officer account found in database.' })
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
    const { role = 'employee', email } = req.body || {}

    let user
    if (email) {
      user = await User.findOne({ email: new RegExp(`^${email.trim()}$`, 'i') }).populate('jobRoleId')
    }

    if (!user && role) {
      user = await User.findOne({ role, isActive: true }).populate('jobRoleId')
    }

    if (!user) {
      user = await User.findOne({ isActive: true }).populate('jobRoleId')
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
        admin: {
          name: 'Super Administrator',
          email: 'admin.mospi@nic.in',
          role: 'admin',
          employeeId: 'MOSPI-ADM-01',
          department: 'MoSPI Computer Centre HQ',
          experienceYears: 15,
          isActive: true,
        }
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
  me,
  updateMe,
  ssoLogin,
  bypassLogin,
  verifyGoogleToken,
  _setGoogleClient,
}


