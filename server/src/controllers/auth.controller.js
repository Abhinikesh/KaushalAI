'use strict'

const bcrypt = require('bcryptjs')
const axios = require('axios')
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
  // 1. First try verifying as a Google JWT ID Token
  try {
    const ticket = await _googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    return ticket.getPayload()
  } catch (idErr) {
    // 2. If ID Token verification fails, try as an OAuth2 access_token via Google UserInfo endpoint
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${idToken}` },
        timeout: 6000,
      })
      if (response.data && response.data.email) {
        return {
          email:          response.data.email,
          name:           response.data.name || response.data.given_name || 'Officer',
          picture:        response.data.picture || null,
          email_verified: response.data.email_verified ?? true,
        }
      }
    } catch (apiErr) {
      logger.error('Google userinfo fetch failed:', apiErr.message)
    }
    throw idErr
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

    const { email, name, email_verified, picture } = payload
    if (!email_verified) {
      return next({ status: 400, message: 'Google account email is not verified.' })
    }

    let existing = await User.findOne({ email })
    if (existing) {
      // Existing user — log them in immediately & update avatarUrl/name if changed
      if (!existing.isActive) return next({ status: 403, message: 'Account is deactivated' })
      let modified = false
      if (picture && existing.avatarUrl !== picture) {
        existing.avatarUrl = picture
        modified = true
      }
      if (name && (!existing.name || existing.name === 'Officer' || existing.name === 'User')) {
        existing.name = name
        modified = true
      }
      if (!existing.googleLinked) {
        existing.googleLinked = true
        modified = true
      }
      if (modified) {
        await existing.save()
      }
      const accessToken = await issueTokenPair(existing, res)
      return res.json({ user: existing, accessToken })
    }

    // Check if an authorized officer already exists for this email or name
    const AuthorizedOfficer = require('../models/AuthorizedOfficer')
    const officerMatch = await AuthorizedOfficer.findOne({
      $or: [
        { officialEmail: { $regex: new RegExp(`^${email}$`, 'i') } },
        { fullName: { $regex: new RegExp(`^${name}$`, 'i') } },
      ],
      isClaimed: false,
    })

    if (officerMatch) {
      const newUser = await User.create({
        name:            name || officerMatch.fullName,
        email,
        passwordHash:    null,
        googleLinked:    true,
        avatarUrl:       picture || null,
        role:            'employee',
        employeeId:      officerMatch.employeeId,
        department:      officerMatch.department,
        jobRoleId:       officerMatch.jobRoleId?._id ?? officerMatch.jobRoleId ?? null,
        experienceYears: 2,
      })
      await claimOfficerRecord(officerMatch.employeeId, newUser._id)
      const accessToken = await issueTokenPair(newUser, res)
      return res.json({ user: newUser, accessToken })
    }

    // New Google user without immediate roster match — prompt for employeeId
    return res.status(200).json({
      requiresCompletion: true,
      prefillEmail:       email,
      prefillName:        name,
      avatarUrl:          picture || null,
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

    const { email, name, email_verified, picture } = payload
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

    // Create Google-linked account (no password) with synced avatar
    const user = await User.create({
      name,
      email,
      passwordHash:    null,
      googleLinked:    true,
      avatarUrl:       picture || null,
      role:            role || 'employee',
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
    const {
      name, designation, department, experienceYears, qualifications,
      phone, personalEmail, dateOfBirth, gender, nationality, aadhaarMasked,
      address, workLocation, gradeLevel, dateOfJoining, reportingTo,
      areasOfWork, emergencyContact, cadre, batch, profileCompletion, avatarUrl,
      currentPassword, newPassword
    } = req.body

    const updates = {}
    if (typeof name === 'string' && name.trim()) updates.name = name.trim()
    if (typeof designation === 'string') updates.designation = designation.trim()
    if (typeof department === 'string') updates.department = department.trim()
    if (experienceYears !== undefined) updates.experienceYears = Math.max(0, Number(experienceYears) || 0)
    if (Array.isArray(qualifications)) updates.qualifications = qualifications.map((q) => String(q).trim()).filter(Boolean)
    if (typeof phone === 'string') updates.phone = phone.trim()
    if (typeof personalEmail === 'string') updates.personalEmail = personalEmail.trim().toLowerCase()
    if (typeof dateOfBirth === 'string') updates.dateOfBirth = dateOfBirth.trim()
    if (typeof gender === 'string') updates.gender = gender.trim()
    if (typeof nationality === 'string') updates.nationality = nationality.trim()
    if (typeof aadhaarMasked === 'string') updates.aadhaarMasked = aadhaarMasked.trim()
    if (typeof address === 'string') updates.address = address.trim()
    if (typeof workLocation === 'string') updates.workLocation = workLocation.trim()
    if (typeof gradeLevel === 'string') updates.gradeLevel = gradeLevel.trim()
    if (typeof dateOfJoining === 'string') updates.dateOfJoining = dateOfJoining.trim()
    if (typeof reportingTo === 'string') updates.reportingTo = reportingTo.trim()
    if (Array.isArray(areasOfWork)) updates.areasOfWork = areasOfWork.map((a) => String(a).trim()).filter(Boolean)
    if (emergencyContact && typeof emergencyContact === 'object') updates.emergencyContact = emergencyContact
    if (typeof cadre === 'string') updates.cadre = cadre.trim()
    if (typeof batch === 'string') updates.batch = batch.trim()
    if (profileCompletion !== undefined) updates.profileCompletion = Number(profileCompletion) || 85
    if (typeof avatarUrl === 'string') updates.avatarUrl = avatarUrl.trim()

    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return next({ status: 400, message: 'New password must be at least 8 characters long.' })
      }
      const existingUser = await User.findById(req.user.id)
      if (!existingUser) return next({ status: 404, message: 'User not found' })
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
    ).populate('jobRoleId')

    if (!user) return next({ status: 404, message: 'User not found' })
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

module.exports = { signup, login, googleAuth, googleComplete, refresh, logout, me, updateMe, ssoLogin, bypassLogin }

