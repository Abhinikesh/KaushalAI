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
  return UserCompetency.find({ userId }).populate('competencyId', 'name category description')
}

async function upsertUserCompetency(userId, competencyId, level, source = 'self_assessed') {
  return UserCompetency.findOneAndUpdate(
    { userId, competencyId },
    { currentLevel: level, source, lastUpdated: new Date() },
    { upsert: true, new: true, runValidators: true }
  ).populate('competencyId', 'name category description')
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
