const UserCompetency = require('../models/UserCompetency')
const User = require('../models/User')

// Test hook support for simulating controlled sync failures
let syncFailureSimulator = null

function setSyncFailureSimulator(fn) {
  syncFailureSimulator = fn
}

function clearSyncFailureSimulator() {
  syncFailureSimulator = null
}

/**
 * Map a quiz score percentage to a competency level (1–4).
 * Level 5 is reserved for demonstrated expert work (advanced course completion, etc.)
 * and is never assigned automatically from a single quiz attempt.
 *
 * Thresholds from the OSS problem statement:
 *   0–40%  → 1 (Awareness)
 *  41–60%  → 2 (Basic)
 *  61–80%  → 3 (Working)
 *  81–100% → 4 (Advanced)
 */
function mapScoreToLevel(scorePercent) {
  if (scorePercent <= 40) return 1
  if (scorePercent <= 60) return 2
  if (scorePercent <= 80) return 3
  return 4
}

/**
 * For each tagged competency, update the user's level if the quiz score implies
 * improvement. Never decreases a level — this is a hard business rule enforced here,
 * not left to caller discretion.
 *
 * @param {string}   userId            - User's Mongoose ObjectId string
 * @param {string[]} tagCompetencyIds  - Competency IDs tagged on the quiz
 * @param {number}   scorePercent      - Score from this attempt (0–100)
 * @param {Date}     attemptedAt       - Timestamp of the attempt
 * @returns {Array}  List of { competencyId, previousLevel, newLevel } for updates that occurred
 */
async function applyCompetencyUpdates(userId, tagCompetencyIds, scorePercent, attemptedAt) {
  if (!tagCompetencyIds || tagCompetencyIds.length === 0) {
    console.log(`[competencyUpdate] Quiz has no tagged competencies — skipping auto-update for user ${userId}`)
    return []
  }

  const newLevel = mapScoreToLevel(scorePercent)
  const updates = []

  for (const competencyId of tagCompetencyIds) {
    const existing = await UserCompetency.findOne({
      $or: [
        { user_id: userId, competency_id: competencyId },
        { userId, competencyId },
      ],
    })
    const currentLevel = existing?.current_level ?? existing?.currentLevel ?? 1

    if (newLevel > currentLevel) {
      // Upsert — works whether or not a UserCompetency record already exists
      await UserCompetency.findOneAndUpdate(
        { user_id: userId, competency_id: competencyId },
        {
          $set: {
            current_level: newLevel,
            source: 'quiz',
            last_assessed_at: attemptedAt,
          },
        },
        { upsert: true, new: true }
      )
      updates.push({ competencyId, previousLevel: currentLevel, newLevel })
      console.log(
        `[competencyUpdate] user=${userId} competency=${competencyId}: ${currentLevel} → ${newLevel} (score=${scorePercent}%)`
      )
    } else {
      console.log(
        `[competencyUpdate] user=${userId} competency=${competencyId}: no improvement (cur=${currentLevel}, quiz implies=${newLevel}, score=${scorePercent}%)`
      )
    }
  }

  // ISSUE-16-05 & ISSUE-17-2-C: Synchronize SkillGap after course quiz improvements with retry & recovery state
  if (updates.length > 0) {
    const { computeUserSkillGaps } = require('./skillGap.service')
    let attempts = 0
    let synced = false
    let lastError = null

    while (attempts < 2 && !synced) {
      try {
        attempts++
        if (typeof syncFailureSimulator === 'function') {
          await syncFailureSimulator(userId, attempts)
        } else {
          await computeUserSkillGaps(userId)
        }
        synced = true
        console.log(`[competencyUpdate] Synchronized skill gaps after ${updates.length} competency update(s) for user ${userId} (attempt ${attempts})`)
      } catch (syncErr) {
        lastError = syncErr
        if (attempts >= 2) {
          console.error(`[competencyUpdate] Persistent error synchronizing skill gaps for user ${userId} after 2 attempts:`, syncErr.message)
        } else {
          console.warn(`[competencyUpdate] Retrying skill gap sync for user ${userId} (attempt ${attempts}/2)...`)
        }
      }
    }

    if (!synced) {
      // ISSUE-17-2-C: Mark user document with persistent pending recovery marker.
      // Quiz submission response still succeeds (non-blocking projection), but failure remains visible and detectable.
      await User.findByIdAndUpdate(userId, {
        $set: {
          needs_skillgap_sync: true,
          skillgap_sync_error: lastError?.message || 'SkillGap calculation failed after 2 retries',
          skillgap_sync_requested_at: new Date(),
        },
      })
      console.warn(`[competencyUpdate] Flagged user ${userId} with needs_skillgap_sync: true for deferred recovery on next request.`)
    } else {
      // Clear flag if it was previously set
      await User.findByIdAndUpdate(userId, {
        $set: {
          needs_skillgap_sync: false,
          skillgap_sync_error: null,
          skillgap_sync_requested_at: null,
        },
      })
    }
  }

  return updates
}

/**
 * recoverPendingSkillGapSync
 * Idempotently recalculates skill gaps for a user with needs_skillgap_sync === true.
 * Returns { recovered: boolean, status: string, userId: string, gapsCount?: number }
 */
async function recoverPendingSkillGapSync(userId) {
  const { computeUserSkillGaps } = require('./skillGap.service')
  const user = await User.findById(userId).select('needs_skillgap_sync role_id').lean()
  if (!user) {
    throw new Error(`User not found: ${userId}`)
  }

  if (!user.needs_skillgap_sync) {
    return { recovered: false, status: 'already_synced', userId }
  }

  const gaps = await computeUserSkillGaps(userId)
  return { recovered: true, status: 'recovered', userId, gapsCount: gaps.length }
}

/**
 * recoverAllPendingSkillGapSyncs
 * Idempotent batch recovery across all users currently flagged with needs_skillgap_sync: true.
 */
async function recoverAllPendingSkillGapSyncs() {
  const { computeUserSkillGaps } = require('./skillGap.service')
  const pendingUsers = await User.find({ needs_skillgap_sync: true }).select('_id email').lean()
  const results = {
    totalPending: pendingUsers.length,
    recoveredCount: 0,
    failedCount: 0,
    errors: [],
  }

  for (const u of pendingUsers) {
    try {
      await computeUserSkillGaps(u._id)
      results.recoveredCount++
    } catch (err) {
      results.failedCount++
      results.errors.push({ userId: u._id, error: err.message })
    }
  }

  return results
}

module.exports = {
  mapScoreToLevel,
  applyCompetencyUpdates,
  recoverPendingSkillGapSync,
  recoverAllPendingSkillGapSyncs,
  setSyncFailureSimulator,
  clearSyncFailureSimulator,
}
