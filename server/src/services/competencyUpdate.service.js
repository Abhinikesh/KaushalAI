const UserCompetency = require('../models/UserCompetency')

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
    const existing = await UserCompetency.findOne({ userId, competencyId })
    const currentLevel = existing?.currentLevel ?? 1

    if (newLevel > currentLevel) {
      // Upsert — works whether or not a UserCompetency record already exists
      await UserCompetency.findOneAndUpdate(
        { userId, competencyId },
        {
          $set: {
            currentLevel: newLevel,
            source: 'quiz',
            lastUpdated: attemptedAt,
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

  return updates
}

module.exports = { mapScoreToLevel, applyCompetencyUpdates }
