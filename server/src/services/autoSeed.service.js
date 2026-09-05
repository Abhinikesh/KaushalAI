'use strict'

const Competency = require('../models/Competency')
const Course = require('../models/Course')
const User = require('../models/User')
const masterSeed = require('../seed/masterSeed')

/**
 * autoSeed — Checks on server startup if MongoDB has initial data.
 * If Competencies, Courses, or Users are empty, it automatically populates
 * all official datasets and records so the platform is ready immediately.
 */
async function autoSeed() {
  try {
    const compCount = await Competency.countDocuments()
    const courseCount = await Course.countDocuments()
    const userCount = await User.countDocuments()

    const forceSeed = process.env.FORCE_SEED === 'true'

    if (forceSeed || compCount === 0 || courseCount === 0 || userCount === 0) {
      console.log(`[autoSeed] Initial database setup needed (Competencies: ${compCount}, Courses: ${courseCount}, Users: ${userCount}). Running master seed...`)
      await masterSeed()
    } else {
      console.log(`[autoSeed] MongoDB already populated with ${compCount} competencies, ${courseCount} courses, and ${userCount} users. Auto-seed skipped.`)
    }
  } catch (err) {
    console.error('[autoSeed] Warning: auto-seed check encountered an error:', err.message)
    // Non-blocking: never crash the server process if auto-seed errors
  }
}

module.exports = { autoSeed }
