'use strict'

/**
 * Migration Script: Migrate Existing Accounts for Unified 6-Step Onboarding
 * 
 * Rules:
 * 1. Admin accounts: onboarding_completed = true, onboarding_step = 6.
 * 2. Completed learners (onboarding_completed = true OR has completed AssessmentAttempt):
 *    preserve completed state, onboarding_step = 6.
 * 3. Incomplete learners: onboarding_completed = false, onboarding_step = 1.
 * 4. Dry-run mode by default. Pass --apply to persist changes.
 */

require('dotenv').config()
const mongoose = require('mongoose')
const User = require('../models/User')
const AssessmentAttempt = require('../models/AssessmentAttempt')

async function migrateUnifiedOnboarding(apply = false) {
  console.log(`\n======================================================`)
  console.log(`  KAUSHALAI UNIFIED ONBOARDING MIGRATION`)
  console.log(`  Mode: ${apply ? 'APPLY CHANGES' : 'DRY RUN (No changes made)'}`)
  console.log(`======================================================\n`)

  const users = await User.find({}).lean()
  console.log(`Found ${users.length} total user accounts to evaluate.\n`)

  const report = []

  for (const user of users) {
    const attempts = await AssessmentAttempt.find({
      user_id: user._id,
      status: 'completed',
    }).lean()

    const hasCompletedAttempt = attempts.length > 0
    const isAdmin = user.role === 'admin'
    const wasAlreadyCompleted = Boolean(user.onboarding_completed)

    let targetCompleted = false
    let targetStep = 1
    let classification = ''

    if (isAdmin) {
      targetCompleted = true
      targetStep = 6
      classification = 'Administrator (Exempt from learner onboarding)'
    } else if (wasAlreadyCompleted || hasCompletedAttempt) {
      targetCompleted = true
      targetStep = 6
      classification = hasCompletedAttempt
        ? `Completed Learner (${attempts.length} completed assessment attempts in DB)`
        : 'Completed Learner (Prior onboarding flag = true)'
    } else {
      targetCompleted = false
      targetStep = 1
      classification = 'Incomplete Learner (Must complete unified 6-step onboarding)'
    }

    const needsUpdate =
      user.onboarding_completed !== targetCompleted ||
      user.onboarding_step !== targetStep ||
      user.learning_interests === undefined ||
      user.skills_to_develop === undefined

    const userSummary = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      classification,
      current: {
        onboarding_completed: user.onboarding_completed,
        onboarding_step: user.onboarding_step,
      },
      target: {
        onboarding_completed: targetCompleted,
        onboarding_step: targetStep,
      },
      action: needsUpdate ? (apply ? 'UPDATED' : 'WOULD_UPDATE') : 'NO_CHANGE_NEEDED',
    }

    report.push(userSummary)

    if (apply && needsUpdate) {
      await User.findByIdAndUpdate(user._id, {
        $set: {
          onboarding_completed: targetCompleted,
          onboarding_step: targetStep,
          learning_interests: user.learning_interests || [],
          skills_to_develop: user.skills_to_develop || [],
        },
      })
    }
  }

  // Print Summary Table
  console.table(
    report.map((r) => ({
      Email: r.email,
      Role: r.role,
      Classification: r.classification.substring(0, 35),
      'Curr Completed': String(r.current.onboarding_completed),
      'Curr Step': String(r.current.onboarding_step),
      'Target Completed': String(r.target.onboarding_completed),
      'Target Step': String(r.target.onboarding_step),
      Action: r.action,
    }))
  )

  const updateCount = report.filter((r) => r.action !== 'NO_CHANGE_NEEDED').length
  console.log(`\nSummary:`)
  console.log(`- Accounts inspected: ${users.length}`)
  console.log(`- Accounts needing update: ${updateCount}`)
  console.log(`- Accounts requiring no change: ${users.length - updateCount}`)
  if (!apply) {
    console.log(`\nTo apply these updates, run with: node server/src/seed/migrateUnifiedOnboarding.js --apply\n`)
  } else {
    console.log(`\nUpdates successfully written to database.\n`)
  }

  return report
}

// Allow CLI execution
if (require.main === module) {
  const isApply = process.argv.includes('--apply')
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kaushalai'

  mongoose
    .connect(mongoUri)
    .then(async () => {
      await migrateUnifiedOnboarding(isApply)
      await mongoose.disconnect()
      process.exit(0)
    })
    .catch((err) => {
      console.error('Migration failed:', err)
      process.exit(1)
    })
}

module.exports = migrateUnifiedOnboarding

