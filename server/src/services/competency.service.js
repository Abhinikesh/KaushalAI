const Competency = require('../models/Competency')
const JobRole = require('../models/JobRole')
const UserCompetency = require('../models/UserCompetency')
const User = require('../models/User')

async function listCompetencies() {
  return Competency.find().sort({ category: 1, name: 1 })
}

async function createCompetency(data) {
  return Competency.create(data)
}

async function listJobRoles() {
  return JobRole.find().populate('requiredCompetencies.competencyId', 'name category')
}

async function createJobRole(data) {
  return JobRole.create(data)
}

async function getUserCompetencies(userId) {
  return UserCompetency.find({
    $or: [{ user_id: userId }, { userId }],
  }).populate('competency_id', 'name category description level levelDescriptions')
}

async function upsertUserCompetency(userId, competencyId, level, source = 'self_assessed') {
  const record = await UserCompetency.findOneAndUpdate(
    { user_id: userId, competency_id: competencyId },
    { current_level: level, source, last_assessed_at: new Date() },
    { upsert: true, new: true, runValidators: true }
  ).populate('competency_id', 'name category description level levelDescriptions')

  // Keep SkillGap in sync
  try {
    const SkillGap = require('../models/SkillGap')
    const existingGap = await SkillGap.findOne({ user_id: userId, competency_id: competencyId })
    if (existingGap) {
      const reqLvl = existingGap.required_level || 3
      const newGap = reqLvl - level
      const priority = newGap >= 2 ? 'high' : newGap === 1 ? 'medium' : 'low'
      await SkillGap.updateOne(
        { _id: existingGap._id },
        { current_level: level, gap: newGap, priority, computed_at: new Date() }
      )
    }
  } catch (err) {
    console.error('[upsertUserCompetency] Error syncing SkillGap:', err.message)
  }

  return record
}

async function setUserJobRole(userId, jobRoleId) {
  const role = await JobRole.findById(jobRoleId)
  if (!role) {
    const err = new Error('Job role not found')
    err.status = 404
    throw err
  }
  return User.findByIdAndUpdate(userId, { jobRoleId }, { new: true }).select('-passwordHash')
}

module.exports = {
  listCompetencies,
  createCompetency,
  listJobRoles,
  createJobRole,
  getUserCompetencies,
  upsertUserCompetency,
  setUserJobRole,
}
