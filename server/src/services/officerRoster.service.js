'use strict'

const AuthorizedOfficer = require('../models/AuthorizedOfficer')
require('../models/JobRole')   // ensure JobRole is registered before populate()
const logger = require('../utils/logger')

/**
 * Verify an employeeId against the authorized officer roster.
 *
 * Rules:
 * - employeeId must exist and NOT be already claimed (hard fail)
 * - fullName is checked case-insensitively as a sanity check
 *   A close-but-not-exact name match logs a warning but does NOT fail
 *   (covers typos, missing middle names, etc.)
 *
 * @returns {Promise<AuthorizedOfficer>} the matched officer document
 * @throws {Object} { status, message } on failure
 */
async function verifyOfficerMatch(employeeId, fullName) {
  const officer = await AuthorizedOfficer.findOne({ employeeId: employeeId.trim() })
    .populate('jobRoleId')
    .lean()

  if (!officer) {
    throw {
      status: 403,
      message:
        'Employee ID not found in the registered officer list. Please contact your administrator to be added.',
    }
  }

  if (officer.isClaimed) {
    throw {
      status: 409,
      message:
        'This Employee ID has already been used to create an account. If this is an error, contact your administrator.',
    }
  }

  // Loose name match — normalise whitespace and compare case-insensitively
  const normalise = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  if (normalise(officer.fullName) !== normalise(fullName)) {
    logger.warn(
      `Officer name mismatch for employeeId=${employeeId}: ` +
      `roster="${officer.fullName}" provided="${fullName}" — proceeding (typo tolerance)`
    )
  }

  return officer
}

/**
 * Mark an officer record as claimed after successful account creation.
 * Uses atomic conditional update requiring isClaimed: false.
 *
 * @param {string} employeeId - Officer employee ID to claim
 * @param {string|mongoose.Types.ObjectId} userId - ID of the created user
 * @returns {Promise<boolean>} resolves true if successfully claimed
 * @throws {Object} { status, message } if already claimed or not found
 */
async function claimOfficerRecord(employeeId, userId) {
  const trimmedId = employeeId.trim()
  const result = await AuthorizedOfficer.updateOne(
    { employeeId: trimmedId, isClaimed: false },
    { $set: { isClaimed: true, claimedByUserId: userId } }
  )

  if (result.matchedCount === 0 || result.modifiedCount === 0) {
    const existing = await AuthorizedOfficer.findOne({ employeeId: trimmedId }).lean()
    if (!existing) {
      throw {
        status: 404,
        message: 'Employee ID not found in the authorized officer roster.',
      }
    }
    throw {
      status: 409,
      message: 'This Employee ID has already been claimed by another account.',
    }
  }

  return true
}

module.exports = { verifyOfficerMatch, claimOfficerRecord }
