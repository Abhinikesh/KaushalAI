const mongoose = require('mongoose')
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
 * Shared internal helper: validates user eligibility (excluding admins), applies
 * non-downgrading canonical UserCompetency updates under withUserLock, and triggers
 * SkillGap synchronization outside the lock with 2-attempt retry + pending deferral.
 */
async function _applyNormalizedCompetencyScores(userId, entries, attemptedAt = new Date()) {
  if (!entries || entries.length === 0) {
    console.log(`[competencyUpdate] No valid competency entries — skipping auto-update for user ${userId}`)
    return []
  }

  const user = await User.findById(userId).select('role').lean()
  if (!user) {
    console.warn(`[competencyUpdate] User not found: ${userId} — skipping competency update`)
    return []
  }
  if (user.role === 'admin') {
    console.log(`[competencyUpdate] User ${userId} is admin — skipping learner competency update`)
    return []
  }

  // Deduplicate by competencyId while retaining highest implied scorePercent
  const deduped = new Map()
  for (const entry of entries) {
    const rawId = entry?.competencyId
    if (!rawId || !mongoose.Types.ObjectId.isValid(rawId)) continue
    const key = String(rawId)
    const pct = Number(entry.scorePercent) || 0
    const prev = deduped.get(key)
    if (!prev || pct > prev.scorePercent) {
      deduped.set(key, { competencyId: rawId, scorePercent: pct })
    }
  }

  if (deduped.size === 0) {
    return []
  }

  const Competency = require('../models/Competency')
  const validComps = await Competency.find({ _id: { $in: Array.from(deduped.keys()) } })
    .select('_id')
    .lean()
  const validCompIdSet = new Set(validComps.map((c) => String(c._id)))
  for (const key of Array.from(deduped.keys())) {
    if (!validCompIdSet.has(key)) {
      deduped.delete(key)
    }
  }

  if (deduped.size === 0) {
    return []
  }

  const { withUserLock, computeUserSkillGaps } = require('./skillGap.service')

  // Serialize UserCompetency read-compare-upsert per user to prevent concurrent downgrade/duplicate races
  const updates = await withUserLock(String(userId), async () => {
    const applied = []

    for (const { competencyId, scorePercent } of deduped.values()) {
      const newLevel = mapScoreToLevel(scorePercent)
      const existing = await UserCompetency.findOne({
        $or: [
          { user_id: userId, competency_id: competencyId },
          { userId, competencyId },
        ],
      })
      const currentLevel = existing?.current_level ?? existing?.currentLevel ?? 1

      if (newLevel > currentLevel) {
        if (existing) {
          await UserCompetency.findByIdAndUpdate(
            existing._id,
            {
              $set: {
                user_id: existing.user_id || userId,
                competency_id: existing.competency_id || competencyId,
                current_level: newLevel,
                source: 'quiz',
                last_assessed_at: attemptedAt,
              },
            },
            { new: true }
          )
        } else {
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
        }

        applied.push({ competencyId, previousLevel: currentLevel, newLevel })
        console.log(
          `[competencyUpdate] user=${userId} competency=${competencyId}: ${currentLevel} → ${newLevel} (score=${scorePercent}%)`
        )
      } else {
        console.log(
          `[competencyUpdate] user=${userId} competency=${competencyId}: no improvement (cur=${currentLevel}, quiz implies=${newLevel}, score=${scorePercent}%)`
        )
      }
    }

    return applied
  })

  // ISSUE-16-05 & ISSUE-17-2-C: Synchronize SkillGap outside user lock (avoid re-entrant lock when simulator/service calls computeUserSkillGaps)
  if (updates.length > 0) {
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
      await User.findByIdAndUpdate(userId, {
        $set: {
          needs_skillgap_sync: true,
          skillgap_sync_error: lastError?.message || 'SkillGap calculation failed after 2 retries',
          skillgap_sync_requested_at: new Date(),
        },
      })
      console.warn(`[competencyUpdate] Flagged user ${userId} with needs_skillgap_sync: true for deferred recovery on next request.`)
    } else {
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

  const entries = tagCompetencyIds.map((competencyId) => ({
    competencyId,
    scorePercent,
  }))
  return _applyNormalizedCompetencyScores(userId, entries, attemptedAt)
}

/**
 * Apply per-competency accuracy scores for multi-competency quizzes under a single
 * user lock and single SkillGap sync cycle.
 *
 * @param {string} userId
 * @param {Array<{competencyId: any, scorePercent: number}>} scoreEntries
 * @param {Date} attemptedAt
 */
async function applyCompetencyScoreMap(userId, scoreEntries, attemptedAt) {
  return _applyNormalizedCompetencyScores(userId, scoreEntries, attemptedAt)
}

/**
 * recoverPendingSkillGapSync
 * Idempotently recalculates skill gaps for a user with needs_skillgap_sync === true.
 * Returns { recovered: boolean, status: string, userId: string, gapsCount?: number }
 */
async function recoverPendingSkillGapSync(userId) {
  const { computeUserSkillGaps } = require('./skillGap.service')
  const user = await User.findById(userId).select('role needs_skillgap_sync role_id').lean()
  if (!user) {
    throw new Error(`User not found: ${userId}`)
  }

  if (user.role === 'admin') {
    if (user.needs_skillgap_sync) {
      await User.findByIdAndUpdate(userId, {
        $set: {
          needs_skillgap_sync: false,
          skillgap_sync_error: null,
          skillgap_sync_requested_at: null,
        },
      })
    }
    return { recovered: false, status: 'admin_exempt', userId }
  }

  if (!user.needs_skillgap_sync) {
    return { recovered: false, status: 'already_synced', userId }
  }

  const gaps = await computeUserSkillGaps(userId)
  return { recovered: true, status: 'recovered', userId, gapsCount: gaps.length }
}

/**
 * recoverAllPendingSkillGapSyncs
 * Idempotent batch recovery across all non-admin users currently flagged with needs_skillgap_sync: true.
 */
async function recoverAllPendingSkillGapSyncs() {
  const { computeUserSkillGaps } = require('./skillGap.service')
  const pendingUsers = await User.find({
    needs_skillgap_sync: true,
    role: { $ne: 'admin' },
  })
    .select('_id email')
    .lean()
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
  applyCompetencyScoreMap,
  recoverPendingSkillGapSync,
  recoverAllPendingSkillGapSyncs,
  setSyncFailureSimulator,
  clearSyncFailureSimulator,
}
