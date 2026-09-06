'use strict'

const Competency = require('../models/Competency')
const Course = require('../models/Course')
const User = require('../models/User')
const Department = require('../models/Department')
const Role = require('../models/Role')
const FunctionalArea = require('../models/FunctionalArea')
const Question = require('../models/Question')
const CourseCompetency = require('../models/CourseCompetency')

const masterSeed = require('../seed/masterSeed')
const migratePart1 = require('../seed/migratePart1MasterData')
const seedQuestionBank = require('../seed/seedQuestionBankPart3')
const { syncCourseCompetencies } = require('./courseCompetencySync')

/**
 * autoSeed — Checks on server startup if MongoDB has initial data.
 * Automatically verifies:
 * 1. Global Master Data (Competencies, Courses, Users, Officers)
 * 2. 5-Tier Framework Reference Data (Departments, Roles, Functional Areas, Role Competencies)
 * 3. Part 3 Diagnostic Assessment Question Bank (131 Questions)
 * 4. Course Competency Mappings
 */
async function autoSeed() {
  try {
    const forceSeed = process.env.FORCE_SEED === 'true'

    // 1. Check core master data
    const compCount = await Competency.countDocuments()
    const courseCount = await Course.countDocuments()
    const userCount = await User.countDocuments()

    if (forceSeed || compCount === 0 || courseCount === 0 || userCount === 0) {
      console.log(`[autoSeed] Initial database setup needed (Competencies: ${compCount}, Courses: ${courseCount}, Users: ${userCount}). Running master seed...`)
      await masterSeed()
    } else {
      console.log(`[autoSeed] MongoDB populated with ${compCount} competencies, ${courseCount} courses, and ${userCount} users.`)
    }

    // 2. Check Part 1 & 2 reference data (Departments, Roles, Functional Areas)
    const deptCount = await Department.countDocuments()
    const roleCount = await Role.countDocuments()
    const faCount = await FunctionalArea.countDocuments()

    if (deptCount === 0 || roleCount === 0 || faCount === 0) {
      console.log(`[autoSeed] Reference data missing (Departments: ${deptCount}, Roles: ${roleCount}, Functional Areas: ${faCount}). Running Part 1 migration...`)
      await migratePart1()
    } else {
      console.log(`[autoSeed] Reference data active: ${deptCount} departments, ${roleCount} roles, ${faCount} functional areas.`)
    }

    // 3. Check Part 3 Diagnostic Question Bank
    const diagnosticQuestionCount = await Question.countDocuments({ quizId: null, level: { $in: [1, 2, 3, 4, 5] } })
    if (diagnosticQuestionCount === 0) {
      console.log(`[autoSeed] Diagnostic question bank empty. Seeding 131 diagnostic questions...`)
      await seedQuestionBank()
    } else {
      console.log(`[autoSeed] Diagnostic question bank active: ${diagnosticQuestionCount} questions available.`)
    }

    // 4. Check Course Competency mappings
    const ccCount = await CourseCompetency.countDocuments()
    if (ccCount < 20) {
      console.log(`[autoSeed] Course competency mappings count (${ccCount}) is low. Running sync...`)
      await syncCourseCompetencies()
    }
  } catch (err) {
    console.error('[autoSeed] Warning: auto-seed check encountered an error:', err.message)
    // Non-blocking: never crash the server process if auto-seed errors
  }
}

module.exports = { autoSeed }
